export default async function handler(req: Request) {
  try {
    const base = process.env.LAMBDA_REVIEWS_URL;
    if (!base) return new Response('Missing LAMBDA_REVIEWS_URL', { status: 500 });

    if (req.method === 'GET') {
      const url = new URL(req.url);
      const movieId = url.searchParams.get('movieId');
      if (!movieId) return new Response('movieId required', { status: 400 });
      const forward = await fetch(`${base}?movieId=${encodeURIComponent(movieId)}`, { method: 'GET' });
      const text = await forward.text();
      return new Response(text, { status: forward.status, headers: { 'Content-Type': forward.headers.get('Content-Type') || 'application/json' } });
    }

    if (req.method === 'POST') {
      const body = await req.text();
      const forward = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
      const text = await forward.text();
      return new Response(text, { status: forward.status, headers: { 'Content-Type': forward.headers.get('Content-Type') || 'application/json' } });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (e) {
    console.error('reviews proxy error', e);
    return new Response('Internal server error', { status: 500 });
  }
}

