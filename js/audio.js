/* ============================================================
   מנוע אודיו — סינתזת בוזוקי (Karplus-Strong), מטרונום, מתזמן
   ============================================================ */

const AudioEngine = (() => {
  let ctx = null;
  let masterGain = null;

  function ensureCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      masterGain = ctx.createGain();
      masterGain.gain.value = 0.85;
      masterGain.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /* ---------- סינתזת מיתר פרוט (Karplus-Strong) ---------- */
  const bufferCache = new Map();

  function ksBuffer(freq, durationSec = 2.2, brightness = 0.55) {
    const key = freq.toFixed(2) + ':' + brightness;
    if (bufferCache.has(key)) return bufferCache.get(key);

    const sr = ctx.sampleRate;
    const len = Math.floor(sr * durationSec);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);

    const period = Math.floor(sr / freq);
    const delay = new Float32Array(period);
    // עירור: רעש מסונן קלות — מדמה פריטת מפרט
    let prev = 0;
    for (let i = 0; i < period; i++) {
      const noise = Math.random() * 2 - 1;
      prev = brightness * noise + (1 - brightness) * prev;
      delay[i] = prev;
    }

    let idx = 0;
    const damping = 0.996;
    for (let i = 0; i < len; i++) {
      const cur = delay[idx];
      const next = delay[(idx + 1) % period];
      const avg = damping * 0.5 * (cur + next);
      delay[idx] = avg;
      out[i] = avg;
      idx = (idx + 1) % period;
    }
    // נירמול
    let max = 0;
    for (let i = 0; i < len; i++) max = Math.max(max, Math.abs(out[i]));
    if (max > 0) for (let i = 0; i < len; i++) out[i] /= max;

    bufferCache.set(key, buf);
    return buf;
  }

  function playBuffer(buf, when, gain, detuneCents = 0) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (detuneCents) src.detune.value = detuneCents;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + buf.duration);
    src.connect(g).connect(masterGain);
    src.start(when);
  }

  /* צליל בודד לפי MIDI */
  function pluckMidi(midi, when = 0, gain = 0.5) {
    ensureCtx();
    const t = when || ctx.currentTime + 0.02;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    playBuffer(ksBuffer(freq), t, gain, 0);
    // הד עדין של מיתר זוג (דטיון קל) — צליל בוזוקי מלא
    playBuffer(ksBuffer(freq), t + 0.008, gain * 0.7, 6);
    return t;
  }

  /* קורס שלם: זוג מיתרים, כולל זוג אוקטבה בקורסים הנמוכים */
  function pluckCourse(courseIdx, fret, when = 0, gain = 0.5) {
    ensureCtx();
    const t = when || ctx.currentTime + 0.02;
    const c = TUNING[courseIdx];
    const midi = c.midi + fret;
    const freq = 440 * Math.pow(2, (midi - 69) / 12);
    playBuffer(ksBuffer(freq), t, gain);
    if (c.pair === 'octave') {
      playBuffer(ksBuffer(freq * 2), t + 0.007, gain * 0.55, 4);
    } else {
      playBuffer(ksBuffer(freq), t + 0.007, gain * 0.65, 7);
    }
    return t;
  }

  /* ---------- צלילי מטרונום: דום / טק ---------- */
  function dum(when, gain = 1) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(150, when);
    osc.frequency.exponentialRampToValueAtTime(55, when + 0.12);
    g.gain.setValueAtTime(gain * 0.9, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.22);
    osc.connect(g).connect(masterGain);
    osc.start(when); osc.stop(when + 0.25);
  }

  function tek(when, gain = 1) {
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = 3800; bp.Q.value = 1.6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain * 0.55, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.06);
    src.connect(bp).connect(g).connect(masterGain);
    src.start(when);
  }

  /* קליק רגיל (ספירה) — מחזיר את האוסילטור כדי לאפשר ביטול */
  function click(when, accent = false) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1100;
    g.gain.setValueAtTime(accent ? 0.5 : 0.28, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
    osc.connect(g).connect(masterGain);
    osc.start(when); osc.stop(when + 0.05);
    return osc;
  }

  /* ---------- צליל פריטה (למאמן הפנייה) ----------
     למטה: כל 4 המיתרים מהבס, כבד ומלא.
     למעלה: רק שני הגבוהים, קליל ובהיר — כמו ביד אמיתית. */
  function strum(when, dir = 'd', accent = false) {
    if (dir === 'd') {
      const base = accent ? 0.55 : 0.38;
      [3, 2, 1, 0].forEach((ci, i) => {
        const c = TUNING[ci];
        const freq = 440 * Math.pow(2, (c.midi - 69) / 12);
        const buf = ksBuffer(freq, 0.55, 0.6);
        playBuffer(buf, when + i * 0.014, base * (ci === 3 ? 1.15 : 1));
      });
    } else {
      const base = accent ? 0.4 : 0.26;
      [0, 1].forEach((ci, i) => {
        const c = TUNING[ci];
        const freq = 440 * Math.pow(2, (c.midi - 69) / 12);
        const buf = ksBuffer(freq, 0.4, 0.85);
        playBuffer(buf, when + i * 0.007, base);
      });
    }
  }

  /* פריטת אקורד לפי צורה: shape = [C,F,A,D] סריגים או 'x'
     למטה: כל המיתרים מהבס לגבוה, בס מודגש, גלגול איטי ומלא.
     למעלה: רק 2-3 המיתרים הגבוהים, מהגבוה לנמוך, מהיר וקליל. */
  function strumChord(shape, dir = 'd', when = 0, gain = 0.5) {
    ensureCtx();
    const t = when || ctx.currentTime + 0.02;
    // shape נתון מהנמוך לגבוה [C,F,A,D] — קורסים 3,2,1,0
    const courses = [];
    shape.forEach((f, i) => {
      if (f === 'x') return;
      courses.push({ ci: 3 - i, fret: f });
    });
    if (dir === 'd') {
      courses.forEach((c, i) => {
        const isBass = i === 0;
        pluckCourse(c.ci, c.fret, t + i * 0.017, gain * (isBass ? 1.2 : 1));
      });
    } else {
      // ביד אמיתית הפריטה למעלה תופסת בעיקר את המיתרים הגבוהים
      const top = courses.slice(-Math.min(3, courses.length)).reverse();
      top.forEach((c, i) => {
        pluckCourse(c.ci, c.fret, t + i * 0.009, gain * 0.55);
      });
    }
    return t;
  }

  /* צליל הבס של האקורד — הקורס הנמוך ביותר שמנוגן */
  function bassOfChord(shape, when = 0, gain = 0.62, override = null) {
    ensureCtx();
    const t = when || ctx.currentTime + 0.02;
    if (override) { pluckCourse(override.c, override.f, t, gain); return t; }
    for (let i = 0; i < shape.length; i++) {
      if (shape[i] !== 'x') { pluckCourse(3 - i, shape[i], t, gain); return t; }
    }
    return t;
  }

  /* ---------- מתזמן (lookahead scheduler) ---------- */
  class Scheduler {
    /* callback(stepIndex, time) — מוזמן לכל צעד; מחזיר את משך הצעד בשניות */
    constructor(onStep, onVisual) {
      this.onStep = onStep;       // (step, time) => void  — תזמון אודיו
      this.onVisual = onVisual;   // (step) => void        — עדכון UI
      this.stepDur = 0.25;
      this.numSteps = 8;
      this.running = false;
      this._timer = null;
      this._visualQueue = [];
    }
    start() {
      ensureCtx();
      this.running = true;
      this.step = 0;
      this.nextTime = ctx.currentTime + 0.08;
      this._visualQueue = [];
      this._timer = setInterval(() => this._tick(), 25);
      this._raf();
    }
    stop() {
      this.running = false;
      clearInterval(this._timer);
      this._visualQueue = [];
    }
    _tick() {
      while (this.nextTime < ctx.currentTime + 0.12) {
        this.onStep(this.step, this.nextTime);
        this._visualQueue.push({ step: this.step, time: this.nextTime });
        this.nextTime += this.stepDur;
        this.step = (this.step + 1) % this.numSteps;
      }
    }
    _raf() {
      if (!this.running) return;
      const now = ctx.currentTime;
      while (this._visualQueue.length && this._visualQueue[0].time <= now) {
        const ev = this._visualQueue.shift();
        if (this.onVisual) this.onVisual(ev.step);
      }
      requestAnimationFrame(() => this._raf());
    }
  }

  return { ensureCtx, pluckMidi, pluckCourse, dum, tek, click, strum, strumChord, bassOfChord, Scheduler,
    get ctx() { return ctx; } };
})();
