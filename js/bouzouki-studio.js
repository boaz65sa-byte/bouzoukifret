/* ============================================================
   BouzoukiStudio — אולפון בוזוקי (ACE-style לנישה שלנו)
   מקור → stems → ניתוח → מלודיה על הגריף → ליווי לפי דרומוס
   ============================================================ */
'use strict';

const BouzoukiStudio = (() => {
  let _blob = null;
  let _stemBlob = null;
  let _analysis = null;
  let _dromosIds = [];
  let _engine = 'basicpitch';
  let _provider = 'lalal';
  let _playing = false;
  let _raf = null;
  let _melody = [];
  let _chords = [];
  let _duration = 0;
  let _playStart = 0;
  let _speed = 1;
  let _nextIdx = 0;
  let _fbHost = null;
  let _activeBackingIdx = null;

  const STEPS = [
    { id: 'source', label: 'מקור' },
    { id: 'stems', label: 'Stems' },
    { id: 'analyze', label: 'ניתוח' },
    { id: 'fretboard', label: 'גריף' },
    { id: 'practice', label: 'תרגול' },
  ];

  function $(s, r = document) { return r.querySelector(s); }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  function fmt(t) {
    t = Math.max(0, t);
    return Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
  }

  function setStatus(msg, pct) {
    const s = $('#bzs-status');
    if (s) s.textContent = msg || '';
    const bar = $('#bzs-prog-fill');
    if (bar && typeof pct === 'number') bar.style.width = `${Math.min(100, pct)}%`;
  }

  function guessDromoi(chords) {
    const s = new Set((chords || []).map(c => String(c.chord || '').replace(/maj7|m7|7|m|dim/gi, '')));
    const has = (...xs) => xs.some(x => [...s].some(c => c.startsWith(x) || c === x));
    const out = [];
    if (has('Eb') || (has('D') && has('Gm'))) out.push('hitzaz');
    if (has('Am') || has('Dm') || has('Em')) {
      out.push('minore', 'ousak', 'kiourdi');
    }
    if (has('D') && has('G') && has('A')) out.push('rast');
    if (has('Gm') && has('Dm')) out.push('hitzaz', 'minore');
    return [...new Set(out)].slice(0, 4);
  }

  function ingestAnalysis(a) {
    _analysis = a;
    _melody = (a.tabNotes || []).slice().sort((x, y) => x.time - y.time);
    _chords = (a.chords || []).slice().sort((x, y) => x.time - y.time);
    const lastM = _melody.length ? _melody[_melody.length - 1].time + (_melody[_melody.length - 1].duration || 0.3) : 0;
    const lastC = _chords.length ? _chords[_chords.length - 1].time + 1 : 0;
    _duration = Math.max(lastM, lastC, 1);
    _dromosIds = guessDromoi(_chords);
    setStep('fretboard');
    render();
  }

  async function analyzeBlob(blob) {
    if (!blob) return;
    setStatus('מפענח אודיו…', 5);
    const buf = await blob.arrayBuffer();
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await ctx.decodeAudioData(buf);
    try { ctx.close(); } catch { /* noop */ }
    let result;
    if (_engine === 'basicpitch' && typeof BasicPitchEngine !== 'undefined') {
      try {
        result = await BasicPitchEngine.transcribe(audioBuffer, setStatus);
      } catch (e) {
        setStatus('Basic Pitch נכשל — Essentia…', 12);
        result = await AudioAnalyzer.analyze(audioBuffer, setStatus);
      }
    } else {
      result = await AudioAnalyzer.analyze(audioBuffer, setStatus);
    }
    ingestAnalysis(result);
    setStatus('ניתוח הושלם', 100);
  }

  async function runStems() {
    if (!_blob) {
      setStatus('העלו קובץ תחילה', 0);
      return;
    }
    if (typeof StemAPI === 'undefined') {
      setStatus('StemAPI לא זמין', 0);
      return;
    }
    try {
      const file = new File([_blob], 'studio.mp3', { type: _blob.type || 'audio/mp4' });
      _stemBlob = await StemAPI.separate(file, {
        provider: _provider,
        stem: _provider === 'lalal' ? 'strings' : 'other',
        onProgress: (msg, pct) => setStatus(msg, pct),
      });
      setStatus('✓ בוזוקי/מיתרים מבודדים — ממשיכים לניתוח', 100);
      setStep('analyze');
      render();
    } catch (e) {
      setStatus(e.message || String(e), 0);
    }
  }

  function melodyPath() {
    return _melody.map(n => ({ ci: n.course, fret: n.fret }));
  }

  function renderFretboard() {
    const host = $('#bzs-fretboard');
    if (!host || !_melody.length) return;
    const fretsOnD = [...new Set(_melody.map(n => n.fret))].sort((a, b) => a - b);
    if (typeof FretboardScale !== 'undefined') {
      FretboardScale.mount(host, {
        frets: fretsOnD.length ? fretsOnD : [0, 2, 4, 5, 7],
        path: melodyPath(),
        pathLabels: true,
        drawPath: true,
      });
      _fbHost = host;
      return;
    }
    host.innerHTML = '<p class="hint">טוען לוח סריגים…</p>';
  }

  function flashNote(n) {
    if (!n) return;
    const svg = _fbHost?.querySelector('svg');
    if (svg && typeof FretboardScale !== 'undefined') {
      FretboardScale.flashMidi(svg, n.midi || (TUNING[n.course].midi + n.fret));
    }
  }

  function playAlong() {
    if (!_melody.length) return;
    stopPlay();
    _playing = true;
    _nextIdx = 0;
    _playStart = (typeof AudioEngine !== 'undefined' && AudioEngine.ctx)
      ? AudioEngine.ctx.currentTime : 0;
    if (typeof AudioEngine !== 'undefined') AudioEngine.ensureCtx();
    if (typeof registerPlayback === 'function') registerPlayback('bouzouki-studio', stopPlay);
    tickPlay();
  }

  function tickPlay() {
    if (!_playing) return;
    const t0 = (typeof AudioEngine !== 'undefined' && AudioEngine.ctx) ? AudioEngine.ctx.currentTime : 0;
    const elapsed = (t0 - _playStart) * _speed;
    while (_nextIdx < _melody.length && _melody[_nextIdx].time <= elapsed) {
      const n = _melody[_nextIdx];
      if (typeof AudioEngine !== 'undefined') {
        AudioEngine.pluckCourse(n.course, n.fret, 0, 0.55);
      }
      flashNote(n);
      _nextIdx++;
    }
    const prog = $('#bzs-play-prog');
    if (prog) prog.style.width = `${Math.min(100, (elapsed / _duration) * 100)}%`;
    if (elapsed >= _duration) {
      stopPlay();
      return;
    }
    _raf = requestAnimationFrame(tickPlay);
  }

  function stopPlay() {
    _playing = false;
    if (_raf) { cancelAnimationFrame(_raf); _raf = null; }
    if (typeof unregisterPlayback === 'function') unregisterPlayback('bouzouki-studio');
    const btn = $('#bzs-play-melody');
    if (btn) btn.textContent = '▶ נגן מלודיה על הגריף';
  }

  function stopBacking() {
    if (typeof BackingTracks !== 'undefined') BackingTracks.stop();
    _activeBackingIdx = null;
    document.querySelectorAll('.bzs-bt-card').forEach(c => c.classList.remove('active'));
  }

  function stop() {
    stopPlay();
    stopBacking();
  }

  let _step = 'source';

  function setStep(id) {
    _step = id;
    document.querySelectorAll('.bzs-step').forEach(el => {
      el.classList.toggle('active', el.dataset.step === id);
      el.classList.toggle('done', STEPS.findIndex(s => s.id === el.dataset.step) < STEPS.findIndex(s => s.id === id));
    });
  }

  function renderBackingList() {
    const host = $('#bzs-backing-list');
    if (!host || typeof BackingTracks === 'undefined') return;
    const tracks = BackingTracks.getTracks();
    const preferred = _dromosIds.length
      ? tracks.filter(t => _dromosIds.includes(t.dromos))
      : tracks;
    const rest = tracks.filter(t => !preferred.includes(t));
    const list = [...preferred, ...rest].slice(0, 8);
    host.innerHTML = list.map(t => {
      const idx = tracks.indexOf(t);
      const dr = DROMOI.find(d => d.id === t.dromos);
      return `<div class="bzs-bt-card card" data-idx="${idx}">
        <strong>${esc(t.name)}</strong>
        <span class="hint">${esc(dr?.nameHe || t.dromos)} · ${t.meter} · ${t.bpm} BPM</span>
        <button type="button" class="btn gold bzs-bt-play">▶ ליווי</button>
      </div>`;
    }).join('');
    host.querySelectorAll('.bzs-bt-play').forEach(btn => {
      btn.addEventListener('click', () => {
        const card = btn.closest('.bzs-bt-card');
        const idx = Number(card.dataset.idx);
        stopBacking();
        _activeBackingIdx = idx;
        card.classList.add('active');
        BackingTracks.startTrack(idx, {
          hideMixer: true,
          stepsEl: $('#bzs-bt-steps'),
        });
      });
    });
  }

  function render() {
    const app = $('#bouzouki-studio-app');
    if (!app) return;

    const dromosChips = _dromosIds.map(id => {
      const d = DROMOI.find(x => x.id === id);
      return d ? `<span class="bzs-dromos-chip">${esc(d.nameHe)}</span>` : '';
    }).join('');

    app.innerHTML = `
      <div class="bzs-steps">
        ${STEPS.map(s => `<button type="button" class="bzs-step${s.id === _step ? ' active' : ''}" data-step="${s.id}">${s.label}</button>`).join('')}
      </div>

      <div class="card bzs-panel" data-panel="source" ${ _step !== 'source' ? 'hidden' : ''}>
        <h2>1 · מקור אודיו</h2>
        <p class="hint">העלו MP3/WAV, או בחרו משיר שהורדתם לספריית הלימוד.</p>
        <div class="bzs-row">
          <input type="file" id="bzs-file" accept="audio/*">
          <button type="button" class="btn secondary" id="bzs-from-lib">📚 מהספרייה</button>
        </div>
        <div id="bzs-lib-pick" class="bzs-lib-pick" hidden></div>
        <p class="hint" id="bzs-file-name">${_blob ? '✓ קובץ נטען' : 'עדיין אין קובץ'}</p>
        <button type="button" class="btn gold" id="bzs-to-stems" ${!_blob ? 'disabled' : ''}>המשך → הפרדת stems</button>
      </div>

      <div class="card bzs-panel" data-panel="stems" ${ _step !== 'stems' ? 'hidden' : ''}>
        <h2>2 · Stem Splitter (בוזוקי / מיתרים)</h2>
        <p class="hint">מבודד את הבוזוקי מהליווי — דורש stem-proxy + מפתח LALAL או Moises.</p>
        <div class="bzs-row">
          <label>ספק:
            <select id="bzs-provider">
              <option value="lalal">LALAL.ai (strings)</option>
              <option value="moises">Moises (other)</option>
            </select>
          </label>
          <button type="button" class="btn gold" id="bzs-run-stem">🔬 הפרד stems</button>
          <button type="button" class="btn secondary" id="bzs-skip-stem">דלג — נתח את המקור המלא</button>
        </div>
        <p class="hint">${_stemBlob ? '✓ stem מוכן — עוברים לניתוח' : 'אופציונלי אך מומלץ לדיוק מלודיה'}</p>
      </div>

      <div class="card bzs-panel" data-panel="analyze" ${ _step !== 'analyze' ? 'hidden' : ''}>
        <h2>3 · ניתוח → מלודיה + אקורדים</h2>
        <div class="bzs-row">
          <span>מנוע:</span>
          <button type="button" class="btn small bzs-engine ${_engine === 'basicpitch' ? 'active' : ''}" data-e="basicpitch">Basic Pitch (מדויק)</button>
          <button type="button" class="btn small bzs-engine ${_engine === 'essentia' ? 'active' : ''}" data-e="essentia">Essentia (מהיר)</button>
          <button type="button" class="btn gold" id="bzs-analyze">🔬 נתח</button>
        </div>
      </div>

      <div class="card bzs-panel" data-panel="fretboard" ${ _step !== 'fretboard' ? 'hidden' : ''}>
        <h2>4 · המלודיה על כל המיתרים</h2>
        ${_analysis ? `<p class="bzs-meta">BPM <b>${_analysis.bpm || '—'}</b> · ${_melody.length} תווים · ${_chords.length} אקורדים</p>
          ${_dromosIds.length ? `<p>דרומוסים משוערים: ${dromosChips}</p>` : ''}` : '<p class="hint">הריצו ניתוח קודם</p>'}
        <div id="bzs-fretboard" class="bzs-fretboard" dir="ltr"></div>
        <div class="bzs-row">
          <button type="button" class="btn gold" id="bzs-play-melody">▶ נגן מלודיה על הגריף</button>
          <div class="bzs-prog-wrap"><div id="bzs-play-prog" class="bzs-play-prog"></div></div>
        </div>
        <button type="button" class="btn secondary" id="bzs-to-practice">המשך → תרגול עם ליווי</button>
      </div>

      <div class="card bzs-panel" data-panel="practice" ${ _step !== 'practice' ? 'hidden' : ''}>
        <h2>5 · תרגול עם ליווי לפי דרומוס</h2>
        <p class="hint">התחילו ליווי, ונגנו את המלודיה מעל — או פתחו את מסך "למד אותי את השיר".</p>
        <div id="bzs-backing-list" class="bzs-backing-list"></div>
        <div id="bzs-bt-steps" class="bt-steps bzs-bt-steps"></div>
        <div class="bzs-row">
          <button type="button" class="btn" id="bzs-stop-bt">■ עצור ליווי</button>
          <button type="button" class="btn gold" id="bzs-open-teacher">🎓 פתח במורה השיר</button>
          <button type="button" class="btn secondary" id="bzs-open-backing">רצועות ליווי מלאות</button>
        </div>
      </div>

      <div class="bzs-status-row">
        <div class="bzs-prog"><div id="bzs-prog-fill"></div></div>
        <span id="bzs-status" class="hint"></span>
      </div>`;

    app.querySelectorAll('.bzs-step').forEach(btn => {
      btn.addEventListener('click', () => {
        setStep(btn.dataset.step);
        render();
      });
    });

    $('#bzs-file')?.addEventListener('change', async e => {
      const f = e.target.files?.[0];
      if (!f) return;
      _blob = f;
      _stemBlob = null;
      _analysis = null;
      setStep('stems');
      render();
    });

    $('#bzs-from-lib')?.addEventListener('click', async () => {
      const box = $('#bzs-lib-pick');
      if (!box || typeof LearnOffline === 'undefined') {
        setStatus('ספרייה לא זמינה', 0);
        return;
      }
      const tracks = await LearnOffline.list();
      if (!tracks.length) {
        setStatus('אין שירים בספרייה — הורידו מלמד מהשיר', 0);
        return;
      }
      box.hidden = false;
      box.innerHTML = tracks.map(t => `
        <button type="button" class="btn secondary bzs-lib-item" data-id="${esc(t.videoId)}">${esc(t.titleHe || t.title)}</button>`).join('');
      box.querySelectorAll('.bzs-lib-item').forEach(btn => {
        btn.addEventListener('click', async () => {
          const rec = await LearnOffline.get(btn.dataset.id);
          if (rec?.blob) {
            _blob = rec.blob;
            _stemBlob = null;
            _analysis = null;
            setStep('stems');
            render();
          }
        });
      });
    });

    $('#bzs-to-stems')?.addEventListener('click', () => { setStep('stems'); render(); });
    $('#bzs-provider') && ($('#bzs-provider').value = _provider);
    $('#bzs-provider')?.addEventListener('change', e => { _provider = e.target.value; });
    $('#bzs-run-stem')?.addEventListener('click', runStems);
    $('#bzs-skip-stem')?.addEventListener('click', () => { setStep('analyze'); render(); });

    app.querySelectorAll('.bzs-engine').forEach(b => b.addEventListener('click', () => {
      _engine = b.dataset.e;
      app.querySelectorAll('.bzs-engine').forEach(x => x.classList.toggle('active', x === b));
    }));
    $('#bzs-analyze')?.addEventListener('click', () => analyzeBlob(_stemBlob || _blob));

    if (_step === 'fretboard' && _analysis) renderFretboard();
    $('#bzs-play-melody')?.addEventListener('click', () => {
      if (_playing) stopPlay();
      else playAlong();
    });
    $('#bzs-to-practice')?.addEventListener('click', () => { setStep('practice'); render(); });

    if (_step === 'practice') renderBackingList();
    $('#bzs-stop-bt')?.addEventListener('click', stopBacking);
    $('#bzs-open-teacher')?.addEventListener('click', () => {
      if (_analysis && typeof SongTeacher !== 'undefined') {
        SongTeacher.loadAnalysis(_analysis);
        document.querySelector('[data-screen="song-teacher"]')?.click();
      }
    });
    $('#bzs-open-backing')?.addEventListener('click', () => {
      document.querySelector('[data-screen="backing"]')?.click();
    });

    app.querySelectorAll('.bzs-panel').forEach(p => {
      p.hidden = p.dataset.panel !== _step;
    });
  }

  function init() {
    const app = $('#bouzouki-studio-app');
    if (!app) return;
    stop();
    _blob = null;
    _stemBlob = null;
    _analysis = null;
    _step = 'source';
    render();
  }

  return { init, stop, ingestAnalysis };
})();
