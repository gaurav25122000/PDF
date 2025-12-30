import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument, degrees } from 'pdf-lib';
import archiver from 'archiver';
import { Stream } from 'stream';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
const router = express.Router();

// DEBUG: Catch-all to see what's happening if no route matches
router.all('*', (req, res, next) => {
    // Check if we have a matching route layer roughly (optional, but let's just log or pass through)
    // Actually, we want the specific routes to take precedence. 
    // Express runs middleware in order. 
    // If I put this at the TOP, it intercepts everything. 
    // I should put the catch-all at the BOTTOM of the router?
    // No, `router.all` matches everything. 
    // If I want it to catch "Not Found", it should be LAST.
    // BUT, right now it's used for debugging "Incoming Request".
    // Let's change it to log-only middleware or remove it?
    // User response showed it returned JSON. So it terminated the request.
    // If I want to restore function, I MUST remove this terminating catch-all from the TOP 
    // OR make it call `next()`.
    // I'll make it a logger for now, call next()
    console.log(`Incoming: ${req.method} ${req.url}`);
    next();
});

// Mount router on various paths to handle Netlify's rewriting quirks
app.use('/.netlify/functions/api', router);
app.use('/api', router);
app.use('/', router);

import { getUploadUrl, getDownloadUrl, downloadToBuffer, uploadBuffer } from './s3.js';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);
import { Document, Packer, Paragraph, TextRun } from 'docx';

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit per file (Still useful for small files or local dev)
});

// S3 Routes
router.post('/s3/upload-url', async (req, res) => {
    try {
        const { filename, contentType } = req.body;
        const key = `uploads/${Date.now()}_${uuidv4()}_${filename}`; // sanitized unique key
        const uploadUrl = await getUploadUrl(key, contentType);
        res.json({ uploadUrl, key });
    } catch (e) {
        console.error("S3 Upload URL Error:", e);
        res.status(500).json({ error: "Failed to get upload URL" });
    }
});


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

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me';

// MIDDLEWARE: Parse User from Token (Optional)
// Populates req.user if valid token found
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) req.user = user;
            next();
        });
    } else {
        next();
    }
};

// MIDDLEWARE: Rate Limiter (3 per 24 hours)
const checkRateLimit = async (req, res, next) => {
    try {
        const userId = req.user ? req.user.id : null;
        const ip = req.headers['client-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        let countResult;
        let oldestRequestResult;

        if (userId) {
            countResult = await query(
                'SELECT COUNT(*) FROM usage_logs WHERE user_id = $1 AND created_at > $2',
                [userId, oneDayAgo]
            );
            oldestRequestResult = await query(
                'SELECT created_at FROM usage_logs WHERE user_id = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 1',
                [userId, oneDayAgo]
            );
        } else {
            countResult = await query(
                'SELECT COUNT(*) FROM usage_logs WHERE ip_address = $1 AND created_at > $2',
                [ip, oneDayAgo]
            );
            oldestRequestResult = await query(
                'SELECT created_at FROM usage_logs WHERE ip_address = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 1',
                [ip, oneDayAgo]
            );
        }

        const count = parseInt(countResult.rows[0].count);

        // Calculate Reset Time
        let resetTime = null;
        if (oldestRequestResult.rows.length > 0) {
            const oldestDate = new Date(oldestRequestResult.rows[0].created_at);
            resetTime = new Date(oldestDate.getTime() + 24 * 60 * 60 * 1000);
        }

        if (count >= 300) {
            return res.status(429).json({
                error: "Daily limit reached.",
                usage: count,
                limit: 300,
                resetTime: resetTime
            });
        }

        req.usageInfo = { userId, ip };
        next();

    } catch (e) {
        console.error("Rate Limit Error:", e);
        next();
    }
};

// HELPER: Log Usage
const logUsage = async (req, toolName) => {
    if (!req.usageInfo) return;
    try {
        await query(
            'INSERT INTO usage_logs (user_id, ip_address, tool_name) VALUES ($1, $2, $3)',
            [req.usageInfo.userId, req.usageInfo.ip, toolName || 'Unknown']
        );
    } catch (e) {
        console.error("Failed to log usage:", e);
    }
};

// Helper to check if a file exists
const fileExists = async (path) => {
    try {
        await fs.promises.access(path, fs.constants.F_OK);
        return true;
    } catch (e) {
        return false;
    }
};

// Helper to run Python Process
const runPythonProcess = async (command, inputPath, outputPath, password) => {
    // Ensure python3 and pymupdf are available.
    // In Netlify, we might need to rely on `python3` being in path.
    // command: 'extract', 'compress', 'protect'
    
    let cmd = `python3 netlify/functions/process_pdf.py ${command} "${inputPath}"`;
    if (outputPath) cmd += ` --output_path "${outputPath}"`;
    if (password) cmd += ` --password "${password}"`;
    
    console.log(`[PyMuPDF] Executing: ${command}`);
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr) console.error(`[PyMuPDF] Stderr: ${stderr}`);
    return stdout;
};


// PDF TO WORD (Rich Formatting + Images)
router.post('/process/pdf-to-word', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const buffer = await downloadToBuffer(key);
        const { Document, Packer, Paragraph, TextRun, ImageRun } = docx;

        // Use Python Extractor
        const inputPath = path.join('/tmp', `input_extract_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);
        
        const jsonStr = await runPythonProcess('extract', inputPath);
        const pages = JSON.parse(jsonStr);
        
        await fs.promises.unlink(inputPath).catch(() => {});

        const doc = new Document({
            sections: pages.map(page => {
                const children = [];
                
                // 1. Add Images
                if (page.images && Array.isArray(page.images)) {
                    page.images.forEach(img => {
                         try {
                             children.push(new Paragraph({
                                 children: [
                                     new ImageRun({
                                         data: Buffer.from(img.data, 'base64'),
                                         transformation: {
                                             width: img.width || 200,
                                             height: img.height || 200
                                         }
                                     })
                                 ]
                             }));
                         } catch (e) { console.log('Image add err', e); }
                    });
                }

                // 2. Add Text Blocks
                let blocks = page.block || [];
                blocks.forEach(block => {
                    let lines = block.line || [];
                    lines.forEach(line => {
                        let spans = line.span || [];
                        const runChildren = spans.map(span => {
                            // Python JSON: { text, size, font, color, bbox }
                            // Docx size is half-points.
                            let size = (span.size || 12) * 2;
                            // Color: "FF0000" -> Docx expects hex without #
                            let color = span.color || "000000";
                            
                            return new TextRun({
                                text: span.text + " ", // Space preservation
                                size: size,
                                font: "Helvetica", // fallback
                                color: color
                            });
                        });

                        children.push(new Paragraph({
                            children: runChildren
                        }));
                    });
                });

                return {
                    properties: {},
                    children: children
                };
            })
        });

        const docxBuffer = await Packer.toBuffer(doc);
        const resultKey = `results/${Date.now()}_${uuidv4()}_converted.docx`;
        await uploadBuffer(resultKey, docxBuffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        await logUsage(req, 'PDF to Word');
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to convert PDF to Word." });
    }
});

// PDF TO EXCEL
router.post('/process/pdf-to-excel', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const buffer = await downloadToBuffer(key);
        const XLSX = await import('xlsx');
        
        const inputPath = path.join('/tmp', `input_extract_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);
        const jsonStr = await runPythonProcess('extract', inputPath);
        const pages = JSON.parse(jsonStr);
        await fs.promises.unlink(inputPath).catch(() => {});

        const allRows = [];
        
        pages.forEach(page => {
             const spans = [];
             let blocks = page.block || [];
             blocks.forEach(block => {
                let lines = block.line || [];
                lines.forEach(line => {
                    let lineSpans = line.span || [];
                    lineSpans.forEach(s => {
                         // s: { text, bbox: [x, y, x2, y2] }
                         const x = s.bbox[0];
                         const y = s.bbox[1];
                         if (s.text.trim()) spans.push({ text: s.text, x, y });
                    });
                });
             });
             
             spans.sort((a, b) => {
                 if (Math.abs(a.y - b.y) > 5) return a.y - b.y; // Top-Down (y increases downwards? No PDF is Y-up usually vs PyMuPDF 'dict' is top-down? PyMuPDF 'dict' is usually top-left origin (0,0) and Y increases downwards. Let's assume standard image coords.)
                 return a.x - b.x;
             });
             
             let currentRow = [];
             let currentY = -9999;
             
             spans.forEach(span => {
                 if (Math.abs(span.y - currentY) > 10) {
                     if (currentRow.length > 0) allRows.push(currentRow);
                     currentRow = [];
                     currentY = span.y;
                     currentRow.push(span.text);
                 } else {
                     currentRow.push(span.text);
                 }
             });
             if (currentRow.length > 0) allRows.push(currentRow);
             allRows.push([]); // Page break
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(allRows);
        XLSX.utils.book_append_sheet(wb, ws, "PDF Data");
        const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const resultKey = `results/${Date.now()}_${uuidv4()}_converted.xlsx`;
        await uploadBuffer(resultKey, xlsxBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        await logUsage(req, 'PDF to Excel');
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to convert PDF to Excel." });
    }
});

// PDF TO PPTX
router.post('/process/pdf-to-pptx', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const buffer = await downloadToBuffer(key);
        const pptxgen = (await import('pptxgenjs')).default;
        
        const inputPath = path.join('/tmp', `input_extract_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);
        const jsonStr = await runPythonProcess('extract', inputPath);
        const pages = JSON.parse(jsonStr);
        await fs.promises.unlink(inputPath).catch(() => {});

        const pptx = new pptxgen();

        pages.forEach(page => {
            const slide = pptx.addSlide();
            
            // 1. Add Images
            if (page.images && Array.isArray(page.images)) {
                 page.images.forEach((img, idx) => {
                     try {
                         if (img.data) {
                             slide.addImage({ 
                                 data: `data:image/png;base64,${img.data}`, 
                                 x: 0.5, y: 0.5 + (idx * 3), w: 4, h: 3 
                             });
                         }
                     } catch(e) {}
                 });
            }
            
            // 2. Add Text Blocks
             let blocks = page.block || [];
             blocks.forEach(block => {
                let lines = block.line || [];
                let blockText = "";
                lines.forEach(line => {
                    let spans = line.span || [];
                    spans.forEach(s => {
                         blockText += s.text + " ";
                    });
                    blockText += "\n";
                });
                
                // Can we get color from first span?
                // Default black
                slide.addText(blockText, { x: 0.5, y: 0.5, w: '90%', h: 'auto', fontSize: 12, color: '363636' });
             });
        });

        const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' });
        const resultKey = `results/${Date.now()}_${uuidv4()}_converted.pptx`;
        await uploadBuffer(resultKey, pptxBuffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        await logUsage(req, 'PDF to PPTX');
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to convert PDF to PPTX." });
    }
});


// PROTECT PDF
router.post('/process/protect', express.json(), async (req, res) => {
    try {
        const { key, password } = req.body;
        if (!key || !password) return res.status(400).json({ error: "File and password required." });
        if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters long." });

        const buffer = await downloadToBuffer(key);
        
        const inputPath = path.join('/tmp', `input_protect_${uuidv4()}.pdf`);
        const outputPath = path.join('/tmp', `output_protect_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);

        // Call Python
        await runPythonProcess('protect', inputPath, outputPath, password);
        
        const protectedBytes = await fs.promises.readFile(outputPath);

        await fs.promises.unlink(inputPath).catch(() => {});
        await fs.promises.unlink(outputPath).catch(() => {});

        const resultKey = `results/${Date.now()}_${uuidv4()}_protected.pdf`;
        await uploadBuffer(resultKey, protectedBytes, 'application/pdf');
        await logUsage(req, 'Protect PDF');

        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to protect PDF." });
    }
});


// COMPRESS PDF
router.post('/process/compress', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const buffer = await downloadToBuffer(key);

        const inputPath = path.join('/tmp', `input_compress_${uuidv4()}.pdf`);
        const outputPath = path.join('/tmp', `output_compress_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);

        // Call Python
        await runPythonProcess('compress', inputPath, outputPath);
        
        if (await fileExists(outputPath)) {
            const compressedBuffer = await fs.readFile(outputPath);
            const resultKey = `results/${Date.now()}_${uuidv4()}_compressed.pdf`;
            await uploadBuffer(resultKey, compressedBuffer, 'application/pdf');
            await logUsage(req, 'Compress PDF');
            const downloadUrl = await getDownloadUrl(resultKey);
            
            await fs.unlink(inputPath).catch(() => { });
            await fs.unlink(outputPath).catch(() => { });
            
            res.json({ downloadUrl });
        } else {
             throw new Error("Compression failed (no output)");
        }
    } catch (e) {
        console.error("Compression Error:", e);
        res.status(500).json({ error: "Failed to compress PDF." });
    }
});



// PPTX TO PDF
router.post('/process/pptx-to-pdf', async (req, res) => {
    res.status(400).send("PPTX to PDF conversion is not supported in this serverless environment.");
});

// ROTATE PDF
router.post('/process/rotate', express.json(), async (req, res) => {
    try {
        const { key, angle } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const rotationAngle = parseInt(angle) || 90;

        const buffer = await downloadToBuffer(key);
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();

        pages.forEach(page => {
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees(currentRotation + rotationAngle));
        });

        const pdfBytes = await pdfDoc.save();

        const resultKey = `results/${Date.now()}_${uuidv4()}_rotated.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');

        await logUsage(req, 'Rotate PDF');

        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to rotate PDF." });
    }
});

// PDF TO JPG
router.post('/process/pdf-to-jpg', express.json(), async (req, res) => {
    // const { key } = req.body;
    res.status(400).json({ error: "PDF to Image conversion requires enabling native binaries, currently disabled for stability." });
});



const isDev = process.env.NODE_ENV !== 'production' && !process.env.NETLIFY;

if (isDev) {
    const MOCK_DIR = '/tmp/mock-s3';

    // Mock S3 Upload Route
    // Note: We need raw body or stream for this. Express json/urlencoded parser might interfere if not handled carefully for binary.
    // However, our app.use(express.json) has limit 500mb. 
    // If Content-Type is application/pdf, express default parsers won't parse it, so req.body might be empty or we need raw parser.
    // Let's use a simpler approach: explicitly handle this route BEFORE parsers if possible, or just stream req.
    // Use app.put instead of router.put to be global?
    // Actually, let's put it on `app` before parsers? No, parsers are already applied at top of file.
    // We can use `express.raw({ type: '*/*', limit: '500mb' })` for this specific route?
    
    app.put('/mock-s3/:key(*)', express.raw({ type: '*/*', limit: '500mb' }), async (req, res) => {
        try {
            const key = decodeURIComponent(req.params.key);
            const filePath = path.join(MOCK_DIR, key);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            
            // If express.raw worked, req.body is buffer.
            if (Buffer.isBuffer(req.body)) {
                 fs.writeFileSync(filePath, req.body);
            } else {
                 // Fallback if body parsing failed/skipped
                 // Stream pipe
                 const writeStream = fs.createWriteStream(filePath);
                 req.pipe(writeStream);
                 await new Promise((resolve, reject) => {
                     writeStream.on('finish', resolve);
                     writeStream.on('error', reject);
                 });
            }
            console.log(`[MockS3] Uploaded ${key}`);
            res.sendStatus(200);
        } catch (e) {
            console.error(e);
            res.status(500).send("Mock Upload Failed");
        }
    });

    // Mock S3 Download Route
    app.get('/mock-s3/:key(*)', async (req, res) => {
        const key = decodeURIComponent(req.params.key);
        const filePath = path.join(MOCK_DIR, key);
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).send("File not found in Mock S3");
        }
    });
}

if (isDev && process.argv[1].endsWith('api.js')) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Backend running locally on http://localhost:${port}`);
    });
}

export const handler = serverless(app, {
    binary: [
        'application/pdf',
        'application/zip',
        'multipart/form-data',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/*'
    ]
});
