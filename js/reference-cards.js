/* ============================================================
   ReferenceCards — כרטיסי ייחוס לבוזוקי טטרהקורדו (C-F-A-D)
   משחזר את הכרטיסים המקצועיים המודפסים: מפת סולם אנכית על הגריף,
   איות הסולם בסולפג׳, וסט אקורדים עם פוזיציות צוואר.
   תבנית מודול זהה ל-TheoryLab. דורש קונטיינר #reference-cards-app.
   ============================================================ */
'use strict';

/* נתוני הכרטיסים — חולצו מהכרטיסים המודפסים */
const REFERENCE_CARDS = [
  { id:'d-major', he:'רה מז׳ור', translit:'D Major',
    scaleAsc:['D','E','F#','G','A','B','C#'], scaleDesc:null,
    chords:[{name:'D',from:4,to:7},{name:'A',from:7,to:10},{name:'G',from:5,to:8},{name:'Em',from:2,to:5}] },
  { id:'dm-nissiotiko', he:'רה ניסיוטיקו מינור', translit:'Dm Nissiotico',
    scaleAsc:['D','E','F','G','A','Bb','C'], scaleDesc:null,
    chords:[{name:'Am',from:2,to:5},{name:'Bb',from:3,to:6},{name:'C',from:2,to:5},{name:'Dm',from:1,to:4},{name:'F',from:3,to:6},{name:'Gm',from:5,to:8}],
    fingering:'מסלול אצבוע מעשי בפוזיציה 5–12: אצבעות 1·2·4 לאורך המיתרים, עולים מהמיתר העבה אל מיתר 1.' },
  { id:'d-rast', he:'רה ראסט', translit:'D Rast',
    scaleAsc:['D','E','F#','G','A','B','C#'], scaleDesc:['D','C','B','A','G','F#','E'],
    chords:[{name:'D',from:1,to:4},{name:'Em',from:2,to:5},{name:'G',from:1,to:4},{name:'Am',from:2,to:5},{name:'Bm',from:4,to:7},{name:'F#dim',from:1,to:4}] },
  { id:'dm-niavent', he:'רה ניאוונט', translit:'Dm Niavent',
    scaleAsc:['D','E','F','G#','A','Bb','C#'], scaleDesc:null,
    chords:[{name:'Dm',from:7,to:10},{name:'Bb',from:8,to:11},{name:'A',from:7,to:10},{name:'G#dim',from:4,to:7},{name:'F',from:3,to:6},{name:'C#dim',from:9,to:12}] },
];

const ReferenceCards = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // כיוונון פתוח לפי קורס: 0=D(גבוה) 1=A 2=F 3=C(נמוך)
  const OPEN_MIDI = [62, 57, 53, 48];
  // עמודות מפת הסולם משמאל לימין: C F A D — לפי הכרטיס המודפס
  const COL_COURSES = [3, 2, 1, 0];   // course index של כל עמודה
  const COL_LABELS  = ['C', 'F', 'A', 'D'];

  const SHARP_TO_FLAT = { 'Bb':'A#','Eb':'D#','Ab':'G#','Db':'C#','Gb':'F#' };

  let _activeId = REFERENCE_CARDS[0].id;
  let _seqTimer = null;       // טיימר יחיד לנגינת סולם
  let _seqBtn = null;
  let _flashCells = null;     // תאים מודגשים בזמן נגינה

  /* ---------- עזרים ---------- */
  function svgEl(tag, attrs = {}, parent = null) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  }
  function ensureAudio() {
    try { if (typeof AudioEngine !== 'undefined' && AudioEngine.ensureCtx) AudioEngine.ensureCtx(); } catch (_) {}
  }
  function now() {
    try { return AudioEngine.ctx.currentTime; } catch (_) { return 0; }
  }
  // שם תו (כולל במולים) -> pitch class
  function pcOf(name) {
    let s = String(name).trim();
    if (SHARP_TO_FLAT[s]) s = SHARP_TO_FLAT[s];
    const i = NOTE_NAMES.indexOf(s);
    return i >= 0 ? i : null;
  }
  function solfege(name) {
    const pc = pcOf(name);
    if (pc == null) return name;
    return SOLFEGE[NOTE_NAMES[pc]] || NOTE_NAMES[pc];
  }

  /* ---------- נגינה: register/stop ---------- */
  function registerLoop() {
    if (typeof registerPlayback === 'function') registerPlayback('reference-cards', stop);
  }
  function unregisterLoop() {
    if (typeof unregisterPlayback === 'function') unregisterPlayback('reference-cards');
  }
  function stop() {
    if (_seqTimer) { clearInterval(_seqTimer); _seqTimer = null; }
    if (_flashCells) _flashCells.forEach(c => c.classList.remove('rc-cell-active'));
    _flashCells = null;
    if (_seqBtn) {
      _seqBtn.textContent = _seqBtn.dataset.playLabel || '▶ נגן סולם';
      _seqBtn.classList.remove('playing');
      _seqBtn = null;
    }
    unregisterLoop();
  }

  function getCard(id) { return REFERENCE_CARDS.find(c => c.id === id) || REFERENCE_CARDS[0]; }

  /* ============================================================
     מפת סולם אנכית — 4 עמודות C F A D, שורות סריג 1..15
     תא = שם התו בקורס+סריג. טוניקה אדום, צליל סולם כחול/נייבי,
     שאר התאים אפורים דהויים. תאי סולם לחיצים (pluckCourse).
     ============================================================ */
  function buildScaleMap(card) {
    const rootPc = pcOf(card.scaleAsc[0]);
    const scalePcs = new Set(card.scaleAsc.map(pcOf).filter(p => p != null));

    const colW = 64, rowH = 26, padT = 30, padL = 8, padR = 34, padB = 8;
    const numFrets = NUM_FRETS;
    const w = padL + colW * 4 + padR;
    const h = padT + rowH * numFrets + padB;

    const svg = svgEl('svg', { class: 'rc-map-svg', viewBox: `0 0 ${w} ${h}`, role: 'img' });

    // כותרת עמודות C F A D
    COL_LABELS.forEach((lbl, col) => {
      const cx = padL + col * colW + colW / 2;
      svgEl('text', {
        x: cx, y: 19, fill: 'var(--gold)', 'font-size': 16, 'font-weight': 800,
        'text-anchor': 'middle', 'font-family': 'Heebo,sans-serif',
      }, svg).textContent = lbl;
    });

    const cells = []; // תאים לחיצים: {el, courseIdx, fret}

    for (let fret = 1; fret <= numFrets; fret++) {
      const y = padT + (fret - 1) * rowH;
      // מספר סריג בקצה (ימין ב-RTL — נציב בצד ימני של ה-SVG)
      svgEl('text', {
        x: w - padR + 16, y: y + rowH / 2 + 4, fill: 'var(--text-dim)',
        'font-size': 10, 'text-anchor': 'middle', 'font-family': 'monospace',
      }, svg).textContent = fret;

      COL_LABELS.forEach((lbl, col) => {
        const ci = COL_COURSES[col];
        const x = padL + col * colW;
        const cx = x + colW / 2;
        const cy = y + rowH / 2;
        const midi = OPEN_MIDI[ci] + fret;
        const pc = ((midi % 12) + 12) % 12;
        const noteName = NOTE_NAMES[pc];
        const isRoot = pc === rootPc;
        const inScale = scalePcs.has(pc);

        const g = svgEl('g', {}, svg);
        const rect = svgEl('rect', {
          x: x + 2, y: y + 2, width: colW - 4, height: rowH - 4, rx: 5,
          fill: isRoot ? '#a3261f' : inScale ? '#1f4e74' : 'rgba(255,255,255,0.025)',
          stroke: isRoot ? '#e87a6f' : inScale ? '#4fb3d9' : 'rgba(255,255,255,0.05)',
          'stroke-width': inScale ? 1.2 : 1,
          opacity: inScale ? 1 : 0.5,
        }, g);
        svgEl('text', {
          x: cx, y: cy + 4, 'text-anchor': 'middle', 'font-family': 'Heebo,sans-serif',
          'font-size': 11.5, 'font-weight': inScale ? 700 : 500,
          fill: inScale ? '#fff' : 'var(--text-dim)',
          opacity: inScale ? 1 : 0.55,
          style: 'pointer-events:none',
        }, g).textContent = noteName;

        if (inScale) {
          g.style.cursor = 'pointer';
          g.dataset.key = ci + '-' + fret;
          g.addEventListener('click', () => {
            ensureAudio();
            if (typeof AudioEngine !== 'undefined' && AudioEngine.pluckCourse) {
              AudioEngine.pluckCourse(ci, fret, 0, 0.55);
            }
            flashCell(g);
          });
          cells.push({ el: g, rect, courseIdx: ci, fret });
        }
      });
    }
    return { svg, cells };
  }

  function flashCell(g) {
    if (!g) return;
    g.classList.add('rc-cell-active');
    setTimeout(() => g.classList.remove('rc-cell-active'), 240);
  }

  /* ============================================================
     נגינת סולם — לאורך עמודת D (course 0), עולה דרך תאי הסולם.
     ממפה כל תו בסולם לסריג הראשון על מיתר D שמייצר את ה-pc.
     ============================================================ */
  function dFretForPc(pc) {
    // מיתר D פתוח = pc 2. הסריג הנמוך ביותר (>0) ל-pc נתון:
    let f = ((pc - 2) % 12 + 12) % 12;
    if (f === 0) f = 12;            // העדף סריג 12 על-פני מיתר פתוח לצליל אחיד
    return f;
  }

  function playScale(notes, cellsByKey, btn) {
    stop();
    ensureAudio();
    if (!Array.isArray(notes) || !notes.length) return;
    _seqBtn = btn;
    if (btn) { btn.textContent = '■ עצור'; btn.classList.add('playing'); }
    _flashCells = [];
    const stepMs = 360;
    let i = 0;
    const tick = () => {
      if (_flashCells) _flashCells.forEach(c => c.classList.remove('rc-cell-active'));
      _flashCells = [];
      const pc = pcOf(notes[i % notes.length]);
      if (pc != null && typeof AudioEngine !== 'undefined' && AudioEngine.pluckCourse) {
        const fret = dFretForPc(pc);
        AudioEngine.pluckCourse(0, fret, 0, 0.55);
        const g = cellsByKey && cellsByKey['0-' + fret];
        if (g) { g.classList.add('rc-cell-active'); _flashCells.push(g); }
      }
      i++;
      if (i >= notes.length) {        // מעבר יחיד ואז עצירה
        clearInterval(_seqTimer); _seqTimer = null;
        setTimeout(() => stop(), stepMs);
      }
    };
    tick();
    _seqTimer = setInterval(tick, stepMs);
    registerLoop();
  }

  /* ---------- שורת איות סולם + כפתורי נגן ---------- */
  function buildScaleSpelling(card, cellsByKey) {
    const wrap = document.createElement('div');
    wrap.className = 'rc-spelling';

    const mkRow = (notes, label) => {
      const row = document.createElement('div');
      row.className = 'rc-spell-row';
      const tag = document.createElement('span');
      tag.className = 'rc-spell-label';
      tag.textContent = label;
      row.appendChild(tag);
      const notesWrap = document.createElement('div');
      notesWrap.className = 'rc-spell-notes';
      notesWrap.dir = 'ltr';
      notes.forEach(n => {
        const cell = document.createElement('div');
        cell.className = 'rc-spell-note';
        cell.innerHTML = `<span class="rc-note-name">${n}</span><span class="rc-note-sol">${solfege(n)}</span>`;
        notesWrap.appendChild(cell);
      });
      row.appendChild(notesWrap);
      return row;
    };

    wrap.appendChild(mkRow(card.scaleAsc, 'עולה'));
    if (card.scaleDesc) wrap.appendChild(mkRow(card.scaleDesc, 'יורד'));

    const btns = document.createElement('div');
    btns.className = 'rc-spell-btns';
    const bAsc = document.createElement('button');
    bAsc.className = 'btn small rc-btn';
    bAsc.dataset.playLabel = '▶ נגן סולם';
    bAsc.textContent = bAsc.dataset.playLabel;
    bAsc.addEventListener('click', () => {
      if (_seqBtn === bAsc) { stop(); return; }
      playScale(card.scaleAsc, cellsByKey, bAsc);
    });
    btns.appendChild(bAsc);

    if (card.scaleDesc) {
      const bDesc = document.createElement('button');
      bDesc.className = 'btn small rc-btn';
      bDesc.dataset.playLabel = '▶ יורד';
      bDesc.textContent = bDesc.dataset.playLabel;
      bDesc.addEventListener('click', () => {
        if (_seqBtn === bDesc) { stop(); return; }
        playScale(card.scaleDesc, cellsByKey, bDesc);
      });
      btns.appendChild(bDesc);
    }
    wrap.appendChild(btns);
    return wrap;
  }

  /* ============================================================
     סט אקורדים — שם, פוזיציה, דיאגרמה (ChordTooltip) + נגינה.
     אם האקורד לא קיים ב-CHORDS: בונים טריאדה ניידת בסריג from
     ומנגנים אותה; דימיניש שלא נמצא — מנגנים את צליל השורש על D.
     ============================================================ */
  function chordRootPc(name) {
    const m = String(name).match(/^([A-G][#b]?)/);
    return m ? pcOf(m[1]) : null;
  }
  function isMinorish(name) { return /m(?!aj)/.test(name) && !/dim/.test(name); }
  function isDim(name) { return /dim|°/.test(name); }

  // טריאדה ניידת על D (course0) סביב סריג base — מחזיר shape [C,F,A,D]
  function moveableTriad(name, base) {
    const rootPc = chordRootPc(name);
    if (rootPc == null) return null;
    // סריג על מיתר D שנותן את השורש, קרוב ל-base
    let rf = ((rootPc - 2) % 12 + 12) % 12;
    while (rf < base) rf += 12;
    if (rf > NUM_FRETS) rf -= 12;
    if (rf < 0) return null;
    const third = isMinorish(name) || isDim(name) ? 3 : 4;
    const fifth = isDim(name) ? 6 : 7;
    // נבנה על שלושת המיתרים הגבוהים D,A,F יחסית — נשתמש בצלילים על אותו אזור
    // shape [C,F,A,D]: נמתח טריאדה במנח קרוב. נשמיע D=root, A=third מעל, F=fifth מעל.
    const dFret = rf;
    // A פתוח pc=9, F פתוח pc=5
    const targetThird = (rootPc + third) % 12;
    const targetFifth = (rootPc + fifth) % 12;
    let aFret = ((targetThird - 9) % 12 + 12) % 12; // A course
    let fFret = ((targetFifth - 5) % 12 + 12) % 12; // F course
    // קרב לאזור base
    while (aFret < base) aFret += 12; if (aFret > NUM_FRETS) aFret -= 12;
    while (fFret < base) fFret += 12; if (fFret > NUM_FRETS) fFret -= 12;
    return ['x', fFret < 0 ? 'x' : fFret, aFret < 0 ? 'x' : aFret, dFret];
  }

  function resolveChordKey(name) {
    if (typeof ChordTooltip !== 'undefined' && ChordTooltip.resolveKey) {
      return ChordTooltip.resolveKey(name);
    }
    if (typeof CHORDS !== 'undefined' && CHORDS[name]) return name;
    return null;
  }

  function playChord(ch) {
    ensureAudio();
    if (typeof AudioEngine === 'undefined') return;
    const key = resolveChordKey(ch.name);
    if (key && typeof CHORDS !== 'undefined' && CHORDS[key] && Array.isArray(CHORDS[key].shape)) {
      if (AudioEngine.strumChord) AudioEngine.strumChord(CHORDS[key].shape, 'd', now() + 0.02, 0.5);
      return;
    }
    if (isDim(ch.name)) {
      // דימיניש שלא נמצא — נשמיע את צליל השורש על מיתר D בסריג הגיוני
      const rootPc = chordRootPc(ch.name);
      if (rootPc != null && AudioEngine.pluckCourse) {
        let f = ((rootPc - 2) % 12 + 12) % 12;
        while (f < (ch.from || 0)) f += 12;
        if (f > NUM_FRETS) f -= 12;
        if (f < 0) f = ((rootPc - 2) % 12 + 12) % 12;
        AudioEngine.pluckCourse(0, f, 0, 0.55);
      }
      return;
    }
    // טריאדה ניידת
    const shape = moveableTriad(ch.name, ch.from || 0);
    if (shape && AudioEngine.strumChord) AudioEngine.strumChord(shape, 'd', now() + 0.02, 0.5);
  }

  function buildChordSet(card) {
    const wrap = document.createElement('div');
    wrap.className = 'rc-chords';
    const grid = document.createElement('div');
    grid.className = 'rc-chord-grid';

    card.chords.forEach(ch => {
      const cardEl = document.createElement('div');
      cardEl.className = 'rc-chord-card';

      const head = document.createElement('div');
      head.className = 'rc-chord-head';
      head.innerHTML = `<span class="rc-chord-name">${ch.name}</span>
        <span class="rc-chord-pos">סריגים ${ch.from}–${ch.to}</span>`;
      cardEl.appendChild(head);

      // דיאגרמה אם האקורד קיים, אחרת תווית פוזיציה
      const dia = document.createElement('div');
      dia.className = 'rc-chord-dia';
      const key = resolveChordKey(ch.name);
      let drew = false;
      if (key && typeof ChordTooltip !== 'undefined' && ChordTooltip.renderInto) {
        drew = ChordTooltip.renderInto(dia, ch.name);
      }
      if (!drew) {
        dia.innerHTML = `<div class="rc-chord-poslabel">פוזיציה ${ch.from}–${ch.to}</div>`;
      }
      cardEl.appendChild(dia);

      const btn = document.createElement('button');
      btn.className = 'btn small rc-btn rc-chord-play';
      btn.textContent = '🔊';
      btn.title = 'נגן אקורד';
      btn.addEventListener('click', () => playChord(ch));
      cardEl.appendChild(btn);

      grid.appendChild(cardEl);
    });

    wrap.appendChild(grid);
    return wrap;
  }

  /* ============================================================
     רינדור כרטיס פעיל
     ============================================================ */
  function renderCard(host, card) {
    host.innerHTML = '';

    // כותרת
    const header = document.createElement('div');
    header.className = 'rc-card-header';
    header.innerHTML = `<div class="rc-title">${card.he}</div>
      <div class="rc-translit">${card.translit}</div>`;
    host.appendChild(header);

    // גוף: מפה + צד מידע
    const body = document.createElement('div');
    body.className = 'rc-card-body';

    // מפת סולם אנכית
    const mapWrap = document.createElement('div');
    mapWrap.className = 'rc-map-wrap';
    const { svg, cells } = buildScaleMap(card);
    mapWrap.appendChild(svg);
    body.appendChild(mapWrap);

    const cellsByKey = {};
    cells.forEach(c => { cellsByKey[c.courseIdx + '-' + c.fret] = c.el; });

    // צד: איות + אקורדים
    const side = document.createElement('div');
    side.className = 'rc-card-side';
    side.appendChild(buildScaleSpelling(card, cellsByKey));
    side.appendChild(buildChordSet(card));
    if (card.fingering) {
      const fl = document.createElement('div');
      fl.className = 'rc-fingering';
      fl.innerHTML = `<span class="rc-finger-ico">🖐️</span><span>${card.fingering}</span>`;
      side.appendChild(fl);
    }
    body.appendChild(side);

    host.appendChild(body);
  }

  /* ============================================================
     init — בורר כרטיסים + הכרטיס הפעיל
     ============================================================ */
  function init() {
    const el = document.querySelector('#reference-cards-app');
    if (!el) return;
    stop();
    el.innerHTML = '';

    const intro = document.createElement('div');
    intro.className = 'card rc-intro';
    intro.innerHTML = `<h2>כרטיסי ייחוס — בוזוקי טטרהקורדו</h2>
      <p>כיוונון <b>C·F·A·D</b> (מהמיתר העבה לדק). כל כרטיס = דרומוס עם מפת סולם אנכית,
      איות הסולם בסולפג׳, וסט אקורדים עם פוזיציות.</p>
      <p class="rc-intro-hint">לחצו על תא במפה כדי לשמוע אותו · נקודה אדומה = טוניקה · כחול = צליל סולם</p>`;
    el.appendChild(intro);

    // בורר כרטיסים (צ׳יפים)
    const picker = document.createElement('div');
    picker.className = 'card rc-picker';
    picker.innerHTML = '<div class="rc-picker-label">בחרו כרטיס:</div>';
    const chips = document.createElement('div');
    chips.className = 'rc-chips';
    const host = document.createElement('div');
    host.className = 'card rc-card';

    REFERENCE_CARDS.forEach(c => {
      const chip = document.createElement('button');
      chip.className = 'rc-chip' + (c.id === _activeId ? ' active' : '');
      chip.innerHTML = `<span class="rc-chip-he">${c.he}</span><span class="rc-chip-tr">${c.translit}</span>`;
      chip.addEventListener('click', () => {
        if (_activeId === c.id) return;
        _activeId = c.id;
        stop();
        chips.querySelectorAll('.rc-chip').forEach(x => x.classList.remove('active'));
        chip.classList.add('active');
        renderCard(host, getCard(_activeId));
      });
      chips.appendChild(chip);
    });
    picker.appendChild(chips);
    el.appendChild(picker);

    el.appendChild(host);
    renderCard(host, getCard(_activeId));
  }

  return { init, stop };
})();
