/* ============================================================
   בוזוקי אקדמי — מודולי תרגול מתקדמים
   IntervalTrainer, ModeQuiz, ScaleExplorer, ScaleChords,
   BackingTracks, JamSimulator, XpSystem
   ============================================================ */
'use strict';

/* ============================================================
   1. IntervalTrainer — אימון אינטרוולים
   ============================================================ */
const IntervalTrainer = (() => {
  const INTERVALS = [
    { semitones: 0,  name: 'Unison',      he: 'פריים',           example: 'אותו תו' },
    { semitones: 1,  name: 'Minor 2nd',   he: 'סקונדה קטנה',    example: 'Jaws' },
    { semitones: 2,  name: 'Major 2nd',   he: 'סקונדה גדולה',   example: 'Happy Birthday' },
    { semitones: 3,  name: 'Minor 3rd',   he: 'טרציה קטנה',     example: 'Greensleeves' },
    { semitones: 4,  name: 'Major 3rd',   he: 'טרציה גדולה',    example: 'Oh When the Saints' },
    { semitones: 5,  name: 'Perfect 4th', he: 'קוורטה',         example: 'הנה מה טוב' },
    { semitones: 6,  name: 'Tritone',     he: 'טריטון',         example: 'The Simpsons' },
    { semitones: 7,  name: 'Perfect 5th', he: 'קווינטה',        example: 'Star Wars' },
    { semitones: 8,  name: 'Minor 6th',   he: 'סקסטה קטנה',     example: 'The Entertainer' },
    { semitones: 9,  name: 'Major 6th',   he: 'סקסטה גדולה',    example: 'My Bonnie' },
    { semitones: 10, name: 'Minor 7th',   he: 'ספטימה קטנה',    example: 'Star Trek' },
    { semitones: 11, name: 'Major 7th',   he: 'ספטימה גדולה',   example: 'Take On Me' },
    { semitones: 12, name: 'Octave',      he: 'אוקטבה',         example: 'Over the Rainbow' },
  ];

  const DIFF = {
    easy:   { count: 5,  indices: [0, 2, 4, 5, 7],                          label: 'קל' },
    medium: { count: 8,  indices: [0, 1, 2, 3, 4, 5, 7, 12],               label: 'בינוני' },
    hard:   { count: 13, indices: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], label: 'קשה' },
  };

  let difficulty = 'easy', pool = [], current = null, baseMidi = 60;
  let stats = { correct: 0, wrong: 0, streak: 0 };
  let answered = false;

  function init() {
    const el = document.querySelector('#interval-app');
    if (!el) return;
    el.innerHTML = `
      <h2>אימון אינטרוולים</h2>
      <div class="it-controls">
        <label>רמה:
          <select id="it-diff">
            <option value="easy">קל</option>
            <option value="medium">בינוני</option>
            <option value="hard">קשה</option>
          </select>
        </label>
        <button id="it-play" class="btn btn-gold">&#9654; השמע</button>
        <button id="it-repeat" class="btn">&#128257; שוב</button>
        <button id="it-ref" class="btn">&#127925; תו ייחוס</button>
      </div>
      <div id="it-score" class="it-score"></div>
      <div id="it-options" class="it-options"></div>
      <div id="it-feedback" class="it-feedback"></div>
    `;
    document.querySelector('#it-diff').addEventListener('change', e => {
      difficulty = e.target.value;
      resetStats();
      prepareQuestion();
    });
    document.querySelector('#it-play').addEventListener('click', () => next(true));
    document.querySelector('#it-repeat').addEventListener('click', () => playCurrent());
    document.querySelector('#it-ref').addEventListener('click', () => {
      AudioEngine.ensureCtx();
      AudioEngine.pluckFromMidi(baseMidi, 0, 0.5);
    });
    resetStats();
    prepareQuestion();
  }

  function resetStats() {
    stats = { correct: 0, wrong: 0, streak: 0 };
    pool = DIFF[difficulty].indices.map(i => INTERVALS[i]);
    updateScore();
  }

  function updateScore() {
    const total = stats.correct + stats.wrong;
    const pct = total ? Math.round(stats.correct / total * 100) : 0;
    const el = document.querySelector('#it-score');
    if (el) el.innerHTML = `<span class="stat">&#10004; ${stats.correct}</span> <span class="stat err">&#10008; ${stats.wrong}</span> <span class="stat streak">&#128293; ${stats.streak}</span> <span class="stat">${pct}%</span>`;
  }

  function pick() {
    baseMidi = 55 + Math.floor(Math.random() * 12);
    const idx = Math.floor(Math.random() * pool.length);
    current = pool[idx];
    answered = false;
  }

  function playCurrent() {
    if (!current) return;
    AudioEngine.ensureCtx();
    const now = AudioEngine.ctx.currentTime + 0.05;
    AudioEngine.pluckFromMidi(baseMidi, now, 0.55);
    AudioEngine.pluckFromMidi(baseMidi + current.semitones, now + 0.65, 0.55);
  }

  function prepareQuestion() {
    pick();
    renderOptions();
    const fb = document.querySelector('#it-feedback');
    if (fb) fb.innerHTML = '';
  }

  function next(playAudio = false) {
    pick();
    if (playAudio) playCurrent();
    renderOptions();
    const fb = document.querySelector('#it-feedback');
    if (fb) fb.innerHTML = '';
  }

  function renderOptions() {
    const el = document.querySelector('#it-options');
    if (!el) return;
    el.innerHTML = '';
    pool.forEach(iv => {
      const btn = document.createElement('button');
      btn.className = 'btn it-btn';
      btn.textContent = iv.he;
      btn.addEventListener('click', () => answer(iv));
      el.appendChild(btn);
    });
  }

  let _itTimer = null;

  function answer(iv) {
    if (answered) return;
    answered = true;
    const correct = iv.semitones === current.semitones;
    const fb = document.querySelector('#it-feedback');
    if (correct) {
      stats.correct++;
      stats.streak++;
      if (fb) fb.innerHTML = `<span class="ok">&#10004; נכון! ${current.he} (${current.name})</span><br><small>דוגמה: ${current.example}</small>`;
      if (stats.streak % 5 === 0) XpSystem.award(15, 'רצף ' + stats.streak);
      XpSystem.award(10, 'אינטרוול נכון');
    } else {
      stats.wrong++;
      stats.streak = 0;
      if (fb) fb.innerHTML = `<span class="err">&#10008; לא... התשובה: ${current.he} (${current.name})</span><br><small>דוגמה: ${current.example}</small>`;
    }
    updateScore();
    // highlight correct
    document.querySelectorAll('.it-btn').forEach(b => {
      if (b.textContent === current.he) b.classList.add('correct');
      else if (b.textContent === iv.he && !correct) b.classList.add('wrong');
    });
    if (_itTimer) clearTimeout(_itTimer);
    _itTimer = setTimeout(() => {
      _itTimer = null;
      if (typeof isScreenActive === 'function' && isScreenActive('intervals')) {
        next(true);
      } else {
        prepareQuestion();
      }
    }, 1800);
  }

  function stop() {
    if (_itTimer) { clearTimeout(_itTimer); _itTimer = null; }
    AudioEngine.stopModeScale();
  }

  return { init, stop };
})();


/* ============================================================
   2. ModeQuiz — בוחן מודוסים בשמיעה
   ============================================================ */
const ModeQuiz = (() => {
  const DIFF = {
    easy:   { options: 4, poolSize: 6,  label: 'קל' },
    medium: { options: 4, poolSize: 9,  label: 'בינוני' },
    hard:   { options: 5, poolSize: 12, label: 'קשה' },
  };

  let difficulty = 'easy', current = null, answered = false;
  let stats = { correct: 0, wrong: 0, streak: 0, total: 0 };
  let rootMidi = 62; // D
  let _mqTimer = null;

  function init() {
    const el = document.querySelector('#modequiz-app');
    if (!el) return;
    el.innerHTML = `
      <h2>בוחן מודוסים בשמיעה</h2>
      <div class="mq-controls">
        <label>רמה:
          <select id="mq-diff">
            <option value="easy">קל</option>
            <option value="medium">בינוני</option>
            <option value="hard">קשה</option>
          </select>
        </label>
        <button id="mq-play" class="btn btn-gold">&#9654; השמע דרומוס</button>
        <button id="mq-repeat" class="btn">&#128257; שוב</button>
        <button id="mq-hint" class="btn">&#128161; רמז</button>
      </div>
      <div id="mq-score" class="it-score"></div>
      <div id="mq-options" class="it-options"></div>
      <div id="mq-feedback" class="it-feedback"></div>
    `;
    document.querySelector('#mq-diff').addEventListener('change', e => {
      difficulty = e.target.value;
      resetStats();
      prepareQuestion();
    });
    document.querySelector('#mq-play').addEventListener('click', () => {
      prepareQuestion();
      playScale();
    });
    document.querySelector('#mq-repeat').addEventListener('click', () => playScale());
    document.querySelector('#mq-hint').addEventListener('click', () => showHint());
    resetStats();
    prepareQuestion();
  }

  function resetStats() {
    stats = { correct: 0, wrong: 0, streak: 0, total: 0 };
    updateScore();
  }

  function updateScore() {
    const pct = stats.total ? Math.round(stats.correct / stats.total * 100) : 0;
    const el = document.querySelector('#mq-score');
    if (el) el.innerHTML = `<span class="stat">&#10004; ${stats.correct}</span> <span class="stat err">&#10008; ${stats.wrong}</span> <span class="stat streak">&#128293; ${stats.streak}</span> <span class="stat">${pct}%</span>`;
  }

  function prepareQuestion() {
    const d = DIFF[difficulty];
    const shuffled = [...DROMOI].sort(() => Math.random() - 0.5);
    const pool = shuffled.slice(0, d.poolSize);
    current = { dromos: pool[Math.floor(Math.random() * pool.length)], pool };
    rootMidi = 57 + Math.floor(Math.random() * 8);
    answered = false;
    renderOptions(pool.sort(() => Math.random() - 0.5).slice(0, d.options));
    const opts = document.querySelector('#mq-options');
    const btns = opts ? opts.querySelectorAll('button') : [];
    const hasCorrect = Array.from(btns).some(b => b.dataset.id === current.dromos.id);
    if (!hasCorrect && btns.length) {
      const replIdx = Math.floor(Math.random() * btns.length);
      btns[replIdx].textContent = current.dromos.nameHe;
      btns[replIdx].dataset.id = current.dromos.id;
    }
    const fb = document.querySelector('#mq-feedback');
    if (fb) fb.innerHTML = '';
  }

  function nextQuestion() {
    prepareQuestion();
    playScale();
  }

  function nextQuestionAfterAnswer() {
    prepareQuestion();
    if (typeof isScreenActive === 'function' && isScreenActive('modequiz')) {
      playScale();
    }
  }

  function playScale() {
    if (!current) return;
    AudioEngine.playModeScale(current.dromos.intervals, rootMidi % 12, { gapMs: 350, gain: 0.48 });
  }

  function renderOptions(opts) {
    const el = document.querySelector('#mq-options');
    if (!el) return;
    el.innerHTML = '';
    opts.forEach(dr => {
      const btn = document.createElement('button');
      btn.className = 'btn it-btn';
      btn.textContent = dr.nameHe;
      btn.dataset.id = dr.id;
      btn.addEventListener('click', () => answer(dr));
      el.appendChild(btn);
    });
  }

  function answer(dr) {
    if (answered) return;
    answered = true;
    stats.total++;
    const correct = dr.id === current.dromos.id;
    const fb = document.querySelector('#mq-feedback');
    if (correct) {
      stats.correct++;
      stats.streak++;
      if (fb) fb.innerHTML = `<span class="ok">&#10004; נכון! ${current.dromos.nameHe} (${current.dromos.nameGr})</span>`;
      XpSystem.award(10, 'מודוס נכון');
      if (stats.streak >= 5 && stats.streak % 5 === 0) XpSystem.award(15, 'רצף ' + stats.streak);
    } else {
      stats.wrong++;
      stats.streak = 0;
      if (fb) fb.innerHTML = `<span class="err">&#10008; לא... התשובה: ${current.dromos.nameHe}</span>`;
    }
    updateScore();
    document.querySelectorAll('#mq-options .it-btn').forEach(b => {
      if (b.dataset.id === current.dromos.id) b.classList.add('correct');
      else if (b.dataset.id === dr.id && !correct) b.classList.add('wrong');
    });
    if (_mqTimer) clearTimeout(_mqTimer);
    _mqTimer = setTimeout(() => {
      _mqTimer = null;
      nextQuestionAfterAnswer();
    }, 2000);
  }

  function showHint() {
    if (!current) return;
    const fb = document.querySelector('#mq-feedback');
    if (fb) fb.innerHTML = `<small>מרווחים: ${current.dromos.intervals.join('-')}</small>`;
  }

  function stop() {
    if (_mqTimer) { clearTimeout(_mqTimer); _mqTimer = null; }
    AudioEngine.stopModeScale();
  }

  return { init, stop };
})();


/* ============================================================
   3. ScaleExplorer — חיפוש סולמות
   ============================================================ */
const ScaleExplorer = (() => {
  let selDromos = 0, rootPc = 2, compareDromos = -1;
  let playTimer = null;

  function init() {
    const el = document.querySelector('#explorer-app');
    if (!el) return;
    el.innerHTML = `
      <h2>חיפוש סולמות</h2>
      <div class="ex-controls">
        <label>דרומוס:
          <select id="ex-dromos">${DROMOI.map((d, i) => `<option value="${i}">${d.nameHe}</option>`).join('')}</select>
        </label>
        <label>שורש:
          <select id="ex-root">${NOTE_NAMES.map((n, i) => `<option value="${i}"${i === 2 ? ' selected' : ''}>${n} — ${SOLFEGE[n]}</option>`).join('')}</select>
        </label>
        <button id="ex-play" class="btn btn-gold">&#9654; נגן סולם</button>
        <button id="ex-play-desc" class="btn">&#9660; יורד</button>
      </div>
      <div class="ex-info">
        <div id="ex-formula" class="ex-formula"></div>
        <div id="ex-chords-info" class="ex-chords-info"></div>
      </div>
      <svg id="fb-explorer" class="fretboard" preserveAspectRatio="xMidYMid meet"></svg>
      <div class="ex-compare">
        <label>השווה ל:
          <select id="ex-compare"><option value="-1">— ללא —</option>${DROMOI.map((d, i) => `<option value="${i}">${d.nameHe}</option>`).join('')}</select>
        </label>
      </div>
      <svg id="fb-explorer2" class="fretboard" style="display:none" preserveAspectRatio="xMidYMid meet"></svg>
    `;
    document.querySelector('#ex-dromos').addEventListener('change', e => { selDromos = +e.target.value; render(); });
    document.querySelector('#ex-root').addEventListener('change', e => { rootPc = +e.target.value; render(); });
    document.querySelector('#ex-play').addEventListener('click', () => playScaleDir('up'));
    document.querySelector('#ex-play-desc').addEventListener('click', () => playScaleDir('down'));
    document.querySelector('#ex-compare').addEventListener('change', e => { compareDromos = +e.target.value; render(); });
    render();
  }

  function getScaleNotes(dromosIdx, root) {
    const dr = DROMOI[dromosIdx];
    if (!dr) return [];
    return dr.intervals.map(iv => (root + iv) % 12);
  }

  function render() {
    const dr = DROMOI[selDromos];
    if (!dr) return;
    const notes = new Set(getScaleNotes(selDromos, rootPc));
    const rootName = NOTE_NAMES[rootPc];

    // formula
    const formulaEl = document.querySelector('#ex-formula');
    if (formulaEl) {
      const degrees = dr.intervals.map(iv => NOTE_NAMES[(rootPc + iv) % 12] + ' (' + SOLFEGE[NOTE_NAMES[(rootPc + iv) % 12]] + ')');
      formulaEl.innerHTML = `<strong>${dr.nameHe}</strong> מ-${rootName}: ${degrees.join(' — ')}<br><small>מרווחים: ${dr.degrees || dr.intervals.join('-')}</small>`;
    }
    // chords
    const chordsEl = document.querySelector('#ex-chords-info');
    if (chordsEl) chordsEl.innerHTML = dr.chords ? `<strong>אקורדים אופייניים:</strong> ${dr.chords}` : '';

    // fretboard
    drawFretboard(document.querySelector('#fb-explorer'), (ci, f, midi) => {
      const pc = ((midi % 12) + 12) % 12;
      if (!notes.has(pc)) return null;
      const isRoot = pc === rootPc;
      return { type: isRoot ? 'root' : 'note', label: SOLFEGE[NOTE_NAMES[pc]] || NOTE_NAMES[pc] };
    });

    // compare
    const svg2 = document.querySelector('#fb-explorer2');
    if (compareDromos >= 0 && svg2) {
      svg2.style.display = '';
      const notes2 = new Set(getScaleNotes(compareDromos, rootPc));
      drawFretboard(svg2, (ci, f, midi) => {
        const pc = ((midi % 12) + 12) % 12;
        if (!notes2.has(pc)) return null;
        const isRoot = pc === rootPc;
        const shared = notes.has(pc);
        return { type: isRoot ? 'root' : (shared ? 'note' : 'highlight'), label: SOLFEGE[NOTE_NAMES[pc]] || NOTE_NAMES[pc] };
      });
    } else if (svg2) {
      svg2.style.display = 'none';
    }
  }

  function playScaleDir(dir) {
    stop();
    const dr = DROMOI[selDromos];
    if (!dr) return;
    AudioEngine.ensureCtx();
    const frets = AudioEngine.modeScaleFrets(dr.intervals, rootPc);
    const seq = dir === 'down' ? [...frets].reverse() : frets;
    const t0 = AudioEngine.ctx.currentTime + 0.05;
    seq.forEach((f, i) => AudioEngine.pluckCourse(0, f, t0 + i * 0.35, 0.48));
    playTimer = setTimeout(() => { playTimer = null; }, seq.length * 350 + 200);
  }

  function stop() {
    if (playTimer) { clearTimeout(playTimer); playTimer = null; }
    AudioEngine.stopModeScale();
  }

  return { init, stop };
})();


/* ============================================================
   4. ScaleChords — אקורדים לפי דרומוס
   ============================================================ */
const ScaleChords = (() => {
  let selDromos = 0, rootPc = 2;

  const QUALITY_NAMES = { maj: 'מז׳ור', min: 'מינור', dim: 'דימ׳', aug: 'מוגבר' };
  const DEGREE_ROLES = ['טוניקה', 'סופרטוניקה', 'מדיאנט', 'תת-דומיננטה', 'דומיננטה', 'סובמדיאנט', 'מוליך'];
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

  const PROGRESSIONS = {
    hitzaz:  [['I', 'bII', 'iv', 'I'],  ['I', 'iv', 'bII', 'I']],
    minore:  [['i', 'iv', 'V7', 'i'],   ['i', 'bVI', 'V7', 'i']],
    ousak:   [['i', 'bII', 'bVII', 'i'],['i', 'iv', 'bII', 'i']],
    rast:    [['I', 'bVII', 'IV', 'I'], ['I', 'IV', 'V', 'I']],
    kiourdi: [['i', 'IV', 'bVII', 'i'], ['i', 'iv', 'bVII', 'i']],
  };

  function init() {
    const el = document.querySelector('#scalechords-app');
    if (!el) return;
    el.innerHTML = `
      <h2>אקורדים לפי דרומוס</h2>
      <div class="sc-controls">
        <label>דרומוס:
          <select id="sc-dromos">${DROMOI.map((d, i) => `<option value="${i}">${d.nameHe}</option>`).join('')}</select>
        </label>
        <label>שורש:
          <select id="sc-root">${NOTE_NAMES.map((n, i) => `<option value="${i}"${i === 2 ? ' selected' : ''}>${n}</option>`).join('')}</select>
        </label>
      </div>
      <div id="sc-degrees" class="sc-degrees"></div>
      <div id="sc-progressions" class="sc-progressions"></div>
    `;
    document.querySelector('#sc-dromos').addEventListener('change', e => { selDromos = +e.target.value; render(); });
    document.querySelector('#sc-root').addEventListener('change', e => { rootPc = +e.target.value; render(); });
    render();
  }

  function triadQuality(intervals, degreeIdx) {
    // build triad from scale degrees
    const scaleLen = intervals.length;
    const root = intervals[degreeIdx];
    const thirdIdx = (degreeIdx + 2) % scaleLen;
    const fifthIdx = (degreeIdx + 4) % scaleLen;
    let third = intervals[thirdIdx] - root;
    let fifth = intervals[fifthIdx] - root;
    if (third < 0) third += 12;
    if (fifth < 0) fifth += 12;
    if (third === 4 && fifth === 7) return 'maj';
    if (third === 3 && fifth === 7) return 'min';
    if (third === 3 && fifth === 6) return 'dim';
    if (third === 4 && fifth === 8) return 'aug';
    if (third === 4) return 'maj';
    if (third === 3) return 'min';
    return 'dim';
  }

  function render() {
    const dr = DROMOI[selDromos];
    if (!dr) return;
    const degs = document.querySelector('#sc-degrees');
    if (!degs) return;

    let html = '<div class="sc-grid">';
    dr.intervals.forEach((iv, i) => {
      const pc = (rootPc + iv) % 12;
      const noteName = NOTE_NAMES[pc];
      const q = triadQuality(dr.intervals, i);
      const qLabel = QUALITY_NAMES[q] || q;
      const roman = q === 'min' || q === 'dim' ? ROMAN[i].toLowerCase() : ROMAN[i];
      const suffix = q === 'dim' ? '°' : '';
      const role = DEGREE_ROLES[i] || '';
      // find chord in CHORDS
      const chordKey = q === 'min' ? noteName + 'm' : q === 'dim' ? noteName + 'dim' : noteName;
      const chordData = CHORDS[chordKey] || CHORDS[noteName] || null;

      html += `<div class="sc-card" data-midi="${48 + rootPc + iv}" data-chord="${chordKey}">
        <div class="sc-roman">${roman}${suffix}</div>
        <div class="sc-name">${chordData ? chordData.he : noteName + ' ' + qLabel}</div>
        <div class="sc-quality">${qLabel}</div>
        <div class="sc-role">${role}</div>
        <button class="btn btn-sm sc-hear">&#9654;</button>
      </div>`;
    });
    html += '</div>';
    degs.innerHTML = html;

    degs.querySelectorAll('.sc-hear').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const card = btn.closest('.sc-card');
        const key = card.dataset.chord;
        const ch = CHORDS[key];
        if (ch) {
          AudioEngine.ensureCtx();
          AudioEngine.strumChord(ch.shape, 'd', 0, 0.5);
        } else {
          AudioEngine.ensureCtx();
          AudioEngine.pluckFromMidi(+card.dataset.midi, 0, 0.5);
        }
      });
    });

    // progressions
    const progEl = document.querySelector('#sc-progressions');
    const progs = PROGRESSIONS[dr.id];
    if (progEl && progs) {
      let ph = '<h3>תהלוכות אופייניות</h3>';
      progs.forEach(p => {
        ph += `<div class="sc-prog">${p.join(' → ')}</div>`;
      });
      progEl.innerHTML = ph;
    } else if (progEl) {
      progEl.innerHTML = '';
    }
  }

  function stop() {}

  return { init, stop };
})();


/* ============================================================
   5. BackingTracks — רצועות ליווי
   ============================================================ */
const BackingTracks = (() => {
  const TRACKS = [
    {
      id: 'zeib-hitz',  name: 'זאימבקיקו בחיג׳אז',
      dromos: 'hitzaz', root: 62, key: 'D',
      meter: '9/4', bpm: 68, cells: 9, grouping: [2, 2, 2, 3],
      drums: ['D', '-', 't', '-', 'D', 't', 'D', 't', 't'],
      bass:  [0, -1, -1, -1, 7, -1, 5, -1, -1],
      chordPat: [1, 0, 0, 0, 0, 0, 0, 0, 0],
      chord: 'D'
    },
    {
      id: 'has-min', name: 'חסאפיקו במינורה',
      dromos: 'minore', root: 57, key: 'Am',
      meter: '4/4', bpm: 80, cells: 8, grouping: [2, 2, 2, 2],
      drums: ['D', '-', 't', '-', 'D', 't', 't', '-'],
      bass:  [0, -1, -1, -1, 7, -1, 5, -1],
      chordPat: [1, 0, 0, 0, 1, 0, 0, 0],
      chord: 'Am'
    },
    {
      id: 'tsif-hitz', name: 'ציפטטלי בחיג׳אז',
      dromos: 'hitzaz', root: 50, key: 'Dm',
      meter: '4/4', bpm: 100, cells: 8, grouping: [2, 2, 2, 2],
      drums: ['D', 't', '-', 't', 'D', '-', 't', '-'],
      bass:  [0, -1, -1, -1, 5, -1, -1, -1],
      chordPat: [1, 0, 0, 0, 0, 0, 0, 0],
      chord: 'Dm'
    },
    {
      id: 'syrtos-rast', name: 'סירטוס בראסט',
      dromos: 'rast', root: 62, key: 'D',
      meter: '4/4', bpm: 110, cells: 8, grouping: [2, 2, 2, 2],
      drums: ['D', '-', 't', 't', 'D', '-', 't', '-'],
      bass:  [0, -1, -1, 7, 5, -1, -1, -1],
      chordPat: [1, 0, 0, 0, 1, 0, 0, 0],
      chord: 'D'
    },
    {
      id: 'kalam', name: 'קלמטיאנוס',
      dromos: 'minore', root: 52, key: 'Em',
      meter: '7/8', bpm: 132, cells: 7, grouping: [3, 2, 2],
      drums: ['D', '-', '-', 't', '-', 't', '-'],
      bass:  [0, -1, -1, 5, -1, 7, -1],
      chordPat: [1, 0, 0, 0, 0, 0, 0],
      chord: 'Em'
    },
    {
      id: 'hasapo', name: 'חסאפוסרביקו',
      dromos: 'kiourdi', root: 50, key: 'Dm',
      meter: '2/4', bpm: 150, cells: 4, grouping: [2, 2],
      drums: ['D', 't', 'D', 't'],
      bass:  [0, -1, 7, -1],
      chordPat: [1, 0, 0, 0],
      chord: 'Dm'
    },
    {
      id: 'karsi', name: 'קרסילמאס בחיג׳אז',
      dromos: 'hitzaz', root: 62, key: 'D',
      meter: '9/8', bpm: 170, cells: 9, grouping: [2, 2, 2, 3],
      drums: ['D', '-', 't', '-', 'D', '-', 't', 't', '-'],
      bass:  [0, -1, -1, -1, 7, -1, 5, -1, -1],
      chordPat: [1, 0, 0, 0, 0, 0, 0, 0, 0],
      chord: 'D'
    },
    {
      id: 'aptal', name: 'אפטליקו',
      dromos: 'ousak', root: 57, key: 'Am',
      meter: '9/8', bpm: 100, cells: 9, grouping: [2, 2, 3, 2],
      drums: ['D', '-', 't', '-', 'D', 't', '-', 't', '-'],
      bass:  [0, -1, -1, -1, 5, -1, -1, 7, -1],
      chordPat: [1, 0, 0, 0, 0, 0, 0, 0, 0],
      chord: 'Am'
    },
  ];

  let scheduler = null, activeTrack = null;
  let volumes = { drums: 0.7, bass: 0.6, chords: 0.5 };
  let tempoMul = 1;

  function init() {
    const el = document.querySelector('#backing-app');
    if (!el) return;
    let html = `<h2>רצועות ליווי</h2>
      <div class="bt-list">`;
    TRACKS.forEach((t, i) => {
      html += `<div class="bt-card" data-idx="${i}">
        <div class="bt-name">${t.name}</div>
        <div class="bt-info">${t.key} ${t.meter} | ${t.bpm} BPM</div>
        <div class="bt-dromos">תרגלו: ${DROMOI.find(d => d.id === t.dromos)?.nameHe || t.dromos}</div>
        <button class="btn btn-gold bt-start">&#9654;</button>
      </div>`;
    });
    html += `</div>
      <div class="bt-mixer" id="bt-mixer" style="display:none">
        <h3 id="bt-now"></h3>
        <div class="bt-vol">
          <label>תופים <input type="range" id="bt-vol-drums" min="0" max="100" value="70"></label>
          <label>בס <input type="range" id="bt-vol-bass" min="0" max="100" value="60"></label>
          <label>אקורדים <input type="range" id="bt-vol-chords" min="0" max="100" value="50"></label>
        </div>
        <div class="bt-tempo">
          <label>טמפו <input type="range" id="bt-tempo" min="50" max="200" value="100"><span id="bt-tempo-val">100%</span></label>
        </div>
        <button id="bt-stop" class="btn accent-red">&#9632; עצור</button>
        <div id="bt-steps" class="bt-steps"></div>
      </div>`;
    el.innerHTML = html;

    el.querySelectorAll('.bt-start').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = +btn.closest('.bt-card').dataset.idx;
        startTrack(idx);
      });
    });
    const stopBtn = document.querySelector('#bt-stop');
    if (stopBtn) stopBtn.addEventListener('click', () => stop());

    ['drums', 'bass', 'chords'].forEach(k => {
      const inp = document.querySelector('#bt-vol-' + k);
      if (inp) inp.addEventListener('input', e => { volumes[k] = +e.target.value / 100; });
    });
    const tempoInp = document.querySelector('#bt-tempo');
    if (tempoInp) tempoInp.addEventListener('input', e => {
      tempoMul = +e.target.value / 100;
      const lbl = document.querySelector('#bt-tempo-val');
      if (lbl) lbl.textContent = e.target.value + '%';
      if (scheduler && activeTrack) {
        scheduler.stepDur = 60 / (activeTrack.bpm * tempoMul) / 2;
      }
    });
  }

  function startTrack(idx) {
    stop();
    activeTrack = TRACKS[idx];
    const t = activeTrack;
    const mixer = document.querySelector('#bt-mixer');
    if (mixer) mixer.style.display = '';
    const nowEl = document.querySelector('#bt-now');
    if (nowEl) nowEl.textContent = t.name + ' — ' + t.meter + ' ' + Math.round(t.bpm * tempoMul) + ' BPM';

    // render step indicators
    const stepsEl = document.querySelector('#bt-steps');
    if (stepsEl) {
      stepsEl.innerHTML = t.drums.map((_, i) => `<span class="bt-step" data-i="${i}"></span>`).join('');
    }

    const stepDur = 60 / (t.bpm * tempoMul) / 2; // eighth-note duration
    AudioEngine.ensureCtx();
    scheduler = new AudioEngine.Scheduler(
      (step, time) => {
        const i = step % t.cells;
        // drums
        if (t.drums[i] === 'D') AudioEngine.dum(time, volumes.drums);
        else if (t.drums[i] === 't') AudioEngine.tek(time, volumes.drums * 0.7);
        // bass
        if (t.bass[i] >= 0) AudioEngine.pluckBassFromMidi(t.root + t.bass[i], time, volumes.bass * 0.55);
        // chords
        if (t.chordPat[i] && CHORDS[t.chord]) {
          AudioEngine.strumChord(CHORDS[t.chord].shape, 'd', time, volumes.chords * 0.4);
        }
      },
      (step) => {
        const i = step % t.cells;
        const dots = document.querySelectorAll('.bt-step');
        dots.forEach((d, j) => d.classList.toggle('active', j === i));
      }
    );
    scheduler.stepDur = stepDur;
    scheduler.numSteps = t.cells;
    scheduler.start();
    if (typeof activeSchedulers !== 'undefined') activeSchedulers.push(scheduler);
  }

  function stop() {
    if (scheduler) { scheduler.stop(); scheduler = null; }
    activeTrack = null;
    const mixer = document.querySelector('#bt-mixer');
    if (mixer) mixer.style.display = 'none';
  }

  return { init, stop };
})();


/* ============================================================
   6. JamSimulator — ג'אם סימולטור
   ============================================================ */
const JamSimulator = (() => {
  const PRESETS = {
    hitzaz:  { name: 'חיג׳אז D', root: 62, chords: ['D', 'Eb', 'Gm', 'D'],   bpm: 68 },
    minore:  { name: 'מינורה Dm', root: 50, chords: ['Dm', 'Gm', 'A7', 'Dm'], bpm: 80 },
    ousak:   { name: 'אוסאק Dm',  root: 50, chords: ['Dm', 'Eb', 'Cm', 'Dm'], bpm: 72 },
    rast:    { name: 'ראסט D',    root: 62, chords: ['D', 'C', 'G', 'D'],     bpm: 100 },
    kiourdi: { name: 'קיורדי Dm', root: 50, chords: ['Dm', 'G', 'C', 'Dm'],   bpm: 110 },
    niavent: { name: 'ניאוונט Dm',root: 50, chords: ['Dm', 'Eb', 'A7', 'Dm'], bpm: 75 },
  };

  const RHYTHMS_MAP = {
    zeibekiko:      { cells: 9, drums: ['D', '-', 't', '-', 'D', 't', 'D', 't', 't'] },
    hasapiko:       { cells: 8, drums: ['D', '-', 't', '-', 'D', 't', 't', '-'] },
    tsifteteli:     { cells: 8, drums: ['D', 't', '-', 't', 'D', '-', 't', '-'] },
    syrtos:         { cells: 8, drums: ['D', '-', 't', 't', 'D', '-', 't', '-'] },
    kalamatianos:   { cells: 7, drums: ['D', '-', '-', 't', '-', 't', '-'] },
    hasaposerviko:  { cells: 4, drums: ['D', 't', 'D', 't'] },
  };

  let scheduler = null, preset = null, rhythm = null;
  let bpm = 80, chordIdx = 0, stepCount = 0;
  let volumes = { drums: 0.7, bass: 0.6, chords: 0.5 };

  function init() {
    const el = document.querySelector('#jam-app');
    if (!el) return;
    el.innerHTML = `
      <h2>ג'אם סימולטור</h2>
      <div class="jam-controls">
        <label>דרומוס:
          <select id="jam-preset">${Object.entries(PRESETS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select>
        </label>
        <label>מקצב:
          <select id="jam-rhythm">${Object.entries(RHYTHMS_MAP).map(([k]) => `<option value="${k}">${k}</option>`).join('')}</select>
        </label>
        <label>טמפו: <input type="range" id="jam-bpm" min="40" max="200" value="80"><span id="jam-bpm-val">80</span></label>
      </div>
      <div class="jam-prog" id="jam-prog"></div>
      <div class="jam-vol">
        <label>תופים <input type="range" id="jam-vol-drums" min="0" max="100" value="70"></label>
        <label>בס <input type="range" id="jam-vol-bass" min="0" max="100" value="60"></label>
        <label>אקורדים <input type="range" id="jam-vol-chords" min="0" max="100" value="50"></label>
      </div>
      <div class="jam-btns">
        <button id="jam-start" class="btn btn-gold">&#9654; התחל ג'אם</button>
        <button id="jam-stop" class="btn accent-red" style="display:none">&#9632; עצור</button>
      </div>
      <div id="jam-steps" class="bt-steps"></div>
    `;

    const selPreset = document.querySelector('#jam-preset');
    const selRhythm = document.querySelector('#jam-rhythm');
    const bpmInp = document.querySelector('#jam-bpm');

    selPreset.addEventListener('change', () => updatePreset());
    selRhythm.addEventListener('change', () => { rhythm = RHYTHMS_MAP[selRhythm.value]; });
    bpmInp.addEventListener('input', e => {
      bpm = +e.target.value;
      document.querySelector('#jam-bpm-val').textContent = bpm;
      if (scheduler) scheduler.stepDur = 60 / bpm / 2;
    });

    ['drums', 'bass', 'chords'].forEach(k => {
      const inp = document.querySelector('#jam-vol-' + k);
      if (inp) inp.addEventListener('input', e => { volumes[k] = +e.target.value / 100; });
    });

    document.querySelector('#jam-start').addEventListener('click', () => startJam());
    document.querySelector('#jam-stop').addEventListener('click', () => stop());

    updatePreset();
  }

  function updatePreset() {
    const key = document.querySelector('#jam-preset')?.value || 'hitzaz';
    preset = PRESETS[key];
    bpm = preset.bpm;
    const bpmInp = document.querySelector('#jam-bpm');
    if (bpmInp) bpmInp.value = bpm;
    const bpmVal = document.querySelector('#jam-bpm-val');
    if (bpmVal) bpmVal.textContent = bpm;
    rhythm = RHYTHMS_MAP[document.querySelector('#jam-rhythm')?.value || 'zeibekiko'];
    renderProg();
  }

  function renderProg() {
    const el = document.querySelector('#jam-prog');
    if (!el || !preset) return;
    el.innerHTML = '<strong>תהלוכה:</strong> ' + preset.chords.map((c, i) =>
      `<span class="jam-chord${i === chordIdx ? ' active' : ''}" data-i="${i}">${CHORDS[c]?.he || c}</span>`
    ).join(' → ');
  }

  function startJam() {
    stop();
    if (!preset || !rhythm) return;
    AudioEngine.ensureCtx();
    chordIdx = 0;
    stepCount = 0;

    document.querySelector('#jam-start').style.display = 'none';
    document.querySelector('#jam-stop').style.display = '';

    // render step indicators
    const stepsEl = document.querySelector('#jam-steps');
    if (stepsEl) stepsEl.innerHTML = rhythm.drums.map((_, i) => `<span class="bt-step" data-i="${i}"></span>`).join('');

    const beatsPerChord = rhythm.cells * 2; // 2 bars per chord
    scheduler = new AudioEngine.Scheduler(
      (step, time) => {
        const i = step % rhythm.cells;
        // advance chord every 2 bars
        chordIdx = Math.floor(stepCount / beatsPerChord) % preset.chords.length;
        const chordName = preset.chords[chordIdx];
        const chordData = CHORDS[chordName];

        // drums
        if (rhythm.drums[i] === 'D') AudioEngine.dum(time, volumes.drums);
        else if (rhythm.drums[i] === 't') AudioEngine.tek(time, volumes.drums * 0.7);

        // bass on beat 1 of each bar
        if (i === 0) {
          AudioEngine.pluckBassFromMidi(preset.root, time, volumes.bass * 0.5);
        }

        // chord strum on beat 1
        if (i === 0 && chordData) {
          AudioEngine.strumChord(chordData.shape, 'd', time + 0.01, volumes.chords * 0.35);
        }
        stepCount++;
      },
      (step) => {
        const i = step % rhythm.cells;
        document.querySelectorAll('#jam-steps .bt-step').forEach((d, j) => d.classList.toggle('active', j === i));
        renderProg();
      }
    );
    scheduler.stepDur = 60 / bpm / 2;
    scheduler.numSteps = rhythm.cells;
    scheduler.start();
    if (typeof activeSchedulers !== 'undefined') activeSchedulers.push(scheduler);
  }

  function stop() {
    if (scheduler) { scheduler.stop(); scheduler = null; }
    stepCount = 0;
    chordIdx = 0;
    const startBtn = document.querySelector('#jam-start');
    const stopBtn = document.querySelector('#jam-stop');
    if (startBtn) startBtn.style.display = '';
    if (stopBtn) stopBtn.style.display = 'none';
  }

  return { init, stop };
})();


/* ============================================================
   7. XpSystem — מערכת ניקוד והישגים
   ============================================================ */
const XpSystem = (() => {
  const STORAGE_KEY = 'bouzouki_xp';

  const LEVELS = [
    { min: 0,    label: 'מתחיל' },
    { min: 100,  label: 'תלמיד' },
    { min: 250,  label: 'מתקדם' },
    { min: 500,  label: 'נגן' },
    { min: 1000, label: 'מוזיקאי' },
    { min: 2000, label: 'ווירטואוז' },
    { min: 4000, label: 'מאסטרו' },
  ];

  const ACHIEVEMENT_DEFS = {
    first_exercise:  { he: 'צעד ראשון', desc: 'השלמת תרגיל ראשון', icon: '&#127942;' },
    perfect_score:   { he: 'מושלם!',    desc: 'ציון מושלם בתרגיל',   icon: '&#11088;' },
    streak_10:       { he: 'על גלגל',   desc: 'רצף של 10 תשובות',   icon: '&#128293;' },
    all_dromoi:      { he: 'כל הדרומוי', desc: 'תרגול כל הדרומוסים',  icon: '&#127926;' },
    exercises_100:   { he: 'מאה!',      desc: '100 תרגילים',        icon: '&#128170;' },
  };

  let data = { xp: 0, achievements: [], history: [], exerciseCount: 0 };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) data = JSON.parse(raw);
    } catch (e) { /* ignore */ }
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
  }

  function getLevel() {
    let lvl = 0;
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (data.xp >= LEVELS[i].min) { lvl = i; break; }
    }
    return lvl;
  }

  function getLevelInfo() {
    const lvl = getLevel();
    const cur = LEVELS[lvl];
    const next = LEVELS[lvl + 1] || { min: cur.min + 1000 };
    const progress = (data.xp - cur.min) / (next.min - cur.min);
    return { level: lvl + 1, label: cur.label, xp: data.xp, progress: Math.min(1, progress), nextMin: next.min };
  }

  function award(amount, reason, opts = {}) {
    if (!amount || amount <= 0) return;
    data.xp += amount;
    data.exerciseCount++;
    data.history.push({ amount, reason, ts: Date.now() });
    if (data.history.length > 200) data.history = data.history.slice(-200);
    checkAchievements();
    save();
    renderBadge();
    if (!opts.skipStreakTouch && typeof DailyStreak !== 'undefined') {
      DailyStreak.touch('xp');
    }
    if (typeof ProgressLog !== 'undefined') {
      ProgressLog.log('xp', reason || 'תרגול', { meta: { amount } });
    }
  }

  function checkAchievements() {
    if (data.exerciseCount >= 1 && !data.achievements.includes('first_exercise'))
      data.achievements.push('first_exercise');
    if (data.exerciseCount >= 100 && !data.achievements.includes('exercises_100'))
      data.achievements.push('exercises_100');
  }

  function unlockAchievement(id) {
    if (data.achievements.includes(id)) return;
    data.achievements.push(id);
    save();
    showAchievementPopup(id);
    renderBadge();
  }

  function showAchievementPopup(id) {
    const def = ACHIEVEMENT_DEFS[id];
    if (!def) return;
    const popup = document.createElement('div');
    popup.className = 'xp-achievement-popup';
    popup.innerHTML = `<span class="xp-ach-icon">${def.icon}</span> <strong>${def.he}</strong><br><small>${def.desc}</small>`;
    document.body.appendChild(popup);
    setTimeout(() => popup.classList.add('show'), 50);
    setTimeout(() => { popup.classList.remove('show'); setTimeout(() => popup.remove(), 400); }, 3000);
  }

  function renderBadge() {
    document.querySelector('#xp-badge')?.remove();
    const el = document.querySelector('#sidebar-xp');
    if (!el) return;
    const info = getLevelInfo();
    if (info.xp <= 0 && data.exerciseCount <= 0) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.textContent = `רמה ${info.level} · ${info.label} · ${info.xp} XP`;
    el.hidden = false;
  }

  function getXp() { return data.xp; }
  function getAchievements() { return [...data.achievements]; }

  function init() {
    load();
    renderBadge();
    // inject styles if not present
    if (!document.querySelector('#xp-styles')) {
      const style = document.createElement('style');
      style.id = 'xp-styles';
      style.textContent = `
        .xp-achievement-popup {
          position: fixed; top: 20px; left: 50%; transform: translateX(-50%) translateY(-60px);
          background: var(--bg-card, #1a1a2e); border: 2px solid var(--gold, #e3b341);
          border-radius: 14px; padding: 14px 24px; z-index: 10000;
          font-size: 15px; color: var(--text, #eee); text-align: center;
          opacity: 0; transition: transform 0.4s, opacity 0.4s; direction: rtl;
          box-shadow: 0 4px 20px rgba(227,179,65,0.3);
        }
        .xp-achievement-popup.show { opacity: 1; transform: translateX(-50%) translateY(0); }
        .xp-ach-icon { font-size: 28px; }

        /* Shared module styles */
        .it-score { display: flex; gap: 14px; justify-content: center; margin: 10px 0; font-size: 15px; }
        .stat { padding: 4px 10px; border-radius: 8px; background: var(--bg-elev, #222); }
        .stat.err { color: var(--accent-red, #e74c3c); }
        .stat.streak { color: var(--gold, #e3b341); }
        .it-options { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 12px 0; }
        .it-btn { min-width: 110px; padding: 8px 14px; border-radius: 8px; font-size: 14px;
          background: var(--bg-elev, #222); color: var(--text, #eee); border: 1px solid var(--line, #444);
          cursor: pointer; transition: background 0.2s, border-color 0.2s; }
        .it-btn:hover { border-color: var(--gold, #e3b341); }
        .it-btn.correct { background: var(--ok, #27ae60); border-color: var(--ok, #27ae60); color: #fff; }
        .it-btn.wrong { background: var(--accent-red, #e74c3c); border-color: var(--accent-red, #e74c3c); color: #fff; }
        .it-feedback { text-align: center; margin: 10px 0; min-height: 40px; font-size: 15px; }
        .it-feedback .ok { color: var(--ok, #27ae60); }
        .it-feedback .err { color: var(--accent-red, #e74c3c); }
        .btn-gold { background: var(--gold, #e3b341); color: #111; font-weight: 700; }
        .btn-sm { padding: 4px 10px; font-size: 12px; }
        .accent-red { background: var(--accent-red, #e74c3c); color: #fff; }

        .bt-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 12px; margin: 12px 0; }
        .bt-card { background: var(--bg-card, #1a1a2e); border: 1px solid var(--line, #333);
          border-radius: 10px; padding: 14px; text-align: center; }
        .bt-card .bt-name { font-weight: 700; color: var(--gold, #e3b341); margin-bottom: 4px; }
        .bt-card .bt-info { font-size: 12px; color: var(--text-dim, #999); }
        .bt-card .bt-dromos { font-size: 12px; margin: 6px 0; }
        .bt-mixer { background: var(--bg-elev, #222); border-radius: 12px; padding: 16px; margin: 12px 0; }
        .bt-vol, .bt-tempo, .jam-vol { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; margin: 8px 0; }
        .bt-vol label, .bt-tempo label, .jam-vol label { display: flex; align-items: center; gap: 6px; font-size: 13px; }
        .bt-steps, #jam-steps { display: flex; gap: 4px; justify-content: center; margin: 10px 0; }
        .bt-step { width: 18px; height: 18px; border-radius: 50%; background: var(--line, #333);
          transition: background 0.1s; }
        .bt-step.active { background: var(--gold, #e3b341); }

        .sc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; margin: 12px 0; }
        .sc-card { background: var(--bg-card, #1a1a2e); border: 1px solid var(--line, #333);
          border-radius: 10px; padding: 12px; text-align: center; cursor: pointer; }
        .sc-card:hover { border-color: var(--gold, #e3b341); }
        .sc-roman { font-size: 20px; font-weight: 700; color: var(--gold, #e3b341); }
        .sc-name { font-size: 13px; margin: 4px 0; }
        .sc-quality { font-size: 11px; color: var(--text-dim, #999); }
        .sc-role { font-size: 11px; color: var(--aegean, #4fb3d9); }
        .sc-prog { font-size: 15px; margin: 6px 0; padding: 8px; background: var(--bg-elev, #222);
          border-radius: 8px; text-align: center; }

        .ex-controls, .sc-controls, .mq-controls, .jam-controls {
          display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 10px 0; }
        .ex-formula { margin: 10px 0; padding: 10px; background: var(--bg-elev, #222); border-radius: 8px; }
        .ex-chords-info { font-size: 13px; color: var(--text-dim, #999); margin-bottom: 8px; }

        .jam-prog { margin: 10px 0; font-size: 15px; text-align: center; }
        .jam-chord { padding: 4px 10px; border-radius: 6px; background: var(--bg-elev, #222);
          display: inline-block; margin: 2px; }
        .jam-chord.active { background: var(--gold, #e3b341); color: #111; font-weight: 700; }
        .jam-btns { display: flex; gap: 10px; justify-content: center; margin: 10px 0; }
      `;
      document.head.appendChild(style);
    }
  }

  function stop() { /* persistent */ }

  return { init, stop, award, getLevel, getXp, getAchievements, unlockAchievement };
})();
