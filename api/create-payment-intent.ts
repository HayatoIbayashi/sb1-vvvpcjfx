export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const payload = await req.json();
    const url = process.env.LAMBDA_PAYMENTS_URL;
    if (!url) return new Response('Missing LAMBDA_PAYMENTS_URL', { status: 500 });

    const forward = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!forward.ok) {
      const msg = await forward.text().catch(() => 'Upstream error');
      return new Response(msg, { status: 502 });
    }

    const data = await forward.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Payment intent proxy error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
