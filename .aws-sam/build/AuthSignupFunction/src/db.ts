import { Pool, type PoolConfig } from 'pg';

const {
  DATABASE_URL,
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
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
  // DATABASE_URL 優先。個別指定のときは DB_* を使用。
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

export async function upsertUserAndProfile(params: {
  userId: string;
  email: string;
  gender?: string | null;
  age?: number | null;
  prefecture?: string | null;
  displayName?: string | null;
}) {
  const { userId, email, gender = null, age = null, prefecture = null, displayName = null } = params;
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (id, email, is_active)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`,
      [userId, email],
    );

    await client.query(
      `INSERT INTO profiles (id, email, gender, age, prefecture, display_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, gender = EXCLUDED.gender, age = EXCLUDED.age, prefecture = EXCLUDED.prefecture, display_name = EXCLUDED.display_name, updated_at = now()`,
      [userId, email, gender, age, prefecture, displayName],
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
