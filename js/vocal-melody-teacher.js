/* ============================================================
   VocalMelodyTeacher — Φωνή→Bridge
   פיצ'ר ייחודי: מלודיה מהשירה + הרמוניה לבוזוקי
   ============================================================ */
'use strict';

const VocalMelodyTeacher = (() => {
  let _sourceBlob = null;
  let _vocalBlob = null;
  let _backingBlob = null;
  let _lastResult = null;
  let _meta = {};
  let _song = null;
  let _running = false;
  let _provider = 'lalal';
  let _skipStem = false;

  function $(s, r = document) { return r.querySelector(s); }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function navigate(screenId) {
    document.querySelector(`.nav-btn[data-screen="${screenId}"]`)?.click();
  }

  function findSongByYoutubeId(videoId) {
    if (!videoId || typeof SongLibrary === 'undefined') return null;
    return SongLibrary.getAllSongs().find(s => {
      const ref = SongLibrary.getSongReference(s);
      return ref && ref.youtubeId === videoId;
    }) || null;
  }

  function setStatus(msg, pct) {
    const s = $('#vmt-status');
    if (s) s.textContent = msg || '';
    const bar = $('#vmt-prog-fill');
    if (bar && typeof pct === 'number') bar.style.width = `${Math.min(100, pct)}%`;
    setStepHighlight(pct);
  }

  function setStepHighlight(pct) {
    const steps = document.querySelectorAll('.vmt-step');
    if (!steps.length || typeof pct !== 'number') return;
    const idx = pct < 25 ? 0 : pct < 50 ? 1 : pct < 75 ? 2 : 3;
    steps.forEach((el, i) => el.classList.toggle('on', i <= idx));
  }

  async function runVocalPipeline(blob, opts = {}) {
    if (typeof VocalHarmonyEngine === 'undefined' || !VocalHarmonyEngine.run) {
      throw new Error('מנוע Φωνή→Bridge לא זמין');
    }
    return VocalHarmonyEngine.run(blob, opts);
  }

  async function openLesson(result, meta = {}) {
    const { analysis, vocalBlob } = result;
    const song = meta.song || (meta.videoId ? findSongByYoutubeId(meta.videoId) : null);
    const title = meta.titleHe || meta.title || song?.titleGr || song?.title || 'Φωνή→Bridge';

    if (typeof SongTeacher !== 'undefined' && SongTeacher.loadVocalLesson) {
      SongTeacher.loadVocalLesson({
        analysis,
        title,
        song,
        vocalBlob,
        backingBlob: result.backingBlob,
        videoId: meta.videoId || '',
      });
      navigate('song-teacher');
      return;
    }
    if (typeof SongTeacher !== 'undefined' && SongTeacher.loadAnalysis) {
      SongTeacher.loadAnalysis(analysis);
      navigate('song-teacher');
    }
  }

  async function runFromBlob(blob, meta = {}) {
    if (_running) return;
    _running = true;
    _sourceBlob = blob;
    _meta = meta;
    _song = meta.song
      || (meta.videoId ? findSongByYoutubeId(meta.videoId) : null)
      || (meta.songId && typeof SongLibrary !== 'undefined'
        ? SongLibrary.getAllSongs().find(s => s.id === meta.songId)
        : null);
    const skipStem = meta.skipStem ?? _skipStem;
    const fileHint = meta.fileName || meta.title || '';
    const vocalOnly = meta.vocalOnly ?? skipStem ?? /vocal|vocals|voice|זמר|φων/i.test(fileHint);
    try {
      setStatus('Φωνή→Bridge מתחיל…', 2);
      const result = await runVocalPipeline(blob, {
        ...meta,
        song: _song,
        provider: meta.provider || _provider,
        skipStem,
        vocalOnly,
        onProgress: setStatus,
      });
      _vocalBlob = result.vocalBlob;
      _backingBlob = result.backingBlob;
      _lastResult = result;
      renderPreview(result);
      await openLesson(result, { ...meta, song: _song });
    } catch (e) {
      setStatus('שגיאה: ' + (e.message || e), 0);
      alert(e.message || String(e));
    } finally {
      _running = false;
    }
  }

  async function runFromLibrary(videoId, title) {
    if (!videoId || typeof LearnOffline === 'undefined') {
      alert('ספריית הלימוד לא זמינה');
      return;
    }
    navigate('vocal-melody');
    const rec = await LearnOffline.get(videoId);
    if (!rec?.blob) {
      setStatus('השיר לא נמצא — הורידו אותו קודם מ"למד מהשיר"', 0);
      alert('השיר לא נמצא בספרייה. הורידו אותו קודם מלמד מהשיר.');
      return;
    }
    await runFromBlob(rec.blob, {
      videoId,
      title: title || rec.title,
      titleHe: rec.titleHe || rec.title,
      songId: rec.songId,
      song: findSongByYoutubeId(videoId)
        || (rec.songId && typeof SongLibrary !== 'undefined'
          ? SongLibrary.getAllSongs().find(s => s.id === rec.songId)
          : null),
    });
  }

  async function runFromFile(file) {
    if (!file) return;
    navigate('vocal-melody');
    await runFromBlob(file, {
      title: file.name,
      fileName: file.name,
      skipStem: true,
      vocalOnly: true,
    });
  }

  function renderHarmonySources(meta) {
    if (!meta?.harmonySources?.length) return '';
    return `<p class="hint vmt-sources">מקורות הרמוניה: ${esc(meta.harmonySources.join(' · '))}</p>`;
  }

  function renderDromosBadge(dm) {
    if (!dm?.dromos) return '';
    return `<span class="vmt-dromos-badge">🛤️ ${esc(dm.dromos.nameHe)} (${esc(dm.rootName || '')}) · ${Math.round(dm.confidence || 0)}%</span>`;
  }

  function renderPreview(result) {
    const host = $('#vmt-preview');
    if (!host) return;
    const a = result.analysis;
    const vm = a.vocalMeta || {};
    host.hidden = false;
    host.innerHTML = `
      <div class="card vmt-result vmt-result-hero">
        <div class="vmt-badge">פיצ'ר ייחודי</div>
        <h3>✓ Φωνή→Bridge</h3>
        <p class="vmt-result-lead">מלודיה מהזמר + הרמוניה לבוזוקי — מוכן לשיעור</p>
        <div class="vmt-stats">
          <span><b>${vm.melodyNotes || a.tabNotes?.length || 0}</b> תווי מלודיה</span>
          <span><b>${vm.chordEvents || a.chords?.length || 0}</b> אקורדים</span>
          <span>BPM <b>${a.bpm || '—'}</b></span>
        </div>
        ${renderDromosBadge(a.dromosMatch)}
        ${renderHarmonySources(vm)}
        <p class="hint">עוברים לשיעור עם גריף, ליווי אקורדים ומילים…</p>
      </div>`;
  }

  async function populateLibrarySelect() {
    const sel = $('#vmt-library');
    if (!sel || typeof LearnOffline === 'undefined') return;
    const tracks = await LearnOffline.list();
    sel.innerHTML = '<option value="">— בחרו שיר מהספרייה —</option>'
      + tracks.map(t => `<option value="${esc(t.videoId)}">${esc(t.titleHe || t.title)}</option>`).join('');
  }

  function bindShell(root) {
    $('#vmt-file', root)?.addEventListener('change', e => {
      if (e.target.files?.[0]) runFromFile(e.target.files[0]);
    });

    $('#vmt-run-lib', root)?.addEventListener('click', async () => {
      const id = $('#vmt-library', root)?.value;
      if (!id) { alert('בחרו שיר מהספרייה'); return; }
      const opt = $('#vmt-library', root)?.selectedOptions?.[0];
      await runFromLibrary(id, opt?.textContent || '');
    });

    root.querySelectorAll('.vmt-provider').forEach(btn => {
      btn.addEventListener('click', () => {
        _provider = btn.dataset.p || 'lalal';
        root.querySelectorAll('.vmt-provider').forEach(b => b.classList.toggle('active', b === btn));
      });
    });

    const skip = $('#vmt-skip-stem', root);
    if (skip) skip.addEventListener('change', e => { _skipStem = e.target.checked; });

    $('#vmt-goto-learn', root)?.addEventListener('click', () => navigate('learn'));
    $('#vmt-goto-lib', root)?.addEventListener('click', () => navigate('learn-lib'));
  }

  function injectStyles() {
    if (document.getElementById('vmt-styles')) return;
    const s = document.createElement('style');
    s.id = 'vmt-styles';
    s.textContent = `
      .vmt-shell { display:flex; flex-direction:column; gap:14px; }
      .vmt-hero { border:1px solid rgba(227,179,65,.35); background:linear-gradient(135deg,rgba(227,179,65,.08),rgba(79,179,217,.06)); }
      .vmt-hero-title { font-size:22px; margin:0 0 8px; color:var(--gold-soft); }
      .vmt-hero-sub { font-size:15px; line-height:1.6; margin:0 0 12px; }
      .vmt-pill-row { display:flex; flex-wrap:wrap; gap:8px; margin:12px 0; }
      .vmt-pill { padding:6px 12px; border-radius:20px; font-size:12px; background:rgba(255,255,255,.05); border:1px solid var(--line); }
      .vmt-pill strong { color:var(--gold-soft); }
      .vmt-steps { display:flex; flex-wrap:wrap; gap:8px; margin:14px 0 4px; font-size:12px; color:var(--text-dim); }
      .vmt-step { padding:5px 12px; border-radius:20px; background:rgba(255,255,255,.04); border:1px solid var(--line,#333); transition:all .2s; }
      .vmt-step.on { border-color:var(--gold); color:var(--gold-soft); background:rgba(227,179,65,.1); }
      .vmt-row { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin:10px 0; }
      .vmt-select { flex:1; min-width:200px; padding:10px 12px; border-radius:8px; border:1px solid var(--line); background:var(--bg-elev); color:var(--text); }
      .vmt-result-hero { border-right:4px solid var(--gold); }
      .vmt-badge { display:inline-block; font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase;
        color:var(--gold); border:1px solid var(--gold); padding:3px 8px; border-radius:4px; margin-bottom:8px; }
      .vmt-result-lead { margin:0 0 10px; font-size:14px; }
      .vmt-stats { display:flex; flex-wrap:wrap; gap:14px 20px; margin:10px 0; font-size:14px; }
      .vmt-dromos-badge { display:inline-block; margin:6px 0; padding:4px 10px; border-radius:8px;
        background:rgba(79,179,217,.12); font-size:13px; }
      .vmt-sources { margin:6px 0 0; font-size:12px; }
      .vmt-provider.active { background:var(--aegean-deep); color:#fff; }
      .vmt-lib-tip { margin:0 0 10px; padding:8px 12px; border-radius:8px; background:rgba(227,179,65,.08); border:1px solid rgba(227,179,65,.25); }
    `;
    document.head.appendChild(s);
  }

  function renderShell() {
    const root = $('#vocal-melody-app');
    if (!root) return;
    injectStyles();
    root.innerHTML = `
      <div class="vmt-shell">
        <div class="card vmt-hero">
          <h2 class="vmt-hero-title">Φωνή→Bridge</h2>
          <p class="vmt-hero-sub">הפיצ'ר הייחודי של בוזוקי אקדמי: שומעים את הזמר, מחלצים את <b>קו המלודיה</b> מהקול, ובמקביל בונים את <b>ההרמוניה</b> לליווי על הבוזוקי — לפי הליווי, הדרומוס היווני, ומאגר השירים.</p>
          <div class="vmt-pill-row">
            <span class="vmt-pill"><strong>מלודיה</strong> — קול מבודד + תמלול</span>
            <span class="vmt-pill"><strong>הרמוניה</strong> — ליווי + Φωνή Bridge</span>
            <span class="vmt-pill"><strong>שיעור</strong> — גריף + אקורדים + מילים</span>
          </div>
          <div class="vmt-steps">
            <span class="vmt-step on">1 בידוד קול</span>
            <span class="vmt-step">2 מלודיה מהשירה</span>
            <span class="vmt-step">3 הרמוניה</span>
            <span class="vmt-step">4 שיעור בוזוקי</span>
          </div>
        </div>

        <div class="card">
          <h3 class="st-h" style="font-size:16px">מקור אודיו</h3>
          <p class="hint vmt-lib-tip"><b>הורדתם מהאפליקציה?</b> בחרו את השיר מהרשימה למטה — לא צריך להעלות קובץ שוב. (העלאת קובץ מהמחשב גם עובדת אחרי העדכון האחרון.)</p>
          <div class="vmt-row">
            <select id="vmt-library" class="vmt-select"></select>
            <button type="button" class="btn gold vmt-cta" id="vmt-run-lib">🎤 חלץ מלודיה + הרמוניה</button>
          </div>
          <div class="vmt-row">
            <input type="file" id="vmt-file" accept="audio/*,.m4a,.mp3,.wav">
            <span class="hint">או העלו קובץ מהמחשב (M4A/MP3 מההורדה)</span>
          </div>
          <div class="vmt-row">
            <button type="button" class="btn secondary" id="vmt-goto-learn">➕ הורד מ-YouTube</button>
            <button type="button" class="btn secondary" id="vmt-goto-lib">📚 ספריית לימוד</button>
          </div>
        </div>

        <div class="card">
          <h3 class="st-h" style="font-size:16px">איכות (stems)</h3>
          <p class="hint">עם stem-proxy: בידוד קול + ליווי נותנים את התוצאה הטובה ביותר. בלי proxy — מלודיה מהמיקס + הרמוניה מ-Φωνή Bridge.</p>
          <div class="vmt-row" style="font-size:13px;color:var(--text-dim)">
            <span>ספק:</span>
            <button type="button" class="btn small vmt-provider active" data-p="lalal">LALAL</button>
            <button type="button" class="btn small vmt-provider" data-p="moises">Moises</button>
          </div>
          <label class="st-toggle vmt-row">
            <input type="checkbox" id="vmt-skip-stem"> דלג על בידוד (מהיר — פחות מדויק)
          </label>
          <div class="st-prog"><div class="st-prog-bar"><div id="vmt-prog-fill"></div></div></div>
          <p id="vmt-status" class="st-status"></p>
        </div>

        <div id="vmt-preview" hidden></div>
      </div>`;
    bindShell(root);
    populateLibrarySelect();
  }

  function init() {
    renderShell();
  }

  function stop() {
    _running = false;
  }

  async function refresh() {
    await populateLibrarySelect();
  }

  return {
    init,
    stop,
    refresh,
    runFromLibrary,
    runFromFile,
    runFromBlob,
    runVocalPipeline,
    findSongByYoutubeId,
  };
})();
