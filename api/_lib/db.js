// Enable verbose logging for debugging
console.log("DB Module Loaded");
import { Pool } from 'pg';

const getDbUrl = () => {
  // Check various common env var names
  // Vercel Postgres uses POSTGRES_URL, POSTGRES_PRISMA_URL, etc.
  const url = process.env.POSTGRES_URL || process.env.NETLIFY_DATABASE_URL || process.env.NEON_DATABASE_URL || process.env.DATABASE_URL;

  // Debug: Log what's available
  console.log("DB: Checking Env Vars. Available keys:", Object.keys(process.env).filter(k => k.includes('DB') || k.includes('URL') || k.includes('POSTGRES')));
  console.log("DB: POSTGRES_URL present?", !!process.env.POSTGRES_URL);

  if (!url) {
    console.log("DB: No database URL found in environment variables.");
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
