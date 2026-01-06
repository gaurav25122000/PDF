import { query } from '../_lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { applyCors, handleOptions } from '../_lib/middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me';

export default async function handler(req, res) {
    if (handleOptions(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

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
        if (e.code === '23505') {
            return res.status(400).json({ error: "Email already registered" });
        }
        console.error("Signup error:", e);
        res.status(500).json({ error: "Signup failed" });
    }
}
