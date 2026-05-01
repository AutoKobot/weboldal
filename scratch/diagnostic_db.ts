import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function diagnostic() {
  const tables = ['users', 'professions', 'subjects', 'modules'];
  for (const table of tables) {
    try {
      const result = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${table}
      `);
      console.log(`--- Table: ${table} ---`);
      console.log(result.rows.map(r => `${r.column_name}: ${r.data_type}`).join('\n'));
    } catch (e) {
      console.error(`Error checking ${table}:`, e);
    }
  }
  process.exit(0);
}

diagnostic();
