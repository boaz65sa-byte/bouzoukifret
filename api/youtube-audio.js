/** Vercel — הורדת אודיו YouTube (streaming למכשיר המשתמש) */
const { Readable } = require('node:stream');
const { existsSync } = require('node:fs');
const { readFile, unlink } = require('node:fs/promises');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { randomUUID } = require('node:crypto');

const denoDir = join(process.cwd(), '.deno', 'bin');
if (existsSync(denoDir)) {
  process.env.PATH = `${denoDir}${require('node:path').delimiter}${process.env.PATH || ''}`;
}

let ytdlp;
try {
  ytdlp = require('yt-dlp-exec');
} catch {
  ytdlp = null;
}

const PIPED = [
  'https://pipedapi.in.projectsegfau.lt',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.tokhmi.xyz',
  'https://piped-api.garudalinux.org',
  'https://pipedapi.adminforge.de',
];

const INVIDIOUS = [
  'https://invidious.materialio.us',
  'https://invidious.f5.si',
  'https://invidious.protokolla.fi',
  'https://invidious.nerdvpn.de',
  'https://inv.nadeko.net',
  'https://yewtu.be',
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const ANDROID_UA = 'com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip';

const INNERTUBE_CLIENTS = [
  { clientName: 'ANDROID', clientVersion: '19.09.37', androidSdkVersion: 30, ua: ANDROID_UA },
  { clientName: 'ANDROID_MUSIC', clientVersion: '7.27.52', androidSdkVersion: 30, ua: ANDROID_UA },
  { clientName: 'IOS', clientVersion: '19.09.3', deviceModel: 'iPhone14,3', osVersion: '16.0', ua: UA },
  { clientName: 'TVHTML5_SIMPLY_EMBEDDED_PLAYER', clientVersion: '2.0', ua: UA },
  { clientName: 'WEB', clientVersion: '2.20250220.01.00', ua: UA },
];

function isLocalStemProxy(url) {
  if (!url) return true;
  try {
    const h = new URL(url).hostname;
    return ['localhost', '127.0.0.1', '::1'].includes(h);
  } catch {
    return true;
  }
}

function pickDirectAudioUrl(formats) {
  const list = (formats || [])
    .filter((f) => String(f.mimeType || f.type || '').startsWith('audio/'))
    .sort((a, b) => (parseInt(b.bitrate, 10) || b.bitrate || 0) - (parseInt(a.bitrate, 10) || a.bitrate || 0));
  for (const f of list) {
    if (f.url) return { url: f.url, type: String(f.mimeType || f.type || 'audio/mp4').split(';')[0] };
  }
  return null;
}

function isAudioContentType(ct) {
  const t = String(ct || '').toLowerCase();
  if (!t) return true;
  if (t.includes('text/') || t.includes('json') || t.includes('html')) return false;
  return t.startsWith('audio/') || t.startsWith('video/') || t.includes('octet-stream');
}

async function fetchAudioStream(url, headers = {}) {
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, ...headers },
    signal: AbortSignal.timeout(240000),
    redirect: 'follow',
  });
  if (!r.ok || !r.body) return null;
  const ct = r.headers.get('content-type') || '';
  if (!isAudioContentType(ct)) return null;
  return {
    response: r,
    type: ct.split(';')[0] || 'audio/mp4',
  };
}

const YTDLP_FORMAT = '140/ba[ext=m4a]/ba[ext=mp4]/bestaudio[ext=m4a]/bestaudio';

function pickYtDlpStreamUrl(info) {
  if (info?.url) return { url: info.url, type: 'audio/mp4' };
  const req = info?.requested_downloads?.[0];
  if (req?.url) {
    return { url: req.url, type: req.ext === 'webm' ? 'audio/webm' : 'audio/mp4' };
  }
  const fmt = (info?.formats || []).find((f) => f.url);
  if (fmt?.url) {
    return { url: fmt.url, type: fmt.ext === 'webm' ? 'audio/webm' : 'audio/mp4' };
  }
  return null;
}

async function audioFromYtDlp(id) {
  if (!ytdlp) return null;
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  try {
    const info = await ytdlp(watchUrl, {
      dumpSingleJson: true,
      format: YTDLP_FORMAT,
      quiet: true,
      noWarnings: true,
      noPlaylist: true,
      noCallHome: true,
    });
    const pick = pickYtDlpStreamUrl(info);
    if (!pick?.url) return null;
    const stream = await fetchAudioStream(pick.url, {
      Referer: watchUrl,
      Origin: 'https://www.youtube.com',
    });
    if (stream) stream.type = pick.type || stream.type;
    return stream;
  } catch (err) {
    console.error('[youtube-audio] yt-dlp url', err.message || err);
    return null;
  }
}

async function audioFromYtDlpFile(id) {
  if (!ytdlp) return null;
  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const out = join(tmpdir(), `yt-${id}-${randomUUID()}.m4a`);
  try {
    await ytdlp(watchUrl, {
      format: YTDLP_FORMAT,
      output: out,
      quiet: true,
      noWarnings: true,
      noPlaylist: true,
      noCallHome: true,
    });
    const buf = await readFile(out);
    await unlink(out).catch(() => {});
    if (buf.length < 4096) return null;
    return { buffer: buf, type: 'audio/mp4' };
  } catch (err) {
    console.error('[youtube-audio] yt-dlp file', err.message || err);
    await unlinkAsync(out).catch(() => {});
    return null;
  }
}

async function pipeToResponse(res, upstream) {
  res.setHeader('Content-Type', upstream.type);
  res.setHeader('Cache-Control', 'no-store');
  const len = upstream.response.headers.get('content-length');
  if (len) res.setHeader('Content-Length', len);
  const nodeStream = Readable.fromWeb(upstream.response.body);
  await new Promise((resolve, reject) => {
    nodeStream.on('error', reject);
    res.on('error', reject);
    nodeStream.on('end', resolve);
    nodeStream.pipe(res);
  });
}

async function audioFromInnerTube(id) {
  for (const client of INNERTUBE_CLIENTS) {
    try {
      const { ua, ...clientFields } = client;
      const r = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': ua || UA,
        },
        body: JSON.stringify({
          context: { client: { ...clientFields, hl: 'en', gl: 'US' } },
          videoId: id,
        }),
        signal: AbortSignal.timeout(28000),
      });
      if (!r.ok) continue;
      const data = await r.json();
      const status = data.playabilityStatus?.status;
      if (status && status !== 'OK') continue;

      const formats = [
        ...(data.streamingData?.adaptiveFormats || []),
        ...(data.streamingData?.formats || []),
      ];
      const pick = pickDirectAudioUrl(formats);
      if (!pick?.url) continue;

      const stream = await fetchAudioStream(pick.url, { 'User-Agent': ua || UA });
      if (stream) return stream;
    } catch { /* next client */ }
  }
  return null;
}

async function audioFromPiped(id) {
  for (const base of PIPED) {
    try {
      const r = await fetch(`${base}/streams/${id}`, { signal: AbortSignal.timeout(25000) });
      if (!r.ok) continue;
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) continue;
      const data = await r.json();
      const streams = Array.isArray(data.audioStreams) ? data.audioStreams : [];
      const best = streams.slice().sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
      if (!best?.url) continue;
      const stream = await fetchAudioStream(best.url, {
        Referer: 'https://piped.video/',
        Origin: 'https://piped.video',
      });
      if (stream) return stream;
    } catch { /* next */ }
  }
  return null;
}

async function audioFromInvidious(id) {
  for (const base of INVIDIOUS) {
    try {
      const r = await fetch(`${base}/api/v1/videos/${id}?fields=adaptiveFormats`, {
        signal: AbortSignal.timeout(20000),
        headers: { Accept: 'application/json', 'User-Agent': UA },
      });
      if (!r.ok) continue;
      const ct = r.headers.get('content-type') || '';
      if (!ct.includes('json')) continue;
      const data = await r.json();
      const pick = pickDirectAudioUrl(data.adaptiveFormats || []);
      if (!pick?.url) continue;
      const stream = await fetchAudioStream(pick.url);
      if (stream) return stream;
    } catch { /* next */ }
  }
  return null;
}

async function audioFromStemProxy(proxy, qs) {
  const r = await fetch(`${proxy}/api/youtube-audio?${qs}`, {
    signal: AbortSignal.timeout(300000),
  });
  if (!r.ok || !r.body) return null;
  const ct = r.headers.get('content-type') || '';
  if (ct.includes('json')) return null;
  return { response: r, type: ct.split(';')[0] || 'audio/mp4' };
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
    () => audioFromYtDlp(id),
    () => audioFromYtDlpFile(id),
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
      if (got?.buffer?.length) {
        res.setHeader('Content-Type', got.type || 'audio/mp4');
        res.setHeader('Content-Length', String(got.buffer.length));
        res.setHeader('Cache-Control', 'no-store');
        res.end(got.buffer);
        return;
      }
      if (got?.response?.body) {
        await pipeToResponse(res, got);
        return;
      }
    } catch (err) {
      console.error('[youtube-audio]', err.message);
    }
  }

  return res.status(502).json({
    error: 'לא הצלחנו להוריד כרגע — נסו שוב בעוד דקה. השיר יישמר במכשיר שלכם (ספריית לימוד).',
  });
};
