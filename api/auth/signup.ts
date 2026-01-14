export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = process.env.LAMBDA_AUTH_SIGNUP_URL;
    if (!url) return new Response('Missing LAMBDA_AUTH_SIGNUP_URL', { status: 500 });

    const body = await req.text();
    const forward = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const text = await forward.text();
    return new Response(text, { status: forward.status, headers: { 'Content-Type': forward.headers.get('Content-Type') || 'application/json' } });
  } catch (error) {
    console.error('Auth signup proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

