/* ============================================================
   מאקאמים מערביים (ערבית/טורקית) — ללימוד לצד דרומוסים יווניים
   ============================================================ */
'use strict';

const MAQAMAT = [
  {
    id: 'maq-hijaz', family: 'maqam',
    nameHe: 'חיג׳אז', nameGr: 'Hicaz', nameAr: 'حجاز', nameEn: 'Hijaz',
    greekParallel: 'hitzaz',
    intervals: [0, 1, 4, 5, 7, 8, 10],
    degrees: '1 ♭2 3 4 5 ♭6 ♭7',
    maqam: 'מאקאם חיג׳אז — הבסיס של המוזיקה המזרחית',
    mood: 'דרמטי, מזרחי, מלא געגוע',
    desc: 'המאקאם המפורסם ביותר. המרווח המוגדל ♭2→3 הוא "הצליל המזרחי". ביוון מכונה חיצאז — אותו סולם, פרשנות רבטיקו.',
    tips: 'התחילו מ-1, מנוחה על 4, סיימו 4→3→♭2→1. השוו לדרומוס יווני חיצאז באותו לוח.',
    songs: ['טקסימי עוד קלאסיים', 'מיסירלו (חיצאז)'],
    chords: 'D, Eb, Gm, Cm',
  },
  {
    id: 'maq-bayati', family: 'maqam',
    nameHe: 'ביאתי', nameGr: 'Bayati', nameAr: 'بياتي', nameEn: 'Bayati',
    greekParallel: 'ousak',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    degrees: '1 ♭2 ♭3 4 5 ♭6 ♭7',
    maqam: 'מאקאם ביאתי — "אמא" של המאקאמים העמוקים',
    mood: 'עמוק, מתחנן, אינטימי',
    desc: 'קרוב לאוסאק היווני אך נשקל אחרת במסורת הערבית. פתיחה ב-♭2 צמודה לטוניקה. בסיס לשירי אהבה ושירי לילה.',
    tips: 'נגנו איטי. הדגישו ♭2→1. במסורת — מיקרוטונים על ה-♭2 (משיכה עדינה).',
    songs: ['שירי עוד קלאסיים', 'טקסימי לילה'],
    chords: 'Dm, Eb, Cm, Gm',
  },
  {
    id: 'maq-rast', family: 'maqam',
    nameHe: 'ראסט', nameGr: 'Rast', nameAr: 'راست', nameEn: 'Rast',
    greekParallel: 'rast',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    degrees: '1 2 3 4 5 6 ♭7',
    maqam: 'מאקאם ראסט — "אב" המאקאמים',
    mood: 'מאיר, יציב, גברי',
    desc: 'מקביל לראסט היווני. במסורת: 3 ו-7 מעט מוגבהים (מיקרוטונים). מנוחה חזקה על 5.',
    tips: 'בעלייה — נסו 7 במקום ♭7; בירידה — ♭7. זה ה"מודולציה" הקלאסית של ראסט.',
    songs: ['מוקאמס, שירי חגיגה'],
    chords: 'D, G, C, Am',
  },
  {
    id: 'maq-saba', family: 'maqam',
    nameHe: 'סבא', nameGr: 'Saba', nameAr: 'صبا', nameEn: 'Saba',
    greekParallel: 'sabah',
    intervals: [0, 2, 3, 4, 7, 8, 10],
    degrees: '1 2 ♭3 ♭4 5 ♭6 ♭7',
    maqam: 'מאקאם סבא — העצוב ביותר',
    mood: 'שבור, לילי, כואב',
    desc: 'מקביל לסבאח היווני. ה-♭4 (מי במול) יוצר צליל "שבור" ייחודי. אין אוקטבה "נקייה" — תמיד מרגיש מונמך.',
    tips: 'פראזות קצרות על 1-2-♭3-♭4. הרבה שקט. אל תמהרו.',
    songs: ['שירי אמאנדס', 'טקסימי עמוקים'],
    chords: 'Dm, Gm6, Eb',
  },
  {
    id: 'maq-nahawand', family: 'maqam',
    nameHe: 'נהאוונד', nameGr: 'Nahawand', nameAr: 'نهاوند', nameEn: 'Nahawand',
    greekParallel: 'minore',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    degrees: '1 2 ♭3 4 5 ♭6 7',
    maqam: 'מאקאם נהאוונד — המינור המזרחי',
    mood: 'מלנכולי, רומנטי, קלאסי',
    desc: 'מקביל למינורה היוונית. מינור הרמוני עם מרווח מוגדל ♭6→7. בסיס לרבעי נהאוונד בטורקיה ומצרים.',
    tips: 'השוו ל"מינורה του τεκέ" היוונית — אותו רגש, אוצר מילים שונה.',
    songs: ['סולו עוד', 'שירי רבטיקו איטיים'],
    chords: 'Dm, Gm, A7, Bb',
  },
  {
    id: 'maq-hijazkar', family: 'maqam',
    nameHe: 'חיג׳אזכאר', nameGr: 'Hicazkar', nameAr: 'حجاز كار', nameEn: 'Hijazkar',
    greekParallel: 'hitzazkiar',
    intervals: [0, 1, 4, 5, 7, 8, 11],
    degrees: '1 ♭2 3 4 5 ♭6 7',
    maqam: 'מאקאם חיג׳אזכאר — חיג׳אז כבד',
    mood: 'דרמטי, חגיגי, כבד',
    desc: 'שני מרווחים מוגדלים. מקביל לחיצאזκיאר. אופייני לזאימבέκικו כבד ולטקסימי דרמטיים.',
    tips: 'המוליך (7) מושך חזק ל-1. נצלו עליות ♭6→7→1.',
    songs: ['זאימבέκικα כבדים'],
    chords: 'D, Eb, A7b9',
  },
  {
    id: 'maq-huzzam', family: 'maqam',
    nameHe: 'הוזאם', nameGr: 'Hüzzam', nameAr: 'حزام', nameEn: 'Huzzam',
    greekParallel: 'houzam',
    intervals: [0, 3, 4, 5, 7, 9, 11],
    degrees: '1 ♯2 3 4 5 6 7',
    maqam: 'מאקאם הוזאם — מתוק ואצילי',
    mood: 'נוסטלגי, מתוק-מריר',
    desc: 'מקביל לחוזאם היווני. פתיחה בטרצה קטנה 1→♯2. אהוב אצל ציצאניס ונגני עוד.',
    tips: 'סיום קלאסי: 4→3→♯2→1. השוו לסגיאח (עם ♯4).',
    songs: ['ציצאניס', 'רפרטואר סמירנאי'],
    chords: 'D, F#m, A, Bm',
  },
  {
    id: 'maq-kurd', family: 'maqam',
    nameHe: 'כורד', nameGr: 'Kürdi', nameAr: 'كرد', nameEn: 'Kurd',
    greekParallel: 'kiourdi',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    degrees: '1 ♭2 ♭3 4 5 ♭6 ♭7',
    maqam: 'מאקאם כורד — פריגי מזרחי',
    mood: 'עצוב, פנימי',
    desc: 'ג׳ינס כורד על הטוניקה. בסיס לאוסאק/ביאתי. ביוון קשור לקיורדי ולאוסאק.',
    tips: 'חשבו "אנחה" על ♭2. מעברים לאוסאק דרך הדגשת ♭3.',
    songs: ['שירי עמק, לאיקו איטי'],
    chords: 'Dm, Eb, Cm',
  },
  {
    id: 'maq-nikriz', family: 'maqam',
    nameHe: 'ניקריז', nameGr: 'Nikriz', nameAr: 'نكريز', nameEn: 'Nikriz',
    greekParallel: 'nikriz',
    intervals: [0, 2, 3, 6, 7, 9, 10],
    degrees: '1 2 ♭3 ♯4 5 6 ♭7',
    maqam: 'מאקאם ניקריז — בלקני ונועז',
    mood: 'סוער, ריקודי',
    desc: 'מקביל לניקריז היווני. המרווח ♭3→♯4 הוא הלב. נפוץ בבלקן ובטקסימי וירטואוזיים.',
    tips: 'הדגישו ♯4. השוו לניאוונט (עם ♭6 ו-7 במקום 6 ו-♭7).',
    songs: ['קרשילמאדס', 'מוזיקה בלקנית'],
    chords: 'Dm(#11), G, C',
  },
  {
    id: 'maq-suzinak', family: 'maqam',
    nameHe: 'סוזינאק', nameGr: 'Suzinak', nameAr: 'سوزناك', nameEn: 'Suzinak',
    greekParallel: 'souzinak',
    intervals: [0, 2, 4, 5, 7, 8, 11],
    degrees: '1 2 3 4 5 ♭6 7',
    maqam: 'מאקאם סוזינאק — "מז׳ור הרמוני" מזרחי',
    mood: 'חגיגי עם הפתעה',
    desc: 'ראסט למטה + חיג׳אז למעלה. מקביל לסוזינאκ היווני. מתחיל שמח ומפתיע בחלק העליון.',
    tips: 'ניגוד בין חלק תחתון מאיר ל-♭6→7 דרמטי למעלה.',
    songs: ['סמירנה', 'לאיקו מתוחכם'],
    chords: 'D, Gm, A, Bb',
  },
  {
    id: 'maq-ajam', family: 'maqam',
    nameHe: 'עג׳ם / מהור', nameGr: 'Ajam / Mahur', nameAr: 'عجم', nameEn: 'Ajam',
    greekParallel: 'matzore',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    degrees: '1 2 3 4 5 6 7',
    maqam: 'מאקאם עג׳ם — מז׳ור מזרחי',
    mood: 'שמח, פתוח, חגיגי',
    desc: 'מקביל למאג׳ורה היוונית. סולם מז׳ור עם קישוטים מזרחיים בפנייה.',
    tips: 'אותו סולם כמו מז׳ור — ההבדל בקישוטים ובפריטה.',
    songs: ['חסאפיקה', 'סירטוס'],
    chords: 'D, G, A7, Bm',
  },
  {
    id: 'maq-karcigar', family: 'maqam',
    nameHe: 'קרג׳יגאר', nameGr: 'Karcığar', nameAr: 'كرجي عار', nameEn: 'Karcigar',
    greekParallel: 'kartzigar',
    intervals: [0, 2, 3, 5, 6, 9, 10],
    degrees: '1 2 ♭3 4 ♭5 6 ♭7',
    maqam: 'מאקאם קרג׳יגאר — כורד + חיג׳אז',
    mood: 'מריר-מתוק, מפתיע',
    desc: 'כורד למטה, חיג׳אז על 4. מקביל לקרציגאר. מעבר בין מינור למזרחי באמצע הפראזה.',
    tips: 'נקודת מנוחה על 4 (סול). מינור עד 4, ואז צבע חיג׳אז.',
    songs: ['קרסילמאדס', 'ציפטטליה'],
    chords: 'Dm, Gm/Gb, C',
  },
];

function getScalesForDromoi(filter = 'all') {
  const greek = DROMOI.map(d => ({ ...d, family: 'greek' }));
  if (filter === 'greek') return greek;
  if (filter === 'maqam') return MAQAMAT;
  return [...greek, ...MAQAMAT];
}

function findScaleById(id) {
  return DROMOI.find(d => d.id === id)
    || MAQAMAT.find(m => m.id === id)
    || null;
}

function greekParallelName(scale) {
  if (!scale?.greekParallel) return '';
  const g = DROMOI.find(d => d.id === scale.greekParallel);
  return g ? g.nameHe : '';
}
