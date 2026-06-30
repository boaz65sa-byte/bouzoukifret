/* ============================================================
   VocalMelodyTeacher — שירה → מלודיה על בוזוקי
   מקור (YouTube / ספרייה / קובץ) → בידוד קול → Basic Pitch → שיעור
   ============================================================ */
'use strict';

const VocalMelodyTeacher = (() => {
  let _sourceBlob = null;
  let _vocalBlob = null;
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
  }

  /** ניקוי מלודיה מונופונית אחרי Basic Pitch על קול */
  function cleanMonophonicMelody(notes) {
    if (!notes?.length) return [];
    let sorted = notes.slice().sort((a, b) => a.time - b.time);
    sorted = sorted.filter(n => (n.duration || 0.2) >= 0.07);

    const merged = [];
    for (const n of sorted) {
      const last = merged[merged.length - 1];
      if (last && Math.abs((last.midi || 0) - (n.midi || 0)) <= 1
        && n.time - (last.time + (last.duration || 0.2)) < 0.14) {
        last.duration = Math.max(last.duration || 0.2, (n.time + (n.duration || 0.2)) - last.time);
        last.amp = Math.max(last.amp || 1, n.amp || 1);
      } else {
        merged.push({ ...n });
      }
    }

    const mono = [];
    for (const n of merged) {
      const end = n.time + (n.duration || 0.2);
      const clash = mono.findIndex(m => {
        const mEnd = m.time + (m.duration || 0.2);
        return n.time < mEnd && end > m.time;
      });
      if (clash < 0) mono.push({ ...n });
      else if ((n.amp || 1) >= (mono[clash].amp || 1)) mono[clash] = { ...n };
    }
    return mono;
  }

  async function decodeBlob(blob) {
    const buf = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await ctx.decodeAudioData(buf);
    try { ctx.close(); } catch { /* noop */ }
    return audioBuffer;
  }

  async function transcribeVocal(blob, onProgress) {
    const audioBuffer = await decodeBlob(blob);
    if (typeof BasicPitchEngine === 'undefined' || !BasicPitchEngine.transcribe) {
      throw new Error('מנוע Basic Pitch לא זמין');
    }
    const raw = await BasicPitchEngine.transcribe(audioBuffer, onProgress);
    const tabNotes = cleanMonophonicMelody(raw.tabNotes || []);
    return {
      bpm: raw.bpm || 0,
      chords: [], // מלודיית שירה בלבד — בלי אקורדים מהמיקס
      tabNotes,
      engine: 'basic-pitch-vocal',
    };
  }

  /**
   * @param {Blob} blob — קובץ מלא או vocal stem
   * @param {{ videoId?: string, title?: string, provider?: string, skipStem?: boolean, onProgress?: Function }} opts
   */
  async function runVocalPipeline(blob, opts = {}) {
    if (!blob) throw new Error('אין קובץ אודיו');
    const onProgress = (msg, pct) => {
      setStatus(msg, pct);
      opts.onProgress?.(msg, pct);
    };

    let vocalBlob = blob;
    const provider = opts.provider || _provider;
    const skipStem = opts.skipStem ?? _skipStem;

    if (!skipStem && typeof StemAPI !== 'undefined' && StemAPI.separateVocals) {
      onProgress('מבודדים את קול הזמר…', 8);
      try {
        const file = new File([blob], opts.title ? `${opts.title}.mp3` : 'song.mp3', { type: blob.type || 'audio/mpeg' });
        vocalBlob = await StemAPI.separateVocals(file, {
          provider,
          onProgress: (msg, pct) => onProgress(msg, Math.min(45, 8 + pct * 0.37)),
        });
        onProgress('קול הזמר מבודד — מתמללים מלודיה…', 48);
      } catch (e) {
        onProgress(`בידוד קול נכשל — ממשיכים על המיקס (${e.message || e})`, 12);
        vocalBlob = blob;
      }
    } else {
      onProgress(skipStem ? 'מתמללים ישירות (ללא בידוד קול)…' : 'מתמללים מלודיה…', 15);
    }

    const analysis = await transcribeVocal(vocalBlob, (msg, pct) => {
      onProgress(msg, 48 + pct * 0.5);
    });

    if (!analysis.tabNotes?.length) {
      throw new Error('לא זוהתה מלודיית שירה — נסו שיר עם קול ברור יותר או הפעילו stem-proxy');
    }

    onProgress(`מוכן — ${analysis.tabNotes.length} תווים מחולצו מהשירה`, 100);
    return { analysis, vocalBlob, sourceBlob: blob };
  }

  async function openLesson(result, meta = {}) {
    const { analysis, vocalBlob } = result;
    const song = meta.song || (meta.videoId ? findSongByYoutubeId(meta.videoId) : null);
    const title = meta.titleHe || meta.title || song?.titleGr || song?.title || 'שירה על בוזוקי';

    if (typeof SongTeacher !== 'undefined' && SongTeacher.loadVocalLesson) {
      SongTeacher.loadVocalLesson({
        analysis,
        title,
        song,
        vocalBlob,
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
    try {
      setStatus('מתחיל…', 2);
      const result = await runVocalPipeline(blob, {
        ...meta,
        provider: meta.provider || _provider,
        skipStem: meta.skipStem ?? _skipStem,
      });
      _vocalBlob = result.vocalBlob;
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
    await runFromBlob(file, { title: file.name });
  }

  function renderLyricsPreview(song) {
    if (!song?.sections?.length) {
      return '<p class="hint vmt-no-lyrics">אין מילים במאגר לשיר זה — תראו את המלודיה על הגריף בלבד.</p>';
    }
    const lines = [];
    song.sections.forEach(sec => {
      lines.push(`<div class="vmt-sec-name">[${esc(sec.name)}]</div>`);
      (sec.lines || []).forEach(line => {
        if (!line.lyrics) return;
        const greek = /[Ͱ-Ͽ]/.test(line.lyrics);
        lines.push(`<div class="vmt-lyric-line${greek ? ' vmt-greek' : ''}" dir="${greek ? 'ltr' : 'rtl'}">${esc(line.lyrics)}</div>`);
      });
    });
    return `<div class="vmt-lyrics card">${lines.join('')}</div>`;
  }

  function renderPreview(result) {
    const host = $('#vmt-preview');
    if (!host) return;
    const n = result.analysis.tabNotes.length;
    host.hidden = false;
    host.innerHTML = `
      <div class="card vmt-result">
        <h3>✓ מלודיה חולצה מהשירה</h3>
        <p><b>${n}</b> תווים · מנוע ${esc(result.analysis.engine)}</p>
        <p class="hint">עוברים לשיעור על הגריף…</p>
      </div>
      ${_song ? renderLyricsPreview(_song) : ''}`;
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
      .vmt-steps { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; font-size:12px; color:var(--text-dim); }
      .vmt-step { padding:4px 10px; border-radius:20px; background:rgba(255,255,255,.04); border:1px solid var(--line,#333); }
      .vmt-step.on { border-color:var(--gold); color:var(--gold-soft); }
      .vmt-row { display:flex; flex-wrap:wrap; gap:10px; align-items:center; margin:10px 0; }
      .vmt-select { flex:1; min-width:200px; padding:10px 12px; border-radius:8px; border:1px solid var(--line); background:var(--bg-elev); color:var(--text); }
      .vmt-lyrics { max-height:280px; overflow-y:auto; padding:14px; }
      .vmt-sec-name { font-size:11px; color:var(--gold); margin:12px 0 6px; font-weight:700; }
      .vmt-lyric-line { font-size:15px; line-height:1.65; margin:4px 0; padding:4px 8px; border-radius:6px; }
      .vmt-lyric-line.vmt-greek { font-family:Georgia,serif; text-align:left; }
      .vmt-greek { direction:ltr; }
      .vmt-result h3 { margin:0 0 8px; color:var(--gold-soft); }
      .vmt-provider.active { background:var(--aegean-deep); color:#fff; }
    `;
    document.head.appendChild(s);
  }

  function renderShell() {
    const root = $('#vocal-melody-app');
    if (!root) return;
    injectStyles();
    root.innerHTML = `
      <div class="vmt-shell">
        <div class="card">
          <h2 class="st-h">🎤 שירה על בוזוקי</h2>
          <p class="st-hint">שומעים את הזמר → מחלצים את המלודיה מהקול → לומדים לנגן על הגריף. עובד עם שירים מהספרייה, YouTube (אחרי הורדה), או קובץ MP3.</p>
          <div class="vmt-steps">
            <span class="vmt-step on">1 מקור</span>
            <span class="vmt-step on">2 בידוד קול</span>
            <span class="vmt-step on">3 תמלול</span>
            <span class="vmt-step on">4 גריף + מילים</span>
          </div>
          <p class="st-hint st-tip">💡 לתוצאה הטובה ביותר: הורידו את השיר לספרייה והפעילו <code>stem-proxy</code> עם מפתח LALAL או Moises.</p>
        </div>

        <div class="card">
          <h3 class="st-h" style="font-size:16px">מקור אודיו</h3>
          <div class="vmt-row">
            <input type="file" id="vmt-file" accept="audio/*">
            <span class="hint">או העלו MP3/WAV</span>
          </div>
          <div class="vmt-row">
            <select id="vmt-library" class="vmt-select"></select>
            <button type="button" class="btn gold" id="vmt-run-lib">🎤 חלץ מלודיה מהזמר</button>
          </div>
          <div class="vmt-row">
            <button type="button" class="btn secondary" id="vmt-goto-learn">➕ הורד מ-YouTube</button>
            <button type="button" class="btn secondary" id="vmt-goto-lib">📚 ספריית לימוד</button>
          </div>
        </div>

        <div class="card">
          <h3 class="st-h" style="font-size:16px">הגדרות</h3>
          <div class="vmt-row" style="font-size:13px;color:var(--text-dim)">
            <span>ספק stems:</span>
            <button type="button" class="btn small vmt-provider active" data-p="lalal">LALAL</button>
            <button type="button" class="btn small vmt-provider" data-p="moises">Moises</button>
          </div>
          <label class="st-toggle vmt-row">
            <input type="checkbox" id="vmt-skip-stem"> דלג על בידוד קול (מהיר, פחות מדויק)
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
