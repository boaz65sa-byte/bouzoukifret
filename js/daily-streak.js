/* ============================================================
   Daily Streak — רצף ימי תרגול (Duolingo-style)
   ============================================================ */
'use strict';

const DailyStreak = (() => {
  const KEY = 'bouzouki_daily_streak_v1';

  let data = {
    streak: 0,
    longest: 0,
    lastDate: null,
    totalDays: 0,
    todayDone: false,
  };

  function _today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function _yesterday() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) data = { ...data, ...JSON.parse(raw) };
    } catch { /* noop */ }
    const today = _today();
    if (data.lastDate && data.lastDate !== today && data.lastDate !== _yesterday()) {
      data.streak = 0;
      data.todayDone = false;
      save();
    } else if (data.lastDate === today) {
      data.todayDone = true;
    } else {
      data.todayDone = false;
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* noop */ }
  }

  /**
   * רושם פעילות לימוד — פעם אחת ביום מעלה את הרצף
   * @param {string} reason — song_analyze | xp | routine | exercise
   */
  function touch(reason) {
    const today = _today();
    if (data.lastDate === today) {
      render();
      return data.streak;
    }

    const wasYesterday = data.lastDate === _yesterday();
    if (wasYesterday) data.streak += 1;
    else data.streak = 1;

    data.lastDate = today;
    data.todayDone = true;
    data.totalDays += 1;
    data.longest = Math.max(data.longest, data.streak);
    save();

    const bonus = Math.min(25, 5 + data.streak * 2);
    if (typeof XpSystem !== 'undefined') {
      XpSystem.award(bonus, `רצף יומי ${data.streak} 🔥`, { skipStreakTouch: true });
    }

    if (data.streak === 7 || data.streak === 30 || data.streak % 10 === 0) {
      _showMilestone(data.streak);
    }

    render();
    return data.streak;
  }

  function _showMilestone(n) {
    const popup = document.createElement('div');
    popup.className = 'daily-streak-popup';
    popup.innerHTML = `<span class="daily-streak-fire">🔥</span> <strong>${n} ימים ברצף!</strong><br><small>כל הכבוד — ממשיכים מחר</small>`;
    document.body.appendChild(popup);
    requestAnimationFrame(() => popup.classList.add('show'));
    setTimeout(() => {
      popup.classList.remove('show');
      setTimeout(() => popup.remove(), 400);
    }, 3500);
  }

  function render() {
    const el = document.getElementById('sidebar-streak');
    if (!el) return;
    if (data.streak <= 0 && !data.todayDone) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const fire = data.todayDone ? '🔥' : '⏳';
    el.innerHTML = `${fire} <b>${data.streak}</b> ימים ברצף` +
      (data.longest > data.streak ? ` · שיא ${data.longest}` : '');
    el.title = data.todayDone
      ? 'תרגלתם היום — חזרו מחר לשמור על הרצף!'
      : 'תרגלו היום לשמור על הרצף!';
  }

  function getStreak() { return data.streak; }
  function isTodayDone() { return data.todayDone; }

  function init() {
    load();
    render();
    if (!document.getElementById('daily-streak-styles')) {
      const s = document.createElement('style');
      s.id = 'daily-streak-styles';
      s.textContent = `
        .sidebar-streak {
          font-size: 13px; color: var(--gold-soft); margin: 8px 0 4px;
          padding: 6px 10px; border-radius: 8px;
          background: rgba(227,179,65,0.08); border: 1px solid rgba(227,179,65,0.2);
        }
        .sidebar-streak b { color: var(--gold); font-size: 15px; }
        .daily-streak-popup {
          position: fixed; top: 72px; left: 50%; transform: translateX(-50%) translateY(-20px);
          background: var(--bg-card); border: 2px solid var(--gold);
          border-radius: 14px; padding: 16px 28px; z-index: 10001;
          text-align: center; opacity: 0; transition: 0.35s; direction: rtl;
          box-shadow: 0 8px 32px rgba(227,179,65,0.35);
        }
        .daily-streak-popup.show { opacity: 1; transform: translateX(-50%) translateY(0); }
        .daily-streak-fire { font-size: 32px; display: block; margin-bottom: 4px; }
      `;
      document.head.appendChild(s);
    }
  }

  return { init, touch, render, getStreak, isTodayDone, load };
})();
