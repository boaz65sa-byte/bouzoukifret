/* גרף סריגים + מיתרים — איפה ללחוץ */
const Fretboard = (() => {
  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];

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

  function fretRange(markers, defMin = 0, defMax = 5) {
    const frets = markers
      .filter(m => m.fret !== 'x' && typeof m.fret === 'number')
      .map(m => m.fret);
    if (!frets.length) return { min: defMin, max: defMax };
    return {
      min: Math.max(0, Math.min(...frets) - (Math.min(...frets) > 0 ? 1 : 0)),
      max: Math.min(12, Math.max(...frets) + 1),
    };
  }

  function fingerY(padT, frH, fret, fMin) {
    if (fret === 0) return padT - 10;
    if (fMin === 0) return padT + (fret - 0.5) * frH;
    return padT + (fret - fMin + 0.5) * frH;
  }

  function draw(container, opts = {}) {
    container.innerHTML = '';
    const compact = !!opts.compact;
    const markers = (opts.markers || []).map(normMarker);
    const range = opts.fretMin != null
      ? { min: opts.fretMin, max: opts.fretMax }
      : fretRange(markers, opts.defMin ?? 0, opts.defMax ?? 5);
    const fMin = range.min;
    const fMax = range.max;
    const span = fMax - fMin + 1;

    const strW = compact ? 24 : 40;
    const frH = compact ? 22 : 30;
    const padL = compact ? 36 : 48;
    const padT = compact ? 22 : 32;
    const padR = compact ? 10 : 16;
    const padB = compact ? 22 : 30;
    const w = padL + strW * 3 + padR;
    const h = padT + span * frH + padB;

    const svg = el('svg', {
      viewBox: `0 0 ${w} ${h}`,
      class: 'fb-svg' + (compact ? ' fb-compact' : ''),
    }, container);

    /* ציר סריגים — משמאל */
    el('text', {
      x: 10, y: padT + (span * frH) / 2,
      fill: '#5a7187', 'font-size': compact ? 9 : 10, 'font-weight': 700,
      'text-anchor': 'middle', 'font-family': 'Heebo',
      transform: `rotate(-90 10 ${padT + (span * frH) / 2})`,
    }, svg).textContent = 'סריג';

    /* נוט */
    el('line', {
      x1: padL - 3, y1: padT, x2: padL + strW * 3 + 3, y2: padT,
      stroke: '#e8d9b0', 'stroke-width': compact ? 3 : 5,
    }, svg);

    /* קווי סריג + מספרים */
    for (let fi = 0; fi < span; fi++) {
      const fretNum = fMin + fi;
      const y = padT + fi * frH;
      if (fi > 0) {
        el('line', {
          x1: padL, y1: y, x2: padL + strW * 3, y2: y,
          stroke: '#3b566f', 'stroke-width': 1,
        }, svg);
      }
      el('text', {
        x: padL - 12, y: y + frH * 0.62,
        fill: fretNum === 0 ? '#e8d9b0' : '#8fa6bc',
        'font-size': compact ? 10 : 12, 'font-weight': 700,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = fretNum;
    }

    /* מיתרים + מספר מיתר */
    for (let s = 0; s < 4; s++) {
      const x = padL + s * strW;
      el('line', {
        x1: x, y1: padT, x2: x, y2: padT + span * frH,
        stroke: '#8fa6bc', 'stroke-width': compact ? 1.2 : 1.6,
      }, svg);
      el('text', {
        x, y: padT + span * frH + (compact ? 12 : 14),
        fill: '#e3b341', 'font-size': compact ? 11 : 13, 'font-weight': 900,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = String(stringNum(s));
      el('text', {
        x, y: padT + span * frH + (compact ? 22 : 26),
        fill: '#5a7187', 'font-size': compact ? 9 : 10,
        'text-anchor': 'middle', 'font-family': 'Heebo',
      }, svg).textContent = STRING_HE[s];
    }

    /* כותרת ציר מיתרים */
    el('text', {
      x: padL + strW * 1.5, y: compact ? 12 : 16,
      fill: '#5a7187', 'font-size': compact ? 9 : 10, 'font-weight': 700,
      'text-anchor': 'middle', 'font-family': 'Heebo',
    }, svg).textContent = 'מיתר →';

    const markerEls = new Map();

    markers.forEach(m => {
      const x = padL + m.stringIdx * strW;
      const g = el('g', { class: 'fb-marker', 'data-id': m.id }, svg);

      if (m.fret === 'x') {
        el('text', {
          x, y: padT - 6, fill: '#d96459',
          'font-size': compact ? 11 : 13, 'font-weight': 800,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, g).textContent = '×';
      } else if (m.fret === 0) {
        el('circle', {
          cx: x, cy: padT - 8, r: compact ? 4 : 5,
          fill: 'none', stroke: '#5fc88f', 'stroke-width': 2,
        }, g);
      } else {
        const cy = fingerY(padT, frH, m.fret, fMin);
        const r = compact ? 9 : 12;
        el('circle', {
          cx: x, cy, r, fill: '#e3b341', stroke: '#f0cc74', 'stroke-width': 2,
          class: 'fb-dot',
        }, g);
        el('text', {
          x, y: cy + (compact ? 3 : 4), fill: '#1a1408',
          'font-size': compact ? 9 : 11, 'font-weight': 900,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, g).textContent = m.fret;
        if (m.label) {
          el('text', {
            x, y: cy - r - 4, fill: '#f0cc74',
            'font-size': compact ? 8 : 10, 'font-weight': 700,
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

    return { setActive, markerEls, pressText, fMin, fMax };
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

  function markersFromModeNotes(notes) {
    return notes.map((n, i) => ({
      stringIdx: 3,
      fret: n.fret,
      label: n.label || n.solfege,
      id: `mode-f${n.fret}-${i}`,
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

  function modeStepMarker(note, idx) {
    return [{
      stringIdx: 3,
      fret: note.fret,
      label: note.label || note.solfege,
      id: `step-${idx}`,
    }];
  }

  return {
    draw, pressText, stringNum, STRING_HE,
    markersFromChord, markersFromModeNotes, uniqueModeScaleMarkers, modeStepMarker,
  };
})();
