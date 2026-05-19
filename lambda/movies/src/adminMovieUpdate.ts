import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

type MovieAccessMode = 'public' | 'purchase_only' | 'subscription_only' | 'subscription_or_purchase';

type StripeProductRef = string | { id?: string | null };

type StripePrice = {
  id: string;
  product: StripeProductRef;
};

type LambdaProxyResponse = {
  statusCode?: number;
  headers?: Record<string, boolean | number | string>;
  body?: string;
  isBase64Encoded?: boolean;
  cookies?: string[];
};

type MovieRow = {
  title?: string | null;
  description?: string | null;
  access_mode?: MovieAccessMode | null;
  stripe_price_id_one_time?: string | null;
};

class StripeProductSyncError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const lambda = new LambdaClient({ region: process.env.AWS_REGION || 'ap-northeast-1' });

function response(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: JSON.stringify(body),
  };
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
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

function parseAccessMode(value: unknown): MovieAccessMode {
  const normalized = normalizeString(value) ?? 'public';
  if (
    normalized === 'public' ||
    normalized === 'purchase_only' ||
    normalized === 'subscription_only' ||
    normalized === 'subscription_or_purchase'
  ) {
    return normalized;
  }
  return 'public';
}

function getMovieId(event: APIGatewayProxyEventV2) {
  const path = event.rawPath || event.requestContext.http.path || '';
  const match = path.match(/^\/v1\/admin\/movies\/([^/]+)$/);
  return match ? decodeURIComponent(match[1]) : null;
}

function decodePayload(payload?: Uint8Array) {
  if (!payload || !payload.length) return null;
  try {
    return JSON.parse(Buffer.from(payload).toString('utf-8')) as LambdaProxyResponse;
  } catch {
    return null;
  }
}

function decodeResponseBody<T>(result: LambdaProxyResponse) {
  if (!result.body) return null;
  try {
    const raw = result.isBase64Encoded
      ? Buffer.from(result.body, 'base64').toString('utf-8')
      : result.body;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function invokeMoviesLambda(event: APIGatewayProxyEventV2, method: 'GET' | 'PUT', movieId: string, body?: unknown) {
  const functionName = normalizeString(process.env.MOVIES_WRITE_LAMBDA_NAME);
  if (!functionName) {
    throw new Error('Missing env: MOVIES_WRITE_LAMBDA_NAME');
  }

  const path = `/v1/admin/movies/${encodeURIComponent(movieId)}`;
  const payload = {
    ...event,
    rawPath: path,
    body: body == null ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
    requestContext: {
      ...event.requestContext,
      http: {
        ...event.requestContext.http,
        method,
        path,
      },
    },
  };

  const result = await lambda.send(new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    Payload: Buffer.from(JSON.stringify(payload)),
  }));

  const invokedResponse = decodePayload(result.Payload);
  if (result.FunctionError) {
    throw new Error(invokedResponse && typeof invokedResponse.body === 'string' ? invokedResponse.body : result.FunctionError);
  }
  if (!invokedResponse || typeof invokedResponse !== 'object' || !('statusCode' in invokedResponse)) {
    throw new Error('movies-list Lambda returned an invalid response');
  }

  return invokedResponse;
}

function shouldSyncStripeProduct(body: Record<string, unknown>) {
  const accessMode = parseAccessMode(body.access_mode);
  return (
    (accessMode === 'purchase_only' || accessMode === 'subscription_or_purchase') &&
    Boolean(normalizeString(body.stripe_price_id_one_time))
  );
}

function getStripeErrorMessage(data: unknown) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'error' in data &&
    typeof data.error === 'object' &&
    data.error !== null &&
    'message' in data.error &&
    typeof data.error.message === 'string'
  ) {
    return data.error.message;
  }
  return null;
}

async function stripeRequest<T>(
  path: string,
  init: { method?: 'GET' | 'POST'; body?: URLSearchParams } = {},
): Promise<T> {
  const secretKey = normalizeString(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) {
    throw new StripeProductSyncError(500, 'STRIPE_SECRET_KEY_MISSING', 'STRIPE_SECRET_KEY is not configured');
  }

  const res = await fetch(`https://api.stripe.com${path}`, {
    method: init.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(init.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: init.body,
  });

  const data = await res.json().catch(() => null) as unknown;
  if (!res.ok) {
    const message = getStripeErrorMessage(data) ?? `Stripe request failed: ${res.status}`;
    throw new StripeProductSyncError(502, 'STRIPE_PRODUCT_UPDATE_FAILED', message);
  }

  return data as T;
}

function resolveStripeProductId(price: StripePrice) {
  if (typeof price.product === 'string') return normalizeString(price.product);
  return normalizeString(price.product?.id);
}

async function syncStripeProductForMovie(body: Record<string, unknown>) {
  if (!shouldSyncStripeProduct(body)) return;

  const priceId = normalizeString(body.stripe_price_id_one_time);
  const title = normalizeString(body.title);
  if (!priceId || !title) return;

  const price = await stripeRequest<StripePrice>(`/v1/prices/${encodeURIComponent(priceId)}`);
  const productId = resolveStripeProductId(price);
  if (!productId) {
    throw new StripeProductSyncError(502, 'STRIPE_PRODUCT_UPDATE_FAILED', 'Stripe product id is missing');
  }

  await stripeRequest(`/v1/products/${encodeURIComponent(productId)}`, {
    method: 'POST',
    body: new URLSearchParams({
      name: title,
      description: normalizeString(body.description) ?? '',
    }),
  });
}

function titleOrDescriptionChanged(current: MovieRow, body: Record<string, unknown>) {
  return (
    normalizeString(body.title) !== normalizeString(current.title) ||
    normalizeString(body.description) !== normalizeString(current.description)
  );
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return response(204, undefined);
  }
  if (event.requestContext.http.method !== 'PUT') {
    return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  }

  const movieId = getMovieId(event);
  if (!movieId) {
    return response(400, { code: 'VALIDATION_ERROR', message: 'movie id is required' });
  }

  const body = parseJsonBody(event);
  if (!body) {
    return response(400, { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' });
  }

  try {
    const currentResult = await invokeMoviesLambda(event, 'GET', movieId);
    const currentStatusCode = typeof currentResult.statusCode === 'number' ? currentResult.statusCode : 200;
    if (currentStatusCode >= 400) {
      return currentResult as APIGatewayProxyResultV2;
    }

    const currentMovie = decodeResponseBody<MovieRow>(currentResult);
    if (!currentMovie) {
      throw new Error('movies-list Lambda returned an invalid movie response');
    }

    if (shouldSyncStripeProduct(body) && titleOrDescriptionChanged(currentMovie, body)) {
      await syncStripeProductForMovie(body);
    }

    return await invokeMoviesLambda(event, 'PUT', movieId, body) as APIGatewayProxyResultV2;
  } catch (error) {
    if (error instanceof StripeProductSyncError) {
      return response(error.statusCode, { code: error.code, message: error.message });
    }
    const message = error instanceof Error && error.message ? error.message : 'Movie update failed';
    return response(500, { code: 'MOVIE_UPDATE_FAILED', message });
  }
};
