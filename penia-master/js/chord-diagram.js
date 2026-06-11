/* דיאגרמות אקורד SVG */
const ChordDiagram = (() => {
  function el(tag, attrs, parent) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, String(v)));
    if (parent) parent.appendChild(n);
    return n;
  }

  function draw(container, id, opts = {}) {
    const chord = CHORD_LIB[id];
    if (!chord) return;
    const big = opts.large;
    const numFrets = 5, strW = big ? 28 : 22, frH = big ? 24 : 19;
    const padT = big ? 42 : 34, padL = big ? 36 : 28;
    const w = padL + strW * 3 + 16, h = padT + frH * numFrets + 18;

    container.innerHTML = '';
    container.className = 'chord-diagram' + (big ? ' large' : '');
    const svg = el('svg', { viewBox: `0 0 ${w} ${h}`, class: 'chord-svg' }, container);
    el('text', {
      x: padL + strW * 1.5, y: big ? 18 : 14,
      fill: '#f0cc74', 'font-size': big ? 18 : 14, 'font-weight': 800,
      'text-anchor': 'middle', 'font-family': 'Heebo'
    }, svg).textContent = id;
    for (let i = 0; i < 4; i++) {
      const x = padL + i * strW;
      el('line', { x1: x, y1: padT, x2: x, y2: padT + frH * numFrets, stroke: '#8fa6bc', 'stroke-width': 1.4 }, svg);
      el('text', { x, y: h - 2, fill: '#5a7187', 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'Heebo' }, svg)
        .textContent = ['C', 'F', 'A', 'D'][i];
    }
    el('line', { x1: padL - 2, y1: padT, x2: padL + strW * 3 + 2, y2: padT, stroke: '#e8d9b0', 'stroke-width': 4 }, svg);
    for (let f = 1; f <= numFrets; f++) {
      el('line', { x1: padL, y1: padT + f * frH, x2: padL + strW * 3, y2: padT + f * frH, stroke: '#3b566f', 'stroke-width': 1 }, svg);
      const used = chord.shape.some(s => s === f);
      el('text', {
        x: padL - 12, y: padT + (f - 0.5) * frH + 4,
        fill: used ? '#e3b341' : '#5a7187', 'font-size': 11, 'font-weight': used ? 800 : 400,
        'text-anchor': 'middle', 'font-family': 'Heebo'
      }, svg).textContent = f;
    }
    chord.shape.forEach((f, i) => {
      const x = padL + i * strW;
      if (f === 'x') {
        el('text', { x, y: padT - 6, fill: '#d96459', 'font-size': 12, 'font-weight': 700, 'text-anchor': 'middle' }, svg).textContent = '×';
      } else if (f === 0) {
        el('circle', { cx: x, cy: padT - 10, r: 5, fill: 'none', stroke: '#5fc88f', 'stroke-width': 2 }, svg);
      } else {
        el('circle', { cx: x, cy: padT + (f - 0.5) * frH, r: big ? 9 : 7, fill: '#e3b341' }, svg);
        el('text', {
          x, y: padT + (f - 0.5) * frH + 4, fill: '#1a1408',
          'font-size': 10, 'font-weight': 800, 'text-anchor': 'middle', 'font-family': 'Heebo'
        }, svg).textContent = f;
      }
    });
    if (!opts.noLabel) {
      const lbl = document.createElement('p');
      lbl.className = 'chord-diagram-label';
      lbl.textContent = chord.he;
      container.appendChild(lbl);
    }
  }

  return { draw };
})();
