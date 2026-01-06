import { runProcessor, fileExists } from '../_lib/runProcessor.js';
import { getDownloadUrl, uploadBuffer, downloadToBuffer } from '../_lib/s3.js';
import { applyCors, handleOptions, checkRateLimit, logUsage, authenticate } from '../_lib/middleware.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export default async function handler(req, res) {
    if (handleOptions(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    authenticate(req);
    if (!(await checkRateLimit(req, res))) return;

    try {
        const { key, text } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });
        const watermarkText = text || "CONFIDENTIAL";
        
        const inputPath = path.join('/tmp', `input_wm_${uuidv4()}.pdf`);
        const outputPath = path.join('/tmp', `output_wm_${uuidv4()}.pdf`);
        const buffer = await downloadToBuffer(key);
        await fs.promises.writeFile(inputPath, buffer);

        await runProcessor('watermark', { inputPath, outputPath, text: watermarkText });

        if (await fileExists(outputPath)) {
            const buffer = await fs.promises.readFile(outputPath);
            const resultKey = `results/${Date.now()}_${uuidv4()}_watermarked.pdf`;
            await uploadBuffer(resultKey, buffer, 'application/pdf');
            await logUsage(req, 'Watermark PDF');
            const downloadUrl = await getDownloadUrl(resultKey);
            await fs.promises.unlink(inputPath).catch(() => { });
            await fs.promises.unlink(outputPath).catch(() => { });
            res.json({ downloadUrl });
        } else {
            throw new Error("Watermark failed");
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed." });
    }
}
