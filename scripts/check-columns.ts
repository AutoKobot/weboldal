
import 'dotenv/config';
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking system_settings columns...");
    try {
        const result = await db.execute(sql`SELECT * FROM system_settings LIMIT 1`);
        console.log("Columns:", Object.keys(result.rows[0] || {}));
        console.log("Row:", result.rows[0]);
    } catch (error) {
        console.error("DB Error:", error);
    } finally {
        process.exit(0);
    }
}
main();
