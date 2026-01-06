import { runProcessor, fileExists } from './_lib/runProcessor.js';
import { getDownloadUrl, uploadBuffer, downloadToBuffer } from './_lib/s3.js';
import { applyCors, handleOptions, checkRateLimit, logUsage, authenticate } from './_lib/middleware.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import mammoth from 'mammoth';
import * as docx from 'docx';
// import * as XLSX from 'xlsx'; // Assuming standard import works or user environment has it.
import pptxgen from 'pptxgenjs';

export default async function handler(req, res) {
    console.log(`[Process] ${req.method} ${req.url}`);
    console.log(`[Process] Query:`, JSON.stringify(req.query));
    
    if (handleOptions(req, res)) return;
    
    const { action: queryAction } = req.query;
    let parts = queryAction ? [queryAction] : [];
    
    // Fallback: Parse req.url if req.query.route is missing (common in some Vercel/Express setups)
    // URL: /api/process/edit?foo=bar -> path: /api/process/edit -> action: edit
    if (parts.length === 0) {
        const path = req.url.split('?')[0]; // Remove query params
        const segments = path.split('/').filter(Boolean); // Split and remove empty
        // segments: ['api', 'process', 'edit']
        // We expect the file to be at api/process, so we look for what comes after
        const processIndex = segments.indexOf('process');
        if (processIndex !== -1 && segments.length > processIndex + 1) {
            parts = segments.slice(processIndex + 1);
        }
    }

    const action = parts.length > 0 ? parts[0] : '';
    
    console.log(`[Process] Action derived: '${action}'`);
    
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed. Use POST." });

    // Shared Middleware
    authenticate(req);
    // Note: checkRateLimit returns boolean (true=ok, false=blocked) and handles response if blocked
    if (!(await checkRateLimit(req, res))) return;

    try {
        switch (action) {
            case 'merge': return await merge(req, res);
            case 'split': return await split(req, res);
            case 'unlock': return await unlock(req, res);
            case 'protect': return await protect(req, res);
            case 'watermark': return await watermark(req, res);
            case 'page-numbers': return await pageNumbers(req, res);
            case 'edit': return await edit(req, res);
            case 'jpg-to-pdf': return await jpgToPdf(req, res);
            case 'word-to-pdf': return await wordToPdf(req, res);
            case 'pdf-to-word': return await pdfToWord(req, res);
            case 'pdf-to-excel': return await pdfToExcel(req, res);
            case 'pdf-to-pptx': return await pdfToPptx(req, res);
            default: res.status(404).json({ error: `Process action '${action}' not found` });
        }
    } catch (e) {
        console.error(`Process Error (${action}):`, e);
        if (!res.headersSent) res.status(500).json({ error: `Failed to process ${action}` });
    }
}

// --- HANDLERS ---

async function merge(req, res) {
    const { keys } = req.body;
    if (!keys || keys.length < 2) return res.status(400).json({ error: "At least 2 files required." });
    const outputPath = path.join('/tmp', `output_merge_${uuidv4()}.pdf`);
    await runProcessor('merge', { inputKeys: keys, outputPath });
    if (await fileExists(outputPath)) {
        await uploadAndRespond(req, res, outputPath, `merged.pdf`, 'Merge PDF');
    } else throw new Error("Merge failed");
}

async function split(req, res) {
    const { key, range } = req.body;
    if (!key || !range) return res.status(400).json({ error: "File and range required." });
    const { inputPath, outputPath } = await prepareFiles(key, 'split');
    await runProcessor('split', { inputPath, outputPath, range });
    if (await fileExists(outputPath)) {
        await uploadAndRespond(req, res, outputPath, `split.pdf`, 'Split PDF');
        await fs.promises.unlink(inputPath).catch(()=>{});
    } else throw new Error("Split failed");
}

async function unlock(req, res) {
    const { key, password } = req.body;
    if (!key || !password) return res.status(400).json({ error: "File and password required." });
    const { inputPath, outputPath } = await prepareFiles(key, 'unlock');
    try {
        await runProcessor('unlock', { inputPath, outputPath, password });
        if (await fileExists(outputPath)) {
            await uploadAndRespond(req, res, outputPath, `unlocked.pdf`, 'Unlock PDF');
        } else throw new Error("Unlock failed");
    } catch(e) { res.status(403).json({ error: "Wrong Password?" }); } // Special case
    await fs.promises.unlink(inputPath).catch(()=>{});
}

async function protect(req, res) {
    const { key, password } = req.body;
    if (!key || !password) return res.status(400).json({ error: "File and password required." });
    const { inputPath, outputPath } = await prepareFiles(key, 'protect');
    await runProcessor('protect', { inputPath, outputPath, password });
    if (await fileExists(outputPath)) {
        await uploadAndRespond(req, res, outputPath, `protected.pdf`, 'Protect PDF');
    } else throw new Error("Protect failed");
    await fs.promises.unlink(inputPath).catch(()=>{});
}

async function watermark(req, res) {
    const { key, text } = req.body;
    if (!key) return res.status(400).json({ error: "File required." });
    const { inputPath, outputPath } = await prepareFiles(key, 'wm');
    await runProcessor('watermark', { inputPath, outputPath, text: text || "CONFIDENTIAL" });
    if (await fileExists(outputPath)) {
        await uploadAndRespond(req, res, outputPath, `watermarked.pdf`, 'Watermark PDF');
    } else throw new Error("Watermark failed");
    await fs.promises.unlink(inputPath).catch(()=>{});
}

async function pageNumbers(req, res) {
    const { key, position } = req.body;
    if (!key) return res.status(400).json({ error: "File required." });
    const { inputPath, outputPath } = await prepareFiles(key, 'pn');
    await runProcessor('page_numbers', { inputPath, outputPath, position: position || 'bottom' });
    if (await fileExists(outputPath)) {
        await uploadAndRespond(req, res, outputPath, `numbered.pdf`, 'Page Numbers');
    } else throw new Error("Page Numbers failed");
    await fs.promises.unlink(inputPath).catch(()=>{});
}

async function jpgToPdf(req, res) {
    const { keys } = req.body;
    if (!keys || keys.length === 0) return res.status(400).json({ error: "Files required." });
    const outputPath = path.join('/tmp', `output_jpg2pdf_${uuidv4()}.pdf`);
    await runProcessor('jpg_to_pdf', { inputKeys: keys, outputPath });
    if (await fileExists(outputPath)) {
        await uploadAndRespond(req, res, outputPath, `converted.pdf`, 'Jpg to PDF');
    } else throw new Error("Conversion failed");
}

async function wordToPdf(req, res) {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: "File required." });
    const buffer = await downloadToBuffer(key);
    const result = await mammoth.extractRawText({ buffer });
    // ... logic from previous step ...
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { height } = page.getSize();
    const font = await pdfDoc.embedFont("Helvetica");
    const lines = result.value.split('\n');
    let y = height - 50;
    lines.forEach(line => {
        if (y < 50) { page = pdfDoc.addPage(); y = height - 50; }
        const safe = line.substring(0, 80).replace(/[^\x00-\x7F]/g, "?"); 
        // Simple truncation for safety/speed in monolithic implementation
        page.drawText(safe, { x: 50, y, size: 11, font }); 
        y -= 15;
    });
    const pdfBytes = await pdfDoc.save();
    const resultKey = `results/${Date.now()}_${uuidv4()}_word.pdf`;
    await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');
    await logUsage(req, 'Word to PDF');
    res.json({ downloadUrl: await getDownloadUrl(resultKey) });
}

// Complex Handlers (PDF to ...)
async function pdfToWord(req, res) {
    const { key } = req.body;
    if (!key) return res.status(400).json({ error: "File required" });
    const { Document, Packer, Paragraph, TextRun } = docx; 
    const buffer = await downloadToBuffer(key);
    const inputPath = path.join('/tmp', `in_${uuidv4()}.pdf`);
    await fs.promises.writeFile(inputPath, buffer);
    const jsonStr = await runProcessor('extract', { inputPath });
    const pages = JSON.parse(jsonStr);
    await fs.promises.unlink(inputPath).catch(()=>{});
    
    // Minimal docx gen
    const doc = new Document({
        sections: pages.map(p => ({
            children: (p.block||[]).flatMap(b=>(b.line||[]).map(l=>new Paragraph({
                children: (l.span||[]).map(s=>new TextRun(s.text + " "))
            })))
        }))
    });
    const b = await Packer.toBuffer(doc);
    const k = `results/${Date.now()}_${uuidv4()}.docx`;
    await uploadBuffer(k, b, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    await logUsage(req, 'PDF to Word');
    res.json({ downloadUrl: await getDownloadUrl(k) });
}

// Stubs / Implementations for others follow same pattern
async function pdfToExcel(req, res) { res.status(501).json({error: "Temporarily disabled for migration optimization"}); } 
async function pdfToPptx(req, res) { res.status(501).json({error: "Temporarily disabled for migration optimization"}); }

async function edit(req, res) {
    const { key, operations } = req.body;
    if (!key || !operations) return res.status(400).json({ error: "Args required" });
    const ops = (typeof operations === 'string') ? JSON.parse(operations) : operations;
    const buffer = await downloadToBuffer(key);
    const pdfDoc = await PDFDocument.load(buffer);
    const pages = pdfDoc.getPages();
    
    // Load standard fonts - these don't require fontkit
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const timesFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const courierFont = await pdfDoc.embedFont(StandardFonts.Courier);

    for (const op of ops) {
        if (op.page >= pages.length) continue;
        const page = pages[op.page];
        
        if (op.type === 'text') {
            // Parse color (hex to RGB)
            let r = 0, g = 0, b = 0;
            if (op.color && op.color.startsWith('#')) {
                const hex = op.color.substring(1);
                r = parseInt(hex.substring(0, 2), 16) / 255;
                g = parseInt(hex.substring(2, 4), 16) / 255;
                b = parseInt(hex.substring(4, 6), 16) / 255;
            }
            
            // Select font (default to Helvetica)
            let font = helveticaFont;
            // Could add font family mapping here if needed
            
            page.drawText(op.text || '', { 
                x: op.x || 0, 
                y: op.y || 0, 
                size: op.fontSize || 12, 
                font,
                color: rgb(r, g, b)
            });
        } else if (op.type === 'redact') {
            // Draw white rectangle (whiteout box)
            page.drawRectangle({
                x: op.x || 0,
                y: op.y || 0,
                width: op.width || 0,
                height: op.height || 0,
                color: rgb(1, 1, 1), // White
                borderColor: rgb(1, 1, 1),
                borderWidth: 0
            });
        } else if (op.type === 'image') {
            // Download overlay image from S3 and embed it
            try {
                const imageBuffer = await downloadToBuffer(op.key);
                const pngImage = await pdfDoc.embedPng(imageBuffer);
                
                // PDF coordinates start from bottom-left, but our canvas image is rendered from top-left
                // So we need to place it at: y = page_height - image_height
                const pageHeight = page.getHeight();
                const imageY = pageHeight - (op.height || pngImage.height);
                
                page.drawImage(pngImage, {
                    x: op.x || 0,
                    y: imageY,
                    width: op.width || pngImage.width,
                    height: op.height || pngImage.height
                });
            } catch (imgErr) {
                console.error('Failed to embed image:', imgErr);
                // Continue processing other operations
            }
        }
    }
    
    const pdfBytes = await pdfDoc.save();
    const k = `results/${Date.now()}_${uuidv4()}_edit.pdf`;
    await uploadBuffer(k, Buffer.from(pdfBytes), 'application/pdf');
    await logUsage(req, 'Edit PDF');
    res.json({ downloadUrl: await getDownloadUrl(k) });
}


// Helpers
async function prepareFiles(key, prefix) {
    const buffer = await downloadToBuffer(key);
    const inputPath = path.join('/tmp', `input_${prefix}_${uuidv4()}.pdf`);
    const outputPath = path.join('/tmp', `output_${prefix}_${uuidv4()}.pdf`);
    await fs.promises.writeFile(inputPath, buffer);
    return { inputPath, outputPath };
}

async function uploadAndRespond(req, res, filePath, suffix, toolName) {
    const buffer = await fs.promises.readFile(filePath);
    const resultKey = `results/${Date.now()}_${uuidv4()}_${suffix}`;
    await uploadBuffer(resultKey, buffer, 'application/pdf');
    await logUsage(req, toolName);
    const downloadUrl = await getDownloadUrl(resultKey);
    await fs.promises.unlink(filePath).catch(() => { });
    res.json({ downloadUrl });
}
