/* ============================================================
   מאסטר הפנייה — משחק קצב דו-כיווני לאימון פריטה
   חיצים זורמים אל קו הפגיעה; השחקן מקיש ↓/↑ בתזמון מדויק.
   חלונות שיפוט (מבוסס מחקר משחקי קצב): מושלם ±50ms · טוב ±110ms
   ============================================================ */
'use strict';

const Game = (() => {

  /* ---------- רמות (תוכנית לימודים הדרגתית) ---------- */
  const LEVELS = [
    {
      id: 'g1', name: 'שלב 1: רבעים למטה', bpm: 60,
      strokes: ['D', 'D', 'D', 'D'], stepsPerBeat: 1,
      tip: 'רק פריטות למטה, אחת לפעמה. תזמון לפני הכל.'
    },
    {
      id: 'g2', name: 'שלב 2: שמיניות למטה-למעלה', bpm: 60,
      strokes: ['D', 'u', 'd', 'u', 'D', 'u', 'd', 'u'], stepsPerBeat: 2,
      tip: 'הבסיס של הפנייה: למטה על הפעמה, למעלה בין הפעמות.'
    },
    {
      id: 'g3', name: 'שלב 3: דגשים על 1 ו-3', bpm: 70,
      strokes: ['D', 'u', 'd', 'u', 'D', 'u', 'd', 'u'], stepsPerBeat: 2,
      tip: 'אותה תבנית, מהר יותר. החיצים הגדולים = מודגשים.'
    },
    {
      id: 'g4', name: 'שלב 4: טריולים ↓↑↓', bpm: 60,
      strokes: ['D', 'u', 'd', 'D', 'u', 'd', 'D', 'u', 'd', 'D', 'u', 'd'], stepsPerBeat: 3,
      tip: 'כל קבוצה מתחילה למטה — שתי פריטות למטה ברצף בין הקבוצות!'
    },
    {
      id: 'g5', name: 'שלב 5: פניית חסאפיקו', bpm: 80,
      strokes: ['D', '-', 'd', 'u', 'd', '-', 'u', '-'], stepsPerBeat: 2,
      tip: 'עכשיו עם שתיקות — אסור לפרוט עליהן! ריסון = מקצועיות.'
    },
    {
      id: 'g6', name: 'שלב 6: פניית זאימבקיקו 9/4', bpm: 66,
      strokes: ['D', '-', 'u', '-', 'd', 'u', 'D', 'u', '-'], stepsPerBeat: 1,
      tip: 'המקצב הקדוש: 9 פעמות, שתיקות במקומות הנכונים.'
    },
    {
      id: 'g7', name: 'שלב 7: שש-עשריות', bpm: 55,
      strokes: ['D', 'u', 'd', 'u', 'd', 'u', 'd', 'u', 'D', 'u', 'd', 'u', 'd', 'u', 'd', 'u'], stepsPerBeat: 4,
      tip: 'צפוף! תנועה קטנטנה מהשורש. זה השער לטרמולו.'
    },
    {
      id: 'g8', name: 'שלב 8: טזנה 7/8', bpm: 90,
      strokes: ['D', '-', 'u', 'd', 'u', 'd', 'u'], stepsPerBeat: 2,
      tip: 'משקל אי-זוגי 3+2+2 — היד לומדת לחשוב יוונית.'
    },
  ];

  /* חלונות שיפוט (שניות) */
  const W_PERFECT = 0.05, W_GOOD = 0.11, W_REGISTER = 0.16;
  const LOOPS = 4, COUNT_IN = 4;
  const PX_PER_BEAT = 150;
  const HIT_X = 86;

  /* ---------- מצב ---------- */
  let level = LEVELS[0];
  let bpm = LEVELS[0].bpm;
  let running = false;
  let targets = [];        // {t, dir('d'/'u'), accent, status:null/'perfect'/'good'/'miss'/'wrong'}
  let beats = [];          // זמני פעמות לציור גריד
  let t0 = 0, endT = 0;
  let score = 0, combo = 0, maxCombo = 0;
  let counts = { perfect: 0, good: 0, miss: 0, wrong: 0 };
  let popups = [];         // {text, color, born, y}
  let rafId = null;
  let inputOffset = parseFloat(localStorage.getItem('penia-game-offset') || '0');
  let scheduledClicks = [];

  // כיול
  let calibrating = false, calibClicks = [], calibTaps = [];

  let canvas, cctx, dpr = 1;

  function actx() { return AudioEngine.ctx; }
  function now() { return actx().currentTime; }

  /* ---------- בניית סבב ---------- */
  function buildRound() {
    const beat = 60 / bpm;
    const stepDur = beat / level.stepsPerBeat;
    targets = [];
    beats = [];
    t0 = now() + 0.6;
    const playStart = t0 + COUNT_IN * beat;
    const totalSteps = level.strokes.length * LOOPS;

    for (let s = 0; s < totalSteps; s++) {
      const stroke = level.strokes[s % level.strokes.length];
      if (stroke === '-') continue;
      targets.push({
        t: playStart + s * stepDur,
        dir: stroke.toLowerCase(),
        accent: stroke === 'D' || stroke === 'U',
        status: null
      });
    }
    endT = playStart + totalSteps * stepDur;

    // קליקים של מטרונום — מתוזמנים מראש (ונשמרים לביטול בעצירה)
    scheduledClicks = [];
    const totalBeats = Math.ceil((endT - t0) / beat);
    for (let b = 0; b < totalBeats + 1; b++) {
      const t = t0 + b * beat;
      scheduledClicks.push(AudioEngine.click(t, b % COUNT_IN === 0));
      if (t >= t0 && t <= endT + 0.01) beats.push(t);
    }
  }

  /* ---------- קלט ---------- */
  function handleInput(dir) {
    if (calibrating) { calibTaps.push(now()); flashLane(); return; }
    if (!running) return;
    const tIn = now() + inputOffset;

    // היעד הקרוב ביותר שטרם נפגע
    let best = null, bestDt = Infinity;
    for (const tg of targets) {
      if (tg.status) continue;
      const dt = tIn - tg.t;
      if (Math.abs(dt) < Math.abs(bestDt) ) { bestDt = dt; best = tg; }
    }
    if (!best || Math.abs(bestDt) > W_REGISTER) {
      // הקשה באוויר — לא שוברת קומבו אבל לא נספרת
      addPopup('מוקדם מדי...', '#5a7187');
      return;
    }
    if (best.dir !== dir) {
      best.status = 'wrong';
      counts.wrong++;
      combo = 0;
      addPopup('כיוון הפוך! ' + (best.dir === 'd' ? '↓' : '↑'), '#d96459');
      return;
    }
    const adt = Math.abs(bestDt);
    if (adt <= W_PERFECT) {
      best.status = 'perfect';
      counts.perfect++;
      combo++;
      score += 100 * comboMult();
      addPopup('מושלם!', '#e3b341');
    } else if (adt <= W_GOOD) {
      best.status = 'good';
      counts.good++;
      combo++;
      score += 50 * comboMult();
      addPopup(bestDt < 0 ? 'טוב (מוקדם)' : 'טוב (מאוחר)', '#5fc88f');
    } else {
      best.status = 'good';
      counts.good++;
      combo = 0;
      score += 20;
      addPopup(bestDt < 0 ? 'מוקדם' : 'מאוחר', '#4fb3d9');
    }
    maxCombo = Math.max(maxCombo, combo);
    AudioEngine.strum(now(), dir, best.accent);
    updateHud();
  }

  function comboMult() { return 1 + Math.min(2, Math.floor(combo / 8) * 0.5); }

  function addPopup(text, color) {
    popups.push({ text, color, born: performance.now() });
    if (popups.length > 5) popups.shift();
  }

  let laneFlash = 0;
  function flashLane() { laneFlash = performance.now(); }

  /* ---------- ציור ---------- */
  function setupCanvas() {
    canvas = $('#game-canvas');
    dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    cctx = canvas.getContext('2d');
    cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function arrow(x, y, dir, size, color, glow) {
    cctx.save();
    if (glow) { cctx.shadowColor = color; cctx.shadowBlur = 14; }
    cctx.fillStyle = color;
    cctx.beginPath();
    const s = size, half = s * 0.62;
    if (dir === 'd') {
      cctx.moveTo(x - half, y - s * 0.5);
      cctx.lineTo(x + half, y - s * 0.5);
      cctx.lineTo(x, y + s * 0.65);
    } else {
      cctx.moveTo(x - half, y + s * 0.5);
      cctx.lineTo(x + half, y + s * 0.5);
      cctx.lineTo(x, y - s * 0.65);
    }
    cctx.closePath();
    cctx.fill();
    cctx.restore();
  }

  function draw() {
    if (!running && !calibrating) return;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    const tNow = now();
    const beat = 60 / bpm;
    const pxPerSec = PX_PER_BEAT / beat;

    cctx.clearRect(0, 0, w, h);

    // רקע אזורים: למעלה ↑ / למטה ↓
    cctx.fillStyle = 'rgba(79,179,217,0.05)';
    cctx.fillRect(0, 0, w, h / 2);
    cctx.fillStyle = 'rgba(227,179,65,0.05)';
    cctx.fillRect(0, h / 2, w, h / 2);
    cctx.strokeStyle = 'rgba(255,255,255,0.07)';
    cctx.beginPath(); cctx.moveTo(0, h / 2); cctx.lineTo(w, h / 2); cctx.stroke();

    // הבזק כיול
    if (performance.now() - laneFlash < 120) {
      cctx.fillStyle = 'rgba(227,179,65,0.12)';
      cctx.fillRect(0, 0, w, h);
    }

    // קווי פעמה נעים
    cctx.strokeStyle = 'rgba(157,178,199,0.14)';
    for (const bt of beats) {
      const x = HIT_X + (bt - tNow) * pxPerSec;
      if (x < -10 || x > w + 10) continue;
      cctx.beginPath(); cctx.moveTo(x, 8); cctx.lineTo(x, h - 8); cctx.stroke();
    }

    // קו פגיעה
    cctx.strokeStyle = 'rgba(232,238,245,0.75)';
    cctx.lineWidth = 3;
    cctx.beginPath(); cctx.moveTo(HIT_X, 6); cctx.lineTo(HIT_X, h - 6); cctx.stroke();
    cctx.lineWidth = 1;
    // עיגולי יעד
    cctx.strokeStyle = 'rgba(79,179,217,0.5)';
    cctx.beginPath(); cctx.arc(HIT_X, h * 0.25, 19, 0, Math.PI * 2); cctx.stroke();
    cctx.strokeStyle = 'rgba(227,179,65,0.5)';
    cctx.beginPath(); cctx.arc(HIT_X, h * 0.75, 19, 0, Math.PI * 2); cctx.stroke();

    // ספירה לאחור
    if (running && tNow < t0 + COUNT_IN * beat) {
      const n = Math.ceil((t0 + COUNT_IN * beat - tNow) / beat);
      cctx.fillStyle = 'rgba(240,204,116,0.9)';
      cctx.font = '900 46px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.fillText(n, w / 2, h / 2 + 16);
    }

    // חיצים
    for (const tg of targets) {
      const x = HIT_X + (tg.t - tNow) * pxPerSec;
      if (x < -30 || x > w + 30) continue;
      const y = tg.dir === 'u' ? h * 0.25 : h * 0.75;
      const size = tg.accent ? 21 : 15;
      let color = tg.dir === 'u' ? '#4fb3d9' : '#e3b341';
      let alpha = 1;
      if (tg.status === 'perfect' || tg.status === 'good') alpha = 0.18;
      else if (tg.status === 'wrong' || tg.status === 'miss') color = '#d96459';
      cctx.globalAlpha = alpha;
      arrow(x, y, tg.dir, size, color, tg.accent && !tg.status);
      cctx.globalAlpha = 1;
    }

    // החטאות אוטומטיות
    if (running) {
      for (const tg of targets) {
        if (!tg.status && tNow - tg.t > W_REGISTER) {
          tg.status = 'miss';
          counts.miss++;
          combo = 0;
          addPopup('פספוס', '#d96459');
          updateHud();
        }
      }
    }

    // פופ-אפים של שיפוט
    const pNow = performance.now();
    popups = popups.filter(p => pNow - p.born < 800);
    cctx.textAlign = 'center';
    popups.forEach(p => {
      const age = (pNow - p.born) / 800;
      cctx.globalAlpha = 1 - age;
      cctx.fillStyle = p.color;
      cctx.font = '700 19px Heebo, sans-serif';
      cctx.fillText(p.text, w / 2, h * 0.42 - age * 26);
      cctx.globalAlpha = 1;
    });

    // סיום סבב
    if (running && tNow > endT + 0.5) { finishRound(); return; }

    rafId = requestAnimationFrame(draw);
  }

  /* ---------- HUD ותוצאות ---------- */
  function updateHud() {
    $('#game-score').textContent = Math.round(score);
    $('#game-combo').textContent = combo > 1 ? combo + '×' : '';
  }

  function bestKey() { return `penia-game-${level.id}-${bpm}`; }

  function finishRound() {
    running = false;
    cancelAnimationFrame(rafId);
    const total = targets.length;
    const weighted = counts.perfect + counts.good * 0.6;
    const acc = total ? weighted / total : 0;
    const stars = acc >= 0.92 && counts.wrong === 0 ? 3 : acc >= 0.75 ? 2 : acc >= 0.55 ? 1 : 0;

    const prevBest = parseInt(localStorage.getItem(bestKey()) || '0', 10);
    const isRecord = score > prevBest;
    if (isRecord) localStorage.setItem(bestKey(), String(Math.round(score)));

    let msg;
    if (stars === 3) msg = '🏆 שליטה מלאה! היד שלך חושבת יוונית. עלו רמה או הוסיפו מהירות.';
    else if (stars === 2) msg = '⭐ קרוב מאוד — שימו לב להערות "מוקדם/מאוחר" וכוונו את הפנימי.';
    else if (stars === 1) msg = '👍 התבנית נקלטת. עוד כמה סבבים והיא תהיה אוטומטית.';
    else msg = '💪 האטו את הטמפו והתרכזו רק בכיוון: למטה על הפעמה, למעלה ביניהן.';

    const res = $('#game-results');
    res.className = 'ls-results show ' + (stars === 3 ? 'gold' : stars === 2 ? 'good' : stars === 1 ? 'ok' : 'work');
    res.innerHTML = `
      <div class="game-stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      <div class="ls-score">${Math.round(score)} ${isRecord ? '<span class="record-badge">שיא חדש!</span>' : ''}</div>
      <div class="ls-grade">${msg}</div>
      <div class="ls-stats">
        דיוק: ${(acc * 100).toFixed(0)}% · מושלם: ${counts.perfect} · טוב: ${counts.good} · פספוס: ${counts.miss} · כיוון הפוך: ${counts.wrong} · קומבו מירבי: ${maxCombo}
      </div>
      <div class="game-result-btns">
        <button class="btn gold" id="game-retry">🔁 עוד סבב</button>
        ${stars >= 2 ? '<button class="btn" id="game-faster">⚡ +5 BPM</button>' : ''}
        ${stars >= 2 && LEVELS.indexOf(level) < LEVELS.length - 1 ? '<button class="btn" id="game-next">⬆ לשלב הבא</button>' : ''}
      </div>`;
    $('#game-retry').addEventListener('click', () => { res.classList.remove('show'); start(); });
    const faster = $('#game-faster');
    if (faster) faster.addEventListener('click', () => {
      res.classList.remove('show');
      setBpm(bpm + 5);
      start();
    });
    const next = $('#game-next');
    if (next) next.addEventListener('click', () => {
      res.classList.remove('show');
      selectLevel(LEVELS.indexOf(level) + 1);
      start();
    });
    $('#game-start').textContent = '▶ שחק';
    $('#game-start').classList.remove('playing');
  }

  /* ---------- כיול תזמון ---------- */
  function calibrate() {
    AudioEngine.ensureCtx();
    if (calibrating) return;
    calibrating = true;
    calibClicks = [];
    calibTaps = [];
    $('#game-calib').textContent = 'הקישו עם כל קליק! (8 קליקים)';
    const start0 = now() + 0.8;
    const beat = 60 / 90;
    for (let i = 0; i < 8; i++) {
      const t = start0 + i * beat;
      AudioEngine.click(t, true);
      calibClicks.push(t);
    }
    setupCanvas();
    draw();
    setTimeout(() => {
      calibrating = false;
      cancelAnimationFrame(rafId);
      // התאמת כל הקשה לקליק הקרוב
      const diffs = [];
      calibTaps.forEach(tap => {
        let best = Infinity;
        calibClicks.forEach(c => { if (Math.abs(tap - c) < Math.abs(best)) best = tap - c; });
        if (Math.abs(best) < 0.25) diffs.push(best);
      });
      if (diffs.length >= 4) {
        diffs.sort((a, b) => a - b);
        const median = diffs[Math.floor(diffs.length / 2)];
        inputOffset = -median;
        localStorage.setItem('penia-game-offset', String(inputOffset));
        $('#game-calib').textContent = `כיול: ${(median * 1000).toFixed(0)}ms פוצה ✓`;
      } else {
        $('#game-calib').textContent = 'כיול תזמון (לא נקלטו מספיק הקשות)';
      }
    }, (0.8 + 8 * beat + 0.4) * 1000);
  }

  /* ---------- שליטה ---------- */
  function start() {
    AudioEngine.ensureCtx();
    score = 0; combo = 0; maxCombo = 0;
    counts = { perfect: 0, good: 0, miss: 0, wrong: 0 };
    popups = [];
    $('#game-results').classList.remove('show');
    setupCanvas();
    buildRound();
    running = true;
    updateHud();
    $('#game-start').textContent = '⏹ עצור';
    $('#game-start').classList.add('playing');
    cancelAnimationFrame(rafId);
    draw();
  }

  function stop() {
    if (!running && !calibrating) return;
    running = false;
    calibrating = false;
    cancelAnimationFrame(rafId);
    scheduledClicks.forEach(o => { try { o.stop(); } catch (e) { /* כבר הסתיים */ } });
    scheduledClicks = [];
    if (cctx) cctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    const btn = $('#game-start');
    btn.textContent = '▶ שחק';
    btn.classList.remove('playing');
  }

  function setBpm(v) {
    bpm = Math.max(40, Math.min(200, v));
    $('#game-bpm').textContent = bpm;
    showBest();
  }

  function selectLevel(i) {
    level = LEVELS[i];
    $('#game-level').value = i;
    $('#game-tip').textContent = level.tip;
    setBpm(level.bpm);
    renderPatternPreview();
  }

  function showBest() {
    const best = localStorage.getItem(bestKey());
    $('#game-best').textContent = best ? `שיא: ${best}` : '';
  }

  function renderPatternPreview() {
    const wrap = $('#game-pattern');
    wrap.innerHTML = '';
    level.strokes.forEach(s => {
      const span = document.createElement('span');
      const isRest = s === '-';
      const isAccent = s === 'D' || s === 'U';
      span.className = 'gp-arrow' + (isAccent ? ' accent' : '') + (isRest ? ' rest' : '');
      span.textContent = isRest ? '·' : s.toLowerCase() === 'd' ? '↓' : '↑';
      wrap.appendChild(span);
    });
  }

  /* ---------- אתחול ---------- */
  function init() {
    const sel = $('#game-level');
    LEVELS.forEach((lv, i) => {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = lv.name;
      sel.appendChild(opt);
    });
    sel.addEventListener('change', () => { stop(); selectLevel(parseInt(sel.value, 10)); });

    $('#game-start').addEventListener('click', () => running ? stop() : start());
    $('#game-bpm-down').addEventListener('click', () => setBpm(bpm - 5));
    $('#game-bpm-up').addEventListener('click', () => setBpm(bpm + 5));
    $('#game-calib').addEventListener('click', calibrate);

    // מקלדת
    document.addEventListener('keydown', (e) => {
      if (!running && !calibrating) return;
      if (e.repeat) return;
      if (e.code === 'ArrowDown' || e.code === 'KeyJ') { e.preventDefault(); handleInput('d'); }
      else if (e.code === 'ArrowUp' || e.code === 'KeyK') { e.preventDefault(); handleInput('u'); }
    });

    // מגע/עכבר על הקנבס: חצי עליון = ↑, תחתון = ↓
    const cv = $('#game-canvas');
    cv.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const rect = cv.getBoundingClientRect();
      const y = e.clientY - rect.top;
      handleInput(y < rect.height / 2 ? 'u' : 'd');
    });

    selectLevel(0);
  }

  return { init, stop };
})();

Game.init();
