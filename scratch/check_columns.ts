import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function checkColumns() {
  try {
    const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'subjects'
    `);
    console.log("Subjects columns:");
    console.log(JSON.stringify(result.rows, null, 2));
    
    const result2 = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'modules'
    `);
    console.log("\nModules columns:");
    console.log(JSON.stringify(result2.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkColumns();
