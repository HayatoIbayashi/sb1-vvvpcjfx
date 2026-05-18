export default async function handler(req: Request) {
  if (req.method !== 'GET' && req.method !== 'PATCH') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base = process.env.LAMBDA_WATCH_HISTORY_URL;
    if (!base) return new Response('Missing LAMBDA_WATCH_HISTORY_URL', { status: 500 });

    const incomingUrl = new URL(req.url);
    const movieId = incomingUrl.pathname.split('/').pop();
    if (!movieId) return new Response('movie id required', { status: 400 });

    const forwardUrl = `${base.replace(/\/$/, '')}/${encodeURIComponent(movieId)}`;
    const auth = req.headers.get('authorization');
    const forward = await fetch(forwardUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: req.method === 'PATCH' ? await req.text() : undefined,
    });

    const text = await forward.text();
    return new Response(text, {
      status: forward.status,
      headers: { 'Content-Type': forward.headers.get('Content-Type') || 'application/json' },
    });
  } catch (error) {
    console.error('Watch history item proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
