/* ============================================================
   BasicPitchEngine — תמלול פוליפוני (audio → MIDI) של Spotify Basic Pitch
   טוען TF.js + @spotify/basic-pitch מ-CDN לפי דרישה (מודל ~כמה MB),
   ומחזיר { tabNotes, chords } בפורמט של AudioAnalyzer כדי ש-SongTeacher
   יוכל לצרוך אותו זהה. נפילה חיננית אם הטעינה/הריצה נכשלת.
   ============================================================ */
'use strict';

const BasicPitchEngine = (() => {
  const ESM_URL = 'https://esm.sh/@spotify/basic-pitch@1.0.1';
  const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@spotify/basic-pitch@1.0.1/model/model.json';
  let _lib = null;
  let _bp = null;

  function available() { return true; } // נבדק בפועל רק בטעינה

  async function _load(onProgress) {
    if (_bp) return _bp;
    onProgress?.('טוען מודל Basic Pitch (פעם ראשונה — כמה MB)…', 8);
    _lib = await import(/* @vite-ignore */ ESM_URL);
    const BasicPitch = _lib.BasicPitch || (_lib.default && _lib.default.BasicPitch);
    if (!BasicPitch) throw new Error('Basic Pitch לא נטען (BasicPitch חסר)');
    _bp = new BasicPitch(MODEL_URL);
    return _bp;
  }

  const TARGET_SR = 22050;

  /** Basic Pitch דורש מונו @ 22050Hz — קבצים מ-YouTube/הורדה לרוב 44100/48000 */
  async function _toBasicPitchInput(audioBuffer) {
    if (audioBuffer.sampleRate === TARGET_SR && audioBuffer.numberOfChannels === 1) {
      return audioBuffer;
    }
    const length = Math.max(1, Math.ceil(audioBuffer.duration * TARGET_SR));
    const offline = new OfflineAudioContext(1, length, TARGET_SR);
    const src = offline.createBufferSource();
    src.buffer = audioBuffer;
    src.connect(offline.destination);
    src.start(0);
    return offline.startRendering();
  }

  function _foldToRange(midi) {
    const lo = TUNING[TUNING.length - 1].midi;            // C3 = 48
    const hi = TUNING[0].midi + NUM_FRETS;                 // D + 15
    let m = midi;
    while (m > hi) m -= 12;
    while (m < lo) m += 12;
    return m;
  }
  function _midiToPos(midi, prev = null) {
    return _midiToPosFull(midi, prev);
  }

  function _midiToPosFull(midi, prev = null, courses = null) {
    const allowed = courses ?? [...Array(TUNING.length).keys()];
    const candidates = [];
    allowed.forEach(c => {
      if (c < 0 || c >= TUNING.length) return;
      for (let f = 0; f <= NUM_FRETS; f++) {
        const m = TUNING[c].midi + f;
        const d = Math.abs(m - midi);
        if (d <= 0.6) candidates.push({ ci: c, fret: f, midi: m });
      }
    });
    if (!candidates.length) return null;
    if (typeof FretboardScale !== 'undefined' && FretboardScale.pickPlacement) {
      const pick = FretboardScale.pickPlacement(candidates, prev);
      return pick ? { course: pick.ci, fret: pick.fret, midi: pick.midi } : null;
    }
    return { course: candidates[0].ci, fret: candidates[0].fret, midi: candidates[0].midi };
  }

  async function _runModel(audioBuffer, onProgress, noteOpts) {
    const melodyCourses = noteOpts.courses ?? null;
    const bp = await _load(onProgress);
    onProgress?.('Basic Pitch — מכין אודיו (22050Hz)…', 18);
    const input = await _toBasicPitchInput(audioBuffer);
    onProgress?.('Basic Pitch — מריץ מודל…', 20);

    const frames = [], onsets = [], contours = [];
    try {
      await bp.evaluateModel(
        input,
        (f, o, c) => { frames.push(...f); onsets.push(...o); contours.push(...c); },
        (p) => onProgress?.('Basic Pitch — מנתח… ' + Math.round(p * 100) + '%', 20 + p * 60)
      );
    } catch (e) {
      const msg = String(e?.message || e);
      if (/sample rate/i.test(msg)) {
        throw new Error('קובץ האודיו בקצב דגימה לא נתמך — נסו להוריד מחדש או קובץ MP3 אחר');
      }
      throw e;
    }

    onProgress?.('Basic Pitch — ממיר לתווים…', 85);
    const { outputToNotesPoly, addPitchBendsToNoteEvents, noteFramesToTime } = _lib;
    const { onset, frame, minLen } = noteOpts;
    const noteEvents = noteFramesToTime(
      addPitchBendsToNoteEvents(contours, outputToNotesPoly(frames, onsets, onset, frame, minLen))
    );

    const tabNotes = [];
    let lastPos = null;
    noteEvents.forEach(ev => {
      const midi = _foldToRange(Math.round(ev.pitchMidi));
      const pos = _midiToPosFull(midi, lastPos, melodyCourses);
      if (pos) {
        tabNotes.push({
          time: +ev.startTimeSeconds.toFixed(3),
          duration: +Math.max(0.12, ev.durationSeconds || 0.2).toFixed(3),
          course: pos.course, fret: pos.fret, midi,
          amp: ev.amplitude || 1,
        });
        lastPos = { ci: pos.course, fret: pos.fret };
      }
    });
    tabNotes.sort((a, b) => a.time - b.time);
    return tabNotes;
  }

  // אקורד פשוט מתוך תווים בו-זמניים (התאמת טריאדה מז'ור/מינור)
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  function _chordsFromNotes(notes, dur) {
    const win = 0.5, chords = [];
    let last = null;
    for (let t = 0; t < dur; t += win) {
      const energy = new Array(12).fill(0);
      notes.forEach(n => {
        if (n.time < t + win && (n.time + n.duration) > t) energy[n.midi % 12] += (n.amp || 1);
      });
      if (energy.reduce((a, b) => a + b, 0) < 0.1) continue;
      let bestRoot = 0, bestScore = -1, bestMinor = false;
      for (let r = 0; r < 12; r++) {
        const maj = energy[r] + energy[(r + 4) % 12] + energy[(r + 7) % 12];
        const min = energy[r] + energy[(r + 3) % 12] + energy[(r + 7) % 12];
        if (maj > bestScore) { bestScore = maj; bestRoot = r; bestMinor = false; }
        if (min > bestScore) { bestScore = min; bestRoot = r; bestMinor = true; }
      }
      const label = NAMES[bestRoot] + (bestMinor ? 'm' : '');
      if (label !== last) { chords.push({ time: +t.toFixed(2), chord: label }); last = label; }
    }
    return chords;
  }

  /**
   * @param {AudioBuffer} audioBuffer
   * @param {(msg:string,pct:number)=>void} onProgress
   * @returns {Promise<{bpm:number,chords:Array,tabNotes:Array,engine:string}>}
   */
  async function transcribe(audioBuffer, onProgress) {
    const tabNotes = await _runModel(audioBuffer, onProgress, { onset: 0.5, frame: 0.3, minLen: 11 });
    const finalized = (typeof FretboardScale !== 'undefined' && FretboardScale.normalizeMelody)
      ? FretboardScale.normalizeMelody(tabNotes).notes
      : tabNotes;
    const dur = finalized.length ? finalized[finalized.length - 1].time + 1 : (audioBuffer.duration || 30);
    const chords = _chordsFromNotes(finalized, dur);
    onProgress?.('Basic Pitch — הושלם', 100);
    return { bpm: 0, chords, tabNotes: finalized, engine: 'basic-pitch' };
  }

  /** תמלול מותאם לקול מבודד / ווקאלי — סף נמוך יותר, כל 4 המיתרים */
  async function transcribeVocal(audioBuffer, onProgress) {
    const tabNotes = await _runModel(audioBuffer, onProgress, {
      onset: 0.28, frame: 0.18, minLen: 6, courses: [0, 1],
    });
    const finalized = (typeof FretboardScale !== 'undefined' && FretboardScale.normalizeMelody)
      ? FretboardScale.normalizeMelody(tabNotes, { mode: 'da' }).notes
      : tabNotes;
    onProgress?.('מלודיית שירה — הושלם', 100);
    return { bpm: 0, chords: [], tabNotes: finalized, engine: 'basic-pitch-vocal' };
  }

  return { transcribe, transcribeVocal, available };
})();
