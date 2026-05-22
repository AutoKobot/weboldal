import 'dotenv/config';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Helper: check if query is a write operation
function isWriteQuery(sql: string): boolean {
  if (!sql || typeof sql !== 'string') return false;
  const trimmed = sql.trim().toLowerCase();
  return trimmed.startsWith('insert') ||
         trimmed.startsWith('update') ||
         trimmed.startsWith('delete') ||
         trimmed.startsWith('create') ||
         trimmed.startsWith('alter') ||
         trimmed.startsWith('drop') ||
         trimmed.startsWith('truncate') ||
         trimmed.startsWith('replace') ||
         trimmed.startsWith('begin') ||
         trimmed.startsWith('commit') ||
         trimmed.startsWith('rollback');
}

// Helper: check if error is a connection-related error
function isConnectionError(err: any): boolean {
  if (!err) return false;
  const code = err.code;
  const message = err.message || '';
  return code === 'ECONNREFUSED' ||
         code === 'ETIMEDOUT' ||
         code === 'ENOTFOUND' ||
         code === 'EPIPE' ||
         message.includes('connection lost') ||
         message.includes('connection terminated') ||
         message.includes('Client has encountered a connection error') ||
         message.includes('terminating connection') ||
         message.includes('socket hung up') ||
         message.includes('PGHOST');
}

// Parse DATABASE_URL manually to avoid Windows system env vars (PGUSER, PGPASSWORD, etc.)
// overriding the correct Supabase credentials
const dbUrl = new URL(process.env.DATABASE_URL);
const primaryConfig = {
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port),
  user: decodeURIComponent(dbUrl.username),
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.slice(1),
  max: 15,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false },
};

let backupConfig: any = null;
if (process.env.DATABASE_URL_BACKUP) {
  try {
    const backupUrl = new URL(process.env.DATABASE_URL_BACKUP);
    backupConfig = {
      host: backupUrl.hostname,
      port: parseInt(backupUrl.port),
      user: decodeURIComponent(backupUrl.username),
      password: decodeURIComponent(backupUrl.password),
      database: backupUrl.pathname.slice(1),
      max: 15,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
      ssl: { rejectUnauthorized: false },
    };
  } catch (err: any) {
    console.error('Invalid DATABASE_URL_BACKUP configured:', err.message);
  }
}

// Failover Client Proxy Factory
function createFailoverClient(primaryClient: any, backupClient: any | null, pool: FailoverPool) {
  const handler = {
    get(target: any, prop: string | symbol, receiver: any) {
      if (prop === 'query') {
        return async function(queryTextOrConfig: any, values?: any[], callback?: any) {
          // Normalize parameters to support callback interface if used
          let queryText = typeof queryTextOrConfig === 'string'
            ? queryTextOrConfig
            : (queryTextOrConfig && queryTextOrConfig.text) || '';
          let actualValues = Array.isArray(values) ? values : [];
          let actualCallback = typeof values === 'function' ? values : callback;

          const sql = queryText;
          const activeClient = pool.getActiveClient(primaryClient, backupClient);

          if (isWriteQuery(sql)) {
            // Write Query: Dual-Write (Replication) to both databases
            let primaryErr: any = null;
            let primaryResult: any = null;

            try {
              if (primaryClient) {
                primaryResult = await primaryClient.query(queryTextOrConfig, actualValues);
              } else {
                throw new Error("Primary database client not connected");
              }
            } catch (err: any) {
              primaryErr = err;
              if (isConnectionError(err) && backupClient) {
                console.warn('Primary database transaction write connection error. Switching active database source to backup...');
                pool.handleFailover();
              } else {
                if (actualCallback) return actualCallback(err);
                throw err;
              }
            }

            if (backupClient) {
              try {
                const backupResult = await backupClient.query(queryTextOrConfig, actualValues);
                if (primaryErr) {
                  if (actualCallback) return actualCallback(null, backupResult);
                  return backupResult;
                }
              } catch (backupErr: any) {
                console.error('Backup database transaction write replication failed:', backupErr.message);
                if (primaryErr) {
                  const bothErr = new Error(`Both databases transaction writes failed. Primary: ${primaryErr.message}. Backup: ${backupErr.message}`);
                  if (actualCallback) return actualCallback(bothErr);
                  throw bothErr;
                }
              }
            }

            if (primaryErr) {
              if (actualCallback) return actualCallback(primaryErr);
              throw primaryErr;
            }
            if (actualCallback) return actualCallback(null, primaryResult);
            return primaryResult;
          } else {
            // Read Query: execute on active client
            try {
              if (activeClient) {
                const result = await activeClient.query(queryTextOrConfig, actualValues);
                if (actualCallback) return actualCallback(null, result);
                return result;
              } else {
                throw new Error("No active database client connected");
              }
            } catch (err: any) {
              if (isConnectionError(err) && backupClient) {
                console.warn('Database transaction read error. Switching to backup and retrying...');
                pool.handleFailover();
                const alternateClient = pool.getActiveClient(primaryClient, backupClient);
                try {
                  if (alternateClient) {
                    const result = await alternateClient.query(queryTextOrConfig, actualValues);
                    if (actualCallback) return actualCallback(null, result);
                    return result;
                  }
                } catch (retryErr) {
                  if (actualCallback) return actualCallback(retryErr);
                  throw retryErr;
                }
              }
              if (actualCallback) return actualCallback(err);
              throw err;
            }
          }
        };
      }

      if (prop === 'release') {
        return function(err?: any) {
          if (primaryClient) {
            try { primaryClient.release(err); } catch (e) { console.error('Error releasing primary client:', e); }
          }
          if (backupClient) {
            try { backupClient.release(err); } catch (e) { console.error('Error releasing backup client:', e); }
          }
        };
      }

      // Default delegation to active client
      const activeClient = pool.getActiveClient(primaryClient, backupClient);
      if (!activeClient) return undefined;
      const value = Reflect.get(activeClient, prop, receiver);
      if (typeof value === 'function') {
        return value.bind(activeClient);
      }
      return value;
    }
  };

  return new Proxy(primaryClient || backupClient, handler);
}

// FailoverPool implementation subclassing Pool to ensure complete backward compatibility
export class FailoverPool extends Pool {
  public primaryPool: Pool;
  public backupPool: Pool | null = null;
  private activeSource: 'primary' | 'backup' = 'primary';
  private primaryOnline = true;
  private backupOnline = false;

  constructor(pConfig: any, bConfig: any | null) {
    // Initialize base class with primary config
    super(pConfig);

    this.primaryPool = new Pool(pConfig);
    if (bConfig) {
      this.backupPool = new Pool(bConfig);
      this.backupOnline = true;
    }

    // Setup error listeners to prevent crashes
    this.primaryPool.on('error', (err) => {
      console.error('Primary database pool error:', err);
    });
    if (this.backupPool) {
      this.backupPool.on('error', (err) => {
        console.error('Backup database pool error:', err);
      });
    }

    // Run connection health check and set up interval
    this.checkHealth();
    setInterval(() => this.checkHealth(), 15000);
  }

  async checkHealth() {
    try {
      await this.primaryPool.query('SELECT 1');
      if (!this.primaryOnline) {
        console.log('Primary database is back online!');
        this.primaryOnline = true;
        // Automatic switch back to primary if we switched away
        if (this.activeSource === 'backup') {
          console.log('Primary database is healthy again, switching back to primary.');
          this.activeSource = 'primary';
        }
      }
    } catch (err) {
      if (this.primaryOnline) {
        console.error('Primary database went offline:', err);
        this.primaryOnline = false;
        if (this.backupPool && this.activeSource === 'primary') {
          console.warn('Failover triggered: Primary database offline. Switching to backup database...');
          this.activeSource = 'backup';
        }
      }
    }

    if (this.backupPool) {
      try {
        await this.backupPool.query('SELECT 1');
        if (!this.backupOnline) {
          console.log('Backup database is online!');
          this.backupOnline = true;
        }
      } catch (err) {
        if (this.backupOnline) {
          console.error('Backup database went offline:', err);
          this.backupOnline = false;
        }
      }
    } else {
      this.backupOnline = false;
    }
  }

  getActivePool(): Pool {
    if (this.activeSource === 'backup' && this.backupPool && this.backupOnline) {
      return this.backupPool;
    }
    return this.primaryPool;
  }

  getActiveClient(primaryClient: any, backupClient: any | null): any {
    if (this.activeSource === 'backup' && backupClient && this.backupOnline) {
      return backupClient;
    }
    return primaryClient;
  }

  handleFailover() {
    if (this.backupPool && this.backupOnline) {
      this.activeSource = this.activeSource === 'primary' ? 'backup' : 'primary';
      console.log(`Switched active database source to: ${this.activeSource}`);
    }
  }

  public switchSource(source: 'primary' | 'backup'): boolean {
    if (source === 'backup' && !this.backupPool) {
      return false;
    }
    this.activeSource = source;
    console.log(`Manually switched active database source to: ${this.activeSource}`);
    return true;
  }

  public getStatus() {
    return {
      primaryOnline: this.primaryOnline,
      backupOnline: this.backupPool ? this.backupOnline : null,
      backupConfigured: !!this.backupPool,
      activeSource: this.activeSource,
    };
  }

  // Override query method
  async query(queryTextOrConfig: any, valuesOrOrCallback?: any, callback?: any): Promise<any> {
    let queryText = typeof queryTextOrConfig === 'string'
      ? queryTextOrConfig
      : (queryTextOrConfig && queryTextOrConfig.text) || '';
    let values = Array.isArray(valuesOrOrCallback) ? valuesOrOrCallback : [];
    let actualCallback = typeof valuesOrOrCallback === 'function' ? valuesOrOrCallback : callback;

    const sql = queryText;

    if (isWriteQuery(sql)) {
      // Write query: execute on both pools (dual-write replication)
      let primaryErr: any = null;
      let primaryResult: any = null;

      try {
        primaryResult = await this.primaryPool.query(queryTextOrConfig, values);
      } catch (err: any) {
        primaryErr = err;
        if (isConnectionError(err) && this.backupPool) {
          console.warn('Primary database write connection error. Attempting failover...');
          this.handleFailover();
        } else {
          if (actualCallback) return actualCallback(err);
          throw err;
        }
      }

      if (this.backupPool) {
        try {
          const backupResult = await this.backupPool.query(queryTextOrConfig, values);
          if (primaryErr) {
            if (actualCallback) return actualCallback(null, backupResult);
            return backupResult;
          }
        } catch (backupErr: any) {
          console.error('Backup database replication query failed:', backupErr.message);
          if (primaryErr) {
            const bothErr = new Error(`Both databases failed. Primary: ${primaryErr.message}. Backup: ${backupErr.message}`);
            if (actualCallback) return actualCallback(bothErr);
            throw bothErr;
          }
        }
      }

      if (primaryErr) {
        if (actualCallback) return actualCallback(primaryErr);
        throw primaryErr;
      }
      if (actualCallback) return actualCallback(null, primaryResult);
      return primaryResult;
    } else {
      // Read query: run on the active pool
      const activePool = this.getActivePool();
      try {
        const result = await activePool.query(queryTextOrConfig, values);
        if (actualCallback) return actualCallback(null, result);
        return result;
      } catch (err: any) {
        if (isConnectionError(err) && this.backupPool) {
          console.warn('Database read error. Switching to backup and retrying...');
          this.handleFailover();
          const alternatePool = this.getActivePool();
          try {
            const result = await alternatePool.query(queryTextOrConfig, values);
            if (actualCallback) return actualCallback(null, result);
            return result;
          } catch (retryErr) {
            if (actualCallback) return actualCallback(retryErr);
            throw retryErr;
          }
        }
        if (actualCallback) return actualCallback(err);
        throw err;
      }
    }
  }

  // Override connect method
  async connect(callback?: any): Promise<any> {
    let primaryClient: any = null;
    let backupClient: any = null;
    let primaryErr: any = null;

    try {
      primaryClient = await this.primaryPool.connect();
    } catch (err: any) {
      primaryErr = err;
      if (isConnectionError(err) && this.backupPool) {
        console.warn('Primary database connect connection error. Attempting failover...');
        this.handleFailover();
      } else {
        if (callback) return callback(err);
        throw err;
      }
    }

    if (this.backupPool) {
      try {
        backupClient = await this.backupPool.connect();
      } catch (backupErr: any) {
        console.error('Failed to connect to backup database:', backupErr.message);
        if (primaryErr) {
          const bothErr = new Error(`Failed to connect to both databases. Primary: ${primaryErr.message}. Backup: ${backupErr.message}`);
          if (callback) return callback(bothErr);
          throw bothErr;
        }
      }
    }

    if (primaryErr && backupClient) {
      const failoverClient = createFailoverClient(null, backupClient, this);
      this.emit('connect', failoverClient);
      if (callback) return callback(null, failoverClient);
      return failoverClient;
    }

    if (primaryErr) {
      if (callback) return callback(primaryErr);
      throw primaryErr;
    }

    const failoverClient = createFailoverClient(primaryClient, backupClient, this);
    this.emit('connect', failoverClient);
    if (callback) return callback(null, failoverClient);
    return failoverClient;
  }

  // Override end method
  async end(callback?: any): Promise<void> {
    await this.primaryPool.end();
    if (this.backupPool) {
      await this.backupPool.end();
    }
    await super.end();
    if (callback) callback();
  }
}

console.log('Initializing database failover pool...');
export const pool = new FailoverPool(primaryConfig, backupConfig);

// Add error handling for the pool to prevent crashes
pool.on('error', (err) => {
  console.error('Database pool error:', err);
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