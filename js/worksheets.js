/* ============================================================
   Worksheets — דפי עבודה להדפסה (שיעורי בית)
   יוצר דפים צבעוניים להדפסה/PDF: אקורדים, דרומוסים, יומן תרגול.
   תצוגה מקדימה בעמוד + הדפסה נקייה דרך iframe (בלי ניווט האפליקציה).
   ============================================================ */
'use strict';

const Worksheets = (() => {
  const NOTE_NAMES_W = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const SOLFEGE_W = { 'C': 'דו', 'C#': 'דו#', 'D': 'רה', 'D#': 'מי♭', 'E': 'מי', 'F': 'פה', 'F#': 'פה#', 'G': 'סול', 'G#': 'לה♭', 'A': 'לה', 'A#': 'סי♭', 'B': 'סי' };
  const OPEN_MIDI = { 0: 62, 1: 57, 2: 53, 3: 48 }; // course D,A,F,C
  const ROOT_PC = 2; // D

  let _type = 'mixed';
  let _selChords = new Set();
  let _selDromoi = new Set();
  let _opts = { name: '', note: '', blankTab: true, log: true };

  /* ---------- מקורות נתונים ---------- */
  function allChords() {
    const out = [];
    const seen = new Set();
    try {
      EDUCATION_CONTENT.chordCurriculum.groups.forEach(g => {
        (g.chords || []).forEach(c => {
          if (!c.name || seen.has(c.name)) return;
          if (!Array.isArray(c.frets) || !c.frets.some(f => typeof f === 'number')) return;
          seen.add(c.name);
          out.push({ name: c.name, nameHe: c.nameHe || '', frets: c.frets, fingers: c.fingers || '', dromos: c.dromos || [] });
        });
      });
    } catch (_) {}
    if (typeof CHORDS !== 'undefined') {
      Object.keys(CHORDS).forEach(k => {
        if (seen.has(k) || !Array.isArray(CHORDS[k].shape)) return;
        seen.add(k);
        out.push({ name: k, nameHe: CHORDS[k].he || '', frets: CHORDS[k].shape, fingers: '', dromos: [] });
      });
    }
    return out;
  }
  function allDromoi() {
    return (typeof DROMOI !== 'undefined') ? DROMOI : [];
  }

  /* ---------- ציור דיאגרמת אקורד (SVG) — אנכי, צבעוני להדפסה ---------- */
  function chordSvg(chord) {
    const frets = chord.frets; // [C,F,A,D]
    const cols = [3, 2, 1, 0];   // תצוגה D A F C
    const labels = ['D', 'A', 'F', 'C'];
    const nums = frets.filter(f => typeof f === 'number' && f > 0);
    const maxF = nums.length ? Math.max(...nums) : 0;
    const minF = nums.length ? Math.min(...nums) : 1;
    const startF = maxF > 5 ? Math.max(1, minF - 1) : 0; // הצג מאזור הצורה
    const numFrets = 5;
    const strW = 26, frH = 26, padT = 30, padL = 22, padR = 14, padB = 18;
    const w = padL + strW * 3 + padR, h = padT + frH * numFrets + padB;
    let s = `<svg viewBox="0 0 ${w} ${h}" class="ws-chord-svg" xmlns="http://www.w3.org/2000/svg">`;
    // מיתרים
    for (let i = 0; i < 4; i++) {
      const x = padL + i * strW;
      s += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${padT + frH * numFrets}" stroke="#9aa7b4" stroke-width="1.2"/>`;
      s += `<text x="${x}" y="${h - 4}" fill="#444" font-size="11" font-weight="700" text-anchor="middle" font-family="Heebo,sans-serif">${labels[i]}</text>`;
    }
    // אגוז/סריגים
    if (startF === 0) s += `<line x1="${padL - 3}" y1="${padT}" x2="${padL + strW * 3 + 3}" y2="${padT}" stroke="#222" stroke-width="4"/>`;
    else s += `<text x="${padL - 10}" y="${padT + frH * 0.6}" fill="#b5651d" font-size="10" font-weight="800" font-family="monospace" text-anchor="end">${startF + 1}</text>`;
    for (let f = 1; f <= numFrets; f++) {
      s += `<line x1="${padL}" y1="${padT + f * frH}" x2="${padL + strW * 3}" y2="${padT + f * frH}" stroke="#c9c2b4" stroke-width="1"/>`;
    }
    // נקודות
    cols.forEach((cfadIdx, col) => {
      const x = padL + col * strW;
      const fr = frets[cfadIdx];
      if (fr === 'x') { s += `<text x="${x}" y="${padT - 8}" fill="#c0392b" font-size="14" font-weight="800" text-anchor="middle">×</text>`; return; }
      if (typeof fr !== 'number') return;
      if (fr === 0) { s += `<circle cx="${x}" cy="${padT - 9}" r="5" fill="none" stroke="#2e8b57" stroke-width="1.8"/>`; return; }
      const rel = fr - startF;
      if (rel < 1 || rel > numFrets) return;
      const cy = padT + (rel - 0.5) * frH;
      const isRoot = ((OPEN_MIDI[cfadIdx] + fr) % 12) === (rootOfChord(chord));
      s += `<circle cx="${x}" cy="${cy}" r="9" fill="${isRoot ? '#c0392b' : '#e6951c'}" stroke="#7a4a06" stroke-width="1"/>`;
      s += `<text x="${x}" y="${cy + 3.5}" fill="#fff" font-size="10" font-weight="800" text-anchor="middle" font-family="Heebo,sans-serif">${fr}</text>`;
    });
    s += `</svg>`;
    return s;
  }
  function rootOfChord(chord) {
    const m = String(chord.name).match(/^([A-G][#b]?)/);
    if (!m) return -1;
    let r = m[1].replace('b', '#') === m[1] ? m[1] : m[1];
    const flat = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
    r = flat[m[1]] || m[1];
    return NOTE_NAMES_W.indexOf(r);
  }

  /* ---------- מפת דרומוס על הגריף (טבלת HTML צבעונית) ---------- */
  function dromosMapHtml(dromos) {
    const pcs = new Set((dromos.intervals || []).map(iv => (ROOT_PC + iv) % 12));
    const cols = [3, 2, 1, 0]; // C F A D (תצוגה שמאל→ימין)
    const labels = ['C', 'F', 'A', 'D'];
    const maxFret = 12;
    let html = `<table class="ws-map"><thead><tr><th></th>`;
    labels.forEach(l => html += `<th>${l}</th>`);
    html += `<th></th></tr></thead><tbody>`;
    for (let f = 1; f <= maxFret; f++) {
      html += `<tr><td class="ws-map-fret">${f}</td>`;
      cols.forEach(ci => {
        const midi = OPEN_MIDI[ci] + f;
        const pc = midi % 12;
        const nm = NOTE_NAMES_W[pc];
        let cls = 'ws-map-cell';
        if (pcs.has(pc)) cls += (pc === ROOT_PC) ? ' root' : ' scale';
        html += `<td class="${cls}">${nm}</td>`;
      });
      html += `<td class="ws-map-fret">${f}</td></tr>`;
    }
    html += `</tbody></table>`;
    return html;
  }

  function scaleSpellHtml(dromos) {
    const notes = (dromos.intervals || []).map(iv => NOTE_NAMES_W[(ROOT_PC + iv) % 12]);
    notes.push('D');
    return `<div class="ws-scale-spell">${notes.map(n =>
      `<span class="ws-note ${NOTE_NAMES_W.indexOf(n.replace('b', '#')) === ROOT_PC || n === 'D' ? 'root' : ''}">${n}<small>${SOLFEGE_W[n] || ''}</small></span>`
    ).join('<span class="ws-arr">→</span>')}</div>`;
  }

  function blankTabHtml(bars = 2) {
    let rows = '';
    ['D', 'A', 'F', 'C'].forEach(l => {
      rows += `<div class="ws-tab-line"><span class="ws-tab-lbl">${l}</span><span class="ws-tab-rule"></span></div>`;
    });
    return `<div class="ws-blank-tab"><div class="ws-blank-title">✍️ שורות ריקות לתרגול / כתיבה</div>${rows}</div>`;
  }

  function practiceRow() {
    return `<div class="ws-practice-row">תרגול: ${'<span class="ws-box"></span>'.repeat(5)} &nbsp; BPM ____ &nbsp; תאריך ______</div>`;
  }

  function practiceLogHtml() {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    let rows = days.map(d =>
      `<tr><td class="ws-log-day">${d}</td><td><span class="ws-box"></span></td><td class="ws-log-min">____ דק׳</td><td class="ws-log-note"></td></tr>`
    ).join('');
    return `<div class="ws-log-wrap"><div class="ws-block-title">📅 יומן תרגול שבועי</div>
      <table class="ws-log"><thead><tr><th>יום</th><th>בוצע</th><th>זמן</th><th>מה תרגלתי</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }

  /* ============================================================
     בניית הדף
     ============================================================ */
  function buildSheetHtml() {
    const chords = allChords();
    const dromoi = allDromoi();
    const date = new Date().toLocaleDateString('he-IL');
    let body = '';

    // כותרת
    body += `<div class="ws-sheet-header">
      <div class="ws-h-title">🎵 דף עבודה — בוזוקי</div>
      <div class="ws-h-fields">
        <span>שם: <b>${escapeHtml(_opts.name) || '_______________'}</b></span>
        <span>תאריך: <b>${date}</b></span>
      </div>
      ${_opts.note ? `<div class="ws-h-note">📌 ${escapeHtml(_opts.note)}</div>` : ''}
    </div>`;

    if (_opts.log && (_type === 'mixed')) body += practiceLogHtml();

    // אקורדים
    if (_type === 'chords' || _type === 'mixed') {
      const list = chords.filter(c => _selChords.has(c.name));
      if (list.length) {
        body += `<div class="ws-block-title">🎸 אקורדים לתרגול</div><div class="ws-chord-grid">`;
        list.forEach(c => {
          body += `<div class="ws-chord-item">
            <div class="ws-chord-name">${c.name}${c.nameHe ? `<small>${c.nameHe}</small>` : ''}</div>
            ${chordSvg(c)}
            ${c.fingers ? `<div class="ws-chord-fingers">🖐️ ${escapeHtml(c.fingers)}</div>` : ''}
            ${practiceRow()}
          </div>`;
        });
        body += `</div>`;
      }
    }

    // דרומוסים
    if (_type === 'dromoi' || _type === 'mixed') {
      const list = dromoi.filter(d => _selDromoi.has(d.id));
      list.forEach(d => {
        body += `<div class="ws-dromos-block">
          <div class="ws-dromos-banner">${d.nameHe || d.id} ${d.nameGr ? `· ${d.nameGr}` : ''}</div>
          ${d.degrees ? `<div class="ws-dromos-deg">דרגות: ${d.degrees}</div>` : ''}
          ${scaleSpellHtml(d)}
          <div class="ws-dromos-cols">
            <div class="ws-map-wrap">${dromosMapHtml(d)}</div>
            <div class="ws-dromos-side">
              ${d.mood ? `<div class="ws-mood">🎭 ${escapeHtml(d.mood)}</div>` : ''}
              ${d.tips ? `<div class="ws-tips">💡 ${escapeHtml(d.tips)}</div>` : ''}
              <div class="ws-ex-list">
                <b>תרגילי בית:</b>
                <div>1) נגנו את הסולם עולה ויורד על מיתר D, 4 פעמים.</div>
                <div>2) נגנו לאט (♩=60) ואז מהר (♩=100).</div>
                <div>3) מצאו את הצליל האדום (הטוניקה) בכל המיתרים.</div>
              </div>
            </div>
          </div>
          ${_opts.blankTab ? blankTabHtml() : ''}
        </div>`;
      });
    }

    body += `<div class="ws-footer">בוזוקי אקדמי · Καλή πρόοδο! · ${date}</div>`;
    return body;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  }

  /* ============================================================
     הדפסה דרך iframe (נקי, ללא ניווט)
     ============================================================ */
  function printSheet() {
    const sheet = buildSheetHtml();
    const ifr = document.createElement('iframe');
    ifr.setAttribute('aria-hidden', 'true');
    ifr.style.cssText = 'position:fixed;right:-9999px;bottom:0;width:800px;height:600px;border:0;';
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="css/style.css">
      <style>
        html,body{background:#fff;margin:0;padding:0;}
        body{font-family:'Heebo',sans-serif;}
        .ws-sheet{box-shadow:none !important;margin:0 !important;}
        @page{margin:10mm;}
        *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      </style></head>
      <body><div class="ws-sheet ws-print">${sheet}</div></body></html>`);
    doc.close();
    const go = () => {
      try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (_) {}
      setTimeout(() => ifr.remove(), 1500);
    };
    // המתן לטעינת גופן/CSS
    setTimeout(go, 600);
  }

  /* ============================================================
     מסך / פקדים
     ============================================================ */
  function init() {
    const el = document.querySelector('#worksheets-app');
    if (!el) return;
    // ברירת מחדל: כמה אקורדים ודרומוסים נפוצים
    const cs = allChords();
    ['D', 'Dm', 'A7', 'Gm', 'Am', 'C'].forEach(n => { if (cs.find(c => c.name === n)) _selChords.add(n); });
    const ds = allDromoi();
    ['hitzaz', 'rast'].forEach(id => { if (ds.find(d => d.id === id)) _selDromoi.add(id); });
    render(el);
  }

  function render(el) {
    el.innerHTML = `
      <div class="ws-controls card">
        <div class="ws-row">
          <b>סוג הדף:</b>
          <button class="btn small ws-type" data-t="mixed">📋 שיעורי בית (מעורב)</button>
          <button class="btn small ws-type" data-t="chords">🎸 אקורדים</button>
          <button class="btn small ws-type" data-t="dromoi">🛤️ דרומוסים</button>
        </div>
        <div class="ws-row">
          <label>שם התלמיד: <input type="text" id="ws-name" placeholder="(אופציונלי)"></label>
          <label>הערת מורה: <input type="text" id="ws-note" placeholder="(אופציונלי)"></label>
        </div>
        <div class="ws-row ws-opts">
          <label><input type="checkbox" id="ws-blanktab" checked> שורות TAB ריקות</label>
          <label><input type="checkbox" id="ws-log" checked> יומן תרגול שבועי</label>
        </div>
        <div class="ws-pick" id="ws-pick-chords"></div>
        <div class="ws-pick" id="ws-pick-dromoi"></div>
        <div class="ws-row ws-actions">
          <button class="btn ws-print-btn" id="ws-print">🖨️ הדפס / שמור PDF</button>
          <span class="ws-hint">נפתח חלון הדפסה — אפשר לבחור מדפסת או "שמור כ-PDF"</span>
        </div>
      </div>
      <div class="ws-preview-label">תצוגה מקדימה ↓</div>
      <div class="ws-sheet" id="ws-sheet"></div>`;

    bindControls(el);
    refresh(el);
  }

  function bindControls(el) {
    el.querySelectorAll('.ws-type').forEach(b => b.addEventListener('click', () => {
      _type = b.dataset.t; refresh(el);
    }));
    el.querySelector('#ws-name').addEventListener('input', e => { _opts.name = e.target.value; updateSheet(el); });
    el.querySelector('#ws-note').addEventListener('input', e => { _opts.note = e.target.value; updateSheet(el); });
    el.querySelector('#ws-blanktab').addEventListener('change', e => { _opts.blankTab = e.target.checked; updateSheet(el); });
    el.querySelector('#ws-log').addEventListener('change', e => { _opts.log = e.target.checked; updateSheet(el); });
    el.querySelector('#ws-print').addEventListener('click', printSheet);
  }

  function refresh(el) {
    el.querySelectorAll('.ws-type').forEach(b => b.classList.toggle('active', b.dataset.t === _type));
    const showChords = (_type === 'chords' || _type === 'mixed');
    const showDromoi = (_type === 'dromoi' || _type === 'mixed');

    const cWrap = el.querySelector('#ws-pick-chords');
    cWrap.style.display = showChords ? '' : 'none';
    if (showChords && !cWrap.dataset.built) {
      cWrap.dataset.built = '1';
      cWrap.innerHTML = `<div class="ws-pick-title">בחרו אקורדים:</div><div class="ws-chips" id="ws-chips-c"></div>`;
      const box = cWrap.querySelector('#ws-chips-c');
      allChords().forEach(c => {
        const chip = document.createElement('button');
        chip.className = 'ws-chip' + (_selChords.has(c.name) ? ' active' : '');
        chip.textContent = c.name;
        chip.addEventListener('click', () => {
          if (_selChords.has(c.name)) _selChords.delete(c.name); else _selChords.add(c.name);
          chip.classList.toggle('active'); updateSheet(el);
        });
        box.appendChild(chip);
      });
    }

    const dWrap = el.querySelector('#ws-pick-dromoi');
    dWrap.style.display = showDromoi ? '' : 'none';
    if (showDromoi && !dWrap.dataset.built) {
      dWrap.dataset.built = '1';
      dWrap.innerHTML = `<div class="ws-pick-title">בחרו דרומוסים:</div><div class="ws-chips" id="ws-chips-d"></div>`;
      const box = dWrap.querySelector('#ws-chips-d');
      allDromoi().forEach(d => {
        const chip = document.createElement('button');
        chip.className = 'ws-chip' + (_selDromoi.has(d.id) ? ' active' : '');
        chip.textContent = d.nameHe || d.id;
        chip.addEventListener('click', () => {
          if (_selDromoi.has(d.id)) _selDromoi.delete(d.id); else _selDromoi.add(d.id);
          chip.classList.toggle('active'); updateSheet(el);
        });
        box.appendChild(chip);
      });
    }
    updateSheet(el);
  }

  function updateSheet(el) {
    const sheet = el.querySelector('#ws-sheet');
    if (sheet) sheet.innerHTML = buildSheetHtml();
  }

  function stop() {}

  return { init, stop };
})();
