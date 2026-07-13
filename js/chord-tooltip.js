/* ============================================================
   ChordTooltip — דיאגרמת אקורד ב-hover
   ============================================================ */
'use strict';

const ChordTooltip = (() => {
  let _el = null;
  let _hideTimer = null;
  let _activeAnchor = null;
  let _docDismissBound = false;

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
    svg.classList.add('chord-svg', 'chord-svg-tooltip');
    ChordDiagram.draw(svg, { name: key, shape: chord.shape, compact: true, showFretNumbers: false });
  }

  function _position(anchor) {
    const tip = _ensureEl();
    const r = anchor.getBoundingClientRect();
    const tw = tip.offsetWidth || 140;
    const th = tip.offsetHeight || 160;
    let left = r.left + r.width / 2 - tw / 2;
    let top = r.top - th - 10;
    if (top < 8) top = r.bottom + 10;
    const bottomReserve = window.innerWidth <= 860 ? 86 : 0;
    top = Math.max(8, Math.min(window.innerHeight - th - bottomReserve - 8, top));
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
      _activeAnchor = null;
    }, 120);
  }

  // סגירה בלחיצה מחוץ ל-tooltip/לאלמנט — נדרש למובייל (אין mouseleave במגע)
  function _bindDocDismiss() {
    if (_docDismissBound) return;
    _docDismissBound = true;
    document.addEventListener('click', (e) => {
      if (!_el || _el.hidden) return;
      if (_el.contains(e.target)) return;
      if (_activeAnchor && _activeAnchor.contains(e.target)) return;
      _el.hidden = true;
      _activeAnchor = null;
    });
  }

  function bindHover(el, getChordName) {
    if (!el) return;
    const resolve = () => (typeof getChordName === 'function' ? getChordName() : getChordName);
    el.addEventListener('mouseenter', () => {
      const name = resolve();
      if (name) show(name, el);
    });
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', () => {
      const name = resolve();
      if (name) show(name, el);
    });
    el.addEventListener('blur', hide);
    // מגע/קליק — toggle (במובייל אין hover)
    el.addEventListener('click', () => {
      const name = resolve();
      if (!name) return;
      if (_el && !_el.hidden && _activeAnchor === el) {
        clearTimeout(_hideTimer);
        _el.hidden = true;
        _activeAnchor = null;
      } else {
        clearTimeout(_hideTimer);
        show(name, el);
        _activeAnchor = el;
        _bindDocDismiss();
      }
    });
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
