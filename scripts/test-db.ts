
import 'dotenv/config';
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Testing DB connection...");
    try {
        const result = await db.execute(sql`SELECT count(*) FROM system_settings WHERE key='openai_api_key'`);
        console.log("Result:", result.rows);
    } catch (error) {
        console.error("DB Error:", error);
    } finally {
        process.exit(0);
    }
}
main();
