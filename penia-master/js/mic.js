/* זיהוי פריטה + גובה צליל מהמיקרופון */
const MicInput = (() => {
  let stream = null, analyser = null, pollTimer = null;
  let onStrum = () => {};
  let levelCb = () => {};
  let active = false;
  let armed = true, lastRms = 0.001, lastHit = 0;
  let pitchMode = false;

  let pendingHit = null;

  const POLL_MS = 20;
  const REFRACTORY_MS = 120;
  const ONSET_RMS = 0.014;
  const ONSET_RATIO = 1.65;
  const PITCH_CAPTURE_S = 0.24;
  const STABLE_FRAMES = 2;

  function actxTime() {
    AudioEngine.ensureCtx();
    return AudioEngine.ctx.currentTime;
  }

  function rms(buf) {
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }

  function strumDirection(re, sampleRate) {
    const m = Math.min(512, re.length);
    let low = 0, high = 0;
    for (let k = 1; k < m / 2; k++) {
      let rr = 0, ii = 0;
      for (let t = 0; t < m; t++) {
        const ph = (2 * Math.PI * k * t) / m;
        rr += re[t] * Math.cos(ph);
        ii -= re[t] * Math.sin(ph);
      }
      const mag = rr * rr + ii * ii;
      const freq = (k * sampleRate) / m;
      if (freq < 260) low += mag;
      else if (freq < 1100) high += mag;
    }
    if (low + high < 1e-12) return 'd';
    return low > high * 1.06 ? 'd' : 'u';
  }

  function detectPitch(buf, sampleRate) {
    const SIZE = buf.length;
    let energy = 0;
    for (let i = 0; i < SIZE; i++) energy += buf[i] * buf[i];
    energy = Math.sqrt(energy / SIZE);
    if (energy < 0.008) return null;

    let r1 = 0, r2 = SIZE - 1;
    const trim = 0.25;
    for (let i = 0; i < SIZE / 2; i++) {
      if (Math.abs(buf[i]) < trim * energy * 3) r1 = i;
      else break;
    }
    for (let i = 1; i < SIZE / 2; i++) {
      if (Math.abs(buf[SIZE - i]) < trim * energy * 3) r2 = SIZE - i;
      else break;
    }

    const sliced = buf.slice(r1, r2);
    const N = sliced.length;
    if (N < 256) return null;

    const c = new Float32Array(N);
    for (let lag = 0; lag < N; lag++) {
      let sum = 0;
      for (let i = 0; i < N - lag; i++) sum += sliced[i] * sliced[i + lag];
      c[lag] = sum;
    }

    let d = 0;
    while (d < N - 1 && c[d] > c[d + 1]) d++;

    let maxVal = -1, maxPos = -1;
    const minLag = Math.max(d, Math.floor(sampleRate / 1400));
    const maxLag = Math.min(N - 1, Math.ceil(sampleRate / 75));
    for (let i = minLag; i <= maxLag; i++) {
      if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
    }
    if (maxPos <= 0 || maxVal < 0.008 * c[0]) return null;

    let T0 = maxPos;
    const x1 = c[T0 - 1] || c[T0], x2 = c[T0], x3 = c[T0 + 1] || c[T0];
    const a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    const freq = sampleRate / T0;
    if (freq < 70 || freq > 1400) return null;
    return freq;
  }

  function pcFromFreq(freq) {
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    return ((midi % 12) + 12) % 12;
  }

  function medianFreq(freqs) {
    if (!freqs.length) return null;
    const sorted = [...freqs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  }

  function bestFreqFromSamples(freqs) {
    if (!freqs.length) return null;
    if (freqs.length === 1) return freqs[0];

    const buckets = new Map();
    freqs.forEach(f => {
      const pc = pcFromFreq(f);
      if (!buckets.has(pc)) buckets.set(pc, []);
      buckets.get(pc).push(f);
    });

    let best = null, bestN = 0;
    buckets.forEach((list, pc) => {
      if (list.length > bestN) { bestN = list.length; best = list; }
    });
    return medianFreq(best || freqs);
  }

  function emitHit({ dir, freq, hitTime, rmsVal }) {
    onStrum({ dir, freq, hitTime, rms: rmsVal });
  }

  function flushPending(force) {
    if (!pendingHit) return;
    const age = actxTime() - pendingHit.t0;
    if (!force && age < PITCH_CAPTURE_S && pendingHit.stableCount < STABLE_FRAMES) return;

    const freq = bestFreqFromSamples(pendingHit.freqs);
    emitHit({
      dir: pendingHit.dir,
      freq,
      hitTime: pendingHit.t0,
      rmsVal: pendingHit.rms,
    });
    pendingHit = null;
  }

  function trackPending(freq) {
    if (!pendingHit || !freq) return;
    pendingHit.freqs.push(freq);
    const pc = pcFromFreq(freq);
    if (pc === pendingHit.lastPc) pendingHit.stableCount++;
    else {
      pendingHit.lastPc = pc;
      pendingHit.stableCount = 1;
    }
    if (pendingHit.stableCount >= STABLE_FRAMES) flushPending(true);
  }

  function poll() {
    if (!analyser) return;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const cur = rms(buf);
    const sampleRate = AudioEngine.ctx.sampleRate;
    levelCb(Math.min(1, cur / 0.1));

    const freq = detectPitch(buf, sampleRate);
    trackPending(freq);
    if (pendingHit) flushPending(false);

    const now = performance.now();
    const spike = cur > ONSET_RMS && cur > lastRms * ONSET_RATIO;

    if (armed && spike && now - lastHit > REFRACTORY_MS) {
      armed = false;
      lastHit = now;
      const dir = strumDirection(buf, sampleRate);
      const hitTime = actxTime();

      if (pitchMode) {
        pendingHit = {
          t0: hitTime,
          dir,
          freqs: freq ? [freq] : [],
          lastPc: freq ? pcFromFreq(freq) : null,
          stableCount: freq ? 1 : 0,
          rms: cur,
        };
        if (freq && pendingHit.stableCount >= STABLE_FRAMES) flushPending(true);
      } else {
        emitHit({ dir, freq: null, hitTime, rmsVal: cur });
      }
    }

    if (cur < ONSET_RMS * 0.5) armed = true;
    lastRms = cur * 0.35 + lastRms * 0.65;
  }

  async function start(strumCb, onLevel, opts = {}) {
    onStrum = strumCb || (() => {});
    levelCb = onLevel || (() => {});
    pitchMode = !!opts.pitchMode;
    pendingHit = null;
    if (active) return true;

    if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-mic');
    AudioEngine.ensureCtx();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
    } catch (e) {
      throw new Error('denied');
    }

    const src = AudioEngine.ctx.createMediaStreamSource(stream);
    analyser = AudioEngine.ctx.createAnalyser();
    analyser.fftSize = 4096;
    analyser.smoothingTimeConstant = 0.15;
    src.connect(analyser);
    armed = true;
    lastRms = 0.001;
    active = true;
    pollTimer = setInterval(poll, POLL_MS);
    return true;
  }

  function stop() {
    active = false;
    pendingHit = null;
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    analyser = null;
    levelCb(0);
  }

  function running() { return active; }

  function freqLabel(freq) {
    if (!freq) return '';
    const names = ['דו', 'דו#', 'רה', 'רה#', 'מי', 'פה', 'פה#', 'סול', 'סול#', 'לה', 'לה#', 'סי'];
    return names[pcFromFreq(freq)] + ' · ' + Math.round(freq) + 'Hz';
  }

  return { start, stop, running, freqLabel };
})();
