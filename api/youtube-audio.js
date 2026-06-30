/** Vercel — הורדת אודיו YouTube למכשיר המשתמש (innerTube + Piped + Invidious) */
const PIPED = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.adminforge.de',
];

const INVIDIOUS = [
  'https://invidious.materialio.us',
  'https://inv.nadeko.net',
  'https://invidious.f5.si',
  'https://invidious.protokolla.fi',
  'https://yewtu.be',
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const ANDROID_UA = 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip';

function isLocalStemProxy(url) {
  if (!url) return true;
  try {
    const h = new URL(url).hostname;
    return ['localhost', '127.0.0.1', '::1'].includes(h);
  } catch {
    return true;
  }
}

async function audioFromInnerTube(id) {
  const clients = [
    { clientName: 'ANDROID', clientVersion: '19.09.37', androidSdkVersion: 30 },
    { clientName: 'IOS', clientVersion: '19.09.3', deviceModel: 'iPhone14,3', osVersion: '16.0', userAgent: UA },
    { clientName: 'WEB', clientVersion: '2.20250220.01.00' },
  ];

  for (const client of clients) {
    try {
      const r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': client.clientName === 'ANDROID' ? ANDROID_UA : UA,
        },
        body: JSON.stringify({
          context: { client: { ...client, hl: 'en', gl: 'US' } },
          videoId: id,
        }),
        signal: AbortSignal.timeout(28000),
      });
      if (!r.ok) continue;
      const data = await r.json();
      if (data.playabilityStatus?.status && data.playabilityStatus.status !== 'OK') continue;

      const formats = [
        ...(data.streamingData?.adaptiveFormats || []),
        ...(data.streamingData?.formats || []),
      ].filter((f) => String(f.mimeType || '').startsWith('audio/') && f.url);

      formats.sort((a, b) => (parseInt(b.bitrate, 10) || 0) - (parseInt(a.bitrate, 10) || 0));
      const best = formats[0];
      if (!best?.url) continue;

      const ar = await fetch(best.url, {
        headers: { 'User-Agent': client.clientName === 'ANDROID' ? ANDROID_UA : UA },
        signal: AbortSignal.timeout(180000),
      });
      if (!ar.ok) continue;
      return {
        buf: Buffer.from(await ar.arrayBuffer()),
        type: String(best.mimeType || 'audio/mp4').split(';')[0],
      };
    } catch { /* next client */ }
  }
  return null;
}

async function audioFromPiped(id) {
  for (const base of PIPED) {
    try {
      const r = await fetch(`${base}/streams/${id}`, { signal: AbortSignal.timeout(25000) });
      if (!r.ok) continue;
      const data = await r.json();
      const streams = Array.isArray(data.audioStreams) ? data.audioStreams : [];
      const best = streams.slice().sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (!best?.url) continue;
      const ar = await fetch(best.url, { signal: AbortSignal.timeout(180000) });
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
      const ar = await fetch(fmt.url, { signal: AbortSignal.timeout(180000) });
      if (!ar.ok) continue;
      return { buf: Buffer.from(await ar.arrayBuffer()), type: ar.headers.get('content-type') || 'audio/mp4' };
    } catch { /* next */ }
  }
  return null;
}

async function audioFromStemProxy(proxy, qs) {
  const r = await fetch(`${proxy}/api/youtube-audio?${qs}`, {
    signal: AbortSignal.timeout(300000),
  });
  if (!r.ok) return null;
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('json')) return null;
  return {
    buf: Buffer.from(await r.arrayBuffer()),
    type: ct || 'audio/mp4',
  };
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

  const attempts = [
    () => audioFromInnerTube(id),
    () => audioFromPiped(id),
    () => audioFromInvidious(id),
  ];

  if (proxy && !isLocalStemProxy(proxy)) {
    attempts.push(() => audioFromStemProxy(proxy, qs));
  }

  for (const tryFn of attempts) {
    try {
      const got = await tryFn();
      if (got?.buf?.length) {
        res.setHeader('Content-Type', got.type);
        res.setHeader('Content-Length', String(got.buf.length));
        res.setHeader('Cache-Control', 'no-store');
        return res.send(got.buf);
      }
    } catch (err) {
      console.error('[youtube-audio]', err.message);
    }
  }

  return res.status(502).json({
    error: 'לא הצלחנו להוריד את השיר כרגע — נסו שוב בעוד דקה. אין צורך בשרת מקומי; ההורדה אמורה להישמר במכשיר שלכם.',
  });
};
