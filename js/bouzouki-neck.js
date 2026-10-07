/* ============================================================
   צוואר בוזוקי משותף — אותו גריף כמו במסך «למד על הצוואר».
   סריגי מתכת, מספרי סריג, נקודות מיקום, ראש עם מפתחות,
   ארבעה קורסים כפולים דו–פה–לה–רה, ונקודה זהובה עם שם התו.
   ============================================================ */
'use strict';

const BouzoukiNeck = (() => {
  const W = 1320;
  const H = 220;
  const SPELL = [
    { he: 'דו', latin: 'Do', letter: 'C', acc: '', stepLetter: 'C' },
    { he: 'דו♯', latin: 'Do♯', letter: 'C♯', acc: '♯', stepLetter: 'C' },
    { he: 'רה', latin: 'Re', letter: 'D', acc: '', stepLetter: 'D' },
    { he: 'מי♭', latin: 'Mi♭', letter: 'E♭', acc: '♭', stepLetter: 'E' },
    { he: 'מי', latin: 'Mi', letter: 'E', acc: '', stepLetter: 'E' },
    { he: 'פה', latin: 'Fa', letter: 'F', acc: '', stepLetter: 'F' },
    { he: 'פה♯', latin: 'Fa♯', letter: 'F♯', acc: '♯', stepLetter: 'F' },
    { he: 'סול', latin: 'Sol', letter: 'G', acc: '', stepLetter: 'G' },
    { he: 'לא♭', latin: 'La♭', letter: 'A♭', acc: '♭', stepLetter: 'A' },
    { he: 'לא', latin: 'La', letter: 'A', acc: '', stepLetter: 'A' },
    { he: 'סי♭', latin: 'Si♭', letter: 'B♭', acc: '♭', stepLetter: 'B' },
    { he: 'סי', latin: 'Si', letter: 'B', acc: '', stepLetter: 'B' },
  ];

  const SVG_NS = 'http://www.w3.org/2000/svg';
  let seq = 0;
  let published = null;

  function el(tag, attrs, parent) {
    const node = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach((k) => {
        if (attrs[k] != null) node.setAttribute(k, String(attrs[k]));
      });
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function noteName(midi) {
    const pc = ((midi % 12) + 12) % 12;
    const s = SPELL[pc];
    return {
      he: s.he,
      latin: s.latin,
      letter: s.letter,
      acc: s.acc,
      stepLetter: s.stepLetter,
      pill: s.he + ' / ' + s.latin + ' (' + s.letter + ')',
    };
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function layout(maxFret, flags) {
    const shown = Math.max(12, Math.min(15, maxFret || 12));
    const mirrorH = !!(flags && flags.mirrorH);
    const mirrorV = !!(flags && flags.mirrorV);
    const boardTop = 64;
    const boardBot = 156;
    const nut = mirrorH ? 276 : 1044;
    const heel = mirrorH ? 1172 : 148;
    const boardLen = Math.abs(nut - heel);
    const full = 1 - Math.pow(2, -shown / 12);
    const sign = heel < nut ? -1 : 1;

    function wireX(fret) {
      if (fret <= 0) return nut;
      const pos = (1 - Math.pow(2, -Math.min(fret, shown) / 12)) / full;
      return nut + sign * pos * boardLen;
    }
    function spaceX(fret) {
      if (fret <= 0) return nut - sign * 26;
      const wire = wireX(fret);
      const prev = wireX(fret - 1);
      return wire + (prev - wire) * 0.2;
    }
    function courseY(i) {
      const n = 4;
      const y = boardTop + 12 + i * ((boardBot - boardTop - 24) / (n - 1));
      if (!mirrorV) return y;
      const mid = (boardTop + boardBot) / 2;
      return mid - (y - mid);
    }
    return {
      W, H, nut, heel, boardTop, boardBot, maxFret: shown,
      mirrorH, mirrorV, sign, wireX, spaceX, courseY,
    };
  }

  function flagsFrom(opts) {
    if (opts && opts.mirror === false) return { mirrorH: false, mirrorV: false };
    const mirrorH = typeof FretboardMirror !== 'undefined' && FretboardMirror.isH();
    const mirrorV = typeof FretboardMirror !== 'undefined' && FretboardMirror.isV();
    return { mirrorH, mirrorV };
  }

  function placePlate(text, plate, dotX, label) {
    text.textContent = label || '';
    let width = Math.max(78, (label || '').length * 8.4 + 16);
    try {
      const box = text.getBBox();
      if (box.width > 8) width = box.width + 16;
    } catch (e) { /* המסך עדיין מוסתר */ }
    const flip = dotX < 300;
    if (flip) {
      plate.setAttribute('x', '12');
      text.setAttribute('x', '20');
      text.setAttribute('text-anchor', 'start');
    } else {
      plate.setAttribute('x', (-12 - width).toFixed(1));
      text.setAttribute('x', '-12');
      text.setAttribute('text-anchor', 'end');
    }
    plate.setAttribute('width', width.toFixed(1));
  }

  function paint(svg, opts) {
    opts = opts || {};
    const L = layout(opts.maxFret, flagsFrom(opts));
    if (opts.publish !== false) published = L;
    svg.__bnLayout = L;
    const uid = svg.id ? ('bn-' + svg.id) : ('bn' + (++seq));
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('role', svg.getAttribute('role') || 'img');
    if (!svg.getAttribute('aria-label')) svg.setAttribute('aria-label', 'צוואר בוזוקי טטראחורדו עם סריגי מתכת');
    svg.classList.add('bn-neck');

    const headOnRight = L.heel < L.nut;
    const shaftTop = L.boardTop - 8;
    const shaftBot = L.boardBot + 8;
    const headTop = shaftTop - 6;
    const headBot = shaftBot + 6;
    const headInner = L.nut + (headOnRight ? 16 : -16);
    const headOuter = headOnRight ? 1292 : 28;
    const headMin = Math.min(headInner, headOuter);
    const headMax = Math.max(headInner, headOuter);
    const boardMin = Math.min(L.heel, L.nut);
    const boardMax = Math.max(L.heel, L.nut);

    const defs = el('defs', {}, svg);
    const shaft = el('linearGradient', { id: uid + '-shaft', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': '#a56b3c' }, shaft);
    el('stop', { offset: '0.5', 'stop-color': '#c4894e' }, shaft);
    el('stop', { offset: '1', 'stop-color': '#6a4124' }, shaft);
    const board = el('linearGradient', { id: uid + '-board', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el('stop', { offset: '0', 'stop-color': '#3d261c' }, board);
    el('stop', { offset: '0.48', 'stop-color': '#6a4330' }, board);
    el('stop', { offset: '1', 'stop-color': '#2a1812' }, board);
    const head = el('linearGradient', { id: uid + '-head', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    el('stop', { offset: '0', 'stop-color': '#7a4e2e' }, head);
    el('stop', { offset: '1', 'stop-color': '#4a2e1c' }, head);
    const glow = el('filter', { id: uid + '-glow', x: '-80%', y: '-80%', width: '260%', height: '260%' }, defs);
    el('feGaussianBlur', { stdDeviation: '3.2', result: 'b' }, glow);
    const merge = el('feMerge', {}, glow);
    el('feMergeNode', { in: 'b' }, merge);
    el('feMergeNode', { in: 'SourceGraphic' }, merge);

    const heelOuter = L.heel + (headOnRight ? -36 : 36);
    const nutShoulder = L.nut + (headOnRight ? 10 : -10);
    el('path', {
      d: 'M' + heelOuter + ' ' + (shaftTop + 6)
        + ' L' + L.heel + ' ' + shaftTop
        + ' L' + L.nut + ' ' + shaftTop
        + ' L' + nutShoulder + ' ' + headTop
        + ' L' + headOuter + ' ' + headTop
        + ' Q' + (headOuter + (headOnRight ? 16 : -16)) + ' ' + ((headTop + headBot) / 2) + ' ' + headOuter + ' ' + headBot
        + ' L' + nutShoulder + ' ' + headBot
        + ' L' + L.nut + ' ' + shaftBot
        + ' L' + L.heel + ' ' + shaftBot
        + ' L' + heelOuter + ' ' + (shaftBot - 6) + ' Z',
      fill: 'url(#' + uid + '-shaft)',
    }, svg);
    el('path', {
      d: 'M' + headMin + ' ' + headTop + ' L' + headMax + ' ' + headTop
        + ' L' + headMax + ' ' + headBot + ' L' + headMin + ' ' + headBot + ' Z',
      fill: 'url(#' + uid + '-head)',
      stroke: '#2a1a12',
      'stroke-width': 1.2,
    }, svg);
    el('rect', {
      'data-bn': 'board',
      x: boardMin, y: L.boardTop, width: boardMax - boardMin, height: L.boardBot - L.boardTop,
      fill: 'url(#' + uid + '-board)',
    }, svg);
    el('line', { x1: boardMin, y1: L.boardTop, x2: boardMax, y2: L.boardTop, stroke: '#e7d7b4', 'stroke-width': 1.4 }, svg);
    el('line', { x1: boardMin, y1: L.boardBot, x2: boardMax, y2: L.boardBot, stroke: '#1a100c', 'stroke-width': 1.6 }, svg);

    const pearl = '#f6edd4';
    [3, 5, 7, 9, 12, 15].forEach((f) => {
      if (f > L.maxFret) return;
      const x = (L.wireX(f - 1) + L.wireX(f)) / 2;
      const mid = (L.courseY(1) + L.courseY(2)) / 2;
      if (f === 12) {
        el('circle', { cx: x.toFixed(1), cy: (mid - 12).toFixed(1), r: 4.2, fill: pearl }, svg);
        el('circle', { cx: x.toFixed(1), cy: (mid + 12).toFixed(1), r: 4.2, fill: pearl }, svg);
      } else {
        el('circle', { cx: x.toFixed(1), cy: mid.toFixed(1), r: 4.6, fill: pearl }, svg);
      }
    });

    const nutX = headOnRight ? L.nut - 1 : L.nut - 8;
    el('rect', {
      x: nutX, y: L.boardTop - 5, width: 9, height: L.boardBot - L.boardTop + 10,
      rx: 1.2, fill: '#f7f3ea', stroke: '#c9bfae', 'stroke-width': 0.6,
    }, svg);

    const posts = [0, 1, 2, 3].map((i) => headMin + 46 + i * ((headMax - headMin - 70) / 3));
    for (let i = 0; i < 4; i++) {
      const y = L.courseY(i);
      const octave = typeof TUNING !== 'undefined' && TUNING[i] && TUNING[i].pair === 'octave';
      const up = octave ? 1.15 : 1.55;
      const dn = octave ? 2.15 : 1.55;
      const y1 = y - 2.6;
      const y2 = y + 2.6;
      const stringEnd = headOnRight ? boardMin - 18 : boardMax + 18;
      const x1 = Math.min(stringEnd, L.nut);
      const x2 = Math.max(stringEnd, L.nut);
      el('line', { x1: x1, y1: y1, x2: x2, y2: y1, stroke: '#f4ecda', 'stroke-width': up }, svg);
      el('line', { x1: x1, y1: y2, x2: x2, y2: y2, stroke: '#e4d3b0', 'stroke-width': dn }, svg);
      el('line', { x1: L.nut, y1: y1, x2: posts[i], y2: headTop + 2, stroke: '#f4ecda', 'stroke-width': up }, svg);
      el('line', { x1: L.nut, y1: y2, x2: posts[i], y2: headBot - 2, stroke: '#e4d3b0', 'stroke-width': dn }, svg);
    }

    for (let f = 1; f <= L.maxFret; f++) {
      const x = L.wireX(f);
      el('line', {
        'data-bn': 'fret', x1: x.toFixed(1), y1: L.boardTop, x2: x.toFixed(1), y2: L.boardBot,
        stroke: '#140e0a', 'stroke-width': 4.2, 'stroke-linecap': 'butt',
      }, svg);
      el('line', {
        'data-bn': 'fret-hi', x1: (x + 1.1).toFixed(1), y1: L.boardTop, x2: (x + 1.1).toFixed(1), y2: L.boardBot,
        stroke: '#f7f4ee', 'stroke-width': 2.15,
      }, svg);
    }

    posts.forEach((x) => {
      const g = el('g', {}, svg);
      [[headTop, -1], [headBot, 1]].forEach((pair) => {
        const y = pair[0];
        const dir = pair[1];
        el('rect', { x: x - 8, y: dir < 0 ? y - 11 : y - 1, width: 16, height: 12, rx: 2, fill: '#d5d8de', stroke: '#1c2128', 'stroke-width': 1 }, g);
        el('circle', { cx: x, cy: y, r: 3.1, fill: '#f2f4f7', stroke: '#1c2128', 'stroke-width': 1 }, g);
        el('line', { x1: x, y1: y, x2: x, y2: y + dir * 20, stroke: '#2c3138', 'stroke-width': 2.5 }, g);
        el('ellipse', { cx: x, cy: y + dir * 22, rx: 7, ry: 4.4, fill: '#2a2e36', stroke: '#111418', 'stroke-width': 0.8 }, g);
      });
    });

    const labels = [
      { he: 'רה', en: 'D' },
      { he: 'לה', en: 'A' },
      { he: 'פה', en: 'F' },
      { he: 'דו', en: 'C' },
    ];
    const labelX = headOnRight ? 18 : W - 86;
    labels.forEach((lb, i) => {
      const y = L.courseY(i);
      el('text', { x: labelX, y: y - 1, class: 'neck-course-he' }, svg).textContent = lb.he;
      el('text', { x: labelX + 34, y: y + 1, class: 'neck-course-en' }, svg).textContent = lb.en;
      if (typeof opts.onFret === 'function') {
        const mute = el('text', {
          x: labelX + 58, y: y + 4, class: 'bn-mute', fill: '#d96459', 'font-size': 13, 'font-weight': 800,
          'text-anchor': 'middle', 'font-family': 'Heebo, sans-serif',
        }, svg);
        mute.textContent = '×';
        mute.style.cursor = 'pointer';
        mute.addEventListener('click', (ev) => {
          ev.stopPropagation();
          opts.onFret(i, 'x');
        });
      }
    });

    const openX = L.spaceX(0);
    el('text', { x: openX, y: 46, 'text-anchor': 'middle', class: 'neck-open-label' }, svg).textContent = 'פתוח';
    el('text', { x: headOnRight ? 18 : W - 70, y: shaftBot + 22, class: 'neck-fret-label' }, svg).textContent = 'סריג';
    for (let f = 1; f <= L.maxFret; f++) {
      const mid = (L.wireX(f - 1) + L.wireX(f)) / 2;
      el('text', { x: mid.toFixed(1), y: shaftBot + 22, 'text-anchor': 'middle', class: 'neck-fretnum' }, svg).textContent = String(f);
    }

    if (opts.fingers) {
      const homes = opts.fingerHomes || { 1: 1, 2: 2, 3: 3, 4: 4 };
      el('text', { x: (headOnRight ? L.heel : L.heel - 8), y: 28, class: 'neck-finger-label' }, svg).textContent = 'אצבע';
      for (let f = 1; f <= 4; f++) {
        const home = homes[f] || f;
        const x = L.spaceX(Math.max(1, Math.min(L.maxFret, home)));
        const id = (opts.dotId === 'neck-dot' ? 'neck-finger-' : uid + '-finger-') + f;
        el('text', { id: id, x: x.toFixed(1), y: 46, 'text-anchor': 'middle', class: 'neck-finger' }, svg).textContent = String(f);
      }
    }

    const markers = opts.markers || [];
    markers.forEach((m) => {
      if (m.fret < 0 || m.fret > L.maxFret) return;
      const cx = L.spaceX(m.fret);
      const cy = L.courseY(m.ci);
      const midi = m.midi != null ? m.midi : (typeof TUNING !== 'undefined' ? TUNING[m.ci].midi + m.fret : 0);
      const isRoot = m.type === 'root' || m.type === 'chord';
      const g = el('g', {
        class: 'fb-dot note-dot' + (m.className ? ' ' + m.className : ''),
        'data-course': m.ci,
        'data-fret': m.fret,
        'data-pc': ((midi % 12) + 12) % 12,
      }, svg);
      if (m.opacity != null) g.setAttribute('opacity', m.opacity);
      el('circle', {
        cx: cx.toFixed(1), cy: cy.toFixed(1), r: 11,
        fill: isRoot ? '#ffe7a3' : '#2a7fa8',
        stroke: isRoot ? '#fff6d8' : '#7fd0ef',
        'stroke-width': 1.5,
      }, g);
      if (m.label) {
        const t = el('text', {
          x: cx.toFixed(1), y: (cy + 4).toFixed(1),
          fill: isRoot ? '#2a1c12' : '#eaf6fc',
          'font-size': 10, 'font-weight': 800, 'text-anchor': 'middle',
          class: 'fb-note-label', 'font-family': 'Heebo, sans-serif',
        }, g);
        t.textContent = m.label;
      }
      g.style.cursor = 'pointer';
      g.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if (typeof opts.onDotClick === 'function') opts.onDotClick(m.ci, m.fret, midi, g);
        else if (typeof AudioEngine !== 'undefined') AudioEngine.pluckCourse(m.ci, m.fret, 0, 0.55);
        moveActive(svg, { ci: m.ci, fret: m.fret, midi: midi });
      });
    });

    if (typeof opts.onFret === 'function') {
      for (let ci = 0; ci < 4; ci++) {
        for (let f = 0; f <= L.maxFret; f++) {
          const a = f === 0 ? L.spaceX(0) - 18 : Math.min(L.wireX(f - 1), L.wireX(f));
          const b = f === 0 ? L.spaceX(0) + 18 : Math.max(L.wireX(f - 1), L.wireX(f));
          const hit = el('rect', {
            x: a, y: L.courseY(ci) - 14, width: Math.max(8, b - a), height: 28,
            fill: 'transparent',
          }, svg);
          hit.style.cursor = 'pointer';
          hit.addEventListener('click', (ev) => {
            ev.stopPropagation();
            opts.onFret(ci, f);
          });
        }
      }
    }

    el('g', { class: 'bn-trail', 'pointer-events': 'none' }, svg);

    const dotId = opts.dotId || (uid + '-dot');
    const g = el('g', { id: dotId, class: 'bn-active', opacity: 0 }, svg);
    const pulse = el('circle', { r: 7, fill: 'none', stroke: '#ffe7a3', 'stroke-width': 2 }, g);
    if (!reducedMotion()) {
      const a1 = el('animate', { attributeName: 'r', values: '7;16', dur: '1.15s', repeatCount: 'indefinite' }, pulse);
      const a2 = el('animate', { attributeName: 'opacity', values: '0.85;0', dur: '1.15s', repeatCount: 'indefinite' }, pulse);
      void a1; void a2;
    }
    el('circle', {
      class: 'bn-flash', r: 14, fill: 'none', stroke: '#5dff8a', 'stroke-width': 2.6, opacity: 0,
    }, g);
    el('circle', { r: 6.2, fill: '#ffe7a3', stroke: '#fff6d8', 'stroke-width': 1.4, filter: 'url(#' + uid + '-glow)' }, g);
    const tag = el('g', { id: dotId + '-tag' }, g);
    const plate = el('rect', { id: dotId + '-plate', x: -90, y: -13, width: 78, height: 26, rx: 8, class: 'neck-dot-plate' }, tag);
    const name = el('text', {
      id: dotId + '-name', x: -12, y: 5, 'text-anchor': 'end', class: 'neck-dot-name',
    }, tag);
    name.setAttribute('style', 'direction:ltr');
    if (opts.active) moveActive(svg, opts.active, { seed: true });
    svg.__bnPaintOpts = {
      markers: opts.markers || [],
      active: opts.active || null,
      tab: opts.tab,
    };
    svg.__bnFrom = null;
    scheduleTab(svg);
    void plate;
    return L;
  }

  const TRAIL_COLORS = ['#5dff8a', '#7af0ff', '#c9a6ff', '#ffe56a', '#ff8ad4', '#49ff6a'];
  const TAB_COURSES = [
    { he: 'רה', en: 'D' },
    { he: 'לה', en: 'A' },
    { he: 'פה', en: 'F' },
    { he: 'דו', en: 'C' },
  ];
  const COL_W = 46;
  const GLOW_KEY = 'bouzouki_neck_glow_v1';
  let trailHue = 0;

  function glowOn() {
    try { return localStorage.getItem(GLOW_KEY) !== '0'; }
    catch (e) { return true; }
  }

  function applyGlowClass() {
    const on = glowOn();
    document.documentElement.classList.toggle('bn-glow-on', on);
    document.documentElement.classList.toggle('bn-glow-off', !on);
    const btn = document.getElementById('bn-glow-toggle');
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.classList.toggle('is-on', on);
    }
  }

  function setEnabled(on) {
    try { localStorage.setItem(GLOW_KEY, on ? '1' : '0'); }
    catch (e) { /* מצב פרטי */ }
    applyGlowClass();
  }

  function mountToggle() {
    if (!document.body || document.getElementById('bn-glow-toggle')) {
      applyGlowClass();
      return;
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'bn-glow-toggle';
    btn.className = 'bn-glow-toggle';
    btn.textContent = 'זוהר';
    btn.title = 'הדלקה וכיבוי של שכבת הזוהר';
    btn.setAttribute('aria-label', 'שכבת זוהר על הצוואר');
    btn.addEventListener('click', () => setEnabled(!glowOn()));
    document.body.appendChild(btn);
    applyGlowClass();
  }

  function wantsTab(svg, opts) {
    if (opts && opts.tab === false) return false;
    if (!svg) return false;
    if (svg.classList.contains('chord-svg') || svg.classList.contains('tl-chord-svg') || svg.classList.contains('ws-chord-svg') || svg.classList.contains('ws-fb-print-svg')) return false;
    if (svg.closest && svg.closest('.chord-card, .tl-chord-dia, .tl-chord-card, .ws-fb-print, .ws-sheet, .chord-tooltip')) return false;
    return true;
  }

  function tabAnchor(svg) {
    const parent = svg.parentElement;
    if (!parent) return { parent: null, before: svg };
    let overflow = '';
    try { overflow = getComputedStyle(parent).overflowX; } catch (e) { /* אין סגנון */ }
    const scrollish = parent.classList.contains('fretboard-wrap')
      || parent.classList.contains('neck-board-host')
      || parent.classList.contains('fs-pos-board')
      || overflow === 'auto' || overflow === 'scroll';
    if (scrollish && parent.parentElement) return { parent: parent.parentElement, before: parent };
    return { parent: parent, before: svg };
  }

  function tabKey(svg) {
    if (svg.__bnKey) return svg.__bnKey;
    const parent = svg.parentElement;
    let key = svg.id || '';
    if (parent && (
      parent.classList.contains('fretboard-wrap')
      || parent.classList.contains('neck-board-host')
      || parent.classList.contains('fs-pos-board')
    )) {
      key = parent.id || svg.id || key;
    }
    if (!key) key = 'bn-tab-' + (++seq);
    svg.__bnKey = key;
    return key;
  }

  function buildTab(key) {
    const tab = document.createElement('div');
    tab.className = 'bn-tab';
    tab.dataset.bnKey = key;
    tab.setAttribute('role', 'group');
    tab.setAttribute('aria-label', 'טאב נגינה, ארבעה קורסים רה לה פה דו');
    const cap = document.createElement('div');
    cap.className = 'bn-tab-cap';
    cap.dir = 'rtl';
    cap.textContent = 'טאב · נתיב הנגינה';
    const body = document.createElement('div');
    body.className = 'bn-tab-body';
    body.dir = 'ltr';
    const labs = document.createElement('div');
    labs.className = 'bn-tab-labs';
    labs.setAttribute('aria-hidden', 'true');
    TAB_COURSES.forEach((c, i) => {
      const s = document.createElement('span');
      s.className = 'bn-tab-lab';
      s.style.top = (8 + i * 16) + 'px';
      const b = document.createElement('b');
      b.textContent = c.he;
      const em = document.createElement('i');
      em.textContent = c.en;
      s.append(b, em);
      labs.appendChild(s);
    });
    const scroll = document.createElement('div');
    scroll.className = 'bn-tab-scroll';
    const track = document.createElement('div');
    track.className = 'bn-tab-track';
    const cols = document.createElement('div');
    cols.className = 'bn-tab-cols';
    const head = document.createElement('div');
    head.className = 'bn-tab-head';
    head.hidden = true;
    head.setAttribute('aria-hidden', 'true');
    track.append(cols, head);
    scroll.appendChild(track);
    body.append(labs, scroll);
    tab.append(cap, body);
    return tab;
  }

  function dropTab(svg) {
    if (svg.__bnTab && svg.__bnTab.parentNode) svg.__bnTab.remove();
    svg.__bnTab = null;
  }

  function cssEscape(value) {
    if (window.CSS && CSS.escape) return CSS.escape(value);
    return String(value).replace(/"/g, '');
  }

  function mountAndSeed(svg, opts) {
    if (!wantsTab(svg, opts)) {
      dropTab(svg);
      return;
    }
    const anchor = tabAnchor(svg);
    if (!anchor.parent) return;
    const key = tabKey(svg);
    let tab = svg.__bnTab && svg.__bnTab.isConnected ? svg.__bnTab : null;
    if (!tab) tab = anchor.parent.querySelector(':scope > .bn-tab[data-bn-key="' + cssEscape(key) + '"]');
    if (!tab) {
      tab = buildTab(key);
      anchor.parent.insertBefore(tab, anchor.before && anchor.before.parentNode === anchor.parent ? anchor.before : null);
    } else if (tab.parentNode !== anchor.parent) {
      anchor.parent.insertBefore(tab, anchor.before || null);
    }
    svg.__bnTab = tab;
    seedColumns(svg, opts);
  }

  function scheduleTab(svg) {
    const opts = svg.__bnPaintOpts || {};
    if (!wantsTab(svg, opts)) {
      dropTab(svg);
      return;
    }
    if (svg.parentElement) {
      mountAndSeed(svg, opts);
      return;
    }
    requestAnimationFrame(() => {
      if (svg.isConnected) mountAndSeed(svg, svg.__bnPaintOpts || opts);
    });
  }

  function isChordShape(markers) {
    if (!markers || !markers.length || markers.length > 6) return false;
    const seen = Object.create(null);
    for (let i = 0; i < markers.length; i++) {
      const m = markers[i];
      if (m.ci == null || typeof m.fret !== 'number' || m.fret < 0) return false;
      if (seen[m.ci]) return false;
      seen[m.ci] = true;
    }
    return true;
  }

  function clearColumns(svg) {
    const tab = svg.__bnTab;
    if (!tab) return;
    const cols = tab.querySelector('.bn-tab-cols');
    if (cols) cols.textContent = '';
    const head = tab.querySelector('.bn-tab-head');
    if (head) head.hidden = true;
  }

  function placeHead(svg, idx) {
    const tab = svg.__bnTab;
    if (!tab) return;
    const head = tab.querySelector('.bn-tab-head');
    const cols = tab.querySelector('.bn-tab-cols');
    const scroller = tab.querySelector('.bn-tab-scroll');
    if (!head || !cols) return;
    if (!cols.children.length || idx < 0) {
      head.hidden = true;
      return;
    }
    head.hidden = false;
    const x = idx * COL_W + COL_W / 2;
    head.style.left = x + 'px';
    if (scroller) scroller.scrollLeft = Math.max(0, x - scroller.clientWidth * 0.55);
  }

  function pushColumn(svg, notes) {
    const tab = svg.__bnTab;
    if (!tab || !tab.isConnected || !notes || !notes.length) return;
    const cols = tab.querySelector('.bn-tab-cols');
    if (!cols) return;
    const col = document.createElement('div');
    col.className = 'bn-tab-col';
    const names = [];
    const titles = [];
    notes.forEach((n) => {
      const fret = Math.max(0, n.fret | 0);
      const midi = n.midi != null ? n.midi : (typeof TUNING !== 'undefined' && TUNING[n.ci] ? TUNING[n.ci].midi + fret : null);
      const name = midi != null ? noteName(midi) : { he: '', pill: '' };
      const mark = document.createElement('span');
      mark.className = 'bn-tab-fret';
      mark.style.top = (8 + n.ci * 16) + 'px';
      mark.textContent = String(fret);
      col.appendChild(mark);
      if (name.he) names.push(name.he);
      if (name.pill) titles.push(name.pill);
    });
    const label = document.createElement('span');
    label.className = 'bn-tab-name';
    label.textContent = names.join(' · ');
    if (titles.length) label.title = titles.join(' · ');
    col.appendChild(label);
    cols.appendChild(col);
    while (cols.children.length > 48) cols.removeChild(cols.firstChild);
    placeHead(svg, cols.children.length - 1);
  }

  function seedColumns(svg, opts) {
    clearColumns(svg);
    svg.__bnFrom = null;
    const markers = (opts && opts.markers) || [];
    const active = opts && opts.active;
    if (isChordShape(markers)) pushColumn(svg, markers);
    else if (active && active.ci != null && typeof active.fret === 'number') pushColumn(svg, [active]);
    else placeHead(svg, -1);
  }

  function addTrail(svg, x1, y1, x2, y2) {
    const g = svg.querySelector('.bn-trail');
    if (!g) return;
    if (reducedMotion()) {
      while (g.firstChild) g.removeChild(g.firstChild);
    }
    const color = TRAIL_COLORS[trailHue % TRAIL_COLORS.length];
    trailHue += 1;
    const wide = el('line', {
      x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1),
      stroke: color, 'stroke-width': 10, 'stroke-linecap': 'round',
      class: 'bn-trail-seg bn-trail-wide', 'pointer-events': 'none',
    }, g);
    const core = el('line', {
      x1: x1.toFixed(1), y1: y1.toFixed(1), x2: x2.toFixed(1), y2: y2.toFixed(1),
      stroke: '#f4fff8', 'stroke-width': 2.2, 'stroke-linecap': 'round',
      class: 'bn-trail-seg bn-trail-core', 'pointer-events': 'none',
    }, g);
    const drop = (node) => node.addEventListener('animationend', () => node.remove());
    if (!reducedMotion()) {
      drop(wide);
      drop(core);
    }
    while (g.childNodes.length > 24) g.removeChild(g.firstChild);
  }

  function pulse(svg) {
    if (!glowOn()) return;
    const flash = svg.querySelector('.bn-flash');
    if (!flash) return;
    flash.classList.remove('is-hit');
    void flash.getBoundingClientRect();
    flash.classList.add('is-hit');
  }

  function noteGlow(svg, note) {
    if (!svg || !note || note.ci == null || note.fret == null) return;
    const L = svg.__bnLayout;
    if (!L) return;
    const fret = Math.max(0, Math.min(L.maxFret, note.fret));
    const ci = note.ci;
    const now = performance.now();
    const key = ci + ':' + fret;
    const stamp = svg.__bnStamp;
    if (stamp && stamp.key === key && now - stamp.t < 50) return;
    if (stamp && stamp.key !== key && now - stamp.t < 40) return;
    svg.__bnStamp = { key: key, t: now };
    const x = L.spaceX(fret);
    const y = L.courseY(ci);
    const midi = note.midi != null ? note.midi : (typeof TUNING !== 'undefined' && TUNING[ci] ? TUNING[ci].midi + fret : null);
    const prev = svg.__bnFrom;
    if (prev && (Math.abs(prev.x - x) > 0.5 || Math.abs(prev.y - y) > 0.5)) addTrail(svg, prev.x, prev.y, x, y);
    svg.__bnFrom = { x: x, y: y, ci: ci, fret: fret };
    pushColumn(svg, [{ ci: ci, fret: fret, midi: midi }]);
    pulse(svg);
  }

  function moveActive(svg, active, flags) {
    if (!svg) return;
    const g = svg.querySelector('.bn-active');
    const L = svg.__bnLayout;
    if (!g || !L) return;
    if (!active || active.fret == null || active.ci == null) {
      g.setAttribute('opacity', '0');
      return;
    }
    const fret = Math.max(0, Math.min(L.maxFret, active.fret));
    const x = L.spaceX(fret);
    const y = L.courseY(active.ci);
    g.setAttribute('opacity', '1');
    g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
    const midi = active.midi != null ? active.midi : (typeof TUNING !== 'undefined' && TUNING[active.ci] ? TUNING[active.ci].midi + fret : null);
    const pill = active.pill || (midi != null ? noteName(midi).pill : '');
    const text = g.querySelector('.neck-dot-name');
    const plate = g.querySelector('.neck-dot-plate');
    if (text && plate) placePlate(text, plate, x, pill);
    if (flags && flags.seed) return;
    noteGlow(svg, { ci: active.ci, fret: fret, midi: midi });
  }

  function played(svg, note) {
    if (!svg || !note || note.rest) return;
    noteGlow(svg, { ci: note.ci != null ? note.ci : note.string, fret: note.fret, midi: note.midi });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountToggle);
  else mountToggle();

  function spaceX(fret) {
    const L = published || layout(15, { mirrorH: false, mirrorV: false });
    return L.spaceX(fret);
  }
  function wireX(fret) {
    const L = published || layout(15, { mirrorH: false, mirrorV: false });
    return L.wireX(fret);
  }
  function courseY(ci) {
    const L = published || layout(15, { mirrorH: false, mirrorV: false });
    return L.courseY(ci);
  }

  published = layout(15, { mirrorH: false, mirrorV: false });

  return { W, H, SPELL, layout, paint, moveActive, played, setEnabled, glowOn, noteName, spaceX, wireX, courseY };
})();
