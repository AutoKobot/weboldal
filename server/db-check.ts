
import { db } from "./db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking tables in database...");
    try {
        const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

        console.log("Tables found:", result.rows.map(r => r.table_name).join(", "));

        const hasTestResults = result.rows.some(r => r.table_name === 'test_results');
        console.log(`test_results table exists: ${hasTestResults}`);

    } catch (error) {
        console.error("Error checking tables:", error);
    }
    process.exit(0);
}

main();
