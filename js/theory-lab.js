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

  function stop() { stopPicking(); }

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
    const tabPenia = mkTab('🤘 פנייה ופריטה', 'penia');
    tabs.append(tabChords, tabPenia);
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

  return { init, stop };
})();
