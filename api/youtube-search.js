/** Vercel serverless — חיפוש YouTube דרך Invidious (ללא CORS בדפדפן) */
const INVIDIOUS = [
  'https://invidious.materialio.us',
  'https://invidious.f5.si',
  'https://invidious.protokolla.fi',
  'https://inv.nadeko.net',
  'https://invidious.privacydev.net',
  'https://iv.melmac.space',
  'https://yewtu.be',
];

const UA = 'BouzoukiFret/1.0';

function mapItem(v) {
  const thumb = (v.videoThumbnails || []).find(t => t.quality === 'medium')
    || (v.videoThumbnails || []).find(t => t.quality === 'high')
    || v.videoThumbnails?.[0];
  return {
    videoId: v.videoId,
    title: v.title || '',
    author: v.author || '',
    lengthSeconds: typeof v.lengthSeconds === 'number' ? v.lengthSeconds : null,
    thumbUrl: thumb?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
  };
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
  const fields = 'videoId,title,author,lengthSeconds,videoThumbnails';

  for (const base of INVIDIOUS) {
    try {
      const url = `${base}/api/v1/search?q=${encodeURIComponent(q)}&type=video&page=${page}&fields=${fields}`;
      const r = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      const text = await r.text();
      if (!r.ok || !text.startsWith('[')) continue;
      const data = JSON.parse(text);
      if (!Array.isArray(data) || !data.length) continue;
      const results = data.filter(v => v.videoId && v.type !== 'channel').map(mapItem);
      if (!results.length) continue;
      return res.json({
        results,
        page,
        limit,
        hasMore: results.length >= limit,
        source: 'invidious',
      });
    } catch { /* try next instance */ }
  }

  return res.status(502).json({
    error: 'YouTube search unavailable',
    results: [],
    hasMore: false,
  });
};
