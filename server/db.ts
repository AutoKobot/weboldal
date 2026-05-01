import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "../shared/schema";

// Configure Neon for serverless environments
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = "password";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

console.log('Initializing database pool with max 15 connections...');
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15, // Reduced to avoid exceeding Neon connection limits
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  maxUses: Infinity,
  allowExitOnIdle: false,
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
    // Handle individual client errors gracefully
  });
});

// Handle process-level unhandled errors related to database
process.on('uncaughtException', (error) => {
  if (error.message.includes('terminating connection due to administrator command') ||
    error.message.includes('connection terminated') ||
    error.message.includes('Client has encountered a connection error')) {
    console.error('Database connection error handled gracefully:', error.message);
    // Don't exit the process for database connection errors
    return;
  }
  // For other uncaught exceptions, still exit
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