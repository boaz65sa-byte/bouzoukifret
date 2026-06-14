/* ============================================================
   מאסטר מודוסים + מאסטר אקורדים
   משחקי לימוד אינטראקטיביים עם גריף 8 מיתרים והאזנה למיקרופון
   ============================================================ */
'use strict';

/* === אקורדים לבוזוקי === */
const BOUZOUKI_CHORDS = [
  { name: 'D Major', he: 'רה מז\'ור', frets: [0,2,3,2], cat: 'greek', desc: 'אקורד בסיסי לרמבטיקו' },
  { name: 'D Minor', he: 'רה מינור', frets: [0,2,2,1], cat: 'greek', desc: 'לשירי זייבקיקו' },
  { name: 'D7',      he: 'רה 7',     frets: [0,2,1,2], cat: 'greek', desc: 'דומיננטה יוונית' },
  { name: 'Am',      he: 'לה מינור', frets: [5,0,0,0], cat: 'greek', desc: 'אקורד מפתח יווני' },
  { name: 'Em',      he: 'מי מינור', frets: [2,2,0,0], cat: 'greek', desc: 'שכיח ברמבטיקו' },
  { name: 'A7',      he: 'לה 7',     frets: [5,0,2,0], cat: 'greek', desc: 'סיום יווני' },
  { name: 'Gm',      he: 'סול מינור',frets: [5,5,3,3], cat: 'greek', desc: 'צליל עצוב' },
  { name: 'F',       he: 'פה מז\'ור',frets: [3,0,0,1], cat: 'greek', desc: 'שכיח' },
  { name: 'C',       he: 'דו מז\'ור',frets: [10,9,10,0],cat:'greek', desc: 'בסיסי' },
  { name: 'Bb',      he: 'סי♭',      frets: [8,7,8,6], cat: 'greek', desc: 'לשירים יווניים' },
  { name: 'E7',      he: 'מי 7',     frets: [2,2,2,3], cat: 'greek', desc: 'רמבטיקו אופייני' },
  { name: 'Hijaz D', he: 'חיג\'אז רה',frets:[0,1,4,1], cat:'oriental',desc:'מקאם חיג\'אז' },
  { name: 'Bayat D', he: 'ביאת רה',  frets: [0,2,2,0], cat: 'oriental',desc:'מקאם ביאת' },
  { name: 'Nahawand',he: 'נהוואנד',  frets: [0,2,2,1], cat: 'oriental',desc:'מקאם נהוואנד' },
  { name: 'Kurd D',  he: 'כורד רה',  frets: [0,1,2,1], cat: 'oriental',desc:'מקאם כורד' },
  { name: 'Saba',    he: 'סבא',      frets: [0,1,2,0], cat: 'oriental',desc:'מקאם סבא' },
  { name: 'Rast',    he: 'ראסט',     frets: [0,2,3,0], cat: 'oriental',desc:'מקאם ראסט' },
  { name: 'Nikriz',  he: 'ניקריז',   frets: [0,1,4,2], cat: 'oriental',desc:'מקאם ניקריז' },
];

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

  // Hero mode
  let heroCanvas, heroCtx, heroNotes = [], heroSpawnIdx = 0, heroSpawnTimer = null;
  let heroRaf = null, heroStartT = 0;
  const HERO_FALL_PX = 280, HERO_HIT_Y = 240, HERO_WINDOW = 40;

  const DIFF = {
    easy:   { stableNeeded: 2, heroSpeed: 0.04, label: 'קל' },
    medium: { stableNeeded: 3, heroSpeed: 0.06, label: 'בינוני' },
    hard:   { stableNeeded: 4, heroSpeed: 0.09, label: 'קשה' },
  };

  function buildScale() {
    const frets = [...dromos.intervals, 12];
    return frets.map(f => ({
      fret: f, midi: TUNING[0].midi + f, pc: (TUNING[0].midi + f) % 12,
      name: NOTE_NAMES[(TUNING[0].midi + f) % 12],
    }));
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
    $('#mm-progress').textContent = `${idx} / ${scaleNotes.length}`;

    const n = scaleNotes[idx];
    if (n && !heroMode) {
      $('#mm-current-note').textContent = n.name;
      $('#mm-current-solfege').textContent = SOLFEGE[n.name];
      $('#mm-current-fret').textContent = 'סריג ' + n.fret + ' על מיתר D';
    } else if (!n) {
      $('#mm-current-note').textContent = '—';
      $('#mm-current-solfege').textContent = '';
      $('#mm-current-fret').textContent = '';
    }
  }

  function flash(type) {
    const el = $('#mm-feedback');
    el.textContent = type === 'correct' ? '✓ נכון!' : '✗ לא מדויק';
    el.className = 'mm-feedback ' + type;
    el.style.opacity = 1;
    setTimeout(() => { el.style.opacity = 0; }, 700);
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

  /* --- Hero mode (Canvas falling notes) --- */
  function initHeroCanvas() {
    heroCanvas = $('#mm-hero-canvas');
    if (!heroCanvas) return;
    heroCanvas.style.display = 'block';
    const w = heroCanvas.parentElement.clientWidth || 800;
    const dpr = window.devicePixelRatio || 1;
    heroCanvas.width = w * dpr; heroCanvas.height = HERO_FALL_PX * dpr;
    heroCanvas.style.width = w + 'px'; heroCanvas.style.height = HERO_FALL_PX + 'px';
    heroCtx = heroCanvas.getContext('2d');
    heroCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function startHero() {
    initHeroCanvas();
    heroNotes = []; heroSpawnIdx = 0;
    heroStartT = performance.now();
    const speed = DIFF[$('#mm-diff-select').value].heroSpeed;
    const interval = Math.max(600, 1200 / (speed * 20));
    heroSpawnTimer = setInterval(() => {
      if (heroSpawnIdx >= scaleNotes.length) { clearInterval(heroSpawnTimer); return; }
      const n = scaleNotes[heroSpawnIdx];
      const w = heroCanvas.clientWidth;
      const x = 50 + (n.fret / NUM_FRETS) * (w - 100);
      heroNotes.push({ ...n, x, y: 0, status: null });
      heroSpawnIdx++;
    }, interval);
    heroRaf = requestAnimationFrame(drawHero);
  }

  function drawHero() {
    if (!running) return;
    const w = heroCanvas.clientWidth, h = HERO_FALL_PX;
    const speed = DIFF[$('#mm-diff-select').value].heroSpeed;
    heroCtx.clearRect(0, 0, w, h);

    // קו פגיעה
    heroCtx.strokeStyle = 'rgba(232,238,245,0.5)';
    heroCtx.lineWidth = 2;
    heroCtx.beginPath(); heroCtx.moveTo(0, HERO_HIT_Y); heroCtx.lineTo(w, HERO_HIT_Y); heroCtx.stroke();

    // מספרי סריגים למעלה
    heroCtx.fillStyle = '#5a7187'; heroCtx.font = '11px Heebo'; heroCtx.textAlign = 'center';
    for (let f = 0; f <= NUM_FRETS; f++) {
      const x = 50 + (f / NUM_FRETS) * (w - 100);
      heroCtx.fillText(f, x, 14);
    }

    heroNotes.forEach(n => {
      if (n.status === 'hit') return;
      n.y += speed * 16;

      // החטאה אוטומטית
      if (n.y > HERO_HIT_Y + HERO_WINDOW && n.status === null) {
        n.status = 'miss';
        stats.wrong++; stats.streak = 0;
        updateUI();
      }

      const inZone = Math.abs(n.y - HERO_HIT_Y) < HERO_WINDOW;
      const r = 16;
      heroCtx.beginPath(); heroCtx.arc(n.x, n.y, r, 0, Math.PI * 2);
      if (n.status === 'miss') {
        heroCtx.fillStyle = 'rgba(217,100,89,0.3)';
      } else if (inZone) {
        heroCtx.fillStyle = '#e3b341';
        heroCtx.shadowColor = '#e3b341'; heroCtx.shadowBlur = 12;
      } else {
        heroCtx.fillStyle = '#4fb3d9';
      }
      heroCtx.fill();
      heroCtx.shadowBlur = 0;

      heroCtx.fillStyle = '#fff'; heroCtx.font = 'bold 11px Heebo'; heroCtx.textAlign = 'center';
      heroCtx.fillText(n.name, n.x, n.y + 4);
    });

    // בדיקת סיום
    const allDone = heroNotes.length >= scaleNotes.length && heroNotes.every(n => n.status !== null);
    if (allDone) { finish(); return; }

    heroRaf = requestAnimationFrame(drawHero);
  }

  function heroHit(pc) {
    for (const n of heroNotes) {
      if (n.status !== null) continue;
      if (n.pc !== pc) continue;
      if (Math.abs(n.y - HERO_HIT_Y) <= HERO_WINDOW) {
        n.status = 'hit';
        stats.correct++; stats.streak++; stats.best = Math.max(stats.best, stats.streak);
        flash('correct');
        updateUI();
        return true;
      }
    }
    return false;
  }

  function stopHero() {
    if (heroSpawnTimer) { clearInterval(heroSpawnTimer); heroSpawnTimer = null; }
    if (heroRaf) { cancelAnimationFrame(heroRaf); heroRaf = null; }
    if (heroCanvas) heroCanvas.style.display = 'none';
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
      if (data.pc !== stablePc) { stablePc = data.pc; stableCount = 1; }
      else stableCount++;
      if (stableCount >= 2) heroHit(data.pc);
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
    heroMode = $('#mm-mode-select').value === 'hero';
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
      startHero();
    } else {
      stopHero();
      AudioEngine.ensureCtx();
      // נגן את כל הסולם קודם
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
      drawModeFretboard();
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
    let available = cat === 'all' ? BOUZOUKI_CHORDS : BOUZOUKI_CHORDS.filter(c => c.cat === cat);
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
    $('#mc-start').addEventListener('click', () => running ? stopGame() : startGame());
    $('#mc-play-chord').addEventListener('click', playChord);
    drawFretboard($('#fb-master-chords'), () => null);
  }

  return { init, stop: stopGame };
})();

/* === init === */
MasterModes.init();
MasterChords.init();
