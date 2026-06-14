/* גרף סריגים — 8 מיתרים (4 זוגות), מיתרים אנכיים, סריגים אופקיים */
const Fretboard = (() => {
  const STRING_NAMES = ['C', 'F', 'A', 'D'];
  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];
  const NUM_FRETS = 5;
  const PAIRS = 4;

  function el(tag, attrs, parent) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, String(v)));
    if (parent) parent.appendChild(n);
    return n;
  }

  function stringNum(courseIdx) { return courseIdx + 1; }

  function pressText(courseIdx, fret) {
    const he = STRING_HE[courseIdx] || '';
    const n = stringNum(courseIdx);
    if (fret === 0) return `מיתר ${n} (${he}) — פתוח ○ · זוג מיתרים`;
    return `סריג ${fret} · מיתר ${n} (${he})`;
  }

  function normMarker(m) {
    const course = m.courseIdx != null ? m.courseIdx
      : (m.stringIdx != null ? m.stringIdx : (m.string - 1));
    return {
      courseIdx: course,
      stringIdx: course,
      string: course + 1,
      fret: m.fret,
      label: m.label || '',
      id: m.id || `m-${course}-${m.fret}`,
    };
  }

  function calcPosition(markers) {
    const frets = markers
      .filter(m => m.fret !== 'x' && typeof m.fret === 'number' && m.fret > 0)
      .map(m => m.fret);
    if (!frets.length) return 0;
    const maxF = Math.max(...frets);
    if (maxF <= NUM_FRETS) return 0;
    return Math.max(0, Math.min(...frets) - 1);
  }

  function layout(compact) {
    const courseW = compact ? 34 : 42;
    const pairGap = compact ? 6 : 8;
    const padT = compact ? 30 : 38;
    const padL = compact ? 34 : 42;
    const padB = compact ? 44 : 52;
    const frH = compact ? 26 : 32;
    const w = padL + courseW * PAIRS + 12;
    const h = padT + frH * NUM_FRETS + padB;

    function courseCenterX(course) {
      return padL + course * courseW + courseW / 2;
    }

    function stringLineX(course, side) {
      const cx = courseCenterX(course);
      return cx - pairGap / 2 + side * pairGap;
    }

    return { courseW, pairGap, padT, padL, padB, frH, w, h, courseCenterX, stringLineX };
  }

  function draw(container, opts = {}) {
    container.innerHTML = '';
    const compact = !!opts.compact;
    const markers = (opts.markers || []).map(normMarker);
    const posStart = opts.positionStart != null ? opts.positionStart : calcPosition(markers);
    const L = layout(compact);
    const onCellClick = opts.onCellClick;
    const activeCourse = opts.activeCourseIdx != null ? opts.activeCourseIdx : opts.activeStringIdx;

    const svg = el('svg', {
      viewBox: `0 0 ${L.w} ${L.h}`,
      class: 'fb-svg real-fretboard fb-8str' + (compact ? ' fb-compact' : ''),
    }, container);

    el('rect', {
      x: L.padL - 10, y: L.padT - 6,
      width: L.courseW * PAIRS + 20, height: L.frH * NUM_FRETS + 12,
      fill: 'rgba(42,24,16,0.92)', rx: 6,
      stroke: 'rgba(232,217,176,0.3)', 'stroke-width': 1.5,
    }, svg);

    if (posStart > 0) {
      el('text', {
        x: L.padL - 16, y: L.padT + 12,
        fill: '#e3b341', 'font-size': compact ? 12 : 14, 'font-weight': 900,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = posStart;
      el('line', {
        x1: L.padL - 6, y1: L.padT, x2: L.padL + L.courseW * PAIRS + 6, y2: L.padT,
        stroke: '#8fa6bc', 'stroke-width': 3.5,
      }, svg);
    } else {
      el('line', {
        x1: L.padL - 6, y1: L.padT, x2: L.padL + L.courseW * PAIRS + 6, y2: L.padT,
        stroke: '#f0e8d8', 'stroke-width': compact ? 4.5 : 5.5,
      }, svg);
    }

    for (let f = 1; f <= NUM_FRETS; f++) {
      const y = L.padT + f * L.frH;
      el('line', {
        x1: L.padL, y1: y, x2: L.padL + L.courseW * PAIRS, y2: y,
        stroke: '#5a7088', 'stroke-width': 1.5,
      }, svg);
      el('text', {
        x: L.padL - 14, y: L.padT + (f - 0.5) * L.frH + 5,
        fill: '#8fa6bc', 'font-size': compact ? 10 : 12, 'font-weight': 700,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = String(posStart + f);
    }

    for (let c = 0; c < PAIRS; c++) {
      const isActive = activeCourse === c;
      for (let side = 0; side < 2; side++) {
        const x = L.stringLineX(c, side);
        el('line', {
          x1: x, y1: L.padT, x2: x, y2: L.padT + L.frH * NUM_FRETS,
          stroke: isActive ? '#ffd86b' : '#c8d4de',
          'stroke-width': isActive ? (compact ? 2.4 : 3) : (compact ? 1.2 : 1.5),
        }, svg);
      }
      const cx = L.courseCenterX(c);
      el('text', {
        x: cx, y: L.h - (compact ? 8 : 10),
        fill: isActive ? '#ffd86b' : '#e3b341',
        'font-size': compact ? 11 : 13, 'font-weight': 800,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = STRING_HE[c];
      el('text', {
        x: cx, y: L.h - (compact ? 22 : 26),
        fill: isActive ? '#e3b341' : '#6a8098',
        'font-size': compact ? 9 : 10, 'font-weight': isActive ? 800 : 600,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = `מיתר ${stringNum(c)}`;
      el('text', {
        x: cx, y: L.h - (compact ? 34 : 40),
        fill: '#5a7088', 'font-size': compact ? 8 : 9,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = 'זוג';
    }

    if (onCellClick) {
      for (let c = 0; c < PAIRS; c++) {
        for (let f = 0; f <= NUM_FRETS; f++) {
          const rel = f - posStart;
          if (f > 0 && (rel < 1 || rel > NUM_FRETS)) continue;
          const cy = f === 0 ? L.padT - 12 : L.padT + (rel - 0.5) * L.frH;
          const cx = L.courseCenterX(c);
          const hit = el('rect', {
            x: cx - L.courseW / 2 + 2, y: cy - L.frH / 2 + 2,
            width: L.courseW - 4, height: L.frH - 4,
            fill: 'transparent', class: 'fb-hit',
            'data-course': c, 'data-fret': f,
          }, svg);
          hit.style.cursor = 'pointer';
          hit.addEventListener('click', () => onCellClick(c, f, pressText(c, f)));
        }
      }
    }

    const markerEls = new Map();

    markers.forEach(m => {
      const cx = L.courseCenterX(m.courseIdx);
      const g = el('g', { class: 'fb-marker', 'data-id': m.id }, svg);

      if (m.fret === 'x') {
        el('text', {
          x: cx, y: L.padT - 8, fill: '#d96459',
          'font-size': compact ? 14 : 16, 'font-weight': 900,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, g).textContent = '×';
      } else if (m.fret === 0) {
        el('circle', {
          cx, cy: L.padT - 12, r: compact ? 5 : 6,
          fill: 'none', stroke: '#5fc88f', 'stroke-width': 2.5,
        }, g);
      } else {
        const rel = m.fret - posStart;
        if (rel < 1 || rel > NUM_FRETS) return;
        const cy = L.padT + (rel - 0.5) * L.frH;
        const r = compact ? 9 : 11;
        el('ellipse', {
          cx, cy, rx: L.pairGap * 0.85 + 2, ry: r,
          fill: '#e3b341', stroke: '#f0cc74', 'stroke-width': 2,
          class: 'fb-dot',
        }, g);
        el('text', {
          x: cx, y: cy + 1, fill: '#1a1408',
          'font-size': compact ? 9 : 10, 'font-weight': 900,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, g).textContent = m.label || String(m.fret);
        el('text', {
          x: cx, y: cy - r - 6, fill: '#f0cc74',
          'font-size': compact ? 8 : 9, 'font-weight': 700,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, g).textContent = `מ${m.courseIdx + 1}·ס${m.fret}`;
      }
      markerEls.set(m.id, g);
    });

    function setActive(ids, pulseId) {
      const idSet = new Set(Array.isArray(ids) ? ids : [ids]);
      markerEls.forEach((g, id) => {
        g.classList.toggle('active', idSet.has(id));
        g.classList.toggle('pulse', id === pulseId);
      });
    }

    return { setActive, markerEls, pressText, posStart, layout: L };
  }

  function markersFromChord(id) {
    const ch = getChord(id);
    if (!ch) return [];
    return ch.shape.map((f, i) => ({
      courseIdx: i,
      stringIdx: i,
      fret: f,
      id: `${id}-c${i}`,
    }));
  }

  function uniqueModeScaleMarkers(notes) {
    const seen = new Set();
    return notes.filter(n => {
      if (seen.has(n.fret)) return false;
      seen.add(n.fret);
      return true;
    }).map(n => ({
      courseIdx: 3,
      stringIdx: 3,
      fret: n.fret,
      label: n.label || n.solfege,
      id: `scale-f${n.fret}`,
    }));
  }

  return {
    draw, pressText, stringNum, STRING_HE, STRING_NAMES, NUM_FRETS, PAIRS,
    markersFromChord, uniqueModeScaleMarkers, calcPositionStart: calcPosition, layout,
  };
})();
