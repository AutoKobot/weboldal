import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function checkJobs() {
  try {
    const result = await db.execute(sql`SELECT id, type, status, progress, message FROM background_jobs ORDER BY created_at DESC LIMIT 5`);
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkJobs();
