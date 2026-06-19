/* ============================================================
   LiveChord — זיהוי אקורד בזמן אמת מהמיקרופון (Meyda chroma)
   ============================================================ */
'use strict';

const LiveChord = (() => {
  const CHORD_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const SHARP_TO_FLAT = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };

  let _meydaPromise = null;
  let _analyzer = null;
  let _ctx = null;
  let _chromaBuf = [];
  let _lastChord = '';
  let _onUpdate = null;
  let _running = false;

  function loadMeyda() {
    if (window.Meyda) return Promise.resolve(window.Meyda);
    if (_meydaPromise) return _meydaPromise;
    _meydaPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/meyda@5.6.2/dist/web/meyda.min.js';
      s.onload = () => (window.Meyda ? resolve(window.Meyda) : reject(new Error('Meyda missing')));
      s.onerror = () => reject(new Error('Meyda load failed'));
      document.head.appendChild(s);
    });
    return _meydaPromise;
  }

  function chordFromChroma(chroma) {
    const templates = [
      { suf: '', iv: [0, 4, 7] },
      { suf: 'm', iv: [0, 3, 7] },
      { suf: '7', iv: [0, 4, 7, 10] },
      { suf: 'm7', iv: [0, 3, 7, 10] },
    ];
    let best = 'Am';
    let bestScore = -1;
    for (let root = 0; root < 12; root++) {
      for (const t of templates) {
        let score = 0;
        for (const iv of t.iv) score += chroma[(root + iv) % 12] || 0;
        if (score > bestScore) {
          bestScore = score;
          let name = CHORD_NAMES[root] + t.suf;
          if (SHARP_TO_FLAT[CHORD_NAMES[root]]) {
            const flat = SHARP_TO_FLAT[CHORD_NAMES[root]];
            name = flat + t.suf;
          }
          best = name;
        }
      }
    }
    return bestScore > 0.08 ? best : '';
  }

  function _smoothChroma(raw) {
    _chromaBuf.push(raw);
    if (_chromaBuf.length > 12) _chromaBuf.shift();
    const out = new Array(12).fill(0);
    _chromaBuf.forEach(c => { for (let i = 0; i < 12; i++) out[i] += c[i] || 0; });
    const n = _chromaBuf.length;
    let max = 0;
    for (let i = 0; i < 12; i++) { out[i] /= n; if (out[i] > max) max = out[i]; }
    if (max > 0) for (let i = 0; i < 12; i++) out[i] /= max;
    return out;
  }

  function _emit(chord) {
    if (chord === _lastChord) return;
    _lastChord = chord;
    _onUpdate?.(chord);
  }

  async function start(audioContext, sourceNode, onUpdate) {
    stop();
    _onUpdate = onUpdate;
    _ctx = audioContext;
    _chromaBuf = [];
    _lastChord = '';

    const Meyda = await loadMeyda();
    if (!_ctx || !sourceNode) throw new Error('AudioContext / source missing');

    Meyda.bufferSize = 512;
    Meyda.sampleRate = _ctx.sampleRate;

    _analyzer = Meyda.createMeydaAnalyzer(
      _ctx,
      sourceNode,
      512,
      (features) => {
        if (!_running || !features?.chroma) return;
        if ((features.rms || 0) < 0.008) {
          _chromaBuf = [];
          return;
        }
        const smooth = _smoothChroma(features.chroma);
        _emit(chordFromChroma(smooth));
      },
      ['chroma', 'rms'],
    );

    _running = true;
    _analyzer.start();
  }

  function stop() {
    _running = false;
    if (_analyzer) {
      try { _analyzer.stop(); } catch { /* noop */ }
      _analyzer = null;
    }
    _chromaBuf = [];
    _lastChord = '';
    _onUpdate = null;
    _ctx = null;
  }

  function getLast() { return _lastChord; }

  function chordsMatch(a, b) {
    if (!a || !b) return false;
    const ka = typeof ChordTooltip !== 'undefined' ? ChordTooltip.resolveKey(a) : a;
    const kb = typeof ChordTooltip !== 'undefined' ? ChordTooltip.resolveKey(b) : b;
    if (ka && kb) return ka === kb;
    return String(a).replace(/\s/g, '') === String(b).replace(/\s/g, '');
  }

  return { start, stop, getLast, chordsMatch, chordFromChroma, loadMeyda };
})();
