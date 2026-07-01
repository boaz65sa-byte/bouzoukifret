/* ============================================================
   VocalHarmonyEngine — Φωνή→Bridge
   פיצ'ר ייחודי: מלודיה מהזמר + הרמוניה לבוזוקי
   קול מבודד → Basic Pitch (מונופוני)
   ליווי/מיקס → chroma/Essentia + הסקת אקורדים לפי דרומוס יווני
   ============================================================ */
'use strict';

const VocalHarmonyEngine = (() => {
  const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const ENH = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' };

  /** אקורדים נפוצים ברבטיקו לפי דרגה בסולם (יחסית לטוניקה) */
  const DEGREE_CHORD = {
    0: 'maj', 1: 'dim', 2: 'min', 3: 'min', 4: 'maj', 5: 'maj', 6: 'min', 7: 'maj',
    8: 'min', 9: 'min', 10: 'dim', 11: 'dim',
  };

  function pcName(pc) { return PC_NAMES[((pc % 12) + 12) % 12]; }

  function parseRootPc(chord) {
    const m = String(chord || '').match(/^([A-G][#b]?)/);
    if (!m) return null;
    const r = ENH[m[1]] || m[1];
    const i = PC_NAMES.indexOf(r);
    return i >= 0 ? i : null;
  }

  function chordLabel(rootPc, quality) {
    const n = pcName(rootPc);
    if (quality === 'min') return n + 'm';
    if (quality === '7') return n + '7';
    if (quality === 'maj') return n;
    return n;
  }

  /** ניקוי מלודיה מונופונית — רק קו השירה */
  function cleanVocalMelody(notes) {
    if (!notes?.length) return [];
    let sorted = notes.slice().sort((a, b) => a.time - b.time);
    sorted = sorted.filter(n => (n.duration || 0.2) >= 0.06 && n.midi != null);

    const merged = [];
    for (const n of sorted) {
      const last = merged[merged.length - 1];
      if (last && Math.abs((last.midi || 0) - (n.midi || 0)) <= 1
        && n.time - (last.time + (last.duration || 0.2)) < 0.12) {
        last.duration = Math.max(last.duration || 0.2, (n.time + (n.duration || 0.2)) - last.time);
        last.amp = Math.max(last.amp || 1, n.amp || 1);
      } else {
        merged.push({ ...n });
      }
    }

    const mono = [];
    for (const n of merged) {
      const end = n.time + (n.duration || 0.2);
      const clash = mono.findIndex(m => {
        const mEnd = m.time + (m.duration || 0.2);
        return n.time < mEnd && end > m.time;
      });
      if (clash < 0) mono.push({ ...n });
      else if ((n.amp || 1) >= (mono[clash].amp || 1)) mono[clash] = { ...n };
    }
    return mono.map((n, i) => {
      const next = mono[i + 1];
      if (next) {
        const span = next.time - n.time - 0.02;
        if (span > (n.duration || 0.15)) n.duration = +span.toFixed(3);
      } else if (!n.duration || n.duration < 0.2) {
        n.duration = 0.35;
      }
      return n;
    });
  }

  function mergeVocalMelodyTracks(...lists) {
    const all = lists.flat().filter(n => n?.midi != null && n.course != null);
    if (!all.length) return [];
    all.sort((a, b) => a.time - b.time || (b.amp || 0) - (a.amp || 0));
    const out = [];
    for (const n of all) {
      const dup = out.findIndex(m =>
        Math.abs(m.time - n.time) < 0.08 && Math.abs((m.midi || 0) - (n.midi || 0)) <= 1);
      if (dup < 0) out.push({ ...n });
      else if ((n.amp || 1) >= (out[dup].amp || 1)) out[dup] = { ...out[dup], ...n };
    }
    return cleanVocalMelody(out);
  }

  async function pitchTraceMelody(audioBuffer) {
    if (typeof Listen === 'undefined' || !Listen.detectPitch || typeof AudioAnalyzer === 'undefined') {
      return [];
    }
    const ch = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : null;
    const sr = audioBuffer.sampleRate;
    const hop = Math.max(512, Math.floor(sr * 0.045));
    const frameSize = 4096;
    const raw = [];
    let lastPos = null;

    for (let i = 0; i + frameSize < ch.length; i += hop) {
      const frame = new Float32Array(frameSize);
      for (let j = 0; j < frameSize; j++) {
        const v = ch1 ? (ch[i + j] + ch1[i + j]) * 0.5 : ch[i + j];
        frame[j] = v;
      }
      const { freq, rms } = Listen.detectPitch(frame, sr);
      const t = i / sr;
      if (!freq || rms < 0.008) continue;
      const midi = Math.round(69 + 12 * Math.log2(freq / 440));
      const pos = AudioAnalyzer.midiToPosition(midi, lastPos, [0, 1]);
      if (pos) {
        raw.push({ time: t, ...pos, midi, duration: hop / sr, amp: rms * 10 });
        lastPos = pos;
      }
    }
    return cleanVocalMelody(raw);
  }

  function splitPhrases(notes, gap = 0.38) {
    if (!notes.length) return [];
    const phrases = [];
    let cur = [notes[0]];
    for (let i = 1; i < notes.length; i++) {
      const prev = notes[i - 1];
      const gapT = notes[i].time - (prev.time + (prev.duration || 0.2));
      if (gapT > gap) {
        phrases.push(cur);
        cur = [notes[i]];
      } else {
        cur.push(notes[i]);
      }
    }
    if (cur.length) phrases.push(cur);
    return phrases;
  }

  function pitchHistogram(notes) {
    const hist = new Array(12).fill(0);
    notes.forEach(n => {
      if (n.midi == null) return;
      const w = (n.duration || 0.2) * (n.amp || 1);
      hist[n.midi % 12] += w;
    });
    return hist;
  }

  function estimateBpm(notes) {
    if (!notes.length) return 0;
    const onsets = notes.map(n => n.time);
    if (onsets.length < 4) return 0;
    const ivs = [];
    for (let i = 1; i < onsets.length; i++) ivs.push(onsets[i] - onsets[i - 1]);
    ivs.sort((a, b) => a - b);
    const med = ivs[Math.floor(ivs.length / 2)];
    const est = med > 0 ? Math.round(60 / med) : 0;
    return est >= 50 && est <= 200 ? est : 0;
  }

  /**
   * Φωνή Bridge — הסקת אקורדי בוזוקי מקו המלודיה + דרומוס
   * ייחודי לאפליקציה: לא מעתיק chroma מהמיקס אלא "מה הזמר מרמז"
   */
  function inferHarmonyFromMelody(melody, bpm, dromosMatch) {
    if (!melody.length || typeof DROMOI === 'undefined') return [];

    const dm = dromosMatch
      || (typeof AudioAnalyzer !== 'undefined' && AudioAnalyzer.detectDromos
        ? AudioAnalyzer.detectDromos([], melody)
        : null);
    const dromos = dm?.dromos || DROMOI.find(d => d.id === 'hitzaz') || DROMOI[0];
    const tonicPc = dm?.rootName ? parseRootPc(dm.rootName) : 2;

    const scaleSet = new Set(dromos.intervals.map(iv => (tonicPc + iv) % 12));
    const phrases = splitPhrases(melody);
    const chords = [];
    const beat = bpm > 0 ? 60 / bpm : 0.5;

    phrases.forEach((phrase, pi) => {
      const hist = pitchHistogram(phrase);
      let bestPc = tonicPc;
      let bestW = -1;
      for (let pc = 0; pc < 12; pc++) {
        if (!scaleSet.has(pc)) continue;
        if (hist[pc] > bestW) { bestW = hist[pc]; bestPc = pc; }
      }

      const rel = (bestPc - tonicPc + 12) % 12;
      let q = DEGREE_CHORD[rel] || 'maj';
      if (rel === 7 && dromos.id !== 'minor') q = '7';
      if (dromos.id === 'minor' && rel === 0) q = 'min';

      const t0 = phrase[0].time;
      chords.push({ time: t0, chord: chordLabel(bestPc, q), source: 'voice-bridge' });

      if (phrase.length > 6 && beat > 0) {
        const mid = phrase[Math.floor(phrase.length / 2)];
        const midPc = mid.midi % 12;
        if (scaleSet.has(midPc) && midPc !== bestPc) {
          const rel2 = (midPc - tonicPc + 12) % 12;
          const q2 = DEGREE_CHORD[rel2] || 'min';
          chords.push({
            time: mid.time,
            chord: chordLabel(midPc, q2),
            source: 'voice-bridge',
          });
        }
      }

      if (pi === phrases.length - 1 && phrase.length > 2) {
        const last = phrase[phrase.length - 1];
        chords.push({ time: last.time, chord: chordLabel(tonicPc, dromos.id === 'minor' ? 'min' : 'maj'), source: 'voice-cadence' });
      }
    });

    return dedupeChords(chords);
  }

  function dedupeChords(chords) {
    const out = [];
    let last = null;
    (chords || []).slice().sort((a, b) => a.time - b.time).forEach(c => {
      const ch = String(c.chord || '').trim();
      if (!ch || ch === 'N') return;
      if (ch !== last) {
        out.push({ time: c.time, chord: ch, source: c.source });
        last = ch;
      }
    });
    return out;
  }

  function chordsFromSong(song, duration) {
    if (!song?.sections?.length || !duration) return [];
    const labels = [];
    song.sections.forEach(sec => {
      (sec.lines || []).forEach(line => {
        (line.chords || []).forEach(ch => {
          if (ch) labels.push(String(ch).trim());
        });
      });
    });
    if (!labels.length) return [];
    const step = duration / labels.length;
    return labels.map((chord, i) => ({
      time: +(i * step).toFixed(2),
      chord,
      source: 'song-db',
    }));
  }

  /** מיזוג שכבות: ליווי > מאגר > bridge מהמלודיה */
  function mergeHarmonyLayers(layers, duration) {
    const scored = [
      { chords: layers.instrumental, w: 3 },
      { chords: layers.mix, w: 2 },
      { chords: layers.songDb, w: 2 },
      { chords: layers.inferred, w: 1 },
    ].filter(l => l.chords?.length);

    if (!scored.length) return [];

    scored.sort((a, b) => b.w - a.w);
    const primary = dedupeChords(scored[0].chords);
    if (scored.length === 1 || !duration) return primary;

    const grid = [];
    const step = Math.max(0.35, duration / 80);
    for (let t = 0; t < duration; t += step) {
      const votes = {};
      scored.forEach(({ chords, w }) => {
        let cur = chords[0]?.chord;
        for (const c of chords) {
          if (c.time <= t) cur = c.chord;
          else break;
        }
        if (cur) votes[cur] = (votes[cur] || 0) + w;
      });
      let best = null;
      let bestV = 0;
      Object.entries(votes).forEach(([ch, v]) => {
        if (v > bestV) { bestV = v; best = ch; }
      });
      if (best) grid.push({ time: +t.toFixed(2), chord: best });
    }
    return dedupeChords(grid);
  }

  async function decodeBlob(blob) {
    if (!blob || blob.size < 4096) throw new Error('קובץ אודיו ריק');
    const buf = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    try {
      return await ctx.decodeAudioData(buf.slice(0));
    } finally {
      try { ctx.close(); } catch { /* noop */ }
    }
  }

  async function extractMelodyFromVocal(vocalBlob, onProgress, opts = {}) {
    const vocalOnly = !!opts.vocalOnly;
    const audioBuffer = await decodeBlob(vocalBlob);
    onProgress?.('מחלצים את קו השירה מהווקאל…', 52);

    const tracks = [];
    let bpm = 0;

    if (typeof AudioAnalyzer !== 'undefined' && AudioAnalyzer.analyzeVocalMelody) {
      const ess = await AudioAnalyzer.analyzeVocalMelody(audioBuffer, (msg, pct) => {
        onProgress?.(msg, 52 + pct * 0.2);
      });
      if (ess.tabNotes?.length) tracks.push(ess.tabNotes);
      if (ess.bpm) bpm = ess.bpm;
    }

    if (typeof BasicPitchEngine !== 'undefined' && BasicPitchEngine.transcribeVocal) {
      const raw = await BasicPitchEngine.transcribeVocal(audioBuffer, (msg, pct) => {
        onProgress?.(msg, 72 + pct * 0.15);
      });
      if (raw.tabNotes?.length) tracks.push(raw.tabNotes);
      if (!bpm && raw.bpm) bpm = raw.bpm;
    } else if (typeof BasicPitchEngine !== 'undefined' && BasicPitchEngine.transcribe) {
      const raw = await BasicPitchEngine.transcribe(audioBuffer, (msg, pct) => {
        onProgress?.(msg, 72 + pct * 0.15);
      });
      if (raw.tabNotes?.length) tracks.push(cleanVocalMelody(raw.tabNotes));
    }

    let tabNotes = mergeVocalMelodyTracks(...tracks);

    if (tabNotes.length < 8) {
      onProgress?.('משלים מעקב גובה צליל על הקול…', 88);
      const traced = await pitchTraceMelody(audioBuffer);
      if (traced.length > tabNotes.length) tabNotes = mergeVocalMelodyTracks(tabNotes, traced);
    }

    if (!bpm) bpm = estimateBpm(tabNotes);

    if (typeof FretboardScale !== 'undefined' && FretboardScale.normalizeMelody) {
      tabNotes = FretboardScale.normalizeMelody(tabNotes, { mode: 'da' }).notes;
    }

    onProgress?.(`קו שירה: ${tabNotes.length} תווים${vocalOnly ? ' (ווקאל בלבד)' : ''}`, 95);
    return { tabNotes, bpm, audioBuffer, vocalOnly };
  }

  async function extractHarmonyFromAudio(blob, onProgress, tag = 'mix') {
    if (!blob || typeof AudioAnalyzer === 'undefined' || !AudioAnalyzer.analyze) {
      return { chords: [], bpm: 0 };
    }
    onProgress?.(tag === 'backing' ? 'מנתח הרמוניה מהליווי…' : 'מנתח הרמוניה מהמיקס…', 78);
    const buf = await decodeBlob(blob);
    const res = await AudioAnalyzer.analyze(buf, (msg, pct) => {
      onProgress?.(msg, 78 + pct * 0.12);
    });
    return {
      chords: dedupeChords((res.chords || []).map(c => ({ ...c, source: tag }))),
      bpm: res.bpm || 0,
    };
  }

  /**
   * צינור מלא — מלודיה + הרמוניה
   * @returns {{ analysis, vocalBlob, backingBlob, meta }}
   */
  async function run(sourceBlob, opts = {}) {
    const onProgress = opts.onProgress || (() => {});
    const provider = opts.provider || 'lalal';
    const skipStem = !!opts.skipStem;
    const vocalOnly = !!opts.vocalOnly || skipStem;
    const song = opts.song || null;

    let vocalBlob = sourceBlob;
    let backingBlob = null;

    if (!skipStem && typeof StemAPI !== 'undefined') {
      onProgress('מבודדים קול וליווי…', 6);
      const file = new File(
        [sourceBlob],
        opts.title ? `${opts.title}.mp3` : 'song.mp3',
        { type: sourceBlob.type || 'audio/mpeg' },
      );
      try {
        if (StemAPI.separateVocals) {
          vocalBlob = await StemAPI.separateVocals(file, {
            provider,
            onProgress: (msg, pct) => onProgress(msg, 6 + pct * 0.2),
          });
        }
        onProgress('מבודדים ליווי (בוזוקי/בס)…', 28);
        if (StemAPI.separateBacking) {
          backingBlob = await StemAPI.separateBacking(file, {
            provider,
            onProgress: (msg, pct) => onProgress(msg, 28 + pct * 0.18),
          });
        }
      } catch (e) {
        onProgress(`בידוד stems חלקי — ${e.message || e}`, 12);
      }
    }

    onProgress('מחלצים מלודיה מהזמר…', 48);
    const mel = await extractMelodyFromVocal(vocalBlob, onProgress, { vocalOnly });
    if (!mel.tabNotes.length) {
      throw new Error('לא זוהתה מלודיית שירה — נסו קול ברור יותר או stem-proxy');
    }

    const duration = mel.audioBuffer.duration
      || (mel.tabNotes.at(-1).time + (mel.tabNotes.at(-1).duration || 0.5));

    let harmBacking = { chords: [], bpm: 0 };
    if (backingBlob) {
      harmBacking = await extractHarmonyFromAudio(backingBlob, onProgress, 'backing');
    }

    let harmMix = { chords: [], bpm: 0 };
    if (!harmBacking.chords.length && !vocalOnly) {
      harmMix = await extractHarmonyFromAudio(sourceBlob, onProgress, 'mix');
    }

    const dromosMatch = typeof AudioAnalyzer !== 'undefined' && AudioAnalyzer.detectDromos
      ? AudioAnalyzer.detectDromos(
        harmBacking.chords.length ? harmBacking.chords : harmMix.chords,
        mel.tabNotes,
      )
      : null;

    const inferred = inferHarmonyFromMelody(mel.tabNotes, mel.bpm || harmBacking.bpm || harmMix.bpm, dromosMatch);
    const songDb = chordsFromSong(song, duration);

    const chords = mergeHarmonyLayers({
      instrumental: harmBacking.chords,
      mix: harmMix.chords,
      songDb,
      inferred,
    }, duration);

    const bpm = mel.bpm || harmBacking.bpm || harmMix.bpm || estimateBpm(mel.tabNotes) || 120;

    const sources = [];
    if (harmBacking.chords.length) sources.push('ליווי');
    if (harmMix.chords.length) sources.push('מיקס');
    if (songDb.length) sources.push('מאגר שירים');
    if (inferred.length) sources.push('Φωνή Bridge');

    onProgress(`מוכן — ${mel.tabNotes.length} תווי מלודיה · ${chords.length} אקורדים`, 100);

    return {
      analysis: {
        bpm,
        chords,
        tabNotes: mel.tabNotes,
        engine: 'vocal-bridge',
        dromosMatch,
        vocalMeta: {
          melodyNotes: mel.tabNotes.length,
          chordEvents: chords.length,
          harmonySources: sources,
          stemUsed: !skipStem && vocalBlob !== sourceBlob,
          vocalOnly: !!mel.vocalOnly,
        },
      },
      vocalBlob,
      backingBlob,
      sourceBlob,
    };
  }

  return {
    run,
    cleanVocalMelody,
    inferHarmonyFromMelody,
    mergeHarmonyLayers,
    chordsFromSong,
  };
})();
