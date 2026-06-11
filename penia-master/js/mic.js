/* זיהוי פריטה אמיתית מהמיקרופון — תזמון + כיוון ↓↑ */
const MicInput = (() => {
  let stream = null, analyser = null, pollTimer = null;
  let onStrum = () => {};
  let active = false;
  let armed = true, lastRms = 0.001, lastHit = 0;
  let levelCb = () => {};

  const POLL_MS = 25;
  const REFRACTORY_MS = 130;
  const ONSET_RMS = 0.022;
  const ONSET_RATIO = 2.0;

  function rms(buf) {
    let s = 0;
    for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
    return Math.sqrt(s / buf.length);
  }

  /* פריטה למטה = יותר אנרגיה בבס · למעלה = יותר בגבוהים */
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
    return low > high * 1.08 ? 'd' : 'u';
  }

  function detectPitch(buf, sampleRate) {
    const SIZE = buf.length;
    let r = 0;
    for (let i = 0; i < SIZE; i++) r += buf[i] * buf[i];
    r = Math.sqrt(r / SIZE);
    if (r < 0.012) return null;
    let r1 = 0, r2 = SIZE - 1;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < r * 0.8) r1 = i; else break;
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < r * 0.8) r2 = SIZE - i; else break;
    const sliced = buf.slice(r1, r2), N = sliced.length;
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
    const minLag = Math.max(d, Math.floor(sampleRate / 1300));
    const maxLag = Math.min(N - 1, Math.ceil(sampleRate / 90));
    for (let i = minLag; i <= maxLag; i++) {
      if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
    }
    if (maxPos <= 0 || maxVal < 0.01 * c[0]) return null;
    return sampleRate / maxPos;
  }

  function poll() {
    if (!analyser) return;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const cur = rms(buf);
    levelCb(Math.min(1, cur / 0.12));

    const now = performance.now();
    const spike = cur > ONSET_RMS && cur > lastRms * ONSET_RATIO;

    if (armed && spike && now - lastHit > REFRACTORY_MS) {
      armed = false;
      lastHit = now;
      const dir = strumDirection(buf, AudioEngine.ctx.sampleRate);
      const freq = detectPitch(buf, AudioEngine.ctx.sampleRate);
      onStrum({ dir, rms: cur, freq });
    }
    if (cur < ONSET_RMS * 0.55) armed = true;
    lastRms = cur * 0.35 + lastRms * 0.65;
  }

  async function start(strumCb, onLevel) {
    onStrum = strumCb || (() => {});
    levelCb = onLevel || (() => {});
    if (active) return true;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('no-mic');
    }
    AudioEngine.ensureCtx();
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
    } catch (e) {
      throw new Error('denied');
    }

    const src = AudioEngine.ctx.createMediaStreamSource(stream);
    analyser = AudioEngine.ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.2;
    src.connect(analyser);
    armed = true;
    lastRms = 0.001;
    active = true;
    pollTimer = setInterval(poll, POLL_MS);
    return true;
  }

  function stop() {
    active = false;
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
    analyser = null;
    levelCb(0);
  }

  function running() { return active; }

  return { start, stop, running };
})();
