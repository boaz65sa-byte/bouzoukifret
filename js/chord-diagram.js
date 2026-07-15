/* ============================================================
   ChordDiagram — דיאגרמת אקורד אחידה לבוזוקי CFAD
   shape ב-data.js: [C, F, A, D] מהבס (דו) למיתר העליון (רה)
   תצוגה משמאל→ימין: D · A · F · C (גבוה→נמוך)
   ============================================================ */
'use strict';

const ChordDiagram = (() => {
  const SHAPE_IDX = [3, 2, 1, 0];
  const LABELS = ['D', 'A', 'F', 'C'];
  const LABELS_HE = ['רה↑', 'לה', 'פה', 'דו↓'];

  function fretAtShape(shape, displayIdx) {
    return shape[SHAPE_IDX[displayIdx]];
  }

  function draw(svg, { name, shape, numFrets = 5, compact = false, showFretNumbers = true }) {
    svg.innerHTML = '';
    const mirrorH = typeof FretboardMirror !== 'undefined' && FretboardMirror.isH();
    const order = mirrorH ? [...SHAPE_IDX].reverse() : SHAPE_IDX;
    const labels = mirrorH ? [...LABELS].reverse() : LABELS;
    const strW = compact ? 20 : 22;
    const frH = compact ? 17 : 19;
    const padT = compact ? 28 : 34;
    const padL = compact ? 24 : 28;
    const titleSize = compact ? 12 : 14;
    const w = padL + strW * 3 + (compact ? 10 : 14);
    const h = padT + frH * numFrets + (compact ? 10 : 14);
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);

    if (name) {
      svgEl('text', {
        x: padL + strW * 1.5, y: compact ? 12 : 14,
        fill: '#f0cc74', 'font-size': titleSize, 'font-weight': 800,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = name;
    }

    for (let s = 0; s < 4; s++) {
      const x = padL + s * strW;
      svgEl('line', {
        x1: x, y1: padT, x2: x, y2: padT + frH * numFrets,
        stroke: '#8fa6bc', 'stroke-width': compact ? 1 : 1.2,
      }, svg);
      svgEl('text', {
        x, y: h - 1, fill: '#5a7187', 'font-size': compact ? 8.5 : 9.5,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = labels[s];
    }

    svgEl('line', {
      x1: padL - 2, y1: padT, x2: padL + strW * 3 + 2, y2: padT,
      stroke: '#e8d9b0', 'stroke-width': compact ? 3 : 3.5,
    }, svg);

    for (let f = 1; f <= numFrets; f++) {
      svgEl('line', {
        x1: padL, y1: padT + f * frH, x2: padL + strW * 3, y2: padT + f * frH,
        stroke: '#3b566f', 'stroke-width': compact ? 0.8 : 1,
      }, svg);
      if (showFretNumbers && !compact) {
        const used = shape.some(v => v !== 'x' && Number(v) === f);
        svgEl('text', {
          x: padL - 10, y: padT + (f - 0.5) * frH + 3.5,
          fill: used ? '#e3b341' : '#5a7187',
          'font-size': 10, 'font-weight': used ? 800 : 400,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, svg).textContent = f;
      }
    }

    for (let s = 0; s < 4; s++) {
      const fret = shape[order[s]];
      const x = padL + s * strW;
      if (fret === 'x') {
        svgEl('text', {
          x, y: padT - (compact ? 4 : 5), fill: '#d96459',
          'font-size': compact ? 10 : 11, 'font-weight': 700,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, svg).textContent = '×';
      } else if (fret === 0) {
        svgEl('circle', {
          cx: x, cy: padT - (compact ? 7 : 9), r: compact ? 3.5 : 4,
          fill: 'none', stroke: '#5fc88f', 'stroke-width': compact ? 1.4 : 1.6,
        }, svg);
      } else {
        svgEl('circle', {
          cx: x, cy: padT + (fret - 0.5) * frH, r: compact ? 6 : 7, fill: '#e3b341',
        }, svg);
        svgEl('text', {
          x, y: padT + (fret - 0.5) * frH + (compact ? 3 : 3.5),
          fill: '#1a1408', 'font-size': compact ? 8.5 : 9.5, 'font-weight': 800,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, svg).textContent = fret;
      }
    }
    return svg;
  }

  function renderCard(container, chordName, opts = {}) {
    const chord = typeof CHORDS !== 'undefined' ? CHORDS[chordName] : null;
    if (!chord) return null;
    const wrap = document.createElement('div');
    wrap.className = opts.className || 'chord-card';
    const svg = svgEl('svg', {});
    svg.classList.add('chord-svg');
    draw(svg, { name: chordName, shape: chord.shape, compact: false });
    wrap.appendChild(svg);
    const lbl = document.createElement('div');
    lbl.className = 'chord-label';
    lbl.textContent = chord.he;
    wrap.appendChild(lbl);
    if (opts.clickable !== false && typeof AudioEngine !== 'undefined') {
      wrap.addEventListener('click', () => {
        AudioEngine.ensureCtx();
        AudioEngine.strumChord(chord.shape, 'd', 0, opts.volume ?? 0.55);
      });
    }
    if (typeof FretboardMirror !== 'undefined' && opts.mirrorToggle !== false) {
      FretboardMirror.mountToggle(wrap, {
        onChange: () => draw(svg, { name: chordName, shape: chord.shape, compact: false }),
      });
    }
    container.appendChild(wrap);
    return wrap;
  }

  /** HTML מיני לספריית שירים */
  function miniHTML(chordName) {
    const data = typeof CHORDS !== 'undefined' ? CHORDS[chordName] : null;
    if (!data) return '';
    const shape = data.shape;
    const mirrorH = typeof FretboardMirror !== 'undefined' && FretboardMirror.isH();
    const order = mirrorH ? [...SHAPE_IDX].reverse() : SHAPE_IDX;
    const labels = mirrorH ? [...LABELS].reverse() : LABELS;
    const w = 52, h = 72;
    const left = 10, top = 16, sw = 10, sh = 12;
    let svg = `<svg viewBox="0 0 ${w} ${h}" class="chord-mini-svg">`;
    svg += `<text x="${w / 2}" y="11" text-anchor="middle" fill="var(--gold)" font-size="9" font-family="Heebo,sans-serif">${chordName}</text>`;
    svg += `<line x1="${left}" y1="${top}" x2="${left + 3 * sw}" y2="${top}" stroke="var(--text)" stroke-width="2.5"/>`;
    for (let f = 1; f <= 4; f++) {
      const y = top + f * sh;
      svg += `<line x1="${left}" y1="${y}" x2="${left + 3 * sw}" y2="${y}" stroke="var(--text-dim)" stroke-width="0.5"/>`;
    }
    for (let s = 0; s < 4; s++) {
      const x = left + s * sw;
      svg += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + 4 * sh}" stroke="var(--text-dim)" stroke-width="0.8"/>`;
      svg += `<text x="${x}" y="${h - 2}" text-anchor="middle" fill="var(--text-dim)" font-size="6" font-family="Heebo,sans-serif">${labels[s]}</text>`;
    }
    for (let s = 0; s < 4; s++) {
      const fret = shape[order[s]];
      const x = left + s * sw;
      if (fret === 'x') {
        svg += `<text x="${x}" y="${top - 3}" text-anchor="middle" fill="var(--accent-red)" font-size="8">x</text>`;
      } else if (fret === 0) {
        svg += `<circle cx="${x}" cy="${top - 4}" r="2.5" fill="none" stroke="var(--ok)" stroke-width="1"/>`;
      } else {
        const y = top + (fret - 0.5) * sh;
        svg += `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--aegean)"/>`;
      }
    }
    svg += '</svg>';
    return `<div class="chord-mini-wrap" data-chord="${chordName}" tabindex="0">${svg}</div>`;
  }

  return { draw, renderCard, miniHTML, fretAtShape, SHAPE_IDX, LABELS, LABELS_HE };
})();
