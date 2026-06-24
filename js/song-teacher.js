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

  /* ---------- עזרים ---------- */
  function $(s, r = document) { return r.querySelector(s); }
  function ensureAudio() { try { AudioEngine.ensureCtx(); } catch (_) {} }
  function now() { try { return AudioEngine.ctx.currentTime; } catch (_) { return 0; } }
  function fmt(t) { t = Math.max(0, t); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); }

  /* ---------- צורת אקורד לנגינה ---------- */
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
    _melody = (a.tabNotes || []).slice().sort((x, y) => x.time - y.time);
    _chords = (a.chords || []).slice().sort((x, y) => x.time - y.time);
    const lastMel = _melody.length ? _melody[_melody.length - 1].time + (_melody[_melody.length - 1].duration || 0.3) : 0;
    const lastCh = _chords.length ? _chords[_chords.length - 1].time + 1 : 0;
    _duration = Math.max(lastMel, lastCh, 1);
    _loop = null;
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

  /* ============================================================
     ויזואליה
     ============================================================ */
  function melodyPositions() {
    const set = {};
    _melody.forEach(n => { set[n.course + '-' + n.fret] = n; });
    return set;
  }

  function buildFretboard() {
    if (!_fbSvg || typeof drawFretboard !== 'function') return;
    const set = melodyPositions();
    drawFretboard(_fbSvg, (ci, f) => {
      const n = set[ci + '-' + f];
      if (!n) return null;
      return { type: 'note', label: (typeof NOTE_NAMES !== 'undefined') ? NOTE_NAMES[n.midi % 12] : '' };
    });
  }

  function flashDot(course, fret) {
    if (!_fbSvg) return;
    const dot = _fbSvg.querySelector(`.note-dot[data-course="${course}"][data-fret="${fret}"]`);
    if (dot) {
      dot.classList.add('st-active');
      setTimeout(() => dot.classList.remove('st-active'), 320);
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
          <input type="file" id="st-file" accept="audio/*">
          <span id="st-status" class="st-status"></span>
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
    host.innerHTML = `
      <div class="card st-info">
        <span>BPM: <b>${a.bpm || '—'}</b></span>
        <span>תווי מלודיה: <b>${_melody.length}</b></span>
        <span>אקורדים: <b>${_chords.length}</b></span>
        <span>מנוע: <b>${a.engine || '—'}</b></span>
      </div>

      <div class="card st-chordbox">
        <div class="st-chord-cur">
          <div class="st-chord-label">אקורד נוכחי</div>
          <div id="st-chord-name" class="st-chord-name">—</div>
        </div>
        <div id="st-chord-dia" class="st-chord-dia"></div>
      </div>

      <div class="card st-fbwrap">
        <div class="st-fb-title">המלודיה על הגריף — צפו בתו הנדלק ונגנו אחריו</div>
        <div class="st-fb-scroll"><svg id="st-fb" class="fretboard-svg" preserveAspectRatio="xMidYMid meet"></svg></div>
      </div>

      <div class="card st-melstrip-wrap">
        <div class="st-fb-title">מלודיה (תו · מיתר)</div>
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
      </div>`;

    _fbSvg = $('#st-fb');
    buildFretboard();
    buildMelStrip();
    bindLesson(host);
  }

  function buildMelStrip() {
    const host = $('#st-melstrip');
    if (!host) return;
    host.innerHTML = '';
    _melCells = [];
    const labels = ['D', 'A', 'F', 'C']; // course 0..3
    _melody.forEach((n) => {
      const cell = document.createElement('div');
      cell.className = 'st-mel-cell';
      const noteName = (typeof NOTE_NAMES !== 'undefined') ? NOTE_NAMES[n.midi % 12] : '';
      cell.innerHTML = `<span class="st-mel-note">${noteName}</span><span class="st-mel-pos">${labels[n.course] || ''}·${n.fret}</span>`;
      cell.addEventListener('click', () => { ensureAudio(); AudioEngine.pluckCourse(n.course, n.fret, 0, 0.6); flashDot(n.course, n.fret); });
      host.appendChild(cell);
      _melCells.push(cell);
    });
  }

  function bindLesson(host) {
    $('#st-play', host).addEventListener('click', togglePlay);
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
  }

  function stopAll() { stop(); }

  return { init, stop: stopAll, analyzeFile, loadAnalysis };
})();
