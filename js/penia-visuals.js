/* ============================================================
   PeniaVisuals — איורים מעשיים למסלול פנייה
   ============================================================ */
'use strict';

const PENIA_PRACTICAL = {
  'pc-1': {
    visual: 'pick-grip',
    caption: 'אגודל + אצבע מורה — רק 3–4 מ"מ מפרט בולטים. שורש כף היד נוגע קלות בגשר.',
    steps: [
      { icon: '🤏', title: 'אחיזה', detail: 'המפרט בין כרית האגודל לצד האצבע המורה — לא בקצוות.' },
      { icon: '📏', title: 'חשיפה', detail: '3–4 מ"מ בלבד. יותר = צליל מחוספס.' },
      { icon: '↓', title: '20 פעמים', detail: 'מיתר D (לה) פתוח — פריטה למטה בלחץ אחיד, מרפק קבוע.' },
      { icon: '✓', title: 'בדיקה', detail: 'אין כאב בכף יד? המפרט לא "בורח"? — ממשיכים.' },
    ],
    check: 'כל פריטה נשמעת באותו עוצמה',
    strings: 'D פתוח (מיתר 2)',
    bpmStart: 60,
  },
  'pc-2': {
    visual: 'down-up',
    caption: 'למטה (↓) = חזק על הפעמה · למעלה (↑) = קל בין הפעמות.',
    steps: [
      { icon: '↓', title: 'פריטה למטה', detail: 'על כל "1" ו-"3" — יותר משקל, תנועה מהשורש.' },
      { icon: '↑', title: 'פריטה למעלה', detail: 'בין הפעמות — קל, קצר, לא "מכה".' },
      { icon: '🔄', title: 'תבנית', detail: '↓↑↓↑ ↓↑↓↑ על D פתוח — 50 BPM.' },
      { icon: '👂', title: 'אוזן', detail: 'עיניים עצומות: האם ↓ ו-↑ שווים בנפח? אם ↑ חלש — תרגלו ↑ בלבד.' },
    ],
    strokes: ['D', 'u', 'd', 'u', 'D', 'u', 'd', 'u'],
    check: 'שמעתם "נדנוד" — חזק-קל-חזק-קל',
    strings: 'D פתוח',
    bpmStart: 50,
  },
  'pc-3': {
    visual: 'accents',
    caption: 'ספרו בקול 1-2-3-4 — הדגישו רק את "1". המטרונום = הפעמה.',
    steps: [
      { icon: '1️⃣', title: 'דגש על 1', detail: '↓↑↓↑ — רק ה-↓ הראשון בכל תיבה חזק.' },
      { icon: '🥁', title: 'מטרונום', detail: '70 BPM — הקליק = הפעמה. ↓ על הקליק.' },
      { icon: '🎸', title: 'עם אקורד', detail: 'Dm פתוח — אותה תבנית, שמרו על דגש.' },
      { icon: '🗣️', title: 'ספירה', detail: 'ספרו בקול בזמן נגינה — לא ניתן לרמות.' },
    ],
    strokes: ['D', 'u', 'd', 'u', 'D', 'u', 'd', 'u'],
    check: 'ה"1" בולט בבירור גם ב-80 BPM',
    strings: 'Dm או D פתוח',
    bpmStart: 70,
  },
  'pc-4': {
    visual: 'syrtos-strip',
    caption: 'חסאפיקו: ↓ _ ↓↑ ↓ _ ↑ _ — השקטים (_) חשובים כמו הפריטות.',
    steps: [
      { icon: '↓', title: 'פעמה 1', detail: 'פריטה למטה ארוכה — "עוגן".' },
      { icon: '·', title: 'שקט', detail: 'יד עוצרת — אל תפרטו. זה הנשימה.' },
      { icon: '↓↑↓', title: 'אמצע תיבה', detail: 'שלוש פריטות מהירות באמצע.' },
      { icon: '🔄', title: 'חזרה', detail: '80 BPM × 8 תיבות, אחר כך Dm→G7→A7.' },
    ],
    strokes: ['D', '-', 'd', 'u', 'd', '-', 'u', '-'],
    check: 'השקטים נשמעים — לא "ממלאים" בפריטות מיותרות',
    strings: 'ליווי אקורדים',
    bpmStart: 80,
  },
  'pc-5': {
    visual: 'zeibekiko-9',
    caption: '9/4 = 2+2+2+3. דגשים על 1, 5, 7. "תישבו" על כל פעמה.',
    steps: [
      { icon: '🦶', title: 'ספירה', detail: '1-2 | 3-4 | 5-6 | 7-8-9 — הקשה ברגל על 1, 5, 7.' },
      { icon: '↓', title: 'פריטה', detail: '↓ _ ↑ _ ↓↑ ↓↑ _ — 60 BPM, לא למהר.' },
      { icon: '🎵', title: 'האזנה', detail: 'Ευδοκία — עקבו אחרי איפה הבוזוקי "שותק".' },
      { icon: '🛤️', title: 'נתיב', detail: 'פתחו נתיב ζεϊμπέκικו — תרגילים zb1–zb3.' },
    ],
    strokes: ['D', '-', 'u', '-', 'd', 'u', 'D', 'u', '-'],
    check: 'מרגישים 3 "ברגלים" כבדים, לא סופרים 9 במהירות',
    strings: 'Am / Dm ליווי',
    bpmStart: 60,
    exerciseIds: ['zb1', 'zb3'],
  },
  'pc-6': {
    visual: 'triplet',
    caption: 'כל שלשה: ↓↑↓ — תמיד מתחילים למטה. זה קישוט הבוזוקי.',
    steps: [
      { icon: '3️⃣', title: 'שלשה אחת', detail: '↓↑↓ על D פתוח — 60 BPM, תו אחד = שלוש פריטות.' },
      { icon: '🔁', title: '4 שלשות', detail: '↓↑↓ ↓↑↓ ↓↑↓ ↓↑↓ — בלי לשנות כיוון באמצע.' },
      { icon: '🎼', title: '+ יד שמאל', detail: 'סריגים 0-1-4-5 על D — כל תו טריול.' },
      { icon: '⚡', title: 'מהירות', detail: '+5 BPM כל 2 דק׳ — חזרה 10 BPM כשמאבדים שליטה.' },
    ],
    strokes: ['D', 'u', 'd', 'D', 'u', 'd', 'D', 'u', 'd', 'D', 'u', 'd'],
    check: 'לא שומעים "קפיצה" בתחילת כל שלשה',
    strings: 'D + סריגים חיג׳אז',
    bpmStart: 60,
    exerciseIds: ['tr1', 'tr2'],
  },
  'pc-7': {
    visual: 'tremolo',
    caption: '↓↑↓↑ רציף — אחיזה רפויה, המפרט "רוקד" על המיתר.',
    steps: [
      { icon: '〰️', title: '2 דקות', detail: 'D פתוח, 50 BPM, שש-עשריות — בלי הפסקה.' },
      { icon: '🔊', title: 'עוצמה', detail: 'כל פריטה באותו volume — האוזן שופטת.' },
      { icon: '📈', title: 'הדרגה', detail: '50 → 60 → 70 BPM — רק כשהצליל אחיד.' },
      { icon: '🎭', title: 'ביטוי', detail: 'crescendo 8 תיבות, decrescendo 8 — כמו בלדה.' },
    ],
    strokes: ['d', 'u', 'd', 'u', 'd', 'u', 'd', 'u', 'd', 'u', 'd', 'u'],
    check: '2 דקות רצופות בלי "חורים" בצליל',
    strings: 'D פתוח',
    bpmStart: 50,
  },
  'pc-8': {
    visual: 'taximi',
    caption: 'שלבו: פנייה בסיסית → טריול → טרמולו → שקט. שמעו — אל תחשבו יותר מדי.',
    steps: [
      { icon: '🎤', title: '5 דקות חופשי', detail: 'דרומוס חיג׳אז או מינורה — נגנו מה שעולה.' },
      { icon: '📱', title: 'הקלטה', detail: 'הקליטו בטלפון — שמעו: יותר מדי נגינה? איפה השקט?' },
      { icon: '🎮', title: 'משחק', detail: 'מאסטר הפנייה — שלב 5+ לדיוק בקצב.' },
      { icon: '🎵', title: 'טקסימי', detail: '2 דקות בלי מטרונום — רק ביטוי ומנגינה.' },
    ],
    check: 'יש רגעים של שקט מכוון — לא ממלאים כל הזמן',
    strings: 'לפי דרומוס',
    bpmStart: 60,
  },
};

const PeniaVisuals = (() => {
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs = {}, parent = null) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    if (parent) parent.appendChild(el);
    return el;
  }

  function draw(svg, kind) {
    svg.innerHTML = '';
    svg.setAttribute('viewBox', '0 0 300 120');
    const gold = '#e3b341', aeg = '#4fb3d9', dim = '#8fa6bc', bad = '#d96459';

    if (kind === 'pick-grip') {
      svgEl('ellipse', { cx: 110, cy: 58, rx: 52, ry: 32, fill: '#2a4258' }, svg);
      svgEl('ellipse', { cx: 148, cy: 48, rx: 32, ry: 14, fill: '#33506c', transform: 'rotate(-28 148 48)' }, svg);
      svgEl('ellipse', { cx: 145, cy: 66, rx: 28, ry: 12, fill: '#3c5d7d' }, svg);
      svgEl('path', { d: 'M168 48 L198 56 L182 72 Z', fill: gold, stroke: '#fff0c8', 'stroke-width': 1.5 }, svg);
      svgEl('line', { x1: 40, y1: 95, x2: 260, y2: 95, stroke: '#8a8378', 'stroke-width': 2 }, svg);
      svgEl('text', { x: 150, y: 14, fill: gold, 'font-size': 12, 'text-anchor': 'middle', 'font-family': 'Heebo', 'font-weight': '700' }, svg).textContent = 'אחיזה נכונה';
      svgEl('text', { x: 220, y: 58, fill: dim, 'font-size': 10, 'font-family': 'Heebo' }, svg).textContent = '3-4 מ"מ';
    }

    if (kind === 'wrist-motion') {
      for (let i = 0; i < 4; i++) {
        svgEl('line', { x1: 30, y1: 36 + i * 14, x2: 270, y2: 36 + i * 14, stroke: '#8a8378', 'stroke-width': 1.4 }, svg);
      }
      svgEl('path', { d: 'M148 16 A 44 44 0 0 1 148 96', fill: 'none', stroke: aeg, 'stroke-width': 2.5, 'stroke-dasharray': '6 4' }, svg);
      svgEl('ellipse', { cx: 200, cy: 56, rx: 38, ry: 24, fill: '#2a4258' }, svg);
      svgEl('path', { d: 'M168 50 L155 58 L172 66 Z', fill: gold }, svg);
      svgEl('text', { x: 150, y: 112, fill: dim, 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'Heebo' }, svg).textContent = 'תנועה מהשורש — מרפק נייח';
    }

    if (kind === 'down-up' || kind === 'accents') {
      svgEl('line', { x1: 70, y1: 18, x2: 70, y2: 78, stroke: gold, 'stroke-width': 8, 'stroke-linecap': 'round' }, svg);
      svgEl('path', { d: 'M54 64 L70 88 L86 64 Z', fill: gold }, svg);
      svgEl('text', { x: 70, y: 108, fill: gold, 'font-size': 11, 'text-anchor': 'middle', 'font-weight': '700', 'font-family': 'Heebo' }, svg).textContent = '↓ חזק';
      svgEl('line', { x1: 170, y1: 78, x2: 170, y2: 34, stroke: aeg, 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
      svgEl('path', { d: 'M158 42 L170 24 L182 42 Z', fill: aeg }, svg);
      svgEl('text', { x: 170, y: 108, fill: aeg, 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'Heebo' }, svg).textContent = '↑ קל';
      if (kind === 'accents') {
        svgEl('circle', { cx: 70, cy: 88, r: 14, fill: 'none', stroke: bad, 'stroke-width': 2 }, svg);
        svgEl('text', { x: 230, y: 60, fill: bad, 'font-size': 22, 'font-weight': '900', 'font-family': 'Heebo' }, svg).textContent = '1';
      }
    }

    if (kind === 'wrist-motion') {
      for (let i = 0; i < 4; i++) {
        svgEl('line', { x1: 30, y1: 36 + i * 14, x2: 270, y2: 36 + i * 14, stroke: '#8a8378', 'stroke-width': 1.4 }, svg);
      }
      svgEl('path', { d: 'M148 16 A 44 44 0 0 1 148 96', fill: 'none', stroke: aeg, 'stroke-width': 2.5, 'stroke-dasharray': '6 4' }, svg);
      svgEl('ellipse', { cx: 200, cy: 56, rx: 38, ry: 24, fill: '#2a4258' }, svg);
      svgEl('text', { x: 150, y: 112, fill: dim, 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'Heebo' }, svg).textContent = 'תנועה מהשורש — מרפק נייח';
    }

    if (kind === 'syrtos-strip' || kind === 'zeibekiko-9') {
      const strokes = kind === 'zeibekiko-9'
        ? ['D', '-', 'u', '-', 'd', 'u', 'D', 'u', '-']
        : ['D', '-', 'd', 'u', 'd', '-', 'u', '-'];
      const w = 28;
      strokes.forEach((s, i) => {
        const x = 20 + i * (w + 4);
        const isDown = s === 'D' || s === 'd';
        const isRest = s === '-';
        svgEl('rect', {
          x, y: 30, width: w, height: 56, rx: 6,
          fill: isRest ? '#1a2533' : isDown ? 'rgba(227,179,65,0.35)' : 'rgba(79,179,217,0.25)',
          stroke: isRest ? '#243648' : isDown ? gold : aeg, 'stroke-width': 1.5,
        }, svg);
        const label = isRest ? '·' : isDown ? '↓' : '↑';
        svgEl('text', {
          x: x + w / 2, y: 64, fill: isRest ? dim : isDown ? gold : aeg,
          'font-size': 18, 'text-anchor': 'middle', 'font-weight': '700', 'font-family': 'Heebo',
        }, svg).textContent = label;
      });
      svgEl('text', {
        x: 150, y: 14, fill: gold, 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'Heebo', 'font-weight': '700',
      }, svg).textContent = kind === 'zeibekiko-9' ? '9/4 — ζεϊμπέκικο' : '4/4 — חסאפיקו';
    }

    if (kind === 'triplet') {
      [0, 1, 2].forEach(g => {
        const ox = 40 + g * 90;
        ['D', 'u', 'd'].forEach((s, i) => {
          const x = ox + i * 26;
          const down = s === 'D' || s === 'd';
          svgEl('rect', { x, y: 32, width: 22, height: 50, rx: 5, fill: down ? 'rgba(227,179,65,0.3)' : 'rgba(79,179,217,0.2)', stroke: down ? gold : aeg }, svg);
          svgEl('text', { x: x + 11, y: 62, fill: down ? gold : aeg, 'font-size': 16, 'text-anchor': 'middle', 'font-weight': '700', 'font-family': 'Heebo' }, svg).textContent = down ? '↓' : '↑';
        });
        svgEl('text', { x: ox + 26, y: 100, fill: dim, 'font-size': 9, 'text-anchor': 'middle', 'font-family': 'Heebo' }, svg).textContent = `שלשה ${g + 1}`;
      });
      svgEl('text', { x: 150, y: 16, fill: gold, 'font-size': 11, 'text-anchor': 'middle', 'font-weight': '700', 'font-family': 'Heebo' }, svg).textContent = '↓↑↓ — תמיד מתחילים למטה';
    }

    if (kind === 'tremolo') {
      const pts = 'M20 60 Q35 40 50 60 T80 60 T110 60 T140 60 T170 60 T200 60 T230 60 T260 60 T280 60';
      svgEl('path', { d: pts, fill: 'none', stroke: aeg, 'stroke-width': 3 }, svg);
      for (let x = 20; x <= 280; x += 20) {
        const down = (x / 20) % 2 === 0;
        svgEl('line', { x1: x, y1: 58, x2: x, y2: down ? 78 : 42, stroke: down ? gold : aeg, 'stroke-width': 3, 'stroke-linecap': 'round' }, svg);
      }
      svgEl('text', { x: 150, y: 108, fill: dim, 'font-size': 10, 'text-anchor': 'middle', 'font-family': 'Heebo' }, svg).textContent = '↓↑↓↑ רציף — אחיזה רפויה';
    }

    if (kind === 'taximi') {
      const pts = 'M20 88 Q50 86 65 72 Q72 64 88 64 Q108 64 118 48 Q126 36 150 34 Q178 32 196 24 Q224 34 240 56 Q258 78 282 86';
      svgEl('path', { d: pts, fill: 'none', stroke: gold, 'stroke-width': 2.5 }, svg);
      [[65, 72], [118, 48], [196, 24]].forEach(([x, y]) => {
        svgEl('circle', { cx: x, cy: y, r: 5, fill: aeg }, svg);
      });
      svgEl('text', { x: 150, y: 14, fill: gold, 'font-size': 11, 'text-anchor': 'middle', 'font-family': 'Heebo' }, svg).textContent = 'מנגינה + שקטים + טריולים';
    }
  }

  function renderStrokeStrip(container, strokes) {
    if (!container || !strokes?.length) return;
    container.innerHTML = '';
    container.className = 'penia-strip-mini';
    container.dir = 'ltr';
    strokes.forEach(s => {
      const cell = document.createElement('span');
      const down = s === 'D' || s === 'd';
      const rest = s === '-';
      cell.className = 'psm-cell' + (rest ? ' rest' : down ? ' down' : ' up');
      cell.textContent = rest ? '·' : down ? '↓' : '↑';
      if (s === 'D' || s === 'U') cell.classList.add('accent');
      container.appendChild(cell);
    });
  }

  function mountIllustration(container, kind) {
    if (!container) return;
    const wrap = document.createElement('div');
    wrap.className = 'penia-visual-box';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'penia-visual-svg');
    svg.setAttribute('aria-hidden', 'true');
    draw(svg, kind);
    wrap.appendChild(svg);
    container.innerHTML = '';
    container.appendChild(wrap);
  }

  function getPractical(stageId) {
    return PENIA_PRACTICAL[stageId] || null;
  }

  return { draw, renderStrokeStrip, mountIllustration, getPractical, PENIA_PRACTICAL };
})();
