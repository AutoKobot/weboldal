import { Pool } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
    const client = await pool.connect();
    try {
        // 1. Add is_pinned and tags columns to discussions (if not exists)
        await client.query(`
      ALTER TABLE discussions
        ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
    `);
        console.log('✅ discussions table extended');

        // 2. Create discussion_reactions table
        await client.query(`
      CREATE TABLE IF NOT EXISTS discussion_reactions (
        id SERIAL PRIMARY KEY,
        discussion_id INTEGER NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(discussion_id, user_id, emoji)
      );
      CREATE INDEX IF NOT EXISTS idx_reactions_discussion ON discussion_reactions(discussion_id);
    `);
        console.log('✅ discussion_reactions table created');

    } catch (err) {
        console.error('Migration error:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
