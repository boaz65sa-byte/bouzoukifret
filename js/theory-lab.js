/* ============================================================
   TheoryLab — חומר עיוני: אקורדים עם אצבוע + פנייה ופריטה
   מציג ומנגן: צורות אקורדים על הגריף, תרגילי פריטה מעשיים.
   קורא מ-EDUCATION_CONTENT.chordCurriculum + peniaCurriculum.
   ============================================================ */
'use strict';

const TheoryLab = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  // נגן פריטה פעיל (תרגילים) — אינטרבל יחיד גלובלי
  let _pickTimer = null;
  let _pickBtnEl = null;
  let _pickCells = null;
  let _activeTab = 'chords';

  // מצב טאב "דרומוס על הגריף"
  let _selDromos = null;   // id הדרומוס הנבחר
  let _posBase = 0;        // סריג בסיס של חלון הפוזיציה
  let _neckMode = '4';     // '4' = מסלול על 4 מיתרים · '2' = על 2 מיתרים (A,D)
  let _seqTimer = null;    // נגן רצף צלילים (סולם/מסלול)
  let _seqBtn = null;
  let _seqDots = null;     // מפת נקודות הגריף לפי "ci-fret"

  /* ---------- עזרי DOM/SVG ---------- */
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

  /* ---------- מצב פריטה ---------- */
  function registerLoop() {
    if (typeof registerPlayback === 'function') registerPlayback('theory-lab', stop);
  }
  function unregisterLoop() {
    if (typeof unregisterPlayback === 'function') unregisterPlayback('theory-lab');
  }

  function stopPicking() {
    if (_pickTimer) { clearInterval(_pickTimer); _pickTimer = null; }
    if (_pickCells) _pickCells.forEach(c => c.classList.remove('tl-stroke-active'));
    _pickCells = null;
    if (_pickBtnEl) {
      _pickBtnEl.textContent = _pickBtnEl.dataset.playLabel || '▶ נגן';
      _pickBtnEl.classList.remove('playing');
    }
    _pickBtnEl = null;
    unregisterLoop();
  }

  function stopSeq() {
    if (_seqTimer) { clearInterval(_seqTimer); _seqTimer = null; }
    if (_seqDots) _seqDots.forEach(d => d.classList.remove('tl-neck-active'));
    if (_seqBtn) {
      _seqBtn.textContent = _seqBtn.dataset.playLabel || '▶ נגן';
      _seqBtn.classList.remove('playing');
    }
    _seqBtn = null;
    unregisterLoop();
  }

  function stop() { stopPicking(); stopSeq(); }

  /* ============================================================
     דיאגרמת אקורד אנכית — 4 מיתרים, אוריינטציה D A F C (כמו chord-tooltip)
     shape = frets array [C,F,A,D] (index0=C). מוצג משמאל לימין: D A F C
     ============================================================ */
  function buildChordDiagram(chord) {
    // המרת frets [C,F,A,D] לסדר תצוגה D A F C (גבוה→נמוך, שמאל→ימין)
    const fretsCFAD = Array.isArray(chord.frets) ? chord.frets : [0, 0, 0, 0];
    // עמודות תצוגה: [D, A, F, C] => fretsCFAD index [3,2,1,0]
    const cols = [3, 2, 1, 0];
    const colLabels = ['D', 'A', 'F', 'C'];

    // קבע טווח סריגים. תמיכה בערכי בארה 'B' / 'B-1' (לא מספריים) — נסמן כ-? ולא נצייר נקודה
    const numericFrets = fretsCFAD.filter(f => typeof f === 'number' && f > 0);
    const maxFret = numericFrets.length ? Math.max(...numericFrets) : 0;
    const numFrets = Math.max(5, Math.min(maxFret + 1, 7));

    const strW = 30, frH = 30, padT = 40, padL = 30, padR = 16, padB = 14;
    const w = padL + strW * 3 + padR;
    const h = padT + frH * numFrets + padB;

    const svg = svgEl('svg', { class: 'tl-chord-svg', viewBox: `0 0 ${w} ${h}`, role: 'img' });

    // שם אקורד
    svgEl('text', {
      x: w / 2, y: 18, fill: 'var(--gold-soft)', 'font-size': 16, 'font-weight': 800,
      'text-anchor': 'middle', 'font-family': 'Heebo,sans-serif',
    }, svg).textContent = chord.name || '';

    // מיתרים אנכיים + תוויות מיתר למעלה
    for (let i = 0; i < 4; i++) {
      const x = padL + i * strW;
      svgEl('line', { x1: x, y1: padT, x2: x, y2: padT + frH * numFrets, stroke: '#8fa6bc', 'stroke-width': 1.2 }, svg);
      svgEl('text', {
        x, y: h - 2, fill: 'var(--text-dim)', 'font-size': 11, 'font-weight': 700,
        'text-anchor': 'middle', 'font-family': 'Heebo,sans-serif',
      }, svg).textContent = colLabels[i];
    }

    // אגוז (nut)
    svgEl('line', { x1: padL - 3, y1: padT, x2: padL + strW * 3 + 3, y2: padT, stroke: '#e8d9b0', 'stroke-width': 4 }, svg);
    // סריגים
    for (let f = 1; f <= numFrets; f++) {
      svgEl('line', { x1: padL, y1: padT + f * frH, x2: padL + strW * 3, y2: padT + f * frH, stroke: '#3b566f', 'stroke-width': 1 }, svg);
    }
    // מספרי סריג בצד
    for (let f = 1; f <= numFrets; f++) {
      svgEl('text', {
        x: padL + strW * 3 + 9, y: padT + (f - 0.5) * frH + 4, fill: '#5a708a',
        'font-size': 9, 'text-anchor': 'middle', 'font-family': 'monospace',
      }, svg).textContent = f;
    }

    const dots = []; // {el, courseIdx, fret}
    cols.forEach((cfadIdx, col) => {
      const x = padL + col * strW;
      const fret = fretsCFAD[cfadIdx];
      const courseIdx = col; // עמודה 0=D=>course0, 1=A=>1, 2=F=>2, 3=C=>3

      if (fret === 'x') {
        svgEl('text', {
          x, y: padT - 8, fill: '#d96459', 'font-size': 14, 'font-weight': 800,
          'text-anchor': 'middle', 'font-family': 'Heebo,sans-serif',
        }, svg).textContent = '×';
        return;
      }
      if (typeof fret !== 'number') {
        // ערך בארה לא-מספרי (למשל 'B' / 'B-1') — סמן בסימן שאלה מעל
        svgEl('text', {
          x, y: padT - 8, fill: 'var(--gold)', 'font-size': 12, 'font-weight': 800,
          'text-anchor': 'middle', 'font-family': 'monospace',
        }, svg).textContent = String(fret);
        return;
      }
      if (fret === 0) {
        const o = svgEl('circle', { cx: x, cy: padT - 10, r: 5, fill: 'none', stroke: '#5fc88f', 'stroke-width': 1.6, class: 'tl-dot tl-open' }, svg);
        o.style.cursor = 'pointer';
        o.dataset.course = courseIdx; o.dataset.fret = 0;
        dots.push({ el: o, courseIdx, fret: 0 });
      } else {
        const cy = padT + (Math.min(fret, numFrets) - 0.5) * frH;
        const c = svgEl('circle', { cx: x, cy, r: 9, fill: 'var(--gold)', class: 'tl-dot' }, svg);
        c.style.cursor = 'pointer';
        c.dataset.course = courseIdx; c.dataset.fret = fret;
        const t = svgEl('text', {
          x, y: cy + 3.5, fill: '#1a1408', 'font-size': 10, 'font-weight': 800,
          'text-anchor': 'middle', 'font-family': 'Heebo,sans-serif',
        }, svg);
        t.style.pointerEvents = 'none';
        t.textContent = fret;
        dots.push({ el: c, courseIdx, fret });
      }
    });

    // נגינת מיתר בודד בלחיצה על נקודה
    dots.forEach(d => {
      d.el.addEventListener('click', (e) => {
        e.stopPropagation();
        ensureAudio();
        if (typeof AudioEngine !== 'undefined' && AudioEngine.pluckCourse) {
          AudioEngine.pluckCourse(d.courseIdx, d.fret, 0, 0.55);
        }
        flashDot(d.el);
      });
    });

    return { svg, dots };
  }

  function flashDot(el) {
    if (!el) return;
    el.classList.add('tl-dot-flash');
    setTimeout(() => el.classList.remove('tl-dot-flash'), 230);
  }

  /* ---------- כרטיס אקורד ---------- */
  function buildChordCard(chord) {
    const card = document.createElement('div');
    card.className = 'tl-chord-card';

    // כותרת
    const head = document.createElement('div');
    head.className = 'tl-chord-head';
    const titles = [];
    if (chord.nameHe) titles.push(chord.nameHe);
    if (chord.nameGr) titles.push(`<span class="tl-chord-gr">${chord.nameGr}</span>`);
    head.innerHTML = `<div class="tl-chord-name">${chord.name || ''}</div>
      <div class="tl-chord-subnames">${titles.join(' · ')}</div>`;
    card.appendChild(head);

    // דיאגרמה
    const diaWrap = document.createElement('div');
    diaWrap.className = 'tl-chord-dia';
    const { svg, dots } = buildChordDiagram(chord);
    diaWrap.appendChild(svg);
    card.appendChild(diaWrap);

    // כפתורי נגינה
    const btns = document.createElement('div');
    btns.className = 'tl-chord-btns';

    const hasPlayable = Array.isArray(chord.frets) &&
      chord.frets.some(f => typeof f === 'number');

    if (hasPlayable) {
      const bChord = mkBtn('🔊 אקורד', () => {
        ensureAudio();
        if (AudioEngine.strumChord) AudioEngine.strumChord(chord.frets, 'd');
      });
      const bDown = mkBtn('↓ למטה', () => {
        ensureAudio();
        if (AudioEngine.strumChord) AudioEngine.strumChord(chord.frets, 'd');
      });
      const bUp = mkBtn('↑ למעלה', () => {
        ensureAudio();
        if (AudioEngine.strumChord) AudioEngine.strumChord(chord.frets, 'u');
      });
      const bArp = mkBtn('🎵 תו אחר תו', () => playArpeggio(chord, dots));
      btns.append(bChord, bDown, bUp, bArp);
    } else {
      const note = document.createElement('span');
      note.className = 'tl-chord-note-muted';
      note.textContent = 'צורת בארה ניידת — ראו מיקומים למטה';
      btns.appendChild(note);
    }
    card.appendChild(btns);

    // מיקומי בארה (צורות ניידות)
    if (chord.moveable && Array.isArray(chord.positions) && chord.positions.length) {
      const pos = document.createElement('div');
      pos.className = 'tl-chord-positions';
      pos.innerHTML = '<b>מיקומים:</b> ' + chord.positions.map(p =>
        `<span class="tl-pos-chip">סריג ${p.fret}: ${p.chord}${p.he ? ` (${p.he})` : ''}</span>`
      ).join(' ');
      card.appendChild(pos);
    }

    // טקסטים
    if (chord.fingers) card.appendChild(infoLine('🖐️', chord.fingers));
    if (chord.usage) card.appendChild(infoLine('🎼', chord.usage));
    if (chord.notes) card.appendChild(infoLine('🎶', chord.notes));

    // תגי דרומוס
    if (Array.isArray(chord.dromos) && chord.dromos.length) {
      const tags = document.createElement('div');
      tags.className = 'tl-chord-tags';
      tags.innerHTML = chord.dromos.map(d => `<span class="tl-tag">${d}</span>`).join('');
      card.appendChild(tags);
    }

    return card;
  }

  function infoLine(icon, text) {
    const d = document.createElement('div');
    d.className = 'tl-info-line';
    d.innerHTML = `<span class="tl-info-ico">${icon}</span><span>${text}</span>`;
    return d;
  }

  function mkBtn(label, onClick) {
    const b = document.createElement('button');
    b.className = 'btn small tl-btn';
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---------- ארפג'ו: תו אחר תו, שמאל→ימין (D,A,F,C) ---------- */
  function playArpeggio(chord, dots) {
    ensureAudio();
    if (typeof AudioEngine === 'undefined' || !AudioEngine.pluckCourse) return;
    // סדר השמעה: עמודות תצוגה D,A,F,C => fretsCFAD index 3,2,1,0
    const order = [3, 2, 1, 0];
    const gapMs = 280;
    let step = 0;
    order.forEach(cfadIdx => {
      const fret = chord.frets[cfadIdx];
      if (fret === 'x' || typeof fret !== 'number') return;
      const courseIdx = 3 - cfadIdx; // 3-3=0(D),3-2=1(A),3-1=2(F),3-0=3(C)
      const offset = step * gapMs;
      AudioEngine.pluckCourse(courseIdx, fret, now() + offset / 1000, 0.55);
      // הדגשה ויזואלית של הנקודה התואמת
      const dot = dots.find(d => d.courseIdx === courseIdx);
      if (dot) setTimeout(() => flashDot(dot.el), offset);
      step++;
    });
  }

  /* ============================================================
     תרגיל פריטה — כרטיס עם רצועת מהלכים + נגן לולאה
     ============================================================ */
  function getPattern(ex) {
    if (Array.isArray(ex.pattern) && ex.pattern.length) {
      return ex.pattern.map(normToken);
    }
    if (typeof ex.strokes === 'string' && ex.strokes.trim()) {
      return ex.strokes.trim().split(/\s+/).map(normToken).filter(t => t);
    }
    return null;
  }
  // ניקוי תוויות עם הערות בסוגריים, למשל 'D(bass)' -> 'D'
  function normToken(t) {
    const s = String(t).trim();
    const m = s.match(/^([DduU\-·])/);
    return m ? m[1].replace('·', '-') : '-';
  }

  function buildPickCard(ex) {
    const card = document.createElement('div');
    card.className = 'dlc-ex-card tl-pick-card';

    const head = document.createElement('div');
    head.className = 'dlc-ex-name';
    head.innerHTML = `${ex.name || 'תרגיל'} ${ex.bpm ? `<span class="dlc-ex-bpm">${ex.bpm} BPM</span>` : ''}`;
    card.appendChild(head);

    if (ex.desc) {
      const desc = document.createElement('div');
      desc.className = 'dlc-ex-desc';
      desc.textContent = ex.desc;
      card.appendChild(desc);
    }
    if (ex.notation) {
      const nt = document.createElement('div');
      nt.className = 'tl-pick-notation';
      nt.dir = 'ltr';
      nt.textContent = ex.notation;
      card.appendChild(nt);
    }

    const pattern = getPattern(ex);

    // רצועת מהלכים (renderStrokeStrip דורס className — לכן עוטפים בקופסה)
    let stripEl = null;
    if (pattern && typeof PeniaVisuals !== 'undefined' && PeniaVisuals.renderStrokeStrip) {
      const stripWrap = document.createElement('div');
      stripWrap.className = 'tl-pick-strip';
      stripEl = document.createElement('div');
      PeniaVisuals.renderStrokeStrip(stripEl, pattern);
      stripWrap.appendChild(stripEl);
      card.appendChild(stripWrap);
    }

    if (ex.stringsUsed) card.appendChild(metaLine('מיתרים', ex.stringsUsed));
    if (ex.focus) {
      const f = document.createElement('div');
      f.className = 'dlc-ex-focus';
      f.textContent = '🎯 ' + ex.focus;
      card.appendChild(f);
    }
    if (ex.tab) {
      const tab = document.createElement('div');
      tab.className = 'dlc-ex-tab';
      tab.dir = 'ltr';
      tab.textContent = ex.tab;
      card.appendChild(tab);
    }

    // כפתור נגן/עצור
    if (pattern && pattern.length) {
      const btn = document.createElement('button');
      btn.className = 'btn small tl-play-btn';
      btn.dataset.playLabel = '▶ נגן';
      btn.textContent = '▶ נגן';
      btn.addEventListener('click', () => {
        if (_pickBtnEl === btn) { stopPicking(); return; }
        startPicking(pattern, ex.bpm || 60, btn, stripEl);
      });
      card.appendChild(btn);
    }

    return card;
  }

  function metaLine(label, val) {
    const d = document.createElement('div');
    d.className = 'tl-pick-meta';
    d.innerHTML = `<b>${label}:</b> ${val}`;
    return d;
  }

  /* ---------- נגן לולאה של תבנית פריטה ---------- */
  function startPicking(pattern, bpm, btn, stripEl) {
    stopPicking(); // עצור כל נגן קודם
    ensureAudio();
    _pickBtnEl = btn;
    btn.textContent = '■ עצור';
    btn.classList.add('playing');
    _pickCells = stripEl ? Array.from(stripEl.querySelectorAll('.psm-cell')) : null;

    const stepMs = (60 / Math.max(30, bpm)) * 1000 / 2; // שמיניות
    let i = 0;

    const tick = () => {
      // הדגשה
      if (_pickCells) {
        _pickCells.forEach(c => c.classList.remove('tl-stroke-active'));
        const cell = _pickCells[i % _pickCells.length];
        if (cell) cell.classList.add('tl-stroke-active');
      }
      const tok = pattern[i % pattern.length];
      if (typeof AudioEngine !== 'undefined' && AudioEngine.pluckCourse) {
        if (tok === 'D') AudioEngine.pluckCourse(0, 0, 0, 0.6);        // למטה מודגש
        else if (tok === 'd') AudioEngine.pluckCourse(0, 0, 0, 0.42);  // למטה רגיל
        else if (tok === 'u') AudioEngine.pluckCourse(0, 0, 0, 0.28);  // למעלה קל
        else if (tok === 'U') AudioEngine.pluckCourse(0, 0, 0, 0.4);   // למעלה מודגש
        // '-' = שתיקה
      }
      i++;
    };

    tick();
    _pickTimer = setInterval(tick, stepMs);
    registerLoop();
  }

  /* ============================================================
     רינדור ראשי
     ============================================================ */
  function init() {
    const el = document.querySelector('#theory-lab-app');
    if (!el) return;
    render(el);
  }

  function render(el) {
    stopPicking();
    el.innerHTML = '';
    const edu = (typeof EDUCATION_CONTENT !== 'undefined') ? EDUCATION_CONTENT : null;

    // אינטרו
    const intro = document.createElement('div');
    intro.className = 'card tl-intro';
    const chordIntro = edu && edu.chordCurriculum && edu.chordCurriculum.intro;
    intro.innerHTML = `
      <h2>חומר עיוני — רואים, לוחצים, שומעים</h2>
      <p>${chordIntro ? chordIntro.he : 'אקורדים וצורות פריטה לבוזוקי בכיוונון C-F-A-D.'}</p>
      <p class="tl-intro-hint">לחצו על נקודה בדיאגרמה כדי לשמוע מיתר בודד · "תו אחר תו" מנגן את האקורד מצליל לצליל</p>`;
    el.appendChild(intro);

    // טאבים
    const tabs = document.createElement('div');
    tabs.className = 'tl-tabs';
    const tabChords = mkTab('🎸 אקורדים', 'chords');
    const tabNeck = mkTab('🗺️ דרומוס על הגריף', 'neck');
    const tabPenia = mkTab('🤘 פנייה ופריטה', 'penia');
    tabs.append(tabChords, tabNeck, tabPenia);
    el.appendChild(tabs);

    const body = document.createElement('div');
    body.className = 'tl-body';
    el.appendChild(body);

    function mkTab(label, id) {
      const b = document.createElement('button');
      b.className = 'tl-tab' + (_activeTab === id ? ' active' : '');
      b.textContent = label;
      b.dataset.tab = id;
      b.addEventListener('click', () => {
        if (_activeTab === id) return;
        _activeTab = id;
        stopPicking();
        tabs.querySelectorAll('.tl-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === id));
        renderBody(body, edu);
      });
      return b;
    }

    renderBody(body, edu);
  }

  function renderBody(body, edu) {
    body.innerHTML = '';
    if (_activeTab === 'chords') renderChords(body, edu);
    else if (_activeTab === 'neck') renderDromoi(body, edu);
    else renderPenia(body, edu);
  }

  /* ---------- טאב אקורדים ---------- */
  function renderChords(body, edu) {
    const cc = edu && edu.chordCurriculum;
    if (!cc || !Array.isArray(cc.groups)) {
      body.innerHTML = '<div class="card">אין תוכן אקורדים.</div>';
      return;
    }
    cc.groups.forEach(group => {
      const sec = document.createElement('div');
      sec.className = 'card tl-group';
      const titleGr = group.titleGr ? `<span class="tl-group-gr">${group.titleGr}</span>` : '';
      sec.innerHTML = `<h2 class="tl-group-title">${group.title || ''} ${titleGr}</h2>
        ${group.desc ? `<p class="tl-group-desc">${group.desc}</p>` : ''}`;

      // קבוצות אקורדים רגילות
      if (Array.isArray(group.chords) && group.chords.length) {
        const grid = document.createElement('div');
        grid.className = 'tl-chord-grid';
        group.chords.forEach(ch => grid.appendChild(buildChordCard(ch)));
        sec.appendChild(grid);
      }

      // קבוצת פרוגרסיות (chords-progressions) — אין shapes, רק רצפים
      if (Array.isArray(group.progressions) && group.progressions.length) {
        const list = document.createElement('div');
        list.className = 'dlc-prog-list';
        group.progressions.forEach(p => {
          const item = document.createElement('div');
          item.className = 'dlc-prog-item tl-prog-item';
          const chordsStr = Array.isArray(p.chords) ? p.chords.join(' → ') : '';
          item.innerHTML = `
            <div class="dlc-prog-name">${p.name || ''}${p.nameEn ? ` <small>(${p.nameEn})</small>` : ''}</div>
            <div class="dlc-prog-chords" dir="ltr">${chordsStr}</div>
            ${p.desc ? `<div class="dlc-prog-desc">${p.desc}</div>` : ''}
            ${p.usage ? `<div class="tl-prog-usage">${p.usage}</div>` : ''}`;
          // כפתור נגינת הרצף
          if (Array.isArray(p.chords) && p.chords.length) {
            const btn = mkBtn('🔊 נגן רצף', () => playProgression(p.chords));
            item.appendChild(btn);
          }
          list.appendChild(item);
        });
        sec.appendChild(list);
      }

      body.appendChild(sec);
    });
  }

  // נגינת רצף אקורדים לפי שמות (נשען על CHORDS אם קיים, אחרת מדלג)
  function playProgression(names) {
    ensureAudio();
    if (typeof AudioEngine === 'undefined' || !AudioEngine.strumChord) return;
    const gapSec = 0.9;
    names.forEach((nm, i) => {
      const shape = resolveShape(nm);
      if (shape) AudioEngine.strumChord(shape, 'd', now() + 0.05 + i * gapSec, 0.5);
    });
  }

  // מצא frets array לאקורד לפי שם — מחפש ב-chordCurriculum, ואז ב-CHORDS
  let _shapeIndex = null;
  function resolveShape(name) {
    if (!_shapeIndex) {
      _shapeIndex = {};
      try {
        EDUCATION_CONTENT.chordCurriculum.groups.forEach(g => {
          (g.chords || []).forEach(c => {
            if (c.name && Array.isArray(c.frets)) _shapeIndex[c.name] = c.frets;
          });
        });
      } catch (_) {}
    }
    if (_shapeIndex[name]) return _shapeIndex[name];
    // נסה CHORDS (סדר shape שלהם זהה: [C,F,A,D])
    if (typeof CHORDS !== 'undefined') {
      const key = (typeof ChordTooltip !== 'undefined' && ChordTooltip.resolveKey)
        ? ChordTooltip.resolveKey(name) : (CHORDS[name] ? name : null);
      if (key && CHORDS[key] && Array.isArray(CHORDS[key].shape)) return CHORDS[key].shape;
    }
    return null;
  }

  /* ---------- טאב פנייה ופריטה ---------- */
  function renderPenia(body, edu) {
    const pc = edu && edu.peniaCurriculum;
    if (!pc) {
      body.innerHTML = '<div class="card">אין תוכן פנייה.</div>';
      return;
    }

    if (pc.intro) {
      const introCard = document.createElement('div');
      introCard.className = 'card tl-penia-intro';
      introCard.innerHTML = `<p>${pc.intro.he || ''}</p>`;
      body.appendChild(introCard);
    }

    // מדריך יד ימין
    if (pc.rightHandGuide && Array.isArray(pc.rightHandGuide.sections)) {
      const g = pc.rightHandGuide;
      const guide = document.createElement('div');
      guide.className = 'card tl-rh-guide';
      guide.innerHTML = `<h2 class="tl-group-title">${g.title || 'מדריך יד ימין'}</h2>`;
      g.sections.forEach(s => {
        const block = document.createElement('div');
        block.className = 'tl-rh-section';
        block.innerHTML = `<h3 class="tl-rh-section-title">${s.title || ''}</h3>
          <ul class="tl-rh-points">${(s.points || []).map(p => `<li>${p}</li>`).join('')}</ul>`;
        guide.appendChild(block);
      });
      body.appendChild(guide);
    }

    // רמות עם תרגילים
    if (Array.isArray(pc.levels)) {
      pc.levels.forEach(level => {
        const sec = document.createElement('div');
        sec.className = 'card tl-level';
        const gr = level.titleGr ? `<span class="tl-group-gr">${level.titleGr}</span>` : '';
        sec.innerHTML = `<h2 class="tl-group-title">${level.title || ''} ${gr}</h2>
          ${level.focus ? `<p class="tl-level-focus">🎯 ${level.focus}</p>` : ''}
          ${level.theory ? `<p class="tl-group-desc">${level.theory}</p>` : ''}`;

        if (Array.isArray(level.exercises) && level.exercises.length) {
          const grid = document.createElement('div');
          grid.className = 'dlc-ex-grid tl-pick-grid';
          level.exercises.forEach(ex => grid.appendChild(buildPickCard(ex)));
          sec.appendChild(grid);
        }
        body.appendChild(sec);
      });
    }
  }

  /* ============================================================
     טאב: דרומוס על הגריף — איך הדרומוס יושב על כל המיתרים
     מיתרים מסודרים מלמעלה למטה: C · F · A · D (מיתר 1 = D בתחתית).
     מסלול נגינה ממוספר שעולה מהמיתר העבה עד המיתר הראשון.
     ============================================================ */
  const ROOT_PC = 2;            // D = הטוניקה המקובלת על הבוזוקי
  const NECK_FRETS = 12;        // כמה סריגים להציג
  const POS_SPAN = 4;           // רוחב חלון הפוזיציה (יד אחת)
  // סדר תצוגה מלמעלה למטה: C(course3) F(course2) A(course1) D(course0)
  const ROW_COURSES = [3, 2, 1, 0];

  // אילו מיתרים פעילים בכל מצב (מהנמוך לגבוה בגובה צליל — לבניית מסלול עולה)
  // 2: A,D · 3: F,A,D · 4: C,F,A,D
  const MODE_COURSES = {
    '2': [1, 0],
    '3': [2, 1, 0],
    '4': [3, 2, 1, 0],
  };
  const MODE_LABELS = {
    '2': '🎻 2 מיתרים', '3': '🪕 3 מיתרים', '4': '🎸 4 מיתרים',
  };

  function scalePcs(dromos) {
    const set = new Set((dromos.intervals || []).map(iv => ((ROOT_PC + iv) % 12 + 12) % 12));
    return set;
  }

  // בונה מסלול נגינה עולה ורציף על מספר המיתרים הפעילים שבמצב.
  // עוברים מהמיתר הנמוך לגבוה, ובכל מיתר מוסיפים צלילי-סולם בחלון הפוזיציה,
  // תוך שמירה על עלייה בגובה — כך נוצר מסלול מלודי שעולה עד המיתר הראשון (D).
  function buildPositionPath(dromos, base, mode) {
    const pcs = scalePcs(dromos);
    const courses = MODE_COURSES[mode] || MODE_COURSES['4'];
    // חלון רחב יותר ככל שיש פחות מיתרים, כדי שהמסלול יכסה אוקטבה
    const span = mode === '4' ? POS_SPAN + 1 : mode === '3' ? 6 : 7;
    const path = [];
    let lastMidi = -Infinity;
    for (const ci of courses) {
      const openMidi = TUNING[ci].midi;
      for (let fret = base; fret <= base + span && fret <= NUM_FRETS; fret++) {
        if (fret < 0) continue;
        const midi = openMidi + fret;
        const pc = ((midi % 12) + 12) % 12;
        if (!pcs.has(pc)) continue;
        if (midi <= lastMidi) continue;       // רק עלייה — מסלול מלודי רציף
        path.push({ ci, fret });
        lastMidi = midi;
      }
    }
    return path;
  }

  function drawDromosNeck(dromos, base, mode) {
    const pcs = scalePcs(dromos);
    const path = buildPositionPath(dromos, base, mode);
    const inPath = new Set(path.map(p => p.ci + '-' + p.fret));
    const activeCourses = new Set(MODE_COURSES[mode] || MODE_COURSES['4']);

    const padL = 60, padR = 14, padT = 16, padB = 26;
    const fretW = 46, rowH = 44;
    const w = padL + fretW * NECK_FRETS + padR;
    const h = padT + rowH * 3 + padB;

    const svg = svgEl('svg', { class: 'tl-neck-svg', viewBox: `0 0 ${w} ${h}`, role: 'img' });

    // רקע עץ
    svgEl('rect', { x: padL - 6, y: padT - 6, width: fretW * NECK_FRETS + 12, height: rowH * 3 + 12, rx: 6, fill: '#2b2014', stroke: '#1a120a', 'stroke-width': 1.5 }, svg);

    // הדגשת המיתרים הפעילים כשלא כל 4 פעילים
    if (mode !== '4') {
      ROW_COURSES.forEach((ci, row) => {
        if (!activeCourses.has(ci)) return;
        svgEl('rect', { x: padL - 6, y: padT + row * rowH - rowH / 2 + 6, width: fretW * NECK_FRETS + 12, height: rowH, fill: '#e3b341', opacity: 0.1 }, svg);
      });
    }

    // אינליי נקודות
    [3, 5, 7, 12].forEach(f => {
      if (f > NECK_FRETS) return;
      const cx = padL + (f - 0.5) * fretW;
      svgEl('circle', { cx, cy: padT + rowH * 1.5, r: 4, fill: '#d8c9a0', opacity: 0.35 }, svg);
    });

    // סריגים אנכיים + מספרים
    for (let f = 0; f <= NECK_FRETS; f++) {
      const x = padL + f * fretW;
      svgEl('line', { x1: x, y1: padT - 4, x2: x, y2: padT + rowH * 3 + 4, stroke: f === 0 ? '#e8d9b0' : '#8a8378', 'stroke-width': f === 0 ? 5 : 1.4, opacity: f === 0 ? 1 : 0.6 }, svg);
      if (f > 0) {
        svgEl('text', { x: padL + (f - 0.5) * fretW, y: h - 8, fill: '#7d92a8', 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'Heebo,sans-serif' }, svg).textContent = f;
      }
    }

    _seqDots = [];
    const dotByKey = {};

    ROW_COURSES.forEach((ci, row) => {
      const y = padT + row * rowH;
      // קו מיתר
      svgEl('line', { x1: padL - 4, y1: y, x2: w - padR, y2: y, stroke: '#b8b0a0', 'stroke-width': 1 + (3 - row) * 0.5, opacity: 0.85 }, svg);
      // תווית מיתר (note + מספר מיתר)
      const stringNo = TUNING[ci].course; // 1=D ... 4=C
      svgEl('text', { x: 30, y: y - 4, fill: '#e3b341', 'font-size': 15, 'font-weight': 800, 'text-anchor': 'middle', 'font-family': 'Heebo,sans-serif' }, svg).textContent = TUNING[ci].note;
      svgEl('text', { x: 30, y: y + 11, fill: '#7d92a8', 'font-size': 9, 'text-anchor': 'middle', 'font-family': 'Heebo,sans-serif' }, svg).textContent = 'מיתר ' + stringNo;

      // צלילי הסולם על המיתר
      const openMidi = TUNING[ci].midi;
      for (let f = 0; f <= NECK_FRETS; f++) {
        const midi = openMidi + f;
        const pc = ((midi % 12) + 12) % 12;
        if (!pcs.has(pc)) continue;
        const cx = f === 0 ? padL - 22 : padL + (f - 0.5) * fretW;
        const isRoot = pc === ROOT_PC;
        const isIn = inPath.has(ci + '-' + f);
        const dim = (mode !== '4' && !activeCourses.has(ci));   // מיתר לא-פעיל במצב מצומצם
        const g = svgEl('g', { class: 'tl-neck-dot', style: 'cursor:pointer' }, svg);
        svgEl('circle', {
          cx, cy: y, r: isIn ? 12 : 9,
          fill: isRoot ? '#e3b341' : '#2a7fa8',
          stroke: isRoot ? '#fff0c8' : '#7fd0ef',
          'stroke-width': isIn ? 2 : 1.2,
          opacity: isIn ? 1 : (dim ? 0.12 : 0.32),
        }, g);
        const lbl = SOLFEGE[NOTE_NAMES[pc]] || NOTE_NAMES[pc];
        svgEl('text', {
          x: cx, y: y + 3.5, fill: isRoot ? '#1a1408' : '#eaf6fc',
          'font-size': 9.5, 'font-weight': 700, 'text-anchor': 'middle',
          'font-family': 'Heebo,sans-serif', opacity: isIn ? 1 : (dim ? 0.18 : 0.5),
          style: 'pointer-events:none',
        }, g).textContent = lbl;
        g.addEventListener('click', () => {
          ensureAudio();
          if (AudioEngine.pluckCourse) AudioEngine.pluckCourse(ci, f, 0, 0.55);
          flashNeckDot(g);
        });
        _seqDots.push(g);
        dotByKey[ci + '-' + f] = g;
      }
    });

    // קו מחבר את מסלול הפוזיציה + מספור סדר נגינה
    if (path.length) {
      const pts = path.map(p => {
        const row = ROW_COURSES.indexOf(p.ci);
        const x = p.fret === 0 ? padL - 22 : padL + (p.fret - 0.5) * fretW;
        const y = padT + row * rowH;
        return { x, y };
      });
      const poly = pts.map(pt => pt.x + ',' + pt.y).join(' ');
      svgEl('polyline', { points: poly, fill: 'none', stroke: '#f0cc74', 'stroke-width': 2, 'stroke-dasharray': '4 3', opacity: 0.7 }, svg);
      pts.forEach((pt, i) => {
        svgEl('text', { x: pt.x + 11, y: pt.y - 10, fill: '#f0cc74', 'font-size': 10, 'font-weight': 800, 'text-anchor': 'middle', 'font-family': 'monospace', style: 'pointer-events:none' }, svg).textContent = i + 1;
      });
    }

    return { svg, path, dotByKey };
  }

  function flashNeckDot(g) {
    if (!g) return;
    g.classList.add('tl-neck-active');
    setTimeout(() => g.classList.remove('tl-neck-active'), 260);
  }

  // נגן רצף [{ci,fret}] — צליל אחרי צליל, מדגיש כל נקודה
  function playPath(path, dotByKey, bpm, btn) {
    stop();
    ensureAudio();
    if (!Array.isArray(path) || !path.length) return;
    _seqBtn = btn;
    if (btn) { btn.textContent = '■ עצור'; btn.classList.add('playing'); }
    const stepMs = Math.max(180, (60 / Math.max(40, bpm || 90)) * 1000);
    let i = 0;
    const tick = () => {
      _seqDots && _seqDots.forEach(d => d.classList.remove('tl-neck-active'));
      const p = path[i % path.length];
      if (AudioEngine.pluckCourse) AudioEngine.pluckCourse(p.ci, p.fret, 0, 0.55);
      const g = dotByKey && dotByKey[p.ci + '-' + p.fret];
      if (g) g.classList.add('tl-neck-active');
      i++;
      if (i >= path.length) {                 // מעבר אחד עולה ואז עצירה
        clearInterval(_seqTimer); _seqTimer = null;
        setTimeout(() => stopSeq(), stepMs);
      }
    };
    tick();
    _seqTimer = setInterval(tick, stepMs);
    registerLoop();
  }

  /* ---------- פירוק הדרומוס לג'ינסים (טטרקורדים) ---------- */
  const JINS_NAMES = {
    '1,3,1': 'חיג׳אז', '2,2,1': 'ראסט / מז׳ור', '2,1,2': 'ניהאוונד / מינור',
    '1,2,2': 'כורד', '2,2,2': 'מוגבר (טונים שלמים)', '2,1,3': 'ניקריז',
    '3,1,1': 'חיג׳אז הפוך', '1,2,1': 'סabah', '2,3,1': 'מוסתאר',
  };
  function stepName(s) {
    return s === 1 ? '½' : s === 2 ? '1' : s === 3 ? '1½' : (s / 2).toString();
  }
  function noteAt(iv) { return SOLFEGE[NOTE_NAMES[(ROOT_PC + iv) % 12]] || NOTE_NAMES[(ROOT_PC + iv) % 12]; }

  function dromosComposition(dromos) {
    const ivs = (dromos.intervals || []).slice();
    if (ivs.length < 5) return null;
    const full = ivs.concat([12]);
    const steps = [];
    for (let i = 0; i < full.length - 1; i++) steps.push(full[i + 1] - full[i]);
    const lowerSteps = steps.slice(0, 3);
    const upperSteps = steps.slice(4, 7);
    const lowerKey = lowerSteps.join(',');
    const upperKey = upperSteps.join(',');
    const lowerNotes = [0, 1, 2, 3].map(i => ivs[i] != null ? noteAt(ivs[i]) : '').filter(Boolean);
    const upperNotes = [4, 5, 6].map(i => ivs[i] != null ? noteAt(ivs[i]) : '').concat(['רה']);
    // המרווח המאפיין = הגדול ביותר (לרוב טון וחצי / מוגדל)
    let charIdx = -1, charMax = 0;
    steps.forEach((s, i) => { if (s > charMax) { charMax = s; charIdx = i; } });
    const charInterval = charMax >= 3
      ? { from: noteAt(ivs[charIdx]), to: noteAt(full[charIdx + 1] === 12 ? 0 : full[charIdx + 1]), size: charMax }
      : null;
    return {
      lowerNotes, lowerJins: JINS_NAMES[lowerKey] || ('תבנית ' + lowerSteps.map(stepName).join('-')),
      upperNotes, upperJins: JINS_NAMES[upperKey] || ('תבנית ' + upperSteps.map(stepName).join('-')),
      connector: steps[3] != null ? stepName(steps[3]) : null,
      stepsText: steps.map(stepName).join(' · '),
      charInterval,
    };
  }

  function dromosExercises(dromos, comp) {
    const bpm = dromos.bpmRange ? dromos.bpmRange[0] : 60;
    const list = [
      `נגנו את המסלול עולה ויורד 4 פעמים, ♩=${bpm}. דייקו בכל מעבר בין מיתרים.`,
      'מצאו את הטוניקה (רה האדומה) בכל ארבעת המיתרים — נגנו רק אותה.',
      'נגנו רק את 4 הצלילים הראשונים (הג׳ינס התחתון) הלוך ושוב, עד שהם "בגוף".',
    ];
    if (comp && comp.charInterval) {
      list.splice(1, 0, `הדגישו את המרווח המאפיין ${comp.charInterval.from}→${comp.charInterval.to} (טון וחצי) — זה הצבע של הדרומוס.`);
    }
    return list;
  }

  function renderDromoi(body, edu) {
    if (typeof DROMOI === 'undefined' || !Array.isArray(DROMOI) || !DROMOI.length) {
      body.innerHTML = '<div class="card">אין נתוני דרומוסים.</div>';
      return;
    }
    if (!_selDromos || !DROMOI.find(d => d.id === _selDromos)) _selDromos = DROMOI[0].id;

    // הסבר
    const intro = document.createElement('div');
    intro.className = 'card tl-neck-intro';
    intro.innerHTML = `<h2>הדרומוס על הגריף — איפה ללחוץ</h2>
      <p>כל דרומוס פרוס על המיתרים (מלמעלה למטה: <b>C · F · A · D</b>, התחתון = <b>מיתר 1 (D)</b>).
      בחרו על כמה מיתרים לבנות את המסלול: <b>2</b> (A→D), <b>3</b> (F→A→D) או <b>4</b> (C→F→A→D) —
      בכל מצב נבנה מסלול עולה ורציף על המיתרים הפעילים.
      הקו המקווקו והמספרים = סדר הנגינה. נקודה זהובה = הטוניקה. לחצו "נגן מסלול" לשמוע ממש, או על כל נקודה בנפרד.</p>`;
    body.appendChild(intro);

    // בורר דרומוס
    const picker = document.createElement('div');
    picker.className = 'card tl-dromos-picker';
    picker.innerHTML = '<div class="tl-picker-label">בחרו דרומוס:</div>';
    const chips = document.createElement('div');
    chips.className = 'tl-dromos-chips';
    DROMOI.forEach(d => {
      const chip = document.createElement('button');
      chip.className = 'tl-dromos-chip' + (d.id === _selDromos ? ' active' : '');
      chip.textContent = d.nameHe || d.id;
      chip.addEventListener('click', () => {
        if (_selDromos === d.id) return;
        _selDromos = d.id; _posBase = 0; stopSeq();
        renderBody(body, edu);
      });
      chips.appendChild(chip);
    });
    picker.appendChild(chips);
    body.appendChild(picker);

    const dromos = DROMOI.find(d => d.id === _selDromos);

    // כרטיס הגריף
    const card = document.createElement('div');
    card.className = 'card tl-neck-card';

    const head = document.createElement('div');
    head.className = 'tl-neck-head';
    head.innerHTML = `<div class="tl-neck-name">${dromos.nameHe || ''} <span class="tl-chord-gr">${dromos.nameGr || ''}</span></div>
      ${dromos.degrees ? `<div class="tl-neck-degrees" dir="ltr">${dromos.degrees}</div>` : ''}
      ${dromos.mood ? `<div class="tl-neck-mood">${dromos.mood}</div>` : ''}`;
    card.appendChild(head);

    // מתג מצב: 2 / 3 / 4 מיתרים — כל אחד עם המסלול שלו
    const modeWrap = document.createElement('div');
    modeWrap.className = 'tl-pos-row tl-mode-row';
    modeWrap.innerHTML = '<span class="tl-pos-label">מסלול על:</span>';
    [['2', '🎻 2 מיתרים'], ['3', '🪕 3 מיתרים'], ['4', '🎸 4 מיתרים']].forEach(([m, label]) => {
      const mb = document.createElement('button');
      mb.className = 'tl-pos-chip tl-mode-chip' + (m === _neckMode ? ' active' : '');
      mb.textContent = label;
      mb.addEventListener('click', () => {
        if (_neckMode === m) return;
        _neckMode = m; stopSeq();
        renderBody(body, edu);
      });
      modeWrap.appendChild(mb);
    });
    card.appendChild(modeWrap);

    // בורר פוזיציה
    const posWrap = document.createElement('div');
    posWrap.className = 'tl-pos-row';
    posWrap.innerHTML = '<span class="tl-pos-label">פוזיציה (סריג בסיס):</span>';
    [0, 2, 3, 5, 7, 9].forEach(b => {
      const pb = document.createElement('button');
      pb.className = 'tl-pos-chip' + (b === _posBase ? ' active' : '');
      pb.textContent = b === 0 ? 'פתוח' : b;
      pb.addEventListener('click', () => {
        if (_posBase === b) return;
        _posBase = b; stopSeq();
        renderBody(body, edu);
      });
      posWrap.appendChild(pb);
    });
    card.appendChild(posWrap);

    // הגריף עצמו (גלילה אופקית במובייל)
    const scroll = document.createElement('div');
    scroll.className = 'tl-neck-scroll';
    const { svg, path, dotByKey } = drawDromosNeck(dromos, _posBase, _neckMode);
    scroll.appendChild(svg);
    card.appendChild(scroll);

    // כפתורי נגינה
    const btns = document.createElement('div');
    btns.className = 'tl-chord-btns tl-neck-btns';
    const bPath = document.createElement('button');
    bPath.className = 'btn small tl-btn tl-play-btn';
    bPath.dataset.playLabel = '▶ נגן מסלול (עולה למיתר 1)';
    bPath.textContent = bPath.dataset.playLabel;
    const bpm = dromos.bpmRange ? dromos.bpmRange[0] : 90;
    bPath.addEventListener('click', () => {
      if (_seqBtn === bPath) { stopSeq(); return; }
      playPath(path, dotByKey, bpm, bPath);
    });
    btns.appendChild(bPath);

    // נגן הלוך-חזור (עולה ויורד)
    const bRound = document.createElement('button');
    bRound.className = 'btn small tl-btn tl-play-btn';
    bRound.dataset.playLabel = '🔁 נגן הלוך-חזור';
    bRound.textContent = bRound.dataset.playLabel;
    bRound.addEventListener('click', () => {
      if (_seqBtn === bRound) { stopSeq(); return; }
      const round = path.concat(path.slice(0, -1).reverse());
      playPath(round, dotByKey, bpm, bRound);
    });
    btns.appendChild(bRound);

    // נגן סולם על מיתר D בלבד (השוואה / צליל אחיד)
    const bScale = mkBtn('🎵 סולם על מיתר D', () => {
      ensureAudio();
      if (AudioEngine.playModeScale) AudioEngine.playModeScale(dromos.intervals, ROOT_PC, { gain: 0.5 });
    });
    btns.appendChild(bScale);
    card.appendChild(btns);

    if (dromos.tips) card.appendChild(infoLine('💡', dromos.tips));
    if (dromos.chords) card.appendChild(infoLine('🎸', 'אקורדים מתאימים: ' + dromos.chords));

    body.appendChild(card);

    // ממה מורכב הדרומוס — ג'ינסים + תרגילים
    const comp = dromosComposition(dromos);
    const compCard = document.createElement('div');
    compCard.className = 'card tl-comp-card';
    let html = `<h3 class="tl-comp-title">ממה מורכב ${dromos.nameHe || ''}?</h3>`;
    if (comp) {
      html += `<div class="tl-jins">
          <div class="tl-jins-box">
            <div class="tl-jins-label">ג׳ינס תחתון</div>
            <div class="tl-jins-notes">${comp.lowerNotes.join(' · ')}</div>
            <div class="tl-jins-name">${comp.lowerJins}</div>
          </div>
          <div class="tl-jins-link">${comp.connector ? 'חיבור: ' + comp.connector : ''}</div>
          <div class="tl-jins-box">
            <div class="tl-jins-label">ג׳ינס עליון</div>
            <div class="tl-jins-notes">${comp.upperNotes.join(' · ')}</div>
            <div class="tl-jins-name">${comp.upperJins}</div>
          </div>
        </div>
        <div class="tl-steps">מבנה המרווחים: ${comp.stepsText} (בטונים)</div>`;
      if (comp.charInterval) {
        html += `<div class="tl-char-int">🎯 המרווח המאפיין: <b>${comp.charInterval.from}→${comp.charInterval.to}</b> (טון וחצי — הצבע המזרחי)</div>`;
      }
    }
    if (dromos.desc) html += `<p class="tl-comp-desc">${dromos.desc}</p>`;
    // תרגילים
    html += '<h3 class="tl-comp-title" style="margin-top:14px">תרגילים על המסלול</h3><ol class="tl-ex-ol">';
    dromosExercises(dromos, comp).forEach(ex => { html += `<li>${ex}</li>`; });
    html += '</ol>';
    compCard.innerHTML = html;
    body.appendChild(compCard);
  }

  return { init, stop };
})();
