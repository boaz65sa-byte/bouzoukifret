/* ============================================================
   YoutubeSearch — חיפוש וידאו (ספרייה מקומית + פרוקסי yt-dlp)
   ============================================================ */
'use strict';

const YoutubeSearch = (() => {
  const DEFAULT_PROXY = 'http://127.0.0.1:3456';

  const INVIDIOUS = [
    'https://yewtu.be',
    'https://invidious.jing.rocks',
    'https://iv.melmac.space',
    'https://invidious.privacydev.net',
  ];

  function getProxyUrl() {
    const u = window.BOUZOUKI_CONFIG?.stemProxyUrl || DEFAULT_PROXY;
    return String(u).replace(/\/$/, '');
  }

  function fmtDuration(sec) {
    if (!sec || sec < 0) return '';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function dedupeById(list) {
    const seen = new Set();
    return list.filter(v => {
      if (!v?.videoId || seen.has(v.videoId)) return false;
      seen.add(v.videoId);
      return true;
    });
  }

  /** שירים מהספרייה המובנית — עובד תמיד, גם בלי פרוקסי */
  function searchLocal(query) {
    if (typeof SongLibrary === 'undefined' || !SongLibrary.getAllSongs) return [];
    const words = String(query || '').toLowerCase().split(/\s+/).filter(w => w.length > 1);
    if (!words.length) return [];

    return SongLibrary.getAllSongs()
      .map(s => {
        const ref = SongLibrary.getSongReference?.(s);
        if (!ref?.youtubeId) return null;
        const hay = [s.title, s.titleHe, s.artist, s.artistHe, s.id, s.dromos]
          .filter(Boolean).join(' ').toLowerCase();
        const all = words.every(w => hay.includes(w));
        const some = words.some(w => hay.includes(w));
        if (!all && !some) return null;
        return {
          videoId: ref.youtubeId,
          title: s.titleHe ? `${s.titleHe} (${s.title || ''})` : (s.title || s.id),
          author: s.artistHe || s.artist || 'ספריית השירים',
          lengthSeconds: null,
          thumbUrl: `https://i.ytimg.com/vi/${ref.youtubeId}/hqdefault.jpg`,
          local: true,
        };
      })
      .filter(Boolean)
      .slice(0, 12);
  }

  async function checkProxy() {
    const url = getProxyUrl();
    try {
      const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(4000) });
      if (!r.ok) return { online: false, url, reason: 'error' };
      const data = await r.json();
      return { online: !!data.ok, url, ytdlp: true };
    } catch {
      return { online: false, url, reason: 'offline' };
    }
  }

  async function _proxySearch(query) {
    const base = getProxyUrl();
    try {
      const r = await fetch(
        `${base}/api/youtube-search?q=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(45000) }
      );
      if (!r.ok) {
        let msg = `שגיאת שרת ${r.status}`;
        try {
          const ct = r.headers.get('content-type') || '';
          if (ct.includes('json')) msg = (await r.json()).error || msg;
        } catch { /* noop */ }
        if (r.status === 404) {
          return { results: [], online: true, error: msg, needsRestart: true };
        }
        return { results: [], online: true, error: msg };
      }
      const data = await r.json();
      return { results: Array.isArray(data.results) ? data.results : [], online: true };
    } catch {
      return { results: [], online: false, error: 'offline' };
    }
  }

  async function _invidiousSearch(query) {
    for (const base of INVIDIOUS) {
      try {
        const r = await fetch(
          `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,lengthSeconds,videoThumbnails`,
          { signal: AbortSignal.timeout(7000) }
        );
        if (!r.ok) continue;
        const data = await r.json();
        if (!Array.isArray(data) || !data.length) continue;
        return data.map(v => {
          const thumb = (v.videoThumbnails || []).find(t => t.quality === 'medium') || v.videoThumbnails?.[0];
          return {
            videoId: v.videoId,
            title: v.title || '',
            author: v.author || '',
            lengthSeconds: v.lengthSeconds,
            thumbUrl: thumb?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          };
        });
      } catch { /* next */ }
    }
    return [];
  }

  async function search(query) {
    const q = String(query || '').trim();
    if (q.length < 2) {
      return { results: [], source: null, proxyOnline: false, localCount: 0 };
    }

    const local = searchLocal(q);
    const proxy = await _proxySearch(q);
    let remote = proxy.results || [];

    if (!remote.length && (!proxy.online || proxy.needsRestart)) {
      const inv = await _invidiousSearch(q);
      if (inv.length) remote = inv;
    }

    const merged = dedupeById([...local, ...remote]);
    let source = null;
    if (remote.length && proxy.online && !proxy.needsRestart) source = 'ytdlp';
    else if (remote.length) source = 'invidious';
    else if (local.length) source = 'library';

    return {
      results: merged.slice(0, 20),
      source,
      proxyOnline: proxy.online,
      proxyError: proxy.error,
      needsRestart: proxy.needsRestart,
      localCount: local.length,
    };
  }

  function renderEmpty(container, meta = {}) {
    if (!container) return;
    const proxyUrl = esc(getProxyUrl());

    let html = '';
    if (!meta.proxyOnline) {
      html += `<div class="learn-search-help card">
        <p><b>⚙️ stem-proxy לא פעיל</b> — לחיפוש מלא ב-YouTube והורדת MP3:</p>
        <ol class="learn-search-help-steps">
          <li>פתחו טרמינל בתיקייה <code>tools/stem-proxy</code></li>
          <li>הריצו: <code>npm start</code> (או <code>start-windows.bat</code>)</li>
          <li>ודאו ש-<code>config.js</code> מכיל: <code>stemProxyUrl: '${proxyUrl}'</code></li>
        </ol>
        <p class="hint">בינתיים — חפשו שם שיר מהספרייה (למשל: מיסירלו, זורבה, ציצאניס) או בחרו מהרשימה למטה.</p>
      </div>`;
    } else if (meta.needsRestart) {
      html += `<div class="learn-search-help card">
        <p><b>🔄 stem-proxy דורש הפעלה מחדש</b> — הגרסה הרצה עדיין ללא חיפוש YouTube.</p>
        <p>עצרו את השרת (Ctrl+C) והריצו שוב: <code>npm start</code> ב-<code>tools/stem-proxy</code></p>
        <p class="hint">בינתיים — חפשו שמות מהספרייה או בחרו מהרשימה למטה.</p>
      </div>`;
    } else {
      html += '<p class="learn-search-empty">לא נמצאו תוצאות — נסו מילים אחרות או שם אמן יווני</p>';
    }
    container.innerHTML = html;
  }

  function renderGrid(container, results, opts = {}) {
    if (!container) return;
    if (!results.length) {
      renderEmpty(container, opts.meta || {});
      return;
    }

    container.innerHTML = results.map(v => {
      const dur = fmtDuration(v.lengthSeconds);
      const active = opts.activeId === v.videoId ? ' active' : '';
      const thumb = v.thumbUrl || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
      const badge = v.local ? '<span class="learn-yt-card-badge">📚 ספרייה</span>' : '';
      return `<article class="learn-yt-card${active}" data-id="${esc(v.videoId)}" data-title="${esc(v.title)}">
        <div class="learn-yt-card-thumb-wrap">
          <img class="learn-yt-card-thumb" src="${esc(thumb)}" alt="" loading="lazy"
            onerror="this.src='https://i.ytimg.com/vi/${esc(v.videoId)}/hqdefault.jpg'">
          ${dur ? `<span class="learn-yt-card-dur">${dur}</span>` : ''}
          ${badge}
          <button type="button" class="learn-yt-card-dl" data-id="${esc(v.videoId)}" data-title="${esc(v.title)}" title="הורד MP3">📥</button>
        </div>
        <div class="learn-yt-card-body">
          <h4 class="learn-yt-card-title">${esc(v.title)}</h4>
          <p class="learn-yt-card-meta">${esc(v.author)}</p>
        </div>
      </article>`;
    }).join('');

    container.querySelectorAll('.learn-yt-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.learn-yt-card-dl')) return;
        opts.onSelect?.(card.dataset.id, card.dataset.title);
        container.querySelectorAll('.learn-yt-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });
    container.querySelectorAll('.learn-yt-card-dl').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        opts.onDownload?.(btn.dataset.id, btn.dataset.title);
      });
    });
  }

  return { search, searchLocal, checkProxy, renderGrid, getProxyUrl, fmtDuration, esc };
})();
