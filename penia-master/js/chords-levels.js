/* מאסטר האקורדים — שלבי מסלול זורם */
const CHORD_FLOW_LEVELS = [
  {
    id: 'c1', num: 1, name: 'רה ↔ מי♭', subtitle: 'הברזל',
    icon: '1', bpm: 52, unlock: 0, gameType: 'chord',
    chordSeq: ['D', 'Eb', 'D', 'Eb', 'D', 'Eb', 'D', 'Eb'],
    teach: 'שני אקורדי הברזל הראשונים — החליפו בזמן כשהם מגיעים לקו.',
    tip: 'פרטו ↓ כשהאקורד מגיע לקו הזהב.',
  },
  {
    id: 'c2', num: 2, name: 'רה · רה מינור', subtitle: 'מז׳ור/מינור',
    icon: '2', bpm: 54, unlock: 1, gameType: 'chord',
    chordSeq: ['D', 'Dm', 'D', 'Dm', 'D', 'Dm', 'D', 'Dm'],
    teach: 'מעבר בין רה מז׳ור לרה מינור — הבסיס של כל ליווי.',
    tip: 'החליפו רק אצבעות שמאל — יד ימין זורמת.',
  },
  {
    id: 'c3', num: 3, name: 'סול מינור · לה7', subtitle: 'סבאח → V',
    icon: '3', bpm: 50, unlock: 2, gameType: 'chord',
    chordSeq: ['Gm', 'A7', 'Gm', 'A7', 'Gm', 'A7', 'Gm', 'A7'],
    teach: 'Gm (סבאח) ו-A7 (דומיננטה) — זוג קלאסי.',
    tip: 'Gm עמוק, A7 מוביל חזרה ל-D.',
  },
  {
    id: 'c4', num: 4, name: '4 הברזל', subtitle: 'רבעים',
    icon: '4', bpm: 56, unlock: 3, gameType: 'chord',
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'D', 'Eb', 'Dm', 'Gm'],
    teach: 'ארבעת האקורדים הראשונים ברצף — ליווי חסאפיקו.',
    tip: 'כל אקורד = פריטה אחת ↓ בזמן.',
  },
  {
    id: 'c5', num: 5, name: '6 הברזל', subtitle: 'התקדמות',
    icon: '5', bpm: 54, unlock: 4, gameType: 'chord',
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'D', 'Eb'],
    teach: 'שישה אקורדי ברזל — כמו בשיר רבטיקו אמיתי.',
    tip: 'שמרו על מיתרים מושתקים בין אקורדים.',
  },
  {
    id: 'c6', num: 6, name: '7 הברזל — מלא', subtitle: 'הקדוש',
    icon: '6', bpm: 48, unlock: 5, gameType: 'chord',
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em', 'D'],
    teach: 'כל שבעת אקורדי הברזל — סיבוב שלם.',
    tip: 'זה הליווי שכל נגן בוזוקי חייב לדעת.',
  },
  {
    id: 'c7', num: 7, name: '7 הברזל ×2', subtitle: 'מהיר',
    icon: '7', bpm: 58, unlock: 6, gameType: 'chord',
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em', 'D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em', 'D'],
    teach: 'פעמיים ברצף — מהירות עם דיוק.',
    tip: '58 BPM — רק אם כל האקורדים נקיים!',
  },
  {
    id: 'c8', num: 8, name: 'רה7 → סול → סול מ', subtitle: 'מעברים',
    icon: '8', bpm: 52, unlock: 7, gameType: 'chord',
    chordSeq: ['D', 'D7', 'G', 'Gm', 'D', 'D7', 'G', 'Gm'],
    teach: 'D7 מוביל ל-G — מעבר דומיננטי קלאסי.',
    tip: 'D7 = רק שינוי אצבע אחת מ-D.',
  },
  {
    id: 'c9', num: 9, name: 'Am · F · C · G', subtitle: 'ליווי מערבי',
    icon: '9', bpm: 54, unlock: 8, gameType: 'chord',
    chordSeq: ['Am', 'F', 'C', 'G', 'Am', 'F', 'C', 'G'],
    teach: 'ארבעה אקורדים שמופיעים בכל שיר — תרגול חשוב.',
    tip: 'Am ו-F — שתי הפוזיציות הראשונות ללמוד.',
  },
  {
    id: 'c10', num: 10, name: 'סבאח · ג׳אז', subtitle: 'צבעים',
    icon: '10', bpm: 50, unlock: 9, gameType: 'chord',
    chordSeq: ['Dm', 'Gm6', 'A7', 'D', 'Dm7', 'Gm', 'A7', 'D'],
    teach: 'Gm6 לאקורד סבאח + Dm7 לליווי מודרני.',
    tip: 'Gm6 — האקורד הכי "יווני" אחרי Gm.',
  },
  {
    id: 'c11', num: 11, name: 'מינורה — מלא', subtitle: 'דרמטי',
    icon: '11', bpm: 48, unlock: 10, gameType: 'chord',
    chordSeq: ['Dm', 'Em7b5', 'A7', 'Dm', 'Gm', 'A7', 'Dm', 'Dm'],
    teach: 'התקדמות מינורה: Dm → Em7♭5 → A7 → Dm.',
    tip: 'Em7♭5 = מעבר דרמטי לפני A7.',
  },
  {
    id: 'c12', num: 12, name: 'מאסטר — הכל', subtitle: '12 אקורדים',
    icon: '12', bpm: 56, unlock: 11, gameType: 'chord',
    chordSeq: ['D', 'Eb', 'Dm', 'Gm6', 'A7', 'C', 'F', 'G', 'Am', 'D7', 'Gm', 'D'],
    teach: 'סיבוב מלא — ברזל + מז׳ור + מינור + צבעים.',
    tip: '56 BPM — המטרה: ליווי שלם בלי לחשוב.',
  },
  {
    id: 'c13', num: 13, name: 'D → G → A7 → D', subtitle: 'מעגל I-IV-V',
    icon: '13', bpm: 54, unlock: 12, gameType: 'chord',
    chordSeq: ['D', 'G', 'A7', 'D', 'D', 'G', 'A7', 'D'],
    teach: 'התקדמות קלאסית: טוניקה → סול → דומיננטה → חזרה.',
    tip: 'G ו-A7 — שתי הפוזיציות החשובות אחרי הברזל.',
  },
  {
    id: 'c14', num: 14, name: 'Eb · Dm · Gm · A7', subtitle: 'צבע חיג׳אז',
    icon: '14', bpm: 52, unlock: 13, gameType: 'chord',
    chordSeq: ['Eb', 'Dm', 'Gm', 'A7', 'Eb', 'Dm', 'Gm', 'A7'],
    teach: 'מי♭ + מינור + סבאח — הליווי המזרחי הקלאסי.',
    tip: 'Eb = הצליל שמיד מזהה שיר יווני.',
  },
  {
    id: 'c15', num: 15, name: 'Dsus4 · D · D6 · D', subtitle: 'קישוטים',
    icon: '15', bpm: 50, unlock: 14, gameType: 'chord',
    chordSeq: ['Dsus4', 'D', 'D6', 'D', 'Dsus4', 'D', 'D6', 'D'],
    teach: 'שלושה "צבעים" על רה — מתח, פתרון, מתיקות.',
    tip: 'Dsus4 → D = הפתרון הכי מספק בבוזוקי.',
  },
  {
    id: 'c16', num: 16, name: 'Dm7 · Gm7 · C · F', subtitle: 'ג׳אז רך',
    icon: '16', bpm: 48, unlock: 15, gameType: 'chord',
    chordSeq: ['Dm7', 'Gm7', 'C', 'F', 'Dm7', 'Gm7', 'C', 'F'],
    teach: 'אקורדי 7 רכים — ליווי מודרני וזורם.',
    tip: 'החזיקו כל אקורד שנייה לפני הפריטה.',
  },
  {
    id: 'c17', num: 17, name: '7 ברזל — 90 BPM', subtitle: 'מהירות',
    icon: '17', bpm: 60, unlock: 16, gameType: 'chord',
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em', 'D'],
    teach: 'אותם 7 ברזל — מהיר יותר. בדיקת שליטה אמיתית.',
    tip: 'רק אם c6 נקי — עכשיו תאיצו!',
  },
  {
    id: 'c18', num: 18, name: 'מאסטר ליווי — 16 אקורדים', subtitle: 'הכל ברצף',
    icon: '18', bpm: 58, unlock: 17, gameType: 'chord',
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em', 'D', 'G', 'A7', 'Dm', 'Gm6', 'A7', 'D', 'Dsus4', 'D'],
    teach: '16 אקורדים — ליווי שלם כמו בטברנה. המבחן הסופי.',
    tip: 'זה מה שנגנים כשהשולחן שר "Opa!"',
  },
];

function matchChordId(chordId, freq) {
  const ch = getChord(chordId) || IRON_7.find(c => c.id === chordId);
  return matchChord(ch, freq);
}
