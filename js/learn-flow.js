/* ============================================================
   LearnFlow — מסלול לימוד אחד: חיפוש → הורדה → ספרייה → ניתוח → תרגול
   ============================================================ */
'use strict';

const LearnFlow = (() => {
  const KEY = 'bouzouki_learn_flow_v1';
  const STEPS = [
    { id: 'search', icon: '🔍', label: 'חיפוש' },
    { id: 'download', icon: '📥', label: 'הורדה' },
    { id: 'library', icon: '📚', label: 'ספרייה' },
    { id: 'analyze', icon: '🔬', label: 'ניתוח' },
    { id: 'practice', icon: '🎸', label: 'תרגול' },
  ];

  function _state() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
    catch { return {}; }
  }

  function _save(patch) {
    const s = { ..._state(), ...patch, updatedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(s));
    _renderBar();
    return s;
  }

  function setStep(stepId) {
    _save({ step: stepId });
  }

  function markDownload(videoId, title) {
    _save({ step: 'download', lastVideoId: videoId, lastTitle: title });
  }

  function markLibrary(videoId) {
    _save({ step: 'library', lastVideoId: videoId || _state().lastVideoId });
  }

  function markAnalyze(videoId) {
    _save({ step: 'analyze', lastVideoId: videoId || _state().lastVideoId });
  }

  function markPractice(kind) {
    _save({ step: 'practice', lastPractice: kind });
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function _renderBar() {
    const el = document.getElementById('learn-flow-bar');
    if (!el) return;
    const cur = _state().step || 'search';
    const idx = STEPS.findIndex(s => s.id === cur);
    el.innerHTML = STEPS.map((s, i) => {
      const done = i < idx;
      const active = s.id === cur;
      const cls = ['learn-flow-step', done ? 'done' : '', active ? 'active' : ''].filter(Boolean).join(' ');
      return `<div class="${cls}" data-step="${s.id}">
        <span class="learn-flow-ico">${done ? '✓' : s.icon}</span>
        <span class="learn-flow-label">${esc(s.label)}</span>
      </div>${i < STEPS.length - 1 ? '<span class="learn-flow-arrow">←</span>' : ''}`;
    }).join('');
  }

  function injectStyles() {
    if (document.getElementById('learn-flow-styles')) return;
    const s = document.createElement('style');
    s.id = 'learn-flow-styles';
    s.textContent = `
      .learn-flow-bar { display:flex; flex-wrap:wrap; align-items:center; gap:4px 8px; padding:12px 14px; margin-bottom:12px;
        background:var(--bg-card,#1a1a2e); border-radius:12px; border:1px solid var(--line,#333); }
      .learn-flow-step { display:flex; align-items:center; gap:6px; padding:6px 10px; border-radius:20px; font-size:12px;
        color:var(--text-dim,#888); border:1px solid transparent; }
      .learn-flow-step.active { background:rgba(227,179,65,.12); border-color:var(--gold,#e3b341); color:var(--gold,#e3b341); font-weight:700; }
      .learn-flow-step.done { color:var(--text,#ccc); }
      .learn-flow-ico { font-size:14px; }
      .learn-flow-arrow { color:var(--text-dim,#555); font-size:11px; }
      .learn-flow-toast { position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:9000;
        max-width:min(420px,92vw); padding:14px 18px; background:var(--bg-elev,#222); border:1px solid var(--gold,#e3b341);
        border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,.5); animation:learnFlowIn .25s ease; }
      .learn-flow-toast p { margin:0 0 10px; font-size:14px; }
      .learn-flow-toast-actions { display:flex; flex-wrap:wrap; gap:8px; }
      @keyframes learnFlowIn { from { opacity:0; transform:translateX(-50%) translateY(12px); } }
    `;
    document.head.appendChild(s);
  }

  function _toast(html, ms = 12000) {
    document.querySelector('.learn-flow-toast')?.remove();
    const el = document.createElement('div');
    el.className = 'learn-flow-toast';
    el.innerHTML = html;
    document.body.appendChild(el);
    const t = setTimeout(() => el.remove(), ms);
    el.addEventListener('click', e => {
      if (e.target.closest('button')) { clearTimeout(t); el.remove(); }
    });
  }

  function afterDownload(videoId, title) {
    markDownload(videoId, title);
    _toast(`<p>✓ <b>${esc(title)}</b> נשמר בספריית הלימוד</p>
      <div class="learn-flow-toast-actions">
        <button type="button" class="btn gold" data-act="analyze">🔬 נתח עכשיו</button>
        <button type="button" class="btn secondary" data-act="library">📚 לספרייה</button>
        <button type="button" class="btn secondary" data-act="practice">🎸 תרגל דרומוס</button>
      </div>`);
    document.querySelector('.learn-flow-toast')?.addEventListener('click', e => {
      const act = e.target.closest('button')?.dataset?.act;
      if (!act) return;
      if (act === 'analyze') goAnalyze(videoId);
      else if (act === 'library') goLibrary();
      else if (act === 'practice') goPractice(videoId, title);
    });
  }

  function afterAnalyze(videoId, meta = {}) {
    markAnalyze(videoId);
    const dromos = meta.dromos || meta.key || '';
    _toast(`<p>✓ הניתוח הושלם${dromos ? ` · ${esc(dromos)}` : ''}</p>
      <div class="learn-flow-toast-actions">
        <button type="button" class="btn gold" data-act="playalong">▶ Play-along</button>
        <button type="button" class="btn secondary" data-act="path">🛤️ נתיב דרומוס</button>
        <button type="button" class="btn secondary" data-act="song">🎵 שיר בספרייה</button>
      </div>`);
    document.querySelector('.learn-flow-toast')?.addEventListener('click', e => {
      const act = e.target.closest('button')?.dataset?.act;
      if (!act) return;
      if (act === 'playalong') { /* user already on analyze tab */ }
      else if (act === 'path') goPractice(videoId);
      else if (act === 'song') goSongLibrary(videoId);
    });
  }

  function goLibrary() {
    markLibrary();
    document.querySelector('.nav-btn[data-screen="learn-lib"]')?.click();
  }

  function goAnalyze(videoId) {
    document.querySelector('.nav-btn[data-screen="learn"]')?.click();
    setTimeout(() => {
      if (typeof LearnHub !== 'undefined' && LearnHub.analyzeOffline) LearnHub.analyzeOffline(videoId);
      else if (typeof LearnLibrary !== 'undefined') {
        document.querySelector('.nav-btn[data-screen="learn-lib"]')?.click();
      }
      setStep('analyze');
    }, 150);
  }

  function goPractice(videoId, title) {
    markPractice('dromos');
    const song = typeof SongLibrary !== 'undefined' && SongLibrary.getAllSongs
      ? SongLibrary.getAllSongs().find(s => {
          const ref = SongLibrary.getSongReference?.(s);
          return ref?.youtubeId === videoId;
        })
      : null;
    if (song && typeof findPathForSong === 'function') {
      const path = findPathForSong(song);
      if (path) {
        document.querySelector('.nav-btn[data-screen="learn"]')?.click();
        setTimeout(() => {
          document.querySelector('.learn-tab[data-tab="paths"]')?.click();
          document.querySelector(`.learn-path-btn[data-path="${path.id}"]`)?.click();
        }, 200);
        return;
      }
    }
    document.querySelector('.nav-btn[data-screen="dromos-learn"]')?.click();
  }

  function goSongLibrary(videoId) {
    const song = typeof SongLibrary !== 'undefined' && SongLibrary.getAllSongs
      ? SongLibrary.getAllSongs().find(s => {
          const ref = SongLibrary.getSongReference?.(s);
          return ref?.youtubeId === videoId;
        })
      : null;
    if (song && SongLibrary.openSongById) {
      document.querySelector('.nav-btn[data-screen="songs"]')?.click();
      setTimeout(() => SongLibrary.openSongById(song.id), 100);
      markPractice('song');
    }
  }

  function mount(containerId = 'learn-flow-mount') {
    injectStyles();
    const host = document.getElementById(containerId);
    if (!host) return;
    host.innerHTML = '<div id="learn-flow-bar" class="learn-flow-bar"></div>';
    if (!_state().step) setStep('search');
    _renderBar();
  }

  return {
    mount, setStep, markDownload, markLibrary, markAnalyze, markPractice,
    afterDownload, afterAnalyze, goLibrary, goAnalyze, goPractice, goSongLibrary,
  };
})();
