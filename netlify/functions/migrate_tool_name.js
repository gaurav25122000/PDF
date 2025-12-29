
import { query } from './db.js';

async function migrate() {
    try {
        console.log("Starting migration...");
        await query(`
            ALTER TABLE usage_logs 
            ADD COLUMN IF NOT EXISTS tool_name VARCHAR(255);
        `);
        console.log("Migration successful: Added tool_name column.");
        process.exit(0);
    } catch (e) {
        console.error("Migration failed:", e);
        process.exit(1);
    }
}

migrate();
