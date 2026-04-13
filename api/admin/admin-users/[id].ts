export default async function handler(req: Request) {
  if (req.method !== 'PUT' && req.method !== 'DELETE') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base = process.env.LAMBDA_ADMIN_ACCOUNTS_URL;
    if (!base) return new Response('Missing LAMBDA_ADMIN_ACCOUNTS_URL', { status: 500 });

    const incomingUrl = new URL(req.url);
    const id = incomingUrl.pathname.split('/').pop();
    if (!id) return new Response('admin id required', { status: 400 });

    const forwardUrl = `${base.replace(/\/$/, '')}/${encodeURIComponent(id)}`;
    const auth = req.headers.get('authorization');
    const forward = await fetch(forwardUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: req.method === 'PUT' ? await req.text() : undefined,
    });

    const text = await forward.text();
    return new Response(text, {
      status: forward.status,
      headers: { 'Content-Type': forward.headers.get('Content-Type') || 'application/json' },
    });
  } catch (error) {
    console.error('Admin account detail proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
