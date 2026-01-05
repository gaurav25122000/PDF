import express from 'express';

import serverless from 'serverless-http';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument, degrees, rgb, PDFName, PDFString } from 'pdf-lib';
import archiver from 'archiver';
import { Stream } from 'stream';
import fs from 'fs';
import path from 'path';
import { createCanvas } from 'canvas';
// import * as pdfjsLib from 'pdfjs-dist'; // Use dynamic import instead

const app = express();
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
const router = express.Router();

// DEBUG: Catch-all logger
router.all('*', (req, res, next) => {
    console.log(`Incoming: ${req.method} ${req.url}`);
    next();
});

// Mount router on various paths to handle Netlify's rewriting quirks
app.use('/.netlify/functions/api', router);
app.use('/api', router);
app.use('/', router);

import { getUploadUrl, getDownloadUrl, downloadToBuffer, uploadBuffer } from './s3.js';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);
import * as docx from 'docx';

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit per file (Still useful for small files or local dev)
});

// S3 Routes
router.post('/s3/upload-url', async (req, res) => {
    try {
        const { filename, contentType } = req.body;
        const key = `uploads/${Date.now()}_${uuidv4()}_${filename}`; // sanitized unique key
        const uploadUrl = await getUploadUrl(key, contentType);
        res.json({ uploadUrl, key });
    } catch (e) {
        console.error("S3 Upload URL Error:", e);
        res.status(500).json({ error: "Failed to get upload URL" });
    }
});


/**
 * UTILITY: Parse page ranges (e.g., "1-3, 5, 8-10")
 * Returns array of 0-based indices: [0, 1, 2, 4, 7, 8, 9]
 */
const parsePageRanges = (rangeString, maxPages) => {
    const pages = new Set();
    const parts = rangeString.split(',').map(p => p.trim());

    parts.forEach(part => {
        if (part.includes('-')) {
            const [start, end] = part.split('-').map(num => parseInt(num));
            if (!isNaN(start) && !isNaN(end)) {
                // Adjust for 1-based input to 0-based index
                for (let i = start - 1; i < end; i++) {
                    if (i >= 0 && i < maxPages) pages.add(i);
                }
            }
        } else {
            const page = parseInt(part);
            if (!isNaN(page)) {
                if (page - 1 >= 0 && page - 1 < maxPages) pages.add(page - 1);
            }
        }
    });
    return Array.from(pages).sort((a, b) => a - b);
};

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me';

// MIDDLEWARE: Parse User from Token (Optional)
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        jwt.verify(token, JWT_SECRET, (err, user) => {
            if (!err) req.user = user;
            next();
        });
    } else {
        next();
    }
};

// MIDDLEWARE: Rate Limiter (3 per 24 hours)
const checkRateLimit = async (req, res, next) => {
    try {
        const userId = req.user ? req.user.id : null;
        const ip = req.headers['client-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        let countResult;
        let oldestRequestResult;

        if (userId) {
            countResult = await query(
                'SELECT COUNT(*) FROM usage_logs WHERE user_id = $1 AND created_at > $2',
                [userId, oneDayAgo]
            );
            oldestRequestResult = await query(
                'SELECT created_at FROM usage_logs WHERE user_id = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 1',
                [userId, oneDayAgo]
            );
        } else {
            countResult = await query(
                'SELECT COUNT(*) FROM usage_logs WHERE ip_address = $1 AND created_at > $2',
                [ip, oneDayAgo]
            );
            oldestRequestResult = await query(
                'SELECT created_at FROM usage_logs WHERE ip_address = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 1',
                [ip, oneDayAgo]
            );
        }

        const count = parseInt(countResult.rows[0].count);

        // Calculate Reset Time
        let resetTime = null;
        if (oldestRequestResult.rows.length > 0) {
            const oldestDate = new Date(oldestRequestResult.rows[0].created_at);
            resetTime = new Date(oldestDate.getTime() + 24 * 60 * 60 * 1000);
        }

        if (count >= 300) {
            return res.status(429).json({
                error: "Daily limit reached.",
                usage: count,
                limit: 300,
                resetTime: resetTime
            });
        }

        req.usageInfo = { userId, ip };
        next();

    } catch (e) {
        console.error("Rate Limit Error:", e);
        next();
    }
};

// HELPER: Log Usage
const logUsage = async (req, toolName) => {
    if (!req.usageInfo) return;
    try {
        await query(
            'INSERT INTO usage_logs (user_id, ip_address, tool_name) VALUES ($1, $2, $3)',
            [req.usageInfo.userId, req.usageInfo.ip, toolName || 'Unknown']
        );
    } catch (e) {
        console.error("Failed to log usage:", e);
    }
};

// Helper to check if a file exists
const fileExists = async (path) => {
    try {
        await fs.promises.access(path, fs.constants.F_OK);
        return true;
    } catch (e) {
        return false;
    }
};

// --- AUTH ROUTES ---

router.post('/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const result = await query(
            'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
            [email, hashedPassword, name || '']
        );

        const user = result.rows[0];
        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (e) {
        if (e.code === '23505') { // Unique violation
            return res.status(400).json({ error: "Email already registered" });
        }
        console.error("Signup error:", e);
        if (e.code === '42703') {
            return res.status(500).json({ error: "Database needs update: Missing 'name' column." });
        }
        res.status(500).json({ error: "Signup failed" });
    }
});

router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, email: user.email } });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Login failed" });
    }
});

router.get('/auth/me', optionalAuth, async (req, res) => {
    if (!req.user) return res.status(401).json({ error: "Not logged in" });

    try {
        const userRes = await query('SELECT id, email, name FROM users WHERE id = $1', [req.user.id]);
        const userData = userRes.rows[0];

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const countRes = await query(
            'SELECT COUNT(*) FROM usage_logs WHERE user_id = $1 AND created_at > $2',
            [req.user.id, oneDayAgo]
        );
        const oldestRes = await query(
            'SELECT created_at FROM usage_logs WHERE user_id = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 1',
            [req.user.id, oneDayAgo]
        );

        let resetTime = null;
        if (oldestRes.rows.length > 0) {
            resetTime = new Date(new Date(oldestRes.rows[0].created_at).getTime() + 24 * 60 * 60 * 1000);
        }

        res.json({
            user: userData,
            usageToday: parseInt(countRes.rows[0].count),
            limit: 300,
            resetTime
        });
    } catch (e) {
        console.error("Auth Me Error:", e);
        // Fallback for missing DB or other errors: return basic user info from token if possible, or 500
        // Since we can't fetch userData from DB, we rely on token payload
        res.json({
            user: { id: req.user.id, email: req.user.email, name: 'Guest' }, // fallback
            usageToday: 0,
            limit: 300,
            resetTime: null,
            warning: "Database not connected"
        });
    }
});

router.get('/usage-status', optionalAuth, async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        const ip = req.headers['client-ip'] || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        let countResult, oldestResult;

        if (userId) {
            countResult = await query('SELECT COUNT(*) FROM usage_logs WHERE user_id = $1 AND created_at > $2', [userId, oneDayAgo]);
            oldestResult = await query('SELECT created_at FROM usage_logs WHERE user_id = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 1', [userId, oneDayAgo]);
        } else {
            countResult = await query('SELECT COUNT(*) FROM usage_logs WHERE ip_address = $1 AND created_at > $2', [ip, oneDayAgo]);
            oldestResult = await query('SELECT created_at FROM usage_logs WHERE ip_address = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 1', [ip, oneDayAgo]);
        }

        let resetTime = null;
        if (oldestResult.rows.length > 0) {
            resetTime = new Date(new Date(oldestResult.rows[0].created_at).getTime() + 24 * 60 * 60 * 1000);
        }

        res.json({
            usage: parseInt(countResult.rows[0].count),
            limit: 300,
            resetTime
        });

    } catch (e) {
        console.error("Usage Status Error:", e);
        res.status(500).json({ error: "Failed to fetch status" });
    }
});


// --- TOOL ROUTES (Wrapped with Auth & Rate Limit) ---

router.use('/process', optionalAuth);
router.use('/process', checkRateLimit);

router.get('/', (req, res) => {
    res.json({ message: "MarvelPDF Node.js Backend Running" });
});

router.get('/health', (req, res) => {
    res.json({ status: "ok", environment: "nodejs" });
});

// MERGE PDF
router.post('/process/merge', express.json(), async (req, res) => {
    try {
        const { keys } = req.body;
        if (!keys || keys.length < 2) {
            return res.status(400).json({ error: "At least 2 files are required." });
        }

        const outputPath = path.join('/tmp', `output_merge_${uuidv4()}.pdf`);

        await runProcessor('merge', { inputKeys: keys, outputPath });

        if (await fileExists(outputPath)) {
            const buffer = await fs.promises.readFile(outputPath);
            const resultKey = `results/${Date.now()}_${uuidv4()}_merged.pdf`;
            await uploadBuffer(resultKey, buffer, 'application/pdf');
            await logUsage(req, 'Merge PDF');
            const downloadUrl = await getDownloadUrl(resultKey);
            await fs.promises.unlink(outputPath).catch(() => { });
            res.json({ downloadUrl });
        } else {
            throw new Error("Merge failed (no output)");
        }

    } catch (error) {
        console.error("Merge Error:", error);
        res.status(500).json({ error: "Failed to merge PDFs." });
    }
});

// SPLIT PDF
router.post('/process/split', express.json(), async (req, res) => {
    try {
        const { key, range } = req.body;
        if (!key || !range) {
            return res.status(400).json({ error: "File and range are required." });
        }

        const inputPath = path.join('/tmp', `input_split_${uuidv4()}.pdf`);
        const outputPath = path.join('/tmp', `output_split_${uuidv4()}.pdf`);

        // Need to download input to file first for runProcessor
        const buffer = await downloadToBuffer(key);
        await fs.promises.writeFile(inputPath, buffer);

        // pdfcpu Trim accepts "1-3,5" range string directly.
        await runProcessor('split', { inputPath, outputPath, range });

        if (await fileExists(outputPath)) {
            const buffer = await fs.promises.readFile(outputPath);
            const resultKey = `results/${Date.now()}_${uuidv4()}_split.pdf`;
            await uploadBuffer(resultKey, buffer, 'application/pdf');
            await logUsage(req, 'Split PDF');
            const downloadUrl = await getDownloadUrl(resultKey);
            await fs.promises.unlink(inputPath).catch(() => { });
            await fs.promises.unlink(outputPath).catch(() => { });
            res.json({ downloadUrl });
        } else {
            throw new Error("Split failed");
        }

    } catch (error) {
        console.error("Split Error:", error);
        res.status(500).json({ error: "Failed to split PDF." });
    }
});

// UNLOCK PDF
router.post('/process/unlock', express.json(), async (req, res) => {
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
});

// WATERMARK PDF
router.post('/process/watermark', express.json(), async (req, res) => {
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
});

// PAGE NUMBERS
router.post('/process/page-numbers', express.json(), async (req, res) => {
    try {
        const { key, position } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });
        const pos = position || 'bottom';

        const inputPath = path.join('/tmp', `input_pn_${uuidv4()}.pdf`);
        const outputPath = path.join('/tmp', `output_pn_${uuidv4()}.pdf`);

        const buffer = await downloadToBuffer(key);
        await fs.promises.writeFile(inputPath, buffer);

        await runProcessor('page_numbers', { inputPath, outputPath, position: pos });

        if (await fileExists(outputPath)) {
            const buffer = await fs.promises.readFile(outputPath);
            const resultKey = `results/${Date.now()}_${uuidv4()}_numbered.pdf`;
            await uploadBuffer(resultKey, buffer, 'application/pdf');
            await logUsage(req, 'Page Numbers');
            const downloadUrl = await getDownloadUrl(resultKey);
            await fs.promises.unlink(inputPath).catch(() => { });
            await fs.promises.unlink(outputPath).catch(() => { });
            res.json({ downloadUrl });
        } else {
            throw new Error("Page Numbers failed");
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed." });
    }
});

// JPG TO PDF
router.post('/process/jpg-to-pdf', express.json(), async (req, res) => {
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
});

// EDIT / SIGN PDF
router.post('/process/edit', express.json(), async (req, res) => {
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
                    // Overlay mode fills page
                    drawOpts = {
                        x: 0,
                        y: 0,
                        width: pageWidth,
                        height: pageHeight,
                    };
                }

                page.drawImage(image, drawOpts);

            } else if (op.type === 'redact') {
                page.drawRectangle({
                    x: op.x,
                    y: op.y,
                    width: op.width,
                    height: op.height,
                    color: rgb(1, 1, 1), // White
                    opacity: 1,
                });
            } else if (op.type === 'text') {
                // Parse hex color if string (e.g. "#FF0000")
                let color = undefined;
                if (op.color && op.color.startsWith('#')) {
                    const r = parseInt(op.color.slice(1, 3), 16) / 255;
                    const g = parseInt(op.color.slice(3, 5), 16) / 255;
                    const b = parseInt(op.color.slice(5, 7), 16) / 255;
                    color = rgb(r, g, b);
                }

                page.drawText(op.text, {
                    x: op.x || 0,
                    y: op.y || 0,
                    size: op.fontSize || 12,
                    color: color,
                    font: font
                });

            } else if (op.type === 'link') {
                // Low-level Link Annotation
                // Rect is [llx, lly, urx, ury]
                const rect = [op.x, op.y, op.x + op.width, op.y + op.height];

                const linkAnnot = pdfDoc.context.register(
                    pdfDoc.context.obj({
                        Type: 'Annot',
                        Subtype: 'Link',
                        Rect: rect,
                        Border: [0, 0, 0], // No border visible
                        A: {
                            Type: 'Action',
                            S: 'URI',
                            URI: PDFString.of(op.url)
                        }
                    })
                );

                page.node.addAnnot(linkAnnot);

            } else if (op.type === 'form_text') {
                const form = pdfDoc.getForm();
                const textField = form.createTextField(op.name + '_' + Date.now()); // Ensure unique
                textField.setText('');
                textField.addToPage(page, {
                    x: op.x,
                    y: op.y,
                    width: op.width,
                    height: op.height,
                });

            } else if (op.type === 'form_checkbox') {
                const form = pdfDoc.getForm();
                const checkBox = form.createCheckBox(op.name + '_' + Date.now());
                checkBox.addToPage(page, {
                    x: op.x,
                    y: op.y,
                    width: op.width,
                    height: op.height,
                });
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
});

// WORD TO PDF (Using Mammoth for simple text/DOCX to PDF)
router.post('/process/word-to-pdf', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const buffer = await downloadToBuffer(key);

        const { extractRawText } = await import('mammoth');
        const result = await extractRawText({ buffer: buffer });
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
});


// Helper to run Processor (Go) Process (via S3 + HTTP)
// Updated to support options object for multiple inputs and extra params
const runProcessor = async (command, options) => {
    // options: { inputPath, inputKeys, outputPath, password, range, angle, text, position }
    // if inputPath provided, upload it and use as single inputUrl
    // if inputKeys provided (array), generate multiple presigned URLs

    let inputUrl = null;
    let inputUrls = [];

    if (options.inputPath) {
        if (!fs.existsSync(options.inputPath)) throw new Error(`Input file not found: ${options.inputPath}`);
        const inputKey = `temp_in/${uuidv4()}.pdf`;
        const inputBuffer = await fs.promises.readFile(options.inputPath);
        await uploadBuffer(inputKey, inputBuffer, 'application/pdf'); // assuming PDF mostly, or generic? Go handles extensions
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
        inputUrl, // Single
        inputUrls, // Multiple
        outputUrl,
        password: options.password,
        range: options.range,
        angle: options.angle,
        text: options.text,
        position: options.position
    };

    let siteUrl;
    if (process.env.SITE_NAME) {
        siteUrl = `https://${process.env.SITE_NAME}.netlify.app`;
    } else if (process.env.URL) {
        siteUrl = process.env.URL;
    } else {
        siteUrl = 'http://localhost:8888';
    }
    if (process.env.DEPLOY_PRIME_URL) siteUrl = process.env.DEPLOY_PRIME_URL;

    const processorUrl = `${siteUrl}/.netlify/functions/processor`;
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


// PDF TO WORD (Rich Formatting + Images)
router.post('/process/pdf-to-word', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const buffer = await downloadToBuffer(key);
        const { Document, Packer, Paragraph, TextRun, ImageRun } = docx;

        // Use Go Extractor
        const inputPath = path.join('/tmp', `input_extract_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);

        const jsonStrWord = await runProcessor('extract', { inputPath });
        const pages = JSON.parse(jsonStrWord);

        await fs.promises.unlink(inputPath).catch(() => { });

        const doc = new Document({
            sections: pages.map(page => {
                const children = [];

                // 1. Add Images
                if (page.images && Array.isArray(page.images)) {
                    page.images.forEach(img => {
                        try {
                            children.push(new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: Buffer.from(img.data, 'base64'),
                                        transformation: {
                                            width: img.width || 200,
                                            height: img.height || 200
                                        }
                                    })
                                ]
                            }));
                        } catch (e) { console.log('Image add err', e); }
                    });
                }

                // 2. Add Text Blocks
                let blocks = page.block || [];
                blocks.forEach(block => {
                    let lines = block.line || [];
                    lines.forEach(line => {
                        let spans = line.span || [];
                        const runChildren = spans.map(span => {
                            // Python JSON: { text, size, font, color, bbox }
                            // Docx size is half-points.
                            let size = (span.size || 12) * 2;
                            // Color: "FF0000" -> Docx expects hex without #
                            let color = span.color || "000000";

                            return new TextRun({
                                text: span.text + " ", // Space preservation
                                size: size,
                                font: "Helvetica", // fallback
                                color: color
                            });
                        });

                        children.push(new Paragraph({
                            children: runChildren
                        }));
                    });
                });

                return {
                    properties: {},
                    children: children
                };
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
});

// PDF TO EXCEL
router.post('/process/pdf-to-excel', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const buffer = await downloadToBuffer(key);
        const XLSX = await import('xlsx');

        const inputPath = path.join('/tmp', `input_extract_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);
        const jsonStrExcel = await runProcessor('extract', { inputPath });
        const pages = JSON.parse(jsonStrExcel);
        await fs.promises.unlink(inputPath).catch(() => { });

        const allRows = [];

        pages.forEach(page => {
            const spans = [];
            let blocks = page.block || [];
            blocks.forEach(block => {
                let lines = block.line || [];
                lines.forEach(line => {
                    let lineSpans = line.span || [];
                    lineSpans.forEach(s => {
                        // s: { text, bbox: [x, y, x2, y2] }
                        const x = s.bbox[0];
                        const y = s.bbox[1];
                        if (s.text.trim()) spans.push({ text: s.text, x, y });
                    });
                });
            });

            spans.sort((a, b) => {
                if (Math.abs(a.y - b.y) > 5) return a.y - b.y; // Top-Down (y increases downwards? No PDF is Y-up usually vs PyMuPDF 'dict' is top-down? PyMuPDF 'dict' is usually top-left origin (0,0) and Y increases downwards. Let's assume standard image coords.)
                return a.x - b.x;
            });

            let currentRow = [];
            let currentY = -9999;

            spans.forEach(span => {
                if (Math.abs(span.y - currentY) > 10) {
                    if (currentRow.length > 0) allRows.push(currentRow);
                    currentRow = [];
                    currentY = span.y;
                    currentRow.push(span.text);
                } else {
                    currentRow.push(span.text);
                }
            });
            if (currentRow.length > 0) allRows.push(currentRow);
            allRows.push([]); // Page break
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(allRows);
        XLSX.utils.book_append_sheet(wb, ws, "PDF Data");
        const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const resultKey = `results/${Date.now()}_${uuidv4()}_converted.xlsx`;
        await uploadBuffer(resultKey, xlsxBuffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        await logUsage(req, 'PDF to Excel');
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to convert PDF to Excel." });
    }
});

// PDF TO PPTX
router.post('/process/pdf-to-pptx', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const buffer = await downloadToBuffer(key);
        const pptxgen = (await import('pptxgenjs')).default;

        const inputPath = path.join('/tmp', `input_extract_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);
        const jsonStrPptx = await runProcessor('extract', inputPath);
        const pages = JSON.parse(jsonStrPptx);
        await fs.promises.unlink(inputPath).catch(() => { });

        const pptx = new pptxgen();

        pages.forEach(page => {
            const slide = pptx.addSlide();

            // 1. Add Images
            if (page.images && Array.isArray(page.images)) {
                page.images.forEach((img, idx) => {
                    try {
                        if (img.data) {
                            slide.addImage({
                                data: `data:image/png;base64,${img.data}`,
                                x: 0.5, y: 0.5 + (idx * 3), w: 4, h: 3
                            });
                        }
                    } catch (e) { }
                });
            }

            // 2. Add Text Blocks
            let blocks = page.block || [];
            blocks.forEach(block => {
                let lines = block.line || [];
                let blockText = "";
                lines.forEach(line => {
                    let spans = line.span || [];
                    spans.forEach(s => {
                        blockText += s.text + " ";
                    });
                    blockText += "\n";
                });

                // Can we get color from first span?
                // Default black
                slide.addText(blockText, { x: 0.5, y: 0.5, w: '90%', h: 'auto', fontSize: 12, color: '363636' });
            });
        });

        const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' });
        const resultKey = `results/${Date.now()}_${uuidv4()}_converted.pptx`;
        await uploadBuffer(resultKey, pptxBuffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
        await logUsage(req, 'PDF to PPTX');
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to convert PDF to PPTX." });
    }
});


// PROTECT PDF
router.post('/process/protect', express.json(), async (req, res) => {
    try {
        const { key, password } = req.body;
        if (!key || !password) return res.status(400).json({ error: "File and password required." });
        if (password.length < 6) return res.status(400).json({ error: "Password must be at least 6 characters long." });

        const buffer = await downloadToBuffer(key);

        const inputPath = path.join('/tmp', `input_protect_${uuidv4()}.pdf`);
        const outputPath = path.join('/tmp', `output_protect_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);

        // Call Go
        await runProcessor('protect', { inputPath, outputPath, password });

        const protectedBytes = await fs.promises.readFile(outputPath);

        await fs.promises.unlink(inputPath).catch(() => { });
        await fs.promises.unlink(outputPath).catch(() => { });

        const resultKey = `results/${Date.now()}_${uuidv4()}_protected.pdf`;
        await uploadBuffer(resultKey, protectedBytes, 'application/pdf');
        await logUsage(req, 'Protect PDF');

        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to protect PDF." });
    }
});


// COMPRESS PDF
router.post('/process/compress', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const buffer = await downloadToBuffer(key);

        const inputPath = path.join('/tmp', `input_compress_${uuidv4()}.pdf`);
        const outputPath = path.join('/tmp', `output_compress_${uuidv4()}.pdf`);
        await fs.promises.writeFile(inputPath, buffer);

        // Call Go
        await runProcessor('compress', { inputPath, outputPath });

        if (await fileExists(outputPath)) {
            const compressedBuffer = await fs.promises.readFile(outputPath);
            const resultKey = `results/${Date.now()}_${uuidv4()}_compressed.pdf`;
            await uploadBuffer(resultKey, compressedBuffer, 'application/pdf');
            await logUsage(req, 'Compress PDF');
            const downloadUrl = await getDownloadUrl(resultKey);

            await fs.unlink(inputPath).catch(() => { });
            await fs.unlink(outputPath).catch(() => { });

            res.json({ downloadUrl });
        } else {
            throw new Error("Compression failed (no output)");
        }
    } catch (e) {
        console.error("Compression Error:", e);
        res.status(500).json({ error: "Failed to compress PDF." });
    }
});



// PPTX TO PDF
router.post('/process/pptx-to-pdf', async (req, res) => {
    res.status(400).send("PPTX to PDF conversion is not supported in this serverless environment.");
});

// ROTATE PDF
router.post('/process/rotate', express.json(), async (req, res) => {
    try {
        const { key, angle } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const rotationAngle = parseInt(angle) || 90;

        const inputPath = path.join('/tmp', `input_rotate_${uuidv4()}.pdf`);
        const outputPath = path.join('/tmp', `output_rotate_${uuidv4()}.pdf`);

        const buffer = await downloadToBuffer(key);
        await fs.promises.writeFile(inputPath, buffer);

        await runProcessor('rotate', { inputPath, outputPath, angle: rotationAngle });

        if (await fileExists(outputPath)) {
            const buffer = await fs.promises.readFile(outputPath);
            const resultKey = `results/${Date.now()}_${uuidv4()}_rotated.pdf`;
            await uploadBuffer(resultKey, buffer, 'application/pdf');
            await logUsage(req, 'Rotate PDF');
            const downloadUrl = await getDownloadUrl(resultKey);
            await fs.promises.unlink(inputPath).catch(() => { });
            await fs.promises.unlink(outputPath).catch(() => { });
            res.json({ downloadUrl });
        } else {
            throw new Error("Rotate failed");
        }
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to rotate PDF." });
    }
});

// PDF TO JPG
router.post('/process/pdf-to-jpg', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });

        const zipPath = path.join('/tmp', `images_${uuidv4()}.zip`);
        const buffer = await downloadToBuffer(key);
        const uint8Array = new Uint8Array(buffer);

        // Dynamic import to avoid Require(ESM) error
        // Use CommonJS require for legacy build (v3 compatible)
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

        const loadingTask = pdfjsLib.getDocument({
            data: uint8Array,
            standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/',
            disableFontFace: true
        });
        const doc = await loadingTask.promise;

        const outputStream = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        const archivePromise = new Promise((resolve, reject) => {
            outputStream.on('close', resolve);
            archive.on('error', reject);
            archive.pipe(outputStream);
        });

        for (let i = 1; i <= doc.numPages; i++) {
            const page = await doc.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = createCanvas(viewport.width, viewport.height);
            const context = canvas.getContext('2d');

            await page.render({
                canvasContext: context,
                viewport: viewport,
                canvasFactory: {
                    create: (w, h) => createCanvas(w, h),
                    reset: (c, w, h) => { c.width = w; c.height = h; },
                    destroy: (c) => { c.width = 0; c.height = 0; }
                }
            }).promise;

            const imgBuffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
            archive.append(imgBuffer, { name: `page_${i}.jpg` });
        }

        await archive.finalize();
        await archivePromise;

        const zipBuffer = await fs.promises.readFile(zipPath);
        const resultKey = `results/${Date.now()}_${uuidv4()}_images.zip`;
        await uploadBuffer(resultKey, zipBuffer, 'application/zip');
        await logUsage(req, 'PDF to JPG');

        const downloadUrl = await getDownloadUrl(resultKey);
        await fs.promises.unlink(zipPath).catch(() => { });

        res.json({ downloadUrl });

    } catch (e) {
        console.error("PDF to JPG Error:", e);
        res.status(500).json({ error: "Failed to convert PDF to JPG." });
    }
});



const isDev = process.env.NODE_ENV !== 'production' && !process.env.NETLIFY;

if (isDev) {
    const MOCK_DIR = '/tmp/mock-s3';

    // Mock S3 Upload Route
    // Note: We need raw body or stream for this. Express json/urlencoded parser might interfere if not handled carefully for binary.
    // However, our app.use(express.json) has limit 500mb. 
    // If Content-Type is application/pdf, express default parsers won't parse it, so req.body might be empty or we need raw parser.
    // Let's use a simpler approach: explicitly handle this route BEFORE parsers if possible, or just stream req.
    // Use app.put instead of router.put to be global?
    // Actually, let's put it on `app` before parsers? No, parsers are already applied at top of file.
    // We can use `express.raw({ type: '*/*', limit: '500mb' })` for this specific route?

    app.put('/mock-s3/:key(*)', express.raw({ type: '*/*', limit: '500mb' }), async (req, res) => {
        try {
            const key = decodeURIComponent(req.params.key);
            const filePath = path.join(MOCK_DIR, key);
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

            // If express.raw worked, req.body is buffer.
            if (Buffer.isBuffer(req.body)) {
                fs.writeFileSync(filePath, req.body);
            } else {
                // Fallback if body parsing failed/skipped
                // Stream pipe
                const writeStream = fs.createWriteStream(filePath);
                req.pipe(writeStream);
                await new Promise((resolve, reject) => {
                    writeStream.on('finish', resolve);
                    writeStream.on('error', reject);
                });
            }
            console.log(`[MockS3] Uploaded ${key}`);
            res.sendStatus(200);
        } catch (e) {
            console.error(e);
            res.status(500).send("Mock Upload Failed");
        }
    });

    // Mock S3 Download Route
    app.get('/mock-s3/:key(*)', async (req, res) => {
        const key = decodeURIComponent(req.params.key);
        const filePath = path.join(MOCK_DIR, key);
        if (fs.existsSync(filePath)) {
            res.sendFile(filePath);
        } else {
            res.status(404).send("File not found in Mock S3");
        }
    });
}

if (isDev && process.argv[1].endsWith('api.js')) {
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
        console.log(`Backend running locally on http://localhost:${port}`);
    });
}

export const handler = serverless(app, {
    binary: [
        'application/pdf',
        'application/zip',
        'multipart/form-data',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/*'
    ]
});
