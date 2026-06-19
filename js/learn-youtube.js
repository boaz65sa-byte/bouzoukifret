/* ============================================================
   למד מהשיר — YouTube + נתיבי דרומוס + משאבי רשת
   ללא הורדת קבצים — נגינה ישירות מ-YouTube
   ============================================================ */
'use strict';

const LearnHub = (() => {
  let _ytPlayer = null;
  let _ytReady = false;
  let _pendingVideoId = null;
  let _currentSong = null;
  let _currentVideoId = null;
  let _activeTab = 'youtube';
  let _activePathId = 'zeibekiko';

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function _extractYoutubeId(input) {
    if (!input) return null;
    const s = String(input).trim();
    const m = s.match(/(?:v=|\/embed\/|youtu\.be\/|\/v\/)([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
    return null;
  }

  function _getSongRef(song) {
    if (typeof SongLibrary !== 'undefined' && SongLibrary.getSongReference) {
      return SongLibrary.getSongReference(song);
    }
    return null;
  }

  function _songsWithYoutube() {
    if (typeof SongLibrary === 'undefined') return [];
    return SongLibrary.getAllSongs().filter(s => _getSongRef(s));
  }

  function _findSongByYoutubeId(videoId) {
    return _songsWithYoutube().find(s => {
      const ref = _getSongRef(s);
      return ref && ref.youtubeId === videoId;
    }) || null;
  }

  function _navigate(screenId) {
    const btn = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
    if (btn) btn.click();
  }

  function _openExercise(exId) {
    if (typeof openExerciseById === 'function') openExerciseById(exId);
    else _navigate('exercises');
  }

  function _openSong(songId) {
    if (typeof SongLibrary !== 'undefined' && SongLibrary.openSongById) {
      SongLibrary.openSongById(songId);
    } else {
      _navigate('songs');
    }
  }

  function _openDromos(dromosId) {
    _navigate('dromoi');
    setTimeout(() => {
      const idx = DROMOI.findIndex(d => d.id === dromosId);
      const items = document.querySelectorAll('#dromoi-list .dromos-item');
      if (idx >= 0 && items[idx]) items[idx].click();
    }, 80);
  }

  function _openRhythm(rhythmId) {
    _navigate('rhythms');
    setTimeout(() => {
      const idx = RHYTHMS.findIndex(r => r.id === rhythmId);
      const tabs = document.querySelectorAll('#rhythm-tabs .rhythm-tab');
      if (idx >= 0 && tabs[idx]) tabs[idx].click();
    }, 80);
  }

  /* ---------- YouTube IFrame API ---------- */
  function _ensureYtApi() {
    if (window.YT && window.YT.Player) {
      _ytReady = true;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        _ytReady = true;
        if (typeof prev === 'function') prev();
        resolve();
      };
      if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    });
  }

  function _destroyPlayer() {
    if (_ytPlayer && _ytPlayer.destroy) {
      try { _ytPlayer.destroy(); } catch (_) { /* noop */ }
    }
    _ytPlayer = null;
    const host = document.getElementById('learn-yt-host');
    if (host) host.innerHTML = '';
  }

  function _loadVideo(videoId) {
    if (!videoId) return;
    _currentVideoId = videoId;
    _currentSong = _findSongByYoutubeId(videoId);
    _renderLearningPanel();
    _ensureYtApi().then(() => {
      const host = document.getElementById('learn-yt-host');
      if (!host) return;
      _destroyPlayer();
      host.innerHTML = '<div id="learn-yt-player"></div>';
      _ytPlayer = new YT.Player('learn-yt-player', {
        videoId,
        width: '100%',
        height: '100%',
        playerVars: {
          rel: 0,
          modestbranding: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (_pendingVideoId && _pendingVideoId !== videoId) {
              _ytPlayer.loadVideoById(_pendingVideoId);
              _pendingVideoId = null;
            }
          },
        },
      });
    });
  }

  async function _goAnalyzeVideo() {
    const id = _currentVideoId || _extractYoutubeId(document.getElementById('learn-url-input')?.value);
    if (!id) {
      alert('הדביקו קישור YouTube או טענו סרטון לפני הניתוח');
      return;
    }
    _pauseYoutube();
    _activeTab = 'analyze';
    _renderTabs();
    if (typeof SongAnalyzer !== 'undefined') {
      if (!document.getElementById('sa-youtube')) SongAnalyzer.render('learn-analyze-app');
      const ytIn = document.getElementById('sa-youtube');
      if (ytIn) ytIn.value = `https://youtu.be/${id}`;
      document.getElementById('sa-progress-wrap').style.display = '';
      try {
        await SongAnalyzer.runPipeline(`https://youtu.be/${id}`);
      } catch (e) {
        alert(e.message || String(e));
      }
    }
  }

  function _setPlaybackRate(rate) {
    if (_ytPlayer && _ytPlayer.setPlaybackRate) {
      try { _ytPlayer.setPlaybackRate(rate); } catch (_) { /* noop */ }
    }
    document.querySelectorAll('.learn-speed-btn').forEach(b => {
      b.classList.toggle('active', parseFloat(b.dataset.rate) === rate);
    });
  }

  function _pauseYoutube() {
    if (!_ytPlayer) return;
    try {
      if (typeof _ytPlayer.pauseVideo === 'function') _ytPlayer.pauseVideo();
      else if (typeof _ytPlayer.stopVideo === 'function') _ytPlayer.stopVideo();
    } catch (_) { /* noop */ }
  }

  function _pauseTabPlayback(tab) {
    if (tab === 'youtube') _pauseYoutube();
    if (tab === 'analyze' && typeof SongAnalyzer !== 'undefined' && SongAnalyzer.pausePlayback) {
      SongAnalyzer.pausePlayback();
    }
  }

  function stop() {
    _destroyPlayer();
    _currentSong = null;
    _currentVideoId = null;
    if (typeof SongAnalyzer !== 'undefined') SongAnalyzer.stop();
  }

  function pausePlayback() {
    _pauseYoutube();
    if (typeof SongAnalyzer !== 'undefined' && SongAnalyzer.pausePlayback) SongAnalyzer.pausePlayback();
  }

  /* ---------- רינדור פאנל לימוד ---------- */
  function _renderPeniaGrid(rhythm) {
    if (!rhythm) return '';
    const cells = rhythm.grid.map((g, i) => {
      const p = rhythm.penia[i] || '';
      const arrow = p === 'd' ? '↓' : p === 'u' ? '↑' : '·';
      const cls = g === 'D' ? 'learn-beat-strong' : g === 't' ? 'learn-beat-weak' : 'learn-beat-rest';
      return `<span class="learn-beat ${cls}" title="פעמה ${i + 1}">${arrow}</span>`;
    }).join('');
    return `<div class="learn-penia-row">${cells}</div>
      <p class="hint">${_esc(rhythm.meter)} · ${_esc(rhythm.grouping)} · ${_esc(rhythm.tip)}</p>`;
  }

  function _renderLearningPanel() {
    const panel = document.getElementById('learn-panel');
    if (!panel) return;

    const song = _currentSong;
    const path = song ? findPathForSong(song) : null;
    const dromosId = song ? dromosNameToId(song.dromos) : null;
    const dromos = dromosId ? DROMOI.find(d => d.id === dromosId) : null;
    let rhythmId = 'hasapiko';
    if (song) {
      if (song.style === 'zeibekiko' || song.timeSignature === '9/4') rhythmId = 'zeibekiko';
      else if (song.bouzoukiPattern) rhythmId = song.bouzoukiPattern;
    }
    const rhythm = getRhythmById(rhythmId);

    let html = '';

    if (song) {
      const ref = _getSongRef(song);
      html += `
        <div class="learn-match card">
          <h3>🎵 ${_esc(song.titleHe || song.title)}</h3>
          <p class="learn-meta">${_esc(song.artistHe || song.artist)} · ${_esc(song.dromos)} · ${song.key || ''} · ${song.bpm || '?'} BPM · ${song.timeSignature || ''}</p>
          ${ref ? `<p class="hint">${_esc(ref.label)}</p>` : ''}
        </div>`;

      if (dromos) {
        html += `
          <div class="learn-card card">
            <h4>🛤️ מודוס — ${_esc(dromos.nameHe)} (${_esc(dromos.nameGr)})</h4>
            <p>${_esc(dromos.desc)}</p>
            <p class="hint"><strong>דרגות:</strong> ${dromos.degrees} · <strong>אקורדים:</strong> ${dromos.chords}</p>
            <button type="button" class="btn secondary learn-go-dromos" data-dromos="${dromos.id}">פתח במסך דרומוסים</button>
          </div>`;
      }

      if (rhythm) {
        html += `
          <div class="learn-card card">
            <h4>🥁 מקצב ופריטה — ${_esc(rhythm.nameHe)}</h4>
            <p>${_esc(rhythm.desc)}</p>
            ${_renderPeniaGrid(rhythm)}
            <button type="button" class="btn secondary learn-go-rhythm" data-rhythm="${rhythm.id}">תרגל במסך מקצבים</button>
          </div>`;
      }

      const exIds = path ? path.steps.filter(s => s.kind === 'exercises').flatMap(s => s.exerciseIds || []) : ['zb1', 'zb2'];
      if (exIds.length) {
        html += `<div class="learn-card card"><h4>🎼 תרגילים מומלצים</h4><div class="learn-ex-btns">`;
        exIds.slice(0, 6).forEach(id => {
          const found = getExerciseById(id);
          if (found) {
            html += `<button type="button" class="btn secondary learn-go-ex" data-ex="${id}">${_esc(found.item.name)}</button>`;
          }
        });
        html += `</div></div>`;
      }

      html += `
        <div class="learn-actions">
          <button type="button" class="btn gold learn-analyze-video">🔬 נתח ב-AI (TAB + אקורדים)</button>
          <button type="button" class="btn primary learn-open-song" data-song="${song.id}">פתח בספריית שירים (אקורדים + גלילה)</button>
        </div>`;
    } else if (_currentVideoId) {
      html += `
        <div class="learn-card card">
          <h4>לא נמצא בספרייה</h4>
          <p>הדביקו קישור YouTube — נגן למטה. ניתוח AI דורש stem-proxy + yt-dlp.</p>
          <button type="button" class="btn gold learn-analyze-video">🔬 נתח ב-AI</button>
          <label class="learn-label">דרומוס משוער
            <select id="learn-manual-dromos" class="learn-select">
              ${DROMOI.map(d => `<option value="${d.id}">${d.nameHe}</option>`).join('')}
            </select>
          </label>
          <button type="button" class="btn secondary" id="learn-show-manual-path">הצג נתיב לימוד</button>
        </div>
        <div id="learn-manual-path-out"></div>`;
    } else {
      html += `<p class="hint">הדביקו קישור YouTube או בחרו שיר מהרשימה — הלימוד יכלול מודוס, פריטה, אקורדים ותרגילים.</p>`;
    }

    if (path) {
      html += `
        <div class="learn-card card learn-path-preview">
          <h4>📚 נתיב: ${_esc(path.titleHe)}</h4>
          <p>${_esc(path.intro)}</p>
          <button type="button" class="btn secondary" data-path-tab="${path.id}">צפה בנתיב המלא</button>
        </div>`;
    }

    panel.innerHTML = html;
    _bindPanelEvents();
  }

  function _bindPanelEvents() {
    const panel = document.getElementById('learn-panel');
    if (!panel) return;
    panel.querySelectorAll('.learn-analyze-video').forEach(btn => {
      btn.addEventListener('click', () => _goAnalyzeVideo());
    });
    panel.querySelectorAll('.learn-go-ex').forEach(btn => {
      btn.addEventListener('click', () => _openExercise(btn.dataset.ex));
    });
    panel.querySelectorAll('.learn-go-dromos').forEach(btn => {
      btn.addEventListener('click', () => _openDromos(btn.dataset.dromos));
    });
    panel.querySelectorAll('.learn-go-rhythm').forEach(btn => {
      btn.addEventListener('click', () => _openRhythm(btn.dataset.rhythm));
    });
    panel.querySelectorAll('.learn-open-song').forEach(btn => {
      btn.addEventListener('click', () => _openSong(btn.dataset.song));
    });
    panel.querySelectorAll('[data-path-tab]').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeTab = 'paths';
        _activePathId = btn.dataset.pathTab;
        _renderTabs();
        _renderPathsTab();
      });
    });
    const manualBtn = document.getElementById('learn-show-manual-path');
    if (manualBtn) {
      manualBtn.addEventListener('click', () => {
        const sel = document.getElementById('learn-manual-dromos');
        const path = sel ? findPathForDromos(sel.value) : null;
        const out = document.getElementById('learn-manual-path-out');
        if (out && path) out.innerHTML = _renderPathDetail(path);
        _bindPathEvents(out);
      });
    }
  }

  /* ---------- נתיבי דרומוס ---------- */
  function _renderStep(step, path) {
    switch (step.kind) {
      case 'theory':
        return `<div class="learn-step"><strong>${_esc(step.title)}</strong><p>${_esc(step.body)}</p></div>`;
      case 'rhythm': {
        const r = getRhythmById(step.rhythmId || path.rhythmId);
        return `<div class="learn-step">
          <strong>${_esc(step.title || r?.nameHe)}</strong>
          ${r ? `<p>${_esc(r.desc)}</p>${_renderPeniaGrid(r)}` : ''}
          <button type="button" class="btn secondary learn-go-rhythm" data-rhythm="${step.rhythmId || path.rhythmId}">מסך מקצבים</button>
        </div>`;
      }
      case 'dromos': {
        const d = DROMOI.find(x => x.id === step.dromosId);
        return `<div class="learn-step">
          <strong>${_esc(step.title || d?.nameHe)}</strong>
          ${d ? `<p>${_esc(d.tips)}</p>` : ''}
          <button type="button" class="btn secondary learn-go-dromos" data-dromos="${step.dromosId}">דרומוס</button>
          ${step.exerciseId ? `<button type="button" class="btn secondary learn-go-ex" data-ex="${step.exerciseId}">תרגיל</button>` : ''}
        </div>`;
      }
      case 'exercises':
        return `<div class="learn-step"><strong>${_esc(step.title)}</strong><div class="learn-ex-btns">${
          (step.exerciseIds || []).map(id => {
            const f = getExerciseById(id);
            return f ? `<button type="button" class="btn secondary learn-go-ex" data-ex="${id}">${_esc(f.item.name)}</button>` : '';
          }).join('')
        }</div></div>`;
      case 'chords':
        return `<div class="learn-step">
          <strong>${_esc(step.title)}</strong>
          <button type="button" class="btn secondary learn-go-ex" data-ex="${step.exerciseId}">תרגל אקורדים</button>
        </div>`;
      case 'songs':
        return `<div class="learn-step"><strong>${_esc(step.title)}</strong><div class="learn-song-chips">${
          (step.songIds || []).map(sid => {
            const s = SongLibrary?.getAllSongs?.().find(x => x.id === sid);
            if (!s) return '';
            return `<button type="button" class="learn-song-chip" data-video="${_getSongRef(s)?.youtubeId || ''}" data-song="${sid}">${_esc(s.titleHe || s.title)}</button>`;
          }).join('')
        }</div></div>`;
      default:
        return '';
    }
  }

  function _renderPathDetail(path) {
    const steps = path.steps.map(s => _renderStep(s, path)).join('');
    return `
      <div class="learn-path-detail card">
        ${path.featured ? `<span class="learn-badge">${path.badge || '⭐'}</span>` : ''}
        <h3>${_esc(path.titleHe)} <span class="gr">${_esc(path.titleGr)}</span></h3>
        <p>${_esc(path.intro)}</p>
        <div class="learn-steps">${steps}</div>
      </div>`;
  }

  function _bindPathEvents(root) {
    const el = root || document.getElementById('learn-paths-out');
    if (!el) return;
    el.querySelectorAll('.learn-go-ex').forEach(b => b.addEventListener('click', () => _openExercise(b.dataset.ex)));
    el.querySelectorAll('.learn-go-dromos').forEach(b => b.addEventListener('click', () => _openDromos(b.dataset.dromos)));
    el.querySelectorAll('.learn-go-rhythm').forEach(b => b.addEventListener('click', () => _openRhythm(b.dataset.rhythm)));
    el.querySelectorAll('.learn-song-chip').forEach(b => {
      b.addEventListener('click', () => {
        const vid = b.dataset.video;
        if (vid) {
          _activeTab = 'youtube';
          _renderTabs();
          document.getElementById('learn-url-input').value = 'https://youtu.be/' + vid;
          _loadVideo(vid);
        } else if (b.dataset.song) _openSong(b.dataset.song);
      });
    });
  }

  function _renderPathsTab() {
    const out = document.getElementById('learn-paths-out');
    const list = document.getElementById('learn-path-list');
    if (!list || !out) return;

    list.innerHTML = DROMOS_PATHS.map(p => `
      <button type="button" class="learn-path-btn${p.id === _activePathId ? ' active' : ''}${p.featured ? ' featured' : ''}" data-path="${p.id}">
        ${p.featured ? '⭐ ' : ''}${_esc(p.titleHe)}
      </button>`).join('');

    list.querySelectorAll('.learn-path-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _activePathId = btn.dataset.path;
        list.querySelectorAll('.learn-path-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const path = DROMOS_PATHS.find(p => p.id === _activePathId);
        out.innerHTML = path ? _renderPathDetail(path) : '';
        _bindPathEvents(out);
      });
    });

    const path = DROMOS_PATHS.find(p => p.id === _activePathId) || DROMOS_PATHS[0];
    out.innerHTML = path ? _renderPathDetail(path) : '';
    _bindPathEvents(out);
  }

  function _renderResourcesTab() {
    const out = document.getElementById('learn-resources-out');
    if (!out) return;
    const byCat = {};
    LEARNING_RESOURCES.forEach(r => {
      if (!byCat[r.category]) byCat[r.category] = [];
      byCat[r.category].push(r);
    });
    out.innerHTML = Object.entries(byCat).map(([cat, items]) => `
      <div class="learn-res-group card">
        <h3>${_esc(RESOURCE_CATEGORIES[cat] || cat)}</h3>
        ${items.map(r => `
          <a class="learn-res-link" href="${_esc(r.url)}" target="_blank" rel="noopener noreferrer">
            <strong>${_esc(r.titleHe)}</strong>
            <span class="learn-res-level">${_esc(r.level)}</span>
            <p>${_esc(r.desc)}</p>
          </a>`).join('')}
      </div>`).join('');
  }

  function _renderSongPicker() {
    const sel = document.getElementById('learn-song-select');
    if (!sel) return;
    const songs = _songsWithYoutube();
    const zeib = songs.filter(s => s.style === 'zeibekiko' || s.timeSignature === '9/4');
    const rest = songs.filter(s => !zeib.includes(s));
    const opts = [
      '<option value="">— בחר שיר מהספרייה —</option>',
      ...zeib.map(s => `<option value="${_getSongRef(s).youtubeId}" data-song="${s.id}">⭐ ${ _esc(s.titleHe || s.title)}</option>`),
      ...rest.map(s => `<option value="${_getSongRef(s).youtubeId}" data-song="${s.id}">${_esc(s.titleHe || s.title)}</option>`),
    ];
    sel.innerHTML = opts.join('');
  }

  function _renderTabs() {
    document.querySelectorAll('.learn-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === _activeTab);
    });
    document.querySelectorAll('.learn-tab-panel').forEach(p => {
      p.classList.toggle('active', p.dataset.panel === _activeTab);
    });
  }

  function _renderShell() {
    const root = document.getElementById('learn-hub-app');
    if (!root) return;
    root.innerHTML = `
      <details class="learn-setup card">
        <summary>⚙️ מדריך התקנה — YouTube, stems, ניתוח AI</summary>
        <ol>
          <li><strong>ניתוח בסיסי</strong> — העלאת MP3/WAV עובדת בדפדפן בלבד (Essentia.js).</li>
          <li><strong>config.js</strong> — העתיקו <code>config.example.js</code> ל-<code>config.js</code> והגדירו <code>stemProxyUrl: 'http://localhost:3456'</code>.</li>
          <li><strong>Stem proxy</strong> — בטרמינל: <code>cd tools/stem-proxy && npm install && npm start</code></li>
          <li><strong>YouTube</strong> — התקינו yt-dlp: <code>pip install yt-dlp</code> או <code>winget install yt-dlp</code></li>
          <li><strong>LALAL / Moises</strong> — הוסיפו מפתחות ב-<code>tools/stem-proxy/.env</code> (ראו <code>.env.example</code>).</li>
          <li>ריחוף על אקורד בכל האפליקציה → דיאגרמת fingering. בניתוח שיר: האטה עם שמירת pitch + זיהוי אקורד חי (Meyda).</li>
          <li><strong>ייצוא / ייבוא:</strong> אחרי ניתוח — JSON או TXT. אפשר לטעון JSON שמור (עם או בלי קובץ אודיו) בלי לרוץ שוב Essentia.</li>
          <li><strong>TAB poly:</strong> נקודות זהב ב-TAB = רמז polyphonic (עד 3 צלילים ב-onset).</li>
          <li><strong>Offline:</strong> לאחר ביקור אחד ב-HTTPS, האפליקציה + Essentia/Meyda נשמרים ב-cache (PWA). תג ● בסרגל = מוכן offline.</li>
        </ol>
      </details>

      <div class="learn-tabs">
        <button type="button" class="learn-tab active" data-tab="youtube">▶ YouTube</button>
        <button type="button" class="learn-tab" data-tab="analyze">🔬 ניתוח AI</button>
        <button type="button" class="learn-tab" data-tab="paths">🛤️ נתיבי דרומוס</button>
        <button type="button" class="learn-tab" data-tab="resources">🌐 משאבי רשת</button>
      </div>

      <div class="learn-tab-panel active" data-panel="youtube">
        <div class="learn-yt-layout">
          <div class="learn-yt-side">
            <div class="learn-url-row card">
              <label for="learn-url-input">קישור YouTube (ללא הורדה)</label>
              <div class="learn-url-inputs">
                <input id="learn-url-input" type="url" placeholder="https://youtube.com/watch?v=..." dir="ltr" />
                <button type="button" class="btn primary" id="learn-url-load">טען</button>
              </div>
              <label for="learn-song-select">או בחר מהספרייה</label>
              <select id="learn-song-select" class="learn-select"></select>
            </div>
            <div id="learn-panel" class="learn-panel"></div>
          </div>
          <div class="learn-yt-main card">
            <div class="learn-yt-toolbar">
              <span>מהירות:</span>
              <button type="button" class="learn-speed-btn" data-rate="0.5">0.5×</button>
              <button type="button" class="learn-speed-btn active" data-rate="0.75">0.75×</button>
              <button type="button" class="learn-speed-btn" data-rate="1">1×</button>
              <button type="button" class="btn gold" id="learn-analyze-video">🔬 נתח ב-AI</button>
            </div>
            <div id="learn-yt-host" class="learn-yt-host">
              <p class="hint learn-yt-placeholder">הדביקו קישור או בחרו שיר — הנגן יופיע כאן</p>
            </div>
          </div>
        </div>
      </div>

      <div class="learn-tab-panel" data-panel="analyze">
        <div id="learn-analyze-app"></div>
      </div>

      <div class="learn-tab-panel" data-panel="paths">
        <p class="lead learn-path-lead">כל שיר יווני = <strong>מודוס</strong> + <strong>אקורדים</strong> + <strong>פריטה</strong>. התחילו מ-<strong>ζεϊμπέκικο</strong> — הנתיב המלא ל-9/4.</p>
        <div class="learn-path-layout">
          <div id="learn-path-list" class="learn-path-list card"></div>
          <div id="learn-paths-out" class="learn-paths-out"></div>
        </div>
      </div>

      <div class="learn-tab-panel" data-panel="resources">
        <p class="lead">מקורות מקצועיים מהרשת — טכניקה, דרומוסים, אקורדים ותרבות הרבטיקו.</p>
        <div id="learn-resources-out" class="learn-resources-grid"></div>
      </div>
    `;

    document.querySelectorAll('.learn-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const prev = _activeTab;
        _activeTab = tab.dataset.tab;
        if (prev !== _activeTab) _pauseTabPlayback(prev);
        _renderTabs();
        if (_activeTab === 'paths') _renderPathsTab();
        if (_activeTab === 'resources') _renderResourcesTab();
        if (_activeTab === 'analyze' && typeof SongAnalyzer !== 'undefined' && !document.getElementById('sa-file')) {
          SongAnalyzer.render('learn-analyze-app');
        }
      });
    });

    document.getElementById('learn-analyze-video')?.addEventListener('click', () => _goAnalyzeVideo());

    document.getElementById('learn-url-load').addEventListener('click', () => {
      const id = _extractYoutubeId(document.getElementById('learn-url-input').value);
      if (id) _loadVideo(id);
    });
    document.getElementById('learn-url-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('learn-url-load').click();
    });
    document.getElementById('learn-song-select').addEventListener('change', e => {
      const id = e.target.value;
      if (id) {
        document.getElementById('learn-url-input').value = 'https://youtu.be/' + id;
        _loadVideo(id);
      }
    });
    document.querySelectorAll('.learn-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => _setPlaybackRate(parseFloat(btn.dataset.rate)));
    });

    _renderSongPicker();
    _renderLearningPanel();
    if (typeof SongAnalyzer !== 'undefined') SongAnalyzer.render('learn-analyze-app');
  }

  function init() {
    _renderShell();
    _renderPathsTab();
    _renderResourcesTab();
  }

  return { init, stop, pausePlayback, pauseTabPlayback: _pauseTabPlayback, loadVideo: _loadVideo };
})();
