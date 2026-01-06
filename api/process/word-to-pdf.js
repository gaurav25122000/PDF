import { getDownloadUrl, uploadBuffer, downloadToBuffer } from '../_lib/s3.js';
import { applyCors, handleOptions, logUsage, authenticate } from '../_lib/middleware.js';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument } from 'pdf-lib';
import mammoth from 'mammoth';

export default async function handler(req, res) {
    if (handleOptions(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    
    // authenticate(req); // Optional for tools sometimes, but let's consistency.

    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });
        const buffer = await downloadToBuffer(key);
        // Using mammoth extractRawText for simple conversion
        const result = await mammoth.extractRawText({ buffer: buffer });
        const text = result.value;

        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont("Helvetica");
        const fontSize = 11;
        const lines = text.split('\n');
        let y = height - 50;
        const margin = 50;

        lines.forEach(line => {
            if (y < 50) { page = pdfDoc.addPage(); y = height - 50; }
            const maxChars = 80;
            for (let i = 0; i < line.length; i += maxChars) {
                 if (y < 50) { page = pdfDoc.addPage(); y = height - 50; }
                 const segment = line.substring(i, i + maxChars);
                 // Basic sanitization
                 const safeSegment = segment.replace(/[^\x00-\x7F]/g, "?");
                 page.drawText(safeSegment, { x: margin, y, size: fontSize, font });
                 y -= 15;
            }
        });

        const pdfBytes = await pdfDoc.save();
        const resultKey = `results/${Date.now()}_${uuidv4()}_word.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');
        await logUsage(req, 'Word to PDF');
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to convert Word to PDF." });
    }
}
