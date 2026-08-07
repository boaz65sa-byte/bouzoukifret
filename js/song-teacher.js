/* ============================================================
   SongTeacher — "למד אותי את השיר"
   שיר (MP3/WAV) → AudioAnalyzer (מלודיה + הרמוניה) → מורה בוזוקי:
   הגריף מאיר כל תו מלודי בזמן, האקורד הנוכחי מוצג, נגן-איתי עם
   האטה, לולאה ונגינה מסונתזת של מלודיה + אקורדים.
   נשען על AudioAnalyzer, AudioEngine, drawFretboard, ChordTooltip.
   ============================================================ */
'use strict';

const SongTeacher = (() => {
  let _analysis = null;       // { bpm, chords:[{time,chord}], tabNotes:[{time,course,fret,midi,duration}] }
  let _melody = [];           // ממוין לפי time
  let _chords = [];           // ממוין לפי time
  let _duration = 0;
  let _fbSvg = null;
  let _raf = null;
  let _startCtxTime = 0;
  let _playing = false;
  let _speed = 1;
  let _withChords = true;
  let _loop = null;           // {a,b} בשניות (זמן מקורי) או null
  let _nextNoteIdx = 0;
  let _lastChordShown = -1;
  let _melCells = [];
  let _engine = 'essentia';   // 'essentia' | 'basicpitch'
  let _dromos = null;
  let _learnMode = 'da';
  let _posBase = 0;
  let _phrases = [];
  let _phraseIdx = 0;
  let _fbHost = null;
  let _rawMelody = [];
  let _vocalCtx = null;       // { title, song, videoId, vocalBlob }
  let _vocalUrl = null;
  let _vocalAudio = null;
  let _lyricAlign = null;     // { lines, phraseToLine }
  let _syncVocal = true;
  let _vocalSyncedPlay = false;
  let _lastLyricLine = -1;
  let _lastWordIdx = -1;
  let _lastHeldNoteIdx = -1;
  let _tabCols = [];
  const STR_LABELS = ['D', 'A', 'F', 'C'];
  let _manualMode = 'text';   // 'text' | 'manual'
  let _manualNotes = [];      // [{course,fret,steps}] — נבנה ע"י העורך הידני
  let _manualCourse = 0;
  let _v2On = false;
  let _v2DromosId = null;
  let _v2RootPc = 2;
  let _v2Degrees = 2;
  let _v2Dir = -1;
  let _v2Svg = null;
  let _v2Path = [];
  let _v2PlayTimer = null;
  const MANUAL_EXAMPLE =
`BPM: 96
STEP: 0.5
D: 0 . 2 . 3 . . 0
A: . 2 . . . 0 . .
F: . . . . . . . .
C: . . . . . . . .
CH: Dm . . . G . . .`;

  function _esc(s) {
    return String(s || '').replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]));
  }

  function lessonTitle() {
    return _vocalCtx?.title || 'שיר לבוזוקי';
  }

  function _isVocalLesson() { return !!_vocalCtx; }

  function playbackElapsed() {
    if (_isVocalLesson() && _syncVocal && _vocalAudio && _vocalSyncedPlay && !_vocalAudio.paused) {
      return _vocalAudio.currentTime;
    }
    return (now() - _startCtxTime) * _speed;
  }

  function melodyNoteAt(t) {
    if (!_melody.length) return null;
    let idx = 0;
    for (let i = 0; i < _melody.length; i++) {
      if (_melody[i].time <= t + 0.02) idx = i;
      else break;
    }
    const n = _melody[idx];
    const end = n.time + (n.duration || 0.28);
    const next = _melody[idx + 1];
    const until = next ? next.time : end + 0.12;
    if (t >= n.time - 0.04 && t < until) return { note: n, idx };
    return null;
  }

  /* ---------- עזרים ---------- */
  function $(s, r = document) { return r.querySelector(s); }
  function ensureAudio() { try { AudioEngine.ensureCtx(); } catch (_) {} }
  function now() { try { return AudioEngine.ctx.currentTime; } catch (_) { return 0; } }
  function fmt(t) { t = Math.max(0, t); return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0'); }

  function dedupeChords(chords) {
    const out = [];
    let last = null;
    (chords || []).forEach(c => {
      const ch = String(c.chord || '').trim();
      if (!ch || ch === 'N') return;
      if (ch !== last) { out.push({ ...c, chord: ch }); last = ch; }
    });
    return out;
  }

  function chordProgression() {
    return dedupeChords(_chords).map(c => c.chord);
  }

  function applyMelodyLayout(raw, opts = {}) {
    if (typeof FretboardScale === 'undefined' || !FretboardScale.normalizeMelody) return raw;
    const norm = opts.auto
      ? FretboardScale.normalizeMelody(raw)
      : FretboardScale.normalizeMelody(raw, { mode: _learnMode, base: _posBase });
    _learnMode = norm.mode;
    _posBase = norm.base;
    return norm.notes;
  }

  function rebuildPhrases() {
    if (!_melody.length || typeof FretboardScale === 'undefined') {
      _phrases = _melody.length ? [_melody] : [];
      rebuildLyricAlign();
      return;
    }
    _phrases = FretboardScale.splitPhrases(_melody, 0.38, 16);
    if (_phraseIdx >= _phrases.length) _phraseIdx = 0;
    rebuildLyricAlign();
  }

  function buildLyricAlign(song, phrases) {
    const lines = [];
    (song?.sections || []).forEach(sec => {
      (sec.lines || []).forEach(line => {
        const text = String(line.lyrics || '').trim();
        if (!text) return;
        lines.push({
          section: sec.name,
          lyrics: text,
          words: text.split(/\s+/).filter(Boolean),
          chords: (line.chords || []).filter(Boolean),
        });
      });
    });
    const phraseToLine = [];
    const pN = phrases?.length || 0;
    const lN = lines.length;
    if (pN && lN) {
      for (let p = 0; p < pN; p++) {
        phraseToLine[p] = Math.min(lN - 1, Math.floor((p + 0.5) * lN / pN));
      }
    }
    return { lines, phraseToLine };
  }

  function rebuildLyricAlign() {
    if (!_vocalCtx?.song) {
      _lyricAlign = null;
      return;
    }
    _lyricAlign = buildLyricAlign(_vocalCtx.song, _phrases);
  }

  function clearLyricHighlight() {
    _lastLyricLine = -1;
    _lastWordIdx = -1;
    document.querySelectorAll('.st-vocal-line-active').forEach(el => el.classList.remove('st-vocal-line-active'));
    document.querySelectorAll('.st-vocal-word-active').forEach(el => el.classList.remove('st-vocal-word-active'));
  }

  function highlightLyricPlayback(phraseIdx, noteIdxInPhrase) {
    if (!_lyricAlign?.lines?.length) return;
    const lineIdx = _lyricAlign.phraseToLine[phraseIdx];
    if (lineIdx == null) return;
    const phraseLen = (_phrases[phraseIdx] || []).length || 1;
    const words = _lyricAlign.lines[lineIdx].words.length || 1;
    const wordIdx = words <= 1
      ? 0
      : Math.min(words - 1, Math.floor((noteIdxInPhrase / phraseLen) * words));

    if (lineIdx === _lastLyricLine && wordIdx === _lastWordIdx) return;
    _lastLyricLine = lineIdx;
    _lastWordIdx = wordIdx;

    document.querySelectorAll('.st-vocal-line').forEach(el => {
      el.classList.toggle('st-vocal-line-active', parseInt(el.dataset.lyricIdx, 10) === lineIdx);
    });
    document.querySelectorAll('.st-vocal-word').forEach(el => {
      const li = parseInt(el.dataset.lyricIdx, 10);
      const wi = parseInt(el.dataset.wordIdx, 10);
      el.classList.toggle('st-vocal-word-active', li === lineIdx && wi === wordIdx);
    });
    const activeLine = document.querySelector(`.st-vocal-line[data-lyric-idx="${lineIdx}"]`);
    if (activeLine) {
      try { activeLine.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) {}
    }
  }

  function noteIndexInPhrase(globalIdx) {
    const n = _melody[globalIdx];
    if (!n) return 0;
    const pi = phraseIndexForTime(n.time);
    const phrase = _phrases[pi] || [];
    let idx = 0;
    for (let i = 0; i < phrase.length; i++) {
      const p = phrase[i];
      if (p.time === n.time && p.course === n.course && p.fret === n.fret) return i;
      if (p.time <= n.time) idx = i;
    }
    return idx;
  }

  function syncVocalAudio(elapsed, playing) {
    if (!_vocalUrl || !_syncVocal || !_vocalCtx) return;
    if (!_vocalAudio) _vocalAudio = new Audio(_vocalUrl);
    _vocalAudio.playbackRate = _speed;
    if (playing) {
      if (Math.abs(_vocalAudio.currentTime - elapsed) > 0.25) {
        _vocalAudio.currentTime = Math.max(0, elapsed);
      }
      if (_vocalAudio.paused) _vocalAudio.play().catch(() => {});
      _vocalSyncedPlay = true;
      const btn = $('#st-vocal-play');
      if (btn) btn.textContent = '⏸ עצור קול';
    }
  }

  function phraseLabel() {
    if (!_phrases.length) return '';
    const p = _phrases[_phraseIdx] || [];
    let extra = '';
    if (_lyricAlign?.phraseToLine && _lyricAlign.lines.length) {
      const li = _lyricAlign.phraseToLine[_phraseIdx];
      const text = li != null ? _lyricAlign.lines[li]?.lyrics : '';
      if (text) extra = ` · «${text.length > 36 ? text.slice(0, 36) + '…' : text}»`;
    }
    return `משפט ${_phraseIdx + 1}/${_phrases.length} · ${p.length} תווים${extra}`;
  }

  /* ============================================================
     קול שני (הרמוניה) למשפט הנוכחי — "תרגלו קטע-קטע, קול שני אוטומטי
     לכל קטע, ובסוף גם לכל השיר". בונה על FretboardScale.harmonizeMelody
     (אותו מנוע כמו DuetVoices) ומנגן בנפרד מהמנוע הראשי (לא נוגע ב-rAF
     clock/לולאה/מהירות של play() — כדי לא לסכן את הליבה הקיימת).
     ============================================================ */
  function v2Intervals() {
    const d = DROMOI.find(x => x.id === _v2DromosId) || DROMOI[0];
    return d.intervals;
  }

  function stopV2Playback() {
    if (_v2PlayTimer) { clearTimeout(_v2PlayTimer); _v2PlayTimer = null; }
  }

  function ensureV2Svg(host) {
    let svg = host.querySelector('svg.fretboard');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('fretboard', 'fs-neck-board');
      svg.setAttribute('dir', 'ltr');
      host.innerHTML = '';
      host.appendChild(svg);
    }
    return svg;
  }

  function drawV2Board(intervals, rootPc, path) {
    if (!_v2Svg || typeof drawFretboard !== 'function') return;
    const pcsSet = new Set(intervals.map(iv => normPc2(rootPc + iv)));
    const pathMap = new Map(path.filter(Boolean).map(p => [`${p.course}-${p.fret}`, p]));
    drawFretboard(_v2Svg, (ci, f, midi) => {
      const pc = normPc2(midi);
      if (!pcsSet.has(pc)) return null;
      const onPath = pathMap.get(`${ci}-${f}`);
      if (onPath) return { type: pc === normPc2(rootPc) ? 'root' : 'note', label: String(path.filter(Boolean).indexOf(onPath) + 1) };
      return { type: 'note', label: NOTE_NAMES[pc] };
    });
  }
  function normPc2(pc) { return ((pc % 12) + 12) % 12; }

  function renderV2NoteList(host, path) {
    const real = path.filter(Boolean);
    if (!real.length) { host.innerHTML = '<p class="hint">אין קול שני למשפט הזה — ודאו שהמנגינה בדרומוס שנבחר.</p>'; return; }
    host.innerHTML = path.map((n, i) => n
      ? `<span class="duet-note-chip" data-i="${i}" style="display:inline-block;padding:3px 8px;margin:2px;border-radius:6px;background:var(--card-bg,#2a2a2a);">${i + 1}. ${STR_LABELS[n.course]}·${n.fret}</span>`
      : `<span class="duet-note-chip" data-i="${i}" style="display:inline-block;padding:3px 8px;margin:2px;border-radius:6px;opacity:.4;">${i + 1}. —</span>`
    ).join('');
  }

  function updateV2Display() {
    if (!_v2On) return;
    if (!$('#st-v2-list')) return;
    const phrase = _phrases[_phraseIdx] || [];
    _v2Path = FretboardScale.harmonizeMelody(phrase, v2Intervals(), _v2RootPc, _v2Degrees * _v2Dir);
    drawV2Board(v2Intervals(), _v2RootPc, _v2Path);
    renderV2NoteList($('#st-v2-list'), _v2Path);
  }

  function setV2ChipActive(host, i, active) {
    const chip = host?.querySelector(`[data-i="${i}"]`);
    if (chip) chip.style.background = active ? 'var(--gold, #f0cc74)' : 'var(--card-bg,#2a2a2a)';
  }

  /** ניגון פשוט (לא תלוי במנוע הראשי) — קול 1 בלבד / קול 2 בלבד / ביחד,
   *  למשפט הנוכחי או לשיר כולו. */
  function playV2Sequence(paths, svgs, listHosts) {
    stopV2Playback();
    if (typeof AudioEngine === 'undefined' || !AudioEngine.pluckCourse) return;
    AudioEngine.ensureCtx();
    const len = Math.max(0, ...paths.map(p => p.length));
    if (!len) return;
    let i = 0;
    function step() {
      let maxDur = 0.3;
      paths.forEach((path, vi) => {
        if (i > 0) setV2ChipActive(listHosts[vi], i - 1, false);
        const note = path[i];
        if (!note) return;
        AudioEngine.pluckCourse(note.course, note.fret, 0, 0.55);
        if (svgs[vi] && FretboardScale.flashMidi) FretboardScale.flashMidi(svgs[vi], note.midi);
        setV2ChipActive(listHosts[vi], i, true);
        maxDur = Math.max(maxDur, note.duration || 0.3);
      });
      i++;
      if (i < len) _v2PlayTimer = setTimeout(step, maxDur * 1000);
      else _v2PlayTimer = null;
    }
    step();
  }

  function renderV2Panel(host) {
    const wrap = $('#st-v2-wrap', host);
    if (!wrap) return;
    if (!_v2On) {
      wrap.innerHTML = `<button type="button" class="btn secondary" id="st-v2-toggle">🎵 הצג קול שני (הרמוניה) למשפט הנוכחי</button>`;
      $('#st-v2-toggle', wrap).addEventListener('click', () => { _v2On = true; renderV2Panel(host); });
      return;
    }
    if (_v2DromosId == null) {
      _v2DromosId = _dromos?.dromos?.id || DROMOI[0].id;
      _v2RootPc = _dromos?.root ?? 2;
    }
    wrap.innerHTML = `
      <div class="st-load-row" style="flex-wrap:wrap;gap:8px;">
        <label>דרומוס: <select id="st-v2-dromos" class="ctrl-select">${DROMOI.map(d => `<option value="${d.id}"${d.id === _v2DromosId ? ' selected' : ''}>${d.nameHe}</option>`).join('')}</select></label>
        <label>שורש: <select id="st-v2-root" class="ctrl-select">${NOTE_NAMES.map((n, i) => `<option value="${i}"${i === _v2RootPc ? ' selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>מרחק: <select id="st-v2-deg" class="ctrl-select">${[2, 3, 4, 5, 6].map(v => `<option value="${v}"${v === _v2Degrees ? ' selected' : ''}>${v} דרגות</option>`).join('')}</select></label>
        <label>כיוון: <select id="st-v2-dir" class="ctrl-select"><option value="-1"${_v2Dir === -1 ? ' selected' : ''}>מתחת</option><option value="1"${_v2Dir === 1 ? ' selected' : ''}>מעל</option></select></label>
        <button type="button" class="btn small secondary" id="st-v2-off">✕ כבה</button>
      </div>
      <div id="st-v2-board" style="margin-top:8px;"></div>
      <div id="st-v2-list" class="duet-note-list"></div>
      <div class="st-load-row" style="gap:8px;margin-top:8px;">
        <button type="button" class="btn small secondary" id="st-v2-play1">▶ קול 1 (משפט)</button>
        <button type="button" class="btn small secondary" id="st-v2-play2">▶ קול 2 (משפט)</button>
        <button type="button" class="btn small gold" id="st-v2-playboth">▶▶ ביחד (משפט)</button>
        <button type="button" class="btn small gold" id="st-v2-playsong">▶▶ ביחד (כל השיר)</button>
        <button type="button" class="btn small secondary" id="st-v2-stop">⏹ עצור</button>
      </div>`;
    _v2Svg = ensureV2Svg($('#st-v2-board', wrap));

    $('#st-v2-dromos', wrap).addEventListener('change', e => { _v2DromosId = e.target.value; updateV2Display(); });
    $('#st-v2-root', wrap).addEventListener('change', e => { _v2RootPc = parseInt(e.target.value, 10); updateV2Display(); });
    $('#st-v2-deg', wrap).addEventListener('change', e => { _v2Degrees = parseInt(e.target.value, 10); updateV2Display(); });
    $('#st-v2-dir', wrap).addEventListener('change', e => { _v2Dir = parseInt(e.target.value, 10); updateV2Display(); });
    $('#st-v2-off', wrap).addEventListener('click', () => { stopV2Playback(); _v2On = false; renderV2Panel(host); });
    $('#st-v2-play1', wrap).addEventListener('click', () => {
      playV2Sequence([_phrases[_phraseIdx] || []], [_v2Svg], [$('#st-v2-list')]);
    });
    $('#st-v2-play2', wrap).addEventListener('click', () => {
      playV2Sequence([_v2Path], [_v2Svg], [$('#st-v2-list')]);
    });
    $('#st-v2-playboth', wrap).addEventListener('click', () => {
      playV2Sequence([_phrases[_phraseIdx] || [], _v2Path], [_fbSvg, _v2Svg], [null, $('#st-v2-list')]);
    });
    $('#st-v2-playsong', wrap).addEventListener('click', () => {
      const fullV2 = FretboardScale.harmonizeMelody(_melody, v2Intervals(), _v2RootPc, _v2Degrees * _v2Dir);
      playV2Sequence([_melody, fullV2], [_fbSvg, _v2Svg], [null, null]);
    });
    $('#st-v2-stop', wrap).addEventListener('click', stopV2Playback);

    updateV2Display();
  }

  function learnHint() {
    if (_learnMode === 'd') return `מיתר D בלבד · קופסה סריגים ${_posBase}–${_posBase + 4} · מיתר פתוח כשאפשר.`;
    if (_learnMode === 'da') return `χιγκίζ — מיתרים D+A · תיבה ${_posBase}–${_posBase + 4} · מעבר מיתר קרוב, לא ריצה ארוכה.`;
    return `תיבת פוזיציה D+A · סריגים ${_posBase}–${_posBase + 4} · אצבע 1 על סריג הבסיס.`;
  }
  function chordShape(name) {
    if (typeof CHORDS === 'undefined') return null;
    let key = name;
    if (typeof ChordTooltip !== 'undefined' && ChordTooltip.resolveKey) key = ChordTooltip.resolveKey(name) || name;
    return (CHORDS[key] && Array.isArray(CHORDS[key].shape)) ? CHORDS[key].shape : null;
  }

  /* ============================================================
     טעינה וניתוח
     ============================================================ */
  async function analyzeFile(file) {
    if (!file) return;
    setStatus('מפענח אודיו…', 5);
    try {
      const buf = await file.arrayBuffer();
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await ctx.decodeAudioData(buf);
      try { ctx.close(); } catch (_) {}
      if (_engine === 'basicpitch' && typeof BasicPitchEngine !== 'undefined') {
        try {
          _analysis = await BasicPitchEngine.transcribe(audioBuffer, setStatus);
        } catch (ePitch) {
          setStatus('Basic Pitch נכשל — חוזר ל-Essentia… (' + (ePitch.message || ePitch) + ')', 10);
          _analysis = await AudioAnalyzer.analyze(audioBuffer, setStatus);
        }
      } else {
        if (typeof AudioAnalyzer === 'undefined' || !AudioAnalyzer.analyze) {
          setStatus('מנוע הניתוח לא זמין', 0); return;
        }
        _analysis = await AudioAnalyzer.analyze(audioBuffer, setStatus);
      }
      ingest(_analysis);
      setStatus('מוכן — לחצו ▶ ללמוד', 100);
      renderLesson();
    } catch (e) {
      setStatus('שגיאה בניתוח: ' + (e.message || e), 0);
    }
  }

  // קליטת ניתוח קיים (למשל מ-SongAnalyzer)
  function loadAnalysis(analysis) {
    if (!analysis) return;
    _vocalCtx = null;
    _lyricAlign = null;
    revokeVocalUrl();
    _analysis = analysis;
    ingest(analysis);
    renderLesson();
  }

  function revokeVocalUrl() {
    if (_vocalAudio) {
      try { _vocalAudio.pause(); } catch (_) {}
      _vocalAudio = null;
    }
    if (_vocalUrl) {
      URL.revokeObjectURL(_vocalUrl);
      _vocalUrl = null;
    }
  }

  /** שיעור ממלודיית שירה + הרמוניה (Φωνή→Bridge) */
  function loadVocalLesson({ analysis, title, song, vocalBlob, backingBlob, videoId }) {
    if (!analysis) return;
    revokeVocalUrl();
    _vocalCtx = {
      title: title || 'Φωνή→Bridge',
      song: song || null,
      videoId: videoId || '',
      harmonySources: analysis.vocalMeta?.harmonySources || [],
    };
    _withChords = (analysis.chords?.length || 0) > 0;
    _learnMode = 'da';
    _syncVocal = true;
    if (vocalBlob) {
      _vocalUrl = URL.createObjectURL(vocalBlob);
    }
    _analysis = { ...analysis, engine: analysis.engine || 'vocal-bridge' };
    ingest(_analysis);
    const chordHint = _chords.length ? ` · ${_chords.length} אקורדים` : '';
    setStatus(`מוכן — מלודיה מהזמר${chordHint}`, 100);
    renderLesson();
  }

  function renderVocalLyrics(song) {
    rebuildLyricAlign();
    if (!_lyricAlign?.lines?.length) {
      return `<div class="card st-vocal-lyrics"><p class="hint">אין מילים במאגר לשיר זה — המלודיה על הגריף בלבד.</p></div>`;
    }
    const esc = s => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
    let lastSec = '';
    const parts = [];
    _lyricAlign.lines.forEach((line, i) => {
      if (line.section !== lastSec) {
        lastSec = line.section;
        parts.push(`<div class="st-vocal-sec"><div class="st-vocal-sec-name">[${esc(line.section)}]</div>`);
      }
      const greek = /[Ͱ-Ͽ]/.test(line.lyrics);
      const chords = line.chords.length ? `<span class="st-vocal-chords">${esc(line.chords.join(' · '))}</span>` : '';
      const wordsHtml = line.words.map((w, wi) =>
        `<span class="st-vocal-word" data-lyric-idx="${i}" data-word-idx="${wi}">${esc(w)}</span>`,
      ).join(' ');
      const mapped = _lyricAlign.phraseToLine.includes(i);
      parts.push(`<div class="st-vocal-line${greek ? ' st-vocal-greek' : ''}${mapped ? '' : ' st-vocal-line-dim'}" data-lyric-idx="${i}" dir="${greek ? 'ltr' : 'rtl'}">
        ${chords}
        <span class="st-vocal-text">${wordsHtml}</span>
      </div>`);
      const nextSec = _lyricAlign.lines[i + 1]?.section;
      if (nextSec !== line.section) parts.push('</div>');
    });
    if (!parts[parts.length - 1]?.endsWith('</div>')) parts.push('</div>');

    return `<div class="card st-vocal-lyrics">
      <div class="st-fb-title">מילות השיר — מסונכרנות לנגינה</div>
      <p class="hint">השורה והמילה המודגשות עוקבות אחרי המלודיה על הגריף. לחצו ▶ למד / נגן.</p>
      <div class="st-vocal-scroll" id="st-vocal-scroll">${parts.join('')}</div>
    </div>`;
  }

  function playVocalStem() {
    if (!_vocalUrl) return;
    ensureAudio();
    if (!_vocalAudio) _vocalAudio = new Audio(_vocalUrl);
    _vocalSyncedPlay = false;
    if (_vocalAudio.paused) {
      _vocalAudio.currentTime = 0;
      _vocalAudio.play().catch(() => {});
      const btn = $('#st-vocal-play');
      if (btn) btn.textContent = '⏸ עצור קול';
    } else {
      _vocalAudio.pause();
      const btn = $('#st-vocal-play');
      if (btn) btn.textContent = '🎤 שמע קול הזמר';
    }
  }

  function ingest(a) {
    _rawMelody = (a.tabNotes || []).slice().sort((x, y) => x.time - y.time);
    if (typeof FretboardScale !== 'undefined' && FretboardScale.normalizeMelody) {
      const norm = FretboardScale.normalizeMelody(_rawMelody, {
        mode: _isVocalLesson() ? 'da' : undefined,
      });
      _melody = norm.notes;
      if (!_vocalCtx) {
        _learnMode = norm.mode || _learnMode;
        _posBase = norm.base ?? _posBase;
      } else {
        _learnMode = 'da';
        _posBase = norm.base ?? _posBase;
      }
    } else {
      _melody = _rawMelody;
    }
    _chords = dedupeChords((a.chords || []).slice().sort((x, y) => x.time - y.time));
    if (typeof AudioAnalyzer !== 'undefined' && AudioAnalyzer.detectDromos) {
      _dromos = AudioAnalyzer.detectDromos(_chords, _melody);
    } else {
      _dromos = null;
    }
    rebuildPhrases();
    _phraseIdx = 0;
    const lastMel = _melody.length ? _melody[_melody.length - 1].time + (_melody[_melody.length - 1].duration || 0.3) : 0;
    const lastCh = _chords.length ? _chords[_chords.length - 1].time + 1 : 0;
    _duration = Math.max(lastMel, lastCh, 1);
    _loop = null;
    if (_analysis) {
      _analysis.tabNotes = _melody;
      _analysis.chords = _chords;
      _analysis.dromosMatch = _dromos;
    }
  }

  /* ============================================================
     מנוע נגינה — ציר זמן מסונכרן (rAF)
     ============================================================ */
  function play() {
    if (!_melody.length && !_chords.length) { setStatus('אין מה לנגן — נתחו שיר תחילה', 0); return; }
    ensureAudio();
    stop();
    _playing = true;
    _nextNoteIdx = firstIndexAt(_loop ? _loop.a : 0);
    _lastChordShown = -1;
    _lastHeldNoteIdx = -1;
    const startElapsed = _loop ? _loop.a : 0;
    if (_isVocalLesson() && _vocalUrl && _syncVocal) {
      if (!_vocalAudio) _vocalAudio = new Audio(_vocalUrl);
      _vocalAudio.currentTime = startElapsed;
      _vocalSyncedPlay = true;
    }
    _startCtxTime = now() - startElapsed / _speed;
    if (typeof registerPlayback === 'function') registerPlayback('song-teacher', stop);
    setPlayBtn(true);
    clearLyricHighlight();
    syncVocalAudio(startElapsed, true);
    loop();
  }

  function firstIndexAt(t) {
    let i = 0;
    while (i < _melody.length && _melody[i].time < t) i++;
    return i;
  }

  function loop() {
    if (!_playing) return;
    const elapsed = playbackElapsed();

    // לולאה / סיום
    const end = _loop ? _loop.b : _duration;
    if (elapsed >= end) {
      if (_loop || true) {
        const restart = _loop ? _loop.a : 0;
        if (_isVocalLesson() && _vocalAudio && _syncVocal) {
          _vocalAudio.currentTime = restart;
        } else {
          _startCtxTime = now() - restart / _speed;
        }
        _nextNoteIdx = firstIndexAt(restart);
        _lastChordShown = -1;
        _lastHeldNoteIdx = -1;
        clearActiveDots();
        clearLyricHighlight();
      }
    }

    syncVocalAudio(elapsed, true);

    if (_isVocalLesson()) {
      updateVocalFretboard(elapsed);
    }

    // תווי מלודיה שהגיע זמנם
    while (_nextNoteIdx < _melody.length && _melody[_nextNoteIdx].time <= elapsed) {
      const n = _melody[_nextNoteIdx];
      if (!_loop || (n.time >= _loop.a && n.time <= _loop.b)) {
        const pi = phraseIndexForTime(n.time);
        const ni = noteIndexInPhrase(_nextNoteIdx);
        ensurePhraseVisible(_nextNoteIdx);
        highlightLyricPlayback(pi, ni);
        if (!_isVocalLesson()) {
          AudioEngine.pluckCourse(n.course, n.fret, 0, 0.6);
          flashDot(n.course, n.fret);
        }
        highlightMelCell(_nextNoteIdx);
      }
      _nextNoteIdx++;
    }

    // אקורד נוכחי
    let ci = -1;
    for (let i = 0; i < _chords.length; i++) { if (_chords[i].time <= elapsed) ci = i; else break; }
    if (ci !== _lastChordShown) {
      _lastChordShown = ci;
      if (ci >= 0) {
        showChord(_chords[ci].chord);
        if (_withChords) {
          const sh = chordShape(_chords[ci].chord);
          if (sh) AudioEngine.strumChord(sh, 'd', 0, 0.32); // ליווי שקט
        }
      }
    }

    // קו זמן
    updateProgress(elapsed);
    _raf = requestAnimationFrame(loop);
  }

  function stop() {
    _playing = false;
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    clearActiveDots();
    clearLyricHighlight();
    setPlayBtn(false);
    if (_vocalAudio && _vocalSyncedPlay) {
      try { _vocalAudio.pause(); } catch (_) {}
      _vocalSyncedPlay = false;
      const btn = $('#st-vocal-play');
      if (btn) btn.textContent = '🎤 שמע קול הזמר';
    }
    if (typeof unregisterPlayback === 'function') unregisterPlayback('song-teacher');
  }

  function togglePlay() { _playing ? stop() : play(); }

  function phraseIndexForTime(t) {
    for (let i = 0; i < _phrases.length; i++) {
      const p = _phrases[i];
      if (!p.length) continue;
      const end = p[p.length - 1].time + (p[p.length - 1].duration || 0.3);
      if (t >= p[0].time - 0.05 && t <= end + 0.05) return i;
    }
    return _phraseIdx;
  }

  function ensurePhraseVisible(globalIdx) {
    const n = _melody[globalIdx];
    if (!n) return;
    const pi = phraseIndexForTime(n.time);
    if (pi !== _phraseIdx) {
      _phraseIdx = pi;
      renderFretboard();
      buildTabScore();
      const lbl = $('#st-phrase-label');
      if (lbl) lbl.textContent = phraseLabel();
      highlightLyricPlayback(pi, 0);
    }
  }

  /* ============================================================
     ויזואליה
     ============================================================ */
  function melodyPositions() {
    const set = {};
    const view = _phrases[_phraseIdx] || _melody;
    view.forEach((n, i) => {
      set[n.course + '-' + n.fret] = { ...n, step: i + 1 };
    });
    return set;
  }

  function renderFretboard() {
    const host = $('#st-fb-host');
    if (!host || !_melody.length) return;
    _fbHost = host;
    const phraseNotes = (_phrases[_phraseIdx] || _melody).slice();
    if (typeof FretboardScale !== 'undefined' && FretboardScale.mountMelodyLesson) {
      FretboardScale.mountMelodyLesson(host, {
        notes: phraseNotes,
        mode: _learnMode,
        base: _posBase,
        preservePlacement: true,
        onBaseChange: b => {
          _posBase = b;
          _learnMode = 'box';
          if (FretboardScale.normalizeMelody) {
            _melody = FretboardScale.normalizeMelody(_rawMelody, { mode: 'box', base: b }).notes;
            rebuildPhrases();
          }
          renderFretboard();
        },
        onMount: res => { _fbSvg = res.svg; },
      });
      return;
    }
    _fbSvg = $('#st-fb');
    buildFretboardLegacy();
  }

  function buildFretboardLegacy() {
    if (!_fbSvg || typeof drawFretboard !== 'function') return;
    const set = melodyPositions();
    drawFretboard(_fbSvg, (ci, f) => {
      const n = set[ci + '-' + f];
      if (!n) return null;
      return { type: n.step === 1 ? 'root' : 'note', label: String(n.step || '') };
    });
  }

  function flashDot(course, fret) {
    if (!_fbSvg) return;
    _fbSvg.querySelectorAll('.st-active').forEach(d => d.classList.remove('st-active'));
    const dot = _fbSvg.querySelector(`.note-dot[data-course="${course}"][data-fret="${fret}"]`);
    if (dot) {
      dot.classList.add('st-active');
      const lbl = dot.querySelector('text');
      if (lbl) lbl.textContent = '▶';
      setTimeout(() => {
        if (_isVocalLesson() && _lastHeldNoteIdx >= 0) return;
        dot.classList.remove('st-active');
        if (lbl) {
          const view = _phrases[_phraseIdx] || [];
          const idx = view.findIndex(n => n.course === course && n.fret === fret);
          if (idx >= 0) lbl.textContent = String(idx + 1);
        }
      }, 320);
    }
  }

  function holdActiveNote(note, globalIdx) {
    if (!note || !_fbSvg) return;
    if (globalIdx === _lastHeldNoteIdx) return;
    _lastHeldNoteIdx = globalIdx;
    _fbSvg.querySelectorAll('.st-active').forEach(d => d.classList.remove('st-active'));
    const dot = _fbSvg.querySelector(`.note-dot[data-course="${note.course}"][data-fret="${note.fret}"]`);
    if (dot) {
      dot.classList.add('st-active');
      const lbl = dot.querySelector('text');
      if (lbl) lbl.textContent = '♪';
    }
    highlightMelCell(globalIdx);
    const pi = phraseIndexForTime(note.time);
    ensurePhraseVisible(globalIdx);
    highlightLyricPlayback(pi, noteIndexInPhrase(globalIdx));
  }

  function updateVocalFretboard(elapsed) {
    const hit = melodyNoteAt(elapsed);
    if (hit) {
      holdActiveNote(hit.note, hit.idx);
    } else if (_lastHeldNoteIdx >= 0) {
      _lastHeldNoteIdx = -1;
      if (_fbSvg) _fbSvg.querySelectorAll('.st-active').forEach(d => d.classList.remove('st-active'));
    }
  }
  function clearActiveDots() {
    if (_fbSvg) _fbSvg.querySelectorAll('.st-active').forEach(d => d.classList.remove('st-active'));
    _melCells.forEach(c => c.classList.remove('st-cell-active'));
    _tabCols.forEach(c => c.classList.remove('active'));
    _lastHeldNoteIdx = -1;
  }

  function showChord(name) {
    const big = $('#st-chord-name');
    const dia = $('#st-chord-dia');
    if (big) big.textContent = name || '—';
    if (dia && typeof ChordTooltip !== 'undefined' && ChordTooltip.renderInto) {
      ChordTooltip.renderInto(dia, name);
    }
  }

  function highlightMelCell(idx) {
    const cell = _melCells[idx];
    if (!cell) return;
    _melCells.forEach(c => c.classList.remove('st-cell-active'));
    cell.classList.add('st-cell-active');
    try { cell.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (_) {}
    highlightTabCol(idx);
  }

  function highlightTabCol(idx) {
    if (!_tabCols.length) return;
    _tabCols.forEach(c => c.classList.remove('active'));
    const col = _tabCols[idx];
    if (col) {
      col.classList.add('active');
      try { col.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); } catch (_) {}
    }
  }

  /** המרת מלודיה לפורמט TAB (תרגילים) עם קוונטיזציה לפי BPM */
  function melodyToTabNotes(notes, bpm, sub = 4, opts = {}) {
    const sorted = [...(notes || [])].sort((a, b) => a.time - b.time);
    if (!sorted.length) return [];
    const relative = opts.relative !== false;
    const t0 = relative ? sorted[0].time : 0;
    const beatDur = 60 / Math.max(40, bpm || 120);
    const subDur = beatDur / sub;
    const out = [];
    let lastEnd = t0;
    sorted.forEach(n => {
      const gap = n.time - lastEnd;
      if (gap > subDur * 0.55) {
        const restSteps = Math.max(1, Math.round(gap / subDur));
        out.push({ c: 0, f: 0, d: 'd', len: restSteps, rest: true });
      }
      const dur = n.duration || 0.25;
      const steps = Math.max(1, Math.round(dur / subDur));
      const ev = { c: n.course, f: n.fret, d: 'd', len: steps, rest: false };
      if (n.finger != null) ev.fing = n.finger;
      out.push(ev);
      lastEnd = n.time + dur;
    });
    return out;
  }

  /** טאב קומפקטי למשפט — עמודה אחת לכל תו, בלי שטח ריק */
  function melodyToTabNotesCompact(notes) {
    return (notes || []).map(n => ({
      c: n.course,
      f: n.fret,
      d: 'd',
      len: 1,
      rest: false,
      fing: n.finger,
    }));
  }

  function buildTabStrip() {
    const host = $('#st-tab-scroll');
    if (!host) return;
    host.innerHTML = '';
    _tabCols = [];
    const rowLabels = ['D', 'A', 'F', 'C'];
    const labels = document.createElement('div');
    labels.className = 'st-tab-labels';
    rowLabels.forEach(l => {
      const d = document.createElement('div');
      d.className = 'st-tab-label';
      d.textContent = l;
      labels.appendChild(d);
    });
    host.appendChild(labels);

    let lastPhrase = -1;
    _melody.forEach((n, idx) => {
      const pi = phraseIndexForTime(n.time);
      if (pi !== lastPhrase && lastPhrase >= 0) {
        const sep = document.createElement('div');
        sep.className = 'st-tab-phrase-sep';
        sep.title = `משפט ${pi + 1}`;
        host.appendChild(sep);
      }
      lastPhrase = pi;

      const col = document.createElement('div');
      col.className = 'st-tab-col';
      col.dataset.idx = String(idx);
      [0, 1, 2, 3].forEach((ci, r) => {
        const cell = document.createElement('div');
        cell.className = 'st-tab-cell';
        if (r === 0) cell.classList.add('top');
        if (r === 3) cell.classList.add('bot');
        if (n.course === ci) {
          cell.textContent = String(n.fret);
          cell.classList.add('has-note');
        } else {
          cell.textContent = '·';
        }
        col.appendChild(cell);
      });
      col.addEventListener('click', () => {
        ensureAudio();
        AudioEngine.pluckCourse(n.course, n.fret, 0, 0.6);
        flashDot(n.course, n.fret);
        highlightMelCell(idx);
      });
      host.appendChild(col);
      _tabCols.push(col);
    });
  }

  function buildTabScore() {
    buildAllPhraseTabs();
  }

  function buildAllPhraseTabs() {
    const host = $('#st-tab-phrases');
    if (!host || typeof drawTab !== 'function') return;
    host.innerHTML = '';
    const phrases = _phrases.length ? _phrases : [_melody];
    const bpm = _analysis?.bpm || 120;
    phrases.forEach((phrase, pi) => {
      if (!phrase?.length) return;
      const card = document.createElement('div');
      card.className = 'st-tab-phrase-card' + (pi === _phraseIdx ? ' active' : '');
      card.dataset.phraseIdx = String(pi);

      const title = document.createElement('div');
      title.className = 'st-tab-phrase-title';
      title.textContent = `משפט ${pi + 1} · ${phrase.length} תווים`;

      const wrap = document.createElement('div');
      wrap.className = 'st-tab-phrase-svg-wrap';
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.classList.add('st-tab-svg', 'st-tab-svg-phrase');
      drawTab(svg, {
        type: 'tab',
        notes: melodyToTabNotesCompact(phrase),
        sub: 4,
        bpm,
        compact: true,
      });

      wrap.appendChild(svg);
      card.appendChild(title);
      card.appendChild(wrap);
      card.addEventListener('click', () => {
        if (_phraseIdx === pi) return;
        _phraseIdx = pi;
        renderFretboard();
        buildAllPhraseTabs();
        const lbl = $('#st-phrase-label');
        if (lbl) lbl.textContent = phraseLabel();
        highlightLyricPlayback(pi, 0);
      });
      host.appendChild(card);
    });
    const activeCard = host.querySelector('.st-tab-phrase-card.active');
    if (activeCard) {
      try { activeCard.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); } catch (_) {}
    }
  }

  function drawPhraseTabSvg(phrase, bpm) {
    if (typeof drawTab !== 'function' || !phrase?.length) return '';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'st-tab-svg st-tab-svg-phrase');
    drawTab(svg, {
      type: 'tab',
      notes: melodyToTabNotesCompact(phrase),
      sub: 4,
      bpm: bpm || 120,
      compact: true,
    });
    return svg.outerHTML;
  }

  function tabSvgForPhrase(phrase, bpm) {
    return drawPhraseTabSvg(phrase, bpm);
  }

  function buildPrintHtml() {
    const title = lessonTitle();
    const bpm = _analysis?.bpm || '—';
    const prog = chordProgression();
    const dromosName = _dromos?.dromos?.nameHe || '—';
    const date = new Date().toLocaleDateString('he-IL');
    const bpmNum = _analysis?.bpm || 120;

    let lyricsHtml = '';
    if (_lyricAlign?.lines?.length) {
      lyricsHtml = '<div class="st-print-lyrics"><h2>מילות השיר</h2>'
        + _lyricAlign.lines.map(line => {
          const chords = line.chords?.length ? `<div class="st-print-ch-line">${_esc(line.chords.join(' · '))}</div>` : '';
          return `<p class="st-print-line">${chords}<span>${_esc(line.lyrics)}</span></p>`;
        }).join('')
        + '</div>';
    }

    const tabBlocks = (_phrases.length ? _phrases : [_melody]).map((phrase, pi) => {
      const svg = tabSvgForPhrase(phrase, bpmNum);
      if (!svg) return '';
      return `<section class="st-print-phrase"><h3>משפט ${pi + 1} · ${phrase.length} תווים</h3><div class="st-tab-phrase-svg-wrap">${svg}</div></section>`;
    }).join('');

    const stripRows = _melody.map(n => {
      const cells = [0, 1, 2, 3].map(ci =>
        `<td class="${n.course === ci ? 'on' : ''}">${n.course === ci ? n.fret : '·'}</td>`,
      ).join('');
      const noteName = (typeof NOTE_NAMES !== 'undefined') ? NOTE_NAMES[n.midi % 12] : '';
      return `<tr><td class="lbl">${_esc(noteName)}</td>${cells}</tr>`;
    }).join('');

    return `<article class="st-print-sheet">
      <header class="st-print-head">
        <h1>${_esc(title)}</h1>
        <p class="st-print-meta">BPM: <b>${bpm}</b> · דרומוס: <b>${_esc(dromosName)}</b> · תווים: <b>${_melody.length}</b> · ${_esc(date)}</p>
        ${prog.length ? `<p class="st-print-prog"><b>הרמוניה:</b> ${prog.map(c => `<span>${_esc(c)}</span>`).join(' ')}</p>` : ''}
        ${_vocalCtx ? '<p class="st-print-badge">🎤 Φωνή→Bridge — מלודיה מהזמר</p>' : ''}
      </header>
      ${lyricsHtml}
      <section class="st-print-tab-summary">
        <h2>טאב מלא (תו אחר תו)</h2>
        <table class="st-print-tab-table" dir="ltr">
          <thead><tr><th></th><th>D</th><th>A</th><th>F</th><th>C</th></tr></thead>
          <tbody>${stripRows}</tbody>
        </table>
      </section>
      <section class="st-print-score"><h2>טאב לפי משפטים</h2><div class="st-tab-phrases-grid">${tabBlocks}</div></section>
      <footer class="st-print-foot">בוזוקי אקדמי · bouzoukifret.vercel.app</footer>
    </article>`;
  }

  function printLesson() {
    if (!_melody.length) { alert('אין מלודיה להדפסה — נתחו שיר תחילה'); return; }
    const sheet = buildPrintHtml();
    const ifr = document.createElement('iframe');
    ifr.setAttribute('aria-hidden', 'true');
    ifr.style.cssText = 'position:fixed;right:-9999px;bottom:0;width:900px;height:700px;border:0;';
    document.body.appendChild(ifr);
    const doc = ifr.contentWindow.document;
    doc.open();
    doc.write(`<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
      <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        html,body{background:#fff;margin:0;padding:12px;font-family:'Heebo',sans-serif;color:#1a1a1a;}
        .st-print-sheet{max-width:900px;margin:0 auto;}
        .st-print-head h1{margin:0 0 8px;color:#b8860b;font-size:26px;}
        .st-print-meta,.st-print-prog{font-size:14px;color:#444;margin:6px 0;}
        .st-print-prog span{display:inline-block;margin:2px 4px;padding:2px 8px;background:#e8f4fa;border-radius:12px;font-weight:700;}
        .st-print-badge{display:inline-block;padding:4px 10px;background:#fff3d6;border:1px solid #e3b341;border-radius:6px;font-size:13px;}
        h2{font-size:18px;color:#333;margin:20px 0 10px;border-bottom:1px solid #ddd;padding-bottom:4px;}
        h3{font-size:15px;color:#555;margin:14px 0 6px;}
        .st-print-lyrics .st-print-line{margin:8px 0;line-height:1.6;}
        .st-print-ch-line{font-size:12px;color:#2a7a9b;font-family:monospace;margin-bottom:2px;}
        .st-print-tab-table{border-collapse:collapse;width:100%;font-size:12px;margin:8px 0;}
        .st-print-tab-table th,.st-print-tab-table td{border:1px solid #ccc;padding:4px 6px;text-align:center;font-family:monospace;}
        .st-print-tab-table th{background:#f5f5f5;}
        .st-print-tab-table td.on{background:#e3b341;font-weight:800;color:#1a1408;}
        .st-print-tab-table td.lbl{background:#fafafa;font-weight:700;}
        .st-tab-svg-phrase{display:block;width:auto!important;max-width:100%;height:auto!important;}
        .st-tab-phrases-grid{display:flex;flex-wrap:wrap;gap:12px;}
        .st-tab-phrase-card{flex:0 1 auto;padding:8px 10px;border:1px solid #ddd;border-radius:8px;page-break-inside:avoid;}
        .st-print-phrase{break-inside:avoid;page-break-inside:avoid;margin-bottom:16px;}
        .st-print-foot{margin-top:24px;font-size:11px;color:#999;text-align:center;}
        @page{margin:12mm;}
        *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      </style></head>
      <body>${sheet}</body></html>`);
    doc.close();
    setTimeout(() => {
      try { ifr.contentWindow.focus(); ifr.contentWindow.print(); } catch (_) {}
      setTimeout(() => ifr.remove(), 1500);
    }, 600);
  }

  function updateProgress(elapsed) {
    const bar = $('#st-prog-fill2');
    const lbl = $('#st-prog-time');
    if (bar) bar.style.width = Math.min(100, (elapsed / _duration) * 100) + '%';
    if (lbl) lbl.textContent = fmt(elapsed) + ' / ' + fmt(_duration);
  }

  function setPlayBtn(on) {
    const b = $('#st-play');
    if (b) { b.textContent = on ? '⏸ עצור' : '▶ למד / נגן'; b.classList.toggle('playing', on); }
  }

  /* ============================================================
     מסך
     ============================================================ */
  function init() {
    const el = $('#song-teacher-app');
    if (!el) return;
    renderShell(el);
  }

  /* ============================================================
     קלט ידני — טקסט טאב או עורך תו-אחר-תו (בלי אודיו, בלי AI)
     ============================================================ */
  function courseFromLabel(label) {
    const i = STR_LABELS.indexOf(String(label || '').toUpperCase());
    return i >= 0 ? i : null;
  }

  /** מפרש טקסט טאב פשוט (ראו MANUAL_EXAMPLE לפורמט) ל-{tabNotes, chords, bpm} */
  function parseTextTab(text) {
    let bpm = 90;
    let stepBeats = 0.5;
    const courseTokens = { 0: null, 1: null, 2: null, 3: null };
    let chordTokens = null;

    String(text || '').split('\n').forEach(rawLine => {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) return;
      let m = line.match(/^(BPM|STEP)\s*:\s*([\d.]+)/i);
      if (m) {
        const v = parseFloat(m[2]);
        if (m[1].toUpperCase() === 'BPM' && v > 0) bpm = v;
        else if (v > 0) stepBeats = v;
        return;
      }
      m = line.match(/^(CH|D|A|F|C)\s*:?\s*(.*)$/i);
      if (!m) return;
      const tokens = m[2].split(/[\s,]+/).filter(Boolean);
      const label = m[1].toUpperCase();
      if (label === 'CH') chordTokens = tokens;
      else courseTokens[courseFromLabel(label)] = tokens;
    });

    const maxLen = Math.max(0, ...Object.values(courseTokens).map(t => t?.length || 0), chordTokens?.length || 0);
    if (!maxLen) throw new Error('לא נמצאו שורות D/A/F/C עם תווים');
    const stepDur = stepBeats * (60 / bpm);

    const tabNotes = [];
    for (let i = 0; i < maxLen; i++) {
      [0, 1, 2, 3].forEach(ci => {
        const tok = courseTokens[ci]?.[i];
        if (tok == null || tok === '.' || tok === '-') return;
        if (!/^\d+$/.test(tok)) return;
        const fret = parseInt(tok, 10);
        tabNotes.push({ time: i * stepDur, course: ci, fret, midi: TUNING[ci].midi + fret, duration: stepDur });
      });
    }
    if (!tabNotes.length) throw new Error('לא נמצאו מספרי סריג בשורות D/A/F/C — רק נקודות/מקפים');

    const chords = [];
    let lastChord = null;
    if (chordTokens) {
      chordTokens.forEach((tok, i) => {
        if (!tok || tok === '.' || tok === '-') return;
        if (tok === lastChord) return;
        chords.push({ time: i * stepDur, chord: tok });
        lastChord = tok;
      });
    }
    return { tabNotes, chords, bpm };
  }

  function manualNotesToLesson() {
    let t = 0;
    const bpmInput = $('#st-manual-bpm');
    const bpm = Math.max(20, parseInt(bpmInput?.value, 10) || 90);
    const stepDur = 0.5 * (60 / bpm);
    const tabNotes = _manualNotes.map(n => {
      const dur = (n.steps || 1) * stepDur;
      const entry = n.rest ? null : { time: t, course: n.course, fret: n.fret, midi: TUNING[n.course].midi + n.fret, duration: dur };
      t += dur;
      return entry;
    }).filter(Boolean);
    return { tabNotes, chords: [], bpm };
  }

  function renderManualNotesList() {
    const host = $('#st-manual-list');
    if (!host) return;
    if (!_manualNotes.length) {
      host.innerHTML = '<p class="hint">עדיין לא הוספתם תווים — בחרו מיתר, סריג, ולחצו "הוסף תו".</p>';
      return;
    }
    host.innerHTML = _manualNotes.map((n, i) => `
      <span class="st-manual-chip">
        ${n.rest ? '⏸ מנוחה' : `${STR_LABELS[n.course]} · סריג ${n.fret}`}
        <button type="button" class="st-manual-del" data-i="${i}" title="הסר">✕</button>
      </span>`).join('');
    host.querySelectorAll('.st-manual-del').forEach(b => b.addEventListener('click', () => {
      _manualNotes.splice(parseInt(b.dataset.i, 10), 1);
      renderManualNotesList();
    }));
  }

  function tryLoadManualResult(result, host) {
    try {
      loadAnalysis({ ...result, engine: 'manual-tab' });
      setStatus('השיעור נבנה מהקלט הידני שלכם', 100);
      if (host) host.textContent = '';
    } catch (err) {
      if (host) host.textContent = 'שגיאה: ' + (err.message || err);
    }
  }

  function renderManualPanel(el) {
    const panel = $('#st-manual-panel', el);
    if (!panel) return;
    panel.innerHTML = `
      <div class="st-load-row">
        <button type="button" class="btn small st-manual-mode ${_manualMode === 'text' ? 'active' : ''}" data-m="text">📝 טקסט טאב</button>
        <button type="button" class="btn small st-manual-mode ${_manualMode === 'manual' ? 'active' : ''}" data-m="manual">🖱️ בנייה ידנית תו-אחר-תו</button>
      </div>
      <div id="st-manual-body"></div>`;
    panel.querySelectorAll('.st-manual-mode').forEach(b => b.addEventListener('click', () => {
      _manualMode = b.dataset.m;
      renderManualPanel(el);
    }));
    const body = $('#st-manual-body', el);
    if (_manualMode === 'text') renderTextTabUI(body);
    else renderManualBuilderUI(body);
  }

  function renderTextTabUI(body) {
    body.innerHTML = `
      <p class="hint">כתבו שורה לכל מיתר (D/A/F/C — מדק לעבה), מספר-סריג בכל "עמודה", נקודה = בלי תו. אפשר גם שורת אקורדים (CH) ו-BPM/STEP:</p>
      <textarea id="st-manual-text" class="st-manual-textarea" rows="8" placeholder="${_esc(MANUAL_EXAMPLE)}"></textarea>
      <div class="st-load-row" style="flex-wrap:wrap;align-items:center;">
        <button type="button" class="btn small secondary" id="st-manual-example">💡 מלא דוגמה</button>
        <label class="btn small secondary" style="cursor:pointer;">📂 העלה קובץ טאב (.txt)
          <input type="file" id="st-manual-file" accept=".txt" style="display:none;">
        </label>
        <button type="button" class="btn gold" id="st-manual-parse">🎓 טען לשיעור</button>
      </div>
      <p id="st-manual-err" class="hint" style="color:var(--danger,#e66);"></p>`;
    $('#st-manual-example', body).addEventListener('click', () => { $('#st-manual-text', body).value = MANUAL_EXAMPLE; });
    $('#st-manual-file', body).addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => { $('#st-manual-text', body).value = String(evt.target.result || ''); };
      reader.readAsText(file);
    });
    $('#st-manual-parse', body).addEventListener('click', () => {
      const errHost = $('#st-manual-err', body);
      errHost.textContent = '';
      try {
        const result = parseTextTab($('#st-manual-text', body).value);
        tryLoadManualResult(result, errHost);
      } catch (err) {
        errHost.textContent = 'שגיאה: ' + (err.message || err);
      }
    });
  }

  function renderManualBuilderUI(body) {
    body.innerHTML = `
      <p class="hint">בחרו מיתר וסריג, הוסיפו תו-אחר-תו — בדיוק כמו שהייתם מקלידים טאב, רק בלחיצות.</p>
      <div class="st-load-row">
        ${STR_LABELS.map((l, i) => `<button type="button" class="btn small st-manual-course${i === _manualCourse ? ' active' : ''}" data-c="${i}">${l}</button>`).join('')}
        <label>סריג: <input type="number" id="st-manual-fret" min="0" max="15" value="0" style="width:56px;"></label>
        <label>משך (פסיעות): <input type="number" id="st-manual-steps" min="0.5" max="8" step="0.5" value="1" style="width:56px;"></label>
      </div>
      <div class="st-load-row">
        <button type="button" class="btn small" id="st-manual-add">➕ הוסף תו</button>
        <button type="button" class="btn small secondary" id="st-manual-rest">⏸ הוסף מנוחה</button>
        <button type="button" class="btn small secondary" id="st-manual-undo">↺ הסר אחרון</button>
        <label>BPM: <input type="number" id="st-manual-bpm" min="20" max="220" value="90" style="width:64px;"></label>
      </div>
      <div id="st-manual-list" class="st-manual-list"></div>
      <div class="st-load-row">
        <button type="button" class="btn gold" id="st-manual-build">🎓 טען לשיעור</button>
      </div>
      <p id="st-manual-err2" class="hint" style="color:var(--danger,#e66);"></p>`;
    body.querySelectorAll('.st-manual-course').forEach(b => b.addEventListener('click', () => {
      _manualCourse = parseInt(b.dataset.c, 10);
      body.querySelectorAll('.st-manual-course').forEach(x => x.classList.toggle('active', x === b));
    }));
    $('#st-manual-add', body).addEventListener('click', () => {
      const fret = Math.max(0, Math.min(15, parseInt($('#st-manual-fret', body).value, 10) || 0));
      const steps = Math.max(0.5, parseFloat($('#st-manual-steps', body).value) || 1);
      _manualNotes.push({ course: _manualCourse, fret, steps });
      renderManualNotesList();
    });
    $('#st-manual-rest', body).addEventListener('click', () => {
      const steps = Math.max(0.5, parseFloat($('#st-manual-steps', body).value) || 1);
      _manualNotes.push({ rest: true, steps });
      renderManualNotesList();
    });
    $('#st-manual-undo', body).addEventListener('click', () => { _manualNotes.pop(); renderManualNotesList(); });
    $('#st-manual-build', body).addEventListener('click', () => {
      const errHost = $('#st-manual-err2', body);
      errHost.textContent = '';
      if (!_manualNotes.some(n => !n.rest)) { errHost.textContent = 'הוסיפו לפחות תו אחד (לא רק מנוחות).'; return; }
      tryLoadManualResult(manualNotesToLesson(), errHost);
    });
    renderManualNotesList();
  }

  function renderShell(el) {
    el.innerHTML = `
      <div class="card st-load">
        <h2 class="st-h">למד אותי את השיר</h2>
        <p class="st-hint">העלו MP3/WAV — האפליקציה תחלץ <b>מלודיה</b> ו<b>אקורדים</b>, ותלמד אתכם לנגן: הגריף יאיר כל תו, האקורד יוצג, ותוכלו להאט וללופ.</p>
        <div class="st-load-row">
          <input type="file" id="st-file" accept="audio/*" placeholder="בחרו קובץ אודיו">
          <span id="st-status" class="st-status"></span>
        </div>
        <div class="st-load-row" style="gap:0; align-items:center;"><span style="color:var(--text-dim);font-size:12px;">או:</span></div>
        <div class="st-load-row">
          <input type="file" id="st-json" accept=".json" placeholder="או טענו ניתוח שמור (JSON)">
          <span style="color:var(--text-dim);font-size:12px;">טענו שיר שהורדתם</span>
        </div>
        <div class="st-load-row st-engine-row">
          <span>מנוע תמלול:</span>
          <button class="btn small st-engine active" data-e="essentia">Essentia (מהיר)</button>
          <button class="btn small st-engine" data-e="basicpitch">Basic Pitch · ML (מדויק, הורדת מודל)</button>
        </div>
        <div class="st-prog"><div class="st-prog-bar"><div id="st-prog-fill"></div></div></div>
        <p class="st-hint st-tip">💡 לדיוק מלודיה גבוה יותר — בודדו קודם את הכלי המוביל ב"ניתוח שיר" (stem separation), ואז העלו את הקובץ המבודד לכאן.</p>
        <div class="st-load-row" style="gap:0; align-items:center;"><span style="color:var(--text-dim);font-size:12px;">או — בלי קובץ אודיו בכלל:</span></div>
        <div id="st-manual-panel"></div>
      </div>
      <div id="st-lesson"></div>`;
    renderManualPanel(el);
    $('#st-file', el).addEventListener('change', e => { if (e.target.files[0]) analyzeFile(e.target.files[0]); });
    const jsonInput = $('#st-json', el);
    if (jsonInput) {
      jsonInput.addEventListener('change', e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result);
            if (data.chords && data.tabNotes) {
              loadAnalysis({ chords: data.chords, tabNotes: data.tabNotes, bpm: data.bpm, engine: data.engine });
              setStatus('הניתוח נטען בהצלחה', 100);
            } else throw new Error('פורמט JSON לא תקין');
          } catch (err) { setStatus('שגיאה בטעינה: ' + (err.message || err), 0); }
        };
        reader.readAsText(file);
      });
    }
    el.querySelectorAll('.st-engine').forEach(b => b.addEventListener('click', () => {
      _engine = b.dataset.e;
      el.querySelectorAll('.st-engine').forEach(x => x.classList.toggle('active', x === b));
    }));
  }

  function setStatus(msg, pct) {
    const s = $('#st-status');
    if (s) s.textContent = msg || '';
    if (typeof pct === 'number') { const f = $('#st-prog-fill'); if (f) f.style.width = pct + '%'; }
  }

  function renderLesson() {
    const host = $('#st-lesson');
    if (!host) return;
    const a = _analysis || {};
    const prog = chordProgression();
    const dromosName = _dromos?.dromos?.nameHe || '—';
    const dromosConf = _dromos?.confidence ? Math.round(_dromos.confidence) + '%' : '—';

    const vocalBanner = _vocalCtx ? `
      <div class="card st-vocal-banner">
        <strong>🎤 Φωνή→Bridge</strong>
        <span class="hint">${_vocalCtx.title || ''} · הגריף עוקב אחרי קו השירה${_vocalCtx.harmonySources?.length ? ' · ' + _vocalCtx.harmonySources.join(' · ') : ''}</span>
        ${_vocalUrl ? '<button type="button" class="btn small gold" id="st-vocal-play">🎤 שמע קול הזמר</button>' : ''}
        ${_vocalUrl ? `<label class="st-toggle"><input type="checkbox" id="st-sync-vocal" ${_syncVocal ? 'checked' : ''}> סנכרן קול עם נגינה</label>` : ''}
      </div>` : '';

    host.innerHTML = `
      ${vocalBanner}
      ${(_vocalCtx?.song) ? renderVocalLyrics(_vocalCtx.song) : ''}
      <div class="card st-info">
        <span>BPM: <b>${a.bpm || '—'}</b></span>
        <span>תווי מלודיה: <b>${_melody.length}</b></span>
        <span>אקורדים: <b>${_chords.length}</b></span>
        <span>מנוע: <b>${a.engine || '—'}</b></span>
      </div>

      <div class="card st-harmony">
        <div class="st-harmony-row">
          <span class="st-harm-label">דרומוס (מודוס):</span>
          <strong class="st-dromos-name">${dromosName}</strong>
          <span class="hint">ביטחון ${dromosConf}</span>
        </div>
        <div class="st-harmony-row">
          <span class="st-harm-label">הרמוניה (מסלול אקורדים):</span>
          <div class="st-chord-prog">${prog.length ? prog.map(c => `<span class="st-chord-chip">${c}</span>`).join('') : '<span class="hint">לא זוהו</span>'}</div>
        </div>
        <p class="hint st-teach-hint">${learnHint()}</p>
      </div>

      <div class="card st-chordbox">
        <div class="st-chord-cur">
          <div class="st-chord-label">אקורד נוכחי</div>
          <div id="st-chord-name" class="st-chord-name">—</div>
        </div>
        <div id="st-chord-dia" class="st-chord-dia"></div>
      </div>

      <div class="card st-fbwrap">
        <div class="st-fb-title">${_vocalCtx ? 'מלודיית השירה על הגריף — עוקב אחרי הקול בזמן אמת' : 'מלודיה על הגריף — מספרים = סדר הנגינה בפוזיציה אחת'}</div>
        <div class="st-row st-phrase-nav">
          <button type="button" class="btn small secondary" id="st-phrase-prev" ${_phraseIdx <= 0 ? 'disabled' : ''}>◀ משפט קודם</button>
          <span id="st-phrase-label" class="st-phrase-label">${phraseLabel()}</span>
          <button type="button" class="btn small secondary" id="st-phrase-next" ${_phraseIdx >= _phrases.length - 1 ? 'disabled' : ''}>משפט הבא ▶</button>
        </div>
        <div class="st-row st-learn-modes">
          <button type="button" class="btn small st-learn-mode ${_learnMode === 'da' ? 'active' : ''}" data-m="da">מיתרים D+A (1–2)</button>
          <button type="button" class="btn small st-learn-mode ${_learnMode === 'd' ? 'active' : ''}" data-m="d">מיתר D בלבד</button>
          <button type="button" class="btn small st-learn-mode ${_learnMode === 'box' ? 'active' : ''}" data-m="box">תיבת χιγκίζ (D+A)</button>
        </div>
        <div id="st-fb-host" class="st-fb-scroll" dir="ltr"></div>
      </div>

      <div class="card st-v2-card">
        <div class="st-fb-title">🎵 קול שני למשפט הנוכחי</div>
        <p class="hint">תרגלו כל משפט בנפרד עם קול שני אוטומטי — כשעברתם על כל המשפטים, נגנו את כל השיר עם שני הקולות ביחד.</p>
        <div id="st-v2-wrap"></div>
      </div>

      <div class="card st-tab-wrap">
        <div class="st-fb-title">טאב ללמידה — D · A · F · C (מלמעלה למטה)</div>
        <p class="hint">כל עמודה = תו במלודיה. לחצו לשמוע. בזמן נגינה העמודה המודגשת עוקבת אחרי השיר.</p>
        <div id="st-tab-scroll" class="st-tab-scroll"></div>
        <div class="st-fb-title" style="margin-top:14px;">טאב לפי משפטים — לחצו על משפט לפתוח על הגריף</div>
        <div id="st-tab-phrases" class="st-tab-phrases-grid" dir="ltr"></div>
      </div>

      <div class="card st-melstrip-wrap">
        <div class="st-fb-title">מלודיה (תו · מיתר·סריג) — לחצו לשמוע</div>
        <div id="st-melstrip" class="st-melstrip"></div>
      </div>

      <div class="card st-transport">
        <button class="btn st-play" id="st-play">▶ למד / נגן</button>
        <div class="st-speeds">
          מהירות:
          <button class="btn small st-speed" data-s="0.5">×0.5</button>
          <button class="btn small st-speed" data-s="0.75">×0.75</button>
          <button class="btn small st-speed active" data-s="1">×1</button>
        </div>
        <label class="st-toggle"><input type="checkbox" id="st-withchords" ${_withChords ? 'checked' : ''}> ליווי אקורדים</label>
        <button class="btn small" id="st-loop">🔁 לולאה: כבוי</button>
        <div class="st-prog"><div class="st-prog-bar"><div id="st-prog-fill2"></div></div><span id="st-prog-time" class="st-prog-time">0:00 / ${fmt(_duration)}</span></div>
      </div>

      <div class="card st-export">
        <div class="st-export-row">
          <b>שמירה והדפסה:</b>
          <button class="btn small gold" id="st-print">🖨️ הדפס / שמור PDF</button>
          <button class="btn small" id="st-export-html">💾 כ-HTML (שיעור אופליין)</button>
          <button class="btn small" id="st-export-json">📋 כ-JSON (טעינה מחדש)</button>
        </div>
      </div>`;

    _fbSvg = null;
    renderFretboard();
    buildMelStrip();
    buildTabStrip();
    buildTabScore();
    bindLesson(host);
    if (_vocalCtx?.song && _lyricAlign?.lines?.length) {
      highlightLyricPlayback(_phraseIdx, 0);
    }
  }

  function buildMelStrip() {
    const host = $('#st-melstrip');
    if (!host) return;
    host.innerHTML = '';
    _melCells = [];
    _melody.forEach((n, idx) => {
      const cell = document.createElement('div');
      cell.className = 'st-mel-cell';
      cell.dataset.idx = String(idx);
      const noteName = (typeof NOTE_NAMES !== 'undefined') ? NOTE_NAMES[n.midi % 12] : '';
      const finger = n.finger != null && n.finger > 0 ? ` א${n.finger}` : (n.finger === 0 ? ' פתוח' : '');
      const posBase = n.positionBase != null ? ` [${n.positionBase}–${n.positionBase + 4}]` : '';
      cell.innerHTML = `<span class="st-mel-note">${noteName}</span><span class="st-mel-pos">${STR_LABELS[n.course] || ''}·${n.fret}${finger}${posBase}</span>`;
      cell.addEventListener('click', () => {
        ensureAudio();
        AudioEngine.pluckCourse(n.course, n.fret, 0, 0.6);
        flashDot(n.course, n.fret);
        highlightMelCell(idx);
      });
      host.appendChild(cell);
      _melCells.push(cell);
    });
  }

  /* ---------- ייצוא / הורדה ---------- */
  function exportAsJson() {
    if (!_analysis) { alert('אין לנתח תחילה'); return; }
    const data = {
      title: 'שיר',
      bpm: _analysis.bpm,
      engine: _analysis.engine,
      duration: _duration,
      chords: _chords,
      tabNotes: _melody,
      exportDate: new Date().toISOString(),
    };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `שיר-${date}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  }

  function exportAsHtml() {
    if (!_analysis) { alert('אין לנתח תחילה'); return; }
    const title = lessonTitle();
    const bpmNum = _analysis.bpm || 120;
    const prog = chordProgression();
    const tabBlocks = (_phrases.length ? _phrases : [_melody]).map((phrase, pi) => {
      const svg = tabSvgForPhrase(phrase, bpmNum);
      return svg ? `<div class="st-tab-phrase-card"><div class="st-tab-phrase-title">משפט ${pi + 1} · ${phrase.length} תווים</div><div class="st-tab-phrase-svg-wrap">${svg}</div></div>` : '';
    }).join('');
    const tabStripClone = $('#st-tab-scroll') ? $('#st-tab-scroll').outerHTML : '';
    const html = `<!DOCTYPE html><html lang="he" dir="rtl"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${_esc(title)} — בוזוקי</title>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap" rel="stylesheet">
<style>
html,body{background:#eee;margin:0;padding:14px;font-family:'Heebo',sans-serif;}
.st-lesson{margin:0 auto;max-width:1000px;background:#fff;border-radius:8px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1);}
.st-info{display:flex;flex-wrap:wrap;gap:16px;padding:10px;color:#666;font-size:13px;margin-bottom:10px;border-bottom:1px solid #ddd;}
.st-info b{color:#d4a574;}
.st-fb-title{color:#666;font-size:13px;margin-bottom:8px;font-weight:600;}
.st-tab-scroll{display:flex;flex-direction:row-reverse;gap:2px;overflow-x:auto;padding:6px 0;margin:8px 0;}
.st-tab-labels{display:flex;flex-direction:column;justify-content:space-around;padding:0 6px;border-left:2px solid #ddd;}
.st-tab-label{color:#d4a574;font-weight:800;font-size:13px;height:20px;}
.st-tab-col{display:flex;flex-direction:column;min-width:28px;border-radius:4px;padding:2px 0;}
.st-tab-cell{height:20px;display:flex;align-items:center;justify-content:center;font-family:monospace;font-size:13px;font-weight:700;color:#999;border-bottom:1px solid #eee;}
.st-tab-cell.has-note{color:#222;background:#f5f5f5;border-radius:3px;}
.st-tab-phrase-sep{min-width:6px;border-left:2px dashed #d4a574;margin:0 2px;}
.st-melstrip{display:flex;flex-direction:row-reverse;gap:5px;overflow-x:auto;padding:6px 0;}
.st-mel-cell{flex:0 0 auto;min-width:42px;text-align:center;background:#f9f9f9;border:1px solid #ddd;border-radius:7px;padding:6px 4px;}
.st-mel-note{display:block;font-weight:800;color:#333;}
.st-mel-pos{display:block;font-size:10px;color:#999;font-family:monospace;}
svg.fretboard-svg{width:100%;max-width:100%;height:auto;margin:10px 0;}
.st-tab-phrases-grid{display:flex;flex-wrap:wrap;gap:12px;margin:10px 0;}
.st-tab-phrase-card{flex:0 1 auto;padding:10px 12px;border:1px solid #ddd;border-radius:8px;background:#fafafa;}
.st-tab-phrase-title{font-size:13px;font-weight:700;color:#b8860b;margin-bottom:6px;}
.st-tab-phrase-svg-wrap{overflow-x:auto;}
.st-tab-svg-phrase{display:block;width:auto!important;max-width:100%;height:auto!important;}
.st-tab-svg{width:auto;max-width:100%;height:auto;margin:4px 0;}
.st-hint{color:#999;font-size:12px;margin-top:10px;}
.st-chord-chip{display:inline-block;padding:3px 10px;border-radius:999px;background:#e8f4fa;color:#2a7a9b;font-weight:700;margin:2px;}
@media print{html,body{background:#fff;padding:0;}svg{break-inside:avoid;}}
</style></head>
<body>
<div class="st-lesson">
  <h1 style="margin:0 0 10px;color:#d4a574;">${_esc(title)}</h1>
  <div class="st-info">
    <span><b>BPM:</b> ${_analysis.bpm || '—'}</span>
    <span><b>תווי מלודיה:</b> ${_melody.length}</span>
    <span><b>אקורדים:</b> ${_chords.length}</span>
    <span><b>מנוע:</b> ${_analysis.engine || '—'}</span>
    <span><b>תאריך:</b> ${new Date().toLocaleDateString('he-IL')}</span>
  </div>
  ${prog.length ? `<p><b>הרמוניה:</b> ${prog.map(c => `<span class="st-chord-chip">${_esc(c)}</span>`).join('')}</p>` : ''}
  <div class="st-fb-title">המלודיה על הגריף</div>
  ${_fbSvg ? _fbSvg.outerHTML : '<p style="color:#999;">גריף לא זמין</p>'}
  <div class="st-fb-title" style="margin-top:20px;">טאב ללמידה</div>
  ${tabStripClone}
  <div class="st-fb-title" style="margin-top:16px;">טאב לפי משפטים</div>
  <div class="st-tab-phrases-grid">${tabBlocks}</div>
  <div class="st-fb-title" style="margin-top:20px;">מלודיה (תו · מיתר)</div>
  <div class="st-melstrip">
    ${_melody.map(n => {
      const labels = ['D', 'A', 'F', 'C'];
      const noteName = (typeof NOTE_NAMES !== 'undefined') ? NOTE_NAMES[n.midi % 12] : '';
      return '<div class="st-mel-cell"><span class="st-mel-note">' + noteName + '</span><span class="st-mel-pos">' + (labels[n.course] || '') + '·' + n.fret + '</span></div>';
    }).join('')}
  </div>
  <p class="st-hint">שיר מבוזוקי אקדמי — <a href="https://bouzoukifret.vercel.app" style="color:#d4a574;">bouzoukifret.vercel.app</a></p>
</div>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const safe = title.replace(/[^\w\u0590-\u05FF.-]+/g, '_').slice(0, 40) || 'שיר';
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safe}-${date}.html`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
  }

  function buildStandaloneLesson() {
    return buildPrintHtml();
  }

  function bindLesson(host) {
    $('#st-play', host).addEventListener('click', togglePlay);
    renderV2Panel(host);
    $('#st-phrase-prev', host)?.addEventListener('click', () => {
      if (_phraseIdx > 0) {
        _phraseIdx--;
        renderFretboard();
        buildTabScore();
        $('#st-phrase-label').textContent = phraseLabel();
        highlightLyricPlayback(_phraseIdx, 0);
        stopV2Playback();
        updateV2Display();
      }
    });
    $('#st-phrase-next', host)?.addEventListener('click', () => {
      if (_phraseIdx < _phrases.length - 1) {
        _phraseIdx++;
        renderFretboard();
        buildTabScore();
        $('#st-phrase-label').textContent = phraseLabel();
        highlightLyricPlayback(_phraseIdx, 0);
        stopV2Playback();
        updateV2Display();
      }
    });
    host.querySelectorAll('.st-learn-mode').forEach(b => b.addEventListener('click', () => {
      _learnMode = b.dataset.m;
      if (typeof FretboardScale !== 'undefined' && FretboardScale.normalizeMelody) {
        if (_learnMode === 'box') {
          _posBase = FretboardScale.findBestBase(_rawMelody, 'box');
          _melody = FretboardScale.normalizeMelody(_rawMelody, { mode: 'box', base: _posBase }).notes;
        } else if (_learnMode === 'd') {
          _posBase = 0;
          _melody = FretboardScale.normalizeMelody(_rawMelody, { mode: 'd' }).notes;
        } else {
          _posBase = 0;
          _melody = FretboardScale.normalizeMelody(_rawMelody, { mode: 'da' }).notes;
        }
      }
      rebuildPhrases();
      _phraseIdx = 0;
      buildMelStrip();
      buildTabStrip();
      buildTabScore();
      renderFretboard();
      host.querySelectorAll('.st-learn-mode').forEach(x => x.classList.toggle('active', x === b));
      const hint = host.querySelector('.st-teach-hint');
      if (hint) hint.textContent = learnHint();
      const lbl = $('#st-phrase-label');
      if (lbl) lbl.textContent = phraseLabel();
      stopV2Playback();
      updateV2Display();
    }));
    host.querySelectorAll('.st-speed').forEach(b => b.addEventListener('click', () => {
      _speed = parseFloat(b.dataset.s);
      host.querySelectorAll('.st-speed').forEach(x => x.classList.toggle('active', x === b));
      if (_playing) { play(); } // הפעלה מחדש עם המהירות החדשה
    }));
    const wc = $('#st-withchords', host);
    if (wc) wc.addEventListener('change', e => { _withChords = e.target.checked; });
    const lp = $('#st-loop', host);
    if (lp) lp.addEventListener('click', () => {
      if (_loop) { _loop = null; lp.textContent = '🔁 לולאה: כבוי'; lp.classList.remove('active'); }
      else {
        // לולאה על 8 השניות הראשונות כברירת מחדל (ניתן להרחיב בהמשך)
        _loop = { a: 0, b: Math.min(8, _duration) };
        lp.textContent = `🔁 לולאה: 0:00–${fmt(_loop.b)}`;
        lp.classList.add('active');
      }
    });
    $('#st-export-html', host).addEventListener('click', exportAsHtml);
    $('#st-export-json', host).addEventListener('click', exportAsJson);
    $('#st-print', host)?.addEventListener('click', printLesson);
    $('#st-vocal-play', host)?.addEventListener('click', playVocalStem);
    const sv = $('#st-sync-vocal', host);
    if (sv) sv.addEventListener('change', e => { _syncVocal = e.target.checked; });
  }

  function stopAll() {
    stop();
    stopV2Playback();
    revokeVocalUrl();
  }

  return { init, stop: stopAll, analyzeFile, loadAnalysis, loadVocalLesson, parseTextTab };
})();
