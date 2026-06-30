/** Vercel — הורדת אודיו YouTube: stem-proxy relay או גיבוי Piped */
const PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://piped-api.garudalinux.org',
];

const INVIDIOUS = [
  'https://invidious.materialio.us',
  'https://inv.nadeko.net',
  'https://invidious.f5.si',
];

async function audioFromPiped(id) {
  for (const base of PIPED) {
    try {
      const r = await fetch(`${base}/streams/${id}`, { signal: AbortSignal.timeout(25000) });
      if (!r.ok) continue;
      const data = await r.json();
      const streams = Array.isArray(data.audioStreams) ? data.audioStreams : [];
      const best = streams.slice().sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (!best?.url) continue;
      const ar = await fetch(best.url, { signal: AbortSignal.timeout(120000) });
      if (!ar.ok) continue;
      return { buf: Buffer.from(await ar.arrayBuffer()), type: ar.headers.get('content-type') || 'audio/mp4' };
    } catch { /* next */ }
  }
  return null;
}

async function audioFromInvidious(id) {
  for (const base of INVIDIOUS) {
    try {
      const r = await fetch(`${base}/api/v1/videos/${id}?fields=adaptiveFormats`, {
        signal: AbortSignal.timeout(20000),
        headers: { Accept: 'application/json' },
      });
      if (!r.ok) continue;
      const data = await r.json();
      const fmt = (data.adaptiveFormats || []).find((f) => String(f.type || '').startsWith('audio/'));
      if (!fmt?.url) continue;
      const ar = await fetch(fmt.url, { signal: AbortSignal.timeout(120000) });
      if (!ar.ok) continue;
      return { buf: Buffer.from(await ar.arrayBuffer()), type: ar.headers.get('content-type') || 'audio/mp4' };
    } catch { /* next */ }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const id = String(req.query.id || '').trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'מזהה YouTube לא תקין' });
  }

  const proxy = String(process.env.STEM_PROXY_URL || '').trim().replace(/\/$/, '');
  const qs = new URLSearchParams({ id, library: '0' });
  if (req.query.title) qs.set('title', String(req.query.title).slice(0, 120));

  if (proxy) {
    try {
      const r = await fetch(`${proxy}/api/youtube-audio?${qs}`, {
        signal: AbortSignal.timeout(300000),
      });
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        res.setHeader('Content-Type', r.headers.get('content-type') || 'audio/mp4');
        res.setHeader('Content-Length', String(buf.length));
        return res.send(buf);
      }
    } catch (err) {
      console.error('[youtube-audio] proxy relay:', err.message);
    }
  }

  try {
    let got = await audioFromPiped(id);
    if (!got) got = await audioFromInvidious(id);
    if (got?.buf?.length) {
      res.setHeader('Content-Type', got.type);
      res.setHeader('Content-Length', String(got.buf.length));
      return res.send(got.buf);
    }
  } catch (err) {
    console.error('[youtube-audio] fallback:', err.message);
  }

  if (!proxy) {
    return res.status(503).json({
      error: 'הורדה זמנית לא זמינה — נסו שוב או הריצו stem-proxy מקומי (start-windows.bat)',
    });
  }

  return res.status(502).json({ error: 'הורדת YouTube נכשלה — נסו שוב מאוחר יותר' });
};
