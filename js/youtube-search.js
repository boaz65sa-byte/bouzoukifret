/* ============================================================
   YoutubeSearch — חיפוש וידאו (פרוקסי yt-dlp / Invidious)
   ============================================================ */
'use strict';

const YoutubeSearch = (() => {
  const INVIDIOUS = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://invidious.privacydev.net',
    'https://iv.melmac.space',
    'https://invidious.jing.rocks',
    'https://yewtu.be',
    'https://invidious.f5.si',
    'https://invidious.materialio.us',
  ];

  function fmtDuration(sec) {
    if (!sec || sec < 0) return '';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  async function _proxySearch(query) {
    const proxy = window.BOUZOUKI_CONFIG?.stemProxyUrl;
    if (!proxy) return null;
    try {
      const r = await fetch(`${proxy.replace(/\/$/, '')}/api/youtube-search?q=${encodeURIComponent(query)}`, {
        signal: AbortSignal.timeout(25000),
      });
      if (!r.ok) return null;
      const data = await r.json();
      return Array.isArray(data.results) ? data.results : null;
    } catch {
      return null;
    }
  }

  async function _invidiousSearch(query) {
    for (const base of INVIDIOUS) {
      try {
        const r = await fetch(
          `${base}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,lengthSeconds,videoThumbnails`,
          { signal: AbortSignal.timeout(6000) }
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
    return null;
  }

  async function search(query) {
    const q = String(query || '').trim();
    if (q.length < 2) return { results: [], source: null };
    const proxy = await _proxySearch(q);
    if (proxy?.length) return { results: proxy.slice(0, 16), source: 'ytdlp' };
    const inv = await _invidiousSearch(q);
    if (inv?.length) return { results: inv.slice(0, 16), source: 'invidious' };
    return { results: [], source: null };
  }

  /**
   * @param {HTMLElement} container
   * @param {Array} results
   * @param {{ onSelect, onDownload, activeId }} opts
   */
  function renderGrid(container, results, opts = {}) {
    if (!container) return;
    if (!results.length) {
      container.innerHTML = '<p class="learn-search-empty">לא נמצאו תוצאות — נסו מילים אחרות או הפעילו stem-proxy</p>';
      return;
    }
    container.innerHTML = results.map(v => {
      const dur = fmtDuration(v.lengthSeconds);
      const active = opts.activeId === v.videoId ? ' active' : '';
      const thumb = v.thumbUrl || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;
      return `<article class="learn-yt-card${active}" data-id="${esc(v.videoId)}" data-title="${esc(v.title)}">
        <div class="learn-yt-card-thumb-wrap">
          <img class="learn-yt-card-thumb" src="${esc(thumb)}" alt="" loading="lazy">
          ${dur ? `<span class="learn-yt-card-dur">${dur}</span>` : ''}
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

  return { search, renderGrid, fmtDuration, esc };
})();
