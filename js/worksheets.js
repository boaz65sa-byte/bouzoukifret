/* ============================================================
   Worksheets — דפי עבודה להדפסה (שיעורי בית)
   יוצר דפים צבעוניים להדפסה/PDF: אקורדים, דרומוסים, יומן תרגול.
   כולל פרטבורד עם מסלול הדרומוס (לחיצה = תו עברית/לועזית + אצבע).
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
  let _opts = { name: '', note: '', blankTab: true, log: true, showFretboard: true };
  let _editMode = true;
  /** @type {Record<string, {posBase:number, stringMode:number}>} */
  const _fbPrefs = {};
  /** @type {WeakMap<Element, object>} */
  const _fbPanels = new WeakMap();

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

  function noteNames(midi) {
    const pc = ((midi % 12) + 12) % 12;
    const latin = (typeof NOTE_NAMES !== 'undefined' ? NOTE_NAMES[pc] : NOTE_NAMES_W[pc]);
    const he = (typeof SOLFEGE !== 'undefined' && SOLFEGE[latin]) || SOLFEGE_W[latin] || latin;
    return { latin, he, pc };
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
    const flat = { 'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#' };
    const r = flat[m[1]] || m[1];
    return NOTE_NAMES_W.indexOf(r);
  }

  /* ---------- מפת דרומוס על הגריף (טבלת HTML — גיבוי להדפסה) ---------- */
  function dromosMapHtml(dromos) {
    const pcs = new Set((dromos.intervals || []).map(iv => (ROOT_PC + iv) % 12));
    const cols = [3, 2, 1, 0];
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
      `<span class="ws-note ${n === 'D' ? 'root' : ''}">${n}<small>${SOLFEGE_W[n] || ''}</small></span>`
    ).join('<span class="ws-arr">→</span>')}</div>`;
  }

  function pathLegendHtml(path) {
    if (!path || !path.length) return '';
    const items = path.map((p, idx) => {
      const { latin, he } = noteNames(p.midi);
      const str = (typeof TUNING !== 'undefined' && TUNING[p.ci]) ? TUNING[p.ci].note : '?';
      const finger = p.finger > 0 ? `אצבע ${p.finger}` : 'פתוח';
      const fret = p.fret === 0 ? 'פתוח' : `סריג ${p.fret}`;
      return `<li><b>${p.degree || idx + 1}.</b> ${he} <span class="ws-lat">(${latin})</span> · מיתר ${str} · ${fret} · ${finger}</li>`;
    }).join('');
    return `<ol class="ws-path-legend">${items}</ol>`;
  }

  /** חיתוך viewBox לתיבת הפוזיציה בלבד — בלי גלילה, מתאים להדפסה */
  function cropSvgToPosition(svg, posBase, span) {
    if (typeof fretX !== 'function' || typeof FB === 'undefined' || typeof NUM_FRETS === 'undefined') return;
    const maxF = Math.min(NUM_FRETS, posBase + span + 1);
    const padL = 48, padR = 48, padT = 30, padB = 30;
    const x1 = (posBase === 0 ? FB.left - 42 : fretX(Math.max(0, posBase - 1))) - padL;
    const x2 = fretX(maxF) + padR;
    const y1 = FB.top - padT;
    const y2 = FB.height - FB.bottom + padB;
    svg.setAttribute('viewBox', `${x1} ${y1} ${x2 - x1} ${y2 - y1}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.classList.add('ws-fb-print-svg');
  }

  /** הגדלת תוויות ורקע בהיר — קריא יותר על נייר */
  function enhanceSvgForPrint(svg) {
    const vb = (svg.getAttribute('viewBox') || `0 0 ${FB.width} ${FB.height}`).split(/\s+/).map(Number);
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bg.setAttribute('x', vb[0]); bg.setAttribute('y', vb[1]);
    bg.setAttribute('width', vb[2]); bg.setAttribute('height', vb[3]);
    bg.setAttribute('fill', '#faf6ef');
    svg.insertBefore(bg, svg.firstChild);

    svg.querySelectorAll('rect').forEach(r => {
      const fill = r.getAttribute('fill') || '';
      if (fill.startsWith('url(#wood')) {
        r.setAttribute('fill', '#ebe4d6');
        r.setAttribute('stroke', '#8a7a68');
      }
    });

    svg.querySelectorAll('.fb-note-label, .fs-path-label').forEach(t => {
      const fs = parseFloat(t.getAttribute('font-size') || 10);
      t.setAttribute('font-size', String(Math.max(12, fs * 1.35)));
      t.setAttribute('font-weight', '800');
      const fill = t.getAttribute('fill');
      if (fill === '#eaf6fc' || fill === '#1a1408') t.setAttribute('fill', '#111');
    });

    svg.querySelectorAll('.note-dot circle').forEach(c => {
      const r = parseFloat(c.getAttribute('r') || 11);
      c.setAttribute('r', String(r * 1.25));
      const fill = c.getAttribute('fill');
      if (fill === '#2a7fa8') { c.setAttribute('fill', '#1a6080'); c.setAttribute('stroke', '#0d3d56'); }
      if (fill === '#e3b341') { c.setAttribute('fill', '#c0392b'); c.setAttribute('stroke', '#7a1f1f'); }
    });

    svg.querySelectorAll('.fs-scale-path').forEach(p => {
      p.setAttribute('stroke', '#b5651d');
      p.setAttribute('stroke-width', '3.5');
      p.setAttribute('opacity', '1');
    });
  }

  /** בונה SVG חדש לפי נתוני הדרומוס — לא תלוי בגלילה על המסך */
  function buildPrintFretboardCapture(dromos, pref) {
    if (typeof FretboardScale === 'undefined' || !FretboardScale.renderDromosScale) {
      return { svg: '', path: [] };
    }
    const span = FretboardScale.MELODY_POS_SPAN || 4;
    const tmp = document.createElement('div');
    tmp.setAttribute('aria-hidden', 'true');
    tmp.style.cssText = 'position:fixed;left:-10000px;top:0;overflow:visible;pointer-events:none;';
    document.body.appendChild(tmp);

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    svg.classList.add('fretboard', 'ws-fb-print-svg');
    svg.setAttribute('dir', 'ltr');
    tmp.appendChild(svg);

    const path = FretboardScale.renderDromosScale(svg, dromos.intervals, ROOT_PC, {
      posBase: pref.posBase,
      stringMode: pref.stringMode,
      dromosId: dromos.id,
      color: '#b5651d',
    }) || [];

    cropSvgToPosition(svg, pref.posBase, span);
    enhanceSvgForPrint(svg);

    const html = svg.outerHTML;
    tmp.remove();
    return { svg: html, path };
  }

  function dromosPrefFromPanel(rootEl, dromosId) {
    const pref = { ...(_fbPrefs[dromosId] || { posBase: 0, stringMode: 4 }) };
    const host = rootEl?.querySelector(`.ws-fb-host[data-dromos-id="${dromosId}"]`);
    if (host && _fbPanels.has(host)) {
      const st = _fbPanels.get(host).getState();
      if (st) {
        pref.posBase = st.posBase;
        pref.stringMode = st.stringMode;
        _fbPrefs[dromosId] = { posBase: st.posBase, stringMode: st.stringMode };
      }
    }
    return pref;
  }

  function fbMetaHtml(pref) {
    const posLbl = pref.posBase === 0 ? 'פתוח' : String(pref.posBase);
    return `<div class="ws-fb-meta">פוזיציה: <b>${posLbl}</b> · מיתרים: <b>${pref.stringMode}</b> · תווית על הנקודה = דרגה·אצבע</div>`;
  }

  function printCssBlock() {
    return `
.ws-sheet{box-shadow:none!important;margin:0!important;max-width:none;padding:8mm;}
.ws-dromos-block,.ws-fb-section,.ws-chord-item{break-inside:avoid;page-break-inside:avoid;}
.ws-fb-print{background:#faf6ef;border:2px solid #bbb;border-radius:8px;padding:10px 6px;overflow:visible;}
.ws-fb-print svg.fretboard,.ws-fb-print svg.ws-fb-print-svg{width:100%!important;min-width:0!important;max-width:100%!important;height:auto!important;display:block;}
.ws-path-legend{font-size:14px;line-height:1.5;}
.ws-path-legend li{margin:5px 0;}
.ws-fb-meta{font-size:14px;margin-bottom:10px;}
.ws-fb-hint,.ws-note-info,.ws-fb-host,.ws-path-legend-host{display:none!important;}
.ws-print-only-fb{display:block!important;}
`;
  }

  function blankTabHtml() {
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

  function formatNoteInfo(ci, fret, midi, path) {
    const { latin, he } = noteNames(midi);
    const str = (typeof TUNING !== 'undefined' && TUNING[ci]) ? TUNING[ci].note : '?';
    const onPath = (path || []).find(p => p.ci === ci && p.fret === fret);
    const fingerTxt = onPath
      ? (onPath.finger > 0 ? `אצבע ${onPath.finger}` : 'מיתר פתוח (בלי אצבע)')
      : 'לא במסלול';
    const deg = onPath ? (onPath.degree || '—') : '—';
    const fretTxt = fret === 0 ? 'פתוח' : `סריג ${fret}`;
    return `<div class="ws-note-info-card">
      <div class="ws-ni-main"><span class="ws-ni-he">${he}</span><span class="ws-ni-lat">${latin}</span></div>
      <div class="ws-ni-meta">מיתר ${str} · ${fretTxt} · דרגה ${deg} · <b>${fingerTxt}</b></div>
    </div>`;
  }

  /* ============================================================
     בניית הדף
     ============================================================ */
  /**
   * @param {{fbCapture?: Record<string, {svg:string, legend:string, meta:string}>}} [opts]
   */
  function buildSheetHtml(opts = {}) {
    const fbCapture = opts.fbCapture || null;
    const forPrint = !!fbCapture;
    const chords = allChords();
    const dromoi = allDromoi();
    const date = new Date().toLocaleDateString('he-IL');
    let body = '';

    body += `<div class="ws-sheet-header">
      <div class="ws-h-title">🎵 דף עבודה — בוזוקי</div>
      <div class="ws-h-fields">
        <span>שם: <b>${escapeHtml(_opts.name) || '_______________'}</b></span>
        <span>תאריך: <b>${date}</b></span>
      </div>
      ${_opts.note ? `<div class="ws-h-note">📌 ${escapeHtml(_opts.note)}</div>` : ''}
    </div>`;

    if (_opts.log && (_type === 'mixed')) body += practiceLogHtml();

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

    if (_type === 'dromoi' || _type === 'mixed') {
      const list = dromoi.filter(d => _selDromoi.has(d.id));
      list.forEach(d => {
        const cap = fbCapture && fbCapture[d.id];
        body += `<div class="ws-dromos-block" data-dromos-id="${escapeHtml(d.id)}">
          <div class="ws-dromos-banner">${d.nameHe || d.id} ${d.nameGr ? `· ${d.nameGr}` : ''}</div>
          ${d.degrees ? `<div class="ws-dromos-deg">דרגות: ${d.degrees}</div>` : ''}
          ${scaleSpellHtml(d)}
          <div class="ws-dromos-cols">
            ${_opts.showFretboard ? '' : `<div class="ws-map-wrap">${dromosMapHtml(d)}</div>`}
            <div class="ws-dromos-side">
              ${d.mood ? `<div class="ws-mood">🎭 ${escapeHtml(d.mood)}</div>` : ''}
              ${d.tips ? `<div class="ws-tips">💡 ${escapeHtml(d.tips)}</div>` : ''}
              <div class="ws-ex-list">
                <b>תרגילי בית:</b>
                <div>1) נגנו את המסלול על הפרטבורד עולה ויורד, 4 פעמים.</div>
                <div>2) לחצו על כל תו — זכרו את השם בעברית/לועזית ואת מספר האצבע.</div>
                <div>3) נגנו לאט (♩=60) ואז מהר (♩=100).</div>
              </div>
            </div>
          </div>`;

        if (_opts.showFretboard) {
          body += `<div class="ws-fb-section">
            <div class="ws-block-title ws-fb-title">🛤️ מסלול הדרומוס על הפרטבורד</div>
            <p class="ws-fb-hint">לחצו על תו במסלול — יוצגו השם בעברית, בלועזית ומספר האצבע. התווית על הנקודה = דרגה·אצבע.</p>`;
          if (forPrint && cap) {
            body += `${cap.meta || ''}
              <div class="ws-fb-print">${cap.svg}</div>
              ${cap.legend || ''}`;
          } else {
            body += `<div class="ws-note-info" data-info-for="${escapeHtml(d.id)}">לחצו על תו בפרטבורד כדי לראות עברית · לועזית · אצבע</div>
              <div class="ws-fb-host" data-dromos-id="${escapeHtml(d.id)}"></div>
              <div class="ws-path-legend-host" data-legend-for="${escapeHtml(d.id)}"></div>
              <div class="ws-print-only-fb" data-print-for="${escapeHtml(d.id)}"></div>`;
          }
          body += `</div>`;
        }

        body += `${_opts.blankTab ? blankTabHtml() : ''}
        </div>`;
      });
    }

    body += `<div class="ws-footer">בוזוקי אקדמי · Καλή πρόοδο! · ${date}</div>`;
    return body;
  }

  function escapeHtml(s) {
    return String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  }

  /* ---------- פרטבורד אינטראקטיבי ---------- */
  function mountFretboards(rootEl) {
    if (!_opts.showFretboard) return;
    if (typeof FretboardScale === 'undefined' || !FretboardScale.mountDromosScalePanel) return;
    const hosts = rootEl.querySelectorAll('.ws-fb-host[data-dromos-id]');
    hosts.forEach(host => {
      const id = host.dataset.dromosId;
      const d = allDromoi().find(x => x.id === id);
      if (!d || !d.intervals?.length) {
        host.innerHTML = '<p class="hint">אין נתוני סולם לדרומוס זה.</p>';
        return;
      }
      const pref = _fbPrefs[id] || { posBase: 0, stringMode: 4 };
      const infoEl = rootEl.querySelector(`.ws-note-info[data-info-for="${id}"]`);
      const legendEl = rootEl.querySelector(`.ws-path-legend-host[data-legend-for="${id}"]`);

      const panel = FretboardScale.mountDromosScalePanel(host, {
        intervals: d.intervals,
        rootPc: ROOT_PC,
        dromosId: d.id,
        posBase: pref.posBase,
        stringMode: pref.stringMode,
        onChange({ posBase, stringMode, path }) {
          _fbPrefs[id] = { posBase, stringMode };
          if (legendEl) legendEl.innerHTML = pathLegendHtml(path);
          refreshPrintCache(rootEl);
        },
        onDotClick({ ci, fret, midi, path }) {
          if (infoEl) infoEl.innerHTML = formatNoteInfo(ci, fret, midi, path);
        },
      });
      if (panel) _fbPanels.set(host, panel);
    });
  }

  function captureFretboards(rootEl) {
    /** @type {Record<string, {svg:string, legend:string, meta:string}>} */
    const out = {};
    if (!_opts.showFretboard) return out;

    allDromoi().filter(d => _selDromoi.has(d.id)).forEach(d => {
      const pref = dromosPrefFromPanel(rootEl, d.id);
      const built = buildPrintFretboardCapture(d, pref);
      out[d.id] = {
        svg: built.svg,
        legend: pathLegendHtml(built.path),
        meta: fbMetaHtml(pref),
      };
    });
    return out;
  }

  function refreshPrintCache(sheetEl) {
    if (!_opts.showFretboard) return;
    allDromoi().filter(d => _selDromoi.has(d.id)).forEach(d => {
      const slot = sheetEl.querySelector(`.ws-print-only-fb[data-print-for="${d.id}"]`);
      if (!slot) return;
      const pref = dromosPrefFromPanel(sheetEl, d.id);
      const built = buildPrintFretboardCapture(d, pref);
      slot.innerHTML = `${fbMetaHtml(pref)}<div class="ws-fb-print">${built.svg}</div>${pathLegendHtml(built.path)}`;
    });
  }

  /* ============================================================
     הדפסה דרך iframe (נקי, ללא ניווט)
     ============================================================ */
  function printSheet() {
    const app = document.querySelector('#worksheets-app');
    const fbCapture = app ? captureFretboards(app) : {};
    const sheet = buildSheetHtml({ fbCapture });
    const ifr = document.createElement('iframe');
    ifr.setAttribute('aria-hidden', 'true');
    ifr.style.cssText = 'position:fixed;right:-9999px;bottom:0;width:900px;height:700px;border:0;';
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="css/style.css">
      <style>
        html,body{background:#fff;margin:0;padding:0;}
        body{font-family:'Heebo',sans-serif;}
        ${printCssBlock()}
        .fs-pos-bar,.fs-edit-bar{display:none !important;}
        @page{margin:10mm;}
        *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      </style></head>
      <body><div class="ws-sheet ws-print">${sheet}</div></body></html>`);
    doc.close();
    const go = () => {
      try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (_) {}
      setTimeout(() => ifr.remove(), 1500);
    };
    setTimeout(go, 700);
  }

  /* ============================================================
     מסך / פקדים
     ============================================================ */
  function init() {
    const el = document.querySelector('#worksheets-app');
    if (!el) return;
    const cs = allChords();
    ['D', 'Dm', 'A7', 'Gm', 'Am', 'C'].forEach(n => { if (cs.find(c => c.name === n)) _selChords.add(n); });
    const ds = allDromoi();
    ['hitzaz', 'rast'].forEach(id => { if (ds.find(d => d.id === id)) _selDromoi.add(id); });
    render(el);
  }

  function render(el) {
    el.innerHTML = `
      <div class="ws-controls card">
        <div class="ws-row ws-edit-toggle-row">
          <button class="btn small" id="ws-toggle-edit">✏️ עריכת דף העבודה</button>
          <span class="ws-hint" id="ws-edit-hint">בחירת אקורדים/דרומוסים, הערות ועריכת מסלול על הפרטבורד</span>
        </div>
        <div class="ws-edit-panel" id="ws-edit-panel">
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
            <label><input type="checkbox" id="ws-showfb" checked> פרטבורד + מסלול דרומוס</label>
          </div>
          <div class="ws-pick" id="ws-pick-chords"></div>
          <div class="ws-pick" id="ws-pick-dromoi"></div>
        </div>
        <div class="ws-row ws-actions">
          <button class="btn ws-print-btn" id="ws-download">📥 הורד / שמור קובץ</button>
          <button class="btn small" id="ws-print">🖨️ הדפס / שמור PDF</button>
          <span class="ws-hint">ההדפסה והשמירה כוללות את הפרטבורד עם המסלול כפי שמוצג בתצוגה המקדימה</span>
        </div>
      </div>
      <div class="ws-preview-label">תצוגה מקדימה ↓</div>
      <div class="ws-sheet" id="ws-sheet"></div>`;

    bindControls(el);
    syncEditPanel(el);
    refresh(el);
  }

  function syncEditPanel(el) {
    const panel = el.querySelector('#ws-edit-panel');
    const btn = el.querySelector('#ws-toggle-edit');
    if (panel) panel.hidden = !_editMode;
    if (btn) {
      btn.classList.toggle('active', _editMode);
      btn.textContent = _editMode ? '✏️ סגור עריכה' : '✏️ עריכת דף העבודה';
    }
  }

  function bindControls(el) {
    el.querySelector('#ws-toggle-edit')?.addEventListener('click', () => {
      _editMode = !_editMode;
      syncEditPanel(el);
    });
    el.querySelectorAll('.ws-type').forEach(b => b.addEventListener('click', () => {
      _type = b.dataset.t; refresh(el);
    }));
    el.querySelector('#ws-name')?.addEventListener('input', e => { _opts.name = e.target.value; patchHeaderFields(el); });
    el.querySelector('#ws-note')?.addEventListener('input', e => { _opts.note = e.target.value; patchHeaderFields(el); });
    el.querySelector('#ws-blanktab')?.addEventListener('change', e => { _opts.blankTab = e.target.checked; updateSheet(el); });
    el.querySelector('#ws-log')?.addEventListener('change', e => { _opts.log = e.target.checked; updateSheet(el); });
    el.querySelector('#ws-showfb')?.addEventListener('change', e => { _opts.showFretboard = e.target.checked; updateSheet(el); });
    el.querySelector('#ws-print')?.addEventListener('click', printSheet);
    el.querySelector('#ws-download')?.addEventListener('click', () => downloadSheet(el));
  }

  function collectSheetCss() {
    let css = '';
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try { rules = sheet.cssRules; } catch (_) { continue; }
      if (!rules) continue;
      for (const rule of Array.from(rules)) {
        const txt = rule.cssText || '';
        if (/\.ws-|:root|\.fretboard|\.fs-|note-dot|\.fb-/.test(rule.selectorText || txt)) css += txt + '\n';
      }
    }
    return css;
  }

  function standaloneHtml(fbCapture) {
    const sheet = buildSheetHtml({ fbCapture });
    const css = collectSheetCss();
    return `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>דף עבודה — בוזוקי</title>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
html,body{background:#eee;margin:0;padding:14px;font-family:'Heebo',sans-serif;}
${css}
.ws-sheet{margin:0 auto;}
${printCssBlock()}
.fs-pos-bar,.fs-edit-bar{display:none !important;}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
@page{margin:10mm;}
@media print{html,body{background:#fff;padding:0;}.ws-sheet{box-shadow:none;}}
</style></head>
<body><div class="ws-sheet">${sheet}</div></body></html>`;
  }

  function downloadSheet(el) {
    try {
      const fbCapture = captureFretboards(el);
      const html = standaloneHtml(fbCapture);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const date = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `דף-עבודה-בוזוקי-${_type}-${date}.html`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
    } catch (e) {
      alert('ההורדה נכשלה: ' + (e.message || e));
    }
  }

  function refresh(el) {
    el.querySelectorAll('.ws-type').forEach(b => b.classList.toggle('active', b.dataset.t === _type));
    const showChords = (_type === 'chords' || _type === 'mixed');
    const showDromoi = (_type === 'dromoi' || _type === 'mixed');

    const cWrap = el.querySelector('#ws-pick-chords');
    if (cWrap) {
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
    }

    const dWrap = el.querySelector('#ws-pick-dromoi');
    if (dWrap) {
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
    }
    updateSheet(el);
  }

  function patchHeaderFields(el) {
    const sheet = el.querySelector('#ws-sheet');
    if (!sheet) return;
    const fields = sheet.querySelector('.ws-h-fields');
    if (fields) {
      const date = new Date().toLocaleDateString('he-IL');
      fields.innerHTML = `
        <span>שם: <b>${escapeHtml(_opts.name) || '_______________'}</b></span>
        <span>תאריך: <b>${date}</b></span>`;
    }
    let noteEl = sheet.querySelector('.ws-h-note');
    if (_opts.note) {
      if (!noteEl) {
        noteEl = document.createElement('div');
        noteEl.className = 'ws-h-note';
        sheet.querySelector('.ws-sheet-header')?.appendChild(noteEl);
      }
      noteEl.textContent = '📌 ' + _opts.note;
    } else if (noteEl) {
      noteEl.remove();
    }
  }

  function updateSheet(el) {
    const sheet = el.querySelector('#ws-sheet');
    if (!sheet) return;
    sheet.innerHTML = buildSheetHtml();
    mountFretboards(sheet);
    refreshPrintCache(sheet);
  }

  function stop() {}

  return { init, stop };
})();
