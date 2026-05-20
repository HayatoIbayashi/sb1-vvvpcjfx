import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

type JwtPayload = {
  sub?: string;
  email?: string;
  name?: string;
  'cognito:username'?: string;
};

type UserContext = {
  userId: string;
  email: string | null;
  name: string | null;
};

type StripeCustomer = {
  id: string;
  email: string | null;
  name: string | null;
  metadata?: Record<string, string>;
};

type StripeListResponse<T> = {
  data: T[];
};

type StripePortalSession = {
  url: string;
};

type StripeCheckoutSession = {
  id: string;
  url: string | null;
};

type StripeSubscription = {
  id: string;
  status: string;
};

type SubscriptionPlan = {
  id: string;
  name: string;
  price_monthly: number;
  stripe_price_id: string | null;
  is_active: boolean;
};

type MovieBillingInfo = {
  id: string;
  access_mode: 'public' | 'purchase_only' | 'subscription_only' | 'subscription_or_purchase';
  stripe_price_id_one_time: string | null;
};

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

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const payload = parts[1];
  const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8')) as JwtPayload;
  } catch {
    return null;
  }
}

function getUserContext(headers: Record<string, string | undefined> | undefined): UserContext | null {
  const header = getAuthHeader(headers);
  if (!header) return null;
  const token = header.toLowerCase().startsWith('bearer ') ? header.slice(7) : header;
  const payload = decodeJwtPayload(token);
  if (!payload?.sub) return null;

  const email =
    typeof payload.email === 'string' && payload.email
      ? payload.email
      : typeof payload['cognito:username'] === 'string' && payload['cognito:username'].includes('@')
        ? payload['cognito:username']
        : null;

  const name =
    typeof payload.name === 'string' && payload.name
      ? payload.name
      : typeof payload['cognito:username'] === 'string'
        ? payload['cognito:username']
        : null;

  return {
    userId: payload.sub,
    email,
    name,
  };
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

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function buildAppUrl(path: string) {
  const appBaseUrl = normalizeString(process.env.APP_BASE_URL);
  if (!appBaseUrl) return null;
  return `${appBaseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

function buildSuccessUrl(body: Record<string, unknown> | null) {
  const requested = normalizeString(body?.successUrl);
  if (requested) return requested;
  return buildAppUrl('/account?subscription=success');
}

function buildCancelUrl(body: Record<string, unknown> | null) {
  const requested = normalizeString(body?.cancelUrl);
  if (requested) return requested;
  return buildAppUrl('/subscription');
}

function buildApiBaseUrl(event: APIGatewayProxyEventV2) {
  const domainName = normalizeString(event.requestContext.domainName);
  if (!domainName) return null;

  const stage = normalizeString(event.requestContext.stage);
  const baseUrl = `https://${domainName}`;
  if (!stage || stage === '$default') {
    return baseUrl;
  }

  return `${baseUrl}/${stage}`;
}

async function stripeRequest<T>(path: string, init?: { method?: string; body?: URLSearchParams }) {
  const secretKey = normalizeString(process.env.STRIPE_SECRET_KEY);
  if (!secretKey) {
    throw new Error('Missing STRIPE_SECRET_KEY');
  }

  const res = await fetch(`https://api.stripe.com${path}`, {
    method: init?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(init?.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body: init?.body?.toString(),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(data?.error?.message || `Stripe request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

async function findOrCreateCustomer(email: string, userId: string, name: string | null) {
  const query = new URLSearchParams({ email, limit: '10' });
  const listed = await stripeRequest<StripeListResponse<StripeCustomer>>(`/v1/customers?${query.toString()}`);
  const matched = listed.data.find((customer) => customer.metadata?.user_id === userId) ?? listed.data[0];
  if (matched) return matched;

  const body = new URLSearchParams({
    email,
    ...(name ? { name } : {}),
    'metadata[user_id]': userId,
  });
  return stripeRequest<StripeCustomer>('/v1/customers', {
    method: 'POST',
    body,
  });
}

async function fetchSubscriptionPlans(event: APIGatewayProxyEventV2) {
  const url = normalizeString(process.env.SUBSCRIPTION_PLANS_URL) ?? (() => {
    const apiBaseUrl = buildApiBaseUrl(event);
    return apiBaseUrl ? `${apiBaseUrl}/v1/subscription-plans` : null;
  })();
  if (!url) {
    throw new Error('Missing subscription plans url');
  }

  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) {
    throw new Error(`Failed to fetch subscription plans: ${res.status}`);
  }

  const data = (await res.json()) as { items?: SubscriptionPlan[] };
  return data.items ?? [];
}

async function fetchMovieBillingInfo(event: APIGatewayProxyEventV2, movieId: string) {
  const apiBaseUrl = buildApiBaseUrl(event);
  if (!apiBaseUrl) {
    throw new Error('Missing movies api url');
  }

  const res = await fetch(`${apiBaseUrl}/v1/movies/${encodeURIComponent(movieId)}`, { method: 'GET' });
  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch movie: ${res.status}`);
  }

  return (await res.json()) as MovieBillingInfo;
}

async function createCheckoutSession(
  event: APIGatewayProxyEventV2,
  user: UserContext,
): Promise<APIGatewayProxyResultV2> {
  if (!user.email) {
    return response(400, { code: 'EMAIL_REQUIRED', message: 'Email claim is required' });
  }

  const body = parseJsonBody(event);
  const planId = normalizeString(body?.plan_id);
  if (!planId) {
    return response(400, { code: 'PLAN_ID_REQUIRED', message: 'plan_id is required' });
  }

  const successUrl = buildSuccessUrl(body);
  const cancelUrl = buildCancelUrl(body);
  if (!successUrl || !cancelUrl) {
    return response(400, { code: 'RETURN_URL_REQUIRED', message: 'successUrl and cancelUrl are required' });
  }

  const plans = await fetchSubscriptionPlans(event);
  const plan = plans.find((item) => item.id === planId);
  if (!plan) {
    return response(404, { code: 'PLAN_NOT_FOUND', message: 'Subscription plan not found' });
  }
  if (!plan.is_active) {
    return response(409, { code: 'PLAN_INACTIVE', message: 'Subscription plan is inactive' });
  }
  if (!plan.stripe_price_id) {
    return response(409, { code: 'PLAN_BILLING_NOT_READY', message: 'stripe_price_id is not configured for this plan' });
  }

  const customer = await findOrCreateCustomer(user.email, user.userId, user.name);
  const form = new URLSearchParams({
    mode: 'subscription',
    customer: customer.id,
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: user.userId,
    'line_items[0][price]': plan.stripe_price_id,
    'line_items[0][quantity]': '1',
    'metadata[user_id]': user.userId,
    'metadata[plan_id]': plan.id,
    'subscription_data[metadata][user_id]': user.userId,
    'subscription_data[metadata][plan_id]': plan.id,
  });

  const session = await stripeRequest<StripeCheckoutSession>('/v1/checkout/sessions', {
    method: 'POST',
    body: form,
  });

  if (!session.url) {
    throw new Error('Stripe checkout session url is missing');
  }

  return response(200, { url: session.url, sessionId: session.id });
}

async function createPurchaseCheckoutSession(
  event: APIGatewayProxyEventV2,
  user: UserContext,
): Promise<APIGatewayProxyResultV2> {
  if (!user.email) {
    return response(400, { code: 'EMAIL_REQUIRED', message: 'Email claim is required' });
  }

  const body = parseJsonBody(event);
  const movieId = normalizeString(body?.movieId);
  if (!movieId) {
    return response(400, { code: 'MOVIE_ID_REQUIRED', message: 'movieId is required' });
  }

  const successUrl = normalizeString(body?.successUrl);
  const cancelUrl = normalizeString(body?.cancelUrl);
  if (!successUrl || !cancelUrl) {
    return response(400, { code: 'RETURN_URL_REQUIRED', message: 'successUrl and cancelUrl are required' });
  }

  const movie = await fetchMovieBillingInfo(event, movieId);
  if (!movie) {
    return response(404, { code: 'MOVIE_NOT_FOUND', message: 'Movie not found' });
  }
  if (movie.access_mode !== 'purchase_only' && movie.access_mode !== 'subscription_or_purchase') {
    return response(409, { code: 'MOVIE_NOT_PURCHASABLE', message: 'Movie is not available for one-time purchase' });
  }
  if (!movie.stripe_price_id_one_time) {
    return response(409, { code: 'MOVIE_BILLING_NOT_READY', message: 'stripe_price_id_one_time is not configured' });
  }

  const customer = await findOrCreateCustomer(user.email, user.userId, user.name);
  const form = new URLSearchParams({
    mode: 'payment',
    customer: customer.id,
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: user.userId,
    'line_items[0][price]': movie.stripe_price_id_one_time,
    'line_items[0][quantity]': '1',
    'metadata[user_id]': user.userId,
    'metadata[movie_id]': movie.id,
    'payment_intent_data[metadata][user_id]': user.userId,
    'payment_intent_data[metadata][movie_id]': movie.id,
    'payment_intent_data[receipt_email]': user.email,
  });

  const session = await stripeRequest<StripeCheckoutSession>('/v1/checkout/sessions', {
    method: 'POST',
    body: form,
  });

  if (!session.url) {
    throw new Error('Stripe checkout session url is missing');
  }

  return response(200, { url: session.url, sessionId: session.id });
}

async function cancelCurrentSubscription(user: UserContext): Promise<APIGatewayProxyResultV2> {
  if (!user.email) {
    return response(400, { code: 'EMAIL_REQUIRED', message: 'Email claim is required' });
  }

  const customer = await findOrCreateCustomer(user.email, user.userId, user.name);
  const query = new URLSearchParams({
    customer: customer.id,
    status: 'active',
    limit: '10',
  });
  const listed = await stripeRequest<StripeListResponse<StripeSubscription>>(
    `/v1/subscriptions?${query.toString()}`,
  );
  const current = listed.data[0];
  if (!current) {
    return response(200, { active: false, subscription: null });
  }

  await stripeRequest<StripeSubscription>(`/v1/subscriptions/${encodeURIComponent(current.id)}`, {
    method: 'DELETE',
  });

  return response(200, { active: false, subscription: null });
}

async function createBillingPortalSession(
  event: APIGatewayProxyEventV2,
  user: UserContext,
): Promise<APIGatewayProxyResultV2> {
  if (!user.email) {
    return response(400, { code: 'EMAIL_REQUIRED', message: 'Email claim is required' });
  }

  const body = parseJsonBody(event);
  const requestedReturnUrl = normalizeString(body?.returnUrl);
  const returnUrl = requestedReturnUrl ?? buildAppUrl('/account');
  if (!returnUrl) {
    return response(400, { code: 'RETURN_URL_REQUIRED', message: 'returnUrl is required' });
  }

  const customer = await findOrCreateCustomer(user.email, user.userId, user.name);
  const form = new URLSearchParams({
    customer: customer.id,
    return_url: returnUrl,
  });
  const configurationId = normalizeString(process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID);
  if (configurationId) {
    form.set('configuration', configurationId);
  }

  const session = await stripeRequest<StripePortalSession>('/v1/billing_portal/sessions', {
    method: 'POST',
    body: form,
  });

  return response(200, { url: session.url });
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath || '';

    if (
      (method !== 'POST' || path !== '/v1/billing-portal/session') &&
      (method !== 'POST' || path !== '/v1/subscriptions/checkout-session') &&
      (method !== 'POST' || path !== '/v1/purchases/checkout-session') &&
      (method !== 'DELETE' || path !== '/v1/subscriptions/current')
    ) {
      return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
    }

    const user = getUserContext(event.headers);
    if (!user?.userId) {
      return response(401, { code: 'UNAUTHORIZED', message: 'Authorization required' });
    }

    if (method === 'POST' && path === '/v1/billing-portal/session') {
      return await createBillingPortalSession(event, user);
    }

    if (method === 'POST' && path === '/v1/subscriptions/checkout-session') {
      return await createCheckoutSession(event, user);
    }

    if (method === 'POST' && path === '/v1/purchases/checkout-session') {
      return await createPurchaseCheckoutSession(event, user);
    }

    if (method === 'DELETE' && path === '/v1/subscriptions/current') {
      return await cancelCurrentSubscription(user);
    }

    return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Billing flow error:', error);
    return response(500, { code: 'BILLING_FLOW_ERROR', message });
  }
};
