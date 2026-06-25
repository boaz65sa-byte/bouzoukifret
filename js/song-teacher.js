/* ============================================================
   SongTeacher — "למד אותי את השיר"
   שיר (MP3/WAV) → AudioAnalyzer (מלודיה + הרמוניה) → מורה בוזוקי:
   הגריף מאיר כל תו מלודי בזמן, האקורד הנוכחי מוצג, נגן-איתי עם
   האטה, לולאה ונגינה מסונתזת של מלודיה + אקורדים.
   נשען על AudioAnalyzer, AudioEngine, drawFretboard, ChordTooltip.
   ============================================================ */
'use strict';

const SongTeacher = (() => {
  let _analysis = null;       // { bpm, chords:[{time,chord}], tabNotes:[{time,course,fret,midi,duration}] }
  let _melody = [];           // ממוין לפי time
  let _chords = [];           // ממוין לפי time
  let _duration = 0;
  let _fbSvg = null;
  let _raf = null;
  let _startCtxTime = 0;
  let _playing = false;
  let _speed = 1;
  let _withChords = true;
  let _loop = null;           // {a,b} בשניות (זמן מקורי) או null
  let _nextNoteIdx = 0;
  let _lastChordShown = -1;
  let _melCells = [];
  let _engine = 'essentia';   // 'essentia' | 'basicpitch'
  let _dromos = null;
  let _learnMode = 'da';
  let _posBase = 0;
  let _phrases = [];
  let _phraseIdx = 0;
  let _fbHost = null;
  let _rawMelody = [];
  const STR_LABELS = ['D', 'A', 'F', 'C'];

  /* ---------- עזרים ---------- */
  function $(s, r = document) { return r.querySelector(s); }
  function ensureAudio() { try { AudioEngine.ensureCtx(); } catch (_) {} }
  function now() { try { return AudioEngine.ctx.currentTime; } catch (_) { return 0; } }
  function fmt(t) { t = Math.max(0, t); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); }

  function dedupeChords(chords) {
    const out = [];
    let last = null;
    (chords || []).forEach(c => {
      const ch = String(c.chord || '').trim();
      if (!ch || ch === 'N') return;
      if (ch !== last) { out.push({ ...c, chord: ch }); last = ch; }
    });
    return out;
  }

  function chordProgression() {
    return dedupeChords(_chords).map(c => c.chord);
  }

  function applyMelodyLayout(raw, opts = {}) {
    if (typeof FretboardScale === 'undefined' || !FretboardScale.normalizeMelody) return raw;
    const norm = opts.auto
      ? FretboardScale.normalizeMelody(raw)
      : FretboardScale.normalizeMelody(raw, { mode: _learnMode, base: _posBase });
    _learnMode = norm.mode;
    _posBase = norm.base;
    return norm.notes;
  }

  function rebuildPhrases() {
    if (!_melody.length || typeof FretboardScale === 'undefined') {
      _phrases = _melody.length ? [_melody] : [];
      return;
    }
    _phrases = FretboardScale.splitPhrases(_melody, 0.38, 16);
    if (_phraseIdx >= _phrases.length) _phraseIdx = 0;
  }

  function phraseLabel() {
    if (!_phrases.length) return '';
    const p = _phrases[_phraseIdx] || [];
    return `משפט ${_phraseIdx + 1}/${_phrases.length} · ${p.length} תווים`;
  }

  function learnHint() {
    if (_learnMode === 'd') return 'מסלול על מיתר D (מיתר 1) בלבד — דו·דו·דו·רה·רה על אותו מיתר.';
    if (_learnMode === 'da') return 'מיתרים D+A (מיתרים 1–2) בלבד — מלודיה יוונית, בלי מיתרי בס C/F.';
    return `תיבת פוזיציה סריגים ${_posBase}–${_posBase + 4} על מיתרים D+A — היד באזור אחד.`;
  }
  function chordShape(name) {
    if (typeof CHORDS === 'undefined') return null;
    let key = name;
    if (typeof ChordTooltip !== 'undefined' && ChordTooltip.resolveKey) key = ChordTooltip.resolveKey(name) || name;
    return (CHORDS[key] && Array.isArray(CHORDS[key].shape)) ? CHORDS[key].shape : null;
  }

  /* ============================================================
     טעינה וניתוח
     ============================================================ */
  async function analyzeFile(file) {
    if (!file) return;
    setStatus('מפענח אודיו…', 5);
    try {
      const buf = await file.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await ctx.decodeAudioData(buf);
      try { ctx.close(); } catch (_) {}
      if (_engine === 'basicpitch' && typeof BasicPitchEngine !== 'undefined') {
        try {
          _analysis = await BasicPitchEngine.transcribe(audioBuffer, setStatus);
        } catch (ePitch) {
          setStatus('Basic Pitch נכשל — חוזר ל-Essentia… (' + (ePitch.message || ePitch) + ')', 10);
          _analysis = await AudioAnalyzer.analyze(audioBuffer, setStatus);
        }
      } else {
        if (typeof AudioAnalyzer === 'undefined' || !AudioAnalyzer.analyze) {
          setStatus('מנוע הניתוח לא זמין', 0); return;
        }
        _analysis = await AudioAnalyzer.analyze(audioBuffer, setStatus);
      }
      ingest(_analysis);
      setStatus('מוכן — לחצו ▶ ללמוד', 100);
      renderLesson();
    } catch (e) {
      setStatus('שגיאה בניתוח: ' + (e.message || e), 0);
    }
  }

  // קליטת ניתוח קיים (למשל מ-SongAnalyzer)
  function loadAnalysis(analysis) {
    if (!analysis) return;
    _analysis = analysis;
    ingest(analysis);
    renderLesson();
  }

  function ingest(a) {
    _rawMelody = (a.tabNotes || []).slice().sort((x, y) => x.time - y.time);
    _melody = applyMelodyLayout(_rawMelody, { auto: true });
    _chords = dedupeChords((a.chords || []).slice().sort((x, y) => x.time - y.time));
    if (typeof AudioAnalyzer !== 'undefined' && AudioAnalyzer.detectDromos) {
      _dromos = AudioAnalyzer.detectDromos(_chords, _melody);
    } else {
      _dromos = null;
    }
    rebuildPhrases();
    _phraseIdx = 0;
    const lastMel = _melody.length ? _melody[_melody.length - 1].time + (_melody[_melody.length - 1].duration || 0.3) : 0;
    const lastCh = _chords.length ? _chords[_chords.length - 1].time + 1 : 0;
    _duration = Math.max(lastMel, lastCh, 1);
    _loop = null;
    if (_analysis) {
      _analysis.tabNotes = _melody;
      _analysis.chords = _chords;
      _analysis.dromosMatch = _dromos;
    }
  }

  /* ============================================================
     מנוע נגינה — ציר זמן מסונכרן (rAF)
     ============================================================ */
  function play() {
    if (!_melody.length && !_chords.length) { setStatus('אין מה לנגן — נתחו שיר תחילה', 0); return; }
    ensureAudio();
    stop();
    _playing = true;
    _nextNoteIdx = firstIndexAt(_loop ? _loop.a : 0);
    _lastChordShown = -1;
    const startElapsed = _loop ? _loop.a : 0;
    _startCtxTime = now() - startElapsed / _speed;
    if (typeof registerPlayback === 'function') registerPlayback('song-teacher', stop);
    setPlayBtn(true);
    loop();
  }

  function firstIndexAt(t) {
    let i = 0;
    while (i < _melody.length && _melody[i].time < t) i++;
    return i;
  }

  function loop() {
    if (!_playing) return;
    const elapsed = (now() - _startCtxTime) * _speed; // זמן מקורי בשניות

    // לולאה / סיום
    const end = _loop ? _loop.b : _duration;
    if (elapsed >= end) {
      if (_loop || true) { // ברירת מחדל: חזרה מתחילת הלולאה/השיר
        const restart = _loop ? _loop.a : 0;
        _startCtxTime = now() - restart / _speed;
        _nextNoteIdx = firstIndexAt(restart);
        _lastChordShown = -1;
        clearActiveDots();
      }
    }

    // תווי מלודיה שהגיע זמנם
    while (_nextNoteIdx < _melody.length && _melody[_nextNoteIdx].time <= elapsed) {
      const n = _melody[_nextNoteIdx];
      if (!_loop || (n.time >= _loop.a && n.time <= _loop.b)) {
        ensurePhraseVisible(_nextNoteIdx);
        AudioEngine.pluckCourse(n.course, n.fret, 0, 0.6);
        flashDot(n.course, n.fret);
        highlightMelCell(_nextNoteIdx);
      }
      _nextNoteIdx++;
    }

    // אקורד נוכחי
    let ci = -1;
    for (let i = 0; i < _chords.length; i++) { if (_chords[i].time <= elapsed) ci = i; else break; }
    if (ci !== _lastChordShown) {
      _lastChordShown = ci;
      if (ci >= 0) {
        showChord(_chords[ci].chord);
        if (_withChords) {
          const sh = chordShape(_chords[ci].chord);
          if (sh) AudioEngine.strumChord(sh, 'd', 0, 0.32); // ליווי שקט
        }
      }
    }

    // קו זמן
    updateProgress(elapsed);
    _raf = requestAnimationFrame(loop);
  }

  function stop() {
    _playing = false;
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    clearActiveDots();
    setPlayBtn(false);
    if (typeof unregisterPlayback === 'function') unregisterPlayback('song-teacher');
  }

  function togglePlay() { _playing ? stop() : play(); }

  function phraseIndexForTime(t) {
    for (let i = 0; i < _phrases.length; i++) {
      const p = _phrases[i];
      if (!p.length) continue;
      const end = p[p.length - 1].time + (p[p.length - 1].duration || 0.3);
      if (t >= p[0].time - 0.05 && t <= end + 0.05) return i;
    }
    return _phraseIdx;
  }

  function ensurePhraseVisible(globalIdx) {
    const n = _melody[globalIdx];
    if (!n) return;
    const pi = phraseIndexForTime(n.time);
    if (pi !== _phraseIdx) {
      _phraseIdx = pi;
      renderFretboard();
      const lbl = $('#st-phrase-label');
      if (lbl) lbl.textContent = phraseLabel();
    }
  }

  /* ============================================================
     ויזואליה
     ============================================================ */
  function melodyPositions() {
    const set = {};
    const view = _phrases[_phraseIdx] || _melody;
    view.forEach((n, i) => {
      set[n.course + '-' + n.fret] = { ...n, step: i + 1 };
    });
    return set;
  }

  function renderFretboard() {
    const host = $('#st-fb-host');
    if (!host || !_melody.length) return;
    _fbHost = host;
    const phraseNotes = (_phrases[_phraseIdx] || _melody).slice();
    if (typeof FretboardScale !== 'undefined' && FretboardScale.mountMelodyLesson) {
      FretboardScale.mountMelodyLesson(host, {
        notes: phraseNotes,
        mode: _learnMode,
        base: _posBase,
        onBaseChange: b => {
          _posBase = b;
          _learnMode = 'box';
          if (FretboardScale.normalizeMelody) {
            _melody = FretboardScale.normalizeMelody(_rawMelody, { mode: 'box', base: b }).notes;
            rebuildPhrases();
          }
          renderFretboard();
        },
        onMount: res => { _fbSvg = res.svg; },
      });
      return;
    }
    _fbSvg = $('#st-fb');
    buildFretboardLegacy();
  }

  function buildFretboardLegacy() {
    if (!_fbSvg || typeof drawFretboard !== 'function') return;
    const set = melodyPositions();
    drawFretboard(_fbSvg, (ci, f) => {
      const n = set[ci + '-' + f];
      if (!n) return null;
      return { type: n.step === 1 ? 'root' : 'note', label: String(n.step || '') };
    });
  }

  function flashDot(course, fret) {
    if (!_fbSvg) return;
    _fbSvg.querySelectorAll('.st-active').forEach(d => d.classList.remove('st-active'));
    const dot = _fbSvg.querySelector(`.note-dot[data-course="${course}"][data-fret="${fret}"]`);
    if (dot) {
      dot.classList.add('st-active');
      const lbl = dot.querySelector('text');
      if (lbl) lbl.textContent = '▶';
      setTimeout(() => {
        dot.classList.remove('st-active');
        if (lbl) {
          const view = _phrases[_phraseIdx] || [];
          const idx = view.findIndex(n => n.course === course && n.fret === fret);
          if (idx >= 0) lbl.textContent = String(idx + 1);
        }
      }, 320);
    }
  }
  function clearActiveDots() {
    if (_fbSvg) _fbSvg.querySelectorAll('.st-active').forEach(d => d.classList.remove('st-active'));
    _melCells.forEach(c => c.classList.remove('st-cell-active'));
  }

  function showChord(name) {
    const big = $('#st-chord-name');
    const dia = $('#st-chord-dia');
    if (big) big.textContent = name || '—';
    if (dia && typeof ChordTooltip !== 'undefined' && ChordTooltip.renderInto) {
      ChordTooltip.renderInto(dia, name);
    }
  }

  function highlightMelCell(idx) {
    const cell = _melCells[idx];
    if (!cell) return;
    _melCells.forEach(c => c.classList.remove('st-cell-active'));
    cell.classList.add('st-cell-active');
    try { cell.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (_) {}
  }

  function updateProgress(elapsed) {
    const bar = $('#st-prog-fill2');
    const lbl = $('#st-prog-time');
    if (bar) bar.style.width = Math.min(100, (elapsed / _duration) * 100) + '%';
    if (lbl) lbl.textContent = fmt(elapsed) + ' / ' + fmt(_duration);
  }

  function setPlayBtn(on) {
    const b = $('#st-play');
    if (b) { b.textContent = on ? '⏸ עצור' : '▶ למד / נגן'; b.classList.toggle('playing', on); }
  }

  /* ============================================================
     מסך
     ============================================================ */
  function init() {
    const el = $('#song-teacher-app');
    if (!el) return;
    renderShell(el);
  }

  function renderShell(el) {
    el.innerHTML = `
      <div class="card st-load">
        <h2 class="st-h">למד אותי את השיר</h2>
        <p class="st-hint">העלו MP3/WAV — האפליקציה תחלץ <b>מלודיה</b> ו<b>אקורדים</b>, ותלמד אתכם לנגן: הגריף יאיר כל תו, האקורד יוצג, ותוכלו להאט וללופ.</p>
        <div class="st-load-row">
          <input type="file" id="st-file" accept="audio/*" placeholder="בחרו קובץ אודיו">
          <span id="st-status" class="st-status"></span>
        </div>
        <div class="st-load-row" style="gap:0; align-items:center;"><span style="color:var(--text-dim);font-size:12px;">או:</span></div>
        <div class="st-load-row">
          <input type="file" id="st-json" accept=".json" placeholder="או טענו ניתוח שמור (JSON)">
          <span style="color:var(--text-dim);font-size:12px;">טענו שיר שהורדתם</span>
        </div>
        <div class="st-load-row st-engine-row">
          <span>מנוע תמלול:</span>
          <button class="btn small st-engine active" data-e="essentia">Essentia (מהיר)</button>
          <button class="btn small st-engine" data-e="basicpitch">Basic Pitch · ML (מדויק, הורדת מודל)</button>
        </div>
        <div class="st-prog"><div class="st-prog-bar"><div id="st-prog-fill"></div></div></div>
        <p class="st-hint st-tip">💡 לדיוק מלודיה גבוה יותר — בודדו קודם את הכלי המוביל ב"ניתוח שיר" (stem separation), ואז העלו את הקובץ המבודד לכאן.</p>
      </div>
      <div id="st-lesson"></div>`;
    $('#st-file', el).addEventListener('change', e => { if (e.target.files[0]) analyzeFile(e.target.files[0]); });
    const jsonInput = $('#st-json', el);
    if (jsonInput) {
      jsonInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            if (data.chords && data.tabNotes) {
              loadAnalysis({ chords: data.chords, tabNotes: data.tabNotes, bpm: data.bpm, engine: data.engine });
              setStatus('הניתוח נטען בהצלחה', 100);
            } else throw new Error('פורמט JSON לא תקין');
          } catch (err) { setStatus('שגיאה בטעינה: ' + (err.message || err), 0); }
        };
        reader.readAsText(file);
      });
    }
    el.querySelectorAll('.st-engine').forEach(b => b.addEventListener('click', () => {
      _engine = b.dataset.e;
      el.querySelectorAll('.st-engine').forEach(x => x.classList.toggle('active', x === b));
    }));
  }

  function setStatus(msg, pct) {
    const s = $('#st-status');
    if (s) s.textContent = msg || '';
    if (typeof pct === 'number') { const f = $('#st-prog-fill'); if (f) f.style.width = pct + '%'; }
  }

  function renderLesson() {
    const host = $('#st-lesson');
    if (!host) return;
    const a = _analysis || {};
    const prog = chordProgression();
    const dromosName = _dromos?.dromos?.nameHe || '—';
    const dromosConf = _dromos?.confidence ? Math.round(_dromos.confidence) + '%' : '—';

    host.innerHTML = `
      <div class="card st-info">
        <span>BPM: <b>${a.bpm || '—'}</b></span>
        <span>תווי מלודיה: <b>${_melody.length}</b></span>
        <span>אקורדים: <b>${_chords.length}</b></span>
        <span>מנוע: <b>${a.engine || '—'}</b></span>
      </div>

      <div class="card st-harmony">
        <div class="st-harmony-row">
          <span class="st-harm-label">דרומוס (מודוס):</span>
          <strong class="st-dromos-name">${dromosName}</strong>
          <span class="hint">ביטחון ${dromosConf}</span>
        </div>
        <div class="st-harmony-row">
          <span class="st-harm-label">הרמוניה (מסלול אקורדים):</span>
          <div class="st-chord-prog">${prog.length ? prog.map(c => `<span class="st-chord-chip">${c}</span>`).join('') : '<span class="hint">לא זוהו</span>'}</div>
        </div>
        <p class="hint st-teach-hint">${learnHint()}</p>
      </div>

      <div class="card st-chordbox">
        <div class="st-chord-cur">
          <div class="st-chord-label">אקורד נוכחי</div>
          <div id="st-chord-name" class="st-chord-name">—</div>
        </div>
        <div id="st-chord-dia" class="st-chord-dia"></div>
      </div>

      <div class="card st-fbwrap">
        <div class="st-fb-title">מלודיה על הגריף — מספרים = סדר הנגינה בפוזיציה אחת</div>
        <div class="st-row st-phrase-nav">
          <button type="button" class="btn small secondary" id="st-phrase-prev" ${_phraseIdx <= 0 ? 'disabled' : ''}>◀ משפט קודם</button>
          <span id="st-phrase-label" class="st-phrase-label">${phraseLabel()}</span>
          <button type="button" class="btn small secondary" id="st-phrase-next" ${_phraseIdx >= _phrases.length - 1 ? 'disabled' : ''}>משפט הבא ▶</button>
        </div>
        <div class="st-row st-learn-modes">
          <button type="button" class="btn small st-learn-mode ${_learnMode === 'da' ? 'active' : ''}" data-m="da">מיתרים D+A (1–2)</button>
          <button type="button" class="btn small st-learn-mode ${_learnMode === 'd' ? 'active' : ''}" data-m="d">מיתר D בלבד</button>
          <button type="button" class="btn small st-learn-mode ${_learnMode === 'box' ? 'active' : ''}" data-m="box">תיבת פוזיציה</button>
        </div>
        <div id="st-fb-host" class="st-fb-scroll" dir="ltr"></div>
      </div>

      <div class="card st-melstrip-wrap">
        <div class="st-fb-title">מלודיה (תו · מיתר·סריג) — לחצו לשמוע</div>
        <div id="st-melstrip" class="st-melstrip"></div>
      </div>

      <div class="card st-transport">
        <button class="btn st-play" id="st-play">▶ למד / נגן</button>
        <div class="st-speeds">
          מהירות:
          <button class="btn small st-speed" data-s="0.5">×0.5</button>
          <button class="btn small st-speed" data-s="0.75">×0.75</button>
          <button class="btn small st-speed active" data-s="1">×1</button>
        </div>
        <label class="st-toggle"><input type="checkbox" id="st-withchords" checked> ליווי אקורדים</label>
        <button class="btn small" id="st-loop">🔁 לולאה: כבוי</button>
        <div class="st-prog"><div class="st-prog-bar"><div id="st-prog-fill2"></div></div><span id="st-prog-time" class="st-prog-time">0:00 / ${fmt(_duration)}</span></div>
      </div>

      <div class="card st-export">
        <div class="st-export-row">
          <b>הורד את השיר:</b>
          <button class="btn small" id="st-export-html">💾 כ-HTML (שיעור אופליין)</button>
          <button class="btn small" id="st-export-json">📋 כ-JSON (טעינה מחדש)</button>
        </div>
      </div>`;

    _fbSvg = null;
    renderFretboard();
    buildMelStrip();
    bindLesson(host);
  }

  function buildMelStrip() {
    const host = $('#st-melstrip');
    if (!host) return;
    host.innerHTML = '';
    _melCells = [];
    _melody.forEach((n, idx) => {
      const cell = document.createElement('div');
      cell.className = 'st-mel-cell';
      cell.dataset.idx = String(idx);
      const noteName = (typeof NOTE_NAMES !== 'undefined') ? NOTE_NAMES[n.midi % 12] : '';
      cell.innerHTML = `<span class="st-mel-note">${noteName}</span><span class="st-mel-pos">${STR_LABELS[n.course] || ''}·${n.fret}</span>`;
      cell.addEventListener('click', () => {
        ensureAudio();
        AudioEngine.pluckCourse(n.course, n.fret, 0, 0.6);
        flashDot(n.course, n.fret);
        highlightMelCell(idx);
      });
      host.appendChild(cell);
      _melCells.push(cell);
    });
  }

  /* ---------- ייצוא / הורדה ---------- */
  function exportAsJson() {
    if (!_analysis) { alert('אין לנתח תחילה'); return; }
    const data = {
      title: 'שיר',
      bpm: _analysis.bpm,
      engine: _analysis.engine,
      duration: _duration,
      chords: _chords,
      tabNotes: _melody,
      exportDate: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `שיר-${date}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  }

  function exportAsHtml() {
    if (!_analysis) { alert('אין לנתח תחילה'); return; }
    const sheet = buildStandaloneLesson();
    const html = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>שיר — בוזוקי</title>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
html,body{background:#eee;margin:0;padding:14px;font-family:'Heebo',sans-serif;}
.st-lesson{margin:0 auto;max-width:1000px;background:#fff;border-radius:8px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.st-info{display:flex;flex-wrap:wrap;gap:16px;padding:10px;color:#666;font-size:13px;margin-bottom:10px;border-bottom:1px solid #ddd;}
.st-info b{color:#d4a574;}
.st-fb-title{color:#666;font-size:13px;margin-bottom:8px;font-weight:600;}
.st-melstrip{display:flex;flex-direction:row-reverse;gap:5px;overflow-x:auto;padding:6px 0;}
.st-mel-cell{flex:0 0 auto;min-width:42px;text-align:center;background:rgba(255,255,255,0.04);border:1px solid rgba(143,166,188,0.2);border-radius:7px;padding:6px 4px;}
.st-mel-note{display:block;font-weight:800;color:#333;}
.st-mel-pos{display:block;font-size:10px;color:#999;font-family:monospace;}
svg.fretboard-svg{width:100%;max-width:700px;height:auto;margin:10px 0;}
.st-hint{color:#999;font-size:12px;margin-top:10px;}
@media print{html,body{background:#fff;padding:0;}svg{break-inside:avoid;}}
</style></head>
<body>
<div class="st-lesson">
  <h1 style="margin:0 0 10px;color:#d4a574;">שיר</h1>
  <div class="st-info">
    <span><b>BPM:</b> ${_analysis.bpm || '—'}</span>
    <span><b>תווי מלודיה:</b> ${_melody.length}</span>
    <span><b>אקורדים:</b> ${_chords.length}</span>
    <span><b>מנוע:</b> ${_analysis.engine || '—'}</span>
    <span><b>תאריך:</b> ${new Date().toLocaleDateString('he-IL')}</span>
  </div>
  <div class="st-fb-title">המלודיה על הגריף</div>
  ${_fbSvg ? _fbSvg.outerHTML : '<p style="color:#999;">גריף לא זמין</p>'}
  <div class="st-fb-title" style="margin-top:20px;">מלודיה (תו · מיתר)</div>
  <div class="st-melstrip">
    ${_melody.map(n => {
      const labels = ['D', 'A', 'F', 'C'];
      const noteName = (typeof NOTE_NAMES !== 'undefined') ? NOTE_NAMES[n.midi % 12] : '';
      return '<div class="st-mel-cell"><span class="st-mel-note">' + noteName + '</span><span class="st-mel-pos">' + (labels[n.course] || '') + '·' + n.fret + '</span></div>';
    }).join('')}
  </div>
  <p class="st-hint">שיר שהוריד מאפליקציית בוזוקי — <a href="https://bouzoukifret.web.app" style="color:#d4a574;">bouzoukifret.web.app</a></p>
</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `שיר-${date}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  }

  function buildStandaloneLesson() {
    // helper to get the SVG — will be used in exportAsHtml
    return '';
  }

  function bindLesson(host) {
    $('#st-play', host).addEventListener('click', togglePlay);
    $('#st-phrase-prev', host)?.addEventListener('click', () => {
      if (_phraseIdx > 0) { _phraseIdx--; renderFretboard(); $('#st-phrase-label').textContent = phraseLabel(); }
    });
    $('#st-phrase-next', host)?.addEventListener('click', () => {
      if (_phraseIdx < _phrases.length - 1) { _phraseIdx++; renderFretboard(); $('#st-phrase-label').textContent = phraseLabel(); }
    });
    host.querySelectorAll('.st-learn-mode').forEach(b => b.addEventListener('click', () => {
      _learnMode = b.dataset.m;
      if (typeof FretboardScale !== 'undefined' && FretboardScale.normalizeMelody) {
        if (_learnMode === 'box') {
          _posBase = FretboardScale.findBestBase(_rawMelody, 'box');
          _melody = FretboardScale.normalizeMelody(_rawMelody, { mode: 'box', base: _posBase }).notes;
        } else if (_learnMode === 'd') {
          _posBase = 0;
          _melody = FretboardScale.normalizeMelody(_rawMelody, { mode: 'd' }).notes;
        } else {
          _posBase = 0;
          _melody = FretboardScale.normalizeMelody(_rawMelody, { mode: 'da' }).notes;
        }
      }
      rebuildPhrases();
      _phraseIdx = 0;
      buildMelStrip();
      renderFretboard();
      host.querySelectorAll('.st-learn-mode').forEach(x => x.classList.toggle('active', x === b));
      const hint = host.querySelector('.st-teach-hint');
      if (hint) hint.textContent = learnHint();
      const lbl = $('#st-phrase-label');
      if (lbl) lbl.textContent = phraseLabel();
    }));
    host.querySelectorAll('.st-speed').forEach(b => b.addEventListener('click', () => {
      _speed = parseFloat(b.dataset.s);
      host.querySelectorAll('.st-speed').forEach(x => x.classList.toggle('active', x === b));
      if (_playing) { play(); } // הפעלה מחדש עם המהירות החדשה
    }));
    const wc = $('#st-withchords', host);
    if (wc) wc.addEventListener('change', e => { _withChords = e.target.checked; });
    const lp = $('#st-loop', host);
    if (lp) lp.addEventListener('click', () => {
      if (_loop) { _loop = null; lp.textContent = '🔁 לולאה: כבוי'; lp.classList.remove('active'); }
      else {
        // לולאה על 8 השניות הראשונות כברירת מחדל (ניתן להרחיב בהמשך)
        _loop = { a: 0, b: Math.min(8, _duration) };
        lp.textContent = `🔁 לולאה: 0:00–${fmt(_loop.b)}`;
        lp.classList.add('active');
      }
    });
    $('#st-export-html', host).addEventListener('click', exportAsHtml);
    $('#st-export-json', host).addEventListener('click', exportAsJson);
  }

  function stopAll() { stop(); }

  return { init, stop: stopAll, analyzeFile, loadAnalysis };
})();
