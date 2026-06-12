/* שלבים נוספים — שירים + מודוסים מתקדמים */
const SONG_LEVELS = [
  {
    id: 's1', num: 19, name: 'זאימבקיקו — D Eb Dm', subtitle: 'שיר יווני · איטי',
    icon: '🎵', bpm: 66, unlock: 18, gameType: 'chord', song: true,
    chordSeq: ['D', 'Eb', 'Dm', 'D', 'Gm', 'A7', 'D', 'D'],
    teach: 'זאימבקיקו קלאסי — 9/4 איטי. האקורדים זורמים כמו בשיר אמיתי.',
    tip: 'פריטה ↓ על כל אקורד — אל תמהרו, שמרו על רגש.',
  },
  {
    id: 's2', num: 20, name: 'חסאפיקו — 4 הברזל', subtitle: 'שיר יווני · בינוני',
    icon: '🎵', bpm: 80, unlock: 19, gameType: 'chord', song: true,
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'D', 'Eb', 'Dm', 'Gm', 'A7', 'D'],
    teach: 'קצב חסאפיקו — ליווי טיפוסי של טברנה יוונית.',
    tip: 'Gm עמוק, A7 מוביל חזרה — כמו בליווי חי.',
  },
  {
    id: 's3', num: 21, name: 'רבטיקו — סיבוב מלא', subtitle: 'שיר יווני · מאסטר',
    icon: '🎵', bpm: 72, unlock: 20, gameType: 'chord', song: true,
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em', 'D', 'Gm', 'A7', 'D'],
    teach: 'ליווי רבטיקו מלא — כמו לנגן עם הלהקה.',
    tip: 'זה המטרה: ליווי שיר שלם על בוזוקי אמיתי!',
  },
  {
    id: 's4', num: 22, name: 'סירτός — ליווי ריקוד', subtitle: '7/8 · קבוצתי',
    icon: '🎵', bpm: 84, unlock: 21, gameType: 'chord', song: true,
    chordSeq: ['D', 'G', 'A7', 'D', 'Bm', 'G', 'A7', 'D', 'D', 'G', 'A7', 'D'],
    teach: 'סירטוס — שיר עממי יווני. ליווי D-G-A7 הקלאסי.',
    tip: 'Bm מוסיף צבע מינורי — הכינו אצבעות מראש.',
  },
  {
    id: 's5', num: 23, name: 'ציפטטלי — ליווי מזרחי', subtitle: '4/4 · ריקוד',
    icon: '🎵', bpm: 76, unlock: 22, gameType: 'chord', song: true,
    chordSeq: ['Dm', 'Gm', 'A7', 'Dm', 'D', 'Gm', 'A7', 'D', 'Dm', 'Gm', 'A7', 'Dm'],
    teach: 'ציפטטלי — מעבר בין מינור לחיג׳אז באותו שיר.',
    tip: 'החלפה Dm↔D — רק שינוי אצבע אחת בסריג 3.',
  },
  {
    id: 's6', num: 24, name: 'מינורה עמוקה', subtitle: 'רגש · איטי',
    icon: '🎵', bpm: 58, unlock: 23, gameType: 'chord', song: true,
    chordSeq: ['Dm', 'Em7b5', 'A7', 'Dm', 'Gm', 'A7', 'Dm', 'Bb', 'Gm', 'A7', 'Dm', 'Dm'],
    teach: 'ליווי מינורה דרמטי — כמו שיר עצוב קלאסי.',
    tip: 'Bb (סי♭) = הצבע הכי עמוק — אל תמהרו.',
  },
  {
    id: 's7', num: 25, name: 'חסאποσερβίκο — מהיר', subtitle: '100 BPM · ריקוד',
    icon: '🎵', bpm: 96, unlock: 24, gameType: 'chord', song: true,
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'D', 'D'],
    teach: 'חסאποσερβίκο — הטברנה במהירות מלאה!',
    tip: '96 BPM — רק אם c17 עבר בניקיון.',
  },
  {
    id: 's8', num: 26, name: 'אופα! — מדלי מאסטר', subtitle: 'שיר יווני · סיום',
    icon: '🎵', bpm: 70, unlock: 25, gameType: 'chord', song: true,
    chordSeq: ['D', 'Eb', 'Dm', 'Gm6', 'A7', 'C', 'F', 'G', 'Am', 'D7', 'Gm', 'A7', 'D', 'Dsus4', 'D', 'D'],
    teach: '16 אקורדים — סיום חגיגי כמו בטברנה אמיתית.',
    tip: 'המטרה: ליווי שלם + רגש + מהירות. Opa! 🎸',
  },
];

const MODE_EXTRA = [
  {
    id: 'm13', num: 13, name: 'חיג׳אז — 4 צלילים', subtitle: 'תרגול ממוקד',
    icon: '♪', bpm: 52, unlock: 12, gameType: 'note', dromos: 'חיג׳אז',
    notes: phrase([[0,'רה'],[1,'מי♭'],[4,'פה#'],[5,'סול'],[4,'פה#'],[1,'מי♭'],[0,'רה']]),
    teach: '4 צלילי הלב של חיג׳אז — רה מי♭ פה# סול — חזרה.',
    tip: 'שלטו ב-4 האלה לפני הסולם המלא.',
  },
  {
    id: 'm14', num: 14, name: 'סבאח — 4 ראשונים', subtitle: 'הצליל השבור',
    icon: '♪', bpm: 48, unlock: 13, gameType: 'note', dromos: 'סבאח',
    notes: phrase([[0,'רה'],[2,'מי'],[3,'פה'],[4,'פה#'],[3,'פה'],[2,'מי'],[0,'רה']]),
    teach: 'ארבעת הצלילים הראשונים של סבאח — רה מי פה פה#.',
    tip: 'פה# (סריג 4) — אל תדלג עליו!',
  },
  {
    id: 'm15', num: 15, name: 'ראסט — ירידה', subtitle: 'טקסימי',
    icon: '♪', bpm: 52, unlock: 14, gameType: 'note', dromos: 'ראסט',
    notes: [...SCALE_RAST].reverse(),
    teach: 'ראסט יורד — הדרך האותנטית לסיים טקסימי.',
    tip: 'ירידה = הזדמנות לביטוי. אל תמהרו.',
  },
  {
    id: 'm16', num: 16, name: 'מינור — מלא', subtitle: 'עלייה וירידה',
    icon: '♪', bpm: 50, unlock: 15, gameType: 'note', dromos: 'מינורה',
    notes: seqUpDown(SCALE_MINORE),
    teach: 'מינורה מלאה — עלייה וירידה. הרגש העמוק של הרבטיקו.',
    tip: 'דו# (סריג 11) — הצליל הדרמטי לפני רה.',
  },
  {
    id: 'm17', num: 17, name: 'מאג׳ורה — עלייה', subtitle: 'שמח ופתוח',
    icon: '♪', bpm: 56, unlock: 16, gameType: 'note', dromos: 'מאג׳ורה',
    notes: SCALE_MATZORE,
    teach: 'מאג׳ורה: סולם מז׳ור יווני — חסאפיקו וסירטוס.',
    tip: 'פה# (סריג 4) — לא מi♭! שימו לב להבדל מחיג׳אז.',
  },
  {
    id: 'm18', num: 18, name: 'סגיאח — עלייה', subtitle: 'אקזוטי',
    icon: '♪', bpm: 48, unlock: 17, gameType: 'note', dromos: 'סגיאח',
    notes: SCALE_SEGIAH,
    teach: 'סגיאח: רה → רה# → פה# → סול# — קרוב לחוזאם, עשיר יותר.',
    tip: 'השוו לחוזאם (m8) — מה שונה?',
  },
  {
    id: 'm19', num: 19, name: 'קרציגאר — עלייה', subtitle: 'סמירנה',
    icon: '♪', bpm: 46, unlock: 18, gameType: 'note', dromos: 'קרציגאר',
    notes: SCALE_KARTZIGAR,
    teach: 'קרציגאר: מינור למטה, חיג׳אז למעלה — שני עולמות.',
    tip: 'סול# (סריג 6) — נקודת המפנה הדרמטית.',
  },
  {
    id: 'm20', num: 20, name: 'קפיצות — טקסימי', subtitle: 'וירטואוזי',
    icon: '♪', bpm: 44, unlock: 19, gameType: 'note', dromos: 'טקסימי',
    notes: phrase([[0,'רה'],[4,'פה#'],[7,'לה'],[12,'רה'],[7,'לה'],[4,'פה#'],[0,'רה']]),
    teach: 'קפיצות רביעיות על חיג׳אז — רה → פה# → לה → רה גבוה.',
    tip: 'קפיצות = הלב של טקסימי. דיוק באינטונציה!',
  },
  {
    id: 'm21', num: 21, name: 'שלישיות חיג׳אז', subtitle: 'קישוט',
    icon: '♪', bpm: 50, unlock: 20, gameType: 'note', dromos: 'חיג׳אז',
    notes: phrase([[0,'רה'],[1,'מי♭'],[4,'פה#'],[1,'מי♭'],[0,'רה'],[5,'סול'],[4,'פה#'],[5,'סול'],[7,'לה'],[5,'סול'],[4,'פה#'],[0,'רה']]),
    teach: 'שלשות ותנועות קטנות — קישוטי חיג׳אז קלאסיים.',
    tip: 'כל שלשה = "משפט" קטן. נשמו בין קבוצות.',
  },
  {
    id: 'm22', num: 22, name: 'מאראתון — 5 דרומוסים', subtitle: 'מאסטר',
    icon: '12', bpm: 48, unlock: 21, gameType: 'note', dromos: 'משולב',
    notes: [
      ...phrase([[0,'רה'],[1,'מי♭'],[4,'פה#'],[5,'סול']]),
      ...phrase([[0,'רה'],[2,'מי'],[3,'פה'],[5,'סול']]),
      ...phrase([[0,'רה'],[2,'מי♭'],[3,'פה'],[5,'סול']]),
      ...phrase([[0,'רה'],[2,'מי'],[3,'פה'],[4,'פה#']]),
      ...phrase([[0,'רה'],[1,'מי♭'],[4,'פה#'],[0,'רה']]),
    ],
    teach: 'חיג׳אז → ראסט → מינור → סבאח → חזרה. חמישה דרומוסים!',
    tip: 'המבחן הסופי למאסטר המודוסים.',
  },
];

if (typeof MODE_LEVELS !== 'undefined') {
  MODE_LEVELS.push(...MODE_EXTRA);
}
if (typeof CHORD_FLOW_LEVELS !== 'undefined') {
  CHORD_FLOW_LEVELS.push(...SONG_LEVELS);
}
