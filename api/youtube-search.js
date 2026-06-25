/** Vercel serverless — חיפוש YouTube (innerTube + גיבוי Invidious) */
const INVIDIOUS = [
  'https://invidious.materialio.us',
  'https://invidious.f5.si',
  'https://invidious.protokolla.fi',
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

function parseDuration(text) {
  if (!text) return null;
  const parts = String(text).trim().split(':').map((x) => parseInt(x, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function mapInvidiousItem(v) {
  const thumb = (v.videoThumbnails || []).find((t) => t.quality === 'medium') || v.videoThumbnails?.[0];
  return {
    videoId: v.videoId,
    title: v.title || '',
    author: v.author || '',
    lengthSeconds: typeof v.lengthSeconds === 'number' ? v.lengthSeconds : null,
    thumbUrl: thumb?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
  };
}

async function searchInnerTube(query, limit) {
  const r = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    body: JSON.stringify({
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20250220.01.00',
          hl: 'en',
          gl: 'US',
        },
      },
      query,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!r.ok) throw new Error(`innerTube ${r.status}`);

  const data = await r.json();
  const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents
    ?.sectionListRenderer?.contents || [];
  const items = sections.flatMap((s) => s.itemSectionRenderer?.contents || []);
  const results = [];

  for (const it of items) {
    const v = it.videoRenderer;
    if (!v?.videoId) continue;
    const title = (v.title?.runs || []).map((x) => x.text).join('')
      || v.title?.simpleText || '';
    const author = (v.ownerText?.runs || []).map((x) => x.text).join('')
      || v.longBylineText?.runs?.[0]?.text || '';
    const thumb = v.thumbnail?.thumbnails?.slice(-1)[0]?.url
      || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
    results.push({
      videoId: v.videoId,
      title,
      author,
      lengthSeconds: parseDuration(v.lengthText?.simpleText),
      thumbUrl: thumb,
    });
    if (results.length >= limit) break;
  }

  const hasContinuation = sections.some((s) => s.continuationItemRenderer)
    || !!(data.continuations?.length);
  return { results, hasMore: hasContinuation || results.length >= limit };
}

async function searchInvidious(query, page, limit) {
  const fields = 'videoId,title,author,lengthSeconds,videoThumbnails';
  for (const base of INVIDIOUS) {
    try {
      const url = `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video&page=${page}&fields=${fields}`;
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      const text = await r.text();
      if (!r.ok || !text.startsWith('[')) continue;
      const data = JSON.parse(text);
      if (!Array.isArray(data) || !data.length) continue;
      const results = data
        .filter((v) => v.videoId && v.type !== 'channel')
        .map(mapInvidiousItem)
        .slice(0, limit);
      if (!results.length) continue;
      return { results, hasMore: results.length >= limit };
    } catch { /* next */ }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const q = String(req.query.q || '').trim().slice(0, 120);
  if (q.length < 2) return res.status(400).json({ error: 'query too short' });

  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(10, parseInt(req.query.limit, 10) || 30));

  try {
    if (page === 1) {
      const inner = await searchInnerTube(q, limit);
      if (inner.results.length) {
        return res.json({
          results: inner.results,
          page,
          limit,
          hasMore: inner.hasMore,
          source: 'innertube',
        });
      }
    }

    const inv = await searchInvidious(q, page, limit);
    if (inv?.results?.length) {
      return res.json({
        results: inv.results,
        page,
        limit,
        hasMore: inv.hasMore,
        source: 'invidious',
      });
    }
  } catch (err) {
    console.error('[youtube-search]', err.message);
  }

  return res.status(502).json({
    error: 'YouTube search unavailable',
    results: [],
    hasMore: false,
  });
};
