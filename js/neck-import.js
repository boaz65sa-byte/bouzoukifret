/* ============================================================
   העלאת תווים לנגן על הצוואר
   MusicXML / MIDI / ABC → תווים בפורמט NECK_SONGS
   צילום ו-PDF: הודעה לייצא MusicXML (אין OMR בדפדפן)
   ============================================================ */
'use strict';

const NeckImport = (() => {
  const DB_NAME = 'bouzouki-neck';
  const STORE = 'songs';
  const LS_KEY = 'bouzouki_neck_uploads_v1';
  const MAX_NOTES = 240;

  class ImportMessage extends Error {
    constructor(he) {
      super(he);
      this.he = he;
    }
  }

  const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const MAJOR_SHARPS = {
    C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, 'C#': 7,
    F: -1, Bb: -2, Eb: -3, Ab: -4, Db: -5, Gb: -6, Cb: -7,
  };
  const MAJOR_BY_PC = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

  function playableRange() {
    const tuning = (typeof TUNING !== 'undefined' ? TUNING : [
      { midi: 62 }, { midi: 57 }, { midi: 53 }, { midi: 48 },
    ]);
    const frets = typeof NUM_FRETS !== 'undefined' ? NUM_FRETS : 15;
    let low = Infinity;
    let high = -Infinity;
    tuning.forEach((t) => {
      low = Math.min(low, t.midi);
      high = Math.max(high, t.midi + frets);
    });
    return { low, high, frets, tuning };
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function u16be(b, o) { return (b[o] << 8) | b[o + 1]; }
  function u32be(b, o) { return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0; }
  function u16le(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32le(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  function readVlq(b, i) {
    let v = 0;
    let n = 0;
    while (i < b.length && n < 5) {
      const byte = b[i++];
      v = (v << 7) | (byte & 0x7f);
      n += 1;
      if ((byte & 0x80) === 0) break;
    }
    return [v, i];
  }

  function ascii(b, o, n) {
    let s = '';
    for (let i = 0; i < n; i++) s += String.fromCharCode(b[o + i]);
    return s;
  }

  /* ---------- MIDI ---------- */

  function parseTrack(data) {
    let i = 0;
    let tick = 0;
    let status = 0;
    const open = new Map();
    const notes = [];
    let tempo = 0;
    let meter = '';
    let name = '';
    while (i < data.length) {
      let delta;
      [delta, i] = readVlq(data, i);
      tick += delta;
      if (i >= data.length) break;
      let b = data[i];
      if (b === 0xff) {
        const meta = data[i + 1];
        let len;
        [len, i] = readVlq(data, i + 2);
        const payload = data.subarray(i, i + len);
        i += len;
        if (meta === 0x51 && payload.length >= 3) tempo = (payload[0] << 16) | (payload[1] << 8) | payload[2];
        else if (meta === 0x58 && payload.length >= 2) meter = payload[0] + '/' + (1 << payload[1]);
        else if ((meta === 0x03 || meta === 0x01) && !name) name = new TextDecoder().decode(payload).trim();
        continue;
      }
      if (b === 0xf0 || b === 0xf7) {
        let len;
        [len, i] = readVlq(data, i + 1);
        i += len;
        continue;
      }
      if (b & 0x80) {
        status = b;
        i += 1;
      }
      if (!status) break;
      const type = status & 0xf0;
      const ch = status & 0x0f;
      if (type === 0xc0 || type === 0xd0) {
        i += 1;
        continue;
      }
      const d1 = data[i++];
      const d2 = data[i++];
      if (ch === 9) continue;
      if (type === 0x90 && d2 > 0) open.set(d1 + ':' + ch, { tick, midi: d1 });
      else if (type === 0x80 || (type === 0x90 && d2 === 0)) {
        const key = d1 + ':' + ch;
        const st = open.get(key);
        if (st != null && tick > st.tick) {
          notes.push({ midi: st.midi, start: st.tick, end: tick });
          open.delete(key);
        }
      }
    }
    return { notes, tempo, meter, name };
  }

  function monophonic(notes, division) {
    const sorted = notes.slice().sort((a, b) => a.start - b.start || b.midi - a.midi);
    const raw = [];
    sorted.forEach((n) => {
      if (n.end <= n.start) return;
      const start = n.start / division;
      const dur = (n.end - n.start) / division;
      if (!raw.length) {
        raw.push({ midi: n.midi, start, duration: dur });
        return;
      }
      const last = raw[raw.length - 1];
      const lastEnd = last.start + last.duration;
      if (Math.abs(start - last.start) < 0.04) {
        if (n.midi > last.midi) {
          last.midi = n.midi;
          last.duration = Math.max(last.duration, dur);
        }
        return;
      }
      if (start >= lastEnd - 0.03) {
        if (start > lastEnd + 0.12) raw.push({ rest: true, start: lastEnd, duration: start - lastEnd });
        raw.push({ midi: n.midi, start, duration: dur });
      } else if (n.midi >= last.midi) {
        last.duration = Math.max(0.05, start - last.start);
        raw.push({ midi: n.midi, start, duration: dur });
      }
    });
    return raw.map((e) => (e.rest ? { rest: true, duration: e.duration } : { midi: e.midi, duration: e.duration }));
  }

  function parseMidi(bytes) {
    if (bytes.length < 14 || ascii(bytes, 0, 4) !== 'MThd') throw new ImportMessage('קובץ ה־MIDI לא תקין.');
    const division = u16be(bytes, 12);
    if (division & 0x8000) throw new ImportMessage('סוג MIDI זה לא נתמך. ייצאו MIDI רגיל או MusicXML.');
    let pos = 14;
    const tracks = [];
    let tempo = 500000;
    let meter = '4/4';
    let title = '';
    while (pos + 8 <= bytes.length) {
      const type = ascii(bytes, pos, 4);
      const len = u32be(bytes, pos + 4);
      const start = pos + 8;
      const end = Math.min(bytes.length, start + len);
      if (type === 'MTrk') {
        const parsed = parseTrack(bytes.subarray(start, end));
        if (parsed.tempo) tempo = parsed.tempo;
        if (parsed.meter) meter = parsed.meter;
        if (parsed.name && !title) title = parsed.name;
        if (parsed.notes.length) tracks.push(parsed.notes);
      }
      pos = end;
      if (!Number.isFinite(len) || len < 0) break;
    }
    if (!tracks.length) throw new ImportMessage('לא נמצאו תווים בקובץ ה־MIDI.');
    tracks.sort((a, b) => b.length - a.length);
    const bpm = clamp(Math.round(60000000 / (tempo || 500000)), 40, 200);
    return { title, meter, bpm, events: monophonic(tracks[0], division) };
  }

  /* ---------- MusicXML ---------- */

  function allNamed(root, name) {
    if (!root) return [];
    const out = [];
    const walk = (el) => {
      [...el.children].forEach((childEl) => {
        if ((childEl.localName || childEl.tagName) === name) out.push(childEl);
        walk(childEl);
      });
    };
    walk(root);
    return out;
  }

  function textOf(el) {
    return el ? (el.textContent || '').trim() : '';
  }

  function pitchOf(noteEl) {
    const pitch = child(noteEl, 'pitch');
    if (!pitch) return null;
    const step = textOf(child(pitch, 'step'));
    const oct = +textOf(child(pitch, 'octave'));
    const alter = +(textOf(child(pitch, 'alter')) || 0);
    if (!Object.prototype.hasOwnProperty.call(STEP, step) || !Number.isFinite(oct)) return null;
    return (oct + 1) * 12 + STEP[step] + alter;
  }

  function localName(el) { return el.localName || el.tagName; }

  function child(el, name) {
    return [...el.children].find((c) => localName(c) === name) || null;
  }

  function children(el, name) {
    return [...el.children].filter((c) => localName(c) === name);
  }

  function measureEvents(measure, divisions) {
    const host = children(measure, 'part')[0] || measure;
    let div = divisions || 1;
    let cursor = 0;
    const voiceTime = {};
    const events = [];
    let tempo = 0;
    [...host.children].forEach((el) => {
      const tag = localName(el);
      if (tag === 'attributes') {
        const d = child(el, 'divisions');
        if (d && +d.textContent) div = +d.textContent;
        return;
      }
      if (tag === 'direction' || tag === 'sound') {
        const sounds = tag === 'sound' ? [el] : allNamed(el, 'sound');
        sounds.forEach((sound) => {
          if (sound.getAttribute('tempo')) tempo = +sound.getAttribute('tempo') || tempo;
        });
        const per = allNamed(el, 'per-minute')[0];
        if (per && +textOf(per)) {
          const unit = textOf(allNamed(el, 'beat-unit')[0]) || 'quarter';
          let bpm = +textOf(per);
          if (unit === 'eighth') bpm *= 2;
          else if (unit === 'half') bpm /= 2;
          tempo = bpm;
        }
        return;
      }
      if (tag === 'backup') {
        const dur = +(textOf(child(el, 'duration')) || 0);
        cursor = Math.max(0, cursor - dur / div);
        return;
      }
      if (tag === 'forward') {
        const dur = +(textOf(child(el, 'duration')) || 0) / div;
        cursor += dur;
        return;
      }
      if (tag !== 'note') return;
      if (child(el, 'grace') || child(el, 'cue')) return;
      const voice = textOf(child(el, 'voice')) || '1';
      const voiceNames = allNamed(host, 'voice').map((v) => textOf(v));
      if (voiceNames.includes('1') && voice !== '1') return;
      const dur = (+(textOf(child(el, 'duration')) || 0) / div) || 0.25;
      const isChord = !!child(el, 'chord');
      const isRest = !!child(el, 'rest');
      const at = isChord ? Math.max(0, cursor - dur) : (voiceTime[voice] != null && !isChord ? voiceTime[voice] : cursor);
      if (!isChord) {
        cursor = at + dur;
        voiceTime[voice] = cursor;
      }
      if (isRest) {
        events.push({ rest: true, start: at, duration: dur });
        return;
      }
      const midi = pitchOf(el);
      if (midi == null) return;
      if (isChord && events.length) {
        const prev = events[events.length - 1];
        if (!prev.rest && midi > prev.midi) prev.midi = midi;
        return;
      }
      events.push({ midi, start: at, duration: dur });
    });
    events.sort((a, b) => a.start - b.start || (b.midi || 0) - (a.midi || 0));
    const linear = [];
    events.forEach((e) => {
      if (!linear.length) {
        linear.push(e);
        return;
      }
      const last = linear[linear.length - 1];
      if (!e.rest && !last.rest && Math.abs(e.start - last.start) < 0.04) {
        if (e.midi > last.midi) last.midi = e.midi;
        return;
      }
      linear.push(e);
    });
    return { events: linear.map((e) => (e.rest ? { rest: true, duration: e.duration } : { midi: e.midi, duration: e.duration })), div, tempo };
  }

  function barRepeat(measure) {
    let forward = false;
    let backward = false;
    let times = 2;
    const host = children(measure, 'part')[0];
    const bars = children(measure, 'barline').concat(host ? children(host, 'barline') : []);
    bars.forEach((bar) => {
      const rep = child(bar, 'repeat');
      if (!rep) return;
      const dir = rep.getAttribute('direction');
      if (dir === 'forward') forward = true;
      if (dir === 'backward') {
        backward = true;
        if (rep.getAttribute('times')) times = Math.max(2, +rep.getAttribute('times') || 2);
      }
    });
    return { forward, backward, times };
  }

  function expandRepeats(measures) {
    const out = [];
    let i = 0;
    while (i < measures.length) {
      if (!measures[i].backward) {
        out.push(measures[i].events);
        i += 1;
        continue;
      }
      let start = 0;
      for (let j = i; j >= 0; j--) {
        if (measures[j].forward) { start = j; break; }
      }
      const times = measures[i].times || 2;
      for (let t = 0; t < times; t++) {
        for (let k = start; k <= i; k++) out.push(measures[k].events);
      }
      i += 1;
    }
    return out.flat();
  }

  function xmlRoot(doc) {
    const el = doc.documentElement;
    if (!el || localName(el) === 'parsererror') return null;
    if (localName(el) === 'html' && allNamed(doc, 'parsererror').length) return null;
    if (localName(el) === 'score-partwise' || localName(el) === 'score-timewise') return el;
    return allNamed(doc, 'score-partwise')[0] || allNamed(doc, 'score-timewise')[0] || null;
  }

  function measureElsOf(root) {
    if (localName(root) === 'score-timewise') return children(root, 'measure');
    const part = children(root, 'part')[0] || allNamed(root, 'part')[0];
    return part ? children(part, 'measure') : [];
  }

  function parseXmlString(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    const root = xmlRoot(doc);
    if (!root) throw new ImportMessage('זה לא קובץ MusicXML. ייצאו MusicXML מ־MuseScore.');
    const title = textOf(allNamed(doc, 'work-title')[0]) || textOf(allNamed(doc, 'movement-title')[0]) || '';
    let meter = '4/4';
    const time = allNamed(doc, 'time')[0];
    if (time) {
      const beats = textOf(child(time, 'beats'));
      const beatType = textOf(child(time, 'beat-type'));
      if (beats && beatType) meter = beats + '/' + beatType;
    }
    const measureEls = measureElsOf(root);
    if (!measureEls.length) throw new ImportMessage('לא נמצאו תיבות בקובץ.');
    let divisions = 1;
    let tempo = 0;
    const measures = measureEls.map((measure) => {
      const info = measureEvents(measure, divisions);
      divisions = info.div || divisions;
      if (info.tempo) tempo = info.tempo;
      const rep = barRepeat(measure);
      return { events: info.events, forward: rep.forward, backward: rep.backward, times: rep.times };
    });
    const events = expandRepeats(measures).filter((e) => e.duration > 0.02);
    if (!events.some((e) => !e.rest)) throw new ImportMessage('לא נמצאו תווים בקובץ.');
    const bpm = tempo ? clamp(Math.round(tempo), 40, 200) : 96;
    return { title, meter, bpm, events: events.slice(0, MAX_NOTES + 40) };
  }

  /* ---------- MXL (zip) ---------- */

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== 'function') {
      throw new ImportMessage('הדפדפן לא פותח קובץ mxl דחוס. ייצאו MusicXML לא דחוס (.musicxml) והעלו אותו.');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function unzip(bytes) {
    const eocd = (() => {
      const min = Math.max(0, bytes.length - 22 - 65536);
      for (let i = bytes.length - 22; i >= min; i--) {
        if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x05 && bytes[i + 3] === 0x06) return i;
      }
      return -1;
    })();
    if (eocd < 0) throw new ImportMessage('קובץ ה־mxl פגום. ייצאו MusicXML רגיל.');
    const count = u16le(bytes, eocd + 10);
    let pos = u32le(bytes, eocd + 16);
    const files = {};
    for (let n = 0; n < count; n++) {
      if (ascii(bytes, pos, 4) !== 'PK\x01\x02') break;
      const method = u16le(bytes, pos + 10);
      const compSize = u32le(bytes, pos + 20);
      const nameLen = u16le(bytes, pos + 28);
      const extraLen = u16le(bytes, pos + 30);
      const commentLen = u16le(bytes, pos + 32);
      const localOff = u32le(bytes, pos + 42);
      const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
      const localName = u16le(bytes, localOff + 26);
      const localExtra = u16le(bytes, localOff + 28);
      const dataStart = localOff + 30 + localName + localExtra;
      const comp = bytes.subarray(dataStart, dataStart + compSize);
      if (method === 0) files[name] = comp;
      else if (method === 8) files[name] = await inflateRaw(comp);
      pos += 46 + nameLen + extraLen + commentLen;
    }
    return files;
  }

  async function parseMxl(buffer) {
    const files = await unzip(new Uint8Array(buffer));
    let xmlName = '';
    const container = files['META-INF/container.xml'];
    if (container) {
      const text = new TextDecoder().decode(container);
      const m = text.match(/full-path="([^"]+)"/);
      if (m) xmlName = m[1];
    }
    if (!xmlName || !files[xmlName]) {
      xmlName = Object.keys(files).find((n) => /\.xml$/i.test(n) && !/container\.xml$/i.test(n)) || '';
    }
    if (!xmlName || !files[xmlName]) throw new ImportMessage('לא נמצא MusicXML בתוך קובץ ה־mxl.');
    return parseXmlString(new TextDecoder().decode(files[xmlName]));
  }

  /* ---------- ABC ---------- */

  function parseFraction(text) {
    const m = String(text).trim().match(/^(\d+)\s*\/\s*(\d+)$/);
    if (!m) return 0.5;
    return (+m[1] / +m[2]) * 4;
  }

  function keyAccidentals(key) {
    const m = /^([A-G])([#b]?)(.*)$/.exec(String(key || 'C').trim());
    if (!m) return {};
    let name = m[1] + (m[2] === '#' ? '#' : m[2] === 'b' ? 'b' : '');
    const rest = (m[3] || '').toLowerCase();
    const minor = /^m(in(or)?)?/.test(rest) && !rest.startsWith('maj');
    if (minor) {
      const pc = (PC[name] + 3) % 12;
      name = MAJOR_BY_PC[pc];
    }
    const n = MAJOR_SHARPS[name] || 0;
    const map = {};
    if (n > 0) SHARP_ORDER.slice(0, n).forEach((letter) => { map[letter] = 1; });
    if (n < 0) FLAT_ORDER.slice(0, -n).forEach((letter) => { map[letter] = -1; });
    return map;
  }

  function parseAbc(text) {
    const lines = String(text).replace(/^\uFEFF/, '').split(/\r?\n/);
    let title = '';
    let meter = '4/4';
    let unit = null;
    let bpm = 100;
    let key = 'C';
    const body = [];
    let inBody = false;
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('%')) return;
      if (!inBody && /^[A-Za-z]:/.test(trimmed)) {
        const field = trimmed[0];
        const value = trimmed.slice(2).trim();
        if (field === 'T' && !title) title = value;
        if (field === 'M') meter = value === 'C' ? '4/4' : value === 'C|' ? '2/2' : value.split(/\s/)[0];
        if (field === 'L') unit = parseFraction(value);
        if (field === 'Q') {
          const q = value.match(/(\d+)\s*$/);
          if (q) bpm = clamp(+q[1], 40, 200);
        }
        if (field === 'K') {
          key = value;
          inBody = true;
        }
        return;
      }
      inBody = true;
      if (/^[A-Za-z]:/.test(trimmed)) return;
      body.push(trimmed);
    });
    if (unit == null) {
      const parts = String(meter || '4/4').split('/');
      const fraction = (+parts[0] || 4) / (+parts[1] || 4);
      unit = fraction < 0.75 ? 0.25 : 0.5;
    }
    const acc = keyAccidentals(key);
    const events = scanAbc(body.join(' '), unit, acc);
    if (!events.some((e) => !e.rest)) throw new ImportMessage('לא נמצאו תווים ב־ABC. צריך שדה K: ואחריו מנגינה.');
    return { title, meter: /^\d+\s*\/\s*\d+$/.test(meter) ? meter.replace(/\s/g, '') : '4/4', bpm, events };
  }

  function meterBeatsSafe(meter) {
    const parts = String(meter || '4/4').split('/');
    return (+parts[0] || 4) * (4 / (+parts[1] || 4));
  }

  function scanAbc(src, unit, keyAcc) {
    const events = [];
    let i = 0;
    let tupletLeft = 0;
    let tupletFactor = 1;
    const accidentals = { ...keyAcc };
    function midiOf(letter, octShift, alter) {
      const base = letter.toUpperCase();
      const pc = STEP[base] + alter;
      const octave = (letter === letter.toLowerCase() ? 5 : 4) + octShift;
      return (octave + 1) * 12 + pc;
    }
    while (i < src.length) {
      const c = src[i];
      if (c === '%' ) { while (i < src.length && src[i] !== '\n') i++; continue; }
      if (c === '|') {
        Object.keys(accidentals).forEach((k) => { delete accidentals[k]; });
        Object.assign(accidentals, keyAcc);
        i++;
        continue;
      }
      if (/\s/.test(c) || c === ':' || c === '\\') { i++; continue; }
      if (c === '"') { i++; while (i < src.length && src[i] !== '"') i++; i++; continue; }
      if (c === '(' && /\d/.test(src[i + 1] || '')) {
        const n = +src[i + 1];
        i += 2;
        if (n === 2 || n === 3 || n === 4) {
          tupletLeft = n;
          tupletFactor = n === 2 ? 1.5 : n === 3 ? 2 / 3 : 0.75;
        }
        continue;
      }
      if (c === '[') {
        i++;
        let best = null;
        let dur = unit;
        while (i < src.length && src[i] !== ']') {
          const got = readAbcNote(src, i, unit, accidentals, midiOf);
          if (!got) { i++; continue; }
          i = got.i;
          dur = got.duration;
          if (!got.rest && (best == null || got.midi > best)) best = got.midi;
        }
        if (src[i] === ']') i++;
        if (best != null) events.push({ midi: best, duration: dur * (tupletLeft ? tupletFactor : 1) });
        if (tupletLeft) { tupletLeft -= 1; if (!tupletLeft) tupletFactor = 1; }
        continue;
      }
      const got = readAbcNote(src, i, unit, accidentals, midiOf);
      if (!got) { i++; continue; }
      i = got.i;
      const factor = tupletLeft ? tupletFactor : 1;
      if (got.rest) events.push({ rest: true, duration: got.duration * factor });
      else events.push({ midi: got.midi, duration: got.duration * factor });
      if (tupletLeft) { tupletLeft -= 1; if (!tupletLeft) tupletFactor = 1; }
    }
    return events;
  }

  function readAbcNote(src, i, unit, accidentals, midiOf) {
    let alter = 0;
    while (src[i] === '^' || src[i] === '_' || src[i] === '=') {
      if (src[i] === '^') alter += 1;
      else if (src[i] === '_') alter -= 1;
      else alter = 0;
      i += 1;
    }
    const explicit = alter !== 0 || src[i - 1] === '=';
    const letter = src[i];
    if (!letter || !/[A-Ga-gzZx]/.test(letter)) return null;
    i += 1;
    let oct = 0;
    while (src[i] === '\'') { oct += 1; i += 1; }
    while (src[i] === ',') { oct -= 1; i += 1; }
    let mult = 1;
    if (/\d/.test(src[i] || '')) {
      let num = '';
      while (/\d/.test(src[i] || '')) { num += src[i]; i += 1; }
      mult = +num || 1;
    }
    if (src[i] === '/') {
      i += 1;
      if (/\d/.test(src[i] || '')) {
        let den = '';
        while (/\d/.test(src[i] || '')) { den += src[i]; i += 1; }
        mult /= (+den || 2);
      } else {
        let slashes = 1;
        while (src[i] === '/') { slashes += 1; i += 1; }
        mult /= 2 ** slashes;
      }
    }
    const duration = unit * mult;
    if (/[zZx]/.test(letter)) return { i, rest: true, duration: letter === 'Z' ? Math.max(duration, unit * 8) : duration };
    const base = letter.toUpperCase();
    const applied = explicit ? alter : (accidentals[base] || 0);
    if (explicit) accidentals[base] = applied;
    return { i, rest: false, midi: midiOf(letter, oct, applied), duration };
  }

  /* ---------- מיפוי לבוזוקי ---------- */

  function fitShift(midis, low, high) {
    const span = high - low;
    let best = 0;
    let bestScore = -Infinity;
    for (let oct = -4; oct <= 4; oct++) {
      const shift = oct * 12;
      let inside = 0;
      let sum = 0;
      midis.forEach((m) => {
        const p = m + shift;
        if (p >= low && p <= high) inside += 1;
        sum += p;
      });
      const mean = sum / midis.length;
      const score = inside * 100 - Math.abs(mean - (low + high) / 2) * 0.15;
      if (score > bestScore) {
        bestScore = score;
        best = shift;
      }
    }
    const moved = midis.map((m) => m + best);
    const lo = Math.min(...moved);
    const hi = Math.max(...moved);
    if (hi - lo <= span) {
      if (lo < low) best += low - lo;
      else if (hi > high) best -= hi - high;
    }
    return best;
  }

  function candidates(midi, tuning, frets) {
    const list = [];
    tuning.forEach((t, string) => {
      const fret = midi - t.midi;
      if (fret >= 0 && fret <= frets) list.push({ string, fret });
    });
    return list;
  }

  function positionAfter(pos, fret) {
    if (fret <= 0) return pos;
    if (fret >= pos && fret <= pos + 3) return pos;
    if (fret <= 4) return 1;
    return Math.max(1, fret - 1);
  }

  function fingerOf(pos, fret) {
    if (fret <= 0) return 0;
    return clamp(fret - pos + 1, 1, 4);
  }

  function placeCost(prev, cur) {
    if (!prev) return cur.fret * 0.15 + cur.string * 0.05;
    let cost = Math.abs(cur.string - prev.string) * 3.2;
    cost += Math.abs(cur.fret - prev.fret) * 1.15;
    if (cur.fret === 0) cost -= 0.35;
    if (cur.fret > 0 && cur.fret >= prev.pos && cur.fret <= prev.pos + 3) cost -= 1.1;
    else if (cur.fret > 0) cost += 4.5 + Math.abs(cur.fret - (prev.pos + 1)) * 0.4;
    cost += cur.fret * 0.06;
    return cost;
  }

  function assignFingering(events) {
    const { low, high, frets, tuning } = playableRange();
    const pitches = events.filter((e) => !e.rest).map((e) => e.midi);
    if (!pitches.length) throw new ImportMessage('לא נמצאו תווים בקובץ.');
    const shift = fitShift(pitches, low, high);
    let prev = null;
    let down = true;
    const notes = [];
    events.forEach((e) => {
      if (e.rest) {
        notes.push({ rest: true, duration: e.duration });
        return;
      }
      let midi = clamp(e.midi + shift, low, high);
      const options = candidates(midi, tuning, frets);
      if (!options.length) return;
      let best = options[0];
      let bestCost = Infinity;
      options.forEach((cur) => {
        const cost = placeCost(prev, cur);
        if (cost < bestCost) {
          bestCost = cost;
          best = cur;
        }
      });
      const pos = positionAfter(prev ? prev.pos : 1, best.fret);
      const finger = fingerOf(pos, best.fret);
      notes.push({
        string: best.string,
        fret: best.fret,
        finger,
        duration: e.duration,
        pick: down ? 'd' : 'u',
      });
      down = !down;
      prev = { string: best.string, fret: best.fret, pos };
    });
    return { notes, shift };
  }

  function quantizeAndPad(events, meter) {
    const units = events.map((e) => ({
      ...e,
      units: Math.max(1, Math.round(e.duration * 4)),
    })).filter((e) => e.units > 0);
    const beats = meterBeatsSafe(meter);
    const barUnits = Math.max(1, Math.round(beats * 4));
    let sum = units.reduce((s, e) => s + e.units, 0);
    let truncated = false;
    if (sum > MAX_NOTES * 4) {
      truncated = true;
      let acc = 0;
      const cut = [];
      for (let i = 0; i < units.length; i++) {
        if (acc >= MAX_NOTES * 2) break;
        cut.push(units[i]);
        acc += units[i].units;
      }
      units.length = 0;
      cut.forEach((u) => units.push(u));
      sum = units.reduce((s, e) => s + e.units, 0);
    }
    const rem = sum % barUnits;
    if (rem) units.push({ rest: true, units: barUnits - rem });
    const out = units.map((e) => ({ ...e, duration: e.units / 4 }));
    out.truncated = truncated;
    return out;
  }

  function rhythmFor(meter) {
    if (meter === '9/4') return 'zeibekiko';
    if (meter === '9/8') return 'karsilamas';
    if (meter === '4/4' || meter === '2/4') return 'hasapiko';
    return 'basic-44';
  }

  function baseName(filename) {
    return String(filename || 'מנגינה').replace(/\.[^.]+$/, '').replace(/[_]+/g, ' ').trim() || 'מנגינה';
  }

  function toSong(filename, parsed) {
    const meter = /^\d+\/\d+$/.test(parsed.meter) ? parsed.meter : '4/4';
    const events = quantizeAndPad(parsed.events, meter);
    const placed = assignFingering(events);
    if (!placed.notes.some((n) => !n.rest)) throw new ImportMessage('לא נמצאו תווים שאפשר לנגן על הבוזוקי.');
    const shifted = placed.shift !== 0;
    const title = (parsed.title || '').trim() || baseName(filename);
    let subtitle = (shifted ? 'הותאם לטווח הבוזוקי · ' : 'מהקובץ · ') + baseName(filename);
    if (events.truncated) subtitle += ' · תחילת הקובץ';
    return {
      id: 'upload-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6),
      titleHe: title,
      titleGr: '',
      subtitle,
      dromos: 'מנגינה',
      meter,
      bpm: clamp(Math.round(parsed.bpm || 96), 40, 200),
      rhythmId: rhythmFor(meter),
      sections: [{ id: 'all', nameHe: 'השיר', startMeasure: 1 }],
      notes: placed.notes,
      uploaded: true,
      createdAt: Date.now(),
    };
  }

  async function parseBytes(filename, bytes) {
    const ext = (String(filename).split('.').pop() || '').toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'tif', 'tiff', 'pdf', 'heic'].includes(ext)) {
      throw new ImportMessage('מצילום או PDF אי אפשר לקרוא תווים כאן. ייצאו MusicXML מ־MuseScore (קובץ ← ייצוא ← MusicXML) והעלו את הקובץ.');
    }
    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (ext === 'mid' || ext === 'midi') return toSong(filename, parseMidi(data));
    if (ext === 'mxl') return toSong(filename, await parseMxl(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)));
    const text = new TextDecoder().decode(data);
    if (ext === 'abc') return toSong(filename, parseAbc(text));
    if (ext === 'txt') {
      if (/\bK:\s*[A-G]/.test(text)) return toSong(filename, parseAbc(text));
      throw new ImportMessage('קובץ הטקסט אינו ABC. העלו MusicXML, MIDI או ABC.');
    }
    if (ext === 'xml' || ext === 'musicxml') return toSong(filename, parseXmlString(text));
    if (data.length > 4 && ascii(data, 0, 4) === 'MThd') return toSong(filename, parseMidi(data));
    if (/<score-partwise|<score-timewise/.test(text)) return toSong(filename, parseXmlString(text));
    if (/\bK:\s*[A-G]/.test(text)) return toSong(filename, parseAbc(text));
    throw new ImportMessage('הפורמט לא נתמך. העלו MusicXML ‏(.musicxml, .xml, .mxl), MIDI ‏(.mid) או ABC.');
  }

  async function parseFile(file) {
    const buf = await file.arrayBuffer();
    return parseBytes(file.name || 'מנגינה', new Uint8Array(buf));
  }

  /* ---------- שמירה מקומית ---------- */

  function openDb() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('no idb'));
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  function lsRead() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; }
  }
  function lsWrite(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) { /* מלא */ }
  }

  async function list() {
    try {
      const db = await openDb();
      const rows = await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return rows.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
    } catch (e) {
      return lsRead();
    }
  }

  async function save(song) {
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(song);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) {
      const rows = lsRead().filter((s) => s.id !== song.id);
      rows.push(song);
      lsWrite(rows);
    }
  }

  async function remove(id) {
    try {
      const db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (e) {
      lsWrite(lsRead().filter((s) => s.id !== id));
    }
  }

  return { parseFile, parseBytes, list, save, remove, ImportMessage };
})();
