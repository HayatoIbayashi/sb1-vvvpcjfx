import { createHmac, timingSafeEqual } from 'node:crypto';
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getPool } from './db.js';

type StripeWebhookEvent = {
  type?: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

type StripeCheckoutSession = {
  id?: string;
  mode?: string;
  customer?: string;
  subscription?: string;
  payment_intent?: string;
  amount_total?: number;
  currency?: string;
  metadata?: Record<string, string>;
};

type StripeSubscriptionItem = {
  price?: {
    id?: string;
  };
};

type StripeSubscription = {
  id?: string;
  customer?: string;
  status?: string;
  metadata?: Record<string, string>;
  items?: {
    data?: StripeSubscriptionItem[];
  };
  start_date?: number;
  current_period_end?: number;
  canceled_at?: number | null;
  cancel_at?: number | null;
  ended_at?: number | null;
};

type AppSubscriptionStatus = 'active' | 'canceled' | 'expired' | 'pending';

function response(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

function normalizeString(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getRawBody(event: APIGatewayProxyEventV2) {
  if (!event.body) return null;
  return event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;
}

function getStripeSignatureHeader(headers: Record<string, string | undefined> | undefined) {
  if (!headers) return null;
  return headers['stripe-signature'] || headers['Stripe-Signature'] || null;
}

function verifyStripeSignature(payload: string, signatureHeader: string, secret: string) {
  const parts = signatureHeader.split(',').map((item) => item.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2) ?? null;
  const signatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))
    .filter(Boolean);

  if (!timestamp || signatures.length === 0) return false;

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const expected = createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf-8');

  return signatures.some((candidate) => {
    const candidateBuffer = Buffer.from(candidate, 'utf-8');
    if (candidateBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(candidateBuffer, expectedBuffer);
  });
}

function parseJson<T>(raw: string) {
  return JSON.parse(raw) as T;
}

function unixToIso(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return new Date(value * 1000).toISOString();
}

function mapStripeStatus(status: string | null): AppSubscriptionStatus {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
      return 'canceled';
    case 'incomplete_expired':
      return 'expired';
    default:
      return 'pending';
  }
}

function getMetadataValue(metadata: Record<string, string> | undefined, key: string) {
  if (!metadata) return null;
  return normalizeString(metadata[key]);
}

async function upsertCheckoutSession(session: StripeCheckoutSession) {
  if (session.mode !== 'subscription') return;

  const stripeSubscriptionId = normalizeString(session.subscription);
  const stripeCustomerId = normalizeString(session.customer);
  const stripeCheckoutSessionId = normalizeString(session.id);
  const userId = getMetadataValue(session.metadata, 'user_id');
  const planId = getMetadataValue(session.metadata, 'plan_id');

  if (!stripeSubscriptionId || !stripeCheckoutSessionId || !userId || !planId) return;

  await getPool().query(
    `INSERT INTO subscriptions (
       user_id,
       plan_id,
       status,
       stripe_customer_id,
       stripe_subscription_id,
       stripe_checkout_session_id
     )
     VALUES ($1, $2, 'pending', $3, $4, $5)
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET
       stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
       stripe_checkout_session_id = EXCLUDED.stripe_checkout_session_id,
       updated_at = now()`,
    [userId, planId, stripeCustomerId, stripeSubscriptionId, stripeCheckoutSessionId],
  );
}

async function upsertPurchaseCheckoutSession(session: StripeCheckoutSession) {
  if (session.mode !== 'payment') return;

  const stripeCheckoutSessionId = normalizeString(session.id);
  const stripePaymentIntentId = normalizeString(session.payment_intent);
  const userId = getMetadataValue(session.metadata, 'user_id');
  const movieId = getMetadataValue(session.metadata, 'movie_id');
  const amountTotal = typeof session.amount_total === 'number' ? session.amount_total : null;
  const currency = normalizeString(session.currency)?.toUpperCase() ?? 'JPY';

  if (!stripeCheckoutSessionId || !userId || !movieId || amountTotal == null) {
    return;
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const existingRes = await client.query(
      `SELECT id
       FROM purchases
       WHERE stripe_checkout_session_id = $1
       LIMIT 1`,
      [stripeCheckoutSessionId],
    );
    const existingId = normalizeString(existingRes.rows[0]?.id);

    if (existingId) {
      await client.query(
        `UPDATE purchases
         SET user_id = $1,
             movie_id = $2,
             status = 'completed',
             amount_total = $3,
             currency = $4,
             payment_method = COALESCE(payment_method, 'stripe_checkout'),
             stripe_payment_intent_id = COALESCE($5, stripe_payment_intent_id),
             purchased_at = COALESCE(purchased_at, now()),
             updated_at = now()
         WHERE id = $6`,
        [userId, movieId, amountTotal, currency, stripePaymentIntentId, existingId],
      );
    } else {
      await client.query(
        `INSERT INTO purchases (
           user_id,
           movie_id,
           status,
           amount_total,
           currency,
           payment_method,
           stripe_checkout_session_id,
           stripe_payment_intent_id,
           purchased_at
         )
         VALUES ($1, $2, 'completed', $3, $4, 'stripe_checkout', $5, $6, now())`,
        [userId, movieId, amountTotal, currency, stripeCheckoutSessionId, stripePaymentIntentId],
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findPlanIdByPriceId(priceId: string | null) {
  if (!priceId) return null;
  const res = await getPool().query(
    'SELECT id FROM subscription_plans WHERE stripe_price_id = $1 LIMIT 1',
    [priceId],
  );
  return normalizeString(res.rows[0]?.id);
}

async function upsertSubscription(subscription: StripeSubscription) {
  const stripeSubscriptionId = normalizeString(subscription.id);
  if (!stripeSubscriptionId) return;

  const priceId = normalizeString(subscription.items?.data?.[0]?.price?.id);
  const existingRes = await getPool().query(
    `SELECT id, user_id, plan_id, stripe_checkout_session_id
     FROM subscriptions
     WHERE stripe_subscription_id = $1
     LIMIT 1`,
    [stripeSubscriptionId],
  );
  const existing = existingRes.rows[0] ?? null;

  const userId = getMetadataValue(subscription.metadata, 'user_id') ?? normalizeString(existing?.user_id);
  const planId =
    getMetadataValue(subscription.metadata, 'plan_id') ??
    (await findPlanIdByPriceId(priceId)) ??
    normalizeString(existing?.plan_id);

  if (!userId || !planId) {
    console.warn('Stripe subscription event skipped because user_id or plan_id is missing', {
      stripeSubscriptionId,
      priceId,
    });
    return;
  }

  const status = mapStripeStatus(normalizeString(subscription.status));
  const startedAt = unixToIso(subscription.start_date) ?? new Date().toISOString();
  const renewsAt = unixToIso(subscription.current_period_end);
  const canceledAt = unixToIso(subscription.cancel_at ?? subscription.canceled_at);
  const endedAt =
    status === 'active'
      ? null
      : unixToIso(subscription.ended_at ?? subscription.canceled_at ?? subscription.current_period_end) ??
        new Date().toISOString();
  const stripeCustomerId = normalizeString(subscription.customer);

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE subscriptions
       SET status = 'canceled',
           canceled_at = COALESCE(canceled_at, now()),
           ended_at = COALESCE(ended_at, now()),
           updated_at = now()
       WHERE user_id = $1
         AND stripe_subscription_id IS DISTINCT FROM $2
         AND status = 'active'`,
      [userId, stripeSubscriptionId],
    );

    await client.query(
      `INSERT INTO subscriptions (
         user_id,
         plan_id,
         status,
         started_at,
         renews_at,
         canceled_at,
         ended_at,
         stripe_customer_id,
         stripe_subscription_id,
         stripe_checkout_session_id
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         plan_id = EXCLUDED.plan_id,
         status = EXCLUDED.status,
         started_at = COALESCE(EXCLUDED.started_at, subscriptions.started_at),
         renews_at = EXCLUDED.renews_at,
         canceled_at = EXCLUDED.canceled_at,
         ended_at = EXCLUDED.ended_at,
         stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, subscriptions.stripe_customer_id),
         stripe_checkout_session_id = COALESCE(EXCLUDED.stripe_checkout_session_id, subscriptions.stripe_checkout_session_id),
         updated_at = now()`,
      [
        userId,
        planId,
        status,
        startedAt,
        renewsAt,
        canceledAt,
        endedAt,
        stripeCustomerId,
        stripeSubscriptionId,
        normalizeString(existing?.stripe_checkout_session_id),
      ],
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function handleStripeWebhook(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  const secret = normalizeString(process.env.STRIPE_WEBHOOK_SECRET);
  if (!secret) {
    return response(500, { code: 'STRIPE_WEBHOOK_SECRET_MISSING', message: 'Webhook secret is not configured' });
  }

  const rawBody = getRawBody(event);
  const signatureHeader = getStripeSignatureHeader(event.headers);
  if (!rawBody || !signatureHeader) {
    return response(400, { code: 'INVALID_WEBHOOK', message: 'Missing webhook body or signature' });
  }

  if (!verifyStripeSignature(rawBody, signatureHeader, secret)) {
    return response(400, { code: 'INVALID_SIGNATURE', message: 'Invalid Stripe signature' });
  }

  const webhookEvent = parseJson<StripeWebhookEvent>(rawBody);
  const eventType = normalizeString(webhookEvent.type);
  const object = webhookEvent.data?.object ?? {};

  if (eventType === 'checkout.session.completed') {
    await upsertCheckoutSession(object as StripeCheckoutSession);
    await upsertPurchaseCheckoutSession(object as StripeCheckoutSession);
    return response(200, { received: true });
  }

  if (
    eventType === 'customer.subscription.created' ||
    eventType === 'customer.subscription.updated' ||
    eventType === 'customer.subscription.deleted'
  ) {
    await upsertSubscription(object as StripeSubscription);
    return response(200, { received: true });
  }

  return response(200, { received: true, ignored: true });
}
