
import 'dotenv/config';
import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    const r = await db.execute(sql`SELECT key, LEFT(value::text, 12) as key_start, LENGTH(value::text) as key_length FROM system_settings WHERE key LIKE '%api_key%' OR key LIKE '%openai%'`);
    console.log("API keys in database:");
    for (const row of r.rows) {
        console.log(`  ${row.key}: starts with "${row.key_start}..." (length: ${row.key_length})`);
    }
    await pool.end();
}
main();
