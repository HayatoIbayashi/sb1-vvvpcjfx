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

export function normalizeConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    url.searchParams.delete('ssl');
    url.searchParams.delete('sslmode');
    url.searchParams.delete('sslcert');
    url.searchParams.delete('sslkey');
    url.searchParams.delete('sslrootcert');
    return url.toString();
  } catch {
    return connectionString;
  }
}

export function shouldUseSsl(env: NodeJS.ProcessEnv = process.env) {
  const explicit = (env.DB_SSL || '').toLowerCase();
  if (explicit === 'require' || explicit === 'true') return true;
  if (explicit === 'disable' || explicit === 'false') return false;

  const connectionString = env.DATABASE_URL;
  if (!connectionString) return false;

  try {
    const url = new URL(connectionString);
    const ssl = (url.searchParams.get('ssl') || '').toLowerCase();
    const sslMode = (url.searchParams.get('sslmode') || '').toLowerCase();
    if (ssl === 'true' || ssl === '1') return true;
    return ['prefer', 'require', 'verify-ca', 'verify-full', 'no-verify'].includes(sslMode);
  } catch {
    return false;
  }
}

function buildPoolConfig(): PoolConfig {
  // Prefer DATABASE_URL, fallback to DB_* parts.
  if (DATABASE_URL) {
    return {
      connectionString: normalizeConnectionString(DATABASE_URL),
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

export function getPool() {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
  }
  return pool;
}
