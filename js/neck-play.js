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
  const CLEF_D = 'M314 801Q300 854 291.0 906.0Q282 958 282 1012Q282 1059 288.5 1100.5Q295 1142 307 1177Q320 1217 341.0 1252.5Q362 1288 385.5 1311.0Q409 1334 427 1334Q451 1334 493 1249Q514 1206 524.0 1156.0Q534 1106 534 1049Q534 978 515.0 907.5Q496 837 459.5 775.0Q423 713 372 666L407 498Q422 500 432.0 501.0Q442 502 447 502Q508 502 556.0 467.5Q604 433 632.5 377.0Q661 321 661 254Q661 177 621.5 115.5Q582 54 503 25Q508 8 532 -117Q538 -147 541.0 -164.5Q544 -182 545.0 -195.0Q546 -208 546 -225Q546 -275 521.5 -314.5Q497 -354 455.5 -376.0Q414 -398 363 -398Q311 -398 271.0 -378.5Q231 -359 208.0 -324.5Q185 -290 185 -245Q185 -197 211.5 -165.0Q238 -133 287 -133Q329 -133 355.5 -163.5Q382 -194 382 -236Q382 -272 357.0 -299.0Q332 -326 292 -326H282Q308 -365 364 -365Q433 -365 472.0 -320.0Q511 -275 511 -205Q511 -188 507.0 -159.5Q503 -131 493 -91Q483 -51 477.5 -25.0Q472 1 470 12Q436 2 390 2Q304 2 222 52Q142 102 96.0 184.0Q50 266 50 361Q50 451 91 530Q132 609 192.5 675.0Q253 741 314 801ZM341 826Q364 838 390.0 870.5Q416 903 440.0 945.0Q464 987 479.0 1029.5Q494 1072 494 1106Q494 1142 483.0 1163.0Q472 1184 445 1184Q421 1184 398.5 1162.0Q376 1140 358.5 1103.5Q341 1067 331.0 1022.0Q321 977 321 930Q321 898 327.5 872.0Q334 846 341 826ZM398 379Q371 373 347.0 353.5Q323 334 308.5 306.5Q294 279 294 248Q294 223 307.0 196.5Q320 170 339 154Q352 142 365 136Q380 129 380 123Q380 120 370 117Q332 126 301.5 151.0Q271 176 253.5 211.5Q236 247 236 287Q236 330 253.5 370.0Q271 410 302.5 442.0Q334 474 374 490L345 641Q229 547 174.5 456.5Q120 366 120 277Q120 212 154.0 156.0Q188 100 247.0 65.5Q306 31 380 31Q400 31 420.5 35.0Q441 39 464 45ZM495 55Q593 97 593 227Q593 270 571.0 305.5Q549 341 512.0 362.0Q475 383 429 383Z';

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
    { spot: '#neck-board-host', look: '#neck-dot', text: 'הנקודה הזהובה מראה איפה ללחוץ, ולידה כתוב שם התו. המספר הזהוב למעלה הוא האצבע.' },
    { spot: '#neck-staff-wrap', look: '#neck-staff-wrap', text: 'מתחת לכל תו: השם בעברית ובלטינית, וחץ הרישה — למטה או למעלה.' },
    { spot: '#neck-timeline', look: '#neck-timeline', text: 'הציר מחולק לתיבות ולקטעים. בחרו קטע וחזרו עליו עד שזה יושב.' },
    { spot: '#neck-tempo', look: '#neck-bpm', text: 'כאן בוחרים קצב, מטרונום וספירה. תתחילו לאט, ואז תעלו.' },
    { spot: '#neck-upload', look: '#neck-upload-btn', text: 'מכאן מעלים תווים — MusicXML, MIDI או ABC — והמנגינה עולה על הצוואר.' },
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
    uploads: [],
    uploadToken: 0,
    coachOnLeft: null,
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
    const fretCap = typeof NUM_FRETS !== 'undefined' ? NUM_FRETS : 15;
    const maxFret = Math.max(7, Math.min(fretCap, Math.max(0, ...(frets.length ? frets : [0]))));
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
    if (coachShouldTrack()) placeCoach();
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

  const NECK_W = 1320;
  const NECK_H = 220;

  function layoutNeck(maxFret) {
    if (typeof BouzoukiNeck !== 'undefined') {
      return BouzoukiNeck.layout(maxFret, { mirrorH: false, mirrorV: false });
    }
    return null;
  }

  function renderNeck() {
    const host = document.getElementById('neck-board-host');
    host.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'neck-svg');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'צוואר בוזוקי טטראחורדו עם סריגי מתכת');
    host.appendChild(svg);
    const count = document.createElement('div');
    count.id = 'neck-count';
    count.className = 'neck-count';
    count.hidden = true;
    host.appendChild(count);
    if (typeof BouzoukiNeck === 'undefined') return;
    state.layout = BouzoukiNeck.paint(svg, {
      maxFret: state.model.maxFret,
      mirror: false,
      publish: false,
      fingers: true,
      fingerHomes: state.model.fingerHomes,
      dotId: 'neck-dot',
      active: null,
    });
    return;
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
    body += clefMarkup();
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


  function clefMarkup() {
    const s = 0.052;
    const tx = (2 - 50 * s).toFixed(1);
    const ty = (STAFF_BOTTOM + 12 - 398 * s).toFixed(1);
    return '<g transform="translate(' + tx + ' ' + ty + ') scale(' + s + ' -' + s + ')" aria-hidden="true">'
      + '<path fill="#2c2118" d="' + CLEF_D + '"/></g>';
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
    placeDotName(note);
    const host = document.getElementById('neck-board-host');
    const svg = host.querySelector('svg');
    if (!svg) return;
    if (typeof BouzoukiNeck !== 'undefined' && BouzoukiNeck.played) {
      BouzoukiNeck.played(svg, { ci: note.string, fret: note.fret, midi: note.midi });
    }
    const scale = svg.getBoundingClientRect().width / NECK_W || 1;
    const left = x * scale - host.clientWidth * 0.58;
    host.scrollLeft = Math.max(0, left);
  }

  function placeDotName(note) {
    const text = document.getElementById('neck-dot-name');
    const plate = document.getElementById('neck-dot-plate');
    if (!text || !plate || !note || !note.name) return;
    text.textContent = note.name.pill;
    let width = Math.max(78, note.name.pill.length * 8.4 + 16);
    try {
      const box = text.getBBox();
      if (box.width > 8) width = box.width + 16;
    } catch (e) { /* המסך עדיין מוסתר */ }
    plate.setAttribute('width', width.toFixed(1));
    plate.setAttribute('x', (-12 - width).toFixed(1));
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
    document.getElementById('neck-sub').textContent = [song.titleGr, song.subtitle].filter(Boolean).join(' · ');
    const rhythm = rhythmChoices().find((r) => r.id === song.rhythmId);
    document.getElementById('neck-meta').textContent = song.meter + ' · ' + song.dromos + ' · ' + (rhythm ? rhythm.nameHe : song.dromos);
    document.getElementById('neck-songs').innerHTML = allSongs().map((s) => {
      const chip = '<button type="button" class="neck-song-chip' + (s.id === song.id ? ' active' : '') + '" data-song="' + esc(s.id) + '">' + esc(s.titleHe) + '</button>';
      if (!s.uploaded) return chip;
      return '<span class="neck-song-chip-wrap">' + chip
        + '<button type="button" class="neck-chip-x" data-delete="' + esc(s.id) + '" aria-label="מחק">×</button></span>';
    }).join('');
  }

  function allSongs() {
    return (window.NECK_SONGS || []).concat(state.uploads || []);
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

  function setUploadMsg(text) {
    const msg = document.getElementById('neck-upload-msg');
    if (!msg) return;
    msg.hidden = !text;
    msg.textContent = text || '';
  }

  async function importUpload(file) {
    state.uploadToken += 1;
    setUploadMsg('קוראים את הקובץ…');
    try {
      if (typeof NeckImport === 'undefined') {
        const err = new Error('ההעלאה לא זמינה.');
        err.he = err.message;
        throw err;
      }
      const song = await NeckImport.parseFile(file);
      await NeckImport.save(song);
      state.uploads = (state.uploads || []).filter((s) => s.id !== song.id);
      state.uploads.push(song);
      loadSong(song.id);
      setUploadMsg('התווים עלו. עקבו אחרי הנקודה ושם התו על הצוואר.');
      peek('התווים עלו. עקבו אחרי הנקודה ושם התו על הצוואר.', '#neck-dot');
    } catch (err) {
      const he = (err && err.he) || 'לא הצלחנו לקרוא את הקובץ. העלו MusicXML, MIDI או ABC.';
      setUploadMsg(he);
      peek(he, '#neck-upload-btn');
    }
  }

  function deleteUpload(id) {
    state.uploadToken += 1;
    if (typeof NeckImport !== 'undefined') NeckImport.remove(id);
    state.uploads = (state.uploads || []).filter((s) => s.id !== id);
    if (state.model && state.model.song.id === id) loadSong(window.NECK_SONGS[0].id);
    else fillHeader();
    setUploadMsg('');
  }

  function loadSong(id) {
    const song = allSongs().find((s) => s.id === id) || window.NECK_SONGS[0];
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

  /* ---------- העוזר ---------- */

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

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function coachTargetEl() {
    const sel = (state.coach && state.coach.look) || '#neck-dot';
    return document.querySelector(sel) || document.getElementById('neck-dot');
  }

  function coachShouldTrack() {
    if (!state.playing || state.tourStep >= 0) return false;
    if (state.collapsed) return true;
    return state.coach && state.coach.look === '#neck-dot';
  }

  function pointEyes(target) {
    const avatar = document.getElementById('neck-avatar');
    const coach = document.getElementById('neck-coach');
    if (!avatar) return;
    const pupils = avatar.querySelectorAll('.neck-pupil-g');
    const idle = coach && coach.classList.contains('is-idle');
    if (!target || idle || !target.getBoundingClientRect().width) {
      pupils.forEach((g) => g.removeAttribute('transform'));
      return;
    }
    const a = avatar.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    if (!a.width || !t.width) return;
    const dx = (t.left + t.width / 2) - (a.left + a.width / 2);
    const dy = (t.top + t.height / 2) - (a.top + a.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const mag = 3.4;
    const tr = 'translate(' + (dx / len * mag).toFixed(2) + ' ' + (dy / len * mag).toFixed(2) + ')';
    pupils.forEach((g) => g.setAttribute('transform', tr));
  }

  function glideEyes() {
    if (reducedMotion()) return;
    const until = performance.now() + 820;
    const tick = () => {
      if (!document.getElementById('neck-avatar')) return;
      pointEyes(coachTargetEl());
      if (performance.now() < until) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function placeCoach(opts) {
    if (typeof AppHelper !== 'undefined') {
      AppHelper.place(opts);
      return;
    }
    const coach = document.getElementById('neck-coach');
    if (!coach) return;
    const collapsed = state.collapsed && state.tourStep < 0;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const margin = 10;
    const bottomSafe = vw < 860 ? 84 : 14;
    const cw = coach.offsetWidth || (collapsed ? 68 : 340);
    const ch = coach.offsetHeight || (collapsed ? 68 : 132);
    const target = coachTargetEl();
    let x = margin;
    let y = vh - ch - bottomSafe;
    let flip = false;
    coach.classList.toggle('is-following', collapsed && state.playing);
    coach.classList.toggle('is-idle', collapsed && !state.playing);

    if (collapsed && state.playing && target) {
      const host = document.getElementById('neck-board-host');
      const t = target.getBoundingClientRect();
      const h = host ? host.getBoundingClientRect() : t;
      const orb = 62;
      let cx = t.width ? t.left + t.width / 2 : h.left + 40;
      if (h.width) cx = clamp(cx, h.left + 28, h.right - 28);
      x = cx - orb / 2;
      y = (h.top || 80) - orb - 6;
    } else if (!collapsed && target && target.getBoundingClientRect().width) {
      const t = target.getBoundingClientRect();
      const gap = 12;
      const wide = t.width > Math.min(480, vw * 0.5);
      const spaceLeft = t.left - margin;
      const spaceRight = vw - t.right - margin;
      let onLeft = spaceLeft >= spaceRight;
      if (!wide && state.coachOnLeft === true && spaceLeft >= cw * 0.55) onLeft = true;
      else if (!wide && state.coachOnLeft === false && spaceRight >= cw * 0.55) onLeft = false;
      else if (wide) onLeft = true;
      if (!wide) state.coachOnLeft = onLeft;
      const side = [];
      if (!wide && spaceLeft >= cw + gap) side.push({ x: t.left - cw - gap, y: t.top + t.height / 2 - 30, flip: false, onLeft: true });
      if (!wide && spaceRight >= cw + gap) side.push({ x: t.right + gap, y: t.top + t.height / 2 - 30, flip: true, onLeft: false });
      side.sort((a, b) => (a.onLeft === onLeft ? 0 : 1) - (b.onLeft === onLeft ? 0 : 1));
      const above = { x: clamp(t.left + Math.min(t.width * 0.2, 80), margin, vw - cw - margin), y: t.top - ch - gap, flip: false };
      const below = { x: clamp(t.left, margin, vw - cw - margin), y: t.bottom + gap, flip: false };
      const pick = side[0] || (t.top > ch + 36 ? above : below);
      x = pick.x;
      y = pick.y;
      flip = !!pick.flip;
    }
    x = clamp(x, margin, Math.max(margin, vw - cw - margin));
    y = clamp(y, 8, Math.max(8, vh - ch - bottomSafe));
    coach.classList.toggle('is-flip', flip && !collapsed);
    coach.style.left = Math.round(x) + 'px';
    coach.style.top = Math.round(y) + 'px';
    pointEyes(collapsed && !state.playing ? null : target);
    if (opts && opts.glide) glideEyes();
  }

  function renderCoach() {
    if (typeof isScreenActive === 'function' && !isScreenActive('neck')) return;
    if (typeof AppHelper !== 'undefined') {
      const c = state.coach || { text: '', look: '#neck-dot' };
      const collapsed = state.collapsed && state.tourStep < 0;
      AppHelper.show({
        text: c.text || '',
        look: c.look || '#neck-dot',
        spot: c.spot || c.look,
        collapsed: collapsed,
        following: !!(state.collapsed && state.playing && state.tourStep < 0),
        idle: !!(collapsed && !state.playing),
        tour: state.tourStep >= 0 ? { index: state.tourStep, total: TOUR.length } : null,
      });
      return;
    }
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
        const lookEl = c.look && document.querySelector(c.look);
        if (lookEl && lookEl !== el) lookEl.scrollIntoView({ block: 'nearest', inline: 'center' });
      } else {
        spotlight(null);
        actions.innerHTML = '<button type="button" class="neck-btn tiny" data-tour="hide">הסתר</button>';
      }
    } else spotlight(null);
    placeCoach({ glide: true });
  }

  function showTourStep() {
    const step = TOUR[state.tourStep];
    state.collapsed = false;
    state.coachOnLeft = null;
    state.coach = { text: step.text, look: step.look || step.spot, spot: step.spot };
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
    else placeCoach();
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

  function mascotSvg() {
    return '<svg class="neck-face" viewBox="0 0 80 80" aria-hidden="true">'
      + '<defs>'
      + '<radialGradient id="neckOrb" cx="36%" cy="32%"><stop offset="0" stop-color="#fff6d2"/><stop offset="0.42" stop-color="#e8c56b"/><stop offset="1" stop-color="#8a4e16"/></radialGradient>'
      + '</defs>'
      + '<circle cx="40" cy="40" r="30" fill="url(#neckOrb)" stroke="#fff1c9" stroke-width="2"/>'
      + '<ellipse cx="31" cy="28" rx="10" ry="6" fill="#fff8e4" opacity="0.55"/>'
      + '<ellipse cx="29" cy="40" rx="9.2" ry="10.4" fill="#fff"/>'
      + '<ellipse cx="51" cy="40" rx="9.2" ry="10.4" fill="#fff"/>'
      + '<g class="neck-pupil-g"><circle cx="29" cy="41" r="4.6" fill="#3a2414"/><circle cx="27.2" cy="39" r="1.5" fill="#fff"/></g>'
      + '<g class="neck-pupil-g"><circle cx="51" cy="41" r="4.6" fill="#3a2414"/><circle cx="49.2" cy="39" r="1.5" fill="#fff"/></g>'
      + '<ellipse class="neck-lid" cx="29" cy="40" rx="10" ry="11.2" fill="#e4bc62"/>'
      + '<ellipse class="neck-lid" cx="51" cy="40" rx="10" ry="11.2" fill="#e4bc62"/>'
      + '<path d="M32 54 Q40 60 48 54" fill="none" stroke="#6a3d16" stroke-width="1.8" stroke-linecap="round"/>'
      + '</svg>';
  }

  function shell() {
    return '<header class="neck-hero">'
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
      + '<div class="neck-upload">'
      + '<button type="button" class="neck-btn" id="neck-upload-btn">העלאת תווים</button>'
      + '<input id="neck-file" type="file" hidden accept=".musicxml,.xml,.mxl,.mid,.midi,.abc,.txt,.pdf,.png,.jpg,.jpeg,.webp,.gif">'
      + '<p class="neck-upload-hint">MusicXML, MIDI או ABC. מצילום או PDF מייצאים MusicXML מ־MuseScore.</p>'
      + '</div>'
      + '<p class="neck-upload-msg" id="neck-upload-msg" hidden></p>'
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
      + '</div>';
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
      const del = e.target.closest('[data-delete]');
      if (del) { deleteUpload(del.dataset.delete); return; }
      if (e.target.closest('#neck-upload-btn')) {
        document.getElementById('neck-file').click();
        return;
      }
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
    });
    document.addEventListener('app-helper-action', (ev) => {
      if (typeof isScreenActive === 'function' && !isScreenActive('neck')) return;
      if (ev.detail === 'next') nextTour();
      else if (ev.detail === 'skip') finishTour();
      else if (ev.detail === 'toggle') toggleCoach();
      else if (ev.detail === 'hide') {
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
      if (e.target.id === 'neck-file') {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (file) importUpload(file);
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
        else if (state.coach) renderCoach();
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
      if (state.coach) placeCoach({ glide: true });
    });
    document.addEventListener('scroll', () => {
      if (!document.getElementById('screen-neck')?.classList.contains('active')) return;
      if (state.coach) placeCoach();
    }, true);
  }

  function init() {
    const root = document.getElementById('neck-root');
    if (!root || !window.NECK_SONGS) return;
    const issues = window.neckSongIssues ? window.neckSongIssues() : [];
    if (issues.length) console.warn('neck songs', issues);
    root.innerHTML = shell();
    bind();
    loadSong(window.NECK_SONGS[0].id);
    if (typeof NeckImport !== 'undefined') {
      const token = state.uploadToken;
      NeckImport.list().then((rows) => {
        if (token !== state.uploadToken) return;
        const byId = new Map((Array.isArray(rows) ? rows : []).map((s) => [s.id, s]));
        (state.uploads || []).forEach((s) => byId.set(s.id, s));
        state.uploads = [...byId.values()];
        fillHeader();
      }).catch(() => {});
    }
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
