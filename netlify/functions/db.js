import { Pool } from 'pg';

const pool = process.env.NETLIFY_DATABASE_URL ? new Pool({
  connectionString: process.env.NETLIFY_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
}) : null;

export const query = (text, params) => {
    if (!pool) {
        console.warn("Database query skipped: NEON_DATABASE_URL not set.");
        // Throwing error will cause catch() in api.js to run, which is what we want (fail open if checkRateLimit fails)
        // CheckRateLimit catches errors, so this is safe. 
        // LogUsage catches errors, so this is safe.
        throw new Error("NEON_DATABASE_URL is not set");
    }
    return pool.query(text, params);
};
