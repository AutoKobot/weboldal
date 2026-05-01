import { db } from "../server/db";
import { sql } from "drizzle-orm";
import fs from "fs";

async function diagnostic() {
  let output = "";
  const tables = ['users', 'professions', 'subjects', 'modules'];
  for (const table of tables) {
    try {
      output += `--- Table: ${table} ---\n`;
      const result = await db.execute(sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = ${table}
      `);
      output += result.rows.map(r => `${r.column_name}: ${r.data_type}`).join('\n') + '\n\n';
    } catch (e: any) {
      output += `Error checking ${table}: ${e.message}\n\n`;
    }
  }
  fs.writeFileSync("e:/Antigravity_projektek/InteractiveLearning/scratch/db_status.txt", output);
  console.log("Diagnostic complete. Results in scratch/db_status.txt");
  process.exit(0);
}

diagnostic();
