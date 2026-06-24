/* ============================================================
   כרומטי טיונר לבוזוקי — BouzoukiTuner
   מכוון כרומטי מקצועי עם זיהוי קורס אוטומטי,
   צליל ייחוס, כיוונונים חלופיים ומד סטיה ויזואלי
   ============================================================ */
'use strict';

const BouzoukiTuner = (() => {

  /* ---------- כיוונונים ---------- */
  const TUNINGS = {
    standard: {
      label: 'סטנדרטי C-F-A-D',
      courses: [
        { course: 1, note: 'D', midi: 62, pair: 'unison' },
        { course: 2, note: 'A', midi: 57, pair: 'unison' },
        { course: 3, note: 'F', midi: 53, pair: 'octave' },
        { course: 4, note: 'C', midi: 48, pair: 'octave' },
      ]
    },
    openD: {
      label: 'Open D — D-F#-A-D',
      courses: [
        { course: 1, note: 'D', midi: 62, pair: 'unison' },
        { course: 2, note: 'A', midi: 57, pair: 'unison' },
        { course: 3, note: 'F#', midi: 54, pair: 'octave' },
        { course: 4, note: 'D', midi: 50, pair: 'octave' },
      ]
    },
    trichord: {
      label: 'טריחורדו D-A-D',
      courses: [
        { course: 1, note: 'D', midi: 62, pair: 'unison' },
        { course: 2, note: 'A', midi: 57, pair: 'unison' },
        { course: 3, note: 'D', midi: 50, pair: 'octave' },
      ]
    }
  };

  /* ---------- קבועים ---------- */
  const A4 = 440;
  const POLL_MS = 30;
  const IN_TUNE_CENTS = 5;
  const CLOSE_CENTS = 15;
  const HISTORY_SIZE = 5;

  /* ---------- מצב ---------- */
  let micStream = null;
  let micCtx = null;
  let analyser = null;
  let pollTimer = null;
  let running = false;
  let currentTuning = 'standard';
  let history = [];
  let referencePlaying = null;

  /* ---------- ייצוב קריאות ---------- */
  const FREQ_BUF = 7;          // חלון חציון לתדר
  const STABLE_FRAMES = 3;     // כמה פריימים יציבים לפני התחייבות לתו
  let _freqBuf = [];
  let _emaCents = null;        // החלקת המחט
  let _noteCommit = { name: null, count: 0 };
  function median(arr) {
    const s = arr.slice().sort((a, b) => a - b);
    const m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function resetStable() { _freqBuf = []; _emaCents = null; _noteCommit = { name: null, count: 0 }; }

  /* ---------- עזר ---------- */
  function freqToMidiFloat(f) { return 69 + 12 * Math.log2(f / A4); }
  function midiToFreq(m) { return A4 * Math.pow(2, (m - 69) / 12); }
  function noteName(midi) { return NOTE_NAMES[((midi % 12) + 12) % 12]; }
  function centsFromTarget(freq, targetFreq) {
    return 1200 * Math.log2(freq / targetFreq);
  }

  /* ---------- UI רינדור ---------- */
  function render() {
    const container = document.querySelector('#tuner-app');
    if (!container) return;

    container.innerHTML = `
      <div class="ct-wrap">
        <!-- בחירת כיוונון -->
        <div class="ct-controls">
          <select id="ct-tuning" class="ct-select">
            ${Object.entries(TUNINGS).map(([k, v]) =>
              `<option value="${k}"${k === currentTuning ? ' selected' : ''}>${v.label}</option>`
            ).join('')}
          </select>
          <button class="btn gold ct-btn-toggle" id="ct-toggle">
            <span class="ct-mic-icon">&#9679;</span> הפעל מכוון
          </button>
        </div>

        <!-- תצוגת צליל ראשית -->
        <div class="ct-display card">
          <div class="ct-note-row">
            <div class="ct-note-big" id="ct-note">—</div>
            <div class="ct-solfege" id="ct-solfege"></div>
          </div>
          <div class="ct-freq" id="ct-freq"></div>

          <!-- מד סטייה -->
          <div class="ct-meter">
            <div class="ct-meter-labels">
              <span>-50</span><span>-25</span><span>0</span><span>+25</span><span>+50</span>
            </div>
            <div class="ct-meter-track">
              <div class="ct-meter-zone ct-zone-red-l"></div>
              <div class="ct-meter-zone ct-zone-yellow-l"></div>
              <div class="ct-meter-zone ct-zone-green"></div>
              <div class="ct-meter-zone ct-zone-yellow-r"></div>
              <div class="ct-meter-zone ct-zone-red-r"></div>
              <div class="ct-meter-center"></div>
              <div class="ct-needle" id="ct-needle"></div>
            </div>
          </div>

          <!-- אינדיקטור כיוונון -->
          <div class="ct-status" id="ct-status"></div>

          <!-- מד עוצמה -->
          <div class="ct-level-wrap">
            <div class="ct-level-label">עוצמה</div>
            <div class="ct-level-bar">
              <div class="ct-level-fill" id="ct-level-fill"></div>
            </div>
          </div>
        </div>

        <!-- זיהוי קורס -->
        <div class="ct-courses" id="ct-courses"></div>

        <!-- היסטוריה -->
        <div class="ct-history-row">
          <span class="ct-history-label">אחרונים:</span>
          <div class="ct-history" id="ct-history"></div>
        </div>

        <!-- שגיאה -->
        <div class="ct-error" id="ct-error"></div>
      </div>
    `;

    renderCourses();
  }

  function renderCourses() {
    const wrap = document.querySelector('#ct-courses');
    if (!wrap) return;
    const tuning = TUNINGS[currentTuning];
    wrap.innerHTML = tuning.courses.map((c, i) => `
      <div class="ct-course" data-idx="${i}" title="לחצו לשמוע צליל ייחוס">
        <div class="ct-course-num">קורס ${c.course}</div>
        <div class="ct-course-note">${c.note}</div>
        <div class="ct-course-solfege">${SOLFEGE[c.note] || c.note}</div>
        <div class="ct-course-pair">${c.pair === 'octave' ? 'זוג אוקטבה' : 'זוג יוניסון'}</div>
        <div class="ct-course-hz">${midiToFreq(c.midi).toFixed(1)} Hz</div>
      </div>
    `).join('');
  }

  /* ---------- עדכון תצוגה ---------- */
  function updateDisplay(noteStr, solfegeStr, freqStr, cents, rms, matchedCourse) {
    const noteEl = document.querySelector('#ct-note');
    const solfegeEl = document.querySelector('#ct-solfege');
    const freqEl = document.querySelector('#ct-freq');
    const needle = document.querySelector('#ct-needle');
    const status = document.querySelector('#ct-status');
    const levelFill = document.querySelector('#ct-level-fill');

    if (!noteEl) return;

    noteEl.textContent = noteStr || '—';
    solfegeEl.textContent = solfegeStr || '';
    freqEl.textContent = freqStr || '';

    // מחט
    if (cents === null || cents === undefined) {
      needle.style.opacity = '0.2';
      needle.style.left = '50%';
      status.textContent = '';
      status.className = 'ct-status';
    } else {
      needle.style.opacity = '1';
      const clamped = Math.max(-50, Math.min(50, cents));
      const pct = 50 + clamped;
      needle.style.left = pct + '%';

      const absCents = Math.abs(cents);
      // cents>0 = הצליל גבוה מדי → צריך להנמיך (לשחרר). cents<0 = נמוך → להגביה (למתוח).
      const sharp = cents > 0;
      const dir = sharp ? 'הנמך 🔽 (שחרר)' : 'הגבה 🔼 (מתח)';
      if (absCents <= IN_TUNE_CENTS) {
        status.textContent = '✓ מכוון!';
        status.className = 'ct-status ct-intune';
        needle.className = 'ct-needle ct-needle-green';
      } else if (absCents <= CLOSE_CENTS) {
        status.textContent = 'כמעט — ' + dir;
        status.className = 'ct-status ct-close';
        needle.className = 'ct-needle ct-needle-yellow';
      } else {
        status.textContent = (sharp ? 'גבוה מדי — ' : 'נמוך מדי — ') + dir;
        status.className = 'ct-status ct-off';
        needle.className = 'ct-needle ct-needle-red';
      }
    }

    // מד עוצמה
    const level = rms != null ? Math.min(100, rms * 600) : 0;
    levelFill.style.width = level + '%';

    // הדגשת קורס
    const courseEls = document.querySelectorAll('.ct-course');
    courseEls.forEach(el => el.classList.remove('ct-course-match'));
    if (matchedCourse !== null && matchedCourse !== undefined) {
      const matched = document.querySelector(`.ct-course[data-idx="${matchedCourse}"]`);
      if (matched) matched.classList.add('ct-course-match');
    }
  }

  function addToHistory(noteName, cents) {
    history.push({ note: noteName, cents });
    if (history.length > HISTORY_SIZE) history.shift();
    renderHistory();
  }

  function renderHistory() {
    const el = document.querySelector('#ct-history');
    if (!el) return;
    el.innerHTML = history.map(h => {
      const absCents = Math.abs(h.cents);
      let cls = 'ct-hist-badge';
      if (absCents <= IN_TUNE_CENTS) cls += ' ct-hist-green';
      else if (absCents <= CLOSE_CENTS) cls += ' ct-hist-yellow';
      else cls += ' ct-hist-red';
      return `<span class="${cls}">${h.note}</span>`;
    }).join('');
  }

  /* ---------- זיהוי קורס ---------- */
  function findMatchingCourse(midiFloat) {
    const tuning = TUNINGS[currentTuning];
    const midi = Math.round(midiFloat);
    const pc = ((midi % 12) + 12) % 12;

    for (let i = 0; i < tuning.courses.length; i++) {
      const c = tuning.courses[i];
      const cPc = ((c.midi % 12) + 12) % 12;
      // התאמה ישירה
      if (pc === cPc) return i;
      // לקורסים עם זוג אוקטבה — גם אוקטבה מעל
      if (c.pair === 'octave') {
        const octPc = (((c.midi + 12) % 12) + 12) % 12;
        if (pc === octPc) return i;
      }
    }
    return null;
  }

  function getNearestTarget(freq) {
    const tuning = TUNINGS[currentTuning];
    let bestDist = Infinity;
    let bestFreq = null;

    for (const c of tuning.courses) {
      const f = midiToFreq(c.midi);
      // בדוק את היסוד
      let d = Math.abs(1200 * Math.log2(freq / f));
      if (d < bestDist) { bestDist = d; bestFreq = f; }
      // עבור זוגות אוקטבה — בדוק גם אוקטבה מעל
      if (c.pair === 'octave') {
        const f2 = f * 2;
        d = Math.abs(1200 * Math.log2(freq / f2));
        if (d < bestDist) { bestDist = d; bestFreq = f2; }
      }
    }
    return bestFreq;
  }

  /* ---------- לולאת דגימה ---------- */
  function poll() {
    if (!analyser) return;

    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const { freq, rms } = Listen.detectPitch(buf, micCtx.sampleRate);

    if (!freq) {
      resetStable();
      updateDisplay(null, null, null, null, rms || 0, null);
      return;
    }

    // תיקון שגיאות אוקטבה מול החציון הרץ (מקור עיקרי לקפיצות)
    let f = freq;
    if (_freqBuf.length >= 3) {
      const med = median(_freqBuf);
      if (f > med * 1.6) f /= 2;
      else if (f < med * 0.625) f *= 2;
    }
    _freqBuf.push(f);
    if (_freqBuf.length > FREQ_BUF) _freqBuf.shift();
    const sf = median(_freqBuf);     // תדר מוחלק (עמיד לרעש ולקפיצות)

    const mf = freqToMidiFloat(sf);
    const midi = Math.round(mf);
    const pc = ((midi % 12) + 12) % 12;
    const name = NOTE_NAMES[pc];
    const solfege = SOLFEGE[name] || '';

    // חשב סטייה מהקורס הקרוב ביותר, אחרת מהתו הכרומטי
    const nearestTarget = getNearestTarget(sf);
    let cents;
    if (nearestTarget && Math.abs(1200 * Math.log2(sf / nearestTarget)) < 80) {
      cents = centsFromTarget(sf, nearestTarget);
    } else {
      cents = (mf - midi) * 100;
    }

    // החלקת המחט (EMA) כדי שהיא תזוז חלק ולא תקפוץ
    _emaCents = (_emaCents === null) ? cents : _emaCents * 0.6 + cents * 0.4;

    const matchedCourse = findMatchingCourse(mf);

    updateDisplay(name, solfege, sf.toFixed(1) + ' Hz', _emaCents, rms, matchedCourse);

    // התחייבות לתו רק כשהוא יציב מספר פריימים — מונע "ריצוד" בהיסטוריה
    if (_noteCommit.name === name) _noteCommit.count++;
    else _noteCommit = { name, count: 1 };
    if (_noteCommit.count === STABLE_FRAMES) addToHistory(name, _emaCents);
  }

  /* ---------- מיקרופון ---------- */
  async function enableMic() {
    if (micStream) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showError('הדפדפן לא תומך בגישה למיקרופון. נסו Chrome או Edge.');
      return false;
    }
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });
      micCtx = new (window.AudioContext || window.webkitAudioContext)();
      const src = micCtx.createMediaStreamSource(micStream);
      analyser = micCtx.createAnalyser();
      analyser.fftSize = 4096;
      AudioEngine.micBoost(src).connect(analyser);
      showError('');
      return true;
    } catch (e) {
      showError('לא ניתן לגשת למיקרופון — אשרו את הבקשה בדפדפן.');
      return false;
    }
  }

  function showError(msg) {
    const el = document.querySelector('#ct-error');
    if (el) el.textContent = msg;
  }

  /* ---------- צליל ייחוס ---------- */
  function playReference(courseIdx) {
    AudioEngine.ensureCtx();
    const tuning = TUNINGS[currentTuning];
    const c = tuning.courses[courseIdx];
    if (!c) return;
    AudioEngine.pluckCourse(courseIdx, 0, 0, 0.6);

    // אנימציית "מצלצל"
    const el = document.querySelector(`.ct-course[data-idx="${courseIdx}"]`);
    if (el) {
      el.classList.add('ct-course-ringing');
      setTimeout(() => el.classList.remove('ct-course-ringing'), 1200);
    }
  }

  /* ---------- ממשק ציבורי ---------- */
  function init() {
    render();
    injectStyles();
    bindEvents();
  }

  function bindEvents() {
    // כפתור התחל/עצור
    const toggle = document.querySelector('#ct-toggle');
    if (toggle) toggle.addEventListener('click', toggleTuner);

    // בחירת כיוונון
    const sel = document.querySelector('#ct-tuning');
    if (sel) sel.addEventListener('change', (e) => {
      currentTuning = e.target.value;
      renderCourses();
    });

    // כפתורי קורס — צליל ייחוס
    const coursesWrap = document.querySelector('#ct-courses');
    if (coursesWrap) coursesWrap.addEventListener('click', (e) => {
      const card = e.target.closest('.ct-course');
      if (card) playReference(parseInt(card.dataset.idx, 10));
    });
  }

  async function toggleTuner() {
    if (running) {
      stop();
      return;
    }
    await start();
  }

  async function start() {
    const ok = await enableMic();
    if (!ok) return;
    running = true;
    history = [];
    resetStable();
    renderHistory();
    pollTimer = setInterval(poll, POLL_MS);

    const toggle = document.querySelector('#ct-toggle');
    if (toggle) {
      toggle.innerHTML = '<span class="ct-mic-icon ct-mic-active">&#9679;</span> עצור מכוון';
      toggle.classList.add('ct-active');
    }
  }

  function stop() {
    running = false;
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }

    // שחרר מיקרופון
    if (micStream) {
      micStream.getTracks().forEach(t => t.stop());
      micStream = null;
    }
    if (micCtx) {
      micCtx.close().catch(() => {});
      micCtx = null;
    }
    analyser = null;

    updateDisplay(null, null, null, null, 0, null);

    const toggle = document.querySelector('#ct-toggle');
    if (toggle) {
      toggle.innerHTML = '<span class="ct-mic-icon">&#9679;</span> הפעל מכוון';
      toggle.classList.remove('ct-active');
    }
  }

  /* ---------- הזרקת CSS ---------- */
  function injectStyles() {
    if (document.querySelector('#ct-styles')) return;
    const style = document.createElement('style');
    style.id = 'ct-styles';
    style.textContent = `
/* ============================================================
   Chromatic Tuner Styles
   ============================================================ */
.ct-wrap {
  max-width: 640px;
  margin: 0 auto;
}

/* --- Controls --- */
.ct-controls {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.ct-select {
  background: var(--bg-elev);
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 10px 14px;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
  flex: 1;
  min-width: 160px;
}
.ct-select:focus { outline: none; border-color: var(--gold); }

.ct-btn-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.ct-mic-icon {
  display: inline-block;
  width: 12px;
  height: 12px;
  line-height: 12px;
  font-size: 14px;
  color: var(--accent-red);
  transition: all 0.3s;
}
.ct-mic-active {
  color: var(--accent-red);
  animation: ct-pulse 1s infinite;
}
@keyframes ct-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.ct-active { background: var(--accent-red) !important; border-color: var(--accent-red) !important; }
.ct-active .ct-mic-icon { color: #fff; }

/* --- Main display --- */
.ct-display {
  text-align: center;
  padding: 28px 20px 22px !important;
}
.ct-note-row {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10px;
  margin-bottom: 4px;
}
.ct-note-big {
  font-size: 64px;
  font-weight: 900;
  color: var(--gold);
  line-height: 1;
  transition: color 0.2s;
}
.ct-solfege {
  font-size: 22px;
  color: var(--text-dim);
  font-weight: 500;
}
.ct-freq {
  font-size: 14px;
  color: var(--text-dim);
  margin-bottom: 18px;
  min-height: 20px;
}

/* --- Meter --- */
.ct-meter {
  margin: 0 auto 14px;
  max-width: 440px;
}
.ct-meter-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--text-dim);
  padding: 0 2px;
  margin-bottom: 4px;
}
.ct-meter-track {
  position: relative;
  height: 28px;
  border-radius: 14px;
  background: var(--bg-deep);
  border: 1px solid var(--line);
  display: flex;
  overflow: hidden;
}
.ct-meter-zone {
  flex: 1;
}
.ct-zone-red-l   { background: linear-gradient(90deg, rgba(217,100,89,0.25), rgba(217,100,89,0.10)); }
.ct-zone-yellow-l { background: linear-gradient(90deg, rgba(227,179,65,0.10), rgba(227,179,65,0.15)); }
.ct-zone-green    { background: linear-gradient(90deg, rgba(95,200,143,0.12), rgba(95,200,143,0.20), rgba(95,200,143,0.12)); }
.ct-zone-yellow-r { background: linear-gradient(90deg, rgba(227,179,65,0.15), rgba(227,179,65,0.10)); }
.ct-zone-red-r    { background: linear-gradient(90deg, rgba(217,100,89,0.10), rgba(217,100,89,0.25)); }

.ct-meter-center {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  margin-left: -1px;
  background: var(--text-dim);
  opacity: 0.5;
  z-index: 1;
}
.ct-needle {
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: 4px;
  margin-left: -2px;
  border-radius: 2px;
  background: var(--gold);
  left: 50%;
  transition: left 0.13s ease-out, background 0.2s, box-shadow 0.2s;
  z-index: 2;
  opacity: 0.2;
}
.ct-needle-green {
  background: var(--ok);
  box-shadow: 0 0 12px rgba(95,200,143,0.6), 0 0 24px rgba(95,200,143,0.3);
}
.ct-needle-yellow {
  background: var(--gold);
  box-shadow: 0 0 8px rgba(227,179,65,0.4);
}
.ct-needle-red {
  background: var(--accent-red);
  box-shadow: 0 0 8px rgba(217,100,89,0.4);
}

/* --- Status --- */
.ct-status {
  font-size: 16px;
  font-weight: 700;
  min-height: 26px;
  margin-bottom: 14px;
  transition: color 0.2s;
}
.ct-intune { color: var(--ok); }
.ct-close  { color: var(--gold); }
.ct-off    { color: var(--accent-red); }

/* --- Level meter --- */
.ct-level-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 320px;
  margin: 0 auto;
}
.ct-level-label {
  font-size: 12px;
  color: var(--text-dim);
  white-space: nowrap;
}
.ct-level-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--bg-deep);
  border: 1px solid var(--line);
  overflow: hidden;
}
.ct-level-fill {
  height: 100%;
  width: 0;
  border-radius: 3px;
  background: linear-gradient(90deg, var(--aegean), var(--ok));
  transition: width 0.06s;
}

/* --- Course cards --- */
.ct-courses {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  margin: 18px 0;
}
.ct-course {
  background: var(--bg-elev);
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
  cursor: pointer;
  transition: all 0.18s;
  position: relative;
}
.ct-course:hover {
  border-color: var(--gold);
  transform: translateY(-2px);
}
.ct-course-ringing {
  border-color: var(--gold) !important;
  box-shadow: 0 0 18px rgba(227,179,65,0.35);
}
.ct-course-match {
  border-color: var(--ok) !important;
  box-shadow: 0 0 16px rgba(95,200,143,0.35);
  background: linear-gradient(180deg, rgba(95,200,143,0.08), transparent);
}
.ct-course-num {
  font-size: 11px;
  color: var(--text-dim);
  margin-bottom: 4px;
}
.ct-course-note {
  font-size: 28px;
  font-weight: 900;
  color: var(--gold);
}
.ct-course-solfege {
  font-size: 13px;
  color: var(--text);
  margin: 2px 0;
}
.ct-course-pair {
  font-size: 11px;
  color: var(--text-dim);
}
.ct-course-hz {
  font-size: 11px;
  color: var(--aegean);
  margin-top: 4px;
}

/* --- History --- */
.ct-history-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  min-height: 32px;
}
.ct-history-label {
  font-size: 12px;
  color: var(--text-dim);
  white-space: nowrap;
}
.ct-history {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.ct-hist-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 26px;
  padding: 0 8px;
  border-radius: 13px;
  font-size: 13px;
  font-weight: 700;
  border: 1px solid var(--line);
  background: var(--bg-elev);
  color: var(--text-dim);
  transition: all 0.15s;
}
.ct-hist-green  { border-color: var(--ok);         color: var(--ok);         background: rgba(95,200,143,0.1); }
.ct-hist-yellow { border-color: var(--gold);        color: var(--gold);       background: rgba(227,179,65,0.1); }
.ct-hist-red    { border-color: var(--accent-red);  color: var(--accent-red); background: rgba(217,100,89,0.1); }

/* --- Error --- */
.ct-error {
  color: var(--accent-red);
  font-size: 13px;
  margin-top: 10px;
  text-align: center;
  min-height: 18px;
}

/* --- Responsive --- */
@media (max-width: 600px) {
  .ct-note-big { font-size: 48px; }
  .ct-solfege { font-size: 18px; }
  .ct-courses { grid-template-columns: repeat(2, 1fr); }
  .ct-controls { flex-direction: column; }
  .ct-select { width: 100%; }
}
`;
    document.head.appendChild(style);
  }

  return { init, start, stop };
})();
