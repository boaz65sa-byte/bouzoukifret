/* גרף לימוד מודוס — מיתר רה · איפה ללחוץ */
const ModeDiagram = (() => {
  const STRINGS = ['C', 'F', 'A', 'D'];
  const D_COURSE = 3;
  const MAX_FRET = 12;

  function el(tag, attrs, parent) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, String(v)));
    if (parent) parent.appendChild(n);
    return n;
  }

  function uniqueScaleNotes(notes) {
    const seen = new Set();
    return notes.filter(n => {
      if (seen.has(n.fret)) return false;
      seen.add(n.fret);
      return true;
    }).sort((a, b) => a.fret - b.fret);
  }

  function fretRange(notes) {
    const frets = notes.map(n => n.fret);
    const min = Math.max(0, Math.min(...frets) - 1);
    const max = Math.min(MAX_FRET, Math.max(...frets) + 1);
    return { min, max };
  }

  function draw(container, notes, opts = {}) {
    container.innerHTML = '';
    container.className = 'mode-diagram learn-graph-box';
    const playNotes = opts.playNotes || notes;
    const scaleNotes = notes.length ? notes : uniqueScaleNotes(playNotes);
    const { min: fMin, max: fMax } = fretRange(scaleNotes.length ? scaleNotes : playNotes);

    LearnGraph.wrapLearnHeader(
      container,
      '📍 גרף לימוד — איפה ללחוץ',
      'מיתר רה (D) — הנקודות הצהובות = סריגים ללחיצה · לחצו על צליל למטה לראות על הגרף'
    );

    const fretW = 42, strH = 26, padL = 36, padT = 48;
    const fretCount = fMax - fMin + 1;
    const w = padL + fretCount * fretW + 24;
    const h = padT + 4 * strH + 52;
    const svgWrap = document.createElement('div');
    svgWrap.className = 'learn-fret-wrap';
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'mode-svg learn-fret-svg' }, svgWrap);

    el('text', {
      x: w / 2, y: 22, fill: '#f0cc74', 'font-size': 15, 'font-weight': 800,
      'text-anchor': 'middle', 'font-family': 'Heebo'
    }, svg).textContent = opts.title || 'מיתר רה — מפת המודוס';

    /* הדגשת מיתר D */
    const dY = padT + D_COURSE * strH;
    el('rect', {
      x: padL - 8, y: dY - strH / 2 - 2, width: fretCount * fretW + 16, height: strH + 4,
      fill: 'rgba(227,179,65,0.12)', rx: 6, stroke: 'rgba(227,179,65,0.35)', 'stroke-width': 1.5
    }, svg);

    el('text', {
      x: 14, y: dY + 5, fill: '#e3b341', 'font-size': 12, 'font-weight': 800,
      'text-anchor': 'middle', 'font-family': 'Heebo'
    }, svg).textContent = 'רה';

    /* נוט */
    const nutX = padL - 4;
    el('line', {
      x1: nutX, y1: padT - 2, x2: nutX, y2: padT + 3 * strH + 2,
      stroke: '#e8d9b0', 'stroke-width': 6
    }, svg);

    const noteEls = new Map();

    for (let f = fMin; f <= fMax; f++) {
      const x = padL + (f - fMin) * fretW;
      el('line', {
        x1: x, y1: padT - 6, x2: x, y2: padT + 3 * strH + 6,
        stroke: f === 0 ? '#e8d9b0' : '#3b566f', 'stroke-width': f === 0 ? 3 : 1
      }, svg);
      el('text', {
        x, y: padT + 3 * strH + 22, fill: '#8fa6bc', 'font-size': 11,
        'text-anchor': 'middle', 'font-family': 'Heebo', 'font-weight': 700
      }, svg).textContent = f;
    }

    for (let s = 0; s < 4; s++) {
      const y = padT + s * strH;
      el('line', {
        x1: padL, y1: y, x2: padL + (fretCount - 1) * fretW, y2: y,
        stroke: s === D_COURSE ? '#e3b341' : '#5a7187', 'stroke-width': s === D_COURSE ? 2 : 1
      }, svg);
      el('text', {
        x: 14, y: y + 4, fill: s === D_COURSE ? '#f0cc74' : '#5a7187',
        'font-size': 11, 'font-weight': s === D_COURSE ? 800 : 400,
        'text-anchor': 'middle', 'font-family': 'Heebo'
      }, svg).textContent = STRINGS[s];
    }

    scaleNotes.forEach(n => {
      const x = padL + (n.fret - fMin) * fretW;
      const y = dY;
      const g = el('g', { class: 'mode-note-dot', 'data-fret': n.fret }, svg);
      el('circle', {
        cx: x, cy: y, r: 16, fill: '#e3b341', stroke: '#f0cc74', 'stroke-width': 2.5,
        class: 'note-ring'
      }, g);
      el('text', {
        x, y: y + 5, fill: '#1a1408', 'font-size': 12, 'font-weight': 900,
        'text-anchor': 'middle', 'font-family': 'Heebo'
      }, g).textContent = n.fret;
      el('text', {
        x, y: y - 22, fill: '#f0cc74', 'font-size': 11, 'font-weight': 700,
        'text-anchor': 'middle', 'font-family': 'Heebo'
      }, g).textContent = n.label || n.solfege;
      noteEls.set(n.fret, g);
    });

    container.appendChild(svgWrap);

    /* פאנל מיקוד */
    const panel = LearnGraph.focusPanel(container);
    const lfpV = panel.querySelector('.lfp-visual');
    const lfpH = panel.querySelector('.lfp-hint');

    function highlightStep(idx) {
      playNotes.forEach((_, i) => {
        const chip = container.querySelector(`.mode-seq-chip[data-i="${i}"]`);
        if (chip) chip.classList.toggle('active', i === idx);
      });
      noteEls.forEach(g => g.classList.remove('pulse'));
      const n = playNotes[idx];
      if (!n) return;
      const g = noteEls.get(n.fret);
      if (g) g.classList.add('pulse');
      lfpV.innerHTML = `<span class="lfp-big-fret">${n.fret}</span><span class="lfp-big-name">${n.label || n.solfege}</span>`;
      lfpH.textContent = n.fret === 0
        ? 'מיתר רה פתוח — ללא לחיצה בשמאל'
        : `לחצו מיתר רה (D) בסריג ${n.fret} · צליל ${n.label || n.solfege}`;
      panel.classList.add('show');
    }

    /* סדר משחק — לחיצה מדגישה על הגרף */
    const seqLabel = document.createElement('p');
    seqLabel.className = 'learn-seq-label';
    seqLabel.textContent = 'סדר במשחק — לחצו כל צליל לראות איפה על הסריג:';
    container.appendChild(seqLabel);

    const seqWrap = document.createElement('div');
    seqWrap.className = 'mode-seq-row learn-seq-row';
    seqWrap.dir = 'ltr';
    playNotes.forEach((n, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'mode-seq-chip';
      chip.dataset.i = i;
      chip.innerHTML = `<b>${i + 1}</b><span>${n.label || n.solfege}</span><small>סריג ${n.fret}</small>`;
      chip.addEventListener('click', () => highlightStep(i));
      seqWrap.appendChild(chip);
      if (i < playNotes.length - 1) {
        const arr = document.createElement('span');
        arr.className = 'mode-seq-arrow';
        arr.textContent = '→';
        seqWrap.appendChild(arr);
      }
    });
    container.appendChild(seqWrap);

    const hint = document.createElement('p');
    hint.className = 'mode-map-hint';
    hint.textContent = 'למדו את הגרף ↑ · כשמוכנים לחצו ▶ שחק — הצלילים יזרמו לקו הזהב';
    container.appendChild(hint);

    highlightStep(0);
    return { highlightStep };
  }

  /* גרף קומpактי — בתוך מסך המשחק */
  function drawPlay(container, notes, opts = {}) {
    container.innerHTML = '';
    container.className = 'mode-diagram play-learn-inline';
    const playNotes = opts.playNotes || notes;
    const scaleNotes = notes.length ? notes : uniqueScaleNotes(playNotes);
    const { min: fMin, max: fMax } = fretRange(scaleNotes.length ? scaleNotes : playNotes);

    const head = document.createElement('div');
    head.className = 'pli-head';
    head.innerHTML = '<span class="pli-title">📍 גרף לימוד</span><span class="pli-sub">לחצו צליל · ראו איפה על הסריג</span>';
    container.appendChild(head);

    const focus = document.createElement('div');
    focus.className = 'pli-focus';
    focus.innerHTML = '<span class="pli-fret">—</span><span class="pli-name">לחצו על צליל</span><span class="pli-hint"></span>';
    container.appendChild(focus);
    const lfpFret = focus.querySelector('.pli-fret');
    const lfpName = focus.querySelector('.pli-name');
    const lfpHint = focus.querySelector('.pli-hint');

    const fretW = 32, strH = 18, padL = 28, padT = 28;
    const fretCount = fMax - fMin + 1;
    const w = padL + fretCount * fretW + 16;
    const h = padT + 4 * strH + 28;
    const svgWrap = document.createElement('div');
    svgWrap.className = 'pli-fret-wrap';
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'mode-svg pli-svg' }, svgWrap);
    const dY = padT + D_COURSE * strH;

    el('rect', {
      x: padL - 6, y: dY - strH / 2 - 1, width: fretCount * fretW + 12, height: strH + 2,
      fill: 'rgba(227,179,65,0.14)', rx: 4
    }, svg);

    const noteEls = new Map();
    for (let f = fMin; f <= fMax; f++) {
      const x = padL + (f - fMin) * fretW;
      el('line', {
        x1: x, y1: padT - 2, x2: x, y2: padT + 3 * strH + 2,
        stroke: f === 0 ? '#e8d9b0' : '#3b566f', 'stroke-width': 1
      }, svg);
    }
    for (let s = 0; s < 4; s++) {
      const y = padT + s * strH;
      el('line', {
        x1: padL, y1: y, x2: padL + (fretCount - 1) * fretW, y2: y,
        stroke: s === D_COURSE ? '#e3b341' : '#5a7187', 'stroke-width': s === D_COURSE ? 1.5 : 0.8
      }, svg);
    }
    scaleNotes.forEach(n => {
      const x = padL + (n.fret - fMin) * fretW;
      const g = el('g', { class: 'mode-note-dot' }, svg);
      el('circle', { cx: x, cy: dY, r: 11, fill: '#e3b341', class: 'note-ring' }, g);
      el('text', {
        x, y: dY + 4, fill: '#1a1408', 'font-size': 9, 'font-weight': 900,
        'text-anchor': 'middle', 'font-family': 'Heebo'
      }, g).textContent = n.fret;
      noteEls.set(n.fret, g);
    });
    container.appendChild(svgWrap);

    const seqWrap = document.createElement('div');
    seqWrap.className = 'pli-seq';
    seqWrap.dir = 'ltr';
    container.appendChild(seqWrap);

    function highlightStep(idx, live) {
      playNotes.forEach((_, i) => {
        const chip = seqWrap.querySelector(`.mode-seq-chip[data-i="${i}"]`);
        if (!chip) return;
        chip.classList.toggle('active', i === idx);
        chip.classList.toggle('live', live && i === idx);
      });
      noteEls.forEach(g => g.classList.remove('pulse'));
      const n = playNotes[idx];
      if (!n) return;
      const g = noteEls.get(n.fret);
      if (g) g.classList.add('pulse');
      lfpFret.textContent = n.fret;
      lfpName.textContent = n.label || n.solfege;
      lfpHint.textContent = n.fret === 0 ? 'מיתר רה פתוח' : `סריג ${n.fret} · מיתר D`;
      focus.classList.add('show');
    }

    playNotes.forEach((n, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'mode-seq-chip pli-chip';
      chip.dataset.i = i;
      chip.innerHTML = `<span>${n.label || n.solfege}</span><small>${n.fret}</small>`;
      chip.addEventListener('click', () => highlightStep(i, false));
      seqWrap.appendChild(chip);
    });

    highlightStep(0, false);
    return { highlightStep };
  }

  return { draw, drawPlay, uniqueScaleNotes };
})();
