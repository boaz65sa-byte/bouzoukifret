/* שבעת אקורדי הברזל + ספרייה מלאה */
const TUNING_MIDI = [48, 53, 57, 62]; /* C F A D */

const CHORD_LIB = {
  D:      { shape: [2, 1, 0, 0],     he: 'רה מז׳ור',       role: 'טוניקה · חיג׳אז', cat: 'iron' },
  Eb:     { shape: [3, 2, 1, 1],     he: 'מי♭ מז׳ור',      role: '♭2 — הצבע המזרחי', cat: 'iron' },
  Dm:     { shape: [2, 0, 0, 0],     he: 'רה מינור',       role: 'מינור · רבטיקו', cat: 'iron' },
  Gm:     { shape: ['x', 2, 1, 0],   he: 'סול מינור',      role: 'סבאח · עמוק', cat: 'iron' },
  A7:     { shape: [1, 2, 0, 2],     he: 'לה ספטים',       role: 'דומיננטה · V', cat: 'iron' },
  C:      { shape: [0, 2, 3, 2],     he: 'דו מז׳ור',       role: 'IV · בהיר', cat: 'iron' },
  Em:     { shape: [4, 2, 2, 2],     he: 'מי מינור',       role: 'ii · רגש', cat: 'iron' },
  D7:     { shape: [2, 1, 3, 0],     he: 'רה ספטים',       role: 'מעבר דומיננטי', cat: 'dom' },
  G:      { shape: ['x', 2, 2, 0],  he: 'סול מז׳ור',      role: 'ליווי מזרחי', cat: 'major' },
  Am:     { shape: ['x', 4, 3, 2],  he: 'לה מינור',       role: 'מינור יחסי', cat: 'minor' },
  Bm:     { shape: ['x', 5, 4, 2],  he: 'סי מינור',       role: 'מינור · סירτός', cat: 'minor' },
  F:      { shape: [0, 0, 0, 3],     he: 'פה מז׳ור',       role: 'פוזיציה פתוחה', cat: 'major' },
  A:      { shape: ['x', 4, 4, 2],  he: 'לה מז׳ור',       role: 'דומיננטה מז׳ור', cat: 'major' },
  E:      { shape: [4, 3, 2, 2],     he: 'מי מז׳ור',       role: 'V · בהיר', cat: 'major' },
  E7:     { shape: [4, 3, 2, 0],     he: 'מי ספטים',       role: 'דומיננטה חזקה', cat: 'dom' },
  Cm:     { shape: [0, 2, 3, 1],     he: 'דו מינור',       role: 'מינור IV', cat: 'minor' },
  Bb:     { shape: ['x', 5, 5, 3],   he: 'סי♭ מז׳ור',      role: '♭VII', cat: 'major' },
  Dm7:    { shape: [2, 0, 3, 0],     he: 'רה מינור 7',     role: 'ליווי זורם', cat: 'jazz' },
  Dmaj7:  { shape: [2, 1, 4, 0],     he: 'רה מז׳ור 7',     role: 'צבע לאיקו', cat: 'jazz' },
  D6:     { shape: [2, 1, 2, 0],     he: 'רה 6',           role: 'סיום מתוק', cat: 'jazz' },
  Dsus4:  { shape: [2, 2, 0, 0],     he: 'רה סוס4',        role: 'מתח לפני פתרון', cat: 'color' },
  Ddim7:  { shape: [2, 0, 2, 0],     he: 'רה מוקטן',       role: 'מעבר דרמטי', cat: 'color' },
  Gm6:    { shape: ['x', 2, 1, 2],  he: 'סול מינור 6',    role: 'אקורד סבאח', cat: 'color' },
  Gm7:    { shape: ['x', 2, 1, 3],  he: 'סול מינור 7',    role: 'מינור רך', cat: 'jazz' },
  Em7b5:  { shape: [4, 2, 1, 0],     he: 'מי חצי-מוקטן',   role: 'דרגה II במינורה', cat: 'jazz' },
  'F#dim7': { shape: ['x', 1, 0, 1], he: 'פה# מוקטן',     role: 'מעבר חיג׳אז', cat: 'color' },
  B7:     { shape: [3, 1, 2, 1],     he: 'סי 7',           role: 'דומיננטה למי מינור', cat: 'dom' },
};

const IRON_7 = ['D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em'].map(id => ({
  id, ...CHORD_LIB[id], tones: chordMidis(CHORD_LIB[id].shape),
}));

const CHORD_CATEGORIES = [
  { id: 'iron', label: '7 הברזל', ids: ['D', 'Eb', 'Dm', 'Gm', 'A7', 'C', 'Em'] },
  { id: 'major', label: 'מז׳ור', ids: ['G', 'A', 'F', 'E', 'Bb'] },
  { id: 'minor', label: 'מינור', ids: ['Am', 'Bm', 'Cm'] },
  { id: 'dom', label: 'דומיננטות', ids: ['D7', 'E7', 'B7'] },
  { id: 'jazz', label: 'ג׳אז וליווי', ids: ['Dm7', 'Dmaj7', 'D6', 'Gm7', 'Em7b5'] },
  { id: 'color', label: 'צבעים', ids: ['Dsus4', 'Ddim7', 'Gm6', 'F#dim7'] },
];

const ALL_CHORD_IDS = Object.keys(CHORD_LIB);

function chordMidis(shape) {
  const midis = [];
  shape.forEach((f, i) => {
    if (f === 'x') return;
    midis.push(TUNING_MIDI[i] + (f || 0));
  });
  return midis;
}

function getChord(id) {
  const lib = CHORD_LIB[id];
  if (!lib) return null;
  return { id, ...lib, tones: chordMidis(lib.shape) };
}

function matchChord(chord, freq) {
  if (!freq || !chord?.tones?.length) return false;
  const mf = 69 + 12 * Math.log2(freq / 440);
  return chord.tones.some(m => {
    for (let o = -1; o <= 2; o++) {
      if (Math.abs(mf - (m + o * 12)) <= 0.9) return true;
    }
    return false;
  });
}
