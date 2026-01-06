import { query } from '../_lib/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { applyCors, handleOptions } from '../_lib/middleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_me';

export default async function handler(req, res) {
    if (handleOptions(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

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
}
