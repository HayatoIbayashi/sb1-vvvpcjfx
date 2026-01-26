export default async function handler(req: Request) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base = process.env.LAMBDA_WATCHLIST_URL;
    if (!base) return new Response('Missing LAMBDA_WATCHLIST_URL', { status: 500 });

    const incomingUrl = new URL(req.url);
    const forwardUrl = new URL(base);
    forwardUrl.search = incomingUrl.search;

    const auth = req.headers.get('authorization');
    const forward = await fetch(forwardUrl.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: req.method === 'POST' ? await req.text() : undefined,
    });

    const text = await forward.text();
    return new Response(text, {
      status: forward.status,
      headers: { 'Content-Type': forward.headers.get('Content-Type') || 'application/json' },
    });
  } catch (error) {
    console.error('Watchlist proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
