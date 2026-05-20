import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Parse DATABASE_URL manually to avoid Windows system env vars (PGUSER, PGPASSWORD, etc.)
// overriding the correct Supabase credentials
const dbUrl = new URL(process.env.DATABASE_URL);

console.log('Initializing database pool with max 15 connections...');
export const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.slice(1),
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  // Supabase always requires SSL
  ssl: { rejectUnauthorized: false },
});

// Add error handling for the pool to prevent crashes
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  // Don't throw the error, just log it to prevent app crashes
});

// Add connection error handling
pool.on('connect', (client) => {
  console.log('Database client connected');
  client.on('error', (err) => {
    console.error('Database client error:', err);
  });
});

// Handle process-level unhandled errors related to database
process.on('uncaughtException', (error) => {
  if (error.message.includes('terminating connection due to administrator command') ||
    error.message.includes('connection terminated') ||
    error.message.includes('Client has encountered a connection error')) {
    console.error('Database connection error handled gracefully:', error.message);
    return;
  }
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  if (reason && typeof reason === 'object' && 'message' in reason) {
    const message = (reason as any).message;
    if (message.includes('terminating connection due to administrator command') ||
      message.includes('connection terminated') ||
      message.includes('Client has encountered a connection error')) {
      console.error('Database rejection handled gracefully:', message);
      return;
    }
  }
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export const db = drizzle({ client: pool, schema });