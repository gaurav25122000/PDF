import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for Neon/AWS Lambda usually
  },
});

export const query = (text, params) => pool.query(text, params);
