
import 'dotenv/config';
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    console.log("Adding 'generated_quizzes' column to 'modules' table...");
    try {
        const client = await pool.connect();

        // Check if column exists first
        const checkRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='modules' AND column_name='generated_quizzes';
    `);

        if (checkRes.rowCount > 0) {
            console.log("Column 'generated_quizzes' already exists. Skipping.");
        } else {
            await client.query(`
        ALTER TABLE modules 
        ADD COLUMN generated_quizzes JSONB;
      `);
            console.log("Successfully added 'generated_quizzes' column.");
        }

        client.release();
    } catch (error) {
        console.error("Error adding column:", error);
    } finally {
        await pool.end();
    }
}

main();
