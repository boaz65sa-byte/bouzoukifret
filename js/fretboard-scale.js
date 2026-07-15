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
        if (pcs.has(normPc(open + f))) path.push({ ci, fret: f });
      }
    }
    return path;
  }

  /**
   * מסלול סולם בפוזיציה גיטרתית — תיבת span סריגים משותפת, 1–4 מיתרים, טרנספוזיציה.
   * @param {number} stringMode — 1|2|3|4 מיתרים פעילים
   * @returns {{ci,fret,midi,degree,positionBase,finger}[]}
   */
  function buildScaleDegreePath(intervals, rootPc, startBase = 0, span = MELODY_POS_SPAN, stringMode = 4, dromosId = null) {
    if (dromosId && typeof DromosOverrides !== 'undefined') {
      const ov = DromosOverrides.get(dromosId, rootPc, startBase, stringMode, span);
      if (ov) return ov.path.map(p => ({ ...p }));
    }
    const courses = coursesForStringMode(stringMode);
    const degrees = [...(intervals || []), 12];

    let posBase = startBase;
    const root0 = findRootInBox(rootPc, posBase, span, courses);
    if (!root0) {
      while (posBase <= NUM_FRETS - span && !findRootInBox(rootPc, posBase, span, courses)) {
        posBase = nextPositionBase(posBase);
      }
    }
    const anchor = findRootInBox(rootPc, posBase, span, courses);
    if (!anchor) return [];

    const startMidi = anchor.midi;
    const targets = degrees.map(iv => startMidi + iv);
    const road = [];
    let prev = null;
    let activeBase = posBase;

    targets.forEach((target, i) => {
      if (i > 0 && target <= (road[road.length - 1]?.midi ?? -1)) return;

      let placed = false;
      let tryBase = activeBase;
      let guard = 0;

      while (!placed && tryBase <= NUM_FRETS - span && guard++ < 24) {
        const cands = [];
        courses.forEach(ci => {
          const f = fretFromMidi(ci, target);
          if (f == null || f < tryBase || f > tryBase + span) return;
          cands.push({ ci, fret: f, midi: target });
        });

        if (cands.length) {
          const pick = pickScaleStep(cands, prev);
          if (pick) {
            road.push({
              ...pick,
              degree: i + 1,
              positionBase: tryBase,
              finger: fingerForFret(pick.fret, tryBase),
            });
            prev = pick;
            activeBase = tryBase;
            placed = true;
          }
        } else {
          tryBase = nextPositionBase(tryBase);
        }
      }
    });
    return road;
  }

  /** עלייה + ירידה לנגינת סולם */
  function scalePlaySequence(path, descending = true) {
    if (!path?.length) return [];
    if (!descending) return [...path];
    return [...path, ...[...path].reverse().slice(1)];
  }

  /** מסלול על מיתר D בלבד (פראזה) */
  function buildDPath(frets) {
    return (frets || []).map(f => ({ ci: 0, fret: f }));
  }

  function makeState(pcs, rootPc, opts = {}) {
    const root = normPc(rootPc);
    const path = opts.path || [];
    const pathSet = new Set(path.map(p => `${p.ci}-${p.fret ?? p.f}`));
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
        const idx = path.findIndex(p => p.ci === ci && (p.fret ?? p.f) === f);
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
    const pts = path.map(p => `${fretCenterX(p.fret ?? p.f)},${courseY(p.ci)}`).join(' ');
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
      t.setAttribute('x', fretCenterX(p.fret ?? p.f));
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
  /** מיתרי מלודיה בלבד: D (0) ו-A (1) — לא בס C/F */
  const MELODY_COURSES = [0, 1];

  /** מצבי נגינה על הצוואר — 1/2/3/4 מיתרים (מעבה → דק) */
  const SCALE_STRING_MODES = {
    1: [0],
    2: [1, 0],
    3: [2, 1, 0],
    4: [3, 2, 1, 0],
  };

  function coursesForStringMode(mode = 4) {
    return SCALE_STRING_MODES[mode] || SCALE_STRING_MODES[4];
  }

  function nextPositionBase(current) {
    const cur = current ?? 0;
    const next = MELODY_BASES.find(b => b > cur);
    return next != null ? next : Math.min(NUM_FRETS - MELODY_POS_SPAN, cur + 1);
  }

  /** מוצא את בסיס-הפוזיציה הטוב ביותר עבור מספר-מיתרים נתון — זה
   *  שממקסם את מספר המיתרים השונים שהמסלול בפועל עובר בהם (לא רק
   *  "עד N מיתרים" בפוזיציה קבועה, אלא N מיתרים אמיתיים בפועל). */
  function findBestPositionForStringMode(intervals, rootPc, stringMode, bases, span = MELODY_POS_SPAN) {
    const list = bases?.length ? bases : MELODY_BASES.filter(b => b <= 9);
    let best = list[0];
    let bestScore = -1;
    list.forEach(b => {
      const path = buildScaleDegreePath(intervals, rootPc, b, span, stringMode);
      const usedCourses = new Set(path.map(p => p.ci)).size;
      const score = usedCourses * 1000 + path.length;
      if (score > bestScore) { bestScore = score; best = b; }
    });
    return best;
  }

  function findRootInBox(rootPc, base, span, courses) {
    for (const ci of courses) {
      for (let f = base; f <= base + span; f++) {
        if (normPc(TUNING[ci].midi + f) === normPc(rootPc)) {
          return { ci, fret: f, midi: TUNING[ci].midi + f };
        }
      }
    }
    return null;
  }

  function pickScaleStep(cands, prev) {
    if (!cands.length) return null;
    if (!prev) {
      return cands.slice().sort((a, b) => a.ci - b.ci || a.fret - b.fret)[0];
    }
    let best = cands[0];
    let bestScore = Infinity;
    cands.forEach(c => {
      let s = transitionCostGreek(prev, c);
      if (c.ci < prev.ci && Math.abs(c.fret - prev.fret) <= 2) s -= 8;
      if (c.ci === prev.ci && c.fret > prev.fret && c.fret - prev.fret <= 2) s -= 4;
      if (c.fret === 0) s -= 6;
      if (s < bestScore) { bestScore = s; best = c; }
    });
    return best;
  }

  /** מפת מיתרים פתוחים (חצאי-טונים / MIDI) — course 0 = מיתר 1 (D4) … 3 = מיתר 4 (C3) */
  function openStringMap() {
    return TUNING.map((t, ci) => ({
      ci,
      string: t.course,
      note: t.note,
      midi: t.midi,
      labelHe: t.labelHe,
    }));
  }

  /** סריג = מרחק בחצאי-טונים מתו פתוח; null אם מחוץ לתחום */
  function fretFromMidi(courseIdx, midi) {
    const fret = midi - TUNING[courseIdx].midi;
    if (fret < 0 || fret > NUM_FRETS) return null;
    return fret;
  }

  function midiFromFret(courseIdx, fret) {
    return TUNING[courseIdx].midi + fret;
  }

  /** כל בסיסי הפוזיציה שבהם הסריג נמצא בתיבת span סריגים */
  function legalBasesForFret(fret, span = MELODY_POS_SPAN) {
    const out = [];
    const lo = Math.max(0, fret - span);
    for (let b = lo; b <= fret; b++) {
      if (b + span <= NUM_FRETS) out.push(b);
    }
    return out;
  }

  function shiftCost(fromBase, toBase) {
    if (toBase <= fromBase) return 0;
    return (toBase - fromBase) * 48;
  }

  function inPositionBox(fret, base, span = MELODY_POS_SPAN) {
    return fret >= base && fret <= base + span;
  }

  function coursePenalty(ci) {
    if (ci === 0) return 0;
    if (ci === 1) return 1;
    return 100;
  }

  function filterByMode(candidates, mode, base) {
    if (mode === 'd') return candidates.filter(p => p.ci === 0);
    if (mode === 'da' || mode === 'box') {
      return candidates.filter(p =>
        MELODY_COURSES.includes(p.ci) &&
        (mode !== 'box' || (p.fret >= base && p.fret <= base + MELODY_POS_SPAN))
      );
    }
    return candidates.filter(p => MELODY_COURSES.includes(p.ci));
  }

  function noteMidi(n) {
    return n.midi ?? (TUNING[n.course].midi + n.fret);
  }

  function placementsForMidi(midi) {
    const out = [];
    TUNING.forEach((c, ci) => {
      const f = fretFromMidi(ci, midi);
      if (f != null) out.push({ ci, fret: f, midi: c.midi + f });
    });
    return out;
  }

  /** כל המיקומים האפשריים לתו על מיתרים נתונים (ללא סינון תיבה) */
  function allCandidatesForNote(midi, courses) {
    return placementsForMidi(midi).filter(p => courses.includes(p.ci));
  }

  /** עלות מעבר — χιγκίζ: מעבר מיתר D↔A קרוב, בלי ריצות ארוכות על מיתר */
  function transitionCostGreek(a, b) {
    if (!a || !b) return 0;
    const df = Math.abs(a.fret - b.fret);
    const dc = Math.abs(a.ci - b.ci);
    if (dc === 1) {
      if (df <= 3) return 1 + df * 0.6;
      if (df <= 5) return 6 + df * 2.5;
      return 28 + df * 8;
    }
    if (dc === 0) {
      if (df <= 2) return df * 4;
      if (df <= 4) return df * 12;
      return df * 28;
    }
    return df * 10 + dc * 20;
  }

  /** אצבע 1 = סריג בסיס הפוזיציה … 4 = בסיס+3; 0 = מיתר פתוח */
  function fingerForFret(fret, base) {
    if (fret === 0) return 0;
    const rel = fret - base;
    if (rel < 0) return 1;
    return Math.min(4, rel + 1);
  }

  function coursesForMode(mode) {
    if (mode === 'd') return [0];
    if (mode === 'da' || mode === 'box') return [0, 1];
    if (mode === 'greek') return [0, 1, 2, 3];
    return MELODY_COURSES;
  }

  function candidatesForNote(midi, base, span, courses, allowOpen = true) {
    const cands = [];
    const seen = new Set();
    courses.forEach(ci => {
      const f = fretFromMidi(ci, midi);
      if (f == null) return;
      const key = `${ci}-${f}`;
      if (seen.has(key)) return;
      seen.add(key);
      const inBox = inPositionBox(f, base, span);
      if (inBox) cands.push({ ci, fret: f, midi: midiFromFret(ci, f), inBox: true });
      else if (allowOpen && f === 0) {
        cands.push({ ci, fret: 0, midi: TUNING[ci].midi, inBox: false, open: true });
      }
    });
    return cands;
  }

  function placementCostGreek(p, prev, base) {
    let s = 0;
    if (p.fret === 0) s -= 28;
    if (p.open && !p.inBox) s += 6;
    if (base != null && inPositionBox(p.fret, base)) s -= 10;
    else if (base != null && !inPositionBox(p.fret, base)) s += 140;
    s += coursePenalty(p.ci);
    if (prev) s += transitionCostGreek(prev, p);
    return s;
  }

  /**
   * נתיב נגינה יווני — תיבת 4 סריגים, מעבר פוזיציה דינמי (Shift), Viterbi.
   * fret = midi - openMidi; אם התו מחוץ לתיבה — מקדמים את בסיס הפוזיציה קדימה.
   */
  function computeGreekPath(notes, opts = {}) {
    const sorted = [...(notes || [])].sort((a, b) => a.time - b.time);
    const span = opts.span ?? MELODY_POS_SPAN;
    const mode = opts.mode || 'da';
    const courses = opts.courses ?? coursesForMode(mode);
    let fixedBase = opts.base;
    const dynamicShift = fixedBase == null;
    const allowOpen = opts.allowOpen !== false;

    if (!sorted.length) {
      return { notes: [], base: fixedBase ?? 0, span, path: [] };
    }

    if (dynamicShift && !opts._noBaseRetry && (mode === 'da' || mode === 'd' || mode === 'box')) {
      let bestTrial = null;
      let bestCov = 0;
      for (const b of MELODY_BASES) {
        const trial = computeGreekPath(sorted, {
          ...opts, base: b, _noBaseRetry: true,
        });
        const cov = trial.notes.length / sorted.length;
        if (cov > bestCov) {
          bestCov = cov;
          bestTrial = trial;
        }
      }
      if (bestTrial && bestCov >= 0.8) return bestTrial;
    }

    const layers = sorted.map(n => {
      let cands = allCandidatesForNote(noteMidi(n), courses);
      if (!allowOpen) cands = cands.filter(p => p.fret > 0);
      return { note: n, cands };
    });

    const viable = layers.filter(l => l.cands.length).length;
    if (!viable) return { notes: [], base: fixedBase ?? 0, span, path: [] };

    function basesForCandidate(c) {
      if (fixedBase != null) {
        return inPositionBox(c.fret, fixedBase, span) ? [fixedBase] : [];
      }
      return legalBasesForFret(c.fret, span);
    }

    let states = [];
    layers[0].cands.forEach(c => {
      basesForCandidate(c).forEach(b => {
        states.push({
          pick: c,
          base: b,
          cost: placementCostGreek(c, null, b),
          prev: null,
          idx: 0,
        });
      });
    });
    if (!states.length) return { notes: [], base: fixedBase ?? 0, span, path: [] };

    for (let i = 1; i < layers.length; i++) {
      const { cands } = layers[i];
      if (!cands.length) continue;
      const next = [];
      cands.forEach(c => {
        const bases = basesForCandidate(c);
        bases.forEach(b => {
          let bestCost = Infinity;
          let bestPrev = null;
          states.forEach(st => {
            if (dynamicShift && b < st.base) return;
            const cost = st.cost
              + (dynamicShift ? shiftCost(st.base, b) : 0)
              + placementCostGreek(c, st.pick, b);
            if (cost < bestCost) {
              bestCost = cost;
              bestPrev = st;
            }
          });
          if (bestPrev) {
            next.push({ pick: c, base: b, cost: bestCost, prev: bestPrev, idx: i });
          }
        });
      });
      if (next.length) states = next;
    }

    let best = states[0];
    states.forEach(st => { if (st.cost < best.cost) best = st; });

    const picksByIdx = new Map();
    const basesByIdx = new Map();
    let cur = best;
    while (cur) {
      picksByIdx.set(cur.idx, cur.pick);
      basesByIdx.set(cur.idx, cur.base);
      cur = cur.prev;
    }

    const path = [];
    const out = [];
    sorted.forEach((n, i) => {
      const p = picksByIdx.get(i);
      if (!p) return;
      const noteBase = basesByIdx.get(i) ?? fixedBase ?? 0;
      path.push({ ci: p.ci, fret: p.fret });
      const finger = fingerForFret(p.fret, noteBase);
      out.push({
        ...n,
        course: p.ci,
        fret: p.fret,
        midi: p.midi ?? midiFromFret(p.ci, p.fret),
        finger,
        string: TUNING[p.ci].course,
        positionBase: noteBase,
      });
    });

    const pathBase = out[0]?.positionBase ?? fixedBase ?? 0;
    return { notes: out, base: pathBase, span, path, bases: out.map(n => n.positionBase) };
  }

  function findBestGreekBase(notes, opts = {}) {
    const pathOpts = { ...opts, _noBaseRetry: true };
    const dynamic = computeGreekPath(notes, { ...pathOpts, base: undefined });
    const dynCov = dynamic.notes.length / Math.max(1, notes.length);
    if (dynCov >= 0.85) return dynamic.base;

    const mode = opts.mode || 'da';
    const courses = opts.courses ?? coursesForMode(mode);
    const span = opts.span ?? MELODY_POS_SPAN;
    let best = MELODY_BASES[0];
    let bestScore = Infinity;
    MELODY_BASES.forEach(b => {
      const r = computeGreekPath(notes, { ...pathOpts, base: b, mode, courses, span });
      const coverage = r.notes.length / Math.max(1, notes.length);
      if (coverage < 0.5) return;
      let moveCost = 0;
      for (let i = 1; i < r.path.length; i++) {
        moveCost += transitionCostGreek(r.path[i - 1], r.path[i]);
      }
      const score = moveCost + (1 - coverage) * 400;
      if (score < bestScore) { bestScore = score; best = b; }
    });
    return best;
  }

  function pickPlacement(candidates, prev, sticky) {
    if (!candidates.length) return null;
    const midi = candidates[0].midi;
    if (sticky && sticky.has(midi)) {
      const mem = sticky.get(midi);
      const exact = candidates.find(p => p.ci === mem.ci && p.fret === mem.fret);
      if (exact) return exact;
      const onSame = candidates.filter(p => p.ci === mem.ci);
      if (onSame.length) candidates = onSame;
    }
    let best = candidates[0];
    let bestScore = Infinity;
    candidates.forEach(p => {
      let s = placementCostGreek(p, prev, prev?.fret ?? 0);
      if (sticky && sticky.has(midi)) {
        const mem = sticky.get(midi);
        if (p.ci === mem.ci && p.fret === mem.fret) s -= 20;
        else if (p.ci === mem.ci) s -= 8;
      }
      if (s < bestScore) { bestScore = s; best = p; }
    });
    if (sticky && best) sticky.set(midi, { ci: best.ci, fret: best.fret });
    return best;
  }

  function remapMelody(notes, opts = {}) {
    const mode = opts.mode || 'da';
    const greek = computeGreekPath(notes, {
      mode,
      base: opts.base,
      span: opts.span,
      courses: opts.courses,
    });
    if (greek.notes.length) {
      return { notes: greek.notes, base: greek.base, mode, sticky: opts.sticky, path: greek.path };
    }
    const base = opts.base ?? 0;
    const remapped = [];
    let prev = null;
    const sticky = opts.sticky || new Map();
    const courses = coursesForMode(mode);
    for (const n of notes) {
      const midi = noteMidi(n);
      let candidates = candidatesForNote(midi, base, opts.span ?? MELODY_POS_SPAN, courses);
      const pick = pickPlacement(candidates, prev, sticky);
      if (!pick) continue;
      remapped.push({
        ...n, course: pick.ci, fret: pick.fret, midi: pick.midi,
        finger: fingerForFret(pick.fret, base), string: TUNING[pick.ci].course, positionBase: base,
      });
      prev = pick;
    }
    return { notes: remapped, base, mode, sticky };
  }

  function scoreRemapped(remapped) {
    let s = 0;
    let prev = null;
    remapped.forEach(n => {
      s += coursePenalty(n.course) * 2;
      const p = { ci: n.course, fret: n.fret };
      if (prev) s += transitionCostGreek(prev, p);
      prev = p;
    });
    return s + (remapped.length ? 0 : 9999);
  }

  function findBestBase(notes, mode = 'box') {
    const m = mode === 'box' ? 'da' : mode;
    return findBestGreekBase(notes, { mode: m });
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
    if (!sorted.length) return { notes: [], segments: [], mode: 'da', base: 0 };

    if (opts.mode === 'd') {
      const greek = computeGreekPath(sorted, { mode: 'd', base: 0 });
      return { notes: greek.notes, segments: [{ mode: 'd', base: 0, notes: greek.notes }], mode: 'd', base: 0 };
    }
    if (opts.mode === 'da') {
      const gap = opts.gapSec ?? 0.35;
      const phrases = splitPhrases(sorted, gap, opts.phraseSize ?? 22);
      const allNotes = [];
      const segments = [];
      phrases.forEach(phrase => {
        const base = findBestGreekBase(phrase, { mode: 'da' });
        const greek = computeGreekPath(phrase, { mode: 'da', base, _noBaseRetry: true });
        if (!greek.notes.length) return;
        segments.push({ mode: 'da', base: greek.base, notes: greek.notes });
        allNotes.push(...greek.notes);
      });
      if (allNotes.length >= sorted.length * 0.72) {
        allNotes.sort((a, b) => a.time - b.time);
        return {
          notes: allNotes,
          segments,
          mode: 'da',
          base: segments[0]?.base ?? 0,
        };
      }
      const greek = computeGreekPath(sorted, {
        mode: 'da', base: findBestGreekBase(sorted, { mode: 'da' }), _noBaseRetry: true,
      });
      return { notes: greek.notes, segments: [{ mode: 'da', base: greek.base, notes: greek.notes }], mode: 'da', base: greek.base };
    }
    if (opts.mode === 'box') {
      const base = opts.base ?? findBestGreekBase(sorted, { mode: 'da' });
      const greek = computeGreekPath(sorted, { mode: 'da', base, _noBaseRetry: true });
      return { notes: greek.notes, segments: [{ mode: 'box', base: greek.base, notes: greek.notes }], mode: 'box', base: greek.base };
    }

    const greekDa = computeGreekPath(sorted, { mode: 'da' });
    const coverageDa = greekDa.notes.length / sorted.length;
    if (coverageDa >= 0.75) {
      return {
        notes: greekDa.notes,
        segments: [{ mode: 'da', base: greekDa.base, notes: greekDa.notes }],
        mode: 'da',
        base: greekDa.base,
      };
    }

    const greekD = computeGreekPath(sorted, { mode: 'd', base: 0 });
    const coverageD = greekD.notes.length / sorted.length;
    if (coverageD >= 0.8) {
      return {
        notes: greekD.notes,
        segments: [{ mode: 'd', base: 0, notes: greekD.notes }],
        mode: 'd',
        base: 0,
      };
    }

    const phrases = splitPhrases(sorted, opts.gapSec ?? 0.38, opts.phraseSize ?? 18);
    const segments = [];
    const allNotes = [];

    phrases.forEach(phrase => {
      const greek = computeGreekPath(phrase, { mode: 'da' });
      if (!greek.notes.length) return;
      segments.push({ mode: 'da', base: greek.base, startTime: phrase[0].time, notes: greek.notes });
      allNotes.push(...greek.notes);
    });

    allNotes.sort((a, b) => a.time - b.time);

    if (allNotes.length < sorted.length * 0.65) {
      const greek = computeGreekPath(sorted, { mode: 'da' });
      if (greek.notes.length >= allNotes.length) {
        return {
          notes: greek.notes,
          segments: [{ mode: 'da', base: greek.base, notes: greek.notes }],
          mode: 'da',
          base: greek.base,
        };
      }
    }

    return {
      notes: allNotes.length ? allNotes : greekDa.notes,
      segments: segments.length ? segments : [{ mode: 'da', base: greekDa.base, notes: greekDa.notes }],
      mode: segments.length ? 'da' : 'da',
      base: segments[0]?.base ?? greekDa.base ?? 0,
    };
  }

  function drawMelodyConnections(svg, path, color = '#f0cc74') {
    if (!svg || path.length < 2) return;
    svg.querySelectorAll('.fs-melody-seg, .fs-scale-path, .fs-path-label').forEach(el => el.remove());
    if (path.length <= 24) {
      drawPathOverlay(svg, path, color);
      return;
    }
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      if (!MELODY_COURSES.includes(a.ci) || !MELODY_COURSES.includes(b.ci)) continue;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', fretCenterX(a.fret));
      line.setAttribute('y1', courseY(a.ci));
      line.setAttribute('x2', fretCenterX(b.fret));
      line.setAttribute('y2', courseY(b.ci));
      line.setAttribute('stroke', color);
      line.setAttribute('stroke-width', '2.5');
      line.setAttribute('stroke-dasharray', '5 3');
      line.setAttribute('opacity', '0.85');
      line.setAttribute('class', 'fs-melody-seg');
      line.style.pointerEvents = 'none';
      svg.appendChild(line);
    }
  }

  function mountMelody(container, opts = {}) {
    if (!container || typeof drawFretboard !== 'function') return { svg: null, remapped: [], path: [] };
    const mode = opts.mode || 'da';
    const pathMode = mode === 'box' ? 'da' : mode;
    let remapped;
    let base;
    let path;

    if (opts.preservePlacement && opts.notes?.length) {
      base = opts.base ?? opts.notes[0]?.positionBase ?? 0;
      remapped = opts.notes.map(n => ({
        ...n,
        finger: n.finger ?? fingerForFret(n.fret, n.positionBase ?? base),
      }));
      path = remapped.map(n => ({ ci: n.course, fret: n.fret }));
    } else {
      const greek = computeGreekPath(opts.notes || [], {
        mode: pathMode,
        base: opts.base,
      });
      remapped = greek.notes;
      base = greek.base;
      path = greek.path;
    }
    const stepAt = new Map();
    remapped.forEach((n, i) => stepAt.set(`${n.course}-${n.fret}`, i + 1));

    container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('fretboard', 'fs-neck-board', 'fs-melody-board');
    svg.setAttribute('dir', 'ltr');
    container.appendChild(svg);

    drawFretboard(svg, (ci, f) => {
      const step = stepAt.get(`${ci}-${f}`);
      if (step == null) return null;
      const active = opts.activeCi === ci && opts.activeFret === f;
      const n = remapped.find(x => x.course === ci && x.fret === f);
      const finger = n?.finger;
      let label = String(step);
      if (finger != null && finger > 0) label = `${step}·${finger}`;
      if (active) label = '▶';
      return {
        type: (step === 1 || active) ? 'root' : 'note',
        label,
      };
    });

    if (opts.drawPath !== false) drawMelodyConnections(svg, path, opts.color || '#f0cc74');
    if (typeof FretboardMirror !== 'undefined') {
      FretboardMirror.mountToggle(container, { onChange: () => mountMelody(container, opts) });
    }
    return { svg, remapped, path, base };
  }

  function mountMelodyLesson(container, opts = {}) {
    if (!container) return null;
    const mode = opts.mode || 'da';
    let base = opts.base ?? (mode === 'box'
      ? findBestGreekBase(opts.notes || [], { mode: 'da' })
      : findBestGreekBase(opts.notes || [], { mode: mode === 'box' ? 'da' : mode }));
    const wrap = document.createElement('div');
    wrap.className = 'fs-melody-lesson';

    const bar = document.createElement('div');
    bar.className = 'fs-pos-bar';
    bar.hidden = mode !== 'box';
    bar.innerHTML = '<span class="fs-pos-label">פוזיציה (סריג בסיס):</span>';

    const board = document.createElement('div');
    board.className = 'fs-pos-board';

    function renderBoard() {
      const res = mountMelody(board, { ...opts, mode, base, notes: opts.notes, preservePlacement: opts.preservePlacement });
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
    if (typeof FretboardMirror !== 'undefined') {
      FretboardMirror.mountToggle(container, { onChange: () => mount(container, opts) });
    }
    return svg;
  }

  function fretsOnDToIntervals(frets) {
    if (!Array.isArray(frets) || !frets.length) return [];
    const list = frets[frets.length - 1] === 12 && frets.length > 1 ? frets.slice(0, -1) : [...frets];
    const rootFret = list[0] || 0;
    return list.map(f => ((f - rootFret) % 12 + 12) % 12);
  }

  /** ציור סולם דרומוס עם מסלול ממוספר על לוח קיים */
  function renderDromosScale(svg, intervals, rootPc, opts = {}) {
    if (!svg || typeof drawFretboard !== 'function' || !intervals?.length) return [];
    const posBase = opts.posBase ?? 0;
    const stringMode = opts.stringMode ?? 4;
    const sp = opts.span ?? MELODY_POS_SPAN;
    const pcsSet = new Set(intervals.map(iv => normPc(rootPc + iv)));
    const scalePath = buildScaleDegreePath(intervals, rootPc, posBase, sp, stringMode, opts.dromosId);
    const pathKey = (ci, f) => `${ci}-${f}`;
    const pathMap = new Map(scalePath.map(p => [pathKey(p.ci, p.fret), p]));
    const usedBases = [...new Set(scalePath.map(p => p.positionBase ?? posBase))];
    const inUsedBox = (f) => usedBases.some(b => f >= b && f <= b + sp);
    const activeCourses = new Set(coursesForStringMode(stringMode));

    svg.querySelectorAll('.fs-scale-path, .fs-path-label').forEach(el => el.remove());
    drawFretboard(svg, (ci, f, midi) => {
      if (!activeCourses.has(ci)) return null;
      const pc = normPc(midi);
      if (!pcsSet.has(pc)) return null;
      const onPath = pathMap.get(pathKey(ci, f));
      if (onPath) {
        const finger = onPath.finger;
        const label = finger > 0 ? `${onPath.degree}·${finger}` : String(onPath.degree);
        return { type: onPath.degree === 1 ? 'root' : 'note', label };
      }
      if (!inUsedBox(f)) return null;
      return { type: 'note', label: NOTE_NAMES[pc] };
    });
    if (scalePath.length) drawPathOverlay(svg, scalePath, opts.color);
    return scalePath;
  }

  /** קליק על נקודה במצב עריכה — מחזור מצבים קבוע וצפוי:
   *  לא-כלולה -> אצבע 1 -> 2 -> 3 -> 4 -> מוסרת -> (חוזר חלילה).
   *  מיתר פתוח: אין אצבוע לסובב — רק כלולה<->מוסרת.
   *  כל תו-סולם יכול להופיע פעם אחת בדראפט; קליק על הופעה שנייה "מזיז" אותו. */
  function editDotTap(draftPath, intervals, rootPc, posBase, ci, f, midi) {
    const pc = normPc(midi);
    const degIdx = intervals.findIndex(iv => normPc(rootPc + iv) === pc);
    if (degIdx < 0) return false;

    const existingIdx = draftPath.findIndex(p => p.ci === ci && p.fret === f);
    if (f === 0) {
      if (existingIdx >= 0) {
        draftPath.splice(existingIdx, 1);
      } else {
        const sameIdx = draftPath.findIndex(p => normPc(p.midi) === pc);
        if (sameIdx >= 0) draftPath.splice(sameIdx, 1);
        draftPath.push({ ci, fret: f, midi, finger: 0 });
      }
    } else if (existingIdx >= 0) {
      const entry = draftPath[existingIdx];
      if (entry.finger >= 4) draftPath.splice(existingIdx, 1);
      else entry.finger += 1;
    } else {
      const sameIdx = draftPath.findIndex(p => normPc(p.midi) === pc);
      if (sameIdx >= 0) draftPath.splice(sameIdx, 1);
      draftPath.push({ ci, fret: f, midi, finger: 1 });
    }
    draftPath.sort((a, b) => a.midi - b.midi);
    draftPath.forEach((p, i) => { p.degree = i + 1; p.positionBase = posBase; });
    return true;
  }

  /** ציור פוזיציה במצב עריכה — מצייר מתוך draftPath (לא מחשב), ומאפשר קליק לעריכה. */
  function renderEditableDromosScale(svg, intervals, rootPc, draftPath, opts = {}) {
    if (!svg || typeof drawFretboard !== 'function') return;
    const posBase = opts.posBase ?? 0;
    const stringMode = opts.stringMode ?? 4;
    const sp = opts.span ?? MELODY_POS_SPAN;
    const pcsSet = new Set(intervals.map(iv => normPc(rootPc + iv)));
    const activeCourses = new Set(coursesForStringMode(stringMode));

    svg.querySelectorAll('.fs-scale-path, .fs-path-label').forEach(el => el.remove());
    drawFretboard(svg, (ci, f, midi) => {
      if (!activeCourses.has(ci)) return null;
      if (f < posBase || f > posBase + sp) return null;
      const pc = normPc(midi);
      if (!pcsSet.has(pc)) return null;
      const onPath = draftPath.find(p => p.ci === ci && p.fret === f);
      if (onPath) {
        const label = onPath.finger > 0 ? `${onPath.degree}·${onPath.finger}` : String(onPath.degree);
        return { type: onPath.degree === 1 ? 'root' : 'note', label };
      }
      return { type: 'note', label: NOTE_NAMES[pc] };
    }, {
      onDotClick(ci, f, midi) {
        if (editDotTap(draftPath, intervals, rootPc, posBase, ci, f, midi)) opts.onDraftChange?.(draftPath);
      },
    });

    svg.querySelectorAll('.note-dot').forEach(dot => {
      const inDraft = draftPath.some(p => p.ci === Number(dot.dataset.course) && p.fret === Number(dot.dataset.fret));
      dot.classList.toggle('fs-edit-included', inDraft);
      dot.classList.toggle('fs-edit-excluded', !inDraft);
    });
    if (draftPath.length) drawPathOverlay(svg, draftPath, opts.color);
  }

  /**
   * פאנל סולם עם בורר פוזיציה + מיתרים.
   * opts: intervals | frets, rootPc, posBase, stringMode, bases, onChange
   */
  function mountDromosScalePanel(container, opts = {}) {
    if (!container) return null;
    let posBase = opts.posBase ?? 0;
    let stringMode = opts.stringMode ?? 4;
    const rootPc = opts.rootPc ?? 2;
    const dromosId = opts.dromosId || null;
    const onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
    const ivs = opts.intervals?.length
      ? opts.intervals
      : (opts.frets?.length ? fretsOnDToIntervals(opts.frets) : []);
    let path = [];

    container.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'fs-pos-wrap';

    const bar = document.createElement('div');
    bar.className = 'fs-pos-bar';
    bar.innerHTML = '<span class="fs-pos-label">פוזיציה:</span>';
    const bases = opts.bases || MELODY_BASES.filter(b => b <= 9);
    const span = opts.span ?? MELODY_POS_SPAN;
    bases.forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn secondary fs-pos-chip' + (b === posBase ? ' active' : '');
      btn.textContent = b === 0 ? 'פתוח' : String(b);
      btn.dataset.base = String(b);
      btn.addEventListener('click', () => {
        posBase = b;
        bar.querySelectorAll('.fs-pos-chip[data-base]').forEach(x => {
          x.classList.toggle('active', Number(x.dataset.base) === b);
        });
        render();
      });
      bar.appendChild(btn);
    });

    const strLbl = document.createElement('span');
    strLbl.className = 'fs-pos-label';
    strLbl.style.marginInlineStart = '12px';
    strLbl.textContent = 'מיתרים:';
    bar.appendChild(strLbl);
    [1, 2, 3, 4].forEach(n => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn secondary fs-pos-chip fs-str-chip' + (n === stringMode ? ' active' : '');
      btn.textContent = String(n);
      btn.dataset.str = String(n);
      btn.addEventListener('click', () => {
        stringMode = n;
        if (ivs.length) {
          posBase = findBestPositionForStringMode(ivs, rootPc, n, bases, span);
          bar.querySelectorAll('.fs-pos-chip[data-base]').forEach(x => {
            x.classList.toggle('active', Number(x.dataset.base) === posBase);
          });
        }
        bar.querySelectorAll('.fs-str-chip').forEach(x => {
          x.classList.toggle('active', Number(x.dataset.str) === n);
        });
        render();
      });
      bar.appendChild(btn);
    });

    if (typeof FretboardMirror !== 'undefined') {
      FretboardMirror.mountToggle(bar, { onChange: () => render() });
    }

    let editMode = false;
    let draft = null;
    const canEdit = !!(dromosId && ivs.length && typeof DromosOverrides !== 'undefined');
    let editBtn, saveBtn, cancelBtn, resetBtn, badge, posChips, strChips;

    if (canEdit) {
      const editBar = document.createElement('div');
      editBar.className = 'fs-edit-bar';

      const mkEditBtn = (label, cls) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn secondary fs-pos-chip ' + cls;
        b.textContent = label;
        b.addEventListener('click', (e) => e.stopPropagation());
        editBar.appendChild(b);
        return b;
      };

      editBtn = mkEditBtn('✏️ ערוך פוזיציה', 'fs-edit-toggle');
      saveBtn = mkEditBtn('💾 שמור', 'fs-edit-save');
      cancelBtn = mkEditBtn('ביטול', 'fs-edit-cancel');
      resetBtn = mkEditBtn('↺ אפס להתחלה', 'fs-edit-reset');
      badge = document.createElement('span');
      badge.className = 'fs-edit-badge';
      badge.hidden = true;
      badge.textContent = '✓ מותאם';
      editBar.appendChild(badge);
      bar.appendChild(editBar);

      function setEditUI(active) {
        editBtn.hidden = active;
        saveBtn.hidden = !active;
        cancelBtn.hidden = !active;
        resetBtn.hidden = !active;
        posChips = bar.querySelectorAll('.fs-pos-chip[data-base]');
        strChips = bar.querySelectorAll('.fs-str-chip');
        posChips.forEach(c => { c.disabled = active; });
        strChips.forEach(c => { c.disabled = active; });
      }

      editBtn.addEventListener('click', () => {
        editMode = true;
        draft = path.map(p => ({ ...p }));
        setEditUI(true);
        render();
      });
      saveBtn.addEventListener('click', () => {
        DromosOverrides.set(dromosId, rootPc, posBase, stringMode, span, draft);
        editMode = false;
        draft = null;
        setEditUI(false);
        render();
      });
      cancelBtn.addEventListener('click', () => {
        editMode = false;
        draft = null;
        setEditUI(false);
        render();
      });
      resetBtn.addEventListener('click', () => {
        if (!confirm('לאפס את הפוזיציה הזו לברירת המחדל?')) return;
        DromosOverrides.reset(dromosId, rootPc, posBase, stringMode);
        editMode = false;
        draft = null;
        setEditUI(false);
        render();
      });
      setEditUI(false);
    }

    const board = document.createElement('div');
    board.className = 'fs-pos-board';

    function render() {
      let svg = board.querySelector('svg.fretboard');
      if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('fretboard', 'fs-neck-board');
        svg.setAttribute('dir', 'ltr');
        board.innerHTML = '';
        board.appendChild(svg);
      }
      if (editMode) {
        renderEditableDromosScale(svg, ivs, rootPc, draft, { posBase, stringMode, span, onDraftChange: () => render() });
        path = draft;
      } else {
        path = renderDromosScale(svg, ivs, rootPc, { posBase, stringMode, dromosId });
      }
      if (badge) badge.hidden = !DromosOverrides.has(dromosId, rootPc, posBase, stringMode);
      if (onChange) onChange({ posBase, stringMode, rootPc, path, svg });
    }

    wrap.appendChild(bar);
    wrap.appendChild(board);
    container.appendChild(wrap);
    render();
    return {
      getState: () => ({ posBase, stringMode, rootPc, path }),
      getSvg: () => board.querySelector('svg'),
      render,
    };
  }

  /** בורר פוזיציה + מיתרים בלבד (ללא לוח) */
  function mountPosControls(container, opts = {}) {
    if (!container) return null;
    let posBase = opts.posBase ?? 0;
    let stringMode = opts.stringMode ?? 4;
    const rootPc = opts.rootPc ?? 2;
    const ivs = opts.intervals || null;
    const onChange = typeof opts.onChange === 'function' ? opts.onChange : null;
    container.innerHTML = '';
    const bar = document.createElement('div');
    bar.className = 'fs-pos-bar';
    bar.innerHTML = '<span class="fs-pos-label">פוזיציה:</span>';
    const bases = opts.bases || MELODY_BASES.filter(b => b <= 9);
    const span = opts.span ?? MELODY_POS_SPAN;
    const fire = () => { if (onChange) onChange({ posBase, stringMode }); };
    bases.forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn secondary fs-pos-chip' + (b === posBase ? ' active' : '');
      btn.textContent = b === 0 ? 'פתוח' : String(b);
      btn.dataset.base = String(b);
      btn.addEventListener('click', () => {
        posBase = b;
        bar.querySelectorAll('.fs-pos-chip[data-base]').forEach(x => {
          x.classList.toggle('active', Number(x.dataset.base) === b);
        });
        fire();
      });
      bar.appendChild(btn);
    });
    const strLbl = document.createElement('span');
    strLbl.className = 'fs-pos-label';
    strLbl.style.marginInlineStart = '12px';
    strLbl.textContent = 'מיתרים:';
    bar.appendChild(strLbl);
    [1, 2, 3, 4].forEach(n => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn secondary fs-pos-chip fs-str-chip' + (n === stringMode ? ' active' : '');
      btn.textContent = String(n);
      btn.dataset.str = String(n);
      btn.addEventListener('click', () => {
        stringMode = n;
        if (ivs?.length) {
          posBase = findBestPositionForStringMode(ivs, rootPc, n, bases, span);
          bar.querySelectorAll('.fs-pos-chip[data-base]').forEach(x => {
            x.classList.toggle('active', Number(x.dataset.base) === posBase);
          });
        }
        bar.querySelectorAll('.fs-str-chip').forEach(x => {
          x.classList.toggle('active', Number(x.dataset.str) === n);
        });
        fire();
      });
      bar.appendChild(btn);
    });
    container.appendChild(bar);
    return { getState: () => ({ posBase, stringMode }) };
  }

  function mountWithPositions(container, opts = {}) {
    if (!container) return null;
    if (opts.intervals?.length || opts.frets?.length) {
      return mountDromosScalePanel(container, opts)?.getSvg() ?? null;
    }
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
    MELODY_COURSES,
    pcsFromDFrets,
    pcsFromIntervals,
    allPositions,
    buildBoxPath,
    buildScaleDegreePath,
    scalePlaySequence,
    fretsOnDToIntervals,
    renderDromosScale,
    renderEditableDromosScale,
    editDotTap,
    mountDromosScalePanel,
    mountPosControls,
    coursesForStringMode,
    SCALE_STRING_MODES,
    nextPositionBase,
    findBestPositionForStringMode,
    buildDPath,
    makeState,
    mount,
    mountWithPositions,
    drawPathOverlay,
    drawMelodyConnections,
    remapMelody,
    findBestBase,
    findBestGreekBase,
    computeGreekPath,
    fingerForFret,
    transitionCostGreek,
    coursesForMode,
    splitPhrases,
    normalizeMelody,
    pickPlacement,
    placementsForMidi,
    allCandidatesForNote,
    noteMidi,
    fretFromMidi,
    midiFromFret,
    legalBasesForFret,
    openStringMap,
    inPositionBox,
    shiftCost,
    mountMelody,
    mountMelodyLesson,
    flashMidi,
  };
})();
