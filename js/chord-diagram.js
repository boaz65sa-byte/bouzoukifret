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

  /** צבעים לפי ערכת נושא: 'dark' (ברירת מחדל, בתוך האפליקציה) או
   *  'print' (ניגודיות גבוהה על רקע לבן, לדפי עבודה מודפסים). */
  const THEMES = {
    dark: {
      title: '#f0cc74', string: '#8fa6bc', fretLabel: '#5a7187', fretLabelUsed: '#e3b341',
      nut: '#e8d9b0', fretLine: '#3b566f', mute: '#d96459', open: '#5fc88f',
      note: '#e3b341', noteRoot: '#e3b341', noteText: '#1a1408',
    },
    print: {
      title: '#1a1a1a', string: '#9aa7b4', fretLabel: '#444', fretLabelUsed: '#b5651d',
      nut: '#222', fretLine: '#c9c2b4', mute: '#c0392b', open: '#2e8b57',
      note: '#e6951c', noteRoot: '#c0392b', noteText: '#fff',
    },
  };

  function draw(svg, { name, shape, numFrets = 5, compact = false, showFretNumbers = true, theme = 'dark', rootPc = null, editable = false, onFretEdit = null }) {
    svg.innerHTML = '';
    const C = THEMES[theme] || THEMES.dark;
    const mirrorH = typeof FretboardMirror !== 'undefined' && FretboardMirror.isH();
    const mirrorV = typeof FretboardMirror !== 'undefined' && FretboardMirror.isV();
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
    // dot/label y for a given fret cell, and the y of the line under it — reflected around the neck's
    // vertical center when mirrorV, so the nut moves to the bottom and highest fret to the top.
    const dotY = (f) => mirrorV ? padT + (numFrets - f + 0.5) * frH : padT + (f - 0.5) * frH;
    const lineY = (f) => mirrorV ? padT + (numFrets - f) * frH : padT + f * frH;
    const nutY = mirrorV ? padT + frH * numFrets : padT;

    if (name) {
      svgEl('text', {
        x: padL + strW * 1.5, y: compact ? 12 : 14,
        fill: C.title, 'font-size': titleSize, 'font-weight': 800,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = name;
    }

    for (let s = 0; s < 4; s++) {
      const x = padL + s * strW;
      svgEl('line', {
        x1: x, y1: padT, x2: x, y2: padT + frH * numFrets,
        stroke: C.string, 'stroke-width': compact ? 1 : 1.2,
      }, svg);
      svgEl('text', {
        x, y: h - 1, fill: C.fretLabel, 'font-size': compact ? 8.5 : 9.5,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = labels[s];
    }

    svgEl('line', {
      x1: padL - 2, y1: nutY, x2: padL + strW * 3 + 2, y2: nutY,
      stroke: C.nut, 'stroke-width': compact ? 3 : 3.5,
    }, svg);

    for (let f = 1; f <= numFrets; f++) {
      svgEl('line', {
        x1: padL, y1: lineY(f), x2: padL + strW * 3, y2: lineY(f),
        stroke: C.fretLine, 'stroke-width': compact ? 0.8 : 1,
      }, svg);
      if (showFretNumbers && !compact) {
        const used = shape.some(v => v !== 'x' && Number(v) === f);
        svgEl('text', {
          x: padL - 10, y: dotY(f) + 3.5,
          fill: used ? C.fretLabelUsed : C.fretLabel,
          'font-size': 10, 'font-weight': used ? 800 : 400,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, svg).textContent = f;
      }
    }

    for (let s = 0; s < 4; s++) {
      const shapeIdx = order[s];
      const fret = shape[shapeIdx];
      const x = padL + s * strW;
      const openMidi = (typeof TUNING !== 'undefined') ? TUNING[3 - shapeIdx].midi : null;
      const isRoot = rootPc != null && openMidi != null && fret !== 'x'
        && (((openMidi + fret) % 12 + 12) % 12) === (((rootPc % 12) + 12) % 12);
      const muteY = mirrorV ? nutY + (compact ? 8 : 9) : nutY - (compact ? 4 : 5);
      const openY = mirrorV ? nutY + (compact ? 7 : 9) : nutY - (compact ? 7 : 9);

      if (editable) {
        // מיתוק/מיתר-פתוח תמיד לחיצים במצב עריכה — עמומים כשלא פעילים, מלאים כשכן
        const muteEl = svgEl('text', {
          x, y: muteY, fill: C.mute, opacity: fret === 'x' ? 1 : 0.28,
          'font-size': compact ? 10 : 11, 'font-weight': 700,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, svg);
        muteEl.textContent = '×';
        muteEl.style.cursor = 'pointer';
        muteEl.addEventListener('click', (e) => { e.stopPropagation(); onFretEdit?.(shapeIdx, 'x'); });

        const openEl = svgEl('circle', {
          cx: x, cy: openY, r: compact ? 3.5 : 4,
          fill: fret === 0 && isRoot ? C.noteRoot : 'none',
          stroke: fret === 0 ? (isRoot ? C.noteRoot : C.open) : C.open,
          'stroke-width': compact ? 1.4 : 1.6, opacity: fret === 0 ? 1 : 0.3,
        }, svg);
        openEl.style.cursor = 'pointer';
        openEl.addEventListener('click', (e) => { e.stopPropagation(); onFretEdit?.(shapeIdx, 0); });

        for (let f = 1; f <= numFrets; f++) {
          const rect = svgEl('rect', {
            x: x - strW / 2, y: dotY(f) - frH / 2, width: strW, height: frH,
            fill: 'transparent',
          }, svg);
          rect.style.cursor = 'pointer';
          rect.addEventListener('click', (e) => { e.stopPropagation(); onFretEdit?.(shapeIdx, f); });
        }
        if (fret !== 'x' && fret !== 0) {
          svgEl('circle', {
            cx: x, cy: dotY(fret), r: compact ? 6 : 7, fill: isRoot ? C.noteRoot : C.note,
            'pointer-events': 'none',
          }, svg);
          svgEl('text', {
            x, y: dotY(fret) + (compact ? 3 : 3.5),
            fill: C.noteText, 'font-size': compact ? 8.5 : 9.5, 'font-weight': 800,
            'text-anchor': 'middle', 'font-family': 'Heebo', 'pointer-events': 'none',
          }, svg).textContent = fret;
        }
      } else if (fret === 'x') {
        svgEl('text', {
          x, y: muteY, fill: C.mute,
          'font-size': compact ? 10 : 11, 'font-weight': 700,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, svg).textContent = '×';
      } else if (fret === 0) {
        svgEl('circle', {
          cx: x, cy: openY, r: compact ? 3.5 : 4,
          fill: isRoot ? C.noteRoot : 'none', stroke: isRoot ? C.noteRoot : C.open, 'stroke-width': compact ? 1.4 : 1.6,
        }, svg);
      } else {
        svgEl('circle', {
          cx: x, cy: dotY(fret), r: compact ? 6 : 7, fill: isRoot ? C.noteRoot : C.note,
        }, svg);
        svgEl('text', {
          x, y: dotY(fret) + (compact ? 3 : 3.5),
          fill: C.noteText, 'font-size': compact ? 8.5 : 9.5, 'font-weight': 800,
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
    let editing = false;
    let shape = chord.shape.slice();

    function redraw() {
      draw(svg, {
        name: chordName, shape, compact: false, editable: editing,
        onFretEdit: editing ? (idx, val) => { shape[idx] = val; redraw(); } : null,
      });
    }
    redraw();
    wrap.appendChild(svg);
    const lbl = document.createElement('div');
    lbl.className = 'chord-label';
    lbl.textContent = chord.he;
    wrap.appendChild(lbl);
    if (opts.clickable !== false && typeof AudioEngine !== 'undefined') {
      wrap.addEventListener('click', () => {
        if (editing) return;
        AudioEngine.ensureCtx();
        AudioEngine.strumChord(shape, 'd', 0, opts.volume ?? 0.55);
      });
    }
    if (typeof FretboardMirror !== 'undefined' && opts.mirrorToggle !== false) {
      FretboardMirror.mountToggle(wrap, { onChange: () => redraw() });
    }
    if (opts.editable && typeof ChordLibrary !== 'undefined') {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn secondary chord-edit-toggle';
      editBtn.textContent = '✏️';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (editing) {
          ChordLibrary.setFret(chordName, ChordLibrary.shapeToFrets(shape));
          editing = false;
          editBtn.textContent = '✏️';
          editBtn.classList.remove('active');
        } else {
          editing = true;
          editBtn.textContent = '💾';
          editBtn.classList.add('active');
        }
        redraw();
      });
      wrap.appendChild(editBtn);
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
    const mirrorV = typeof FretboardMirror !== 'undefined' && FretboardMirror.isV();
    const order = mirrorH ? [...SHAPE_IDX].reverse() : SHAPE_IDX;
    const labels = mirrorH ? [...LABELS].reverse() : LABELS;
    const w = 52, h = 72;
    const left = 10, top = 16, sw = 10, sh = 12;
    const numFrets = 4;
    const dotY = (f) => mirrorV ? top + (numFrets - f + 0.5) * sh : top + (f - 0.5) * sh;
    const lineY = (f) => mirrorV ? top + (numFrets - f) * sh : top + f * sh;
    const nutY = mirrorV ? top + numFrets * sh : top;
    let svg = `<svg viewBox="0 0 ${w} ${h}" class="chord-mini-svg">`;
    svg += `<text x="${w / 2}" y="11" text-anchor="middle" fill="var(--gold)" font-size="9" font-family="Heebo,sans-serif">${chordName}</text>`;
    svg += `<line x1="${left}" y1="${nutY}" x2="${left + 3 * sw}" y2="${nutY}" stroke="var(--text)" stroke-width="2.5"/>`;
    for (let f = 1; f <= numFrets; f++) {
      const y = lineY(f);
      svg += `<line x1="${left}" y1="${y}" x2="${left + 3 * sw}" y2="${y}" stroke="var(--text-dim)" stroke-width="0.5"/>`;
    }
    for (let s = 0; s < 4; s++) {
      const x = left + s * sw;
      svg += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + numFrets * sh}" stroke="var(--text-dim)" stroke-width="0.8"/>`;
      svg += `<text x="${x}" y="${h - 2}" text-anchor="middle" fill="var(--text-dim)" font-size="6" font-family="Heebo,sans-serif">${labels[s]}</text>`;
    }
    for (let s = 0; s < 4; s++) {
      const fret = shape[order[s]];
      const x = left + s * sw;
      if (fret === 'x') {
        svg += `<text x="${x}" y="${mirrorV ? nutY + 9 : nutY - 3}" text-anchor="middle" fill="var(--accent-red)" font-size="8">x</text>`;
      } else if (fret === 0) {
        svg += `<circle cx="${x}" cy="${mirrorV ? nutY + 4 : nutY - 4}" r="2.5" fill="none" stroke="var(--ok)" stroke-width="1"/>`;
      } else {
        const y = dotY(fret);
        svg += `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--aegean)"/>`;
      }
    }
    svg += '</svg>';
    return `<div class="chord-mini-wrap" data-chord="${chordName}" tabindex="0">${svg}</div>`;
  }

  return { draw, renderCard, miniHTML, fretAtShape, SHAPE_IDX, LABELS, LABELS_HE };
})();
