import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { getUploadUrl, getDownloadUrl, downloadToBuffer, uploadBuffer } from './s3.js';

const fileExists = async (path) => {
    try {
        await fs.promises.access(path, fs.constants.F_OK);
        return true;
    } catch (e) {
        return false;
    }
};

export const runProcessor = async (command, options) => {
    let inputUrl = null;
    let inputUrls = [];

    if (options.inputPath) {
        if (!fs.existsSync(options.inputPath)) throw new Error(`Input file not found: ${options.inputPath}`);
        const inputKey = `temp_in/${uuidv4()}.pdf`;
        const inputBuffer = await fs.promises.readFile(options.inputPath);
        await uploadBuffer(inputKey, inputBuffer, 'application/pdf');
        inputUrl = await getDownloadUrl(inputKey);
    }

    if (options.inputKeys && options.inputKeys.length > 0) {
        for (const key of options.inputKeys) {
            inputUrls.push(await getDownloadUrl(key));
        }
    }

    let outputUrl = null;
    let outputKey = null;

    if (options.outputPath) {
        outputKey = `temp_out/${uuidv4()}.pdf`;
        outputUrl = await getUploadUrl(outputKey, 'application/pdf');
    }

    const payload = {
        command,
        inputUrl,
        inputUrls,
        outputUrl,
        password: options.password,
        range: options.range,
        angle: options.angle,
        text: options.text,
        position: options.position
    };

    let siteUrl;
    if (process.env.VERCEL_URL) {
        siteUrl = `https://${process.env.VERCEL_URL}`;
    } else if (process.env.URL) {
        siteUrl = process.env.URL; // Fallback
    } else {
        siteUrl = 'http://localhost:3000';
    }
    
    // Processor is mounted at /api/processor[.go]
    // Note: In Vercel Go runtime, it's just the path.
    const processorUrl = `${siteUrl}/api/processor`;
    console.log(`[Processor] Calling: ${processorUrl} with command ${command}`);

    try {
        const response = await fetch(processorUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Processor Status ${response.status}: ${errText}`);
        }

        const respJson = await response.json();
        const data = respJson;

        if (options.outputPath && outputKey) {
            const resultBuffer = await downloadToBuffer(outputKey);
            await fs.promises.writeFile(options.outputPath, resultBuffer);
        }

        if (command === 'extract') {
            return JSON.stringify(data.data);
        }

        return "Success";

    } catch (e) {
        console.error("Processor Error:", e.message);
        throw new Error(`Processor Failed: ${e.message}`);
    }
};

export { fileExists };
