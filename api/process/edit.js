import { getDownloadUrl, uploadBuffer, downloadToBuffer } from '../_lib/s3.js';
import { applyCors, handleOptions, checkRateLimit, logUsage, authenticate } from '../_lib/middleware.js';
import { v4 as uuidv4 } from 'uuid';
import { PDFDocument, rgb } from 'pdf-lib';

export default async function handler(req, res) {
    if (handleOptions(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    authenticate(req);
    // if (!(await checkRateLimit(req, res))) return; // Edit is intensive, maybe stricter limit? Keeping same for now.

    try {
        const { key, operations } = req.body;
        if (!key || !operations) return res.status(400).json({ error: "File and ops required." });

        const ops = (typeof operations === 'string') ? JSON.parse(operations) : operations;
        const buffer = await downloadToBuffer(key);
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont("Helvetica");

        for (const op of ops) {
            if (op.page >= pages.length) continue;
            const page = pages[op.page];

            if (op.type === 'image') {
                let imageBytes;
                if (op.key) {
                    imageBytes = await downloadToBuffer(op.key);
                } else if (op.data) {
                    const base64Data = op.data.split(',')[1];
                    imageBytes = Buffer.from(base64Data, 'base64');
                } else {
                    continue;
                }

                let image;
                try {
                    image = await pdfDoc.embedPng(imageBytes);
                } catch (e) {
                    try {
                        image = await pdfDoc.embedJpg(imageBytes);
                    } catch (e2) {
                        continue;
                    }
                }
                
                const pageWidth = page.getWidth();
                const pageHeight = page.getHeight();
                let drawOpts = {
                    x: op.x || 0,
                    y: op.y || 0,
                    width: op.width || image.width,
                    height: op.height || image.height,
                };
                if (op.key) {
                   drawOpts = { x: 0, y: 0, width: pageWidth, height: pageHeight };
                }
                page.drawImage(image, drawOpts);

            } else if (op.type === 'redact') {
                page.drawRectangle({ x: op.x, y: op.y, width: op.width, height: op.height, color: rgb(1, 1, 1), opacity: 1 });
            } else if (op.type === 'text') {
                 let color = undefined;
                 if (op.color && op.color.startsWith('#')) {
                     const r = parseInt(op.color.slice(1, 3), 16) / 255;
                     const g = parseInt(op.color.slice(3, 5), 16) / 255;
                     const b = parseInt(op.color.slice(5, 7), 16) / 255;
                     color = rgb(r, g, b);
                 }
                 page.drawText(op.text, { x: op.x || 0, y: op.y || 0, size: op.fontSize || 12, color: color, font: font });
            }
        }

        const pdfBytes = await pdfDoc.save();
        const resultKey = `results/${Date.now()}_${uuidv4()}_edited.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');
        await logUsage(req, 'Edit PDF');
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to edit operations." });
    }
}
