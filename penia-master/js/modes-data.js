/* מאסטר המודוסים — דרומוסים על מיתר רה (D) */
const D_MIDI = 62;

const SOLFEGE = ['דו', 'דו#', 'רה', 'רה#', 'מי', 'פה', 'פה#', 'סול', 'סול#', 'לה', 'לה#', 'סי'];

function dNote(fret, solfege) {
  const midi = D_MIDI + fret;
  const pc = midi % 12;
  return {
    fret, midi, course: 0,
    solfege: solfege || SOLFEGE[pc],
    label: solfege || SOLFEGE[pc],
  };
}

function scaleFromFrets(entries) {
  return entries.map(([f, s]) => dNote(f, s));
}

function seqUpDown(notes) {
  return [...notes, ...[...notes].reverse().slice(1)];
}

/* סולמות על מיתר רה — פוזיציה ראשונה */
const SCALE_HIJAZ = scaleFromFrets([[0,'רה'],[1,'מי♭'],[4,'פה#'],[5,'סול'],[7,'לה'],[8,'סי♭'],[10,'דו'],[12,'רה']]);
const SCALE_RAST  = scaleFromFrets([[0,'רה'],[2,'מי'],[3,'פה'],[5,'סול'],[7,'לה'],[9,'סי'],[10,'דו'],[12,'רה']]);
const SCALE_MINORE = scaleFromFrets([[0,'רה'],[2,'מי♭'],[3,'פה'],[5,'סול'],[7,'לה'],[8,'סי♭'],[11,'דו#'],[12,'רה']]);
const SCALE_OUSAK = scaleFromFrets([[0,'רה'],[2,'מי♭'],[3,'פה'],[5,'סול'],[7,'לה'],[8,'סי♭'],[10,'דו'],[12,'רה']]);
const SCALE_SABAH = scaleFromFrets([[0,'רה'],[2,'מי'],[3,'פה'],[4,'פה#'],[7,'לה'],[8,'סי♭'],[10,'דו'],[12,'רה']]);
const SCALE_HOUZAM = scaleFromFrets([[0,'רה'],[3,'רה#'],[4,'פה#'],[5,'סול'],[7,'לה'],[9,'סי'],[11,'דו#'],[12,'רה']]);
const SCALE_KIOURDI = scaleFromFrets([[0,'רה'],[2,'מי'],[3,'פה'],[5,'סול'],[7,'לה'],[9,'סי'],[10,'דו'],[12,'רה']]);
const SCALE_NIAVENT = scaleFromFrets([[0,'רה'],[2,'מי'],[3,'פה'],[6,'סול#'],[7,'לה'],[8,'סי♭'],[11,'דו#'],[12,'רה']]);
const SCALE_HIJAZKIAR = scaleFromFrets([[0,'רה'],[1,'מי♭'],[4,'פה#'],[5,'סול'],[7,'לה'],[8,'סי♭'],[11,'דו#'],[12,'רה']]);
const SCALE_PIREOTIKOS = scaleFromFrets([[0,'רה'],[1,'מי♭'],[4,'פה#'],[6,'סול#'],[7,'לה'],[8,'סי♭'],[10,'דו'],[12,'רה']]);

const MODE_LEVELS = [
  {
    id: 'm1', num: 1, name: 'רה · מי · רה', subtitle: 'התחלה',
    icon: '♩', bpm: 55, unlock: 0, gameType: 'note',
    notes: [dNote(0,'רה'), dNote(2,'מי'), dNote(0,'רה'), dNote(2,'מי')],
    teach: 'ארבעה צלילים על מיתר רה — הכלי האמיתי, צליל אחד בכל פעם.',
    tip: 'נגנו לאט. תנו לכל צליל לצלצל לפני הבא.',
  },
  {
    id: 'm2', num: 2, name: 'חיג׳אז — עלייה', subtitle: 'הדרומוס המרכזי',
    icon: '1', bpm: 50, unlock: 1, gameType: 'note',
    notes: SCALE_HIJAZ,
    teach: 'חיג׳אז: רה → מי♭ → פה# → סול → לה → סי♭ → דו → רה.',
    tip: 'שימו לב למי♭ — הצליל המזרחי!',
  },
  {
    id: 'm3', num: 3, name: 'חיג׳אז — ירידה', subtitle: 'טקסימי',
    icon: '2', bpm: 50, unlock: 2, gameType: 'note',
    notes: [...SCALE_HIJAZ].reverse(),
    teach: 'אותו סולם, יורדים — הדרך האותנטית ללמוד דרומוס.',
    tip: 'אינטונציה נקייה בירידה — אל תמהרו.',
  },
  {
    id: 'm4', num: 4, name: 'ראסט — מלא', subtitle: 'מאקאם קלאסי',
    icon: '3', bpm: 55, unlock: 3, gameType: 'note',
    notes: seqUpDown(SCALE_RAST),
    teach: 'ראסט: רה → מי → פה → סול → לה → סי → דו → רה ובחזרה.',
    tip: 'המי (סריג 2) צמוד לרה — שמרו על מרחק אחיד.',
  },
  {
    id: 'm5', num: 5, name: 'מינור — עלייה', subtitle: 'רגש רבטיקו',
    icon: '4', bpm: 52, unlock: 4, gameType: 'note',
    notes: SCALE_MINORE,
    teach: 'מינורה: הצליל העצוב של הרבטיקו.',
    tip: 'מי♭ בין רה לפה — שימו לב לצבע.',
  },
  {
    id: 'm6', num: 6, name: 'אוסאק — מלא', subtitle: 'כאב וגעגוע',
    icon: '5', bpm: 48, unlock: 5, gameType: 'note',
    notes: seqUpDown(SCALE_OUSAK),
    teach: 'אוסאק: דרומוס פריגי — עלייה וירידה מלאה.',
    tip: 'מנוחה על סול וסי♭ — אל תמהרו.',
  },
  {
    id: 'm7', num: 7, name: 'סבאח — עלייה', subtitle: 'העצוב ביותר',
    icon: '6', bpm: 46, unlock: 6, gameType: 'note',
    notes: SCALE_SABAH,
    teach: 'סבאח: רה → מי → פה → פה# → לה — הצליל השבור של הרבטיקו.',
    tip: 'הקפידו על פה# (סריג 4) — זה הלב של סבאח.',
  },
  {
    id: 'm8', num: 8, name: 'חוזאם — עלייה', subtitle: 'מתוק-מריר',
    icon: '7', bpm: 50, unlock: 7, gameType: 'note',
    notes: SCALE_HOUZAM,
    teach: 'חוזאם: קפיצה רה → רה# → פה# — דרומוס אצילי.',
    tip: 'הטרצה הקטנה בפתיחה — הצליל המיוחד.',
  },
  {
    id: 'm9', num: 9, name: 'קיורדי — מלא', subtitle: 'ציפטטלי',
    icon: '8', bpm: 56, unlock: 8, gameType: 'note',
    notes: seqUpDown(SCALE_KIOURDI),
    teach: 'קיורדי: מינור עם סי טבעי — זורם וריקודי.',
    tip: 'מצוין לחסאפוסרביקה מהירה.',
  },
  {
    id: 'm10', num: 10, name: 'ניאוונט — עלייה', subtitle: 'וירטואוזי',
    icon: '9', bpm: 48, unlock: 9, gameType: 'note',
    notes: SCALE_NIAVENT,
    teach: 'ניאוונט: סול# (סריג 6) — המרווח המוגדל הדרמטי.',
    tip: 'מנוחה על סול# לפני פתרון ל-לה.',
  },
  {
    id: 'm11', num: 11, name: 'חיג׳אזקיאר — מלא', subtitle: 'כפול מזרחי',
    icon: '10', bpm: 46, unlock: 10, gameType: 'note',
    notes: seqUpDown(SCALE_HIJAZKIAR),
    teach: 'חיג׳אזקיאר: חיג׳אז עם דו# — דרמטי יותר.',
    tip: 'שני מרווחים מוגדלים — דיוק!',
  },
  {
    id: 'm12', num: 12, name: 'פיראוטיקוס — מאסטר', subtitle: 'פיראוס',
    icon: '11', bpm: 44, unlock: 11, gameType: 'note',
    notes: seqUpDown(SCALE_PIREOTIKOS),
    teach: 'פיראוטיקוס: חיג׳אז + סול# — הדרומוס של נמל פיראוס.',
    tip: 'סול# (סריג 6) — הצליל הייחודי ליוון.',
  },
];

function matchNote(target, freq) {
  if (!freq || !target?.midi) return false;
  const mf = 69 + 12 * Math.log2(freq / 440);
  const exp = target.midi;
  for (let o = -1; o <= 2; o++) {
    if (Math.abs(mf - (exp + o * 12)) <= 0.85) return true;
  }
  const pc = ((Math.round(mf) % 12) + 12) % 12;
  const expPc = ((exp % 12) + 12) % 12;
  return pc === expPc;
}
