/* מפת מודוס — מיתר רה + סדר הנגינה */
const ModeDiagram = (() => {
  const STRINGS = ['C', 'F', 'A', 'D'];
  const MAX_FRET = 12;

  function el(tag, attrs, parent) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, String(v)));
    if (parent) parent.appendChild(n);
    return n;
  }

  function drawFretboard(container, notes, opts = {}) {
    container.innerHTML = '';
    container.className = 'mode-diagram';
    const playNotes = opts.playNotes || notes;
    const fretW = 36, strH = 22, padL = 28, padT = 36;
    const w = padL + (MAX_FRET + 1) * fretW + 20;
    const h = padT + 4 * strH + 40;
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'mode-svg' }, container);

    el('text', {
      x: w / 2, y: 18, fill: '#f0cc74', 'font-size': 14, 'font-weight': 800,
      'text-anchor': 'middle', 'font-family': 'Heebo'
    }, svg).textContent = opts.title || 'מיתר רה — מפת המודוס';

    /* נוט */
    el('line', {
      x1: padL - 4, y1: padT, x2: padL - 4, y2: padT + 3 * strH,
      stroke: '#e8d9b0', 'stroke-width': 5
    }, svg);

    const fretSet = new Set(notes.map(n => n.fret));
    for (let f = 0; f <= MAX_FRET; f++) {
      const x = padL + f * fretW;
      el('line', {
        x1: x, y1: padT - 4, x2: x, y2: padT + 3 * strH + 4,
        stroke: f === 0 ? '#e8d9b0' : '#3b566f', 'stroke-width': f === 0 ? 3 : 1
      }, svg);
      if (f % 2 === 0 || f === 0) {
        el('text', {
          x, y: padT + 3 * strH + 18, fill: '#5a7187', 'font-size': 10,
          'text-anchor': 'middle', 'font-family': 'Heebo'
        }, svg).textContent = f;
      }
    }

    for (let s = 0; s < 4; s++) {
      const y = padT + s * strH;
      el('line', {
        x1: padL, y1: y, x2: padL + MAX_FRET * fretW, y2: y,
        stroke: '#8fa6bc', 'stroke-width': 1.2
      }, svg);
      el('text', {
        x: 12, y: y + 4, fill: '#5a7187', 'font-size': 11,
        'text-anchor': 'middle', 'font-family': 'Heebo'
      }, svg).textContent = STRINGS[s];
    }

    /* צלילי המודוס — מיתר D (0) */
    notes.forEach(n => {
      if (n.course !== 0 && n.course !== undefined) return;
      const x = padL + n.fret * fretW;
      const y = padT;
      el('circle', {
        cx: x, cy: y, r: 11, fill: '#e3b341', stroke: '#f0cc74', 'stroke-width': 2
      }, svg);
      el('text', {
        x, y: y + 4, fill: '#1a1408', 'font-size': 10, 'font-weight': 800,
        'text-anchor': 'middle', 'font-family': 'Heebo'
      }, svg).textContent = n.label || n.solfege;
    });

    /* סדר משחק */
    const seqWrap = document.createElement('div');
    seqWrap.className = 'mode-seq-row';
    seqWrap.dir = 'ltr';
    playNotes.forEach((n, i) => {
      const chip = document.createElement('span');
      chip.className = 'mode-seq-chip';
      chip.innerHTML = `<b>${i + 1}</b><span>${n.label || n.solfege}</span><small>סריג ${n.fret}</small>`;
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
    hint.textContent = '↑ הנקודות הצהובות = כל הצלילים במודוס · למטה = הסדר שיזרום במשחק';
    container.appendChild(hint);
  }

  function uniqueScaleNotes(notes) {
    const seen = new Set();
    return notes.filter(n => {
      if (seen.has(n.fret)) return false;
      seen.add(n.fret);
      return true;
    }).sort((a, b) => a.fret - b.fret);
  }

  return { draw: drawFretboard, uniqueScaleNotes };
})();
