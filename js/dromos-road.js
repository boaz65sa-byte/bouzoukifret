/* ============================================================
   DromosRoad — "הכביש" המשותף של דרומוס / מקאם
   מסלול מעשי מהשורש עד השורש (אוקטבה), פרוס על 2 / 3 / 4 מיתרים
   (פוזיציות כמו בגיטרה), עם רצועת תחנות ונגינה.
   שימוש אחיד בכל המסכים:  DromosRoad.renderInto(el, { intervals, rootPc, nameHe })
   נשען על AudioEngine + הגלובלים TUNING / NOTE_NAMES / SOLFEGE.
   ============================================================ */
'use strict';

const DromosRoad = (() => {
  const NECK_FRETS = 12;
  // מיתרים פעילים לכל מצב (מהנמוך לגבוה בגובה): 2=A,D · 3=F,A,D · 4=C,F,A,D
  const MODE_COURSES = { '2': [1, 0], '3': [2, 1, 0], '4': [3, 2, 1, 0] };
  const MODE_LABEL = { '2': '🎻 2 מיתרים', '3': '🪕 3 מיתרים', '4': '🎸 4 מיתרים' };

  function ensureAudio() { try { if (typeof AudioEngine !== 'undefined') AudioEngine.ensureCtx(); } catch (_) {} }

  // בונה את הכביש: מהשורש עד השורש (אוקטבה), נשארים על מיתר עד מיצוי חלון היד ואז עולים.
  function buildRoad(intervals, rootPc, mode, base) {
    base = base || 0;
    const courses = MODE_COURSES[mode] || MODE_COURSES['4'];
    const span = mode === '4' ? 3 : mode === '3' ? 5 : 7;
    const open0 = TUNING[courses[0]].midi;
    const upToRoot = (((rootPc - ((open0 + base) % 12)) % 12) + 12) % 12;
    const startMidi = open0 + base + upToRoot;
    const degrees = (intervals || []).slice().concat([12]);
    const road = [];
    let ciIdx = 0;
    let windowStart = base + upToRoot;
    let prevMidi = -Infinity;
    degrees.forEach((iv, i) => {
      const target = startMidi + iv;
      if (target <= prevMidi) return;
      while (ciIdx < courses.length) {
        const f = target - TUNING[courses[ciIdx]].midi;
        if (f >= 0 && f <= NECK_FRETS && f <= windowStart + span) {
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

  function noteLabel(midi) {
    const pc = ((midi % 12) + 12) % 12;
    return (typeof SOLFEGE !== 'undefined' && SOLFEGE[NOTE_NAMES[pc]]) || NOTE_NAMES[pc];
  }

  // נגן את הכביש (עולה, או הלוך-חזור), מדגיש כל תחנה
  function playRoad(road, stripEl, btn, roundTrip) {
    stopRoad(stripEl);
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
      const p = seq[i % seq.length];
      if (AudioEngine.pluckCourse) AudioEngine.pluckCourse(p.ci, p.fret, 0, 0.6);
      // אינדקס התחנה המקורית להדגשה (גם בירידה של הלוך-חזור)
      const roadIdx = i < n ? i : (2 * n - 2 - i);
      const hi = stops[roadIdx];
      if (hi) hi.classList.add('tl-road-playing');
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

  function stopRoad(stripEl, btn) {
    if (stripEl && stripEl._roadTimer) { clearInterval(stripEl._roadTimer); stripEl._roadTimer = null; }
    if (stripEl) stripEl.querySelectorAll('.tl-road-playing').forEach(s => s.classList.remove('tl-road-playing'));
    if (btn && btn.dataset.was) { btn.textContent = btn.dataset.was; btn.classList.remove('playing'); }
  }

  // בונה את רצועת התחנות עבור מצב נתון
  function buildStrip(intervals, rootPc, mode, nameHe) {
    const road = buildRoad(intervals, rootPc, mode, 0);
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

  /**
   * מרנדר את כל ה"כביש" לתוך אלמנט: כותרת + מתג 2/3/4 + רצועת תחנות + נגינה.
   * @param {HTMLElement} container
   * @param {{intervals:number[], rootPc:number, nameHe?:string, defaultMode?:string}} opts
   */
  function renderInto(container, opts) {
    if (!container || !opts || !Array.isArray(opts.intervals)) return;
    const rootPc = ((opts.rootPc % 12) + 12) % 12;
    let mode = opts.defaultMode || '4';
    container.innerHTML = '';
    container.classList.add('dr-road-host');

    const head = document.createElement('div');
    head.className = 'tl-road-head';
    head.innerHTML = `🛣️ הכביש של <b>${opts.nameHe || 'הדרומוס'}</b> — מהשורש ועד השורש, תחנה אחר תחנה. בחרו על כמה מיתרים:`;
    container.appendChild(head);

    const modeRow = document.createElement('div');
    modeRow.className = 'tl-pos-row tl-mode-row dr-road-modes';
    ['2', '3', '4'].forEach(m => {
      const b = document.createElement('button');
      b.className = 'tl-pos-chip tl-mode-chip' + (m === mode ? ' active' : '');
      b.textContent = MODE_LABEL[m];
      b.addEventListener('click', () => { mode = m; rebuild(); });
      modeRow.appendChild(b);
    });
    container.appendChild(modeRow);

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
    function rebuild() {
      modeRow.querySelectorAll('.tl-mode-chip').forEach(c =>
        c.classList.toggle('active', c.textContent === MODE_LABEL[mode]));
      if (strip) stopRoad(strip);
      strip = buildStrip(opts.intervals, rootPc, mode, opts.nameHe);
      stripHost.innerHTML = '';
      stripHost.appendChild(strip);
    }
    bUp.addEventListener('click', () => {
      if (strip && strip._roadTimer) { stopRoad(strip, bUp); return; }
      playRoad(strip._road, strip, bUp, false);
    });
    bRt.addEventListener('click', () => {
      if (strip && strip._roadTimer) { stopRoad(strip, bRt); return; }
      playRoad(strip._road, strip, bRt, true);
    });
    rebuild();
  }

  return { renderInto, buildRoad, buildStrip };
})();
