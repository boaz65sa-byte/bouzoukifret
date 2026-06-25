/** Vercel — הורדת אודיו YouTube דרך stem-proxy (STEM_PROXY_URL) */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'method not allowed' });

  const id = String(req.query.id || '').trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) {
    return res.status(400).json({ error: 'מזהה YouTube לא תקין' });
  }

  const proxy = String(process.env.STEM_PROXY_URL || '').trim().replace(/\/$/, '');
  if (!proxy) {
    return res.status(503).json({
      error: 'STEM_PROXY_URL לא הוגדר ב-Vercel — או הריצו stem-proxy מקומי והגדירו כתובת ב«הגדרות פרוקסי»',
    });
  }

  const qs = new URLSearchParams({ id, library: '0' });
  if (req.query.title) qs.set('title', String(req.query.title).slice(0, 120));

  try {
    const r = await fetch(`${proxy}/api/youtube-audio?${qs}`, {
      signal: AbortSignal.timeout(300000),
    });
    if (!r.ok) {
      let msg = `הורדה נכשלה (${r.status})`;
      try {
        const j = await r.json();
        msg = j.error || msg;
      } catch { /* noop */ }
      return res.status(r.status >= 400 ? r.status : 502).json({ error: msg });
    }
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'audio/mp4');
    res.setHeader('Content-Length', String(buf.length));
    return res.send(buf);
  } catch (err) {
    console.error('[youtube-audio]', err.message);
    return res.status(502).json({ error: 'שגיאת חיבור ל-stem-proxy' });
  }
};
