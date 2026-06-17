/* גרף סריגים — לרוחב · 8 מיתרים · סריגים אנכיים */
const Fretboard = (() => {
  const STRING_NAMES = ['C', 'F', 'A', 'D'];
  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];
  const NUM_FRETS = 6;
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
      courseIdx: course, stringIdx: course, string: course + 1,
      fret: m.fret, label: m.label || '',
      id: m.id || `m-${course}-${m.fret}`,
    };
  }

  function calcPosition(markers) {
    const frets = markers
      .filter(m => m.fret !== 'x' && typeof m.fret === 'number' && m.fret > 0)
      .map(m => m.fret);
    if (!frets.length) return 0;
    if (Math.max(...frets) <= NUM_FRETS) return 0;
    return Math.max(0, Math.min(...frets) - 1);
  }

  function layout(compact) {
    const frW = compact ? 30 : 38;
    const courseStep = compact ? 20 : 26;
    const pairGap = compact ? 4 : 5;
    const padL = compact ? 34 : 44;
    const padT = compact ? 22 : 28;
    const nutX = padL + 6;
    const gridTop = padT + 2;
    const gridH = courseStep * 3;
    const gridBot = gridTop + gridH;
    const w = padL + frW * (NUM_FRETS + 1) + 24;
    const h = gridBot + 18;

    function stringCenterY(course) {
      return gridTop + course * (gridH / 3);
    }

    function stringY(course, side) {
      const cy = stringCenterY(course);
      return cy - pairGap / 2 + side * pairGap;
    }

    function columnX(fret, posStart) {
      if (fret === 0) return nutX - frW * 0.22;
      return nutX + (fret - posStart - 0.5) * frW;
    }

    function fretWireX(fi) { return nutX + fi * frW; }

    function fretSpaceX(fret, posStart) {
      if (fret === 0) return nutX - frW * 0.55;
      return nutX + (fret - posStart - 1) * frW;
    }

    return {
      frW, courseStep, pairGap, padL, padT, nutX, gridTop, gridBot, gridH, w, h,
      stringCenterY, stringY, columnX, fretWireX, fretSpaceX,
    };
  }

  function draw(container, opts = {}) {
    container.innerHTML = '';
    const compact = !!opts.compact;
    const markers = (opts.markers || []).map(normMarker);
    const posStart = opts.positionStart != null ? opts.positionStart : calcPosition(markers);
    const L = layout(compact);
    const onCellClick = opts.onCellClick;
    const activeCourse = opts.activeCourseIdx != null ? opts.activeCourseIdx : opts.activeStringIdx;
    const gridBot = L.gridBot;
    const gridTop = L.gridTop;

    const svg = el('svg', {
      viewBox: `0 0 ${L.w} ${L.h}`,
      class: 'fb-svg real-fretboard fb-8str fb-landscape' + (compact ? ' fb-compact' : ''),
      preserveAspectRatio: 'xMidYMid meet',
    }, container);

    const defs = el('defs', {}, svg);
    const wood = el('linearGradient', { id: 'fb-wood', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#a0724a' }, wood);
    el('stop', { offset: '50%', 'stop-color': '#6b4428' }, wood);
    el('stop', { offset: '100%', 'stop-color': '#3d2514' }, wood);
    const pearl = el('radialGradient', { id: 'fb-pearl', cx: '35%', cy: '30%', r: '65%' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#fff8e8' }, pearl);
    el('stop', { offset: '45%', 'stop-color': '#e8c868' }, pearl);
    el('stop', { offset: '100%', 'stop-color': '#a07828' }, pearl);
    const fretG = el('linearGradient', { id: 'fb-fret', x1: '0', y1: '0', x2: '1', y2: '0' }, defs);
    el('stop', { offset: '0%', 'stop-color': '#707880' }, fretG);
    el('stop', { offset: '50%', 'stop-color': '#f0f2f5' }, fretG);
    el('stop', { offset: '100%', 'stop-color': '#606870' }, fretG);

    el('rect', {
      x: L.nutX - 8, y: gridTop - 6,
      width: L.frW * NUM_FRETS + 18, height: gridBot - gridTop + 12,
      fill: 'url(#fb-wood)', rx: 4,
      stroke: 'rgba(40,28,18,0.55)', 'stroke-width': 1.5,
    }, svg);

    /* תאי סריג — רקע לכל תיבה */
    for (let f = 0; f <= NUM_FRETS; f++) {
      if (f > 0 && (f - posStart < 1 || f - posStart > NUM_FRETS)) continue;
      const x0 = f === 0 ? L.nutX - L.frW * 0.55 : L.fretSpaceX(f, posStart);
      const fw = f === 0 ? L.frW * 0.5 : L.frW;
      el('rect', {
        x: x0, y: gridTop - 2, width: fw, height: gridBot - gridTop + 4,
        fill: f % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)',
        rx: 1,
      }, svg);
    }

    el('rect', {
      x: L.nutX - 3, y: gridTop - 3, width: 5, height: gridBot - gridTop + 6,
      fill: posStart > 0 ? '#c8d4e0' : '#f5ead8', rx: 1,
    }, svg);

    for (let f = 1; f <= NUM_FRETS; f++) {
      const x = L.fretWireX(f);
      el('line', {
        x1: x, y1: gridTop - 2, x2: x, y2: gridBot + 2,
        stroke: 'url(#fb-fret)', 'stroke-width': compact ? 2.8 : 3.2,
      }, svg);
      const label = posStart + f;
      el('text', {
        x: x - L.frW * 0.5, y: gridTop - 8,
        fill: '#d8e4f0', 'font-size': compact ? 10 : 11, 'font-weight': 800,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = String(label);
    }

    el('text', {
      x: L.nutX - L.frW * 0.22, y: gridTop - 8,
      fill: '#5fc88f', 'font-size': compact ? 10 : 11, 'font-weight': 800,
      'text-anchor': 'middle', 'font-family': 'Heebo',
    }, svg).textContent = '0';

    for (let c = 0; c < PAIRS; c++) {
      const isActive = activeCourse === c;
      const x2 = L.nutX + L.frW * NUM_FRETS;
      if (isActive) {
        el('rect', {
          x: L.nutX - 6, y: L.stringY(c, 0) - 5,
          width: x2 - L.nutX + 10, height: L.pairGap + 10,
          fill: 'rgba(95,200,143,0.12)', rx: 3,
        }, svg);
      }
      for (let side = 0; side < 2; side++) {
        const y = L.stringY(c, side);
        el('line', {
          x1: L.nutX - 4, y1: y, x2: x2, y2: y,
          stroke: isActive ? '#ffe8a0' : '#d0dce8',
          'stroke-width': isActive ? (2 + c * 0.2) : (1.1 + c * 0.12),
        }, svg);
      }
      const cy = L.stringCenterY(c);
      el('text', {
        x: L.padL - 4, y: cy - 4,
        fill: isActive ? '#ffd86b' : '#e3b341',
        'font-size': compact ? 10 : 11, 'font-weight': 800,
        'text-anchor': 'end', 'font-family': 'Heebo',
      }, svg).textContent = STRING_HE[c];
      el('text', {
        x: L.padL - 4, y: cy + 8,
        fill: isActive ? '#e3b341' : '#6a8098',
        'font-size': compact ? 8 : 9, 'font-weight': 600,
        'text-anchor': 'end', 'font-family': 'Heebo',
      }, svg).textContent = `מ${stringNum(c)}`;
    }

    if (onCellClick) {
      for (let c = 0; c < PAIRS; c++) {
        for (let f = 0; f <= NUM_FRETS; f++) {
          if (f > 0 && (f - posStart < 1 || f - posStart > NUM_FRETS)) continue;
          const cx = f === 0 ? L.nutX - 4 : L.columnX(f, posStart);
          const cy = L.stringCenterY(c);
          const hit = el('rect', {
            x: cx - L.frW * 0.4, y: cy - L.courseStep * 0.35,
            width: L.frW * 0.8, height: L.courseStep * 0.7,
            fill: 'transparent', class: 'fb-hit',
          }, svg);
          hit.style.cursor = 'pointer';
          hit.addEventListener('click', () => onCellClick(c, f, pressText(c, f)));
        }
      }
    }

    const markerEls = new Map();
    const dotR = compact ? 7 : 8;
    markers.forEach(m => {
      const cy = L.stringCenterY(m.courseIdx);
      const g = el('g', { class: 'fb-marker', 'data-id': m.id }, svg);

      if (m.fret === 'x') {
        el('text', {
          x: L.nutX - 10, y: cy, fill: '#d96459',
          'font-size': compact ? 13 : 15, 'font-weight': 900,
          'text-anchor': 'end', 'dominant-baseline': 'middle', 'font-family': 'Heebo',
        }, g).textContent = '×';
      } else if (m.fret === 0) {
        const cx = L.columnX(0, posStart);
        el('circle', {
          cx, cy, r: dotR,
          fill: 'rgba(95,200,143,0.35)', stroke: '#5fc88f', 'stroke-width': 2.5,
          class: 'fb-dot',
        }, g);
        if (m.label) {
          el('text', {
            x: cx, y: cy + 1, fill: '#fff',
            'font-size': compact ? 8 : 9, 'font-weight': 900,
            'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'Heebo',
          }, g).textContent = m.label;
        }
      } else {
        const cx = L.columnX(m.fret, posStart);
        if (cx < L.nutX - L.frW * 0.3 || cx > L.nutX + L.frW * NUM_FRETS + 4) return;
        el('circle', {
          cx, cy, r: dotR,
          fill: 'url(#fb-pearl)', stroke: 'rgba(255,255,255,0.7)', 'stroke-width': 2,
          class: 'fb-dot',
        }, g);
        el('text', {
          x: cx, y: cy + 1, fill: '#1a1408',
          'font-size': compact ? 8 : 9, 'font-weight': 900,
          'text-anchor': 'middle', 'dominant-baseline': 'middle', 'font-family': 'Heebo',
        }, g).textContent = m.label || String(m.fret);
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
      courseIdx: i, stringIdx: i, fret: f, id: `${id}-c${i}`,
    }));
  }

  function uniqueModeScaleMarkers(notes) {
    const seen = new Set();
    return notes.filter(n => {
      if (seen.has(n.fret)) return false;
      seen.add(n.fret);
      return true;
    }).map(n => ({
      courseIdx: 3, stringIdx: 3, string: 4, fret: n.fret,
      label: n.label || n.solfege, id: `scale-f${n.fret}`,
    }));
  }

  return {
    draw, pressText, stringNum, STRING_HE, STRING_NAMES, NUM_FRETS, PAIRS,
    markersFromChord, uniqueModeScaleMarkers, calcPositionStart: calcPosition, layout,
  };
})();
