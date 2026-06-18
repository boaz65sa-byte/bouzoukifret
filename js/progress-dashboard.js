/* ============================================================
   ProgressDashboard — גרף התקדמות (IndexedDB + SVG)
   ============================================================ */
'use strict';

const ProgressDashboard = (() => {
  const TYPE_LABELS = {
    xp: 'XP / תרגול',
    song_analyze: 'ניתוח שיר',
    play_along: 'Play-along',
    routine: 'שגרה יומית',
    exercise: 'תרגיל',
    session: 'זמן במסך',
  };

  const TYPE_COLORS = {
    xp: '#e3b341',
    song_analyze: '#4fb3d9',
    play_along: '#5fc88f',
    routine: '#c97bd9',
    exercise: '#d96459',
    session: '#6a8fa8',
  };

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function _fmtDate(dateStr) {
    const [, m, d] = dateStr.split('-');
    return `${d}/${m}`;
  }

  function _drawBarChart(svg, dates, byDate, mode) {
    const W = 560, H = 180, padL = 36, padR = 12, padT = 16, padB = 28;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    const vals = dates.map(d => {
      const row = byDate[d] || { count: 0, minutes: 0 };
      return mode === 'minutes' ? row.minutes : row.count;
    });
    const max = Math.max(1, ...vals);

    dates.forEach((d, i) => {
      const v = vals[i];
      const barW = chartW / dates.length * 0.65;
      const x = padL + (i + 0.5) * (chartW / dates.length) - barW / 2;
      const h = (v / max) * chartH;
      const y = padT + chartH - h;
      svgEl('rect', {
        x, y, width: barW, height: Math.max(0, h), rx: 3,
        fill: v > 0 ? '#4fb3d9' : '#28415c',
        opacity: v > 0 ? 0.85 : 0.4,
      }, svg);
      if (dates.length <= 14 && i % 2 === 0) {
        svgEl('text', {
          x: x + barW / 2, y: H - 6, fill: '#5a7187', 'font-size': 9,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, svg).textContent = _fmtDate(d);
      }
    });

    svgEl('line', {
      x1: padL, y1: padT + chartH, x2: W - padR, y2: padT + chartH,
      stroke: '#46627f', 'stroke-width': 1,
    }, svg);
  }

  function _drawTypeBars(svg, byType) {
    const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
    if (!entries.length) return;
    const W = 560, H = 120, padL = 120, padR = 20, rowH = 22;
    svg.setAttribute('viewBox', `0 0 ${W} ${Math.max(H, entries.length * rowH + 20)}`);
    const max = Math.max(1, ...entries.map(([, v]) => v));

    entries.forEach(([type, count], i) => {
      const y = 12 + i * rowH;
      const label = TYPE_LABELS[type] || type;
      svgEl('text', {
        x: padL - 8, y: y + 14, fill: '#9fb4c8', 'font-size': 11,
        'text-anchor': 'end', 'font-family': 'Heebo',
      }, svg).textContent = label;
      const barW = ((W - padL - padR) * count) / max;
      svgEl('rect', {
        x: padL, y, width: barW, height: 16, rx: 4,
        fill: TYPE_COLORS[type] || '#6a8fa8',
      }, svg);
      svgEl('text', {
        x: padL + barW + 6, y: y + 13, fill: '#e8eef5', 'font-size': 11,
        'font-family': 'Heebo',
      }, svg).textContent = String(count);
    });
  }

  async function render() {
    const root = document.getElementById('progress-app');
    if (!root) return;

    root.innerHTML = '<p class="hint">טוען נתונים…</p>';
    const sum = await ProgressLog.summarize(14);
    const xp = typeof XpSystem !== 'undefined' ? XpSystem.getXp() : 0;
    const streak = typeof DailyStreak !== 'undefined' ? DailyStreak.getStreak() : 0;

    root.innerHTML = `
      <div class="prog-summary grid-4">
        <div class="prog-stat card"><span class="prog-stat-val">${sum.totalEvents}</span><span class="prog-stat-lbl">פעילויות (14 יום)</span></div>
        <div class="prog-stat card"><span class="prog-stat-val">${sum.totalMinutes}</span><span class="prog-stat-lbl">דקות משוערות</span></div>
        <div class="prog-stat card"><span class="prog-stat-val">${sum.songs}</span><span class="prog-stat-lbl">שירים שנותחו</span></div>
        <div class="prog-stat card"><span class="prog-stat-val">${sum.playAlongs}</span><span class="prog-stat-lbl">Play-along</span></div>
      </div>

      <div class="prog-extra card">
        <span>🔥 רצף: <strong>${streak}</strong> ימים</span>
        <span>⭐ XP: <strong>${xp}</strong></span>
        <span>📋 שגרות: <strong>${sum.routines}</strong></span>
      </div>

      <div class="grid-2">
        <div class="card">
          <h3>פעילות יומית (14 יום)</h3>
          <svg id="prog-chart-activity" class="prog-chart"></svg>
        </div>
        <div class="card">
          <h3>דקות תרגול משוערות</h3>
          <svg id="prog-chart-minutes" class="prog-chart"></svg>
        </div>
      </div>

      <div class="card">
        <h3>פילוח לפי סוג</h3>
        <svg id="prog-chart-types" class="prog-chart"></svg>
      </div>

      <div class="card">
        <h3>פעילות אחרונה</h3>
        <div class="prog-recent" id="prog-recent"></div>
      </div>

      <p class="hint prog-footer">
        <button type="button" class="btn secondary" id="prog-refresh">רענן</button>
        <button type="button" class="btn secondary" id="prog-clear">מחק היסטוריה</button>
      </p>
    `;

    _drawBarChart($('#prog-chart-activity'), sum.dates, sum.byDate, 'count');
    _drawBarChart($('#prog-chart-minutes'), sum.dates, sum.byDate, 'minutes');
    _drawTypeBars($('#prog-chart-types'), sum.byType);

    const recent = document.getElementById('prog-recent');
    if (sum.events.length) {
      recent.innerHTML = sum.events.slice(0, 20).map(e => {
        const t = new Date(e.ts);
        const time = `${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`;
        const typeLbl = TYPE_LABELS[e.type] || e.type;
        const dur = e.durationSec ? ` · ${Math.round(e.durationSec / 60)} דק׳` : '';
        return `<div class="prog-row"><span class="prog-row-date">${e.date} ${time}</span><span class="prog-row-type">${typeLbl}</span><span class="prog-row-label">${_esc(e.label)}${dur}</span></div>`;
      }).join('');
    } else {
      recent.innerHTML = '<p class="hint">עדיין אין נתונים — תרגלו, נתחו שיר, או השלימו שגרה יומית.</p>';
    }

    document.getElementById('prog-refresh').onclick = () => render();
    document.getElementById('prog-clear').onclick = async () => {
      if (!confirm('למחוק את כל היסטוריית ההתקדמות?')) return;
      await ProgressLog.clearAll();
      render();
    };
  }

  function init() {
    const root = document.getElementById('progress-app');
    if (!root) return;
    ProgressLog.initNavTracking();
    render();

    document.querySelector('.nav-btn[data-screen="progress"]')?.addEventListener('click', () => {
      render();
    });
  }

  function stop() { /* static */ }

  return { init, render, stop };
})();
