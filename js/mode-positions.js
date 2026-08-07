/* ============================================================
   ModePositions — "פוזיציות המודוס": 7 פוזיציות קלאסיות לכל דרומוס,
   פוזיציה N מתחילה בדיוק על דרגה N (לא על סריג שרירותי), ורצות
   ברצף עולה על פני כל הצוואר. עובד גנרית על כל דרומוס/מודוס.
   ============================================================ */
'use strict';

const ModePositions = (() => {
  let svg = null;
  let positions = [];
  let selIdx = 0;
  let playTimer = null;

  function normPc(pc) {
    return ((pc % 12) + 12) % 12;
  }

  function ensureSvg(host) {
    let s = host.querySelector('svg.fretboard');
    if (!s) {
      s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.classList.add('fretboard', 'fs-neck-board');
      s.setAttribute('dir', 'ltr');
      host.innerHTML = '';
      host.appendChild(s);
    }
    return s;
  }

  function drawPositionBoard(intervals, rootPc, pos, stringMode) {
    if (!svg || typeof drawFretboard !== 'function' || !pos) return;
    const span = FretboardScale.MELODY_POS_SPAN;
    const pcsSet = new Set(intervals.map(iv => normPc(rootPc + iv)));
    const activeCourses = new Set(FretboardScale.coursesForStringMode(stringMode));
    const pathMap = new Map(pos.path.map(p => [`${p.ci}-${p.fret}`, p]));

    svg.querySelectorAll('.fs-scale-path, .fs-path-label').forEach(el => el.remove());
    drawFretboard(svg, (ci, f, midi) => {
      if (!activeCourses.has(ci)) return null;
      const pc = normPc(midi);
      if (!pcsSet.has(pc)) return null;
      const onPath = pathMap.get(`${ci}-${f}`);
      if (onPath) {
        const label = onPath.finger > 0 ? `${onPath.degree}·${onPath.finger}` : String(onPath.degree);
        return { type: onPath.degree === 1 ? 'root' : 'note', label };
      }
      if (f < pos.posBase || f > pos.posBase + span) return null;
      return { type: 'note', label: NOTE_NAMES[pc] };
    });
    if (pos.path.length) FretboardScale.drawPathOverlay(svg, pos.path, '#f0cc74');
  }

  function stopPlayback() {
    if (playTimer) { clearTimeout(playTimer); playTimer = null; }
  }

  function playPosition(pos) {
    stopPlayback();
    if (typeof AudioEngine === 'undefined' || !AudioEngine.pluckCourse || !pos?.path?.length) return;
    AudioEngine.ensureCtx();
    const seq = FretboardScale.scalePlaySequence(pos.path, true);
    let i = 0;
    function step() {
      const n = seq[i];
      AudioEngine.pluckCourse(n.ci, n.fret, 0, 0.55);
      if (svg && FretboardScale.flashMidi) FretboardScale.flashMidi(svg, n.midi);
      i++;
      if (i < seq.length) playTimer = setTimeout(step, 260);
      else playTimer = null;
    }
    step();
  }

  function renderPositionChips(host, onSelect) {
    const bar = host.querySelector('#mp-pos-chips');
    bar.innerHTML = positions.map((p, i) => `
      <button type="button" class="btn secondary fs-pos-chip${i === selIdx ? ' active' : ''}" data-i="${i}">
        פוזיציה ${p.position} · דרגה ${p.degree}
      </button>`).join('');
    bar.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
      selIdx = parseInt(b.dataset.i, 10);
      onSelect();
    }));
  }

  function renderNoteList(host, pos) {
    const list = host.querySelector('#mp-note-list');
    if (!pos?.path?.length) { list.innerHTML = '<p class="hint">—</p>'; return; }
    const labels = ['D', 'A', 'F', 'C'];
    list.innerHTML = pos.path.map((n, i) =>
      `<span style="display:inline-block;padding:3px 8px;margin:2px;border-radius:6px;background:var(--card-bg,#2a2a2a);">${i + 1}. ${labels[n.ci]}·${n.fret} (דרגה ${n.degree})</span>`
    ).join('');
  }

  function rebuild(host) {
    stopPlayback();
    const dromosId = host.querySelector('#mp-dromos').value;
    const rootPc = parseInt(host.querySelector('#mp-root').value, 10);
    const stringMode = parseInt(host.querySelector('.mp-str-chip.active')?.dataset.str || '4', 10);
    const d = DROMOI.find(x => x.id === dromosId) || DROMOI[0];

    positions = FretboardScale.buildAllDegreePositions(d.intervals, rootPc, stringMode, FretboardScale.MELODY_POS_SPAN);
    if (selIdx >= positions.length) selIdx = 0;

    const render = () => {
      renderPositionChips(host, render);
      const pos = positions[selIdx];
      drawPositionBoard(d.intervals, rootPc, pos, stringMode);
      renderNoteList(host, pos);
    };
    render();
  }

  function init() {
    const host = document.getElementById('mode-positions-app');
    if (!host) return;

    host.innerHTML = `
      <div class="duet-controls" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;align-items:flex-end;">
        <label>דרומוס:
          <select id="mp-dromos" class="ctrl-select">${DROMOI.map(d => `<option value="${d.id}">${d.nameHe}</option>`).join('')}</select>
        </label>
        <label>שורש:
          <select id="mp-root" class="ctrl-select">${NOTE_NAMES.map((n, i) => `<option value="${i}"${i === 2 ? ' selected' : ''}>${n} (${SOLFEGE[n]})</option>`).join('')}</select>
        </label>
        <span>מיתרים:
          <button type="button" class="btn secondary fs-pos-chip mp-str-chip" data-str="1">1</button>
          <button type="button" class="btn secondary fs-pos-chip mp-str-chip" data-str="2">2</button>
          <button type="button" class="btn secondary fs-pos-chip mp-str-chip" data-str="3">3</button>
          <button type="button" class="btn secondary fs-pos-chip mp-str-chip active" data-str="4">4</button>
        </span>
      </div>
      <p class="lead" style="margin-bottom:10px;">פוזיציה 1 מתחילה בדיוק על הדרגה הראשונה (השורש), פוזיציה 2 על הדרגה השנייה, וכן הלאה — כל הפוזיציות ברצף עולה על פני כל הצוואר.</p>
      <div id="mp-pos-chips" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;"></div>
      <div class="duet-play-controls" style="display:flex;gap:8px;margin-bottom:16px;">
        <button type="button" id="mp-play" class="btn gold">▶ נגן פוזיציה (עולה־יורד)</button>
        <button type="button" id="mp-stop" class="btn secondary">⏹ עצור</button>
      </div>
      <div class="card">
        <div id="mp-board"></div>
        <div id="mp-note-list" class="duet-note-list"></div>
      </div>
    `;

    svg = ensureSvg(host.querySelector('#mp-board'));

    host.querySelector('#mp-dromos').addEventListener('change', () => { selIdx = 0; rebuild(host); });
    host.querySelector('#mp-root').addEventListener('change', () => { selIdx = 0; rebuild(host); });
    host.querySelectorAll('.mp-str-chip').forEach(b => b.addEventListener('click', () => {
      host.querySelectorAll('.mp-str-chip').forEach(x => x.classList.toggle('active', x === b));
      selIdx = 0;
      rebuild(host);
    }));
    host.querySelector('#mp-play').addEventListener('click', () => playPosition(positions[selIdx]));
    host.querySelector('#mp-stop').addEventListener('click', stopPlayback);

    rebuild(host);
  }

  return { init, stop: stopPlayback };
})();
