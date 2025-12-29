import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument, degrees } from 'pdf-lib';
import archiver from 'archiver';
import { Stream } from 'stream';

const app = express();
app.use(cors());
app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ limit: '500mb', extended: true }));
const router = express.Router();

// DEBUG: Catch-all to see what's happening if no route matches
router.all('*', (req, res, next) => {
    // Check if we have a matching route layer roughly (optional, but let's just log or pass through)
    // Actually, we want the specific routes to take precedence. 
    // Express runs middleware in order. 
    // If I put this at the TOP, it intercepts everything. 
    // I should put the catch-all at the BOTTOM of the router?
    // No, `router.all` matches everything. 
    // If I want it to catch "Not Found", it should be LAST.
    // BUT, right now it's used for debugging "Incoming Request".
    // Let's change it to log-only middleware or remove it?
    // User response showed it returned JSON. So it terminated the request.
    // If I want to restore function, I MUST remove this terminating catch-all from the TOP 
    // OR make it call `next()`.
    // I'll make it a logger for now, call next()
    console.log(`Incoming: ${req.method} ${req.url}`);
    next();
});

// Mount router on various paths to handle Netlify's rewriting quirks
app.use('/.netlify/functions/api', router);
app.use('/api', router);
app.use('/', router); 

import { getUploadUrl, getDownloadUrl, downloadToBuffer, uploadBuffer } from './s3.js';
import { v4 as uuidv4 } from 'uuid'; // Try standard import or use crypto.randomUUID

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
// Populates req.user if valid token found
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

        if (count >= 3) {
            return res.status(429).json({ 
                error: "Daily limit reached.",
                usage: count,
                limit: 3,
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


// --- AUTH ROUTES ---

router.post('/auth/signup', async (req, res) => {
    try {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).json({ error: "Email and password required" });
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Try inserting with name. If it fails (col doesn't exist), fallback?
        // Better: Expect user to update DB.
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
        // If column 'name' missing, it throws 42703
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
    
    // Get User Details (Name)
    const userRes = await query('SELECT id, email, name FROM users WHERE id = $1', [req.user.id]);
    const userData = userRes.rows[0];

    // Get usage count
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
        limit: 3,
        resetTime
    });
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
             limit: 3,
             resetTime
         });

    } catch (e) {
        console.error("Usage Status Error:", e);
        res.status(500).json({ error: "Failed to fetch status" });
    }
});


// --- TOOL ROUTES (Wrapped with Auth & Rate Limit) ---

// Apply Middleware globally to /process/* routes?
// Yes, let's wrap logic.
// Problem: middleware `use` doesn't take regex nicely in router sometimes.
// Easier to apply to each route or use router.use('/process/*', ...)

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

        const mergedPdf = await PDFDocument.create();

        for (const key of keys) {
            const buffer = await downloadToBuffer(key);
            const pdf = await PDFDocument.load(buffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();
        
        // Upload result to S3
        const resultKey = `results/${Date.now()}_${uuidv4()}_merged.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');
        
        await logUsage(req, 'Merge PDF');

        // Generate download URL
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });

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

        const buffer = await downloadToBuffer(key);
        const srcDoc = await PDFDocument.load(buffer);
        const pageIndices = parsePageRanges(range, srcDoc.getPageCount());

        if (pageIndices.length === 0) {
            return res.status(400).json({ error: "Invalid page range." });
        }
        
        const subPdf = await PDFDocument.create();
        const copiedPages = await subPdf.copyPages(srcDoc, pageIndices);
        copiedPages.forEach((page) => subPdf.addPage(page));
        const subPdfBytes = await subPdf.save();

        // Create Zip
        const archive = archiver('zip');
        const chunks = [];
        archive.on('data', chunk => chunks.push(chunk));
        
        archive.append(Buffer.from(subPdfBytes), { name: 'extracted.pdf' });
        await archive.finalize();
        
        // Wait for zip to finish
        await new Promise(resolve => archive.on('end', resolve));
        const zipBuffer = Buffer.concat(chunks);

        // Upload Result
        const resultKey = `results/${Date.now()}_${uuidv4()}_split.zip`;
        await uploadBuffer(resultKey, zipBuffer, 'application/zip');
        
        await logUsage(req, 'Split PDF'); 

        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });

    } catch (error) {
        console.error("Split Error:", error);
        res.status(500).json({ error: "Failed to split PDF." });
    }
});

// PROTECT PDF
router.post('/process/protect', express.json(), async (req, res) => {
    try {
        const { key, password } = req.body;
        if (!key || !password) return res.status(400).json({ error: "File and password required." });
        
        const buffer = await downloadToBuffer(key);
        const pdfDoc = await PDFDocument.load(buffer);
        pdfDoc.encrypt({
            userPassword: password,
            ownerPassword: password,
            permissions: {
                printing: 'highResolution',
                modifying: false,
                copying: false,
                annotating: false,
            }
        });

        const pdfBytes = await pdfDoc.save();
        
        const resultKey = `results/${Date.now()}_${uuidv4()}_protected.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');

        await logUsage(req, 'Protect PDF'); 
        
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed." });
    }
});

// UNLOCK PDF
router.post('/process/unlock', express.json(), async (req, res) => {
    try {
        const { key, password } = req.body;
        if (!key || !password) return res.status(400).json({ error: "File and password required." });
        
        const buffer = await downloadToBuffer(key);
        // Attempt load with password
        const pdfDoc = await PDFDocument.load(buffer, { password });
        
        // Save without changes = removes encryption
        const pdfBytes = await pdfDoc.save();
        
        const resultKey = `results/${Date.now()}_${uuidv4()}_unlocked.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');

        await logUsage(req, 'Unlock PDF');
        
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(403).json({ error: "Failed to unlock. Wrong password?" });
    }
});

// COMPRESS PDF
router.post('/process/compress', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });
        
        const buffer = await downloadToBuffer(key);
        const pdfDoc = await PDFDocument.load(buffer);
        const compressedPdf = await PDFDocument.create();
        const copiedPages = await compressedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(p => compressedPdf.addPage(p));

        const pdfBytes = await compressedPdf.save({ useObjectStreams: false }); 

        const resultKey = `results/${Date.now()}_${uuidv4()}_compressed.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');

        await logUsage(req, 'Compress PDF');

        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed." });
    }
});

// WATERMARK PDF
router.post('/process/watermark', express.json(), async (req, res) => {
    try {
        const { key, text } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });
        const watermarkText = text || "CONFIDENTIAL";
        
        const buffer = await downloadToBuffer(key);
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont("Helvetica-Bold");

        pages.forEach(page => {
            const { width, height } = page.getSize();
            const fontSize = 50;
            const textWidth = font.widthOfTextAtSize(watermarkText, fontSize);
            
            page.drawText(watermarkText, {
                x: width / 2 - textWidth / 2,
                y: height / 2,
                size: fontSize,
                font: font,
                opacity: 0.3,
                rotate: degrees(45),
            });
        });

        const pdfBytes = await pdfDoc.save();
        
        const resultKey = `results/${Date.now()}_${uuidv4()}_watermarked.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');

        await logUsage(req, 'Watermark PDF');
        
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
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
        
        const buffer = await downloadToBuffer(key);
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont("Helvetica");

        pages.forEach((page, idx) => {
            const { width, height } = page.getSize();
            const text = `${idx + 1}`;
            const fontSize = 12;
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            
            let x = 0, y = 20;

            switch(pos) {
                case 'top': x = width / 2 - textWidth / 2; y = height - 20; break;
                case 'bottom-left': x = 20; y = 20; break;
                case 'bottom-right': x = width - textWidth - 20; y = 20; break;
                default: x = width / 2 - textWidth / 2; y = 20; // Bottom Center
            }

            page.drawText(text, { x, y, size: fontSize, font });
        });

        const pdfBytes = await pdfDoc.save();
        
        const resultKey = `results/${Date.now()}_${uuidv4()}_numbered.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');

        await logUsage(req, 'Page Numbers');
        
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
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
        
        const pdfDoc = await PDFDocument.create();
        
        for (const key of keys) {
            const buffer = await downloadToBuffer(key);
            // Detect mime based on buffer or key? Ideally we pass metadata.
            // But we can check magic bytes or assume from key extension or just try/catch format.
            // Let's rely on magic bytes check or try both.
            
            let image;
            try {
                image = await pdfDoc.embedJpg(buffer);
            } catch (e) {
                try {
                     image = await pdfDoc.embedPng(buffer);
                } catch (e2) {
                     console.error("Not a JPG or PNG");
                     continue; 
                }
            }
            
            const page = pdfDoc.addPage([image.width, image.height]);
            page.drawImage(image, {
                x: 0,
                y: 0,
                width: image.width,
                height: image.height,
            });
        }

        const pdfBytes = await pdfDoc.save();
        
        const resultKey = `results/${Date.now()}_${uuidv4()}_converted.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');

        await logUsage(req, 'Jpg to PDF');
        
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
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

        for (const op of ops) {
            if (op.page >= pages.length) continue;
            const page = pages[op.page];

            if (op.type === 'image') {
                const base64Data = op.data.split(',')[1];
                const imageBytes = Buffer.from(base64Data, 'base64');
                
                let image;
                 if (op.data.startsWith('data:image/png')) {
                    image = await pdfDoc.embedPng(imageBytes);
                } else {
                    image = await pdfDoc.embedJpg(imageBytes);
                }

                page.drawImage(image, {
                    x: op.x || 0,
                    y: op.y || 0,
                    width: op.width || image.width,
                    height: op.height || image.height,
                });
            } else if (op.type === 'text') {
                 const font = await pdfDoc.embedFont("Helvetica");
                 page.drawText(op.text, {
                     x: op.x || 0,
                     y: op.y || 0,
                     size: op.fontSize || 12,
                     color: op.color ? undefined : undefined,
                     font: font
                 });
            }
        }

        const pdfBytes = await pdfDoc.save();
        
        const resultKey = `results/${Date.now()}_${uuidv4()}_edited.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');

        await logUsage(req, 'Edit PDF'); // or Sign

        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to edit operations." });
    }
});

// WORD TO PDF
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

// PDF TO WORD
router.post('/process/pdf-to-word', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });
        
        const buffer = await downloadToBuffer(key);
        
        const pdfParse = (await import('pdf-parse')).default;
        const { Document, Packer, Paragraph, TextRun } = await import('docx');

        const data = await pdfParse(buffer);
        const text = data.text;

        const doc = new Document({
            sections: [{
                properties: {},
                children: text.split('\n').map(line => 
                    new Paragraph({
                        children: [new TextRun(line)],
                    })
                ),
            }],
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

// EXCEL TO PDF
router.post('/process/excel-to-pdf', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });
        
        const buffer = await downloadToBuffer(key);
        
        const XLSX = await import('xlsx');
        
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);

        const pdfDoc = await PDFDocument.create();
        let page = pdfDoc.addPage();
        const { width, height } = page.getSize();
        const font = await pdfDoc.embedFont("Helvetica"); 
        const fontSize = 10;
        
        const lines = csv.split('\n');
        let y = height - 50;
        const margin = 40;

        lines.forEach(line => {
             if (y < 50) { page = pdfDoc.addPage(); y = height - 50; }
             const safeLine = line.replace(/,/g, "   ").substring(0, 90).replace(/[^\x00-\x7F]/g, "?");
             page.drawText(safeLine, { x: margin, y, size: fontSize, font });
             y -= 12;
        });

        const pdfBytes = await pdfDoc.save();
        
        const resultKey = `results/${Date.now()}_${uuidv4()}_converted.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');

        await logUsage(req, 'Excel to PDF');
        
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to convert Excel to PDF." });
    }
});

// PDF TO EXCEL
router.post('/process/pdf-to-excel', express.json(), async (req, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ error: "File required." });
        
        const buffer = await downloadToBuffer(key);
        const pdfParse = (await import('pdf-parse')).default;
        const XLSX = await import('xlsx');

        const data = await pdfParse(buffer);
        const text = data.text;
        
        // Strategy: Naive line split. Ideally we'd detect tables.
        const rows = text.split('\n').map(line => [line]);
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
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
        
        const pdfParse = (await import('pdf-parse')).default;
        const pptxgen = (await import('pptxgenjs')).default;

        const data = await pdfParse(buffer);
        
        const pptx = new pptxgen();
        let slide = pptx.addSlide();
        
        const charsPerSlide = 1000;
        const text = data.text;
        
        for (let i = 0; i < text.length; i += charsPerSlide) {
            if (i > 0) slide = pptx.addSlide();
            const chunk = text.substring(i, i + charsPerSlide).replace(/[^\x00-\x7F]/g, "");
            slide.addText(chunk, { x: 0.5, y: 0.5, w: '90%', h: '90%', fontSize: 12, color: '363636' });
        }
        
        // pptxgen buffer output requires 'nodebuffer'
        const pptxBuffer = await pptx.write({ outputType: 'nodebuffer' });
        
        const resultKey = `results/${Date.now()}_${uuidv4()}_converted.pptx`;
        await uploadBuffer(resultKey, pptxBuffer, 'application/vnd.openxmlformats-officedocument.presentationml.presentation');

        await logUsage(req, 'PDF to Powerpoint');
        
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });

    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to convert PDF to Powerpoint." });
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
        
        const buffer = await downloadToBuffer(key);
        const pdfDoc = await PDFDocument.load(buffer);
        const pages = pdfDoc.getPages();
        
        pages.forEach(page => {
            const currentRotation = page.getRotation().angle;
            page.setRotation(degrees(currentRotation + rotationAngle));
        });
        
        const pdfBytes = await pdfDoc.save();
        
        const resultKey = `results/${Date.now()}_${uuidv4()}_rotated.pdf`;
        await uploadBuffer(resultKey, Buffer.from(pdfBytes), 'application/pdf');

        await logUsage(req, 'Rotate PDF');
        
        const downloadUrl = await getDownloadUrl(resultKey);
        res.json({ downloadUrl });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: "Failed to rotate PDF." });
    }
});

// PDF TO JPG
router.post('/process/pdf-to-jpg', express.json(), async (req, res) => {
    // const { key } = req.body;
    res.status(400).json({ error: "PDF to Image conversion requires enabling native binaries, currently disabled for stability." });
});


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
