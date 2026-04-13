export default async function handler(req: Request) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = process.env.LAMBDA_ADMIN_MOVIES_URL;
    if (!url) return new Response('Missing LAMBDA_ADMIN_MOVIES_URL', { status: 500 });

    const incomingUrl = new URL(req.url);
    const forwardUrl = new URL(url);
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
    console.error('Admin movies proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
