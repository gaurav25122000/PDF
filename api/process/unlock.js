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
        const { key, password } = req.body;
        if (!key || !password) return res.status(400).json({ error: "File and password required." });

        const inputPath = path.join('/tmp', `input_unlock_${uuidv4()}.pdf`);
        const outputPath = path.join('/tmp', `output_unlock_${uuidv4()}.pdf`);
        const buffer = await downloadToBuffer(key);
        await fs.promises.writeFile(inputPath, buffer);

        await runProcessor('unlock', { inputPath, outputPath, password });

        if (await fileExists(outputPath)) {
            const buffer = await fs.promises.readFile(outputPath);
            const resultKey = `results/${Date.now()}_${uuidv4()}_unlocked.pdf`;
            await uploadBuffer(resultKey, buffer, 'application/pdf');
            await logUsage(req, 'Unlock PDF');
            const downloadUrl = await getDownloadUrl(resultKey);
            await fs.promises.unlink(inputPath).catch(() => { });
            await fs.promises.unlink(outputPath).catch(() => { });
            res.json({ downloadUrl });
        } else {
            throw new Error("Unlock failed");
        }
    } catch (e) {
        console.error(e);
        res.status(403).json({ error: "Failed to unlock. Wrong password?" });
    }
}
