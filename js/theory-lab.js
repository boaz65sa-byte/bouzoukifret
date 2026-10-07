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
  let _neckMode = 4;     // 1–4 מיתרים פעילים
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
    const fretsCFAD = Array.isArray(chord.frets) ? chord.frets : [0, 0, 0, 0];
    const courseOf = [3, 2, 1, 0];
    const svg = svgEl('svg', { class: 'tl-chord-svg', role: 'img', 'aria-label': chord.name || 'אקורד על הצוואר' });
    const markers = [];
    let active = null;
    fretsCFAD.forEach((fret, shapeIdx) => {
      if (typeof fret !== 'number') return;
      const ci = courseOf[shapeIdx];
      const midi = TUNING[ci].midi + fret;
      markers.push({ ci, fret, midi, type: 'chord', label: fret === 0 ? '○' : String(fret) });
      if (!active) active = { ci, fret, midi };
    });
    if (typeof BouzoukiNeck !== 'undefined') {
      BouzoukiNeck.paint(svg, { maxFret: 12, markers, active });
    }
    const dots = [...svg.querySelectorAll('.note-dot')].map(node => ({
      el: node,
      courseIdx: parseInt(node.dataset.course, 10),
      fret: parseInt(node.dataset.fret, 10),
    }));
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
    let dots;
    function redrawDia() {
      diaWrap.innerHTML = '';
      const built = buildChordDiagram(chord);
      dots = built.dots;
      diaWrap.appendChild(built.svg);
    }
    redrawDia();
    card.appendChild(diaWrap);
    if (typeof FretboardMirror !== 'undefined') {
      // חשוב: לא לתלות את הכפתור בתוך diaWrap עצמו — redrawDia() מנקה את ה-innerHTML שלו בכל טוגל
      const mirrorBar = document.createElement('div');
      card.appendChild(mirrorBar);
      FretboardMirror.mountToggle(mirrorBar, { onChange: () => redrawDia() });
    }

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

    const baseStepMs = (60 / Math.max(30, bpm)) * 1000 / 2; // שמיניות
    const stepMs = typeof PlaybackSpeed !== 'undefined' ? PlaybackSpeed.scaleGap(baseStepMs) : baseStepMs;
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

  // אילו מיתרים פעילים — נשען על FretboardScale
  function activeCoursesForMode(mode) {
    const m = Number(mode) || 4;
    if (typeof FretboardScale !== 'undefined' && FretboardScale.coursesForStringMode) {
      return FretboardScale.coursesForStringMode(m);
    }
    const fallback = { 1: [0], 2: [1, 0], 3: [2, 1, 0], 4: [3, 2, 1, 0] };
    return fallback[m] || fallback[4];
  }
  const MODE_LABELS = {
    1: '🎵 מיתר D', 2: '🎻 2 מיתרים', 3: '🪕 3 מיתרים', 4: '🎸 4 מיתרים',
  };

  function scalePcs(dromos) {
    const set = new Set((dromos.intervals || []).map(iv => ((ROOT_PC + iv) % 12 + 12) % 12));
    return set;
  }

  function buildPositionPath(dromos, base, mode) {
    const stringMode = Number(mode) || 4;
    if (typeof FretboardScale !== 'undefined' && FretboardScale.buildScaleDegreePath) {
      const span = FretboardScale.MELODY_POS_SPAN;
      const path = FretboardScale.buildScaleDegreePath(dromos.intervals, ROOT_PC, base, span, stringMode, dromos.id);
      return path.map(p => ({
        ...p,
        isRoot: (p.midi % 12) === ROOT_PC,
      }));
    }
    return [];
  }

  function drawDromosNeck(dromos, base, mode) {
    const pcs = scalePcs(dromos);
    const path = buildPositionPath(dromos, base, mode);
    const inPath = new Set(path.map(p => p.ci + '-' + p.fret));
    const activeCourses = new Set(activeCoursesForMode(mode));

    const markers = [];
    let active = null;
    for (let ci = 0; ci < 4; ci++) {
      if (Number(mode) !== 4 && !activeCourses.has(ci)) continue;
      const openMidi = TUNING[ci].midi;
      for (let f = 0; f <= NECK_FRETS; f++) {
        const midi = openMidi + f;
        const pc = ((midi % 12) + 12) % 12;
        if (!pcs.has(pc)) continue;
        const isRoot = pc === ROOT_PC;
        const isIn = inPath.has(ci + '-' + f);
        const label = isIn
          ? String((path.find(p => p.ci === ci && p.fret === f) || {}).degree || '')
          : (SOLFEGE[NOTE_NAMES[pc]] || NOTE_NAMES[pc]);
        markers.push({
          ci, fret: f, midi,
          type: isRoot ? 'root' : 'note',
          label,
          opacity: isIn ? 1 : 0.45,
          className: 'tl-neck-dot',
        });
        if (isIn && isRoot && !active) active = { ci, fret: f, midi };
      }
    }
    if (!active && path[0]) active = { ci: path[0].ci, fret: path[0].fret, midi: path[0].midi };
    const svg = svgEl('svg', { class: 'tl-neck-svg', role: 'img', 'aria-label': 'דרומוס על צוואר הבוזוקי' });
    if (typeof BouzoukiNeck !== 'undefined') {
      BouzoukiNeck.paint(svg, {
        maxFret: NECK_FRETS,
        markers,
        active,
        onDotClick: (ci, fret) => {
          ensureAudio();
          if (AudioEngine.pluckCourse) AudioEngine.pluckCourse(ci, fret, 0, 0.55);
          const g = dotByKey[ci + '-' + fret];
          if (g) flashNeckDot(g);
        },
      });
    }
    _seqDots = [...svg.querySelectorAll('.tl-neck-dot')];
    const dotByKey = {};
    _seqDots.forEach(g => { dotByKey[g.dataset.course + '-' + g.dataset.fret] = g; });
    if (path.length && typeof FretboardScale !== 'undefined' && FretboardScale.drawPathOverlay) {
      FretboardScale.drawPathOverlay(svg, path, '#f0cc74');
    }

    return { svg, path, dotByKey };
  }

  function flashNeckDot(g) {
    if (!g) return;
    g.classList.add('tl-neck-active');
    setTimeout(() => g.classList.remove('tl-neck-active'), 260);
  }

  // "הכביש" — מסע התחנות מהשורש עד השורש, כל תחנה: דרגה, שם תו, מיתר, סריג.
  // משתמש ב-DromosRoad.buildStripFromRoad המשותף (path כאן ו-road שם מגיעים משניהם מ-
  // FretboardScale.buildScaleDegreePath, אותה צורת נתונים) — מוסיף אגב תצוגת מספר-אצבע
  // שהמימוש העצמאי הישן כאן לא הציג, ושומר על הבהוב-הנקודה-בגריף הייחודי למסך הזה.
  function buildRoadStrip(path, dotByKey, dromos) {
    const wrap = document.createElement('div');
    wrap.className = 'tl-road';
    const head = document.createElement('div');
    head.className = 'tl-road-head';
    head.innerHTML = `🛣️ הכביש של ${dromos.nameHe || 'הדרומוס'} — מ<b>רה</b> ועד <b>רה</b>, תחנה אחר תחנה:`;
    wrap.appendChild(head);

    const strip = DromosRoad.buildStripFromRoad(path, dromos.nameHe, {
      onStopClick: (p) => {
        const g = dotByKey && dotByKey[p.ci + '-' + p.fret];
        if (g) flashNeckDot(g);
      },
    });
    wrap.appendChild(strip.querySelector('.tl-road-track'));
    return wrap;
  }

  // נגן רצף [{ci,fret}] — צליל אחרי צליל, מדגיש כל נקודה
  function playPath(path, dotByKey, bpm, btn) {
    stop();
    ensureAudio();
    if (!Array.isArray(path) || !path.length) return;
    _seqBtn = btn;
    if (btn) { btn.textContent = '■ עצור'; btn.classList.add('playing'); }
    const baseStepMs = Math.max(180, (60 / Math.max(40, bpm || 90)) * 1000);
    const stepMs = typeof PlaybackSpeed !== 'undefined' ? PlaybackSpeed.scaleGap(baseStepMs) : baseStepMs;
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

    // מתג מצב: 1–4 מיתרים
    const modeWrap = document.createElement('div');
    modeWrap.className = 'tl-pos-row tl-mode-row';
    modeWrap.innerHTML = '<span class="tl-pos-label">מסלול על:</span>';
    [1, 2, 3, 4].forEach(m => {
      const mb = document.createElement('button');
      mb.type = 'button';
      mb.className = 'tl-pos-chip tl-mode-chip' + (m === _neckMode ? ' active' : '');
      mb.textContent = MODE_LABELS[m];
      mb.addEventListener('click', () => {
        if (_neckMode === m) return;
        _neckMode = m; stopSeq();
        // מיישר עם שאר המסכים: לבחור בסיס-פוזיציה שבאמת מנצל את מספר המיתרים שנבחר,
        // לא רק להשאיר את הפוזיציה הישנה כמו שהיא (חוסר-עקביות שתועד בעבר).
        if (typeof FretboardScale !== 'undefined' && FretboardScale.findBestPositionForStringMode) {
          _posBase = FretboardScale.findBestPositionForStringMode(dromos.intervals, ROOT_PC, m, [0, 2, 3, 5, 7, 9]);
        }
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
    if (typeof openDromoiForEdit === 'function' && typeof DromosOverrides !== 'undefined') {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'tl-pos-chip tl-edit-btn';
      editBtn.textContent = '✒️ ערוך';
      editBtn.title = 'עריכת פוזיציה/אצבוע במסך הדרומוסים';
      editBtn.addEventListener('click', () => {
        openDromoiForEdit({ dromosId: dromos.id, rootPc: ROOT_PC, posBase: _posBase, stringMode: _neckMode });
      });
      posWrap.appendChild(editBtn);
    }
    card.appendChild(posWrap);

    if (typeof FretboardMirror !== 'undefined') {
      FretboardMirror.mountToggle(card, { onChange: () => renderBody(body, edu) });
    }

    // הגריף עצמו (גלילה אופקית במובייל)
    const scroll = document.createElement('div');
    scroll.className = 'tl-neck-scroll';
    scroll.dir = 'ltr';
    const { svg, path, dotByKey } = drawDromosNeck(dromos, _posBase, _neckMode);
    scroll.appendChild(svg);
    card.appendChild(scroll);

    // הכביש — מסע התחנות מהשורש (רה) עד השורש (רה אוקטבה)
    card.appendChild(buildRoadStrip(path, dotByKey, dromos));

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

    const bScale = mkBtn('🎵 נגן סולם (פוזיציה)', () => {
      ensureAudio();
      if (AudioEngine.playModeScale) {
        AudioEngine.playModeScale(dromos.intervals, ROOT_PC, {
          gain: 0.5, posBase: _posBase, stringMode: _neckMode, dromosId: dromos.id,
        });
      }
    });
    btns.appendChild(bScale);
    card.appendChild(btns);

    if (typeof PlaybackSpeed !== 'undefined') {
      const speedBar = document.createElement('div');
      PlaybackSpeed.mountChips(speedBar);
      card.appendChild(speedBar);
    }

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
