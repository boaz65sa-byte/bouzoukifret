/* גרף סריגים — דיאגרמת בוזוקי/גיטרה אמיתית (מיתרים אנכיים, סריגים אופקיים) */
const Fretboard = (() => {
  const STRING_NAMES = ['C', 'F', 'A', 'D'];
  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];
  const NUM_FRETS = 5;

  function el(tag, attrs, parent) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, String(v)));
    if (parent) parent.appendChild(n);
    return n;
  }

  function stringNum(idx) { return idx + 1; }

  function pressText(strNum, fret) {
    const he = STRING_HE[strNum - 1] || '';
    if (fret === 0) return `מיתר ${strNum} (${he}) — פתוח ○`;
    return `סריג ${fret} · מיתר ${strNum} (${he})`;
  }

  function normMarker(m) {
    const sIdx = m.stringIdx != null ? m.stringIdx : (m.string - 1);
    return {
      stringIdx: sIdx,
      string: sIdx + 1,
      fret: m.fret,
      label: m.label || '',
      id: m.id || `m-${sIdx}-${m.fret}`,
    };
  }

  function calcPosition(markers) {
    const frets = markers
      .filter(m => typeof m.fret === 'number' && m.fret > 0)
      .map(m => m.fret);
    if (!frets.length) return 0;
    const minF = Math.min(...frets);
    const maxF = Math.max(...frets);
    if (maxF <= NUM_FRETS) return 0;
    if (maxF - minF <= NUM_FRETS - 1) return Math.max(0, minF - 1);
    return Math.max(0, minF - 1);
  }

  function draw(container, opts = {}) {
    container.innerHTML = '';
    const compact = !!opts.compact;
    const markers = (opts.markers || []).map(normMarker);
    const posStart = opts.positionStart != null ? opts.positionStart : calcPosition(markers);

    const strW = compact ? 26 : 34;
    const frH = compact ? 24 : 30;
    const padT = compact ? 28 : 36;
    const padL = compact ? 32 : 40;
    const w = padL + strW * 3 + 14;
    const h = padT + frH * NUM_FRETS + (compact ? 28 : 34);

    const svg = el('svg', {
      viewBox: `0 0 ${w} ${h}`,
      class: 'fb-svg real-fretboard' + (compact ? ' fb-compact' : ''),
    }, container);

    /* רקע לוח */
    el('rect', {
      x: padL - 8, y: padT - 4, width: strW * 3 + 16, height: frH * NUM_FRETS + 8,
      fill: 'rgba(42,24,16,0.85)', rx: 4, stroke: 'rgba(232,217,176,0.25)', 'stroke-width': 1,
    }, svg);

    /* מיקום סריג (כשלא בפתיחה) */
    if (posStart > 0) {
      el('text', {
        x: padL - 14, y: padT + 10,
        fill: '#e3b341', 'font-size': compact ? 11 : 13, 'font-weight': 900,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = posStart;
      el('line', {
        x1: padL - 4, y1: padT, x2: padL + strW * 3 + 4, y2: padT,
        stroke: '#8fa6bc', 'stroke-width': 3,
      }, svg);
    } else {
      el('line', {
        x1: padL - 4, y1: padT, x2: padL + strW * 3 + 4, y2: padT,
        stroke: '#e8d9b0', 'stroke-width': compact ? 4 : 5,
      }, svg);
    }

    /* קווי סריג + מספרים משמאל */
    for (let f = 1; f <= NUM_FRETS; f++) {
      const y = padT + f * frH;
      el('line', {
        x1: padL, y1: y, x2: padL + strW * 3, y2: y,
        stroke: '#3b566f', 'stroke-width': 1,
      }, svg);
      const fretLabel = posStart + f;
      el('text', {
        x: padL - 12, y: padT + (f - 0.5) * frH + 4,
        fill: '#8fa6bc', 'font-size': compact ? 10 : 12, 'font-weight': 700,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = fretLabel;
    }

    /* מיתרים אנכיים */
    for (let s = 0; s < 4; s++) {
      const x = padL + s * strW;
      el('line', {
        x1: x, y1: padT, x2: x, y2: padT + frH * NUM_FRETS,
        stroke: '#c8d4de', 'stroke-width': compact ? 1.3 : 1.6,
      }, svg);
      el('text', {
        x, y: h - (compact ? 6 : 8),
        fill: '#e3b341', 'font-size': compact ? 10 : 11, 'font-weight': 800,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = STRING_NAMES[s];
      el('text', {
        x, y: h - (compact ? 18 : 22),
        fill: '#5a7187', 'font-size': compact ? 8 : 9,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = `מ${stringNum(s)}`;
    }

    const markerEls = new Map();

    markers.forEach(m => {
      const x = padL + m.stringIdx * strW;
      const g = el('g', { class: 'fb-marker', 'data-id': m.id }, svg);

      if (m.fret === 'x') {
        el('text', {
          x, y: padT - 6, fill: '#d96459',
          'font-size': compact ? 12 : 14, 'font-weight': 800,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, g).textContent = '×';
      } else if (m.fret === 0) {
        el('circle', {
          cx: x, cy: padT - 10, r: compact ? 4.5 : 5.5,
          fill: 'none', stroke: '#5fc88f', 'stroke-width': 2,
        }, g);
      } else {
        const rel = m.fret - posStart;
        if (rel < 1 || rel > NUM_FRETS) return;
        const cy = padT + (rel - 0.5) * frH;
        const r = compact ? 8 : 10;
        el('circle', {
          cx: x, cy, r, fill: '#e3b341', stroke: '#f0cc74', 'stroke-width': 2,
          class: 'fb-dot',
        }, g);
        if (m.label && !compact) {
          el('text', {
            x, y: cy - r - 5, fill: '#f0cc74',
            'font-size': 9, 'font-weight': 700,
            'text-anchor': 'middle', 'font-family': 'Heebo',
          }, g).textContent = m.label;
        }
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

    return { setActive, markerEls, pressText, posStart };
  }

  function markersFromChord(id) {
    const ch = getChord(id);
    if (!ch) return [];
    return ch.shape.map((f, i) => ({
      stringIdx: i,
      fret: f,
      id: `${id}-s${i}`,
    }));
  }

  function uniqueModeScaleMarkers(notes) {
    const seen = new Set();
    return notes.filter(n => {
      if (seen.has(n.fret)) return false;
      seen.add(n.fret);
      return true;
    }).map(n => ({
      stringIdx: 3,
      fret: n.fret,
      label: n.label || n.solfege,
      id: `scale-f${n.fret}`,
    }));
  }

  return {
    draw, pressText, stringNum, STRING_HE, STRING_NAMES,
    markersFromChord, uniqueModeScaleMarkers,
  };
})();
