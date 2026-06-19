/* ============================================================
   SkillStats + AdaptiveCoach — מאמן חכם אדפטיבי
   עוקב אחרי הביצועים בכל התרגילים, מזהה חולשות,
   ובונה תוכנית אימון אישית שמתמקדת במה שצריך שיפור.
   ============================================================ */
'use strict';

/* ---------- מאגר סטטיסטיקות משותף ---------- */
const SkillStats = (() => {
  const KEY = 'bouzouki-skill-stats';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} }

  /* category: 'picking-dir' | 'scale' | 'phrase' | 'picking' | 'tremolo' | 'tuning'
     key: מזהה ספציפי (למשל 'u' לפריטה למעלה, 'hitzaz' לסולם)
     success: boolean */
  function record(category, key, success) {
    const d = load();
    const ck = category + ':' + key;
    const e = d[ck] || { ok: 0, fail: 0, last: 0 };
    if (success) e.ok++; else e.fail++;
    e.last = Date.now();
    d[ck] = e;
    save(d);
  }

  function recordScore(category, key, score /* 0-100 */) {
    const d = load();
    const ck = category + ':' + key;
    const e = d[ck] || { scores: [], last: 0 };
    e.scores = (e.scores || []).concat(score).slice(-10);
    e.last = Date.now();
    d[ck] = e;
    save(d);
  }

  function all() { return load(); }
  function reset() { save({}); }

  /* החזרת אחוז הצלחה לקטגוריה/מפתח */
  function rate(category, key) {
    const e = load()[category + ':' + key];
    if (!e) return null;
    if (e.scores && e.scores.length) return e.scores.reduce((a,b)=>a+b,0) / e.scores.length;
    const total = (e.ok||0) + (e.fail||0);
    return total ? (e.ok / total) * 100 : null;
  }

  return { record, recordScore, all, reset, rate };
})();


/* ---------- המאמן האדפטיבי ---------- */
const AdaptiveCoach = (() => {

  /* מיומנויות הליבה שנבדקות — כל אחת מקושרת ליעד תרגול */
  const SKILLS = [
    { id: 'dir-down', cat: 'picking-dir', key: 'd', label: 'פריטה למטה ↓', target: 'game',
      tip: 'תרגלו פריטות למטה במאסטר הפנייה — שלב 1' },
    { id: 'dir-up', cat: 'picking-dir', key: 'u', label: 'פריטה למעלה ↑', target: 'game',
      tip: 'הפריטה למעלה היא הקשה — תרגלו חליפות ↓↑ לאט' },
    { id: 'scale-rast', cat: 'scale', key: 'rast', label: 'סולם ראסט', target: 'modus-path',
      tip: 'ראסט הוא הבסיס — נגנו אותו עד שהוא אוטומטי' },
    { id: 'scale-hitzaz', cat: 'scale', key: 'hitzaz', label: 'סולם חיג׳אז', target: 'modus-path',
      tip: 'שימו לב לקפיצה מי♭→פה# — הצבע של החיג׳אז' },
    { id: 'scale-ousak', cat: 'scale', key: 'ousak', label: 'סולם אוסאק', target: 'modus-path',
      tip: 'אוסאק רך — פה טבעי במקום פה#' },
    { id: 'tremolo', cat: 'tremolo', key: 'main', label: 'טרמולו', target: 'skills',
      tip: 'טרמולו נבנה לאט — 5 דקות ביום' },
    { id: 'timing', cat: 'picking', key: 'timing', label: 'דיוק קצב', target: 'game',
      tip: 'כיילו את התזמון והתרכזו בפעמה' },
  ];

  function getProfile() {
    return SKILLS.map(s => {
      const rate = SkillStats.rate(s.cat, s.key);
      return { ...s, rate, practiced: rate !== null };
    });
  }

  function buildPlan() {
    const profile = getProfile();
    // לא תורגל → עדיפות גבוהה; תורגל וחלש → עדיפות גבוהה; חזק → נמוכה
    const scored = profile.map(p => {
      let priority;
      if (p.rate === null) priority = 50;            // לא נוסה — בינוני-גבוה
      else priority = 100 - p.rate;                  // ככל שחלש יותר, עדיפות גבוהה
      return { ...p, priority };
    });
    scored.sort((a, b) => b.priority - a.priority);
    return scored;
  }

  /* ---------- UI ---------- */
  function render() {
    const app = document.getElementById('adaptive-app');
    if (!app) return;
    const plan = buildPlan();
    const practiced = plan.filter(p => p.practiced).length;

    const top3 = plan.slice(0, 3);

    app.innerHTML = `
      <div class="ad-intro">
        המאמן החכם עוקב אחרי הביצועים שלכם בכל התרגילים, מזהה את החולשות, ובונה תוכנית אישית.
        ${practiced === 0 ? '<b>עדיין לא תרגלתם — התחילו מהתרגילים המומלצים למטה.</b>' : `נותחו <b>${practiced}</b> מיומנויות.`}
      </div>

      <div class="ad-section-title">🎯 התוכנית האישית שלך — התמקדו בזה</div>
      <div class="ad-plan">
        ${top3.map((p, i) => `
          <div class="ad-plan-card ${i===0?'primary':''}">
            <div class="ad-plan-rank">${i+1}</div>
            <div class="ad-plan-info">
              <div class="ad-plan-label">${p.label}</div>
              <div class="ad-plan-tip">${p.tip}</div>
              ${p.rate !== null ? `<div class="ad-bar"><div class="ad-bar-fill" style="width:${Math.round(p.rate)}%;background:${barColor(p.rate)}"></div></div>
                <div class="ad-rate">${Math.round(p.rate)}% הצלחה</div>` : '<div class="ad-rate ad-new">חדש — לא נוסה עדיין</div>'}
            </div>
            <button class="btn gold ad-go" data-target="${p.target}" data-skill="${p.id}">תרגלו →</button>
          </div>
        `).join('')}
      </div>

      <div class="ad-section-title">📊 פרופיל המיומנויות</div>
      <div class="ad-profile">
        ${plan.map(p => `
          <div class="ad-skill-row">
            <span class="ad-skill-label">${p.label}</span>
            <div class="ad-bar"><div class="ad-bar-fill" style="width:${p.rate!==null?Math.round(p.rate):0}%;background:${p.rate!==null?barColor(p.rate):'var(--line)'}"></div></div>
            <span class="ad-skill-rate">${p.rate!==null?Math.round(p.rate)+'%':'—'}</span>
          </div>
        `).join('')}
      </div>

      <div class="ad-actions">
        <button class="btn" id="ad-reset">🗑 אפס נתונים</button>
        <button class="btn" id="ad-refresh">🔄 רענן</button>
      </div>
    `;

    app.querySelectorAll('.ad-go').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        const nav = document.querySelector(`[data-screen="${target}"]`);
        if (nav) nav.click();
      });
    });
    document.getElementById('ad-reset').addEventListener('click', () => {
      if (confirm('לאפס את כל נתוני ההתקדמות והחולשות?')) { SkillStats.reset(); render(); }
    });
    document.getElementById('ad-refresh').addEventListener('click', render);
  }

  function barColor(rate) {
    if (rate >= 80) return 'var(--ok,#27ae60)';
    if (rate >= 55) return 'var(--gold,#e3b341)';
    return 'var(--accent-red,#e74c3c)';
  }

  function init() {
    if (!document.getElementById('adaptive-app')) return;
    injectStyles();
    render();
    // רענון בכל כניסה למסך — כדי לשקף נתונים חדשים
    const nav = document.querySelector('[data-screen="adaptive"]');
    if (nav) nav.addEventListener('click', () => setTimeout(render, 50));
  }
  function stop() {}

  function injectStyles() {
    if (document.getElementById('ad-styles')) return;
    const s = document.createElement('style');
    s.id = 'ad-styles';
    s.textContent = `
      .ad-intro { font-size:14px; background:var(--bg-card,#1a1a2e); border-radius:10px; padding:12px 16px; border-right:3px solid var(--gold,#e3b341); margin-bottom:16px; line-height:1.5; }
      .ad-section-title { font-size:15px; font-weight:700; margin:18px 0 10px; color:var(--gold,#e3b341); }
      .ad-plan { display:flex; flex-direction:column; gap:10px; }
      .ad-plan-card { display:flex; align-items:center; gap:12px; background:var(--bg-card,#1a1a2e); border:1px solid var(--line,#333); border-radius:12px; padding:12px 14px; }
      .ad-plan-card.primary { border-color:var(--gold,#e3b341); border-width:2px; }
      .ad-plan-rank { width:32px; height:32px; flex-shrink:0; border-radius:50%; background:var(--bg-elev,#222); display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--gold,#e3b341); }
      .ad-plan-info { flex:1; min-width:0; }
      .ad-plan-label { font-size:15px; font-weight:700; color:var(--text,#eee); }
      .ad-plan-tip { font-size:12px; color:var(--text-dim,#999); margin:2px 0 6px; }
      .ad-bar { height:7px; background:var(--bg-elev,#222); border-radius:4px; overflow:hidden; margin:3px 0; }
      .ad-bar-fill { height:100%; border-radius:4px; transition:width .4s; }
      .ad-rate { font-size:11px; color:var(--text-dim,#999); }
      .ad-rate.ad-new { color:var(--aegean,#4fb3d9); }
      .ad-go { flex-shrink:0; }
      .ad-profile { display:flex; flex-direction:column; gap:8px; }
      .ad-skill-row { display:flex; align-items:center; gap:10px; }
      .ad-skill-label { width:120px; flex-shrink:0; font-size:13px; color:var(--text,#eee); }
      .ad-skill-row .ad-bar { flex:1; }
      .ad-skill-rate { width:42px; text-align:left; font-size:12px; color:var(--text-dim,#999); }
      .ad-actions { display:flex; gap:8px; margin-top:18px; }
    `;
    document.head.appendChild(s);
  }

  return { init, stop, render };
})();
