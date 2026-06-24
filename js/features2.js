/* ============================================================
   בוזוקי אקדמי — מודולים מתקדמים (features2.js)
   7 כלים: מחולל תרגילים, מחולל מנגינות, מקליט, קריאה מראש,
           מכונת תופים, מנתח מוזיקלי חי, מדריך מאקאמים
   ============================================================ */
'use strict';

/* ================================================================
   1. ExerciseGenerator — מחולל תרגילים
   ================================================================ */
const ExerciseGenerator = (() => {
  let scheduler = null;
  let generated = null;
  const STORE_KEY = 'penia-exgen-saved';

  function init() {
    const el = $('#exgen-app');
    if (!el) return;

    el.innerHTML = `
      <h2 class="section-title">מחולל תרגילים</h2>
      <div class="exgen-controls" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <label>דרומוס:
          <select id="exgen-dromos" class="ctrl-select">
            ${DROMOI.map(d => `<option value="${d.id}">${d.nameHe}</option>`).join('')}
          </select>
        </label>
        <label>שורש:
          <select id="exgen-root" class="ctrl-select">
            ${NOTE_NAMES.map((n, i) => `<option value="${i}" ${i === 2 ? 'selected' : ''}>${n} — ${SOLFEGE[n]}</option>`).join('')}
          </select>
        </label>
        <label>סוג תבנית:
          <select id="exgen-pattern" class="ctrl-select">
            <option value="scale">סולם</option>
            <option value="arpeggio">ארפג׳ו</option>
            <option value="sequence">סקוונציה (1-2-3, 2-3-4...)</option>
            <option value="chromatic">כרומטי</option>
          </select>
        </label>
        <label>כיוון:
          <select id="exgen-dir" class="ctrl-select">
            <option value="up">עלייה</option>
            <option value="down">ירידה</option>
            <option value="both">עלייה + ירידה</option>
          </select>
        </label>
        <label>BPM:
          <input id="exgen-bpm" type="number" min="40" max="200" value="80" class="ctrl-input" style="width:60px;">
        </label>
        <label>תיבות:
          <select id="exgen-bars" class="ctrl-select">
            <option value="2">2</option>
            <option value="4" selected>4</option>
            <option value="8">8</option>
          </select>
        </label>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <button id="exgen-generate" class="btn-primary">יצירת תרגיל</button>
        <button id="exgen-play" class="btn-secondary" disabled>נגן</button>
        <button id="exgen-stop" class="btn-secondary" disabled>עצור</button>
        <button id="exgen-save" class="btn-secondary" disabled>שמור</button>
      </div>
      <div id="exgen-tab-wrap" style="overflow-x:auto;margin-bottom:14px;">
        <svg id="exgen-tab" class="tab-svg"></svg>
      </div>
      <div id="exgen-saved-list"></div>
    `;

    $('#exgen-generate').addEventListener('click', generate);
    $('#exgen-play').addEventListener('click', play);
    $('#exgen-stop').addEventListener('click', stop);
    $('#exgen-save').addEventListener('click', save);
    renderSaved();
  }

  function findCourseAndFret(midi) {
    for (let ci = 0; ci < TUNING.length; ci++) {
      const fret = midi - TUNING[ci].midi;
      if (fret >= 0 && fret <= NUM_FRETS) return { c: ci, f: fret };
    }
    // fallback: course 0
    const fret = midi - TUNING[0].midi;
    return { c: 0, f: Math.max(0, Math.min(NUM_FRETS, fret)) };
  }

  function generate() {
    stop();
    const dromosId = $('#exgen-dromos').value;
    const rootPc = +$('#exgen-root').value;
    const pattern = $('#exgen-pattern').value;
    const dir = $('#exgen-dir').value;
    const bpm = +$('#exgen-bpm').value;
    const bars = +$('#exgen-bars').value;
    const dromos = DROMOI.find(d => d.id === dromosId);
    const intervals = dromos.intervals;
    const rootMidi = 48 + rootPc; // octave 3 base

    let midis = [];
    if (pattern === 'scale') {
      midis = intervals.map(iv => rootMidi + iv);
      // add octave
      midis.push(rootMidi + 12);
    } else if (pattern === 'arpeggio') {
      // 1, 3, 5, 8 of the scale
      const degs = [0, 2, 4];
      midis = degs.filter(d => d < intervals.length).map(d => rootMidi + intervals[d]);
      midis.push(rootMidi + 12);
    } else if (pattern === 'sequence') {
      // ascending groups: 1-2-3, 2-3-4, 3-4-5 ...
      const ext = [...intervals, 12];
      for (let i = 0; i < ext.length - 2; i++) {
        midis.push(rootMidi + ext[i], rootMidi + ext[i + 1], rootMidi + ext[i + 2]);
      }
    } else { // chromatic
      for (let f = 0; f <= 12; f++) midis.push(rootMidi + f);
    }

    if (dir === 'down') midis.reverse();
    else if (dir === 'both') {
      const up = [...midis];
      const down = [...midis].reverse().slice(1);
      midis = [...up, ...down];
    }

    // fill bars (sub=2 means 8th notes, 2 per beat, 4 beats per bar)
    const sub = 2;
    const totalSteps = bars * 4 * sub;
    const notes = [];
    for (let i = 0; i < totalSteps; i++) {
      const m = midis[i % midis.length];
      const { c, f } = findCourseAndFret(m);
      const isAccent = i % sub === 0;
      const d = isAccent ? (i % (sub * 2) === 0 ? 'D' : 'd') : 'u';
      notes.push(_n(c, f, d, 1));
    }

    generated = { type: 'tab', notes, sub, bpm, desc: `${dromos.nameHe} — ${pattern} — ${dir}` };
    drawTab($('#exgen-tab'), generated);
    $('#exgen-play').disabled = false;
    $('#exgen-save').disabled = false;
  }

  function play() {
    if (!generated) return;
    stop();
    AudioEngine.ensureCtx();
    const bpm = +$('#exgen-bpm').value || generated.bpm;
    const stepDur = 60 / bpm / generated.sub;
    let step = 0;
    const total = generated.notes.length;

    scheduler = new AudioEngine.Scheduler(
      (s, t) => {
        if (s >= total) { stop(); return; }
        const n = generated.notes[s];
        if (!n.rest) AudioEngine.pluckCourse(n.c, n.f, t, n.d === 'D' ? 0.6 : 0.4);
      },
      (s) => {
        $$('#exgen-tab .tab-note').forEach((g, i) => {
          g.style.opacity = i === s ? '1' : '0.5';
        });
      }
    );
    scheduler.stepDur = stepDur;
    scheduler.numSteps = total;
    scheduler.start();
    if (typeof activeSchedulers !== 'undefined') activeSchedulers.push(scheduler);
    $('#exgen-play').disabled = true;
    $('#exgen-stop').disabled = false;
  }

  function stop() {
    if (scheduler) { scheduler.stop(); scheduler = null; }
    $('#exgen-play') && ($('#exgen-play').disabled = false);
    $('#exgen-stop') && ($('#exgen-stop').disabled = true);
    $$('#exgen-tab .tab-note').forEach(g => g.style.opacity = '1');
  }

  function save() {
    if (!generated) return;
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    saved.push({
      ...generated,
      id: 'exgen-' + Date.now(),
      name: generated.desc,
      savedAt: new Date().toLocaleString('he-IL')
    });
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    renderSaved();
  }

  function renderSaved() {
    const wrap = $('#exgen-saved-list');
    if (!wrap) return;
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    if (!saved.length) { wrap.innerHTML = '<p style="color:var(--text-dim);">אין תרגילים שמורים</p>'; return; }
    wrap.innerHTML = '<h3>תרגילים שמורים</h3>' + saved.map((s, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
        <span style="color:var(--gold);">${s.name}</span>
        <small style="color:var(--text-dim);">${s.savedAt}</small>
        <button class="btn-sm" onclick="ExerciseGenerator.loadSaved(${i})">טען</button>
        <button class="btn-sm" onclick="ExerciseGenerator.deleteSaved(${i})">מחק</button>
      </div>
    `).join('');
  }

  function loadSaved(i) {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    if (!saved[i]) return;
    generated = saved[i];
    drawTab($('#exgen-tab'), generated);
    $('#exgen-play').disabled = false;
    $('#exgen-save').disabled = false;
  }

  function deleteSaved(i) {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    saved.splice(i, 1);
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    renderSaved();
  }

  return { init, stop, loadSaved, deleteSaved };
})();


/* ================================================================
   2. MelodyGenerator — מחולל מנגינות
   ================================================================ */
const MelodyGenerator = (() => {
  let scheduler = null;
  let melody = null;

  function init() {
    const el = $('#melodygen-app');
    if (!el) return;

    el.innerHTML = `
      <h2 class="section-title">מחולל מנגינות</h2>
      <div class="melodygen-controls" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;">
        <label>דרומוס:
          <select id="mg-dromos" class="ctrl-select">
            ${DROMOI.map(d => `<option value="${d.id}">${d.nameHe}</option>`).join('')}
          </select>
        </label>
        <label>שורש:
          <select id="mg-root" class="ctrl-select">
            ${NOTE_NAMES.map((n, i) => `<option value="${i}" ${i === 2 ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </label>
        <label>אורך (תיבות):
          <select id="mg-length" class="ctrl-select">
            <option value="4">4</option>
            <option value="8" selected>8</option>
            <option value="16">16</option>
          </select>
        </label>
        <label>מורכבות קצב:
          <select id="mg-complexity" class="ctrl-select">
            <option value="simple">פשוט</option>
            <option value="medium" selected>בינוני</option>
            <option value="complex">מורכב</option>
          </select>
        </label>
        <label>טווח:
          <select id="mg-range" class="ctrl-select">
            <option value="1" selected>אוקטבה אחת</option>
            <option value="2">שתי אוקטבות</option>
          </select>
        </label>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <button id="mg-generate" class="btn-primary">יצירת מנגינה</button>
        <button id="mg-play" class="btn-secondary" disabled>נגן</button>
        <button id="mg-stop" class="btn-secondary" disabled>עצור</button>
      </div>
      <div id="mg-fretboard-wrap" style="overflow-x:auto;margin-bottom:10px;">
        <svg id="mg-fretboard" class="fretboard-svg"></svg>
      </div>
      <div id="mg-tab-wrap" style="overflow-x:auto;">
        <svg id="mg-tab" class="tab-svg"></svg>
      </div>
    `;

    $('#mg-generate').addEventListener('click', generate);
    $('#mg-play').addEventListener('click', play);
    $('#mg-stop').addEventListener('click', stop);
  }

  function buildScale(dromosId, rootPc, octaves) {
    const dromos = DROMOI.find(d => d.id === dromosId);
    const rootMidi = 48 + rootPc;
    const notes = [];
    for (let oct = 0; oct < octaves; oct++) {
      dromos.intervals.forEach(iv => {
        notes.push(rootMidi + iv + oct * 12);
      });
    }
    notes.push(rootMidi + octaves * 12); // top tonic
    return notes;
  }

  function generate() {
    stop();
    const dromosId = $('#mg-dromos').value;
    const rootPc = +$('#mg-root').value;
    const bars = +$('#mg-length').value;
    const complexity = $('#mg-complexity').value;
    const range = +$('#mg-range').value;

    const scale = buildScale(dromosId, rootPc, range);
    const beatsPerBar = 4;
    const totalBeats = bars * beatsPerBar;

    // rhythm patterns per complexity
    const rhythmPool = {
      simple: [[2], [2], [2], [2]],         // half notes
      medium: [[1], [1], [2], [1, 1]],      // mix quarter + half
      complex: [[1], [0.5, 0.5], [1], [0.5, 0.5, 1]] // eighth + quarter
    };
    const pool = rhythmPool[complexity];

    // weighted random walk
    let degIdx = 0; // start on tonic
    const events = [];
    let beat = 0;

    while (beat < totalBeats) {
      // pick rhythm
      const rhy = pool[Math.floor(Math.random() * pool.length)];
      for (const dur of rhy) {
        if (beat >= totalBeats) break;

        // phrase ending: tend to tonic
        const nearEnd = (beat % (beatsPerBar * 4)) >= (beatsPerBar * 4 - 2);
        const r = Math.random();
        let newDeg;

        if (nearEnd && Math.random() < 0.5) {
          // move toward tonic
          newDeg = degIdx > 0 ? degIdx - 1 : 0;
        } else if (r < 0.7) {
          // stepwise
          newDeg = degIdx + (Math.random() < 0.5 ? 1 : -1);
        } else if (r < 0.9) {
          // leap (2-3 steps)
          const leap = Math.floor(Math.random() * 3) + 2;
          newDeg = degIdx + (Math.random() < 0.5 ? leap : -leap);
        } else {
          // repeat
          newDeg = degIdx;
        }

        newDeg = Math.max(0, Math.min(scale.length - 1, newDeg));
        degIdx = newDeg;

        const midi = scale[degIdx];
        const { c, f } = findCF(midi);
        const sub = 2; // 8th note grid
        const lenSteps = Math.round(dur * sub);
        const isAccent = Math.round(beat * sub) % (sub * 2) === 0;
        events.push({ c, f, midi, d: isAccent ? 'D' : 'd', len: Math.max(1, lenSteps), dur });
        beat += dur;
      }
    }

    melody = { type: 'tab', notes: events, sub: 2, bpm: 80, desc: 'מנגינה — ' + DROMOI.find(d => d.id === dromosId).nameHe };
    drawTab($('#mg-tab'), melody);

    // show on fretboard
    const dromos = DROMOI.find(d => d.id === dromosId);
    const rootMidi = 48 + rootPc;
    const melodyMidis = new Set(events.map(e => e.midi));
    drawFretboard($('#mg-fretboard'), (ci, fret, midi) => {
      if (!melodyMidis.has(midi)) return null;
      const isRoot = ((midi - rootMidi) % 12) === 0;
      return { type: isRoot ? 'root' : 'note', label: NOTE_NAMES[midi % 12] };
    });

    $('#mg-play').disabled = false;
  }

  function findCF(midi) {
    for (let ci = 0; ci < TUNING.length; ci++) {
      const fret = midi - TUNING[ci].midi;
      if (fret >= 0 && fret <= NUM_FRETS) return { c: ci, f: fret };
    }
    return { c: 0, f: Math.max(0, midi - TUNING[0].midi) };
  }

  function play() {
    if (!melody) return;
    stop();
    AudioEngine.ensureCtx();
    const stepDur = 60 / melody.bpm / melody.sub;
    let step = 0;
    const total = melody.notes.reduce((s, n) => s + (n.len || 1), 0);

    const evMap = new Map();
    let s = 0;
    melody.notes.forEach((n, i) => { evMap.set(s, n); s += n.len || 1; });

    scheduler = new AudioEngine.Scheduler(
      (st, t) => {
        if (st >= total) { stop(); return; }
        const n = evMap.get(st);
        if (n && !n.rest) AudioEngine.pluckCourse(n.c, n.f, t, n.d === 'D' ? 0.55 : 0.4);
      },
      () => {}
    );
    scheduler.stepDur = stepDur;
    scheduler.numSteps = total;
    scheduler.start();
    if (typeof activeSchedulers !== 'undefined') activeSchedulers.push(scheduler);
    $('#mg-play').disabled = true;
    $('#mg-stop').disabled = false;
  }

  function stop() {
    if (scheduler) { scheduler.stop(); scheduler = null; }
    if ($('#mg-play')) $('#mg-play').disabled = false;
    if ($('#mg-stop')) $('#mg-stop').disabled = true;
  }

  return { init, stop };
})();


/* ================================================================
   3. MelodyRecorder — מקליט מנגינות
   ================================================================ */
const MelodyRecorder = (() => {
  let micStream = null, micCtx = null, analyser = null;
  let recording = false, playing = false;
  let events = [];       // {midi, pc, name, time, dur}
  let startTime = 0;
  let pollTimer = null;
  let lastNote = null, lastNoteStart = 0;
  let scheduler = null;
  const STORE_KEY = 'penia-recorder-saved';

  function init() {
    const el = $('#recorder-app');
    if (!el) return;

    el.innerHTML = `
      <h2 class="section-title">מקליט מנגינות</h2>
      <p style="color:var(--text-dim);margin-bottom:12px;">נגנו על הבוזוקי — המקליט יזהה את הצלילים וייצור TAB אוטומטית.</p>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <button id="rec-start" class="btn-primary">התחל הקלטה</button>
        <button id="rec-stop-rec" class="btn-secondary" disabled>עצור הקלטה</button>
        <button id="rec-play" class="btn-secondary" disabled>נגן הקלטה</button>
        <button id="rec-stop-play" class="btn-secondary" disabled>עצור ניגון</button>
        <button id="rec-save" class="btn-secondary" disabled>שמור</button>
        <button id="rec-clear" class="btn-secondary" disabled>נקה</button>
      </div>
      <label>כימות (subdivision):
        <select id="rec-quantize" class="ctrl-select">
          <option value="4">רבע תו</option>
          <option value="8" selected>שמינית</option>
          <option value="16">שש-עשרית</option>
        </select>
      </label>
      <label style="margin-right:12px;">BPM:
        <input id="rec-bpm" type="number" min="40" max="200" value="80" class="ctrl-input" style="width:60px;">
      </label>
      <div id="rec-status" style="color:var(--gold);margin:10px 0;min-height:24px;"></div>
      <div id="rec-notes" style="margin-bottom:14px;max-height:200px;overflow-y:auto;font-family:monospace;font-size:13px;color:var(--text);"></div>
      <div id="rec-tab-wrap" style="overflow-x:auto;">
        <svg id="rec-tab" class="tab-svg"></svg>
      </div>
      <div id="rec-saved-list" style="margin-top:14px;"></div>
    `;

    $('#rec-start').addEventListener('click', startRec);
    $('#rec-stop-rec').addEventListener('click', stopRec);
    $('#rec-play').addEventListener('click', playBack);
    $('#rec-stop-play').addEventListener('click', stopPlay);
    $('#rec-save').addEventListener('click', save);
    $('#rec-clear').addEventListener('click', clear);
    renderSaved();
  }

  async function startRec() {
    events = [];
    lastNote = null;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
    } catch { $('#rec-status').textContent = 'לא ניתן לגשת למיקרופון'; return; }

    micCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = micCtx.createMediaStreamSource(micStream);
    analyser = micCtx.createAnalyser();
    analyser.fftSize = 2048;
    AudioEngine.micBoost(src).connect(analyser);

    recording = true;
    startTime = performance.now();
    $('#rec-status').textContent = 'מקליט... נגנו!';
    $('#rec-start').disabled = true;
    $('#rec-stop-rec').disabled = false;

    pollTimer = setInterval(pollMic, 30);
  }

  function pollMic() {
    if (!analyser || !recording) return;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const { freq, rms } = Listen.detectPitch(buf, micCtx.sampleRate);

    const notesList = $('#rec-notes');
    if (!freq || rms < 0.015) {
      // silence: finalize current note
      if (lastNote !== null) {
        finalizeNote();
        lastNote = null;
      }
      return;
    }

    const mf = 69 + 12 * Math.log2(freq / 440);
    const midi = Math.round(mf);
    const pc = ((midi % 12) + 12) % 12;

    if (lastNote === null || midi !== lastNote) {
      if (lastNote !== null) finalizeNote();
      lastNote = midi;
      lastNoteStart = performance.now();
    }
  }

  function finalizeNote() {
    const dur = (performance.now() - lastNoteStart) / 1000;
    if (dur < 0.05) return; // too short
    const time = (lastNoteStart - startTime) / 1000;
    const name = NOTE_NAMES[((lastNote % 12) + 12) % 12];
    events.push({ midi: lastNote, pc: ((lastNote % 12) + 12) % 12, name, time, dur });

    // update display
    const notesList = $('#rec-notes');
    if (notesList) {
      const div = document.createElement('div');
      div.textContent = `${name}${Math.floor(lastNote / 12) - 1}  t=${time.toFixed(2)}s  dur=${dur.toFixed(2)}s`;
      div.style.color = 'var(--aegean)';
      notesList.appendChild(div);
      notesList.scrollTop = notesList.scrollHeight;
    }
  }

  function stopRec() {
    if (lastNote !== null) finalizeNote();
    recording = false;
    clearInterval(pollTimer);
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (micCtx) { micCtx.close(); micCtx = null; }
    analyser = null;
    lastNote = null;

    $('#rec-status').textContent = `הקלטה הושלמה — ${events.length} תווים זוהו`;
    $('#rec-start').disabled = false;
    $('#rec-stop-rec').disabled = true;
    $('#rec-play').disabled = events.length === 0;
    $('#rec-save').disabled = events.length === 0;
    $('#rec-clear').disabled = events.length === 0;

    if (events.length > 0) buildTab();
  }

  function buildTab() {
    const bpm = +($('#rec-bpm')?.value || 80);
    const quant = +($('#rec-quantize')?.value || 8);
    const beatDur = 60 / bpm;
    const subDur = beatDur / (quant / 4);
    const sub = quant / 4;

    const notes = events.map(ev => {
      const { c, f } = findCF(ev.midi);
      const steps = Math.max(1, Math.round(ev.dur / subDur));
      return _n(c, f, 'd', steps);
    });

    const item = { type: 'tab', notes, sub, bpm, desc: 'הקלטה' };
    drawTab($('#rec-tab'), item);
    return item;
  }

  function findCF(midi) {
    for (let ci = 0; ci < TUNING.length; ci++) {
      const fret = midi - TUNING[ci].midi;
      if (fret >= 0 && fret <= NUM_FRETS) return { c: ci, f: fret };
    }
    return { c: 0, f: Math.max(0, midi - TUNING[0].midi) };
  }

  function playBack() {
    if (!events.length) return;
    stopPlay();
    AudioEngine.ensureCtx();
    playing = true;
    const ctx = AudioEngine.ctx;
    const t0 = ctx.currentTime + 0.1;
    events.forEach(ev => {
      const { c, f } = findCF(ev.midi);
      AudioEngine.pluckCourse(c, f, t0 + ev.time, 0.5);
    });
    const totalDur = events[events.length - 1].time + events[events.length - 1].dur;
    setTimeout(() => { playing = false; $('#rec-stop-play').disabled = true; }, totalDur * 1000 + 200);
    $('#rec-play').disabled = true;
    $('#rec-stop-play').disabled = false;
  }

  function stopPlay() {
    playing = false;
    if ($('#rec-play')) $('#rec-play').disabled = false;
    if ($('#rec-stop-play')) $('#rec-stop-play').disabled = true;
  }

  function save() {
    if (!events.length) return;
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    saved.push({
      events: events.map(e => ({ midi: e.midi, time: e.time, dur: e.dur, name: e.name })),
      savedAt: new Date().toLocaleString('he-IL'),
      noteCount: events.length
    });
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    renderSaved();
  }

  function clear() {
    events = [];
    $('#rec-notes').innerHTML = '';
    $('#rec-tab').innerHTML = '';
    $('#rec-status').textContent = '';
    $('#rec-play').disabled = true;
    $('#rec-save').disabled = true;
    $('#rec-clear').disabled = true;
  }

  function renderSaved() {
    const wrap = $('#rec-saved-list');
    if (!wrap) return;
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    if (!saved.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = '<h3>הקלטות שמורות</h3>' + saved.map((s, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
        <span style="color:var(--aegean);">${s.noteCount} תווים</span>
        <small style="color:var(--text-dim);">${s.savedAt}</small>
        <button class="btn-sm" onclick="MelodyRecorder.loadSaved(${i})">טען</button>
        <button class="btn-sm" onclick="MelodyRecorder.deleteSaved(${i})">מחק</button>
      </div>
    `).join('');
  }

  function loadSaved(i) {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    if (!saved[i]) return;
    events = saved[i].events;
    $('#rec-notes').innerHTML = events.map(e =>
      `<div style="color:var(--aegean);">${e.name}  t=${e.time.toFixed(2)}s  dur=${e.dur.toFixed(2)}s</div>`
    ).join('');
    buildTab();
    $('#rec-play').disabled = false;
    $('#rec-clear').disabled = false;
    $('#rec-status').textContent = `נטען — ${events.length} תווים`;
  }

  function deleteSaved(i) {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    saved.splice(i, 1);
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    renderSaved();
  }

  function stop() {
    stopRec();
    stopPlay();
  }

  return { init, stop, loadSaved, deleteSaved };
})();


/* ================================================================
   4. SightReading — קריאה מראש
   ================================================================ */
const SightReading = (() => {
  let running = false;
  let micStream = null, micCtx = null, analyser = null;
  let pollTimer = null;
  let currentNote = null;
  let score = 0, total = 0, streak = 0;
  let level = 1;
  let showHints = true;
  let timeoutId = null;
  let notePool = [];

  function init() {
    const el = $('#sightread-app');
    if (!el) return;

    el.innerHTML = `
      <h2 class="section-title">קריאה מראש</h2>
      <p style="color:var(--text-dim);margin-bottom:12px;">צליל מוצג — נגנו אותו על הבוזוקי! המערכת מזהה אם ניגנתם נכון.</p>
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap;">
        <button id="sr-start" class="btn-primary">התחל</button>
        <button id="sr-stop" class="btn-secondary" disabled>עצור</button>
        <label style="display:flex;align-items:center;gap:4px;">
          <input type="checkbox" id="sr-hints" checked>
          הצג רמזים
        </label>
        <span>רמה: <strong id="sr-level">1</strong></span>
        <span>ניקוד: <strong id="sr-score">0</strong> / <strong id="sr-total">0</strong></span>
        <span>רצף: <strong id="sr-streak" style="color:var(--gold);">0</strong></span>
      </div>
      <div id="sr-display" style="text-align:center;margin:20px 0;">
        <div id="sr-note-name" style="font-size:64px;font-weight:900;color:var(--gold);min-height:80px;"></div>
        <div id="sr-solfege" style="font-size:28px;color:var(--aegean);min-height:36px;"></div>
        <div id="sr-hint" style="font-size:18px;color:var(--text-dim);min-height:26px;"></div>
      </div>
      <div id="sr-feedback" style="text-align:center;font-size:24px;font-weight:700;min-height:36px;margin-bottom:14px;"></div>
      <div style="overflow-x:auto;">
        <svg id="sr-fretboard" class="fretboard-svg"></svg>
      </div>
      <div id="sr-timer-bar" style="height:6px;background:var(--bg-elev);border-radius:3px;margin-top:10px;overflow:hidden;">
        <div id="sr-timer-fill" style="height:100%;background:var(--gold);width:100%;transition:width linear;"></div>
      </div>
    `;

    $('#sr-start').addEventListener('click', start);
    $('#sr-stop').addEventListener('click', stop);
    $('#sr-hints').addEventListener('change', (e) => { showHints = e.target.checked; });
  }

  function buildNotePool(lvl) {
    // Level 1: open strings only. Level 2: frets 0-3 on D string.
    // Level 3+: more frets, more strings
    const pool = [];
    const maxFret = Math.min(NUM_FRETS, 2 + lvl * 2);
    const maxCourse = Math.min(TUNING.length, Math.ceil(lvl / 2));
    for (let ci = 0; ci < maxCourse; ci++) {
      for (let f = 0; f <= maxFret; f++) {
        pool.push({ c: ci, f, midi: TUNING[ci].midi + f });
      }
    }
    return pool;
  }

  async function start() {
    score = 0; total = 0; streak = 0; level = 1;
    updateStats();
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
    } catch { $('#sr-feedback').textContent = 'לא ניתן לגשת למיקרופון'; return; }

    micCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = micCtx.createMediaStreamSource(micStream);
    analyser = micCtx.createAnalyser();
    analyser.fftSize = 2048;
    AudioEngine.micBoost(src).connect(analyser);

    running = true;
    $('#sr-start').disabled = true;
    $('#sr-stop').disabled = false;
    notePool = buildNotePool(level);
    nextNote();
  }

  function nextNote() {
    if (!running) return;
    currentNote = notePool[Math.floor(Math.random() * notePool.length)];
    const name = NOTE_NAMES[currentNote.midi % 12];

    $('#sr-note-name').textContent = name;
    $('#sr-solfege').textContent = SOLFEGE[name] || '';
    $('#sr-hint').textContent = showHints ? `מיתר ${['D', 'A', 'F', 'C'][currentNote.c]} — סריג ${currentNote.f}` : '';
    $('#sr-feedback').textContent = '';
    $('#sr-feedback').style.color = 'var(--text)';

    // highlight on fretboard
    drawFretboard($('#sr-fretboard'), (ci, fret, midi) => {
      if (ci === currentNote.c && fret === currentNote.f) {
        return { type: 'root', label: name };
      }
      return null;
    });

    // timer: time limit based on level
    const timeLimit = Math.max(3, 8 - level * 0.5);
    const fill = $('#sr-timer-fill');
    fill.style.transition = 'none';
    fill.style.width = '100%';
    requestAnimationFrame(() => {
      fill.style.transition = `width ${timeLimit}s linear`;
      fill.style.width = '0%';
    });

    timeoutId = setTimeout(() => {
      if (!running) return;
      total++;
      streak = 0;
      $('#sr-feedback').textContent = 'זמן!';
      $('#sr-feedback').style.color = 'var(--accent-red)';
      updateStats();
      setTimeout(() => nextNote(), 1200);
    }, timeLimit * 1000);

    // start listening
    if (pollTimer) clearInterval(pollTimer);
    let stableCount = 0;
    let stableMidi = null;
    pollTimer = setInterval(() => {
      if (!analyser || !running) return;
      const buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      const { freq, rms } = Listen.detectPitch(buf, micCtx.sampleRate);
      if (!freq || rms < 0.015) { stableCount = 0; stableMidi = null; return; }
      const midi = Math.round(69 + 12 * Math.log2(freq / 440));
      if (midi === stableMidi) {
        stableCount++;
      } else {
        stableMidi = midi;
        stableCount = 1;
      }
      if (stableCount >= 3) {
        checkAnswer(midi);
        stableCount = 0;
        stableMidi = null;
      }
    }, 30);
  }

  function checkAnswer(midi) {
    if (!currentNote) return;
    clearTimeout(timeoutId);
    clearInterval(pollTimer);
    total++;
    const targetPc = currentNote.midi % 12;
    const playedPc = ((midi % 12) + 12) % 12;

    if (playedPc === targetPc) {
      score++;
      streak++;
      $('#sr-feedback').textContent = 'נכון!';
      $('#sr-feedback').style.color = 'var(--ok)';
      // level up every 5 correct in a row
      if (streak > 0 && streak % 5 === 0) {
        level = Math.min(7, level + 1);
        notePool = buildNotePool(level);
        $('#sr-level').textContent = level;
      }
    } else {
      streak = 0;
      const playedName = NOTE_NAMES[playedPc];
      $('#sr-feedback').textContent = `לא — ניגנת ${playedName}`;
      $('#sr-feedback').style.color = 'var(--accent-red)';
    }
    updateStats();
    setTimeout(() => nextNote(), 1000);
  }

  function updateStats() {
    if ($('#sr-score')) $('#sr-score').textContent = score;
    if ($('#sr-total')) $('#sr-total').textContent = total;
    if ($('#sr-streak')) $('#sr-streak').textContent = streak;
    if ($('#sr-level')) $('#sr-level').textContent = level;
  }

  function stop() {
    running = false;
    clearTimeout(timeoutId);
    clearInterval(pollTimer);
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (micCtx) { micCtx.close(); micCtx = null; }
    analyser = null; currentNote = null;
    if ($('#sr-start')) $('#sr-start').disabled = false;
    if ($('#sr-stop')) $('#sr-stop').disabled = true;
    if ($('#sr-note-name')) $('#sr-note-name').textContent = '';
    if ($('#sr-solfege')) $('#sr-solfege').textContent = '';
    if ($('#sr-hint')) $('#sr-hint').textContent = '';
  }

  return { init, stop };
})();


/* ================================================================
   5. DrumMachine — מכונת תופים
   ================================================================ */
const DrumMachine = (() => {
  let scheduler = null;
  let playing = false;
  let grid = { dum: [], tek: [], click: [] };
  let steps = 16;
  let bpm = 100;
  const STORE_KEY = 'penia-drums-saved';

  // time signatures: [steps, grouping label]
  const TIME_SIGS = {
    '4/4': { steps: 16, groups: [4, 4, 4, 4] },
    '7/8': { steps: 14, groups: [3, 2, 2, 3, 2, 2] },  // 3+2+2 doubled
    '9/4': { steps: 9, groups: [2, 2, 2, 3] },
    '9/8': { steps: 18, groups: [2, 2, 2, 3, 2, 2, 2, 3] },
  };

  // Greek rhythm presets
  const PRESETS = {
    'זאימבקיקו': { sig: '9/4', bpm: 68, dum: [1,0,0,0,1,0,1,0,0], tek: [0,0,1,0,0,1,0,1,1], click: [1,0,0,0,0,0,1,0,0] },
    'חסאפיקו': { sig: '4/4', bpm: 80, dum: [1,0,0,0,1,0,0,0,1,0,0,0,1,0,0,0], tek: [0,0,1,0,0,0,1,1,0,0,1,0,0,0,1,1], click: [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,0] },
    'ציפטטלי': { sig: '4/4', bpm: 100, dum: [1,0,0,0,1,0,0,0,0,0,0,0,1,0,0,0], tek: [0,0,1,1,0,0,1,0,0,0,1,1,0,0,1,0], click: [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0] },
    'קלמטיאנוס': { sig: '7/8', bpm: 132, dum: [1,0,0,0,0,1,0,0,0,1,0,0,0,0], tek: [0,0,1,0,0,0,0,1,0,0,0,1,0,0], click: [1,0,0,0,0,0,0,0,0,0,0,0,0,0] },
    'קרסילמאס': { sig: '9/8', bpm: 170, dum: [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0,0,0], tek: [0,0,1,0,0,0,1,0,0,0,1,0,0,0,0,0,1,0], click: [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0] },
  };

  function init() {
    const el = $('#drums-app');
    if (!el) return;

    el.innerHTML = `
      <h2 class="section-title">מכונת תופים</h2>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;align-items:center;">
        <label>משקל:
          <select id="dm-sig" class="ctrl-select">
            ${Object.keys(TIME_SIGS).map(k => `<option value="${k}" ${k === '4/4' ? 'selected' : ''}>${k}</option>`).join('')}
          </select>
        </label>
        <label>BPM: <span id="dm-bpm-val">100</span>
          <input id="dm-bpm" type="range" min="60" max="200" value="100" style="width:120px;">
        </label>
        <label>תבנית:
          <select id="dm-preset" class="ctrl-select">
            <option value="">— בחירה —</option>
            ${Object.keys(PRESETS).map(k => `<option value="${k}">${k}</option>`).join('')}
          </select>
        </label>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
        <button id="dm-play" class="btn-primary">נגן</button>
        <button id="dm-stop" class="btn-secondary" disabled>עצור</button>
        <button id="dm-clear" class="btn-secondary">נקה הכל</button>
        <button id="dm-save" class="btn-secondary">שמור</button>
      </div>
      <div id="dm-grid" style="overflow-x:auto;"></div>
      <div id="dm-saved-list" style="margin-top:14px;"></div>
    `;

    initGrid('4/4');

    $('#dm-sig').addEventListener('change', (e) => initGrid(e.target.value));
    $('#dm-bpm').addEventListener('input', (e) => {
      bpm = +e.target.value;
      $('#dm-bpm-val').textContent = bpm;
    });
    $('#dm-preset').addEventListener('change', (e) => {
      if (!e.target.value) return;
      loadPreset(e.target.value);
    });
    $('#dm-play').addEventListener('click', play);
    $('#dm-stop').addEventListener('click', stop);
    $('#dm-clear').addEventListener('click', () => { clearGrid(); renderGrid(); });
    $('#dm-save').addEventListener('click', save);
    renderSaved();
  }

  function initGrid(sig) {
    const ts = TIME_SIGS[sig];
    steps = ts.steps;
    clearGrid();
    renderGrid();
  }

  function clearGrid() {
    grid = {
      dum: new Array(steps).fill(0),
      tek: new Array(steps).fill(0),
      click: new Array(steps).fill(0)
    };
  }

  function renderGrid() {
    const wrap = $('#dm-grid');
    if (!wrap) return;

    const tracks = [
      { key: 'dum', label: 'דום', color: 'var(--accent-red, #d96459)' },
      { key: 'tek', label: 'טק', color: 'var(--aegean, #4fb3d9)' },
      { key: 'click', label: 'קליק', color: 'var(--gold, #e3b341)' }
    ];

    const sig = $('#dm-sig')?.value || '4/4';
    const groups = TIME_SIGS[sig].groups;

    let html = '<table style="border-collapse:collapse;">';

    // step numbers header
    html += '<tr><td style="padding:4px 8px;color:var(--text-dim);font-size:11px;"></td>';
    let stepIdx = 0;
    for (const g of groups) {
      for (let i = 0; i < g; i++) {
        const border = i === 0 ? 'border-right:2px solid var(--line);' : '';
        html += `<td style="text-align:center;padding:2px 0;color:var(--text-dim);font-size:10px;width:28px;${border}">${stepIdx + 1}</td>`;
        stepIdx++;
      }
    }
    html += '</tr>';

    for (const track of tracks) {
      html += `<tr><td style="padding:4px 8px;color:${track.color};font-weight:700;font-size:13px;white-space:nowrap;">${track.label}</td>`;
      stepIdx = 0;
      for (const g of groups) {
        for (let i = 0; i < g; i++) {
          const on = grid[track.key][stepIdx];
          const border = i === 0 ? 'border-right:2px solid var(--line);' : '';
          html += `<td style="text-align:center;padding:2px;${border}">
            <div class="dm-cell" data-track="${track.key}" data-step="${stepIdx}"
                 style="width:24px;height:24px;border-radius:4px;cursor:pointer;margin:auto;
                        background:${on ? track.color : 'var(--bg-elev)'};
                        border:1px solid ${on ? track.color : 'var(--line)'};
                        opacity:${on ? 1 : 0.4};">
            </div>
          </td>`;
          stepIdx++;
        }
      }
      html += '</tr>';
    }
    html += '</table>';
    wrap.innerHTML = html;

    // click handlers
    wrap.querySelectorAll('.dm-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const track = cell.dataset.track;
        const step = +cell.dataset.step;
        grid[track][step] = grid[track][step] ? 0 : 1;
        renderGrid();
      });
    });
  }

  function loadPreset(name) {
    const p = PRESETS[name];
    if (!p) return;
    $('#dm-sig').value = p.sig;
    bpm = p.bpm;
    $('#dm-bpm').value = bpm;
    $('#dm-bpm-val').textContent = bpm;
    steps = TIME_SIGS[p.sig].steps;
    grid.dum = [...p.dum];
    grid.tek = [...p.tek];
    grid.click = [...p.click];
    // pad if needed
    while (grid.dum.length < steps) grid.dum.push(0);
    while (grid.tek.length < steps) grid.tek.push(0);
    while (grid.click.length < steps) grid.click.push(0);
    renderGrid();
  }

  function play() {
    stop();
    AudioEngine.ensureCtx();
    playing = true;

    const stepDur = 60 / bpm / 2; // 8th note subdivision

    scheduler = new AudioEngine.Scheduler(
      (step, time) => {
        const s = step % steps;
        if (grid.dum[s]) AudioEngine.dum(time);
        if (grid.tek[s]) AudioEngine.tek(time);
        if (grid.click[s]) AudioEngine.click(time, true);
      },
      (step) => {
        const s = step % steps;
        // highlight current step
        $$('#dm-grid .dm-cell').forEach(cell => {
          const isActive = +cell.dataset.step === s;
          cell.style.boxShadow = isActive ? '0 0 8px var(--gold)' : 'none';
        });
      }
    );
    scheduler.stepDur = stepDur;
    scheduler.numSteps = steps;
    scheduler.start();
    if (typeof activeSchedulers !== 'undefined') activeSchedulers.push(scheduler);
    $('#dm-play').disabled = true;
    $('#dm-stop').disabled = false;
  }

  function stop() {
    if (scheduler) { scheduler.stop(); scheduler = null; }
    playing = false;
    if ($('#dm-play')) $('#dm-play').disabled = false;
    if ($('#dm-stop')) $('#dm-stop').disabled = true;
    $$('#dm-grid .dm-cell').forEach(cell => { cell.style.boxShadow = 'none'; });
  }

  function save() {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    saved.push({
      grid: JSON.parse(JSON.stringify(grid)),
      sig: $('#dm-sig').value,
      bpm,
      steps,
      savedAt: new Date().toLocaleString('he-IL')
    });
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    renderSaved();
  }

  function renderSaved() {
    const wrap = $('#dm-saved-list');
    if (!wrap) return;
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    if (!saved.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = '<h3>תבניות שמורות</h3>' + saved.map((s, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin:4px 0;">
        <span style="color:var(--gold);">${s.sig} @ ${s.bpm} BPM</span>
        <small style="color:var(--text-dim);">${s.savedAt}</small>
        <button class="btn-sm" onclick="DrumMachine.loadSaved(${i})">טען</button>
        <button class="btn-sm" onclick="DrumMachine.deleteSaved(${i})">מחק</button>
      </div>
    `).join('');
  }

  function loadSaved(i) {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    if (!saved[i]) return;
    const s = saved[i];
    $('#dm-sig').value = s.sig;
    bpm = s.bpm;
    steps = s.steps;
    $('#dm-bpm').value = bpm;
    $('#dm-bpm-val').textContent = bpm;
    grid = s.grid;
    renderGrid();
  }

  function deleteSaved(i) {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
    saved.splice(i, 1);
    localStorage.setItem(STORE_KEY, JSON.stringify(saved));
    renderSaved();
  }

  return { init, stop, loadSaved, deleteSaved };
})();


/* ================================================================
   6. LiveAnalyzer — מנתח מוזיקלי חי
   ================================================================ */
const LiveAnalyzer = (() => {
  let micStream = null, micCtx = null, analyser = null;
  let recording = false;
  let recordedPitches = [];
  let recordTimer = null;

  function init() {
    const el = $('#analyzer-app');
    if (!el) return;

    el.innerHTML = `
      <h2 class="section-title">מנתח מוזיקלי חי</h2>
      <p style="color:var(--text-dim);margin-bottom:12px;">נגנו 5-10 שניות — המערכת תנתח את הצלילים ותזהה את הדרומוס.</p>
      <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">
        <label>משך הקלטה:
          <select id="la-duration" class="ctrl-select">
            <option value="5">5 שניות</option>
            <option value="7" selected>7 שניות</option>
            <option value="10">10 שניות</option>
          </select>
        </label>
        <button id="la-record" class="btn-primary">הקלט ונתח</button>
        <span id="la-status" style="color:var(--gold);"></span>
      </div>
      <div id="la-progress" style="height:6px;background:var(--bg-elev);border-radius:3px;margin-bottom:16px;overflow:hidden;display:none;">
        <div id="la-progress-fill" style="height:100%;background:var(--gold);width:0%;transition:width linear;"></div>
      </div>
      <div id="la-results" style="display:none;">
        <h3>תוצאות ניתוח</h3>
        <div id="la-matches" style="margin-bottom:16px;"></div>
        <h3>צלילים שזוהו</h3>
        <div id="la-chart" style="margin-bottom:16px;"></div>
        <div id="la-bpm" style="color:var(--text-dim);margin-bottom:10px;"></div>
      </div>
    `;

    $('#la-record').addEventListener('click', startRecord);
  }

  async function startRecord() {
    if (recording) return;
    recordedPitches = [];

    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
    } catch { $('#la-status').textContent = 'לא ניתן לגשת למיקרופון'; return; }

    micCtx = new (window.AudioContext || window.webkitAudioContext)();
    const src = micCtx.createMediaStreamSource(micStream);
    analyser = micCtx.createAnalyser();
    analyser.fftSize = 2048;
    AudioEngine.micBoost(src).connect(analyser);

    const duration = +$('#la-duration').value;
    recording = true;
    $('#la-record').disabled = true;
    $('#la-status').textContent = 'מקליט...';
    $('#la-progress').style.display = '';
    const fill = $('#la-progress-fill');
    fill.style.transition = 'none';
    fill.style.width = '0%';
    requestAnimationFrame(() => {
      fill.style.transition = `width ${duration}s linear`;
      fill.style.width = '100%';
    });
    $('#la-results').style.display = 'none';

    const startTime = performance.now();
    const onsets = [];

    recordTimer = setInterval(() => {
      if (!analyser) return;
      const buf = new Float32Array(analyser.fftSize);
      analyser.getFloatTimeDomainData(buf);
      const { freq, rms } = Listen.detectPitch(buf, micCtx.sampleRate);
      if (freq && rms > 0.015) {
        const midi = Math.round(69 + 12 * Math.log2(freq / 440));
        const pc = ((midi % 12) + 12) % 12;
        recordedPitches.push({ pc, midi, time: (performance.now() - startTime) / 1000, rms });
        // onset detection: rms spike
        if (recordedPitches.length >= 2) {
          const prev = recordedPitches[recordedPitches.length - 2];
          if (rms > prev.rms * 1.5 && rms > 0.03) {
            onsets.push((performance.now() - startTime) / 1000);
          }
        }
      }
    }, 25);

    setTimeout(() => {
      clearInterval(recordTimer);
      recording = false;
      if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
      if (micCtx) { micCtx.close(); micCtx = null; }
      analyser = null;
      $('#la-record').disabled = false;
      $('#la-status').textContent = '';
      $('#la-progress').style.display = 'none';
      analyze(onsets);
    }, duration * 1000);
  }

  function analyze(onsets) {
    if (recordedPitches.length < 5) {
      $('#la-status').textContent = 'לא זוהו מספיק צלילים. נסו שוב.';
      return;
    }

    // build chromagram: count each pitch class
    const chromagram = new Array(12).fill(0);
    recordedPitches.forEach(p => { chromagram[p.pc]++; });
    const totalPitches = recordedPitches.length;

    // normalize
    const maxCount = Math.max(...chromagram);

    // match against each dromos at every possible root
    const matches = [];
    for (const dromos of DROMOI) {
      for (let root = 0; root < 12; root++) {
        const scaleNotes = new Set(dromos.intervals.map(iv => (root + iv) % 12));
        let inScale = 0, total = 0;
        for (let pc = 0; pc < 12; pc++) {
          total += chromagram[pc];
          if (scaleNotes.has(pc)) inScale += chromagram[pc];
        }
        const confidence = total > 0 ? (inScale / total) * 100 : 0;
        // bonus: penalize if many notes outside scale
        const outScale = total - inScale;
        const adjusted = confidence - (outScale / Math.max(1, total)) * 15;
        matches.push({ dromos, root, rootName: NOTE_NAMES[root], confidence: Math.max(0, adjusted) });
      }
    }

    matches.sort((a, b) => b.confidence - a.confidence);
    const top3 = matches.slice(0, 3);

    // render results
    $('#la-results').style.display = '';
    $('#la-matches').innerHTML = top3.map((m, i) => {
      const barW = Math.max(5, m.confidence);
      const colors = ['var(--gold)', 'var(--aegean)', 'var(--ok)'];
      return `
        <div style="margin:8px 0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:700;color:${colors[i]};min-width:140px;">${m.dromos.nameHe} (${m.rootName})</span>
            <div style="flex:1;background:var(--bg-elev);border-radius:4px;height:20px;overflow:hidden;">
              <div style="width:${barW}%;height:100%;background:${colors[i]};border-radius:4px;transition:width 0.3s;"></div>
            </div>
            <span style="color:var(--text-dim);min-width:50px;">${m.confidence.toFixed(1)}%</span>
          </div>
        </div>
      `;
    }).join('');

    // render chart
    $('#la-chart').innerHTML = `
      <div style="display:flex;align-items:flex-end;gap:4px;height:120px;">
        ${chromagram.map((count, pc) => {
          const h = maxCount > 0 ? (count / maxCount) * 100 : 0;
          return `
            <div style="flex:1;text-align:center;">
              <div style="background:var(--aegean);height:${h}px;border-radius:3px 3px 0 0;margin:0 auto;width:20px;"></div>
              <div style="font-size:10px;color:var(--text-dim);margin-top:2px;">${NOTE_NAMES[pc]}</div>
              <div style="font-size:9px;color:var(--text-dim);">${count}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // BPM estimation from onsets
    if (onsets.length >= 3) {
      const intervals = [];
      for (let i = 1; i < onsets.length; i++) intervals.push(onsets[i] - onsets[i - 1]);
      intervals.sort((a, b) => a - b);
      // median interval
      const median = intervals[Math.floor(intervals.length / 2)];
      const estimatedBPM = median > 0 ? Math.round(60 / median) : 0;
      if (estimatedBPM >= 40 && estimatedBPM <= 240) {
        $('#la-bpm').textContent = `BPM משוער: ~${estimatedBPM}`;
      } else {
        $('#la-bpm').textContent = 'לא ניתן להעריך BPM';
      }
    } else {
      $('#la-bpm').textContent = 'לא מספיק אירועים להערכת BPM';
    }
  }

  function stop() {
    if (recordTimer) clearInterval(recordTimer);
    recording = false;
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (micCtx) { micCtx.close(); micCtx = null; }
    analyser = null;
  }

  return { init, stop };
})();


/* ================================================================
   7. MaqamGuide — מדריך מאקאמים
   ================================================================ */
const MaqamGuide = (() => {
  let compareMode = false;

  // Extended data for jins analysis and characteristics
  const JINS_MAP = {
    hitzaz:     { lower: 'חיג׳אז (1-4)', upper: 'ראסט/נהאוונד (4-8)', mood: 'מזרחי, דרמטי' },
    hitzazkiar: { lower: 'חיג׳אז (1-4)', upper: 'חיג׳אז (5-8)', mood: 'דרמטי כפול' },
    pireotikos: { lower: 'חיג׳אז (1-4)', upper: 'מיוחד עם #4', mood: 'גאה, שכונתי' },
    ousak:      { lower: 'כורד (1-4)', upper: 'נהאוונד (4-8)', mood: 'עצוב, פנימי' },
    sabah:      { lower: 'סבא (1-4)', upper: 'חיג׳אז (~4-8)', mood: 'שבור, כואב' },
    rast:       { lower: 'ראסט (1-4)', upper: 'ראסט (5-8)', mood: 'מאיר, יציב' },
    houzam:     { lower: 'סיכאה (1-4)', upper: 'ראסט (5-8)', mood: 'מתוק-מריר' },
    kiourdi:    { lower: 'נהאוונד (1-4)', upper: 'ראסט (5-8)', mood: 'זורם, ריקודי' },
    niavent:    { lower: 'ניקריז (1-5)', upper: 'חיג׳אז (5-8)', mood: 'מסתורי, סוער' },
    minore:     { lower: 'נהאוונד (1-4)', upper: 'חיג׳אז (4-8)', mood: 'מלנכולי, רומנטי' },
    matzore:    { lower: 'ראסט (1-4)', upper: 'ראסט (5-8)', mood: 'שמח, פתוח' },
    segiah:     { lower: 'סיכאה (1-4)', upper: 'ניקריז (4-8)', mood: 'אקזוטי, עשיר' },
    kartzigar:  { lower: 'כורד (1-4)', upper: 'חיג׳אז (4-8)', mood: 'מריר-מתוק' },
    souzinak:   { lower: 'ראסט (1-4)', upper: 'חיג׳אז (5-8)', mood: 'חגיגי עם צל' },
    nikriz:     { lower: 'ניקריז (1-5)', upper: 'כורד/ראסט (5-8)', mood: 'בלקני, נועז' },
  };

  const CHARACTERISTIC_PHRASES = {
    hitzaz:     [0, 1, 4, 5, 7, 5, 4, 1, 0],
    ousak:      [0, 1, 3, 5, 7, 5, 3, 1, 0],
    rast:       [0, 2, 4, 5, 7, 5, 4, 2, 0],
    minore:     [0, 2, 3, 5, 7, 8, 7, 5, 3, 2, 0],
    niavent:    [0, 2, 3, 6, 7, 6, 3, 2, 0],
    kiourdi:    [0, 2, 3, 5, 7, 9, 7, 5, 3, 2, 0],
    sabah:      [0, 2, 3, 4, 7, 4, 3, 2, 0],
    houzam:     [0, 3, 4, 5, 7, 5, 4, 3, 0],
    matzore:    [0, 2, 4, 5, 7, 9, 7, 5, 4, 2, 0],
  };

  function init() {
    const el = $('#maqam-app');
    if (!el) return;

    el.innerHTML = `
      <h2 class="section-title">מדריך מאקאמים / דרומוסים</h2>
      <div style="display:flex;gap:10px;margin-bottom:14px;align-items:center;flex-wrap:wrap;">
        <label>בחרו דרומוס:
          <select id="mq-select" class="ctrl-select">
            ${DROMOI.map(d => `<option value="${d.id}">${d.nameHe} (${d.nameEn})</option>`).join('')}
          </select>
        </label>
        <button id="mq-play-scale" class="btn-secondary">נגן סולם</button>
        <button id="mq-compare-btn" class="btn-secondary">השוואה בין דרומוסים</button>
      </div>
      <div id="mq-compare-panel" style="display:none;margin-bottom:14px;">
        <label>דרומוס לאשוואה:
          <select id="mq-compare-select" class="ctrl-select">
            ${DROMOI.map(d => `<option value="${d.id}">${d.nameHe}</option>`).join('')}
          </select>
        </label>
        <button id="mq-do-compare" class="btn-primary" style="margin-right:8px;">השווה</button>
      </div>
      <div id="mq-detail"></div>
      <div id="mq-compare-result"></div>
    `;

    $('#mq-select').addEventListener('change', () => renderDetail());
    $('#mq-play-scale').addEventListener('click', playScale);
    $('#mq-compare-btn').addEventListener('click', () => {
      compareMode = !compareMode;
      $('#mq-compare-panel').style.display = compareMode ? '' : 'none';
      if (!compareMode) $('#mq-compare-result').innerHTML = '';
    });
    $('#mq-do-compare').addEventListener('click', doCompare);

    renderDetail();
  }

  function renderDetail() {
    const id = $('#mq-select').value;
    const d = DROMOI.find(x => x.id === id);
    if (!d) return;
    const jins = JINS_MAP[id] || { lower: '—', upper: '—', mood: d.mood };
    const phrase = CHARACTERISTIC_PHRASES[id];

    // build scale note names from root D
    const rootMidi = 62; // D4
    const scaleNotes = d.intervals.map(iv => {
      const midi = rootMidi + iv;
      return NOTE_NAMES[midi % 12];
    });

    const wrap = $('#mq-detail');
    wrap.innerHTML = `
      <div style="background:var(--bg-card);border-radius:12px;padding:18px;margin-bottom:16px;">
        <h3 style="color:var(--gold);margin:0 0 8px;">${d.nameHe} — ${d.nameGr} — ${d.nameEn}</h3>
        <div style="color:var(--text-dim);margin-bottom:6px;">מקאם מקביל: ${d.maqam}</div>
        <div style="color:var(--text);margin-bottom:12px;">${d.desc}</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
          <div>
            <h4 style="color:var(--aegean);margin:0 0 4px;">אווירה</h4>
            <p style="margin:0;color:var(--text);">${d.mood}</p>
          </div>
          <div>
            <h4 style="color:var(--aegean);margin:0 0 4px;">דרגות</h4>
            <p style="margin:0;color:var(--text);font-family:monospace;">${d.degrees}</p>
          </div>
          <div>
            <h4 style="color:var(--aegean);margin:0 0 4px;">מרווחים (חצאי-טון)</h4>
            <p style="margin:0;color:var(--text);font-family:monospace;">${d.intervals.join(' — ')}</p>
          </div>
          <div>
            <h4 style="color:var(--aegean);margin:0 0 4px;">צלילי הסולם (מ-D)</h4>
            <p style="margin:0;color:var(--gold);font-weight:700;">${scaleNotes.join(' — ')}</p>
          </div>
        </div>

        <div style="background:var(--bg-elev);border-radius:8px;padding:12px;margin-bottom:14px;">
          <h4 style="color:var(--gold);margin:0 0 6px;">ניתוח ג׳ינס (אבני בניין)</h4>
          <div style="display:flex;gap:20px;flex-wrap:wrap;">
            <div>
              <span style="color:var(--text-dim);">ג׳ינס תחתון:</span>
              <span style="color:var(--aegean);font-weight:600;"> ${jins.lower}</span>
            </div>
            <div>
              <span style="color:var(--text-dim);">ג׳ינס עליון:</span>
              <span style="color:var(--aegean);font-weight:600;"> ${jins.upper}</span>
            </div>
          </div>
        </div>

        <div style="margin-bottom:14px;">
          <h4 style="color:var(--aegean);margin:0 0 4px;">טיפים לנגינה</h4>
          <p style="margin:0;color:var(--text);">${d.tips}</p>
        </div>

        <div style="margin-bottom:14px;">
          <h4 style="color:var(--aegean);margin:0 0 4px;">אקורדים אופייניים</h4>
          <p style="margin:0;color:var(--text);">${d.chords}</p>
        </div>

        <div style="margin-bottom:14px;">
          <h4 style="color:var(--aegean);margin:0 0 4px;">שירים מפורסמים</h4>
          <ul style="margin:0;padding-right:20px;color:var(--text);">
            ${(d.songs || []).map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>

        ${phrase ? `
        <div style="margin-bottom:14px;">
          <h4 style="color:var(--aegean);margin:0 0 4px;">פראזה אופיינית</h4>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
            ${phrase.map(iv => {
              const midi = rootMidi + iv;
              const name = NOTE_NAMES[midi % 12];
              return `<span style="background:var(--bg-elev);color:var(--gold);padding:4px 8px;border-radius:4px;font-weight:700;font-size:14px;cursor:pointer;" onclick="AudioEngine.pluckFromMidi(${midi},0,0.5)">${name}</span>`;
            }).join('')}
            <button class="btn-sm" onclick="MaqamGuide.playPhrase('${id}')">נגן פראזה</button>
          </div>
        </div>
        ` : ''}
      </div>

      <div style="overflow-x:auto;">
        <svg id="mq-fretboard" class="fretboard-svg"></svg>
      </div>
    `;

    // draw fretboard
    const rootPc = 2; // D
    const scaleSet = new Set(d.intervals.map(iv => (rootPc + iv) % 12));
    drawFretboard($('#mq-fretboard'), (ci, fret, midi) => {
      const pc = midi % 12;
      if (!scaleSet.has(pc)) return null;
      const isRoot = pc === rootPc;
      return { type: isRoot ? 'root' : 'note', label: NOTE_NAMES[pc] };
    });
  }

  function playScale() {
    const id = $('#mq-select').value;
    const d = DROMOI.find(x => x.id === id);
    if (!d) return;
    AudioEngine.playModeScale(d.intervals, 2, { gapMs: 350, gain: 0.48 });
  }

  function playPhrase(id) {
    const phrase = CHARACTERISTIC_PHRASES[id];
    if (!phrase) return;
    AudioEngine.playModeIntervals(phrase, 2, 0.3, 0.5);
  }

  function doCompare() {
    const id1 = $('#mq-select').value;
    const id2 = $('#mq-compare-select').value;
    const d1 = DROMOI.find(x => x.id === id1);
    const d2 = DROMOI.find(x => x.id === id2);
    if (!d1 || !d2) return;

    const rootMidi = 62;
    const set1 = new Set(d1.intervals.map(iv => (2 + iv) % 12));
    const set2 = new Set(d2.intervals.map(iv => (2 + iv) % 12));
    const common = [...set1].filter(pc => set2.has(pc));
    const only1 = [...set1].filter(pc => !set2.has(pc));
    const only2 = [...set2].filter(pc => !set1.has(pc));

    const j1 = JINS_MAP[id1] || { lower: '—', upper: '—' };
    const j2 = JINS_MAP[id2] || { lower: '—', upper: '—' };

    $('#mq-compare-result').innerHTML = `
      <div style="background:var(--bg-card);border-radius:12px;padding:18px;margin-top:10px;">
        <h3 style="color:var(--gold);">השוואה: ${d1.nameHe} / ${d2.nameHe}</h3>
        <table style="width:100%;border-collapse:collapse;margin-bottom:14px;">
          <tr style="border-bottom:1px solid var(--line);">
            <th style="text-align:right;padding:6px;color:var(--text-dim);"></th>
            <th style="text-align:center;padding:6px;color:var(--gold);">${d1.nameHe}</th>
            <th style="text-align:center;padding:6px;color:var(--aegean);">${d2.nameHe}</th>
          </tr>
          <tr style="border-bottom:1px solid var(--line);">
            <td style="padding:6px;color:var(--text-dim);">דרגות</td>
            <td style="text-align:center;padding:6px;color:var(--text);font-family:monospace;">${d1.degrees}</td>
            <td style="text-align:center;padding:6px;color:var(--text);font-family:monospace;">${d2.degrees}</td>
          </tr>
          <tr style="border-bottom:1px solid var(--line);">
            <td style="padding:6px;color:var(--text-dim);">מרווחים</td>
            <td style="text-align:center;padding:6px;color:var(--text);">${d1.intervals.join('-')}</td>
            <td style="text-align:center;padding:6px;color:var(--text);">${d2.intervals.join('-')}</td>
          </tr>
          <tr style="border-bottom:1px solid var(--line);">
            <td style="padding:6px;color:var(--text-dim);">ג׳ינס תחתון</td>
            <td style="text-align:center;padding:6px;color:var(--text);">${j1.lower}</td>
            <td style="text-align:center;padding:6px;color:var(--text);">${j2.lower}</td>
          </tr>
          <tr style="border-bottom:1px solid var(--line);">
            <td style="padding:6px;color:var(--text-dim);">ג׳ינס עליון</td>
            <td style="text-align:center;padding:6px;color:var(--text);">${j1.upper}</td>
            <td style="text-align:center;padding:6px;color:var(--text);">${j2.upper}</td>
          </tr>
          <tr>
            <td style="padding:6px;color:var(--text-dim);">אווירה</td>
            <td style="text-align:center;padding:6px;color:var(--text);">${d1.mood}</td>
            <td style="text-align:center;padding:6px;color:var(--text);">${d2.mood}</td>
          </tr>
        </table>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div>
            <span style="color:var(--ok);">צלילים משותפים:</span>
            <span style="color:var(--text);">${common.map(pc => NOTE_NAMES[pc]).join(', ') || 'אין'}</span>
          </div>
          <div>
            <span style="color:var(--gold);">רק ב${d1.nameHe}:</span>
            <span style="color:var(--text);">${only1.map(pc => NOTE_NAMES[pc]).join(', ') || 'אין'}</span>
          </div>
          <div>
            <span style="color:var(--aegean);">רק ב${d2.nameHe}:</span>
            <span style="color:var(--text);">${only2.map(pc => NOTE_NAMES[pc]).join(', ') || 'אין'}</span>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:14px;">
          <button class="btn-sm" onclick="MaqamGuide.playCompareScale('${id1}')">נגן ${d1.nameHe}</button>
          <button class="btn-sm" onclick="MaqamGuide.playCompareScale('${id2}')">נגן ${d2.nameHe}</button>
        </div>
      </div>
    `;
  }

  function playCompareScale(id) {
    const d = DROMOI.find(x => x.id === id);
    if (!d) return;
    AudioEngine.playModeScale(d.intervals, 2, { gapMs: 350, gain: 0.48, descending: false });
  }

  function stop() {
    AudioEngine.stopModeScale();
  }

  return { init, stop, playPhrase, playCompareScale };
})();
