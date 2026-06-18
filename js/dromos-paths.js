/* ============================================================
   נתיבי לימוד לפי דרומוס — מודוס → פריטה → אקורדים → שיר
   דגש על ζεϊμπέκικο (9/4) כנתיב מרכזי
   ============================================================ */
'use strict';

const DROMOS_PATHS = [
  {
    id: 'zeibekiko',
    featured: true,
    badge: '⭐ מומלץ',
    titleHe: 'נתיב ζεϊμπέκικο',
    titleGr: 'Ζεϊμπέκικο',
    rhythmId: 'zeibekiko',
    dromosIds: ['minore', 'hitzazkiar'],
    intro: '9/4 — המסלול המלא: ספירת מקצב → פנייה → מינורה → אקורדים → שירים מ-YouTube. כל שיר ζεϊμπέκικו נשען על מודוס (בדרך כלל מינורה), פריטה איטית ושקטים.',
    steps: [
      {
        kind: 'theory',
        title: 'מה זה ζεϊμπέκικο?',
        body: 'מקצב 9/4 בחלוקה 2+2+2+3. ריקוד בודד, אלתור אישי. הבוזוקי לא "ממלא" — הוא מדבר בין הפעמות. ספרו בקול: 1-2 / 3-4 / 5-6 / 7-8-9.',
      },
      {
        kind: 'rhythm',
        rhythmId: 'zeibekiko',
        title: 'שלב 1 — מקצב 9/4',
      },
      {
        kind: 'exercises',
        title: 'שלב 2 — ספירה וליווי',
        exerciseIds: ['zb1', 'zb3', 'zb5'],
      },
      {
        kind: 'dromos',
        dromosId: 'minore',
        exerciseId: 'dr2',
        title: 'שלב 3 — מודוס מינורה',
      },
      {
        kind: 'exercises',
        title: 'שלב 4 — טקסימי איטי',
        exerciseIds: ['zb2', 'zb4', 'zb6'],
      },
      {
        kind: 'chords',
        exerciseId: 'ch6',
        title: 'שלב 5 — אקורדי מינורה (Dm–Gm–A7)',
      },
      {
        kind: 'songs',
        title: 'שלב 6 — למד מהשיר (YouTube)',
        songIds: [
          'zeibekiko-tis-evdokias',
          'minore-tou-teke',
          'to-mystiko-zeibekiko',
          'minore-tis-avgis',
        ],
      },
    ],
  },
  {
    id: 'minore',
    titleHe: 'נתיב מינורה',
    titleGr: 'Μινόρε',
    rhythmId: 'hasapiko',
    dromosIds: ['minore'],
    intro: 'הדרומוס המזוהה ביותר עם הרבטיקו. מלודיה מינורית עם ♭6 ו-7 מוגבה — הבסיס לרוב שירי הלאיקו והζεϊμπέκικο.',
    steps: [
      { kind: 'dromos', dromosId: 'minore', exerciseId: 'dr2', title: 'סולם ופתיחת "Μινόρε του Τεκέ"' },
      { kind: 'exercises', title: 'פנייה על מינורה', exerciseIds: ['s2', 'tr1'] },
      { kind: 'chords', exerciseId: 'ch6', title: 'סבב Dm–Gm–A7–Dm' },
      { kind: 'chords', exerciseId: 'ch10', title: 'קדנצה מתוחכמת Em7♭5' },
      { kind: 'rhythm', rhythmId: 'hasapiko', title: 'מקצב חסאפיקו 4/4' },
      {
        kind: 'songs',
        title: 'שירים ללימוד',
        songIds: ['minore-tou-teke', 'frangosyriani', 'o-xenos'],
      },
    ],
  },
  {
    id: 'hitzaz',
    titleHe: 'נתיב חיג׳אז',
    titleGr: 'Χιτζάζ',
    rhythmId: 'tsifteteli',
    dromosIds: ['hitzaz'],
    intro: 'הצליל המזרחי הקלאסי — ♭2→3, קדנצה 4→3→♭2→1. טקסימי, מיסירלו, ואלתורים מזרחיים.',
    steps: [
      { kind: 'dromos', dromosId: 'hitzaz', exerciseId: 'dr1', title: 'קדנצת חיג׳אז' },
      { kind: 'exercises', title: 'טקסימי', exerciseIds: ['tr2', 'tr3'] },
      { kind: 'chords', exerciseId: 'ch7', title: 'D–E♭–D הרמוניה' },
      { kind: 'rhythm', rhythmId: 'tsifteteli', title: 'ציפטטלי לאלתור' },
      { kind: 'songs', title: 'שירים', songIds: ['misirlou', 'ti-se-melei-esenane'] },
    ],
  },
  {
    id: 'ousak',
    titleHe: 'נתיב אוסאκ',
    titleGr: 'Ουσάκ',
    rhythmId: 'zeibekiko',
    dromosIds: ['ousak'],
    intro: 'פריגי מזרחי — ♭2 צמוד לטוניקה. שירי כאב וζεϊμπέκικα עמוקים.',
    steps: [
      { kind: 'dromos', dromosId: 'ousak', exerciseId: 'dr3', title: '♭2→1 — האנחה' },
      { kind: 'chords', exerciseId: 'ch6', title: 'ליווי Dm' },
      { kind: 'exercises', title: 'ζεϊμπέκικο באוסאκ', exerciseIds: ['zb2', 'zb4'] },
      { kind: 'songs', title: 'שירים', songIds: ['apopse-tha-pio', 'palios-stratiotis'] },
    ],
  },
  {
    id: 'sabah',
    titleHe: 'נתיב סבאח',
    titleGr: 'Σαμπάχ',
    rhythmId: 'zeibekiko',
    dromosIds: ['sabah'],
    intro: 'הדרומוס השבור — ♭4 יוצר צליל ייחודי. איטי, כואב, דורש נשימה בין צלילים.',
    steps: [
      { kind: 'dromos', dromosId: 'sabah', exerciseId: 'dr4', title: '1-2-♭3-♭4' },
      { kind: 'chords', exerciseId: 'ch9', title: 'Dm–Gm6' },
      { kind: 'exercises', title: 'טקסימי איטי', exerciseIds: ['zb2'] },
    ],
  },
  {
    id: 'rast',
    titleHe: 'נתיב ראסט',
    titleGr: 'Ραστ',
    rhythmId: 'hasapiko',
    dromosIds: ['rast'],
    intro: 'מאיר ויציב — חסאפיקו, טברנה, שמחה מאופקת. ♭7 מול 7 בעלייה.',
    steps: [
      { kind: 'dromos', dromosId: 'rast', exerciseId: 'dr6', title: 'עלייה עם מוליך' },
      { kind: 'rhythm', rhythmId: 'hasapiko', title: 'חסאפיקו' },
      { kind: 'chords', exerciseId: 'ch12', title: 'סיומי Dmaj7' },
      { kind: 'songs', title: 'שירים', songIds: ['hasapiko-andreiomeno', 'i-geitonia-mas'] },
    ],
  },
  {
    id: 'hitzazkiar',
    titleHe: 'נתיב חיג׳אזκיאר',
    titleGr: 'Χιτζασκιάρ',
    rhythmId: 'zeibekiko',
    dromosIds: ['hitzazkiar'],
    intro: 'חיג׳אז כבד — שני מוליכים. הלב של ζεϊμπέκικα דרמטיים.',
    steps: [
      { kind: 'dromos', dromosId: 'hitzazkiar', exerciseId: 'dr7', title: 'עלייה דרמטית' },
      { kind: 'exercises', title: 'ζεϊμπέκικο', exerciseIds: ['zb4', 'zb6'] },
      { kind: 'chords', exerciseId: 'ch7', title: 'צבעי דומיננטה' },
    ],
  },
  {
    id: 'pireotikos',
    titleHe: 'נתיב פיראוטיקוס',
    titleGr: 'Πειραιώτικος',
    rhythmId: 'hasaposerviko',
    dromosIds: ['pireotikos'],
    intro: 'חיג׳אז עם ♯4 — צליל פיראוס. מהיר, גאה, שכונתי.',
    steps: [
      { kind: 'dromos', dromosId: 'pireotikos', exerciseId: 'dr5', title: '♭3→♯4→5' },
      { kind: 'rhythm', rhythmId: 'hasaposerviko', title: 'חסאποσέρβικο מהיר' },
      { kind: 'exercises', title: 'מהירות פנייה', exerciseIds: ['cr3', 'tr4'] },
    ],
  },
];

/** מיפוי שם דרומוס משיר → id ב-DROMOI */
function dromosNameToId(name) {
  if (!name) return null;
  const n = String(name).toLowerCase().replace(/\s+/g, '');
  const map = {
    minore: 'minore', hitzaz: 'hitzaz', hijaz: 'hitzaz', hitzazkiar: 'hitzazkiar',
    ousak: 'ousak', usak: 'ousak', sabah: 'sabah', rast: 'rast', pireotikos: 'pireotikos',
    niavent: 'niavent', karsilamas: 'karsilamas', houzam: 'houzam', karcigar: 'karcigar',
  };
  return map[n] || DROMOI.find(d =>
    d.nameEn.toLowerCase() === n || d.nameGr.toLowerCase() === n || d.id === n
  )?.id || null;
}

function findPathForDromos(dromosId) {
  return DROMOS_PATHS.find(p => p.dromosIds.includes(dromosId))
    || DROMOS_PATHS.find(p => p.id === dromosId);
}

function findPathForSong(song) {
  const style = (song.style || '').toLowerCase();
  if (style === 'zeibekiko') return DROMOS_PATHS.find(p => p.id === 'zeibekiko');
  const dr = dromosNameToId(song.dromos);
  return dr ? findPathForDromos(dr) : null;
}

function getExerciseById(exId) {
  for (const cat of EXERCISES) {
    const item = cat.items.find(x => x.id === exId);
    if (item) return { cat, item };
  }
  return null;
}

function getRhythmById(rhythmId) {
  return RHYTHMS.find(r => r.id === rhythmId);
}
