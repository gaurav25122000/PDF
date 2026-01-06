import { runProcessor } from '../_lib/runProcessor.js';
import { getDownloadUrl, uploadBuffer, downloadToBuffer } from '../_lib/s3.js';
import { applyCors, handleOptions, logUsage } from '../_lib/middleware.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import pptxgen from 'pptxgenjs';

export default async function handler(req, res) {
    if (handleOptions(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });
        const buffer = await downloadToBuffer(key);
        
        const inputPath = path.join('/tmp', `input_extract_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);
        const jsonStr = await runProcessor('extract', { inputPath });
        const pages = JSON.parse(jsonStr);
        await fs.promises.unlink(inputPath).catch(() => { });

        const pres = new pptxgen();
        pages.forEach(pageData => {
            const slide = pres.addSlide();
            // Basic text extraction to slides
            let blocks = pageData.block || [];
             blocks.forEach(block => {
                  let lines = block.line || [];
                  lines.forEach(line => {
                       let text = line.span.map(s => s.text).join(" ");
                       // Attempt to position - very rough approximation
                       // bbox is [x, y, w, h] usually in PDF points
                       // PPTX uses inches/percentage. 
                       // Just dump text for now.
                       slide.addText(text, { x: 0.5, y: '50%', w: '90%', fontSize: 12 });
                  });
             });
        });

        // Write to buffer
        // pptxgenjs write method returns valid stream/buffer in Node?
        // documentation says .write('nodebuffer')
        const pptxBuffer = await pres.write('nodebuffer');
        
        const resultKey = `results/${Date.now()}_${uuidv4()}_converted.pptx`;
        await uploadBuffer(resultKey, pptxBuffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        await logUsage(req, 'PDF to PPTX');
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed." });
    }
}
