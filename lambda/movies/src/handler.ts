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
    if (method !== 'GET') {
      return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
    }

    const path = event.rawPath || '';
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
