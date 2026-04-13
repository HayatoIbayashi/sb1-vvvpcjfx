export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = process.env.LAMBDA_SUBSCRIPTION_PLANS_URL;
    if (!url) return new Response('Missing LAMBDA_SUBSCRIPTION_PLANS_URL', { status: 500 });

    const forward = await fetch(url, { method: 'GET' });
    const text = await forward.text();

    return new Response(text, {
      status: forward.status,
      headers: { 'Content-Type': forward.headers.get('Content-Type') || 'application/json' },
    });
  } catch (error) {
    console.error('Subscription plans proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
