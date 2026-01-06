import { getUploadUrl } from '../_lib/s3.js';
import { v4 as uuidv4 } from 'uuid';
import { applyCors, handleOptions } from '../_lib/middleware.js';

export default async function handler(req, res) {
    console.log(`[S3 Upload] ${req.method} ${req.url}`);
    
    // Handle CORS / OPTIONS
    if (handleOptions(req, res)) return;

    if (req.method !== 'POST') {
        res.status(405).json({ error: "Method not allowed. Use POST." });
        return;
    }

    try {
        // Parse body if not already parsed (Vercel parses JSON automatically usually, but let's be safe)
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { filename, contentType } = body;

        if (!filename) {
            res.status(400).json({ error: "Filename is required" });
            return;
        }

        const key = `uploads/${Date.now()}_${uuidv4()}_${filename}`;
        // Default to application/pdf or octet-stream if not provided
        const cType = contentType || 'application/pdf';

        const uploadUrl = await getUploadUrl(key, cType);
        
        res.status(200).json({ uploadUrl, key });

    } catch (e) {
        console.error("S3 Upload URL Error:", e);
        res.status(500).json({ error: "Failed to get upload URL" });
    }
}
