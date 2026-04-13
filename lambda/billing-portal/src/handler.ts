import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

type JwtPayload = {
  sub?: string;
  email?: string;
  name?: string;
  'cognito:username'?: string;
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

function getUserContext(headers: Record<string, string | undefined> | undefined) {
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

function buildReturnUrl(body: Record<string, unknown> | null) {
  const requested = normalizeString(body?.returnUrl);
  if (requested) return requested;

  const appBaseUrl = normalizeString(process.env.APP_BASE_URL);
  if (!appBaseUrl) return null;
  return `${appBaseUrl.replace(/\/$/, '')}/account`;
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

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  try {
    const method = event.requestContext.http.method;
    const path = event.rawPath || '';
    if (method !== 'POST' || path !== '/v1/billing-portal/session') {
      return response(405, { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' });
    }

    const user = getUserContext(event.headers);
    if (!user?.userId) {
      return response(401, { code: 'UNAUTHORIZED', message: 'Authorization required' });
    }
    if (!user.email) {
      return response(400, { code: 'EMAIL_REQUIRED', message: 'Email claim is required' });
    }

    const body = parseJsonBody(event);
    const returnUrl = buildReturnUrl(body);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Billing portal error:', error);
    return response(500, { code: 'BILLING_PORTAL_ERROR', message });
  }
};
