/* ============================================================
   ArpStudio — אולפן ארפג'ו (סגנון Purely Bouzouki)
   נגן רוטינות מקצועי: גריף מתגלגל + TAB, ספריית ארפג'ים,
   בונה שיעור אישי, מטרונום עם אקצנטים, מבחן תזמון עם ניקוד, דוחות.
   כיוונון C-F-A-D. נשען על AudioEngine, drawFretboard, Listen, ProgressLog.
   ============================================================ */
'use strict';

const ArpStudio = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const STORE = 'arp-studio-v1';
  const ROOT_NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_MAP = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };

  /* ---------- מצב ---------- */
  let _sched = null;          // AudioEngine.Scheduler
  let _routine = null;        // { name, notes:[{ci,fret,midi,name,isRoot}] }
  let _bpm = 90;
  let _loop = true;
  let _metOn = false;
  let _accentPattern = [4];   // אורכי קבוצות פעמות מודגשות
  let _settings = { showNext: true, scroll: 'slide', lineColor: '#3a86c8', metSound: 'drum' };
  let _fbSvg = null;
  let _tabCells = [];
  let _draft = { name: '', items: [] };  // בונה שיעור אישי
  let _selGroup = null;
  let _mic = null;            // { ctx, stream, analyser, raf }
  let _timing = { running: false, expected: [], onsets: [], lastRms: 0, sensitivity: 'default' };

  /* ---------- עזרים ---------- */
  function $(sel, root = document) { return root.querySelector(sel); }
  function svgEl(tag, attrs = {}, parent = null) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  }
  function ensureAudio() {
    try { if (typeof AudioEngine !== 'undefined' && AudioEngine.ensureCtx) AudioEngine.ensureCtx(); } catch (_) {}
  }
  function pcOf(name) {
    const m = String(name).trim().match(/^([A-G])([#b]?)/);
    if (!m) return 0;
    let root = m[1] + (m[2] || '');
    if (FLAT_MAP[root]) root = FLAT_MAP[root];
    const i = ROOT_NOTE_NAMES.indexOf(root);
    return i < 0 ? 0 : i;
  }
  function fmtDur(secs) {
    const s = Math.round(secs);
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; }
  }
  function saveStore(s) { try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (_) {} }

  /* ============================================================
     ספריית ארפג'ים — נגזרת מתבניות אקורד על C-F-A-D
     ============================================================ */
  const ARP_TYPES = {
    major: { intervals: [0, 4, 7], suffix: '', he: 'מז׳ור' },
    minor: { intervals: [0, 3, 7], suffix: 'm', he: 'מינור' },
    dom7: { intervals: [0, 4, 7, 10], suffix: '7', he: 'ספטימה' },
  };

  // בונה אצבוע ארפג'ו עולה על כל המיתרים (C→F→A→D), צליל אחר צליל
  function genArp(rootName, type) {
    const t = ARP_TYPES[type] || ARP_TYPES.major;
    const rootPc = pcOf(rootName);
    const chordPcs = t.intervals.map(iv => (rootPc + iv) % 12);
    const notes = [];
    let prevMidi = -1;
    for (let ci = 3; ci >= 0; ci--) {               // C(3) → D(0): עולה למיתר הראשון
      const open = TUNING[ci].midi;
      let best = null;
      for (let f = 0; f <= 9; f++) {
        const midi = open + f;
        const pc = ((midi % 12) + 12) % 12;
        if (!chordPcs.includes(pc)) continue;
        if (midi <= prevMidi) continue;             // חייב לעלות
        if (best === null || midi < best.midi) best = { ci, fret: f, midi };
      }
      if (best) {
        best.name = ROOT_NOTE_NAMES[best.midi % 12];
        best.isRoot = (best.midi % 12) === rootPc;
        notes.push(best);
        prevMidi = best.midi;
      }
    }
    return notes;
  }

  function arpDisplayName(item) {
    const t = ARP_TYPES[item.type] || ARP_TYPES.major;
    return item.name + t.suffix;
  }
  function arpDur(item) {
    const notes = genArp(item.name, item.type);
    return fmtDur(notes.length * (60 / _bpm) * 2); // שתי חזרות
  }

  const ARP_GROUPS = [
    {
      id: 'maj', title: 'ארפג׳ים בסיסיים 1 (מז׳ור)',
      items: ['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab'].map(n => ({ name: n, type: 'major' })),
    },
    {
      id: 'min', title: 'ארפג׳ים בסיסיים 2 (מינור)',
      items: ['A', 'E', 'B', 'F#', 'C#', 'D', 'G', 'C'].map(n => ({ name: n, type: 'minor' })),
    },
    {
      id: 'dom', title: 'ספטימות (דומיננטה)',
      items: ['A', 'D', 'G', 'C', 'E'].map(n => ({ name: n, type: 'dom7' })),
    },
  ];

  function userLessons() {
    const s = loadStore();
    return Array.isArray(s.lessons) ? s.lessons : [];
  }

  /* ============================================================
     טעינת רוטינה לנגן
     ============================================================ */
  function loadItem(item) {
    const notes = genArp(item.name, item.type);
    _routine = { name: arpDisplayName(item) + ' Arpeggio', notes };
    stopPlay();
    buildPlayerVisuals();
    setStatus('נטען: ' + _routine.name);
  }

  function loadLesson(lesson) {
    // משרשרת את כל הפריטים לרצף אחד עם הפסקה קצרה בין ארפג'ים
    const notes = [];
    lesson.items.forEach((it, idx) => {
      if (idx > 0) notes.push({ rest: true });
      genArp(it.name, it.type).forEach(n => notes.push(n));
    });
    _routine = { name: lesson.name, notes };
    stopPlay();
    buildPlayerVisuals();
    setStatus('שיעור: ' + lesson.name);
  }

  /* ============================================================
     רינדור ראשי
     ============================================================ */
  function init() {
    const el = $('#arp-studio-app');
    if (!el) return;
    render(el);
  }

  function render(el) {
    el.innerHTML = `
      <div class="arp-topbar">
        <div class="arp-title" id="arp-routine-name">בחרו ארפג׳ו מהספרייה</div>
        <div class="arp-meta"><span id="arp-bpm-badge">${_bpm} BPM</span> · <span id="arp-status">מוכן</span></div>
      </div>

      <div class="arp-notation card">
        <div class="arp-tab-scroll" id="arp-tab-scroll"></div>
      </div>

      <div class="arp-fretboard card">
        <svg id="arp-fb" class="fretboard-svg" preserveAspectRatio="xMidYMid meet"></svg>
      </div>

      <div class="arp-controls">
        <button class="btn arp-play" id="arp-play">▶ נגן</button>
        <button class="btn small" id="arp-slower">− איטי</button>
        <button class="btn small" id="arp-faster">+ מהיר</button>
        <button class="btn small" id="arp-loop">🔁 לולאה</button>
        <button class="btn small arp-panel-btn" data-panel="library">📚 ספרייה</button>
        <button class="btn small arp-panel-btn" data-panel="custom">✏️ שיעור אישי</button>
        <button class="btn small arp-panel-btn" data-panel="metronome">🥁 מטרונום</button>
        <button class="btn small arp-panel-btn" data-panel="timing">🎯 מבחן תזמון</button>
        <button class="btn small arp-panel-btn" data-panel="settings">⚙️ הגדרות</button>
        <button class="btn small arp-panel-btn" data-panel="reports">📊 דוחות</button>
      </div>

      <div class="arp-panel-host" id="arp-panel-host"></div>
    `;

    _fbSvg = $('#arp-fb', el);
    bindControls(el);
    buildPlayerVisuals();

    // טען ברירת מחדל
    loadItem(ARP_GROUPS[0].items[0]);
    openPanel('library');
  }

  function setStatus(msg) {
    const s = $('#arp-status');
    if (s) s.textContent = msg;
  }
  function updateBpmBadge() {
    const b = $('#arp-bpm-badge'); if (b) b.textContent = _bpm + ' BPM';
  }

  function bindControls(el) {
    $('#arp-play', el).addEventListener('click', togglePlay);
    $('#arp-faster', el).addEventListener('click', () => setBpm(_bpm + 5));
    $('#arp-slower', el).addEventListener('click', () => setBpm(_bpm - 5));
    const loopBtn = $('#arp-loop', el);
    loopBtn.classList.toggle('active', _loop);
    loopBtn.addEventListener('click', () => {
      _loop = !_loop; loopBtn.classList.toggle('active', _loop);
      if (_sched) _sched.loop = _loop;
    });
    el.querySelectorAll('.arp-panel-btn').forEach(b => {
      b.addEventListener('click', () => openPanel(b.dataset.panel));
    });
  }

  function setBpm(v) {
    _bpm = Math.max(30, Math.min(240, v));
    updateBpmBadge();
    if (_sched) _sched.stepDur = 60 / _bpm;
    const nm = $('#arp-routine-name'); // עדכון משכי זמן בספרייה אם פתוחה
    refreshOpenPanel();
  }

  /* ============================================================
     נגן — Scheduler מסונכרן (אודיו + ויזואל)
     ============================================================ */
  function togglePlay() {
    if (_sched && _sched.running) { stopPlay(); return; }
    startPlay();
  }

  function startPlay() {
    if (!_routine || !_routine.notes.length) return;
    ensureAudio();
    stopPlay();
    const seq = _routine.notes;
    let beatCount = 0;

    _sched = new AudioEngine.Scheduler(
      (step, time) => {
        const ev = seq[step];
        // מטרונום
        if (_metOn) playMetronome(beatCount, time);
        beatCount++;
        if (!ev || ev.rest) return;
        AudioEngine.pluckCourse(ev.ci, ev.fret, time, 0.6);
      },
      (step) => highlightStep(step)
    );
    _sched.numSteps = seq.length;
    _sched.stepDur = 60 / _bpm;
    _sched.loop = _loop;
    _sched.start();

    const btn = $('#arp-play');
    if (btn) { btn.textContent = '■ עצור'; btn.classList.add('playing'); }
    if (typeof registerPlayback === 'function') registerPlayback('arp-studio', stop);
    setStatus('מנגן…');
  }

  function stopPlay() {
    if (_sched) { _sched.stop(); _sched = null; }
    const btn = $('#arp-play');
    if (btn) { btn.textContent = '▶ נגן'; btn.classList.remove('playing'); }
    clearHighlights();
    if (typeof unregisterPlayback === 'function') unregisterPlayback('arp-studio');
  }

  function playMetronome(beat, time) {
    // אקצנט לפי תבנית: דגש בתחילת כל קבוצה
    const groupLen = _accentPattern[0] || 4;
    const accent = (beat % groupLen) === 0;
    if (_settings.metSound === 'drum') {
      accent ? AudioEngine.dum(time, 0.9) : AudioEngine.tek(time, 0.5);
    } else if (_settings.metSound === 'tick') {
      AudioEngine.click(time, accent);
    } else { // synth
      synthTick(time, accent);
    }
  }
  function synthTick(when, accent) {
    try {
      const ctx = AudioEngine.ctx; if (!ctx) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.frequency.value = accent ? 1320 : 880;
      o.type = 'square';
      g.gain.setValueAtTime(accent ? 0.25 : 0.14, when);
      g.gain.exponentialRampToValueAtTime(0.001, when + 0.05);
      o.connect(g).connect(ctx.destination);
      o.start(when); o.stop(when + 0.06);
    } catch (_) {}
  }

  /* ============================================================
     ויזואליה — TAB מתגלגל + גריף
     ============================================================ */
  function buildPlayerVisuals() {
    buildTabStrip();
    buildFretboard();
    const nm = $('#arp-routine-name');
    if (nm) nm.textContent = _routine ? _routine.name : 'בחרו ארפג׳ו';
  }

  // רצועת TAB אופקית: עמודה לכל צעד, 4 שורות מיתר (D A F C מלמעלה למטה)
  function buildTabStrip() {
    const host = $('#arp-tab-scroll');
    if (!host) return;
    host.innerHTML = '';
    _tabCells = [];
    if (!_routine) return;
    const rowsOrder = [0, 1, 2, 3]; // course idx D,A,F,C
    const rowLabels = ['D', 'A', 'F', 'C'];

    _routine.notes.forEach((ev, step) => {
      const col = document.createElement('div');
      col.className = 'arp-tab-col';
      col.dataset.step = step;
      rowsOrder.forEach((ci, r) => {
        const cell = document.createElement('div');
        cell.className = 'arp-tab-cell';
        if (r === 0) cell.classList.add('top');
        if (r === 3) cell.classList.add('bot');
        if (!ev.rest && ev.ci === ci) {
          cell.textContent = ev.fret;
          cell.classList.add('has-note');
          if (ev.isRoot) cell.classList.add('root');
        } else if (ev.rest) {
          if (r === 1) cell.textContent = '·';
        }
        col.appendChild(cell);
      });
      // תווית מיתרים בעמודה הראשונה
      _tabCells.push(col);
      host.appendChild(col);
    });

    // עמודת תוויות בצד ימין (RTL — מופיע ראשון)
    const labels = document.createElement('div');
    labels.className = 'arp-tab-labels';
    rowLabels.forEach(l => {
      const d = document.createElement('div');
      d.className = 'arp-tab-label';
      d.textContent = l;
      labels.appendChild(d);
    });
    host.insertBefore(labels, host.firstChild);
  }

  function buildFretboard() {
    if (!_fbSvg) return;
    if (typeof drawFretboard !== 'function') { _fbSvg.innerHTML = ''; return; }
    const noteSet = {};
    if (_routine) {
      _routine.notes.forEach(ev => { if (!ev.rest) noteSet[ev.ci + '-' + ev.fret] = ev; });
    }
    drawFretboard(_fbSvg, (ci, f) => {
      const ev = noteSet[ci + '-' + f];
      if (!ev) return null;
      return { type: ev.isRoot ? 'root' : 'note', label: ev.name };
    });
  }

  function highlightStep(step) {
    clearHighlights();
    if (!_routine) return;
    const ev = _routine.notes[step];
    // TAB
    const col = _tabCells[step];
    if (col) {
      col.classList.add('active');
      if (_settings.scroll !== 'skip') {
        try { col.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (_) {}
      }
    }
    // תו הבא (אם מוגדר)
    if (_settings.showNext) {
      const nextCol = _tabCells[(step + 1) % _tabCells.length];
      if (nextCol) nextCol.classList.add('next');
    }
    // גריף
    if (ev && !ev.rest && _fbSvg) {
      const dot = _fbSvg.querySelector(`.note-dot[data-course="${ev.ci}"][data-fret="${ev.fret}"]`);
      if (dot) {
        dot.classList.add('arp-current');
        const circ = dot.querySelector('circle');
        if (circ && _settings.lineColor && _settings.lineColor !== 'hide') {
          circ.setAttribute('data-base-fill', circ.getAttribute('fill'));
        }
      }
    }
  }

  function clearHighlights() {
    _tabCells.forEach(c => c.classList.remove('active', 'next'));
    if (_fbSvg) _fbSvg.querySelectorAll('.arp-current').forEach(d => d.classList.remove('arp-current'));
  }

  /* ============================================================
     פאנלים (ספרייה / שיעור אישי / מטרונום / תזמון / הגדרות / דוחות)
     ============================================================ */
  let _openPanelName = null;
  function openPanel(name) {
    const host = $('#arp-panel-host');
    if (!host) return;
    if (_openPanelName === name) { host.innerHTML = ''; _openPanelName = null; return; }
    _openPanelName = name;
    document.querySelectorAll('.arp-panel-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.panel === name));
    renderPanel(host, name);
  }
  function refreshOpenPanel() {
    if (_openPanelName) {
      const host = $('#arp-panel-host');
      if (host) renderPanel(host, _openPanelName);
    }
  }
  function renderPanel(host, name) {
    host.innerHTML = '';
    if (name === 'library') renderLibrary(host);
    else if (name === 'custom') renderCustom(host);
    else if (name === 'metronome') renderMetronome(host);
    else if (name === 'timing') renderTiming(host);
    else if (name === 'settings') renderSettings(host);
    else if (name === 'reports') renderReports(host);
  }

  /* ---------- ספרייה ---------- */
  function renderLibrary(host) {
    const card = document.createElement('div');
    card.className = 'card arp-panel';
    card.innerHTML = '<h2 class="arp-panel-title">📚 ספריית רוטינות</h2>';

    ARP_GROUPS.forEach(g => {
      const grp = document.createElement('div');
      grp.className = 'arp-lib-group';
      grp.innerHTML = `<div class="arp-lib-group-title">${g.title}</div>`;
      g.items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'arp-lib-row';
        row.innerHTML = `<span class="arp-lib-name">${arpDisplayName(item)} Arpeggio</span>
          <span class="arp-lib-dur">${arpDur(item)}</span>
          <button class="btn small arp-lib-add" title="הוסף לשיעור אישי">＋</button>`;
        row.querySelector('.arp-lib-name').addEventListener('click', () => loadItem(item));
        row.addEventListener('click', (e) => { if (e.target === row) loadItem(item); });
        row.querySelector('.arp-lib-add').addEventListener('click', (e) => {
          e.stopPropagation();
          _draft.items.push({ ...item });
          setStatus('נוסף לטיוטה: ' + arpDisplayName(item));
        });
        grp.appendChild(row);
      });
      card.appendChild(grp);
    });

    // שיעורים שמורים
    const lessons = userLessons();
    if (lessons.length) {
      const grp = document.createElement('div');
      grp.className = 'arp-lib-group';
      grp.innerHTML = `<div class="arp-lib-group-title">⭐ השיעורים שלי</div>`;
      lessons.forEach((les, idx) => {
        const row = document.createElement('div');
        row.className = 'arp-lib-row';
        row.innerHTML = `<span class="arp-lib-name">${les.name}</span>
          <span class="arp-lib-dur">${les.items.length} פריטים</span>
          <button class="btn small arp-lib-del" title="מחק">🗑</button>`;
        row.querySelector('.arp-lib-name').addEventListener('click', () => loadLesson(les));
        row.querySelector('.arp-lib-del').addEventListener('click', (e) => {
          e.stopPropagation();
          const s = loadStore(); s.lessons.splice(idx, 1); saveStore(s); renderLibrary(host);
        });
        grp.appendChild(row);
      });
      card.appendChild(grp);
    }

    host.appendChild(card);
  }

  /* ---------- בונה שיעור אישי ---------- */
  function renderCustom(host) {
    const card = document.createElement('div');
    card.className = 'card arp-panel';
    card.innerHTML = `<h2 class="arp-panel-title">✏️ בניית שיעור אישי</h2>
      <p class="arp-hint">הוסיפו ארפג׳ים מהספרייה (כפתור ＋), סדרו, תנו שם ושמרו. השיעור יופיע ב"השיעורים שלי".</p>`;

    const draftWrap = document.createElement('div');
    draftWrap.className = 'arp-draft';
    function renderDraft() {
      draftWrap.innerHTML = '';
      if (!_draft.items.length) {
        draftWrap.innerHTML = '<div class="arp-draft-empty">הטיוטה ריקה — הוסיפו פריטים מהספרייה.</div>';
      }
      _draft.items.forEach((it, idx) => {
        const row = document.createElement('div');
        row.className = 'arp-lib-row';
        row.innerHTML = `<span class="arp-lib-name">${arpDisplayName(it)} Arpeggio</span>
          <span class="arp-draft-ops">
            <button class="btn small" data-op="up">▲</button>
            <button class="btn small" data-op="down">▼</button>
            <button class="btn small" data-op="del">✕</button>
          </span>`;
        row.querySelector('[data-op="up"]').addEventListener('click', () => {
          if (idx > 0) { [_draft.items[idx - 1], _draft.items[idx]] = [_draft.items[idx], _draft.items[idx - 1]]; renderDraft(); }
        });
        row.querySelector('[data-op="down"]').addEventListener('click', () => {
          if (idx < _draft.items.length - 1) { [_draft.items[idx + 1], _draft.items[idx]] = [_draft.items[idx], _draft.items[idx + 1]]; renderDraft(); }
        });
        row.querySelector('[data-op="del"]').addEventListener('click', () => {
          _draft.items.splice(idx, 1); renderDraft();
        });
        draftWrap.appendChild(row);
      });
    }
    renderDraft();
    card.appendChild(draftWrap);

    const foot = document.createElement('div');
    foot.className = 'arp-draft-foot';
    foot.innerHTML = `
      <input type="text" id="arp-lesson-name" placeholder="שם השיעור" value="${_draft.name || ''}">
      <button class="btn small" id="arp-lesson-save">💾 שמור</button>
      <button class="btn small" id="arp-lesson-preview">▶ נגן טיוטה</button>
      <button class="btn small" id="arp-lesson-clear">נקה</button>`;
    card.appendChild(foot);

    foot.querySelector('#arp-lesson-save').addEventListener('click', () => {
      const name = foot.querySelector('#arp-lesson-name').value.trim() || 'שיעור חדש';
      if (!_draft.items.length) { setStatus('הטיוטה ריקה'); return; }
      const s = loadStore();
      if (!Array.isArray(s.lessons)) s.lessons = [];
      s.lessons.push({ name, items: _draft.items.slice() });
      saveStore(s);
      setStatus('נשמר: ' + name);
      _draft = { name: '', items: [] };
      renderCustom(host);
    });
    foot.querySelector('#arp-lesson-preview').addEventListener('click', () => {
      if (!_draft.items.length) return;
      loadLesson({ name: foot.querySelector('#arp-lesson-name').value.trim() || 'טיוטה', items: _draft.items.slice() });
      startPlay();
    });
    foot.querySelector('#arp-lesson-clear').addEventListener('click', () => {
      _draft = { name: '', items: [] }; renderCustom(host);
    });

    host.appendChild(card);
  }

  /* ---------- מטרונום ---------- */
  function renderMetronome(host) {
    const card = document.createElement('div');
    card.className = 'card arp-panel';
    card.innerHTML = `
      <h2 class="arp-panel-title">🥁 מטרונום</h2>
      <div class="arp-met-grid">
        <label class="arp-toggle">
          <input type="checkbox" id="arp-met-on" ${_metOn ? 'checked' : ''}> הפעל מטרונום בנגינה
        </label>
        <div class="arp-field">
          <span>טמפו:</span>
          <button class="btn small" id="arp-met-minus">−</button>
          <b id="arp-met-bpm">${_bpm}</b> bpm
          <button class="btn small" id="arp-met-plus">+</button>
        </div>
        <div class="arp-field">
          <span>אקצנט (פעמות לקבוצה):</span>
          <input type="text" id="arp-met-accent" value="${_accentPattern.join(',')}" style="width:70px">
        </div>
        <div class="arp-field">
          <span>צליל:</span>
          <select id="arp-met-sound">
            <option value="drum" ${_settings.metSound === 'drum' ? 'selected' : ''}>תוף (Dum/Tek)</option>
            <option value="tick" ${_settings.metSound === 'tick' ? 'selected' : ''}>טיק</option>
            <option value="synth" ${_settings.metSound === 'synth' ? 'selected' : ''}>סינת'</option>
          </select>
        </div>
        <button class="btn small" id="arp-met-test">🔊 בדיקה (4 פעמות)</button>
      </div>`;
    card.querySelector('#arp-met-on').addEventListener('change', e => { _metOn = e.target.checked; });
    card.querySelector('#arp-met-minus').addEventListener('click', () => { setBpm(_bpm - 5); card.querySelector('#arp-met-bpm').textContent = _bpm; });
    card.querySelector('#arp-met-plus').addEventListener('click', () => { setBpm(_bpm + 5); card.querySelector('#arp-met-bpm').textContent = _bpm; });
    card.querySelector('#arp-met-accent').addEventListener('change', e => {
      const parts = e.target.value.split(',').map(x => parseInt(x, 10)).filter(x => x > 0);
      _accentPattern = parts.length ? parts : [4];
    });
    card.querySelector('#arp-met-sound').addEventListener('change', e => { _settings.metSound = e.target.value; persistSettings(); });
    card.querySelector('#arp-met-test').addEventListener('click', () => {
      ensureAudio();
      const t0 = (AudioEngine.ctx ? AudioEngine.ctx.currentTime : 0) + 0.1;
      const dur = 60 / _bpm;
      for (let i = 0; i < 4; i++) playMetronome(i, t0 + i * dur);
    });
    host.appendChild(card);
  }

  /* ---------- מבחן תזמון ---------- */
  function renderTiming(host) {
    const card = document.createElement('div');
    card.className = 'card arp-panel';
    card.innerHTML = `
      <h2 class="arp-panel-title">🎯 מבחן תזמון</h2>
      <p class="arp-hint">לחצו "התחל מבחן", נגנו את הרוטינה בקצב ה-BPM. בסיום יוצג ציון לפי דיוק התזמון מול הפעמות.</p>
      <div class="arp-field">
        <span>רגישות:</span>
        <button class="btn small arp-sens" data-s="low">נמוכה</button>
        <button class="btn small arp-sens active" data-s="default">רגילה</button>
        <button class="btn small arp-sens" data-s="high">גבוהה</button>
      </div>
      <button class="btn" id="arp-timing-start">▶ התחל מבחן</button>
      <div class="arp-score" id="arp-score"></div>
      <div class="arp-prevscore" id="arp-prevscore"></div>`;
    card.querySelectorAll('.arp-sens').forEach(b => b.addEventListener('click', () => {
      card.querySelectorAll('.arp-sens').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      _timing.sensitivity = b.dataset.s;
    }));
    card.querySelector('#arp-timing-start').addEventListener('click', () => startTimingTest(card));
    const s = loadStore();
    if (s.lastScore != null) card.querySelector('#arp-prevscore').textContent = 'ציון קודם: ' + s.lastScore + '%';
    host.appendChild(card);
  }

  async function startTimingTest(card) {
    if (!_routine || !_routine.notes.length) { setStatus('טענו רוטינה תחילה'); return; }
    const startBtn = card.querySelector('#arp-timing-start');
    const scoreEl = card.querySelector('#arp-score');
    if (_timing.running) { stopTimingTest(); startBtn.textContent = '▶ התחל מבחן'; return; }

    try { await startMic(); } catch (e) { scoreEl.textContent = 'אין גישה למיקרופון'; return; }
    _timing.running = true;
    _timing.expected = [];
    _timing.onsets = [];
    startBtn.textContent = '■ עצור';
    scoreEl.textContent = 'נגנו עכשיו…';
    ensureAudio();

    stopPlay();
    const seq = _routine.notes;
    const playable = seq.filter(e => !e.rest);
    _loop = false;
    _sched = new AudioEngine.Scheduler(
      (step, time) => {
        const ev = seq[step];
        if (_metOn) playMetronome(step, time);
        if (ev && !ev.rest) {
          AudioEngine.pluckCourse(ev.ci, ev.fret, time, 0.25); // רמז שקט
          _timing.expected.push(time);
        }
      },
      (step) => highlightStep(step)
    );
    _sched.numSteps = seq.length;
    _sched.stepDur = 60 / _bpm;
    _sched.loop = false;
    _sched.start();

    // סיום אחרי מעבר אחד
    const total = seq.length * (60 / _bpm) * 1000 + 600;
    setTimeout(() => { if (_timing.running) finishTimingTest(card); }, total);
  }

  function finishTimingTest(card) {
    _timing.running = false;
    stopPlay();
    stopMic();
    const tol = _timing.sensitivity === 'high' ? 0.07 : _timing.sensitivity === 'low' ? 0.20 : 0.12;
    const exp = _timing.expected, ons = _timing.onsets.slice();
    let hit = 0, errSum = 0;
    exp.forEach(t => {
      let best = Infinity, bi = -1;
      ons.forEach((o, i) => { const d = Math.abs(o - t); if (d < best) { best = d; bi = i; } });
      if (bi >= 0 && best <= tol) { hit++; errSum += best; ons.splice(bi, 1); }
    });
    const acc = exp.length ? hit / exp.length : 0;
    const tight = hit ? Math.max(0, 1 - (errSum / hit) / tol) : 0;
    const score = Math.round(100 * (acc * 0.7 + tight * 0.3));
    const scoreEl = card.querySelector('#arp-score');
    let grade = score >= 90 ? '🏆 מקצועי!' : score >= 75 ? '⭐ מצוין' : score >= 55 ? '👍 טוב' : '🎯 תרגלו לאט יותר';
    scoreEl.innerHTML = `<span class="arp-score-num">${score}%</span> ${grade}<br><small>${hit}/${exp.length} פעמות בזמן</small>`;
    const startBtn = card.querySelector('#arp-timing-start');
    if (startBtn) startBtn.textContent = '▶ התחל מבחן';
    const s = loadStore();
    if (card.querySelector('#arp-prevscore') && s.lastScore != null)
      card.querySelector('#arp-prevscore').textContent = 'ציון קודם: ' + s.lastScore + '%';
    s.lastScore = score; saveStore(s);
    if (typeof ProgressLog !== 'undefined') {
      try { ProgressLog.log('arp_timing', `${_routine.name} — ${score}%`, { meta: { score, bpm: _bpm } }); } catch (_) {}
    }
  }
  function stopTimingTest() { _timing.running = false; stopPlay(); stopMic(); }

  /* ---------- מיקרופון + זיהוי אונסט ---------- */
  async function startMic() {
    if (_mic) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false } });
    const ctx = (AudioEngine.ctx) || new (window.AudioContext || window.webkitAudioContext)();
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    const buf = new Float32Array(analyser.fftSize);
    _mic = { ctx, stream, analyser, buf, raf: null, armed: true };
    const loop = () => {
      if (!_mic) return;
      analyser.getFloatTimeDomainData(buf);
      let sum = 0; for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      const rms = Math.sqrt(sum / buf.length);
      const TH = 0.04;
      if (_timing.running && rms > TH && _mic.armed) {
        _timing.onsets.push(ctx.currentTime);
        _mic.armed = false;
      } else if (rms < TH * 0.5) {
        _mic.armed = true;
      }
      _mic.raf = requestAnimationFrame(loop);
    };
    loop();
  }
  function stopMic() {
    if (!_mic) return;
    cancelAnimationFrame(_mic.raf);
    try { _mic.stream.getTracks().forEach(t => t.stop()); } catch (_) {}
    _mic = null;
  }

  /* ---------- הגדרות ---------- */
  function renderSettings(host) {
    const card = document.createElement('div');
    card.className = 'card arp-panel';
    const colorChip = (c, label) => `<button class="arp-color-chip ${_settings.lineColor === c ? 'active' : ''}" data-color="${c}" style="background:${c === 'hide' ? 'transparent' : c}">${label || ''}</button>`;
    card.innerHTML = `
      <h2 class="arp-panel-title">⚙️ הגדרות</h2>
      <div class="arp-field"><span>הצג תו הבא:</span>
        <button class="btn small arp-set" data-k="showNext" data-v="1">פעיל</button>
        <button class="btn small arp-set" data-k="showNext" data-v="0">כבוי</button></div>
      <div class="arp-field"><span>סגנון גלילת התווים:</span>
        <button class="btn small arp-set" data-k="scroll" data-v="skip">דלג</button>
        <button class="btn small arp-set" data-k="scroll" data-v="slide">החלק</button>
        <button class="btn small arp-set" data-k="scroll" data-v="hold">החזק</button></div>
      <div class="arp-field"><span>צבע קו הדגשה:</span>
        ${colorChip('#3a86c8', '')}${colorChip('#d9534f', '')}${colorChip('#5cb85c', '')}${colorChip('#9aa7b4', '')}${colorChip('hide', 'הסתר')}
      </div>
      <div class="arp-field"><span>צליל מטרונום:</span>
        <button class="btn small arp-set" data-k="metSound" data-v="drum">תוף</button>
        <button class="btn small arp-set" data-k="metSound" data-v="tick">טיק</button>
        <button class="btn small arp-set" data-k="metSound" data-v="synth">סינת'</button></div>`;
    const markActive = () => {
      card.querySelectorAll('.arp-set').forEach(b => {
        const k = b.dataset.k, v = b.dataset.v;
        let on = false;
        if (k === 'showNext') on = _settings.showNext === (v === '1');
        else on = String(_settings[k]) === v;
        b.classList.toggle('active', on);
      });
    };
    card.querySelectorAll('.arp-set').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.k, v = b.dataset.v;
      if (k === 'showNext') _settings.showNext = (v === '1');
      else _settings[k] = v;
      persistSettings(); markActive();
    }));
    card.querySelectorAll('.arp-color-chip').forEach(b => b.addEventListener('click', () => {
      _settings.lineColor = b.dataset.color;
      persistSettings();
      card.querySelectorAll('.arp-color-chip').forEach(x => x.classList.toggle('active', x === b));
      applyLineColor();
    }));
    markActive();
    host.appendChild(card);
  }
  function applyLineColor() {
    document.documentElement.style.setProperty('--arp-line', _settings.lineColor === 'hide' ? 'transparent' : _settings.lineColor);
  }
  function persistSettings() {
    const s = loadStore(); s.settings = _settings; saveStore(s);
    applyLineColor();
  }

  /* ---------- דוחות ---------- */
  async function renderReports(host) {
    const card = document.createElement('div');
    card.className = 'card arp-panel';
    card.innerHTML = `<h2 class="arp-panel-title">📊 דוח תרגול</h2><div id="arp-report-body">טוען…</div>`;
    host.appendChild(card);
    const body = card.querySelector('#arp-report-body');
    if (typeof ProgressLog === 'undefined' || !ProgressLog.summarize) {
      body.textContent = 'אין נתוני התקדמות זמינים.';
      return;
    }
    try {
      const sum = await ProgressLog.summarize(14);
      const minutes = sum.totalMinutes != null ? sum.totalMinutes : (sum.minutes || 0);
      const plays = sum.totalEvents != null ? sum.totalEvents : (sum.events || 0);
      const activeDays = sum.byDate ? Object.keys(sum.byDate).length : '—';
      const level = minutes > 60 ? 'גבוהה' : minutes > 20 ? 'בינונית' : 'נמוכה';
      body.innerHTML = `
        <div class="arp-report-grid">
          <div class="arp-report-cell"><div class="arp-report-k">זמן תרגול (14 ימים)</div><div class="arp-report-v">${minutes} דק׳</div></div>
          <div class="arp-report-cell"><div class="arp-report-k">רמת פעילות</div><div class="arp-report-v">${level}</div></div>
          <div class="arp-report-cell"><div class="arp-report-k">סך נגינות רוטינה</div><div class="arp-report-v">${plays}</div></div>
          <div class="arp-report-cell"><div class="arp-report-k">ימים פעילים</div><div class="arp-report-v">${activeDays}</div></div>
        </div>
        <p class="arp-hint">הנתונים נאספים מכל מסכי האפליקציה (IndexedDB). מבחני התזמון נרשמים גם הם.</p>`;
    } catch (e) {
      body.textContent = 'שגיאה בטעינת הדוח.';
    }
  }

  /* ---------- מחזור חיים ---------- */
  function stop() {
    stopPlay();
    stopTimingTest();
  }

  // טען הגדרות שמורות בעלייה
  (function loadSaved() {
    const s = loadStore();
    if (s.settings) _settings = Object.assign(_settings, s.settings);
  })();

  return { init, stop };
})();
