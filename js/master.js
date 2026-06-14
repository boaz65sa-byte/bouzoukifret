/* ============================================================
   מאסטר מודוסים + מאסטר אקורדים
   משחקי לימוד אינטראקטיביים עם גריף 8 מיתרים והאזנה למיקרופון
   ============================================================ */
'use strict';

/* === אקורדים — ספריית ChordLibrary (js/chord-library.js) === */

/* ============================================================
   Shared: Mic Engine — שימוש חוזר בין המשחקים
   ============================================================ */
const MicEngine = (() => {
  let stream = null, ctx = null, analyser = null, timer = null;
  let onPitch = null;

  async function start(callback) {
    onPitch = callback;
    if (stream) return true;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      src.connect(analyser);
      timer = setInterval(poll, 25);
      return true;
    } catch (e) { return false; }
  }

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
    if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
    if (ctx) { ctx.close(); ctx = null; }
    analyser = null; onPitch = null;
  }

  function poll() {
    if (!analyser || !onPitch) return;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const { freq, rms } = Listen.detectPitch(buf, ctx.sampleRate);
    if (!freq) { onPitch(null, 0); return; }
    const mf = 69 + 12 * Math.log2(freq / 440);
    const midi = Math.round(mf);
    const pc = ((midi % 12) + 12) % 12;
    const cents = Math.round((mf - midi) * 100);
    onPitch({ pc, midi, freq, cents, name: NOTE_NAMES[pc] }, rms);
  }

  return { start, stop };
})();

/* ============================================================
   מאסטר מודוסים
   ============================================================ */
const MasterModes = (() => {
  let running = false, dromos = null, rootPc = 2;
  let scaleNotes = [], idx = 0, heroMode = false;
  let stats = { correct: 0, wrong: 0, streak: 0, best: 0 };
  let stablePc = null, stableCount = 0, armed = true, quietFrames = 0, lastReg = 0;

  // Flow / full-scale streaming game
  let heroCanvas, heroCtx, heroRaf = null;
  let flowNotes = [], flowSpawnIdx = 0, flowStartMs = 0;
  let flowBpm = 80, flowBeatMs = 750, flowLookaheadSec = 2.6;
  let flowTotalToSpawn = 0, flowMetBeat = 0, flowLastMetMs = 0;
  const FLOW_HIT_MS = 75, FLOW_PERFECT_MS = 35;
  let flowCanvasH = 220, flowHitY = 0;
  let flowPopups = [];

  const DIFF = {
    easy:   { stableNeeded: 2, speedMul: 0.85, label: 'קל' },
    medium: { stableNeeded: 3, speedMul: 1, label: 'בינוני' },
    hard:   { stableNeeded: 4, speedMul: 1.15, label: 'קשה' },
  };

  function buildScale() {
    const openPc = TUNING[0].midi % 12;
    const frets = [...dromos.intervals, 12];
    return frets.map(iv => {
      const fret = ((rootPc - openPc + iv) % 12 + 12) % 12;
      const midi = TUNING[0].midi + fret;
      const pc = (rootPc + iv) % 12;
      return {
        fret, midi, pc,
        name: NOTE_NAMES[pc],
        solfege: SOLFEGE[NOTE_NAMES[pc]],
      };
    });
  }

  function drawModeFretboard() {
    if (!dromos) return;
    const pcs = dromos.intervals.map(iv => (rootPc + iv) % 12);
    const target = !heroMode && scaleNotes[idx] ? scaleNotes[idx] : null;

    drawFretboard($('#fb-master-modes'), (ci, f, midi) => {
      const pc = midi % 12;
      if (!pcs.includes(pc)) return null;
      return { type: pc === rootPc ? 'root' : 'note', label: NOTE_NAMES[pc] };
    });

    if (target) {
      const svg = $('#fb-master-modes');
      svg.querySelectorAll('.fb-dot').forEach(dot => {
        dot.classList.remove('mm-target', 'mm-glow');
        if (parseInt(dot.dataset.course) === 0 && parseInt(dot.dataset.fret) === target.fret) {
          dot.classList.add('mm-target', 'mm-glow');
        }
      });
    }
  }

  function updateUI() {
    $('#mm-correct').textContent = stats.correct;
    $('#mm-wrong').textContent = stats.wrong;
    $('#mm-streak').textContent = stats.streak;
    const tot = stats.correct + stats.wrong;
    $('#mm-accuracy').textContent = tot > 0 ? Math.round(stats.correct / tot * 100) + '%' : '—';
    $('#mm-progress').textContent = heroMode
      ? `${stats.correct + stats.wrong} / ${flowTotalToSpawn}`
      : `${idx} / ${scaleNotes.length}`;

    const n = heroMode ? flowNotes.find(x => x.status === null && performance.now() <= x.hitMs + FLOW_HIT_MS) : scaleNotes[idx];
    if (n && !heroMode) {
      $('#mm-current-note').textContent = n.name;
      $('#mm-current-solfege').textContent = SOLFEGE[n.name];
      $('#mm-current-fret').textContent = 'סריג ' + n.fret + ' על מיתר D';
    } else if (heroMode && n) {
      $('#mm-current-note').textContent = n.name;
      $('#mm-current-solfege').textContent = n.solfege || SOLFEGE[n.name];
      $('#mm-current-fret').textContent = 'זרמו אל קו הפגיעה · סריג ' + n.fret;
    } else if (!n && !heroMode) {
      $('#mm-current-note').textContent = '—';
      $('#mm-current-solfege').textContent = '';
      $('#mm-current-fret').textContent = '';
    }
  }

  function flash(type) {
    const el = $('#mm-feedback');
    const map = {
      correct: ['✓ נכון!', 'correct'],
      wrong: ['✗ Miss', 'wrong'],
      perfect: ['★ Perfect!', 'perfect'],
      good: ['✓ Good', 'good'],
    };
    const [text, cls] = map[type] || map.wrong;
    el.textContent = text;
    el.className = 'mm-feedback ' + cls;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 650);
  }

  function advance(ok) {
    if (ok) {
      stats.correct++; stats.streak++; stats.best = Math.max(stats.best, stats.streak);
      flash('correct');
    } else {
      stats.wrong++; stats.streak = 0; flash('wrong');
    }
    updateUI();
    setTimeout(() => {
      idx++;
      if (idx >= scaleNotes.length) { finish(); return; }
      updateUI();
      drawModeFretboard();
      if (!heroMode) AudioEngine.pluckCourse(0, scaleNotes[idx].fret, 0, 0.5);
    }, 500);
  }

  function finish() {
    running = false; MicEngine.stop(); stopHero();
    const tot = stats.correct + stats.wrong;
    const pct = tot > 0 ? Math.round(stats.correct / tot * 100) : 0;
    let grade, cls;
    if (pct >= 90) { grade = '🏆 מאסטר! שליטה מלאה.'; cls = 'gold'; }
    else if (pct >= 70) { grade = '⭐ מצוין!'; cls = 'good'; }
    else if (pct >= 50) { grade = '👍 טוב — תרגלו שוב.'; cls = 'ok'; }
    else { grade = '💪 המשיכו!'; cls = 'work'; }
    const res = $('#mm-results');
    res.className = 'ls-results show ' + cls;
    res.innerHTML = `<div class="ls-score">${pct}%</div><div class="ls-grade">${grade}</div>
      <div class="ls-stats">${stats.correct} נכון · ${stats.wrong} שגוי · רצף: ${stats.best}</div>
      <button class="btn gold" id="mm-again">🔁 שחק שוב</button>`;
    $('#mm-again').addEventListener('click', () => { res.classList.remove('show'); start(); });
    $('#mm-start').textContent = '▶ שחק'; $('#mm-start').classList.remove('playing');
  }

  function flowPopup(label, kind, x, y) {
    const w = heroCanvas?.clientWidth || 400;
    flowPopups.push({
      text: label,
      kind,
      x: x ?? w * 0.5,
      y: y ?? flowHitY,
      t0: performance.now(),
    });
    if (flowPopups.length > 8) flowPopups.shift();
  }

  function noteCanvasX(fret, w) {
    return 40 + (fret / NUM_FRETS) * (w - 80);
  }

  function drawFlowPopups(now) {
    const colors = { perfect: '#f0cc74', good: '#5fc88f', miss: '#d96459' };
    flowPopups = flowPopups.filter(p => now - p.t0 < 900);
    flowPopups.forEach(p => {
      const age = (now - p.t0) / 900;
      const alpha = 1 - age;
      const y = p.y - age * 58;
      const scale = 0.82 + age * 0.28;
      heroCtx.save();
      heroCtx.globalAlpha = alpha;
      heroCtx.translate(p.x, y);
      heroCtx.scale(scale, scale);
      heroCtx.font = '900 26px Heebo, sans-serif';
      heroCtx.textAlign = 'center';
      heroCtx.textBaseline = 'middle';
      heroCtx.fillStyle = colors[p.kind] || '#fff';
      heroCtx.shadowColor = 'rgba(0,0,0,0.65)';
      heroCtx.shadowBlur = 10;
      heroCtx.fillText(p.text, 0, 0);
      heroCtx.restore();
    });
  }

  function registerFlowHit(note, deltaMs) {
    if (note.status) return;
    note.status = 'hit';
    stats.correct++;
    stats.streak++;
    stats.best = Math.max(stats.best, stats.streak);
    let kind, label;
    if (Math.abs(deltaMs) <= FLOW_PERFECT_MS) {
      kind = 'perfect'; label = 'Perfect!';
    } else {
      kind = 'good'; label = 'Good!';
    }
    const w = heroCanvas?.clientWidth || 400;
    flowPopup(label, kind, noteCanvasX(note.fret, w), flowHitY);
    flash(kind === 'perfect' ? 'perfect' : 'good');
    updateUI();
    checkFlowComplete();
  }

  function registerFlowMiss(note) {
    if (note.status) return;
    note.status = 'miss';
    stats.wrong++;
    stats.streak = 0;
    const w = heroCanvas?.clientWidth || 400;
    flowPopup('Miss', 'miss', noteCanvasX(note.fret, w), flowHitY);
    flash('wrong');
    updateUI();
    checkFlowComplete();
  }

  function checkFlowComplete() {
    if (!heroMode || !running) return;
    const judged = flowNotes.filter(n => n.status).length;
    if (judged >= flowTotalToSpawn && flowSpawnIdx >= flowTotalToSpawn) {
      setTimeout(() => { if (running) finish(); }, 400);
    }
  }

  /* --- Full-scale streaming (Canvas) --- */
  function initHeroCanvas() {
    heroCanvas = $('#mm-hero-canvas');
    if (!heroCanvas) return;
    const wrap = $('#mm-flow-wrap');
    heroCanvas.style.display = 'block';
    if (wrap) wrap.classList.add('flow-active');
    const w = (wrap && wrap.clientWidth) || heroCanvas.parentElement.clientWidth || 800;
    flowCanvasH = Math.max(180, Math.min(260, window.innerWidth < 720 ? 180 : 220));
    flowHitY = flowCanvasH * 0.78;
    const dpr = window.devicePixelRatio || 1;
    heroCanvas.width = w * dpr;
    heroCanvas.height = flowCanvasH * dpr;
    heroCanvas.style.width = w + 'px';
    heroCanvas.style.height = flowCanvasH + 'px';
    heroCtx = heroCanvas.getContext('2d');
    heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnFlowNotes(now) {
    while (flowSpawnIdx < flowTotalToSpawn) {
      const hitMs = flowStartMs + flowSpawnIdx * flowBeatMs;
      if (hitMs - now > flowLookaheadSec * 1000) break;
      const src = scaleNotes[flowSpawnIdx % scaleNotes.length];
      flowNotes.push({
        ...src,
        hitMs,
        status: null,
        spawnIdx: flowSpawnIdx,
      });
      flowSpawnIdx++;
    }
  }

  function flowPxPerSec() {
    const mul = DIFF[$('#mm-diff-select').value].speedMul;
    return (flowHitY - 28) / flowLookaheadSec * mul;
  }

  function noteY(now, hitMs) {
    const timeToHit = (hitMs - now) / 1000;
    return flowHitY - timeToHit * flowPxPerSec();
  }

  function tickFlowMetronome(now) {
    if (now - flowLastMetMs < flowBeatMs - 8) return;
    flowLastMetMs = now;
    AudioEngine.ensureCtx();
    AudioEngine.click(AudioEngine.ctx.currentTime + 0.02, flowMetBeat % 4 === 0);
    flowMetBeat++;
  }

  function startHero() {
    initHeroCanvas();
    flowNotes = [];
    flowSpawnIdx = 0;
    flowMetBeat = 0;
    flowLastMetMs = 0;
    flowBpm = Math.max(45, Math.min(160, parseInt($('#mm-bpm-input')?.value, 10) || 80));
    flowBeatMs = 60000 / flowBpm;
    flowTotalToSpawn = scaleNotes.length * 2;
    flowStartMs = performance.now() + 600;
    flowLookaheadSec = Math.max(2.2, Math.min(3.4, (flowBeatMs * 3) / 1000));

    flowPopups = [];
    $('#mm-flow-popups').innerHTML = '';
    $('#mm-current-note').textContent = '—';
    $('#mm-current-solfege').textContent = 'זרמו!';
    $('#mm-current-fret').textContent = `BPM ${flowBpm} · קו פגיעה · ±${FLOW_HIT_MS}ms`;

    const hint = $('#mm-fretboard-hint');
    if (hint) {
      hint.textContent = '🎮 מצב זרימה: נגנו כשהתו מגיע לקו הזהוב · Perfect ≤35ms · Good ≤75ms';
    }

    heroRaf = requestAnimationFrame(drawHero);
  }

  function drawHero() {
    if (!running || !heroMode || !heroCtx) return;
    const now = performance.now();
    const w = heroCanvas.clientWidth;
    const h = flowCanvasH;

    spawnFlowNotes(now);
    tickFlowMetronome(now);

    heroCtx.clearRect(0, 0, w, h);

    // רקע
    const bg = heroCtx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0a1420');
    bg.addColorStop(1, '#060c14');
    heroCtx.fillStyle = bg;
    heroCtx.fillRect(0, 0, w, h);

    // מסילות סריג (אנכיות — זרימה מלמעלה)
    heroCtx.strokeStyle = 'rgba(58,82,106,0.35)';
    heroCtx.lineWidth = 1;
    for (let f = 0; f <= Math.min(NUM_FRETS, 12); f++) {
      const x = noteCanvasX(f, w);
      heroCtx.beginPath();
      heroCtx.moveTo(x, 22);
      heroCtx.lineTo(x, h - 8);
      heroCtx.stroke();
      heroCtx.fillStyle = '#5a7187';
      heroCtx.font = '10px Heebo';
      heroCtx.textAlign = 'center';
      heroCtx.fillText(String(f), x, 14);
    }

    // חצים — כיוון הזרימה
    heroCtx.fillStyle = 'rgba(79,179,217,0.25)';
    heroCtx.font = '14px Heebo';
    heroCtx.textAlign = 'right';
    heroCtx.fillText('↓ זרימה', w - 10, 28);

    // קו פגיעה + אזור
    const pulse = 0.5 + 0.5 * Math.sin(now / 160);
    heroCtx.fillStyle = `rgba(79,179,217,${0.06 + pulse * 0.06})`;
    heroCtx.fillRect(0, flowHitY - 14, w, 28);
    heroCtx.strokeStyle = `rgba(240,204,116,${0.55 + pulse * 0.35})`;
    heroCtx.lineWidth = 2.5;
    heroCtx.beginPath();
    heroCtx.moveTo(0, flowHitY);
    heroCtx.lineTo(w, flowHitY);
    heroCtx.stroke();

    flowNotes.forEach(n => {
      if (n.status === 'hit' || n.status === 'miss') return;
      const y = noteY(now, n.hitMs);
      if (y < -20 || y > h + 20) return;

      const inWindow = Math.abs(now - n.hitMs) <= FLOW_HIT_MS;
      const x = noteCanvasX(n.fret, w);
      const r = inWindow ? 17 : 14;

      // זנב תנועה
      if (y > 30) {
        const tail = heroCtx.createLinearGradient(x, y - 28, x, y);
        tail.addColorStop(0, 'rgba(79,179,217,0)');
        tail.addColorStop(1, inWindow ? 'rgba(227,179,65,0.45)' : 'rgba(79,179,217,0.35)');
        heroCtx.strokeStyle = tail;
        heroCtx.lineWidth = 5;
        heroCtx.beginPath();
        heroCtx.moveTo(x, y - 26);
        heroCtx.lineTo(x, y - 6);
        heroCtx.stroke();
      }

      heroCtx.beginPath();
      heroCtx.arc(x, y, r + 4, 0, Math.PI * 2);
      heroCtx.strokeStyle = inWindow ? 'rgba(240,204,116,0.75)' : 'rgba(79,179,217,0.35)';
      heroCtx.lineWidth = 2;
      heroCtx.stroke();

      heroCtx.beginPath();
      heroCtx.arc(x, y, r, 0, Math.PI * 2);
      if (inWindow) {
        heroCtx.fillStyle = '#e3b341';
        heroCtx.shadowColor = '#e3b341';
        heroCtx.shadowBlur = 14;
      } else {
        heroCtx.fillStyle = '#4fb3d9';
        heroCtx.shadowBlur = 0;
      }
      heroCtx.fill();
      heroCtx.shadowBlur = 0;

      heroCtx.fillStyle = inWindow ? '#1a1408' : '#fff';
      heroCtx.font = 'bold 12px Heebo';
      heroCtx.textAlign = 'center';
      heroCtx.fillText(n.name, x, y + 4);
    });

    drawFlowPopups(now);

    // פספוסים — חלון ±75ms
    flowNotes.forEach(n => {
      if (n.status) return;
      if (now - n.hitMs > FLOW_HIT_MS) registerFlowMiss(n);
    });

    heroRaf = requestAnimationFrame(drawHero);
  }

  function tryFlowHit(pc, rms) {
    if (!heroMode || !running || rms < 0.012) return;
    const now = performance.now();
    let best = null, bestDt = Infinity;
    for (const n of flowNotes) {
      if (n.status) continue;
      if (n.pc !== pc) continue;
      const dt = Math.abs(now - n.hitMs);
      if (dt <= FLOW_HIT_MS && dt < bestDt) {
        bestDt = dt;
        best = n;
      }
    }
    if (best) registerFlowHit(best, now - best.hitMs);
  }

  function stopHero() {
    if (heroRaf) { cancelAnimationFrame(heroRaf); heroRaf = null; }
    if (heroCanvas) heroCanvas.style.display = 'none';
    const wrap = $('#mm-flow-wrap');
    if (wrap) wrap.classList.remove('flow-active');
    flowNotes = [];
    flowPopups = [];
    const hint = $('#mm-fretboard-hint');
    if (hint) {
      hint.textContent = '🟡 = טוניקה · 🔵 = צלילי הדרומוס · 🟢 מהבהב = התו שצריך לנגן עכשיו';
    }
  }

  /* --- Mic callback --- */
  function onPitch(data, rms) {
    if (!data) {
      quietFrames++; if (quietFrames >= 2) { armed = true; stablePc = null; stableCount = 0; }
      $('#mm-detected').textContent = '—'; return;
    }
    quietFrames = 0;
    $('#mm-detected').textContent = data.name + ' (' + SOLFEGE[data.name] + ')';

    if (heroMode) {
      tryFlowHit(data.pc, rms);
      return;
    }

    // Note-by-note
    if (data.pc === stablePc) stableCount++;
    else { stablePc = data.pc; stableCount = 1; }

    const diff = DIFF[$('#mm-diff-select').value];
    const now = performance.now();
    if (stableCount >= diff.stableNeeded && now - lastReg > 200 && armed) {
      lastReg = now; armed = false;
      const target = scaleNotes[idx];
      if (target && data.pc === target.pc) advance(true);
    }
    if (stableCount >= 1) armed = true;
  }

  /* --- Control --- */
  async function start() {
    dromos = DROMOI[parseInt($('#mm-dromos-select').value)];
    rootPc = parseInt($('#mm-root-select').value);
    heroMode = $('#mm-mode-select').value === 'full-scale';
    scaleNotes = buildScale();
    idx = 0; stats = { correct: 0, wrong: 0, streak: 0, best: 0 };
    stablePc = null; stableCount = 0; armed = true; quietFrames = 0;
    running = true;
    $('#mm-results').classList.remove('show');
    updateUI(); drawModeFretboard();

    const ok = await MicEngine.start(onPitch);
    $('#mm-mic-status').textContent = ok ? '🎤 מאזין...' : '⚠ אין מיקרופון';
    $('#mm-mic-status').className = 'mm-mic ' + (ok ? 'on' : 'off');

    if (heroMode) {
      stopHero();
      startHero();
      drawModeFretboard();
    } else {
      stopHero();
      AudioEngine.ensureCtx();
      scaleNotes.forEach((n, i) => {
        setTimeout(() => AudioEngine.pluckCourse(0, n.fret, 0, 0.4), i * 300);
      });
      setTimeout(() => {
        if (scaleNotes[0]) AudioEngine.pluckCourse(0, scaleNotes[0].fret, 0, 0.55);
      }, scaleNotes.length * 300 + 500);
    }

    $('#mm-start').textContent = '⏹ עצור'; $('#mm-start').classList.add('playing');
  }

  function stop() {
    running = false; MicEngine.stop(); stopHero();
    $('#mm-start').textContent = '▶ שחק'; $('#mm-start').classList.remove('playing');
    $('#mm-mic-status').textContent = ''; $('#mm-mic-status').className = 'mm-mic';
  }

  function init() {
    const sel = $('#mm-dromos-select');
    DROMOI.forEach((d, i) => {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = d.nameHe + ' — ' + d.nameGr;
      sel.appendChild(opt);
    });
    const rootSel = $('#mm-root-select');
    NOTE_NAMES.forEach((n, i) => {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = n + ' (' + SOLFEGE[n] + ')';
      if (i === 2) opt.selected = true;
      rootSel.appendChild(opt);
    });

    $('#mm-start').addEventListener('click', () => running ? stop() : start());
    $('#mm-play-note').addEventListener('click', () => {
      const n = scaleNotes[idx];
      if (n) { AudioEngine.ensureCtx(); AudioEngine.pluckCourse(0, n.fret, 0, 0.55); }
    });

    sel.addEventListener('change', () => {
      dromos = DROMOI[parseInt(sel.value)];
      scaleNotes = buildScale();
      drawModeFretboard();
    });
    rootSel.addEventListener('change', () => {
      rootPc = parseInt(rootSel.value);
      scaleNotes = buildScale();
      drawModeFretboard();
    });
    $('#mm-mode-select').addEventListener('change', () => {
      heroMode = $('#mm-mode-select').value === 'full-scale';
      if (!running) {
        stopHero();
        drawModeFretboard();
      }
    });

    window.addEventListener('resize', () => {
      if (running && heroMode) initHeroCanvas();
    });

    dromos = DROMOI[0]; scaleNotes = buildScale();
    drawModeFretboard();
    updateUI();
  }

  return { init, stop };
})();


/* ============================================================
   מאסטר אקורדים
   ============================================================ */
const MasterChords = (() => {
  let running = false, chords = [], idx = 0;
  let stats = { correct: 0, wrong: 0, streak: 0, best: 0 };
  let detected = new Set(), timeLeft = 100, timerInt = null;

  const DIFF = {
    easy:   { count: 5,  time: 15000, match: 0.6, label: 'קל' },
    medium: { count: 8,  time: 10000, match: 0.7, label: 'בינוני' },
    hard:   { count: 12, time: 6000,  match: 0.8, label: 'קשה' },
  };

  function chordPcs(chord) {
    return chord.frets.map((f, ci) => f !== null ? (TUNING[ci].midi + f) % 12 : -1).filter(n => n >= 0);
  }

  function drawChordFretboard() {
    const chord = chords[idx];
    if (!chord) { drawFretboard($('#fb-master-chords'), () => null); return; }

    drawFretboard($('#fb-master-chords'), (ci, f, midi) => {
      if (chord.frets[ci] !== f) return null;
      const pc = midi % 12;
      const hit = detected.has(pc);
      return { type: hit ? 'root' : 'note', label: NOTE_NAMES[pc] };
    });

    // הדגשות
    const svg = $('#fb-master-chords');
    svg.querySelectorAll('.fb-dot').forEach(dot => {
      dot.classList.remove('mc-target', 'mc-hit');
      const ci = parseInt(dot.dataset.course), f = parseInt(dot.dataset.fret);
      if (chord.frets[ci] === f) {
        const pc = (TUNING[ci].midi + f) % 12;
        dot.classList.add(detected.has(pc) ? 'mc-hit' : 'mc-target');
      }
    });
  }

  function updateUI() {
    $('#mc-correct').textContent = stats.correct;
    $('#mc-wrong').textContent = stats.wrong;
    $('#mc-streak').textContent = stats.streak;
    const tot = stats.correct + stats.wrong;
    $('#mc-accuracy').textContent = tot > 0 ? Math.round(stats.correct / tot * 100) + '%' : '—';
    $('#mc-progress').textContent = `${idx + 1} / ${chords.length}`;

    const c = chords[idx];
    if (c) {
      $('#mc-chord-name').textContent = c.he;
      $('#mc-chord-eng').textContent = c.name;
      $('#mc-chord-frets').textContent = c.frets.map((f, i) => ['D','A','F','C'][i] + ':' + (f !== null ? f : 'x')).join('  ');
      // chips
      const wrap = $('#mc-note-chips'); wrap.innerHTML = '';
      chordPcs(c).forEach(pc => {
        const ch = document.createElement('span');
        ch.className = 'mc-chip' + (detected.has(pc) ? ' hit' : '');
        ch.textContent = NOTE_NAMES[pc] + ' ' + SOLFEGE[NOTE_NAMES[pc]];
        wrap.appendChild(ch);
      });
    }
  }

  function flash(type) {
    const el = $('#mc-feedback');
    el.textContent = type === 'correct' ? '✓ מעולה!' : '✗ הזמן נגמר';
    el.className = 'mm-feedback ' + type;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 700);
  }

  function advance(ok) {
    if (timerInt) { clearInterval(timerInt); timerInt = null; }
    if (ok) {
      stats.correct++; stats.streak++; stats.best = Math.max(stats.best, stats.streak);
      flash('correct');
    } else {
      stats.wrong++; stats.streak = 0; flash('wrong');
    }
    updateUI();
    setTimeout(() => {
      detected = new Set(); idx++;
      if (idx >= chords.length) { finish(); return; }
      timeLeft = 100; updateUI(); drawChordFretboard();
      playChord();
      startTimer();
    }, 700);
  }

  function playChord() {
    const c = chords[idx];
    if (!c) return;
    AudioEngine.ensureCtx();
    c.frets.forEach((f, ci) => {
      if (f !== null) setTimeout(() => AudioEngine.pluckCourse(ci, f, 0, 0.5), ci * 60);
    });
  }

  function startTimer() {
    const cfg = DIFF[$('#mc-diff-select').value];
    const step = 100 / (cfg.time / 100);
    timerInt = setInterval(() => {
      timeLeft -= step;
      $('#mc-timer').style.width = Math.max(0, timeLeft) + '%';
      $('#mc-timer').className = 'mc-timer-bar' + (timeLeft < 30 ? ' danger' : '');
      if (timeLeft <= 0) advance(false);
    }, 100);
  }

  function finish() {
    running = false; MicEngine.stop();
    if (timerInt) { clearInterval(timerInt); timerInt = null; }
    const tot = stats.correct + stats.wrong;
    const pct = tot > 0 ? Math.round(stats.correct / tot * 100) : 0;
    let grade, cls;
    if (pct >= 90) { grade = '🏆 מאסטר אקורדים!'; cls = 'gold'; }
    else if (pct >= 70) { grade = '⭐ כל הכבוד!'; cls = 'good'; }
    else if (pct >= 50) { grade = '👍 טוב.'; cls = 'ok'; }
    else { grade = '💪 נסו רמה קלה יותר.'; cls = 'work'; }
    const res = $('#mc-results');
    res.className = 'ls-results show ' + cls;
    res.innerHTML = `<div class="ls-score">${pct}%</div><div class="ls-grade">${grade}</div>
      <div class="ls-stats">${stats.correct} נכון · ${stats.wrong} שגוי · רצף: ${stats.best}</div>
      <button class="btn gold" id="mc-again">🔁 שחק שוב</button>`;
    $('#mc-again').addEventListener('click', () => { res.classList.remove('show'); startGame(); });
    $('#mc-start').textContent = '▶ שחק'; $('#mc-start').classList.remove('playing');
  }

  function onPitch(data) {
    if (!data || !running) { $('#mc-detected').textContent = '—'; return; }
    $('#mc-detected').textContent = data.name + ' (' + SOLFEGE[data.name] + ')';
    detected.add(data.pc);
    updateUI(); drawChordFretboard();
    const c = chords[idx];
    if (!c) return;
    const needed = chordPcs(c);
    const matched = needed.filter(n => detected.has(n)).length;
    const cfg = DIFF[$('#mc-diff-select').value];
    if (matched >= Math.ceil(needed.length * cfg.match)) advance(true);
  }

  async function startGame() {
    const cat = $('#mc-cat-select').value;
    const diff = $('#mc-diff-select').value;
    const cfg = DIFF[diff];
    let available = ChordLibrary.getAll();
    if (cat !== 'all') available = available.filter(c => c.cat === cat);
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    chords = shuffled.slice(0, Math.min(cfg.count, shuffled.length));

    idx = 0; stats = { correct: 0, wrong: 0, streak: 0, best: 0 };
    detected = new Set(); timeLeft = 100; running = true;
    $('#mc-results').classList.remove('show');
    updateUI(); drawChordFretboard(); playChord();
    startTimer();

    const ok = await MicEngine.start(onPitch);
    $('#mc-mic-status').textContent = ok ? '🎤 מאזין...' : '⚠ אין מיקרופון';
    $('#mc-mic-status').className = 'mm-mic ' + (ok ? 'on' : 'off');

    $('#mc-start').textContent = '⏹ עצור'; $('#mc-start').classList.add('playing');
  }

  function stopGame() {
    running = false; MicEngine.stop();
    if (timerInt) { clearInterval(timerInt); timerInt = null; }
    $('#mc-start').textContent = '▶ שחק'; $('#mc-start').classList.remove('playing');
  }

  function init() {
    ChordLibrary.init();
    ChordLibrary.onPreview(c => {
      if (c) {
        AudioEngine.ensureCtx();
        c.frets.forEach((f, ci) => {
          if (f !== null) setTimeout(() => AudioEngine.pluckCourse(ci, f, 0, 0.5), ci * 60);
        });
      }
    });
    $('#mc-start').addEventListener('click', () => running ? stopGame() : startGame());
    $('#mc-play-chord').addEventListener('click', playChord);
    drawFretboard($('#fb-master-chords'), () => null);
  }

  return { init, stop: stopGame };
})();

/* === init === */
MasterModes.init();
MasterChords.init();
