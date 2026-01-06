import { query } from './db.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me';

// Helper: Apply CORS headers
export const applyCors = (res) => {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Client-IP'
    );
};

// Helper: Handle OPTIONS request
export const handleOptions = (req, res) => {
    if (req.method === 'OPTIONS') {
        applyCors(res);
        res.status(200).end();
        return true;
    }
    applyCors(res); // Apply to other methods too
    return false;
};

// Middleware: Authenticate User (Populates req.user)
export const authenticate = (req) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
        try {
            const user = jwt.verify(token, JWT_SECRET);
            req.user = user;
        } catch (e) {
            // Invalid token, treat as guest
        }
    }
};

// Middleware: Check Rate Limit (Returns true if allowed, false if blocked)
// Also handles logging usage if allowed.
export const checkRateLimit = async (req, res) => {
    try {
        const userId = req.user ? req.user.id : null;
        const ip = req.headers['client-ip'] || req.headers['x-forwarded-for'] || '0.0.0.0';
        req.usageInfo = { userId, ip }; // Store for logging

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        let countResult;

        if (userId) {
            countResult = await query(
                'SELECT COUNT(*) FROM usage_logs WHERE user_id = $1 AND created_at > $2',
                [userId, oneDayAgo]
            );
        } else {
            countResult = await query(
                'SELECT COUNT(*) FROM usage_logs WHERE ip_address = $1 AND created_at > $2',
                [ip, oneDayAgo]
            );
        }

        const count = parseInt(countResult.rows[0].count);
        if (count >= 300) {
            res.status(429).json({
                error: "Daily limit reached.",
                usage: count,
                limit: 300
            });
            return false;
        }
        return true;
    } catch (e) {
        console.error("Rate Limit Error:", e);
        // Fail open if DB error
        return true;
    }
};

// Helper: Log Usage
export const logUsage = async (req, toolName) => {
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
