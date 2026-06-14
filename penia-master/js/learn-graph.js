/* עזרי גרף לימוד — איפה ללחוץ */
const LearnGraph = (() => {
  const STRINGS = ['C', 'F', 'A', 'D'];
  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];

  function shapeHint(id) {
    const ch = getChord(id);
    if (!ch) return '';
    return ch.shape.map((f, i) => {
      const n = i + 1;
      if (f === 'x') return `מיתר ${n} — מושתק ×`;
      if (f === 0) return `מיתר ${n} — פתוח ○`;
      return `סריג ${f} · מיתר ${n}`;
    }).join(' · ');
  }

  function wrapLearnHeader(container, title, sub) {
    const head = document.createElement('div');
    head.className = 'learn-graph-head';
    head.innerHTML = `
      <h3 class="learn-graph-title">${title}</h3>
      <p class="learn-graph-sub">${sub}</p>`;
    container.appendChild(head);
    return head;
  }

  function focusPanel(container, id) {
    let panel = container.querySelector('.learn-focus-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'learn-focus-panel';
      panel.innerHTML = `
        <p class="lfp-label">👆 לחצו כאן</p>
        <div class="lfp-visual"></div>
        <p class="lfp-hint"></p>`;
      container.appendChild(panel);
    }
    return panel;
  }

  return { STRINGS, STRING_HE, shapeHint, wrapLearnHeader, focusPanel };
})();
