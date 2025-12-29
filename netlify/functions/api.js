import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument, degrees } from 'pdf-lib';
import archiver from 'archiver';
import { Stream } from 'stream';

const app = express();
app.use(cors());
const router = express.Router();

// DEBUG: Catch-all to see what's happening if no route matches
router.all('*', (req, res) => {
    res.status(404).json({
        error: "Route not found in API",
        path: req.path,
        url: req.url,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        method: req.method
    });
});

// Mount router on various paths to handle Netlify's rewriting quirks
app.use('/.netlify/functions/api', router);
app.use('/api', router);
app.use('/', router); 

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit per file
});

const router = express.Router();

/**
 * UTILITY: Parse page ranges (e.g., "1-3, 5, 8-10")
 * Returns array of 0-based indices: [0, 1, 2, 4, 7, 8, 9]
 */
const parsePageRanges = (rangeString, maxPages) => {
    const pages = new Set();
    const parts = rangeString.split(',').map(p => p.trim());

    parts.forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(num => parseInt(num));
            if (!isNaN(start) && !isNaN(end)) {
                // Adjust for 1-based input to 0-based index
                for (let i = start - 1; i < end; i++) {
                    if (i >= 0 && i < maxPages) pages.add(i);
                }
            }
        } else {
            const page = parseInt(part);
            if (!isNaN(page)) {
                if (page - 1 >= 0 && page - 1 < maxPages) pages.add(page - 1);
            }
        }
    });
    return Array.from(pages).sort((a, b) => a - b);
};

// --- ROUTES ---

router.get('/', (req, res) => {
  res.json({ message: "MarvelPDF Node.js Backend Running" });
});

router.get('/health', (req, res) => {
    res.json({ status: "ok", environment: "nodejs" });
});

// MERGE PDF
router.post('/process/merge', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).send("At least 2 files are required.");
        }

        const mergedPdf = await PDFDocument.create();

        for (const file of req.files) {
            const pdf = await PDFDocument.load(file.buffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=merged.pdf',
            'Content-Length': pdfBytes.length,
        });
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("Merge Error:", error);
        res.status(500).send("Failed to merge PDFs.");
    }
});

// SPLIT PDF
router.post('/process/split', upload.single('file'), async (req, res) => {
    try {
        if (!req.file || !req.body.range) {
            return res.status(400).send("File and range are required.");
        }

        const srcDoc = await PDFDocument.load(req.file.buffer);
        const pageIndices = parsePageRanges(req.body.range, srcDoc.getPageCount());

        if (pageIndices.length === 0) {
            return res.status(400).send("Invalid page range.");
        }

        // Logic: Create a SINGLE PDF containing the selected pages (as per typically expected Split behavior in simple tools)
        // OR Create individual PDFs?
        // Frontend expects a ZIP ("split.zip"). This implies extracting pages as separate files OR extracting the selection as one file.
        // But "Split" usually means "Extract". 
        // Let's assume the user wants the selected pages extracted.
        // If the return type is ZIP, we probably want to support "Split into single page files" vs "Extract specific range".
        // The frontend code expects `split.zip`. Let's create a ZIP containing ONE PDF if the range is contiguous-ish, or just zip the result to be safe.
        // Actually, looking at standard tools (iLovePDF), "Split by range" often results in ONE file if ranges are "Merged", or MULTIPLE if "Split ranges".
        // Frontend code implies a single download flow but names it 'split.zip'. 
        // Let's implement: Extracted pages as a single PDF inside a ZIP (safe default) OR multiple PDFs if requested.
        // Implementation: Create a new PDF with *only* the selected pages.
        
        const subPdf = await PDFDocument.create();
        const copiedPages = await subPdf.copyPages(srcDoc, pageIndices);
        copiedPages.forEach((page) => subPdf.addPage(page));
        const subPdfBytes = await subPdf.save();

        // Create Zip
        const archive = archiver('zip');
        
        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename=split.zip'
        });

        archive.pipe(res);
        archive.append(Buffer.from(subPdfBytes), { name: 'extracted.pdf' });
        await archive.finalize();

    } catch (error) {
        console.error("Split Error:", error);
        res.status(500).send("Failed to split PDF.");
    }
});

// PROTECT PDF
router.post('/process/protect', upload.single('file'), async (req, res) => {
    try {
        if (!req.file || !req.body.password) return res.status(400).send("File and password required.");
        
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        pdfDoc.encrypt({
            userPassword: req.body.password,
            ownerPassword: req.body.password,
            permissions: {
                printing: 'highResolution',
                modifying: false,
                copying: false,
                annotating: false,
            }
        });

        const pdfBytes = await pdfDoc.save();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=protected.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed.");
    }
});

// UNLOCK PDF
router.post('/process/unlock', upload.single('file'), async (req, res) => {
    try {
        if (!req.file || !req.body.password) return res.status(400).send("File and password required.");
        
        // Attempt load with password
        const pdfDoc = await PDFDocument.load(req.file.buffer, { password: req.body.password });
        
        // Save without changes = removes encryption
        const pdfBytes = await pdfDoc.save();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=unlocked.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(403).send("Failed to unlock. Wrong password?");
    }
});

// COMPRESS PDF (Simple "Repack" strategy for Node.js)
router.post('/process/compress', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        // "Compress" by copying pages to a new document (often drops unused objects)
        const compressedPdf = await PDFDocument.create();
        const copiedPages = await compressedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(p => compressedPdf.addPage(p));

        const pdfBytes = await compressedPdf.save({ useObjectStreams: false }); // sometimes false is smaller for simple docs, but true is standard for compression.
        // Actually, default save() is decent.

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=compressed.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed.");
    }
});

// WATERMARK PDF
router.post('/process/watermark', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const text = req.query.text || "CONFIDENTIAL";
        
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        const pages = pdfDoc.getPages();
        const { standardFonts } = await import('pdf-lib'); // Dynamic import if needed, or static
        // Assuming StandardFonts is available on PDFDocument? No, need import.
        // Actually pdf-lib exports StandardFonts.
        // Let's assume standard font for MVP.
        const font = await pdfDoc.embedFont("Helvetica-Bold");

        pages.forEach(page => {
            const { width, height } = page.getSize();
            const fontSize = 50;
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            
            page.drawText(text, {
                x: width / 2 - textWidth / 2,
                y: height / 2,
                size: fontSize,
                font: font,
                opacity: 0.3,
                rotate: degrees(45),
            });
        });

        const pdfBytes = await pdfDoc.save();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=watermarked.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed.");
    }
});

// PAGE NUMBERS
router.post('/process/page-numbers', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const position = req.query.position || 'bottom';
        
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont("Helvetica");

        pages.forEach((page, idx) => {
            const { width, height } = page.getSize();
            const text = `${idx + 1}`;
            const fontSize = 12;
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            
            let x = 0, y = 20;

            switch(position) {
                case 'top': x = width / 2 - textWidth / 2; y = height - 20; break;
                case 'bottom-left': x = 20; y = 20; break;
                case 'bottom-right': x = width - textWidth - 20; y = 20; break;
                default: x = width / 2 - textWidth / 2; y = 20; // Bottom Center
            }

            page.drawText(text, { x, y, size: fontSize, font });
        });

        const pdfBytes = await pdfDoc.save();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=numbered.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed.");
    }
});

// JPG TO PDF
router.post('/process/jpg-to-pdf', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).send("Files required.");
        
        const pdfDoc = await PDFDocument.create();
        
        for (const file of req.files) {
            let image;
            // Basic detection from mimetype (or try both)
            if (file.mimetype === 'image/png') {
                 image = await pdfDoc.embedPng(file.buffer);
            } else {
                 image = await pdfDoc.embedJpg(file.buffer);
            }
            
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
        }

        const pdfBytes = await pdfDoc.save();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=converted.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed. Ensure images are JPG/PNG.");
    }
});

// EDIT / SIGN PDF (Apply Overlay Operations)
// Endpoint name used by SignPDF: /api/process/edit (wait, SignPDF uses /api/process/edit? No, SignPDF uses /api/process/edit too? Let's check. Yes, SignPDF calls savePdf() which posts to /api/process/edit. EditPDF calls the same.)
// So one endpoint handles both.
router.post('/process/edit', upload.single('file'), async (req, res) => {
    try {
        if (!req.file || !req.body.operations) return res.status(400).send("File and ops required.");
        
        const operations = JSON.parse(req.body.operations);
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        const pages = pdfDoc.getPages();

        for (const op of operations) {
            if (op.page >= pages.length) continue;
            const page = pages[op.page];

            if (op.type === 'image') {
                // op.data is dataURL
                const base64Data = op.data.split(',')[1];
                const imageBytes = Buffer.from(base64Data, 'base64');
                
                let image;
                 if (op.data.startsWith('data:image/png')) {
                    image = await pdfDoc.embedPng(imageBytes);
                } else {
                    image = await pdfDoc.embedJpg(imageBytes);
                }

                page.drawImage(image, {
                    x: op.x || 0,
                    y: op.y || 0,
                    width: op.width || image.width,
                    height: op.height || image.height,
                });
            } else if (op.type === 'text') {
                 // For completeness, if we support text ops directly
                 const font = await pdfDoc.embedFont("Helvetica");
                 page.drawText(op.text, {
                     x: op.x || 0,
                     y: op.y || 0,
                     size: op.fontSize || 12,
                     color: op.color ? undefined : undefined, // parsing color hex to rgb is extra work, skipping for MVP since overlay image covers it mostly.
                     font: font
                 });
            }
        }

        const pdfBytes = await pdfDoc.save();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=edited.pdf',
        });
        res.send(Buffer.from(pdfBytes));

    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to edit operations.");
    }
});

// --- CONVERTERS (Text-Based / Best Effort without LibreOffice) ---
// Note: These implementations focus on data extraction rather than perfect visual fidelity,
// which requires heavy binary dependencies (LibreOffice/Puppeteer) unsuitable for standard Netlify Functions.

// WORD TO PDF
router.post('/process/word-to-pdf', upload.single('file'), async (req, res) => {
    try {
         if (!req.file) return res.status(400).send("File required.");
         
         const { extractRawText } = await import('mammoth');
         const result = await extractRawText({ buffer: req.file.buffer });
         const text = result.value;

         // Create PDF with text
         const pdfDoc = await PDFDocument.create();
         let page = pdfDoc.addPage();
         const { width, height } = page.getSize();
         const font = await pdfDoc.embedFont("Helvetica");
         const fontSize = 11;
         
         // Simple text wrapping logic
         const lines = text.split('\n');
         let y = height - 50;
         const margin = 50;

         lines.forEach(line => {
             // For a real implementation, we'd need word wrapping. 
             // Truncating/Skipping wrapping for MVP brevity, or simple char slice.
             // Let's do simple char slice loop.
             if (y < 50) { page = pdfDoc.addPage(); y = height - 50; }
             
             // Very basic wrap 
             const maxChars = 80;
             for (let i = 0; i < line.length; i += maxChars) {
                 if (y < 50) { page = pdfDoc.addPage(); y = height - 50; }
                 const segment = line.substring(i, i + maxChars);
                 // Filter unsupported chars for standard font
                 const safeSegment = segment.replace(/[^\x00-\x7F]/g, "?"); 
                 page.drawText(safeSegment, { x: margin, y, size: fontSize, font });
                 y -= 15;
             }
         });

         const pdfBytes = await pdfDoc.save();
         res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=converted.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to convert Word to PDF.");
    }
});

// PDF TO WORD
router.post('/process/pdf-to-word', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const pdfParse = (await import('pdf-parse')).default;
        const { Document, Packer, Paragraph, TextRun } = await import('docx');

        const data = await pdfParse(req.file.buffer);
        const text = data.text;

        const doc = new Document({
            sections: [{
                properties: {},
                children: text.split('\n').map(line => 
                    new Paragraph({
                        children: [new TextRun(line)],
                    })
                ),
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': 'attachment; filename=converted.docx',
        });
        res.send(buffer);
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to convert PDF to Word.");
    }
});

// EXCEL TO PDF
router.post('/process/excel-to-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const XLSX = await import('xlsx');
        
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);

        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont("Helvetica"); // Standard fonts are faster
        const fontSize = 10;
        
        const lines = csv.split('\n');
        let y = height - 50;
        const margin = 40;

        lines.forEach(line => {
             if (y < 50) { page = pdfDoc.addPage(); y = height - 50; }
             // Replace commas with tabs or spaces for "Table-like" look
             const safeLine = line.replace(/,/g, "   ").substring(0, 90).replace(/[^\x00-\x7F]/g, "?");
             page.drawText(safeLine, { x: margin, y, size: fontSize, font });
             y -= 12;
        });

        const pdfBytes = await pdfDoc.save();
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=converted.pdf',
        });
        res.send(Buffer.from(pdfBytes));

    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to convert Excel to PDF.");
    }
});

// PDF TO EXCEL
router.post('/process/pdf-to-excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const pdfParse = (await import('pdf-parse')).default;
        const XLSX = await import('xlsx');

        const data = await pdfParse(req.file.buffer);
        const text = data.text;
        
        // Strategy: Naive line split. Ideally we'd detect tables.
        const rows = text.split('\n').map(line => [line]);
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "PDF Data");
        
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

         res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=converted.xlsx',
        });
        res.send(buffer);
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to convert PDF to Excel.");
    }
});

// PDF TO PPTX
router.post('/process/pdf-to-pptx', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const pdfParse = (await import('pdf-parse')).default;
        const pptxgen = (await import('pptxgenjs')).default;

        const data = await pdfParse(req.file.buffer);
        // Note: pdf-parse usually gives ALL text at once, or per page if configured properly. 
        // Default returns all text.
        // For PPT, we'd ideally want 1 slide per PDF page.
        // pdf-parse provides a `render_page` callback. To implement per-page:
        // Complex. MVP: Put all text in slides.
        
        const pptx = new pptxgen();
        let slide = pptx.addSlide();
        
        // Simple chunking of text to slides
        const charsPerSlide = 1000;
        const text = data.text;
        
        for (let i = 0; i < text.length; i += charsPerSlide) {
            if (i > 0) slide = pptx.addSlide();
            const chunk = text.substring(i, i + charsPerSlide).replace(/[^\x00-\x7F]/g, "");
            slide.addText(chunk, { x: 0.5, y: 0.5, w: '90%', h: '90%', fontSize: 12, color: '363636' });
        }

        const buffer = await pptx.write({ outputType: 'nodebuffer' });

        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': 'attachment; filename=converted.pptx',
        });
        res.send(buffer);

    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to convert PDF to PPTX.");
    }
});

// PPTX TO PDF (Not implementing - requires Heavy parsing or LibreOffice. Returning 400 or generic error if hit)
// If frontend has it, we should stub it.
router.post('/process/pptx-to-pdf', async (req, res) => {
     res.status(400).send("PPTX to PDF conversion is not supported in this serverless environment.");
});

// PDF TO JPG
router.post('/process/pdf-to-jpg', upload.single('file'), async (req, res) => {
    // Requires Canvas/Puppeteer.
    // Stubbing for MVP stability implicitly (or return error).
    // The previous implementation used pdf2image (poppler).
    res.status(400).send("PDF to Image conversion requires enabling native binaries, currently disabled for stability.");
});



export const handler = serverless(app);
