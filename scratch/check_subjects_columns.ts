import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkColumns() {
  try {
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'subjects'
    `);
    console.log("Subjects columns:", result.rows.map(r => r.column_name));
  } catch (error) {
    console.error("Error checking columns:", error);
  } finally {
    process.exit(0);
  }
}

checkColumns();
