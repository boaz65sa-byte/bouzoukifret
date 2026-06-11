/* מנוע אודיו — מאסטר הפנייה (עצמאי) */
const AudioEngine = (() => {
  let ctx = null, masterGain = null;
  const bufferCache = new Map();

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

  function ksBuffer(freq, dur = 0.45, bright = 0.65) {
    const key = freq.toFixed(1) + bright;
    if (bufferCache.has(key)) return bufferCache.get(key);
    const sr = ctx.sampleRate, len = Math.floor(sr * dur);
    const buf = ctx.createBuffer(1, len, sr), out = buf.getChannelData(0);
    const period = Math.max(2, Math.floor(sr / freq));
    const delay = new Float32Array(period);
    let prev = 0;
    for (let i = 0; i < period; i++) {
      const n = Math.random() * 2 - 1;
      prev = bright * n + (1 - bright) * prev;
      delay[i] = prev;
    }
    let idx = 0;
    for (let i = 0; i < len; i++) {
      const avg = 0.996 * 0.5 * (delay[idx] + delay[(idx + 1) % period]);
      delay[idx] = avg; out[i] = avg; idx = (idx + 1) % period;
    }
    let max = 0; for (let i = 0; i < len; i++) max = Math.max(max, Math.abs(out[i]));
    if (max) for (let i = 0; i < len; i++) out[i] /= max;
    bufferCache.set(key, buf);
    return buf;
  }

  function playBuf(buf, when, gain) {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + buf.duration);
    src.connect(g).connect(masterGain);
    src.start(when);
  }

  /* צלילי אקורד D פתוח לפריטה */
  const CHORD = [146.83, 220, 174.61, 130.81]; // D3 A3 F3 C3

  function strum(when, dir = 'd', accent = false) {
    ensureCtx();
    const t = when || ctx.currentTime;
    if (dir === 'd') {
      const g = accent ? 0.55 : 0.38;
      CHORD.forEach((f, i) => playBuf(ksBuffer(f, 0.5, 0.55), t + i * 0.014, g * (i === 0 ? 1.15 : 1)));
    } else {
      const g = accent ? 0.4 : 0.26;
      [CHORD[0], CHORD[1]].forEach((f, i) => playBuf(ksBuffer(f, 0.35, 0.85), t + i * 0.007, g));
    }
  }

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

  function fanfare() {
    ensureCtx();
    const t = ctx.currentTime + 0.05;
    [0, 4, 7, 12].forEach((st, i) => {
      const f = 146.83 * Math.pow(2, st / 12);
      playBuf(ksBuffer(f, 0.6, 0.7), t + i * 0.12, 0.35);
    });
  }

  return { ensureCtx, strum, click, fanfare, get ctx() { return ctx; } };
})();
