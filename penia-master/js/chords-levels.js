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
    id: 'c7', num: 7, name: '7 הברזל ×2', subtitle: 'מאסטר',
    icon: '7', bpm: 62, unlock: 6, gameType: 'chord',
    chordSeq: ['D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em', 'D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em', 'D'],
    teach: 'פעמיים ברצף — מהירות עם דיוק.',
    tip: '62 BPM — רק אם כל האקורדים נקיים!',
  },
];

function matchChordId(chordId, freq) {
  const ch = IRON_7.find(c => c.id === chordId) || { id: chordId, tones: chordMidis(CHORD_LIB[chordId]?.shape || []) };
  return matchChord(ch, freq);
}
