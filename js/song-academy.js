/* ============================================================
   SongAcademy — אקדמיית השירים 📀
   לומדים אקורדים ודרומוסים מתוך שירים מוכרים.
   כל שיר = מסע בן 4 תחנות: סקירה → אקורדים → דרומוס → תרגול.
   "כל שיר יווני = דרומוס + אקורדים + פראזה."
   ============================================================ */
'use strict';

const SongAcademy = (() => {

  const D_OPEN = 74; // מיתר D פתוח (D5)
  const TUNE = [48, 53, 57, 62]; // C3 F3 A3 D4 — מיתרי הבוזוקי לפי CHORDS.shape
  const NN = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  /* ---------- דרומוסים: סולם על מיתר D + טביעת אצבע ---------- */
  const DROMOI = {
    rast:    { he:'ראסט', color:'#e3b341', frets:[0,2,4,5,7,9,10,12],
               fp:'כמו מז׳ור אך עם 3 ו-7 רכות — בהיר, אצילי, "שמשי".', tell:'רזולוציה עליזה, כמעט מערבית.' },
    hitzaz:  { he:'חיג׳אז', color:'#e0884a', frets:[0,1,4,5,7,8,10,12],
               fp:'שנייה מוגברת בין מי♭ לפה# (סריג 1→4) — הצליל ה"מזרחי".', tell:'הקפיצה מי♭→פה#.' },
    ousak:   { he:'אוסאק', color:'#7b9ee0', frets:[0,1,3,5,7,8,10,12],
               fp:'שנייה רכה (מי♭) נשענת מטה אל הטוניקה — קינה עמוקה.', tell:'אנחה כלפי מטה אל הבסיס.' },
    minore:  { he:'מינורה', color:'#9d8ec0', frets:[0,2,3,5,7,9,10,12],
               fp:'מינור פשוט; הסי הטבעי נותן תקווה (דוריאן).', tell:'מינור יומיומי, לא ייאוש.' },
    kiourdi: { he:'קיורדי', color:'#6b8caf', frets:[0,2,3,5,7,8,10,12],
               fp:'מינור טבעי עדין, בלי שנייה מוגברת — בן-דוד רך של אוסאק.', tell:'מינור "חלק" ומוכר.' },
    niavent: { he:'ניאוונט', color:'#c265a0', frets:[0,2,3,6,7,8,10,12],
               fp:'מינור עם סול# (סריג 6) — שנייה מוגברת דרמטית.', tell:'סול# בתוך מינור — מתח תיאטרלי.' },
    pireotikos:{ he:'פיריאוטיקוס', color:'#5fc88f', frets:[0,2,4,5,7,9,11,12],
               fp:'מז׳ור פתוח ובהיר — המנוני זאימבקיקו.', tell:'גאה, עירוני, חגיגי.' },
  };

  /* ---------- ספריית השירים (לפי סדר לימוד) ---------- */
  const SONGS = [
    {
      id:'frankosyriani', name:'Frankosyriani', he:'פרנקוסיריאני', greek:'Φραγκοσυριανή',
      artist:'Markos Vamvakaris', era:'1935', diff:1,
      dromos:'rast', root:'רה',
      chords:['D','G','A7'], prog:'D – G – A7 – D',
      phrase:{ frets:[0,2,4,5,4,2,0], desc:'פראזה בהירה ועולה — הפתיחה האייקונית' },
      why:'הדרומוס הקרוב ביותר למז׳ור המערבי — כניסה עדינה ללימוד. השיר הראשון הקלאסי.',
      sections:[{label:'כל השיר', dromos:'rast'}]
    },
    {
      id:'pedia-pirea', name:'Ta Pedia tou Pirea', he:'ילדי פיראוס', greek:'Τα Παιδιά του Πειραιά',
      artist:'M. Hadjidakis', era:'1960', diff:1,
      dromos:'pireotikos', root:'רה',
      chords:['D','A7'], prog:'D – A7 – D (סיבוב Bm)',
      phrase:{ frets:[0,2,4,7,4,2,0], desc:'פזמון מקפץ ובהיר' },
      why:'מז׳ור עליז עם שני אקורדים בלבד — מושלם לתרגול מעבר D↔A7.',
      sections:[{label:'כל השיר', dromos:'pireotikos'}]
    },
    {
      id:'misirlou', name:'Misirlou', he:'מיסירלו', greek:'Μισιρλού',
      artist:'מסורתי / N. Roubanis', era:'1927', diff:2,
      dromos:'hitzaz', root:'רה',
      chords:['Dm','A7'], prog:'Dm – A7 – Dm – Gm – A7 – Dm',
      phrase:{ frets:[0,1,4,1,4,5,4,1], desc:'הניגון המחליק במורד החיג׳אז — בטרמולו' },
      why:'השנייה המוגברת (מי♭→פה#) הכי מזוהה במוזיקה — "שיעור ה-וואו" של החיג׳אז.',
      sections:[{label:'כל השיר', dromos:'hitzaz'}]
    },
    {
      id:'polis-hamam', name:'Mes stis Polis to Hamam', he:'בחמאם של העיר', greek:'Μες στης Πόλης το Χαμάμ',
      artist:'מסורתי סמירנאי', era:'1930s', diff:2,
      dromos:'hitzaz', root:'רה',
      chords:['Dm','A7'], prog:'Dm – Eb – A7 – Dm',
      phrase:{ frets:[0,1,4,5,4,1,0], desc:'פראזת חיג׳אז סמירנאית' },
      why:'חיג׳אז שני — אותו דרומוס, שיר אחר. ככה הדפוס מתקבע באוזן.',
      sections:[{label:'כל השיר', dromos:'hitzaz'}]
    },
    {
      id:'apopse', name:'Apopse Kanis Den Kimatai', he:'הלילה איש לא ישן', greek:'Απόψε Κανείς Δεν Κοιμάται',
      artist:'M. Theodorakis', era:'1960s', diff:3,
      dromos:'ousak', root:'לה',
      chords:['Am','Dm','E7'], prog:'Am – Dm – E7 – Am',
      phrase:{ frets:[7,8,7,5,3,1,0], desc:'אנחה יורדת אל הטוניקה' },
      why:'מבוא למשפחת הקינה (אוסאק). שימו לב לשנייה הרכה שנשענת מטה.',
      sections:[{label:'כל השיר', dromos:'ousak'}]
    },
    {
      id:'drapetsona', name:'Drapetsona', he:'דראפטסונה', greek:'Δραπετσώνα',
      artist:'M. Theodorakis', era:'1960', diff:3,
      dromos:'kiourdi', root:'לה',
      chords:['Am','Dm','E7'], prog:'Am – Dm – E7 – Am',
      phrase:{ frets:[7,8,7,5,3,2,0], desc:'מינור עדין וזורם' },
      why:'קיורדי מול אוסאק — אותם אקורדים, צבע מעט שונה (השישית). אוזן מבחינה בעדינות.',
      sections:[{label:'כל השיר', dromos:'kiourdi'}]
    },
    {
      id:'minore-avgis', name:'To Minore tis Avgis', he:'המינור של השחר', greek:'Το Μινόρε της Αυγής',
      artist:'S. Peristeris', era:'1930s', diff:3,
      dromos:'minore', root:'רה',
      chords:['Dm','Gm','A7'], prog:'Dm – Gm – A7 – Dm',
      phrase:{ frets:[0,2,3,5,3,2,0], desc:'מליסמה של שחר' },
      why:'מינור פשוט (דוריאן) — עוגן לפני שעוברים למודולציות.',
      sections:[{label:'כל השיר', dromos:'minore'}]
    },
    {
      id:'synnefiasmeni', name:'Synnefiasmeni Kyriaki', he:'יום ראשון מעונן', greek:'Συννεφιασμένη Κυριακή',
      artist:'V. Tsitsanis', era:'1948', diff:4,
      dromos:'minore', root:'רה',
      chords:['Dm','Gm','A7'], prog:'Dm – Gm – A7 (פנייה ל-ניאוונט)',
      phrase:{ frets:[0,2,3,6,3,2,0], desc:'הרמת הניאוונט (סול#) בגשר — שינוי הדרומוס' },
      why:'שינוי דרומוס אמיתי בתוך שיר: הבית במינורה, הגשר נפנה לניאוונט. שמעו את ה"הרמה".',
      sections:[
        {label:'בית', dromos:'minore'},
        {label:'גשר', dromos:'niavent'},
        {label:'חזרה לבית', dromos:'minore'}
      ]
    },
  ];

  /* ---------- מצב ---------- */
  let activeSong = null, activeTab = 'overview';
  let mic = { stream:null, ctx:null, analyser:null, timer:null };
  const BEST_KEY = 'song-academy-cpm';

  /* ---------- אודיו: נגינת אקורד ---------- */
  function chordToMidiNotes(name) {
    if (typeof CHORDS === 'undefined') return [];
    const key = (typeof ChordTooltip !== 'undefined') ? ChordTooltip.resolveKey(name) : name;
    const ch = CHORDS[key];
    if (!ch) return [];
    const notes = [];
    ch.shape.forEach((fret, i) => { if (fret !== 'x') notes.push(TUNE[i] + fret); });
    return notes;
  }
  function playChord(name) {
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    const t = AudioEngine.ctx.currentTime;
    chordToMidiNotes(name).forEach((m, i) => AudioEngine.pluckMidi(m, t + i * 0.05, 0.55));
  }
  function playFrets(frets, gap=340) {
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    const t = AudioEngine.ctx.currentTime + 0.05;
    frets.forEach((f,i) => AudioEngine.pluckMidi(D_OPEN + f, t + i*(gap/1000), 0.5));
  }

  /* ---------- מיקרופון + זיהוי כרומה ---------- */
  async function ensureMic() {
    if (mic.stream) return true;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      mic.stream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
      mic.ctx = new (window.AudioContext||window.webkitAudioContext)();
      const src = mic.ctx.createMediaStreamSource(mic.stream);
      mic.analyser = mic.ctx.createAnalyser();
      mic.analyser.fftSize = 8192;
      src.connect(mic.analyser);
      return true;
    } catch { return false; }
  }
  function stopMic() {
    if (mic.timer) { clearInterval(mic.timer); mic.timer = null; }
    if (mic.stream) { mic.stream.getTracks().forEach(t=>t.stop()); mic.stream = null; }
    if (mic.ctx) { mic.ctx.close(); mic.ctx = null; }
    mic.analyser = null;
  }

  function liveChroma() {
    const a = mic.analyser, sr = mic.ctx.sampleRate;
    const bins = new Float32Array(a.frequencyBinCount);
    a.getFloatFrequencyData(bins); // dB
    const chroma = new Float32Array(12);
    const nyq = sr/2, n = bins.length;
    let energy = 0;
    for (let i=1;i<n;i++){
      const freq = i*nyq/n;
      if (freq<70 || freq>2200) continue;
      const mag = Math.pow(10, bins[i]/20);
      energy += mag;
      const pc = ((Math.round(69+12*Math.log2(freq/440))%12)+12)%12;
      chroma[pc] += mag;
    }
    let mx=0; for (let i=0;i<12;i++) mx=Math.max(mx,chroma[i]);
    if (mx>0) for (let i=0;i<12;i++) chroma[i]/=mx;
    return { chroma, energy };
  }

  function chordTemplate(name) {
    const m = name.match(/^([A-G][#b]?)(.*)$/);
    if (!m) return null;
    let root = NN.indexOf(m[1].replace('b',''));
    if (root < 0) { const map={A:9,B:11,C:0,D:2,E:4,F:5,G:7}; root=map[m[1][0]]??0; if(m[1].includes('#'))root++; if(m[1].includes('b'))root--; root=((root%12)+12)%12; }
    const suf = m[2];
    const iv = suf.startsWith('m') && !suf.startsWith('maj') ? (suf.includes('7')?[0,3,7,10]:[0,3,7])
             : suf.includes('7') ? [0,4,7,10] : [0,4,7];
    const t = new Float32Array(12);
    iv.forEach(x => t[(root+x)%12] = 1);
    return t;
  }
  function matchScore(chroma, tmpl) {
    let dot=0, na=0, nb=0;
    for (let i=0;i<12;i++){ dot+=chroma[i]*tmpl[i]; na+=chroma[i]*chroma[i]; nb+=tmpl[i]*tmpl[i]; }
    return (na&&nb) ? dot/Math.sqrt(na*nb) : 0;
  }
  /** מחזיר את האקורד הקרוב ביותר מרשימת מועמדים, או null אם חלש/לא ברור */
  function detectChord(chroma, energy, candidates) {
    if (energy < 0.5) return null;
    let best=null, bestS=-1, second=-1;
    for (const c of candidates) {
      const s = matchScore(chroma, chordTemplate(c));
      if (s>bestS) { second=bestS; bestS=s; best=c; }
      else if (s>second) second=s;
    }
    if (bestS < 0.55 || bestS - second < 0.05) return null;
    return best;
  }

  /* ---------- רינדור: ספריית שירים ---------- */
  function renderHome() {
    const app = document.getElementById('song-academy-app');
    if (!app) return;
    app.innerHTML = `
      <p class="sa-intro">לומדים אקורדים ודרומוסים <b>מתוך שירים אמיתיים</b> — לא בעל-פה. כל שיר מלמד את האקורדים שהוא צריך, את הדרומוס שלו, ואת הפראזה. סדורים מהקל לקשה.
      <br><small style="color:var(--text-dim)">אקורדים נפוצים — ייתכנו וריאציות לפי ביצוע/סולם.</small></p>
      <div class="sa-song-grid">
        ${SONGS.map((s,i) => {
          const dr = DROMOI[s.dromos];
          return `<button class="sa-song-card" data-id="${s.id}" style="border-color:${dr.color}">
            <div class="sa-song-num">${i+1}</div>
            <div class="sa-song-main">
              <div class="sa-song-name">${s.he} <span class="sa-song-greek">${s.greek}</span></div>
              <div class="sa-song-sub">${s.artist} · ${s.era}</div>
              <div class="sa-song-tags">
                <span class="sa-tag" style="border-color:${dr.color};color:${dr.color}">${dr.he}</span>
                <span class="sa-tag">${s.chords.length} אקורדים</span>
                ${s.sections.length>1?'<span class="sa-tag sa-tag-mod">שינוי דרומוס</span>':''}
                <span class="sa-diff">${'●'.repeat(s.diff)}${'○'.repeat(5-s.diff)}</span>
              </div>
            </div>
          </button>`;
        }).join('')}
      </div>`;
    app.querySelectorAll('.sa-song-card').forEach(c => c.addEventListener('click', () => openSong(c.dataset.id)));
  }

  function openSong(id) {
    activeSong = SONGS.find(s => s.id===id);
    activeTab = 'overview';
    renderSong();
  }

  const TABS = [
    { id:'overview', icon:'📖', label:'סקירה' },
    { id:'chords',   icon:'🎸', label:'אקורדים' },
    { id:'dromos',   icon:'🧭', label:'דרומוס' },
    { id:'practice', icon:'🔁', label:'תרגול' },
  ];

  function renderSong() {
    stopMic();
    const app = document.getElementById('song-academy-app');
    if (!app || !activeSong) return;
    const s = activeSong, dr = DROMOI[s.dromos];
    app.innerHTML = `
      <div class="sa-song-head">
        <button class="sa-back" id="sa-back">← כל השירים</button>
        <div class="sa-song-title" style="color:${dr.color}">${s.he} <span class="sa-song-greek">${s.greek}</span></div>
        <div class="sa-song-sub">${s.artist} · ${s.era} · דרומוס ${dr.he}</div>
      </div>
      <div class="sa-tabs">
        ${TABS.map(t => `<button class="sa-tab ${t.id===activeTab?'active':''}" data-tab="${t.id}" style="${t.id===activeTab?`border-color:${dr.color}`:''}">
          <span>${t.icon}</span><span>${t.label}</span></button>`).join('')}
      </div>
      <div class="sa-tab-body" id="sa-tab-body"></div>`;
    app.querySelector('#sa-back').addEventListener('click', () => { stopMic(); renderHome(); });
    app.querySelectorAll('.sa-tab').forEach(t => t.addEventListener('click', () => { stopMic(); activeTab=t.dataset.tab; renderSong(); }));
    ({ overview:renderOverview, chords:renderChords, dromos:renderDromos, practice:renderPractice }[activeTab])();
  }

  /* ----- תחנה: סקירה ----- */
  function renderOverview() {
    const s = activeSong, dr = DROMOI[s.dromos], body = document.getElementById('sa-tab-body');
    body.innerHTML = `
      <div class="sa-overview-card" style="border-color:${dr.color}">
        <div class="sa-ov-line">🎸 <b>השיר הזה דורש ${s.chords.length} אקורדים:</b> ${s.chords.join(' · ')}</div>
        <div class="sa-ov-line">🧭 <b>דרומוס:</b> ${dr.he} (שורש ${s.root})</div>
        <div class="sa-ov-line">🎵 <b>רצף:</b> <span dir="ltr">${s.prog}</span></div>
        ${s.sections.length>1?`<div class="sa-ov-line sa-ov-mod">⚡ <b>שינוי דרומוס בשיר</b> — לכו לתחנת "דרומוס" לראות איפה</div>`:''}
      </div>
      <div class="sa-why">💡 ${s.why}</div>
      <div class="sa-ov-fp" style="border-color:${dr.color}">
        <b>טביעת האצבע של ${dr.he}:</b> ${dr.fp}
      </div>
      <div class="sa-btn-row">
        <button class="btn gold" id="sa-ov-next">בואו נלמד את האקורדים →</button>
        <button class="btn" id="sa-ov-yt">🔎 השיר ב-YouTube</button>
      </div>`;
    document.getElementById('sa-ov-next').addEventListener('click', () => { activeTab='chords'; renderSong(); });
    document.getElementById('sa-ov-yt').addEventListener('click', () => {
      const nav = document.querySelector('[data-screen="song-learn"]');
      if (nav) { nav.click(); setTimeout(()=>{ const inp=document.getElementById('sl-yt-search'); if(inp){ inp.value=s.name+' bouzouki'; inp.focus(); } },200); }
    });
  }

  /* ----- תחנה: אקורדים + אימון מעבר בדקה ----- */
  function renderChords() {
    const s = activeSong, body = document.getElementById('sa-tab-body');
    body.innerHTML = `
      <div class="sa-chord-row" id="sa-chord-row">
        ${s.chords.map(c => `<div class="sa-chord-slot"><div class="sa-chord-diag" data-chord="${c}"></div></div>`).join('')}
      </div>
      <p class="sa-hint">לחצו על אקורד לשמיעה. הסוד: לא לשנן צורות — לתרגל את ה<b>מעבר</b> בין שניים.</p>

      <div class="sa-drill" style="margin-top:14px">
        <div class="sa-drill-title">⏱️ אימון המעבר בדקה</div>
        <p class="sa-hint">בחרו שני אקורדים, לחצו התחל, ופרטו ביניהם הלוך-ושוב במשך 60 שניות. המיקרופון סופר מעברים נקיים.</p>
        <div class="sa-drill-ctrls">
          <select id="sa-drill-a" class="ctrl-select">${s.chords.map(c=>`<option>${c}</option>`).join('')}</select>
          <span>↔</span>
          <select id="sa-drill-b" class="ctrl-select">${s.chords.map((c,i)=>`<option ${i===1?'selected':''}>${c}</option>`).join('')}</select>
          <button class="btn gold" id="sa-drill-go">▶ התחל (60 שנ׳)</button>
        </div>
        <div class="sa-drill-display">
          <div class="sa-drill-count" id="sa-drill-count">0</div>
          <div class="sa-drill-lbl">מעברים</div>
          <div class="sa-drill-time" id="sa-drill-time"></div>
        </div>
        <div class="sa-drill-best" id="sa-drill-best"></div>
        <div class="sa-meter"><span>🎤</span><div class="sa-vu"><div class="sa-vu-fill" id="sa-vu"></div></div><span id="sa-drill-now" class="sa-now"></span></div>
      </div>`;

    s.chords.forEach(c => {
      const el = body.querySelector(`.sa-chord-diag[data-chord="${c}"]`);
      if (el && typeof ChordTooltip!=='undefined') ChordTooltip.renderInto(el, c);
      if (el) el.parentElement.addEventListener('click', () => playChord(c));
    });
    showBest();
    document.getElementById('sa-drill-go').addEventListener('click', toggleDrill);
  }

  let drill = null;
  function showBest() {
    const el = document.getElementById('sa-drill-best');
    if (!el) return;
    const best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    el.textContent = best ? `🏆 השיא שלך: ${best} מעברים בדקה` : '';
  }
  async function toggleDrill() {
    const btn = document.getElementById('sa-drill-go');
    if (drill) { endDrill(); return; }
    const ok = await ensureMic();
    if (!ok) { document.getElementById('sa-drill-now').textContent = 'אין מיקרופון'; return; }
    const A = document.getElementById('sa-drill-a').value;
    const B = document.getElementById('sa-drill-b').value;
    if (A === B) { document.getElementById('sa-drill-now').textContent = 'בחרו שני אקורדים שונים'; return; }
    drill = { A, B, count:0, last:null, t0:Date.now(), end:Date.now()+60000, stableC:null, stableN:0 };
    btn.textContent = '⏹ עצור';
    document.getElementById('sa-drill-count').textContent = '0';
    mic.timer = setInterval(() => drillTick(), 80);
  }
  function drillTick() {
    if (!drill) return;
    const remain = Math.max(0, drill.end - Date.now());
    document.getElementById('sa-drill-time').textContent = (remain/1000).toFixed(0) + ' שנ׳';
    if (remain <= 0) { endDrill(); return; }
    const { chroma, energy } = liveChroma();
    const vu = document.getElementById('sa-vu'); if (vu) vu.style.width = Math.min(100, energy*8) + '%';
    const det = detectChord(chroma, energy, [drill.A, drill.B]);
    // יציבות: דורש 2 פריימים זהים
    if (det && det === drill.stableC) drill.stableN++;
    else { drill.stableC = det; drill.stableN = det?1:0; }
    if (det && drill.stableN === 2) {
      const now = document.getElementById('sa-drill-now'); if (now) now.textContent = det;
      if (drill.last && det !== drill.last) {
        drill.count++;
        const cEl = document.getElementById('sa-drill-count');
        if (cEl) { cEl.textContent = drill.count; cEl.classList.add('pop'); setTimeout(()=>cEl.classList.remove('pop'),150); }
      }
      drill.last = det;
    }
  }
  function endDrill() {
    if (mic.timer) { clearInterval(mic.timer); mic.timer = null; }
    const btn = document.getElementById('sa-drill-go');
    if (btn) btn.textContent = '▶ התחל (60 שנ׳)';
    if (drill) {
      const cpm = drill.count;
      const best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
      if (cpm > best) localStorage.setItem(BEST_KEY, String(cpm));
      const now = document.getElementById('sa-drill-now');
      if (now) now.textContent = cpm > best ? `🎉 שיא חדש: ${cpm}!` : `סיימת: ${cpm} מעברים`;
      showBest();
    }
    drill = null;
  }

  /* ----- תחנה: דרומוס (ציר זמן + סולם + פראזה) ----- */
  function renderDromos() {
    const s = activeSong, body = document.getElementById('sa-tab-body');
    const multi = s.sections.length > 1;
    body.innerHTML = `
      <div class="sa-timeline" dir="ltr">
        ${s.sections.map((sec,i) => {
          const dr = DROMOI[sec.dromos];
          return `<button class="sa-tl-seg" data-i="${i}" style="background:${dr.color}22;border-color:${dr.color};flex:${sec.label==='גשר'?1:2}">
            <span class="sa-tl-label">${sec.label}</span>
            <span class="sa-tl-dr" style="color:${dr.color}">${dr.he}</span>
          </button>`;
        }).join('')}
      </div>
      ${multi?'<p class="sa-hint">⚡ השיר עובר בין דרומוסים! לחצו על כל קטע כדי לשמוע ולראות את ההבדל.</p>':'<p class="sa-hint">לחצו על הקטע כדי ללמוד את הדרומוס.</p>'}
      <div id="sa-dromos-detail"></div>`;
    body.querySelectorAll('.sa-tl-seg').forEach(seg => seg.addEventListener('click', () => showDromosDetail(parseInt(seg.dataset.i,10))));
    showDromosDetail(0);
  }
  function showDromosDetail(i) {
    const s = activeSong, sec = s.sections[i], dr = DROMOI[sec.dromos];
    document.querySelectorAll('.sa-tl-seg').forEach((el,j)=>el.classList.toggle('sel', j===i));
    const d = document.getElementById('sa-dromos-detail');
    if (!d) return;
    d.innerHTML = `
      <div class="sa-dr-card" style="border-color:${dr.color}">
        <div class="sa-dr-name" style="color:${dr.color}">${dr.he} <span style="font-size:13px;color:var(--text-dim)">(${sec.label})</span></div>
        <div class="sa-dr-fp">👂 <b>איך מזהים:</b> ${dr.fp}</div>
        <div class="sa-dr-tell">🔑 ${dr.tell}</div>
        ${tabSvg(dr.frets, dr.color)}
        <div class="sa-btn-row">
          <button class="btn gold" id="sa-dr-scale">🔊 שמעו את הסולם</button>
          <button class="btn" id="sa-dr-phrase">🎶 הפראזה של השיר</button>
        </div>
      </div>`;
    document.getElementById('sa-dr-scale').addEventListener('click', () => playFrets([...dr.frets, ...[...dr.frets].reverse().slice(1)], 300));
    document.getElementById('sa-dr-phrase').addEventListener('click', () => playFrets(s.phrase.frets, 320));
  }

  function tabSvg(frets, color) {
    const w = Math.max(220, frets.length*38+30);
    const cells = frets.map((f,i) => {
      const x = 26 + i*38;
      return `<circle cx="${x}" cy="26" r="12" fill="${color}22" stroke="${color}"/><text x="${x}" y="31" text-anchor="middle" fill="${color}" font-size="12" font-weight="700">${f}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${w} 52" class="sa-tab-svg" dir="ltr">
      <line x1="12" y1="26" x2="${w-12}" y2="26" stroke="var(--line,#444)"/>
      <text x="4" y="30" fill="var(--text-dim)" font-size="10">D</text>${cells}</svg>`;
  }

  /* ----- תחנה: תרגול בלולאה ----- */
  let loopState = null;
  function renderPractice() {
    const s = activeSong, body = document.getElementById('sa-tab-body');
    const chords = (s.prog.match(/[A-G][#b]?(?:maj7|m7|maj|m|dim|sus4|sus2|7)?/g) || s.chords);
    body.innerHTML = `
      <p class="sa-hint">הלולאה ההרמונית של השיר. התחילו לאט, נגנו יחד, האיצו כשנקי. <b>הזיזו את היד השמאלית על הביט הריק</b> כדי שהאקורד יהיה מוכן בזמן.</p>
      <div class="sa-loop-chords" dir="ltr" id="sa-loop-chords">
        ${chords.map((c,i)=>`<span class="sa-loop-ch" id="sa-loop-${i}">${c}</span>`).join('<span class="sa-loop-arr">→</span>')}
      </div>
      <div class="sa-loop-ctrls">
        <button class="btn small" id="sa-bpm-down">−</button>
        <span class="sa-bpm"><b id="sa-bpm">70</b> BPM</span>
        <button class="btn small" id="sa-bpm-up">+</button>
        <button class="btn gold" id="sa-loop-play">▶ נגן לולאה</button>
      </div>
      <p class="sa-hint" style="margin-top:6px">💡 כל אקורד = תיבה אחת. כשהמעבר נקי ב-70, העלו ל-85, ואז ל-100.</p>`;
    let bpm = 70;
    const setBpm = v => { bpm = Math.max(50, Math.min(140, v)); document.getElementById('sa-bpm').textContent = bpm; if (loopState) { stopLoop(); startLoop(chords, bpm); } };
    document.getElementById('sa-bpm-down').addEventListener('click', ()=>setBpm(bpm-5));
    document.getElementById('sa-bpm-up').addEventListener('click', ()=>setBpm(bpm+5));
    document.getElementById('sa-loop-play').addEventListener('click', () => {
      if (loopState) { stopLoop(); document.getElementById('sa-loop-play').textContent = '▶ נגן לולאה'; }
      else { startLoop(chords, bpm); document.getElementById('sa-loop-play').textContent = '⏹ עצור'; }
    });
  }
  function startLoop(chords, bpm) {
    if (typeof AudioEngine==='undefined') return;
    AudioEngine.ensureCtx();
    const beat = 60/bpm;
    let idx = 0;
    const step = () => {
      if (!loopState) return;
      document.querySelectorAll('.sa-loop-ch').forEach((e,j)=>e.classList.toggle('active', j===idx));
      playChord(chords[idx]);
      idx = (idx+1) % chords.length;
    };
    loopState = { timer: setInterval(step, beat*1000) };
    step();
  }
  function stopLoop() {
    if (loopState) { clearInterval(loopState.timer); loopState = null; }
    document.querySelectorAll('.sa-loop-ch').forEach(e=>e.classList.remove('active'));
  }

  /* ---------- אתחול ---------- */
  function init() {
    if (!document.getElementById('song-academy-app')) return;
    injectStyles();
    renderHome();
  }
  function stop() { stopMic(); stopLoop(); endDrill(); }

  function injectStyles() {
    if (document.getElementById('sa-styles')) return;
    const st = document.createElement('style');
    st.id = 'sa-styles';
    st.textContent = `
      .sa-intro { font-size:14px; background:var(--bg-card,#1a1a2e); border-radius:10px; padding:12px 16px; border-right:3px solid var(--gold,#e3b341); margin-bottom:16px; line-height:1.5; }
      .sa-song-grid { display:flex; flex-direction:column; gap:10px; }
      .sa-song-card { display:flex; align-items:center; gap:12px; text-align:right; background:var(--bg-card,#1a1a2e); border:1px solid; border-radius:12px; padding:12px 14px; cursor:pointer; transition:transform .1s; }
      .sa-song-card:hover { transform:translateX(-3px); }
      .sa-song-num { width:30px; height:30px; flex-shrink:0; border-radius:50%; background:var(--bg-elev,#222); display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--gold,#e3b341); }
      .sa-song-main { flex:1; min-width:0; }
      .sa-song-name { font-size:16px; font-weight:700; color:var(--text,#eee); }
      .sa-song-greek { font-size:12px; opacity:.55; font-weight:400; }
      .sa-song-sub { font-size:12px; color:var(--text-dim,#999); margin:2px 0 6px; }
      .sa-song-tags { display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
      .sa-tag { font-size:11px; padding:2px 8px; border-radius:6px; background:var(--bg-elev,#222); color:var(--text-dim,#999); border:1px solid var(--line,#333); }
      .sa-tag-mod { color:#c265a0; border-color:#c265a0; }
      .sa-diff { font-size:10px; color:var(--gold,#e3b341); letter-spacing:1px; }
      .sa-song-head { margin-bottom:12px; }
      .sa-back { background:none; border:none; color:var(--aegean,#4fb3d9); cursor:pointer; font:inherit; font-size:13px; padding:0; }
      .sa-song-title { font-size:22px; font-weight:800; margin-top:4px; }
      .sa-tabs { display:flex; gap:6px; margin-bottom:14px; }
      .sa-tab { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 4px; border-radius:10px; border:2px solid var(--line,#333); background:var(--bg-card,#1a1a2e); color:var(--text,#eee); cursor:pointer; font:inherit; font-size:12px; opacity:.65; }
      .sa-tab.active { opacity:1; }
      .sa-tab span:first-child { font-size:18px; }
      .sa-overview-card { background:var(--bg-card,#1a1a2e); border:2px solid; border-radius:12px; padding:14px; margin-bottom:12px; }
      .sa-ov-line { font-size:14px; margin:6px 0; color:var(--text,#eee); }
      .sa-ov-mod { color:#c265a0; }
      .sa-why { font-size:13px; color:var(--text,#eee); background:rgba(255,255,255,.03); border-radius:8px; padding:10px 14px; margin:10px 0; line-height:1.5; }
      .sa-ov-fp { font-size:13px; color:var(--text-dim,#999); border-right:3px solid; padding:8px 12px; margin:10px 0; }
      .sa-btn-row { display:flex; gap:8px; flex-wrap:wrap; margin:12px 0; }
      .sa-chord-row { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; margin:10px 0; }
      .sa-chord-slot { cursor:pointer; padding:6px; border-radius:10px; transition:background .15s; }
      .sa-chord-slot:hover { background:var(--bg-elev,#222); }
      .sa-hint { font-size:12px; color:var(--text-dim,#999); line-height:1.5; margin:8px 0; }
      .sa-drill { background:var(--bg-card,#1a1a2e); border:1px solid var(--line,#333); border-radius:12px; padding:14px; }
      .sa-drill-title { font-size:15px; font-weight:700; color:var(--gold,#e3b341); }
      .sa-drill-ctrls { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:10px 0; }
      .sa-drill-display { text-align:center; margin:10px 0; }
      .sa-drill-count { font-size:48px; font-weight:900; color:var(--gold,#e3b341); line-height:1; transition:transform .15s; }
      .sa-drill-count.pop { transform:scale(1.25); }
      .sa-drill-lbl { font-size:12px; color:var(--text-dim,#999); }
      .sa-drill-time { font-size:13px; color:var(--aegean,#4fb3d9); margin-top:4px; }
      .sa-drill-best { font-size:13px; color:var(--text-dim,#999); text-align:center; margin:6px 0; }
      .sa-meter { display:flex; align-items:center; gap:8px; margin-top:8px; }
      .sa-vu { flex:1; height:8px; background:var(--bg-elev,#222); border-radius:4px; overflow:hidden; }
      .sa-vu-fill { height:100%; width:0%; background:var(--gold,#e3b341); transition:width .08s; }
      .sa-now { min-width:60px; font-size:14px; font-weight:700; color:var(--ok,#27ae60); text-align:center; }
      .sa-timeline { display:flex; gap:4px; margin:10px 0; }
      .sa-tl-seg { border:2px solid; border-radius:10px; padding:12px 6px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; transition:transform .1s; }
      .sa-tl-seg.sel { transform:translateY(-3px); }
      .sa-tl-label { font-size:13px; font-weight:700; color:var(--text,#eee); }
      .sa-tl-dr { font-size:12px; font-weight:600; }
      .sa-dr-card { background:var(--bg-card,#1a1a2e); border:2px solid; border-radius:12px; padding:14px; margin-top:8px; }
      .sa-dr-name { font-size:20px; font-weight:800; }
      .sa-dr-fp,.sa-dr-tell { font-size:13px; color:var(--text,#eee); margin:6px 0; line-height:1.5; }
      .sa-tab-svg { max-width:100%; height:52px; margin:8px 0; }
      .sa-loop-chords { display:flex; flex-wrap:wrap; gap:6px; align-items:center; justify-content:center; margin:14px 0; }
      .sa-loop-ch { font-size:20px; font-weight:800; padding:10px 16px; border-radius:10px; background:var(--bg-card,#1a1a2e); border:2px solid var(--line,#333); color:var(--text,#eee); }
      .sa-loop-ch.active { background:var(--gold,#e3b341); color:#111; border-color:var(--gold,#e3b341); transform:scale(1.08); }
      .sa-loop-arr { color:var(--text-dim,#999); }
      .sa-loop-ctrls { display:flex; align-items:center; gap:8px; justify-content:center; flex-wrap:wrap; }
      .sa-bpm { font-size:14px; color:var(--text-dim,#999); }
      .sa-bpm b { font-size:18px; color:var(--text,#eee); }
    `;
    document.head.appendChild(st);
  }

  return { init, stop };
})();
