/* ============================================================
   מאמן חכם — האזנה למיקרופון, זיהוי צלילים ומשוב בזמן אמת
   ============================================================ */
'use strict';

const Listen = (() => {

  /* ---------- זיהוי גובה צליל (Autocorrelation) ---------- */
  function detectPitch(buf, sampleRate) {
    const SIZE = buf.length;
    let rms = 0;
    for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
    rms = Math.sqrt(rms / SIZE);
    if (rms < 0.012) return { freq: null, rms };

    // חיתוך שוליים שקטים
    let r1 = 0, r2 = SIZE - 1;
    const thres = 0.2;
    for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres * rms * 4) { r1 = i; } else break;
    for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres * rms * 4) { r2 = SIZE - i; } else break;
    const sliced = buf.slice(r1, r2);
    const N = sliced.length;
    if (N < 256) return { freq: null, rms };

    // אוטוקורלציה
    const c = new Float32Array(N);
    for (let lag = 0; lag < N; lag++) {
      let sum = 0;
      for (let i = 0; i < N - lag; i++) sum += sliced[i] * sliced[i + lag];
      c[lag] = sum;
    }

    // דילוג על השיא הראשון (lag=0)
    let d = 0;
    while (d < N - 1 && c[d] > c[d + 1]) d++;
    let maxVal = -1, maxPos = -1;
    const minLag = Math.max(d, Math.floor(sampleRate / 1300)); // עד ~1300Hz
    const maxLag = Math.min(N - 1, Math.ceil(sampleRate / 90)); // מ-90Hz
    for (let i = minLag; i <= maxLag; i++) {
      if (c[i] > maxVal) { maxVal = c[i]; maxPos = i; }
    }
    if (maxPos <= 0 || maxVal < 0.01 * c[0]) return { freq: null, rms };

    // אינטרפולציה פרבולית לדיוק
    let T0 = maxPos;
    const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1] || x2;
    const a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
    if (a) T0 = T0 - b / (2 * a);

    return { freq: sampleRate / T0, rms };
  }

  function freqToMidiFloat(f) { return 69 + 12 * Math.log2(f / 440); }

  /* ---------- מצב ---------- */
  let micStream = null, analyser = null, micCtx = null;
  let pollTimer = null;
  let running = false;

  // מעקב יציבות
  let stablePc = null, stableCount = 0, lastRegisteredAt = 0, armed = true, quietFrames = 0;

  // יעד
  let targets = [];       // [{label, midi, hint}]
  let idx = 0;
  let attempts = 0, misses = 0;
  let hitTimes = [];
  let started = false;

  const POLL_MS = 30;
  const STABLE_FRAMES = 3;
  const REFRACTORY_MS = 160;

  /* ---------- בניית יעדי תרגול ---------- */
  function buildTargetList() {
    const groups = [];

    // דרומוסים — מיתר בודד על רה
    groups.push({
      label: 'דרומוסים — עלייה וירידה על מיתר רה',
      options: DROMOI.map(d => ({ id: 'dr:' + d.id, name: d.nameHe }))
    });
    groups.push({
      label: 'תרגילים מהספרייה (TAB)',
      options: EXERCISES.flatMap(cat =>
        cat.items.filter(it => it.type === 'tab').map(it => ({ id: 'ex:' + it.id, name: cat.title + ' — ' + it.name }))
      )
    });
    return groups;
  }

  function targetsFor(id) {
    const [kind, key] = id.split(':');
    if (kind === 'dr') {
      const d = DROMOI.find(x => x.id === key);
      const frets = [...d.intervals, 12];
      const seq = [...frets, ...[...frets].reverse().slice(1)];
      return seq.map(f => {
        const midi = TUNING[0].midi + f;
        return { label: NOTE_NAMES[midi % 12], midi, hint: 'סריג ' + f };
      });
    }
    for (const cat of EXERCISES) {
      const it = cat.items.find(x => x.id === key);
      if (it) {
        return it.notes.filter(n => !n.rest).map(n => {
          const midi = TUNING[n.c].midi + n.f;
          return { label: NOTE_NAMES[midi % 12], midi, hint: COURSE_LABELS[n.c] + (n.f > 0 ? '·' + n.f : ' פתוח') };
        });
      }
    }
    return [];
  }

  /* ---------- UI ---------- */
  function renderChips() {
    const strip = $('#ls-chips');
    strip.innerHTML = '';
    targets.forEach((t, i) => {
      const chip = document.createElement('div');
      chip.className = 'ls-chip' + (i === idx && started ? ' current' : '');
      chip.dataset.i = i;
      chip.innerHTML = `<div class="lc-note">${t.label}</div><div class="lc-hint">${t.hint}</div>`;
      strip.appendChild(chip);
    });
    updateProgress();
  }

  function chipEl(i) { return $(`#ls-chips .ls-chip[data-i="${i}"]`); }

  function updateProgress() {
    $('#ls-progress').textContent = started ? `${idx} / ${targets.length}` : '';
  }

  function setLive(noteName, cents, freq, level) {
    $('#ls-note').textContent = noteName || '—';
    $('#ls-freq').textContent = freq ? freq.toFixed(1) + ' Hz' : '';
    const needle = $('#ls-needle');
    if (cents === null || cents === undefined) {
      needle.style.opacity = 0.25;
    } else {
      needle.style.opacity = 1;
      const clamped = Math.max(-50, Math.min(50, cents));
      needle.style.left = (50 + clamped) + '%';
      needle.classList.toggle('intune', Math.abs(cents) < 10);
    }
    $('#ls-level-fill').style.width = Math.min(100, level * 600) + '%';
  }

  /* ---------- לולאת האזנה ---------- */
  function poll() {
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const { freq, rms } = detectPitch(buf, micCtx.sampleRate);

    if (!freq) {
      quietFrames++;
      if (quietFrames >= 2) { armed = true; stablePc = null; stableCount = 0; }
      setLive(null, null, null, rms || 0);
      return;
    }
    quietFrames = 0;

    const mf = freqToMidiFloat(freq);
    const midi = Math.round(mf);
    const cents = (mf - midi) * 100;
    const pc = ((midi % 12) + 12) % 12;
    setLive(NOTE_NAMES[pc] + ' (' + SOLFEGE[NOTE_NAMES[pc]] + ')', cents, freq, rms);

    if (!started) return;

    // יציבות
    if (pc === stablePc) stableCount++;
    else { stablePc = pc; stableCount = 1; }

    const now = performance.now();
    if (stableCount === STABLE_FRAMES && now - lastRegisteredAt > REFRACTORY_MS) {
      const expected = targets[idx];
      if (!expected) return;
      const expPc = ((expected.midi % 12) + 12) % 12;
      const isNew = armed || pc !== lastPcRegistered;
      if (!isNew) return;

      lastRegisteredAt = now;
      lastPcRegistered = pc;
      armed = false;
      attempts++;

      if (pc === expPc) {
        const chip = chipEl(idx);
        chip.classList.remove('current', 'wrong');
        chip.classList.add(chip.dataset.hadMiss ? 'fixed' : 'hit');
        hitTimes.push(now);
        idx++;
        updateProgress();
        if (idx >= targets.length) { finish(); return; }
        const next = chipEl(idx);
        next.classList.add('current');
        next.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      } else {
        misses++;
        const chip = chipEl(idx);
        chip.dataset.hadMiss = '1';
        chip.classList.add('wrong');
        setTimeout(() => chip.classList.remove('wrong'), 450);
      }
    }
  }
  let lastPcRegistered = null;

  /* ---------- תוצאות ---------- */
  function finish() {
    started = false;
    const correct = targets.length;
    const score = Math.round(100 * correct / Math.max(attempts, 1));

    let grade, gradeCls;
    if (score >= 95) { grade = '🏆 מקצועי! נקי לחלוטין — Γεια σου, μάστορα!'; gradeCls = 'gold'; }
    else if (score >= 80) { grade = '⭐ מצוין! עוד קצת ליטוש וזה מושלם.'; gradeCls = 'good'; }
    else if (score >= 60) { grade = '👍 טוב. תרגלו שוב לאט יותר — דיוק לפני מהירות.'; gradeCls = 'ok'; }
    else { grade = '💪 תשתפרו: הורידו טמפו, נגנו צליל-צליל עם הסולם המושמע, ונסו שוב.'; gradeCls = 'work'; }

    // יציבות קצב
    let rhythmMsg = '';
    if (hitTimes.length >= 4) {
      const ivs = [];
      for (let i = 1; i < hitTimes.length; i++) ivs.push(hitTimes[i] - hitTimes[i - 1]);
      const mean = ivs.reduce((a, b) => a + b, 0) / ivs.length;
      const sd = Math.sqrt(ivs.reduce((a, b) => a + (b - mean) ** 2, 0) / ivs.length);
      const cv = sd / mean;
      if (cv < 0.18) rhythmMsg = '🥁 קצב יציב מאוד — כל הכבוד!';
      else if (cv < 0.35) rhythmMsg = '🥁 קצב סביר — נסו לנגן עם המטרונום ליציבות מלאה.';
      else rhythmMsg = '🥁 הקצב לא אחיד — תרגלו את הרצף עם מטרונום איטי.';
    }

    const res = $('#ls-results');
    res.className = 'ls-results show ' + gradeCls;
    res.innerHTML = `
      <div class="ls-score">${score}%</div>
      <div class="ls-grade">${grade}</div>
      <div class="ls-stats">
        ${targets.length} צלילים · ${attempts} ניסיונות · ${misses} שגיאות
        ${rhythmMsg ? '<br>' + rhythmMsg : ''}
      </div>
      <button class="btn gold" id="ls-again">🔁 תרגלו שוב</button>`;
    $('#ls-again').addEventListener('click', () => { res.classList.remove('show'); startPractice(); });
    $('#ls-start').textContent = '▶ התחל תרגול';
    $('#ls-start').classList.remove('playing');
  }

  /* ---------- הפעלה/כיבוי ---------- */
  async function enableMic() {
    if (micStream) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $('#ls-error').textContent = 'הדפדפן לא מאפשר גישה למיקרופון. נסו ב-Chrome או Edge.';
      return false;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      micCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = micCtx.createMediaStreamSource(micStream);
      analyser = micCtx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      $('#ls-error').textContent = '';
      return true;
    } catch (e) {
      $('#ls-error').textContent = 'אין גישה למיקרופון — אשרו את הבקשה בדפדפן ונסו שוב.';
      return false;
    }
  }

  async function toggleListening() {
    const btn = $('#ls-start');
    if (running && started) { stopPractice(); return; }
    const ok = await enableMic();
    if (!ok) return;
    if (!running) {
      running = true;
      pollTimer = setInterval(poll, POLL_MS);
    }
    startPractice();
    btn.textContent = '⏹ עצור';
    btn.classList.add('playing');
  }

  function startPractice() {
    targets = targetsFor($('#ls-target').value);
    idx = 0; attempts = 0; misses = 0; hitTimes = [];
    stablePc = null; stableCount = 0; armed = true; lastPcRegistered = null;
    started = true;
    $('#ls-results').classList.remove('show');
    renderChips();
    if (running) { /* פולינג כבר רץ */ }
  }

  function stopPractice() {
    started = false;
    $('#ls-start').textContent = '▶ התחל תרגול';
    $('#ls-start').classList.remove('playing');
    renderChips();
  }

  function stopAll() {
    stopPractice();
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    running = false;
    // שחרור המיקרופון (פרטיות) — בהפעלה הבאה הדפדפן יזכור את האישור
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;
      if (micCtx) { micCtx.close(); micCtx = null; }
      analyser = null;
    }
    setLive(null, null, null, 0);
  }

  function playTargetPreview() {
    AudioEngine.ensureCtx();
    targets = targetsFor($('#ls-target').value);
    renderChips();
    targets.forEach((t, i) => {
      AudioEngine.pluckMidi(t.midi, AudioEngine.ctx.currentTime + 0.05 + i * 0.34, 0.5);
    });
  }

  function skipNote() {
    if (!started || idx >= targets.length) return;
    const chip = chipEl(idx);
    chip.classList.remove('current');
    chip.classList.add('skipped');
    misses++;
    attempts++;
    idx++;
    updateProgress();
    if (idx >= targets.length) { finish(); return; }
    chipEl(idx).classList.add('current');
  }

  /* ---------- אתחול ---------- */
  function init() {
    const sel = $('#ls-target');
    buildTargetList().forEach(group => {
      const og = document.createElement('optgroup');
      og.label = group.label;
      group.options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.id;
        opt.textContent = o.name;
        og.appendChild(opt);
      });
      sel.appendChild(og);
    });
    sel.addEventListener('change', () => {
      stopPractice();
      targets = targetsFor(sel.value);
      started = false;
      renderChips();
    });

    $('#ls-start').addEventListener('click', toggleListening);
    $('#ls-preview').addEventListener('click', playTargetPreview);
    $('#ls-skip').addEventListener('click', skipNote);

    targets = targetsFor(sel.value);
    renderChips();
  }

  return { init, stopAll, detectPitch };
})();

Listen.init();
