/* ============================================================
   DuetVoices — קול שני אוטומטי (הרמוניה דיאטונית) לדואט בוזוקי
   קלט: מנגינה קצרה בפורמט טקסט-טאב (אותו פורמט כמו ב-SongTeacher),
   לא ריצת-סולם מלאה — כדי שהקול השני יהיה תוכן מוזיקלי שונה בפועל,
   לא רק אותם 7 תווי הסולם באוקטבה/סדר אחר.
   ============================================================ */
'use strict';

const DuetVoices = (() => {
  const STR_LABELS = ['D', 'A', 'F', 'C'];
  const EXAMPLE_TAB =
`BPM: 100
D: 0 0 4 5 7 5 4 0
A: . . . . . . . .
F: . . . . . . . .
C: . . . . . . . .`;

  let svg1 = null;
  let svg2 = null;
  let lastV1 = [];
  let lastV2 = [];
  let playTimer = null;

  function normPc(pc) {
    return ((pc % 12) + 12) % 12;
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  }

  /** לכל תו במנגינה: מוצא את הדרגה שלו בדרומוס, מזיז ב-shift דרגות,
   *  ומחפש סריג/מיתר קרוב לתו המקורי (מעדיף מיתר שונה, לא אותו מיתר). */
  function computeVoice2(v1, intervals, rootPc, shift) {
    const n = intervals.length;
    if (!n) return [];
    return v1.map(note => {
      const pc = normPc(note.midi);
      const degIdx = intervals.findIndex(iv => normPc(rootPc + iv) === pc);
      if (degIdx < 0) return null;
      const anchorMidi = note.midi - intervals[degIdx];
      const newIdx0 = degIdx + shift;
      const octaves = Math.floor(newIdx0 / n);
      const wrapIdx = ((newIdx0 % n) + n) % n;
      const targetMidi = anchorMidi + intervals[wrapIdx] + octaves * 12;

      let best = null;
      let bestScore = Infinity;
      for (let ci = 0; ci < 4; ci++) {
        const fret = FretboardScale.fretFromMidi(ci, targetMidi);
        if (fret == null) continue;
        const score = Math.abs(fret - note.fret) + (ci === note.course ? 1 : 0);
        if (score < bestScore) { bestScore = score; best = { ci, fret }; }
      }
      if (!best) return null;
      return { time: note.time, course: best.ci, fret: best.fret, midi: targetMidi, duration: note.duration };
    });
  }

  function ensureSvg(host) {
    let svg = host.querySelector('svg.fretboard');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('fretboard', 'fs-neck-board');
      svg.setAttribute('dir', 'ltr');
      host.innerHTML = '';
      host.appendChild(svg);
    }
    return svg;
  }

  /** מפת סולם כללית — הקשר ויזואלי בלבד, ההדגשה בזמן ניגון היא flashMidi */
  function drawScaleContext(svg, intervals, rootPc) {
    if (!svg || typeof drawFretboard !== 'function') return;
    const pcsSet = new Set(intervals.map(iv => normPc(rootPc + iv)));
    drawFretboard(svg, (ci, f, midi) => {
      const pc = normPc(midi);
      if (!pcsSet.has(pc)) return null;
      return { type: pc === normPc(rootPc) ? 'root' : 'note', label: NOTE_NAMES[pc] };
    });
  }

  function renderNoteList(host, notes) {
    if (!host) return;
    if (!notes.length) { host.innerHTML = '<p class="hint">—</p>'; return; }
    host.innerHTML = notes.map((n, i) => n
      ? `<span class="duet-note-chip" data-i="${i}" style="display:inline-block;padding:3px 8px;margin:2px;border-radius:6px;background:var(--card-bg,#2a2a2a);">${i + 1}. ${STR_LABELS[n.course]}·${n.fret}</span>`
      : `<span class="duet-note-chip" data-i="${i}" style="display:inline-block;padding:3px 8px;margin:2px;border-radius:6px;opacity:.4;">${i + 1}. —</span>`
    ).join('');
  }

  function setChipActive(host, i, active) {
    const chip = host?.querySelector(`[data-i="${i}"]`);
    if (chip) chip.style.background = active ? 'var(--gold, #f0cc74)' : 'var(--card-bg,#2a2a2a)';
  }

  function stopPlayback() {
    if (playTimer) { clearTimeout(playTimer); playTimer = null; }
  }

  function playSequence(paths, svgs, listHosts) {
    stopPlayback();
    if (typeof AudioEngine === 'undefined' || !AudioEngine.pluckCourse) return;
    AudioEngine.ensureCtx();
    const len = Math.max(0, ...paths.map(p => p.length));
    if (!len) return;
    let i = 0;
    const prevI = i;
    function step() {
      let maxDur = 0.3;
      paths.forEach((path, vi) => {
        if (i > 0) setChipActive(listHosts[vi], i - 1, false);
        const note = path[i];
        if (!note) return;
        AudioEngine.pluckCourse(note.course, note.fret, 0, 0.55);
        if (svgs[vi] && FretboardScale.flashMidi) FretboardScale.flashMidi(svgs[vi], note.midi);
        setChipActive(listHosts[vi], i, true);
        maxDur = Math.max(maxDur, note.duration || 0.3);
      });
      i++;
      if (i < len) {
        playTimer = setTimeout(step, maxDur * 1000);
      } else {
        playTimer = setTimeout(() => {
          paths.forEach((path, vi) => setChipActive(listHosts[vi], len - 1, false));
        }, maxDur * 1000);
      }
    }
    step();
  }

  function buildVoices(host, text, dromosId, rootPc, degrees, dir) {
    const err = host.querySelector('#duet-err');
    err.textContent = '';
    let parsed;
    try {
      parsed = SongTeacher.parseTextTab(text);
    } catch (e) {
      err.textContent = 'שגיאה: ' + (e.message || e);
      return;
    }
    stopPlayback();
    const d = DROMOI.find(x => x.id === dromosId) || DROMOI[0];
    lastV1 = parsed.tabNotes;
    lastV2 = computeVoice2(lastV1, d.intervals, rootPc, degrees * dir);
    if (lastV2.every(n => !n)) {
      err.textContent = 'לא נמצא קול שני — ודאו שהמנגינה בנויה מתווי הדרומוס שנבחר (לא צלילים כרומטיים מחוץ לסולם)';
    }
    drawScaleContext(svg1, d.intervals, rootPc);
    drawScaleContext(svg2, d.intervals, rootPc);
    renderNoteList(host.querySelector('#duet-list-1'), lastV1);
    renderNoteList(host.querySelector('#duet-list-2'), lastV2);
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
      <p class="lead" style="margin-bottom:10px;">הזינו מנגינה קצרה בפורמט טאב (בדיוק כמו ב"למד אותי את השיר") — קול שני יחושב תו-תו כהרמוניה דיאטונית מהדרומוס שבחרתם, כדי ששני נגני בוזוקי ינגנו יחד דו-קולית על מנגינה אמיתית, לא ריצת סולם.</p>
      <div class="card">
        <textarea id="duet-tab-text" class="st-manual-textarea" rows="6" placeholder="${esc(EXAMPLE_TAB)}"></textarea>
        <div class="st-load-row" style="display:flex;gap:8px;margin-top:8px;">
          <button type="button" class="btn small secondary" id="duet-example">💡 מלא דוגמה</button>
          <button type="button" class="btn gold" id="duet-build">🎶 בנה קול שני</button>
        </div>
        <p id="duet-err" class="hint" style="color:var(--danger,#e66);"></p>
      </div>
      <div class="duet-play-controls" style="display:flex;flex-wrap:wrap;gap:8px;margin:16px 0;">
        <button type="button" id="duet-play-1" class="btn secondary">▶ נגן קול ראשון</button>
        <button type="button" id="duet-play-2" class="btn secondary">▶ נגן קול שני</button>
        <button type="button" id="duet-play-both" class="btn gold">▶▶ נגן ביחד</button>
        <button type="button" id="duet-stop" class="btn secondary">⏹ עצור</button>
      </div>
      <div class="card">
        <h3>🎵 קול ראשון</h3>
        <div id="duet-voice1-board"></div>
        <div id="duet-list-1" class="duet-note-list"></div>
      </div>
      <div class="card">
        <h3>🎵 קול שני (הרמוניה)</h3>
        <div id="duet-voice2-board"></div>
        <div id="duet-list-2" class="duet-note-list"></div>
      </div>
    `;

    svg1 = ensureSvg(host.querySelector('#duet-voice1-board'));
    svg2 = ensureSvg(host.querySelector('#duet-voice2-board'));

    const dromosSel = host.querySelector('#duet-dromos');
    const rootSel = host.querySelector('#duet-root');
    const degSel = host.querySelector('#duet-degrees');
    const dirSel = host.querySelector('#duet-dir');
    const textArea = host.querySelector('#duet-tab-text');

    drawScaleContext(svg1, DROMOI[0].intervals, 2);
    drawScaleContext(svg2, DROMOI[0].intervals, 2);

    function rebuild() {
      if (!textArea.value.trim()) return;
      buildVoices(host, textArea.value, dromosSel.value, parseInt(rootSel.value, 10), parseInt(degSel.value, 10), parseInt(dirSel.value, 10));
    }

    host.querySelector('#duet-example').addEventListener('click', () => { textArea.value = EXAMPLE_TAB; });
    host.querySelector('#duet-build').addEventListener('click', rebuild);
    dromosSel.addEventListener('change', rebuild);
    rootSel.addEventListener('change', rebuild);
    degSel.addEventListener('change', rebuild);
    dirSel.addEventListener('change', rebuild);

    host.querySelector('#duet-play-1').addEventListener('click', () => {
      playSequence([lastV1], [svg1], [host.querySelector('#duet-list-1')]);
    });
    host.querySelector('#duet-play-2').addEventListener('click', () => {
      playSequence([lastV2], [svg2], [host.querySelector('#duet-list-2')]);
    });
    host.querySelector('#duet-play-both').addEventListener('click', () => {
      playSequence([lastV1, lastV2], [svg1, svg2], [host.querySelector('#duet-list-1'), host.querySelector('#duet-list-2')]);
    });
    host.querySelector('#duet-stop').addEventListener('click', stopPlayback);
  }

  return { init };
})();
