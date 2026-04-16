
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = "postgresql://postgres.upghcvosvrafiogfrxiq:TiszaloK123@aws-1-eu-central-1.pooler.supabase.com:6543/postgres";

async function checkSupabaseTables() {
  const pool = new Pool({ connectionString });
  try {
    console.log('--- Supabase Táblák Ellenőrzése ---');
    const res = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('Talált táblák:');
    res.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    if (res.rows.some(r => r.table_name === 'users')) {
      console.log('\n--- Users Tábla Oszlopai ---');
      const cols = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users'
        ORDER BY ordinal_position;
      `);
      cols.rows.forEach(col => console.log(`- ${col.column_name} (${col.data_type})`));
    }

  } catch (err) {
    console.error('Hiba:', err);
  } finally {
    await pool.end();
  }
}

checkSupabaseTables();
