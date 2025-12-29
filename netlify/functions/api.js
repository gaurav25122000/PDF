import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument, degrees } from 'pdf-lib';
import archiver from 'archiver';
import { Stream } from 'stream';

const app = express();
app.use(cors());
const router = express.Router();

// DEBUG: Catch-all to see what's happening if no route matches
router.all('*', (req, res) => {
    res.status(404).json({
        error: "Route not found in API",
        path: req.path,
        url: req.url,
        baseUrl: req.baseUrl,
        originalUrl: req.originalUrl,
        method: req.method
    });
});

// Mount router on various paths to handle Netlify's rewriting quirks
app.use('/.netlify/functions/api', router);
app.use('/api', router);
app.use('/', router); 

// Configure multer for memory storage
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit per file
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

// --- ROUTES ---

router.get('/', (req, res) => {
  res.json({ message: "MarvelPDF Node.js Backend Running (Minimal)" });
});

router.get('/health', (req, res) => {
    res.json({ status: "ok", environment: "nodejs" });
});

/*
// HEAVY ROUTES COMMENTED OUT FOR DEBUGGING
// ... (All other routes) ...
*/

export const handler = serverless(app);
