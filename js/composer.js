/* ============================================================
   Composer — "מלחין" — כלי הלחנה לבוזוקי: מזינים תווים (קליק על
   הגריף או הדבקת טאב-טקסט), מקבלים גם טאב וגם תווים אמיתיים על
   חמישייה (VexFlow, נטען מ-CDN בדיוק כמו Essentia.js הקיים) עם
   שם-התו מתחת לכל תו, ניגון, והדפסה/שמירה.
   שלב 1 בתוכנית שסוכמה עם המשתמש: מקור-נתונים משותף + VexFlow.
   ============================================================ */
'use strict';

const Composer = (() => {
  const STR_LABELS = ['D', 'A', 'F', 'C'];
  const EXAMPLE_TAB =
`BPM: 100
D: 0 0 4 5 7 5 4 0
A: . . . . . . . .
F: . . . . . . . .
C: . . . . . . . .`;
  const BEAT_DURATIONS = [
    { v: 0.25, label: '1/16' }, { v: 0.5, label: '1/8' }, { v: 0.75, label: '1/8.' },
    { v: 1, label: '1/4' }, { v: 1.5, label: '1/4.' }, { v: 2, label: '1/2' },
    { v: 3, label: '1/2.' }, { v: 4, label: '1 שלם' },
  ];
  const BEAT_TO_VEX = { 0.25: '16', 0.5: '8', 0.75: '8d', 1: 'q', 1.5: 'qd', 2: 'h', 3: 'hd', 4: 'w' };

  let _Vex = null;
  let _loadingVex = null;
  let _notes = [];        // [{course,fret,midi,beats}]
  let _mode = 'click';     // 'click' | 'text'
  let _course = 0;
  let _svg = null;
  let _playTimer = null;

  function normPc(pc) { return ((pc % 12) + 12) % 12; }
  function esc(s) { return String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }

  function loadVexFlow() {
    if (_Vex) return Promise.resolve(_Vex);
    if (_loadingVex) return _loadingVex;
    _loadingVex = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/vexflow@5.0.0/build/cjs/vexflow.min.js';
      s.onload = () => {
        if (typeof VexFlow === 'undefined') { reject(new Error('VexFlow לא נטען')); return; }
        _Vex = VexFlow;
        resolve(_Vex);
      };
      s.onerror = () => reject(new Error('טעינת VexFlow מהרשת נכשלה — בדקו חיבור לאינטרנט'));
      document.head.appendChild(s);
    });
    return _loadingVex;
  }

  function beatsToVexDuration(beats) {
    if (BEAT_TO_VEX[beats]) return BEAT_TO_VEX[beats];
    const keys = Object.keys(BEAT_TO_VEX).map(Number);
    let best = keys[0], bestDiff = Infinity;
    keys.forEach(k => { const diff = Math.abs(k - beats); if (diff < bestDiff) { bestDiff = diff; best = k; } });
    return BEAT_TO_VEX[best];
  }

  function midiToVexKey(midi) {
    const names = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'];
    const pc = normPc(midi);
    const octave = Math.floor(midi / 12) - 1;
    return `${names[pc]}/${octave}`;
  }

  function midiToNoteName(midi) {
    return NOTE_NAMES[normPc(midi)];
  }

  /* ---------- רינדור חמישייה (VexFlow) ---------- */
  async function renderStaff(host) {
    if (!host) return;
    host.innerHTML = '<p class="hint">טוען מנוע תווים…</p>';
    let Vex;
    try {
      Vex = await loadVexFlow();
    } catch (e) {
      host.innerHTML = `<p class="hint" style="color:var(--danger,#e66);">שגיאה: ${esc(e.message || e)}</p>`;
      return;
    }
    host.innerHTML = '';
    if (!_notes.length) { host.innerHTML = '<p class="hint">הוסיפו תווים כדי לראות אותם על החמישייה.</p>'; return; }

    const { Renderer, Stave, StaveNote, Voice, Formatter, Annotation } = Vex;
    const perMeasure = 4; // 4/4
    const measures = [];
    let cur = [];
    let curBeats = 0;
    _notes.forEach(n => {
      if (curBeats + n.beats > perMeasure + 1e-9 && cur.length) { measures.push(cur); cur = []; curBeats = 0; }
      cur.push(n);
      curBeats += n.beats;
    });
    if (cur.length) measures.push(cur);

    const measuresPerRow = 4;
    const measureWidth = 190;
    const rows = Math.ceil(measures.length / measuresPerRow);
    const renderer = new Renderer(host, Renderer.Backends.SVG);
    renderer.resize(Math.min(measures.length, measuresPerRow) * measureWidth + 40, rows * 130 + 20);
    const ctx = renderer.getContext();

    measures.forEach((measure, mi) => {
      const row = Math.floor(mi / measuresPerRow);
      const col = mi % measuresPerRow;
      const x = 10 + col * measureWidth;
      const y = 10 + row * 130;
      const stave = new Stave(x, y, measureWidth);
      if (col === 0) stave.addClef('treble');
      if (mi === 0) stave.addTimeSignature('4/4');
      stave.setContext(ctx).draw();

      const staveNotes = measure.map(n => {
        const sn = new StaveNote({ keys: [midiToVexKey(n.midi)], duration: beatsToVexDuration(n.beats) });
        sn.addModifier(new Annotation(midiToNoteName(n.midi)).setPosition(Annotation.VerticalJustify.BOTTOM), 0);
        return sn;
      });
      const totalBeats = measure.reduce((s, n) => s + n.beats, 0);
      const voice = new Voice({ numBeats: Math.max(totalBeats, 0.25), beatValue: 4 }).setStrict(false);
      voice.addTickables(staveNotes);
      new Formatter().joinVoices([voice]).format([voice], measureWidth - 40);
      voice.draw(ctx, stave);
    });
  }

  /* ---------- רינדור טאב + רשימת תווים ---------- */
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

  function drawContextBoard() {
    if (!_svg || typeof drawFretboard !== 'function') return;
    const pathMap = new Map(_notes.map((n, i) => [`${n.course}-${n.fret}`, { ...n, idx: i }]));
    drawFretboard(_svg, (ci, f, midi) => {
      const onPath = pathMap.get(`${ci}-${f}`);
      if (onPath) return { type: 'root', label: String(onPath.idx + 1) };
      return null;
    });
    if (_notes.length) FretboardScale.drawPathOverlay(_svg, _notes.map(n => ({ ci: n.course, fret: n.fret, midi: n.midi })), '#7fd1ff');
  }

  function renderNoteList(host) {
    if (!_notes.length) { host.innerHTML = '<p class="hint">עדיין אין תווים.</p>'; return; }
    host.innerHTML = _notes.map((n, i) => `
      <span class="duet-note-chip" data-i="${i}" style="display:inline-block;padding:3px 8px;margin:2px;border-radius:6px;background:var(--card-bg,#2a2a2a);">
        ${i + 1}. ${STR_LABELS[n.course]}·${n.fret} (${midiToNoteName(n.midi)}) — ${BEAT_DURATIONS.find(d => d.v === n.beats)?.label || n.beats}
        <button type="button" class="composer-del" data-i="${i}" title="הסר" style="border:none;background:none;color:inherit;cursor:pointer;">✕</button>
      </span>`).join('');
    host.querySelectorAll('.composer-del').forEach(b => b.addEventListener('click', () => {
      _notes.splice(parseInt(b.dataset.i, 10), 1);
      rerenderAll();
    }));
  }

  function setChipActive(host, i, active) {
    const chip = host?.querySelector(`[data-i="${i}"]`);
    if (chip) chip.style.background = active ? 'var(--gold, #f0cc74)' : 'var(--card-bg,#2a2a2a)';
  }

  function stopPlayback() {
    if (_playTimer) { clearTimeout(_playTimer); _playTimer = null; }
  }

  function play() {
    stopPlayback();
    if (typeof AudioEngine === 'undefined' || !AudioEngine.pluckCourse || !_notes.length) return;
    AudioEngine.ensureCtx();
    const bpm = 100;
    const listHost = document.getElementById('composer-list');
    let i = 0;
    function step() {
      if (i > 0) setChipActive(listHost, i - 1, false);
      const n = _notes[i];
      AudioEngine.pluckCourse(n.course, n.fret, 0, 0.55);
      if (_svg && FretboardScale.flashMidi) FretboardScale.flashMidi(_svg, n.midi);
      setChipActive(listHost, i, true);
      const durMs = (n.beats * (60 / bpm)) * 1000;
      i++;
      if (i < _notes.length) _playTimer = setTimeout(step, durMs);
      else _playTimer = setTimeout(() => setChipActive(listHost, _notes.length - 1, false), durMs);
    }
    step();
  }

  function rerenderAll() {
    const host = document.getElementById('composer-app');
    if (!host) return;
    drawContextBoard();
    renderNoteList(document.getElementById('composer-list'));
    renderStaff(document.getElementById('composer-staff'));
  }

  /* ---------- קלט: לחיצה על הגריף ---------- */
  function renderClickInput(body) {
    body.innerHTML = `
      <div class="st-load-row">
        ${STR_LABELS.map((l, i) => `<button type="button" class="btn small composer-course${i === _course ? ' active' : ''}" data-c="${i}">${l}</button>`).join('')}
        <label>סריג: <input type="number" id="composer-fret" min="0" max="15" value="0" style="width:56px;"></label>
      </div>
      <div class="st-load-row">
        <span>משך:</span>
        ${BEAT_DURATIONS.map((d, i) => `<button type="button" class="btn small composer-dur${d.v === 1 ? ' active' : ''}" data-v="${d.v}">${d.label}</button>`).join('')}
      </div>
      <div class="st-load-row">
        <button type="button" class="btn gold" id="composer-add">➕ הוסף תו</button>
        <button type="button" class="btn small secondary" id="composer-undo">↺ הסר אחרון</button>
        <button type="button" class="btn small secondary" id="composer-clear">🗑️ נקה הכל</button>
      </div>`;
    let selDur = 1;
    body.querySelectorAll('.composer-course').forEach(b => b.addEventListener('click', () => {
      _course = parseInt(b.dataset.c, 10);
      body.querySelectorAll('.composer-course').forEach(x => x.classList.toggle('active', x === b));
    }));
    body.querySelectorAll('.composer-dur').forEach(b => b.addEventListener('click', () => {
      selDur = parseFloat(b.dataset.v);
      body.querySelectorAll('.composer-dur').forEach(x => x.classList.toggle('active', x === b));
    }));
    body.querySelector('#composer-add').addEventListener('click', () => {
      const fret = Math.max(0, Math.min(15, parseInt(body.querySelector('#composer-fret').value, 10) || 0));
      const midi = TUNING[_course].midi + fret;
      _notes.push({ course: _course, fret, midi, beats: selDur });
      rerenderAll();
    });
    body.querySelector('#composer-undo').addEventListener('click', () => { _notes.pop(); rerenderAll(); });
    body.querySelector('#composer-clear').addEventListener('click', () => {
      if (_notes.length && !confirm('לנקות את כל התווים?')) return;
      _notes = [];
      rerenderAll();
    });
  }

  /* ---------- קלט: טקסט-טאב / קובץ ---------- */
  function renderTextInput(body) {
    body.innerHTML = `
      <p class="hint">אותו פורמט טאב-טקסט כמו ב"למד אותי את השיר" — D/A/F/C + BPM:</p>
      <textarea id="composer-text" class="st-manual-textarea" rows="6" placeholder="${esc(EXAMPLE_TAB)}"></textarea>
      <div class="st-load-row" style="flex-wrap:wrap;align-items:center;">
        <button type="button" class="btn small secondary" id="composer-example">💡 מלא דוגמה</button>
        <label class="btn small secondary" style="cursor:pointer;">📂 העלה קובץ (.txt)
          <input type="file" id="composer-file" accept=".txt" style="display:none;">
        </label>
        <button type="button" class="btn gold" id="composer-parse">🎶 טען למלחין</button>
      </div>
      <p id="composer-err" class="hint" style="color:var(--danger,#e66);"></p>`;
    const ta = body.querySelector('#composer-text');
    body.querySelector('#composer-example').addEventListener('click', () => { ta.value = EXAMPLE_TAB; });
    body.querySelector('#composer-file').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => { ta.value = String(evt.target.result || ''); };
      reader.readAsText(file);
    });
    body.querySelector('#composer-parse').addEventListener('click', () => {
      const err = body.querySelector('#composer-err');
      err.textContent = '';
      try {
        const parsed = SongTeacher.parseTextTab(ta.value);
        const bpm = parsed.bpm || 90;
        _notes = parsed.tabNotes.map(n => ({
          course: n.course, fret: n.fret, midi: n.midi,
          beats: Math.round((n.duration * bpm / 60) * 4) / 4 || 0.5,
        }));
        rerenderAll();
      } catch (e) {
        err.textContent = 'שגיאה: ' + (e.message || e);
      }
    });
  }

  function renderInputPanel(host) {
    const body = document.getElementById('composer-input-body');
    if (_mode === 'click') renderClickInput(body); else renderTextInput(body);
  }

  function printSheet() {
    if (!_notes.length) { alert('אין תווים להדפסה'); return; }
    const staffHost = document.getElementById('composer-staff');
    const staffSvg = staffHost?.querySelector('svg')?.outerHTML || '<p>אין תצוגת חמישייה</p>';
    const tabRows = _notes.map((n, i) => `<td>${i + 1}<br>${STR_LABELS[n.course]}·${n.fret}<br><small>${midiToNoteName(n.midi)}</small></td>`).join('');
    const ifr = document.createElement('iframe');
    ifr.setAttribute('aria-hidden', 'true');
    ifr.style.cssText = 'position:fixed;right:-9999px;bottom:0;width:900px;height:700px;border:0;';
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
      <style>
        html,body{background:#fff;margin:0;padding:16px;font-family:Heebo,sans-serif;color:#1a1a1a;}
        h1{color:#b8860b;font-size:22px;}
        table{border-collapse:collapse;margin-top:12px;}
        td{border:1px solid #ccc;padding:6px 10px;text-align:center;font-family:monospace;}
      </style></head><body>
      <h1>מלחין — קטע לבוזוקי</h1>
      <div>${staffSvg}</div>
      <table><tr>${tabRows}</tr></table>
      </body></html>`);
    doc.close();
    setTimeout(() => {
      try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (_) {}
      setTimeout(() => ifr.remove(), 1500);
    }, 400);
  }

  function init() {
    const host = document.getElementById('composer-app');
    if (!host) return;
    host.innerHTML = `
      <div class="card">
        <div class="st-load-row">
          <button type="button" class="btn small composer-mode active" data-m="click">🖱️ לחיצה על הגריף</button>
          <button type="button" class="btn small composer-mode" data-m="text">📝 טקסט-טאב / קובץ</button>
        </div>
        <div id="composer-input-body"></div>
      </div>
      <div class="duet-play-controls" style="display:flex;gap:8px;margin:16px 0;">
        <button type="button" id="composer-play" class="btn gold">▶ נגן</button>
        <button type="button" id="composer-stop" class="btn secondary">⏹ עצור</button>
        <button type="button" id="composer-print" class="btn secondary">🖨️ הדפס / שמור PDF</button>
      </div>
      <div class="card">
        <h3>🎼 תווים (חמישייה)</h3>
        <div id="composer-staff" style="overflow-x:auto;"></div>
      </div>
      <div class="card">
        <h3>🪕 טאב</h3>
        <div id="composer-board"></div>
        <div id="composer-list" class="duet-note-list"></div>
      </div>`;

    _svg = ensureSvg(document.getElementById('composer-board'));
    renderInputPanel(host);

    host.querySelectorAll('.composer-mode').forEach(b => b.addEventListener('click', () => {
      _mode = b.dataset.m;
      host.querySelectorAll('.composer-mode').forEach(x => x.classList.toggle('active', x === b));
      renderInputPanel(host);
    }));
    host.querySelector('#composer-play').addEventListener('click', play);
    host.querySelector('#composer-stop').addEventListener('click', stopPlayback);
    host.querySelector('#composer-print').addEventListener('click', printSheet);

    rerenderAll();
  }

  return { init };
})();
