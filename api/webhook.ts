export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = process.env.LAMBDA_WEBHOOK_URL;
    if (!url) return new Response('Missing LAMBDA_WEBHOOK_URL', { status: 500 });

    // 署名ヘッダなどをそのまま転送
    const headers = new Headers(req.headers);
    const body = await req.text();
    const forward = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    const text = await forward.text();
    return new Response(text, { status: forward.status, headers: forward.headers });
  } catch (error) {
    console.error('Webhook proxy error:', error);
    return new Response('Webhook proxy failed', { status: 500 });
  }
}
