import { Pool } from 'pg';

const getDbUrl = () => {
    // Check various common env var names
    const url = process.env.NETLIFY_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;
    
    // Debug: Log what's available
    console.log("DB: Checking Env Vars. Available keys:", Object.keys(process.env).filter(k => k.includes('DB') || k.includes('URL') || k.includes('NETLIFY')));
    console.log("DB: NETLIFY_DATABASE_URL present?", !!process.env.NETLIFY_DATABASE_URL);
    
    if (!url) {
        console.log("DB: No database URL found in environment variables (NETLIFY_DATABASE_URL, NEON_DATABASE_URL or DATABASE_URL).");
        return null;
    }
    console.log(`DB: Found database URL (length: ${url.length}). Connecting...`);
    return url;
};

const dbUrl = getDbUrl();

const pool = dbUrl ? new Pool({
  connectionString: dbUrl,
  ssl: {
    rejectUnauthorized: false,
  },
}) : null;

export const query = (text, params) => {
    if (!pool) {
        // Log once or softly to avoid spamming logs if intentional (fail open)
        throw new Error("Database not configured");
    }
    return pool.query(text, params);
};
