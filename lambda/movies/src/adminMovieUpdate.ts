import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';

type MovieAccessMode = 'public' | 'purchase_only' | 'subscription_only' | 'subscription_or_purchase';

type StripeProductRef = string | { id?: string | null };

type StripeProduct = {
  id: string;
};

type StripePrice = {
  id: string;
  product: StripeProductRef;
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

type MovieRow = {
  title?: string | null;
  description?: string | null;
  access_mode?: MovieAccessMode | null;
  buy_price?: number | null;
  currency?: string | null;
  stripe_price_id_one_time?: string | null;
};

type MovieStripePriceRow = {
  stripe_price_id: string;
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

function parseNonNegativeInteger(value: unknown) {
  if (value == null || value === '') return 0;
  const normalized = typeof value === 'string' ? Number.parseInt(value, 10) : value;
  if (!Number.isFinite(normalized) || !Number.isInteger(normalized) || Number(normalized) < 0) {
    return 0;
  }
  return Number(normalized);
}

function isOneTimePurchasable(accessMode: MovieAccessMode, buyPrice: number) {
  return (
    (accessMode === 'purchase_only' || accessMode === 'subscription_or_purchase') &&
    buyPrice >= 1
  );
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

async function invokeMoviesPath(
  event: APIGatewayProxyEventV2,
  method: 'GET' | 'PUT',
  path: string,
  body?: unknown,
  queryStringParameters?: Record<string, string>,
) {
  const functionName = normalizeString(process.env.MOVIES_WRITE_LAMBDA_NAME);
  if (!functionName) {
    throw new Error('Missing env: MOVIES_WRITE_LAMBDA_NAME');
  }

  const payload = {
    ...event,
    rawPath: path,
    body: body == null ? undefined : JSON.stringify(body),
    isBase64Encoded: false,
    queryStringParameters,
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

async function invokeMoviesLambda(event: APIGatewayProxyEventV2, method: 'GET' | 'PUT', movieId: string, body?: unknown) {
  return invokeMoviesPath(event, method, `/v1/admin/movies/${encodeURIComponent(movieId)}`, body);
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

async function createStripeOneTimePriceForMovie(body: Record<string, unknown>): Promise<CreatedStripeCatalogItem> {
  const title = normalizeString(body.title);
  if (!title) {
    throw new StripeProductSyncError(400, 'VALIDATION_ERROR', 'title is required');
  }

  const description = normalizeString(body.description);
  const accessMode = parseAccessMode(body.access_mode);
  const buyPrice = parseNonNegativeInteger(body.buy_price);
  const currency = normalizeString(body.currency) ?? 'JPY';

  const productBody = new URLSearchParams({
    name: title,
    'metadata[source]': 'admin_movie_update',
    'metadata[access_mode]': accessMode,
  });
  if (description) {
    productBody.set('description', description);
  }

  const product = await stripeRequest<StripeProduct>('/v1/products', {
    method: 'POST',
    body: productBody,
  });
  if (!normalizeString(product.id)) {
    throw new StripeProductSyncError(502, 'STRIPE_CATALOG_UPDATE_FAILED', 'Stripe product id is missing');
  }

  const price = await stripeRequest<StripePrice>('/v1/prices', {
    method: 'POST',
    body: new URLSearchParams({
      product: product.id,
      currency: currency.toLowerCase(),
      unit_amount: String(buyPrice),
      'metadata[source]': 'admin_movie_update',
      'metadata[access_mode]': accessMode,
    }),
  });
  if (!normalizeString(price.id)) {
    throw new StripeProductSyncError(502, 'STRIPE_CATALOG_UPDATE_FAILED', 'Stripe price id is missing');
  }

  return { productId: product.id, priceId: price.id, price };
}

async function createStripePriceForProduct(
  productId: string,
  body: Record<string, unknown>,
): Promise<StripePrice> {
  const accessMode = parseAccessMode(body.access_mode);
  const buyPrice = parseNonNegativeInteger(body.buy_price);
  const currency = normalizeString(body.currency) ?? 'JPY';
  const price = await stripeRequest<StripePrice>('/v1/prices', {
    method: 'POST',
    body: new URLSearchParams({
      product: productId,
      currency: currency.toLowerCase(),
      unit_amount: String(buyPrice),
      'metadata[source]': 'admin_movie_update',
      'metadata[access_mode]': accessMode,
    }),
  });
  if (!normalizeString(price.id)) {
    throw new StripeProductSyncError(502, 'STRIPE_CATALOG_UPDATE_FAILED', 'Stripe price id is missing');
  }
  return price;
}

async function deactivateStripePrice(priceId: string) {
  await stripeRequest(`/v1/prices/${encodeURIComponent(priceId)}`, {
    method: 'POST',
    body: new URLSearchParams({ active: 'false' }),
  });
}

async function deactivateStripePriceQuietly(priceId: string, context: string) {
  try {
    await deactivateStripePrice(priceId);
  } catch (error) {
    console.warn(`Failed to deactivate Stripe price in ${context}`, error);
  }
}

async function activateStripePrice(priceId: string) {
  return stripeRequest<StripePrice>(`/v1/prices/${encodeURIComponent(priceId)}`, {
    method: 'POST',
    body: new URLSearchParams({ active: 'true' }),
  });
}

async function deactivateStripeCatalogItem(item: CreatedStripeCatalogItem) {
  const tasks = [
    stripeRequest(`/v1/prices/${encodeURIComponent(item.priceId)}`, {
      method: 'POST',
      body: new URLSearchParams({ active: 'false' }),
    }),
    stripeRequest(`/v1/products/${encodeURIComponent(item.productId)}`, {
      method: 'POST',
      body: new URLSearchParams({ active: 'false' }),
    }),
  ];
  const results = await Promise.allSettled(tasks);
  for (const result of results) {
    if (result.status === 'rejected') {
      console.warn('Failed to deactivate Stripe catalog item after movie update failure', result.reason);
    }
  }
}

function titleOrDescriptionChanged(current: MovieRow, body: Record<string, unknown>) {
  return (
    normalizeString(body.title) !== normalizeString(current.title) ||
    normalizeString(body.description) !== normalizeString(current.description)
  );
}

function priceOrCurrencyChanged(current: MovieRow, body: Record<string, unknown>) {
  return (
    parseNonNegativeInteger(body.buy_price) !== parseNonNegativeInteger(current.buy_price) ||
    (normalizeString(body.currency) ?? 'JPY').toLowerCase() !== (normalizeString(current.currency) ?? 'JPY').toLowerCase()
  );
}

async function findRestoreCandidate(
  event: APIGatewayProxyEventV2,
  movieId: string,
  unitAmount: number,
  currency: string,
  currentStripePriceId: string | null,
) {
  const query: Record<string, string> = {
    unit_amount: String(unitAmount),
    currency: currency.toLowerCase(),
  };
  if (currentStripePriceId) {
    query.current_stripe_price_id = currentStripePriceId;
  }

  const result = await invokeMoviesPath(
    event,
    'GET',
    `/v1/admin/movies/${encodeURIComponent(movieId)}/stripe-prices/restore-candidate`,
    undefined,
    query,
  );
  const statusCode = typeof result.statusCode === 'number' ? result.statusCode : 200;
  if (statusCode >= 400) {
    throw new Error(result.body || 'movies-list Lambda returned an invalid restore candidate response');
  }
  return decodeResponseBody<{ item: MovieStripePriceRow | null }>(result)?.item ?? null;
}

type StripeUpdatePlan = {
  body: Record<string, unknown>;
  oldPriceIdToDeactivate: string | null;
  createdPriceIdToDeactivateOnFailure: string | null;
  createdCatalogItem: CreatedStripeCatalogItem | null;
};

async function buildStripeUpdatePlan(
  event: APIGatewayProxyEventV2,
  movieId: string,
  currentMovie: MovieRow,
  body: Record<string, unknown>,
): Promise<StripeUpdatePlan> {
  const nextBody = { ...body };
  const currentPriceId = normalizeString(currentMovie.stripe_price_id_one_time);
  const nextAccessMode = parseAccessMode(nextBody.access_mode);
  const nextBuyPrice = parseNonNegativeInteger(nextBody.buy_price);
  const nextPurchasable = isOneTimePurchasable(nextAccessMode, nextBuyPrice);

  if (!nextPurchasable) {
    nextBody.stripe_price_id_one_time = null;
    nextBody.stripe_price_history = {
      operation: 'archive_current',
      old_stripe_price_id: currentPriceId,
      archived_reason: currentPriceId ? 'movie_became_free' : 'purchase_disabled',
    };
    return {
      body: nextBody,
      oldPriceIdToDeactivate: currentPriceId,
      createdPriceIdToDeactivateOnFailure: null,
      createdCatalogItem: null,
    };
  }

  if (!currentPriceId) {
    const createdCatalogItem = await createStripeOneTimePriceForMovie(nextBody);
    nextBody.stripe_price_id_one_time = createdCatalogItem.priceId;
    nextBody.stripe_price_history = {
      operation: 'new_price',
      price: {
        ...createdCatalogItem.price,
        stripe_product_id: createdCatalogItem.productId,
      },
    };
    return {
      body: nextBody,
      oldPriceIdToDeactivate: null,
      createdPriceIdToDeactivateOnFailure: null,
      createdCatalogItem,
    };
  }

  nextBody.stripe_price_id_one_time = currentPriceId;
  const productNeedsSync = titleOrDescriptionChanged(currentMovie, nextBody);
  const priceNeedsSync = priceOrCurrencyChanged(currentMovie, nextBody);

  if (!productNeedsSync && !priceNeedsSync) {
    return {
      body: nextBody,
      oldPriceIdToDeactivate: null,
      createdPriceIdToDeactivateOnFailure: null,
      createdCatalogItem: null,
    };
  }

  const currentPrice = await stripeRequest<StripePrice>(`/v1/prices/${encodeURIComponent(currentPriceId)}`);
  const productId = resolveStripeProductId(currentPrice);
  if (!productId) {
    throw new StripeProductSyncError(502, 'STRIPE_PRODUCT_UPDATE_FAILED', 'Stripe product id is missing');
  }

  if (productNeedsSync) {
    const title = normalizeString(nextBody.title);
    if (title) {
      await stripeRequest(`/v1/products/${encodeURIComponent(productId)}`, {
        method: 'POST',
        body: new URLSearchParams({
          name: title,
          description: normalizeString(nextBody.description) ?? '',
        }),
      });
    }
  }

  if (priceNeedsSync) {
    const nextBuyPrice = parseNonNegativeInteger(nextBody.buy_price);
    const nextCurrency = normalizeString(nextBody.currency) ?? 'JPY';
    const restoreCandidate = await findRestoreCandidate(
      event,
      movieId,
      nextBuyPrice,
      nextCurrency,
      currentPriceId,
    );

    if (restoreCandidate?.stripe_price_id) {
      const restoredPrice = await activateStripePrice(restoreCandidate.stripe_price_id);
      nextBody.stripe_price_id_one_time = restoreCandidate.stripe_price_id;
      nextBody.stripe_price_history = {
        operation: 'restore_price',
        stripe_price_id: restoreCandidate.stripe_price_id,
        old_stripe_price_id: currentPriceId,
        raw_stripe_price: restoredPrice,
        archived_reason: 'price_changed',
      };
      return {
        body: nextBody,
        oldPriceIdToDeactivate: currentPriceId,
        createdPriceIdToDeactivateOnFailure: restoreCandidate.stripe_price_id,
        createdCatalogItem: null,
      };
    }

    const nextPrice = await createStripePriceForProduct(productId, nextBody);
    const nextPriceId = nextPrice.id;
    nextBody.stripe_price_id_one_time = nextPriceId;
    nextBody.stripe_price_history = {
      operation: 'new_price',
      price: {
        ...nextPrice,
        stripe_product_id: productId,
      },
      archived_reason: 'price_changed',
    };
    return {
      body: nextBody,
      oldPriceIdToDeactivate: currentPriceId,
      createdPriceIdToDeactivateOnFailure: nextPriceId,
      createdCatalogItem: null,
    };
  }

  return {
    body: nextBody,
    oldPriceIdToDeactivate: null,
    createdPriceIdToDeactivateOnFailure: null,
    createdCatalogItem: null,
  };
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

  let stripeUpdatePlan: StripeUpdatePlan | null = null;
  let dbUpdateSucceeded = false;

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

    stripeUpdatePlan = await buildStripeUpdatePlan(event, movieId, currentMovie, body);
    const result = await invokeMoviesLambda(event, 'PUT', movieId, stripeUpdatePlan.body);
    const statusCode = typeof result.statusCode === 'number' ? result.statusCode : 200;
    if (statusCode >= 400) {
      if (stripeUpdatePlan.createdCatalogItem) {
        await deactivateStripeCatalogItem(stripeUpdatePlan.createdCatalogItem);
      }
      if (stripeUpdatePlan.createdPriceIdToDeactivateOnFailure) {
        await deactivateStripePriceQuietly(stripeUpdatePlan.createdPriceIdToDeactivateOnFailure, 'movie update failure');
      }
      return result as APIGatewayProxyResultV2;
    }
    dbUpdateSucceeded = true;

    if (stripeUpdatePlan.oldPriceIdToDeactivate) {
      await deactivateStripePrice(stripeUpdatePlan.oldPriceIdToDeactivate);
    }

    return result as APIGatewayProxyResultV2;
  } catch (error) {
    if (!dbUpdateSucceeded && stripeUpdatePlan?.createdCatalogItem) {
      await deactivateStripeCatalogItem(stripeUpdatePlan.createdCatalogItem);
    }
    if (!dbUpdateSucceeded && stripeUpdatePlan?.createdPriceIdToDeactivateOnFailure) {
      await deactivateStripePriceQuietly(stripeUpdatePlan.createdPriceIdToDeactivateOnFailure, 'movie update exception');
    }
    if (error instanceof StripeProductSyncError) {
      return response(error.statusCode, { code: error.code, message: error.message });
    }
    const message = error instanceof Error && error.message ? error.message : 'Movie update failed';
    return response(500, { code: 'MOVIE_UPDATE_FAILED', message });
  }
};
