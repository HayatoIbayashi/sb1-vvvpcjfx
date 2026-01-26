import { Pool, type PoolConfig } from 'pg';

const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_SSL,
} = process.env;

let pool: Pool | null = null;

function buildPoolConfig(): PoolConfig {
  // Prefer DATABASE_URL, fallback to DB_* parts.
  if (DATABASE_URL) {
    return {
      connectionString: DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30_000,
      ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
    };
  }

  if (!DB_HOST || !DB_NAME || !DB_USER) {
    throw new Error('Missing env: set DATABASE_URL or DB_HOST/DB_NAME/DB_USER');
  }

  return {
    host: DB_HOST,
    port: Number(DB_PORT || 5432),
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASSWORD,
    max: 5,
    idleTimeoutMillis: 30_000,
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  };
}

function shouldUseSsl() {
  const value = (DB_SSL || '').toLowerCase();
  return value === 'require' || value === 'true';
}

export function getPool() {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
  }
  return pool;
}
