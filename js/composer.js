/* ============================================================
   Composer — "מלחין" — כלי הלחנה לבוזוקי: מזינים תווים (קליק על
   הגריף או הדבקת טאב-טקסט), מקבלים גם טאב וגם תווים אמיתיים על
   חמישייה (VexFlow, נטען מ-CDN בדיוק כמו Essentia.js הקיים) עם
   שם-התו מתחת לכל תו, ניגון, והדפסה/שמירה.
   שלב 1 בתוכנית שסוכמה עם המשתמש: מקור-נתונים משותף + VexFlow.
   ============================================================ */
'use strict';

const Composer = (() => {
  const STR_LABELS = ['D', 'A', 'F', 'C'];
  const EXAMPLE_TAB =
`BPM: 100
D: 0 0 4 5 7 5 4 0
A: . . . . . . . .
F: . . . . . . . .
C: . . . . . . . .`;
  const BEAT_DURATIONS = [
    { v: 0.25, label: '1/16' }, { v: 0.5, label: '1/8' }, { v: 0.75, label: '1/8.' },
    { v: 1, label: '1/4' }, { v: 1.5, label: '1/4.' }, { v: 2, label: '1/2' },
    { v: 3, label: '1/2.' }, { v: 4, label: '1 שלם' },
  ];
  const BEAT_TO_VEX = { 0.25: '16', 0.5: '8', 0.75: '8d', 1: 'q', 1.5: 'qd', 2: 'h', 3: 'hd', 4: 'w' };
  const PIANO_MIN = 48;  // C3 — תואם למיתר C פתוח (הכי-נמוך בבוזוקי)
  const PIANO_MAX = 77;  // F5 — בערך מיתר D בסריג 15 (הכי-גבוה)
  const PHRASE_KEY = 'bouzouki-composer-phrases-v1';

  let _Vex = null;
  let _loadingVex = null;
  let _notes = [];        // [{course,fret,midi,beats}]
  let _mode = 'click';     // 'click' | 'text' | 'piano' | 'listen' | 'import'
  let _course = 0;
  let _svg = null;
  let _playTimer = null;
  let _micStream = null;
  let _micCtx = null;
  let _micRunning = false;
  let _micLastMidi = null;

  function normPc(pc) { return ((pc % 12) + 12) % 12; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }

  /** ממיר MIDI לזוג מיתר/סריג בפועל על הבוזוקי — מעדיף המשך על אותו מיתר
   *  כמו התו הקודם (נגינה נוחה יותר), ואז את הסריג הנמוך ביותר האפשרי.
   *  זה החלק שהופך קלט "טהור" (קלידים/מיקרופון, שיודעים רק צליל) לקלט
   *  שמישהו יכול לנגן בפועל על הבוזוקי. */
  function pickCourseFretForMidi(midi) {
    const prev = _notes[_notes.length - 1];
    let best = null;
    let bestScore = Infinity;
    for (let ci = 0; ci < 4; ci++) {
      const fret = FretboardScale.fretFromMidi(ci, midi);
      if (fret == null) continue;
      const score = fret + (prev && ci === prev.course ? -3 : 0);
      if (score < bestScore) { bestScore = score; best = { ci, fret }; }
    }
    return best;
  }

  function addNoteFromMidi(midi, beats) {
    const pick = pickCourseFretForMidi(midi);
    if (!pick) return false;
    _notes.push({ course: pick.ci, fret: pick.fret, midi, beats });
    return true;
  }

  function loadVexFlow() {
    if (_Vex) return Promise.resolve(_Vex);
    if (_loadingVex) return _loadingVex;
    _loadingVex = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/cjs/vexflow.min.js';
      s.onload = () => {
        if (typeof VexFlow === 'undefined') { reject(new Error('VexFlow לא נטען')); return; }
        _Vex = VexFlow;
        resolve(_Vex);
      };
      s.onerror = () => reject(new Error('טעינת VexFlow מהרשת נכשלה — בדקו חיבור לאינטרנט'));
      document.head.appendChild(s);
    });
    return _loadingVex;
  }

  function beatsToVexDuration(beats) {
    if (BEAT_TO_VEX[beats]) return BEAT_TO_VEX[beats];
    const keys = Object.keys(BEAT_TO_VEX).map(Number);
    let best = keys[0], bestDiff = Infinity;
    keys.forEach(k => { const diff = Math.abs(k - beats); if (diff < bestDiff) { bestDiff = diff; best = k; } });
    return BEAT_TO_VEX[best];
  }

  function midiToVexKey(midi) {
    const names = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
    const pc = normPc(midi);
    const octave = Math.floor(midi / 12) - 1;
    return `${names[pc]}/${octave}`;
  }

  function midiToNoteName(midi) {
    return NOTE_NAMES[normPc(midi)];
  }

  /* ---------- רינדור חמישייה (VexFlow) ---------- */
  async function renderStaff(host) {
    if (!host) return;
    host.innerHTML = '<p class="hint">טוען מנוע תווים…</p>';
    let Vex;
    try {
      Vex = await loadVexFlow();
    } catch (e) {
      host.innerHTML = `<p class="hint" style="color:var(--danger,#e66);">שגיאה: ${esc(e.message || e)}</p>`;
      return;
    }
    host.innerHTML = '';
    if (!_notes.length) { host.innerHTML = '<p class="hint">הוסיפו תווים כדי לראות אותם על החמישייה.</p>'; return; }

    const { Renderer, Stave, StaveNote, Voice, Formatter, Annotation } = Vex;
    const perMeasure = 4; // 4/4
    const measures = [];
    let cur = [];
    let curBeats = 0;
    _notes.forEach(n => {
      if (curBeats + n.beats > perMeasure + 1e-9 && cur.length) { measures.push(cur); cur = []; curBeats = 0; }
      cur.push(n);
      curBeats += n.beats;
    });
    if (cur.length) measures.push(cur);

    const measuresPerRow = 4;
    const measureWidth = 190;
    const rows = Math.ceil(measures.length / measuresPerRow);
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(Math.min(measures.length, measuresPerRow) * measureWidth + 40, rows * 130 + 20);
    const ctx = renderer.getContext();

    measures.forEach((measure, mi) => {
      const row = Math.floor(mi / measuresPerRow);
      const col = mi % measuresPerRow;
      const x = 10 + col * measureWidth;
      const y = 10 + row * 130;
      const stave = new Stave(x, y, measureWidth);
      if (col === 0) stave.addClef('treble');
      if (mi === 0) stave.addTimeSignature('4/4');
      stave.setContext(ctx).draw();

      const staveNotes = measure.map(n => {
        const sn = new StaveNote({ keys: [midiToVexKey(n.midi)], duration: beatsToVexDuration(n.beats) });
        sn.addModifier(new Annotation(midiToNoteName(n.midi)).setPosition(Annotation.VerticalJustify.BOTTOM), 0);
        return sn;
      });
      const totalBeats = measure.reduce((s, n) => s + n.beats, 0);
      const voice = new Voice({ numBeats: Math.max(totalBeats, 0.25), beatValue: 4 }).setStrict(false);
      voice.addTickables(staveNotes);
      new Formatter().joinVoices([voice]).format([voice], measureWidth - 40);
      voice.draw(ctx, stave);
    });
  }

  /* ---------- רינדור טאב + רשימת תווים ---------- */
  function ensureSvg(host) {
    let svg = host.querySelector('svg.fretboard');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('fretboard', 'fs-neck-board');
      svg.setAttribute('dir', 'ltr');
      host.innerHTML = '';
      host.appendChild(svg);
    }
    return svg;
  }

  function drawContextBoard() {
    if (!_svg || typeof drawFretboard !== 'function') return;
    const pathMap = new Map(_notes.map((n, i) => [`${n.course}-${n.fret}`, { ...n, idx: i }]));
    drawFretboard(_svg, (ci, f, midi) => {
      const onPath = pathMap.get(`${ci}-${f}`);
      if (onPath) return { type: 'root', label: String(onPath.idx + 1) };
      return null;
    });
    if (_notes.length) FretboardScale.drawPathOverlay(_svg, _notes.map(n => ({ ci: n.course, fret: n.fret, midi: n.midi })), '#7fd1ff');
  }

  function renderNoteList(host) {
    if (!_notes.length) { host.innerHTML = '<p class="hint">עדיין אין תווים.</p>'; return; }
    host.innerHTML = _notes.map((n, i) => `
      <span class="duet-note-chip" data-i="${i}" style="display:inline-block;padding:3px 8px;margin:2px;border-radius:6px;background:var(--card-bg,#2a2a2a);">
        ${i + 1}. ${STR_LABELS[n.course]}·${n.fret} (${midiToNoteName(n.midi)}) — ${BEAT_DURATIONS.find(d => d.v === n.beats)?.label || n.beats}
        <button type="button" class="composer-del" data-i="${i}" title="הסר" style="border:none;background:none;color:inherit;cursor:pointer;">✕</button>
      </span>`).join('');
    host.querySelectorAll('.composer-del').forEach(b => b.addEventListener('click', () => {
      _notes.splice(parseInt(b.dataset.i, 10), 1);
      rerenderAll();
    }));
  }

  function setChipActive(host, i, active) {
    const chip = host?.querySelector(`[data-i="${i}"]`);
    if (chip) chip.style.background = active ? 'var(--gold, #f0cc74)' : 'var(--card-bg,#2a2a2a)';
  }

  function stopPlayback() {
    if (_playTimer) { clearTimeout(_playTimer); _playTimer = null; }
  }

  function play() {
    stopPlayback();
    if (typeof AudioEngine === 'undefined' || !AudioEngine.pluckCourse || !_notes.length) return;
    AudioEngine.ensureCtx();
    const bpm = 100;
    const listHost = document.getElementById('composer-list');
    let i = 0;
    function step() {
      if (i > 0) setChipActive(listHost, i - 1, false);
      const n = _notes[i];
      AudioEngine.pluckCourse(n.course, n.fret, 0, 0.55);
      if (_svg && FretboardScale.flashMidi) FretboardScale.flashMidi(_svg, n.midi);
      setChipActive(listHost, i, true);
      const durMs = (n.beats * (60 / bpm)) * 1000;
      i++;
      if (i < _notes.length) _playTimer = setTimeout(step, durMs);
      else _playTimer = setTimeout(() => setChipActive(listHost, _notes.length - 1, false), durMs);
    }
    step();
  }

  function rerenderAll() {
    const host = document.getElementById('composer-app');
    if (!host) return;
    drawContextBoard();
    renderNoteList(document.getElementById('composer-list'));
    renderStaff(document.getElementById('composer-staff'));
  }

  /* ---------- קלט: לחיצה על הגריף ---------- */
  function renderClickInput(body) {
    body.innerHTML = `
      <div class="st-load-row">
        ${STR_LABELS.map((l, i) => `<button type="button" class="btn small composer-course${i === _course ? ' active' : ''}" data-c="${i}">${l}</button>`).join('')}
        <label>סריג: <input type="number" id="composer-fret" min="0" max="15" value="0" style="width:56px;"></label>
      </div>
      <div class="st-load-row">
        <span>משך:</span>
        ${BEAT_DURATIONS.map((d, i) => `<button type="button" class="btn small composer-dur${d.v === 1 ? ' active' : ''}" data-v="${d.v}">${d.label}</button>`).join('')}
      </div>
      <div class="st-load-row">
        <button type="button" class="btn gold" id="composer-add">➕ הוסף תו</button>
        <button type="button" class="btn small secondary" id="composer-undo">↺ הסר אחרון</button>
        <button type="button" class="btn small secondary" id="composer-clear">🗑️ נקה הכל</button>
      </div>`;
    let selDur = 1;
    body.querySelectorAll('.composer-course').forEach(b => b.addEventListener('click', () => {
      _course = parseInt(b.dataset.c, 10);
      body.querySelectorAll('.composer-course').forEach(x => x.classList.toggle('active', x === b));
    }));
    body.querySelectorAll('.composer-dur').forEach(b => b.addEventListener('click', () => {
      selDur = parseFloat(b.dataset.v);
      body.querySelectorAll('.composer-dur').forEach(x => x.classList.toggle('active', x === b));
    }));
    body.querySelector('#composer-add').addEventListener('click', () => {
      const fret = Math.max(0, Math.min(15, parseInt(body.querySelector('#composer-fret').value, 10) || 0));
      const midi = TUNING[_course].midi + fret;
      _notes.push({ course: _course, fret, midi, beats: selDur });
      if (typeof AudioEngine !== 'undefined') { AudioEngine.ensureCtx(); AudioEngine.pluckCourse(_course, fret, 0, 0.5); }
      rerenderAll();
    });
    body.querySelector('#composer-undo').addEventListener('click', () => { _notes.pop(); rerenderAll(); });
    body.querySelector('#composer-clear').addEventListener('click', () => {
      if (_notes.length && !confirm('לנקות את כל התווים?')) return;
      _notes = [];
      rerenderAll();
    });
  }

  /* ---------- קלט: טקסט-טאב / קובץ ---------- */
  function renderTextInput(body) {
    body.innerHTML = `
      <p class="hint">אותו פורמט טאב-טקסט כמו ב"למד אותי את השיר" — D/A/F/C + BPM:</p>
      <textarea id="composer-text" class="st-manual-textarea" rows="6" placeholder="${esc(EXAMPLE_TAB)}"></textarea>
      <div class="st-load-row" style="flex-wrap:wrap;align-items:center;">
        <button type="button" class="btn small secondary" id="composer-example">💡 מלא דוגמה</button>
        <label class="btn small secondary" style="cursor:pointer;">📂 העלה קובץ (.txt)
          <input type="file" id="composer-file" accept=".txt" style="display:none;">
        </label>
        <button type="button" class="btn gold" id="composer-parse">🎶 טען למלחין</button>
      </div>
      <p id="composer-err" class="hint" style="color:var(--danger,#e66);"></p>`;
    const ta = body.querySelector('#composer-text');
    body.querySelector('#composer-example').addEventListener('click', () => { ta.value = EXAMPLE_TAB; });
    body.querySelector('#composer-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => { ta.value = String(evt.target.result || ''); };
      reader.readAsText(file);
    });
    body.querySelector('#composer-parse').addEventListener('click', () => {
      const err = body.querySelector('#composer-err');
      err.textContent = '';
      try {
        const parsed = SongTeacher.parseTextTab(ta.value);
        const bpm = parsed.bpm || 90;
        _notes = parsed.tabNotes.map(n => ({
          course: n.course, fret: n.fret, midi: n.midi,
          beats: Math.round((n.duration * bpm / 60) * 4) / 4 || 0.5,
        }));
        rerenderAll();
      } catch (e) {
        err.textContent = 'שגיאה: ' + (e.message || e);
      }
    });
  }

  /* ---------- קלט: קלידים וירטואליים ---------- */
  function renderPianoInput(body) {
    const BLACK_PC = new Set([1, 3, 6, 8, 10]);
    const whiteW = 34;
    let selDur = 1;
    let whiteIdx = -1;
    const keys = [];
    for (let m = PIANO_MIN; m <= PIANO_MAX; m++) {
      const black = BLACK_PC.has(normPc(m));
      if (!black) whiteIdx++;
      keys.push({ midi: m, black, x: black ? whiteIdx * whiteW + whiteW * 0.66 : whiteIdx * whiteW });
    }
    const totalW = (whiteIdx + 1) * whiteW;

    body.innerHTML = `
      <p class="hint">לחיצה על קליד מנגנת אותו ומוסיפה אותו למלחין — הפוזיציה על הבוזוקי נבחרת אוטומטית.</p>
      <div class="st-load-row"><span>משך:</span>
        ${BEAT_DURATIONS.map(d => `<button type="button" class="btn small composer-pdur${d.v === 1 ? ' active' : ''}" data-v="${d.v}">${d.label}</button>`).join('')}
      </div>
      <div style="overflow-x:auto;border:1px solid var(--border,#3a3a3a);border-radius:8px;background:#161616;">
        <div id="composer-piano" style="position:relative;height:120px;width:${totalW}px;">
          ${keys.filter(k => !k.black).map(k => `<button type="button" class="piano-key piano-white" data-midi="${k.midi}"
              style="position:absolute;left:${k.x}px;top:0;width:${whiteW - 1}px;height:100%;background:#f5f5f0;border:1px solid #333;border-radius:0 0 4px 4px;color:#333;font-size:9px;padding-bottom:4px;display:flex;align-items:flex-end;justify-content:center;">${normPc(k.midi) === 0 ? 'C' : ''}</button>`).join('')}
          ${keys.filter(k => k.black).map(k => `<button type="button" class="piano-key piano-black" data-midi="${k.midi}"
              style="position:absolute;left:${k.x}px;top:0;width:${whiteW * 0.6}px;height:62%;background:#1a1a1a;border:1px solid #000;border-radius:0 0 3px 3px;z-index:2;"></button>`).join('')}
        </div>
      </div>
      <div class="st-load-row" style="margin-top:8px;"><button type="button" class="btn small secondary" id="composer-piano-undo">↺ הסר אחרון</button></div>`;

    body.querySelectorAll('.composer-pdur').forEach(b => b.addEventListener('click', () => {
      selDur = parseFloat(b.dataset.v);
      body.querySelectorAll('.composer-pdur').forEach(x => x.classList.toggle('active', x === b));
    }));
    body.querySelectorAll('.piano-key').forEach(b => b.addEventListener('click', () => {
      const midi = parseInt(b.dataset.midi, 10);
      const added = addNoteFromMidi(midi, selDur);
      if (!added) return;
      const last = _notes[_notes.length - 1];
      if (typeof AudioEngine !== 'undefined') { AudioEngine.ensureCtx(); AudioEngine.pluckCourse(last.course, last.fret, 0, 0.5); }
      rerenderAll();
    }));
    body.querySelector('#composer-piano-undo').addEventListener('click', () => { _notes.pop(); rerenderAll(); });
  }

  /* ---------- קלט: האזנה חיה מהמיקרופון ---------- */
  function midiFromFreq(freq) {
    return Math.round(69 + 12 * Math.log2(freq / 440));
  }

  async function startMicListen(statusEl, selDurGetter) {
    if (_micRunning) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      statusEl.textContent = 'הדפדפן הזה לא תומך בגישה למיקרופון.';
      return;
    }
    try {
      _micStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    } catch (e) {
      statusEl.textContent = 'לא ניתן לגשת למיקרופון — ' + (e.message || e);
      return;
    }
    _micCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = _micCtx.createMediaStreamSource(_micStream);
    const analyser = _micCtx.createAnalyser();
    analyser.fftSize = 2048;
    src.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    _micRunning = true;
    _micLastMidi = null;
    statusEl.textContent = '🎙️ מקשיב… נגנו תו-תו, השאירו רגע שקט קצר בין תווים.';

    const loop = () => {
      if (!_micRunning) return;
      analyser.getFloatTimeDomainData(buf);
      const { freq, rms } = Listen.detectPitch(buf, _micCtx.sampleRate);
      if (!freq || rms < 0.02) {
        _micLastMidi = null; // שקט = "נתק" בין תווים, כדי שאותו תו יזוהה שוב אם חוזר
      } else {
        const midi = midiFromFreq(freq);
        if (midi !== _micLastMidi) {
          _micLastMidi = midi;
          const added = addNoteFromMidi(midi, selDurGetter());
          if (added) {
            rerenderAll();
            statusEl.textContent = `🎙️ זוהה: ${midiToNoteName(midi)} — ${_notes.length} תווים עד כה`;
          }
        }
      }
      requestAnimationFrame(loop);
    };
    loop();
  }

  function stopMicListen(statusEl) {
    _micRunning = false;
    if (_micStream) { _micStream.getTracks().forEach(t => t.stop()); _micStream = null; }
    if (_micCtx) { try { _micCtx.close(); } catch (_) {} _micCtx = null; }
    if (statusEl) statusEl.textContent = 'המיקרופון כבוי.';
  }

  function renderListenInput(body) {
    let selDur = 1;
    body.innerHTML = `
      <p class="hint">נגנו על הבוזוקי (או כל כלי/קול) אל תוך המיקרופון — כל תו שמזוהה נוסף אוטומטית למלחין. מבוסס על אותו מנוע זיהוי-גובה-צליל שמשמש את "מאמן מאזין" ואת המכוון — לא מנוע חדש.</p>
      <div class="st-load-row"><span>משך ברירת מחדל לתו מזוהה:</span>
        ${BEAT_DURATIONS.map(d => `<button type="button" class="btn small composer-ldur${d.v === 1 ? ' active' : ''}" data-v="${d.v}">${d.label}</button>`).join('')}
      </div>
      <div class="st-load-row">
        <button type="button" class="btn gold" id="composer-mic-start">🎙️ התחל להאזין</button>
        <button type="button" class="btn small secondary" id="composer-mic-stop">⏹ עצור האזנה</button>
        <button type="button" class="btn small secondary" id="composer-mic-undo">↺ הסר תו אחרון</button>
      </div>
      <p id="composer-mic-status" class="hint">המיקרופון כבוי.</p>`;
    body.querySelectorAll('.composer-ldur').forEach(b => b.addEventListener('click', () => {
      selDur = parseFloat(b.dataset.v);
      body.querySelectorAll('.composer-ldur').forEach(x => x.classList.toggle('active', x === b));
    }));
    const statusEl = body.querySelector('#composer-mic-status');
    body.querySelector('#composer-mic-start').addEventListener('click', () => startMicListen(statusEl, () => selDur));
    body.querySelector('#composer-mic-stop').addEventListener('click', () => stopMicListen(statusEl));
    body.querySelector('#composer-mic-undo').addEventListener('click', () => { _notes.pop(); rerenderAll(); });
  }

  /* ---------- קלט: ייבוא MusicXML / ABC ---------- */
  function parseMusicXML(text) {
    const dom = new DOMParser().parseFromString(text, 'application/xml');
    if (dom.querySelector('parsererror')) throw new Error('קובץ MusicXML לא תקין');
    const divisionsEl = dom.querySelector('divisions');
    let divisions = divisionsEl ? parseInt(divisionsEl.textContent, 10) : 1;
    const notes = [];
    dom.querySelectorAll('note').forEach(noteEl => {
      if (noteEl.querySelector('rest')) return; // MVP: שתיקות מדולגות, לא מוצגות כתו
      const pitch = noteEl.querySelector('pitch');
      if (!pitch) return;
      const step = pitch.querySelector('step')?.textContent;
      const octave = parseInt(pitch.querySelector('octave')?.textContent, 10);
      const alter = parseInt(pitch.querySelector('alter')?.textContent, 10) || 0;
      const stepPc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[step];
      if (stepPc == null || Number.isNaN(octave)) return;
      const midi = (octave + 1) * 12 + stepPc + alter;
      const durEl = noteEl.querySelector('duration');
      const divs = durEl ? parseInt(durEl.textContent, 10) : divisions;
      const beats = Math.round((divs / (divisions || 1)) * 4) / 4 || 1;
      notes.push({ midi, beats });
    });
    if (!notes.length) throw new Error('לא נמצאו תווים בקובץ (רק שתיקות/אקורדים לא נתמכים עדיין)');
    return notes;
  }

  function parseABC(text) {
    // MVP: קול יחיד, בלי אקורדים/קשירות — A-G עם אוקטבות ('/,), דיאזים/במולים (^/_), אורך אחרי האות
    const lines = text.split('\n').filter(l => l.trim() && !l.trim().startsWith('X:') && !l.trim().startsWith('T:') &&
      !l.trim().startsWith('M:') && !l.trim().startsWith('L:') && !l.trim().startsWith('K:'));
    const body = lines.join(' ');
    const re = /(\^{1,2}|_{1,2}|=)?([A-Ga-g])([',]*)(\d*\/?\d*)/g;
    const notes = [];
    let m;
    while ((m = re.exec(body))) {
      const [, acc, letter, oct, lenStr] = m;
      const base = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[letter.toUpperCase()];
      let octave = letter === letter.toUpperCase() ? 4 : 5; // ABC: אות גדולה (C) = דו אמצעי = MIDI 60, קטנה = אוקטבה למעלה
      for (const ch of oct) { if (ch === "'") octave++; else if (ch === ',') octave--; }
      let alter = 0;
      if (acc === '^') alter = 1; else if (acc === '^^') alter = 2;
      else if (acc === '_') alter = -1; else if (acc === '__') alter = -2;
      const midi = (octave + 1) * 12 + base + alter;
      let beats = 1;
      if (lenStr) {
        if (lenStr.includes('/')) {
          const [n, d] = lenStr.split('/');
          beats = (parseInt(n, 10) || 1) / (parseInt(d, 10) || 2);
        } else {
          beats = parseInt(lenStr, 10) || 1;
        }
      }
      notes.push({ midi, beats });
    }
    if (!notes.length) throw new Error('לא נמצאו תווים — ודאו שזה ABC notation תקין (קול יחיד)');
    return notes;
  }

  function renderImportInput(body) {
    body.innerHTML = `
      <p class="hint">ייבוא MusicXML (.musicxml/.xml) או ABC notation (.abc/.txt) — קול יחיד, בלי אקורדים/קשירות (MVP). לכל תו נבחרת אוטומטית פוזיציה על הבוזוקי.</p>
      <div class="st-load-row" style="flex-wrap:wrap;align-items:center;">
        <label class="btn small secondary" style="cursor:pointer;">📂 העלה MusicXML
          <input type="file" id="composer-xml-file" accept=".xml,.musicxml" style="display:none;">
        </label>
        <label class="btn small secondary" style="cursor:pointer;">📂 העלה ABC
          <input type="file" id="composer-abc-file" accept=".abc,.txt" style="display:none;">
        </label>
      </div>
      <p id="composer-import-err" class="hint" style="color:var(--danger,#e66);"></p>`;
    const err = body.querySelector('#composer-import-err');
    function loadNotesFromParsed(parsedNotes) {
      _notes = [];
      let dropped = 0;
      parsedNotes.forEach(n => { if (!addNoteFromMidi(n.midi, n.beats)) dropped++; });
      rerenderAll();
      err.textContent = dropped
        ? `הובאו ${_notes.length} תווים — ${dropped} תווים היו מחוץ לטווח הנגינה האפשרי בבוזוקי (נמוכים/גבוהים מדי) ולכן דולגו.`
        : '';
    }
    body.querySelector('#composer-xml-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      err.textContent = '';
      const reader = new FileReader();
      reader.onload = evt => {
        try { loadNotesFromParsed(parseMusicXML(String(evt.target.result || ''))); }
        catch (ex) { err.textContent = 'שגיאה: ' + (ex.message || ex); }
      };
      reader.readAsText(file);
    });
    body.querySelector('#composer-abc-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      err.textContent = '';
      const reader = new FileReader();
      reader.onload = evt => {
        try { loadNotesFromParsed(parseABC(String(evt.target.result || ''))); }
        catch (ex) { err.textContent = 'שגיאה: ' + (ex.message || ex); }
      };
      reader.readAsText(file);
    });
  }

  /* ---------- ספריית פרזות אישית (localStorage) ---------- */
  function loadPhraseLibrary() {
    try { return JSON.parse(localStorage.getItem(PHRASE_KEY) || '[]'); } catch (_) { return []; }
  }
  function savePhraseLibrary(list) {
    try { localStorage.setItem(PHRASE_KEY, JSON.stringify(list)); } catch (_) {}
  }

  function renderLibraryPanel() {
    const host = document.getElementById('composer-library');
    if (!host) return;
    const list = loadPhraseLibrary();
    if (!list.length) { host.innerHTML = '<p class="hint">עדיין לא שמרתם פרזות.</p>'; return; }
    host.innerHTML = list.map((p, i) => `
      <div class="card" style="padding:8px 12px;margin-bottom:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <b>${esc(p.name)}</b>
        <span class="hint">${p.notes.length} תווים</span>
        <button type="button" class="btn small secondary" data-load="${i}">📂 טען</button>
        <button type="button" class="btn small secondary" data-del="${i}">🗑️ מחק</button>
      </div>`).join('');
    host.querySelectorAll('[data-load]').forEach(b => b.addEventListener('click', () => {
      const p = loadPhraseLibrary()[parseInt(b.dataset.load, 10)];
      if (!p) return;
      _notes = p.notes.map(n => ({ ...n }));
      rerenderAll();
    }));
    host.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const idx = parseInt(b.dataset.del, 10);
      const list2 = loadPhraseLibrary();
      if (!confirm(`למחוק את "${list2[idx]?.name}"?`)) return;
      list2.splice(idx, 1);
      savePhraseLibrary(list2);
      renderLibraryPanel();
    }));
  }

  function saveCurrentAsPhrase() {
    if (!_notes.length) { alert('אין תווים לשמור'); return; }
    const name = prompt('שם לפרזה:', 'פרזה ' + (loadPhraseLibrary().length + 1));
    if (!name) return;
    const list = loadPhraseLibrary();
    list.push({ name, notes: _notes.map(n => ({ ...n })), savedAt: Date.now() });
    savePhraseLibrary(list);
    renderLibraryPanel();
  }

  /* ---------- שמירה/טעינה כ-JSON ---------- */
  function saveJson() {
    if (!_notes.length) { alert('אין תווים לשמור'); return; }
    const blob = new Blob([JSON.stringify({ notes: _notes }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bouzouki-composition.json';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
  }

  function loadJsonFile(file) {
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(String(evt.target.result || ''));
        if (!Array.isArray(data.notes)) throw new Error('פורמט לא תקין');
        _notes = data.notes;
        rerenderAll();
      } catch (e) {
        alert('שגיאה בטעינת הקובץ: ' + (e.message || e));
      }
    };
    reader.readAsText(file);
  }

  function renderInputPanel(host) {
    const body = document.getElementById('composer-input-body');
    if (_mode === 'click') renderClickInput(body);
    else if (_mode === 'text') renderTextInput(body);
    else if (_mode === 'piano') renderPianoInput(body);
    else if (_mode === 'listen') renderListenInput(body);
    else if (_mode === 'import') renderImportInput(body);
  }

  function printSheet() {
    if (!_notes.length) { alert('אין תווים להדפסה'); return; }
    const staffHost = document.getElementById('composer-staff');
    const staffSvg = staffHost?.querySelector('svg')?.outerHTML || '<p>אין תצוגת חמישייה</p>';
    const tabRows = _notes.map((n, i) => `<td>${i + 1}<br>${STR_LABELS[n.course]}·${n.fret}<br><small>${midiToNoteName(n.midi)}</small></td>`).join('');
    const ifr = document.createElement('iframe');
    ifr.setAttribute('aria-hidden', 'true');
    ifr.style.cssText = 'position:fixed;right:-9999px;bottom:0;width:900px;height:700px;border:0;';
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
      <style>
        html,body{background:#fff;margin:0;padding:16px;font-family:Heebo,sans-serif;color:#1a1a1a;}
        h1{color:#b8860b;font-size:22px;}
        table{border-collapse:collapse;margin-top:12px;}
        td{border:1px solid #ccc;padding:6px 10px;text-align:center;font-family:monospace;}
      </style></head><body>
      <h1>מלחין — קטע לבוזוקי</h1>
      <div>${staffSvg}</div>
      <table><tr>${tabRows}</tr></table>
      </body></html>`);
    doc.close();
    setTimeout(() => {
      try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (_) {}
      setTimeout(() => ifr.remove(), 1500);
    }, 400);
  }

  function init() {
    const host = document.getElementById('composer-app');
    if (!host) return;
    host.innerHTML = `
      <div class="card">
        <div class="st-load-row" style="flex-wrap:wrap;">
          <button type="button" class="btn small composer-mode active" data-m="click">🖱️ לחיצה על הגריף</button>
          <button type="button" class="btn small composer-mode" data-m="piano">🎹 קלידים</button>
          <button type="button" class="btn small composer-mode" data-m="listen">🎙️ האזנה חיה</button>
          <button type="button" class="btn small composer-mode" data-m="text">📝 טקסט-טאב / קובץ</button>
          <button type="button" class="btn small composer-mode" data-m="import">📥 ייבוא MusicXML/ABC</button>
        </div>
        <div id="composer-input-body"></div>
      </div>
      <div class="duet-play-controls" style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0;">
        <button type="button" id="composer-play" class="btn gold">▶ נגן</button>
        <button type="button" id="composer-stop" class="btn secondary">⏹ עצור</button>
        <button type="button" id="composer-print" class="btn secondary">🖨️ הדפס / שמור PDF</button>
        <button type="button" id="composer-save-json" class="btn secondary">💾 שמור כ-JSON</button>
        <label class="btn secondary" style="cursor:pointer;">📂 טען JSON
          <input type="file" id="composer-load-json" accept=".json" style="display:none;">
        </label>
        <button type="button" id="composer-save-phrase" class="btn gold">⭐ שמור לספריית הפרזות</button>
      </div>
      <div class="card">
        <h3>🎼 תווים (חמישייה)</h3>
        <div id="composer-staff" style="overflow-x:auto;"></div>
      </div>
      <div class="card">
        <h3>🪕 טאב</h3>
        <div id="composer-board"></div>
        <div id="composer-list" class="duet-note-list"></div>
      </div>
      <div class="card">
        <h3>⭐ ספריית הפרזות שלי</h3>
        <div id="composer-library"></div>
      </div>`;

    _svg = ensureSvg(document.getElementById('composer-board'));
    renderInputPanel(host);
    renderLibraryPanel();

    host.querySelectorAll('.composer-mode').forEach(b => b.addEventListener('click', () => {
      if (_mode === 'listen' && b.dataset.m !== 'listen') stopMicListen(null);
      _mode = b.dataset.m;
      host.querySelectorAll('.composer-mode').forEach(x => x.classList.toggle('active', x === b));
      renderInputPanel(host);
    }));
    host.querySelector('#composer-play').addEventListener('click', play);
    host.querySelector('#composer-stop').addEventListener('click', stopPlayback);
    host.querySelector('#composer-print').addEventListener('click', printSheet);
    host.querySelector('#composer-save-json').addEventListener('click', saveJson);
    host.querySelector('#composer-load-json').addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) loadJsonFile(file);
    });
    host.querySelector('#composer-save-phrase').addEventListener('click', saveCurrentAsPhrase);

    rerenderAll();
  }

  return { init, stop: () => stopMicListen(null) };
})();
