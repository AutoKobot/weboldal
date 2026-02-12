
import 'dotenv/config';
import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    console.log("=== STEP 1: Read .env keys ===");
    console.log("OPENAI_API_KEY starts with:", openaiKey ? openaiKey.substring(0, 8) : "NOT SET");
    console.log("GEMINI_API_KEY starts with:", geminiKey ? geminiKey.substring(0, 8) : "NOT SET");

    console.log("\n=== STEP 2: Current DB keys ===");
    const before = await db.execute(sql`SELECT key, LEFT(value::text, 10) as starts_with FROM system_settings WHERE key IN ('openai_api_key', 'gemini_api_key')`);
    for (const row of before.rows) {
        console.log(`  DB ${row.key}: ${row.starts_with}...`);
    }

    console.log("\n=== STEP 3: Updating ===");
    if (openaiKey) {
        const res = await db.execute(sql`UPDATE system_settings SET value = ${openaiKey} WHERE key = 'openai_api_key'`);
        console.log("OpenAI update result:", JSON.stringify(res));
    }

    console.log("\n=== STEP 4: After update ===");
    const after = await db.execute(sql`SELECT key, LEFT(value::text, 10) as starts_with FROM system_settings WHERE key IN ('openai_api_key', 'gemini_api_key')`);
    for (const row of after.rows) {
        console.log(`  DB ${row.key}: ${row.starts_with}...`);
    }

    await pool.end();
}
main();
