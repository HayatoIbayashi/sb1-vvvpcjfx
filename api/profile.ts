export default async function handler(req: Request) {
  if (req.method !== 'GET' && req.method !== 'PUT') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const base = process.env.LAMBDA_PROFILE_URL;
    if (!base) return new Response('Missing LAMBDA_PROFILE_URL', { status: 500 });

    const auth = req.headers.get('authorization');
    const forward = await fetch(base, {
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
    console.error('Profile proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
