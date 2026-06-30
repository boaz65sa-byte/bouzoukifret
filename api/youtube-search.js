/** Vercel serverless — חיפוש YouTube (innerTube + continuation + Invidious) */
const INVIDIOUS = [
  'https://invidious.materialio.us',
  'https://inv.nadeko.net',
  'https://invidious.f5.si',
  'https://invidious.protokolla.fi',
  'https://yewtu.be',
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

const WEB_CLIENT = {
  clientName: 'WEB',
  clientVersion: '2.20250220.01.00',
  hl: 'en',
  gl: 'US',
};

function parseDuration(text) {
  if (!text) return null;
  const parts = String(text).trim().split(':').map((x) => parseInt(x, 10));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function mapVideoRenderer(v) {
  if (!v?.videoId) return null;
  const title = (v.title?.runs || []).map((x) => x.text).join('')
    || v.title?.simpleText || '';
  const author = (v.ownerText?.runs || []).map((x) => x.text).join('')
    || v.longBylineText?.runs?.[0]?.text || '';
  const thumb = v.thumbnail?.thumbnails?.slice(-1)[0]?.url
    || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
  return {
    videoId: v.videoId,
    title,
    author,
    lengthSeconds: parseDuration(v.lengthText?.simpleText),
    thumbUrl: thumb,
  };
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

function extractContinuationToken(data) {
  const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents
    ?.sectionListRenderer?.contents || [];
  for (const s of sections) {
    const tok = s.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
    if (tok) return tok;
  }

  const cmds = data.onResponseReceivedCommands || [];
  for (const cmd of cmds) {
    const items = cmd.appendContinuationItemsAction?.continuationItems || [];
    for (const it of items) {
      const tok = it.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
      if (tok) return tok;
    }
  }

  const cont = data.continuationContents?.twoColumnSearchResultsPrimarySecondaryViewModel
    ?.secondaryResults?.secondaryResults?.continuations?.[0]
    ?.nextContinuationData?.continuation;
  return cont || null;
}

function collectVideoRenderers(data, isContinuation) {
  const raw = [];
  if (isContinuation) {
    const cmds = data.onResponseReceivedCommands || [];
    for (const cmd of cmds) {
      const items = cmd.appendContinuationItemsAction?.continuationItems || [];
      raw.push(...items);
    }
  } else {
    const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents || [];
    raw.push(...sections.flatMap((s) => s.itemSectionRenderer?.contents || []));
  }

  const results = [];
  for (const it of raw) {
    const v = it.videoRenderer || it.richItemRenderer?.content?.videoRenderer;
    const mapped = mapVideoRenderer(v);
    if (mapped) results.push(mapped);
  }
  return results;
}

async function postInnerTube(body) {
  const r = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(22000),
  });
  if (!r.ok) throw new Error(`innerTube ${r.status}`);
  return r.json();
}

async function searchInnerTube(query, limit, continuationToken = null) {
  const context = { client: WEB_CLIENT };
  const data = continuationToken
    ? await postInnerTube({ context, continuation: continuationToken })
    : await postInnerTube({ context, query });

  const results = collectVideoRenderers(data, !!continuationToken).slice(0, limit);
  const nextToken = extractContinuationToken(data);
  return {
    results,
    hasMore: !!nextToken,
    continuationToken: nextToken,
  };
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
      return { results, hasMore: results.length >= limit, continuationToken: null };
    } catch { /* next */ }
  }
  return null;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  const body = req.method === 'POST' ? (req.body || {}) : {};
  const q = String(body.q || req.query.q || '').trim().slice(0, 120);
  if (q.length < 2) return res.status(400).json({ error: 'query too short' });

  const page = Math.max(1, parseInt(body.page || req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(10, parseInt(body.limit || req.query.limit, 10) || 30));
  const continuation = String(body.continuation || req.query.continuation || '').trim() || null;

  try {
    if (continuation || page === 1) {
      const inner = await searchInnerTube(q, limit, continuation);
      if (inner.results.length) {
        return res.json({
          results: inner.results,
          page,
          limit,
          hasMore: inner.hasMore,
          continuationToken: inner.continuationToken,
          source: 'innertube',
        });
      }
      if (continuation) {
        return res.json({
          results: [],
          page,
          limit,
          hasMore: false,
          continuationToken: null,
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
        continuationToken: null,
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
    continuationToken: null,
  });
};
