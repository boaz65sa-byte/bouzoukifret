/* ============================================================
   ChordTooltip — דיאגרמת אקורד ב-hover
   ============================================================ */
'use strict';

const ChordTooltip = (() => {
  let _el = null;
  let _hideTimer = null;

  const SHARP_TO_FLAT = { 'A#': 'Bb', 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab' };

  function resolveKey(name) {
    if (!name || typeof CHORDS === 'undefined') return null;
    const s = String(name).trim();
    if (CHORDS[s]) return s;
    const m = s.match(/^([A-G])([#b]?)(.*)$/);
    if (!m) return null;
    let root = m[1] + (m[2] || '');
    const suf = m[3] || '';
    if (SHARP_TO_FLAT[root]) root = SHARP_TO_FLAT[root];
    const candidates = [root + suf, root + (suf.startsWith('m') && !suf.startsWith('maj') ? 'm' : ''), root];
    for (const k of candidates) if (CHORDS[k]) return k;
    return null;
  }

  function _ensureEl() {
    if (_el) return _el;
    _el = document.createElement('div');
    _el.className = 'chord-tooltip';
    _el.setAttribute('role', 'tooltip');
    _el.hidden = true;
    document.body.appendChild(_el);
    _el.addEventListener('mouseenter', () => clearTimeout(_hideTimer));
    _el.addEventListener('mouseleave', hide);
    return _el;
  }

  function _drawDiagram(svg, key) {
    const chord = CHORDS[key];
    const numFrets = 5;
    const strW = 20;
    const frH = 17;
    const padT = 28;
    const padL = 24;
    const w = padL + strW * 3 + 10;
    const h = padT + frH * numFrets + 10;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    svg.classList.add('chord-svg', 'chord-svg-tooltip');

    svgEl('text', {
      x: padL + strW * 1.5, y: 12, fill: '#f0cc74', 'font-size': 12, 'font-weight': 800,
      'text-anchor': 'middle', 'font-family': 'Heebo',
    }, svg).textContent = key;

    for (let i = 0; i < 4; i++) {
      const x = padL + i * strW;
      svgEl('line', { x1: x, y1: padT, x2: x, y2: padT + frH * numFrets, stroke: '#8fa6bc', 'stroke-width': 1 }, svg);
    }
    svgEl('line', {
      x1: padL - 2, y1: padT, x2: padL + strW * 3 + 2, y2: padT,
      stroke: '#e8d9b0', 'stroke-width': 3,
    }, svg);
    for (let f = 1; f <= numFrets; f++) {
      svgEl('line', {
        x1: padL, y1: padT + f * frH, x2: padL + strW * 3, y2: padT + f * frH,
        stroke: '#3b566f', 'stroke-width': 0.8,
      }, svg);
    }

    chord.shape.forEach((fret, i) => {
      const x = padL + i * strW;
      if (fret === 'x') {
        svgEl('text', {
          x, y: padT - 4, fill: '#d96459', 'font-size': 10, 'font-weight': 700,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, svg).textContent = '×';
      } else if (fret === 0) {
        svgEl('circle', { cx: x, cy: padT - 7, r: 3.5, fill: 'none', stroke: '#5fc88f', 'stroke-width': 1.4 }, svg);
      } else {
        svgEl('circle', { cx: x, cy: padT + (fret - 0.5) * frH, r: 6, fill: '#e3b341' }, svg);
        svgEl('text', {
          x, y: padT + (fret - 0.5) * frH + 3, fill: '#1a1408', 'font-size': 8.5, 'font-weight': 800,
          'text-anchor': 'middle', 'font-family': 'Heebo',
        }, svg).textContent = fret;
      }
    });
  }

  function _position(anchor) {
    const tip = _ensureEl();
    const r = anchor.getBoundingClientRect();
    const tw = tip.offsetWidth || 140;
    const th = tip.offsetHeight || 160;
    let left = r.left + r.width / 2 - tw / 2;
    let top = r.top - th - 10;
    if (top < 8) top = r.bottom + 10;
    left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function show(chordName, anchorEl) {
    if (!anchorEl) return;
    clearTimeout(_hideTimer);
    const key = resolveKey(chordName);
    const tip = _ensureEl();
    if (!key) {
      tip.innerHTML = `<span class="chord-tooltip-missing">${chordName}</span>`;
      tip.hidden = false;
      _position(anchorEl);
      return;
    }
    const chord = CHORDS[key];
    tip.innerHTML = '';
    const svg = svgEl('svg', {});
    _drawDiagram(svg, key);
    tip.appendChild(svg);
    const lbl = document.createElement('div');
    lbl.className = 'chord-tooltip-label';
    lbl.textContent = chord.he || key;
    tip.appendChild(lbl);
    tip.hidden = false;
    requestAnimationFrame(() => _position(anchorEl));
  }

  function hide() {
    _hideTimer = setTimeout(() => {
      if (_el) _el.hidden = true;
    }, 120);
  }

  function bindHover(el, getChordName) {
    if (!el) return;
    el.addEventListener('mouseenter', () => {
      const name = typeof getChordName === 'function' ? getChordName() : getChordName;
      if (name) show(name, el);
    });
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', () => {
      const name = typeof getChordName === 'function' ? getChordName() : getChordName;
      if (name) show(name, el);
    });
    el.addEventListener('blur', hide);
  }

  /** כל האלמנטים עם data-chord בתוך root */
  function bindContainer(root) {
    const el = typeof root === 'string' ? document.querySelector(root) : root;
    if (!el) return;
    el.querySelectorAll('[data-chord]').forEach(node => {
      if (node.dataset.chordBound) return;
      node.dataset.chordBound = '1';
      bindHover(node, () => node.dataset.chord);
    });
  }

  /** מצייר דיאגרמת אקורד לתוך אלמנט נתון (לטאצ׳/מובייל) */
  function renderInto(container, chordName) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return false;
    const key = resolveKey(chordName);
    el.innerHTML = '';
    if (!key) { el.innerHTML = `<span class="chord-tooltip-missing">${chordName}</span>`; return false; }
    const chord = CHORDS[key];
    const svg = svgEl('svg', {});
    _drawDiagram(svg, key);
    el.appendChild(svg);
    const lbl = document.createElement('div');
    lbl.className = 'chord-tooltip-label';
    lbl.textContent = chord.he || key;
    el.appendChild(lbl);
    return true;
  }

  return { show, hide, bindHover, bindContainer, resolveKey, renderInto };
})();
