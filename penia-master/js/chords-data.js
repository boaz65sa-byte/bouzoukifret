/* שבעת אקורדי הברזל + ספרייה מלאה לעתיד */
const TUNING_MIDI = [48, 53, 57, 62]; /* C F A D — מנמוך לגבוה */

const CHORD_LIB = {
  D:   { shape: [2, 1, 0, 0],   he: 'רה מז׳ור',   role: 'טוניקה · חיג׳אז' },
  Eb:  { shape: [3, 2, 1, 1],   he: 'מי♭ מז׳ור',  role: '♭2 — הצבע המזרחי' },
  Dm:  { shape: [2, 0, 0, 0],   he: 'רה מינור',   role: 'מינור · רבטיקו' },
  Gm:  { shape: ['x', 2, 1, 0], he: 'סול מינור',  role: 'סבאח · עמוק' },
  A7:  { shape: [1, 2, 0, 2],   he: 'לה ספטים',   role: 'דומיננטה · V' },
  C:   { shape: [0, 2, 3, 2],   he: 'דו מז׳ור',   role: 'IV · בהיר' },
  Em:  { shape: [4, 2, 2, 2],   he: 'מי מינור',   role: 'ii · רגש' },
  D7:  { shape: [2, 1, 3, 0],   he: 'רה ספטים',   role: 'מעבר דומיננטי' },
  G:   { shape: ['x', 2, 2, 0], he: 'סול מז׳ור',  role: 'ליווי מזרחי' },
  Am:  { shape: ['x', 4, 3, 2], he: 'לה מינור',   role: 'מינור יחסי' },
  F:   { shape: [0, 0, 0, 3],   he: 'פה מז׳ור',   role: 'פוזיציה פתוחה' },
};

/* שבעת הברזל — המובילים בליווי יווני */
const IRON_7 = ['D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em'].map(id => ({
  id,
  ...CHORD_LIB[id],
  tones: chordMidis(CHORD_LIB[id].shape),
}));

function chordMidis(shape) {
  const midis = [];
  shape.forEach((f, i) => {
    if (f === 'x') return;
    midis.push(TUNING_MIDI[i] + (f || 0));
  });
  return midis;
}

function matchChord(chord, freq) {
  if (!freq || !chord?.tones?.length) return false;
  const pc = Math.round(69 + 12 * Math.log2(freq / 440)) % 12;
  return chord.tones.some(m => ((m % 12) + 12) % 12 === ((pc % 12) + 12) % 12);
}
