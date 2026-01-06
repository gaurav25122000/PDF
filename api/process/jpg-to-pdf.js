import { runProcessor, fileExists } from '../_lib/runProcessor.js';
import { getDownloadUrl, uploadBuffer } from '../_lib/s3.js';
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
        const { keys } = req.body;
        if (!keys || keys.length === 0) return res.status(400).json({ error: "Files required." });

        const outputPath = path.join('/tmp', `output_jpg2pdf_${uuidv4()}.pdf`);
        await runProcessor('jpg_to_pdf', { inputKeys: keys, outputPath });

        if (await fileExists(outputPath)) {
            const buffer = await fs.promises.readFile(outputPath);
            const resultKey = `results/${Date.now()}_${uuidv4()}_converted.pdf`;
            await uploadBuffer(resultKey, buffer, 'application/pdf');
            await logUsage(req, 'Jpg to PDF');
            const downloadUrl = await getDownloadUrl(resultKey);
            await fs.promises.unlink(outputPath).catch(() => { });
            res.json({ downloadUrl });
        } else {
            throw new Error("JpgToPdf failed");
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed. Ensure images are JPG/PNG." });
    }
}
