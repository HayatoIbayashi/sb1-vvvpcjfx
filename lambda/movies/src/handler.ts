import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getPool } from './db.js';
import {
  createAdminAccount,
  deleteAdminAccount,
  listAdminAccounts,
  updateAdminAccount,
  type AdminAccountRole,
} from './adminAccounts.js';

const MOVIE_COLUMNS = [
  'id',
  'title',
  'description',
  'thumbnail',
  'thumbnail_top',
  'thumbnail_detail',
  'release_date',
  'duration',
  'genre',
  '"cast"',
  'director',
  'release_year',
  'price',
  'rental_price',
  'view_window_days',
  'created_at',
  'updated_at',
];

function response(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message) return message;
  }
  return fallback;
}

function getErrorCode(error: unknown) {
  if (typeof error === 'object' && error && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string' && code) return code;
  }
  return null;
}

function getAuthHeader(headers: Record<string, string | undefined> | undefined) {
  if (!headers) return null;
  return headers.authorization || headers.Authorization || null;
}

function decodeJwtPayload(token: string) {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1];
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function getUserIdFromAuth(headers: Record<string, string | undefined> | undefined) {
  const header = getAuthHeader(headers);
  if (!header) return null;
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : header;
  const payload = decodeJwtPayload(token);
  return typeof payload?.sub === 'string' ? payload.sub : null;
}

function parseJsonBody(event: APIGatewayProxyEventV2) {
  if (!event.body) return null;
  const raw = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

class ValidationError extends Error {
  code = 'VALIDATION_ERROR';
}

type AdminMovieWriteInput = {
  title: string;
  description: string | null;
  thumbnail: string | null;
  thumbnail_top: string | null;
  thumbnail_detail: string | null;
  release_date: string | null;
  duration: string | null;
  genre: string[];
  cast: string[];
  director: string | null;
  release_year: number | null;
  price: number;
  rental_price: number;
  is_published: boolean;
  publish_at: string | null;
  unpublish_at: string | null;
  view_window_days: number;
};

type AdminUserUpdateInput = {
  email: string;
  gender: string | null;
  age: number | null;
  prefecture: string | null;
  status: 'active' | 'suspended';
};

type AdminAccountCreateInput = {
  email: string;
  name: string | null;
  password: string;
  role: AdminAccountRole;
};

type AdminAccountUpdateInput = {
  email: string;
  name: string | null;
  role: AdminAccountRole;
};

type WalletExpirationRow = {
  remaining_points: number | string | null;
  expires_at: string | null;
  is_paid: boolean | null;
  source_type: string | null;
};

type WalletExpirationItem = {
  date: string | null;
  amount: number | string | null;
  type: 'paid' | 'bonus';
  note: string | null;
};

type WalletTransactionRow = {
  id: string;
  created_at: string;
  type: string;
  amount: number | string | null;
  balance_after: number | string | null;
  movie_title: string | null;
};

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function requireString(value: unknown, fieldName: string) {
  const normalized = normalizeString(value);
  if (!normalized) throw new ValidationError(`${fieldName} is required`);
  return normalized;
}

function parseInteger(value: unknown, fieldName: string, fallback: number | null) {
  if (value == null || value === '') return fallback;
  const normalized = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (!Number.isFinite(normalized) || !Number.isInteger(normalized)) {
    throw new ValidationError(`${fieldName} must be an integer`);
  }
  return Number(normalized);
}

function parseNonNegativeInteger(value: unknown, fieldName: string, fallback: number) {
  const parsed = parseInteger(value, fieldName, fallback);
  if (parsed == null || parsed < 0) {
    throw new ValidationError(`${fieldName} must be 0 or greater`);
  }
  return parsed;
}

function parseStringArray(value: unknown) {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  throw new ValidationError('genre/cast must be string arrays');
}

function buildAdminMovieWriteInput(body: Record<string, unknown> | null): AdminMovieWriteInput {
  if (!body) throw new ValidationError('Invalid JSON body');

  const thumbnail = normalizeString(body.thumbnail);

  return {
    title: requireString(body.title, 'title'),
    description: normalizeString(body.description),
    thumbnail,
    thumbnail_top: normalizeString(body.thumbnail_top) ?? thumbnail,
    thumbnail_detail: normalizeString(body.thumbnail_detail) ?? thumbnail,
    release_date: normalizeString(body.release_date),
    duration: normalizeString(body.duration),
    genre: parseStringArray(body.genre),
    cast: parseStringArray(body.cast),
    director: null,
    release_year: null,
    price: parseNonNegativeInteger(body.price, 'price', 0),
    rental_price: parseNonNegativeInteger(body.rental_price, 'rental_price', 0),
    is_published: typeof body.is_published === 'boolean' ? body.is_published : false,
    publish_at: normalizeString(body.publish_at),
    unpublish_at: normalizeString(body.unpublish_at),
    view_window_days: parseNonNegativeInteger(body.view_window_days, 'view_window_days', 2),
  };
}

function normalizeGender(value: unknown) {
  const normalized = normalizeString(value);
  if (!normalized || normalized === 'prefer_not_to_say') return null;
  if (normalized === 'male' || normalized === 'female' || normalized === 'other') {
    return normalized;
  }
  throw new ValidationError('gender must be male, female, other, or prefer_not_to_say');
}

function parseUserStatus(value: unknown): 'active' | 'suspended' {
  if (value === 'active' || value === 'suspended') return value;
  throw new ValidationError('status must be active or suspended');
}

function parseAdminRole(value: unknown): AdminAccountRole {
  if (value === 'admin' || value === 'super_admin') return value;
  throw new ValidationError('role must be admin or super_admin');
}

function buildAdminUserUpdateInput(body: Record<string, unknown> | null): AdminUserUpdateInput {
  if (!body) throw new ValidationError('Invalid JSON body');

  const age = parseInteger(body.age, 'age', null);
  if (age != null && (age < 0 || age > 120)) {
    throw new ValidationError('age must be 0..120');
  }

  const email = requireString(body.email, 'email');
  if (!email.includes('@')) {
    throw new ValidationError('email must be valid');
  }

  return {
    email,
    gender: normalizeGender(body.gender),
    age,
    prefecture: normalizeString(body.prefecture),
    status: parseUserStatus(body.status),
  };
}

function buildAdminAccountCreateInput(body: Record<string, unknown> | null): AdminAccountCreateInput {
  if (!body) throw new ValidationError('Invalid JSON body');

  const email = requireString(body.email, 'email');
  if (!email.includes('@')) {
    throw new ValidationError('email must be valid');
  }

  const password = requireString(body.password, 'password');
  if (password.length < 8) {
    throw new ValidationError('password must be at least 8 characters');
  }

  return {
    email,
    name: normalizeString(body.name),
    password,
    role: parseAdminRole(body.role),
  };
}

function buildAdminAccountUpdateInput(body: Record<string, unknown> | null): AdminAccountUpdateInput {
  if (!body) throw new ValidationError('Invalid JSON body');

  const email = requireString(body.email, 'email');
  if (!email.includes('@')) {
    throw new ValidationError('email must be valid');
  }

  return {
    email,
    name: normalizeString(body.name),
    role: parseAdminRole(body.role),
  };
}

function buildSearchClause(isAdmin: boolean) {
  const fields = isAdmin
    ? [
        "COALESCE(title, '')",
        "COALESCE(description, '')",
        "COALESCE(array_to_string(genre, ' '), '')",
        "COALESCE(array_to_string(\"cast\", ' '), '')",
      ]
    : [
        "COALESCE(title, '')",
        "COALESCE(description, '')",
      ];

  return fields.map((field) => `${field} ILIKE $1`).join(' OR ');
}

function parseLimit(value?: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.min(parsed, 500);
}

function parseOffset(value?: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed;
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath || '';
    const watchlistMatch = path.match(/^\/v1\/watchlist(?:\/([^/]+))?$/);
    if (watchlistMatch) {
      const userId = getUserIdFromAuth(event.headers);
      if (!userId) {
        return response(401, { code: 'UNAUTHORIZED', message: 'Authorization required' });
      }

      const movieId = watchlistMatch[1] ? decodeURIComponent(watchlistMatch[1]) : null;
      if (method === 'GET' && !movieId) {
        const sql = `SELECT ${MOVIE_COLUMNS.join(', ')}
          FROM watchlist w
          JOIN public_movies m ON m.id = w.movie_id
          WHERE w.user_id = $1
          ORDER BY w.created_at DESC`;
        const { rows } = await getPool().query(sql, [userId]);
        return response(200, { items: rows });
      }

      if (method === 'POST' && !movieId) {
        const body = parseJsonBody(event);
        const inputMovieId = typeof body?.movieId === 'string' ? body.movieId : null;
        if (!inputMovieId) {
          return response(400, { code: 'VALIDATION_ERROR', message: 'movieId is required' });
        }

        const exists = await getPool().query('SELECT 1 FROM public_movies WHERE id = $1', [inputMovieId]);
        if (!exists.rowCount) {
          return response(404, { code: 'NOT_FOUND', message: 'Movie not found' });
        }

        const insert = await getPool().query(
          'INSERT INTO watchlist (user_id, movie_id) VALUES ($1, $2) ON CONFLICT (user_id, movie_id) DO NOTHING',
          [userId, inputMovieId],
        );
        return response(200, { ok: true, added: (insert.rowCount ?? 0) > 0 });
      }

      if (method === 'DELETE' && movieId) {
        const res = await getPool().query(
          'DELETE FROM watchlist WHERE user_id = $1 AND movie_id = $2',
          [userId, movieId],
        );
        return response(200, { ok: true, deleted: (res.rowCount ?? 0) > 0 });
      }

      return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
    }

    const profileMatch = path.match(/^\/v1\/profile$/);
    if (profileMatch) {
      const userId = getUserIdFromAuth(event.headers);
      if (!userId) {
        return response(401, { code: 'UNAUTHORIZED', message: 'Authorization required' });
      }

      if (method === 'GET') {
        const sql = `
          SELECT
            u.id,
            u.email,
            p.gender,
            p.age,
            p.prefecture,
            p.created_at,
            p.updated_at
          FROM users u
          LEFT JOIN profiles p ON p.id = u.id
          WHERE u.id = $1
        `;
        const { rows } = await getPool().query(sql, [userId]);
        if (!rows.length) {
          return response(404, { code: 'NOT_FOUND', message: 'User not found' });
        }
        return response(200, rows[0]);
      }

      if (method === 'PUT') {
        const body = parseJsonBody(event);
        if (!body) {
          return response(400, { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' });
        }

        const email = typeof body.email === 'string' ? body.email.trim() : null;
        const gender = typeof body.gender === 'string' ? body.gender : null;
        const age = typeof body.age === 'number' ? body.age : null;
        const prefecture = typeof body.prefecture === 'string' ? body.prefecture : null;

        if (age != null && (age < 0 || age > 120)) {
          return response(400, { code: 'VALIDATION_ERROR', message: 'age must be 0..120' });
        }

        const client = await getPool().connect();
        try {
          await client.query('BEGIN');

          let currentEmail = email;
          if (email) {
            await client.query(
              'UPDATE users SET email = $2, updated_at = now() WHERE id = $1',
              [userId, email],
            );
          } else {
            const existing = await client.query('SELECT email FROM users WHERE id = $1', [userId]);
            currentEmail = existing.rows[0]?.email ?? null;
          }

          await client.query(
            `INSERT INTO profiles (id, email, gender, age, prefecture, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, now(), now())
             ON CONFLICT (id) DO UPDATE SET
               email = EXCLUDED.email,
               gender = EXCLUDED.gender,
               age = EXCLUDED.age,
               prefecture = EXCLUDED.prefecture,
               updated_at = now()`,
            [userId, currentEmail, gender, age, prefecture],
          );

          await client.query('COMMIT');
        } catch (error: unknown) {
          await client.query('ROLLBACK');
          if (getErrorCode(error) === '23505') {
            return response(409, { code: 'EMAIL_CONFLICT', message: 'Email already in use' });
          }
          return response(500, { code: 'DB_ERROR', message: getErrorMessage(error, 'DB error') });
        } finally {
          client.release();
        }

        const sql = `
          SELECT
            u.id,
            u.email,
            p.gender,
            p.age,
            p.prefecture,
            p.created_at,
            p.updated_at
          FROM users u
          LEFT JOIN profiles p ON p.id = u.id
          WHERE u.id = $1
        `;
        const { rows } = await getPool().query(sql, [userId]);
        return response(200, rows[0]);
      }

      return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
    }

    const purchasesMatch = path.match(/^\/v1\/purchases(?:\/([^/]+))?$/);
    if (purchasesMatch) {
      if (method !== 'GET') {
        return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
      }

      const userId = getUserIdFromAuth(event.headers);
      if (!userId) {
        return response(401, { code: 'UNAUTHORIZED', message: 'Authorization required' });
      }

      const purchaseId = purchasesMatch[1] ? decodeURIComponent(purchasesMatch[1]) : null;
      if (purchaseId) {
        const sql = `
          SELECT
            p.id,
            p.movie_id,
            p.payment_method,
            p.amount_total,
            p.amount_cash,
            p.amount_points,
            p.status,
            p.expires_at,
            p.created_at,
            m.title
          FROM purchases p
          JOIN movies m ON m.id = p.movie_id
          WHERE p.user_id = $1 AND p.id = $2
        `;
        const { rows } = await getPool().query(sql, [userId, purchaseId]);
        if (!rows.length) {
          return response(404, { code: 'NOT_FOUND', message: 'Purchase not found' });
        }
        return response(200, rows[0]);
      }

      const status = event.queryStringParameters?.status?.trim();
      const limit = parseLimit(event.queryStringParameters?.limit);
      const offset = parseOffset(event.queryStringParameters?.offset);
      const params: Array<string | number> = [userId];
      const whereParts: string[] = ['p.user_id = $1'];

      if (status) {
        params.push(status);
        whereParts.push(`p.status = $${params.length}`);
      }

      let sql = `
        SELECT
          p.id,
          p.movie_id,
          p.payment_method,
          p.amount_total,
          p.amount_cash,
          p.amount_points,
          p.status,
          p.expires_at,
          p.created_at,
          m.title
        FROM purchases p
        JOIN movies m ON m.id = p.movie_id
        WHERE ${whereParts.join(' AND ')}
        ORDER BY p.created_at DESC
      `;

      if (limit != null) {
        params.push(limit);
        sql += ` LIMIT $${params.length}`;
      }
      if (offset != null) {
        params.push(offset);
        sql += ` OFFSET $${params.length}`;
      }

      const { rows } = await getPool().query(sql, params);
      return response(200, { items: rows });
    }

    const subscriptionsMatch = path.match(/^\/v1\/subscriptions\/current$/);
    if (subscriptionsMatch) {
      if (method !== 'GET') {
        return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
      }

      const userId = getUserIdFromAuth(event.headers);
      if (!userId) {
        return response(401, { code: 'UNAUTHORIZED', message: 'Authorization required' });
      }

      const sql = `
        SELECT
          s.id,
          s.user_id,
          s.plan_id,
          s.status,
          s.started_at,
          s.renews_at,
          s.canceled_at,
          s.ended_at,
          s.created_at,
          s.updated_at,
          p.name AS plan_name,
          p.price_monthly,
          p.is_active AS plan_is_active
        FROM subscriptions s
        JOIN subscription_plans p ON p.id = s.plan_id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
        LIMIT 1
      `;
      const { rows } = await getPool().query(sql, [userId]);
      if (!rows.length) {
        return response(200, { active: false, subscription: null });
      }
      const subscription = rows[0];
      const active = subscription.status === 'active';
      return response(200, { active, subscription });
    }

    const walletsCurrentMatch = path.match(/^\/v1\/wallets\/current$/);
    if (walletsCurrentMatch) {
      if (method !== 'GET') {
        return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
      }

      const userId = getUserIdFromAuth(event.headers);
      if (!userId) {
        return response(401, { code: 'UNAUTHORIZED', message: 'Authorization required' });
      }

      const walletRes = await getPool().query(
        'SELECT total_points, paid_points, bonus_points, updated_at FROM wallets WHERE user_id = $1',
        [userId],
      );
      const wallet = walletRes.rows[0] || { total_points: 0, paid_points: 0, bonus_points: 0, updated_at: null };

      const lotsRes = await getPool().query(
        `SELECT remaining_points, expires_at, is_paid, source_type
         FROM point_lots
         WHERE user_id = $1 AND remaining_points > 0 AND expires_at IS NOT NULL
         ORDER BY expires_at ASC`,
        [userId],
      );

      const expirations: WalletExpirationItem[] = lotsRes.rows.map((row) => {
        const item = row as WalletExpirationRow;
        return {
          date: item.expires_at,
          amount: item.remaining_points,
          type: item.is_paid ? 'paid' : 'bonus',
          note: item.source_type || null,
        };
      });

      let expiringSoonDate: string | null = null;
      let expiringSoonAmount = 0;
      if (expirations.length) {
        expiringSoonDate = expirations[0].date;
        expiringSoonAmount = expirations
          .filter((item) => item.date === expiringSoonDate)
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);
      }

      return response(200, {
        total_points: Number(wallet.total_points || 0),
        paid_points: Number(wallet.paid_points || 0),
        bonus_points: Number(wallet.bonus_points || 0),
        expiring_soon_amount: expiringSoonAmount,
        expiring_soon_date: expiringSoonDate,
        expirations,
      });
    }

    const walletTransactionsMatch = path.match(/^\/v1\/wallets\/transactions$/);
    if (walletTransactionsMatch) {
      if (method !== 'GET') {
        return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
      }

      const userId = getUserIdFromAuth(event.headers);
      if (!userId) {
        return response(401, { code: 'UNAUTHORIZED', message: 'Authorization required' });
      }

      const limit = parseLimit(event.queryStringParameters?.limit);
      const offset = parseOffset(event.queryStringParameters?.offset);
      const params: Array<string | number> = [userId];

      let sql = `
        SELECT
          wt.id,
          wt.created_at,
          wt.type,
          wt.amount,
          wt.balance_after,
          m.title AS movie_title
        FROM wallet_transactions wt
        LEFT JOIN purchases p ON p.id = wt.related_purchase_id
        LEFT JOIN movies m ON m.id = p.movie_id
        WHERE wt.user_id = $1
        ORDER BY wt.created_at DESC
      `;

      if (limit != null) {
        params.push(limit);
        sql += ` LIMIT $${params.length}`;
      }
      if (offset != null) {
        params.push(offset);
        sql += ` OFFSET $${params.length}`;
      }

      const { rows } = await getPool().query(sql, params);
      const items = rows.map((row) => {
        const transaction = row as WalletTransactionRow;
        const amount = Number(transaction.amount || 0);
        let diff = amount;
        if (transaction.type === 'USE_PURCHASE' || transaction.type === 'EXPIRE') diff = -Math.abs(amount);
        if (transaction.type === 'CHARGE' || transaction.type === 'BONUS') diff = Math.abs(amount);

        let title = 'ポイント取引';
        if (transaction.type === 'CHARGE') title = 'ポイントチャージ';
        if (transaction.type === 'BONUS') title = 'ボーナスポイント';
        if (transaction.type === 'USE_PURCHASE') title = transaction.movie_title ? `購入: ${transaction.movie_title}` : 'ポイント利用';
        if (transaction.type === 'EXPIRE') title = 'ポイント失効';
        if (transaction.type === 'ADJUST') title = 'ポイント調整';

        return {
          id: transaction.id,
          date: transaction.created_at,
          title,
          diff,
          type: diff >= 0 ? 'credit' : 'debit',
          balance_after: Number(transaction.balance_after || 0),
        };
      });

      return response(200, { items });
    }

    const adminUsersMatch = path.match(/^\/v1\/admin\/users(?:\/([^/]+))?$/);
    if (adminUsersMatch) {
      const adminUserId = adminUsersMatch[1] ? decodeURIComponent(adminUsersMatch[1]) : null;
      const baseSelect = `
        SELECT
          u.id,
          u.email,
          p.gender,
          p.age,
          p.prefecture,
          EXISTS (
            SELECT 1
            FROM subscriptions s
            WHERE s.user_id = u.id
              AND s.status = 'active'
          ) AS is_member,
          CASE WHEN u.is_active THEN 'active' ELSE 'suspended' END AS status,
          u.created_at AS registered_at,
          GREATEST(u.updated_at, COALESCE(p.updated_at, u.updated_at)) AS updated_at
        FROM users u
        LEFT JOIN profiles p ON p.id = u.id
      `;

      if (method === 'GET') {
        if (adminUserId) {
          const { rows } = await getPool().query(`${baseSelect} WHERE u.id = $1`, [adminUserId]);
          if (!rows.length) {
            return response(404, { code: 'NOT_FOUND', message: 'User not found' });
          }
          return response(200, rows[0]);
        }

        const q = event.queryStringParameters?.q?.trim();
        const status = event.queryStringParameters?.status?.trim();
        const limit = parseLimit(event.queryStringParameters?.limit);
        const offset = parseOffset(event.queryStringParameters?.offset);
        const params: Array<string | number | boolean> = [];
        const whereParts: string[] = [];

        if (q) {
          params.push(`%${q}%`);
          whereParts.push(`(
            COALESCE(u.email, '') ILIKE $${params.length}
            OR COALESCE(p.prefecture, '') ILIKE $${params.length}
            OR COALESCE(p.gender, '') ILIKE $${params.length}
          )`);
        }

        if (status === 'active' || status === 'suspended') {
          params.push(status === 'active');
          whereParts.push(`u.is_active = $${params.length}`);
        }

        let sql = baseSelect;
        if (whereParts.length) {
          sql += ` WHERE ${whereParts.join(' AND ')}`;
        }
        sql += ' ORDER BY u.created_at DESC';

        if (limit != null) {
          params.push(limit);
          sql += ` LIMIT $${params.length}`;
        }
        if (offset != null) {
          params.push(offset);
          sql += ` OFFSET $${params.length}`;
        }

        const { rows } = await getPool().query(sql, params);
        return response(200, { items: rows });
      }

      if (adminUserId && method === 'PUT') {
        try {
          const input = buildAdminUserUpdateInput(parseJsonBody(event));
          const client = await getPool().connect();
          try {
            await client.query('BEGIN');

            const updatedUser = await client.query(
              `UPDATE users
               SET email = $2,
                   is_active = $3,
                   updated_at = now()
               WHERE id = $1
               RETURNING id`,
              [adminUserId, input.email, input.status === 'active'],
            );

            if (!updatedUser.rowCount) {
              await client.query('ROLLBACK');
              return response(404, { code: 'NOT_FOUND', message: 'User not found' });
            }

            await client.query(
              `INSERT INTO profiles (id, email, gender, age, prefecture, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, now(), now())
               ON CONFLICT (id) DO UPDATE SET
                 email = EXCLUDED.email,
                 gender = EXCLUDED.gender,
                 age = EXCLUDED.age,
                 prefecture = EXCLUDED.prefecture,
                 updated_at = now()`,
              [adminUserId, input.email, input.gender, input.age, input.prefecture],
            );

            await client.query('COMMIT');
          } catch (error: unknown) {
            await client.query('ROLLBACK');
            if (getErrorCode(error) === '23505') {
              return response(409, { code: 'EMAIL_CONFLICT', message: 'Email already in use' });
            }
            throw error;
          } finally {
            client.release();
          }

          const { rows } = await getPool().query(`${baseSelect} WHERE u.id = $1`, [adminUserId]);
          return response(200, rows[0]);
        } catch (error) {
          if (error instanceof ValidationError) {
            return response(400, { code: error.code, message: error.message });
          }
          throw error;
        }
      }

      if (adminUserId && method === 'DELETE') {
        const deleted = await getPool().query('DELETE FROM users WHERE id = $1', [adminUserId]);
        if (!deleted.rowCount) {
          return response(404, { code: 'NOT_FOUND', message: 'User not found' });
        }
        return response(200, { ok: true, deleted: true });
      }

      return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
    }

    const adminAccountsMatch = path.match(/^\/v1\/admin\/admin-users(?:\/([^/]+))?$/);
    if (adminAccountsMatch) {
      const adminAccountId = adminAccountsMatch[1] ? decodeURIComponent(adminAccountsMatch[1]) : null;

      try {
        if (method === 'GET' && !adminAccountId) {
          const q = event.queryStringParameters?.q?.trim();
          const role = event.queryStringParameters?.role?.trim();
          const limit = parseLimit(event.queryStringParameters?.limit);
          const offset = parseOffset(event.queryStringParameters?.offset);

          const items = await listAdminAccounts({
            q: q || undefined,
            role: role === 'admin' || role === 'super_admin' ? role : null,
          });

          const from = offset ?? 0;
          const to = limit != null ? from + limit : undefined;
          return response(200, { items: items.slice(from, to) });
        }

        if (method === 'POST' && !adminAccountId) {
          const created = await createAdminAccount(buildAdminAccountCreateInput(parseJsonBody(event)));
          if (!created) {
            return response(500, { code: 'COGNITO_ERROR', message: 'Failed to create admin account' });
          }
          return response(201, created);
        }

        if (adminAccountId && method === 'PUT') {
          const updated = await updateAdminAccount(
            adminAccountId,
            buildAdminAccountUpdateInput(parseJsonBody(event)),
          );
          if (!updated) {
            return response(404, { code: 'NOT_FOUND', message: 'Admin account not found' });
          }
          return response(200, updated);
        }

        if (adminAccountId && method === 'DELETE') {
          await deleteAdminAccount(adminAccountId);
          return response(200, { ok: true, deleted: true });
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          return response(400, { code: error.code, message: error.message });
        }
        if (typeof error === 'object' && error !== null && 'name' in error) {
          const errorName = String(error.name);
          if (errorName === 'UsernameExistsException' || errorName === 'AliasExistsException') {
            return response(409, { code: 'EMAIL_CONFLICT', message: 'Email already in use' });
          }
          if (errorName === 'UserNotFoundException') {
            return response(404, { code: 'NOT_FOUND', message: 'Admin account not found' });
          }
          if (errorName === 'InvalidPasswordException') {
            return response(400, { code: 'VALIDATION_ERROR', message: 'Password does not meet policy' });
          }
        }
        throw error;
      }

      return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
    }

    const isAdmin = path.startsWith('/v1/admin/movies');
    const table = isAdmin ? 'movies' : 'public_movies';
    const detailMatch = path.match(/^\/v1\/(?:admin\/)?movies\/([^/]+)$/);
    const movieId = detailMatch ? decodeURIComponent(detailMatch[1]) : null;

    if (isAdmin) {
      if (method === 'POST' && path === '/v1/admin/movies') {
        try {
          const input = buildAdminMovieWriteInput(parseJsonBody(event));
          const sql = `
            INSERT INTO movies (
              title,
              description,
              thumbnail,
              thumbnail_top,
              thumbnail_detail,
              release_date,
              duration,
              genre,
              "cast",
              director,
              release_year,
              price,
              rental_price,
              is_published,
              publish_at,
              unpublish_at,
              view_window_days
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            )
            RETURNING ${MOVIE_COLUMNS.join(', ')}
          `;
          const { rows } = await getPool().query(sql, [
            input.title,
            input.description,
            input.thumbnail,
            input.thumbnail_top,
            input.thumbnail_detail,
            input.release_date,
            input.duration,
            input.genre,
            input.cast,
            input.director,
            input.release_year,
            input.price,
            input.rental_price,
            input.is_published,
            input.publish_at,
            input.unpublish_at,
            input.view_window_days,
          ]);
          return response(201, rows[0]);
        } catch (error) {
          if (error instanceof ValidationError) {
            return response(400, { code: error.code, message: error.message });
          }
          throw error;
        }
      }

      if (movieId && method === 'PUT') {
        try {
          const input = buildAdminMovieWriteInput(parseJsonBody(event));
          const sql = `
            UPDATE movies
            SET
              title = $2,
              description = $3,
              thumbnail = $4,
              thumbnail_top = $5,
              thumbnail_detail = $6,
              release_date = $7,
              duration = $8,
              genre = $9,
              "cast" = $10,
              director = $11,
              release_year = $12,
              price = $13,
              rental_price = $14,
              is_published = $15,
              publish_at = $16,
              unpublish_at = $17,
              view_window_days = $18,
              updated_at = now()
            WHERE id = $1
            RETURNING ${MOVIE_COLUMNS.join(', ')}
          `;
          const { rows } = await getPool().query(sql, [
            movieId,
            input.title,
            input.description,
            input.thumbnail,
            input.thumbnail_top,
            input.thumbnail_detail,
            input.release_date,
            input.duration,
            input.genre,
            input.cast,
            input.director,
            input.release_year,
            input.price,
            input.rental_price,
            input.is_published,
            input.publish_at,
            input.unpublish_at,
            input.view_window_days,
          ]);
          if (!rows.length) {
            return response(404, { code: 'NOT_FOUND', message: 'Movie not found' });
          }
          return response(200, rows[0]);
        } catch (error) {
          if (error instanceof ValidationError) {
            return response(400, { code: error.code, message: error.message });
          }
          throw error;
        }
      }

      if (movieId && method === 'DELETE') {
        const deleted = await getPool().query('DELETE FROM movies WHERE id = $1', [movieId]);
        if (!deleted.rowCount) {
          return response(404, { code: 'NOT_FOUND', message: 'Movie not found' });
        }
        return response(200, { ok: true, deleted: true });
      }
    }

    if (method !== 'GET') {
      return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
    }

    if (movieId) {
      const sql = `SELECT ${MOVIE_COLUMNS.join(', ')} FROM ${table} WHERE id = $1`;
      const { rows } = await getPool().query(sql, [movieId]);
      if (!rows.length) {
        return response(404, { code: 'NOT_FOUND', message: 'Movie not found' });
      }
      return response(200, rows[0]);
    }

    const q = event.queryStringParameters?.q?.trim();
    const limit = parseLimit(event.queryStringParameters?.limit);
    const offset = parseOffset(event.queryStringParameters?.offset);

    const params: Array<string | number> = [];
    const whereClause = q ? `WHERE ${buildSearchClause(isAdmin)}` : '';
    if (q) params.push(`%${q}%`);

    let sql = `SELECT ${MOVIE_COLUMNS.join(', ')} FROM ${table} ${whereClause}`;
    if (isAdmin) {
      sql += ' ORDER BY created_at DESC';
    } else {
      sql += ' ORDER BY publish_at DESC NULLS LAST, created_at DESC';
    }

    if (limit != null) {
      params.push(limit);
      sql += ` LIMIT $${params.length}`;
    }
    if (offset != null) {
      params.push(offset);
      sql += ` OFFSET $${params.length}`;
    }

    const { rows } = await getPool().query(sql, params);
    return response(200, { items: rows });
  } catch (error: unknown) {
    return response(500, { code: 'DB_ERROR', message: getErrorMessage(error, 'DB error') });
  }
};
