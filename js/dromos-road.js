/* ============================================================
   DromosRoad — "הכביש" המשותף של דרומוס / מקאם
   מסלול מעשי מהשורש עד השורש (אוקטבה), פרוס על 1–4 מיתרים
   בפוזיציה גיטרתית (תיבת 4 סריגים + טרנספוזיציה).
   שימוש: DromosRoad.renderInto(el, { intervals, rootPc, nameHe })
   ============================================================ */
'use strict';

const DromosRoad = (() => {
  const MODE_LABEL = {
    1: '🎵 מיתר D',
    2: '🎻 2 מיתרים',
    3: '🪕 3 מיתרים',
    4: '🎸 4 מיתרים',
  };

  /** מסלולים עם טיימר השמעה פעיל — כדי לעצור את כולם במעבר מסך (גם אם ה-DOM שלהם כבר הוסר) */
  const activeStrips = new Set();

  function ensureAudio() { try { if (typeof AudioEngine !== 'undefined') AudioEngine.ensureCtx(); } catch (_) {} }

  function span() {
    return (typeof FretboardScale !== 'undefined' && FretboardScale.MELODY_POS_SPAN) || 4;
  }

  function positionBases() {
    return (typeof FretboardScale !== 'undefined' && FretboardScale.MELODY_BASES) || [0, 2, 3, 5, 7, 9];
  }

  /** סריגי מיתר D (מ-פתוח) → מרווחי סולם יחסיים */
  function fretsOnDToIntervals(frets) {
    if (!Array.isArray(frets) || !frets.length) return [];
    const list = frets[frets.length - 1] === 12 && frets.length > 1 ? frets.slice(0, -1) : [...frets];
    const rootFret = list[0] || 0;
    return list.map(f => ((f - rootFret) % 12 + 12) % 12);
  }

  function normalizeIntervals(opts) {
    if (Array.isArray(opts.intervals) && opts.intervals.length) return opts.intervals;
    if (Array.isArray(opts.frets) && opts.frets.length) return fretsOnDToIntervals(opts.frets);
    return [];
  }

  function buildRoad(intervals, rootPc, stringMode, startBase, dromosId) {
    const ivs = intervals || [];
    const sm = Number(stringMode) || 4;
    const base = startBase ?? 0;
    if (typeof FretboardScale !== 'undefined' && FretboardScale.buildScaleDegreePath) {
      const road = FretboardScale.buildScaleDegreePath(ivs, rootPc, base, span(), sm, dromosId);
      const rpc = ((rootPc % 12) + 12) % 12;
      return road.map(p => ({
        ...p,
        isRoot: (p.midi % 12) === rpc,
      }));
    }
    return [];
  }

  function availablePositionBases(intervals, rootPc, stringMode, dromosId) {
    const need = (intervals || []).length + 1;
    const sm = Number(stringMode) || 4;
    const good = positionBases().filter(b => {
      if (dromosId && typeof DromosOverrides !== 'undefined' && DromosOverrides.has(dromosId, rootPc, b, sm)) return true;
      return buildRoad(intervals, rootPc, sm, b).length >= need;
    });
    return good.length ? good : [0];
  }

  function noteLabel(midi) {
    const pc = ((midi % 12) + 12) % 12;
    return (typeof SOLFEGE !== 'undefined' && SOLFEGE[NOTE_NAMES[pc]]) || NOTE_NAMES[pc];
  }

  function playRoad(road, stripEl, btn, roundTrip, fbSvg) {
    stopRoad(stripEl, null, fbSvg);
    ensureAudio();
    const seq = roundTrip
      ? (typeof FretboardScale !== 'undefined' && FretboardScale.scalePlaySequence
        ? FretboardScale.scalePlaySequence(road, true)
        : road.concat(road.slice(0, -1).reverse()))
      : road.slice();
    if (!seq.length) return;
    const stops = stripEl.querySelectorAll('.tl-road-stop');
    let i = 0;
    const stepMs = typeof PlaybackSpeed !== 'undefined' ? PlaybackSpeed.scaleGap(460) : 460;
    if (btn) { btn.dataset.was = btn.textContent; btn.textContent = '■ עצור'; btn.classList.add('playing'); }
    const n = road.length;
    const tick = () => {
      stops.forEach(s => s.classList.remove('tl-road-playing'));
      if (fbSvg) fbSvg.querySelectorAll('.dr-road-play').forEach(d => d.classList.remove('dr-road-play'));
      const p = seq[i % seq.length];
      if (AudioEngine.pluckCourse) AudioEngine.pluckCourse(p.ci, p.fret, 0, 0.6);
      const roadIdx = i < n ? i : (2 * n - 2 - i);
      const hi = stops[roadIdx];
      if (hi) hi.classList.add('tl-road-playing');
      if (fbSvg) {
        const dot = fbSvg.querySelector(`.note-dot[data-course="${p.ci}"][data-fret="${p.fret}"]`);
        if (dot) dot.classList.add('dr-road-play');
      }
      i++;
      if (i >= seq.length) {
        clearInterval(stripEl._roadTimer); stripEl._roadTimer = null;
        setTimeout(() => stopRoad(stripEl, btn), stepMs);
      }
    };
    tick();
    stripEl._roadTimer = setInterval(tick, stepMs);
    stripEl._roadFbSvg = fbSvg || null;
    activeStrips.add(stripEl);
    if (typeof registerLoop === 'function') registerLoop();
  }

  function stopRoad(stripEl, btn, fbSvg) {
    if (fbSvg) fbSvg.querySelectorAll('.dr-road-play').forEach(d => d.classList.remove('dr-road-play'));
    if (stripEl && stripEl._roadTimer) { clearInterval(stripEl._roadTimer); stripEl._roadTimer = null; }
    if (stripEl) stripEl.querySelectorAll('.tl-road-playing').forEach(s => s.classList.remove('tl-road-playing'));
    if (btn && btn.dataset.was) { btn.textContent = btn.dataset.was; btn.classList.remove('playing'); }
    activeStrips.delete(stripEl);
  }

  /** עוצר כל "כביש" שמתנגן כרגע, בכל מסך שהוא — נקרא מ-stopAllPlayback() במעבר מסך */
  function stop() {
    activeStrips.forEach(el => stopRoad(el, null, el._roadFbSvg));
    activeStrips.clear();
  }

  function buildStripFromRoad(road, nameHe) {
    const strip = document.createElement('div');
    strip.className = 'tl-road dr-road-strip';
    const track = document.createElement('div');
    track.className = 'tl-road-track';
    road.forEach((p, idx) => {
      const stop = document.createElement('button');
      stop.className = 'tl-road-stop' + (p.isRoot ? ' tl-road-root' : '');
      const strNote = TUNING[p.ci].note;
      const strNo = TUNING[p.ci].course;
      const flag = idx === 0 ? '🏁 התחלה' : (idx === road.length - 1 ? '🏁 סוף' : '');
      const finger = p.finger > 0 ? ` · אצבע ${p.finger}` : '';
      stop.innerHTML =
        (flag ? `<span class="tl-road-flag">${flag}</span>` : `<span class="tl-road-num">${p.degree || idx + 1}</span>`) +
        `<span class="tl-road-note">${noteLabel(p.midi)}</span>` +
        `<span class="tl-road-pos">מיתר ${strNo} (${strNote}) · ${p.fret === 0 ? 'פתוח' : 'סריג ' + p.fret}${finger}</span>`;
      stop.addEventListener('click', () => {
        ensureAudio();
        if (AudioEngine.pluckCourse) AudioEngine.pluckCourse(p.ci, p.fret, 0, 0.6);
        stop.classList.add('tl-road-playing');
        setTimeout(() => stop.classList.remove('tl-road-playing'), 260);
      });
      track.appendChild(stop);
      if (idx < road.length - 1) {
        const arr = document.createElement('span');
        arr.className = 'tl-road-arrow';
        arr.textContent = '←';
        track.appendChild(arr);
      }
    });
    strip.appendChild(track);
    strip._road = road;
    return strip;
  }

  function drawOnFretboard(svg, road) {
    if (!svg || !road || !road.length) return;
    const inRoad = new Set(road.map(p => p.ci + '-' + p.fret));
    svg.querySelectorAll('.note-dot').forEach(dot => {
      const key = dot.getAttribute('data-course') + '-' + dot.getAttribute('data-fret');
      dot.classList.toggle('dr-road-on', inRoad.has(key));
      dot.classList.toggle('dr-road-off', !inRoad.has(key));
    });
    if (typeof FretboardScale !== 'undefined' && FretboardScale.drawPathOverlay) {
      FretboardScale.drawPathOverlay(svg, road, '#f0cc74');
    }
  }

  function posBaseLabel(b) {
    return b === 0 ? 'פתוח' : String(b);
  }

  /**
   * @param {HTMLElement} container
   * @param {{intervals?:number[], frets?:number[], rootPc:number, nameHe?:string,
   *          defaultMode?:number|string, posBase?:number, stringMode?:number,
   *          embedded?:boolean, fretboard?:SVGElement}} opts
   */
  function renderInto(container, opts) {
    if (!container || !opts) return;
    const intervals = normalizeIntervals(opts);
    if (!intervals.length) return;

    let rootPc = ((opts.rootPc % 12) + 12) % 12;
    let stringMode = Number(opts.stringMode ?? opts.defaultMode ?? 4) || 4;
    let posBase = opts.posBase ?? 0;
    const embedded = !!opts.embedded;
    const dromosId = opts.dromosId || null;

    container.innerHTML = '';
    container.classList.add('dr-road-host');

    const head = document.createElement('div');
    head.className = 'tl-road-head';
    head.innerHTML = embedded
      ? `🛣️ <b>הכביש</b> — מסלול מעשי לפי הפוזיציה והמיתרים שבחרתם.`
      : `🛣️ הכביש של <b>${opts.nameHe || 'הדרומוס'}</b> — מהשורש ועד השורש, תחנה אחר תחנה.`;
    container.appendChild(head);

    let rootRow; let modeRow; let posRow;
    if (!embedded) {
      rootRow = document.createElement('div');
      rootRow.className = 'tl-pos-row dr-road-roots';
      const rootLbl = document.createElement('span');
      rootLbl.className = 'tl-pos-label';
      rootLbl.textContent = 'שורש (מ-/ל-):';
      rootRow.appendChild(rootLbl);
      const rootSel = document.createElement('select');
      rootSel.className = 'dr-root-select';
      for (let pc = 0; pc < 12; pc++) {
        const o = document.createElement('option');
        o.value = pc;
        const sf = (typeof SOLFEGE !== 'undefined' && SOLFEGE[NOTE_NAMES[pc]]) || NOTE_NAMES[pc];
        o.textContent = `${sf} (${NOTE_NAMES[pc]})`;
        if (pc === rootPc) o.selected = true;
        rootSel.appendChild(o);
      }
      rootSel.addEventListener('change', () => { rootPc = parseInt(rootSel.value, 10); refreshPositions(); });
      rootRow.appendChild(rootSel);
      container.appendChild(rootRow);

      modeRow = document.createElement('div');
      modeRow.className = 'tl-pos-row tl-mode-row dr-road-modes';
      [1, 2, 3, 4].forEach(m => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'tl-pos-chip tl-mode-chip' + (m === stringMode ? ' active' : '');
        b.textContent = MODE_LABEL[m];
        b.dataset.mode = String(m);
        b.addEventListener('click', () => { stringMode = m; refreshPositions(); });
        modeRow.appendChild(b);
      });
      container.appendChild(modeRow);

      posRow = document.createElement('div');
      posRow.className = 'tl-pos-row dr-road-positions';
      container.appendChild(posRow);
    }

    const stripHost = document.createElement('div');
    container.appendChild(stripHost);

    const btns = document.createElement('div');
    btns.className = 'tl-chord-btns dr-road-btns';
    const bUp = document.createElement('button');
    bUp.type = 'button';
    bUp.className = 'btn small tl-btn';
    bUp.textContent = '▶ נגן את הכביש';
    const bRt = document.createElement('button');
    bRt.type = 'button';
    bRt.className = 'btn small tl-btn';
    bRt.textContent = '🔁 הלוך-חזור';
    btns.appendChild(bUp); btns.appendChild(bRt);
    container.appendChild(btns);

    if (typeof PlaybackSpeed !== 'undefined') {
      PlaybackSpeed.mountChips(container);
    }

    let strip = null;

    function refreshPositions() {
      if (!embedded && modeRow) {
        modeRow.querySelectorAll('.tl-mode-chip').forEach(c => {
          c.classList.toggle('active', Number(c.dataset.mode) === stringMode);
        });
      }
      const avail = availablePositionBases(intervals, rootPc, stringMode, dromosId);
      if (!avail.includes(posBase)) posBase = avail[0];

      if (!embedded && posRow) {
        posRow.innerHTML = '';
        const lbl = document.createElement('span');
        lbl.className = 'tl-pos-label';
        lbl.textContent = 'פוזיציה על הצוואר:';
        posRow.appendChild(lbl);
        avail.forEach(b => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tl-pos-chip dr-pos-chip' + (b === posBase ? ' active' : '');
          btn.textContent = posBaseLabel(b);
          btn.dataset.base = String(b);
          btn.addEventListener('click', () => { posBase = b; rebuild(); });
          posRow.appendChild(btn);
        });
        if (dromosId && typeof openDromoiForEdit === 'function' && typeof DromosOverrides !== 'undefined') {
          const editBtn = document.createElement('button');
          editBtn.type = 'button';
          editBtn.className = 'tl-pos-chip dr-edit-btn';
          editBtn.textContent = '✒️ ערוך';
          editBtn.title = 'עריכת פוזיציה/אצבוע במסך הדרומוסים';
          editBtn.addEventListener('click', () => {
            openDromoiForEdit({ dromosId, rootPc, posBase, stringMode });
          });
          posRow.appendChild(editBtn);
        }
      }
      rebuild();
    }

    function rebuild() {
      if (!embedded && posRow) {
        posRow.querySelectorAll('.dr-pos-chip').forEach(c => {
          c.classList.toggle('active', Number(c.dataset.base) === posBase);
        });
      }
      if (strip) stopRoad(strip, null, opts.fretboard);
      const road = buildRoad(intervals, rootPc, stringMode, posBase, dromosId);
      strip = buildStripFromRoad(road, opts.nameHe);
      stripHost.innerHTML = '';
      stripHost.appendChild(strip);
      drawOnFretboard(opts.fretboard, road);
    }

    bUp.addEventListener('click', () => {
      if (strip && strip._roadTimer) { stopRoad(strip, bUp, opts.fretboard); return; }
      playRoad(strip._road, strip, bUp, false, opts.fretboard);
    });
    bRt.addEventListener('click', () => {
      if (strip && strip._roadTimer) { stopRoad(strip, bRt, opts.fretboard); return; }
      playRoad(strip._road, strip, bRt, true, opts.fretboard);
    });

    if (embedded) {
      rebuild();
    } else {
      refreshPositions();
    }
  }

  return { renderInto, buildRoad, stop, buildStrip: (intervals, rootPc, mode, nameHe, dromosId) => {
    const sm = Number(mode) || 4;
    return buildStripFromRoad(buildRoad(intervals, rootPc, sm, 0, dromosId), nameHe);
  } };
})();
