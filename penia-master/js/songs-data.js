/* שירים יווניים — ליווי אקורדים (בסיס למצב שיר) */
const SONG_LEVELS = [
  {
    id: 's1', num: 13, name: 'זאימבקיקו — D Eb Dm', subtitle: 'שיר יווני · איטי',
    icon: '🎵', bpm: 66, unlock: 12, gameType: 'chord', song: true,
    chordSeq: ['D', 'Eb', 'Dm', 'D', 'Gm', 'A7', 'D', 'D'],
    teach: 'זאימבקיקו קלאסי — 9/4 איטי. האקורדים זורמים כמו בשיר אמיתי.',
    tip: 'פריטה ↓ על כל אקורד — אל תמהרו, שמרו על רגש.',
  },
  {
    id: 's2', num: 14, name: 'חסאפικו — 4 הברזל', subtitle: 'שיר יווני · בינוני',
    icon: '🎵', bpm: 80, unlock: 13, gameType: 'chord', song: true,
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'D', 'Eb', 'Dm', 'Gm', 'A7', 'D'],
    teach: 'קצב חסאפיקו — ליווי טיפוסי של טברנה יוונית.',
    tip: 'Gm עמוק, A7 מוביל חזרה — כמו בליווי חי.',
  },
  {
    id: 's3', num: 15, name: 'רבטיקו — סיבוב מלא', subtitle: 'שיר יווני · מאסטר',
    icon: '🎵', bpm: 72, unlock: 14, gameType: 'chord', song: true,
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em', 'D', 'Gm', 'A7', 'D'],
    teach: 'ליווי רבטיקו מלא — כמו לנגן עם הלהקה.',
    tip: 'זה המטרה: ליווי שיר שלם על בוזוקי אמיתי!',
  },
];

/* שלבים נוספים למודוסים */
const MODE_EXTRA = [
  {
    id: 'm13', num: 13, name: 'חיג׳אז — 4 צלילים', subtitle: 'תרגול ממוקד',
    icon: '♪', bpm: 52, unlock: 12, gameType: 'note', dromos: 'חיג׳אז',
    notes: [dNote(0,'רה'), dNote(1,'מי♭'), dNote(4,'פה#'), dNote(5,'סול'), dNote(4,'פה#'), dNote(1,'מי♭'), dNote(0,'רה')],
    teach: '4 צלילי הלב של חיג׳אז — רה מי♭ פה# סול — חזרה.',
    tip: 'שלטו ב-4 האלה לפני הסולם המלא.',
  },
  {
    id: 'm14', num: 14, name: 'סבאח — 4 ראשונים', subtitle: 'הצליל השבור',
    icon: '♪', bpm: 48, unlock: 13, gameType: 'note', dromos: 'סבאח',
    notes: [dNote(0,'רה'), dNote(2,'מי'), dNote(3,'פה'), dNote(4,'פה#'), dNote(3,'פה'), dNote(2,'מי'), dNote(0,'רה')],
    teach: 'ארבעת הצלילים הראשונים של סבאח — רה מי פה פה#.',
    tip: 'פה# (סריג 4) — אל תדלג עליו!',
  },
  {
    id: 'm15', num: 15, name: 'מאראתון — 3 דרומוסים', subtitle: 'מאסטר',
    icon: '12', bpm: 50, unlock: 14, gameType: 'note', dromos: 'משולב',
    notes: [
      dNote(0,'רה'), dNote(1,'מי♭'), dNote(4,'פה#'), dNote(5,'סול'),
      dNote(0,'רה'), dNote(2,'מי'), dNote(3,'פה'), dNote(5,'סול'),
      dNote(0,'רה'), dNote(2,'מי♭'), dNote(3,'פה'), dNote(5,'סול'),
    ],
    teach: 'חיג׳אז → ראסט → מינור — שלושה דרומוסים ברצף.',
    tip: 'שימו לב לשינוי צבע בין קטעים!',
  },
];

/* מיזug לרשימות הראשיות */
if (typeof MODE_LEVELS !== 'undefined') {
  MODE_LEVELS.push(...MODE_EXTRA);
}
if (typeof CHORD_FLOW_LEVELS !== 'undefined') {
  CHORD_FLOW_LEVELS.push(...SONG_LEVELS);
}
