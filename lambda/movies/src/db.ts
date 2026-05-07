import { Pool, type PoolConfig } from 'pg';

let pool: Pool | null = null;
let poolListenersAttached = false;

const DEFAULT_POOL_MAX = 2;
const DEFAULT_IDLE_TIMEOUT_MS = 10_000;
const DEFAULT_CONNECTION_TIMEOUT_MS = 2_000;

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

function parsePositiveInt(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function buildPoolConfig(env: NodeJS.ProcessEnv = process.env): PoolConfig {
  const max = parsePositiveInt(env.DB_POOL_MAX, DEFAULT_POOL_MAX);
  const idleTimeoutMillis = parsePositiveInt(env.DB_IDLE_TIMEOUT_MS, DEFAULT_IDLE_TIMEOUT_MS);
  const connectionTimeoutMillis = parsePositiveInt(
    env.DB_CONNECTION_TIMEOUT_MS,
    DEFAULT_CONNECTION_TIMEOUT_MS,
  );
  const ssl = shouldUseSsl(env) ? { rejectUnauthorized: false } : undefined;

  // Prefer DATABASE_URL, fallback to DB_* parts.
  if (env.DATABASE_URL) {
    return {
      connectionString: normalizeConnectionString(env.DATABASE_URL),
      max,
      idleTimeoutMillis,
      connectionTimeoutMillis,
      ssl,
    };
  }

  if (!env.DB_HOST || !env.DB_NAME || !env.DB_USER) {
    throw new Error('Missing env: set DATABASE_URL or DB_HOST/DB_NAME/DB_USER');
  }

  return {
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 5432),
    database: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    max,
    idleTimeoutMillis,
    connectionTimeoutMillis,
    ssl,
  };
}

export function getPool() {
  if (!pool) {
    pool = new Pool(buildPoolConfig());
  }
  if (!poolListenersAttached) {
    pool.on('error', (error) => {
      console.error('movies db pool error', error);
    });
    poolListenersAttached = true;
  }
  return pool;
}
