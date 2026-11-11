// Cloudflare Pages Function: /api/linkvertise/verify
// Validates Linkvertise Anti-Bypass Hash with publisher API

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const hash = url.searchParams.get('hash') || '';
  const token = '51fdfa2e4968abbf74a67de73fe63cefbe2cd2e1802bd67af651d4fa88aec7e7';

  if (!hash) {
    return new Response(JSON.stringify({ success: false, error: 'Missing hash parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }

  try {
    const lvRes = await fetch(`https://publisher.linkvertise.com/api/v1/anti_bypassing?token=${token}&hash=${encodeURIComponent(hash)}`, {
      method: 'POST'
    });
    const resText = await lvRes.text();
    const isValid = resText.trim().toLowerCase() === 'true';

    return new Response(JSON.stringify({
      success: isValid,
      verified: isValid,
      message: isValid ? 'Linkvertise anti-bypass verified' : 'Hash expired or invalid'
    }), {
      status: isValid ? 200 : 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}

