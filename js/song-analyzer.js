/* ============================================================
   למד מהשיר — צינור מלא
   קובץ → Essentia (ברירת מחדל) / Stem אופציונלי → TAB + אקורדים
   ============================================================ */
'use strict';

const SongAnalyzer = (() => {
  let _audioBuffer = null;
  let _wavePeaks = null;
  let _analysis = null;
  let _transposeSemi = 0;
  let _loopA = null;
  let _loopB = null;
  let _loopPick = 0;
  let _compareOn = false;
  let _liveChordOn = false;
  let _detectedChord = '';
  let _animFrame = null;
  let _ctx = null;
  let _micStream = null;
  let _micSource = null;

  function _duration() {
    return typeof PitchPreservingPlayer !== 'undefined'
      ? PitchPreservingPlayer.getDuration()
      : (_audioBuffer?.duration || 0);
  }

  function _seek(t) {
    if (typeof PitchPreservingPlayer !== 'undefined') PitchPreservingPlayer.seek(t);
  }

  function _currentTime() {
    return typeof PitchPreservingPlayer !== 'undefined'
      ? PitchPreservingPlayer.getCurrentTime()
      : 0;
  }

  function _applyTempoFromUI() {
    if (typeof PitchPreservingPlayer === 'undefined') return;
    const btn = document.querySelector('.sa-speed-btn.active');
    const tempo = parseFloat(btn?.dataset.rate || '0.75');
    const preserve = document.getElementById('sa-preserve-pitch')?.checked !== false;
    PitchPreservingPlayer.setTempo(tempo, preserve);
  }

  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  }

  function _fmtTime(t) {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function stop() {
    if (_animFrame) cancelAnimationFrame(_animFrame);
    _animFrame = null;
    if (typeof PitchPreservingPlayer !== 'undefined') PitchPreservingPlayer.destroy();
    _audioBuffer = _wavePeaks = _analysis = null;
    _transposeSemi = 0;
    _loopA = _loopB = null;
    _loopPick = 0;
    if (typeof LiveChord !== 'undefined') LiveChord.stop();
    _compareOn = _liveChordOn = false;
    _detectedChord = '';
    _releaseMic();
  }

  /** עצירת נגינה בלבד — שומר ניתוח (מעבר טאבים ב-Learn Hub) */
  function pausePlayback() {
    if (typeof PitchPreservingPlayer !== 'undefined' && PitchPreservingPlayer.isPlaying()) {
      PitchPreservingPlayer.pause();
    }
    const btn = document.getElementById('sa-play');
    if (btn) btn.textContent = '▶ נגן';
    if (typeof LiveChord !== 'undefined') LiveChord.stop();
    _releaseMic();
  }

  function _setProgress(msg, pct) {
    const bar = document.getElementById('sa-progress-fill');
    const txt = document.getElementById('sa-progress-text');
    if (bar) bar.style.width = `${Math.min(100, pct)}%`;
    if (txt) txt.textContent = msg;
  }

  function _chordAtTime(t) {
    const chords = _displayChords();
    if (!chords.length) return null;
    let cur = chords[0].chord;
    for (const c of chords) {
      if (c.time <= t) cur = c.chord;
      else break;
    }
    return cur;
  }

  function _updateLiveChordUI() {
    const el = document.getElementById('sa-live-chord-display');
    if (!el || !_liveChordOn) return;
    const expected = _chordAtTime(_currentTime());
    const heard = _detectedChord;
    if (!expected && !heard) {
      el.textContent = 'נגנו אקורד…';
      el.className = 'sa-live-chord-badge hint';
      return;
    }
    const match = typeof LiveChord !== 'undefined' && LiveChord.chordsMatch(expected, heard);
    el.innerHTML = expected
      ? `צפוי: <strong>${_esc(expected)}</strong>${heard ? ` · שמע: <strong>${_esc(heard)}</strong> ${match ? '✓' : ''}` : ''}`
      : (heard ? `שמע: <strong>${_esc(heard)}</strong>` : '');
    el.className = 'sa-live-chord-badge' + (match ? ' ok' : heard ? ' warn' : '');
  }

  async function _ensureMic() {
    if (_ctx && _micStream && _micSource) return true;
    try {
      _micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false },
      });
      _ctx = new AudioContext();
      _micSource = _ctx.createMediaStreamSource(_micStream);
      const analyser = _ctx.createAnalyser();
      analyser.fftSize = 2048;
      _micSource.connect(analyser);
      _ctx._saAnalyser = analyser;
      return true;
    } catch {
      return false;
    }
  }

  function _releaseMic() {
    if (typeof LiveChord !== 'undefined') LiveChord.stop();
    if (_micStream) { _micStream.getTracks().forEach(t => t.stop()); _micStream = null; }
    if (_ctx) { _ctx.close(); _ctx = null; }
    _micSource = null;
    _detectedChord = '';
  }

  async function _syncMicFeatures() {
    const needMic = _compareOn || _liveChordOn;
    const status = document.getElementById('sa-compare-status');
    const liveStatus = document.getElementById('sa-live-chord-status');
    if (!needMic) {
      _releaseMic();
      if (status && !_compareOn) status.textContent = '';
      if (liveStatus && !_liveChordOn) liveStatus.textContent = '';
      return;
    }
    const ok = await _ensureMic();
    if (!ok) {
      if (_compareOn && status) status.textContent = 'לא ניתן לגשת למיקרופון';
      if (_liveChordOn && liveStatus) liveStatus.textContent = 'לא ניתן לגשת למיקרופון';
      _compareOn = _liveChordOn = false;
      const cmp = document.getElementById('sa-compare');
      const live = document.getElementById('sa-live-chord');
      if (cmp) cmp.checked = false;
      if (live) live.checked = false;
      return;
    }
    if (_compareOn && status) status.textContent = 'השוואה פעילה — נגנו את התו המסומן';
    if (_liveChordOn) {
      if (liveStatus) liveStatus.textContent = 'מאזין…';
      try {
        await LiveChord.start(_ctx, _micSource, (ch) => {
          _detectedChord = ch;
          _updateLiveChordUI();
        });
      } catch (e) {
        if (liveStatus) liveStatus.textContent = e.message || 'Meyda נכשל';
        _liveChordOn = false;
        const live = document.getElementById('sa-live-chord');
        if (live) live.checked = false;
      }
    } else if (typeof LiveChord !== 'undefined') {
      LiveChord.stop();
      _detectedChord = '';
    }
  }

  function _displayChords() {
    if (!_analysis?.chords) return [];
    return _analysis.chords.map(c => ({
      time: c.time,
      chord: AudioAnalyzer.transposeChord(c.chord, _transposeSemi),
    }));
  }

  function _displayTabNotes() {
    if (!_analysis?.tabNotes) return [];
    return AudioAnalyzer.transposeTabNotes(_analysis.tabNotes, _transposeSemi);
  }

  async function _fileFromYoutubeUrl(url) {
    const id = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
    if (!id) throw new Error('קישור YouTube לא תקין');
    if (typeof StemAPI !== 'undefined' && StemAPI.fetchYoutube) {
      return StemAPI.fetchYoutube(id, _setProgress);
    }
    throw new Error('הגדר stem-proxy + yt-dlp');
  }

  async function runPipeline(source) {
    stop();
    _setProgress('מתחיל…', 0);
    document.getElementById('sa-results').style.display = 'none';

    let file = source;
    if (typeof source === 'string') {
      _setProgress('מוריד אודיו מ-YouTube…', 5);
      file = await _fileFromYoutubeUrl(source);
    }

    const useStem = document.getElementById('sa-use-stem')?.checked === true;
    const provider = document.getElementById('sa-provider')?.value || 'lalal';
    let blob = file instanceof Blob ? file : file;

    if (useStem) {
      try {
        const health = await StemAPI.checkHealth();
        if (!health.ok && !window.BOUZOUKI_CONFIG?.lalalLicenseKey) {
          _setProgress('Stem לא זמין — מנתח מקור', 15);
        } else {
          blob = await StemAPI.separate(blob, {
            provider,
            stem: provider === 'lalal' ? 'strings' : 'other',
            onProgress: _setProgress,
          });
        }
      } catch (e) {
        console.warn('Stem skip:', e);
        _setProgress(`Stem נכשל — מנתח מקור`, 20);
      }
    } else {
      _setProgress('ניתוח ישיר בדפדפן (Essentia.js)…', 15);
    }

    _setProgress('מפענח אודיו…', 30);
    _audioBuffer = await AudioAnalyzer.decodeBlob(blob);
    _wavePeaks = AudioAnalyzer.computeWavePeaks(_audioBuffer);
    _analysis = await AudioAnalyzer.analyze(_audioBuffer, _setProgress);
    _analysis.dromosMatch = AudioAnalyzer.detectDromos(_analysis.chords, _analysis.tabNotes);

    if (typeof DailyStreak !== 'undefined') DailyStreak.touch('song_analyze');

    if (typeof ProgressLog !== 'undefined') {
      ProgressLog.log('song_analyze', _analysis.dromosMatch?.dromos?.nameHe || 'שיר', {
        durationSec: Math.round(_audioBuffer?.duration || 300),
        meta: { bpm: _analysis.bpm, engine: _analysis.engine, notes: _analysis.tabNotes?.length },
      });
    }

    if (typeof PitchPreservingPlayer !== 'undefined') {
      PitchPreservingPlayer.load(_audioBuffer);
      _applyTempoFromUI();
    }
    _transposeSemi = 0;
    const trVal = document.getElementById('sa-transpose-val');
    if (trVal) trVal.textContent = '0';

    _renderResults();
    document.getElementById('sa-results').style.display = '';
    _startSyncLoop();
  }

  function _silentBuffer(durationSec) {
    const sr = 44100;
    const len = Math.ceil(Math.max(1, durationSec) * sr);
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx.createBuffer(1, len, sr);
  }

  async function loadFromExport(data, audioBlob) {
    if (!data?.chords) throw new Error('קובץ JSON לא תקין');
    stop();
    _setProgress('טוען ניתוח שמור…', 50);

    _analysis = {
      bpm: data.bpm || 120,
      chords: data.chords,
      tabNotes: data.tabNotes || [],
      engine: data.engine || 'imported',
    };
    _transposeSemi = data.transpose || 0;
    const trVal = document.getElementById('sa-transpose-val');
    if (trVal) trVal.textContent = _transposeSemi > 0 ? `+${_transposeSemi}` : String(_transposeSemi);

    if (data.dromos?.id && typeof DROMOI !== 'undefined') {
      const d = DROMOI.find(x => x.id === data.dromos.id);
      if (d) {
        _analysis.dromosMatch = {
          dromos: d,
          rootName: data.dromos.root || 'A',
          confidence: data.dromos.confidence || 50,
        };
      }
    }
    if (!_analysis.dromosMatch) {
      _analysis.dromosMatch = AudioAnalyzer.detectDromos(_analysis.chords, _analysis.tabNotes);
    }

    if (audioBlob) {
      _audioBuffer = await AudioAnalyzer.decodeBlob(audioBlob);
      _wavePeaks = AudioAnalyzer.computeWavePeaks(_audioBuffer);
      if (typeof PitchPreservingPlayer !== 'undefined') {
        PitchPreservingPlayer.load(_audioBuffer);
        _applyTempoFromUI();
      }
      const hint = document.getElementById('sa-import-hint');
      if (hint) { hint.textContent = ''; hint.hidden = true; }
    } else {
      const dur = data.durationSec || Math.max(30, (_analysis.chords.at(-1)?.time || 60) + 4);
      _audioBuffer = _silentBuffer(dur);
      _wavePeaks = new Array(400).fill(0.08);
      const hint = document.getElementById('sa-import-hint');
      if (hint) {
        hint.hidden = false;
        hint.textContent = 'מצב תצוגה בלי אודיו — העלו MP3/WAV לאותו שיר לנגינה ו-A/B loop';
      }
    }

    _setProgress('נטען', 100);
    _renderResults();
    document.getElementById('sa-results').style.display = '';
    document.getElementById('sa-progress-wrap').style.display = '';
    _startSyncLoop();
  }

  function _renderResults() {
    const a = _analysis;
    if (!a) return;

    let dromosHtml = '';
    if (a.dromosMatch) {
      const d = a.dromosMatch;
      dromosHtml = `<span class="sa-dromos-badge">🛤️ ${d.dromos.nameHe} (${d.rootName}) · ${d.confidence.toFixed(0)}%</span>`;
    }

    document.getElementById('sa-meta').innerHTML = `
      ${dromosHtml}
      <span>BPM: <strong>${a.bpm}</strong></span>
      <span>מנוע: ${a.engine || '?'}</span>
      <span>תווים: ${a.tabNotes?.length || 0}</span>
      <span>אקורדים: ${a.chords?.length || 0}</span>`;

    if (a.dromosMatch) {
      const hint = document.getElementById('sa-dromos-hint');
      if (hint) {
        hint.innerHTML = `<strong>${a.dromosMatch.dromos.nameHe}</strong> (${a.dromosMatch.dromos.nameGr}) — ${a.dromosMatch.dromos.tips}
          <button type="button" class="btn secondary sa-open-dromos" data-id="${a.dromosMatch.dromos.id}">פתח בדרומוסים</button>`;
        hint.querySelector('.sa-open-dromos')?.addEventListener('click', () => {
          const idx = DROMOI.findIndex(x => x.id === a.dromosMatch.dromos.id);
          document.querySelector('.nav-btn[data-screen="dromoi"]')?.click();
          setTimeout(() => {
            const items = document.querySelectorAll('#dromoi-list .dromos-item');
            if (idx >= 0 && items[idx]) items[idx].click();
          }, 80);
        });
      }
    }

    _drawChordStrip(_displayChords());
    _drawTabTimeline(_displayTabNotes());
    _drawWaveform();
    _drawLoopMarkers();
  }

  function _drawChordStrip(chords) {
    const el = document.getElementById('sa-chords');
    if (!el || !chords?.length) { if (el) el.innerHTML = '<p class="hint">לא זוהו אקורדים</p>'; return; }
    const dur = _duration() || chords[chords.length - 1].time + 2;
    el.innerHTML = chords.map(c => {
      const left = (c.time / dur) * 100;
      return `<span class="sa-chord-mark" style="left:${left}%" data-time="${c.time}" data-chord="${_esc(c.chord)}" tabindex="0">${_esc(c.chord)}</span>`;
    }).join('');
    el.querySelectorAll('.sa-chord-mark').forEach(m => {
      m.addEventListener('click', () => { if (_audioBuffer) _seek(parseFloat(m.dataset.time)); });
      if (typeof ChordTooltip !== 'undefined') {
        ChordTooltip.bindHover(m, () => m.dataset.chord);
      }
    });
  }

  function _drawTabTimeline(notes) {
    const svg = document.getElementById('sa-tab');
    if (!svg) return;
    if (!notes?.length) { svg.innerHTML = ''; return; }
    const COURSE_LABELS = ['D', 'A', 'F', 'C'];
    const stepW = 36, padL = 50, padT = 28, lineGap = 24;
    const maxTime = Math.max(...notes.map(n => n.time + (n.duration || 0.2)), _duration() || 60);
    const steps = Math.ceil(maxTime * 4);
    const width = padL + steps * stepW + 40;
    const height = padT + lineGap * 3 + 50;
    svg.innerHTML = '';
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    for (let i = 0; i < 4; i++) {
      const y = padT + i * lineGap;
      svgEl('line', { x1: padL - 30, y1: y, x2: width - 20, y2: y, stroke: '#46627f', 'stroke-width': 1.2 }, svg);
      svgEl('text', { x: padL - 42, y: y + 4, fill: '#e3b341', 'font-size': 12, 'font-weight': 700 }, svg).textContent = COURSE_LABELS[i];
    }

    notes.forEach((n, idx) => {
      if (n.course == null) return;
      const step = Math.round(n.time * 4);
      const x = padL + step * stepW + stepW / 2;
      const y = padT + n.course * lineGap;
      const g = svgEl('g', { class: 'sa-tab-note', 'data-idx': idx, 'data-time': n.time }, svg);
      const stroke = n.poly ? '#e3b341' : '#4fb3d9';
      svgEl('circle', { cx: x, cy: y, r: 10, fill: '#1d3349', stroke, 'stroke-width': n.poly ? 2.2 : 1.4, class: 'sa-tn-dot' }, g);
      svgEl('text', { x, y: y + 4, fill: '#e8eef5', 'font-size': 11, 'font-weight': 800, 'text-anchor': 'middle' }, g).textContent = n.fret;
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => { if (_audioBuffer) _seek(n.time); });
    });
  }

  function _drawWaveform() {
    const canvas = document.getElementById('sa-wave');
    if (!canvas || !_wavePeaks?.length) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.offsetWidth * 2 || 1600;
    const h = 160;
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = '#13283c';
    ctx.fillRect(0, 0, w, h);
    const mid = h / 2;
    const peaks = _wavePeaks;
    ctx.fillStyle = '#3d6a8a';
    for (let i = 0; i < peaks.length; i++) {
      const x = (i / peaks.length) * w;
      const barW = Math.max(1, w / peaks.length);
      const amp = peaks[i] * mid * 0.92;
      ctx.fillRect(x, mid - amp, barW, amp * 2);
    }
    _bindWaveformClick(canvas);
  }

  function _timeFromWaveX(clientX, canvas) {
    const rect = canvas.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return pct * (_duration() || 0);
  }

  function _bindWaveformClick(canvas) {
    canvas.style.cursor = 'crosshair';
    canvas.onclick = (e) => {
      if (!_audioBuffer) return;
      const t = _timeFromWaveX(e.clientX, canvas);
      if (e.shiftKey) {
        _loopA = _loopB = null;
        _loopPick = 0;
        _updateLoopLabel();
        _drawLoopMarkers();
        return;
      }
      if (_loopPick === 0) {
        _loopA = t;
        _loopB = null;
        _loopPick = 1;
        document.getElementById('sa-loop-label').textContent = `A = ${_fmtTime(t)} — לחצו נקודה שנייה ל-B`;
      } else {
        _loopB = t;
        if (_loopB < _loopA) { const tmp = _loopA; _loopA = _loopB; _loopB = tmp; }
        _loopPick = 0;
        _updateLoopLabel();
      }
      _drawLoopMarkers();
      _seek(t);
    };
  }

  function _drawLoopMarkers() {
    const wrap = document.querySelector('.sa-wave-wrap');
    if (!wrap || !_duration()) return;
    wrap.querySelectorAll('.sa-marker-a, .sa-marker-b').forEach(el => el.remove());
    const dur = _duration();
    if (_loopA != null) {
      const a = document.createElement('div');
      a.className = 'sa-marker-a';
      a.style.left = `${(_loopA / dur) * 100}%`;
      a.title = 'A';
      wrap.appendChild(a);
    }
    if (_loopB != null) {
      const b = document.createElement('div');
      b.className = 'sa-marker-b';
      b.style.left = `${(_loopB / dur) * 100}%`;
      b.title = 'B';
      wrap.appendChild(b);
    }
    _updateLoopLabel();
  }

  function _updatePlayhead() {
    if (!_audioBuffer) return;
    const t = _currentTime();
    const dur = _duration() || 1;
    const pct = (t / dur) * 100;

    const ph = document.getElementById('sa-playhead');
    if (ph) ph.style.left = `${pct}%`;

    const timeEl = document.getElementById('sa-time');
    if (timeEl) timeEl.textContent = `${_fmtTime(t)} / ${_fmtTime(dur)}`;

    if (_loopA != null && _loopB != null && t >= _loopB - 0.05) {
      _seek(_loopA);
    }

    const notes = _displayTabNotes();
    const note = notes.find((n, i, arr) => {
      const next = arr[i + 1];
      return t >= n.time && (!next || t < next.time);
    });
    _highlightFretboard(note);
    _highlightTabNote(note);

    if (_compareOn && note) _checkMicNote(note);
    if (_liveChordOn) _updateLiveChordUI();
    _highlightActiveChord(t);
  }

  function _highlightActiveChord(t) {
    const chords = _displayChords();
    const marks = document.querySelectorAll('.sa-chord-mark');
    if (!chords.length || !marks.length) return;
    let idx = 0;
    for (let i = 0; i < chords.length; i++) {
      if (chords[i].time <= t) idx = i;
      else break;
    }
    marks.forEach((m, i) => m.classList.toggle('active', i === idx));
  }

  function _highlightFretboard(note) {
    const host = document.getElementById('sa-fretboard');
    if (!host) return;
    host.innerHTML = '';
    const svg = document.createElementNS(SVG_NS, 'svg');
    host.appendChild(svg);
    drawFretboard(svg, (ci, fret) => {
      if (!note || note.course == null) return null;
      if (ci === note.course && fret === note.fret) {
        return { type: 'root', label: String(note.fret) };
      }
      return null;
    });
  }

  function _highlightTabNote(note) {
    document.querySelectorAll('.sa-tab-note').forEach(g => g.classList.remove('lit'));
    if (!note) return;
    const notes = _displayTabNotes();
    const idx = notes.indexOf(note);
    document.querySelector(`.sa-tab-note[data-idx="${idx}"]`)?.classList.add('lit');
  }

  function _startSyncLoop() {
    const tick = () => {
      _updatePlayhead();
      _animFrame = requestAnimationFrame(tick);
    };
    _animFrame = requestAnimationFrame(tick);
  }

  async function _toggleCompare(on) {
    _compareOn = on;
    await _syncMicFeatures();
  }

  async function _toggleLiveChord(on) {
    _liveChordOn = on;
    const display = document.getElementById('sa-live-chord-display');
    if (!on && display) { display.textContent = ''; display.className = 'sa-live-chord-badge'; }
    await _syncMicFeatures();
    if (on) _updateLiveChordUI();
  }

  function _checkMicNote(expected) {
    const analyser = _ctx?._saAnalyser;
    const status = document.getElementById('sa-compare-status');
    if (!analyser || !expected || expected.course == null || typeof Listen === 'undefined') return;
    const buf = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(buf);
    const { freq, rms } = Listen.detectPitch(buf, _ctx.sampleRate);
    if (!freq || rms < 0.012) return;
    const midi = Math.round(69 + 12 * Math.log2(freq / 440));
    const expMidi = TUNING[expected.course].midi + expected.fret;
    const diff = Math.abs(midi - expMidi);
    if (status) {
      status.textContent = diff <= 1
        ? `✓ נכון! (${NOTE_NAMES[midi % 12]})`
        : `ציפינו ל-${NOTE_NAMES[expMidi % 12]} · שמענו ${NOTE_NAMES[midi % 12]}`;
      status.style.color = diff <= 1 ? 'var(--ok)' : 'var(--accent-red)';
    }
  }

  function _exportAnalysis(format) {
    if (!_analysis) {
      alert('אין ניתוח לייצוא — הריצו ניתוח קודם');
      return;
    }
    const COURSE = ['D', 'A', 'F', 'C'];
    const chords = _displayChords();
    const notes = _displayTabNotes().filter(n => n.course != null);
    const base = `bouzouki-${Date.now()}`;

    if (format === 'json') {
      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        bpm: _analysis.bpm,
        engine: _analysis.engine,
        durationSec: _audioBuffer?.duration,
        transpose: _transposeSemi,
        dromos: _analysis.dromosMatch ? {
          id: _analysis.dromosMatch.dromos?.id,
          nameHe: _analysis.dromosMatch.dromos?.nameHe,
          root: _analysis.dromosMatch.rootName,
          confidence: _analysis.dromosMatch.confidence,
        } : null,
        chords,
        tabNotes: notes,
      };
      _downloadBlob(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }), `${base}.json`);
      return;
    }

    const lines = [
      '# בוזוקי אקדמי — ניתוח שיר',
      `BPM: ${_analysis.bpm} · מנוע: ${_analysis.engine || '?'}`,
      _analysis.dromosMatch ? `דרומוס: ${_analysis.dromosMatch.dromos?.nameHe} (${_analysis.dromosMatch.confidence?.toFixed(0)}%)` : '',
      '',
      '## אקורדים',
      ...chords.map(c => `${_fmtTime(c.time)}  ${c.chord}`),
      '',
      '## TAB',
      ...notes.map(n => `${_fmtTime(n.time)}  ${COURSE[n.course] || '?'}  סריג ${n.fret}${n.poly ? ' (poly)' : ''}`),
    ].filter(Boolean);
    _downloadBlob(new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' }), `${base}.txt`);
  }

  function _downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function _applyTranspose(delta) {
    _transposeSemi += delta;
    const el = document.getElementById('sa-transpose-val');
    if (el) el.textContent = _transposeSemi > 0 ? `+${_transposeSemi}` : String(_transposeSemi);
    _drawChordStrip(_displayChords());
    _drawTabTimeline(_displayTabNotes());
  }

  function _updateLoopLabel() {
    const el = document.getElementById('sa-loop-label');
    const region = document.getElementById('sa-loop-region');
    if (_loopA != null && _loopB != null && _duration()) {
      if (el) el.textContent = `Loop: ${_fmtTime(_loopA)} – ${_fmtTime(_loopB)} · לחיצה על waveform`;
      if (region) {
        region.style.display = 'block';
        region.style.left = `${(_loopA / _duration()) * 100}%`;
        region.style.width = `${((_loopB - _loopA) / _duration()) * 100}%`;
      }
    } else if (_loopA != null && el) {
      el.textContent = `A = ${_fmtTime(_loopA)} — לחצו נקודה שנייה`;
      if (region) region.style.display = 'none';
    } else {
      if (el) el.textContent = 'לחצו פעמיים על waveform ל-A/B loop (Shift+לחיצה = נקה)';
      if (region) region.style.display = 'none';
    }
  }

  function render(containerId) {
    const root = document.getElementById(containerId);
    if (!root) return;

    root.innerHTML = `
      <div class="sa-pipeline card">
        <h3>למד מהשיר — ניתוח בדפדפן</h3>
        <p class="hint">ברירת מחדל: Essentia.js בלבד (ללא API). Stem separation אופציונלי כשיש proxy.</p>

        <div class="sa-input-row">
          <label class="sa-upload-btn btn primary">
            📁 העלה MP3 / WAV
            <input type="file" id="sa-file" accept="audio/*,video/*" hidden />
          </label>
          <input type="url" id="sa-youtube" class="sa-yt-input" placeholder="או קישור YouTube" dir="ltr" />
          <button type="button" class="btn primary" id="sa-analyze">נתח</button>
        </div>
        <div class="sa-import-row">
          <button type="button" class="btn secondary" id="sa-import-btn">📂 טען ניתוח שמור (JSON)</button>
          <input type="file" id="sa-import-json" accept="application/json,.json" hidden />
          <label class="sa-upload-btn btn secondary">
            🔗 + קובץ אודיו
            <input type="file" id="sa-import-audio" accept="audio/*" hidden />
          </label>
          <span id="sa-import-hint" class="hint sa-import-hint" hidden></span>
        </div>

        <div class="sa-stem-opts">
          <label><input type="checkbox" id="sa-use-stem" /> הפרד stems (LALAL/Moises — דורש proxy)</label>
          <label>ספק:
            <select id="sa-provider" class="learn-select">
              <option value="lalal">LALAL.ai — strings</option>
              <option value="moises">Moises — other</option>
            </select>
          </label>
        </div>

        <p class="hint sa-config-hint" id="sa-config-hint"></p>

        <div class="sa-progress-wrap" id="sa-progress-wrap" style="display:none">
          <div class="sa-progress-bar"><div id="sa-progress-fill"></div></div>
          <p id="sa-progress-text" class="hint"></p>
        </div>
      </div>

      <div id="sa-results" style="display:none">
        <div class="sa-player card">
          <div id="sa-meta" class="sa-meta"></div>
          <div class="sa-export-row">
            <button type="button" class="btn secondary" id="sa-export-json">⬇ ייצוא JSON</button>
            <button type="button" class="btn secondary" id="sa-export-txt">⬇ ייצוא TAB/אקורדים</button>
          </div>
          <div id="sa-dromos-hint" class="sa-dromos-hint hint"></div>
          <div class="sa-transport">
            <button type="button" class="btn secondary" id="sa-play">▶ נגן</button>
            <span id="sa-time">0:00</span>
            <span>מהירות:</span>
            <button type="button" class="sa-speed-btn" data-rate="0.5">0.5×</button>
            <button type="button" class="sa-speed-btn active" data-rate="0.75">0.75×</button>
            <button type="button" class="sa-speed-btn" data-rate="1">1×</button>
            <label class="sa-preserve-pitch"><input type="checkbox" id="sa-preserve-pitch" checked /> שמור גובה צליל (pitch)</label>
            <span class="sa-transpose-ctrl">
              טרנספוז:
              <button type="button" class="btn small" id="sa-tr-down">−</button>
              <span id="sa-transpose-val">0</span>
              <button type="button" class="btn small" id="sa-tr-up">+</button>
            </span>
          </div>
          <div class="sa-loop-row">
            <button type="button" class="btn secondary" id="sa-set-a">A (נוכחי)</button>
            <button type="button" class="btn secondary" id="sa-set-b">B (נוכחי)</button>
            <button type="button" class="btn secondary" id="sa-loop-clear">נקה loop</button>
            <span id="sa-loop-label" class="hint">לחצו פעמיים על waveform ל-A/B loop</span>
          </div>
          <div class="sa-wave-wrap">
            <canvas id="sa-wave"></canvas>
            <div id="sa-playhead" class="sa-playhead"></div>
            <div id="sa-loop-region" class="sa-loop-region"></div>
          </div>
          <div id="sa-chords" class="sa-chord-strip"></div>
        </div>

        <div class="sa-learn-grid">
          <div class="card sa-tab-card">
            <h4>TAB (מסונכרן) <span class="hint sa-poly-legend">● זהב = polyphonic hint</span></h4>
            <div class="sa-tab-scroll"><svg id="sa-tab"></svg></div>
          </div>
          <div class="card sa-fb-card">
            <h4>לוח סריגים</h4>
            <div id="sa-fretboard" class="sa-fretboard"></div>
            <div class="sa-compare-row">
              <label><input type="checkbox" id="sa-compare" /> השווה נגינה למקור (מיקרופון)</label>
              <span id="sa-compare-status" class="hint"></span>
            </div>
            <div class="sa-live-chord-row">
              <label><input type="checkbox" id="sa-live-chord" /> זיהוי אקורד חי (Meyda)</label>
              <span id="sa-live-chord-status" class="hint"></span>
              <div id="sa-live-chord-display" class="sa-live-chord-badge"></div>
            </div>
            <button type="button" class="btn gold" id="sa-playalong">🎤 תרגל TAB במאמין (Play-along)</button>
          </div>
        </div>
      </div>
    `;

    StemAPI.checkHealth().then(h => {
      const hint = document.getElementById('sa-config-hint');
      if (!hint) return;
      if (h.ok) {
        const parts = ['✓ stem-proxy פעיל'];
        if (h.ytdlp) parts.push('YouTube (yt-dlp)');
        else parts.push('YouTube: התקן yt-dlp');
        if (h.lalal || h.moises) parts.push('stems');
        hint.textContent = parts.join(' · ');
      } else {
        hint.textContent = 'ניתוח Essentia עובד בלי proxy. YouTube/stems: tools/stem-proxy + config.js + yt-dlp';
      }
    });

    document.getElementById('sa-analyze').addEventListener('click', async () => {
      document.getElementById('sa-progress-wrap').style.display = '';
      try {
        const file = document.getElementById('sa-file').files[0];
        const yt = document.getElementById('sa-youtube').value.trim();
        if (file) await runPipeline(file);
        else if (yt) await runPipeline(yt);
        else alert('בחרו קובץ או הדביקו קישור YouTube');
      } catch (e) {
        _setProgress(e.message || String(e), 0);
        alert(e.message || e);
      }
    });

    document.getElementById('sa-play').addEventListener('click', () => {
      if (!_audioBuffer || typeof PitchPreservingPlayer === 'undefined') return;
      const btn = document.getElementById('sa-play');
      PitchPreservingPlayer.toggle();
      btn.textContent = PitchPreservingPlayer.isPlaying() ? '⏸ השהה' : '▶ נגן';
    });

    document.querySelectorAll('.sa-speed-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.sa-speed-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (_audioBuffer) _applyTempoFromUI();
      });
    });

    document.getElementById('sa-preserve-pitch')?.addEventListener('change', () => {
      if (_audioBuffer) _applyTempoFromUI();
    });

    document.getElementById('sa-tr-down').addEventListener('click', () => _applyTranspose(-1));
    document.getElementById('sa-tr-up').addEventListener('click', () => _applyTranspose(1));

    document.getElementById('sa-set-a').addEventListener('click', () => {
      if (_audioBuffer) { _loopA = _currentTime(); _loopPick = 1; _drawLoopMarkers(); }
    });
    document.getElementById('sa-set-b').addEventListener('click', () => {
      if (_audioBuffer) {
        _loopB = _currentTime();
        if (_loopA != null && _loopB < _loopA) { const t = _loopA; _loopA = _loopB; _loopB = t; }
        _loopPick = 0;
        _drawLoopMarkers();
      }
    });
    document.getElementById('sa-loop-clear').addEventListener('click', () => {
      _loopA = _loopB = null;
      _loopPick = 0;
      _updateLoopLabel();
      _drawLoopMarkers();
    });

    document.getElementById('sa-compare').addEventListener('change', e => {
      _toggleCompare(e.target.checked);
    });

    document.getElementById('sa-live-chord')?.addEventListener('change', e => {
      _toggleLiveChord(e.target.checked);
    });

    document.getElementById('sa-export-json')?.addEventListener('click', () => _exportAnalysis('json'));
    document.getElementById('sa-export-txt')?.addEventListener('click', () => _exportAnalysis('txt'));

    let _pendingImport = null;
    document.getElementById('sa-import-btn')?.addEventListener('click', () => {
      document.getElementById('sa-import-json')?.click();
    });
    document.getElementById('sa-import-json')?.addEventListener('change', async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try {
        _pendingImport = JSON.parse(await f.text());
        const audio = document.getElementById('sa-import-audio')?.files?.[0];
        await loadFromExport(_pendingImport, audio || null);
      } catch (err) {
        alert(err.message || 'שגיאה בטעינת JSON');
      }
      e.target.value = '';
    });
    document.getElementById('sa-import-audio')?.addEventListener('change', async (e) => {
      const audio = e.target.files?.[0];
      if (!audio || !_pendingImport) return;
      try {
        await loadFromExport(_pendingImport, audio);
      } catch (err) {
        alert(err.message || String(err));
      }
    });

    document.getElementById('sa-playalong')?.addEventListener('click', () => {
      const notes = _displayTabNotes().filter(n => n.course != null).slice(0, 48);
      if (!notes.length) { alert('אין תווים ב-TAB — נסו קובץ אחר'); return; }
      const COURSE_LABELS = ['D', 'A', 'F', 'C'];
      const list = notes.map(n => ({
        midi: TUNING[n.course].midi + n.fret,
        hint: `${COURSE_LABELS[n.course]} · סריג ${n.fret}`,
      }));
      if (typeof Listen !== 'undefined' && Listen.loadAndGo) {
        Listen.loadAndGo(list, 'TAB מהשיר');
      } else {
        alert('מאמן המאזין לא זמין');
      }
    });
  }

  return { render, stop, pausePlayback, runPipeline, loadFromExport };
})();
