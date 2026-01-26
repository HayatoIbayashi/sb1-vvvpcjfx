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
