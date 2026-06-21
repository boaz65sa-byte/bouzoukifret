/* ============================================================
   ספריית תרגילים — TAB מתנגן, דיאגרמות אקורדים, נגן ליווי
   ============================================================ */
'use strict';

let exCat = EXERCISES[0];
let exItem = EXERCISES[0].items[0];
let exBpm = exItem.bpm;
let exScheduler = null;
let dailyChallengeActive = false;

function showDailyChallenge() {
  stopExercise();
  dailyChallengeActive = true;
  const { item, challengeLine } = generateDailyChallenge();

  exItem = item;
  exBpm = item.bpm;

  $$('#ex-list .dromos-item').forEach(x => x.classList.remove('active'));
  $('#ex-name').textContent = '🎲 אתגר יומי';
  $('#ex-num').textContent = '4 תיבות';
  $('#ex-challenge-line').textContent = challengeLine;
  $('#ex-desc').textContent = item.desc;
  setExBpm(item.bpm);

  $('#ex-chords').innerHTML = '';
  $('#ex-tab-wrap').style.display = '';
  $('#ex-strum').style.display = 'none';
  drawTab($('#ex-tab'), item);

  const subHint = item.sub === 3 ? ' · כל קבוצה = ↓↑↓' : item.sub === 4 ? ' · טרמולו מהיר' : '';
  $('#ex-hint').textContent =
    `↓ = פריטה למטה · ↑ = פריטה למעלה · זהוב = מודגש. 4 תיבות שנוצרו אוטומטית${subHint}. לחיצה על תו משמיעה אותו.`;
}

const COURSE_LABELS = ['D', 'A', 'F', 'C'];

/* ---------- בניית רשימת אירועים מנוטות ---------- */
function exTotalSteps(item) {
  const arr = item.type === 'tab' ? item.notes : item.events;
  return arr.reduce((s, n) => s + (n.len || 1), 0);
}
function exEventsAtSteps(item) {
  /* מחזיר מפה: stepIndex -> {idx, ev} */
  const arr = item.type === 'tab' ? item.notes : item.events;
  const map = new Map();
  let step = 0;
  arr.forEach((ev, idx) => {
    map.set(step, { idx, ev });
    step += ev.len || 1;
  });
  return map;
}

/* ---------- רינדור TAB ---------- */
function drawTab(svg, item) {
  svg.innerHTML = '';
  const notes = item.notes;
  const steps = exTotalSteps(item);
  const hasFing = notes.some(n => !n.rest && n.fing !== undefined);
  const stepW = 30, padL = 46, padR = 18, lineGap = 26, padT = 30;
  const width = padL + steps * stepW + padR;
  const tabH = lineGap * 3;
  const height = padT + tabH + (hasFing ? 80 : 56);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.minWidth = Math.min(width, 1500) + 'px';

  // קווי פעמה
  for (let s = 0; s <= steps; s += item.sub) {
    const x = padL + s * stepW;
    svgEl('line', { x1: x, y1: padT - 12, x2: x, y2: padT + tabH + 10, stroke: '#28415c', 'stroke-width': s % (item.sub * 4) === 0 ? 2 : 1 }, svg);
    if (s < steps) {
      svgEl('text', { x: x + 3, y: padT - 16, fill: '#5a7187', 'font-size': 10, 'font-family': 'Heebo' }, svg)
        .textContent = (s / item.sub) % 4 + 1;
    }
  }

  // 4 שורות TAB
  for (let i = 0; i < 4; i++) {
    const y = padT + i * lineGap;
    svgEl('line', { x1: padL - 30, y1: y, x2: width - padR, y2: y, stroke: '#46627f', 'stroke-width': 1.2 }, svg);
    svgEl('text', { x: padL - 40, y: y + 4, fill: '#e3b341', 'font-size': 13, 'font-weight': 700, 'font-family': 'Heebo' }, svg)
      .textContent = COURSE_LABELS[i];
  }

  // נוטות
  let step = 0;
  notes.forEach((n, idx) => {
    const x = padL + step * stepW + stepW / 2;
    const g = svgEl('g', { class: 'tab-note', 'data-idx': idx }, svg);
    if (!n.rest) {
      const y = padT + n.c * lineGap;
      const accent = n.d === 'D' || n.d === 'U';
      svgEl('circle', { cx: x, cy: y, r: 10.5, fill: accent ? '#e3b341' : '#1d3349', stroke: accent ? '#fff0c8' : '#4fb3d9', 'stroke-width': 1.4, class: 'tn-bg' }, g);
      const t = svgEl('text', { x, y: y + 4, fill: accent ? '#1a1408' : '#e8eef5', 'font-size': 12, 'font-weight': 800, 'text-anchor': 'middle', 'font-family': 'Heebo' }, g);
      t.textContent = n.f;
      // חץ כיוון
      const isDown = n.d.toLowerCase() === 'd';
      const ay = padT + tabH + 30;
      svgEl('text', {
        x, y: ay, fill: accent ? '#e3b341' : '#4fb3d9', 'text-anchor': 'middle',
        'font-size': accent ? 20 : 15, 'font-weight': 900, 'font-family': 'Heebo', class: 'tn-arrow'
      }, g).textContent = isDown ? '↓' : '↑';
      // אצבע יד שמאל
      if (hasFing && n.fing !== undefined) {
        const fy = padT + tabH + 56;
        svgEl('circle', { cx: x, cy: fy, r: 9, fill: '#13283c', stroke: '#4fb3d9', 'stroke-width': 1.4 }, g);
        svgEl('text', {
          x, y: fy + 3.8, fill: '#9fd8f0', 'font-size': 11, 'font-weight': 800,
          'text-anchor': 'middle', 'font-family': 'Heebo'
        }, g).textContent = n.fing;
      }
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => AudioEngine.pluckCourse(n.c, n.f, 0, 0.55));
    }
    step += n.len || 1;
  });
}

/* ---------- דיאגרמת אקורד (D·A·F·C משמאל — סטנדרט בוזוקי) ---------- */
function drawChordDiagram(container, name) {
  if (typeof ChordDiagram !== 'undefined') {
    ChordDiagram.renderCard(container, name);
    return;
  }
}

/* ---------- רצועת ליווי (strum) ---------- */
function drawStrumStrip(container, item) {
  container.innerHTML = '';
  item.events.forEach((ev, idx) => {
    const cell = document.createElement('div');
    const w = 30 + (ev.len || 1) * 26;
    cell.style.width = w + 'px';
    cell.dataset.idx = idx;
    if (ev.kind === 'rest') {
      cell.className = 'strum-cell rest';
      cell.innerHTML = `<div class="sc-top">·</div><div class="sc-bottom">שקט</div>`;
    } else if (ev.kind === 'bass') {
      cell.className = 'strum-cell bass';
      cell.dataset.chord = ev.chord;
      cell.innerHTML = `<div class="sc-top">↓</div><div class="sc-bottom">בס ${ev.chord}</div>`;
    } else {
      cell.className = 'strum-cell';
      cell.dataset.chord = ev.chord;
      cell.innerHTML = `<div class="sc-top">${ev.dir === 'd' ? '↓' : '↑'}</div><div class="sc-bottom">${ev.chord}</div>`;
    }
    container.appendChild(cell);
  });
  if (typeof ChordTooltip !== 'undefined') ChordTooltip.bindContainer(container);
}

/* ---------- ניהול מסך ---------- */
function initExercises() {
  const cats = $('#ex-cats');
  EXERCISES.forEach((cat, i) => {
    const tab = document.createElement('button');
    tab.className = 'rhythm-tab' + (i === 0 ? ' active' : '');
    tab.textContent = cat.title;
    tab.addEventListener('click', () => {
      $$('#ex-cats .rhythm-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      stopExercise();
      dailyChallengeActive = false;
      exCat = cat;
      renderExList();
      selectExercise(cat.items[0]);
    });
    cats.appendChild(tab);
  });

  $('#ex-bpm-down').addEventListener('click', () => setExBpm(exBpm - 5));
  $('#ex-bpm-up').addEventListener('click', () => setExBpm(exBpm + 5));
  $('#ex-play').addEventListener('click', toggleExercise);
  $('#ex-challenge-btn').addEventListener('click', showDailyChallenge);

  renderExList();
  selectExercise(exItem);
}

function renderExList() {
  $('#ex-cat-desc').textContent = exCat.desc;
  const list = $('#ex-list');
  list.innerHTML = '';
  exCat.items.forEach((item, i) => {
    const div = document.createElement('div');
    div.className = 'dromos-item' + (item === exItem ? ' active' : '');
    div.innerHTML = `<div class="di-name">${i + 1}. ${item.name}</div><div class="di-gr">${item.bpm} BPM מומלץ</div>`;
    div.addEventListener('click', () => {
      $$('#ex-list .dromos-item').forEach(x => x.classList.remove('active'));
      div.classList.add('active');
      stopExercise();
      dailyChallengeActive = false;
      selectExercise(item);
    });
    list.appendChild(div);
  });
}

function selectExercise(item) {
  dailyChallengeActive = false;
  exItem = item;
  exBpm = item.bpm;
  $('#ex-challenge-line').textContent = '';
  $('#ex-name').textContent = item.name;
  $('#ex-desc').textContent = item.desc;
  const catIdx = EXERCISES.indexOf(exCat) + 1;
  const itemIdx = exCat.items.indexOf(item) + 1;
  $('#ex-num').textContent = `תרגיל ${catIdx}.${itemIdx}`;
  setExBpm(item.bpm);

  const chordsWrap = $('#ex-chords');
  chordsWrap.innerHTML = '';
  const tabWrap = $('#ex-tab-wrap');
  const strumWrap = $('#ex-strum');

  if (item.type === 'tab') {
    tabWrap.style.display = '';
    strumWrap.style.display = 'none';
    drawTab($('#ex-tab'), item);
    const hasFing = item.notes.some(n => !n.rest && n.fing !== undefined);
    $('#ex-hint').textContent = '↓ = פריטה למטה · ↑ = פריטה למעלה · זהוב = מודגש. השורות מלמעלה למטה: רה, לה, פה, דו. לחיצה על תו משמיעה אותו.'
      + (hasFing ? ' עיגול כחול = אצבע יד שמאל (1 מורה · 2 אמה · 3 קמיצה · 4 זרת · 0 פתוח).' : '');
  } else {
    tabWrap.style.display = 'none';
    strumWrap.style.display = '';
    (item.chords || []).forEach(name => drawChordDiagram(chordsWrap, name));
    drawStrumStrip(strumWrap, item);
    $('#ex-hint').textContent = 'לחצו על דיאגרמת אקורד לשמיעה. "בס" = פורטים רק את המיתר הנמוך של האקורד, מודגש. רוחב תא = אורך הצליל.';
  }
}

function setExBpm(v) {
  exBpm = Math.max(35, Math.min(220, v));
  $('#ex-bpm').textContent = exBpm;
  if (exScheduler && exScheduler.running) exScheduler.stepDur = 60 / exBpm / exItem.sub;
}

function toggleExercise() {
  if (exScheduler && exScheduler.running) { stopExercise(); return; }
  if (typeof stopAllPlayback === 'function') stopAllPlayback();
  AudioEngine.ensureCtx();
  const item = exItem;
  const evMap = exEventsAtSteps(item);
  const total = exTotalSteps(item);
  const isTab = item.type === 'tab';
  const noteEls = isTab ? $('#ex-tab').querySelectorAll('.tab-note') : $('#ex-strum').querySelectorAll('.strum-cell');
  let stopped = false;

  exScheduler = new AudioEngine.Scheduler(
    (step, time) => {
      // מטרונום
      if ($('#ex-click').checked && step % item.sub === 0) {
        AudioEngine.click(time, step === 0);
      }
      const hit = evMap.get(step);
      if (hit) {
        const ev = hit.ev;
        if (isTab) {
          if (!ev.rest) AudioEngine.pluckCourse(ev.c, ev.f, time, ev.d === 'D' || ev.d === 'U' ? 0.62 : 0.45);
        } else {
          const chord = CHORDS[ev.chord];
          if (ev.kind === 'strum') AudioEngine.strumChord(chord.shape, ev.dir, time, 0.42);
          else if (ev.kind === 'bass') AudioEngine.bassOfChord(chord.shape, time, 0.6, ev.c !== undefined ? { c: ev.c, f: ev.f } : null);
        }
      }
      // עצירה בסוף אם אין לולאה
      if (step === total - 1 && !$('#ex-loop').checked) {
        setTimeout(() => { if (!stopped) stopExercise(); }, (60 / exBpm / item.sub) * 1000 + 80);
      }
    },
    (step) => {
      const hit = evMap.get(step);
      if (hit) {
        noteEls.forEach(el => el.classList.remove('lit'));
        const el = isTab ? $(`#ex-tab .tab-note[data-idx="${hit.idx}"]`) : $(`#ex-strum .strum-cell[data-idx="${hit.idx}"]`);
        if (el) el.classList.add('lit');
      }
    }
  );
  exScheduler.numSteps = total;
  exScheduler.stepDur = 60 / exBpm / item.sub;
  exScheduler.start();
  activeSchedulers.push(exScheduler);
  const btn = $('#ex-play');
  btn.classList.add('playing');
  btn.textContent = '⏹ עצור';
  exScheduler._stopFlag = () => { stopped = true; };
}

function stopExercise() {
  if (exScheduler) {
    if (exScheduler._stopFlag) exScheduler._stopFlag();
    exScheduler.stop();
  }
  const btn = $('#ex-play');
  btn.classList.remove('playing');
  btn.textContent = '▶ נגן';
  $$('#ex-tab .tab-note, #ex-strum .strum-cell').forEach(el => el.classList.remove('lit'));
}

/** פתיחת תרגיל לפי id — משמש מסך "למד מהשיר" ונתיבי דרומוס */
function openExerciseById(exId) {
  for (let ci = 0; ci < EXERCISES.length; ci++) {
    const cat = EXERCISES[ci];
    const item = cat.items.find(x => x.id === exId);
    if (!item) continue;
    exCat = cat;
    const navBtn = document.querySelector('.nav-btn[data-screen="exercises"]');
    if (navBtn) navBtn.click();
    setTimeout(() => {
      const tabs = $$('#ex-cats .rhythm-tab');
      if (tabs[ci]) {
        $$('#ex-cats .rhythm-tab').forEach(t => t.classList.remove('active'));
        tabs[ci].classList.add('active');
        stopExercise();
        dailyChallengeActive = false;
        renderExList();
      }
      selectExercise(item);
    }, 60);
    return true;
  }
  return false;
}

initExercises();
