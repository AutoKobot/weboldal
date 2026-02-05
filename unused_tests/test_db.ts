import { pool } from './server/db';

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to database!');
    const res = await client.query('SELECT NOW()');
    console.log('Current time from DB:', res.rows[0]);
    client.release();
    process.exit(0);
  } catch (err) {
    console.error('Connection failed:', err);
    process.exit(1);
  }
}

testConnection();
