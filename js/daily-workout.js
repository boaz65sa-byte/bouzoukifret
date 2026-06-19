/* ============================================================
   DailyWorkout — אימון יומי מובנה
   שגרת ~15 דקות שמתקדמת שבוע-שבוע לפי מסלול הלימוד.
   חימום → סולם היום → טכניקה → טרמולו → קטע משיר.
   משתלב עם DailyStreak לשמירת רצף.
   ============================================================ */
'use strict';

const DailyWorkout = (() => {

  /* תוכניות שבועיות — מחזוריות; השבוע נקבע לפי מספר ימי התרגול */
  const WEEKS = [
    {
      week: 1, title: 'שבוע 1 · יסודות', focus: 'פריטה למטה + סולם ראסט',
      segments: [
        { icon: '🔥', label: 'חימום: פריטות למטה', mins: 3, target: 'game',
          desc: 'D D D D על מיתר D, 60 BPM. תזמון לפני הכל.' },
        { icon: '🎼', label: 'סולם ראסט — עלייה', mins: 4, target: 'modus-path',
          desc: 'נגנו את ראסט תו-תו. שמעו, אז נגנו עם המיקרופון.' },
        { icon: '🎸', label: 'אקורד Am פתוח', mins: 3, target: 'penia',
          desc: 'שמעו את הצליל של Am פתוח — כל המיתרים פתוחים.' },
        { icon: '🎶', label: 'הכנה לטרמולו', mins: 3, target: 'skills',
          desc: 'D-U × 4, נחו 2 שניות, חזרו. בלי מאמץ.' },
        { icon: '🎵', label: 'האזנה: Misirlou', mins: 2, target: 'song-learn',
          desc: 'הקשיבו לשיר וזהו את הניגון הראשי.' },
      ]
    },
    {
      week: 2, title: 'שבוע 2 · חליפות', focus: 'פריטה ↓↑ + סולם חיג׳אז',
      segments: [
        { icon: '🔥', label: 'חימום: חליפות ↓↑', mins: 3, target: 'game',
          desc: 'שמיניות, 65 BPM. היד לא עוצרת.' },
        { icon: '🎼', label: 'סולם חיג׳אז', mins: 4, target: 'modus-path',
          desc: 'שימו לב לקפיצה מי♭→פה# — הצבע של החיג׳אז.' },
        { icon: '🎸', label: 'Am → E7 → Am', mins: 3, target: 'modus-path',
          desc: 'מעברי אקורדים איטיים, נקיים.' },
        { icon: '🎶', label: 'טרמולו — 10 פריטות', mins: 3, target: 'skills',
          desc: 'פרץ מהיר, נוח, חזרו. מטרה: יותר מהיר בסוף.' },
        { icon: '🎵', label: 'קטע משיר: Frankosyriani', mins: 2, target: 'song-learn',
          desc: 'הקשיבו לקפיצה בין Am ל-Dm.' },
      ]
    },
    {
      week: 3, title: 'שבוע 3 · חסאפיקו', focus: 'מקצב חסאפיקו + אוסאק',
      segments: [
        { icon: '🔥', label: 'חימום: חסאפיקו', mins: 3, target: 'game',
          desc: 'D - d u, 80 BPM. הפעמה הראשונה בולטת.' },
        { icon: '🎼', label: 'סולם אוסאק', mins: 4, target: 'modus-path',
          desc: 'פה טבעי במקום פה# — רך יותר מחיג׳אז.' },
        { icon: '🎸', label: 'Dm → Gm → A7 → Dm', mins: 3, target: 'modus-path',
          desc: 'רצף מינורי ועצוב.' },
        { icon: '🎶', label: 'טרמולו 4/שניה', mins: 3, target: 'skills',
          desc: 'מטרה: 4 פריטות לשנייה, אחיד.' },
        { icon: '🎵', label: 'נתיב חיג׳אז מלא', mins: 2, target: 'modus-path',
          desc: 'עברו את כל 5 התחנות של החיג׳אז.' },
      ]
    },
    {
      week: 4, title: 'שבוע 4 · זאימבקיקו', focus: 'המקצב הקדוש 9/4',
      segments: [
        { icon: '🔥', label: 'חימום: פריטה חופשית', mins: 2, target: 'game',
          desc: 'בחרו תבנית שאתם אוהבים, התחממו.' },
        { icon: '🥁', label: 'זאימבקיקו 9/4', mins: 4, target: 'game',
          desc: 'D - - d u D - u -, 60 BPM. ספרו בלב.' },
        { icon: '🎼', label: 'סולם מינורה', mins: 3, target: 'modus-path',
          desc: 'הסי הטבעי שובר את העצב — "מינור עם תקווה".' },
        { icon: '🎶', label: 'טרמולו מלודי', mins: 3, target: 'skills',
          desc: 'טרמולו תוך שינוי סריגים.' },
        { icon: '🎵', label: 'Synnefiasmeni Kyriaki', mins: 3, target: 'song-learn',
          desc: 'זאימבקיקו איטי וכבד — "קדוש".' },
      ]
    },
    {
      week: 5, title: 'שבוע 5 · שילוב', focus: 'מעבר בין דרומוסים',
      segments: [
        { icon: '🔥', label: 'חימום + כיול', mins: 2, target: 'game',
          desc: 'כיילו תזמון, התחממו עם חליפות.' },
        { icon: '🔄', label: 'חיג׳אז → ראסט → אוסאק', mins: 4, target: 'modus-path',
          desc: 'נגנו את שלושת הסולמות ברצף — הרגישו את ההבדל.' },
        { icon: '🥁', label: 'צ׳יפטטלי', mins: 3, target: 'game',
          desc: 'מקצב "נשי" שזורם — גלים, לא פסיעות.' },
        { icon: '🎶', label: 'טרמולו 5/שניה', mins: 3, target: 'skills',
          desc: 'מתקרבים לטרמולו "אמיתי".' },
        { icon: '🧠', label: 'בדיקת המאמן החכם', mins: 3, target: 'adaptive',
          desc: 'ראו מה החולשות שלכם והתמקדו בהן.' },
      ]
    },
    {
      week: 6, title: 'שבוע 6 · עצמאות', focus: 'טאקסים ושירים שלמים',
      segments: [
        { icon: '🔥', label: 'חימום אישי', mins: 2, target: 'game',
          desc: 'התחממו כרצונכם.' },
        { icon: '🎤', label: 'טאקסים בחיג׳אז', mins: 4, target: 'skills',
          desc: '2 דקות אילתור חופשי בחיג׳אז — הצליל נושם.' },
        { icon: '🎵', label: 'שיר שלם מ-YouTube', mins: 5, target: 'song-learn',
          desc: 'בחרו שיר, נתחו אקורדים, נגנו לאט יחד.' },
        { icon: '🎶', label: 'טרמולו 6/שניה', mins: 2, target: 'skills',
          desc: 'טרמולו אמיתי — עכשיו על האחידות.' },
        { icon: '🧠', label: 'תוכנית אישית', mins: 2, target: 'adaptive',
          desc: 'עקבו אחרי התוכנית של המאמן החכם.' },
      ]
    },
  ];

  const PROG_KEY = 'daily-workout-progress';

  function loadProg() {
    try { return JSON.parse(localStorage.getItem(PROG_KEY) || '{}'); } catch { return {}; }
  }
  function saveProg(p) { try { localStorage.setItem(PROG_KEY, JSON.stringify(p)); } catch {} }

  function todayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  /* קביעת השבוע הנוכחי לפי כמות ימי התרגול הכוללת */
  function currentWeek() {
    let totalDays = 0;
    if (typeof DailyStreak !== 'undefined') {
      // DailyStreak שומר totalDays פנימית; ניגש דרך localStorage
      try {
        const ds = JSON.parse(localStorage.getItem('bouzouki_daily_streak_v1') || '{}');
        totalDays = ds.totalDays || 0;
      } catch {}
    }
    const weekNum = Math.floor(totalDays / 5) % WEEKS.length;
    return WEEKS[weekNum];
  }

  /* מצב היום: אילו סגמנטים הושלמו */
  function todayState() {
    const p = loadProg();
    const t = todayStr();
    if (p.date !== t) return { date: t, done: [] };
    return p;
  }
  function setSegDone(idx) {
    const s = todayState();
    if (!s.done.includes(idx)) s.done.push(idx);
    saveProg(s);
    return s;
  }

  /* ---------- UI ---------- */
  function render() {
    const app = document.getElementById('daily-workout-app');
    if (!app) return;
    const wk = currentWeek();
    const state = todayState();
    const doneCount = state.done.length;
    const total = wk.segments.length;
    const allDone = doneCount >= total;
    const streak = (typeof DailyStreak !== 'undefined') ? DailyStreak.getStreak() : 0;

    app.innerHTML = `
      <div class="dw-header">
        <div class="dw-streak">🔥 <b>${streak}</b> ימים ברצף</div>
        <div class="dw-week">${wk.title}</div>
        <div class="dw-focus">מיקוד: ${wk.focus}</div>
      </div>

      <div class="dw-progress-wrap">
        <div class="dw-progress-bar"><div class="dw-progress-fill" style="width:${Math.round(doneCount/total*100)}%"></div></div>
        <div class="dw-progress-txt">${doneCount} / ${total} תרגילים · כ-${wk.segments.reduce((a,s)=>a+s.mins,0)} דקות</div>
      </div>

      ${allDone ? `<div class="dw-complete">🏆 סיימתם את האימון היומי! ${streak > 0 ? `הרצף שלכם: ${streak} ימים.` : ''}<br>חזרו מחר כדי לשמור על הרצף.</div>` : ''}

      <div class="dw-segments">
        ${wk.segments.map((s, i) => {
          const done = state.done.includes(i);
          return `<div class="dw-seg ${done ? 'done' : ''}">
            <div class="dw-seg-icon">${done ? '✓' : s.icon}</div>
            <div class="dw-seg-body">
              <div class="dw-seg-label">${s.label} <span class="dw-seg-mins">${s.mins} דק׳</span></div>
              <div class="dw-seg-desc">${s.desc}</div>
            </div>
            <div class="dw-seg-actions">
              ${done ? '<span class="dw-seg-check">הושלם</span>' : `
                <button class="btn gold dw-go" data-target="${s.target}" data-idx="${i}">התחל →</button>
                <button class="btn dw-skip" data-idx="${i}">✓</button>`}
            </div>
          </div>`;
        }).join('')}
      </div>

      <div class="dw-foot">
        <p class="dw-tip">💡 5 דקות ביום עדיף על שעה פעם בשבוע. עקביות בונה את היד.</p>
      </div>
    `;

    app.querySelectorAll('.dw-go').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx, 10);
        markDone(idx);
        const nav = document.querySelector(`[data-screen="${btn.dataset.target}"]`);
        if (nav) nav.click();
      });
    });
    app.querySelectorAll('.dw-skip').forEach(btn => {
      btn.addEventListener('click', () => markDone(parseInt(btn.dataset.idx, 10)));
    });
  }

  function markDone(idx) {
    const wk = currentWeek();
    const state = setSegDone(idx);
    // אם כל הסגמנטים הושלמו — סמן יום תרגול
    if (state.done.length >= wk.segments.length && typeof DailyStreak !== 'undefined') {
      DailyStreak.touch('routine');
    }
    render();
  }

  function init() {
    if (!document.getElementById('daily-workout-app')) return;
    injectStyles();
    render();
    const nav = document.querySelector('[data-screen="daily-workout"]');
    if (nav) nav.addEventListener('click', () => setTimeout(render, 50));
  }
  function stop() {}

  function injectStyles() {
    if (document.getElementById('dw-styles')) return;
    const st = document.createElement('style');
    st.id = 'dw-styles';
    st.textContent = `
      .dw-header { text-align:center; margin-bottom:16px; }
      .dw-streak { font-size:15px; color:var(--gold,#e3b341); margin-bottom:6px; }
      .dw-streak b { font-size:20px; }
      .dw-week { font-size:22px; font-weight:800; color:var(--text,#eee); }
      .dw-focus { font-size:13px; color:var(--text-dim,#999); margin-top:2px; }
      .dw-progress-wrap { margin:14px 0; }
      .dw-progress-bar { height:10px; background:var(--bg-elev,#222); border-radius:5px; overflow:hidden; }
      .dw-progress-fill { height:100%; background:var(--gold,#e3b341); border-radius:5px; transition:width .4s; }
      .dw-progress-txt { font-size:12px; color:var(--text-dim,#999); text-align:center; margin-top:6px; }
      .dw-complete { background:rgba(39,174,96,.12); border:1px solid var(--ok,#27ae60); border-radius:12px; padding:14px; text-align:center; font-size:14px; color:var(--text,#eee); margin-bottom:14px; line-height:1.5; }
      .dw-segments { display:flex; flex-direction:column; gap:10px; }
      .dw-seg { display:flex; align-items:center; gap:12px; background:var(--bg-card,#1a1a2e); border:1px solid var(--line,#333); border-radius:12px; padding:12px 14px; transition:opacity .2s; }
      .dw-seg.done { opacity:.6; }
      .dw-seg-icon { width:40px; height:40px; flex-shrink:0; border-radius:50%; background:var(--bg-elev,#222); display:flex; align-items:center; justify-content:center; font-size:20px; }
      .dw-seg.done .dw-seg-icon { background:var(--ok,#27ae60); color:#fff; }
      .dw-seg-body { flex:1; min-width:0; }
      .dw-seg-label { font-size:15px; font-weight:700; color:var(--text,#eee); }
      .dw-seg-mins { font-size:11px; color:var(--text-dim,#999); font-weight:400; }
      .dw-seg-desc { font-size:12px; color:var(--text-dim,#999); margin-top:2px; line-height:1.4; }
      .dw-seg-actions { flex-shrink:0; display:flex; gap:6px; align-items:center; }
      .dw-skip { padding:6px 10px; }
      .dw-seg-check { font-size:12px; color:var(--ok,#27ae60); font-weight:600; }
      .dw-foot { margin-top:16px; }
      .dw-tip { font-size:12px; color:var(--text-dim,#999); text-align:center; }
    `;
    document.head.appendChild(st);
  }

  return { init, stop, render };
})();
