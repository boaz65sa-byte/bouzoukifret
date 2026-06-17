/* מנוע אודיו — בוזוקי Karplus-Strong (זוגות מיתרים) */
const AudioEngine = (() => {
  let ctx = null, masterGain = null;
  const bufferCache = new Map();

  const TUNING = [
    { midi: 62, pair: 'unison' },
    { midi: 57, pair: 'unison' },
    { midi: 53, pair: 'octave' },
    { midi: 48, pair: 'octave' },
  ];
  const NUM_FRETS = 15;

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

  function ksBuffer(freq, durationSec = 2.2, brightness = 0.55) {
    ensureCtx();
    const key = freq.toFixed(2) + ':' + brightness + ':' + durationSec;
    if (bufferCache.has(key)) return bufferCache.get(key);

    const sr = ctx.sampleRate;
    const len = Math.floor(sr * durationSec);
    const buf = ctx.createBuffer(1, len, sr);
    const out = buf.getChannelData(0);
    const period = Math.max(2, Math.floor(sr / freq));
    const delay = new Float32Array(period);
    let prev = 0;
    for (let i = 0; i < period; i++) {
      const noise = Math.random() * 2 - 1;
      prev = brightness * noise + (1 - brightness) * prev;
      delay[i] = prev;
    }
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const avg = 0.996 * 0.5 * (delay[idx] + delay[(idx + 1) % period]);
      delay[idx] = avg;
      out[i] = avg;
      idx = (idx + 1) % period;
    }
    let max = 0;
    for (let i = 0; i < len; i++) max = Math.max(max, Math.abs(out[i]));
    if (max > 0) for (let i = 0; i < len; i++) out[i] /= max;
    bufferCache.set(key, buf);
    return buf;
  }

  function playBuffer(buf, when, gain, detuneCents = 0) {
    ensureCtx();
    const src = ctx.createBufferSource();
    src.buffer = buf;
    if (detuneCents) src.detune.value = detuneCents;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + buf.duration);
    src.connect(g).connect(masterGain);
    src.start(when);
  }

  function pluckCourse(courseIdx, fret, when = 0, gain = 0.5) {
    ensureCtx();
    const t = when != null && when > 0 ? when : ctx.currentTime + 0.02;
    const c = TUNING[courseIdx];
    if (!c) return t;
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

  function pluckFromMidi(midi, when = 0, gain = 0.5, preferCourse = 0) {
    ensureCtx();
    const t = when != null && when > 0 ? when : ctx.currentTime + 0.02;
    const prefFret = midi - TUNING[preferCourse].midi;
    if (prefFret >= 0 && prefFret <= NUM_FRETS) {
      return pluckCourse(preferCourse, prefFret, t, gain);
    }
    for (let ci = 0; ci < TUNING.length; ci++) {
      const fret = midi - TUNING[ci].midi;
      if (fret >= 0 && fret <= NUM_FRETS) return pluckCourse(ci, fret, t, gain);
    }
    return pluckCourse(preferCourse, Math.max(0, prefFret), t, gain);
  }

  function strum(when, dir = 'd', accent = false) {
    ensureCtx();
    const t = when != null && when > 0 ? when : ctx.currentTime + 0.02;
    const isUp = dir === 'u' || dir === 'U';
    if (!isUp) {
      const base = accent ? 0.55 : 0.38;
      [3, 2, 1, 0].forEach((ci, i) => {
        pluckCourse(ci, 0, t + i * 0.014, base * (ci === 3 ? 1.15 : 1));
      });
    } else {
      const base = accent ? 0.4 : 0.26;
      [0, 1].forEach((ci, i) => {
        pluckCourse(ci, 0, t + i * 0.007, base);
      });
    }
  }

  function click(when, accent = false) {
    ensureCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.value = accent ? 1600 : 1100;
    g.gain.setValueAtTime(accent ? 0.5 : 0.28, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.04);
    osc.connect(g).connect(masterGain);
    osc.start(when);
    osc.stop(when + 0.05);
    return osc;
  }

  function fanfare() {
    ensureCtx();
    const t = ctx.currentTime + 0.05;
    [0, 2, 4, 7].forEach((fret, i) => {
      pluckCourse(0, fret, t + i * 0.12, 0.38);
    });
  }

  return {
    ensureCtx, strum, click, fanfare, pluckCourse, pluckFromMidi,
    get ctx() { return ctx; },
  };
})();
