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

  const MELODY_POS_SPAN = 4;
  const MELODY_BASES = [0, 2, 3, 5, 7, 9, 12];

  function noteMidi(n) {
    return n.midi ?? (TUNING[n.course].midi + n.fret);
  }

  function placementsForMidi(midi) {
    const out = [];
    TUNING.forEach((c, ci) => {
      const f = midi - c.midi;
      if (f >= 0 && f <= NUM_FRETS) out.push({ ci, fret: f, midi });
    });
    return out;
  }

  function pickPlacement(candidates, prev) {
    if (!candidates.length) return null;
    let best = candidates[0];
    let bestScore = Infinity;
    candidates.forEach(p => {
      let s = p.ci === 0 ? 0 : 3;
      if (prev) {
        s += Math.abs(p.fret - prev.fret) * 2;
        if (p.ci !== prev.ci) s += 4;
        if (Math.abs(p.fret - prev.fret) > 3) s += 12;
      }
      if (s < bestScore) { bestScore = s; best = p; }
    });
    return best;
  }

  function remapMelody(notes, opts = {}) {
    const mode = opts.mode || 'd';
    const base = opts.base ?? 0;
    const remapped = [];
    let prev = null;
    for (const n of notes) {
      const midi = noteMidi(n);
      let candidates = placementsForMidi(midi);
      if (mode === 'd') candidates = candidates.filter(p => p.ci === 0);
      else candidates = candidates.filter(p => p.fret >= base && p.fret <= base + MELODY_POS_SPAN);
      const pick = pickPlacement(candidates, prev);
      if (!pick) continue;
      remapped.push({ ...n, course: pick.ci, fret: pick.fret, midi: pick.midi });
      prev = pick;
    }
    return { notes: remapped, base, mode };
  }

  function scoreRemapped(remapped) {
    let s = 0;
    let prev = null;
    remapped.forEach(n => {
      if (prev) s += Math.abs(n.fret - prev.fret) + (n.course !== prev.course ? 3 : 0);
      prev = n;
    });
    return s + (remapped.length ? 0 : 9999);
  }

  function findBestBase(notes, mode = 'box') {
    let best = MELODY_BASES[0];
    let bestScore = Infinity;
    MELODY_BASES.forEach(b => {
      const { notes: remapped } = remapMelody(notes, { mode, base: b });
      const coverage = remapped.length / Math.max(1, notes.length);
      if (coverage < 0.55) return;
      const score = scoreRemapped(remapped) + (1 - coverage) * 200;
      if (score < bestScore) { bestScore = score; best = b; }
    });
    return best;
  }

  function splitPhrases(notes, gapSec = 0.35, maxSize = 14) {
    if (!notes.length) return [];
    const phrases = [];
    let cur = [notes[0]];
    for (let i = 1; i < notes.length; i++) {
      const prev = notes[i - 1];
      const gap = notes[i].time - (prev.time + (prev.duration || 0.15));
      if (gap > gapSec || cur.length >= maxSize) {
        phrases.push(cur);
        cur = [];
      }
      cur.push(notes[i]);
    }
    if (cur.length) phrases.push(cur);
    return phrases;
  }

  /**
   * מסלול מלודיה עקבי — מיתר D אם אפשר, אחרת תיבת פוזיציה לפי משפטים.
   * כמו מורה יווני: אותו מיתר/פוזיציה, לא קפיצות אקראיות על הצוואר.
   */
  function normalizeMelody(notes, opts = {}) {
    const sorted = [...(notes || [])].sort((a, b) => a.time - b.time);
    if (!sorted.length) return { notes: [], segments: [], mode: 'd', base: 0 };

    if (opts.mode === 'd') {
      const onD = remapMelody(sorted, { mode: 'd' });
      return { notes: onD.notes, segments: [{ mode: 'd', base: 0, notes: onD.notes }], mode: 'd', base: 0 };
    }
    if (opts.mode === 'box') {
      const base = opts.base ?? findBestBase(sorted, 'box');
      const { notes: remapped } = remapMelody(sorted, { mode: 'box', base });
      return { notes: remapped, segments: [{ mode: 'box', base, notes: remapped }], mode: 'box', base };
    }

    const onD = remapMelody(sorted, { mode: 'd' });
    const coverageD = onD.notes.length / sorted.length;
    if (coverageD >= 0.8) {
      return {
        notes: onD.notes,
        segments: [{ mode: 'd', base: 0, notes: onD.notes }],
        mode: 'd',
        base: 0,
      };
    }

    const phrases = splitPhrases(sorted, opts.gapSec ?? 0.38, opts.phraseSize ?? 18);
    const segments = [];
    const allNotes = [];

    phrases.forEach(phrase => {
      const base = opts.base ?? findBestBase(phrase, 'box');
      const { notes: remapped } = remapMelody(phrase, { mode: 'box', base });
      if (!remapped.length) return;
      segments.push({ mode: 'box', base, startTime: phrase[0].time, notes: remapped });
      allNotes.push(...remapped);
    });

    allNotes.sort((a, b) => a.time - b.time);

    if (allNotes.length < sorted.length * 0.65) {
      const base = opts.base ?? findBestBase(sorted, 'box');
      const { notes: remapped } = remapMelody(sorted, { mode: 'box', base });
      if (remapped.length >= allNotes.length) {
        return {
          notes: remapped,
          segments: [{ mode: 'box', base, notes: remapped }],
          mode: 'box',
          base,
        };
      }
    }

    return {
      notes: allNotes.length ? allNotes : onD.notes,
      segments: segments.length ? segments : [{ mode: 'd', base: 0, notes: onD.notes }],
      mode: segments.length ? 'box' : 'd',
      base: segments[0]?.base ?? 0,
    };
  }

  function drawMelodyConnections(svg, path, color = '#f0cc74') {
    if (!svg || path.length < 2) return;
    svg.querySelectorAll('.fs-melody-seg').forEach(el => el.remove());
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      const df = Math.abs(a.fret - b.fret);
      const dc = Math.abs(a.ci - b.ci);
      if (dc > 1 || df > 3) continue;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', fretCenterX(a.fret));
      line.setAttribute('y1', courseY(a.ci));
      line.setAttribute('x2', fretCenterX(b.fret));
      line.setAttribute('y2', courseY(b.ci));
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', '2');
      line.setAttribute('stroke-dasharray', '5 3');
      line.setAttribute('opacity', '0.75');
      line.setAttribute('class', 'fs-melody-seg');
      line.style.pointerEvents = 'none';
      svg.appendChild(line);
    }
  }

  function mountMelody(container, opts = {}) {
    if (!container || typeof drawFretboard !== 'function') return { svg: null, remapped: [], path: [] };
    const mode = opts.mode || 'd';
    const base = opts.base ?? (mode === 'box' ? findBestBase(opts.notes || [], mode) : 0);
    const { notes: remapped } = remapMelody(opts.notes || [], { mode, base });
    const path = remapped.map(n => ({ ci: n.course, fret: n.fret }));
    const stepByKey = new Map();
    remapped.forEach((n, i) => stepByKey.set(`${n.course}-${n.fret}`, i + 1));

    container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('fretboard', 'fs-neck-board', 'fs-melody-board');
    svg.setAttribute('dir', 'ltr');
    container.appendChild(svg);

    drawFretboard(svg, (ci, f) => {
      const step = stepByKey.get(`${ci}-${f}`);
      if (step == null) return null;
      const active = opts.activeCi === ci && opts.activeFret === f;
      return {
        type: (step === 1 || active) ? 'root' : 'note',
        label: active ? '▶' : String(step),
      };
    });

    if (opts.drawPath !== false) drawMelodyConnections(svg, path, opts.color || '#f0cc74');
    return { svg, remapped, path, base };
  }

  function mountMelodyLesson(container, opts = {}) {
    if (!container) return null;
    const mode = opts.mode || 'd';
    let base = opts.base ?? (mode === 'box' ? findBestBase(opts.notes || [], mode) : 0);
    const wrap = document.createElement('div');
    wrap.className = 'fs-melody-lesson';

    const bar = document.createElement('div');
    bar.className = 'fs-pos-bar';
    bar.hidden = mode !== 'box';
    bar.innerHTML = '<span class="fs-pos-label">פוזיציה (סריג בסיס):</span>';

    const board = document.createElement('div');
    board.className = 'fs-pos-board';

    function renderBoard() {
      const res = mountMelody(board, { ...opts, mode, base, notes: opts.notes });
      opts.onMount?.(res);
      return res;
    }

    if (mode === 'box') {
      MELODY_BASES.forEach(b => {
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
          renderBoard();
          opts.onBaseChange?.(b);
        });
        bar.appendChild(btn);
      });
    }

    wrap.appendChild(bar);
    wrap.appendChild(board);
    container.innerHTML = '';
    container.appendChild(wrap);
    const res = renderBoard();
    return res.svg;
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
    MELODY_BASES,
    MELODY_POS_SPAN,
    pcsFromDFrets,
    pcsFromIntervals,
    allPositions,
    buildBoxPath,
    buildDPath,
    makeState,
    mount,
    mountWithPositions,
    drawPathOverlay,
    drawMelodyConnections,
    remapMelody,
    findBestBase,
    splitPhrases,
    normalizeMelody,
    pickPlacement,
    placementsForMidi,
    noteMidi,
    mountMelody,
    mountMelodyLesson,
    flashMidi,
  };
})();
