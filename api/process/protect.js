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
        if (!key || !password) return res.status(400).json({ error: "File and password required" });
        const buffer = await downloadToBuffer(key);
        const inputPath = path.join('/tmp', `input_protect_${uuidv4()}.pdf`);
        const outputPath = path.join('/tmp', `output_protect_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);
        await runProcessor('protect', { inputPath, outputPath, password });
        if (await fileExists(outputPath)) {
            const b = await fs.promises.readFile(outputPath);
            const resultKey = `results/${Date.now()}_${uuidv4()}_protected.pdf`;
            await uploadBuffer(resultKey, b, 'application/pdf');
            await logUsage(req, 'Protect PDF');
            const url = await getDownloadUrl(resultKey);
            await fs.unlink(inputPath).catch(()=>{});
            await fs.unlink(outputPath).catch(()=>{});
            res.json({ downloadUrl: url });
        } else throw new Error("Failed");
    } catch(e) { console.error(e); res.status(500).json({ error: "Failed" }); }
}
