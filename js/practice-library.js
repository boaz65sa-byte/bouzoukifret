/* ============================================================
   PracticeLibrary — ספריית תרגילים מעשית
   כל החומר המעשי במקום אחד:
   מקצבים (D/U/-) · תרגילי טרמולו · שירון
   כל מקצב נגן עם מטרונום מתכוונן.
   ============================================================ */
'use strict';

const PracticeLibrary = (() => {

  const D_OPEN = 74; // מיתר D פתוח

  /* ---------- 10 מקצבים יווניים ---------- */
  const RHYTHMS = [
    { id: 'zeibekiko', name: 'זאימבקיקו', greek: 'Ζεϊμπέκικο', meter: '9/4', sub: '3+2+2+2',
      pattern: ['D','-','-','d','u','D','-','u','-'], stepsPerBeat: 1, bpm: 60, bpmMin: 40, bpmMax: 72,
      accents: 'פעמות 1 ו-6 מודגשות', mistake: 'לספור 9 מתמטית במקום לחוש — הזאימבקיקו רגשי. לפרוט על השתיקות.',
      tip: 'חשבו "עמוק-עמוק-שקט" בכל מחזור. לעולם לא רץ.' },
    { id: 'hasapiko', name: 'חסאפיקו', greek: 'Χασάπικο', meter: '2/4', sub: 'בסיסי',
      pattern: ['D','u','d','u'], stepsPerBeat: 2, bpm: 80, bpmMin: 70, bpmMax: 140,
      accents: 'פעמה 1 חזקה, פעמה 2 חצי-חזקה', mistake: 'לפרוט ↓↑↓↑ בשווה — הראשונה צריכה לבלוט.',
      tip: 'היד "נועלת" על הפעמה הראשונה: BOOM-chick-chick-chick.' },
    { id: 'hasaposerviko', name: 'חסאפוסרביקו', greek: 'Χασαποσέρβικο', meter: '2/4', sub: 'מהיר',
      pattern: ['D','u','d','D','u','d'], stepsPerBeat: 3, bpm: 110, bpmMin: 100, bpmMax: 160,
      accents: 'כל קבוצת שלוש מתחילה ב-D', mistake: 'לאבד אחידות במהירות.',
      tip: 'תנועה קטנה מהשורש. זה כמעט סוסטה.' },
    { id: 'tsifteteli', name: 'צ׳יפטטלי', greek: 'Τσιφτετέλι', meter: '4/4', sub: 'ריקוד בטן',
      pattern: ['D','-','u','-','D','-','u','d'], stepsPerBeat: 2, bpm: 90, bpmMin: 60, bpmMax: 100,
      accents: 'פעמות 1 ו-3', mistake: 'לצעוד במקום לזרום — הצ׳יפטטלי "נשי" וגלי.',
      tip: 'דמיינו את תנועת הריקוד — גלים, לא פסיעות.' },
    { id: 'syrtos', name: 'סירטוס', greek: 'Συρτός', meter: '4/4', sub: 'ריקוד עם',
      pattern: ['D','u','D','u','d','u','d','u'], stepsPerBeat: 2, bpm: 130, bpmMin: 120, bpmMax: 160,
      accents: 'פעמות 1 ו-3', mistake: 'פריטה כבדה מדי — הסירטוס קליל ואוירי.',
      tip: '"ריקוד העם" — קליל ואוורירי.' },
    { id: 'kalamatianos', name: 'קלמטיאנוס', greek: 'Καλαματιανός', meter: '7/8', sub: '3+2+2',
      pattern: ['D','u','d','D','u','d','u'], stepsPerBeat: 1, bpm: 100, bpmMin: 80, bpmMax: 110,
      accents: 'פעמה 1 חזקה מאוד, פעמה 4 בינונית', mistake: 'לבלבל עם צ׳אם — בקלמטיאנוס הלב הארוך ראשון.',
      tip: '7/8 = לב ארוך (3) + שני קצרים (2+2). הארוך ראשון.' },
    { id: 'tsam', name: 'צ׳אם', greek: 'Τσάμικος', meter: '7/8', sub: '2+2+3',
      pattern: ['D','u','D','u','D','u','d'], stepsPerBeat: 1, bpm: 100, bpmMin: 80, bpmMax: 120,
      accents: 'פעמות 1, 3, 5', mistake: 'לנסות לספור ל-7 — ספרו "שני-שני-שלוש".',
      tip: 'הקבוצה של 3 בסוף — תחושה הפוכה מקלמטיאנוס.' },
    { id: 'ballos', name: 'בלוס', greek: 'Μπάλλος', meter: '2/4', sub: 'נסיפי',
      pattern: ['D','u','d','D','u','d'], stepsPerBeat: 3, bpm: 140, bpmMin: 120, bpmMax: 160,
      accents: 'פעמה 1', mistake: 'כבד מדי — הבלוס "קופץ".',
      tip: 'דמיינו כדור קטן שקופץ על הרצפה.' },
    { id: 'pentozalis', name: 'פנטוזאליס', greek: 'Πεντοζάλης', meter: '5/8', sub: '2+3',
      pattern: ['D','u','D','u','d'], stepsPerBeat: 1, bpm: 135, bpmMin: 120, bpmMax: 150,
      accents: 'פעמות 1 ו-3', mistake: 'לנסות "ליישר" את ה-5/8.',
      tip: 'מקצב כרתי שצולע מוזיקלית — זה המכוון.' },
    { id: 'sousta', name: 'סוסטה', greek: 'Σούστα', meter: '2/4', sub: 'מהיר מאוד',
      pattern: ['D','u','d','D','u','d'], stepsPerBeat: 3, bpm: 160, bpmMin: 150, bpmMax: 200,
      accents: 'פעמה 1', mistake: 'להגיע אליו מוקדם מדי — דורש חודשים.',
      tip: 'הפריטה המהירה ביותר. רק אחרי שהבסיס יציב.' },
  ];

  /* ---------- תרגילי טרמולו (4 שלבים) ---------- */
  const TREMOLO = [
    { stage: 1, title: 'שלב 1 — בסיס', weeks: 'שבועות 1–4', goal: '2-3 פריטות/שנייה ללא מאמץ',
      ex: ['D-U-D-U על מיתר D, 60 BPM', 'תנועה אחידה ללא עצירות', 'שורש כף היד מרחף על הגשר'] },
    { stage: 2, title: 'שלב 2 — מהירות', weeks: 'חודש 2–3', goal: '4 פריטות/שנייה',
      ex: ['אותה תנועה: 80 → 90 → 100 BPM', '"פרץ": 10 פריטות מהר, נוח 3 שניות, חזור', 'D-U × 4 → × 8 → × 16'] },
    { stage: 3, title: 'שלב 3 — אחידות', weeks: 'חודש 3–5', goal: '5-6 פריטות/שנייה, אחיד',
      ex: ['אין פריטה "חזקה" ואין "חלשה"', 'הקשיבו — הצליל צריך להיות "גלי"', 'קשת מהירות: 60→120 BPM, +5 כל 30 שניות'] },
    { stage: 4, title: 'שלב 4 — מלודיה', weeks: 'חודש 5+', goal: '6-8 פריטות/שנייה, נקי בשינוי מיתרים',
      ex: ['טרמולו תוך מעבר בין D ל-A', 'סולם ראסט בטרמולו — כל צליל 1-2 שניות', 'טאקסים: אילתור חופשי בטרמולו'] },
  ];

  /* ---------- שירון — 10 שירים ---------- */
  const SONGS = [
    { name: 'Misirlou', artist: 'מסורתי', dromos: 'חיג׳אז', bpm: '80-110', prog: 'Dm → A7 → Dm → Gm → A7 → Dm', rhythm: 'חסאפיקו', special: 'הניגון בטרמולו על מיתר D' },
    { name: 'Synnefiasmeni Kyriaki', artist: 'V. Tsitsanis', dromos: 'אוסאק/מינורה', bpm: '58-70', prog: 'Am → E7 → Am → Dm → E7 → Am', rhythm: 'זאימבקיקו', special: 'איטי וכבד — "קדוש"' },
    { name: 'Hasiklim', artist: 'מסורתי', dromos: 'חיג׳אז', bpm: '88-100', prog: 'Dm → Gm → A7 → Dm', rhythm: 'חסאפיקו', special: 'טרמולו על הניגון הראשי' },
    { name: 'Frankosyriani', artist: 'M. Vamvakaris', dromos: 'אוסאק', bpm: '90-110', prog: 'Am → Dm → E7 → Am', rhythm: 'חסאפיקו', special: 'הקפיצה Am↔Dm היא הלב' },
    { name: 'Apopse to Fengari', artist: 'מסורתי', dromos: 'אוסאק', bpm: '70-84', prog: 'Dm → Gm → A7 → Dm → Bb → C → Dm', rhythm: 'זאימבקיקו', special: 'מודולציה עדינה בגשר' },
    { name: 'Kaimos', artist: 'M. Vamvakaris', dromos: 'חיג׳אז', bpm: '60-72', prog: 'Dm → A7 → Dm → E7 → Am → A7 → Dm', rhythm: 'זאימבקיקו', special: 'רבטיקו קלאסי' },
    { name: 'Pote Tha Xanalampsei', artist: 'מסורתי', dromos: 'ראסט', bpm: '90-110', prog: 'D → G → A7 → D → Bm → Em → A7 → D', rhythm: 'סירטוס', special: 'שיר "בהיר" — ראסט מז׳ור' },
    { name: 'Minore tis Anatoliou', artist: 'מסורתי', dromos: 'חיג׳אז', bpm: '80-95', prog: 'Dm → E7 → Am → A7 → Dm', rhythm: 'חסאפיקו מהיר', special: '' },
    { name: 'Zorba (Συρτάκι)', artist: 'M. Theodorakis', dromos: 'ראסט/חיג׳אז', bpm: '90→160+', prog: 'Am → E7 → Am', rhythm: 'חסאפיקו→מהיר', special: 'המקצב מאיץ פי 2 בסיום' },
    { name: 'Agapousa', artist: 'מסורתי', dromos: 'קיורדי', bpm: '76-88', prog: 'Am → Dm → G → Am → E7 → Am', rhythm: 'זאימבקיקו', special: 'מינור טבעי' },
  ];

  /* ---------- נגן מקצב ---------- */
  let player = { scheduler: null, running: false, rhythmId: null };

  function playRhythm(r, bpm) {
    stopPlayer();
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    const ctx = AudioEngine.ctx;
    const beat = 60 / bpm;
    const stepDur = beat / r.stepsPerBeat;
    let step = 0;
    let nextTime = ctx.currentTime + 0.1;
    player.running = true;
    player.rhythmId = r.id;

    function schedule() {
      if (!player.running) return;
      while (nextTime < ctx.currentTime + 0.2) {
        const stroke = r.pattern[step % r.pattern.length];
        const beatPos = step % r.pattern.length;
        // מטרונום על תחילת המחזור
        if (beatPos === 0) AudioEngine.click?.(nextTime, true);
        if (stroke !== '-') {
          const accent = stroke === stroke.toUpperCase();
          AudioEngine.pluckMidi(D_OPEN, nextTime, accent ? 0.6 : 0.38);
          highlightStep(r.id, beatPos);
        }
        nextTime += stepDur;
        step++;
      }
      player.scheduler = setTimeout(schedule, 40);
    }
    schedule();
  }

  function highlightStep(rid, pos) {
    const el = document.getElementById(`rl-${rid}-step-${pos}`);
    if (!el) return;
    el.classList.add('playing');
    setTimeout(() => el.classList.remove('playing'), 150);
  }

  function stopPlayer() {
    player.running = false;
    if (player.scheduler) { clearTimeout(player.scheduler); player.scheduler = null; }
    player.rhythmId = null;
    document.querySelectorAll('.rl-play-btn.active').forEach(b => { b.classList.remove('active'); b.textContent = '▶ נגן'; });
  }

  /* ---------- UI ---------- */
  let activeTab = 'rhythms';

  function render() {
    const app = document.getElementById('practice-lib-app');
    if (!app) return;
    app.innerHTML = `
      <div class="pl-tabs">
        <button class="pl-tab ${activeTab==='rhythms'?'active':''}" data-tab="rhythms">🥁 מקצבים</button>
        <button class="pl-tab ${activeTab==='tremolo'?'active':''}" data-tab="tremolo">🎶 טרמולו</button>
        <button class="pl-tab ${activeTab==='songs'?'active':''}" data-tab="songs">🎵 שירון</button>
      </div>
      <div id="pl-content"></div>
    `;
    app.querySelectorAll('.pl-tab').forEach(t => t.addEventListener('click', () => {
      stopPlayer(); activeTab = t.dataset.tab; render();
    }));
    const c = document.getElementById('pl-content');
    if (activeTab === 'rhythms') renderRhythms(c);
    else if (activeTab === 'tremolo') renderTremolo(c);
    else renderSongs(c);
  }

  function renderRhythms(c) {
    c.innerHTML = RHYTHMS.map(r => `
      <div class="rl-card" id="rl-card-${r.id}">
        <div class="rl-head">
          <div class="rl-title">${r.name} <span class="rl-greek">${r.greek}</span></div>
          <div class="rl-meter">${r.meter} · ${r.sub}</div>
        </div>
        <div class="rl-pattern" dir="ltr">
          ${r.pattern.map((s,i) => {
            const isRest = s === '-';
            const accent = !isRest && s === s.toUpperCase();
            return `<span class="rl-step ${isRest?'rest':''} ${accent?'accent':''}" id="rl-${r.id}-step-${i}">${isRest?'·':(s.toLowerCase()==='d'?'↓':'↑')}</span>`;
          }).join('')}
        </div>
        <div class="rl-controls">
          <button class="btn small rl-bpm-down" data-id="${r.id}">−</button>
          <span class="rl-bpm" id="rl-bpm-${r.id}">${r.bpm}</span><span class="rl-bpm-lbl">BPM</span>
          <button class="btn small rl-bpm-up" data-id="${r.id}">+</button>
          <button class="btn gold rl-play-btn" data-id="${r.id}">▶ נגן</button>
        </div>
        <div class="rl-meta">
          <div class="rl-meta-row"><b>דגשים:</b> ${r.accents}</div>
          <div class="rl-meta-row rl-mistake"><b>טעות נפוצה:</b> ${r.mistake}</div>
          <div class="rl-meta-row rl-tip">💡 ${r.tip}</div>
        </div>
      </div>
    `).join('');

    const bpmState = {};
    RHYTHMS.forEach(r => bpmState[r.id] = r.bpm);

    c.querySelectorAll('.rl-bpm-down').forEach(b => b.addEventListener('click', () => {
      const r = RHYTHMS.find(x => x.id === b.dataset.id);
      bpmState[r.id] = Math.max(r.bpmMin, bpmState[r.id] - 5);
      document.getElementById('rl-bpm-' + r.id).textContent = bpmState[r.id];
      if (player.rhythmId === r.id) playRhythm(r, bpmState[r.id]);
    }));
    c.querySelectorAll('.rl-bpm-up').forEach(b => b.addEventListener('click', () => {
      const r = RHYTHMS.find(x => x.id === b.dataset.id);
      bpmState[r.id] = Math.min(r.bpmMax, bpmState[r.id] + 5);
      document.getElementById('rl-bpm-' + r.id).textContent = bpmState[r.id];
      if (player.rhythmId === r.id) playRhythm(r, bpmState[r.id]);
    }));
    c.querySelectorAll('.rl-play-btn').forEach(b => b.addEventListener('click', () => {
      const r = RHYTHMS.find(x => x.id === b.dataset.id);
      const wasPlaying = player.rhythmId === r.id;
      stopPlayer();
      if (!wasPlaying) {
        playRhythm(r, bpmState[r.id]);
        b.classList.add('active'); b.textContent = '⏹ עצור';
      }
    }));
  }

  function renderTremolo(c) {
    c.innerHTML = `
      <p class="pl-intro">הטרמולו נבנה בארבעה שלבים לאורך חודשים. <b>5 דקות ביום עדיף על שעה פעם בשבוע.</b>
      מיקום: שורש כף היד מרחף על הגשר, התנועה מרוטציית כף היד — לא מהמרפק.</p>
      ${TREMOLO.map(t => `
        <div class="pl-trem-card">
          <div class="pl-trem-head">
            <span class="pl-trem-stage">${t.stage}</span>
            <div>
              <div class="pl-trem-title">${t.title}</div>
              <div class="pl-trem-weeks">${t.weeks} · מטרה: ${t.goal}</div>
            </div>
          </div>
          <ul class="pl-trem-ex">${t.ex.map(e => `<li>${e}</li>`).join('')}</ul>
        </div>
      `).join('')}
      <div class="pl-cta">
        <button class="btn gold" id="pl-to-skills">🎤 תרגלו טרמולו עם בקרת מיקרופון →</button>
      </div>
    `;
    const btn = document.getElementById('pl-to-skills');
    if (btn) btn.addEventListener('click', () => {
      const nav = document.querySelector('[data-screen="skills"]');
      if (nav) nav.click();
    });
  }

  function renderSongs(c) {
    c.innerHTML = `
      <p class="pl-intro">כל שיר עם הדרומוס, הטמפו, רצף האקורדים והמקצב. <b>כל שיר יווני = מודוס + אקורדים + פריטה.</b></p>
      <div class="pl-song-grid">
        ${SONGS.map(s => `
          <div class="pl-song-card">
            <div class="pl-song-name">${s.name}</div>
            <div class="pl-song-artist">${s.artist}</div>
            <div class="pl-song-tags">
              <span class="pl-tag pl-tag-dromos">${s.dromos}</span>
              <span class="pl-tag">${s.rhythm}</span>
              <span class="pl-tag">${s.bpm} BPM</span>
            </div>
            <div class="pl-song-prog" dir="ltr">${s.prog.split(/\s*→\s*/).map(ch =>
              `<span class="pl-chord" data-chord="${ch.trim()}">${ch.trim()}</span>`).join('<span class="pl-prog-arrow">→</span>')}</div>
            ${s.special ? `<div class="pl-song-special">💡 ${s.special}</div>` : ''}
            <div class="pl-chord-diagram"></div>
            <button class="btn small pl-song-find" data-name="${s.name}">🔎 חפשו ב-YouTube</button>
          </div>
        `).join('')}
      </div>
    `;
    c.querySelectorAll('.pl-song-find').forEach(b => b.addEventListener('click', () => {
      const nav = document.querySelector('[data-screen="song-learn"]');
      if (nav) { nav.click(); setTimeout(() => {
        const inp = document.getElementById('sl-yt-search');
        if (inp) { inp.value = b.dataset.name + ' bouzouki'; inp.focus(); }
      }, 200); }
    }));
    // אקורדים — לחיצה מציגה דיאגרמה + שמיעה
    c.querySelectorAll('.pl-chord').forEach(ch => ch.addEventListener('click', () => {
      const card = ch.closest('.pl-song-card');
      const diag = card?.querySelector('.pl-chord-diagram');
      card?.querySelectorAll('.pl-chord').forEach(x => x.classList.remove('sel'));
      ch.classList.add('sel');
      if (diag && typeof ChordTooltip !== 'undefined') ChordTooltip.renderInto(diag, ch.dataset.chord);
      playChordName(ch.dataset.chord);
    }));
    if (typeof ChordTooltip !== 'undefined') ChordTooltip.bindContainer(c);
  }

  /* נגינת אקורד לפי שם (C-F-A-D) */
  function playChordName(name) {
    if (typeof AudioEngine === 'undefined' || typeof CHORDS === 'undefined') return;
    AudioEngine.ensureCtx();
    const key = (typeof ChordTooltip !== 'undefined') ? ChordTooltip.resolveKey(name) : name;
    const chord = CHORDS[key];
    if (!chord) return;
    const TUNE = [48, 53, 57, 62]; // C3 F3 A3 D4 — מיתרי בוזוקי
    const t = AudioEngine.ctx.currentTime;
    chord.shape.forEach((fret, i) => {
      if (fret === 'x') return;
      AudioEngine.pluckMidi(TUNE[i] + fret, t + i * 0.05, 0.5);
    });
  }

  function init() {
    if (!document.getElementById('practice-lib-app')) return;
    injectStyles();
    render();
  }
  function stop() { stopPlayer(); }

  function injectStyles() {
    if (document.getElementById('pl-styles')) return;
    const st = document.createElement('style');
    st.id = 'pl-styles';
    st.textContent = `
      .pl-tabs { display:flex; gap:8px; margin-bottom:16px; }
      .pl-tab { flex:1; padding:10px; border-radius:10px; border:1px solid var(--line,#333); background:var(--bg-card,#1a1a2e); color:var(--text,#eee); cursor:pointer; font:inherit; font-size:14px; }
      .pl-tab.active { border-color:var(--gold,#e3b341); background:var(--bg-elev,#222); color:var(--gold,#e3b341); font-weight:700; }
      .pl-intro { font-size:13px; background:var(--bg-card,#1a1a2e); border-radius:10px; padding:12px 16px; border-right:3px solid var(--gold,#e3b341); margin-bottom:16px; line-height:1.5; }
      .rl-card { background:var(--bg-card,#1a1a2e); border:1px solid var(--line,#333); border-radius:12px; padding:14px; margin-bottom:12px; }
      .rl-head { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:10px; flex-wrap:wrap; gap:4px; }
      .rl-title { font-size:18px; font-weight:800; color:var(--gold,#e3b341); }
      .rl-greek { font-size:13px; opacity:.6; font-weight:400; }
      .rl-meter { font-size:13px; color:var(--text-dim,#999); }
      .rl-pattern { display:flex; gap:5px; flex-wrap:wrap; margin:10px 0; justify-content:center; }
      .rl-step { width:32px; height:32px; display:flex; align-items:center; justify-content:center; border-radius:8px; font-size:17px; font-weight:700; background:var(--bg-elev,#222); border:1px solid var(--line,#333); color:var(--text,#eee); transition:transform .1s,background .1s; }
      .rl-step.accent { border-color:var(--gold,#e3b341); color:var(--gold,#e3b341); }
      .rl-step.rest { color:var(--text-dim,#555); }
      .rl-step.playing { background:var(--gold,#e3b341); color:#111; transform:scale(1.18); }
      .rl-controls { display:flex; align-items:center; gap:8px; margin:10px 0; flex-wrap:wrap; }
      .rl-bpm { font-size:18px; font-weight:800; color:var(--text,#eee); min-width:34px; text-align:center; }
      .rl-bpm-lbl { font-size:11px; color:var(--text-dim,#999); }
      .rl-play-btn { margin-right:auto; }
      .rl-meta { font-size:12px; color:var(--text-dim,#999); line-height:1.5; }
      .rl-meta-row { margin:2px 0; }
      .rl-meta-row b { color:var(--text,#eee); }
      .rl-mistake b { color:var(--accent-red,#e74c3c); }
      .rl-tip { color:var(--aegean,#4fb3d9); }
      .pl-trem-card { background:var(--bg-card,#1a1a2e); border:1px solid var(--line,#333); border-radius:12px; padding:14px; margin-bottom:10px; }
      .pl-trem-head { display:flex; align-items:center; gap:12px; margin-bottom:8px; }
      .pl-trem-stage { width:36px; height:36px; flex-shrink:0; border-radius:50%; background:var(--gold,#e3b341); color:#111; font-weight:800; font-size:18px; display:flex; align-items:center; justify-content:center; }
      .pl-trem-title { font-size:16px; font-weight:700; color:var(--text,#eee); }
      .pl-trem-weeks { font-size:12px; color:var(--text-dim,#999); }
      .pl-trem-ex { margin:6px 0 0; padding-right:20px; font-size:13px; color:var(--text,#eee); line-height:1.7; }
      .pl-cta { margin-top:16px; text-align:center; }
      .pl-song-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:12px; }
      .pl-song-card { background:var(--bg-card,#1a1a2e); border:1px solid var(--line,#333); border-radius:12px; padding:14px; }
      .pl-song-name { font-size:16px; font-weight:800; color:var(--text,#eee); }
      .pl-song-artist { font-size:12px; color:var(--text-dim,#999); margin-bottom:8px; }
      .pl-song-tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:8px; }
      .pl-tag { font-size:11px; padding:2px 8px; border-radius:6px; background:var(--bg-elev,#222); color:var(--text-dim,#999); border:1px solid var(--line,#333); }
      .pl-tag-dromos { color:var(--gold,#e3b341); border-color:var(--gold,#e3b341); }
      .pl-song-prog { font-size:13px; font-weight:600; color:var(--aegean,#4fb3d9); margin:6px 0; display:flex; flex-wrap:wrap; gap:4px; align-items:center; }
      .pl-chord { cursor:pointer; padding:1px 5px; border-radius:5px; border:1px solid transparent; }
      .pl-chord:hover { border-color:var(--aegean,#4fb3d9); }
      .pl-chord.sel { background:var(--gold,#e3b341); color:#111; }
      .pl-prog-arrow { color:var(--text-dim,#999); }
      .pl-chord-diagram { display:flex; justify-content:center; margin:4px 0; }
      .pl-chord-diagram:not(:empty) { margin:8px 0; }
      .pl-song-special { font-size:12px; color:var(--text-dim,#999); margin-bottom:8px; line-height:1.4; }
    `;
    document.head.appendChild(st);
  }

  return { init, stop, render };
})();
