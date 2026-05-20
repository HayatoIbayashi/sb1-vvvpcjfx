import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

type MovieAccessMode = 'public' | 'purchase_only' | 'subscription_only' | 'subscription_or_purchase';

type StripeProduct = {
  id: string;
};

type StripePrice = {
  id: string;
  product: string | { id?: string | null };
  unit_amount?: number | null;
  currency?: string | null;
  active?: boolean | null;
  created?: number | null;
};

type CreatedStripeCatalogItem = {
  productId: string;
  priceId: string;
  price: StripePrice;
};

type LambdaProxyResponse = {
  statusCode?: number;
  headers?: Record<string, boolean | number | string>;
  body?: string;
  isBase64Encoded?: boolean;
  cookies?: string[];
};

class StripeCatalogError extends Error {
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

function parseNonNegativeInteger(value: unknown) {
  if (value == null || value === '') return 0;
  const normalized = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (!Number.isFinite(normalized) || !Number.isInteger(normalized) || Number(normalized) < 0) {
    return 0;
  }
  return Number(normalized);
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

function shouldCreateOneTimeStripePrice(body: Record<string, unknown>) {
  const accessMode = parseAccessMode(body.access_mode);
  const buyPrice = parseNonNegativeInteger(body.buy_price);
  return (
    (accessMode === 'purchase_only' || accessMode === 'subscription_or_purchase') &&
    buyPrice >= 1
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

async function stripeRequest<T>(path: string, body: URLSearchParams): Promise<T> {
  const secretKey = normalizeString(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) {
    throw new StripeCatalogError(500, 'STRIPE_SECRET_KEY_MISSING', 'STRIPE_SECRET_KEY is not configured');
  }

  const res = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await res.json().catch(() => null) as unknown;
  if (!res.ok) {
    const message = getStripeErrorMessage(data) ?? `Stripe request failed: ${res.status}`;
    throw new StripeCatalogError(502, 'STRIPE_CATALOG_CREATE_FAILED', message);
  }

  return data as T;
}

async function createStripeOneTimePriceForMovie(body: Record<string, unknown>): Promise<CreatedStripeCatalogItem> {
  const title = normalizeString(body.title);
  if (!title) {
    throw new StripeCatalogError(400, 'VALIDATION_ERROR', 'title is required');
  }

  const description = normalizeString(body.description);
  const accessMode = parseAccessMode(body.access_mode);
  const buyPrice = parseNonNegativeInteger(body.buy_price);
  const currency = normalizeString(body.currency) ?? 'JPY';

  const productBody = new URLSearchParams({
    name: title,
    'metadata[source]': 'admin_movie_create',
    'metadata[access_mode]': accessMode,
  });
  if (description) {
    productBody.set('description', description);
  }

  const product = await stripeRequest<StripeProduct>('/v1/products', productBody);
  if (!normalizeString(product.id)) {
    throw new StripeCatalogError(502, 'STRIPE_CATALOG_CREATE_FAILED', 'Stripe product id is missing');
  }

  const price = await stripeRequest<StripePrice>('/v1/prices', new URLSearchParams({
    product: product.id,
    currency: currency.toLowerCase(),
    unit_amount: String(buyPrice),
    'metadata[source]': 'admin_movie_create',
    'metadata[access_mode]': accessMode,
  }));
  if (!normalizeString(price.id)) {
    throw new StripeCatalogError(502, 'STRIPE_CATALOG_CREATE_FAILED', 'Stripe price id is missing');
  }

  return { productId: product.id, priceId: price.id, price };
}

async function deactivateStripeCatalogItem(item: CreatedStripeCatalogItem) {
  const tasks = [
    stripeRequest(`/v1/prices/${encodeURIComponent(item.priceId)}`, new URLSearchParams({ active: 'false' })),
    stripeRequest(`/v1/products/${encodeURIComponent(item.productId)}`, new URLSearchParams({ active: 'false' })),
  ];
  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('Failed to deactivate Stripe catalog item after movie create failure', result.reason);
    }
  }
}

function decodePayload(payload?: Uint8Array) {
  if (!payload || !payload.length) return null;
  try {
    return JSON.parse(Buffer.from(payload).toString('utf-8')) as LambdaProxyResponse;
  } catch {
    return null;
  }
}

async function invokeMoviesWrite(event: APIGatewayProxyEventV2, body: Record<string, unknown>) {
  const functionName = normalizeString(process.env.MOVIES_WRITE_LAMBDA_NAME);
  if (!functionName) {
    throw new Error('Missing env: MOVIES_WRITE_LAMBDA_NAME');
  }

  const payload = {
    ...event,
    rawPath: '/v1/admin/movies',
    body: JSON.stringify(body),
    isBase64Encoded: false,
    requestContext: {
      ...event.requestContext,
      http: {
        ...event.requestContext.http,
        method: 'POST',
        path: '/v1/admin/movies',
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

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method === 'OPTIONS') {
    return response(204, undefined);
  }
  if (event.requestContext.http.method !== 'POST') {
    return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  }

  const body = parseJsonBody(event);
  if (!body) {
    return response(400, { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' });
  }

  let createdStripeItem: CreatedStripeCatalogItem | null = null;
  try {
    const nextBody = { ...body };
    if (shouldCreateOneTimeStripePrice(nextBody)) {
      createdStripeItem = await createStripeOneTimePriceForMovie(nextBody);
      nextBody.stripe_price_id_one_time = createdStripeItem.priceId;
      nextBody.stripe_price_history = {
        operation: 'new_price',
        price: {
          ...createdStripeItem.price,
          stripe_product_id: createdStripeItem.productId,
        },
      };
    }

    const result = await invokeMoviesWrite(event, nextBody);
    const statusCode = typeof result.statusCode === 'number' ? result.statusCode : 200;
    if (createdStripeItem && statusCode >= 400) {
      await deactivateStripeCatalogItem(createdStripeItem);
    }
    return result as APIGatewayProxyResultV2;
  } catch (error) {
    if (createdStripeItem) {
      await deactivateStripeCatalogItem(createdStripeItem);
    }
    if (error instanceof StripeCatalogError) {
      return response(error.statusCode, { code: error.code, message: error.message });
    }
    const message = error instanceof Error && error.message ? error.message : 'Movie create failed';
    return response(500, { code: 'MOVIE_CREATE_FAILED', message });
  }
};
