// Cloudflare Pages Function: /api/latest-video
// Automatically fetches the real-time latest video from @GhostSensix YouTube RSS feed

export async function onRequest(context) {
  const GHOSTSENSIX_CHANNEL_ID = "UC8laKzbaWUNJMJ6XN_pxiBg";
  const FALLBACK_VIDEO_ID = "GTSVT1ax-jc";

  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${GHOSTSENSIX_CHANNEL_ID}`;
    const resp = await fetch(rssUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      cf: {
        cacheTtl: 180, // Cache on Cloudflare Edge for 3 minutes
        cacheEverything: true
      }
    });

    if (resp.ok) {
      const xml = await resp.text();
      const videoMatch = xml.match(/<yt:videoId>(.*?)<\/yt:videoId>/);
      const titleMatch = xml.match(/<title>(.*?)<\/title>/);

      if (videoMatch && videoMatch[1]) {
        const videoId = videoMatch[1].trim();
        const title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : "Latest GhostSensix Video";

        return new Response(JSON.stringify({
          success: true,
          videoId: videoId,
          videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
          title: title,
          channel: "GhostSensix",
          cached: false
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "public, max-age=180"
          }
        });
      }
    }
  } catch (err) {
    // Fallback on error
  }

  return new Response(JSON.stringify({
    success: true,
    videoId: FALLBACK_VIDEO_ID,
    videoUrl: `https://www.youtube.com/watch?v=${FALLBACK_VIDEO_ID}`,
    fallback: true
  }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
