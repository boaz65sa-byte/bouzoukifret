/* ============================================================
   ניתוח אודיו — Essentia.js + fallback (BPM, chroma, אקורדים, TAB)
   ============================================================ */
'use strict';

const AudioAnalyzer = (() => {
  let _essentia = null;
  let _loading = null;

  const CHORD_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const CHORD_SUFFIX = ['', 'm', '', 'm', 'm', '', '', '', '', 'm', 'dim', 'dim'];

  function _loadEssentia() {
    if (_essentia) return Promise.resolve(_essentia);
    if (_loading) return _loading;
    _loading = new Promise((resolve, reject) => {
      const ver = '0.1.3';
      const s1 = document.createElement('script');
      s1.src = `https://cdn.jsdelivr.net/npm/essentia.js@${ver}/dist/essentia-wasm.web.js`;
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = `https://cdn.jsdelivr.net/npm/essentia.js@${ver}/dist/essentia.js-core.js`;
        s2.onload = () => {
          if (typeof EssentiaWASM !== 'function') {
            reject(new Error('EssentiaWASM missing'));
            return;
          }
          EssentiaWASM().then(wasm => {
            _essentia = new Essentia(wasm);
            resolve(_essentia);
          }).catch(reject);
        };
        s2.onerror = () => reject(new Error('essentia core load failed'));
        document.head.appendChild(s2);
      };
      s1.onerror = () => reject(new Error('essentia wasm load failed'));
      document.head.appendChild(s1);
    });
    return _loading;
  }

  /** Mono Float32 @ target sample rate */
  function _resampleMono(buffer, targetSr = 22050) {
    const ch0 = buffer.getChannelData(0);
    const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
    const len = buffer.length;
    const mono = new Float32Array(len);
    for (let i = 0; i < len; i++) mono[i] = ch1 ? (ch0[i] + ch1[i]) * 0.5 : ch0[i];

    if (buffer.sampleRate === targetSr) return mono;
    const ratio = buffer.sampleRate / targetSr;
    const outLen = Math.floor(len / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const src = i * ratio;
      const i0 = Math.floor(src);
      const i1 = Math.min(i0 + 1, len - 1);
      const f = src - i0;
      out[i] = mono[i0] * (1 - f) + mono[i1] * f;
    }
    return out;
  }

  function _midiToPosition(midi) {
    let best = null, bestDiff = 99;
    for (let c = 0; c < TUNING.length; c++) {
      for (let f = 0; f <= NUM_FRETS; f++) {
        const m = TUNING[c].midi + f;
        const d = Math.abs(m - midi);
        if (d < bestDiff) { bestDiff = d; best = { course: c, fret: f, midi: m }; }
      }
    }
    return bestDiff <= 0.6 ? best : null;
  }

  function _chordFromChroma(chroma) {
    let best = 'Am', bestScore = -1;
    for (let root = 0; root < 12; root++) {
      for (const type of ['maj', 'min']) {
        const template = new Array(12).fill(0);
        template[root] = 1;
        template[(root + (type === 'maj' ? 4 : 3)) % 12] = 1;
        template[(root + 7) % 12] = 1;
        let score = 0;
        for (let i = 0; i < 12; i++) score += (chroma[i] || 0) * template[i];
        if (score > bestScore) {
          bestScore = score;
          best = CHORD_NAMES[root] + (type === 'min' ? 'm' : '');
        }
      }
    }
    return best;
  }

  function _fallbackAnalyze(signal, sampleRate, onProgress) {
    onProgress?.('ניתוח בסיסי (ללא Essentia)…', 40);
    const frameSize = 2048;
    const hop = 512;
    const chromaFrames = [];
    const pitches = [];
    const onsets = [];

    for (let start = 0; start + frameSize < signal.length; start += hop) {
      const frame = signal.subarray(start, start + frameSize);
      let rms = 0;
      for (let i = 0; i < frame.length; i++) rms += frame[i] * frame[i];
      rms = Math.sqrt(rms / frame.length);
      const t = start / sampleRate;

      if (rms > 0.02) {
        if (typeof Listen !== 'undefined' && Listen.detectPitch) {
          const { freq } = Listen.detectPitch(frame, sampleRate);
          if (freq) {
            const mf = 69 + 12 * Math.log2(freq / 440);
            const midi = Math.round(mf);
            const pos = _midiToPosition(midi);
            if (pos) pitches.push({ time: t, ...pos, midi });
          }
        }
        if (onsets.length === 0 || t - onsets[onsets.length - 1] > 0.08) onsets.push(t);
      }

      const chroma = new Array(12).fill(0);
      if (typeof Listen !== 'undefined' && Listen.detectPitch && rms > 0.015) {
        const { freq } = Listen.detectPitch(frame, sampleRate);
        if (freq) {
          const pc = ((Math.round(69 + 12 * Math.log2(freq / 440)) % 12) + 12) % 12;
          chroma[pc] += rms;
        }
      }
      chromaFrames.push({ time: t, chroma });
    }

    let bpm = 120;
    if (onsets.length >= 4) {
      const ivs = [];
      for (let i = 1; i < onsets.length; i++) ivs.push(onsets[i] - onsets[i - 1]);
      ivs.sort((a, b) => a - b);
      const med = ivs[Math.floor(ivs.length / 2)];
      const est = med > 0 ? Math.round(60 / med) : 120;
      if (est >= 40 && est <= 220) bpm = est;
    }

    const chords = [];
    const step = 0.5;
    for (let t = 0; t < signal.length / sampleRate; t += step) {
      const acc = new Array(12).fill(0);
      let n = 0;
      chromaFrames.forEach(f => {
        if (f.time >= t && f.time < t + step) {
          f.chroma.forEach((v, i) => { acc[i] += v; });
          n++;
        }
      });
      if (n) chords.push({ time: t, chord: _chordFromChroma(acc) });
    }

    const tabNotes = _mergePitches(pitches);
    onProgress?.('ניתוח הושלם', 100);
    return { bpm, chords, tabNotes, beats: onsets, engine: 'fallback' };
  }

  function _mergePitches(pitches) {
    if (!pitches.length) return [];
    const sorted = [...pitches].sort((a, b) => a.time - b.time);
    const out = [];
    let cur = { ...sorted[0], duration: 0.15 };
    for (let i = 1; i < sorted.length; i++) {
      const p = sorted[i];
      if (p.course === cur.course && p.fret === cur.fret && p.time - cur.time < 0.2) {
        cur.duration = p.time - cur.time + 0.15;
      } else {
        out.push(cur);
        cur = { ...p, duration: 0.15 };
      }
    }
    out.push(cur);
    return out;
  }

  async function _essentiaAnalyze(signal, sampleRate, onProgress) {
    const ess = await _loadEssentia();
    onProgress?.('Essentia.js — BPM ו-beat…', 50);

    let bpm = 120;
    const beats = [];
    try {
      const vec = ess.arrayToVector(signal);
      const rhythm = ess.RhythmExtractor2013(vec, sampleRate);
      if (rhythm.bpm > 40 && rhythm.bpm < 240) bpm = Math.round(rhythm.bpm);
      const ticks = ess.vectorToArray(rhythm.ticks);
      ticks.forEach(t => beats.push(t));
      ess.delete(vec);
    } catch { /* use fallback bpm later */ }

    onProgress?.('Essentia — chroma + אקורדים…', 65);
    const frameSize = 4096;
    const hop = 2048;
    const hpcpFrames = [];

    for (let start = 0; start + frameSize < signal.length; start += hop) {
      const frame = signal.subarray(start, start + frameSize);
      try {
        const v = ess.arrayToVector(frame);
        const win = ess.Windowing(v, true, frameSize, 'hann', 0, false);
        const spec = ess.Spectrum(win.frame);
        const peaks = ess.SpectralPeaks(spec.spectrum, 60, 5000, 100, 0.0001, sampleRate, 'magnitudes', 'frequencies');
        const white = ess.SpectralWhitening(spec.spectrum, peaks.frequencies, peaks.magnitudes, 30, 3000, 0.001, sampleRate);
        const hpcp = ess.HPCP(peaks.frequencies, white.magnitudes, true, 500, 0, 440, 5000, 0, true, 440, sampleRate, 12, 'cosine', 1);
        hpcpFrames.push({ time: start / sampleRate, hpcp: ess.vectorToArray(hpcp.hpcp) });
      } catch { /* skip frame */ }
    }

    const chords = [];
    if (hpcpFrames.length > 8) {
      try {
        const matrix = hpcpFrames.map(f => f.hpcp);
        const pcpVec = ess.arrayToVector2D(matrix);
        const det = ess.ChordsDetection(pcpVec, hop, sampleRate, 2048);
        const labels = ess.vectorToArray(det.chords);
        labels.forEach((ch, i) => {
          if (ch && ch !== 'N') chords.push({ time: hpcpFrames[i]?.time || i * hop / sampleRate, chord: ch });
        });
      } catch {
        hpcpFrames.forEach((f, i) => {
          if (i % 4 === 0) chords.push({ time: f.time, chord: _chordFromChroma(f.hpcp) });
        });
      }
    }

    onProgress?.('Essentia — גובה צליל (TAB)…', 80);
    const pitches = [];
    try {
      const vec = ess.arrayToVector(signal);
      const mel = ess.PitchMelodia(vec, sampleRate);
      const pitchArr = ess.vectorToArray(mel.pitch);
      const conf = ess.vectorToArray(mel.pitchConfidence);
      const hopMel = mel.hopSize || 128;
      pitchArr.forEach((p, i) => {
        if (p > 50 && (conf[i] || 0) > 0.5) {
          const midi = Math.round(69 + 12 * Math.log2(p / 440));
          const pos = _midiToPosition(midi);
          if (pos) pitches.push({ time: (i * hopMel) / sampleRate, ...pos, midi });
        }
      });
    } catch {
      return _fallbackAnalyze(signal, sampleRate, onProgress);
    }

    const tabNotes = _mergePitches(pitches);
    onProgress?.('Essentia — הושלם', 100);
    return { bpm, chords, tabNotes, beats, engine: 'essentia' };
  }

  /**
   * @param {AudioBuffer} audioBuffer
   * @param {(msg:string,pct:number)=>void} onProgress
   */
  async function analyze(audioBuffer, onProgress) {
    onProgress?.('מכין אודיו…', 5);
    const signal = _resampleMono(audioBuffer, 22050);
    const sr = 22050;

    try {
      return await _essentiaAnalyze(signal, sr, onProgress);
    } catch (e) {
      console.warn('Essentia failed, fallback:', e);
      return _fallbackAnalyze(signal, sr, onProgress);
    }
  }

  async function decodeBlob(blob) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ab = await blob.arrayBuffer();
    return ctx.decodeAudioData(ab);
  }

  /** chromagram מציר אקורדים + TAB → התאמת דרומוס (כמו LiveAnalyzer) */
  function detectDromos(chords, tabNotes) {
    const chromagram = new Array(12).fill(0);
    const addPc = (pc, w) => { chromagram[((pc % 12) + 12) % 12] += w; };

    (chords || []).forEach(c => {
      const m = String(c.chord || '').match(/^([A-G][#b]?)/);
      if (!m) return;
      const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
      const enh = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
      const root = enh[m[1]] || m[1];
      const idx = names.indexOf(root);
      if (idx >= 0) addPc(idx, 2);
    });
    (tabNotes || []).forEach(n => {
      if (n.midi != null) addPc(n.midi % 12, 1);
    });

    const total = chromagram.reduce((a, b) => a + b, 0);
    if (total < 1) return null;

    const matches = [];
    for (const dromos of DROMOI) {
      for (let root = 0; root < 12; root++) {
        const scaleNotes = new Set(dromos.intervals.map(iv => (root + iv) % 12));
        let inScale = 0;
        for (let pc = 0; pc < 12; pc++) {
          if (scaleNotes.has(pc)) inScale += chromagram[pc];
        }
        const confidence = (inScale / total) * 100;
        matches.push({ dromos, root, rootName: NOTE_NAMES[root], confidence });
      }
    }
    matches.sort((a, b) => b.confidence - a.confidence);
    const top = matches[0];
    if (!top || top.confidence < 25) return null;
    return {
      dromos: top.dromos,
      rootName: top.rootName,
      confidence: top.confidence,
      top3: matches.slice(0, 3),
    };
  }

  function transposeChord(chord, semitones) {
    if (!semitones) return chord;
    const m = String(chord).match(/^([A-G][#b]?)(.*)$/);
    if (!m) return chord;
    const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const enh = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };
    const root = enh[m[1]] || m[1];
    let idx = names.indexOf(root);
    if (idx < 0) return chord;
    idx = (idx + semitones + 12) % 12;
    return names[idx] + m[2];
  }

  function transposeTabNotes(notes, semitones) {
    if (!semitones) return notes;
    return notes.map(n => {
      const midi = n.midi + semitones;
      const pos = _midiToPosition(midi);
      return pos ? { ...n, ...pos, midi } : { ...n, midi };
    }).filter(n => n.course != null);
  }

  function computeWavePeaks(buffer, points = 800) {
    const ch = buffer.getChannelData(0);
    const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : null;
    const block = Math.max(1, Math.floor(ch.length / points));
    const peaks = [];
    for (let i = 0; i < points; i++) {
      let max = 0;
      const start = i * block;
      for (let j = start; j < start + block && j < ch.length; j++) {
        const v = ch1 ? (ch[j] + ch1[j]) * 0.5 : ch[j];
        max = Math.max(max, Math.abs(v));
      }
      peaks.push(max);
    }
    return peaks;
  }

  return {
    analyze, decodeBlob, midiToPosition: _midiToPosition,
    detectDromos, transposeChord, transposeTabNotes, computeWavePeaks,
  };
})();
