import { Pool } from '@neondatabase/serverless';
import 'dotenv/config';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    console.log("Fixing subjects table...");
    await client.query(`ALTER TABLE subjects ADD COLUMN IF NOT EXISTS type varchar NOT NULL DEFAULT 'theory';`);
    console.log("Subjects table fixed!");
    
    console.log("Fixing api_calls table...");
    await client.query(`ALTER TABLE api_calls DROP COLUMN IF EXISTS request_data CASCADE;`);
    await client.query(`ALTER TABLE api_calls DROP COLUMN IF EXISTS response_data CASCADE;`);
    await client.query(`ALTER TABLE api_calls ADD COLUMN IF NOT EXISTS req_data text;`);
    await client.query(`ALTER TABLE api_calls ADD COLUMN IF NOT EXISTS res_data text;`);
    console.log("api_calls table fixed!");
    
    console.log("All done!");
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    pool.end();
  }
}

main();
