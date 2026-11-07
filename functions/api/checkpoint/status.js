// Cloudflare Pages Function: /api/checkpoint/status
// Verifies whether a session ticket has received a verified LootLabs postback

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const sessionId = url.searchParams.get('session') || url.searchParams.get('puid') || url.searchParams.get('uid') || '';

  const FIREBASE_PROJECT_ID = 'ghostsensi-1d96b';
  const FIREBASE_API_KEY = 'AIzaSyBCMSULoP-CnTWurWMTUKDfRMEEu2T7PVE';

  let verified = false;

  if (sessionId) {
    try {
      const docUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/lootlabs_sessions/${encodeURIComponent(sessionId)}?key=${FIREBASE_API_KEY}`;
      const res = await fetch(docUrl);
      if (res.ok) {
        const data = await res.json();
        if (data.fields && data.fields.verified && data.fields.verified.booleanValue === true) {
          verified = true;
        }
      }
    } catch (e) {
      console.warn('[GhostSensix] Status check error:', e);
    }
  }

  return new Response(JSON.stringify({
    sessionId,
    puid: sessionId,
    verified
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }
  });
}

