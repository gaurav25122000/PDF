import { query } from '../_lib/db.js';
import { applyCors, handleOptions, authenticate } from '../_lib/middleware.js';

export default async function handler(req, res) {
    if (handleOptions(req, res)) return;
    if (req.method !== 'GET') return res.status(405).json({ error: "Method not allowed" });

    authenticate(req);
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
        res.json({
            user: { id: req.user.id, email: req.user.email, name: 'Guest' },
            usageToday: 0,
            limit: 300,
            resetTime: null,
            warning: "Database not connected"
        });
    }
}
