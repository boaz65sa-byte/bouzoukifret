/* ============================================================
   DromosRoad — "הכביש" המשותף של דרומוס / מקאם
   מסלול מעשי מהשורש עד השורש (אוקטבה), פרוס על 2 / 3 / 4 מיתרים
   (פוזיציות כמו בגיטרה), עם רצועת תחנות ונגינה.
   שימוש אחיד בכל המסכים:  DromosRoad.renderInto(el, { intervals, rootPc, nameHe })
   נשען על AudioEngine + הגלובלים TUNING / NOTE_NAMES / SOLFEGE.
   ============================================================ */
'use strict';

const DromosRoad = (() => {
  const NECK_FRETS = (typeof NUM_FRETS !== 'undefined') ? NUM_FRETS : 15;
  // מיתרים פעילים לכל מצב (מהנמוך לגבוה בגובה): 2=A,D · 3=F,A,D · 4=C,F,A,D
  const MODE_COURSES = { '2': [1, 0], '3': [2, 1, 0], '4': [3, 2, 1, 0] };
  const MODE_LABEL = { '2': '🎻 2 מיתרים', '3': '🪕 3 מיתרים', '4': '🎸 4 מיתרים' };

  function ensureAudio() { try { if (typeof AudioEngine !== 'undefined') AudioEngine.ensureCtx(); } catch (_) {} }

  // השורש הנמוך ביותר על המיתר הנמוך הפעיל
  function lowestRootMidi(courses, rootPc) {
    const open0 = TUNING[courses[0]].midi;
    return open0 + ((((rootPc - (open0 % 12)) % 12) + 12) % 12);
  }

  // בונה את הכביש: מהשורש עד השורש (אוקטבה), נשארים על מיתר עד מיצוי חלון היד ואז עולים.
  // pos = אינדקס פוזיציה (0 = נמוכה; 1,2 = אוקטבה גבוהה יותר במעלה הצוואר).
  function buildRoad(intervals, rootPc, mode, pos) {
    pos = pos || 0;
    const courses = MODE_COURSES[mode] || MODE_COURSES['4'];
    const span = mode === '4' ? 3 : mode === '3' ? 5 : 7;
    const open0 = TUNING[courses[0]].midi;
    const startMidi = lowestRootMidi(courses, rootPc) + pos * 12;
    const degrees = (intervals || []).slice().concat([12]);
    const road = [];
    let ciIdx = 0;
    let windowStart = startMidi - open0;   // הסריג של תחילת הכביש על המיתר הנמוך
    let prevMidi = -Infinity;
    degrees.forEach((iv, i) => {
      const target = startMidi + iv;
      if (target <= prevMidi) return;
      while (ciIdx < courses.length) {
        const f = target - TUNING[courses[ciIdx]].midi;
        const lastCourse = ciIdx === courses.length - 1;
        // על המיתר האחרון אין לאן לעלות — מותר עד סוף הגריף
        if (f >= 0 && f <= NECK_FRETS && (f <= windowStart + span || lastCourse)) {
          road.push({ ci: courses[ciIdx], fret: f, midi: target, degree: i + 1, isRoot: (target % 12) === rootPc });
          prevMidi = target;
          break;
        }
        ciIdx++;
        if (ciIdx < courses.length) windowStart = Math.max(0, target - TUNING[courses[ciIdx]].midi);
      }
    });
    return road;
  }

  // אילו פוזיציות שלמות אפשריות (כל הדרגות נכנסות בתחום הגריף)
  function availablePositions(intervals, rootPc, mode) {
    const full = (intervals || []).length + 1;
    const out = [];
    for (let pos = 0; pos < 3; pos++) {
      if (buildRoad(intervals, rootPc, mode, pos).length >= full) out.push(pos);
    }
    return out.length ? out : [0];
  }

  function noteLabel(midi) {
    const pc = ((midi % 12) + 12) % 12;
    return (typeof SOLFEGE !== 'undefined' && SOLFEGE[NOTE_NAMES[pc]]) || NOTE_NAMES[pc];
  }

  // נגן את הכביש (עולה, או הלוך-חזור), מדגיש כל תחנה גם ברצועה וגם על הגריף
  function playRoad(road, stripEl, btn, roundTrip, fbSvg) {
    stopRoad(stripEl, null, fbSvg);
    ensureAudio();
    const seq = roundTrip ? road.concat(road.slice(0, -1).reverse()) : road.slice();
    if (!seq.length) return;
    const stops = stripEl.querySelectorAll('.tl-road-stop');
    let i = 0;
    const stepMs = 460;
    if (btn) { btn.dataset.was = btn.textContent; btn.textContent = '■ עצור'; btn.classList.add('playing'); }
    const n = road.length;
    const tick = () => {
      stops.forEach(s => s.classList.remove('tl-road-playing'));
      if (fbSvg) fbSvg.querySelectorAll('.dr-road-play').forEach(d => d.classList.remove('dr-road-play'));
      const p = seq[i % seq.length];
      if (AudioEngine.pluckCourse) AudioEngine.pluckCourse(p.ci, p.fret, 0, 0.6);
      // אינדקס התחנה המקורית להדגשה (גם בירידה של הלוך-חזור)
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
    if (typeof registerLoop === 'function') registerLoop();
  }

  function stopRoad(stripEl, btn, fbSvg) {
    if (fbSvg) fbSvg.querySelectorAll('.dr-road-play').forEach(d => d.classList.remove('dr-road-play'));
    if (stripEl && stripEl._roadTimer) { clearInterval(stripEl._roadTimer); stripEl._roadTimer = null; }
    if (stripEl) stripEl.querySelectorAll('.tl-road-playing').forEach(s => s.classList.remove('tl-road-playing'));
    if (btn && btn.dataset.was) { btn.textContent = btn.dataset.was; btn.classList.remove('playing'); }
  }

  // בונה את רצועת התחנות עבור מצב נתון
  function buildStrip(intervals, rootPc, mode, nameHe) {
    return buildStripFromRoad(buildRoad(intervals, rootPc, mode, 0), nameHe);
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
      stop.innerHTML =
        (flag ? `<span class="tl-road-flag">${flag}</span>` : `<span class="tl-road-num">${idx + 1}</span>`) +
        `<span class="tl-road-note">${noteLabel(p.midi)}</span>` +
        `<span class="tl-road-pos">מיתר ${strNo} (${strNote}) · ${p.fret === 0 ? 'פתוח' : 'סריג ' + p.fret}</span>`;
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

  // מצייר את הכביש על הפרטבורד: קו מקווקו + מספרים, מדגיש את נקודות הכביש ומעמעם את השאר
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

  /**
   * מרנדר את כל ה"כביש" לתוך אלמנט: כותרת + מתג 2/3/4 + רצועת תחנות + נגינה.
   * @param {HTMLElement} container
   * @param {{intervals:number[], rootPc:number, nameHe?:string, defaultMode?:string, fretboard?:SVGElement}} opts
   */
  function renderInto(container, opts) {
    if (!container || !opts || !Array.isArray(opts.intervals)) return;
    let rootPc = ((opts.rootPc % 12) + 12) % 12;
    let mode = opts.defaultMode || '4';
    let posIndex = 0;
    container.innerHTML = '';
    container.classList.add('dr-road-host');

    const head = document.createElement('div');
    head.className = 'tl-road-head';
    head.innerHTML = `🛣️ הכביש של <b>${opts.nameHe || 'הדרומוס'}</b> — מהשורש ועד השורש, תחנה אחר תחנה.`;
    container.appendChild(head);

    // בורר שורש: מאיזה תו הכביש יוצא ואליו חוזר (רה→רה, מי→מי, …)
    const rootRow = document.createElement('div');
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

    const modeRow = document.createElement('div');
    modeRow.className = 'tl-pos-row tl-mode-row dr-road-modes';
    ['2', '3', '4'].forEach(m => {
      const b = document.createElement('button');
      b.className = 'tl-pos-chip tl-mode-chip' + (m === mode ? ' active' : '');
      b.textContent = MODE_LABEL[m];
      b.addEventListener('click', () => { mode = m; refreshPositions(); });
      modeRow.appendChild(b);
    });
    container.appendChild(modeRow);

    // בורר פוזיציה: אותו מודוס במקומות שונים על הצוואר (נמוכה / אמצעית / גבוהה)
    const POS_LABEL = ['פוזיציה 1 (נמוכה)', 'פוזיציה 2', 'פוזיציה 3 (גבוהה)'];
    const posRow = document.createElement('div');
    posRow.className = 'tl-pos-row dr-road-positions';
    container.appendChild(posRow);

    const stripHost = document.createElement('div');
    container.appendChild(stripHost);

    const btns = document.createElement('div');
    btns.className = 'tl-chord-btns dr-road-btns';
    const bUp = document.createElement('button');
    bUp.className = 'btn small tl-btn';
    bUp.textContent = '▶ נגן את הכביש';
    const bRt = document.createElement('button');
    bRt.className = 'btn small tl-btn';
    bRt.textContent = '🔁 הלוך-חזור';
    btns.appendChild(bUp); btns.appendChild(bRt);
    container.appendChild(btns);

    let strip = null;

    // בונה מחדש את כפתורי הפוזיציות לפי המצב/שורש הנוכחיים, ואז מרנדר
    function refreshPositions() {
      modeRow.querySelectorAll('.tl-mode-chip').forEach(c =>
        c.classList.toggle('active', c.textContent === MODE_LABEL[mode]));
      const avail = availablePositions(opts.intervals, rootPc, mode);
      if (!avail.includes(posIndex)) posIndex = avail[0];
      posRow.innerHTML = '';
      if (avail.length > 1) {
        const lbl = document.createElement('span');
        lbl.className = 'tl-pos-label';
        lbl.textContent = 'פוזיציה:';
        posRow.appendChild(lbl);
        avail.forEach(p => {
          const b = document.createElement('button');
          b.className = 'tl-pos-chip dr-pos-chip' + (p === posIndex ? ' active' : '');
          b.textContent = POS_LABEL[p] || ('פוזיציה ' + (p + 1));
          b.addEventListener('click', () => { posIndex = p; rebuild(); });
          posRow.appendChild(b);
        });
      }
      rebuild();
    }

    function rebuild() {
      posRow.querySelectorAll('.dr-pos-chip').forEach((c, i) => {
        const avail = availablePositions(opts.intervals, rootPc, mode);
        c.classList.toggle('active', avail[i] === posIndex);
      });
      if (strip) stopRoad(strip, null, opts.fretboard);
      const road = buildRoad(opts.intervals, rootPc, mode, posIndex);
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
    refreshPositions();
  }

  return { renderInto, buildRoad, buildStrip };
})();
