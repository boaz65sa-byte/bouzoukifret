/* ============================================================
   ModusPath — נתיב המודוס
   כל דרומוס = מסלול מעשי בן 5 תחנות:
   סולם → פראזה אופיינית → אקורדים → פריטה → שיר
   עם בקרת מיקרופון אמיתית בכל תחנה.
   "כל שיר יווני יש לו מודוס, אקורדים ופריטה."
   ============================================================ */
'use strict';

const ModusPath = (() => {

  /* מיתר D פתוח = MIDI 74 (D5). סריג = תוספת חצאי-טונים. */
  const D_OPEN = 74;
  const NN = ['C','C#','D','Eb','E','F','F#','G','G#','A','Bb','B'];
  const HE = ['דו','דו#','רה','מי♭','מי','פה','פה#','סול','סול#','לה','סי♭','סי'];

  function midiName(m) { return NN[((m%12)+12)%12]; }

  /* ---------- נתוני המסלולים ---------- */
  const PATHS = [
    {
      id: 'hitzaz', name: 'חיג׳אז', greek: 'Χιτζάζ',
      mood: 'עמוק, מזרחי, נוסטלגי — הדרומוס הנפוץ ביותר ברבטיקו',
      color: '#e0884a',
      scale: { frets: [0,1,4,5,7,8,10,12], note: 'הקפיצה מי♭→פה# (סריג 1→4) היא הצבע הייחודי' },
      phrase: {
        title: 'פראזת פתיחה קלאסית',
        frets: [0,1,4,5,4,1,0],
        desc: 'עלייה עד הקווינטה וחזרה — הפתיחה של אינספור טקסימים'
      },
      chords: { progression: ['Dm','A7','Dm','Gm','A7','Dm'], desc: 'Dm → A7 → Dm — הבסיס; הוסיפו Gm לצבע' },
      picking: { name: 'חסאפיקו', pattern: ['D','u','d','u'], stepsPerBeat: 2, bpm: 80 },
      song: { name: 'Misirlou', artist: 'מסורתי', bpm: 96, prog: 'Dm → A7 → Dm → Gm → A7 → Dm',
              tab: [0,1,4,1,4,5,4,1], tip: 'הניגון הראשי בטרמולו על מיתר D' }
    },
    {
      id: 'ousak', name: 'אוסאק', greek: 'Ουσάκ',
      mood: 'עגום, אינטרוספקטיבי, "בכי פנימי" — דרומוס של אהבה אבודה',
      color: '#7b9ee0',
      scale: { frets: [0,1,3,5,7,8,10,12], note: 'מי♭ ופה טבעי (סריג 1 ו-3) — רך יותר מחיג׳אז' },
      phrase: {
        title: 'פראזה אופיינית',
        frets: [0,1,3,1,0,3,5,3,1,0],
        desc: 'גלים סביב המי♭ — תחושת "אנחה"'
      },
      chords: { progression: ['Dm','Gm','A7','Dm'], desc: 'Dm → Gm → A7 → Dm — מינורי ועצוב' },
      picking: { name: 'חסאפיקו', pattern: ['D','-','d','u'], stepsPerBeat: 2, bpm: 84 },
      song: { name: 'Frankosyriani', artist: 'Markos Vamvakaris', bpm: 100, prog: 'Am → Dm → E7 → Am',
              tab: [0,1,3,1,0,3,5], tip: 'הקפיצה בין Am ל-Dm היא לב השיר' }
    },
    {
      id: 'rast', name: 'ראסט', greek: 'Ραστ',
      mood: 'בהיר, חגיגי, אופטימי — המקביל היווני לסולם מז׳ור. הסולם הראשון ללמוד',
      color: '#e3b341',
      scale: { frets: [0,2,4,5,7,9,10,12], note: '"הלשון האם" של הבוזוקי — בהיר וטבעי' },
      phrase: {
        title: 'פראזה עם דו טבעי',
        frets: [9,10,9,7,5,4,2,0],
        desc: 'ירידה מהאוקטבה — הדו הטבעי (סריג 10) נותן את הצבע'
      },
      chords: { progression: ['D','G','A7','D'], desc: 'D → G → A7 → D — מז׳ור קלאסי' },
      picking: { name: 'סירטוס', pattern: ['D','u','D','u','d','u','d','u'], stepsPerBeat: 2, bpm: 130 },
      song: { name: 'Pote Tha Xanalampsei', artist: 'מסורתי', bpm: 100, prog: 'D → G → A7 → D → Bm → Em → A7 → D',
              tab: [0,2,4,5,4,2,0], tip: 'שיר "בהיר" — ראסט מז׳ור' }
    },
    {
      id: 'minore', name: 'מינורה', greek: 'Μινόρε',
      mood: 'כהה אבל לא ייאוש — "מינור עם תקווה" בגלל הסי טבעי. אמביוולנטי',
      color: '#9d8ec0',
      scale: { frets: [0,2,3,5,7,9,10,12], note: 'דוריאן — הסי טבעי (סריג 9) שובר את העצב' },
      phrase: {
        title: 'פראזה דוריאנית',
        frets: [7,9,10,9,7,5,3,2,0],
        desc: 'הסי הטבעי (סריג 9) הוא הסימן המובהק'
      },
      chords: { progression: ['Dm','G','Dm','Em7b5','A7','Dm'], desc: 'Dm → G → Dm — דוריאן סטנדרטי' },
      picking: { name: 'זאימבקיקו', pattern: ['D','-','-','d','u','D','-','u','-'], stepsPerBeat: 1, bpm: 60 },
      song: { name: 'Synnefiasmeni Kyriaki', artist: 'Vasilis Tsitsanis', bpm: 64, prog: 'Am → E7 → Am → Dm → E7 → Am',
              tab: [0,2,3,5,3,2,0], tip: 'זאימבקיקו איטי וכבד — "קדוש"' }
    },
    {
      id: 'kiourdi', name: 'קיורדי', greek: 'Κιουρδί',
      mood: 'כהה, "חלק" — מינור טבעי. נשמע מוכר לאוזן מערבית',
      color: '#6b8caf',
      scale: { frets: [0,2,3,5,7,8,10,12], note: 'מינור טבעי — סי♭ (סריג 8) במקום סי' },
      phrase: {
        title: 'פראזה אופיינית',
        frets: [7,8,7,5,3,2,0],
        desc: 'ירידה מהסי♭ — "חלקה" ומוכרת'
      },
      chords: { progression: ['Dm','Gm','Dm','A7','Dm'], desc: 'Dm → Gm → Dm → A7 → Dm' },
      picking: { name: 'זאימבקיקו', pattern: ['D','-','-','d','u','D','-','u','-'], stepsPerBeat: 1, bpm: 66 },
      song: { name: 'Agapousa', artist: 'מסורתי', bpm: 82, prog: 'Am → Dm → G → Am → E7 → Am',
              tab: [0,2,3,5,3,2,0], tip: 'מינור טבעי — קל לאוזן המערבית' }
    },
    {
      id: 'niavent', name: 'ניאוונט', greek: 'Νιαβέντ',
      mood: 'אקזוטי, "מרחוק", רב-צבעי — ייחודי מאוד',
      color: '#c265a0',
      scale: { frets: [0,2,3,6,7,8,10,12], note: 'הסול# (סריג 6) — שניה מוגברת בין פה לסול#' },
      phrase: {
        title: 'פראזה אקזוטית',
        frets: [3,6,7,6,3,2,0],
        desc: 'הקפיצה פה→סול# (סריג 3→6) היא הצבע האוריינטלי'
      },
      chords: { progression: ['Dm','E7','Am','E7','Dm'], desc: 'Dm → E7 → Am — אוריינטלי מאוד' },
      picking: { name: 'צ׳יפטטלי', pattern: ['D','-','u','-','D','-','u','d'], stepsPerBeat: 2, bpm: 90 },
      song: { name: 'Misirlou (גרסת ניאוונט)', artist: 'מסורתי', bpm: 96, prog: 'Dm → A → Dm',
              tab: [0,2,3,6,3,2,0], tip: 'הסול# נותן את הצליל ה"מסתורי"' }
    }
  ];

  const STAGES = [
    { id: 'scale',   icon: '🎼', label: 'הסולם',   sub: 'הכירו את הצלילים' },
    { id: 'phrase',  icon: '🎶', label: 'הפראזה',  sub: 'הביטוי האופייני' },
    { id: 'chords',  icon: '🎸', label: 'האקורדים', sub: 'הליווי ההרמוני' },
    { id: 'picking', icon: '🤘', label: 'הפריטה',  sub: 'יד ימין' },
    { id: 'song',    icon: '🎵', label: 'השיר',    sub: 'מחברים הכל' },
  ];

  /* ---------- מצב ---------- */
  let currentPath = null, currentStageIdx = 0;
  let mic = { stream: null, ctx: null, analyser: null, timer: null };
  const PROGRESS_KEY = 'modus-path-progress';

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch { return {}; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch {}
  }
  function markStageDone(pathId, stageId) {
    const p = loadProgress();
    p[pathId] = p[pathId] || {};
    p[pathId][stageId] = true;
    saveProgress(p);
  }
  function isStageDone(pathId, stageId) {
    const p = loadProgress();
    return !!(p[pathId] && p[pathId][stageId]);
  }
  function pathCompletion(pathId) {
    const p = loadProgress()[pathId] || {};
    return STAGES.filter(s => p[s.id]).length;
  }

  /* ---------- מיקרופון משותף ---------- */
  async function ensureMic() {
    if (mic.stream) return true;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      mic.stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      mic.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const src = mic.ctx.createMediaStreamSource(mic.stream);
      mic.analyser = mic.ctx.createAnalyser();
      mic.analyser.fftSize = 2048;
      AudioEngine.micBoost(src).connect(mic.analyser);
      return true;
    } catch { return false; }
  }
  function stopMic() {
    if (mic.timer) { clearInterval(mic.timer); mic.timer = null; }
    if (mic.stream) { mic.stream.getTracks().forEach(t => t.stop()); mic.stream = null; }
    if (mic.ctx) { mic.ctx.close(); mic.ctx = null; }
    mic.analyser = null;
  }

  /* ---------- נגן ביטוי/סולם ---------- */
  function playFrets(frets, gapMs = 380) {
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    const t0 = AudioEngine.ctx.currentTime + 0.05;
    frets.forEach((f, i) => {
      AudioEngine.pluckMidi(D_OPEN + f, t0 + i * (gapMs / 1000), 0.5);
    });
  }

  /* ---------- מאזין לרצף תווים (סולם/פראזה) ---------- */
  function listenSequence(frets, onProgress, onDone) {
    const targets = frets.map(f => ((D_OPEN + f) % 12));
    let idx = 0, stablePc = null, stableCount = 0, lastReg = 0, lastPc = null;
    const buf = new Float32Array(mic.analyser.fftSize);

    mic.timer = setInterval(() => {
      if (!mic.analyser) return;
      mic.analyser.getFloatTimeDomainData(buf);
      const { freq, rms } = (typeof Listen !== 'undefined') ? Listen.detectPitch(buf, mic.ctx.sampleRate) : { freq: null, rms: 0 };
      const vu = document.getElementById('mp-vu-fill'); if (vu) vu.style.width = Math.min(100, rms * 500) + '%';
      if (!freq) { stablePc = null; stableCount = 0; return; }
      const pc = ((Math.round(69 + 12 * Math.log2(freq / 440)) % 12) + 12) % 12;
      if (pc === stablePc) stableCount++; else { stablePc = pc; stableCount = 1; }
      const now = performance.now();
      if (stableCount >= 3 && now - lastReg > 180 && pc !== lastPc) {
        lastReg = now; lastPc = pc;
        if (pc === targets[idx]) {
          onProgress(idx + 1, targets.length, true, midiName(D_OPEN + frets[idx]));
          idx++;
          if (idx >= targets.length) { clearInterval(mic.timer); mic.timer = null; onDone(); }
        } else {
          onProgress(idx, targets.length, false, midiName(pc - ((D_OPEN)%12) + (D_OPEN%12)) || NN[pc]);
        }
      }
    }, 30);
  }

  /* ---------- מאזין לפריטה (onset + כיוון) ---------- */
  function listenPicking(pattern, stepsPerBeat, bpm, onHit, onDone) {
    const strokes = pattern.filter(s => s !== '-');
    let idx = 0, prevRms = 0, lastHit = 0, hits = 0, correct = 0;
    const buf = new Float32Array(mic.analyser.fftSize);
    const target = strokes.length * 2; // 2 loops

    mic.timer = setInterval(() => {
      if (!mic.analyser) return;
      mic.analyser.getFloatTimeDomainData(buf);
      let rms = 0;
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / buf.length);
      const vu = document.getElementById('mp-vu-fill'); if (vu) vu.style.width = Math.min(100, rms * 500) + '%';
      const ms = performance.now();
      if (rms > 0.035 && rms > prevRms * 1.6 && ms - lastHit > 90) {
        lastHit = ms;
        // כיוון ספקטרלי
        const fd = new Uint8Array(mic.analyser.frequencyBinCount);
        mic.analyser.getByteFrequencyData(fd);
        const bHz = mic.ctx.sampleRate / (2 * mic.analyser.frequencyBinCount);
        let ls = 0, hs = 0;
        for (let i = Math.floor(200/bHz); i <= Math.floor(420/bHz); i++) ls += fd[i];
        for (let i = Math.floor(440/bHz); i <= Math.floor(700/bHz); i++) hs += fd[i];
        const dir = (ls / (hs + 1)) > 1.2 ? 'd' : 'u';
        const expected = strokes[idx % strokes.length].toLowerCase();
        hits++;
        const ok = dir === expected;
        if (ok) correct++;
        onHit(idx % strokes.length, ok, dir);
        idx++;
        if (idx >= target) { clearInterval(mic.timer); mic.timer = null; onDone(correct, hits); }
      }
      prevRms = rms * 0.7 + prevRms * 0.3;
    }, 12);
  }

  /* ---------- רינדור מסך בחירה ---------- */
  function renderHome() {
    const app = document.getElementById('modus-path-app');
    if (!app) return;
    app.innerHTML = `
      <p class="mp-intro">בחרו דרומוס והתקדמו ב-5 תחנות: <b>סולם → פראזה → אקורדים → פריטה → שיר</b>.
      בכל תחנה האפליקציה מאזינה ובודקת אתכם. <b>כל שיר יווני = מודוס + אקורדים + פריטה.</b></p>
      <div class="mp-path-grid">
        ${PATHS.map(p => {
          const done = pathCompletion(p.id);
          return `<button class="mp-path-card" data-id="${p.id}" style="border-color:${p.color}">
            <div class="mp-path-name" style="color:${p.color}">${p.name} <span class="mp-path-greek">${p.greek}</span></div>
            <div class="mp-path-mood">${p.mood}</div>
            <div class="mp-path-prog">
              ${STAGES.map(s => `<span class="mp-dot ${isStageDone(p.id, s.id) ? 'done' : ''}" style="${isStageDone(p.id,s.id)?`background:${p.color};border-color:${p.color}`:''}" title="${s.label}">${s.icon}</span>`).join('')}
              <span class="mp-prog-txt">${done}/5</span>
            </div>
          </button>`;
        }).join('')}
      </div>
    `;
    app.querySelectorAll('.mp-path-card').forEach(c => {
      c.addEventListener('click', () => openPath(c.dataset.id));
    });
  }

  function openPath(id) {
    currentPath = PATHS.find(p => p.id === id);
    if (!currentPath) return;
    // עבור לתחנה הראשונה שלא הושלמה
    currentStageIdx = STAGES.findIndex(s => !isStageDone(id, s.id));
    if (currentStageIdx < 0) currentStageIdx = 0;
    renderStage();
  }

  function renderStage() {
    stopMic();
    const app = document.getElementById('modus-path-app');
    if (!app || !currentPath) return;
    const p = currentPath;
    const stage = STAGES[currentStageIdx];

    app.innerHTML = `
      <div class="mp-stage-head">
        <button class="mp-back" id="mp-back">← כל הדרומוסים</button>
        <div class="mp-stage-title" style="color:${p.color}">${p.name} · ${stage.icon} ${stage.label}</div>
      </div>
      <div class="mp-stepper">
        ${STAGES.map((s, i) => `<div class="mp-step ${i === currentStageIdx ? 'active' : ''} ${isStageDone(p.id, s.id) ? 'done' : ''}"
          data-idx="${i}" style="${i===currentStageIdx?`border-color:${p.color}`:''}">
          <span class="mp-step-ico">${s.icon}</span><span class="mp-step-lbl">${s.label}</span>
        </div>`).join('')}
      </div>
      <div class="mp-meter"><span>🎤</span><div class="mp-vu"><div class="mp-vu-fill" id="mp-vu-fill"></div></div><span id="mp-feedback" class="mp-feedback"></span></div>
      <div class="mp-stage-body" id="mp-stage-body"></div>
    `;

    document.getElementById('mp-back').addEventListener('click', () => { stopMic(); renderHome(); });
    app.querySelectorAll('.mp-step').forEach(st => {
      st.addEventListener('click', () => { currentStageIdx = parseInt(st.dataset.idx, 10); renderStage(); });
    });

    const renderers = { scale: renderScale, phrase: renderPhrase, chords: renderChords, picking: renderPicking, song: renderSong };
    renderers[stage.id]();
  }

  function tabSvg(frets, color) {
    const w = Math.max(220, frets.length * 40 + 40), h = 60;
    const cells = frets.map((f) => {
      const x = 30 + frets.indexOf(f) * 40;
      return `<circle cx="${x}" cy="28" r="13" fill="${color}22" stroke="${color}"/><text x="${x}" y="33" text-anchor="middle" fill="${color}" font-size="13" font-weight="700">${f}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${w} ${h}" class="mp-tab-svg" dir="ltr">
      <line x1="15" y1="28" x2="${w-15}" y2="28" stroke="var(--line,#444)" stroke-width="1"/>
      <text x="6" y="32" fill="var(--text-dim)" font-size="11">D (מיתר 1)</text>
      ${cells}
    </svg>`;
  }

  function mountNeck(host, frets, color, phraseFrets) {
    if (!host || typeof FretboardScale === 'undefined') return;
    FretboardScale.mountWithPositions(host, {
      frets: phraseFrets ? (frets.length ? frets : phraseFrets) : frets,
      phraseFrets,
      color: color || '#e3b341',
      bases: [0, 2, 5, 7, 9],
      pathLabels: !!phraseFrets,
    });
  }

  function feedback(msg, cls) {
    const el = document.getElementById('mp-feedback');
    if (el) { el.textContent = msg; el.className = 'mp-feedback ' + (cls || ''); }
  }

  function stageNav(canAdvance) {
    const p = currentPath;
    const isLast = currentStageIdx >= STAGES.length - 1;
    return `<div class="mp-stage-nav">
      <button class="btn mp-done-btn" id="mp-mark-done" style="background:${p.color};color:#111">✓ סמן כהושלם${isLast ? ' — סיימתי!' : ' והמשך →'}</button>
    </div>`;
  }

  function wireNav() {
    const btn = document.getElementById('mp-mark-done');
    if (btn) btn.addEventListener('click', () => {
      markStageDone(currentPath.id, STAGES[currentStageIdx].id);
      stopMic();
      if (currentStageIdx < STAGES.length - 1) { currentStageIdx++; renderStage(); }
      else { renderHome(); }
    });
  }

  /* ----- תחנה 1: סולם ----- */
  function renderScale() {
    const p = currentPath, body = document.getElementById('mp-stage-body');
    const notes = p.scale.frets.map(f => midiName(D_OPEN + f));
    body.innerHTML = `
      <div class="mp-note">💡 ${p.scale.note}</div>
      <div class="mp-neck-host" id="mp-neck-host"></div>
      <p class="hint">כל הנקודות = צלילי הסולם על כל 4 המיתרים · הקו המקווקו = מסלול בפוזיציה</p>
      ${tabSvg(p.scale.frets, p.color)}
      <div class="mp-note-names">${p.scale.frets.map((f,i) => `<span style="color:${p.color}">${notes[i]}</span>`).join(' · ')}</div>
      <div class="mp-btn-row">
        <button class="btn gold" id="mp-play">🔊 שמעו את הסולם</button>
        <button class="btn" id="mp-listen">🎤 תרגלו — האפליקציה מאזינה</button>
      </div>
      <div class="mp-listen-status" id="mp-listen-status"></div>
      ${stageNav()}
    `;
    mountNeck(document.getElementById('mp-neck-host'), p.scale.frets, p.color);
    document.getElementById('mp-play').addEventListener('click', () => playFrets([...p.scale.frets, ...[...p.scale.frets].reverse().slice(1)]));
    document.getElementById('mp-listen').addEventListener('click', () => startScaleListen(p.scale.frets));
    wireNav();
  }

  async function startScaleListen(frets) {
    const ok = await ensureMic();
    if (!ok) { feedback('אין גישה למיקרופון', 'err'); return; }
    const status = document.getElementById('mp-listen-status');
    const seq = [...frets, ...[...frets].reverse().slice(1)];
    status.innerHTML = `<div class="mp-seq">${seq.map((f,i) => `<span class="mp-seq-note" id="mp-seq-${i}">${midiName(D_OPEN+f)}</span>`).join('')}</div>`;
    feedback('נגנו את הסולם תו-תו ↑↓', '');
    listenSequence(seq,
      (done, total, hit, name) => {
        if (hit) { const el = document.getElementById('mp-seq-' + (done-1)); if (el) el.classList.add('hit'); feedback(`✓ ${name}`, 'ok'); }
      },
      () => { feedback('🏆 הסולם נוגן נקי!', 'ok'); markStageDone(currentPath.id, 'scale'); refreshSteps();
        if (typeof SkillStats !== 'undefined') SkillStats.record('scale', currentPath.id, true); }
    );
  }

  /* ----- תחנה 2: פראזה ----- */
  function renderPhrase() {
    const p = currentPath, body = document.getElementById('mp-stage-body');
    body.innerHTML = `
      <div class="mp-sub-title">${p.phrase.title}</div>
      <div class="mp-note">💡 ${p.phrase.desc}</div>
      <div class="mp-neck-host" id="mp-neck-host"></div>
      <p class="hint">סולם מלא על כל המיתרים · המספרים = פראזה על מיתר D</p>
      ${tabSvg(p.phrase.frets, p.color)}
      <div class="mp-btn-row">
        <button class="btn gold" id="mp-play">🔊 שמעו את הפראזה</button>
        <button class="btn" id="mp-listen">🎤 נגנו אותה</button>
      </div>
      <div class="mp-listen-status" id="mp-listen-status"></div>
      ${stageNav()}
    `;
    mountNeck(document.getElementById('mp-neck-host'), p.scale.frets, p.color, p.phrase.frets);
    document.getElementById('mp-play').addEventListener('click', () => playFrets(p.phrase.frets, 320));
    document.getElementById('mp-listen').addEventListener('click', () => startPhraseListen(p.phrase.frets));
    wireNav();
  }

  async function startPhraseListen(frets) {
    const ok = await ensureMic();
    if (!ok) { feedback('אין גישה למיקרופון', 'err'); return; }
    const status = document.getElementById('mp-listen-status');
    status.innerHTML = `<div class="mp-seq">${frets.map((f,i) => `<span class="mp-seq-note" id="mp-seq-${i}">${midiName(D_OPEN+f)}</span>`).join('')}</div>`;
    feedback('נגנו את הפראזה', '');
    listenSequence(frets,
      (done, total, hit, name) => { if (hit) { const el = document.getElementById('mp-seq-' + (done-1)); if (el) el.classList.add('hit'); feedback(`✓ ${name}`, 'ok'); } },
      () => { feedback('🏆 פראזה מושלמת!', 'ok'); markStageDone(currentPath.id, 'phrase'); refreshSteps(); }
    );
  }

  /* ----- תחנה 3: אקורדים ----- */
  function renderChords() {
    const p = currentPath, body = document.getElementById('mp-stage-body');
    body.innerHTML = `
      <div class="mp-note">💡 ${p.chords.desc}</div>
      <div class="mp-chord-flow">
        ${p.chords.progression.map((c,i) => `
          <span class="mp-chord" data-chord="${c}" style="border-color:${p.color}">${c}</span>
          ${i < p.chords.progression.length-1 ? '<span class="mp-arrow">→</span>' : ''}
        `).join('')}
      </div>
      <div class="mp-btn-row">
        <button class="btn gold" id="mp-play-prog">🔊 שמעו את הרצף</button>
      </div>
      <div class="mp-chord-diagram" id="mp-chord-diagram"></div>
      <div class="mp-chord-hint">לחצו על אקורד לשמיעה ולדיאגרמת אחיזה</div>
      ${stageNav()}
    `;
    body.querySelectorAll('.mp-chord').forEach(el => el.addEventListener('click', () => {
      playChord(el.dataset.chord);
      body.querySelectorAll('.mp-chord').forEach(c => c.classList.remove('sel'));
      el.classList.add('sel');
      if (typeof ChordTooltip !== 'undefined') ChordTooltip.renderInto('#mp-chord-diagram', el.dataset.chord);
    }));
    document.getElementById('mp-play-prog').addEventListener('click', () => {
      p.chords.progression.forEach((c, i) => setTimeout(() => playChord(c), i * 900));
    });
    if (typeof ChordTooltip !== 'undefined') ChordTooltip.bindContainer(body);
    wireNav();
  }

  function playChord(name) {
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    const m = name.match(/^([A-G]#?b?)(.*)$/);
    if (!m) return;
    const rootName = m[1].replace('b', '');
    let root = NN.indexOf(m[1]);
    if (root < 0) root = NN.indexOf(rootName);
    if (root < 0) {
      const map = { 'A':9,'B':11,'C':0,'D':2,'E':4,'F':5,'G':7 };
      root = map[m[1][0]] ?? 0;
      if (m[1].includes('#')) root++;
      if (m[1].includes('b')) root--;
      root = ((root%12)+12)%12;
    }
    const suffix = m[2];
    const intervals = suffix.startsWith('m') && !suffix.startsWith('maj') ? (suffix.includes('7') ? [0,3,7,10] : [0,3,7])
      : suffix.includes('7b5') ? [0,3,6,10]
      : suffix.includes('7') ? [0,4,7,10]
      : [0,4,7];
    const base = 50 + root;
    const t = AudioEngine.ctx.currentTime;
    intervals.forEach((iv, i) => AudioEngine.pluckMidi(base + iv, t + i * 0.05, 0.6));
  }

  /* ----- תחנה 4: פריטה ----- */
  function renderPicking() {
    const p = currentPath, body = document.getElementById('mp-stage-body');
    const pat = p.picking;
    body.innerHTML = `
      <div class="mp-sub-title">${pat.name} · ${pat.bpm} BPM</div>
      <div class="mp-stroke-strip" dir="ltr">
        ${pat.pattern.map((s,i) => {
          const isRest = s === '-';
          return `<span class="mp-stroke ${isRest?'rest':''}" id="mp-stroke-${i}" data-dir="${s.toLowerCase()}">${isRest?'·':(s.toLowerCase()==='d'?'↓':'↑')}</span>`;
        }).join('')}
      </div>
      <div class="mp-note">💡 פרטו על מיתר מושתק (יד שמאל מרפה) — האפליקציה מזהה כיוון פריטה</div>
      <div class="mp-btn-row">
        <button class="btn gold" id="mp-play-pat">🔊 שמעו תבנית</button>
        <button class="btn" id="mp-listen-pat">🎤 פרטו יחד</button>
      </div>
      <div class="mp-listen-status" id="mp-listen-status"></div>
      ${stageNav()}
    `;
    document.getElementById('mp-play-pat').addEventListener('click', () => playPattern(pat));
    document.getElementById('mp-listen-pat').addEventListener('click', () => startPickingListen(pat));
    wireNav();
  }

  function playPattern(pat) {
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    const beat = 60 / pat.bpm, stepDur = beat / pat.stepsPerBeat;
    const t0 = AudioEngine.ctx.currentTime + 0.1;
    pat.pattern.forEach((s, i) => {
      if (s === '-') return;
      const accent = s === s.toUpperCase();
      AudioEngine.strum?.(0, s.toLowerCase(), accent) ;
      AudioEngine.pluckMidi(D_OPEN, t0 + i * stepDur, accent ? 0.6 : 0.4);
    });
  }

  async function startPickingListen(pat) {
    const ok = await ensureMic();
    if (!ok) { feedback('אין גישה למיקרופון', 'err'); return; }
    feedback('פרטו בקצב ' + pat.name, '');
    listenPicking(pat.pattern, pat.stepsPerBeat, pat.bpm,
      (idx, isOk, dir) => {
        const el = document.getElementById('mp-stroke-' + pat.pattern.map((s,i)=>s!=='-'?i:-1).filter(i=>i>=0)[idx]);
        if (el) { el.classList.add(isOk ? 'ok' : 'wrong'); setTimeout(() => el.classList.remove('ok','wrong'), 400); }
        feedback(isOk ? `✓ ${dir==='d'?'↓':'↑'}` : `✗ כיוון`, isOk ? 'ok' : 'err');
        if (typeof SkillStats !== 'undefined') SkillStats.record('picking-dir', dir, isOk);
      },
      (correct, total) => {
        const pct = Math.round(correct/total*100);
        feedback(`${pct}% נכון`, pct >= 70 ? 'ok' : 'err');
        if (typeof SkillStats !== 'undefined') SkillStats.recordScore('picking', 'timing', pct);
        if (pct >= 70) { markStageDone(currentPath.id, 'picking'); refreshSteps(); }
      }
    );
  }

  /* ----- תחנה 5: שיר ----- */
  function renderSong() {
    const p = currentPath, body = document.getElementById('mp-stage-body'), s = p.song;
    body.innerHTML = `
      <div class="mp-sub-title">🎵 ${s.name}</div>
      <div class="mp-song-meta">${s.artist} · ${s.bpm} BPM · דרומוס ${p.name}</div>
      <div class="mp-song-prog" style="border-color:${p.color}">אקורדים: ${s.prog}</div>
      <div class="mp-sub-title2">הניגון הראשי</div>
      ${tabSvg(s.tab, p.color)}
      <div class="mp-note">💡 ${s.tip}</div>
      <div class="mp-recap" style="border-color:${p.color}">
        <b>סיכום הנתיב:</b> למדתם את <b>סולם ${p.name}</b>, את הפראזה האופיינית,
        את רצף האקורדים <b>${p.chords.progression.slice(0,3).join(' → ')}</b>,
        ואת פריטת ה<b>${p.picking.name}</b> — וחיברתם הכל בשיר <b>${s.name}</b>. זו השיטה: מודוס → אקורדים → פריטה → שיר.
      </div>
      <div class="mp-btn-row">
        <button class="btn gold" id="mp-play-song">🔊 שמעו את הניגון</button>
        ${typeof SongLibrary !== 'undefined' ? '<button class="btn" id="mp-find-song">🔎 חפשו ב-YouTube</button>' : ''}
      </div>
      ${stageNav()}
    `;
    document.getElementById('mp-play-song').addEventListener('click', () => playFrets(s.tab, 300));
    const fb = document.getElementById('mp-find-song');
    if (fb) fb.addEventListener('click', () => {
      const sl = document.querySelector('[data-screen="song-learn"]');
      if (sl) { sl.click(); setTimeout(() => { const inp = document.getElementById('sl-yt-search'); if (inp) { inp.value = s.name + ' bouzouki'; inp.focus(); } }, 200); }
    });
    wireNav();
  }

  function refreshSteps() {
    // עדכון נקודות ההתקדמות בלי רינדור מלא
    STAGES.forEach((s, i) => {
      const el = document.querySelector(`.mp-step[data-idx="${i}"]`);
      if (el && isStageDone(currentPath.id, s.id)) el.classList.add('done');
    });
  }

  /* ---------- אתחול ---------- */
  function init() {
    if (!document.getElementById('modus-path-app')) return;
    injectStyles();
    renderHome();
  }
  function stop() { stopMic(); }

  function injectStyles() {
    if (document.getElementById('mp-styles')) return;
    const st = document.createElement('style');
    st.id = 'mp-styles';
    st.textContent = `
      .mp-intro { font-size:14px; color:var(--text,#eee); background:var(--bg-card,#1a1a2e); border-radius:10px; padding:12px 16px; border-right:3px solid var(--gold,#e3b341); margin-bottom:16px; }
      .mp-path-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; }
      .mp-path-card { text-align:right; background:var(--bg-card,#1a1a2e); border:2px solid; border-radius:14px; padding:14px; cursor:pointer; transition:transform .1s; }
      .mp-path-card:hover { transform:translateY(-3px); }
      .mp-path-name { font-size:20px; font-weight:800; }
      .mp-path-greek { font-size:13px; opacity:.6; font-weight:400; }
      .mp-path-mood { font-size:12px; color:var(--text-dim,#999); margin:6px 0 10px; line-height:1.4; }
      .mp-path-prog { display:flex; align-items:center; gap:5px; }
      .mp-dot { width:24px; height:24px; border-radius:50%; border:1px solid var(--line,#444); display:flex; align-items:center; justify-content:center; font-size:12px; filter:grayscale(1) opacity(.5); }
      .mp-dot.done { filter:none; }
      .mp-prog-txt { margin-right:auto; font-size:12px; color:var(--text-dim,#999); }
      .mp-stage-head { display:flex; align-items:center; gap:12px; margin-bottom:12px; flex-wrap:wrap; }
      .mp-back { background:none; border:none; color:var(--aegean,#4fb3d9); cursor:pointer; font:inherit; font-size:13px; }
      .mp-stage-title { font-size:20px; font-weight:800; }
      .mp-stepper { display:flex; gap:6px; margin-bottom:14px; overflow-x:auto; }
      .mp-step { flex:1; min-width:70px; text-align:center; padding:8px 4px; border-radius:10px; border:2px solid var(--line,#333); background:var(--bg-card,#1a1a2e); cursor:pointer; opacity:.6; transition:opacity .2s; }
      .mp-step.active { opacity:1; }
      .mp-step.done { opacity:1; background:var(--bg-elev,#222); }
      .mp-step.done::after { content:'✓'; color:var(--ok,#27ae60); font-size:11px; display:block; }
      .mp-step-ico { font-size:18px; display:block; }
      .mp-step-lbl { font-size:11px; color:var(--text,#eee); }
      .mp-meter { display:flex; align-items:center; gap:10px; margin:10px 0; }
      .mp-vu { flex:1; height:10px; background:var(--bg-elev,#222); border-radius:5px; overflow:hidden; }
      .mp-vu-fill { height:100%; width:0%; background:var(--gold,#e3b341); transition:width .05s; }
      .mp-feedback { min-width:90px; font-size:14px; font-weight:600; }
      .mp-feedback.ok { color:var(--ok,#27ae60); } .mp-feedback.err { color:var(--accent-red,#e74c3c); }
      .mp-note { font-size:13px; color:var(--text,#eee); background:rgba(255,255,255,.03); border-radius:8px; padding:8px 12px; margin:10px 0; }
      .mp-sub-title { font-size:16px; font-weight:700; margin:6px 0; color:var(--gold,#e3b341); }
      .mp-sub-title2 { font-size:14px; font-weight:600; margin:12px 0 4px; color:var(--text-dim,#999); }
      .mp-tab-svg { max-width:100%; height:60px; margin:8px 0; }
      .mp-note-names { font-size:14px; font-weight:600; text-align:center; margin:6px 0; direction:ltr; }
      .mp-btn-row { display:flex; gap:8px; flex-wrap:wrap; margin:12px 0; }
      .mp-seq { display:flex; flex-wrap:wrap; gap:5px; margin:10px 0; direction:ltr; }
      .mp-seq-note { padding:5px 9px; border-radius:7px; background:var(--bg-elev,#222); border:1px solid var(--line,#333); font-size:13px; color:var(--text-dim,#999); }
      .mp-seq-note.hit { background:var(--ok,#27ae60); color:#fff; border-color:var(--ok,#27ae60); }
      .mp-chord-flow { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:14px 0; direction:ltr; justify-content:center; }
      .mp-chord { padding:10px 16px; border:2px solid; border-radius:10px; font-size:18px; font-weight:700; color:var(--text,#eee); cursor:pointer; background:var(--bg-card,#1a1a2e); }
      .mp-chord:hover { background:var(--bg-elev,#222); }
      .mp-chord.sel { background:var(--gold,#e3b341); color:#111; }
      .mp-arrow { color:var(--text-dim,#999); }
      .mp-chord-diagram { display:flex; justify-content:center; min-height:0; margin:6px 0; }
      .mp-chord-diagram:not(:empty) { min-height:170px; align-items:center; }
      .mp-chord-hint { font-size:12px; color:var(--text-dim,#999); text-align:center; margin:8px 0; }
      .mp-stroke-strip { display:flex; gap:5px; flex-wrap:wrap; margin:12px 0; justify-content:center; }
      .mp-stroke { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:8px; font-size:18px; font-weight:700; background:var(--bg-elev,#222); border:1px solid var(--line,#333); color:var(--text,#eee); }
      .mp-stroke.rest { color:var(--text-dim,#555); }
      .mp-stroke.ok { background:var(--ok,#27ae60); color:#fff; }
      .mp-stroke.wrong { background:var(--accent-red,#e74c3c); color:#fff; }
      .mp-song-meta { font-size:13px; color:var(--text-dim,#999); margin-bottom:8px; }
      .mp-song-prog { font-size:14px; font-weight:600; padding:8px 12px; border:1px solid; border-radius:8px; margin:8px 0; direction:ltr; }
      .mp-recap { font-size:13px; line-height:1.6; padding:12px 16px; border:1px solid; border-radius:10px; margin:14px 0; background:rgba(255,255,255,.02); }
      .mp-stage-nav { margin-top:16px; }
      .mp-done-btn { font-weight:700; }
    `;
    document.head.appendChild(st);
  }

  return { init, stop };
})();
