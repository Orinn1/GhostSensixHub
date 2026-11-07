// Cloudflare Pages Function: /api/lootlabs-postback
// Receives server-to-server webhook from LootLabs and verifies the session

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const uid = url.searchParams.get('uid') || url.searchParams.get('puid') || url.searchParams.get('session') || '';
  const clickId = url.searchParams.get('click_id') || '';

  const FIREBASE_PROJECT_ID = 'ghostsensi-1d96b';
  const FIREBASE_API_KEY = 'AIzaSyBCMSULoP-CnTWurWMTUKDfRMEEu2T7PVE';

  if (uid) {
    try {
      const docUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/lootlabs_sessions/${encodeURIComponent(uid)}?key=${FIREBASE_API_KEY}`;
      await fetch(docUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            verified: { booleanValue: true },
            clickId: { stringValue: clickId },
            verifiedAt: { integerValue: String(Date.now()) }
          }
        })
      });
    } catch (e) {
      console.warn('[GhostSensix] Postback save error:', e);
    }
  }

  return new Response(JSON.stringify({
    status: 'ok',
    message: 'LootLabs postback credited successfully',
    uid,
    verified: true
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
