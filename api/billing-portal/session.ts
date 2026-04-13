export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base = process.env.LAMBDA_BILLING_PORTAL_URL;
    if (!base) return new Response('Missing LAMBDA_BILLING_PORTAL_URL', { status: 500 });

    const auth = req.headers.get('authorization');
    const body = await req.text();
    const forward = await fetch(base, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body,
    });

    const text = await forward.text();
    return new Response(text, {
      status: forward.status,
      headers: { 'Content-Type': forward.headers.get('Content-Type') || 'application/json' },
    });
  } catch (error) {
    console.error('Billing portal proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
