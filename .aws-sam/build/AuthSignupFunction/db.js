import { Pool } from 'pg';
const DATABASE_URL = process.env.DATABASE_URL;
let pool = null;
export function getPool() {
    if (!pool) {
        if (!DATABASE_URL)
            throw new Error('Missing env: DATABASE_URL');
        pool = new Pool({ connectionString: DATABASE_URL, max: 2 });
    }
    return pool;
}
export async function upsertUserAndProfile(params) {
    const { userId, email, gender = null, age = null, prefecture = null } = params;
    const client = await getPool().connect();
    try {
        await client.query('BEGIN');
        await client.query(`INSERT INTO users (id, email, is_active)
       VALUES ($1, $2, TRUE)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, updated_at = now()`, [userId, email]);
        await client.query(`INSERT INTO profiles (id, email, gender, age, prefecture, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, now(), now())
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, gender = EXCLUDED.gender, age = EXCLUDED.age, prefecture = EXCLUDED.prefecture, updated_at = now()`, [userId, email, gender, age, prefecture]);
        await client.query('COMMIT');
    }
    catch (e) {
        await client.query('ROLLBACK');
        throw e;
    }
    finally {
        client.release();
    }
}
