export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base = process.env.LAMBDA_PURCHASES_URL;
    if (!base) return new Response('Missing LAMBDA_PURCHASES_URL', { status: 500 });

    const incomingUrl = new URL(req.url);
    const forwardUrl = new URL(base);
    forwardUrl.search = incomingUrl.search;

    const auth = req.headers.get('authorization');
    const forward = await fetch(forwardUrl.toString(), {
      method: 'GET',
      headers: auth ? { Authorization: auth } : undefined,
    });

    const text = await forward.text();
    return new Response(text, {
      status: forward.status,
      headers: { 'Content-Type': forward.headers.get('Content-Type') || 'application/json' },
    });
  } catch (error) {
    console.error('Purchases proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
