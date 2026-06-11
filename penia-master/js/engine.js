/* מנוע המשחק + רינדור גרפי משופר */
const Engine = (() => {
  const W_PERFECT = 0.05, W_GOOD = 0.11, W_REGISTER = 0.16;
  const LOOPS = 4, COUNT_IN = 4, PX_PER_BEAT = 155, HIT_X = 92;

  let level, bpm, running = false, calibrating = false;
  let targets = [], beats = [], particles = [];
  let t0 = 0, endT = 0;
  let score = 0, combo = 0, maxCombo = 0;
  let counts = { perfect: 0, good: 0, miss: 0, wrong: 0 };
  let popups = [], scheduledClicks = [];
  let inputOffset = parseFloat(localStorage.getItem('penia-offset') || '0');
  let calibClicks = [], calibTaps = [], calibStart0 = 0;
  let canvas, cctx, dpr = 1, rafId = null, laneFlash = 0;
  let onHud = () => {}, onFinish = () => {};

  const actx = () => AudioEngine.ctx;
  const now = () => actx().currentTime;

  function buildRound() {
    const beat = 60 / bpm, stepDur = beat / level.stepsPerBeat;
    targets = []; beats = []; particles = [];
    t0 = now() + 0.65;
    const playStart = t0 + COUNT_IN * beat;
    const totalSteps = level.strokes.length * LOOPS;
    for (let s = 0; s < totalSteps; s++) {
      const stroke = level.strokes[s % level.strokes.length];
      if (stroke === '-') continue;
      targets.push({ t: playStart + s * stepDur, dir: stroke.toLowerCase(), accent: stroke === 'D' || stroke === 'U', status: null });
    }
    endT = playStart + totalSteps * stepDur;
    scheduledClicks = [];
    const totalBeats = Math.ceil((endT - t0) / beat);
    for (let b = 0; b <= totalBeats; b++) {
      const t = t0 + b * beat;
      scheduledClicks.push(AudioEngine.click(t, b % COUNT_IN === 0));
      if (t <= endT + 0.01) beats.push(t);
    }
  }

  function spawnParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
      particles.push({
        x, y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4 - 1,
        life: 1, color, size: 2 + Math.random() * 3
      });
    }
  }

  function handleInput(dir) {
    if (calibrating) { calibTaps.push(now()); laneFlash = performance.now(); return; }
    if (!running) return;
    const tIn = now() + inputOffset;
    let best = null, bestDt = Infinity;
    for (const tg of targets) {
      if (tg.status) continue;
      const dt = tIn - tg.t;
      if (Math.abs(dt) < Math.abs(bestDt)) { bestDt = dt; best = tg; }
    }
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const yHit = dir === 'u' ? h * 0.28 : h * 0.72;

    if (!best || Math.abs(bestDt) > W_REGISTER) {
      addPopup('מוקדם מדי...', '#7d92a8'); return;
    }
    if (best.dir !== dir) {
      best.status = 'wrong'; counts.wrong++; combo = 0;
      addPopup('כיוון הפוך!', '#d96459');
      spawnParticles(HIT_X, yHit, '#d96459');
      onHud({ score, combo }); return;
    }
    const adt = Math.abs(bestDt);
    let label, color;
    if (adt <= W_PERFECT) {
      best.status = 'perfect'; counts.perfect++; combo++;
      score += 100 * (1 + Math.min(2, Math.floor(combo / 8) * 0.5));
      label = 'מושלם!'; color = '#e3b341';
    } else if (adt <= W_GOOD) {
      best.status = 'good'; counts.good++; combo++;
      score += 50 * (1 + Math.min(2, Math.floor(combo / 8) * 0.5));
      label = bestDt < 0 ? 'טוב (מוקדם)' : 'טוב (מאוחר)'; color = '#5fc88f';
    } else {
      best.status = 'good'; counts.good++; combo = 0; score += 20;
      label = bestDt < 0 ? 'מוקדם' : 'מאוחר'; color = '#4fb3d9';
    }
    maxCombo = Math.max(maxCombo, combo);
    addPopup(label, color);
    spawnParticles(HIT_X, yHit, color);
    laneFlash = performance.now();
    AudioEngine.strum(0, dir, best.accent);
    onHud({ score, combo, maxCombo });
  }

  function addPopup(text, color) {
    popups.push({ text, color, born: performance.now() });
    if (popups.length > 4) popups.shift();
  }

  function setupCanvas(el) {
    canvas = el;
    dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    cctx = canvas.getContext('2d');
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawArrow(x, y, dir, size, color, glow, alpha) {
    cctx.save();
    cctx.globalAlpha = alpha;
    if (glow) { cctx.shadowColor = color; cctx.shadowBlur = 18; }
    cctx.fillStyle = color;
    const s = size, h = s * 0.62;
    cctx.beginPath();
    if (dir === 'd') {
      cctx.moveTo(x - h, y - s * 0.45); cctx.lineTo(x + h, y - s * 0.45); cctx.lineTo(x, y + s * 0.7);
    } else {
      cctx.moveTo(x - h, y + s * 0.45); cctx.lineTo(x + h, y + s * 0.45); cctx.lineTo(x, y - s * 0.7);
    }
    cctx.closePath(); cctx.fill();
    cctx.restore();
  }

  function drawCalibOverlay(w, h, tNow, beat, start0) {
    cctx.fillStyle = 'rgba(8,15,24,0.55)';
    cctx.fillRect(0, 0, w, h);
    cctx.fillStyle = '#f0cc74';
    cctx.font = '800 18px Heebo, sans-serif';
    cctx.textAlign = 'center';
    cctx.fillText('כיול תזמון — לא מיקרופון!', w / 2, h * 0.18);
    cctx.fillStyle = '#8fa6bc';
    cctx.font = '600 14px Heebo, sans-serif';
    cctx.fillText('הקישו ↓ או ↑ (או על המסך) עם כל קליק', w / 2, h * 0.28);
    cctx.fillText('אפשר לפרט על מיתר מושתק — המשחק שומע רק הקשות', w / 2, h * 0.38);

    const calibBeat = 60 / 90;
    const idx = Math.floor((tNow - start0) / calibBeat);
    const phase = ((tNow - start0) / calibBeat) % 1;
    const pulse = 0.55 + 0.45 * Math.sin(phase * Math.PI);
    const cy = h * 0.62;
    cctx.strokeStyle = `rgba(227,179,65,${0.35 + pulse * 0.45})`;
    cctx.lineWidth = 3 + pulse * 2;
    cctx.beginPath();
    cctx.arc(HIT_X, cy, 26 + pulse * 10, 0, Math.PI * 2);
    cctx.stroke();
    cctx.fillStyle = '#e3b341';
    cctx.font = '900 28px Heebo, sans-serif';
    cctx.fillText(String(Math.min(8, Math.max(1, idx + 1))), w / 2, cy + 10);
    cctx.fillStyle = '#4fb3d9';
    cctx.font = '700 13px Heebo, sans-serif';
    cctx.fillText(`${calibTaps.length} / 8 הקשות`, w / 2, h * 0.82);
  }

  function drawFrame() {
    if (!running && !calibrating) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const tNow = now(), beat = 60 / bpm, pxPerSec = PX_PER_BEAT / beat;

    /* רקע מסלול */
    const gUp = cctx.createLinearGradient(0, 0, 0, h / 2);
    gUp.addColorStop(0, 'rgba(26,55,82,0.9)'); gUp.addColorStop(1, 'rgba(15,31,48,0.6)');
    cctx.fillStyle = gUp; cctx.fillRect(0, 0, w, h / 2);
    const gDn = cctx.createLinearGradient(0, h / 2, 0, h);
    gDn.addColorStop(0, 'rgba(48,38,18,0.5)'); gDn.addColorStop(1, 'rgba(32,24,10,0.85)');
    cctx.fillStyle = gDn; cctx.fillRect(0, h / 2, w, h / 2);

    /* מאיאנדר דקorative top */
    cctx.strokeStyle = 'rgba(227,179,65,0.12)'; cctx.lineWidth = 2;
    for (let i = 0; i < w; i += 28) {
      cctx.strokeRect(i, 4, 14, 6);
    }

    cctx.strokeStyle = 'rgba(255,255,255,0.08)';
    cctx.beginPath(); cctx.moveTo(0, h / 2); cctx.lineTo(w, h / 2); cctx.stroke();

    if (performance.now() - laneFlash < 100) {
      cctx.fillStyle = 'rgba(227,179,65,0.15)'; cctx.fillRect(0, 0, w, h);
    }

    if (calibrating) {
      drawCalibOverlay(w, h, tNow, beat, calibStart0);
      rafId = requestAnimationFrame(drawFrame);
      return;
    }

    /* קווי פעמה */
    cctx.strokeStyle = 'rgba(157,178,199,0.12)';
    for (const bt of beats) {
      const x = HIT_X + (bt - tNow) * pxPerSec;
      if (x < -5 || x > w + 5) continue;
      cctx.beginPath(); cctx.moveTo(x, 0); cctx.lineTo(x, h); cctx.stroke();
    }

    /* קו פגיעה + זוהר */
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
    cctx.shadowColor = '#e3b341'; cctx.shadowBlur = 8 + pulse * 8;
    cctx.strokeStyle = `rgba(240,204,116,${0.7 + pulse * 0.3})`;
    cctx.lineWidth = 4;
    cctx.beginPath(); cctx.moveTo(HIT_X, 0); cctx.lineTo(HIT_X, h); cctx.stroke();
    cctx.shadowBlur = 0; cctx.lineWidth = 1;

    /* מטרות */
    [[h * 0.28, '#4fb3d9'], [h * 0.72, '#e3b341']].forEach(([cy, col]) => {
      cctx.strokeStyle = col + '66';
      cctx.lineWidth = 2;
      cctx.beginPath(); cctx.arc(HIT_X, cy, 22, 0, Math.PI * 2); cctx.stroke();
    });

    /* ספירה לאחור */
    if (running && tNow < t0 + COUNT_IN * beat) {
      const n = Math.ceil((t0 + COUNT_IN * beat - tNow) / beat);
      cctx.fillStyle = '#f0cc74';
      cctx.font = '900 52px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.fillText(n, w / 2, h / 2 + 18);
    }

    /* חיצים */
    for (const tg of targets) {
      const x = HIT_X + (tg.t - tNow) * pxPerSec;
      if (x < -40 || x > w + 40) continue;
      const y = tg.dir === 'u' ? h * 0.28 : h * 0.72;
      const size = tg.accent ? 24 : 17;
      let color = tg.dir === 'u' ? '#4fb3d9' : '#e3b341';
      let alpha = 1;
      if (tg.status === 'perfect' || tg.status === 'good') alpha = 0.15;
      else if (tg.status === 'wrong' || tg.status === 'miss') color = '#d96459';
      drawArrow(x, y, tg.dir, size, color, tg.accent && !tg.status, alpha);
      /* שובל */
      if (!tg.status && x > HIT_X) {
        cctx.strokeStyle = color + '44';
        cctx.lineWidth = 3;
        cctx.beginPath(); cctx.moveTo(x - 18, y); cctx.lineTo(x - 4, y); cctx.stroke();
      }
    }

    /* פספוסים */
    if (running) {
      for (const tg of targets) {
        if (!tg.status && tNow - tg.t > W_REGISTER) {
          tg.status = 'miss'; counts.miss++; combo = 0;
          addPopup('פספוס', '#d96459');
          onHud({ score, combo });
        }
      }
    }

    /* חלקיקים */
    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 0.04;
      cctx.globalAlpha = p.life;
      cctx.fillStyle = p.color;
      cctx.beginPath(); cctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); cctx.fill();
      cctx.globalAlpha = 1;
    });

    /* פופ-אפים */
    const pNow = performance.now();
    popups = popups.filter(p => pNow - p.born < 750);
    popups.forEach(p => {
      const age = (pNow - p.born) / 750;
      cctx.globalAlpha = 1 - age;
      cctx.fillStyle = p.color;
      cctx.font = '800 22px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.fillText(p.text, w / 2, h * 0.45 - age * 30);
      cctx.globalAlpha = 1;
    });

    if (running && tNow > endT + 0.5) { finish(); return; }
    rafId = requestAnimationFrame(drawFrame);
  }

  function finish() {
    running = false;
    cancelAnimationFrame(rafId);
    const total = targets.length;
    const weighted = counts.perfect + counts.good * 0.6;
    const acc = total ? weighted / total : 0;
    const stars = acc >= 0.92 && counts.wrong === 0 ? 3 : acc >= 0.75 ? 2 : acc >= 0.55 ? 1 : 0;
    if (stars >= 2) AudioEngine.fanfare();
    onFinish({ score, stars, acc, counts, maxCombo, level, bpm });
  }

  function start(lv, bpmVal, canvasEl, hudCb, finishCb) {
    calibrating = false;
    level = lv; bpm = bpmVal;
    onHud = hudCb; onFinish = finishCb;
    score = 0; combo = 0; maxCombo = 0;
    counts = { perfect: 0, good: 0, miss: 0, wrong: 0 };
    popups = [];
    AudioEngine.ensureCtx();
    setupCanvas(canvasEl);
    buildRound();
    running = true;
    onHud({ score: 0, combo: 0 });
    cancelAnimationFrame(rafId);
    drawFrame();
  }

  function stop() {
    running = false; calibrating = false;
    cancelAnimationFrame(rafId);
    scheduledClicks.forEach(o => { try { o.stop(); } catch (e) { /* */ } });
    scheduledClicks = [];
    if (cctx && canvas) cctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  }

  function calibrate(canvasEl, onDone, onProgress) {
    AudioEngine.ensureCtx();
    if (calibrating) return;
    running = false;
    calibrating = true; calibClicks = []; calibTaps = [];
    setupCanvas(canvasEl);
    calibStart0 = now() + 0.8;
    const beat = 60 / 90;
    for (let i = 0; i < 8; i++) {
      const t = calibStart0 + i * beat;
      AudioEngine.click(t, true);
      calibClicks.push(t);
    }
    onProgress?.('הקישו ↓↑ עם כל קליק (8 פעמים)…');
    cancelAnimationFrame(rafId);
    drawFrame();
    setTimeout(() => {
      calibrating = false;
      cancelAnimationFrame(rafId);
      const diffs = [];
      calibTaps.forEach(tap => {
        let best = Infinity;
        calibClicks.forEach(c => { if (Math.abs(tap - c) < Math.abs(best)) best = tap - c; });
        if (Math.abs(best) < 0.25) diffs.push(best);
      });
      if (diffs.length >= 4) {
        diffs.sort((a, b) => a - b);
        inputOffset = -diffs[Math.floor(diffs.length / 2)];
        localStorage.setItem('penia-offset', String(inputOffset));
        onDone(`כיול הושלם: ${(inputOffset * -1000).toFixed(0)}ms ✓ — לחצו ▶ שחק`, true);
      } else {
        onDone(`נקלטו ${calibTaps.length}/8 הקשות — הקישו ↓↑ עם הקליקים (לא מיקרופון)`, false);
      }
    }, (0.8 + 8 * beat + 0.5) * 1000);
  }

  function bindInput(canvasEl) {
    document.addEventListener('keydown', e => {
      if (!running && !calibrating) return;
      if (e.repeat) return;
      if (e.code === 'ArrowDown' || e.code === 'KeyJ') { e.preventDefault(); handleInput('d'); }
      else if (e.code === 'ArrowUp' || e.code === 'KeyK') { e.preventDefault(); handleInput('u'); }
    });
    canvasEl.addEventListener('pointerdown', e => {
      e.preventDefault();
      const r = canvasEl.getBoundingClientRect();
      handleInput(e.clientY - r.top < r.height / 2 ? 'u' : 'd');
    });
  }

  function resize(canvasEl) {
    if (canvasEl) setupCanvas(canvasEl);
  }

  return { start, stop, calibrate, bindInput, handleInput, resize };
})();
