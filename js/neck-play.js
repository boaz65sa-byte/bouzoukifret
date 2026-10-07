/* ============================================================
   למד שיר על הצוואר — נגינה מסונכרנת על צוואר טטראחורדו
   נקודה, אצבע, סולפג׳, תווים ורישה זזים יחד עם Karplus-Strong.
   ============================================================ */
'use strict';

const NeckPlay = (() => {
  const TOUR_KEY = 'bouzouki_neck_coach_v1';
  const COURSE_HE = ['רה', 'לה', 'פה', 'דו'];
  const COL = 86;
  const STAFF_LEFT = 98;
  const LINE_GAP = 12;
  const STAFF_BOTTOM = 80;
  const BOTTOM_STEP = 30; // מי של אוקטבה 4 — הקו התחתון

  const SPELL = [
    { he: 'דו', latin: 'Do', letter: 'C', acc: '', stepLetter: 'C' },
    { he: 'דו♯', latin: 'Do♯', letter: 'C♯', acc: '♯', stepLetter: 'C' },
    { he: 'רה', latin: 'Re', letter: 'D', acc: '', stepLetter: 'D' },
    { he: 'מי♭', latin: 'Mi♭', letter: 'E♭', acc: '♭', stepLetter: 'E' },
    { he: 'מי', latin: 'Mi', letter: 'E', acc: '', stepLetter: 'E' },
    { he: 'פה', latin: 'Fa', letter: 'F', acc: '', stepLetter: 'F' },
    { he: 'פה♯', latin: 'Fa♯', letter: 'F♯', acc: '♯', stepLetter: 'F' },
    { he: 'סול', latin: 'Sol', letter: 'G', acc: '', stepLetter: 'G' },
    { he: 'לא♭', latin: 'La♭', letter: 'A♭', acc: '♭', stepLetter: 'A' },
    { he: 'לא', latin: 'La', letter: 'A', acc: '', stepLetter: 'A' },
    { he: 'סי♭', latin: 'Si♭', letter: 'B♭', acc: '♭', stepLetter: 'B' },
    { he: 'סי', latin: 'Si', letter: 'B', acc: '', stepLetter: 'B' },
  ];
  const DIAT = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

  const BASIC_44 = {
    id: 'basic-44', nameHe: '4/4 בסיסי', meter: '4/4', beatsPerCell: 1, grid: ['D', 't', 't', 't'],
  };

  const TOUR = [
    { spot: '#neck-board-host', text: 'הנקודה הזהובה מראה בדיוק איפה ללחוץ על המיתר. המספר הזהוב למעלה הוא האצבע.' },
    { spot: '#neck-staff-wrap', text: 'מתחת לכל תו: השם בעברית ובלטינית, וחץ הרישה — למטה או למעלה.' },
    { spot: '#neck-timeline', text: 'הציר מחולק לתיבות ולקטעים. בחרו קטע וחזרו עליו עד שזה יושב.' },
    { spot: '#neck-tempo', text: 'כאן בוחרים קצב, מטרונום וספירה. תתחילו לאט, ואז תעלו.' },
  ];

  const state = {
    model: null,
    bpm: 96,
    playing: false,
    pausedBeat: 0,
    anchorTime: 0,
    anchorBeat: 0,
    scheduledTo: 0,
    clock: 'audio',
    timer: 0,
    raf: 0,
    seen: new Set(),
    metronome: false,
    countIn: true,
    countUntil: null,
    looping: false,
    repeatCount: Infinity,
    rangeMode: 'all',
    sectionId: null,
    measureA: 1,
    measureB: 4,
    rhythmId: 'hasapiko',
    scrubbing: false,
    finished: false,
    pausedByUser: false,
    lastIdx: -2,
    lastPass: -1,
    tourStep: -1,
    collapsed: false,
    userPinned: false,
    coach: null,
    tipLock: null,
    peekWasCollapsed: false,
    taps: [],
    layout: null,
  };

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function spell(midi) {
    const pc = ((midi % 12) + 12) % 12;
    const s = SPELL[pc];
    return {
      ...s,
      pill: s.he + ' / ' + s.latin + ' (' + s.letter + ')',
      lineHe: s.he,
      lineLatin: s.latin + ' (' + s.letter + ')',
    };
  }

  function staffStep(midi, stepLetter) {
    const octave = Math.floor(midi / 12) - 1;
    return octave * 7 + DIAT[stepLetter];
  }

  function yForStep(step) {
    return STAFF_BOTTOM - (step - BOTTOM_STEP) * (LINE_GAP / 2);
  }

  function meterBeats(meter) {
    const parts = String(meter || '4/4').split('/');
    return (+parts[0] || 4) * (4 / (+parts[1] || 4));
  }

  function rhythmChoices() {
    const ids = [
      ['hasapiko', null],
      ['zeibekiko', 'זאימבקיקו 9/4'],
      ['karsilamas', 'זאימבקיקו 9/8'],
      ['tsifteteli', null],
      ['syrtos', null],
    ];
    const list = [BASIC_44];
    ids.forEach(([id, name]) => {
      const row = (typeof RHYTHMS !== 'undefined' ? RHYTHMS : []).find((r) => r.id === id);
      if (!row) return;
      list.push({
        id: row.id,
        nameHe: name || row.nameHe,
        meter: row.meter,
        beatsPerCell: row.beatsPerCell,
        grid: row.grid,
      });
    });
    return list;
  }

  function getPattern() {
    return rhythmChoices().find((r) => r.id === state.rhythmId) || rhythmChoices()[0];
  }

  function fingerHomes(notes) {
    const bags = { 1: [], 2: [], 3: [], 4: [] };
    notes.forEach((n) => {
      if (!n.rest && n.finger >= 1 && n.finger <= 4) bags[n.finger].push(n.fret);
    });
    const homes = {};
    for (let f = 1; f <= 4; f++) {
      const arr = bags[f].slice().sort((a, b) => a - b);
      homes[f] = arr.length ? arr[Math.floor((arr.length - 1) / 2)] : f;
    }
    return homes;
  }

  function buildModel(song) {
    const beatsPerMeasure = meterBeats(song.meter);
    let beat = 0;
    const notes = song.notes.map((n, index) => {
      const start = beat;
      beat += n.duration;
      const rest = !!n.rest;
      let midi = null;
      let name = null;
      if (!rest && typeof TUNING !== 'undefined') {
        midi = TUNING[n.string].midi + n.fret;
        name = spell(midi);
      }
      return { ...n, index, start, end: beat, rest, midi, name };
    });
    const totalBeats = beat;
    const measureCount = Math.max(1, Math.round(totalBeats / beatsPerMeasure));
    const frets = notes.filter((n) => !n.rest).map((n) => n.fret);
    const maxFret = Math.max(7, Math.min(12, Math.max(0, ...frets)));
    return {
      song, notes, totalBeats, beatsPerMeasure, measureCount, maxFret,
      fingerHomes: fingerHomes(notes),
    };
  }

  function sectionBounds(id) {
    const sections = state.model.song.sections;
    let idx = sections.findIndex((s) => s.id === id);
    if (idx < 0) idx = 0;
    const start = sections[idx].startMeasure;
    const end = idx + 1 < sections.length ? sections[idx + 1].startMeasure - 1 : state.model.measureCount;
    return { start, end, id: sections[idx].id };
  }

  function region() {
    const m = state.model;
    if (!state.looping || state.rangeMode === 'all') return { start: 0, end: m.totalBeats };
    let a = state.measureA;
    let b = state.measureB;
    if (state.rangeMode === 'section') {
      const bounds = sectionBounds(state.sectionId || m.song.sections[0].id);
      a = bounds.start;
      b = bounds.end;
    }
    a = clamp(a, 1, m.measureCount);
    b = clamp(b, a, m.measureCount);
    return {
      start: (a - 1) * m.beatsPerMeasure,
      end: Math.min(m.totalBeats, b * m.beatsPerMeasure),
    };
  }

  function noteIndexAt(beat) {
    const notes = state.model.notes;
    let idx = -1;
    for (let i = 0; i < notes.length; i++) {
      if (notes[i].start <= beat + 0.03) idx = i;
      else break;
    }
    return idx;
  }

  function armClock() {
    const ctx = AudioEngine.ensureCtx();
    try { ctx.resume(); } catch (e) { /* הדפדפן יבקש מחווה */ }
    state.clock = ctx.state === 'running' ? 'audio' : 'wall';
    return ctx;
  }

  function clockNow() {
    if (state.clock === 'audio' && AudioEngine.ctx) return AudioEngine.ctx.currentTime;
    return performance.now() / 1000;
  }

  function toWhen(clockTime) {
    const ctx = AudioEngine.ctx;
    if (!ctx) return clockTime;
    if (state.clock === 'audio') return clockTime;
    return ctx.currentTime + (clockTime - performance.now() / 1000);
  }

  function playTransport() {
    return state.anchorBeat + (clockNow() - state.anchorTime) * (state.bpm / 60);
  }

  function visualFrom(transport) {
    const total = state.model.totalBeats;
    const reg = region();
    const len = Math.max(0.001, reg.end - reg.start);
    const bar = state.model.beatsPerMeasure;
    if (state.countUntil != null && transport < state.countUntil - 1e-4) {
      const origin = state.countUntil - bar;
      const num = clamp(Math.floor(transport - origin + 1e-6) + 1, 1, Math.round(bar));
      return { countIn: true, countNum: num, beat: state.countUntil, pass: -1, done: false };
    }
    if (!state.looping) {
      if (transport >= total - 1e-3) return { done: true, beat: Math.max(0, total - 0.001), countIn: false, pass: 0 };
      return { done: false, beat: Math.max(0, transport), countIn: false, pass: 0 };
    }
    if (transport < reg.start) return { done: false, beat: reg.start, countIn: false, pass: 0 };
    const rel = transport - reg.start;
    const pass = Math.floor(rel / len + 1e-8);
    if (state.repeatCount !== Infinity && pass >= state.repeatCount) {
      return { done: true, beat: Math.max(reg.start, reg.end - 0.001), countIn: false, pass };
    }
    return { done: false, beat: reg.start + (rel % len), countIn: false, pass };
  }

  function transportsFor(noteStart, from, to, reg, looping, len, maxPass) {
    const out = [];
    if (!looping) {
      if (noteStart >= from - 1e-3 && noteStart < to && noteStart < reg.end - 1e-6) out.push(noteStart);
      return out;
    }
    if (noteStart < reg.start - 1e-6 || noteStart >= reg.end - 1e-6) return out;
    const offset = noteStart - reg.start;
    let pass = Math.floor((from - reg.start - offset) / len + 1e-6);
    if (pass < 0) pass = 0;
    for (let p = pass; p <= maxPass && p < pass + 4; p++) {
      const t = reg.start + p * len + offset;
      if (t >= to) break;
      if (t >= from - 1e-3) out.push(t);
    }
    return out;
  }

  function schedule() {
    if (!state.playing || !state.model) return;
    const spb = 60 / state.bpm;
    const horizonBeat = state.anchorBeat + ((clockNow() + 0.18) - state.anchorTime) / spb;
    const from = state.scheduledTo;
    const to = horizonBeat;
    const reg = region();
    const looping = state.looping;
    const len = Math.max(0.001, reg.end - reg.start);
    const maxPass = looping ? (state.repeatCount === Infinity ? 100000 : state.repeatCount - 1) : 0;

    state.model.notes.forEach((n) => {
      if (n.rest) return;
      transportsFor(n.start, from, to, reg, looping, len, maxPass).forEach((t) => {
        const key = 'n' + n.index + '@' + t.toFixed(3);
        if (state.seen.has(key)) return;
        state.seen.add(key);
        const when = toWhen(state.anchorTime + (t - state.anchorBeat) * spb);
        AudioEngine.pluckCourse(n.string, n.fret, when, n.pick === 'u' ? 0.34 : 0.52);
      });
    });
    scheduleClicks(from, to, reg, looping, len, spb);
    state.scheduledTo = to;
    if (state.seen.size > 4000) state.seen.clear();
  }

  function scheduleClicks(from, to, reg, looping, len, spb) {
    const pattern = getPattern();
    const cell = pattern.beatsPerCell || 1;
    const cycle = pattern.grid.length * cell;
    const bar = state.model.beatsPerMeasure;
    const endLimit = looping
      ? (state.repeatCount === Infinity ? Infinity : reg.start + state.repeatCount * len)
      : state.model.totalBeats;
    const step = Math.min(1, cell);
    let b = Math.round(Math.ceil((from - 1e-4) / step) * step * 1000) / 1000;
    let guard = 0;
    while (b < to - 1e-4 && b < endLimit - 1e-4 && guard++ < 64) {
      const inCount = state.countUntil != null && b < state.countUntil - 1e-4;
      if (inCount && state.countIn && Math.abs(b - Math.round(b)) < 0.02) {
        const key = 'c@' + b.toFixed(3);
        if (!state.seen.has(key)) {
          state.seen.add(key);
          const beatIn = Math.round(b - (state.countUntil - bar));
          AudioEngine.click(toWhen(state.anchorTime + (b - state.anchorBeat) * spb), beatIn % Math.round(bar) === 0);
        }
      } else if (state.metronome && !inCount) {
        const songB = looping ? (reg.start + ((b - reg.start) % len + len) % len) : b;
        const mod = ((songB % cell) + cell) % cell;
        if (mod < 0.04 || Math.abs(mod - cell) < 0.04) {
          const local = ((songB % cycle) + cycle) % cycle;
          const idx = Math.round(local / cell) % pattern.grid.length;
          const g = pattern.grid[idx];
          if (g === 'D' || g === 't') {
            const key = 'm' + g + '@' + b.toFixed(3);
            if (!state.seen.has(key)) {
              state.seen.add(key);
              const when = toWhen(state.anchorTime + (b - state.anchorBeat) * spb);
              if (g === 'D') AudioEngine.dum(when, 0.4);
              else AudioEngine.tek(when, 0.3);
            }
          }
        }
      }
      b = Math.round((b + step) * 1000) / 1000;
    }
  }

  function halt() {
    state.playing = false;
    if (state.timer) clearInterval(state.timer);
    state.timer = 0;
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    state.countUntil = null;
    updatePlayButton();
  }

  function stop() {
    if (state.playing) {
      const v = visualFrom(playTransport());
      if (!v.countIn) state.pausedBeat = v.beat;
    }
    halt();
  }

  function frame() {
    if (!state.playing) return;
    const v = visualFrom(playTransport());
    if (v.done) {
      state.pausedBeat = v.beat;
      state.finished = true;
      halt();
      renderPosition(v);
      onFinished();
      return;
    }
    renderPosition(v);
    expireTip();
    state.raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!state.model) return;
    if (state.tourStep >= 0) finishTour();
    const reg = region();
    let beat = state.pausedBeat;
    if (state.finished || beat >= state.model.totalBeats - 0.02) beat = state.looping ? reg.start : 0;
    if (state.looping && (beat < reg.start - 0.01 || beat >= reg.end - 0.02)) beat = reg.start;
    state.pausedBeat = beat;
    const origin = state.looping ? reg.start : 0;
    const atStart = Math.abs(beat - origin) < 0.06;
    let transport = beat;
    state.countUntil = null;
    if (state.countIn && atStart) {
      state.countUntil = origin;
      transport = origin - state.model.beatsPerMeasure;
    }
    armClock();
    state.anchorTime = clockNow() + 0.05;
    state.anchorBeat = transport;
    state.scheduledTo = transport;
    state.seen.clear();
    state.playing = true;
    state.finished = false;
    state.pausedByUser = false;
    state.lastPass = -1;
    state.lastIdx = -2;
    if (!state.userPinned) state.collapsed = true;
    if (state.tourStep < 0) state.coach = activeTip();
    renderCoach();
    updatePlayButton();
    if (state.timer) clearInterval(state.timer);
    state.timer = setInterval(schedule, 32);
    if (state.raf) cancelAnimationFrame(state.raf);
    frame();
  }

  function toggle() {
    if (state.playing) {
      stop();
      state.pausedByUser = true;
      if (state.tourStep < 0) {
        state.tipLock = null;
        state.coach = {
          text: 'השהיתם. צעדו תו־תו עם החצים, או המשיכו כשנוח.',
          look: '#neck-play', spot: '#neck-play',
        };
        state.collapsed = false;
        state.userPinned = true;
        renderCoach();
      }
      return;
    }
    start();
  }

  function seek(beat, opts) {
    const total = state.model.totalBeats;
    beat = clamp(beat, 0, Math.max(0, total - 0.001));
    state.pausedBeat = beat;
    state.finished = false;
    state.countUntil = null;
    if (state.playing) {
      state.anchorBeat = beat;
      state.anchorTime = clockNow() + 0.04;
      state.scheduledTo = beat;
      state.seen.clear();
      state.lastPass = -1;
    }
    renderPosition(state.playing ? visualFrom(playTransport()) : { beat, countIn: false, pass: 0, done: false });
    if (opts && opts.pluck && !state.playing) pluckCurrent();
  }

  function step(dir) {
    const notes = state.model.notes;
    const beat = state.playing ? visualFrom(playTransport()).beat : state.pausedBeat;
    let i = noteIndexAt(beat);
    if (i < 0) i = 0;
    const target = dir > 0
      ? Math.min(notes.length - 1, i + 1)
      : (beat > notes[i].start + 0.08 ? i : Math.max(0, i - 1));
    const was = state.playing;
    seek(notes[target].start);
    if (!was) {
      pluckCurrent();
      state.pausedByUser = true;
      if (state.tourStep < 0 && !state.collapsed) {
        state.coach = noteTip(notes[target]);
        renderCoach();
      }
    }
  }

  function pluckCurrent() {
    const idx = noteIndexAt(state.pausedBeat);
    const n = idx >= 0 ? state.model.notes[idx] : null;
    if (!n || n.rest) return;
    AudioEngine.ensureCtx();
    AudioEngine.pluckCourse(n.string, n.fret, 0, n.pick === 'u' ? 0.34 : 0.5);
  }

  function setBpm(value, opts) {
    const bpm = clamp(Math.round(+value || state.bpm), 40, 200);
    if (state.playing) {
      const t = playTransport();
      state.anchorBeat = t;
      state.anchorTime = clockNow();
      state.scheduledTo = t;
      state.seen.clear();
    }
    state.bpm = bpm;
    const num = document.getElementById('neck-bpm');
    const range = document.getElementById('neck-bpm-range');
    if (num && !(opts && opts.keepNumber)) num.value = String(bpm);
    if (range && document.activeElement !== range) range.value = String(bpm);
    if (opts && opts.tip) {
      peek('הקצב עכשיו ' + bpm + '. לאט רואים את האצבע, מהר בונים זרימה.', '#neck-tempo');
    }
  }

  function tapTempo() {
    const now = performance.now();
    if (state.taps.length && now - state.taps[state.taps.length - 1] > 2200) state.taps = [];
    state.taps.push(now);
    if (state.taps.length > 5) state.taps.shift();
    if (state.taps.length >= 2) {
      let sum = 0;
      for (let i = 1; i < state.taps.length; i++) sum += state.taps[i] - state.taps[i - 1];
      setBpm(60000 / (sum / (state.taps.length - 1)), { tip: true });
    }
  }

  /* ---------- ציור ---------- */

  function layoutNeck(maxFret) {
    const nutX = 748;
    const boardLeft = 132;
    const boardTop = 54;
    const boardBot = 228;
    const span = nutX - boardLeft;
    const full = 1 - Math.pow(2, -maxFret / 12);
    function wireX(fret) {
      if (fret <= 0) return nutX;
      const pos = (1 - Math.pow(2, -fret / 12)) / full;
      return nutX - pos * span;
    }
    function spaceX(fret) {
      if (fret <= 0) return nutX + 30;
      return (wireX(fret - 1) + wireX(fret)) / 2;
    }
    function courseY(i) { return 74 + i * 44; }
    return { nutX, boardLeft, boardTop, boardBot, maxFret, wireX, spaceX, courseY };
  }

  function renderNeck() {
    const L = state.layout;
    const labels = [
      { he: 'רה', en: 'D' },
      { he: 'לה', en: 'A' },
      { he: 'פה', en: 'F' },
      { he: 'דו', en: 'C' },
    ];
    let frets = '';
    for (let f = 1; f <= L.maxFret; f++) {
      const x = L.wireX(f).toFixed(1);
      frets += '<line x1="' + x + '" y1="' + L.boardTop + '" x2="' + x + '" y2="' + L.boardBot + '" stroke="url(#neckFret)" stroke-width="2.4"/>';
    }
    let inlays = '';
    [3, 5, 7, 9, 12, 15].forEach((f) => {
      if (f > L.maxFret) return;
      const x = L.spaceX(f);
      const mid = (L.courseY(1) + L.courseY(2)) / 2;
      if (f === 12) {
        inlays += '<circle cx="' + x + '" cy="' + (mid - 28) + '" r="5" fill="#f4e6c4" opacity="0.9"/>';
        inlays += '<circle cx="' + x + '" cy="' + (mid + 28) + '" r="5" fill="#f4e6c4" opacity="0.9"/>';
      } else {
        inlays += '<circle cx="' + x + '" cy="' + mid + '" r="5.5" fill="#f4e6c4" opacity="0.92"/>';
      }
    });
    let strings = '';
    for (let i = 0; i < 4; i++) {
      const y = L.courseY(i);
      const octave = typeof TUNING !== 'undefined' && TUNING[i].pair === 'octave';
      const x1 = 28;
      const x2 = 820;
      strings += '<line x1="' + x1 + '" y1="' + (y - 3.4) + '" x2="' + x2 + '" y2="' + (y - 3.4) + '" stroke="#f0e2c0" stroke-width="' + (octave ? 1.15 : 1.7) + '" opacity="0.95"/>';
      strings += '<line x1="' + x1 + '" y1="' + (y + 3.4) + '" x2="' + x2 + '" y2="' + (y + 3.4) + '" stroke="#d9c49a" stroke-width="' + (octave ? 2.1 : 1.7) + '" opacity="0.9"/>';
    }
    let pill = '<rect x="46" y="58" width="78" height="164" rx="39" fill="#1a110c" stroke="#e8c56b" stroke-width="1.4" opacity="0.92"/>';
    labels.forEach((lb, i) => {
      const y = L.courseY(i);
      pill += '<text x="85" y="' + (y - 2) + '" text-anchor="middle" class="neck-course-he">' + lb.he + '</text>';
      pill += '<text x="85" y="' + (y + 14) + '" text-anchor="middle" class="neck-course-en">' + lb.en + '</text>';
    });
    let fingers = '<text x="148" y="28" class="neck-finger-label">האצבעות</text>';
    for (let f = 1; f <= 4; f++) {
      const home = state.model.fingerHomes[f];
      const x = L.spaceX(clamp(home, 1, L.maxFret));
      fingers += '<text id="neck-finger-' + f + '" x="' + x + '" y="30" text-anchor="middle" class="neck-finger">' + f + '</text>';
    }
    const pegs = [0, 1, 2, 3].map((i) => {
      const x = 868 + i * 28;
      return '<line x1="' + x + '" y1="78" x2="' + x + '" y2="58" stroke="#4a301c" stroke-width="3"/>'
        + '<circle cx="' + x + '" cy="54" r="7" fill="#2a1a10" stroke="#e8c56b" stroke-width="1.4"/>'
        + '<line x1="' + x + '" y1="196" x2="' + x + '" y2="214" stroke="#4a301c" stroke-width="3"/>'
        + '<circle cx="' + x + '" cy="218" r="7" fill="#2a1a10" stroke="#e8c56b" stroke-width="1.4"/>';
    }).join('');

    const svg = '<svg class="neck-svg" viewBox="0 0 1000 250" role="img" aria-label="צוואר בוזוקי טטראחורדו">'
      + '<defs>'
      + '<linearGradient id="neckWood" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="#8d5a34"/><stop offset="0.45" stop-color="#c4894e"/>'
      + '<stop offset="0.55" stop-color="#a56b3a"/><stop offset="1" stop-color="#4e301c"/>'
      + '</linearGradient>'
      + '<linearGradient id="neckHead" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0" stop-color="#6b4124"/><stop offset="1" stop-color="#3a2416"/>'
      + '</linearGradient>'
      + '<linearGradient id="neckFret" x1="0" y1="0" x2="0" y2="1">'
      + '<stop offset="0" stop-color="#f7f3ea"/><stop offset="0.5" stop-color="#b7b0a4"/><stop offset="1" stop-color="#f3efe6"/>'
      + '</linearGradient>'
      + '<filter id="neckGlow" x="-80%" y="-80%" width="260%" height="260%">'
      + '<feGaussianBlur stdDeviation="3.2" result="b"/>'
      + '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>'
      + '</filter>'
      + '</defs>'
      + '<ellipse cx="36" cy="140" rx="78" ry="108" fill="url(#neckWood)"/>'
      + '<ellipse cx="18" cy="140" rx="16" ry="22" fill="none" stroke="#3a2414" stroke-width="3"/>'
      + '<ellipse cx="18" cy="140" rx="6" ry="8" fill="#2a1a10"/>'
      + '<rect x="' + L.boardLeft + '" y="' + L.boardTop + '" width="' + (L.nutX - L.boardLeft) + '" height="' + (L.boardBot - L.boardTop) + '" rx="8" fill="url(#neckWood)"/>'
      + '<ellipse cx="' + ((L.boardLeft + L.nutX) / 2) + '" cy="' + (L.boardTop + 10) + '" rx="200" ry="8" fill="#fff" opacity="0.1"/>'
      + inlays + frets
      + '<rect x="' + L.nutX + '" y="' + (L.boardTop - 3) + '" width="8" height="' + (L.boardBot - L.boardTop + 6) + '" rx="1.5" fill="#f6f1e6"/>'
      + '<rect x="' + (L.nutX + 14) + '" y="' + (L.boardTop + 6) + '" width="46" height="' + (L.boardBot - L.boardTop - 12) + '" rx="4" fill="#5c3b24" opacity="0.45"/>'
      + '<path d="M820 62 C 900 48, 980 70, 986 108 C 992 150, 960 196, 820 188 Z" fill="url(#neckHead)"/>'
      + pegs + strings + pill
      + '<text x="792" y="40" text-anchor="middle" class="neck-open-label">פתוח</text>'
      + fingers
      + '<g id="neck-dot" transform="translate(792 74)" opacity="0">'
      + '<circle r="8" fill="none" stroke="#ffe7a3" stroke-width="2">'
      + '<animate attributeName="r" values="8;22" dur="1.15s" repeatCount="indefinite"/>'
      + '<animate attributeName="opacity" values="0.8;0" dur="1.15s" repeatCount="indefinite"/>'
      + '</circle>'
      + '<circle r="7.5" fill="#ffe7a3" stroke="#fff6d8" stroke-width="1.5" filter="url(#neckGlow)"/>'
      + '</g>'
      + '</svg>';
    document.getElementById('neck-board-host').innerHTML = svg + '<div id="neck-count" class="neck-count" hidden></div>';
  }

  function renderStaff() {
    const notes = state.model.notes;
    const width = STAFF_LEFT + notes.length * COL + 36;
    const pickY = STAFF_BOTTOM + 28;
    const heY = pickY + 18;
    const latY = heY + 14;
    const H = latY + 16;
    const topLine = STAFF_BOTTOM - 4 * LINE_GAP;
    let body = '';
    for (let i = 0; i < 5; i++) {
      const y = STAFF_BOTTOM - i * LINE_GAP;
      body += '<line x1="8" y1="' + y + '" x2="' + (width - 10) + '" y2="' + y + '" stroke="#3d2c1c" stroke-width="1.15"/>';
    }
    body += '<path d="M26 96 C26 78 40 70 44 60 C48 50 42 36 32 30 C22 24 20 10 34 6 C46 2 56 12 54 24 C52 32 44 36 38 34 C34 32 34 26 40 26 C42 34 36 46 32 56 C24 74 30 90 46 98 C56 104 62 96 58 86 C54 78 46 78 46 86" fill="none" stroke="#2c2118" stroke-width="2.4" stroke-linecap="round"/>';
    const meter = state.model.song.meter.split('/');
    body += '<text x="74" y="' + (topLine + 16) + '" text-anchor="middle" class="neck-meter">' + meter[0] + '</text>';
    body += '<text x="74" y="' + (STAFF_BOTTOM - 2) + '" text-anchor="middle" class="neck-meter">' + meter[1] + '</text>';
    body += '<rect id="neck-playcol" x="0" y="6" width="' + (COL - 14) + '" height="' + (H - 12) + '" rx="8" fill="rgba(224,168,46,0.30)" opacity="0"/>';

    notes.forEach((n, i) => {
      const x = STAFF_LEFT + i * COL + COL / 2;
      const measure = Math.floor(n.start / state.model.beatsPerMeasure + 1e-6) + 1;
      const barStart = i === 0 || Math.abs(n.start / state.model.beatsPerMeasure - Math.round(n.start / state.model.beatsPerMeasure)) < 0.02
        && (i === 0 || Math.abs(notes[i - 1].start / state.model.beatsPerMeasure - Math.round(notes[i - 1].start / state.model.beatsPerMeasure)) >= 0.02
          || Math.floor(notes[i - 1].start / state.model.beatsPerMeasure + 1e-6) !== Math.floor(n.start / state.model.beatsPerMeasure + 1e-6));
      if (barStart) {
        if (measure > 1) {
          const bx = x - COL / 2;
          body += '<line x1="' + bx + '" y1="' + topLine + '" x2="' + bx + '" y2="' + STAFF_BOTTOM + '" stroke="#3d2c1c" stroke-width="1.3"/>';
        }
        body += '<text x="' + (x - COL / 2 + 6) + '" y="16" class="neck-barnum">' + measure + '</text>';
      }
      if (n.rest) {
        body += '<g class="neck-note" data-i="' + i + '" data-x="' + x + '">'
          + '<path d="M ' + x + ' ' + (STAFF_BOTTOM - 46) + ' l 7 7 l -9 7 l 9 7 l -7 7" fill="none" class="neck-rest" stroke="#2c2118" stroke-width="2" stroke-linecap="round"/>'
          + '<text x="' + x + '" y="' + heY + '" text-anchor="middle" class="neck-pname">שקט</text>'
          + '</g>';
        return;
      }
      const step = staffStep(n.midi, n.name.stepLetter);
      const y = yForStep(step);
      const stemUp = step < 34;
      const whole = n.duration >= 3.5;
      const open = n.duration >= 2 && !whole;
      let ledgers = '';
      if (step <= 28) for (let k = 28; k >= step; k -= 2) ledgers += ledger(x, yForStep(k));
      if (step >= 40) for (let k = 40; k <= step; k += 2) ledgers += ledger(x, yForStep(k));
      const headFill = open || whole ? '#f4e7c8' : '#2c2118';
      let glyph = ledgers;
      if (n.name.acc) {
        glyph += '<text x="' + (x - 16) + '" y="' + (y + 5) + '" text-anchor="middle" class="neck-acc">' + n.name.acc + '</text>';
      }
      glyph += '<ellipse class="neck-head" cx="' + x + '" cy="' + y + '" rx="' + (whole ? 8 : 6.5) + '" ry="4.6" transform="rotate(-18 ' + x + ' ' + y + ')" fill="' + headFill + '" stroke="#2c2118" stroke-width="1.5"/>';
      if (!whole) {
        const sx = stemUp ? x + 5.4 : x - 5.4;
        const y2 = stemUp ? y - 34 : y + 34;
        glyph += '<line class="neck-stem" x1="' + sx + '" y1="' + y + '" x2="' + sx + '" y2="' + y2 + '" stroke="#2c2118" stroke-width="1.45"/>';
        if (n.duration < 1) {
          const d = stemUp
            ? 'M ' + sx + ' ' + y2 + ' c 11 3 14 12 3 20'
            : 'M ' + sx + ' ' + y2 + ' c 11 -3 14 -12 3 -20';
          glyph += '<path class="neck-flag" d="' + d + '" fill="none" stroke="#2c2118" stroke-width="1.6" stroke-linecap="round"/>';
        }
      }
      if (Math.abs(n.duration - 3) < 0.01 || Math.abs(n.duration - 1.5) < 0.01) {
        glyph += '<circle cx="' + (x + 14) + '" cy="' + (y - 5) + '" r="2.1" fill="#2c2118"/>';
      }
      const arrow = n.pick === 'u' ? '∧' : '▼';
      glyph += '<text x="' + x + '" y="' + pickY + '" text-anchor="middle" class="neck-pick">' + arrow + '</text>';
      glyph += '<text x="' + x + '" y="' + heY + '" text-anchor="middle" class="neck-pname">' + esc(n.name.lineHe) + '</text>';
      glyph += '<text x="' + x + '" y="' + latY + '" text-anchor="middle" class="neck-latin">' + esc(n.name.lineLatin) + '</text>';
      body += '<g class="neck-note" data-i="' + i + '" data-x="' + x + '">' + glyph + '</g>';
    });
    const endX = STAFF_LEFT + notes.length * COL;
    body += '<line x1="' + endX + '" y1="' + topLine + '" x2="' + endX + '" y2="' + STAFF_BOTTOM + '" stroke="#3d2c1c" stroke-width="3"/>';
    body += '<line x1="' + (endX + 6) + '" y1="' + topLine + '" x2="' + (endX + 6) + '" y2="' + STAFF_BOTTOM + '" stroke="#3d2c1c" stroke-width="1.2"/>';
    document.getElementById('neck-staff-wrap').innerHTML = '<svg id="neck-staff-svg" class="neck-staff-svg" viewBox="0 0 ' + width + ' ' + H + '" width="' + width + '" height="' + H + '">' + body + '</svg>';
  }

  function ledger(x, y) {
    return '<line x1="' + (x - 12) + '" y1="' + y + '" x2="' + (x + 12) + '" y2="' + y + '" stroke="#3d2c1c" stroke-width="1.2"/>';
  }

  function renderTimeline() {
    const m = state.model;
    const sections = m.song.sections.map((section, idx) => {
      const end = idx + 1 < m.song.sections.length ? m.song.sections[idx + 1].startMeasure - 1 : m.measureCount;
      const span = end - section.startMeasure + 1;
      return '<button type="button" class="neck-section-btn" data-section="' + esc(section.id) + '" style="flex:' + span + '">' + esc(section.nameHe) + '</button>';
    }).join('');
    let cells = '';
    for (let i = 1; i <= m.measureCount; i++) {
      cells += '<button type="button" class="neck-measure" data-m="' + i + '">' + i + '</button>';
    }
    document.getElementById('neck-timeline').innerHTML = '<div class="neck-tl-sections">' + sections + '</div>'
      + '<div class="neck-tl-bar" id="neck-tl-bar">'
      + '<div class="neck-tl-loop" id="neck-tl-loop" hidden></div>'
      + '<div class="neck-tl-measures">' + cells + '</div>'
      + '<div class="neck-tl-head" id="neck-tl-head"></div>'
      + '</div>';
  }

  function updateDot(note) {
    const g = document.getElementById('neck-dot');
    if (!g || !state.layout) return;
    if (!note || note.rest) { g.setAttribute('opacity', '0'); return; }
    const x = state.layout.spaceX(note.fret);
    const y = state.layout.courseY(note.string);
    g.setAttribute('opacity', '1');
    g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
    const host = document.getElementById('neck-board-host');
    const svg = host.querySelector('svg');
    if (!svg) return;
    const scale = svg.getBoundingClientRect().width / 1000 || 1;
    const left = x * scale - host.clientWidth * 0.58;
    host.scrollLeft = Math.max(0, left);
  }

  function updateFingers(note) {
    if (!state.layout) return;
    const active = note && !note.rest ? note.finger : 0;
    for (let f = 1; f <= 4; f++) {
      const el = document.getElementById('neck-finger-' + f);
      if (!el) return;
      const fret = active === f ? note.fret : state.model.fingerHomes[f];
      const x = state.layout.spaceX(clamp(fret || f, active === f && note.fret === 0 ? 0 : 1, state.layout.maxFret));
      el.setAttribute('x', x.toFixed(1));
      el.classList.toggle('is-on', active === f);
    }
  }

  function updatePill(note, visual) {
    const el = document.getElementById('neck-pill');
    if (!el) return;
    if (visual && visual.countIn) {
      el.textContent = 'ספירה ' + visual.countNum;
      return;
    }
    if (!note || note.rest) { el.textContent = 'שקט'; return; }
    el.textContent = note.name ? note.name.pill : '';
  }

  function updateStaff(idx) {
    document.querySelectorAll('#neck-staff-wrap .neck-note.is-now').forEach((el) => el.classList.remove('is-now'));
    const g = document.querySelector('#neck-staff-wrap .neck-note[data-i="' + idx + '"]');
    const col = document.getElementById('neck-playcol');
    if (!g || !col) return;
    g.classList.add('is-now');
    const x = +g.dataset.x;
    col.setAttribute('x', String(x - (COL - 14) / 2));
    col.setAttribute('opacity', '1');
    const wrap = document.getElementById('neck-staff-wrap');
    wrap.scrollLeft = Math.max(0, x - wrap.clientWidth * 0.42);
  }

  function renderPosition(v) {
    const beat = v.beat;
    const idx = noteIndexAt(v.countIn ? v.beat : beat);
    const note = idx >= 0 ? state.model.notes[idx] : null;
    const head = document.getElementById('neck-tl-head');
    if (head) head.style.left = ((beat / state.model.totalBeats) * 100) + '%';
    const seeker = document.getElementById('neck-seek');
    if (seeker && !state.scrubbing) seeker.value = String(beat);
    const measure = clamp(Math.floor(beat / state.model.beatsPerMeasure) + 1, 1, state.model.measureCount);
    document.querySelectorAll('.neck-measure').forEach((cell) => {
      cell.classList.toggle('is-now', +cell.dataset.m === measure);
    });
    const count = document.getElementById('neck-count');
    if (count) {
      count.hidden = !v.countIn;
      if (v.countIn) count.textContent = String(v.countNum);
    }
    const lamp = document.getElementById('neck-lamp');
    if (lamp) {
      const frac = beat - Math.floor(beat + 1e-4);
      lamp.classList.toggle('is-on', state.metronome && !v.countIn && frac < 0.16);
    }
    const countChanged = !!v.countIn !== state.lastCountIn;
    state.lastCountIn = !!v.countIn;
    if (idx !== state.lastIdx || countChanged) {
      if (idx !== state.lastIdx) {
        state.lastIdx = idx;
        updateDot(note);
        updateFingers(note);
        updateStaff(idx);
        onNoteChange(note);
      }
      updatePill(note, v);
    } else if (v.countIn) updatePill(note, v);
    if (state.playing && state.looping && v.pass === 1 && state.lastPass === 0 && state.tourStep < 0) {
      peek('חזרו על המקטע עד שזה יושב.', '#neck-timeline');
    }
    if (typeof v.pass === 'number') state.lastPass = v.pass;
  }

  function syncLoopUi() {
    const btn = document.getElementById('neck-loop');
    if (btn) {
      btn.setAttribute('aria-pressed', state.looping ? 'true' : 'false');
      btn.classList.toggle('is-active', state.looping);
    }
    const sel = document.getElementById('neck-range');
    if (sel) {
      if (state.rangeMode === 'section') sel.value = state.sectionId;
      else sel.value = state.rangeMode;
    }
    const from = document.getElementById('neck-from');
    const to = document.getElementById('neck-to');
    if (from) from.value = String(state.measureA);
    if (to) to.value = String(state.measureB);
    const reg = region();
    const band = document.getElementById('neck-tl-loop');
    if (band) {
      const show = state.looping && state.rangeMode !== 'all';
      band.hidden = !show;
      if (show) {
        band.style.left = (reg.start / state.model.totalBeats * 100) + '%';
        band.style.width = ((reg.end - reg.start) / state.model.totalBeats * 100) + '%';
      }
    }
    document.querySelectorAll('.neck-section-btn').forEach((b) => {
      b.classList.toggle('is-active', state.looping && state.rangeMode === 'section' && b.dataset.section === state.sectionId);
    });
    const custom = document.getElementById('neck-custom');
    if (custom) custom.hidden = state.rangeMode !== 'custom' && state.rangeMode !== 'section';
  }

  function updatePlayButton() {
    const btn = document.getElementById('neck-play');
    if (!btn) return;
    btn.textContent = state.playing ? 'השהה' : 'נגן';
    btn.classList.toggle('is-on', state.playing);
    btn.setAttribute('aria-pressed', state.playing ? 'true' : 'false');
  }

  function fillHeader() {
    const song = state.model.song;
    document.getElementById('neck-title').textContent = song.titleHe;
    document.getElementById('neck-sub').textContent = song.titleGr + ' · ' + song.subtitle;
    const rhythm = rhythmChoices().find((r) => r.id === song.rhythmId);
    document.getElementById('neck-meta').textContent = song.meter + ' · ' + song.dromos + ' · ' + (rhythm ? rhythm.nameHe : song.dromos);
    document.getElementById('neck-songs').innerHTML = (window.NECK_SONGS || []).map((s) => (
      '<button type="button" class="neck-song-chip' + (s.id === song.id ? ' active' : '') + '" data-song="' + esc(s.id) + '">' + esc(s.titleHe) + '</button>'
    )).join('');
  }

  function fillSelects() {
    const song = state.model.song;
    const range = document.getElementById('neck-range');
    range.innerHTML = '<option value="all">כל השיר</option>'
      + song.sections.map((s) => '<option value="' + esc(s.id) + '">' + esc(s.nameHe) + '</option>').join('')
      + '<option value="custom">טווח תיבות</option>';
    const rhythm = document.getElementById('neck-rhythm');
    rhythm.innerHTML = rhythmChoices().map((r) => (
      '<option value="' + r.id + '">' + esc(r.nameHe) + ' · ' + esc(r.meter) + '</option>'
    )).join('');
    if (!rhythmChoices().some((r) => r.id === state.rhythmId)) state.rhythmId = 'basic-44';
    rhythm.value = state.rhythmId;
    document.getElementById('neck-from').max = state.model.measureCount;
    document.getElementById('neck-to').max = state.model.measureCount;
    const seeker = document.getElementById('neck-seek');
    seeker.max = String(state.model.totalBeats);
    seeker.value = '0';
    setBpm(state.bpm);
  }

  function loadSong(id) {
    const song = (window.NECK_SONGS || []).find((s) => s.id === id) || window.NECK_SONGS[0];
    halt();
    state.model = buildModel(song);
    state.layout = layoutNeck(state.model.maxFret);
    state.pausedBeat = 0;
    state.bpm = song.bpm;
    state.rhythmId = song.rhythmId;
    state.looping = false;
    state.rangeMode = 'all';
    state.sectionId = song.sections[0] ? song.sections[0].id : null;
    state.measureA = 1;
    state.measureB = state.model.measureCount;
    state.finished = false;
    state.pausedByUser = false;
    state.lastIdx = -2;
    state.lastPass = -1;
    state.repeatCount = Infinity;
    const repeats = document.getElementById('neck-repeats');
    if (repeats) repeats.value = 'inf';
    fillHeader();
    fillSelects();
    renderNeck();
    renderStaff();
    renderTimeline();
    syncLoopUi();
    renderPosition({ beat: 0, countIn: false, pass: 0, done: false });
    if (state.tourStep < 0) {
      state.coach = {
        text: 'לחצו נגן ועקבו אחרי הנקודה הזהובה על הצוואר.',
        look: '#neck-dot', spot: '#neck-board-host',
      };
      renderCoach();
    }
  }

  /* ---------- המורה ---------- */

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function storageSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* פרטי */ }
  }

  function noteTip(note) {
    if (!note || note.rest) {
      return { text: 'שתיקה — תנו למקצב לנשום. היד נשארת רפויה.', look: '#neck-board-host', spot: '#neck-board-host' };
    }
    const course = COURSE_HE[note.string] || '';
    const finger = note.finger ? 'באצבע ' + note.finger : 'בלי אצבע, מיתר פתוח';
    const pick = note.pick === 'u' ? 'עכשיו רישה למעלה.' : 'עכשיו רישה למטה.';
    return {
      text: 'לחצו על מיתר ' + course + ' ' + finger + '. ' + pick,
      look: '#neck-dot',
      spot: '#neck-board-host',
    };
  }

  function activeTip() {
    if (state.tipLock && performance.now() < state.tipLock.until) return state.tipLock;
    if (state.finished) {
      return { text: 'כל הכבוד — סיימתם. אפשר לחזור על קטע, או לבחור שיר אחר.', look: '#neck-timeline', spot: '#neck-timeline' };
    }
    if (state.pausedByUser && !state.playing) {
      return { text: 'השהיתם. צעדו תו־תו עם החצים, או המשיכו כשנוח.', look: '#neck-play', spot: '#neck-play' };
    }
    const idx = noteIndexAt(state.playing ? visualFrom(playTransport()).beat : state.pausedBeat);
    const note = idx >= 0 ? state.model.notes[idx] : null;
    if (note) return noteTip(note);
    return { text: 'לחצו נגן ועקבו אחרי הנקודה הזהובה על הצוואר.', look: '#neck-dot', spot: '#neck-board-host' };
  }

  function spotlight(sel) {
    document.querySelectorAll('.neck-spotlight').forEach((el) => el.classList.remove('neck-spotlight'));
    if (!sel) return null;
    const el = document.querySelector(sel);
    if (el) el.classList.add('neck-spotlight');
    return el;
  }

  function pointCoach(sel) {
    const avatar = document.getElementById('neck-avatar');
    const look = document.getElementById('neck-look');
    if (!avatar) return;
    const target = (sel && document.querySelector(sel)) || document.getElementById('neck-dot');
    if (!target) {
      if (look) look.hidden = true;
      return;
    }
    const a = avatar.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    if (!a.width || !t.width) return;
    const dx = (t.left + t.width / 2) - (a.left + a.width / 2);
    const dy = (t.top + t.height / 2) - (a.top + a.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const mag = 2.4;
    avatar.querySelectorAll('.neck-pupil-g').forEach((g) => {
      g.setAttribute('transform', 'translate(' + (dx / len * mag).toFixed(2) + ' ' + (dy / len * mag).toFixed(2) + ')');
    });
    if (look) {
      look.hidden = false;
      look.style.transform = 'rotate(' + Math.atan2(dy, dx) + 'rad) translate(34px)';
    }
  }

  function renderCoach() {
    const coach = document.getElementById('neck-coach');
    const bubble = document.getElementById('neck-coach-bubble');
    const text = document.getElementById('neck-coach-text');
    const actions = document.getElementById('neck-coach-actions');
    if (!coach) return;
    const collapsed = state.collapsed && state.tourStep < 0;
    coach.classList.toggle('is-collapsed', collapsed);
    bubble.hidden = collapsed;
    const c = state.coach || { text: '', look: '#neck-dot' };
    if (!collapsed) {
      text.textContent = c.text || '';
      if (state.tourStep >= 0) {
        const last = state.tourStep === TOUR.length - 1;
        actions.innerHTML = '<span class="neck-coach-step">' + (state.tourStep + 1) + ' מתוך ' + TOUR.length + '</span>'
          + '<button type="button" class="neck-btn tiny" data-tour="skip">דלג</button>'
          + '<button type="button" class="neck-btn tiny primary" data-tour="next">' + (last ? 'יאללה, ננגן' : 'הבא') + '</button>';
        const el = spotlight(c.spot);
        if (el) el.scrollIntoView({ block: 'center', inline: 'nearest' });
      } else {
        spotlight(null);
        actions.innerHTML = '<button type="button" class="neck-btn tiny" data-tour="hide">הסתר</button>';
      }
    } else spotlight(null);
    pointCoach(c.look);
  }

  function showTourStep() {
    const step = TOUR[state.tourStep];
    state.collapsed = false;
    state.coach = { text: step.text, look: step.spot, spot: step.spot };
    renderCoach();
  }

  function startTour() {
    state.tourStep = 0;
    state.userPinned = true;
    state.tipLock = null;
    showTourStep();
  }

  function finishTour() {
    storageSet(TOUR_KEY, '1');
    state.tourStep = -1;
    state.userPinned = false;
    state.collapsed = true;
    spotlight(null);
    state.coach = activeTip();
    renderCoach();
  }

  function nextTour() {
    if (state.tourStep >= TOUR.length - 1) finishTour();
    else { state.tourStep += 1; showTourStep(); }
  }

  function peek(text, look) {
    if (state.tourStep >= 0) return;
    state.tipLock = { text, look, spot: look, until: performance.now() + 4800 };
    state.coach = state.tipLock;
    state.peekWasCollapsed = state.collapsed && !state.userPinned;
    state.collapsed = false;
    renderCoach();
  }

  function expireTip() {
    if (!state.tipLock || performance.now() < state.tipLock.until) return;
    state.tipLock = null;
    if (state.peekWasCollapsed && !state.userPinned && state.tourStep < 0) state.collapsed = true;
    state.peekWasCollapsed = false;
    if (state.tourStep < 0) state.coach = activeTip();
    renderCoach();
  }

  function onNoteChange(note) {
    if (state.tourStep >= 0) return;
    const tip = note ? noteTip(note) : activeTip();
    const locked = state.tipLock && performance.now() < state.tipLock.until;
    if (!locked) state.coach = { ...(state.coach || {}), ...tip };
    else state.coach = { ...state.coach, look: state.coach.look };
    if (!state.collapsed && !locked) renderCoach();
    else pointCoach((state.coach && state.coach.look) || tip.look);
  }

  function onFinished() {
    const sectional = state.looping && state.rangeMode !== 'all';
    if (sectional) peek('סיימתם את הקטע. חזרו עליו עד שזה יושב.', '#neck-timeline');
    else peek('כל הכבוד — סיימתם את השיר. אפשר לחזור על קטע, או לבחור שיר אחר.', '#neck-timeline');
  }

  function toggleCoach() {
    if (state.tourStep >= 0) return;
    state.collapsed = !state.collapsed;
    state.userPinned = !state.collapsed;
    if (!state.collapsed) {
      state.tipLock = null;
      state.coach = activeTip();
    }
    renderCoach();
  }

  function faceSvg() {
    return '<svg class="neck-face" viewBox="0 0 80 80" aria-hidden="true">'
      + '<defs><radialGradient id="neckSkin" cx="38%" cy="32%"><stop offset="0" stop-color="#f8e0c8"/><stop offset="1" stop-color="#e0b08a"/></radialGradient></defs>'
      + '<circle cx="40" cy="40" r="38" fill="url(#neckSkin)" stroke="#e8c56b" stroke-width="2.5"/>'
      + '<path d="M14 38 C16 16 28 8 40 8 C54 8 66 16 66 38 C60 28 50 24 40 24 C28 24 18 30 14 38 Z" fill="#4a2c1c"/>'
      + '<path d="M18 34 C24 26 32 24 40 26" fill="none" stroke="#3a2216" stroke-width="2" stroke-linecap="round"/>'
      + '<ellipse cx="27" cy="42" rx="8" ry="9" fill="#fff"/>'
      + '<ellipse cx="53" cy="42" rx="8" ry="9" fill="#fff"/>'
      + '<g class="neck-pupil-g"><circle cx="27" cy="43" r="3.7" fill="#6b3a22"/><circle cx="27" cy="43" r="1.8" fill="#1a0d08"/><circle cx="25.6" cy="41.4" r="1.05" fill="#fff"/></g>'
      + '<g class="neck-pupil-g"><circle cx="53" cy="43" r="3.7" fill="#6b3a22"/><circle cx="53" cy="43" r="1.8" fill="#1a0d08"/><circle cx="51.6" cy="41.4" r="1.05" fill="#fff"/></g>'
      + '<path d="M20 33 Q28 29 35 33" fill="none" stroke="#5a3824" stroke-width="1.6" stroke-linecap="round"/>'
      + '<path d="M45 33 Q52 29 60 33" fill="none" stroke="#5a3824" stroke-width="1.6" stroke-linecap="round"/>'
      + '<path d="M40 44 v7" stroke="#d7a888" stroke-width="1.5" stroke-linecap="round"/>'
      + '<path d="M29 56 Q40 66 51 56" fill="none" stroke="#a85a48" stroke-width="2.1" stroke-linecap="round"/>'
      + '<ellipse cx="18" cy="52" rx="4" ry="2.2" fill="#e7a090" opacity="0.55"/>'
      + '<ellipse cx="62" cy="52" rx="4" ry="2.2" fill="#e7a090" opacity="0.55"/>'
      + '<path d="M22 70 Q40 78 58 70 L62 80 L18 80 Z" fill="#3a2418"/>'
      + '<circle cx="40" cy="74" r="2" fill="#e8c56b"/>'
      + '</svg>';
  }

  function shell() {
    return '<button type="button" class="neck-help" id="neck-help" aria-label="עזרה">?</button>'
      + '<header class="neck-hero">'
      + '<svg class="neck-emblem" viewBox="0 0 86 86" aria-hidden="true">'
      + '<ellipse cx="30" cy="52" rx="20" ry="24" fill="none" stroke="#e8c56b" stroke-width="2.2"/>'
      + '<circle cx="30" cy="52" r="7" fill="none" stroke="#e8c56b" stroke-width="1.6"/>'
      + '<path d="M44 48 L62 16" stroke="#e8c56b" stroke-width="4" stroke-linecap="round"/>'
      + '<rect x="60" y="10" width="16" height="7" rx="2" transform="rotate(-28 68 14)" fill="#e8c56b"/>'
      + '</svg>'
      + '<div class="neck-titles">'
      + '<p class="neck-kicker" id="neck-kicker">איך מנגנים</p>'
      + '<h1 id="neck-title"></h1>'
      + '<p class="neck-sub" id="neck-sub"></p>'
      + '<p class="neck-meta" id="neck-meta"></p>'
      + '</div></header>'
      + '<div class="neck-songs" id="neck-songs"></div>'
      + '<div class="neck-board-host" id="neck-board-host"></div>'
      + '<p class="neck-sol-label">סולפג׳</p>'
      + '<div class="neck-pill-wrap"><div class="neck-pill" id="neck-pill" aria-live="polite"></div></div>'
      + '<div class="neck-staff-wrap" id="neck-staff-wrap" dir="ltr"></div>'
      + '<div class="neck-legend" aria-hidden="true"><span>▼ רישה יורדת</span><span>∧ רישה עולה</span></div>'
      + '<label class="neck-seek-label" for="neck-seek">התקדמות</label>'
      + '<input id="neck-seek" class="neck-progress" type="range" min="0" max="1" step="0.01" value="0" aria-label="התקדמות בשיר">'
      + '<div class="neck-timeline" id="neck-timeline" dir="ltr"></div>'
      + '<div class="neck-panel">'
      + '<div class="neck-transport">'
      + '<button type="button" class="neck-btn" id="neck-prev" aria-label="התו הקודם">התו הקודם</button>'
      + '<button type="button" class="neck-btn primary" id="neck-play" aria-pressed="false">נגן</button>'
      + '<button type="button" class="neck-btn" id="neck-next" aria-label="התו הבא">התו הבא</button>'
      + '<button type="button" class="neck-btn" id="neck-loop" aria-pressed="false">לולאה</button>'
      + '</div>'
      + '<div class="neck-tempo" id="neck-tempo">'
      + '<span class="neck-field-label">קצב</span>'
      + '<button type="button" class="neck-btn tiny" id="neck-bpm-dec" aria-label="האט">−</button>'
      + '<input id="neck-bpm" type="number" min="40" max="200" step="1" inputmode="numeric" aria-label="פעימות בדקה">'
      + '<button type="button" class="neck-btn tiny" id="neck-bpm-inc" aria-label="האץ">+</button>'
      + '<input id="neck-bpm-range" type="range" min="40" max="200" step="1" aria-label="מחוון קצב">'
      + '<button type="button" class="neck-btn tiny" id="neck-tap">הקש לקצב</button>'
      + '<span class="neck-lamp" id="neck-lamp" aria-hidden="true"></span>'
      + '</div>'
      + '<div class="neck-rhythm-row">'
      + '<label class="neck-field-label" for="neck-rhythm">מקצב</label>'
      + '<select id="neck-rhythm" aria-label="תבנית מקצב"></select>'
      + '<label class="neck-check"><input type="checkbox" id="neck-metro"> מטרונום</label>'
      + '<label class="neck-check"><input type="checkbox" id="neck-countin" checked> ספירה לפני</label>'
      + '</div>'
      + '<div class="neck-loop-row">'
      + '<label class="neck-field-label" for="neck-range">קטע</label>'
      + '<select id="neck-range" aria-label="קטע ללולאה"></select>'
      + '<label class="neck-field-label" for="neck-repeats">חזרות</label>'
      + '<select id="neck-repeats" aria-label="מספר חזרות">'
      + '<option value="inf" selected>∞</option>'
      + '<option value="1">פעם אחת</option>'
      + '<option value="2">פעמיים</option>'
      + '<option value="3">3</option>'
      + '<option value="4">4</option>'
      + '<option value="8">8</option>'
      + '</select>'
      + '<span class="neck-custom" id="neck-custom" hidden>'
      + '<label for="neck-from">מתיבה</label>'
      + '<input id="neck-from" type="number" min="1" max="16" step="1" value="1" aria-label="מתיבה">'
      + '<label for="neck-to">עד</label>'
      + '<input id="neck-to" type="number" min="1" max="16" step="1" value="4" aria-label="עד תיבה">'
      + '</span>'
      + '</div>'
      + '</div>'
      + '<div class="neck-coach" id="neck-coach">'
      + '<div class="neck-avatar-wrap">'
      + '<span class="neck-look" id="neck-look" hidden></span>'
      + '<button type="button" class="neck-avatar" id="neck-avatar" aria-label="המורה">' + faceSvg() + '</button>'
      + '</div>'
      + '<div class="neck-coach-bubble" id="neck-coach-bubble">'
      + '<p class="neck-coach-who">המורה</p>'
      + '<p class="neck-coach-text" id="neck-coach-text" aria-live="polite"></p>'
      + '<div class="neck-coach-actions" id="neck-coach-actions"></div>'
      + '</div></div>';
  }

  function beatFromClient(clientX) {
    const bar = document.getElementById('neck-tl-bar');
    if (!bar) return state.pausedBeat;
    const rect = bar.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 0.999);
    return ratio * state.model.totalBeats;
  }

  function bind() {
    const root = document.getElementById('neck-root');
    root.addEventListener('click', (e) => {
      const song = e.target.closest('[data-song]');
      if (song) { loadSong(song.dataset.song); return; }
      const section = e.target.closest('[data-section]');
      if (section) {
        state.rangeMode = 'section';
        state.sectionId = section.dataset.section;
        const bounds = sectionBounds(state.sectionId);
        state.measureA = bounds.start;
        state.measureB = bounds.end;
        state.looping = true;
        syncLoopUi();
        seek(region().start);
        peek('חזרו על המקטע עד שזה יושב.', '#neck-timeline');
        return;
      }
      if (e.target.closest('#neck-play')) toggle();
      else if (e.target.closest('#neck-prev')) step(-1);
      else if (e.target.closest('#neck-next')) step(1);
      else if (e.target.closest('#neck-loop')) {
        state.looping = !state.looping;
        syncLoopUi();
        if (state.looping) peek('הלולאה דולקת. חזרו על המקטע עד שזה יושב.', '#neck-timeline');
      } else if (e.target.closest('#neck-bpm-dec')) setBpm(state.bpm - 1, { tip: true });
      else if (e.target.closest('#neck-bpm-inc')) setBpm(state.bpm + 1, { tip: true });
      else if (e.target.closest('#neck-tap')) tapTempo();
      else if (e.target.closest('#neck-help')) startTour();
      else if (e.target.closest('#neck-avatar')) toggleCoach();
      else if (e.target.closest('[data-tour="next"]')) nextTour();
      else if (e.target.closest('[data-tour="skip"]')) finishTour();
      else if (e.target.closest('[data-tour="hide"]')) {
        state.collapsed = true;
        state.userPinned = false;
        state.tipLock = null;
        renderCoach();
      }
    });

    root.addEventListener('input', (e) => {
      if (e.target.id === 'neck-bpm-range') setBpm(e.target.value);
      if (e.target.id === 'neck-bpm') {
        const v = +e.target.value;
        if (v >= 40 && v <= 200) setBpm(v, { keepNumber: true });
      }
      if (e.target.id === 'neck-seek') {
        state.scrubbing = true;
        seek(+e.target.value);
      }
    });
    root.addEventListener('change', (e) => {
      if (e.target.id === 'neck-bpm' || e.target.id === 'neck-bpm-range') setBpm(e.target.value, { tip: true });
      if (e.target.id === 'neck-seek') {
        state.scrubbing = false;
        if (!state.playing) pluckCurrent();
      }
      if (e.target.id === 'neck-rhythm') {
        state.rhythmId = e.target.value;
        const pat = getPattern();
        if (pat.meter !== state.model.song.meter) {
          peek('המקצב ' + pat.nameHe + ' הוא ' + pat.meter + ', והשיר ב־' + state.model.song.meter + '. הדום לא תמיד ייפול על תחילת התיבה.', '#neck-tempo');
        } else peek('המטרונום מנגן את ' + pat.nameHe + '. הדום הראשון הוא העוגן.', '#neck-tempo');
      }
      if (e.target.id === 'neck-metro') {
        state.metronome = e.target.checked;
        peek(state.metronome ? 'המטרונום דולק. הדום הראשון הוא העוגן.' : 'המטרונום כבוי — נשארתם רק עם המנגינה.', '#neck-tempo');
      }
      if (e.target.id === 'neck-countin') {
        state.countIn = e.target.checked;
        peek(state.countIn ? 'ספירה לפני הכניסה — היכנסו על האחת.' : 'בלי ספירה. הנגינה מתחילה מיד.', '#neck-play');
      }
      if (e.target.id === 'neck-repeats') {
        state.repeatCount = e.target.value === 'inf' ? Infinity : Math.max(1, +e.target.value || 1);
        peek(state.repeatCount === Infinity ? 'הקטע יחזור עד שתעצרו.' : 'הקטע יחזור ' + state.repeatCount + ' פעמים.', '#neck-timeline');
      }
      if (e.target.id === 'neck-range') {
        const value = e.target.value;
        if (value === 'all') {
          state.rangeMode = 'all';
          state.measureA = 1;
          state.measureB = state.model.measureCount;
          syncLoopUi();
        } else if (value === 'custom') {
          state.rangeMode = 'custom';
          state.looping = true;
          syncLoopUi();
          seek(region().start);
          peek('סמנתם טווח תיבות. חזרו עליו עד שזה יושב.', '#neck-timeline');
        } else {
          state.rangeMode = 'section';
          state.sectionId = value;
          const bounds = sectionBounds(value);
          state.measureA = bounds.start;
          state.measureB = bounds.end;
          state.looping = true;
          syncLoopUi();
          seek(region().start);
          peek('חזרו על המקטע עד שזה יושב.', '#neck-timeline');
        }
      }
      if (e.target.id === 'neck-from' || e.target.id === 'neck-to') {
        let a = clamp(+document.getElementById('neck-from').value || 1, 1, state.model.measureCount);
        let b = clamp(+document.getElementById('neck-to').value || a, 1, state.model.measureCount);
        if (b < a) { const t = a; a = b; b = t; }
        state.measureA = a;
        state.measureB = b;
        state.rangeMode = 'custom';
        state.looping = true;
        syncLoopUi();
        seek(region().start);
      }
    });

    root.addEventListener('pointerdown', (e) => {
      if (!e.target.closest('#neck-tl-bar')) return;
      if (e.target.closest('.neck-section-btn')) return;
      state.scrubbing = true;
      state.scrubPointer = e.pointerId;
      seek(beatFromClient(e.clientX));
    });
    window.addEventListener('pointermove', (e) => {
      if (!state.scrubbing || e.pointerId !== state.scrubPointer) return;
      if (!document.getElementById('screen-neck')?.classList.contains('active')) return;
      seek(beatFromClient(e.clientX));
    });
    function endScrub(e) {
      if (!state.scrubbing || e.pointerId !== state.scrubPointer) return;
      state.scrubbing = false;
      if (!state.playing) pluckCurrent();
    }
    window.addEventListener('pointerup', endScrub);
    window.addEventListener('pointercancel', endScrub);

    document.querySelector('.nav-btn[data-screen="neck"]')?.addEventListener('click', () => {
      requestAnimationFrame(() => {
        if (state.tourPending) {
          state.tourPending = false;
          startTour();
          return;
        }
        if (state.tourStep >= 0) showTourStep();
        else if (state.coach) pointCoach(state.coach.look);
      });
    });

    document.addEventListener('keydown', (e) => {
      if (typeof isScreenActive === 'function' && !isScreenActive('neck')) return;
      if (e.target.closest && e.target.closest('input, select, textarea')) return;
      if (e.repeat) return;
      if (e.code === 'Space') { e.preventDefault(); toggle(); }
      else if (e.code === 'ArrowLeft') { e.preventDefault(); step(-1); }
      else if (e.code === 'ArrowRight') { e.preventDefault(); step(1); }
    });

    window.addEventListener('resize', () => {
      if (state.coach) pointCoach(state.coach.look);
    });
  }

  function init() {
    const root = document.getElementById('neck-root');
    if (!root || !window.NECK_SONGS) return;
    const issues = window.neckSongIssues ? window.neckSongIssues() : [];
    if (issues.length) console.warn('neck songs', issues);
    root.innerHTML = shell();
    bind();
    loadSong(window.NECK_SONGS[0].id);
    state.tourPending = !storageGet(TOUR_KEY);
    state.collapsed = true;
    state.coach = { text: 'לחצו נגן ועקבו אחרי הנקודה הזהובה על הצוואר.', look: '#neck-dot', spot: '#neck-board-host' };
    renderCoach();
    if (typeof registerPlayback === 'function') registerPlayback('neck-play', stop);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { loadSong, start, stop, seek, step, setBpm, startTour };
})();
