import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getPool } from './db.js';

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

function buildSearchClause(isAdmin: boolean) {
  const fields = isAdmin
    ? [
        "COALESCE(title, '')",
        "COALESCE(description, '')",
        "COALESCE(director, '')",
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

      const expirations = lotsRes.rows.map((row: any) => ({
        date: row.expires_at,
        amount: row.remaining_points,
        type: row.is_paid ? 'paid' : 'bonus',
        note: row.source_type || null,
      }));

      let expiringSoonDate: string | null = null;
      let expiringSoonAmount = 0;
      if (expirations.length) {
        expiringSoonDate = expirations[0].date;
        expiringSoonAmount = expirations
          .filter((item: any) => item.date === expiringSoonDate)
          .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0);
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
      const items = rows.map((row: any) => {
        const amount = Number(row.amount || 0);
        let diff = amount;
        if (row.type === 'USE_PURCHASE' || row.type === 'EXPIRE') diff = -Math.abs(amount);
        if (row.type === 'CHARGE' || row.type === 'BONUS') diff = Math.abs(amount);

        let title = 'ポイント取引';
        if (row.type === 'CHARGE') title = 'ポイントチャージ';
        if (row.type === 'BONUS') title = 'ボーナスポイント';
        if (row.type === 'USE_PURCHASE') title = row.movie_title ? `購入: ${row.movie_title}` : 'ポイント利用';
        if (row.type === 'EXPIRE') title = 'ポイント失効';
        if (row.type === 'ADJUST') title = 'ポイント調整';

        return {
          id: row.id,
          date: row.created_at,
          title,
          diff,
          type: diff >= 0 ? 'credit' : 'debit',
          balance_after: Number(row.balance_after || 0),
        };
      });

      return response(200, { items });
    }

    if (method !== 'GET') {
      return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
    }

    const isAdmin = path.startsWith('/v1/admin/movies');
    const table = isAdmin ? 'movies' : 'public_movies';
    const detailMatch = path.match(/^\/v1\/(?:admin\/)?movies\/([^/]+)$/);
    const movieId = detailMatch ? decodeURIComponent(detailMatch[1]) : null;

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
  } catch (e: any) {
    return response(500, { code: 'DB_ERROR', message: e?.message || 'DB error' });
  }
};
