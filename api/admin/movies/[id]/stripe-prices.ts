export default async function handler(req: Request) {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base = process.env.LAMBDA_ADMIN_MOVIES_URL;
    if (!base) return new Response('Missing LAMBDA_ADMIN_MOVIES_URL', { status: 500 });

    const incomingUrl = new URL(req.url);
    const parts = incomingUrl.pathname.split('/').filter(Boolean);
    const movieIndex = parts.findIndex((part) => part === 'movies');
    const id = movieIndex >= 0 ? parts[movieIndex + 1] : null;
    if (!id) return new Response('movie id required', { status: 400 });

    const forwardUrl = `${base.replace(/\/$/, '')}/${encodeURIComponent(id)}/stripe-prices`;
    const auth = req.headers.get('authorization');
    const forward = await fetch(forwardUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
    });

    const text = await forward.text();
    return new Response(text, {
      status: forward.status,
      headers: { 'Content-Type': forward.headers.get('Content-Type') || 'application/json' },
    });
  } catch (error) {
    console.error('Admin movie stripe prices proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
