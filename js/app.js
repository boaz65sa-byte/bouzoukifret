/* ============================================================
   בוזוקי אקדמי — לוגיקת האפליקציה
   ============================================================ */
'use strict';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}, parent = null) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

/* ===================== ניווט ===================== */
$$('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    $$('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    $$('.screen').forEach(s => s.classList.remove('active'));
    $('#screen-' + btn.dataset.screen).classList.add('active');
    if (btn.dataset.screen === 'songs' && typeof SongLibrary !== 'undefined' && SongLibrary.resetMobileView) {
      SongLibrary.resetMobileView();
    }
    if (btn.dataset.screen === 'learn-lib' && typeof LearnLibrary !== 'undefined') LearnLibrary.refresh();
    if (btn.dataset.screen === 'vocal-melody' && typeof VocalMelodyTeacher !== 'undefined') VocalMelodyTeacher.refresh();
    // מצייר מחדש את מסך הדרומוסים בכל כניסה (הרינדור הראשוני רץ מוקדם מדי ומשאיר גריף ריק)
    if (btn.dataset.screen === 'dromoi' && typeof renderDromos === 'function') renderDromos();
    stopAllPlayback();
  });
});

// בגרסת חנות (TWA/Capacitor) — מסתירים את כל אשכול "למד מהשיר (YouTube)": שלושת המסכים
// האלה נשענים על שרשרת הורדה/פרוקסי צד-שלישי שאסורה במפורש במדיניות שתי החנויות.
if (typeof StoreMode !== 'undefined' && StoreMode.isStoreBuild()) {
  ['learn', 'learn-lib', 'vocal-melody'].forEach(screen => {
    const btn = document.querySelector(`.nav-btn[data-screen="${screen}"]`);
    // .nav-btn { display:flex } בסגנון הראשי הייתה עוקפת בשקט את display:none של [hidden]
    // (אותה ספציפיות, כלל ה-author מנצח) — משתמשים ב-style ישיר כדי להימנע מהתנגשות cascade.
    if (btn) btn.style.display = 'none';
  });
}

let activeSchedulers = [];

/** מנועי נגינה רשומים — כל מודול שנכנס לרשימה ייעצר במעבר מסך */
const PLAYBACK_STOPPERS = new Map();

function registerPlayback(id, stopFn) {
  if (id && typeof stopFn === 'function') PLAYBACK_STOPPERS.set(id, stopFn);
}

function unregisterPlayback(id) {
  PLAYBACK_STOPPERS.delete(id);
}

/** האם מסך מסוים פעיל (למניעת נגינה ברקע) */
function isScreenActive(screenId) {
  const el = document.getElementById('screen-' + screenId);
  return el && el.classList.contains('active');
}

function stopAllPlayback() {
  activeSchedulers.forEach(s => s.stop());
  activeSchedulers = [];
  clearTimeout(scaleTimer);
  scaleTimer = null;
  if (typeof AudioEngine !== 'undefined') AudioEngine.stopModeScale();
  stopPenia();
  stopRhythm();
  stopMet();
  stopDrone();
  stopCoursePlay();
  if (typeof stopExercise === 'function') stopExercise();
  if (typeof Listen !== 'undefined') Listen.stopAll();
  if (typeof Game !== 'undefined') Game.stop();
  if (typeof MasterModes !== 'undefined') MasterModes.stop();
  if (typeof MasterChords !== 'undefined') MasterChords.stop();
  if (typeof SongLibrary !== 'undefined') SongLibrary.stopSong();
  if (typeof MicEngine !== 'undefined') MicEngine.stop();
  if (typeof BouzoukiTuner !== 'undefined') BouzoukiTuner.stop();
  if (typeof BackingTracks !== 'undefined') BackingTracks.stop();
  if (typeof JamSimulator !== 'undefined') JamSimulator.stop();
  if (typeof ExerciseGenerator !== 'undefined') ExerciseGenerator.stop();
  if (typeof MelodyGenerator !== 'undefined') MelodyGenerator.stop();
  if (typeof MelodyRecorder !== 'undefined') MelodyRecorder.stop();
  if (typeof SightReading !== 'undefined') SightReading.stop();
  if (typeof DrumMachine !== 'undefined') DrumMachine.stop();
  if (typeof LiveAnalyzer !== 'undefined') LiveAnalyzer.stop();
  if (typeof ScaleExplorer !== 'undefined') ScaleExplorer.stop();
  if (typeof ModeQuiz !== 'undefined') ModeQuiz.stop();
  if (typeof IntervalTrainer !== 'undefined') IntervalTrainer.stop();
  if (typeof MaqamGuide !== 'undefined') MaqamGuide.stop();
  if (typeof PeniaLearn !== 'undefined') PeniaLearn.stop();
  if (typeof DromosLearn !== 'undefined') DromosLearn.stop();
  if (typeof DromosRoad !== 'undefined') DromosRoad.stop();
  if (typeof TheoryLab !== 'undefined') TheoryLab.stop();
  if (typeof ArpStudio !== 'undefined') ArpStudio.stop();
  if (typeof ReferenceCards !== 'undefined') ReferenceCards.stop();
  if (typeof BouzoukiStudio !== 'undefined') BouzoukiStudio.stop();
  if (typeof SongTeacher !== 'undefined') SongTeacher.stop();
  if (typeof SkillsCoach !== 'undefined') SkillsCoach.stop();
  if (typeof SongLearn !== 'undefined') SongLearn.stop();
  if (typeof ModusPath !== 'undefined') ModusPath.stop();
  if (typeof PracticeLibrary !== 'undefined') PracticeLibrary.stop();
  if (typeof SongAcademy !== 'undefined') SongAcademy.stop();
  if (typeof LearnHub !== 'undefined') LearnHub.stop();
  if (typeof LearnLibrary !== 'undefined') LearnLibrary.stop();
  if (typeof VocalMelodyTeacher !== 'undefined') VocalMelodyTeacher.stop();
  if (typeof SongAnalyzer !== 'undefined') SongAnalyzer.stop();
  if (typeof ProgressDashboard !== 'undefined') ProgressDashboard.stop();
  if (typeof PitchPreservingPlayer !== 'undefined' && PitchPreservingPlayer.isPlaying()) {
    PitchPreservingPlayer.pause();
  }
  if (typeof PLAYBACK_STOPPERS !== 'undefined') PLAYBACK_STOPPERS.forEach(fn => { try { fn(); } catch (_) { /* noop */ } });
  const droneBtn = $('#dr-drone');
  if (droneBtn) droneBtn.classList.remove('playing');
}

/* ============================================================
   לוח סריגים — רינדור SVG אינטראקטיבי
   ============================================================ */
const FB = {
  left: 56, right: 18, top: 30, bottom: 26,
  width: 1040, height: 190,
};

function fretX(fret) {
  // מרווחים מתכווצים כמו בכלי אמיתי
  const usable = FB.width - FB.left - FB.right;
  const ratio = (1 - Math.pow(2, -fret / 12)) / (1 - Math.pow(2, -NUM_FRETS / 12));
  const x = FB.left + usable * ratio;
  if (typeof FretboardMirror !== 'undefined' && FretboardMirror.isH()) {
    return FB.left + (FB.width - FB.right - x);
  }
  return x;
}
function fretCenterX(fret) {
  const mirrored = typeof FretboardMirror !== 'undefined' && FretboardMirror.isH();
  if (fret === 0) return mirrored ? (FB.width - FB.right) + 26 : FB.left - 26;
  return (fretX(fret - 1) + fretX(fret)) / 2;
}
function courseY(ci) {
  const usable = FB.height - FB.top - FB.bottom;
  const y = FB.top + (ci / (TUNING.length - 1)) * usable;
  if (typeof FretboardMirror !== 'undefined' && FretboardMirror.isV()) {
    return FB.top + (FB.height - FB.bottom - y);
  }
  return y;
}

/* מצייר לוח סריגים. getNoteState(courseIdx, fret, midi) מחזיר:
   null = לא להציג, {type:'root'|'note', label} = להציג */
function drawFretboard(svg, getNoteState, opts = {}) {
  svg.innerHTML = '';
  svg.setAttribute('viewBox', `0 0 ${FB.width} ${FB.height}`);

  // רקע עץ
  const defs = svgEl('defs', {}, svg);
  const grad = svgEl('linearGradient', { id: 'wood' + svg.id, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  svgEl('stop', { offset: '0%', 'stop-color': '#3a2a1c' }, grad);
  svgEl('stop', { offset: '50%', 'stop-color': '#2c1f14' }, grad);
  svgEl('stop', { offset: '100%', 'stop-color': '#241a11' }, grad);
  svgEl('rect', {
    x: FB.left - 4, y: FB.top - 16, width: FB.width - FB.left - FB.right + 8,
    height: FB.height - FB.top - FB.bottom + 32, rx: 6, fill: `url(#wood${svg.id})`,
    stroke: '#1a120a', 'stroke-width': 1.5
  }, svg);

  // אינליי נקודות (סריגים 3,5,7,10,12,15)
  [3, 5, 7, 10, 12, 15].forEach(f => {
    if (f > NUM_FRETS) return;
    const cx = fretCenterX(f);
    const cy = (FB.top + FB.height - FB.bottom) / 2;
    if (f === 12) {
      svgEl('circle', { cx, cy: cy - 22, r: 4.5, fill: '#d8c9a0', opacity: 0.5 }, svg);
      svgEl('circle', { cx, cy: cy + 22, r: 4.5, fill: '#d8c9a0', opacity: 0.5 }, svg);
    } else {
      svgEl('circle', { cx, cy, r: 4.5, fill: '#d8c9a0', opacity: 0.45 }, svg);
    }
  });

  // סריגים
  for (let f = 0; f <= NUM_FRETS; f++) {
    const x = fretX(f);
    svgEl('line', {
      x1: x, y1: FB.top - 14, x2: x, y2: FB.height - FB.bottom + 14,
      stroke: f === 0 ? '#e8d9b0' : '#8a8378',
      'stroke-width': f === 0 ? 7 : 2.5,
    }, svg);
    // מספרי סריגים
    if (f > 0) {
      svgEl('text', {
        x: fretCenterX(f), y: FB.height - 4, fill: '#7d92a8',
        'font-size': 11, 'text-anchor': 'middle', 'font-family': 'Heebo, sans-serif'
      }, svg).textContent = f;
    }
  }

  // מיתרים (כל קורס = זוג קווים)
  TUNING.forEach((c, ci) => {
    const y = courseY(ci);
    const w = 1 + ci * 0.5;
    svgEl('line', { x1: FB.left - 4, y1: y - 2, x2: FB.width - FB.right, y2: y - 2, stroke: '#c9c2b4', 'stroke-width': w * 0.8, opacity: 0.85 }, svg);
    svgEl('line', { x1: FB.left - 4, y1: y + 2, x2: FB.width - FB.right, y2: y + 2, stroke: '#b8b0a0', 'stroke-width': w, opacity: 0.95 }, svg);
    // תווית קורס
    svgEl('text', {
      x: 16, y: y + 5, fill: '#e3b341', 'font-size': 15, 'font-weight': 700,
      'text-anchor': 'middle', 'font-family': 'Heebo, sans-serif'
    }, svg).textContent = c.note;
  });

  // נקודות צלילים
  TUNING.forEach((c, ci) => {
    const y = courseY(ci);
    for (let f = 0; f <= NUM_FRETS; f++) {
      const midi = c.midi + f;
      const state = getNoteState ? getNoteState(ci, f, midi) : null;
      if (!state) continue;
      const cx = fretCenterX(f);
      const g = svgEl('g', {
        class: 'fb-dot note-dot',
        'data-course': ci,
        'data-fret': f,
        'data-pc': midi % 12,
      }, svg);
      const isRoot = state.type === 'root';
      svgEl('circle', {
        cx, cy: y, r: 11,
        fill: isRoot ? '#e3b341' : '#2a7fa8',
        stroke: isRoot ? '#fff0c8' : '#7fd0ef',
        'stroke-width': 1.5,
      }, g);
      const t = svgEl('text', {
        x: cx, y: y + 4, fill: isRoot ? '#1a1408' : '#eaf6fc',
        'font-size': 10.5, 'font-weight': 700, 'text-anchor': 'middle',
        class: 'fb-note-label', 'font-family': 'Heebo, sans-serif'
      }, g);
      t.textContent = state.label;
      g.addEventListener('click', () => {
        AudioEngine.pluckCourse(ci, f, 0, 0.55);
        flashDot(svg, ci, f);
        if (typeof opts.onDotClick === 'function') opts.onDotClick(ci, f, midi, g);
      });
    }
  });
}

function flashDot(svg, ci, fret) {
  const y = courseY(ci);
  const cx = fretCenterX(fret);
  const halo = svgEl('circle', {
    cx, cy: y, r: 17, fill: 'none', stroke: '#f0cc74', 'stroke-width': 3,
    class: 'fb-glow', opacity: 0.9
  }, svg);
  setTimeout(() => halo.remove(), 500);
}

/* הילה לכל המופעים של גובה צליל מסוים (pitch class + octave) */
function flashMidiOnBoard(svg, midi) {
  TUNING.forEach((c, ci) => {
    const f = midi - c.midi;
    if (f >= 0 && f <= NUM_FRETS) flashDot(svg, ci, f);
  });
}

/* ===================== מסך הבית ===================== */
function initHome() {
  // טיונר
  const tuner = $('#tuner');
  [...TUNING].reverse().forEach(c => {
    const ci = TUNING.indexOf(c);
    const div = document.createElement('div');
    div.className = 'tuner-course';
    div.innerHTML = `
      <div class="tuner-note">${c.note}</div>
      <div class="tuner-solfege">${SOLFEGE[c.note]}</div>
      <div class="tuner-pair">${c.pair === 'octave' ? 'זוג אוקטבה' : 'זוג יוניסון'}</div>`;
    div.addEventListener('click', () => {
      AudioEngine.pluckCourse(ci, 0, 0, 0.6);
      div.classList.add('ringing');
      setTimeout(() => div.classList.remove('ringing'), 900);
    });
    tuner.appendChild(div);
  });

  // איור אנטומיה
  drawAnatomy();

  // לוח סריגים מלא — כל הצלילים
  const fbHome = $('#fb-home');
  drawFretboard(fbHome, (ci, f, midi) => {
    const name = midiToName(midi);
    return { type: f === 0 ? 'root' : 'note', label: name };
  });
  if (typeof FretboardMirror !== 'undefined') {
    const wrap = fbHome.closest('.fretboard-wrap');
    if (wrap && !wrap.querySelector('.fb-mirror-btn')) {
      FretboardMirror.mountToggle(wrap, { onChange: () => initHome() });
    }
  }
}

function drawAnatomy() {
  const svg = $('#anatomy-svg');
  svg.innerHTML = '';
  svg.setAttribute('viewBox', '0 0 560 250');

  const NUT_X = 468, NECK_JOIN = 202;
  const lbl = (x, y, text, anchor = 'middle') =>
    svgEl('text', { x, y, fill: '#9db2c7', 'font-size': 12.5, 'text-anchor': anchor, 'font-family': 'Heebo' }, svg).textContent = text;
  const leader = (x1, y1, x2, y2) =>
    svgEl('line', { x1, y1, x2, y2, stroke: '#5a7187', 'stroke-width': 1, 'stroke-dasharray': '3 3' }, svg);

  // גוף — צורת אגס (כיפת צלעות)
  svgEl('path', {
    d: `M${NECK_JOIN + 6} 90
        C 130 56, 44 66, 22 118
        C 44 172, 130 182, ${NECK_JOIN + 6} 144 Z`,
    fill: '#7a5230', stroke: '#4a2f18', 'stroke-width': 3, 'stroke-linejoin': 'round'
  }, svg);
  // צלעות הגוף (פסי עץ)
  [0.78, 0.58, 0.38].forEach(k => {
    svgEl('path', {
      d: `M${NECK_JOIN} ${117 - 26 * k} C ${130} ${117 - 56 * k}, ${52} ${117 - 48 * k}, ${24 + 14 * (1 - k)} 117`,
      fill: 'none', stroke: '#9c6b3e', 'stroke-width': 1, opacity: 0.55
    }, svg);
  });

  // זנב (מחזיק המיתרים בקצה הגוף)
  svgEl('rect', { x: 16, y: 104, width: 9, height: 28, rx: 3, fill: '#2c1c0e', stroke: '#1a120a' }, svg);

  // פתח קול מעוטר
  svgEl('circle', { cx: 148, cy: 117, r: 21, fill: '#16100a', stroke: '#e3b341', 'stroke-width': 2.2 }, svg);
  svgEl('circle', { cx: 148, cy: 117, r: 26, fill: 'none', stroke: '#c79a2e', 'stroke-width': 1, opacity: 0.6 }, svg);

  // צוואר + לוח סריגים
  svgEl('rect', { x: NECK_JOIN, y: 100, width: NUT_X - NECK_JOIN, height: 34, fill: '#3a2a1c', stroke: '#241808', 'stroke-width': 2 }, svg);

  // אום (nut)
  svgEl('rect', { x: NUT_X - 2, y: 99, width: 5, height: 36, rx: 1.5, fill: '#e8d9b0' }, svg);

  // סריגים — צפופים יותר ככל שמתקרבים לגוף
  const scaleLen = (NUT_X - NECK_JOIN) / (1 - Math.pow(2, -13 / 12));
  for (let i = 1; i <= 13; i++) {
    const x = NUT_X - scaleLen * (1 - Math.pow(2, -i / 12));
    svgEl('line', { x1: x, y1: 100, x2: x, y2: 134, stroke: '#8a8378', 'stroke-width': 1.5 }, svg);
  }
  // נקודות סימון על הלוח
  [3, 5, 7, 10].forEach(i => {
    const x1 = NUT_X - scaleLen * (1 - Math.pow(2, -(i - 1) / 12));
    const x2 = NUT_X - scaleLen * (1 - Math.pow(2, -i / 12));
    svgEl('circle', { cx: (x1 + x2) / 2, cy: 117, r: 2.6, fill: '#d8c9a0', opacity: 0.8 }, svg);
  });

  // ראש — טרפז מתרחב עם 4+4 מפתחות
  svgEl('path', {
    d: `M${NUT_X + 2} 99 L546 86 Q554 88 554 96 L554 138 Q554 146 546 148 L${NUT_X + 2} 135 Z`,
    fill: '#3a2a1c', stroke: '#241808', 'stroke-width': 2
  }, svg);
  // מפתחות: 4 למעלה, 4 למטה
  [486, 502, 518, 534].forEach(x => {
    svgEl('line', { x1: x, y1: 92, x2: x, y2: 76, stroke: '#6b5a3e', 'stroke-width': 2.5 }, svg);
    svgEl('circle', { cx: x, cy: 72, r: 4.5, fill: '#d8c9a0', stroke: '#8a7a5c' }, svg);
    svgEl('line', { x1: x, y1: 142, x2: x, y2: 158, stroke: '#6b5a3e', 'stroke-width': 2.5 }, svg);
    svgEl('circle', { cx: x, cy: 162, r: 4.5, fill: '#d8c9a0', stroke: '#8a7a5c' }, svg);
  });

  // גשר — עומד על לוח הקול, המיתרים עוברים מעליו
  svgEl('rect', { x: 70, y: 101, width: 7, height: 33, rx: 2.5, fill: '#2c1c0e', stroke: '#1a120a' }, svg);

  // מיתרים — מהזנב, מעל הגשר ופתח הקול, לאורך הצוואר עד האום
  [0, 1, 2, 3].forEach(i => {
    const yTail = 108 + i * 6.5;
    const yNut = 104 + i * 8.8;
    svgEl('line', { x1: 25, y1: yTail, x2: NUT_X, y2: yNut, stroke: '#d6cfc0', 'stroke-width': 1.15, opacity: 0.95 }, svg);
    // המשך מהאום אל המפתחות
    const pegX = [486, 502, 518, 534][i];
    const pegY = i < 2 ? 90 : 144;
    svgEl('line', { x1: NUT_X + 3, y1: yNut, x2: pegX, y2: pegY, stroke: '#d6cfc0', 'stroke-width': 0.9, opacity: 0.75 }, svg);
  });

  // תוויות עם קווים מנחים
  leader(110, 178, 110, 196); lbl(110, 212, 'גוף');
  leader(148, 91, 148, 60); lbl(148, 50, 'פתח קול');
  leader(73, 138, 60, 196); lbl(56, 212, 'גשר');
  leader(335, 97, 335, 64); lbl(335, 54, 'צוואר ולוח סריגים');
  leader(540, 152, 540, 180); lbl(528, 196, 'ראש ומפתחות');
  leader(20, 135, 20, 165); lbl(30, 181, 'זנב');

  const legend = $('#anatomy-legend');
  legend.innerHTML = `
    <span><b>גוף</b> — תיבת תהודה מגולפת מצלעות עץ</span>
    <span><b>פתח קול</b> — מעוטר בסגנון מסורתי</span>
    <span><b>גשר</b> — מעביר את רטט המיתרים ללוח הקול</span>
    <span><b>צוואר</b> — ארוך במיוחד, סריגים צפופים לכיוון הגוף</span>
    <span><b>ראש</b> — 8 מפתחות, 4+4, מפתח לכל מיתר</span>`;
}

/* ===================== מסך דרומוסים ===================== */
let currentDromos = DROMOI[0];
let currentRoot = 2; // D = pitch class 2
let dromoiFilter = 'all';
let _dromoiPosBase = 0;
let _dromoiStringMode = 4;
let _dromoiEditMode = false;
let _dromoiDraft = null;

/** deep-link ממסכים אחרים (theory-lab, dromos-road) — קופץ למסך dromoi עם אותו
 *  דרומוס/שורש/פוזיציה/מיתרים, ופותח מיד במצב עריכה (במקום לבנות עורך שלישי עצמאי). */
function openDromoiForEdit({ dromosId, rootPc, posBase, stringMode } = {}) {
  const d = DROMOI.find(x => x.id === dromosId);
  if (d) currentDromos = d;
  if (rootPc != null) currentRoot = rootPc;
  if (posBase != null) _dromoiPosBase = posBase;
  if (stringMode != null) _dromoiStringMode = stringMode;

  const rootSel = document.getElementById('dr-root');
  if (rootSel && rootPc != null) rootSel.value = String(rootPc);
  const bar = document.getElementById('dromoi-pos-bar');
  if (bar) {
    bar.querySelectorAll('.fs-pos-chip[data-base]').forEach(x => {
      x.classList.toggle('active', Number(x.dataset.base) === _dromoiPosBase);
    });
    bar.querySelectorAll('.fs-str-chip').forEach(x => {
      x.classList.toggle('active', Number(x.dataset.str) === _dromoiStringMode);
    });
  }

  document.querySelector('.nav-btn[data-screen="dromoi"]')?.click();
  rebuildDromoiList();
  document.getElementById('dromoi-edit-toggle')?.click();
}

function setDromoiFilter(filter) {
  dromoiFilter = filter || 'all';
  document.querySelectorAll('#dromoi-filter [data-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === dromoiFilter);
  });
  rebuildDromoiList();
}
window.setDromoiFilter = setDromoiFilter;

function rebuildDromoiList() {
  const list = $('#dromoi-list');
  if (!list) return;
  const scales = typeof getScalesForDromoi === 'function'
    ? getScalesForDromoi(dromoiFilter)
    : DROMOI;
  if (!scales.some(s => s.id === currentDromos?.id)) {
    currentDromos = scales[0] || DROMOI[0];
  }
  list.innerHTML = '';
  scales.forEach(d => {
    const item = document.createElement('div');
    item.className = 'dromos-item'
      + (d.id === currentDromos.id ? ' active' : '')
      + (d.family === 'maqam' ? ' maqam-item' : '');
    item.dataset.scaleId = d.id;
    const sub = d.family === 'maqam'
      ? `${d.nameAr || d.nameGr} · ${d.degrees}`
      : `${d.nameGr} · ${d.degrees}`;
    const customTag = (typeof DromosOverrides !== 'undefined' && DromosOverrides.hasAny(d.id))
      ? ' <span class="di-tag di-tag-custom">מותאם</span>' : '';
    item.innerHTML = `<div class="di-name">${d.nameHe}${d.family === 'maqam' ? ' <span class="di-tag">מאקאם</span>' : ''}${customTag}</div><div class="di-gr">${sub}</div>`;
    item.addEventListener('click', () => {
      $$('.dromos-item').forEach(x => x.classList.remove('active'));
      item.classList.add('active');
      currentDromos = d;
      clearTimeout(scaleTimer);
      scaleTimer = null;
      AudioEngine.stopModeScale();
      refreshEnsembleIfActive();
      renderDromos();
    });
    list.appendChild(item);
  });
}

function getSafeNoteIntervals(dromos) {
  const labels = dromos.degrees.split(/\s+/);
  const safe = new Set([0]);
  labels.forEach((lab, i) => {
    if (/^4$|^♯4$|^♭4$/.test(lab)) safe.add(dromos.intervals[i]);
    if (/^5$|^♭5$|^♯5$/.test(lab)) safe.add(dromos.intervals[i]);
  });
  if (safe.size < 3 && dromos.intervals.length >= 5) {
    safe.add(dromos.intervals[3]);
    safe.add(dromos.intervals[4]);
  }
  return safe;
}

function clearSafeNoteGlow() {
  const svg = $('#fb-dromos');
  if (!svg) return;
  svg.querySelectorAll('.safe-note-glow').forEach(el => el.classList.remove('safe-note-glow'));
}

/** מדגיש טוניקה (1), רביעית (4) וחמישית (5) על לוח הדרומוס */
function highlightSafeNotes() {
  const svg = $('#fb-dromos');
  if (!svg) return;
  clearSafeNoteGlow();
  const d = currentDromos;
  const safeIv = getSafeNoteIntervals(d);
  const safePcs = new Set([...safeIv].map(iv => (currentRoot + iv) % 12));
  svg.querySelectorAll('.note-dot').forEach(dot => {
    const pc = parseInt(dot.dataset.pc, 10);
    if (safePcs.has(pc)) dot.classList.add('safe-note-glow');
  });
}

function refreshEnsembleIfActive() {
  if (!AudioEngine.isEnsembleActive()) return;
  AudioEngine.startEnsemble({ rootPc: currentRoot, dromosId: currentDromos.id });
}

function initDromoi() {
  document.querySelectorAll('#dromoi-filter [data-filter]').forEach(btn => {
    btn.addEventListener('click', () => setDromoiFilter(btn.dataset.filter));
  });
  rebuildDromoiList();

  const rootSel = $('#dr-root');
  NOTE_NAMES.forEach((n, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = `${n} (${SOLFEGE[n]})`;
    if (i === 2) opt.selected = true;
    rootSel.appendChild(opt);
  });
  rootSel.addEventListener('change', () => {
    currentRoot = parseInt(rootSel.value, 10);
    clearTimeout(scaleTimer);
    scaleTimer = null;
    AudioEngine.stopModeScale();
    refreshEnsembleIfActive();
    renderDromos();
  });

  $('#dr-play').addEventListener('click', () => playScale(140));
  $('#dr-play-slow').addEventListener('click', () => playScale(320));
  $('#dr-play-single').addEventListener('click', playSingleString);
  $('#dr-drone').addEventListener('click', toggleDrone);

  if (!$('#dromoi-pos-bar')) {
    // הערה: לא ניתן להעביר את הבלוק הזה ל-FretboardScale.mountPosControls בלי סיכון —
    // initDromoi() רץ בסוף app.js, שנטען (script defer) *לפני* fretboard-scale.js, כך ש-
    // FretboardScale עדיין לא קיים בנקודה הזו. הבנייה כאן ב-DOM גולמי (בלי לגעת ב-FretboardScale
    // עד ללחיצה בפועל, כשכל הסקריפטים כבר נטענו) היא בכוונה, לא כפילות-קוד סתמית.
    const bar = document.createElement('div');
    bar.id = 'dromoi-pos-bar';
    bar.className = 'fs-pos-bar';
    bar.innerHTML = '<span class="fs-pos-label">פוזיציה על הצוואר:</span>';
    [0, 2, 3, 5, 7, 9].forEach(b => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn secondary fs-pos-chip' + (b === _dromoiPosBase ? ' active' : '');
      btn.textContent = b === 0 ? 'פתוח' : String(b);
      btn.dataset.base = String(b);
      btn.addEventListener('click', () => {
        _dromoiPosBase = b;
        bar.querySelectorAll('.fs-pos-chip[data-base]').forEach(x => {
          x.classList.toggle('active', Number(x.dataset.base) === b);
        });
        renderDromos();
      });
      bar.appendChild(btn);
    });
    const strLabel = document.createElement('span');
    strLabel.className = 'fs-pos-label';
    strLabel.style.marginInlineStart = '12px';
    strLabel.textContent = 'מיתרים:';
    bar.appendChild(strLabel);
    [1, 2, 3, 4].forEach(n => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'btn secondary fs-pos-chip fs-str-chip' + (n === _dromoiStringMode ? ' active' : '');
      btn.textContent = String(n);
      btn.dataset.str = String(n);
      btn.title = n === 1 ? 'מיתר D בלבד' : `${n} מיתרים`;
      btn.addEventListener('click', () => {
        _dromoiStringMode = n;
        if (typeof FretboardScale !== 'undefined' && FretboardScale.findBestPositionForStringMode) {
          _dromoiPosBase = FretboardScale.findBestPositionForStringMode(currentDromos.intervals, currentRoot, n, [0, 2, 3, 5, 7, 9]);
          bar.querySelectorAll('.fs-pos-chip[data-base]').forEach(x => {
            x.classList.toggle('active', Number(x.dataset.base) === _dromoiPosBase);
          });
        }
        bar.querySelectorAll('.fs-str-chip').forEach(x => {
          x.classList.toggle('active', Number(x.dataset.str) === n);
        });
        renderDromos();
      });
      bar.appendChild(btn);
    });
    $('#dromos-detail')?.insertBefore(bar, $('#dr-degrees'));

    if (typeof PlaybackSpeed !== 'undefined') {
      const speedBar = document.createElement('div');
      PlaybackSpeed.mountChips(speedBar);
      bar.after(speedBar);
    }

    if (typeof DromosOverrides !== 'undefined') {
      const editBar = document.createElement('div');
      editBar.className = 'fs-edit-bar';
      const mkEditBtn = (label, id) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.id = id;
        b.className = 'btn secondary fs-pos-chip';
        b.textContent = label;
        editBar.appendChild(b);
        return b;
      };
      const editBtn = mkEditBtn('✏️ ערוך פוזיציה', 'dromoi-edit-toggle');
      const invariantLbl = document.createElement('label');
      invariantLbl.className = 'fs-edit-invariant-lbl';
      invariantLbl.hidden = true;
      const invariantChk = document.createElement('input');
      invariantChk.type = 'checkbox';
      invariantChk.id = 'dromoi-edit-invariant';
      invariantLbl.appendChild(invariantChk);
      invariantLbl.appendChild(document.createTextNode(' החל על כל הטוניקות'));
      editBar.appendChild(invariantLbl);
      const saveBtn = mkEditBtn('💾 שמור', 'dromoi-edit-save');
      const cancelBtn = mkEditBtn('ביטול', 'dromoi-edit-cancel');
      const resetBtn = mkEditBtn('↺ אפס להתחלה', 'dromoi-edit-reset');
      const badge = document.createElement('span');
      badge.id = 'dromoi-edit-badge';
      badge.className = 'fs-edit-badge';
      badge.hidden = true;
      badge.textContent = '✓ מותאם';
      editBar.appendChild(badge);
      bar.after(editBar);

      function setEditUI(active) {
        editBtn.hidden = active;
        invariantLbl.hidden = !active;
        saveBtn.hidden = !active;
        cancelBtn.hidden = !active;
        resetBtn.hidden = !active;
        bar.querySelectorAll('.fs-pos-chip').forEach(c => { c.disabled = active; });
      }
      editBtn.addEventListener('click', () => {
        _dromoiEditMode = true;
        _dromoiDraft = null;
        invariantChk.checked = false;
        setEditUI(true);
        renderDromos();
      });
      saveBtn.addEventListener('click', () => {
        const span = typeof FretboardScale !== 'undefined' ? FretboardScale.MELODY_POS_SPAN : 4;
        if (invariantChk.checked) {
          FretboardScale.saveInvariantOverride(currentDromos.id, currentDromos.intervals, currentRoot, _dromoiPosBase, _dromoiStringMode, span, _dromoiDraft || []);
        } else {
          DromosOverrides.set(currentDromos.id, currentRoot, _dromoiPosBase, _dromoiStringMode, span, _dromoiDraft || []);
        }
        _dromoiEditMode = false;
        _dromoiDraft = null;
        setEditUI(false);
        renderDromos();
        rebuildDromoiList();
      });
      cancelBtn.addEventListener('click', () => {
        _dromoiEditMode = false;
        _dromoiDraft = null;
        setEditUI(false);
        renderDromos();
      });
      resetBtn.addEventListener('click', () => {
        if (!confirm('לאפס את הפוזיציה הזו לברירת המחדל?')) return;
        DromosOverrides.reset(currentDromos.id, currentRoot, _dromoiPosBase, _dromoiStringMode);
        DromosOverrides.resetInvariant(currentDromos.id, _dromoiPosBase, _dromoiStringMode);
        _dromoiEditMode = false;
        _dromoiDraft = null;
        setEditUI(false);
        renderDromos();
        rebuildDromoiList();
      });
      setEditUI(false);
    }
  }

  renderDromos();
  renderAjnas();
}

/* ---------- ג׳ינס (אבני הבניין של המאקאם) ---------- */
function renderAjnas() {
  const grid = $('#ajnas-grid');
  AJNAS.forEach(jins => {
    const card = document.createElement('div');
    card.className = 'jins-card';
    const span = jins.intervals[jins.intervals.length - 1];
    // פס מרווחים: תא לכל חצי טון, מסומן אם הצליל בג׳ינס
    let bar = '<div class="jins-bar">';
    for (let st = 0; st <= span; st++) {
      const on = jins.intervals.includes(st);
      bar += `<div class="jins-step${on ? ' on' : ''}" style="${on ? `background:${jins.color}` : ''}"></div>`;
    }
    bar += '</div>';
    card.innerHTML = `
      <div class="jins-head"><b style="color:${jins.color}">${jins.nameHe}</b><span>${jins.nameAr}</span></div>
      ${bar}
      <p>${jins.desc}</p>`;
    card.addEventListener('click', () => {
      AudioEngine.playModeIntervals(jins.intervals, currentRoot, 0.32, 0.5);
    });
    grid.appendChild(card);
  });

  const tbody = $('#ajnas-table tbody');
  DROMOS_AJNAS.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td><b>${row.dromos}</b></td><td>${row.lower}</td><td>${row.upper}</td><td dir="ltr">${row.maqam}</td>`;
    tbody.appendChild(tr);
  });
}

function scaleMidisFromRoot() {
  /* מוצא את הטוניקה הנמוכה ביותר הניתנת לנגינה ובונה אוקטבה */
  let base = 48 + ((currentRoot - 0 + 12) % 12); // מ-C3 ומעלה
  const midis = currentDromos.intervals.map(iv => base + iv);
  midis.push(base + 12);
  return midis;
}

function renderDromos() {
  const d = currentDromos;
  $('#dr-name').textContent = d.nameHe;
  const subLine = d.family === 'maqam'
    ? `${d.nameAr || ''} · ${d.nameGr || ''} · ${d.degrees}`
    : `${d.nameGr} · ${d.nameEn} · ${d.degrees}`;
  $('#dr-greek').textContent = subLine;
  $('#dr-mood').textContent = d.mood;
  $('#dr-desc').textContent = d.desc;
  if (d.family === 'maqam' && d.greekParallel && typeof greekParallelName === 'function') {
    const gName = greekParallelName(d);
    $('#dr-maqam').textContent = gName ? `דרומוס יווני מקביל: ${gName}` : d.maqam;
  } else {
    $('#dr-maqam').textContent = d.maqam;
  }
  $('#dr-chords').textContent = d.chords;
  $('#dr-songs').textContent = d.songs.join(' · ');
  $('#dr-tips').textContent = d.tips;

  // שורת דרגות
  const degRow = $('#dr-degrees');
  degRow.innerHTML = '';
  const degLabels = d.degrees.split(' ');
  d.intervals.forEach((iv, i) => {
    const pc = (currentRoot + iv) % 12;
    const cell = document.createElement('div');
    cell.className = 'degree-cell' + (i === 0 ? ' root' : '');
    cell.innerHTML = `<div class="dg">${degLabels[i]}</div><div class="nt">${NOTE_NAMES[pc]}</div><div class="sf">${SOLFEGE[NOTE_NAMES[pc]]}</div>`;
    degRow.appendChild(cell);
  });

  // לוח סריגים — צלילי הדרומוס בתיבת הפוזיציה + מסלול ממוספר
  const pcs = d.intervals.map(iv => (currentRoot + iv) % 12);
  const pcsSet = new Set(pcs);
  if (!_dromoiPosBase && _dromoiPosBase !== 0) _dromoiPosBase = 0;
  const span = typeof FretboardScale !== 'undefined' ? FretboardScale.MELODY_POS_SPAN : 4;
  const scalePath = typeof FretboardScale !== 'undefined'
    ? FretboardScale.buildScaleDegreePath(d.intervals, currentRoot, _dromoiPosBase, span, _dromoiStringMode, d.id)
    : [];
  const pathKey = (ci, f) => `${ci}-${f}`;
  const pathMap = new Map(scalePath.map(p => [pathKey(p.ci, p.fret), p]));
  const usedBases = [...new Set(scalePath.map(p => p.positionBase ?? _dromoiPosBase))];
  const inUsedBox = (f) => usedBases.some(b => f >= b && f <= b + span);
  const activeCourses = typeof FretboardScale !== 'undefined'
    ? new Set(FretboardScale.coursesForStringMode(_dromoiStringMode))
    : null;

  if (_dromoiEditMode && typeof FretboardScale !== 'undefined' && FretboardScale.renderEditableDromosScale) {
    if (!_dromoiDraft) _dromoiDraft = scalePath.map(p => ({ ...p }));
    FretboardScale.renderEditableDromosScale($('#fb-dromos'), d.intervals, currentRoot, _dromoiDraft, {
      posBase: _dromoiPosBase, stringMode: _dromoiStringMode, span,
      onDraftChange: () => renderDromos(),
    });
  } else {
    drawFretboard($('#fb-dromos'), (ci, f, midi) => {
      if (activeCourses && !activeCourses.has(ci)) return null;
      const pc = midi % 12;
      if (!pcsSet.has(pc)) return null;
      const onPath = pathMap.get(pathKey(ci, f));
      if (onPath) {
        const finger = onPath.finger;
        const label = finger > 0 ? `${onPath.degree}·${finger}` : String(onPath.degree);
        return {
          type: onPath.degree === 1 ? 'root' : 'note',
          label,
        };
      }
      if (!inUsedBox(f)) return null;
      return { type: 'note', label: NOTE_NAMES[pc] };
    });
    if (typeof FretboardScale !== 'undefined' && scalePath.length) {
      FretboardScale.drawPathOverlay($('#fb-dromos'), scalePath);
    }
    if (AudioEngine.isEnsembleActive()) highlightSafeNotes();
  }

  const editBadge = $('#dromoi-edit-badge');
  if (editBadge && typeof DromosOverrides !== 'undefined') {
    const kind = DromosOverrides.getKind(d.id, currentRoot, _dromoiPosBase, _dromoiStringMode);
    editBadge.hidden = !kind;
    if (kind) editBadge.textContent = kind === 'invariant' ? '✓ מותאם (כל הטוניקות)' : '✓ מותאם';
  }

  if (typeof FretboardMirror !== 'undefined') {
    const fbDromosWrap = $('#fb-dromos').closest('.fretboard-wrap');
    if (fbDromosWrap && !fbDromosWrap.querySelector('.fb-mirror-btn')) {
      FretboardMirror.mountToggle(fbDromosWrap, { onChange: () => renderDromos() });
    }
  }

  // תרגיל מיתר בודד
  renderSingleString();

  // "הכביש" — מסלול מעשי על 2 / 3 / 4 מיתרים (רכיב משותף)
  if (typeof DromosRoad !== 'undefined') {
    let roadHost = document.getElementById('dr-road');
    if (!roadHost) {
      roadHost = document.createElement('div');
      roadHost.id = 'dr-road';
      const anchor = $('#dr-single');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(roadHost, anchor.nextSibling);
      else { const fb = $('#fb-dromos'); if (fb && fb.parentNode) fb.parentNode.appendChild(roadHost); }
    }
    DromosRoad.renderInto(roadHost, {
      intervals: d.intervals,
      rootPc: currentRoot,
      nameHe: d.nameHe,
      dromosId: d.id,
      fretboard: $('#fb-dromos'),
      embedded: true,
      posBase: _dromoiPosBase,
      stringMode: _dromoiStringMode,
    });
  }
}

function renderSingleString() {
  const wrap = $('#dr-single');
  wrap.innerHTML = '';
  const d = currentDromos;
  const span = typeof FretboardScale !== 'undefined' ? FretboardScale.MELODY_POS_SPAN : 4;
  const scalePath = typeof FretboardScale !== 'undefined'
    ? FretboardScale.buildScaleDegreePath(d.intervals, currentRoot, _dromoiPosBase, span, _dromoiStringMode, d.id)
    : [];
  const dNotes = scalePath.filter(p => p.ci === 0);
  const seq = dNotes.length
    ? FretboardScale.scalePlaySequence(dNotes).map(p => p.fret)
    : (() => {
      const openPc = TUNING[0].midi % 12;
      let rootFret = ((currentRoot - openPc) + 12) % 12;
      const fretsUp = d.intervals.map(iv => rootFret + iv)
        .filter(f => f >= _dromoiPosBase && f <= _dromoiPosBase + span);
      fretsUp.push(rootFret + 12);
      return [...fretsUp, ...[...fretsUp].reverse().slice(1)];
    })();
  seq.forEach((f, i) => {
    const div = document.createElement('div');
    div.className = 'ss-note';
    div.dataset.idx = i;
    div.innerHTML = `<div class="ss-fret">${f}</div><div class="ss-dir">${i % 2 === 0 ? '↓' : '↑'}</div>`;
    wrap.appendChild(div);
  });
  wrap.dataset.seq = JSON.stringify(seq);
}

let scaleTimer = null;
function playScale(msPerNote) {
  AudioEngine.ensureCtx();
  clearTimeout(scaleTimer);
  scaleTimer = null;
  AudioEngine.stopModeScale();
  const svg = $('#fb-dromos');
  AudioEngine.playModeScale(currentDromos.intervals, currentRoot, {
    gapMs: msPerNote,
    gain: 0.52,
    dromosId: currentDromos.id,
    posBase: _dromoiPosBase,
    stringMode: _dromoiStringMode,
    onStep(fret, i, p) {
      if (p && typeof FretboardScale !== 'undefined') FretboardScale.flashMidi(svg, p.midi);
      else if (typeof FretboardScale !== 'undefined') FretboardScale.flashMidi(svg, TUNING[0].midi + fret);
      else flashDot(svg, p?.ci ?? 0, fret);
    },
  });
}

function playSingleString() {
  AudioEngine.ensureCtx();
  clearTimeout(scaleTimer);
  const wrap = $('#dr-single');
  const seq = JSON.parse(wrap.dataset.seq || '[]');
  const cells = wrap.querySelectorAll('.ss-note');
  let i = 0;
  function step() {
    cells.forEach(c => c.classList.remove('lit'));
    if (i >= seq.length) return;
    AudioEngine.pluckCourse(0, seq[i], 0, 0.55);
    cells[i].classList.add('lit');
    i++;
    scaleTimer = setTimeout(step, 380);
  }
  step();
}

const DRONE_LABEL_OFF = '🎵 צליל רקע (איזון)';
const DRONE_LABEL_ON = '🛑 עצור הרכב וירטואלי';

function toggleDrone() {
  const btn = $('#dr-drone');
  if (AudioEngine.isEnsembleActive()) {
    AudioEngine.stopEnsemble();
    btn.classList.remove('playing');
    btn.textContent = DRONE_LABEL_OFF;
    clearSafeNoteGlow();
    return;
  }
  AudioEngine.ensureCtx();
  AudioEngine.startEnsemble({ rootPc: currentRoot, dromosId: currentDromos.id });
  btn.classList.add('playing');
  btn.textContent = DRONE_LABEL_ON;
  highlightSafeNotes();
}

function stopDrone() {
  AudioEngine.stopEnsemble();
  const btn = $('#dr-drone');
  if (btn) {
    btn.classList.remove('playing');
    btn.textContent = DRONE_LABEL_OFF;
  }
  clearSafeNoteGlow();
}

/* ===================== מסך פנייה ===================== */
let peniaPattern = PENIA_PATTERNS[0];
let peniaBpm = 80;
let peniaScheduler = null;

function initPenia() {
  // כרטיסי טכניקה
  const grid = $('#technique-grid');
  TECHNIQUE_PRINCIPLES.forEach(t => {
    const card = document.createElement('div');
    card.className = 'tech-card';
    card.innerHTML = `<h3>${t.title}</h3>
      <svg viewBox="0 0 300 110" data-illu="${t.svg}"></svg>
      <ul>${t.points.map(p => `<li>${p}</li>`).join('')}</ul>`;
    grid.appendChild(card);
    drawTechIllustration(card.querySelector('svg'), t.svg);
  });

  // בורר תבניות
  const sel = $('#penia-select');
  PENIA_PATTERNS.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = p.nameHe;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    peniaPattern = PENIA_PATTERNS[parseInt(sel.value, 10)];
    peniaBpm = peniaPattern.bpm;
    stopPenia();
    renderPenia();
  });

  $('#penia-bpm-down').addEventListener('click', () => { peniaBpm = Math.max(40, peniaBpm - 5); renderPeniaBpm(); });
  $('#penia-bpm-up').addEventListener('click', () => { peniaBpm = Math.min(240, peniaBpm + 5); renderPeniaBpm(); });
  $('#penia-play').addEventListener('click', togglePenia);

  renderPenia();
}

function renderPeniaBpm() {
  $('#penia-bpm').textContent = peniaBpm;
  if (peniaScheduler && peniaScheduler.running) peniaScheduler.stepDur = peniaStepDur();
}

function peniaStepDur() {
  const p = peniaPattern;
  const beat = 60 / peniaBpm;
  if (p.subdivision.includes('טריול')) return beat / 3;
  if (p.subdivision.includes('שש-עשר')) return beat / 4;
  if (p.subdivision.includes('רבעים')) return beat;
  return beat / 2; // שמיניות
}

function renderPenia() {
  const p = peniaPattern;
  renderPeniaBpm();
  $('#penia-level').textContent = p.level;
  $('#penia-subdiv').textContent = p.subdivision;
  $('#penia-desc').textContent = p.desc;

  const strip = $('#penia-strip');
  strip.innerHTML = '';
  p.strokes.forEach((s, i) => {
    const cell = document.createElement('div');
    const isRest = s === '-';
    const isAccent = s === 'D' || s === 'U';
    const isDown = s.toLowerCase() === 'd';
    cell.className = 'stroke-cell' + (isAccent ? ' accent' : '') + (isRest ? ' rest' : '');
    cell.innerHTML = `<div class="stroke-arrow">${isRest ? '·' : isDown ? '↓' : '↑'}</div><div class="stroke-num">${i + 1}</div>`;
    strip.appendChild(cell);
  });
}

function togglePenia() {
  const btn = $('#penia-play');
  if (peniaScheduler && peniaScheduler.running) { stopPenia(); return; }
  AudioEngine.ensureCtx();
  const cells = $('#penia-strip').querySelectorAll('.stroke-cell');
  peniaScheduler = new AudioEngine.Scheduler(
    (step, time) => {
      const s = peniaPattern.strokes[step];
      if (s === '-') return;
      const accent = s === 'D' || s === 'U';
      AudioEngine.strum(time, s.toLowerCase(), accent);
    },
    (step) => {
      cells.forEach(c => c.classList.remove('lit'));
      if (cells[step]) cells[step].classList.add('lit');
    }
  );
  peniaScheduler.numSteps = peniaPattern.strokes.length;
  peniaScheduler.stepDur = peniaStepDur();
  peniaScheduler.start();
  activeSchedulers.push(peniaScheduler);
  btn.classList.add('playing');
  btn.textContent = '⏹ עצור';
}

function stopPenia() {
  if (peniaScheduler) peniaScheduler.stop();
  $('#penia-play').classList.remove('playing');
  $('#penia-play').textContent = '▶ נגן';
  $$('#penia-strip .stroke-cell').forEach(c => c.classList.remove('lit'));
}

/* איורי טכניקה ב-SVG */
function drawTechIllustration(svg, kind) {
  const gold = '#e3b341', aeg = '#4fb3d9', dim = '#5a7187';
  if (kind === 'pick-grip') {
    // אגודל + אצבע אוחזים מפרט
    svgEl('ellipse', { cx: 110, cy: 60, rx: 55, ry: 34, fill: '#2a4258', transform: 'rotate(-18 110 60)' }, svg); // כף יד
    svgEl('ellipse', { cx: 152, cy: 48, rx: 34, ry: 15, fill: '#33506c', transform: 'rotate(-30 152 48)' }, svg); // אצבע
    svgEl('ellipse', { cx: 148, cy: 66, rx: 30, ry: 13, fill: '#3c5d7d', transform: 'rotate(-8 148 66)' }, svg); // אגודל
    svgEl('path', { d: 'M172 50 L196 58 L178 74 Z', fill: gold, stroke: '#fff0c8', 'stroke-width': 1.5 }, svg); // מפרט
    svgEl('text', { x: 215, y: 66, fill: dim, 'font-size': 11, 'font-family': 'Heebo' }, svg).textContent = '3-4 מ"מ בלבד';
    svgEl('line', { x1: 188, y1: 62, x2: 210, y2: 62, stroke: dim, 'stroke-width': 1, 'stroke-dasharray': '3 2' }, svg);
  }
  if (kind === 'wrist-motion') {
    // קשת תנועה מעל מיתרים
    for (let i = 0; i < 4; i++) {
      svgEl('line', { x1: 30, y1: 38 + i * 14, x2: 270, y2: 38 + i * 14, stroke: '#8a8378', 'stroke-width': 1.4 }, svg);
    }
    svgEl('path', { d: 'M150 18 A 46 46 0 0 1 150 98', fill: 'none', stroke: aeg, 'stroke-width': 2.5, 'stroke-dasharray': '6 4', 'marker-end': '' }, svg);
    svgEl('path', { d: 'M146 92 L150 100 L156 94', fill: 'none', stroke: aeg, 'stroke-width': 2.5 }, svg);
    svgEl('path', { d: 'M154 24 L150 16 L144 22', fill: 'none', stroke: aeg, 'stroke-width': 2.5 }, svg);
    svgEl('ellipse', { cx: 196, cy: 58, rx: 40, ry: 26, fill: '#2a4258', opacity: 0.9, transform: 'rotate(-14 196 58)' }, svg);
    svgEl('path', { d: 'M163 52 L150 58 L166 66 Z', fill: gold }, svg);
    svgEl('text', { x: 150, y: 110, fill: dim, 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'Heebo' }, svg).textContent = 'תנועה מהשורש — המרפק נח';
  }
  if (kind === 'down-up') {
    // חץ למטה גדול, חץ למעלה קטן
    svgEl('line', { x1: 95, y1: 20, x2: 95, y2: 80, stroke: gold, 'stroke-width': 7, 'stroke-linecap': 'round' }, svg);
    svgEl('path', { d: 'M78 66 L95 90 L112 66 Z', fill: gold }, svg);
    svgEl('text', { x: 95, y: 107, fill: gold, 'font-size': 12, 'text-anchor': 'middle', 'font-weight': 700, 'font-family': 'Heebo' }, svg).textContent = 'למטה = חזק';
    svgEl('line', { x1: 205, y1: 82, x2: 205, y2: 38, stroke: aeg, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
    svgEl('path', { d: 'M193 46 L205 28 L217 46 Z', fill: aeg }, svg);
    svgEl('text', { x: 205, y: 107, fill: aeg, 'font-size': 12, 'text-anchor': 'middle', 'font-family': 'Heebo' }, svg).textContent = 'למעלה = קל';
  }
  if (kind === 'taximi') {
    // קו מלודי עולה ויורד עם נקודות מנוחה
    const pts = 'M20 90 Q50 88 65 74 Q72 66 88 66 Q108 66 118 50 Q126 38 150 36 Q178 34 196 26 Q224 36 240 58 Q258 80 282 88';
    svgEl('path', { d: pts, fill: 'none', stroke: gold, 'stroke-width': 2.5 }, svg);
    [[65, 74], [118, 50], [196, 26], [240, 58]].forEach(([x, y], i) => {
      svgEl('circle', { cx: x, cy: y, r: 5, fill: i === 2 ? '#d96459' : aeg }, svg);
    });
    svgEl('text', { x: 196, y: 14, fill: '#d96459', 'font-size': 10.5, 'text-anchor': 'middle', 'font-family': 'Heebo' }, svg).textContent = 'שיא באוקטבה';
    svgEl('text', { x: 90, y: 104, fill: dim, 'font-size': 10.5, 'font-family': 'Heebo' }, svg).textContent = 'מנוחות בדרך';
  }
}

/* ===================== מסך מקצבים ===================== */
let currentRhythm = RHYTHMS[0];
let rhythmBpm = RHYTHMS[0].tempo[2];
let rhythmScheduler = null;

function initRhythms() {
  const tabs = $('#rhythm-tabs');
  RHYTHMS.forEach((r, i) => {
    const tab = document.createElement('button');
    tab.className = 'rhythm-tab' + (i === 0 ? ' active' : '');
    tab.innerHTML = `${r.nameHe} <small>${r.meter}</small>`;
    tab.addEventListener('click', () => {
      $$('.rhythm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      stopRhythm();
      currentRhythm = r;
      rhythmBpm = r.tempo[2];
      renderRhythm();
    });
    tabs.appendChild(tab);
  });

  $('#rh-bpm-down').addEventListener('click', () => setRhythmBpm(rhythmBpm - 5));
  $('#rh-bpm-up').addEventListener('click', () => setRhythmBpm(rhythmBpm + 5));
  $('#rh-bpm-slider').addEventListener('input', (e) => setRhythmBpm(parseInt(e.target.value, 10)));
  $('#rh-play').addEventListener('click', toggleRhythm);

  renderRhythm();
}

function setRhythmBpm(v) {
  rhythmBpm = Math.max(40, Math.min(240, v));
  $('#rh-bpm').textContent = rhythmBpm;
  $('#rh-bpm-slider').value = rhythmBpm;
  if (rhythmScheduler && rhythmScheduler.running) {
    rhythmScheduler.stepDur = rhythmStepDur();
  }
}

function rhythmStepDur() {
  return (60 / rhythmBpm) * currentRhythm.beatsPerCell;
}

function renderRhythm() {
  const r = currentRhythm;
  $('#rh-name').textContent = r.nameHe;
  $('#rh-greek').textContent = r.nameGr;
  $('#rh-meter').textContent = r.meter;
  $('#rh-grouping').textContent = 'חלוקה: ' + r.grouping;
  $('#rh-desc').textContent = r.desc;
  $('#rh-dance').textContent = r.dance;
  $('#rh-tip').textContent = r.tip;
  setRhythmBpm(rhythmBpm);
  $('#rh-bpm-slider').min = Math.max(40, r.tempo[0] - 15);
  $('#rh-bpm-slider').max = r.tempo[1] + 25;

  // נקודות התחלה של קבוצות
  const groupStarts = new Set([0]);
  let acc = 0;
  r.grouping.split('+').forEach(g => {
    acc += parseInt(g, 10);
    if (acc < r.cells) groupStarts.add(acc);
  });

  const strip = $('#beat-strip');
  strip.innerHTML = '';
  r.grid.forEach((cell, i) => {
    const div = document.createElement('div');
    const cls = cell === 'D' ? 'dum' : cell === 't' ? 'tek' : 'rest';
    div.className = `beat-cell ${cls}` + (groupStarts.has(i) ? ' group-start' : '');
    div.innerHTML = `<div class="b-sym">${cell === 'D' ? 'דום' : cell === 't' ? 'טק' : '·'}</div><div class="b-num">${i + 1}</div>`;
    strip.appendChild(div);
  });

  const peniaRow = $('#beat-penia');
  peniaRow.innerHTML = '';
  r.penia.forEach(p => {
    const div = document.createElement('div');
    div.className = 'bp-cell';
    div.textContent = p === 'd' ? '↓' : p === 'u' ? '↑' : '·';
    peniaRow.appendChild(div);
  });
}

function toggleRhythm() {
  const btn = $('#rh-play');
  if (rhythmScheduler && rhythmScheduler.running) { stopRhythm(); return; }
  AudioEngine.ensureCtx();
  const cells = $('#beat-strip').querySelectorAll('.beat-cell');
  rhythmScheduler = new AudioEngine.Scheduler(
    (step, time) => {
      const r = currentRhythm;
      const v = r.grid[step];
      if (v === 'D') AudioEngine.dum(time);
      else if (v === 't') AudioEngine.tek(time);
      if ($('#rh-strum').checked) {
        const p = r.penia[step];
        if (p) AudioEngine.strum(time, p, v === 'D');
      }
    },
    (step) => {
      cells.forEach(c => c.classList.remove('lit'));
      if (cells[step]) cells[step].classList.add('lit');
    }
  );
  rhythmScheduler.numSteps = currentRhythm.cells;
  rhythmScheduler.stepDur = rhythmStepDur();
  rhythmScheduler.start();
  activeSchedulers.push(rhythmScheduler);
  btn.classList.add('playing');
  btn.textContent = '⏹ עצור';
}

function stopRhythm() {
  if (rhythmScheduler) rhythmScheduler.stop();
  $('#rh-play').classList.remove('playing');
  $('#rh-play').textContent = '▶ נגן מקצב';
  $$('#beat-strip .beat-cell').forEach(c => c.classList.remove('lit'));
}

/* ===================== חדר תרגול ===================== */
let metScheduler = null;
let metBpm = 90;

function todayKey() {
  const d = new Date();
  return `routine-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function initPractice() {
  const wrap = $('#routine');
  const saved = JSON.parse(localStorage.getItem(todayKey()) || '{}');

  PRACTICE_ROUTINE.forEach(item => {
    const div = document.createElement('div');
    div.className = 'routine-item' + (saved[item.id] ? ' done' : '');
    div.innerHTML = `
      <div class="routine-check">✓</div>
      <div class="routine-label">${item.label}</div>
      <div class="routine-min">${item.minutes} דק׳</div>`;
    div.addEventListener('click', () => {
      div.classList.toggle('done');
      const state = JSON.parse(localStorage.getItem(todayKey()) || '{}');
      state[item.id] = div.classList.contains('done');
      localStorage.setItem(todayKey(), JSON.stringify(state));
      updateStreak();
    });
    wrap.appendChild(div);
  });

  $('#routine-reset').addEventListener('click', () => {
    localStorage.removeItem(todayKey());
    $$('.routine-item').forEach(d => d.classList.remove('done'));
    updateStreak();
  });

  updateStreak();

  // מטרונום חופשי
  $('#met-bpm-down').addEventListener('click', () => setMetBpm(metBpm - 5));
  $('#met-bpm-up').addEventListener('click', () => setMetBpm(metBpm + 5));
  $('#met-play').addEventListener('click', toggleMet);
  $('#met-sig').addEventListener('change', () => { stopMet(); renderMetDots(); });
  renderMetDots();
}

function updateStreak() {
  const state = JSON.parse(localStorage.getItem(todayKey()) || '{}');
  const done = PRACTICE_ROUTINE.filter(i => state[i.id]).length;
  const total = PRACTICE_ROUTINE.length;
  const el = $('#streak');
  if (done === total) {
    el.textContent = '🏆 כל הכבוד! סיימתם את השגרה של היום — Γεια σου, μάστορα!';
    if (typeof DailyStreak !== 'undefined') DailyStreak.touch('routine');
    if (typeof ProgressLog !== 'undefined') {
      ProgressLog.log('routine', 'שגרה יומית הושלמה', { durationSec: 25 * 60 });
    }
  } else if (done > 0) {
    el.textContent = `${done} מתוך ${total} — ממשיכים!`;
  } else {
    el.textContent = '';
  }
}

function metConfig() {
  const v = $('#met-sig').value;
  if (v === '7') return { steps: 7, accents: [0, 3, 5] };
  if (v === '9') return { steps: 9, accents: [0, 2, 4, 6] };
  const n = parseInt(v, 10);
  return { steps: n, accents: [0] };
}

function renderMetDots() {
  const cfg = metConfig();
  const wrap = $('#met-dots');
  wrap.innerHTML = '';
  for (let i = 0; i < cfg.steps; i++) {
    const dot = document.createElement('div');
    dot.className = 'met-dot' + (cfg.accents.includes(i) ? ' accent-dot' : '');
    wrap.appendChild(dot);
  }
}

function setMetBpm(v) {
  metBpm = Math.max(30, Math.min(260, v));
  $('#met-bpm').textContent = metBpm;
  if (metScheduler && metScheduler.running) {
    const v2 = $('#met-sig').value;
    metScheduler.stepDur = (v2 === '7' || v2 === '9') ? (60 / metBpm) / 2 : 60 / metBpm;
  }
}

function toggleMet() {
  const btn = $('#met-play');
  if (metScheduler && metScheduler.running) { stopMet(); return; }
  AudioEngine.ensureCtx();
  const cfg = metConfig();
  const dots = $('#met-dots').querySelectorAll('.met-dot');
  const v = $('#met-sig').value;
  metScheduler = new AudioEngine.Scheduler(
    (step, time) => AudioEngine.click(time, cfg.accents.includes(step)),
    (step) => {
      dots.forEach(d => d.classList.remove('lit'));
      if (dots[step]) dots[step].classList.add('lit');
    }
  );
  metScheduler.numSteps = cfg.steps;
  metScheduler.stepDur = (v === '7' || v === '9') ? (60 / metBpm) / 2 : 60 / metBpm;
  metScheduler.start();
  activeSchedulers.push(metScheduler);
  btn.classList.add('playing');
  btn.textContent = '⏹ עצור';
}

function stopMet() {
  if (metScheduler) metScheduler.stop();
  $('#met-play').classList.remove('playing');
  $('#met-play').textContent = '▶ הפעל';
  $$('#met-dots .met-dot').forEach(d => d.classList.remove('lit'));
}

/* ===================== מילון ===================== */
function initGlossary() {
  const wrap = $('#glossary');
  GLOSSARY.forEach(g => {
    const div = document.createElement('div');
    div.className = 'gloss-item';
    div.innerHTML = `<div class="gloss-term">${g.term}</div><div class="gloss-def">${g.def}</div>`;
    wrap.appendChild(div);
  });
}

/* ===================== קורס מקצועי ===================== */
let courseScheduler = null;
let courseItem = null;
let courseBpm = 70;

function initCourse() {
  if (typeof COURSE_DATA === 'undefined') return;
  const wrap = $('#course-levels');
  if (!wrap) return;

  COURSE_DATA.forEach((level, i) => {
    const card = document.createElement('div');
    card.className = 'course-level-card';
    card.innerHTML = `
      <div class="course-level-num">${i + 1}</div>
      <div class="course-level-title">${level.title}</div>
      <div class="course-level-sub">${level.subtitle}</div>
      <div class="course-level-meta">
        <span class="badge">${level.exercises.length} תרגילים</span>
        ${level.chords.length ? `<span class="badge alt">${level.chords.length} אקורדים</span>` : ''}
      </div>`;
    card.addEventListener('click', () => openCourseLevel(i));
    wrap.appendChild(card);
  });

  $('#course-back').addEventListener('click', closeCourseLevel);
  $('#course-play').addEventListener('click', toggleCoursePlay);
  $('#course-bpm-down').addEventListener('click', () => setCourseBpm(courseBpm - 5));
  $('#course-bpm-up').addEventListener('click', () => setCourseBpm(courseBpm + 5));
}

function openCourseLevel(idx) {
  const level = COURSE_DATA[idx];
  $('#course-levels').style.display = 'none';
  const detail = $('#course-detail');
  detail.style.display = '';

  $('#course-title').textContent = `שלב ${idx + 1}: ${level.title}`;
  $('#course-greek').textContent = level.titleGr;
  $('#course-badge').textContent = `${level.exercises.length} תרגילים`;
  $('#course-subtitle').textContent = level.subtitle;
  $('#course-theory').textContent = level.theory;

  // מטרות
  const goalsList = $('#course-goals');
  goalsList.innerHTML = '';
  level.goals.forEach(g => {
    const li = document.createElement('li');
    li.textContent = g;
    goalsList.appendChild(li);
  });

  // אקורדים
  const chordsSection = $('#course-chords-section');
  const chordsWrap = $('#course-chords');
  chordsWrap.innerHTML = '';
  if (level.chords.length > 0) {
    chordsSection.style.display = '';
    level.chords.forEach(chordName => {
      const chord = CHORDS[chordName];
      if (!chord) return;
      const div = document.createElement('div');
      div.className = 'chord-card';
      const tabShape = chord.shape.slice().reverse().map(f => f === 'x' ? 'x' : f).join('-');
      div.innerHTML = `<div class="chord-name">${chordName}</div><div class="chord-he">${chord.he}</div><div class="chord-shape" title="TAB: D-A-F-C">${tabShape}</div>`;
      div.addEventListener('click', () => {
        AudioEngine.ensureCtx();
        AudioEngine.strumChord(chord.shape.map(f => f === 'x' ? 'x' : f), 'd');
      });
      chordsWrap.appendChild(div);
    });
  } else {
    chordsSection.style.display = 'none';
  }

  // תרגילים
  const exList = $('#course-ex-list');
  exList.innerHTML = '';
  level.exercises.forEach((ex, i) => {
    const item = document.createElement('div');
    item.className = 'course-ex-item';
    item.innerHTML = `
      <div class="ex-idx">${i + 1}</div>
      <div class="ex-info">
        <h4>${ex.name}</h4>
        <p>${ex.bpm} BPM · ${ex.sub === 3 ? 'טריולים' : ex.sub === 4 ? 'שש-עשריות' : 'שמיניות'}</p>
      </div>`;
    item.addEventListener('click', () => openCourseExercise(ex));
    exList.appendChild(item);
  });

  $('#course-ex-detail').style.display = 'none';
  window.scrollTo(0, 0);
}

function closeCourseLevel() {
  stopCoursePlay();
  $('#course-levels').style.display = '';
  $('#course-detail').style.display = 'none';
}

function openCourseExercise(ex) {
  courseItem = ex;
  courseBpm = ex.bpm;
  const detail = $('#course-ex-detail');
  detail.style.display = '';

  $('#course-ex-name').textContent = ex.name;
  $('#course-ex-num').textContent = `${ex.bpm} BPM`;
  $('#course-ex-desc').textContent = ex.desc;
  setCourseBpm(ex.bpm);

  // ציור TAB
  if (typeof drawTab === 'function') {
    drawTab($('#course-tab'), ex);
  }

  detail.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setCourseBpm(v) {
  courseBpm = Math.max(30, Math.min(240, v));
  $('#course-bpm').textContent = courseBpm;
  if (courseScheduler && courseScheduler.running) {
    courseScheduler.stepDur = 60 / courseBpm / (courseItem?.sub || 2);
  }
}

function toggleCoursePlay() {
  const btn = $('#course-play');
  if (courseScheduler && courseScheduler.running) { stopCoursePlay(); return; }
  if (!courseItem) return;
  AudioEngine.ensureCtx();

  const events = courseItem.type === 'tab' ? courseItem.notes : [];
  const evMap = new Map();
  let step = 0;
  events.forEach((ev, idx) => { evMap.set(step, { idx, ev }); step += (ev.len || 1); });
  const totalSteps = step;

  courseScheduler = new AudioEngine.Scheduler(
    (s, time) => {
      const entry = evMap.get(s);
      if (!entry || entry.ev.rest) return;
      const ev = entry.ev;
      AudioEngine.pluckCourse(ev.c, ev.f, time, ev.d === 'D' || ev.d === 'U' ? 0.6 : 0.4);
      if ($('#course-click').checked) AudioEngine.click(time, s % (courseItem.sub * 2) === 0);
    },
    () => {}
  );
  courseScheduler.numSteps = totalSteps;
  courseScheduler.stepDur = 60 / courseBpm / (courseItem.sub || 2);
  courseScheduler.loop = $('#course-loop').checked;
  courseScheduler.start();
  activeSchedulers.push(courseScheduler);
  btn.classList.add('playing');
  btn.textContent = '⏹ עצור';
}

function stopCoursePlay() {
  if (courseScheduler) courseScheduler.stop();
  $('#course-play').classList.remove('playing');
  $('#course-play').textContent = '▶ נגן';
}

/* ===================== אתחול ===================== */
initHome();
initDromoi();
initPenia();
initRhythms();
initPractice();
initGlossary();
initCourse();
