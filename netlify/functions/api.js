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

// Configure multer for memory storage
const upload = multer({ 
   storage: multer.memoryStorage(),
   limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit per file
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
router.post('/process/merge', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length < 2) {
            return res.status(400).send("At least 2 files are required.");
        }

        const mergedPdf = await PDFDocument.create();

        for (const file of req.files) {
            const pdf = await PDFDocument.load(file.buffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const pdfBytes = await mergedPdf.save();
        
        await logUsage(req, 'Merge PDF'); // LOG USAGE ON SUCCESS

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=merged.pdf',
            'Content-Length': pdfBytes.length,
        });
        res.send(Buffer.from(pdfBytes));

    } catch (error) {
        console.error("Merge Error:", error);
        res.status(500).send("Failed to merge PDFs.");
    }
});

// SPLIT PDF
router.post('/process/split', upload.single('file'), async (req, res) => {
    try {
        if (!req.file || !req.body.range) {
            return res.status(400).send("File and range are required.");
        }

        const srcDoc = await PDFDocument.load(req.file.buffer);
        const pageIndices = parsePageRanges(req.body.range, srcDoc.getPageCount());

        if (pageIndices.length === 0) {
            return res.status(400).send("Invalid page range.");
        }
        
        const subPdf = await PDFDocument.create();
        const copiedPages = await subPdf.copyPages(srcDoc, pageIndices);
        copiedPages.forEach((page) => subPdf.addPage(page));
        const subPdfBytes = await subPdf.save();

        // Create Zip
        const archive = archiver('zip');
        
        await logUsage(req, 'Split PDF'); // LOG USAGE

        res.set({
            'Content-Type': 'application/zip',
            'Content-Disposition': 'attachment; filename=split.zip'
        });

        archive.pipe(res);
        archive.append(Buffer.from(subPdfBytes), { name: 'extracted.pdf' });
        await archive.finalize();

    } catch (error) {
        console.error("Split Error:", error);
        res.status(500).send("Failed to split PDF.");
    }
});

// PROTECT PDF
router.post('/process/protect', upload.single('file'), async (req, res) => {
    try {
        if (!req.file || !req.body.password) return res.status(400).send("File and password required.");
        
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        pdfDoc.encrypt({
            userPassword: req.body.password,
            ownerPassword: req.body.password,
            permissions: {
                printing: 'highResolution',
                modifying: false,
                copying: false,
                annotating: false,
            }
        });

        const pdfBytes = await pdfDoc.save();
        
        await logUsage(req, 'Protect PDF'); // LOG USAGE
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=protected.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed.");
    }
});

// UNLOCK PDF
router.post('/process/unlock', upload.single('file'), async (req, res) => {
    try {
        if (!req.file || !req.body.password) return res.status(400).send("File and password required.");
        
        // Attempt load with password
        const pdfDoc = await PDFDocument.load(req.file.buffer, { password: req.body.password });
        
        // Save without changes = removes encryption
        const pdfBytes = await pdfDoc.save();
        
        await logUsage(req, 'Unlock PDF');
        
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=unlocked.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(403).send("Failed to unlock. Wrong password?");
    }
});

// COMPRESS PDF
router.post('/process/compress', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        const compressedPdf = await PDFDocument.create();
        const copiedPages = await compressedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        copiedPages.forEach(p => compressedPdf.addPage(p));

        const pdfBytes = await compressedPdf.save({ useObjectStreams: false }); 

        await logUsage(req, 'Compress PDF');

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=compressed.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed.");
    }
});

// WATERMARK PDF
router.post('/process/watermark', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const text = req.query.text || "CONFIDENTIAL";
        
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont("Helvetica-Bold");

        pages.forEach(page => {
            const { width, height } = page.getSize();
            const fontSize = 50;
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            
            page.drawText(text, {
                x: width / 2 - textWidth / 2,
                y: height / 2,
                size: fontSize,
                font: font,
                opacity: 0.3,
                rotate: degrees(45),
            });
        });

        const pdfBytes = await pdfDoc.save();
        await logUsage(req, 'Watermark PDF');
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=watermarked.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed.");
    }
});

// PAGE NUMBERS
router.post('/process/page-numbers', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const position = req.query.position || 'bottom';
        
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        const pages = pdfDoc.getPages();
        const font = await pdfDoc.embedFont("Helvetica");

        pages.forEach((page, idx) => {
            const { width, height } = page.getSize();
            const text = `${idx + 1}`;
            const fontSize = 12;
            const textWidth = font.widthOfTextAtSize(text, fontSize);
            
            let x = 0, y = 20;

            switch(position) {
                case 'top': x = width / 2 - textWidth / 2; y = height - 20; break;
                case 'bottom-left': x = 20; y = 20; break;
                case 'bottom-right': x = width - textWidth - 20; y = 20; break;
                default: x = width / 2 - textWidth / 2; y = 20; // Bottom Center
            }

            page.drawText(text, { x, y, size: fontSize, font });
        });

        const pdfBytes = await pdfDoc.save();
        await logUsage(req, 'Page Numbers');
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=numbered.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed.");
    }
});

// JPG TO PDF
router.post('/process/jpg-to-pdf', upload.array('files'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) return res.status(400).send("Files required.");
        
        const pdfDoc = await PDFDocument.create();
        
        for (const file of req.files) {
            let image;
            if (file.mimetype === 'image/png') {
                 image = await pdfDoc.embedPng(file.buffer);
            } else {
                 image = await pdfDoc.embedJpg(file.buffer);
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
        await logUsage(req, 'Edit/Sign PDF');
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=converted.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed. Ensure images are JPG/PNG.");
    }
});

// EDIT / SIGN PDF
router.post('/process/edit', upload.single('file'), async (req, res) => {
    try {
        if (!req.file || !req.body.operations) return res.status(400).send("File and ops required.");
        
        const operations = JSON.parse(req.body.operations);
        const pdfDoc = await PDFDocument.load(req.file.buffer);
        const pages = pdfDoc.getPages();

        for (const op of operations) {
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
        await logUsage(req);
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=edited.pdf',
        });
        res.send(Buffer.from(pdfBytes));

    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to edit operations.");
    }
});

// WORD TO PDF
router.post('/process/word-to-pdf', upload.single('file'), async (req, res) => {
    try {
         if (!req.file) return res.status(400).send("File required.");
         
         const { extractRawText } = await import('mammoth');
         const result = await extractRawText({ buffer: req.file.buffer });
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
         await logUsage(req, 'Word to PDF');
         res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=converted.pdf',
        });
        res.send(Buffer.from(pdfBytes));
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to convert Word to PDF.");
    }
});

// PDF TO WORD
router.post('/process/pdf-to-word', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const pdfParse = (await import('pdf-parse')).default;
        const { Document, Packer, Paragraph, TextRun } = await import('docx');

        const data = await pdfParse(req.file.buffer);
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

        const buffer = await Packer.toBuffer(doc);
        
        await logUsage(req, 'PDF to Word');
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': 'attachment; filename=converted.docx',
        });
        res.send(buffer);
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to convert PDF to Word.");
    }
});

// EXCEL TO PDF
router.post('/process/excel-to-pdf', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const XLSX = await import('xlsx');
        
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
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
        await logUsage(req, 'Excel to PDF');
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=converted.pdf',
        });
        res.send(Buffer.from(pdfBytes));

    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to convert Excel to PDF.");
    }
});

// PDF TO EXCEL
router.post('/process/pdf-to-excel', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const pdfParse = (await import('pdf-parse')).default;
        const XLSX = await import('xlsx');

        const data = await pdfParse(req.file.buffer);
        const text = data.text;
        
        // Strategy: Naive line split. Ideally we'd detect tables.
        const rows = text.split('\n').map(line => [line]);
        
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, "PDF Data");
        
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
         
        await logUsage(req, 'PDF to Excel');
        
         res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename=converted.xlsx',
        });
        res.send(buffer);
    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to convert PDF to Excel.");
    }
});

// PDF TO PPTX
router.post('/process/pdf-to-pptx', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).send("File required.");
        const pdfParse = (await import('pdf-parse')).default;
        const pptxgen = (await import('pptxgenjs')).default;

        const data = await pdfParse(req.file.buffer);
        
        const pptx = new pptxgen();
        let slide = pptx.addSlide();
        
        const charsPerSlide = 1000;
        const text = data.text;
        
        for (let i = 0; i < text.length; i += charsPerSlide) {
            if (i > 0) slide = pptx.addSlide();
            const chunk = text.substring(i, i + charsPerSlide).replace(/[^\x00-\x7F]/g, "");
            slide.addText(chunk, { x: 0.5, y: 0.5, w: '90%', h: '90%', fontSize: 12, color: '363636' });
        }

        const buffer = await pptx.write({ outputType: 'nodebuffer' });
        
        await logUsage(req, 'PDF to PPTX');
        
        res.set({
            'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'Content-Disposition': 'attachment; filename=converted.pptx',
        });
        res.send(buffer);

    } catch (e) {
        console.error(e);
        res.status(500).send("Failed to convert PDF to PPTX.");
    }
});

// PPTX TO PDF
router.post('/process/pptx-to-pdf', async (req, res) => {
     res.status(400).send("PPTX to PDF conversion is not supported in this serverless environment.");
});

// PDF TO JPG
router.post('/process/pdf-to-jpg', upload.single('file'), async (req, res) => {
    res.status(400).send("PDF to Image conversion requires enabling native binaries, currently disabled for stability.");
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
