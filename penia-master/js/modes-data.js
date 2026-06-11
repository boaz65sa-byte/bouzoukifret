/* מאסטר המודוסים — דרומוסים על מיתר רה (D) */
const D_MIDI = 62; /* רה פתוח — מיתר D הגבוה */

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

/* סולמות על מיתר רה — פוזיציה ראשונה */
const SCALE_HIJAZ = [[0, 'רה'], [1, 'מי♭'], [4, 'פה#'], [5, 'סול'], [7, 'לה'], [8, 'סי♭'], [10, 'דו'], [12, 'רה']].map(([f, s]) => dNote(f, s));
const SCALE_RAST = [[0, 'רה'], [2, 'מי'], [3, 'פה'], [5, 'סול'], [7, 'לה'], [9, 'סי'], [10, 'דו'], [12, 'רה']].map(([f, s]) => dNote(f, s));
const SCALE_MINORE = [[0, 'רה'], [2, 'מי♭'], [3, 'פה'], [5, 'סול'], [7, 'לה'], [8, 'סי♭'], [11, 'רה#'], [12, 'רה']].map(([f, s]) => dNote(f, s));
const SCALE_OUSAK = [[0, 'רה'], [2, 'מי♭'], [3, 'פה'], [5, 'סול'], [7, 'לה'], [8, 'סי♭'], [10, 'דו'], [12, 'רה']].map(([f, s]) => dNote(f, s));

function seqUpDown(notes) {
  return [...notes, ...[...notes].reverse().slice(1)];
}

const MODE_LEVELS = [
  {
    id: 'm1', num: 1, name: 'רה · מי · רה', subtitle: 'התחלה',
    icon: '♩', bpm: 55, unlock: 0, gameType: 'note',
    notes: [dNote(0, 'רה'), dNote(2, 'מי'), dNote(0, 'רה'), dNote(2, 'מי')],
    teach: 'שלושה צלילים על מיתר רה — הכלי האמיתי, צליל אחד בכל פעם.',
    tip: 'נגנו לאט. תנו לכל צליל לצלצל לפני הבא.',
  },
  {
    id: 'm2', num: 2, name: 'חיג׳אז — עלייה', subtitle: 'הדרומוס המרכזי',
    icon: '1', bpm: 50, unlock: 1, gameType: 'note',
    notes: SCALE_HIJAZ,
    teach: 'חיג׳אז על מיתר רה: רה → מי♭ → פה# → סול → לה → סי♭ → דו → רה.',
    tip: 'שימו לב למי♭ — הצליל המזרחי!',
  },
  {
    id: 'm3', num: 3, name: 'חיג׳אז — ירידה', subtitle: 'טקסימי',
    icon: '2', bpm: 50, unlock: 2, gameType: 'note',
    notes: [...SCALE_HIJAZ].reverse(),
    teach: 'אותו סולם, יורדים. זו הדרך האותנטית ללמוד דרומוס.',
    tip: 'אינטונציה נקייה בירידה — אל תמהרו.',
  },
  {
    id: 'm4', num: 4, name: 'ראסט — עלייה וירידה', subtitle: 'מאקאם קלאסי',
    icon: '3', bpm: 55, unlock: 3, gameType: 'note',
    notes: seqUpDown(SCALE_RAST),
    teach: 'ראסט: רה → מי → פה → סול → לה → סי → דו → רה ובחזרה.',
    tip: 'המי השני (סריג 2) צמוד לרה — שמרו על מרחק אחיד.',
  },
  {
    id: 'm5', num: 5, name: 'מינור — עלייה', subtitle: 'רגש רבטיקו',
    icon: '4', bpm: 52, unlock: 4, gameType: 'note',
    notes: SCALE_MINORE,
    teach: 'מינורה (Hitzaz Minore): הצליל העצוב של הרבטיקו.',
    tip: 'מי בemol בין רה לפה — שימו לב לצבע.',
  },
  {
    id: 'm6', num: 6, name: 'אוסאק — מלא', subtitle: 'מאסטר',
    icon: '5', bpm: 48, unlock: 5, gameType: 'note',
    notes: seqUpDown(SCALE_OUSAK),
    teach: 'אוסאק: דרומוס פופולרי בזמננו — עלייה וירידה מלאה.',
    tip: 'דיוק לפני מהירות. 48 BPM זה מקצועי!',
  },
];

function matchNote(target, freq) {
  if (!freq || !target?.midi) return false;
  const pc = Math.round(69 + 12 * Math.log2(freq / 440)) % 12;
  const exp = ((target.midi % 12) + 12) % 12;
  return ((pc % 12) + 12) % 12 === exp;
}
