/* ============================================================
   LearnLibrary — ספריית לימוד: כל ההורדות במקום אחד
   IndexedDB (באפליקציה) + תיקיית learn-downloads במחשב
   ============================================================ */
'use strict';

const LearnLibrary = (() => {
  let _audio = null;
  let _audioUrl = null;
  let _playingId = null;
  let _tracks = [];
  let _diskDir = '';

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function fmtDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function stopAudio() {
    if (_audio) {
      _audio.pause();
      _audio = null;
    }
    if (_audioUrl) {
      URL.revokeObjectURL(_audioUrl);
      _audioUrl = null;
    }
    _playingId = null;
  }

  function stop() {
    stopAudio();
    if (typeof SongAnalyzer !== 'undefined') SongAnalyzer.stop();
  }

  async function _loadTracks() {
    if (typeof LearnOffline === 'undefined') return [];
    const local = await LearnOffline.list();
    let disk = [];
    if (typeof StemAPI !== 'undefined' && StemAPI.listDiskLibrary) {
      const manifest = await StemAPI.listDiskLibrary();
      if (manifest?.tracks) {
        _diskDir = manifest.dir || 'learn-downloads';
        disk = manifest.tracks;
      }
    }
    const byId = new Map(local.map(t => [t.videoId, { ...t, inApp: true }]));
    for (const d of disk) {
      const cur = byId.get(d.videoId);
      if (cur) {
        cur.onDisk = true;
        cur.diskFile = d.file;
      } else {
        byId.set(d.videoId, {
          videoId: d.videoId,
          title: d.title || d.videoId,
          titleHe: '',
          author: d.author || '',
          size: d.size || 0,
          savedAt: d.savedAt,
          thumbUrl: `https://i.ytimg.com/vi/${d.videoId}/hqdefault.jpg`,
          onDisk: true,
          diskFile: d.file,
          inApp: false,
        });
      }
    }
    return [...byId.values()].sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  }

  async function _playTrack(videoId) {
    if (_playingId === videoId && _audio && !_audio.paused) {
      _audio.pause();
      _renderGrid();
      return;
    }
    stopAudio();
    let blob = null;
    if (typeof LearnOffline !== 'undefined') {
      const rec = await LearnOffline.get(videoId);
      blob = rec?.blob || null;
    }
    if (!blob && typeof StemAPI !== 'undefined') {
      const proxy = (window.BOUZOUKI_CONFIG?.stemProxyUrl || 'http://127.0.0.1:3456').replace(/\/$/, '');
      try {
        const r = await fetch(`${proxy}/api/learn-library/file/${videoId}`);
        if (r.ok) blob = await r.blob();
      } catch { /* noop */ }
    }
    if (!blob) {
      alert('לא נמצא קובץ לנגינה — ייבאו לאפליקציה או הורידו שוב');
      return;
    }
    _audioUrl = URL.createObjectURL(blob);
    _audio = new Audio(_audioUrl);
    _playingId = videoId;
    _audio.addEventListener('ended', () => { _playingId = null; _renderGrid(); });
    _audio.play().catch(() => alert('לא ניתן לנגן'));
    _renderGrid();
  }

  async function _importToApp(videoId) {
    const proxy = (window.BOUZOUKI_CONFIG?.stemProxyUrl || 'http://127.0.0.1:3456').replace(/\/$/, '');
    const track = _tracks.find(t => t.videoId === videoId);
    try {
      const r = await fetch(`${proxy}/api/learn-library/file/${videoId}`);
      if (!r.ok) throw new Error('קובץ לא נמצא בתיקייה');
      const blob = await r.blob();
      await LearnOffline.save(videoId, blob, {
        title: track?.title || videoId,
        titleHe: track?.titleHe || '',
        author: track?.author || '',
        thumbUrl: track?.thumbUrl,
      });
      await refresh();
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function _analyze(videoId) {
    let blob = null;
    if (typeof LearnOffline !== 'undefined') {
      const rec = await LearnOffline.get(videoId);
      blob = rec?.blob || null;
    }
    if (!blob) {
      await _importToApp(videoId);
      const rec = await LearnOffline.get(videoId);
      blob = rec?.blob;
    }
    if (!blob || typeof SongAnalyzer === 'undefined') return;

    const panel = document.getElementById('learn-lib-analyze');
    if (panel) panel.hidden = false;
    if (!document.getElementById('sa-file')) SongAnalyzer.render('learn-lib-analyze-app');
    document.getElementById('sa-progress-wrap')?.style && (document.getElementById('sa-progress-wrap').style.display = '');
    panel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    try {
      await SongAnalyzer.runPipeline(blob);
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function _deleteTrack(videoId) {
    if (!confirm('למחוק מהספרייה? (נשאר באפליקציה אם קיים שם)')) return;
    if (typeof LearnOffline !== 'undefined') await LearnOffline.remove(videoId);
    await refresh();
  }

  function _openInLearnHub(videoId, title) {
    const btn = document.querySelector('.nav-btn[data-screen="learn"]');
    if (btn) btn.click();
    if (typeof LearnHub !== 'undefined' && LearnHub.loadVideo) {
      setTimeout(() => LearnHub.loadVideo(videoId, title), 120);
    }
  }

  function _openSong(songId) {
    if (!songId) return;
    if (typeof SongLibrary !== 'undefined' && SongLibrary.openSongById) {
      document.querySelector('.nav-btn[data-screen="songs"]')?.click();
      setTimeout(() => SongLibrary.openSongById(songId), 80);
    }
  }

  function _filterTracks(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return _tracks;
    return _tracks.filter(t => {
      const hay = [t.title, t.titleHe, t.author, t.videoId, t.songId].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  function _renderGrid(filter = '') {
    const grid = document.getElementById('learn-lib-grid');
    if (!grid) return;
    const shown = _filterTracks(filter);

    if (!shown.length) {
      grid.innerHTML = `<div class="learn-lib-empty card">
        <p>📭 עדיין אין שירים בספריית הלימוד</p>
        <p class="hint">לכו ל<strong>למד מהשיר</strong>, חפשו ב-YouTube ולחצו 📥 — השיר יישמר כאן ובתיקייה <code>learn-downloads</code></p>
        <button type="button" class="btn gold" id="learn-lib-goto-search">🔍 חפש שיר להורדה</button>
      </div>`;
      document.getElementById('learn-lib-goto-search')?.addEventListener('click', () => {
        document.querySelector('.nav-btn[data-screen="learn"]')?.click();
      });
      return;
    }

    grid.innerHTML = shown.map(t => {
      const label = esc(t.titleHe || t.title);
      const playing = _playingId === t.videoId;
      const thumb = t.thumbUrl || `https://i.ytimg.com/vi/${t.videoId}/hqdefault.jpg`;
      const badges = [
        t.inApp ? '<span class="ll-badge ll-badge-app">באפליקציה</span>' : '',
        t.onDisk ? '<span class="ll-badge ll-badge-disk">בדיסק</span>' : '',
        t.songId ? '<span class="ll-badge ll-badge-song">בספריית שירים</span>' : '',
      ].join('');
      return `<article class="learn-lib-card${playing ? ' playing' : ''}" data-id="${esc(t.videoId)}">
        <div class="learn-lib-thumb-wrap">
          <img class="learn-lib-thumb" src="${esc(thumb)}" alt="" loading="lazy">
          <button type="button" class="learn-lib-play" data-id="${esc(t.videoId)}" title="נגן">${playing ? '⏸' : '▶'}</button>
        </div>
        <div class="learn-lib-body">
          <h3 class="learn-lib-title">${label}</h3>
          <p class="learn-lib-meta">${esc(t.author || 'YouTube')} · ${fmtDate(t.savedAt)} · ${LearnOffline.fmtSize(t.size)}</p>
          <div class="learn-lib-badges">${badges}</div>
          <div class="learn-lib-actions">
            <button type="button" class="btn primary ll-analyze" data-id="${esc(t.videoId)}">🔬 נתח</button>
            <button type="button" class="btn secondary ll-yt" data-id="${esc(t.videoId)}" data-title="${label}">▶ YouTube</button>
            ${!t.inApp && t.onDisk ? `<button type="button" class="btn secondary ll-import" data-id="${esc(t.videoId)}">⬇ ייבא</button>` : ''}
            ${t.inApp ? `<button type="button" class="btn secondary ll-save" data-id="${esc(t.videoId)}">💾 שמור קובץ</button>` : ''}
            ${t.songId ? `<button type="button" class="btn secondary ll-song" data-song="${esc(t.songId)}">📖 שיר</button>` : ''}
            <button type="button" class="btn secondary ll-del" data-id="${esc(t.videoId)}">🗑</button>
          </div>
        </div>
      </article>`;
    }).join('');

    grid.querySelectorAll('.learn-lib-play').forEach(btn => {
      btn.addEventListener('click', () => _playTrack(btn.dataset.id));
    });
    grid.querySelectorAll('.ll-analyze').forEach(btn => {
      btn.addEventListener('click', () => _analyze(btn.dataset.id));
    });
    grid.querySelectorAll('.ll-yt').forEach(btn => {
      btn.addEventListener('click', () => _openInLearnHub(btn.dataset.id, btn.dataset.title));
    });
    grid.querySelectorAll('.ll-import').forEach(btn => {
      btn.addEventListener('click', () => _importToApp(btn.dataset.id));
    });
    grid.querySelectorAll('.ll-save').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rec = await LearnOffline.get(btn.dataset.id);
        if (rec?.blob && typeof StemAPI !== 'undefined') {
          const safe = String(rec.titleHe || rec.title).replace(/[^\w\u0590-\u05FF.-]+/g, '_').slice(0, 40);
          await StemAPI.saveBlobAsFile(rec.blob, `${safe || rec.videoId}_${rec.videoId}.m4a`);
        }
      });
    });
    grid.querySelectorAll('.ll-song').forEach(btn => {
      btn.addEventListener('click', () => _openSong(btn.dataset.song));
    });
    grid.querySelectorAll('.ll-del').forEach(btn => {
      btn.addEventListener('click', () => _deleteTrack(btn.dataset.id));
    });
  }

  async function _renderStats() {
    const el = document.getElementById('learn-lib-stats');
    if (!el || typeof LearnOffline === 'undefined') return;
    const { count, totalSize } = await LearnOffline.stats();
    const diskNote = _diskDir ? ` · תיקייה: <code>${esc(_diskDir.split(/[/\\]/).slice(-2).join('/'))}</code>` : '';
    el.innerHTML = `<span><b>${count}</b> שירים באפליקציה</span>
      <span>·</span>
      <span><b>${LearnOffline.fmtSize(totalSize)}</b> סה״כ</span>
      ${diskNote}
      <span>·</span>
      <span class="hint">נשמר מקומית — ללימוד אישי בלבד</span>`;
  }

  async function refresh() {
    _tracks = await _loadTracks();
    const q = document.getElementById('learn-lib-search')?.value || '';
    await _renderStats();
    _renderGrid(q);
    if (typeof LearnFlow !== 'undefined') LearnFlow.markLibrary();
  }

  function _injectStyles() {
    if (document.getElementById('learn-lib-styles')) return;
    const s = document.createElement('style');
    s.id = 'learn-lib-styles';
    s.textContent = `
      .learn-lib-toolbar { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin-bottom:14px; }
      .learn-lib-search { flex:1; min-width:200px; padding:10px 16px; border-radius:24px; border:1px solid var(--line,#444); background:var(--bg-elev,#222); color:var(--text,#eee); font-size:15px; }
      .learn-lib-stats { display:flex; flex-wrap:wrap; gap:8px; align-items:center; font-size:13px; margin-bottom:14px; padding:10px 14px; background:var(--bg-card,#1a1a2e); border-radius:10px; border-right:3px solid var(--gold,#e3b341); }
      .learn-lib-stats code { font-size:11px; direction:ltr; }
      .learn-lib-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:12px; }
      .learn-lib-card { display:flex; gap:12px; padding:12px; background:var(--bg-card,#1a1a2e); border:1px solid var(--line,#333); border-radius:12px; transition:border-color .15s; }
      .learn-lib-card.playing { border-color:var(--gold,#e3b341); box-shadow:0 0 0 1px rgba(227,179,65,.25); }
      .learn-lib-thumb-wrap { position:relative; flex-shrink:0; width:100px; height:56px; border-radius:8px; overflow:hidden; background:#111; }
      .learn-lib-thumb { width:100%; height:100%; object-fit:cover; }
      .learn-lib-play { position:absolute; inset:0; border:none; background:rgba(0,0,0,.45); color:#fff; font-size:22px; cursor:pointer; opacity:0; transition:opacity .15s; }
      .learn-lib-thumb-wrap:hover .learn-lib-play, .learn-lib-card.playing .learn-lib-play { opacity:1; }
      .learn-lib-body { min-width:0; flex:1; }
      .learn-lib-title { margin:0 0 4px; font-size:14px; font-weight:700; line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      .learn-lib-meta { margin:0 0 6px; font-size:11px; color:var(--text-dim,#999); }
      .learn-lib-badges { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px; }
      .ll-badge { font-size:9px; padding:2px 6px; border-radius:4px; font-weight:700; }
      .ll-badge-app { background:rgba(79,179,217,.2); color:#4fb3d9; }
      .ll-badge-disk { background:rgba(227,179,65,.15); color:var(--gold,#e3b341); }
      .ll-badge-song { background:rgba(120,200,120,.15); color:#7dc87d; }
      .learn-lib-actions { display:flex; flex-wrap:wrap; gap:4px; }
      .learn-lib-actions .btn { font-size:11px; padding:4px 8px; }
      .learn-lib-empty { text-align:center; padding:24px; }
      .learn-lib-analyze { margin-top:20px; }
    `;
    document.head.appendChild(s);
  }

  function render() {
    const root = document.getElementById('learn-lib-app');
    if (!root) return;
    _injectStyles();
    root.innerHTML = `
      <div class="learn-lib-toolbar card">
        <input type="search" id="learn-lib-search" class="learn-lib-search" placeholder="חפשו בספרייה — שם, אמן, מזהה…" autocomplete="off" />
        <button type="button" class="btn gold" id="learn-lib-goto-hub">➕ הורד שיר חדש</button>
        <button type="button" class="btn secondary" id="learn-lib-refresh">↻ רענן</button>
      </div>
      <div id="learn-lib-stats" class="learn-lib-stats"></div>
      <div id="learn-lib-grid" class="learn-lib-grid"></div>
      <details class="learn-lib-analyze card" id="learn-lib-analyze" hidden>
        <summary>🔬 ניתוח AI — תוצאות</summary>
        <div id="learn-lib-analyze-app" style="margin-top:12px"></div>
      </details>`;

    document.getElementById('learn-lib-search')?.addEventListener('input', e => _renderGrid(e.target.value));
    document.getElementById('learn-lib-goto-hub')?.addEventListener('click', () => {
      document.querySelector('.nav-btn[data-screen="learn"]')?.click();
    });
    document.getElementById('learn-lib-refresh')?.addEventListener('click', () => refresh());

    refresh();
  }

  function init() {
    render();
  }

  return { init, stop, refresh };
})();
