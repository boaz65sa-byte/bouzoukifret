/* ============================================================
   מאמן מיומנויות — SkillsCoach
   שומע את הנגן בזמן אמת ונותן דגשים, תיקונים ומשוב
   ============================================================ */
'use strict';

const SkillsCoach = (() => {

  /* ---------- תרגילים ---------- */
  const EXERCISES = [
    {
      id: 'open-strings',
      name: 'כיוון המיתרים',
      icon: '🎵',
      type: 'tuning',
      desc: 'לפני כל תרגיל — בדקו שהבוזוקי מכוון. נגנו כל מיתר פתוח ועקבו אחרי המחט.',
      targets: [
        { label: 'C', midi: 60, hint: 'מיתר 1 (C) — פתוח' },
        { label: 'F', midi: 65, hint: 'מיתר 2 (F) — פתוח' },
        { label: 'A', midi: 69, hint: 'מיתר 3 (A) — פתוח' },
        { label: 'D', midi: 74, hint: 'מיתר 4 (D) — פתוח' },
      ],
      intro: 'נגנו כל מיתר לחוד ובדקו שהמחט במרכז (ירוק). מיתר D = הדק ביותר.',
      endTip: 'טיפ: מיתרים משתנים עם הטמפרטורה — כוונו תמיד לפני כל נגינה.'
    },
    {
      id: 'single-down',
      name: 'פריטות יסוד ↓',
      icon: '↓',
      type: 'picking',
      desc: 'פריטות למטה בלבד על הפעמה. התנועה קטנה — מהמפרט, לא מהמרפק.',
      bpm: 60,
      pattern: ['D','D','D','D','D','D','D','D'],
      stepsPerBeat: 1,
      loops: 3,
      intro: 'כוונו את הבוזוקי לפני שמתחילים. שמרו יד ימין קרובה למיתרים — פריטה קטנה ומדויקת.',
      endTip: 'כשפריטות למטה מדויקות לחלוטין — עברו לחליפות ↓↑. לא לפני!'
    },
    {
      id: 'alternating',
      name: 'חליפות ↓↑',
      icon: '↕',
      type: 'picking',
      desc: 'שמיניות: למטה על הפעמה, למעלה בין הפעמות. היד לא עוצרת — רק מגע.',
      bpm: 65,
      pattern: ['D','u','D','u','D','u','D','u'],
      stepsPerBeat: 2,
      loops: 3,
      intro: 'הסוד: היד נעה למטה-למעלה ברציפות. הפריטה = מגע עדין, לא עצירה.',
      endTip: 'כשהחליפות אוטומטיות ב-65 BPM — העלו ל-75, ואז ל-85. אל תדלגו!'
    },
    {
      id: 'rast-scale',
      name: 'סולם ראסט',
      icon: '🎵',
      type: 'pitch',
      desc: 'ראסט מ-D: הסולם הבסיסי של המוזיקה היוונית. על מיתר D (הדק).',
      targets: [
        { label: 'D', midi: 74, hint: 'סריג 0 (פתוח)' },
        { label: 'E', midi: 76, hint: 'סריג 2' },
        { label: 'F#', midi: 78, hint: 'סריג 4' },
        { label: 'G', midi: 79, hint: 'סריג 5' },
        { label: 'A', midi: 81, hint: 'סריג 7' },
        { label: 'B', midi: 83, hint: 'סריג 9' },
        { label: 'C', midi: 84, hint: 'סריג 10' },
        { label: 'D', midi: 86, hint: 'סריג 12' },
        { label: 'C', midi: 84, hint: 'סריג 10' },
        { label: 'B', midi: 83, hint: 'סריג 9' },
        { label: 'A', midi: 81, hint: 'סריג 7' },
        { label: 'G', midi: 79, hint: 'סריג 5' },
        { label: 'F#', midi: 78, hint: 'סריג 4' },
        { label: 'E', midi: 76, hint: 'סריג 2' },
        { label: 'D', midi: 74, hint: 'סריג 0' },
      ],
      intro: 'נגנו על מיתר D. הסריג כתוב על כל תו. עלו וירדו — אחד-אחד, בלי מהירות.',
      endTip: 'ראסט = הבסיס. כשהוא נקי — כל הסולמות יהיו נקיים. חזרו עליו כל יום.'
    },
    {
      id: 'hitzaz-scale',
      name: 'סולם חיג׳אז',
      icon: '🌙',
      type: 'pitch',
      desc: 'החיג׳אז: הצליל היווני המיוחד. שימו לב לקפיצה Eb→F# — זה הלב של הסולם.',
      targets: [
        { label: 'D', midi: 74, hint: 'סריג 0 (פתוח)' },
        { label: 'Eb', midi: 75, hint: 'סריג 1' },
        { label: 'F#', midi: 78, hint: 'סריג 4' },
        { label: 'G', midi: 79, hint: 'סריג 5' },
        { label: 'A', midi: 81, hint: 'סריג 7' },
        { label: 'Bb', midi: 82, hint: 'סריג 8' },
        { label: 'C', midi: 84, hint: 'סריג 10' },
        { label: 'D', midi: 86, hint: 'סריג 12' },
        { label: 'C', midi: 84, hint: 'סריג 10' },
        { label: 'Bb', midi: 82, hint: 'סריג 8' },
        { label: 'A', midi: 81, hint: 'סריג 7' },
        { label: 'G', midi: 79, hint: 'סריג 5' },
        { label: 'F#', midi: 78, hint: 'סריג 4' },
        { label: 'Eb', midi: 75, hint: 'סריג 1' },
        { label: 'D', midi: 74, hint: 'סריג 0' },
      ],
      intro: 'הקפיצה Eb→F# (שנייה מוגברת) היא "הצבע" של החיג׳אז. תרגלו אותה לבד קודם.',
      endTip: 'החיג׳אז = "דרומוס הית׳ז". ברגע שמרגישים אותו — שמעים אותו בכל שיר יווני.'
    },
    {
      id: 'tremolo-prep',
      name: 'הכנה לטרמולו',
      icon: '🎶',
      type: 'tremolo',
      desc: 'פריטות רצופות מהירות על מיתר D. מטרה: 5+ פריטות/שניה. מהיד — לא מהמרפק.',
      targetRate: 5.0,
      duration: 8,
      intro: 'מפתח הטרמולו: שורש כף היד נע בעיגולים. האצבע/מפרט רק "ממשיך" את התנועה. התחילו לאט!',
      endTip: 'טרמולו מגיע עם חודשים של תרגול יומי — 5 דקות ביום עדיף על שעה פעם בשבוע.'
    }
  ];

  /* ---------- מצב ---------- */
  let currentEx = null;
  let micStream = null, micCtx = null, micAnalyser = null, micTimer = null;
  let micRunning = false;

  // מצב תרגיל פעיל
  let session = null;

  /* ---------- זיהוי פיצ׳ -------------------------- */
  function detectPitchLocal(buf, sampleRate) {
    return (typeof Listen !== 'undefined' && Listen.detectPitch)
      ? Listen.detectPitch(buf, sampleRate)
      : { freq: null, rms: 0 };
  }

  function freqToMidi(f) { return 69 + 12 * Math.log2(f / 440); }

  function spectralDir(analyser, sampleRate) {
    const fd = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(fd);
    const bHz = sampleRate / (2 * analyser.frequencyBinCount);
    const ll = Math.floor(200 / bHz), lh = Math.floor(420 / bHz);
    const hl = Math.floor(440 / bHz), hh = Math.floor(700 / bHz);
    let ls = 0, hs = 0;
    for (let i = ll; i <= lh; i++) ls += fd[i];
    for (let i = hl; i <= hh; i++) hs += fd[i];
    const r = (ls / (lh - ll + 1)) / ((hs / (hh - hl + 1)) + 0.1);
    return r > 1.2 ? 'd' : r < 0.8 ? 'u' : 'd';
  }

  /* ---------- מיקרופון ---------- */
  async function enableMic() {
    if (micStream) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('הדפדפן לא תומך במיקרופון. נסו ב-Chrome.', 'err');
      return false;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      micCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = micCtx.createMediaStreamSource(micStream);
      micAnalyser = micCtx.createAnalyser();
      micAnalyser.fftSize = 2048;
      AudioEngine.micBoost(src).connect(micAnalyser);
      return true;
    } catch(e) {
      setStatus('אין גישה למיקרופון — אשרו את הבקשה בדפדפן.', 'err');
      return false;
    }
  }

  function stopMic() {
    if (micTimer) { clearInterval(micTimer); micTimer = null; }
    micRunning = false;
    if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
    if (micCtx) { micCtx.close(); micCtx = null; }
    micAnalyser = null;
  }

  /* ---------- תרגיל כיוון ---------- */
  function runTuning(ex) {
    const targets = ex.targets;
    let idx = 0;
    let prevRms = 0;
    const buf = new Float32Array(micAnalyser.fftSize);

    session = { type: 'tuning', results: [], idx: 0 };
    renderTuningUI(targets, idx);

    micTimer = setInterval(() => {
      if (!micAnalyser) return;
      micAnalyser.getFloatTimeDomainData(buf);
      const { freq, rms } = detectPitchLocal(buf, micCtx.sampleRate);
      updateVU(rms);

      if (idx >= targets.length) { finishSession(); return; }

      if (!freq) { prevRms = rms; return; }

      const mf = freqToMidi(freq);
      const midi = Math.round(mf);
      const cents = (mf - midi) * 100;
      const expMidi = targets[idx].midi;
      const expPc = ((expMidi % 12) + 12) % 12;
      const gotPc = ((midi % 12) + 12) % 12;

      updateNeedle(cents, gotPc);

      if (gotPc === expPc) {
        const absCents = Math.abs(cents);
        if (absCents < 15) {
          flashFeedback('✓ מכוון מושלם!', 'ok');
          session.results.push({ label: targets[idx].label, ok: true, cents });
          idx++;
          session.idx = idx;
          if (idx < targets.length) renderTuningUI(targets, idx);
          else finishSession();
        } else if (cents > 0) {
          flashFeedback(`גבוה +${Math.round(cents)}¢ — רפו מיתר`, 'warn');
        } else {
          flashFeedback(`נמוך ${Math.round(cents)}¢ — הדקו מיתר`, 'warn');
        }
      }
      prevRms = rms;
    }, 30);
  }

  /* ---------- תרגיל פריטה ---------- */
  function runPicking(ex) {
    const beat = 60 / ex.bpm;
    const stepDur = beat / ex.stepsPerBeat;
    const totalSteps = ex.pattern.length * ex.loops;
    const countIn = 4;

    if (typeof AudioEngine === 'undefined') { setStatus('AudioEngine לא נטען.', 'err'); return; }
    AudioEngine.ensureCtx();

    const t0 = AudioEngine.ctx.currentTime + 0.6;
    const playStart = t0 + countIn * beat;

    // בניית יעדים
    const beats = [];
    for (let b = 0; b < Math.ceil((playStart + totalSteps * stepDur - t0)); b++) {
      beats.push(t0 + b * beat);
    }

    const tgList = [];
    for (let s = 0; s < totalSteps; s++) {
      const stroke = ex.pattern[s % ex.pattern.length];
      if (stroke === '-') continue;
      tgList.push({ t: playStart + s * stepDur, dir: stroke.toLowerCase(), accent: stroke === stroke.toUpperCase(), status: null });
    }
    const endT = playStart + totalSteps * stepDur;
    const scheduledClicks = [];
    for (let b = 0; b < beats.length + 1; b++) {
      const ct = t0 + b * beat;
      scheduledClicks.push(AudioEngine.click(ct, b % countIn === 0));
    }

    session = { type: 'picking', targets: tgList, endT, counts: { ok: 0, early: 0, late: 0, wrong: 0, miss: 0 }, lastHit: 0, prevRms: 0, scheduledClicks };
    renderPickingUI(ex, tgList);

    const buf = new Float32Array(micAnalyser.fftSize);
    const inputOffset = parseFloat(localStorage.getItem('penia-game-offset') || '0');

    micTimer = setInterval(() => {
      if (!micAnalyser || !session) return;
      const now = AudioEngine.ctx.currentTime;

      // סיום
      if (now > endT + 0.5) { finishSession(); return; }

      // זיהוי onset
      micAnalyser.getFloatTimeDomainData(buf);
      let rms = 0;
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / buf.length);
      updateVU(rms);

      const ms = performance.now();
      if (rms > 0.035 && rms > session.prevRms * 1.6 && ms - session.lastHit > 100) {
        session.lastHit = ms;
        const dir = spectralDir(micAnalyser, micCtx.sampleRate);
        handlePickingInput(dir, now + inputOffset, tgList, session.counts);
      }
      session.prevRms = rms * 0.7 + session.prevRms * 0.3;

      // החטאות אוטומטיות
      const W = 0.16;
      for (const tg of tgList) {
        if (!tg.status && now - tg.t > W) {
          tg.status = 'miss';
          session.counts.miss++;
          flashFeedback('פספוס', 'err');
          updatePickingStrip(tgList);
        }
      }
    }, 12);
  }

  function handlePickingInput(dir, tIn, tgList, counts) {
    const W_PERFECT = 0.05, W_GOOD = 0.11, W_REG = 0.16;
    let best = null, bestDt = Infinity;
    for (const tg of tgList) {
      if (tg.status) continue;
      const dt = tIn - tg.t;
      if (Math.abs(dt) < Math.abs(bestDt)) { bestDt = dt; best = tg; }
    }
    if (!best || Math.abs(bestDt) > W_REG) { return; }

    if (best.dir !== dir) {
      best.status = 'wrong';
      counts.wrong++;
      flashFeedback(`כיוון הפוך! צריך ${best.dir === 'd' ? '↓' : '↑'}`, 'err');
      updatePickingStrip(tgList);
      return;
    }
    const adt = Math.abs(bestDt);
    if (adt <= W_PERFECT) {
      best.status = 'perfect'; counts.ok++;
      flashFeedback('מדויק! ' + (dir === 'd' ? '↓' : '↑'), 'ok');
    } else if (adt <= W_GOOD) {
      best.status = 'good'; counts.ok++;
      flashFeedback(bestDt < 0 ? 'קצת מוקדם' : 'קצת מאוחר', 'warn');
      if (bestDt < 0) counts.early++; else counts.late++;
    } else {
      best.status = 'late'; counts.ok++;
      flashFeedback(bestDt < 0 ? 'מוקדם מדי' : 'מאוחר מדי', 'err');
      if (bestDt < 0) counts.early++; else counts.late++;
    }
    if (typeof AudioEngine !== 'undefined') AudioEngine.strum(0, dir, best.accent);
    updatePickingStrip(tgList);
  }

  /* ---------- תרגיל גאמה ---------- */
  function runPitch(ex) {
    const targets = ex.targets;
    let idx = 0;
    let stablePc = null, stableCount = 0, lastReg = 0, lastPc = null;
    const buf = new Float32Array(micAnalyser.fftSize);
    session = { type: 'pitch', results: [], attempts: 0, idx: 0 };
    renderPitchUI(targets, idx);

    micTimer = setInterval(() => {
      if (!micAnalyser) return;
      micAnalyser.getFloatTimeDomainData(buf);
      const { freq, rms } = detectPitchLocal(buf, micCtx.sampleRate);
      updateVU(rms);
      if (idx >= targets.length) { finishSession(); return; }
      if (!freq) { stablePc = null; stableCount = 0; return; }

      const mf = freqToMidi(freq);
      const midi = Math.round(mf);
      const cents = (mf - midi) * 100;
      const pc = ((midi % 12) + 12) % 12;

      updateNeedle(cents, pc);

      if (pc === stablePc) stableCount++;
      else { stablePc = pc; stableCount = 1; }

      const now2 = performance.now();
      if (stableCount >= 3 && now2 - lastReg > 200 && pc !== lastPc) {
        lastReg = now2; lastPc = pc;
        session.attempts++;
        const expMidi = targets[idx].midi;
        const expPc = ((expMidi % 12) + 12) % 12;

        if (pc === expPc) {
          const absCents = Math.abs(cents);
          if (absCents < 25) {
            flashFeedback('✓ ' + targets[idx].label, 'ok');
            session.results.push({ label: targets[idx].label, ok: true, cents });
            idx++; session.idx = idx;
            if (idx < targets.length) renderPitchUI(targets, idx);
            else finishSession();
          } else {
            flashFeedback(cents > 0 ? `+${Math.round(cents)}¢ גבוה מדי` : `${Math.round(cents)}¢ נמוך`, 'warn');
          }
        } else {
          const noteNames = ['C','C#','D','D#','E','F','F#','G','G#','A','Bb','B'];
          flashFeedback(`${noteNames[pc]} — צריך ${targets[idx].label}`, 'err');
          session.results.push({ label: targets[idx].label, ok: false, got: noteNames[pc] });
        }
      }
    }, 30);
  }

  /* ---------- תרגיל טרמולו ---------- */
  function runTremolo(ex) {
    const duration = ex.duration * 1000;
    const startMs = performance.now();
    let onsets = [];
    let prevRms = 0, lastHit = 0;
    const buf = new Float32Array(micAnalyser.fftSize);
    session = { type: 'tremolo', onsets, startMs };
    renderTremoloUI(ex);

    micTimer = setInterval(() => {
      if (!micAnalyser) return;
      const elapsed = performance.now() - startMs;
      if (elapsed > duration + 500) { finishSession(); return; }

      micAnalyser.getFloatTimeDomainData(buf);
      let rms = 0;
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / buf.length);
      updateVU(rms);

      const ms = performance.now();
      if (rms > 0.03 && rms > prevRms * 1.55 && ms - lastHit > 60) {
        lastHit = ms;
        onsets.push(ms);
        // חשב קצב ב-2 שניות אחרונות
        const window2s = onsets.filter(t => ms - t < 2000);
        const rate = window2s.length / 2;
        updateTremoloRate(rate, ex.targetRate, elapsed / duration);

        if (rate < 3) flashFeedback(`${rate.toFixed(1)}/שניה — שחררו מתח`, 'warn');
        else if (rate < ex.targetRate) flashFeedback(`${rate.toFixed(1)}/שניה — המשיכו!`, 'info');
        else flashFeedback(`${rate.toFixed(1)}/שניה — מעולה!`, 'ok');
      }
      prevRms = rms * 0.65 + prevRms * 0.35;

      // עדכון פס זמן
      updateTremoloProgress(elapsed / duration);
    }, 12);
  }

  /* ---------- UI helpers ---------- */
  function setStatus(msg, cls) {
    const el = $('#sc-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'sc-status ' + (cls || '');
  }

  let feedbackTimer = null;
  function flashFeedback(msg, cls) {
    const el = $('#sc-feedback');
    if (!el) return;
    el.textContent = msg;
    el.className = 'sc-feedback ' + (cls || '');
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 1400);
  }

  function updateVU(rms) {
    const el = $('#sc-vu-fill');
    if (el) el.style.width = Math.min(100, rms * 500) + '%';
  }

  function updateNeedle(cents, pc) {
    const needle = $('#sc-needle');
    if (!needle) return;
    const clamped = Math.max(-50, Math.min(50, cents));
    needle.style.left = (50 + clamped) + '%';
    needle.classList.toggle('intune', Math.abs(cents) < 15);
  }

  function renderTuningUI(targets, idx) {
    const box = $('#sc-exercise-body');
    if (!box) return;
    const tg = targets[idx];
    box.innerHTML = `
      <div class="sc-target-row">
        <div class="sc-big-note">${tg.label}</div>
        <div class="sc-hint">${tg.hint}</div>
        <div class="sc-progress-chips">${targets.map((t,i) =>
          `<span class="sc-chip ${i < idx ? 'done' : i === idx ? 'current' : ''}">${t.label}</span>`
        ).join('')}</div>
      </div>`;
  }

  function renderPitchUI(targets, idx) {
    const box = $('#sc-exercise-body');
    if (!box) return;
    const tg = targets[idx];
    box.innerHTML = `
      <div class="sc-target-row">
        <div class="sc-big-note">${tg.label}</div>
        <div class="sc-hint">${tg.hint}</div>
        <div class="sc-chips-scroll">${targets.map((t,i) =>
          `<span class="sc-chip ${i < idx ? 'done' : i === idx ? 'current' : ''}">${t.label}</span>`
        ).join('')}</div>
      </div>`;
  }

  function renderPickingUI(ex, tgList) {
    const box = $('#sc-exercise-body');
    if (!box) return;
    const stripHtml = tgList.map((tg, i) =>
      `<span class="sc-stroke" id="sc-stroke-${i}" data-dir="${tg.dir}">${tg.dir === 'd' ? '↓' : '↑'}</span>`
    ).join('');
    box.innerHTML = `
      <div class="sc-picking-info">BPM: <b>${ex.bpm}</b> · שתיקת ספירה: 4 פעמות</div>
      <div class="sc-stroke-strip" dir="ltr">${stripHtml}</div>`;
  }

  function updatePickingStrip(tgList) {
    tgList.forEach((tg, i) => {
      const el = document.getElementById(`sc-stroke-${i}`);
      if (!el) return;
      el.className = 'sc-stroke' + (tg.status ? ' ' + tg.status : '');
    });
  }

  function renderTremoloUI(ex) {
    const box = $('#sc-exercise-body');
    if (!box) return;
    box.innerHTML = `
      <div class="sc-tremolo-display">
        <div class="sc-rate-big" id="sc-rate">0.0</div>
        <div class="sc-rate-label">פריטות/שניה</div>
        <div class="sc-rate-target">מטרה: ${ex.targetRate}+</div>
      </div>
      <div class="sc-tremolo-bar-wrap"><div class="sc-tremolo-bar" id="sc-trem-bar"></div></div>
      <div class="sc-time-bar-wrap"><div class="sc-time-bar" id="sc-time-bar" style="width:0%"></div></div>`;
  }

  function updateTremoloRate(rate, target, progress) {
    const el = document.getElementById('sc-rate');
    if (el) el.textContent = rate.toFixed(1);
    const bar = document.getElementById('sc-trem-bar');
    if (bar) {
      const pct = Math.min(100, (rate / target) * 100);
      bar.style.width = pct + '%';
      bar.style.background = pct >= 100 ? 'var(--ok,#27ae60)' : pct >= 60 ? 'var(--gold,#e3b341)' : 'var(--accent-red,#e74c3c)';
    }
  }

  function updateTremoloProgress(pct) {
    const el = document.getElementById('sc-time-bar');
    if (el) el.style.width = Math.min(100, pct * 100) + '%';
  }

  /* ---------- סיום תרגיל ---------- */
  function finishSession() {
    if (micTimer) { clearInterval(micTimer); micTimer = null; }

    const ex = currentEx;
    const btn = $('#sc-go');
    if (btn) { btn.textContent = '▶ התחל'; btn.dataset.running = ''; }

    const res = $('#sc-results');
    if (!res || !session) return;

    let html = '';

    if (session.type === 'tuning') {
      const ok = session.results.filter(r => r.ok).length;
      const total = ex.targets.length;
      const avg = session.results.length > 0 ? session.results.reduce((a, r) => a + Math.abs(r.cents), 0) / session.results.length : 0;
      const score = Math.round(ok / total * 100);
      if (typeof SkillStats !== 'undefined') SkillStats.recordScore('tuning', 'main', score);
      html = buildResultBox(score, [
        `מיתרים מכוונים: ${ok} מתוך ${total}`,
        avg > 0 ? `סטייה ממוצעת: ${avg.toFixed(0)}¢` : '',
        score === 100 ? '🏆 הכל מכוון — אפשר להתחיל לנגן!' : score >= 75 ? '⭐ טוב — כוונו גם את השאר' : '💪 כוונו קודם — בלי כיוון נכון אין תרגול!'
      ], ex.endTip);

    } else if (session.type === 'picking') {
      const c = session.counts;
      const total = session.targets.filter(t => t.dir !== '-').length;
      const score = total > 0 ? Math.round((c.ok / total) * 100) : 0;
      let advice = '';
      if (c.wrong > 2) advice = '⚠️ הרבה כיוונים הפוכים — שמרו: פעמה = ↓, בין פעמות = ↑';
      else if (c.early > c.late + 2) advice = '⚠️ מוקדם מדי — האיטו ותאמנו "איתם"';
      else if (c.late > c.early + 2) advice = '⚠️ מאוחר מדי — שחררו את היד ואל תחשבו יותר מדי';
      else if (score >= 85) advice = '🏆 פריטה נקייה ומדויקת — שלב הבא!';
      else advice = '⭐ מצב טוב — עוד כמה סבבים ויהיה אוטומטי';
      if (typeof SkillStats !== 'undefined') {
        SkillStats.recordScore('picking', 'timing', score);
        // כיוון: כל פספוס-כיוון נספר כ-fail, השאר כ-ok
        for (let i = 0; i < c.ok; i++) SkillStats.record('picking-dir', 'd', true);
        for (let i = 0; i < c.wrong; i++) SkillStats.record('picking-dir', 'u', false);
      }
      html = buildResultBox(score, [
        `מוצלח: ${c.ok} מתוך ${total} · פספוס: ${c.miss} · כיוון הפוך: ${c.wrong}`,
        c.early + c.late > 0 ? `מוקדם: ${c.early} · מאוחר: ${c.late}` : '',
        advice
      ], ex.endTip);

    } else if (session.type === 'pitch') {
      const ok = session.results.filter(r => r.ok).length;
      const total = ex.targets.length;
      const score = session.attempts > 0 ? Math.round(ok / Math.max(session.attempts, total) * 100) : 0;
      if (typeof SkillStats !== 'undefined') SkillStats.recordScore('scale', (ex.id||'').replace('-scale',''), score);
      const wrongNotes = session.results.filter(r => !r.ok);
      let advice = score >= 90 ? '🏆 סולם נקי מאוד!' : score >= 70 ? '⭐ טוב — שימו לב לתווים שטעיתם' : '💪 האיטו — נגנו צליל-צליל לאט מאוד';
      if (wrongNotes.length > 0) {
        const uniq = [...new Set(wrongNotes.map(r => r.label))];
        advice += `. תווים לתרגול: ${uniq.join(', ')}`;
      }
      html = buildResultBox(score, [
        `נכון: ${ok} מתוך ${total} · ניסיונות: ${session.attempts}`,
        advice
      ], ex.endTip);

    } else if (session.type === 'tremolo') {
      const onsets = session.onsets;
      const dur = (performance.now() - session.startMs) / 1000;
      const avgRate = dur > 0 ? onsets.length / dur : 0;
      // max rate in any 2-second window
      let maxRate = 0;
      for (let i = 0; i < onsets.length; i++) {
        const w = onsets.filter(t => t >= onsets[i] && t < onsets[i] + 2000);
        maxRate = Math.max(maxRate, w.length / 2);
      }
      const score = Math.min(100, Math.round((avgRate / ex.targetRate) * 100));
      if (typeof SkillStats !== 'undefined') SkillStats.recordScore('tremolo', 'main', score);
      html = buildResultBox(score, [
        `פריטות ממוצע: ${avgRate.toFixed(1)}/שניה · שיא: ${maxRate.toFixed(1)}/שניה`,
        avgRate < 3 ? '💪 עדיין לאט — זה נורמלי! תרגלו 5 דקות כל יום' :
        avgRate < ex.targetRate ? `⭐ ${avgRate.toFixed(1)}/שניה — ממשיכים להאיץ` :
        '🏆 טרמולו אמיתי! עכשיו עבדו על האחידות'
      ], ex.endTip);
    }

    res.innerHTML = html;
    res.style.display = 'block';
    session = null;
  }

  function buildResultBox(score, lines, tip) {
    const cls = score >= 85 ? 'gold' : score >= 65 ? 'good' : score >= 45 ? 'ok' : 'work';
    return `<div class="ls-results show ${cls}">
      <div class="ls-score">${score}%</div>
      ${lines.filter(Boolean).map(l => `<div class="ls-grade">${l}</div>`).join('')}
      ${tip ? `<div class="sc-tip">💡 ${tip}</div>` : ''}
      <button class="btn gold" id="sc-again">🔁 תרגלו שוב</button>
    </div>`;
  }

  /* ---------- הרצת תרגיל ---------- */
  async function startExercise() {
    const btn = $('#sc-go');
    if (btn && btn.dataset.running) {
      // עצירה
      if (micTimer) { clearInterval(micTimer); micTimer = null; }
      session = null;
      btn.textContent = '▶ התחל'; btn.dataset.running = '';
      setStatus('עצרתם. בחרו תרגיל ולחצו התחל.', '');
      return;
    }

    const ok = await enableMic();
    if (!ok) return;

    const res = $('#sc-results');
    if (res) res.style.display = 'none';

    if (btn) { btn.textContent = '⏹ עצור'; btn.dataset.running = '1'; }
    setStatus('מאזין... נגנו!', 'ok');

    if (currentEx.type === 'tuning') runTuning(currentEx);
    else if (currentEx.type === 'picking') runPicking(currentEx);
    else if (currentEx.type === 'pitch') runPitch(currentEx);
    else if (currentEx.type === 'tremolo') runTremolo(currentEx);
  }

  /* ---------- בחירת תרגיל ---------- */
  function selectExercise(ex) {
    currentEx = ex;
    if (micTimer) { clearInterval(micTimer); micTimer = null; }
    session = null;

    const app = $('#skills-app');
    if (!app) return;

    // Update active button
    app.querySelectorAll('.sc-ex-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.id === ex.id);
    });

    const panel = $('#sc-panel');
    if (!panel) return;

    panel.innerHTML = `
      <div class="sc-panel-header">
        <span class="sc-panel-icon">${ex.icon}</span>
        <div>
          <div class="sc-panel-name">${ex.name}</div>
          <div class="sc-panel-desc">${ex.desc}</div>
        </div>
      </div>
      <div class="sc-intro">${ex.intro}</div>

      <div class="sc-meter-row">
        <span class="sc-meter-label">🎤</span>
        <div class="sc-vu-wrap"><div class="sc-vu-fill" id="sc-vu-fill"></div></div>
        <div id="sc-feedback" class="sc-feedback"></div>
      </div>

      ${ex.type === 'tuning' || ex.type === 'pitch' ? `
      <div class="sc-needle-wrap">
        <div class="sc-needle-track">
          <div class="sc-needle" id="sc-needle"></div>
          <div class="sc-needle-center"></div>
        </div>
        <div class="sc-needle-labels"><span>-50¢</span><span>0</span><span>+50¢</span></div>
      </div>` : ''}

      <div id="sc-exercise-body" class="sc-exercise-body"></div>
      <div id="sc-status" class="sc-status"></div>
      <button class="btn gold sc-go-btn" id="sc-go">▶ התחל</button>
      ${ex.type === 'pitch' ? `<button class="btn sc-preview-btn" id="sc-preview">🔊 שמעו את הסולם</button>` : ''}
      <div id="sc-results" style="display:none"></div>
    `;

    $('#sc-go').addEventListener('click', startExercise);
    if (ex.type === 'pitch') {
      $('#sc-preview').addEventListener('click', () => previewScale(ex));
    }

    // Setup results delegate
    panel.addEventListener('click', (e) => {
      if (e.target.id === 'sc-again') { startExercise(); }
    });
  }

  function previewScale(ex) {
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    ex.targets.forEach((t, i) => {
      AudioEngine.pluckMidi(t.midi, AudioEngine.ctx.currentTime + 0.05 + i * 0.35, 0.5);
    });
  }

  /* ---------- אתחול ---------- */
  function init() {
    const app = $('#skills-app');
    if (!app) return;

    app.innerHTML = `
      <div class="sc-layout">
        <div class="sc-sidebar">
          <div class="sc-sidebar-title">בחרו תרגיל</div>
          ${EXERCISES.map(ex => `
            <button class="sc-ex-btn" data-id="${ex.id}">
              <span class="sc-ex-icon">${ex.icon}</span>
              <span class="sc-ex-name">${ex.name}</span>
              <span class="sc-ex-type-badge">${typeBadge(ex.type)}</span>
            </button>`).join('')}
        </div>
        <div class="sc-main-panel" id="sc-panel">
          <div class="sc-empty-state">
            <div style="font-size:48px">💪</div>
            <h3>בחרו תרגיל מהרשימה</h3>
            <p>כל תרגיל מאזין לנגינה שלכם ונותן פידבק בזמן אמת</p>
            <p style="font-size:13px;color:var(--text-dim)">דרוש מיקרופון · עובד הכי טוב ב-Chrome</p>
          </div>
        </div>
      </div>
    `;

    app.querySelectorAll('.sc-ex-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const ex = EXERCISES.find(e => e.id === btn.dataset.id);
        if (ex) selectExercise(ex);
      });
    });

    injectStyles();
  }

  function typeBadge(type) {
    return { tuning: 'כיוון', picking: 'פריטה', pitch: 'גמא', tremolo: 'טרמולו' }[type] || type;
  }

  function stop() {
    if (micTimer) { clearInterval(micTimer); micTimer = null; }
    stopMic();
    session = null;
  }

  function injectStyles() {
    if (document.getElementById('sc-styles')) return;
    const s = document.createElement('style');
    s.id = 'sc-styles';
    s.textContent = `
      .sc-layout { display:flex; gap:16px; }
      .sc-sidebar { width:200px; flex-shrink:0; display:flex; flex-direction:column; gap:6px; }
      .sc-sidebar-title { font-size:12px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.05em; margin-bottom:4px; }
      .sc-ex-btn { display:flex; align-items:center; gap:8px; padding:10px 12px; border-radius:10px; border:1px solid var(--line,#333); background:var(--bg-card,#1a1a2e); color:var(--text,#eee); cursor:pointer; text-align:right; width:100%; transition:border-color .2s,background .2s; }
      .sc-ex-btn:hover,.sc-ex-btn.active { border-color:var(--gold,#e3b341); background:var(--bg-elev,#222); }
      .sc-ex-btn.active .sc-ex-name { color:var(--gold,#e3b341); }
      .sc-ex-icon { font-size:18px; flex-shrink:0; }
      .sc-ex-name { flex:1; font-size:13px; font-weight:600; }
      .sc-ex-type-badge { font-size:10px; background:var(--bg-elev,#222); border:1px solid var(--line,#333); border-radius:6px; padding:1px 6px; color:var(--text-dim,#999); }
      .sc-main-panel { flex:1; min-width:0; }
      .sc-empty-state { text-align:center; padding:40px 20px; color:var(--text-dim); }
      .sc-panel-header { display:flex; align-items:flex-start; gap:14px; margin-bottom:12px; }
      .sc-panel-icon { font-size:36px; }
      .sc-panel-name { font-size:18px; font-weight:700; color:var(--gold,#e3b341); }
      .sc-panel-desc { font-size:14px; color:var(--text-dim,#999); margin-top:2px; }
      .sc-intro { background:var(--bg-card,#1a1a2e); border-radius:10px; padding:10px 14px; font-size:13px; color:var(--text,#eee); border-right:3px solid var(--gold,#e3b341); margin-bottom:14px; }
      .sc-meter-row { display:flex; align-items:center; gap:10px; margin:10px 0; }
      .sc-meter-label { font-size:16px; }
      .sc-vu-wrap { flex:1; height:10px; background:var(--bg-elev,#222); border-radius:5px; overflow:hidden; }
      .sc-vu-fill { height:100%; width:0%; background:var(--gold,#e3b341); border-radius:5px; transition:width .05s; }
      .sc-feedback { min-width:140px; font-size:14px; font-weight:600; text-align:center; }
      .sc-feedback.ok { color:var(--ok,#27ae60); }
      .sc-feedback.warn { color:var(--gold,#e3b341); }
      .sc-feedback.err { color:var(--accent-red,#e74c3c); }
      .sc-feedback.info { color:var(--aegean,#4fb3d9); }
      .sc-needle-wrap { margin:8px 0 14px; }
      .sc-needle-track { position:relative; height:28px; background:var(--bg-elev,#222); border-radius:8px; overflow:hidden; }
      .sc-needle { position:absolute; top:4px; bottom:4px; width:3px; background:var(--text,#eee); border-radius:2px; left:50%; transform:translateX(-50%); transition:left .1s; }
      .sc-needle.intune { background:var(--ok,#27ae60); box-shadow:0 0 8px var(--ok,#27ae60); }
      .sc-needle-center { position:absolute; top:0; bottom:0; left:50%; width:1px; background:rgba(255,255,255,.15); }
      .sc-needle-labels { display:flex; justify-content:space-between; font-size:10px; color:var(--text-dim,#999); margin-top:2px; }
      .sc-exercise-body { margin:14px 0; }
      .sc-target-row { text-align:center; }
      .sc-big-note { font-size:56px; font-weight:900; color:var(--gold,#e3b341); line-height:1; }
      .sc-hint { font-size:14px; color:var(--text-dim,#999); margin:4px 0 12px; }
      .sc-progress-chips,.sc-chips-scroll { display:flex; flex-wrap:wrap; gap:6px; justify-content:center; }
      .sc-chip { padding:4px 10px; border-radius:8px; font-size:13px; background:var(--bg-elev,#222); color:var(--text-dim,#999); border:1px solid var(--line,#333); }
      .sc-chip.done { background:var(--ok,#27ae60); color:#fff; border-color:var(--ok,#27ae60); }
      .sc-chip.current { background:var(--gold,#e3b341); color:#111; border-color:var(--gold,#e3b341); font-weight:700; }
      .sc-picking-info { font-size:13px; color:var(--text-dim,#999); margin-bottom:8px; }
      .sc-stroke-strip { display:flex; flex-wrap:wrap; gap:4px; }
      .sc-stroke { width:30px; height:30px; display:flex; align-items:center; justify-content:center; border-radius:6px; font-size:16px; font-weight:700; background:var(--bg-elev,#222); color:var(--text,#eee); border:1px solid var(--line,#333); transition:background .2s; }
      .sc-stroke.perfect { background:var(--gold,#e3b341); color:#111; }
      .sc-stroke.good { background:var(--ok,#27ae60); color:#fff; }
      .sc-stroke.late { background:var(--aegean,#4fb3d9); color:#fff; }
      .sc-stroke.wrong { background:var(--accent-red,#e74c3c); color:#fff; }
      .sc-stroke.miss { background:#555; color:#888; }
      .sc-tremolo-display { text-align:center; margin:14px 0 8px; }
      .sc-rate-big { font-size:64px; font-weight:900; color:var(--gold,#e3b341); line-height:1; }
      .sc-rate-label { font-size:14px; color:var(--text-dim,#999); }
      .sc-rate-target { font-size:12px; color:var(--text-dim,#999); margin-top:4px; }
      .sc-tremolo-bar-wrap { height:12px; background:var(--bg-elev,#222); border-radius:6px; overflow:hidden; margin:8px 0 4px; }
      .sc-tremolo-bar { height:100%; width:0%; border-radius:6px; transition:width .3s,background .3s; }
      .sc-time-bar-wrap { height:4px; background:var(--bg-elev,#222); border-radius:2px; overflow:hidden; margin:4px 0 14px; }
      .sc-time-bar { height:100%; background:var(--text-dim,#555); border-radius:2px; transition:width .2s; }
      .sc-status { font-size:13px; margin:8px 0; min-height:20px; }
      .sc-status.ok { color:var(--ok,#27ae60); }
      .sc-status.err { color:var(--accent-red,#e74c3c); }
      .sc-go-btn { margin-top:10px; margin-left:8px; }
      .sc-preview-btn { margin-top:10px; }
      .sc-tip { font-size:13px; color:var(--text-dim,#999); margin-top:8px; }
      @media(max-width:600px){
        .sc-layout { flex-direction:column; }
        .sc-sidebar { width:100%; flex-direction:row; flex-wrap:wrap; }
        .sc-ex-btn { width:calc(50% - 3px); }
      }
    `;
    document.head.appendChild(s);
  }

  return { init, stop };
})();
