/* ============================================================
   DromosVisuals — מסלול מודוסים מעשי: לוח סריגים, פראזות, נגינה
   ============================================================ */
'use strict';

const DROMOS_SCALE_FRETS = {
  hitzaz: [0, 1, 4, 5, 7, 8, 10, 12],
  ousak: [0, 1, 3, 5, 7, 8, 10, 12],
  rast: [0, 2, 4, 5, 7, 9, 10, 12],
  minore: [0, 2, 3, 5, 7, 8, 11, 12],
  kiourdi: [0, 2, 3, 5, 7, 9, 10, 12],
  niavent: [0, 2, 3, 6, 7, 8, 11, 12],
  pireotikos: [0, 2, 4, 5, 7, 9, 11, 12],
};

const DROMOS_PRACTICAL = {
  'dc-hitzaz-0': {
    frets: DROMOS_SCALE_FRETS.hitzaz,
    visual: 'scale-d',
    bpmStart: 60,
    strokes: ['D', 'u', 'd', 'u', 'D', 'u', 'd', 'u'],
    caption: 'סולם חיג׳אז על מיתר רה — שימו לב לקפיצה סריג 1→4 (מי♭→פה#).',
    steps: [
      { icon: '👆', title: 'יד שמאל', detail: 'אצבע 1 על סריג 0, 2 על 1, 4 על 4 — הרגליים על הרצפה, מרפק רפוי.' },
      { icon: '↓↑', title: 'פנייה', detail: '↓↑↓↑ על כל תו — 60 BPM. עלייה מ-0 עד 12 וירידה בחזרה.' },
      { icon: '👂', title: 'האוזן', detail: 'הקפיצה 1→4 חייבת להישמע "מזרחית" — לא כרומטית חלקה.' },
      { icon: '🔁', title: 'חזרה', detail: '5 סיבובים מלאים בלי לעצור. רק אז ממשיכים לשלב 2.' },
    ],
    check: 'עליתם וירדתם בלי לפספס סריג, והקפיצה 1→4 ברורה',
    playMode: 'scale',
  },
  'dc-hitzaz-1': {
    phraseFrets: [0, 1, 4, 5, 4, 1, 0],
    visual: 'phrase-d',
    bpmStart: 55,
    caption: 'מוטיב הפתיחה הקלאסי של חיג׳אז — "חתימת" הדרומוס.',
    steps: [
      { icon: '1', title: 'סריג אחר סריג', detail: '0→1→4→5→4→1→0 — איטי, כל תו נשמע לפני הבא.' },
      { icon: '🎤', title: 'שירו', detail: 'שירו את המספרים בקול בזמן נגינה — מחבר מוח ליד.' },
      { icon: '🔁', title: '10 פעמים', detail: 'עד שהיד "יודעת" בלי לחשוב.' },
      { icon: '⚡', title: '+5 BPM', detail: '55→60→65 — רק כשכל התווים נקיים.' },
    ],
    check: 'הפראזה יוצאת חלק מ-0 עד 5 וחזרה בלי לעצור',
    playMode: 'phrase',
  },
  'dc-hitzaz-2': {
    phraseFrets: [0, 1, 4, 5, 7, 5, 4, 1, 0],
    visual: 'phrase-d',
    bpmStart: 60,
    caption: 'שלוש פראזות מחוברות: עלייה → מנוחה על 5 (סול) → ירידה לטוניקה.',
    steps: [
      { icon: '↑', title: 'עלייה', detail: '0-1-4-5-7 — תנו ל-7 "לשבת" שנייה.' },
      { icon: '⏸', title: 'נשימה', detail: 'שקט חצי שנייה על 5 לפני הירידה.' },
      { icon: '↓', title: 'ירידה', detail: '5-4-1-0 — איטי יותר מהעלייה.' },
      { icon: '📱', title: 'הקלטה', detail: 'הקליטו — האם יש נשימה בין החלקים?' },
    ],
    check: 'שומעים 3 "משפטים" נפרדים, לא רצף אחד ארוך',
    playMode: 'phrase',
  },
  'dc-hitzaz-3': {
    chords: ['Dm', 'A7'],
    visual: 'chords-dm',
    bpmStart: 70,
    strokes: ['D', 'u', 'd', 'u'],
    caption: 'נגנו מעל ליווי חיג׳אז — שמרו על רה (0) כנקודת בית.',
    steps: [
      { icon: '🎸', title: 'אקורדים', detail: 'Dm ↔ A7 — 2 תיבות כל אחד, 70 BPM.' },
      { icon: '🎵', title: 'סולם מעל', detail: 'בין אקורדים — 2-3 תווים מהפראזה של שלב 2.' },
      { icon: '🛤️', title: 'ליווי', detail: 'פתחו "רצועות ליווי" → חיג׳אז ונגנו יחד.' },
      { icon: '🏠', title: 'טוניקה', detail: 'כל פראזה מסתיימת על 0 (רה פתוח).' },
    ],
    check: 'נגנתם 4 תיבות ליווי + סולם קצר מעל בלי לאבד את הביט',
    playMode: 'chords',
    navScreen: 'backing',
  },

  'dc-ousak-0': {
    frets: DROMOS_SCALE_FRETS.ousak,
    visual: 'scale-d',
    bpmStart: 55,
    strokes: ['D', 'u', 'd', 'u'],
    caption: 'אוסאק = ♭2 (סריג 1) צמוד לטוניקה — "אנחה" מיידית.',
    steps: [
      { icon: '👆', title: 'סולם', detail: '0-1-3-5-7-8-10-12 על מיתר D — 55 BPM.' },
      { icon: '😔', title: '♭2', detail: 'אחרי כל 0, נגנו 1 מיד — זה הצבע העצוב.' },
      { icon: '↓', title: 'ירידה', detail: 'בירידה הדגישו 1→0 בכל סיום.' },
      { icon: '🔁', title: '5 סיבובים', detail: 'עלייה וירידה מלאות.' },
    ],
    check: 'המרווח 1→0 נשמע כמו "אנחה" בכל ירידה',
    playMode: 'scale',
  },
  'dc-ousak-1': {
    phraseFrets: [10, 8, 7, 5, 3, 1, 0],
    visual: 'phrase-d',
    bpmStart: 50,
    caption: 'הסיום הקלאסי של אוסאק — ירידה כמו נשיפה ארוכה.',
    steps: [
      { icon: '🌊', title: 'איטי', detail: '50 BPM — כל תו מחזיק זמן מלא.' },
      { icon: '💨', title: 'נשימה', detail: 'שקט חצי שנייה בין כל שני תווים בירידה.' },
      { icon: '🔁', title: '5 פעמים', detail: 'מהסוף של הסולם (10) עד 0.' },
      { icon: '🎵', title: 'סיום', detail: 'תמיד מסיימים על 0 — רה פתוח.' },
    ],
    check: 'הירידה נשמעת כמו "נשיפה" ולא כמו ריצה',
    playMode: 'phrase',
  },
  'dc-ousak-2': {
    phraseFrets: [1, 0, 1, 0, 1, 0],
    visual: 'sigh',
    bpmStart: 45,
    caption: 'המוטיב הבסיסי: ♭2→1 — "אנחה" חוזרת.',
    steps: [
      { icon: '😮‍💨', title: 'אנחה', detail: '1→0 — איטי, עם משיכה עדינה לפני 0.' },
      { icon: '🔁', title: '20 פעמים', detail: 'רק המוטיב הזה — בונים זיכרון שריר.' },
      { icon: '🎶', title: 'שלבו', detail: 'הוסיפו 2-3 תווים לפני כל אנחה מסולם שלב 1.' },
      { icon: '✓', title: 'בדיקה', detail: 'כל פראזה מסתיימת ב-1→0.' },
    ],
    check: 'מנגנים אנחה 1→0 בלי לחשוב — אוטומטי',
    playMode: 'phrase',
  },

  'dc-rast-0': {
    frets: DROMOS_SCALE_FRETS.rast,
    visual: 'scale-d',
    bpmStart: 70,
    strokes: ['D', 'u', 'd', 'u'],
    caption: 'ראסט = מז׳ור עם ♭7 (סריג 10 = דו במקום דו#).',
    steps: [
      { icon: '☀️', title: 'סולם', detail: '0-2-4-5-7-9-10-12 — 70 BPM, זורם.' },
      { icon: '👂', title: '♭7', detail: 'סריג 10 (דו) — לא 11 (דו#). זה ה"מרק" של ראסט.' },
      { icon: '🛑', title: 'מנוחות', detail: 'עצרו על 5 (סריג 7) ועל 4 (סריג 5) — נקודות ביטחון.' },
      { icon: '🔁', title: 'חזרה', detail: '5 עליות וירידות מלאות.' },
    ],
    check: 'לא בלבלתם בין סריג 10 ל-11 — ה-♭7 ברור',
    playMode: 'scale',
  },
  'dc-rast-1': {
    phraseFrets: [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0],
    visual: 'phrase-d',
    bpmStart: 65,
    caption: 'עלייה עם ♭7 (10), ירידה עם ♮7 (11) — טכניקה מסורתית.',
    steps: [
      { icon: '↑', title: 'עלייה', detail: '0→2→4→5→7→9→10→12 — דו במקום 11.' },
      { icon: '↓', title: 'ירידה', detail: '12→11→9→7→5→4→2→0 — דו# בירידה.' },
      { icon: '👂', title: 'השוואה', detail: 'שמעו איך הירידה "מחזירה הביתה" חזק יותר.' },
      { icon: '🔁', title: '3 פעמים', detail: 'לאט, ואז 75 BPM.' },
    ],
    check: 'מבחינים בין סריג 10 בעלייה ל-11 בירידה',
    playMode: 'phrase',
  },
  'dc-rast-2': {
    strokes: ['D', '-', 'd', 'u', 'd', '-', 'u', '-'],
    visual: 'syrtos',
    bpmStart: 80,
    caption: 'ראסט + חסאפיקו: דרומוס של ריקודים.',
    steps: [
      { icon: '💃', title: 'חסאפיקו', detail: '↓ _ ↓↑ ↓ _ ↑ _ — 80 BPM על D פתוח.' },
      { icon: '🎸', title: '+ סולם', detail: 'כל 4 תיבות — הוסיפו 3-4 תווים מסולם ראסט.' },
      { icon: '🛤️', title: 'מאמן', detail: 'מסלול פנייה → שלב חסאפיקו (pc-4).' },
      { icon: '🔁', title: '8 תיבות', detail: 'ללא הפסקה — גוף מרגיש את הקצב.' },
    ],
    check: 'חסאפיקו + תווי סולם בלי לאבד את הפעימה',
    playMode: 'strokes',
    peniaStage: 'pc-4',
  },

  'dc-minore-0': {
    frets: DROMOS_SCALE_FRETS.minore,
    visual: 'scale-d',
    bpmStart: 65,
    strokes: ['D', 'u', 'd', 'u'],
    caption: 'מינורה = מינור עם ♮7 (סריג 11 = דו#) — "תקווה" בירידה.',
    steps: [
      { icon: '🌹', title: 'סולם', detail: '0-2-3-5-7-8-11-12 — 65 BPM.' },
      { icon: '⭐', title: 'דו#', detail: 'סריג 11 — הדרגה המיוחדת. הדגישו אותה.' },
      { icon: '👂', title: 'F→C#', detail: 'המרווח המוגדל (8→11) = לב הרבטיקו.' },
      { icon: '🔁', title: 'חזרה', detail: '5 סיבובים מלאים.' },
    ],
    check: 'סריג 11 (דו#) בולט ולא מבלבל עם 10',
    playMode: 'scale',
  },
  'dc-minore-1': {
    chords: ['Dm', 'A7'],
    visual: 'chords-dm',
    bpmStart: 60,
    caption: 'הקדנציה הקלאסית: Dm → A7 → Dm.',
    steps: [
      { icon: '🎸', title: 'Dm', detail: '2 תיבות Dm — אחיזה: 0·0·0·2 (D-A-F-C).' },
      { icon: '7', title: 'A7', detail: 'תיבה אחת A7 — מעבר חלק מ-Dm.' },
      { icon: '🏠', title: 'חזרה', detail: '2 תיבות Dm — שימו לב ל-C# באקורד A7.' },
      { icon: '🔁', title: '8 סיבובים', detail: '60 BPM, ללא עצירה.' },
    ],
    check: 'מעבר Dm↔A7 חלק ב-70 BPM',
    playMode: 'chords',
  },
  'dc-minore-2': {
    phraseFrets: [5, 7, 8, 7, 5, 3, 2, 0],
    visual: 'phrase-d',
    bpmStart: 55,
    caption: 'מנגינת מינורה טו טקה — אייקון הרבטיקו.',
    steps: [
      { icon: '🎵', title: 'למדו', detail: 'מסריג 5: 5-7-8-7-5-3-2-0 — איטי.' },
      { icon: '📚', title: 'שיר', detail: 'חפשו "מינורה טו טקה" בספריית השירים.' },
      { icon: '🔁', title: 'חזרה', detail: 'עד שהמנגינה "יושבת".' },
      { icon: '🎤', title: 'שירו', detail: 'שירו את המספרים תוך כדי נגינה.' },
    ],
    check: 'מנגינת מינורה טו טקה שלמה מ-5 עד 0',
    playMode: 'phrase',
    songId: 'minore-tou-teke',
  },

  'dc-kiourdi-0': {
    frets: DROMOS_SCALE_FRETS.kiourdi,
    visual: 'scale-d',
    bpmStart: 80,
    strokes: ['D', 'u', 'd', 'u'],
    caption: 'קיורדי = מינור עם ♮6 (סריג 9 = סי) — קליל וזורם.',
    steps: [
      { icon: '🌊', title: 'סולם', detail: '0-2-3-5-7-9-10-12 — 80 BPM.' },
      { icon: '👂', title: '♮6', detail: 'סריג 9 (סי) — לא 8 (לה♭). זה ההבדל מאוסאק.' },
      { icon: '⚡', title: 'זריזות', detail: 'שמיניות ↓↑ — אל תיתקעו על תו.' },
      { icon: '🔁', title: '5 סיבובים', detail: 'עלייה וירידה.' },
    ],
    check: 'סריג 9 נשמע "בהיר" — לא מינור כבד',
    playMode: 'scale',
  },
  'dc-kiourdi-1': {
    frets: DROMOS_SCALE_FRETS.kiourdi,
    visual: 'scale-d',
    bpmStart: 100,
    strokes: ['D', 'u', 'd', 'u', 'D', 'u', 'd', 'u'],
    caption: 'אלתור מהיר לציפטטלי — 4/4, שמיניות.',
    steps: [
      { icon: '⚡', title: '100 BPM', detail: 'סולם מלא ↑↓ — שמיניות רציפות.' },
      { icon: '3️⃣', title: 'טריולים', detail: 'על כל תו שני: ↓↑↓ (מסלול פנייה pc-6).' },
      { icon: '📈', title: 'הדרגה', detail: '80→90→100 — רק כשנקי.' },
      { icon: '🔁', title: '2 דקות', detail: 'בלי הפסקה ארוכה.' },
    ],
    check: 'סולם מלא ב-100 BPM עם טריולים על תווים זוגיים',
    playMode: 'scale',
    peniaStage: 'pc-6',
  },
  'dc-kiourdi-2': {
    frets: DROMOS_SCALE_FRETS.kiourdi,
    altFrets: DROMOS_SCALE_FRETS.ousak,
    visual: 'compare',
    bpmStart: 60,
    caption: 'קיורדי (♮6) מול אוסאק (♭6) — אותם אקורדים, צבע שונה.',
    steps: [
      { icon: '🌊', title: 'קיורדי', detail: '4 תיבות סולם קיורדי — 60 BPM.' },
      { icon: '💙', title: 'אוסאק', detail: '4 תיבות סולם אוסאק — אותו קצב.' },
      { icon: '👂', title: 'השוואה', detail: 'שימו לב: סריג 9 מול 8 — ההבדל העדין.' },
      { icon: '🔁', title: '4 סיבובים', detail: 'החלפה קיורדי↔אוסאק.' },
    ],
    check: 'מזהים באוזן איזה סולם מנגנים בלי להסתכל',
    playMode: 'compare',
  },

  'dc-niavent-0': {
    frets: DROMOS_SCALE_FRETS.niavent,
    visual: 'scale-d',
    bpmStart: 45,
    caption: 'ניאוונט — שני מרווחים מוגדלים. למדו לאט מאוד.',
    steps: [
      { icon: '🐢', title: 'איטי', detail: '0-2-3-6-7-8-11-12 — 45 BPM, תו-תו.' },
      { icon: '⚡', title: 'קפיצות', detail: '3→6 (מי♭→פה#) ו-8→11 (לה♭→דו#) — הדגישו.' },
      { icon: '🔁', title: '20 פעמים', detail: 'רק עלייה, לפני שמאיצים.' },
      { icon: '✋', title: 'עצור', detail: 'אם היד מתחככת — חזרה ל-40 BPM.' },
    ],
    check: 'עליתם ל-12 בלי לדלג על סריג 6 או 11',
    playMode: 'scale',
  },
  'dc-niavent-1': {
    phraseFrets: [1, 4, 5, 4, 1, 0],
    visual: 'phrase-d',
    bpmStart: 50,
    caption: 'תרגול המרווח המוגדל: מי♭→פה# (1→4) עם עצירה.',
    steps: [
      { icon: '⚡', title: 'קפיצה', detail: '1→4 — עצירה על 4 לשנייה.' },
      { icon: '↩', title: 'חזרה', detail: '4→1→0 — ירידה רכה.' },
      { icon: '🔁', title: '15 פעמים', detail: 'רק המוטיב הזה.' },
      { icon: '🎶', title: 'הרחבה', detail: 'הוסיפו 5-7-8 לפני הירידה.' },
    ],
    check: 'קפיצה 1→4 זורמת בלי "מחפש" את הסריג',
    playMode: 'phrase',
  },
  'dc-niavent-2': {
    phraseFrets: [0, 2, 3, 6, 8, 11, 12, 11, 8, 6, 3, 2, 0],
    visual: 'taximi',
    bpmStart: 50,
    caption: 'טקסימי דרמטי — עלייה, שקט, ירידה.',
    steps: [
      { icon: '🎭', title: 'דרמה', detail: 'עלייה לאט עד 12 — עצירה.' },
      { icon: '⏸', title: 'שקט', detail: '2 שניות שקט — חשוב כמו הנגינה.' },
      { icon: '↓', title: 'ירידה', detail: 'ירידה איטית — תנו למרווחים "לנחות".' },
      { icon: '⏱', title: '2 דקות', detail: 'טקסימי חופשי עם מבנה עלייה→שקט→ירידה.' },
    ],
    check: 'יש רגעי שקט מכוונים — לא ממלאים כל הזמן',
    playMode: 'phrase',
  },
};

const DromosVisuals = (() => {
  const D_OPEN = 62;

  function getPractical(dcId, stageIdx) {
    return DROMOS_PRACTICAL[`${dcId}-${stageIdx}`] || null;
  }

  function getScaleFrets(dromosId) {
    return DROMOS_SCALE_FRETS[dromosId] || [0, 2, 4, 5, 7, 9, 10, 12];
  }

  function mountFretboard(container, frets, opts = {}) {
    if (!container) return null;
    const phraseFrets = opts.numbered ? frets : undefined;
    const scaleFrets = opts.scaleFrets || frets;
    if (!phraseFrets && typeof FretboardScale !== 'undefined' && FretboardScale.mountDromosScalePanel) {
      const dr = opts.dromosId && typeof DROMOI !== 'undefined'
        ? DROMOI.find(d => d.id === opts.dromosId) : null;
      const panelOpts = dr?.intervals
        ? { intervals: dr.intervals, rootPc: opts.rootPc ?? 2 }
        : { frets: scaleFrets, rootPc: opts.rootPc ?? 2 };
      return FretboardScale.mountDromosScalePanel(container, panelOpts)?.getSvg() ?? null;
    }
    if (typeof FretboardScale !== 'undefined') {
      return FretboardScale.mount(container, {
        frets: scaleFrets,
        phraseFrets,
        activeCi: opts.activeFret != null ? 0 : undefined,
        activeFret: opts.activeFret,
        pathLabels: !!opts.numbered || opts.pathLabels,
        base: opts.base ?? 0,
        drawPath: opts.drawPath !== false,
      });
    }
    if (typeof drawFretboard !== 'function') return null;
    container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('fretboard', 'dpc-fretboard');
    container.appendChild(svg);
    const set = new Set(frets);
    drawFretboard(svg, (ci, f, midi) => {
      const pc = midi % 12;
      if (!set.has(pc) && !set.has(f)) return null;
      return { type: f === 0 ? 'root' : 'note', label: String(f) };
    });
    return svg;
  }

  function mountChordBoard(container, chordName) {
    if (!container || typeof drawFretboard !== 'function' || typeof CHORDS === 'undefined') return;
    container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('fretboard', 'dpc-fretboard');
    container.appendChild(svg);
    const key = (typeof ChordTooltip !== 'undefined') ? ChordTooltip.resolveKey(chordName) : chordName;
    const ch = CHORDS[key];
    if (!ch) return svg;
    drawFretboard(svg, (ci, f) => {
      const shapeIdx = 3 - ci;
      const sf = ch.shape[shapeIdx];
      if (sf === 'x' || Number(sf) !== f) return null;
      return { type: f === 0 ? 'root' : 'note', label: String(f) };
    });
    return svg;
  }

  function renderFretStrip(container, frets, color = '#e3b341') {
    if (!container) return;
    const w = Math.max(200, frets.length * 34 + 24);
    const cells = frets.map((f, i) => {
      const x = 20 + i * 34;
      return `<circle cx="${x}" cy="24" r="11" fill="${color}22" stroke="${color}"/><text x="${x}" y="28" text-anchor="middle" fill="${color}" font-size="11" font-weight="700" font-family="Heebo">${f}</text>`;
    }).join('');
    container.innerHTML = `<svg viewBox="0 0 ${w} 48" class="dpc-fret-strip" dir="ltr">
      <line x1="8" y1="24" x2="${w - 8}" y2="24" stroke="var(--line,#444)" stroke-width="2"/>
      <text x="6" y="28" fill="var(--text-dim)" font-size="9" font-family="Heebo">D</text>${cells}</svg>`;
  }

  function playFrets(frets, gap = 320, onStep) {
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    frets.forEach((f, i) => {
      setTimeout(() => {
        AudioEngine.pluckMidi(D_OPEN + f, AudioEngine.ctx.currentTime + 0.02, 0.52);
        if (typeof onStep === 'function') onStep(f, i);
        if (typeof flashDot === 'function') {
          const svg = onStep?.svg;
          if (svg) flashDot(svg, 0, f);
        }
      }, i * gap);
    });
  }

  function playScaleAnimated(container, frets, gap = 300, opts = {}) {
    const rootPc = opts.rootPc ?? 2;
    const dr = opts.dromosId && typeof DROMOI !== 'undefined'
      ? DROMOI.find(d => d.id === opts.dromosId) : null;
    const ivs = dr?.intervals
      || (typeof FretboardScale !== 'undefined' ? FretboardScale.fretsOnDToIntervals(frets) : []);

    if (typeof AudioEngine !== 'undefined' && AudioEngine.playModeScale && ivs.length) {
      AudioEngine.stopModeScale();
      let posBase = opts.posBase ?? 0;
      let stringMode = opts.stringMode ?? 4;
      const panelState = container?._fsPanel?.getState?.();
      if (panelState) {
        posBase = panelState.posBase;
        stringMode = panelState.stringMode;
      }
      const panel = typeof FretboardScale !== 'undefined' && FretboardScale.mountDromosScalePanel
        ? FretboardScale.mountDromosScalePanel(container, dr?.intervals
          ? { intervals: dr.intervals, rootPc }
          : { frets, rootPc })
        : null;
      if (panel) container._fsPanel = panel;
      AudioEngine.playModeScale(ivs, rootPc, {
        gapMs: gap,
        gain: 0.52,
        posBase,
        stringMode,
        onStep(fret, i, p) {
          const svg = container?.querySelector('svg');
          if (p && svg && typeof FretboardScale !== 'undefined') FretboardScale.flashMidi(svg, p.midi);
          else if (svg && typeof flashDot === 'function') flashDot(svg, 0, fret);
        },
      });
      return;
    }

    const seq = [...frets, ...[...frets].reverse().slice(1)];
    seq.forEach((f, i) => {
      setTimeout(() => {
        if (typeof AudioEngine !== 'undefined') {
          AudioEngine.ensureCtx();
          AudioEngine.pluckMidi(D_OPEN + f, AudioEngine.ctx.currentTime + 0.02, 0.52);
        }
        const svg = mountFretboard(container, frets, { activeFret: f });
        if (svg && typeof FretboardScale !== 'undefined') {
          FretboardScale.flashMidi(svg, D_OPEN + f);
        } else if (svg && typeof flashDot === 'function') flashDot(svg, 0, f);
      }, i * gap);
    });
    setTimeout(() => mountFretboard(container, frets), seq.length * gap + 100);
  }

  function playPhraseAnimated(container, frets, scaleFrets, gap = 320) {
    if (typeof scaleFrets === 'number') {
      gap = scaleFrets;
      scaleFrets = undefined;
    }
    frets.forEach((f, i) => {
      setTimeout(() => {
        if (typeof AudioEngine !== 'undefined') {
          AudioEngine.ensureCtx();
          AudioEngine.pluckMidi(D_OPEN + f, AudioEngine.ctx.currentTime + 0.02, 0.52);
        }
        const svg = mountFretboard(container, frets, { numbered: true, activeFret: f, scaleFrets });
        if (svg && typeof FretboardScale !== 'undefined') {
          FretboardScale.flashMidi(svg, D_OPEN + f);
        } else if (svg && typeof flashDot === 'function') flashDot(svg, 0, f);
      }, i * gap);
    });
    setTimeout(() => mountFretboard(container, frets, { numbered: true, scaleFrets }), frets.length * gap + 100);
  }

  function mountIllustration(container, kind, color = '#e3b341') {
    if (!container) return;
    if (kind === 'syrtos' && typeof PeniaVisuals !== 'undefined') {
      PeniaVisuals.mountIllustration(container, 'syrtos-strip');
      return;
    }
    container.innerHTML = '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 300 80');
    svg.classList.add('dpc-illus');
    container.appendChild(svg);

    if (kind === 'scale-d' || kind === 'phrase-d') {
      const frets = kind === 'scale-d' ? [0, 2, 4, 5, 7, 9, 10, 12] : [0, 1, 4, 5, 4, 1, 0];
      frets.forEach((f, i) => {
        const x = 24 + i * 34;
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', x);
        c.setAttribute('cy', 40);
        c.setAttribute('r', 10);
        c.setAttribute('fill', color + '33');
        c.setAttribute('stroke', color);
        svg.appendChild(c);
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', x);
        t.setAttribute('y', 44);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('fill', color);
        t.setAttribute('font-size', '11');
        t.setAttribute('font-weight', '700');
        t.setAttribute('font-family', 'Heebo');
        t.textContent = f;
        svg.appendChild(t);
      });
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', 12);
      line.setAttribute('y1', 40);
      line.setAttribute('x2', 288);
      line.setAttribute('y2', 40);
      line.setAttribute('stroke', '#8a8378');
      line.setAttribute('stroke-width', 2);
      svg.insertBefore(line, svg.firstChild);
      const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      lbl.setAttribute('x', 150);
      lbl.setAttribute('y', 14);
      lbl.setAttribute('text-anchor', 'middle');
      lbl.setAttribute('fill', color);
      lbl.setAttribute('font-size', '11');
      lbl.setAttribute('font-weight', '700');
      lbl.setAttribute('font-family', 'Heebo');
      lbl.textContent = kind === 'scale-d' ? 'סולם על מיתר D' : 'פראזה על מיתר D';
      svg.appendChild(lbl);
    }

    if (kind === 'chords-dm') {
      ['Dm', 'A7', 'Dm'].forEach((ch, i) => {
        const x = 50 + i * 100;
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', x);
        r.setAttribute('y', 22);
        r.setAttribute('width', 70);
        r.setAttribute('height', 40);
        r.setAttribute('rx', 8);
        r.setAttribute('fill', color + '22');
        r.setAttribute('stroke', color);
        svg.appendChild(r);
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', x + 35);
        t.setAttribute('y', 48);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('fill', color);
        t.setAttribute('font-size', '16');
        t.setAttribute('font-weight', '800');
        t.setAttribute('font-family', 'Heebo');
        t.textContent = ch;
        svg.appendChild(t);
      });
    }

    if (kind === 'sigh') {
      [1, 0].forEach((f, i) => {
        const x = 100 + i * 60;
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', x);
        c.setAttribute('cy', 40);
        c.setAttribute('r', 14);
        c.setAttribute('fill', i === 1 ? color : '#7b9ee033');
        c.setAttribute('stroke', color);
        svg.appendChild(c);
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', x);
        t.setAttribute('y', 45);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('fill', i === 1 ? '#1a1408' : color);
        t.setAttribute('font-size', '14');
        t.setAttribute('font-weight', '800');
        t.setAttribute('font-family', 'Heebo');
        t.textContent = f;
        svg.appendChild(t);
      });
      const arr = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      arr.setAttribute('x', 150);
      arr.setAttribute('y', 70);
      arr.setAttribute('text-anchor', 'middle');
      arr.setAttribute('fill', '#8fa6bc');
      arr.setAttribute('font-size', '10');
      arr.setAttribute('font-family', 'Heebo');
      arr.textContent = '♭2 → 1 אנחה';
      svg.appendChild(arr);
    }

    if (kind === 'compare') {
      ['קיורדי ♮6', 'אוסאק ♭6'].forEach((lbl, i) => {
        const x = 40 + i * 140;
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', x);
        r.setAttribute('y', 20);
        r.setAttribute('width', 120);
        r.setAttribute('height', 44);
        r.setAttribute('rx', 8);
        r.setAttribute('fill', i === 0 ? '#4fb3d922' : '#7b9ee022');
        r.setAttribute('stroke', i === 0 ? '#4fb3d9' : '#7b9ee0');
        svg.appendChild(r);
        const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        t.setAttribute('x', x + 60);
        t.setAttribute('y', 48);
        t.setAttribute('text-anchor', 'middle');
        t.setAttribute('fill', '#eee');
        t.setAttribute('font-size', '12');
        t.setAttribute('font-weight', '700');
        t.setAttribute('font-family', 'Heebo');
        t.textContent = lbl;
        svg.appendChild(t);
      });
    }

    if (kind === 'taximi') {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M20 60 Q60 58 90 40 Q120 22 150 20 Q190 18 220 35 Q250 52 280 58');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', 2.5);
      svg.appendChild(path);
      [[90, 40], [150, 20], [220, 35]].forEach(([x, y]) => {
        const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        c.setAttribute('cx', x);
        c.setAttribute('cy', y);
        c.setAttribute('r', 5);
        c.setAttribute('fill', '#4fb3d9');
        svg.appendChild(c);
      });
    }
  }

  function renderStrokeStrip(container, strokes) {
    if (typeof PeniaVisuals !== 'undefined') {
      PeniaVisuals.renderStrokeStrip(container, strokes);
      return;
    }
    if (!container || !strokes) return;
    container.innerHTML = strokes.map(s => {
      const down = s === 'D' || s === 'd';
      const rest = s === '-';
      return `<span class="ppc-stroke ${rest ? 'rest' : down ? 'down' : 'up'}">${rest ? '·' : down ? '↓' : '↑'}</span>`;
    }).join('');
  }

  return {
    getPractical, getScaleFrets, mountFretboard, mountChordBoard,
    renderFretStrip, playFrets, playScaleAnimated, playPhraseAnimated,
    mountIllustration, renderStrokeStrip, DROMOS_SCALE_FRETS,
  };
})();
