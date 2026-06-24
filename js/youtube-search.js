/* ============================================================
   YoutubeSearch — חיפוש וידאו (ספרייה מקומית + פרוקסי yt-dlp)
   ============================================================ */
'use strict';

const YoutubeSearch = (() => {
  const DEFAULT_PROXY = 'http://127.0.0.1:3456';
  const PAGE_SIZE = 30;

  const INVIDIOUS = [
    'https://yewtu.be',
    'https://invidious.jing.rocks',
    'https://iv.melmac.space',
    'https://invidious.privacydev.net',
  ];

  function getProxyUrl() {
    const u = window.BOUZOUKI_CONFIG?.stemProxyUrl || DEFAULT_PROXY;
    const raw = String(u).replace(/\/$/, '');
    return typeof DeviceUtils !== 'undefined' ? DeviceUtils.resolveProxyUrl(raw) : raw;
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

  /** שירים מהספרייה המובנית — עובד תמיד, גם בלי פרוקסי (רק בעמוד ראשון) */
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
          _score: all ? 2 : 1,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b._score - a._score)
      .map(({ _score, ...v }) => v);
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

  async function _proxySearch(query, page = 1) {
    const base = getProxyUrl();
    try {
      const r = await fetch(
        `${base}/api/youtube-search?q=${encodeURIComponent(query)}&page=${page}&limit=${PAGE_SIZE}`,
        { signal: AbortSignal.timeout(90000) }
      );
      if (!r.ok) {
        let msg = `שגיאת שרת ${r.status}`;
        try {
          const ct = r.headers.get('content-type') || '';
          if (ct.includes('json')) msg = (await r.json()).error || msg;
        } catch { /* noop */ }
        if (r.status === 404) {
          return { results: [], online: true, error: msg, needsRestart: true, hasMore: false };
        }
        return { results: [], online: true, error: msg, hasMore: false };
      }
      const data = await r.json();
      return {
        results: Array.isArray(data.results) ? data.results : [],
        hasMore: !!data.hasMore,
        online: true,
        page: data.page || page,
      };
    } catch {
      return { results: [], online: false, error: 'offline', hasMore: false };
    }
  }

  async function _invidiousSearch(query, page = 1) {
    for (const base of INVIDIOUS) {
      try {
        const r = await fetch(
          `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video&page=${page}&fields=videoId,title,author,lengthSeconds,videoThumbnails`,
          { signal: AbortSignal.timeout(10000) }
        );
        if (!r.ok) continue;
        const data = await r.json();
        if (!Array.isArray(data) || !data.length) continue;
        const results = data.map(v => {
          const thumb = (v.videoThumbnails || []).find(t => t.quality === 'medium') || v.videoThumbnails?.[0];
          return {
            videoId: v.videoId,
            title: v.title || '',
            author: v.author || '',
            lengthSeconds: v.lengthSeconds,
            thumbUrl: thumb?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
          };
        });
        return { results, hasMore: results.length >= PAGE_SIZE };
      } catch { /* next */ }
    }
    return { results: [], hasMore: false };
  }

  async function search(query, opts = {}) {
    const q = String(query || '').trim();
    const page = Math.max(1, parseInt(opts.page, 10) || 1);
    if (q.length < 2) {
      return { results: [], source: null, proxyOnline: false, localCount: 0, hasMore: false, page };
    }

    const local = page === 1 ? searchLocal(q) : [];
    const proxy = await _proxySearch(q, page);
    let remote = proxy.results || [];
    let hasMore = proxy.hasMore;
    let source = null;

    if (!remote.length && (!proxy.online || proxy.needsRestart)) {
      const inv = await _invidiousSearch(q, page);
      remote = inv.results;
      hasMore = inv.hasMore;
    }

    if (remote.length && proxy.online && !proxy.needsRestart) source = 'ytdlp';
    else if (remote.length) source = 'invidious';
    else if (local.length) source = 'library';

    const merged = page === 1 ? dedupeById([...local, ...remote]) : remote;

    return {
      results: merged,
      source,
      proxyOnline: proxy.online,
      proxyError: proxy.error,
      needsRestart: proxy.needsRestart,
      localCount: local.length,
      hasMore,
      page,
    };
  }

  function _cardHtml(v, activeId) {
    const dur = fmtDuration(v.lengthSeconds);
    const active = activeId === v.videoId ? ' active' : '';
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
  }

  function _wireCards(container, opts) {
    container.querySelectorAll('.learn-yt-card').forEach(card => {
      if (card.dataset.wired) return;
      card.dataset.wired = '1';
      card.addEventListener('click', (e) => {
        if (e.target.closest('.learn-yt-card-dl')) return;
        opts.onSelect?.(card.dataset.id, card.dataset.title);
        container.querySelectorAll('.learn-yt-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
      });
    });
    container.querySelectorAll('.learn-yt-card-dl').forEach(btn => {
      if (btn.dataset.wired) return;
      btn.dataset.wired = '1';
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const card = btn.closest('.learn-yt-card');
        const author = card?.querySelector('.learn-yt-card-meta')?.textContent?.trim() || '';
        opts.onDownload?.(btn.dataset.id, btn.dataset.title, author);
      });
    });
  }

  function _renderLoadMore(container, opts) {
    container.querySelector('.learn-search-more-wrap')?.remove();
    if (!opts.hasMore || !opts.onLoadMore) return;
    const wrap = document.createElement('div');
    wrap.className = 'learn-search-more-wrap';
    wrap.innerHTML = `<button type="button" class="btn secondary learn-search-more">טען עוד תוצאות ↓</button>`;
    wrap.querySelector('.learn-search-more').addEventListener('click', opts.onLoadMore);
    container.appendChild(wrap);
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
    if (!results.length && !opts.append) {
      renderEmpty(container, opts.meta || {});
      return;
    }
    if (!results.length && opts.append) {
      _renderLoadMore(container, opts);
      return;
    }

    const cardsHtml = results.map(v => _cardHtml(v, opts.activeId)).join('');

    if (opts.append) {
      const tmp = document.createElement('div');
      tmp.innerHTML = cardsHtml;
      while (tmp.firstChild) container.insertBefore(tmp.firstChild, container.querySelector('.learn-search-more-wrap'));
    } else {
      container.innerHTML = cardsHtml;
    }

    _wireCards(container, opts);
    _renderLoadMore(container, opts);
  }

  return {
    search, searchLocal, checkProxy, renderGrid, dedupeById,
    getProxyUrl, fmtDuration, esc, PAGE_SIZE,
  };
})();
