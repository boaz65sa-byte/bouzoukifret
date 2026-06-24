/* ============================================================
   FretboardScale — סולם ומסלול על כל המיתרים ובמספר פוזיציות
   ============================================================ */
'use strict';

const FretboardScale = (() => {
  const POSITION_BASES = [0, 2, 3, 5, 7, 9];

  function normPc(pc) {
    return ((pc % 12) + 12) % 12;
  }

  function pcsFromDFrets(frets) {
    const open = TUNING[0].midi;
    return new Set(frets.map(f => normPc(open + f)));
  }

  function pcsFromIntervals(intervals, rootPc = 2) {
    return new Set(intervals.map(iv => normPc(rootPc + iv)));
  }

  function allPositions(pcs, maxFret = NUM_FRETS) {
    const out = [];
    TUNING.forEach((c, ci) => {
      for (let f = 0; f <= maxFret; f++) {
        const pc = normPc(c.midi + f);
        if (pcs.has(pc)) out.push({ ci, f, pc, midi: c.midi + f });
      }
    });
    return out;
  }

  /** מסלול בפוזיציה — מ-C (עבה) ל-D (דק) בתיבת סריגים */
  function buildBoxPath(pcs, base = 0, span = 4) {
    const path = [];
    for (let ci = 3; ci >= 0; ci--) {
      const open = TUNING[ci].midi;
      for (let f = base; f <= base + span && f <= NUM_FRETS; f++) {
        if (f < 0) continue;
        if (pcs.has(normPc(open + f))) path.push({ ci, f });
      }
    }
    return path;
  }

  /** מסלול על מיתר D בלבד (פראזה) */
  function buildDPath(frets) {
    return (frets || []).map(f => ({ ci: 0, f }));
  }

  function makeState(pcs, rootPc, opts = {}) {
    const root = normPc(rootPc);
    const path = opts.path || [];
    const pathSet = new Set(path.map(p => `${p.ci}-${p.f}`));
    const phraseOnD = opts.phraseFrets
      ? new Map(opts.phraseFrets.map((f, i) => [f, i + 1]))
      : null;

    return (ci, f, midi) => {
      const pc = normPc(midi);
      if (!pcs.has(pc)) return null;

      const key = `${ci}-${f}`;
      const inPath = pathSet.has(key);
      const phraseStep = ci === 0 && phraseOnD ? phraseOnD.get(f) : null;
      const active = opts.activeCi === ci && opts.activeFret === f;

      if (opts.dStringOnly) {
        if (ci !== 0) return null;
        if (phraseOnD && !phraseOnD.has(f)) return null;
        if (!phraseOnD && opts.dFrets && !opts.dFrets.has(f)) return null;
      }

      let label = NOTE_NAMES[pc];
      if (phraseStep != null) label = active ? '▶' : String(phraseStep);
      else if (inPath && opts.pathLabels) {
        const idx = path.findIndex(p => p.ci === ci && p.f === f);
        if (idx >= 0) label = String(idx + 1);
      } else if (opts.showFretOnD && ci === 0) {
        label = String(f);
      }

      const isRoot = pc === root;
      return {
        type: (isRoot || active || (inPath && opts.pathLabels)) ? 'root' : 'note',
        label,
      };
    };
  }

  function drawPathOverlay(svg, path, color = '#f0cc74') {
    if (!svg || !path?.length || typeof courseY !== 'function' || typeof fretCenterX !== 'function') return;
    svg.querySelectorAll('.fs-scale-path, .fs-path-label').forEach(el => el.remove());
    const pts = path.map(p => `${fretCenterX(p.fret)},${courseY(p.ci)}`).join(' ');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', pts);
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', color);
    poly.setAttribute('stroke-width', '2.5');
    poly.setAttribute('stroke-dasharray', '6 4');
    poly.setAttribute('opacity', '0.9');
    poly.setAttribute('class', 'fs-scale-path');
    poly.style.pointerEvents = 'none';
    svg.appendChild(poly);
    path.forEach((p, i) => {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', fretCenterX(p.fret));
      t.setAttribute('y', courseY(p.ci) - 16);
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('fill', color);
      t.setAttribute('font-size', '10');
      t.setAttribute('font-weight', '800');
      t.setAttribute('font-family', 'Heebo,sans-serif');
      t.setAttribute('class', 'fs-path-label');
      t.textContent = String(i + 1);
      t.style.pointerEvents = 'none';
      svg.appendChild(t);
    });
  }

  /**
   * @param {HTMLElement} container
   * @param {{ frets?: number[], intervals?: number[], rootPc?: number, base?: number,
   *           path?: {ci:number,f:number}[], phraseFrets?: number[], activeCi?: number,
   *           activeFret?: number, pathLabels?: boolean, drawPath?: boolean,
   *           dStringOnly?: boolean, color?: string }} opts
   */
  function mount(container, opts = {}) {
    if (!container || typeof drawFretboard !== 'function') return null;
    const rootPc = opts.rootPc ?? 2;
    const pcs = opts.frets
      ? pcsFromDFrets(opts.frets)
      : pcsFromIntervals(opts.intervals || [], rootPc);
    const base = opts.base ?? 0;
    const path = opts.path
      || (opts.phraseFrets ? buildDPath(opts.phraseFrets) : buildBoxPath(pcs, base));

    container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('fretboard', 'fs-neck-board');
    svg.setAttribute('dir', 'ltr');
    container.appendChild(svg);

    drawFretboard(svg, makeState(pcs, rootPc, {
      path,
      phraseFrets: opts.phraseFrets,
      pathLabels: opts.pathLabels ?? !!opts.phraseFrets,
      activeCi: opts.activeCi,
      activeFret: opts.activeFret,
      dStringOnly: !!opts.dStringOnly,
      dFrets: opts.frets ? new Set(opts.frets) : null,
      showFretOnD: opts.showFretOnD,
    }));

    if (opts.drawPath !== false) drawPathOverlay(svg, path, opts.color || '#f0cc74');
    return svg;
  }

  function mountWithPositions(container, opts = {}) {
    if (!container) return null;
    const wrap = document.createElement('div');
    wrap.className = 'fs-pos-wrap';

    const bar = document.createElement('div');
    bar.className = 'fs-pos-bar';
    bar.innerHTML = '<span class="fs-pos-label">פוזיציה:</span>';
    const board = document.createElement('div');
    board.className = 'fs-pos-board';

    let base = opts.base ?? 0;
    const bases = opts.bases || POSITION_BASES;

    function render() {
      mount(board, { ...opts, base });
    }

    bases.forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn secondary fs-pos-chip' + (b === base ? ' active' : '');
      btn.textContent = b === 0 ? 'פתוח' : String(b);
      btn.dataset.base = String(b);
      btn.addEventListener('click', () => {
        base = b;
        bar.querySelectorAll('.fs-pos-chip').forEach(x => {
          x.classList.toggle('active', Number(x.dataset.base) === b);
        });
        render();
      });
      bar.appendChild(btn);
    });

    wrap.appendChild(bar);
    wrap.appendChild(board);
    container.innerHTML = '';
    container.appendChild(wrap);
    render();
    return board.querySelector('svg');
  }

  function flashMidi(svg, midi) {
    if (typeof flashMidiOnBoard === 'function') flashMidiOnBoard(svg, midi);
    else if (typeof flashDot === 'function') {
      TUNING.forEach((c, ci) => {
        const f = midi - c.midi;
        if (f >= 0 && f <= NUM_FRETS) flashDot(svg, ci, f);
      });
    }
  }

  return {
    POSITION_BASES,
    pcsFromDFrets,
    pcsFromIntervals,
    allPositions,
    buildBoxPath,
    buildDPath,
    makeState,
    mount,
    mountWithPositions,
    drawPathOverlay,
    flashMidi,
  };
})();
