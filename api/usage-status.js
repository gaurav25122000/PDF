// Helper to get query params or body
const getParams = (req) => {
    if (req.method === 'GET') return req.query;
    return req.body;
}

export default async function handler(req, res) {
    console.log(`[Usage] ${req.method} ${req.url}`);
    
    // CORS (Manual)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        // Mock auth/ip temporarily to test connectivity
        // Note: req.user is populated by middleware usually. 
        // For this microservice, we need to replicate middleware logic or simplify.
        // Let's assume public access for a moment or simplified IP check.
        
        const ip = req.headers['client-ip'] || req.headers['x-forwarded-for'] || '0.0.0.0';
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        let countResult = { rows: [{ count: 0 }] };
        let oldestResult = { rows: [] };

        try {
             // Checking DB connection via a simple query
             const { query } = await import('./_lib/db.js');
             
             // We don't have user ID here easily without the middleware.
             // Just fall back to IP check for now to prove connectivity.
             countResult = await query('SELECT COUNT(*) FROM usage_logs WHERE ip_address = $1 AND created_at > $2', [ip, oneDayAgo]);
             oldestResult = await query('SELECT created_at FROM usage_logs WHERE ip_address = $1 AND created_at > $2 ORDER BY created_at ASC LIMIT 1', [ip, oneDayAgo]);

        } catch (dbErr) {
            console.error("DB Error in usage-status:", dbErr);
            // Return a fallback so we see *something*
             return res.json({
                usage: 999,
                limit: 300,
                resetTime: null,
                message: "API Reachable (DB Disconnected)"
            });
        }

        let resetTime = null;
        if (oldestResult && oldestResult.rows.length > 0) {
            resetTime = new Date(new Date(oldestResult.rows[0].created_at).getTime() + 24 * 60 * 60 * 1000);
        }

        res.json({
            usage: parseInt(countResult.rows[0].count),
            limit: 300,
            resetTime
        });

    } catch (e) {
        console.error("Usage Status Fatal Error:", e);
        res.status(500).json({ error: "Failed to fetch status" });
    }
}
