import { runProcessor, fileExists } from '../_lib/runProcessor.js';
import { getDownloadUrl, uploadBuffer, downloadToBuffer } from '../_lib/s3.js';
import { applyCors, handleOptions, logUsage } from '../_lib/middleware.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import * as docx from 'docx';

export default async function handler(req, res) {
    if (handleOptions(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const buffer = await downloadToBuffer(key);
        const { Document, Packer, Paragraph, TextRun, ImageRun } = docx;

        const inputPath = path.join('/tmp', `input_extract_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);

        // Extract text/layout using Go processor
        const jsonStrWord = await runProcessor('extract', { inputPath });
        const pages = JSON.parse(jsonStrWord);
        await fs.promises.unlink(inputPath).catch(() => { });

        const doc = new Document({
            sections: pages.map(page => {
                const children = [];
                // Images
                if (page.images && Array.isArray(page.images)) {
                    page.images.forEach(img => {
                         try {
                              children.push(new Paragraph({
                                   children: [ new ImageRun({ data: Buffer.from(img.data, 'base64'), transformation: { width: img.width||200, height: img.height||200 } }) ]
                              }));
                         } catch (e) {}
                    });
                }
                // Text
                let blocks = page.block || [];
                blocks.forEach(block => {
                     let lines = block.line || [];
                     lines.forEach(line => {
                          let spans = line.span || [];
                          const runChildren = spans.map(span => {
                               return new TextRun({ text: span.text + " ", size: (span.size || 12) * 2, font: "Helvetica", color: span.color || "000000" });
                          });
                          children.push(new Paragraph({ children: runChildren }));
                     });
                });
                return { properties: {}, children: children };
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
}
