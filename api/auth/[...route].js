import { query } from '../../_lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { applyCors, handleOptions, authenticate } from '../../_lib/middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me';

export default async function handler(req, res) {
    console.log(`[Auth] ${req.method} ${req.url}`);
    
    if (handleOptions(req, res)) return;

    // simplistic routing based on URL tail
    // URL will be something like /api/auth/login? or /api/auth/signup
    // Vercel might pass req.query.route as array if file is [...route].js
    
    const { route } = req.query; 
    // route will be ['login'] or ['signup']
    const action = route ? route[0] : '';

    try {
        if (action === 'signup') {
            if (req.method !== 'POST') return res.status(405).json({ error: "Use POST" });
            return await signup(req, res);
        }
        if (action === 'login') {
             if (req.method !== 'POST') return res.status(405).json({ error: "Use POST" });
             return await login(req, res);
        }
        if (action === 'me') {
             if (req.method !== 'GET') return res.status(405).json({ error: "Use GET" });
             return await me(req, res);
        }
        
        res.status(404).json({ error: "Auth route not found" });

    } catch (e) {
        console.error("Auth Handler Error:", e);
        res.status(500).json({ error: "Internal Auth Error" });
    }
}

// --- Sub-Handlers ---

async function signup(req, res) {
    const { email, password, name } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await query(
        'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email, hashedPassword, name || '']
    );
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
}

async function login(req, res) {
    const { email, password } = req.body;
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, email: user.email } });
}

async function me(req, res) {
    authenticate(req);
    if (!req.user) return res.status(401).json({ error: "Not logged in" });

    const userRes = await query('SELECT id, email, name FROM users WHERE id = $1', [req.user.id]);
    const userData = userRes.rows[0];
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const countRes = await query('SELECT COUNT(*) FROM usage_logs WHERE user_id = $1 AND created_at > $2', [req.user.id, oneDayAgo]);
    const oldestRes = await query('SELECT created_at FROM usage_logs WHERE user_id = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 1', [req.user.id, oneDayAgo]);

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
}
