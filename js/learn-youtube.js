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
  let _searchTitle = null;
  let _searchQuery = '';
  let _searchPage = 1;
  let _searchResults = [];
  let _searchHasMore = false;
  let _searchMeta = null;
  let _searchLoading = false;

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

  function _loadVideo(videoId, title) {
    if (!videoId) return;
    _currentVideoId = videoId;
    _searchTitle = title || null;
    _currentSong = _findSongByYoutubeId(videoId);
    const urlIn = document.getElementById('learn-url-input');
    if (urlIn) urlIn.value = `https://youtu.be/${videoId}`;
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

  function _openExternalYoutube(videoId) {
    const id = videoId || _currentVideoId || _extractYoutubeId(document.getElementById('learn-url-input')?.value);
    if (!id) {
      alert('הדביקו קישור YouTube או בחרו שיר');
      return;
    }
    window.open(`https://www.youtube.com/watch?v=${id}`, '_blank', 'noopener,noreferrer');
  }

  function _setDownloadStatus(msg, ok) {
    const el = document.getElementById('learn-download-status');
    if (!el) return;
    el.hidden = !msg;
    el.textContent = msg || '';
    el.classList.toggle('learn-dl-ok', !!ok);
    el.classList.toggle('learn-dl-err', ok === false);
  }

  async function _downloadForLearning(videoId, titleOverride) {
    const id = videoId || _currentVideoId || _extractYoutubeId(document.getElementById('learn-url-input')?.value);
    if (!id) {
      alert('בחרו סרטון מהחיפוש או מהרשימה');
      return;
    }
    if (typeof StemAPI === 'undefined' || !StemAPI.downloadForLearning) {
      alert('StemAPI לא נטען');
      return;
    }

    const btn = document.getElementById('learn-download-mp3');
    const title = titleOverride || _searchTitle || _currentSong?.titleHe || _currentSong?.title || id;
    if (btn) { btn.disabled = true; btn.textContent = '⏳ מוריד…'; }
    _setDownloadStatus('מתחיל הורדה…', null);

    try {
      await StemAPI.downloadForLearning(id, {
        title,
        titleHe: _currentSong?.titleHe || '',
        songId: _currentSong?.id || '',
        saveOffline: true,
        saveToDisk: true,
        onProgress: (msg, pct) => _setDownloadStatus(`${msg} (${pct}%)`, null),
      });
      _setDownloadStatus('✓ נשמר באפליקציה + הורד למכשיר — אפשר לנתח offline', true);
      _renderOfflineLibrary();
    } catch (e) {
      _setDownloadStatus(e.message || String(e), false);
      alert(e.message || String(e));
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📥 הורד MP3 ללימוד'; }
    }
  }

  async function _analyzeOfflineTrack(videoId) {
    if (typeof LearnOffline === 'undefined' || typeof SongAnalyzer === 'undefined') return;
    const rec = await LearnOffline.get(videoId);
    if (!rec?.blob) {
      alert('השיר לא נמצא בספרייה');
      return;
    }
    _pauseYoutube();
    _activeTab = 'analyze';
    _renderTabs();
    if (!document.getElementById('sa-file')) SongAnalyzer.render('learn-analyze-app');
    document.getElementById('sa-progress-wrap').style.display = '';
    try {
      await SongAnalyzer.runPipeline(rec.blob);
    } catch (e) {
      alert(e.message || String(e));
    }
  }

  async function _renderOfflineLibrary() {
    const list = document.getElementById('learn-offline-list');
    if (!list || typeof LearnOffline === 'undefined') return;
    const tracks = await LearnOffline.list();
    if (!tracks.length) {
      list.innerHTML = '<p class="hint">עדיין אין שירים שמורים. לחצו «הורד MP3 ללימוד» — דורש stem-proxy + yt-dlp.</p>';
      return;
    }
    list.innerHTML = tracks.map(t => `
      <div class="learn-offline-item" data-video="${_esc(t.videoId)}">
        <div class="learn-offline-meta">
          <strong>${_esc(t.titleHe || t.title)}</strong>
          <span class="hint">${_esc(t.videoId)} · ${LearnOffline.fmtSize(t.size)}</span>
        </div>
        <div class="learn-offline-actions">
          <button type="button" class="btn primary learn-offline-analyze" data-video="${_esc(t.videoId)}">🔬 נתח</button>
          <button type="button" class="btn secondary learn-offline-dl" data-video="${_esc(t.videoId)}">⬇ שמור שוב</button>
          <button type="button" class="btn secondary learn-offline-del" data-video="${_esc(t.videoId)}">🗑</button>
        </div>
      </div>`).join('');

    list.querySelectorAll('.learn-offline-analyze').forEach(btn => {
      btn.addEventListener('click', () => _analyzeOfflineTrack(btn.dataset.video));
    });
    list.querySelectorAll('.learn-offline-dl').forEach(btn => {
      btn.addEventListener('click', async () => {
        const rec = await LearnOffline.get(btn.dataset.video);
        if (rec?.blob && typeof StemAPI !== 'undefined') {
          const safe = String(rec.titleHe || rec.title).replace(/[^\w\u0590-\u05FF.-]+/g, '_').slice(0, 40);
          StemAPI.saveBlobAsFile(rec.blob, `${safe || rec.videoId}_${rec.videoId}.mp3`);
        }
      });
    });
    list.querySelectorAll('.learn-offline-del').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('למחוק את השיר מהספרייה?')) return;
        await LearnOffline.remove(btn.dataset.video);
        _renderOfflineLibrary();
      });
    });
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
          <button type="button" class="btn secondary learn-open-youtube">↗ פתח ב-YouTube</button>
          <button type="button" class="btn secondary learn-download-mp3">📥 הורד MP3 ללימוד</button>
          <button type="button" class="btn gold learn-analyze-video">🔬 נתח ב-AI (TAB + אקורדים)</button>
          <button type="button" class="btn primary learn-open-song" data-song="${song.id}">פתח בספריית שירים (אקורדים + גלילה)</button>
        </div>`;
    } else if (_currentVideoId) {
      html += `
        <div class="learn-card card">
          <h4>לא נמצא בספרייה</h4>
          <p>הדביקו קישור YouTube — נגן למטה. הורדה ללימוד דורשת stem-proxy + yt-dlp.</p>
          <div class="learn-actions">
            <button type="button" class="btn secondary learn-open-youtube">↗ פתח ב-YouTube</button>
            <button type="button" class="btn secondary learn-download-mp3">📥 הורד MP3 ללימוד</button>
            <button type="button" class="btn gold learn-analyze-video">🔬 נתח ב-AI</button>
          </div>
          <label class="learn-label">דרומוס משוער
            <select id="learn-manual-dromos" class="learn-select">
              ${DROMOI.map(d => `<option value="${d.id}">${d.nameHe}</option>`).join('')}
            </select>
          </label>
          <button type="button" class="btn secondary" id="learn-show-manual-path">הצג נתיב לימוד</button>
        </div>
        <div id="learn-manual-path-out"></div>`;
    } else {
      html += `<p class="hint">חפשו למעלה או בחרו שיר — הלימוד יכלול מודוס, פריטה, אקורדים ותרגילים.</p>`;
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
    panel.querySelectorAll('.learn-open-youtube').forEach(btn => {
      btn.addEventListener('click', () => _openExternalYoutube());
    });
    panel.querySelectorAll('.learn-download-mp3').forEach(btn => {
      btn.addEventListener('click', () => _downloadForLearning());
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

  async function _runYoutubeSearch(query, { append = false } = {}) {
    const grid = document.getElementById('learn-search-results');
    const status = document.getElementById('learn-search-status');
    if (!grid || typeof YoutubeSearch === 'undefined' || _searchLoading) return;
    const q = String(query || _searchQuery || '').trim();
    if (q.length < 2) return;

    _searchLoading = true;
    const nextPage = append ? _searchPage + 1 : 1;

    if (!append) {
      _searchQuery = q;
      _searchPage = 1;
      _searchResults = [];
      grid.innerHTML = '<p class="learn-search-loading">מחפש בספרייה וב-YouTube…</p>';
      if (status) status.textContent = 'מחפש…';
    } else {
      const btn = grid.querySelector('.learn-search-more');
      if (btn) { btn.disabled = true; btn.textContent = 'טוען…'; }
      if (status) status.textContent = `טוען עמוד ${nextPage}…`;
    }

    try {
      const meta = await YoutubeSearch.search(q, { page: nextPage });
      const { results, source, proxyOnline, localCount, needsRestart, hasMore } = meta;

      let fresh = [];
      if (append) {
        fresh = results.filter(v => !_searchResults.some(x => x.videoId === v.videoId));
        _searchResults = [..._searchResults, ...fresh];
        _searchPage = nextPage;
      } else {
        _searchResults = results;
        _searchPage = 1;
      }
      _searchHasMore = hasMore;
      _searchMeta = meta;

      if (status) {
        if (_searchResults.length) {
          const parts = [`${_searchResults.length} תוצאות`];
          if (!append && localCount) parts.push(`${localCount} מהספרייה`);
          if (source === 'ytdlp') parts.push('YouTube');
          else if (source === 'invidious') parts.push('YouTube');
          if (hasMore) parts.push('יש עוד — לחצו למטה');
          status.textContent = parts.join(' · ');
        } else if (needsRestart) {
          status.textContent = 'הפעילו מחדש את stem-proxy לחיפוש YouTube מלא (ראו הוראות למטה)';
        } else if (!proxyOnline) {
          status.textContent = 'stem-proxy לא פעיל — הפעילו אותו לחיפוש מלא (ראו הוראות למטה)';
        } else {
          status.textContent = 'לא נמצאו תוצאות — נסו מילים אחרות';
        }
      }

      _updateProxyBanner(proxyOnline, needsRestart);

      const gridOpts = {
        activeId: _currentVideoId,
        meta: append ? null : meta,
        hasMore: _searchHasMore,
        append,
        onLoadMore: () => _runYoutubeSearch(_searchQuery, { append: true }),
        onSelect: (id, title) => {
          _loadVideo(id, title);
          document.getElementById('learn-yt-host')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        },
        onDownload: (id, title) => _downloadForLearning(id, title),
      };

      if (append) {
        YoutubeSearch.renderGrid(grid, fresh, gridOpts);
      } else {
        YoutubeSearch.renderGrid(grid, _searchResults, gridOpts);
      }
    } finally {
      _searchLoading = false;
    }
  }

  async function _updateProxyBanner(online, needsRestart) {
    const el = document.getElementById('learn-proxy-banner');
    if (!el) return;
    if (online && !needsRestart) {
      el.hidden = true;
      return;
    }
    const url = typeof YoutubeSearch !== 'undefined' ? YoutubeSearch.getProxyUrl() : 'http://127.0.0.1:3456';
    el.hidden = false;
    if (needsRestart) {
      el.innerHTML = `
        <span>🔄 <b>stem-proxy דורש הפעלה מחדש</b> — עצרו (Ctrl+C) והריצו שוב ב-<code>tools\\stem-proxy</code></span>
        <code class="learn-proxy-cmd">npm start</code>`;
    } else {
      el.innerHTML = `
        <span>⚙️ <b>stem-proxy לא פעיל</b> — חיפוש YouTube מלא והורדת MP3 דורשים את השרת המקומי (${url})</span>
        <code class="learn-proxy-cmd">cd tools\\stem-proxy &amp;&amp; npm start</code>`;
    }
  }

  async function _checkProxyOnInit() {
    if (typeof YoutubeSearch === 'undefined') return;
    const health = await YoutubeSearch.checkProxy();
    let needsRestart = false;
    if (health.online) {
      try {
        const r = await fetch(`${YoutubeSearch.getProxyUrl()}/api/youtube-search?q=test`, { signal: AbortSignal.timeout(3000) });
        needsRestart = r.status === 404;
      } catch { /* noop */ }
    }
    _updateProxyBanner(health.online, needsRestart);
  }

  function _injectLearnStyles() {
    if (document.getElementById('learn-yt-search-styles')) return;
    const s = document.createElement('style');
    s.id = 'learn-yt-search-styles';
    s.textContent = `
      .learn-yt-browse { display:grid; grid-template-columns:minmax(280px,38%) 1fr; gap:14px; align-items:start; }
      @media (max-width:900px) { .learn-yt-browse { grid-template-columns:1fr; } }
      .learn-yt-search-form { display:flex; gap:8px; margin-bottom:8px; }
      .learn-yt-search-input { flex:1; background:var(--bg-elev,#222); border:1px solid var(--line,#444); border-radius:24px; padding:12px 18px; color:var(--text,#eee); font-size:15px; }
      .learn-yt-search-input:focus { outline:none; border-color:var(--gold,#e3b341); }
      .learn-search-results { display:flex; flex-direction:column; gap:10px; max-height:min(72vh,720px); overflow-y:auto; padding-left:2px; }
      .learn-search-loading,.learn-search-empty { text-align:center; color:var(--text-dim,#999); font-size:13px; padding:24px 8px; }
      .learn-search-status { font-size:12px; color:var(--text-dim,#999); margin:0 0 8px; }
      .learn-yt-card { display:flex; gap:10px; padding:8px; border-radius:10px; cursor:pointer; transition:background .15s; border:1px solid transparent; }
      .learn-yt-card:hover { background:var(--bg-elev,#222); }
      .learn-yt-card.active { background:rgba(227,179,65,.08); border-color:var(--gold,#e3b341); }
      .learn-yt-card-thumb-wrap { position:relative; flex-shrink:0; width:168px; }
      .learn-yt-card-thumb { width:168px; aspect-ratio:16/9; object-fit:cover; border-radius:8px; background:#111; display:block; }
      .learn-yt-card-dur { position:absolute; bottom:6px; right:6px; background:rgba(0,0,0,.82); color:#fff; font-size:11px; padding:2px 6px; border-radius:4px; font-weight:700; }
      .learn-yt-card-dl { position:absolute; top:6px; left:6px; width:32px; height:32px; border-radius:50%; border:none; background:rgba(0,0,0,.7); cursor:pointer; font-size:14px; opacity:0; transition:opacity .15s; }
      .learn-yt-card:hover .learn-yt-card-dl,.learn-yt-card-dl:focus { opacity:1; }
      .learn-yt-card-body { min-width:0; flex:1; padding-top:2px; }
      .learn-yt-card-title { margin:0 0 4px; font-size:14px; font-weight:600; color:var(--text,#eee); line-height:1.35; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
      .learn-yt-card-meta { margin:0; font-size:12px; color:var(--text-dim,#999); }
      .learn-yt-card-badge { position:absolute; top:6px; right:6px; background:rgba(79,179,217,.9); color:#0b1623; font-size:9px; padding:2px 6px; border-radius:4px; font-weight:700; }
      .learn-proxy-banner { display:flex; flex-wrap:wrap; align-items:center; gap:10px; padding:10px 14px; margin-bottom:10px; background:rgba(217,100,89,.12); border:1px solid rgba(217,100,89,.35); border-radius:10px; font-size:13px; }
      .learn-proxy-cmd { background:var(--bg-elev,#222); padding:4px 8px; border-radius:6px; font-size:12px; direction:ltr; }
      .learn-search-help { padding:14px; margin:8px 0; background:var(--bg-elev,#222); border-radius:10px; border-right:3px solid var(--gold,#e3b341); }
      .learn-search-help-steps { margin:8px 0; padding-right:20px; font-size:13px; line-height:1.7; }
      .learn-search-help code { background:var(--bg-card,#1a1a2e); padding:2px 6px; border-radius:4px; font-size:12px; direction:ltr; display:inline-block; }
      .learn-search-more-wrap { grid-column:1/-1; text-align:center; padding:12px 0 4px; }
      .learn-search-more { width:100%; max-width:280px; }
      .learn-url-advanced { margin-top:12px; padding-top:12px; border-top:1px solid var(--line,#333); }
      .learn-url-advanced summary { cursor:pointer; font-size:13px; color:var(--text-dim,#999); }
    `;
    document.head.appendChild(s);
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
          <li><strong>הורדה ללימוד:</strong> «הורד MP3 ללימוד» — דורש stem-proxy + yt-dlp במחשב. השיר נשמר באפליקציה (IndexedDB) + קובץ במכשיר. לשימוש אישי ללימוד בלבד.</li>
          <li>אפשר גם להעלות MP3 מ-YMusic / Moises ידנית בטאב «ניתוח AI».</li>
        </ol>
      </details>

      <div class="learn-tabs">
        <button type="button" class="learn-tab active" data-tab="youtube">▶ YouTube</button>
        <button type="button" class="learn-tab" data-tab="analyze">🔬 ניתוח AI</button>
        <button type="button" class="learn-tab" data-tab="paths">🛤️ נתיבי דרומוס</button>
        <button type="button" class="learn-tab" data-tab="resources">🌐 משאבי רשת</button>
      </div>

      <div class="learn-tab-panel active" data-panel="youtube">
        <div id="learn-proxy-banner" class="learn-proxy-banner" hidden></div>
        <div class="learn-yt-search-wrap card">
          <form class="learn-yt-search-form" id="learn-yt-search-form">
            <input type="search" id="learn-yt-search-input" class="learn-yt-search-input"
              placeholder="חפשו כמו ב-YouTube — Misirlou bouzouki, Τσιτσάνης, ζεϊμπέκικο…" autocomplete="off" />
            <button type="submit" class="btn gold">🔍 חיפוש</button>
          </form>
          <p class="hint">לחצו על סרטון לנגן · 📥 על התמונה להורדה ישירה (ללא העתקת קישור)</p>
        </div>

        <div class="learn-yt-browse">
          <div class="learn-yt-results-col card">
            <p id="learn-search-status" class="learn-search-status">הקלידו וחפשו — או בחרו מהספרייה למטה</p>
            <div id="learn-search-results" class="learn-search-results">
              <p class="learn-search-empty">תוצאות החיפוש יופיעו כאן בסגנון YouTube</p>
            </div>
            <details class="learn-url-advanced">
              <summary>קישור ידני / ספריית שירים</summary>
              <div class="learn-url-row" style="margin-top:10px">
                <label for="learn-url-input">קישור YouTube</label>
                <div class="learn-url-inputs">
                  <input id="learn-url-input" type="url" placeholder="https://youtube.com/watch?v=..." dir="ltr" />
                  <button type="button" class="btn primary" id="learn-url-load">טען</button>
                </div>
                <label for="learn-song-select">או מהספרייה</label>
                <select id="learn-song-select" class="learn-select"></select>
              </div>
            </details>
            <div id="learn-panel" class="learn-panel" style="margin-top:12px"></div>
            <div class="learn-offline card" id="learn-offline-card" style="margin-top:12px">
              <h4>📥 ספריית לימוד — שירים שמורים</h4>
              <p class="hint learn-offline-note">הורדה אישית ללימוד בלבד · stem-proxy + yt-dlp</p>
              <div id="learn-offline-list"></div>
            </div>
          </div>

          <div class="learn-yt-main card">
            <div class="learn-yt-toolbar">
              <span>מהירות:</span>
              <button type="button" class="learn-speed-btn" data-rate="0.5">0.5×</button>
              <button type="button" class="learn-speed-btn active" data-rate="0.75">0.75×</button>
              <button type="button" class="learn-speed-btn" data-rate="1">1×</button>
              <button type="button" class="btn secondary" id="learn-open-youtube">↗ YouTube</button>
              <button type="button" class="btn secondary" id="learn-download-mp3">📥 הורד MP3 ללימוד</button>
              <button type="button" class="btn gold" id="learn-analyze-video">🔬 נתח ב-AI</button>
            </div>
            <p id="learn-download-status" class="hint learn-download-status" hidden></p>
            <div id="learn-yt-host" class="learn-yt-host">
              <p class="hint learn-yt-placeholder">בחרו סרטון מהחיפוש — הנגן יופיע כאן</p>
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
    document.getElementById('learn-open-youtube')?.addEventListener('click', () => _openExternalYoutube());
    document.getElementById('learn-download-mp3')?.addEventListener('click', () => _downloadForLearning());

    document.getElementById('learn-url-load').addEventListener('click', () => {
      const id = _extractYoutubeId(document.getElementById('learn-url-input').value);
      if (id) _loadVideo(id);
    });
    document.getElementById('learn-url-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') document.getElementById('learn-url-load').click();
    });
    document.getElementById('learn-yt-search-form')?.addEventListener('submit', e => {
      e.preventDefault();
      const q = document.getElementById('learn-yt-search-input')?.value;
      if (q?.trim()) _runYoutubeSearch(q.trim());
    });
    document.getElementById('learn-song-select').addEventListener('change', e => {
      const id = e.target.value;
      if (id) {
        const opt = e.target.selectedOptions[0];
        const title = opt?.textContent?.replace(/^\s*⭐\s*/, '').trim();
        document.getElementById('learn-url-input').value = 'https://youtu.be/' + id;
        _loadVideo(id, title);
      }
    });
    document.querySelectorAll('.learn-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => _setPlaybackRate(parseFloat(btn.dataset.rate)));
    });

    _injectLearnStyles();
    _checkProxyOnInit();
    _renderSongPicker();
    _renderLearningPanel();
    _renderOfflineLibrary();
    if (typeof SongAnalyzer !== 'undefined') SongAnalyzer.render('learn-analyze-app');
  }

  function init() {
    _renderShell();
    _renderPathsTab();
    _renderResourcesTab();
  }

  return { init, stop, pausePlayback, pauseTabPlayback: _pauseTabPlayback, loadVideo: _loadVideo };
})();
