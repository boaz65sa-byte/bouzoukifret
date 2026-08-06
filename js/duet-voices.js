/* ============================================================
   DuetVoices — קול שני אוטומטי (הרמוניה דיאטונית) לדואט בוזוקי
   ============================================================ */
'use strict';

const DuetVoices = (() => {
  let voice1Panel = null;
  let voice2Svg = null;
  let lastV1Path = [];
  let lastV2Path = [];
  let playTimer = null;

  function normPc(pc) {
    return ((pc % 12) + 12) % 12;
  }

  /** מחשב את מסלול הקול השני: לכל תו בקול הראשון, degrees דרגות-סולם
   *  מעל/מתחת (shift), בתוך אותו סולם/דרומוס ואותה תיבת-פוזיציה בגריף.
   *  מחזיר מערך באורך זהה לקול הראשון — null במקום תו שלא נכנס לתיבה,
   *  כדי לשמור התאמה בין האינדקסים לנגינה משותפת. */
  function computeVoice2Path(voice1Path, intervals, stringMode, posBase, shift) {
    const n = intervals.length;
    if (!n) return [];
    const span = FretboardScale.MELODY_POS_SPAN;
    const courses = FretboardScale.coursesForStringMode(stringMode);
    let prevCi = null;

    return voice1Path.map(p => {
      const idx0 = p.degree - 1;
      const anchorMidi = p.midi - intervals[((idx0 % n) + n) % n] - 12 * Math.floor(idx0 / n);
      const newIdx0 = idx0 + shift;
      const octaves = Math.floor(newIdx0 / n);
      const degIdx = ((newIdx0 % n) + n) % n;
      const targetMidi = anchorMidi + intervals[degIdx] + octaves * 12;

      const candidates = courses
        .map(ci => ({ ci, fret: FretboardScale.fretFromMidi(ci, targetMidi) }))
        .filter(c => c.fret != null && c.fret >= posBase && c.fret <= posBase + span);
      if (!candidates.length) { prevCi = null; return null; }

      const pick = candidates.find(c => c.ci === p.ci) || candidates.slice().sort((a, b) => {
        const da = prevCi == null ? 0 : Math.abs(a.ci - prevCi);
        const db = prevCi == null ? 0 : Math.abs(b.ci - prevCi);
        return da - db || a.ci - b.ci;
      })[0];

      prevCi = pick.ci;
      return {
        ci: pick.ci,
        fret: pick.fret,
        midi: targetMidi,
        degree: degIdx + 1,
        positionBase: posBase,
        finger: FretboardScale.fingerForFret(pick.fret, posBase),
      };
    });
  }

  /** ציור לוח קריא-בלבד עבור הקול השני (בלי עריכה) */
  function drawVoice2(svg, intervals, rootPc, path, posBase, stringMode) {
    if (!svg || typeof drawFretboard !== 'function') return;
    const span = FretboardScale.MELODY_POS_SPAN;
    const pcsSet = new Set(intervals.map(iv => normPc(rootPc + iv)));
    const activeCourses = new Set(FretboardScale.coursesForStringMode(stringMode));
    const realPath = path.filter(Boolean);
    const pathMap = new Map(realPath.map(p => [`${p.ci}-${p.fret}`, p]));

    svg.querySelectorAll('.fs-scale-path, .fs-path-label').forEach(el => el.remove());
    drawFretboard(svg, (ci, f, midi) => {
      if (!activeCourses.has(ci)) return null;
      if (f < posBase || f > posBase + span) return null;
      const pc = normPc(midi);
      if (!pcsSet.has(pc)) return null;
      const onPath = pathMap.get(`${ci}-${f}`);
      if (onPath) {
        const label = onPath.finger > 0 ? `${onPath.degree}·${onPath.finger}` : String(onPath.degree);
        return { type: onPath.degree === 1 ? 'root' : 'note', label };
      }
      return { type: 'note', label: NOTE_NAMES[pc] };
    });
    if (realPath.length) FretboardScale.drawPathOverlay(svg, realPath, '#7fd1ff');
  }

  function stopPlayback() {
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
  }

  /** מנגן אחד או שני קולות בו-זמנית לפי אותם אינדקסי-זמן, עם הדגשה על הגריף */
  function playSequence(voicePaths, svgs, bpm = 96) {
    stopPlayback();
    if (typeof AudioEngine === 'undefined' || !AudioEngine.pluckCourse) return;
    AudioEngine.ensureCtx();
    const baseMs = Math.max(180, (60 / Math.max(40, bpm)) * 1000);
    const stepMs = typeof PlaybackSpeed !== 'undefined' ? PlaybackSpeed.scaleGap(baseMs) : baseMs;
    const len = Math.max(0, ...voicePaths.map(v => v.length));
    if (!len) return;
    let i = 0;
    const tick = () => {
      voicePaths.forEach((path, vi) => {
        const note = path[i];
        if (!note) return;
        AudioEngine.pluckCourse(note.ci, note.fret, 0, 0.55);
        if (svgs[vi] && FretboardScale.flashMidi) FretboardScale.flashMidi(svgs[vi], note.midi);
      });
      i++;
      if (i >= len) { clearInterval(playTimer); playTimer = null; }
    };
    tick();
    playTimer = setInterval(tick, stepMs);
  }

  function mountVoice1(container, board2, dromosId, rootPc, getDegrees, getDir) {
    stopPlayback();
    const d = DROMOI.find(x => x.id === dromosId) || DROMOI[0];

    let svg2 = board2.querySelector('svg.fretboard');
    if (!svg2) {
      svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg2.classList.add('fretboard', 'fs-neck-board');
      svg2.setAttribute('dir', 'ltr');
      board2.innerHTML = '';
      board2.appendChild(svg2);
    }
    voice2Svg = svg2;

    voice1Panel = FretboardScale.mountDromosScalePanel(container, {
      intervals: d.intervals,
      rootPc,
      dromosId: d.id,
      onChange({ posBase, stringMode, rootPc: rp, path }) {
        stopPlayback();
        const shift = getDegrees() * getDir();
        const v2 = computeVoice2Path(path, d.intervals, stringMode, posBase, shift);
        drawVoice2(svg2, d.intervals, rp, v2, posBase, stringMode);
        lastV1Path = path;
        lastV2Path = v2;
      },
    });
  }

  function init() {
    const host = document.getElementById('duet-voices-app');
    if (!host) return;

    host.innerHTML = `
      <div class="duet-controls" style="display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;align-items:flex-end;">
        <label>דרומוס:
          <select id="duet-dromos" class="ctrl-select">${DROMOI.map(d => `<option value="${d.id}">${d.nameHe}</option>`).join('')}</select>
        </label>
        <label>שורש:
          <select id="duet-root" class="ctrl-select">${NOTE_NAMES.map((n, i) => `<option value="${i}"${i === 2 ? ' selected' : ''}>${n} (${SOLFEGE[n]})</option>`).join('')}</select>
        </label>
        <label>מרחק הרמוני:
          <select id="duet-degrees" class="ctrl-select">
            <option value="2" selected>2 דרגות (טרצה)</option>
            <option value="3">3 דרגות (קוורטה)</option>
            <option value="4">4 דרגות (חמישית)</option>
            <option value="5">5 דרגות (סקסטה)</option>
            <option value="6">6 דרגות (שביעית)</option>
          </select>
        </label>
        <label>כיוון:
          <select id="duet-dir" class="ctrl-select">
            <option value="-1" selected>מתחת לקול הראשון</option>
            <option value="1">מעל הקול הראשון</option>
          </select>
        </label>
      </div>
      <p class="lead" style="margin-bottom:10px;">קבעו דרומוס, שורש, פוזיציה ומיתרים לקול הראשון — קול שני יחושב אוטומטית כהרמוניה דיאטונית באותה תיבת-פוזיציה, כדי שני נגני בוזוקי ינגנו יחד דו-קולית</p>
      <div class="duet-play-controls" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">
        <button type="button" id="duet-play-1" class="btn secondary">▶ נגן קול ראשון</button>
        <button type="button" id="duet-play-2" class="btn secondary">▶ נגן קול שני</button>
        <button type="button" id="duet-play-both" class="btn gold">▶▶ נגן ביחד</button>
        <button type="button" id="duet-stop" class="btn secondary">⏹ עצור</button>
      </div>
      <div class="card">
        <h3>🎵 קול ראשון</h3>
        <div id="duet-voice1-panel"></div>
      </div>
      <div class="card">
        <h3>🎵 קול שני (הרמוניה)</h3>
        <div id="duet-voice2-board"></div>
      </div>
    `;

    const dromosSel = host.querySelector('#duet-dromos');
    const rootSel = host.querySelector('#duet-root');
    const degSel = host.querySelector('#duet-degrees');
    const dirSel = host.querySelector('#duet-dir');
    const panel1Host = host.querySelector('#duet-voice1-panel');
    const board2 = host.querySelector('#duet-voice2-board');

    const getDegrees = () => parseInt(degSel.value, 10);
    const getDir = () => parseInt(dirSel.value, 10);

    function rebuild() {
      mountVoice1(panel1Host, board2, dromosSel.value, parseInt(rootSel.value, 10), getDegrees, getDir);
    }

    dromosSel.addEventListener('change', rebuild);
    rootSel.addEventListener('change', rebuild);
    degSel.addEventListener('change', () => voice1Panel && voice1Panel.render());
    dirSel.addEventListener('change', () => voice1Panel && voice1Panel.render());

    host.querySelector('#duet-play-1').addEventListener('click', () => {
      playSequence([lastV1Path], [voice1Panel && voice1Panel.getSvg()]);
    });
    host.querySelector('#duet-play-2').addEventListener('click', () => {
      playSequence([lastV2Path], [voice2Svg]);
    });
    host.querySelector('#duet-play-both').addEventListener('click', () => {
      playSequence([lastV1Path, lastV2Path], [voice1Panel && voice1Panel.getSvg(), voice2Svg]);
    });
    host.querySelector('#duet-stop').addEventListener('click', stopPlayback);

    rebuild();
  }

  return { init };
})();
