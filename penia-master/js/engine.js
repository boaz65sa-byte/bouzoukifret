/* מנוע המשחק — פריטה · מודוסים · אקורדים */
const Engine = (() => {
  const W_PERFECT = 0.05, W_GOOD = 0.11, W_REGISTER = 0.16;
  const LOOPS = 4, COUNT_IN = 4, PX_PER_BEAT = 155, HIT_X = 92;

  let level, bpm, gameType = 'pick', running = false, calibrating = false;
  let targets = [], beats = [], particles = [];
  let t0 = 0, endT = 0;
  let score = 0, combo = 0, maxCombo = 0;
  let counts = { perfect: 0, good: 0, miss: 0, wrong: 0, early: 0, late: 0 };
  let popups = [], scheduledClicks = [];
  let inputOffset = parseFloat(localStorage.getItem('penia-offset') || '0');
  let calibClicks = [], calibTaps = [], calibStart0 = 0;
  let canvas, cctx, dpr = 1, rafId = null, laneFlash = 0;
  let onHud = () => {}, onFinish = () => {};

  const actx = () => AudioEngine.ctx;
  const now = () => actx().currentTime;
  const yCenter = h => h * 0.5;

  function buildRound() {
    gameType = level.gameType || 'pick';
    const beat = 60 / bpm;
    const spb = gameType === 'pick' ? (level.stepsPerBeat || 1) : 1;
    const stepDur = beat / spb;
    targets = []; beats = []; particles = [];
    t0 = now() + 0.65;
    const playStart = t0 + COUNT_IN * beat;

    const sequence = [];
    if (gameType === 'pick') {
      for (let loop = 0; loop < LOOPS; loop++) level.strokes.forEach(s => sequence.push({ stroke: s }));
    } else if (gameType === 'note') {
      for (let loop = 0; loop < LOOPS; loop++) level.notes.forEach(n => sequence.push({ note: n }));
    } else {
      for (let loop = 0; loop < LOOPS; loop++) level.chordSeq.forEach(id => sequence.push({ chordId: id }));
    }

    let step = 0;
    for (const item of sequence) {
      if (gameType === 'pick' && item.stroke === '-') { step++; continue; }
      const tg = { t: playStart + step * stepDur, status: null, gameType };
      if (gameType === 'pick') {
        tg.dir = item.stroke.toLowerCase();
        tg.accent = item.stroke === 'D' || item.stroke === 'U';
      } else if (gameType === 'note') {
        tg.note = item.note;
        tg.label = item.note.label || item.note.solfege;
        tg.midi = item.note.midi;
      } else {
        tg.chordId = item.chordId;
        tg.label = item.chordId;
        const ch = IRON_7.find(c => c.id === item.chordId);
        tg.he = ch?.he || '';
      }
      targets.push(tg);
      step++;
    }
    endT = playStart + step * stepDur;

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

  function findBestTarget(tIn) {
    let best = null, bestDt = Infinity;
    for (const tg of targets) {
      if (tg.status) continue;
      const dt = tIn - tg.t;
      if (Math.abs(dt) < Math.abs(bestDt)) { bestDt = dt; best = tg; }
    }
    return { best, bestDt };
  }

  function scoreHit(best, bestDt, yHit, ok, wrongMsg, sfxDir) {
    const w = canvas.clientWidth;
    if (!best || Math.abs(bestDt) > W_REGISTER) {
      addPopup('מוקדם מדי...', '#7d92a8'); return;
    }
    if (!ok) {
      best.status = 'wrong'; counts.wrong++; combo = 0;
      addPopup(wrongMsg, '#d96459');
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
      if (bestDt < 0) counts.early++; else counts.late++;
      score += 50 * (1 + Math.min(2, Math.floor(combo / 8) * 0.5));
      label = bestDt < 0 ? 'טוב (מוקדם)' : 'טוב (מאוחר)'; color = '#5fc88f';
    } else {
      best.status = 'good'; counts.good++; combo = 0; score += 20;
      if (bestDt < 0) counts.early++; else counts.late++;
      label = bestDt < 0 ? 'מוקדם' : 'מאוחר'; color = '#4fb3d9';
    }
    maxCombo = Math.max(maxCombo, combo);
    addPopup(label, color);
    spawnParticles(HIT_X, yHit, color);
    laneFlash = performance.now();
    if (gameType === 'pick') AudioEngine.strum(0, sfxDir, best.accent);
    else AudioEngine.strum(0, 'd', false);
    onHud({ score, combo, maxCombo });
  }

  function handleInput(dir) {
    if (calibrating) { calibTaps.push(now()); laneFlash = performance.now(); return; }
    if (!running || gameType !== 'pick') return;
    const h = canvas.clientHeight;
    const { best, bestDt } = findBestTarget(now() + inputOffset);
    scoreHit(best, bestDt, dir === 'u' ? h * 0.28 : h * 0.72, best?.dir === dir, 'כיוון הפוך!', dir);
  }

  function handleNoteHit(freq) {
    if (calibrating || !running || gameType !== 'note') return;
    const h = canvas.clientHeight;
    const { best, bestDt } = findBestTarget(now() + inputOffset);
    const ok = best && matchNote(best.note, freq);
    scoreHit(best, bestDt, yCenter(h), ok, 'צליל לא נכון!', 'd');
  }

  function handleChordHit(freq) {
    if (calibrating || !running || gameType !== 'chord') return;
    const h = canvas.clientHeight;
    const { best, bestDt } = findBestTarget(now() + inputOffset);
    const ok = best && matchChordId(best.chordId, freq);
    scoreHit(best, bestDt, yCenter(h), ok, 'אקורד לא נכון!', 'd');
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

  function drawNoteBubble(x, y, tg) {
    const w = 52, ht = 36;
    let color = '#4fb3d9';
    let alpha = 1;
    if (tg.status === 'perfect' || tg.status === 'good') alpha = 0.15;
    else if (tg.status === 'wrong' || tg.status === 'miss') color = '#d96459';
    cctx.save();
    cctx.globalAlpha = alpha;
    cctx.shadowColor = color; cctx.shadowBlur = tg.status ? 0 : 12;
    cctx.fillStyle = color + '33';
    cctx.strokeStyle = color;
    cctx.lineWidth = 2;
    cctx.beginPath();
    cctx.roundRect(x - w / 2, y - ht / 2, w, ht, 8);
    cctx.fill(); cctx.stroke();
    cctx.fillStyle = '#f0cc74';
    cctx.font = '900 20px Heebo, sans-serif';
    cctx.textAlign = 'center';
    cctx.textBaseline = 'middle';
    cctx.fillText(tg.label, x, y - 2);
    cctx.fillStyle = '#8fa6bc';
    cctx.font = '600 10px Heebo, sans-serif';
    cctx.fillText('סריג ' + tg.note.fret, x, y + 12);
    cctx.restore();
  }

  function drawChordBubble(x, y, tg) {
    const w = 64, ht = 44;
    let color = '#e3b341';
    let alpha = 1;
    if (tg.status === 'perfect' || tg.status === 'good') alpha = 0.15;
    else if (tg.status === 'wrong' || tg.status === 'miss') color = '#d96459';
    cctx.save();
    cctx.globalAlpha = alpha;
    cctx.shadowColor = color; cctx.shadowBlur = tg.status ? 0 : 14;
    cctx.fillStyle = color + '28';
    cctx.strokeStyle = color;
    cctx.lineWidth = 2.5;
    cctx.beginPath();
    cctx.roundRect(x - w / 2, y - ht / 2, w, ht, 10);
    cctx.fill(); cctx.stroke();
    cctx.fillStyle = '#f0cc74';
    cctx.font = '900 22px Heebo, sans-serif';
    cctx.textAlign = 'center';
    cctx.textBaseline = 'middle';
    cctx.fillText(tg.label, x, y - 4);
    if (tg.he) {
      cctx.fillStyle = '#8fa6bc';
      cctx.font = '600 11px Heebo, sans-serif';
      cctx.fillText(tg.he, x, y + 14);
    }
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

    cctx.fillStyle = '#060b12';
    cctx.fillRect(0, 0, w, h);

    if (gameType === 'pick') {
      const gUp = cctx.createLinearGradient(0, 0, w, h * 0.5);
      gUp.addColorStop(0, 'rgba(36,72,110,0.45)'); gUp.addColorStop(1, 'rgba(12,24,38,0.12)');
      cctx.fillStyle = gUp; cctx.fillRect(0, 0, w, h / 2);
      const gDn = cctx.createLinearGradient(0, h * 0.5, w, h);
      gDn.addColorStop(0, 'rgba(60,45,18,0.25)'); gDn.addColorStop(1, 'rgba(28,20,8,0.55)');
      cctx.fillStyle = gDn; cctx.fillRect(0, h / 2, w, h / 2);
    } else if (gameType === 'note') {
      const g = cctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'rgba(30,60,90,0.5)'); g.addColorStop(1, 'rgba(12,20,32,0.8)');
      cctx.fillStyle = g; cctx.fillRect(0, 0, w, h);
      /* חמשה קווים — סטאף מיני */
      cctx.strokeStyle = 'rgba(255,255,255,0.08)';
      for (let i = -2; i <= 2; i++) {
        const ly = yCenter(h) + i * 8;
        cctx.beginPath(); cctx.moveTo(0, ly); cctx.lineTo(w, ly); cctx.stroke();
      }
    } else {
      const g = cctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, 'rgba(50,40,15,0.45)'); g.addColorStop(1, 'rgba(15,25,40,0.85)');
      cctx.fillStyle = g; cctx.fillRect(0, 0, w, h);
    }

    for (let i = 0; i < 16; i++) {
      const sx = (Math.sin(i * 2.1 + tNow * 0.3) * 0.5 + 0.5) * w;
      const sy = (Math.cos(i * 1.7 + tNow * 0.2) * 0.5 + 0.5) * h;
      cctx.fillStyle = `rgba(227,179,65,${0.04 + (i % 3) * 0.02})`;
      cctx.beginPath(); cctx.arc(sx, sy, 2, 0, Math.PI * 2); cctx.fill();
    }

    if (gameType === 'pick') {
      cctx.strokeStyle = 'rgba(255,255,255,0.08)';
      cctx.beginPath(); cctx.moveTo(0, h / 2); cctx.lineTo(w, h / 2); cctx.stroke();
    }

    if (performance.now() - laneFlash < 100) {
      cctx.fillStyle = 'rgba(227,179,65,0.15)'; cctx.fillRect(0, 0, w, h);
    }

    if (calibrating) {
      drawCalibOverlay(w, h, tNow, beat, calibStart0);
      rafId = requestAnimationFrame(drawFrame);
      return;
    }

    cctx.strokeStyle = 'rgba(157,178,199,0.12)';
    for (const bt of beats) {
      const x = HIT_X + (bt - tNow) * pxPerSec;
      if (x < -5 || x > w + 5) continue;
      cctx.beginPath(); cctx.moveTo(x, 0); cctx.lineTo(x, h); cctx.stroke();
    }

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
    cctx.shadowColor = '#e3b341'; cctx.shadowBlur = 12 + pulse * 14;
    cctx.strokeStyle = `rgba(240,204,116,${0.75 + pulse * 0.25})`;
    cctx.lineWidth = 5;
    cctx.beginPath(); cctx.moveTo(HIT_X, 0); cctx.lineTo(HIT_X, h); cctx.stroke();
    cctx.shadowBlur = 0; cctx.lineWidth = 1;

    if (gameType === 'pick') {
      [[h * 0.28, '#4fb3d9'], [h * 0.72, '#e3b341']].forEach(([cy, col]) => {
        cctx.strokeStyle = col + '66';
        cctx.lineWidth = 2;
        cctx.beginPath(); cctx.arc(HIT_X, cy, 22, 0, Math.PI * 2); cctx.stroke();
      });
    } else {
      cctx.strokeStyle = '#e3b34166';
      cctx.lineWidth = 2;
      cctx.beginPath(); cctx.arc(HIT_X, yCenter(h), 26, 0, Math.PI * 2); cctx.stroke();
    }

    if (running && tNow < t0 + COUNT_IN * beat) {
      const n = Math.ceil((t0 + COUNT_IN * beat - tNow) / beat);
      cctx.fillStyle = '#f0cc74';
      cctx.font = '900 52px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.fillText(n, w / 2, h / 2 + 18);
    }

    for (const tg of targets) {
      const x = HIT_X + (tg.t - tNow) * pxPerSec;
      if (x < -60 || x > w + 60) continue;
      if (gameType === 'pick') {
        const y = tg.dir === 'u' ? h * 0.28 : h * 0.72;
        const size = tg.accent ? 24 : 17;
        let color = tg.dir === 'u' ? '#4fb3d9' : '#e3b341';
        let alpha = 1;
        if (tg.status === 'perfect' || tg.status === 'good') alpha = 0.15;
        else if (tg.status === 'wrong' || tg.status === 'miss') color = '#d96459';
        drawArrow(x, y, tg.dir, size, color, tg.accent && !tg.status, alpha);
        if (!tg.status && x > HIT_X) {
          cctx.strokeStyle = color + '44';
          cctx.lineWidth = 3;
          cctx.beginPath(); cctx.moveTo(x - 18, y); cctx.lineTo(x - 4, y); cctx.stroke();
        }
      } else if (gameType === 'note') {
        drawNoteBubble(x, yCenter(h), tg);
      } else {
        drawChordBubble(x, yCenter(h), tg);
      }
    }

    if (running) {
      for (const tg of targets) {
        if (!tg.status && tNow - tg.t > W_REGISTER) {
          tg.status = 'miss'; counts.miss++; combo = 0;
          addPopup('פספוס', '#d96459');
          onHud({ score, combo });
        }
      }
    }

    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.life -= 0.04;
      cctx.globalAlpha = p.life;
      cctx.fillStyle = p.color;
      cctx.beginPath(); cctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); cctx.fill();
      cctx.globalAlpha = 1;
    });

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
    onFinish({ score, stars, acc, counts, maxCombo, level, bpm, gameType });
  }

  function start(lv, bpmVal, canvasEl, hudCb, finishCb) {
    calibrating = false;
    level = lv; bpm = bpmVal;
    gameType = lv.gameType || 'pick';
    onHud = hudCb; onFinish = finishCb;
    score = 0; combo = 0; maxCombo = 0;
    counts = { perfect: 0, good: 0, miss: 0, wrong: 0, early: 0, late: 0 };
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
      if (gameType === 'pick') {
        if (e.code === 'ArrowDown' || e.code === 'KeyJ') { e.preventDefault(); handleInput('d'); }
        else if (e.code === 'ArrowUp' || e.code === 'KeyK') { e.preventDefault(); handleInput('u'); }
      }
    });
    canvasEl.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (gameType === 'pick') {
        const r = canvasEl.getBoundingClientRect();
        handleInput(e.clientY - r.top < r.height / 2 ? 'u' : 'd');
      }
    });
  }

  function resize(canvasEl) {
    if (canvasEl) setupCanvas(canvasEl);
  }

  function getGameType() { return gameType; }

  return { start, stop, calibrate, bindInput, handleInput, handleNoteHit, handleChordHit, resize, getGameType };
})();
