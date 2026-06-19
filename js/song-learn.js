/* ============================================================
   SongLearn — ניתוח שיר: BPM + אקורדים + סולם
   עובד לחלוטין offline — FFT + chroma + template matching
   ============================================================ */
'use strict';

const SongLearn = (() => {

  /* --------- FFT (Cooley-Tukey, in-place) --------- */
  function fft(re, im) {
    const n = re.length;
    for (let i = 1, j = 0; i < n; i++) {
      let bit = n >> 1;
      for (; j & bit; bit >>= 1) j ^= bit;
      j ^= bit;
      if (i < j) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let len = 2; len <= n; len <<= 1) {
      const ang = -2 * Math.PI / len;
      const wr = Math.cos(ang), wi = Math.sin(ang);
      for (let i = 0; i < n; i += len) {
        let cr = 1, ci = 0;
        const half = len >> 1;
        for (let j = 0; j < half; j++) {
          const ur = re[i+j], ui = im[i+j];
          const vr = re[i+j+half]*cr - im[i+j+half]*ci;
          const vi = re[i+j+half]*ci + im[i+j+half]*cr;
          re[i+j] = ur + vr; im[i+j] = ui + vi;
          re[i+j+half] = ur - vr; im[i+j+half] = ui - vi;
          const nc = cr*wr - ci*wi; ci = cr*wi + ci*wr; cr = nc;
        }
      }
    }
  }

  /* --------- Chromagram --------- */
  function buildChroma(samples, sampleRate) {
    const N = 8192;
    const chroma = new Float32Array(12);
    const re = new Float32Array(N), im = new Float32Array(N);
    // Hann window
    for (let i = 0; i < N && i < samples.length; i++) {
      const w = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
      re[i] = samples[i] * w;
      im[i] = 0;
    }
    fft(re, im);
    const freqPerBin = sampleRate / N;
    for (let bin = 2; bin < N / 2; bin++) {
      const freq = bin * freqPerBin;
      if (freq < 60 || freq > 4200) continue;
      const energy = re[bin]*re[bin] + im[bin]*im[bin];
      const midi = 69 + 12 * Math.log2(freq / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      chroma[pc] += energy;
    }
    // normalize
    let mx = 0;
    for (let i = 0; i < 12; i++) if (chroma[i] > mx) mx = chroma[i];
    if (mx > 0) for (let i = 0; i < 12; i++) chroma[i] /= mx;
    return chroma;
  }

  /* --------- Chord Templates --------- */
  const NOTE_NAMES_EN = ['C','C#','D','D#','E','F','F#','G','G#','A','Bb','B'];
  const NOTE_NAMES_HE = ['דו','דו#','רה','רה#','מי','פה','פה#','סול','סול#','לה','סיb','סי'];

  const CHORD_TEMPLATES = [
    { suffix: '',   type: 'maj',  bits: [1,0,0,0,1,0,0,1,0,0,0,0] }, // major
    { suffix: 'm',  type: 'min',  bits: [1,0,0,1,0,0,0,1,0,0,0,0] }, // minor
    { suffix: '7',  type: 'dom7', bits: [1,0,0,0,1,0,0,1,0,0,1,0] }, // dom7
    { suffix: 'm7', type: 'min7', bits: [1,0,0,1,0,0,0,1,0,0,1,0] }, // min7
    { suffix: 'maj7',type:'maj7', bits: [1,0,0,0,1,0,0,1,0,0,0,1] }, // maj7
    { suffix: 'dim', type:'dim',  bits: [1,0,0,1,0,0,1,0,0,0,0,0] }, // dim
    { suffix: 'sus4',type:'sus4', bits: [1,0,0,0,0,1,0,1,0,0,0,0] }, // sus4
  ];

  function matchChord(chroma) {
    let bestScore = -Infinity, bestRoot = 0, bestSuffix = '', bestType = 'maj';
    for (let root = 0; root < 12; root++) {
      for (const tmpl of CHORD_TEMPLATES) {
        let score = 0;
        for (let i = 0; i < 12; i++) {
          const pc = (i + root) % 12;
          score += tmpl.bits[i] > 0 ? chroma[pc] * 2 : -chroma[pc] * 0.5;
        }
        if (score > bestScore) {
          bestScore = score;
          bestRoot = root;
          bestSuffix = tmpl.suffix;
          bestType = tmpl.type;
        }
      }
    }
    return { root: bestRoot, suffix: bestSuffix, type: bestType, score: bestScore,
             name: NOTE_NAMES_EN[bestRoot] + bestSuffix,
             nameHe: NOTE_NAMES_HE[bestRoot] + bestSuffix };
  }

  /* --------- Scale / Mode Detection --------- */
  const SCALE_TEMPLATES = [
    { id: 'major',    nameHe: 'מז׳ור',         bits: [1,0,1,0,1,1,0,1,0,1,0,1] },
    { id: 'minor',    nameHe: 'מינור טבעי',     bits: [1,0,1,1,0,1,0,1,1,0,1,0] },
    { id: 'harm_min', nameHe: 'מינור הרמוני',   bits: [1,0,1,1,0,1,0,1,1,0,0,1] },
    { id: 'hitzaz',   nameHe: 'חיג׳אז (היצאץ)', bits: [1,1,0,0,1,1,0,1,1,0,0,1] },
    { id: 'rast',     nameHe: 'ראסט',           bits: [1,0,1,0,1,1,0,1,0,1,1,0] },
    { id: 'ousak',    nameHe: 'אוסאק',          bits: [1,1,0,1,0,1,0,1,1,0,1,0] },
    { id: 'niavent',  nameHe: 'ניאוונט',        bits: [1,0,1,1,0,0,1,1,1,0,0,1] },
    { id: 'phrygian', nameHe: 'פריג׳יאן',       bits: [1,1,0,1,0,1,0,1,1,0,1,0] },
    { id: 'dorian',   nameHe: 'דוריאן',         bits: [1,0,1,1,0,1,0,1,0,1,1,0] },
  ];

  function detectKey(globalChroma) {
    let bestScore = -Infinity, bestRoot = 0, bestScale = SCALE_TEMPLATES[0];
    for (let root = 0; root < 12; root++) {
      for (const scale of SCALE_TEMPLATES) {
        let score = 0;
        for (let i = 0; i < 12; i++) {
          const pc = (i + root) % 12;
          score += scale.bits[i] > 0 ? globalChroma[pc] : -globalChroma[pc] * 0.3;
        }
        if (score > bestScore) {
          bestScore = score; bestRoot = root; bestScale = scale;
        }
      }
    }
    return { root: bestRoot, scale: bestScale,
             label: NOTE_NAMES_EN[bestRoot] + ' ' + bestScale.nameHe };
  }

  /* --------- BPM Detection (onset-based) --------- */
  function detectBpm(samples, sampleRate) {
    const hopSz = Math.floor(sampleRate * 0.01); // 10ms hops
    const energies = [];
    for (let i = 0; i + hopSz < samples.length; i += hopSz) {
      let e = 0;
      for (let j = 0; j < hopSz; j++) e += samples[i+j] * samples[i+j];
      energies.push(e / hopSz);
    }
    // onset strength = positive difference
    const onsets = [];
    for (let i = 1; i < energies.length; i++) {
      const diff = energies[i] - energies[i-1];
      onsets.push(Math.max(0, diff));
    }
    // find peaks with min distance ~0.2s
    const minDist = Math.floor(0.2 / 0.01);
    const peaks = [];
    for (let i = 1; i < onsets.length - 1; i++) {
      if (onsets[i] > onsets[i-1] && onsets[i] >= onsets[i+1]) {
        if (peaks.length === 0 || i - peaks[peaks.length-1] >= minDist) {
          if (onsets[i] > 0.001) peaks.push(i);
        }
      }
    }
    if (peaks.length < 4) return 120;
    // histogram of inter-onset intervals → find dominant period
    const intervals = [];
    for (let i = 1; i < Math.min(peaks.length, 50); i++) {
      intervals.push(peaks[i] - peaks[i-1]);
    }
    // convert to BPM range 60-180
    const hist = new Array(300).fill(0);
    for (const iv of intervals) {
      const bpm = Math.round(60 / (iv * 0.01));
      if (bpm >= 60 && bpm <= 200) hist[bpm]++;
      // also check double/half tempo
      if (bpm*2 >= 60 && bpm*2 <= 200) hist[bpm*2] += 0.5;
      if (bpm/2 >= 60 && bpm/2 <= 200) hist[Math.round(bpm/2)] += 0.5;
    }
    let bestBpm = 120, bestCount = 0;
    for (let b = 60; b <= 200; b++) {
      if (hist[b] > bestCount) { bestCount = hist[b]; bestBpm = b; }
    }
    // round to nearest 5
    return Math.round(bestBpm / 5) * 5;
  }

  /* --------- Analysis Pipeline --------- */
  async function analyzeBuffer(audioBuffer, onProgress) {
    const sampleRate = audioBuffer.sampleRate;
    const duration = audioBuffer.duration;
    // mix to mono
    const ch0 = audioBuffer.getChannelData(0);
    const ch1 = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : ch0;
    const mono = new Float32Array(ch0.length);
    for (let i = 0; i < mono.length; i++) mono[i] = (ch0[i] + ch1[i]) * 0.5;

    // BPM
    onProgress(0.05, 'מחשב BPM...');
    const bpm = detectBpm(mono, sampleRate);

    // global chroma for key detection
    onProgress(0.15, 'מזהה סולם...');
    const globalChroma = new Float32Array(12);
    const step = Math.floor(sampleRate * 0.5);
    let count = 0;
    for (let start = 0; start + 8192 < mono.length; start += step) {
      const chunk = mono.subarray(start, start + 8192);
      const c = buildChroma(chunk, sampleRate);
      for (let i = 0; i < 12; i++) globalChroma[i] += c[i];
      count++;
    }
    if (count > 0) for (let i = 0; i < 12; i++) globalChroma[i] /= count;
    const keyInfo = detectKey(globalChroma);

    // chord detection: 1 chord per beat
    onProgress(0.3, 'מזהה אקורדים...');
    const beatDur = 60 / bpm;
    const chords = [];
    const totalBeats = Math.floor(duration / beatDur);

    // process in batches so UI stays responsive
    const batchSize = 20;
    for (let beat = 0; beat < totalBeats; beat++) {
      if (beat % batchSize === 0) {
        onProgress(0.3 + 0.65 * (beat / totalBeats), `ניתוח פעמה ${beat}/${totalBeats}...`);
        await new Promise(r => setTimeout(r, 0));
      }
      const startSample = Math.floor(beat * beatDur * sampleRate);
      const endSample = Math.min(mono.length, startSample + 8192);
      if (endSample - startSample < 1024) break;
      const chunk = mono.subarray(startSample, endSample);
      const chroma = buildChroma(chunk, sampleRate);
      const chord = matchChord(chroma);
      chords.push({ beat, time: beat * beatDur, chord });
    }

    // smooth: merge consecutive identical chords
    const smoothed = [];
    for (const item of chords) {
      const last = smoothed[smoothed.length - 1];
      if (last && last.chord.name === item.chord.name) {
        last.beats++;
        last.duration += beatDur;
      } else {
        smoothed.push({ ...item, beats: 1, duration: beatDur });
      }
    }
    // remove very short segments (< 2 beats)
    const filtered = smoothed.filter(s => s.beats >= 2);

    onProgress(1, 'הניתוח הושלם!');
    return { bpm, keyInfo, chords: filtered, duration, sampleRate };
  }

  /* --------- YouTube --------- */
  let ytPlayer = null, ytSyncTimer = null;

  function extractVideoId(url) {
    const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function loadYTApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    return new Promise(resolve => {
      if (window._ytApiCallbacks) { window._ytApiCallbacks.push(resolve); return; }
      window._ytApiCallbacks = [resolve];
      window.onYouTubeIframeAPIReady = () => {
        (window._ytApiCallbacks || []).forEach(fn => fn());
        window._ytApiCallbacks = [];
      };
      if (!document.getElementById('yt-api-script')) {
        const s = document.createElement('script');
        s.id = 'yt-api-script';
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
      }
    });
  }

  const INVIDIOUS = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://invidious.privacydev.net',
    'https://iv.melmac.space',
  ];

  async function invidiousFetch(path) {
    for (const base of INVIDIOUS) {
      try {
        const r = await fetch(base + path, { signal: AbortSignal.timeout(5000) });
        if (r.ok) return await r.json();
      } catch(e) { /* try next */ }
    }
    return null;
  }

  async function searchYouTube(query) {
    showError('');
    const grid = document.getElementById('sl-search-results');
    if (grid) grid.innerHTML = '<div class="sl-searching">מחפש...</div>';
    const results = await invidiousFetch(`/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=videoId,title,author,lengthSeconds,videoThumbnails`);
    if (!results || !results.length) {
      if (grid) grid.innerHTML = '<div class="sl-searching">לא נמצאו תוצאות. נסו חיפוש אחר.</div>';
      return;
    }
    if (grid) {
      grid.innerHTML = results.slice(0, 8).map(v => {
        const thumb = (v.videoThumbnails || []).find(t => t.quality === 'medium') || v.videoThumbnails?.[0];
        const dur = v.lengthSeconds ? `${Math.floor(v.lengthSeconds/60)}:${String(v.lengthSeconds%60).padStart(2,'0')}` : '';
        return `<div class="sl-result-card" data-id="${v.videoId}" data-title="${(v.title||'').replace(/"/g,'&quot;')}">
          ${thumb ? `<img class="sl-result-thumb" src="${thumb.url}" loading="lazy">` : '<div class="sl-result-thumb-ph"></div>'}
          <div class="sl-result-info">
            <div class="sl-result-title">${v.title || ''}</div>
            <div class="sl-result-meta">${v.author || ''} ${dur ? '· '+dur : ''}</div>
          </div>
        </div>`;
      }).join('');
      grid.querySelectorAll('.sl-result-card').forEach(card => {
        card.addEventListener('click', () => loadVideo(card.dataset.id, card.dataset.title));
      });
    }
  }

  async function loadVideo(vid, title) {
    showError('');
    const grid = document.getElementById('sl-search-results');
    if (grid) grid.style.display = 'none';

    const h = document.getElementById('sl-song-title');
    if (h) h.textContent = title || '';

    const prog = document.getElementById('sl-progress');
    const progFill = document.getElementById('sl-prog-fill');
    const progMsg = document.getElementById('sl-prog-msg');
    if (prog) prog.style.display = 'block';
    function onProg(p, msg) { if (progFill) progFill.style.width = (p*100)+'%'; if (progMsg) progMsg.textContent = msg; }
    onProg(0.05, 'טוען נגן...');

    // embed YouTube player
    await loadYTApi();
    const ytWrap = document.getElementById('sl-yt-wrap');
    if (ytWrap) {
      ytWrap.style.display = 'block';
      ytWrap.innerHTML = '<div id="sl-yt-iframe"></div>';
      if (ytPlayer) { try { ytPlayer.destroy(); } catch(e) {} }
      ytPlayer = new window.YT.Player('sl-yt-iframe', {
        videoId: vid,
        width: '100%',
        height: '220',
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1 },
      });
    }

    onProg(0.15, 'מנסה לקבל אודיו...');

    // try Piped API for audio analysis
    const PIPED_INSTANCES = [
      'https://pipedapi.kavin.rocks',
      'https://pipedapi.tokhmi.xyz',
      'https://piped-api.garudalinux.org',
    ];

    let audioUrl = null, videoTitle = '', videoDuration = 0;
    for (const base of PIPED_INSTANCES) {
      try {
        const r = await fetch(`${base}/streams/${vid}`, { signal: AbortSignal.timeout(5000) });
        if (!r.ok) continue;
        const data = await r.json();
        videoTitle = data.title || '';
        videoDuration = data.duration || 0;
        // prefer opus/webm or mp4 audio
        const streams = data.audioStreams || [];
        const best = streams.sort((a,b) => (b.bitrate||0)-(a.bitrate||0))[0];
        if (best?.url) { audioUrl = best.url; break; }
      } catch(e) { /* try next instance */ }
    }

    if (!audioUrl) {
      if (prog) prog.style.display = 'none';
      showError('לא ניתן לנתח את שמע YouTube ישירות (הגבלת CORS). ניגנו בוידאו ↑ — וגררו MP3 של השיר לניתוח.');
      return;
    }

    // fetch audio and analyze
    onProg(0.25, 'מוריד שמע...');
    try {
      const resp = await fetch(audioUrl, { signal: AbortSignal.timeout(30000) });
      if (!resp.ok) throw new Error('fetch failed');
      const buf = await resp.arrayBuffer();
      onProg(0.4, 'מפענח...');
      const tmpCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await tmpCtx.decodeAudioData(buf);
      await tmpCtx.close();
      initPlayer(audioBuffer);
      const result = await analyzeBuffer(audioBuffer, onProg);
      if (videoTitle) { const h = document.getElementById('sl-song-title'); if (h) h.textContent = videoTitle; }
      if (prog) prog.style.display = 'none';
      renderResults(result, true /* ytMode */);
      startYtSync();
    } catch(e) {
      if (prog) prog.style.display = 'none';
      showError('הורדת השמע נכשלה. גררו קובץ MP3 לניתוח, ונגנו את הוידאו ב-YouTube ↑ בצד.');
    }
  }

  function startYtSync() {
    if (ytSyncTimer) clearInterval(ytSyncTimer);
    ytSyncTimer = setInterval(() => {
      if (!ytPlayer || !analysisResult || typeof ytPlayer.getCurrentTime !== 'function') return;
      try {
        const state = ytPlayer.getPlayerState?.();
        if (state === 1) { // playing
          const t = ytPlayer.getCurrentTime();
          updateTimeline(t);
        }
      } catch(e) {}
    }, 200);
  }

  /* --------- Player (מבוסס PitchPreservingPlayer — האטה בלי שינוי גובה) --------- */
  let playerBuffer = null;
  let playerOffset = 0, playerPlaying = false;
  let playerRate = 1.0;
  let rafPlayer = null;
  let analysisResult = null;
  // לולאת A/B
  let loopA = null, loopB = null;
  const hasPPP = () => typeof PitchPreservingPlayer !== 'undefined';

  // נגן גיבוי (אם PPP לא זמין)
  let playerCtx = null, playerSource = null, playerStartTime = 0;

  function initPlayer(audioBuffer) {
    playerBuffer = audioBuffer;
    loopA = loopB = null;
    if (hasPPP()) { PitchPreservingPlayer.load(audioBuffer); }
    else {
      if (playerCtx) playerCtx.close();
      playerCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    renderPlayerUI();
  }

  function playFrom(offsetSec) {
    playerOffset = offsetSec;
    if (hasPPP()) {
      PitchPreservingPlayer.setTempo(playerRate, true);
      PitchPreservingPlayer.seek(offsetSec);
      PitchPreservingPlayer.play();
      playerPlaying = true;
    } else {
      if (!playerCtx || !playerBuffer) return;
      if (playerSource) { try { playerSource.stop(); } catch(e) {} }
      playerSource = playerCtx.createBufferSource();
      playerSource.buffer = playerBuffer;
      playerSource.playbackRate.value = playerRate;
      playerSource.connect(playerCtx.destination);
      playerSource.start(0, offsetSec);
      playerStartTime = playerCtx.currentTime;
      playerPlaying = true;
      playerSource.onended = () => { if (playerPlaying) { playerPlaying = false; updatePlayerBtn(); } };
    }
    updatePlayerBtn();
    schedulePlayerUpdate();
  }

  function stopPlayer() {
    if (hasPPP()) { PitchPreservingPlayer.pause(); }
    else if (playerSource) { try { playerSource.stop(); } catch(e) {} playerSource = null; }
    playerPlaying = false;
    updatePlayerBtn();
    cancelAnimationFrame(rafPlayer);
  }

  function togglePlay() {
    if (playerPlaying) { stopPlayer(); }
    else { playFrom(playerOffset); }
  }

  function currentTime() {
    if (hasPPP()) return PitchPreservingPlayer.getCurrentTime();
    if (!playerPlaying) return playerOffset;
    return playerOffset + (playerCtx.currentTime - playerStartTime) * playerRate;
  }

  function schedulePlayerUpdate() {
    cancelAnimationFrame(rafPlayer);
    function loop() {
      if (!playerPlaying) return;
      const t = currentTime();
      // לולאת A/B
      if (loopA !== null && loopB !== null && t >= loopB) {
        playFrom(loopA);
        return;
      }
      updateTimeline(t);
      rafPlayer = requestAnimationFrame(loop);
    }
    rafPlayer = requestAnimationFrame(loop);
  }

  function updateTimeline(t) {
    if (!analysisResult) return;
    // highlight current chord
    analysisResult.chords.forEach((item, i) => {
      const el = document.getElementById(`sc-chord-${i}`);
      if (!el) return;
      const active = t >= item.time && t < item.time + item.duration;
      el.classList.toggle('active', active);
      if (active) el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
    // update scrubber
    const scrub = document.getElementById('sl-scrubber');
    if (scrub && analysisResult.duration > 0) {
      scrub.value = (t / analysisResult.duration) * 1000;
    }
    // update time display
    const td = document.getElementById('sl-time');
    if (td) td.textContent = fmtTime(t) + ' / ' + fmtTime(analysisResult.duration);
  }

  function fmtTime(s) {
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }

  function updateLoopStatus() {
    const el = document.getElementById('sl-loop-status');
    if (!el) return;
    if (loopA !== null && loopB !== null) el.textContent = `🔁 ${fmtTime(loopA)}–${fmtTime(loopB)}`;
    else if (loopA !== null) el.textContent = `A=${fmtTime(loopA)} · קבעו B`;
    else el.textContent = '';
  }

  function updatePlayerBtn() {
    const btn = document.getElementById('sl-play-btn');
    if (btn) btn.textContent = playerPlaying ? '⏸' : '▶';
  }

  /* --------- UI --------- */
  const CHORD_COLORS = {
    maj:  'var(--gold,#e3b341)',
    min:  'var(--aegean,#4fb3d9)',
    dom7: '#e0884a',
    min7: '#7b9ee0',
    maj7: '#c2a030',
    dim:  '#a06060',
    sus4: '#60a890',
  };

  function renderResults(result, ytMode) {
    analysisResult = result;
    const res = document.getElementById('sl-results');
    if (!res) return;

    const chordsHtml = result.chords.map((item, i) => {
      const color = CHORD_COLORS[item.chord.type] || 'var(--text-dim,#999)';
      const width = Math.max(50, Math.min(200, item.beats * 28));
      return `<div class="sl-chord-block" id="sc-chord-${i}"
        style="background:${color}22;border-color:${color};min-width:${width}px"
        data-time="${item.time}" data-chord="${item.chord.name}">
        <div class="sl-chord-name" style="color:${color}">${item.chord.name}</div>
        <div class="sl-chord-beats">${item.beats} פ׳</div>
      </div>`;
    }).join('');

    res.innerHTML = `
      <div class="sl-meta-row">
        <div class="sl-meta-badge"><span class="sl-meta-val">${result.bpm}</span><span class="sl-meta-lbl">BPM</span></div>
        <div class="sl-meta-badge"><span class="sl-meta-val">${result.keyInfo.label}</span><span class="sl-meta-lbl">סולם</span></div>
        <div class="sl-meta-badge"><span class="sl-meta-val">${result.chords.length}</span><span class="sl-meta-lbl">אקורדים</span></div>
      </div>

      ${ytMode ? '<div class="sl-yt-note">▶ נגנו בוידאו YouTube ↑ — ציר האקורדים מסתנכרן אוטומטית</div>' : `
      <div class="sl-player-row">
        <button class="btn gold" id="sl-play-btn">▶</button>
        <input type="range" id="sl-scrubber" min="0" max="1000" value="0" style="flex:1;accent-color:var(--gold)">
        <span id="sl-time" style="font-size:12px;color:var(--text-dim)">0:00</span>
        <select id="sl-speed" class="ctrl-select" style="width:92px">
          <option value="1">1× מהירות</option>
          <option value="0.85">0.85×</option>
          <option value="0.7">0.7× איטי</option>
          <option value="0.5">0.5× איטי מאוד</option>
        </select>
      </div>
      <div class="sl-loop-row">
        <span class="sl-loop-lbl">🔁 לולאה לתרגול קטע:</span>
        <button class="btn btn-sm" id="sl-loop-a">קבע A</button>
        <button class="btn btn-sm" id="sl-loop-b">קבע B</button>
        <button class="btn btn-sm" id="sl-loop-clear">✕ נקה</button>
        <span class="sl-loop-status" id="sl-loop-status"></span>
      </div>`}

      <div class="sl-chord-timeline" id="sl-timeline">${chordsHtml}</div>

      <div class="sl-chord-detail" id="sl-chord-detail">
        <p style="color:var(--text-dim);font-size:13px">לחצו על אקורד לפרטים ←</p>
      </div>

      <div class="sl-unique-chords">
        <div class="sl-section-title">רשימת האקורדים בשיר</div>
        ${buildUniqueChordList(result.chords)}
      </div>
    `;

    // events
    document.getElementById('sl-play-btn').addEventListener('click', togglePlay);

    document.getElementById('sl-scrubber').addEventListener('input', (e) => {
      const t = (e.target.value / 1000) * result.duration;
      playerOffset = t;
      if (playerPlaying) playFrom(t);
      else updateTimeline(t);
    });

    document.getElementById('sl-speed').addEventListener('change', (e) => {
      playerRate = parseFloat(e.target.value);
      if (hasPPP()) {
        PitchPreservingPlayer.setTempo(playerRate, true);
      } else if (playerPlaying) {
        playerOffset = currentTime();
        playFrom(playerOffset);
      }
    });

    // לולאת A/B
    const loopA_btn = document.getElementById('sl-loop-a');
    const loopB_btn = document.getElementById('sl-loop-b');
    const loopClear = document.getElementById('sl-loop-clear');
    if (loopA_btn) loopA_btn.addEventListener('click', () => { loopA = currentTime(); updateLoopStatus(); });
    if (loopB_btn) loopB_btn.addEventListener('click', () => { loopB = currentTime(); if (loopA !== null && loopB < loopA) { const t = loopA; loopA = loopB; loopB = t; } updateLoopStatus(); });
    if (loopClear) loopClear.addEventListener('click', () => { loopA = loopB = null; updateLoopStatus(); });

    document.getElementById('sl-timeline').addEventListener('click', (e) => {
      const block = e.target.closest('.sl-chord-block');
      if (!block) return;
      const t = parseFloat(block.dataset.time);
      playerOffset = t;
      if (playerPlaying) playFrom(t);
      else updateTimeline(t);
      showChordDetail(block.dataset.chord);
    });

    renderPlayerUI();
  }

  function buildUniqueChordList(chords) {
    const seen = {};
    for (const item of chords) {
      const n = item.chord.name;
      if (!seen[n]) seen[n] = { chord: item.chord, count: 0 };
      seen[n].count++;
    }
    return '<div class="sl-unique-grid">' +
      Object.values(seen).sort((a,b) => b.count - a.count).map(({ chord, count }) => {
        const color = CHORD_COLORS[chord.type] || '#999';
        return `<div class="sl-unique-chip" style="border-color:${color}" onclick="SongLearn.showChordByName('${chord.name}')">
          <span style="color:${color};font-weight:700">${chord.name}</span>
          <span style="font-size:11px;color:var(--text-dim)">${count}×</span>
        </div>`;
      }).join('') +
    '</div>';
  }

  function renderPlayerUI() {
    // nothing extra needed — player row already rendered in results
  }

  function showChordDetail(chordName) {
    const detail = document.getElementById('sl-chord-detail');
    if (!detail) return;
    // get chord info from chord-library if available
    const root = chordName.replace(/m7?|maj7|dim|sus4|7/g,'');
    const suffix = chordName.slice(root.length);
    const rootIdx = NOTE_NAMES_EN.indexOf(root);

    let fretHtml = '';
    // try to use existing chord library shapes
    if (typeof CHORD_SHAPES !== 'undefined') {
      const shape = CHORD_SHAPES.find(s => s.name === chordName || s.name === chordName + ' maj');
      if (shape) {
        fretHtml = `<div class="sl-fret-hint">אחיזה: ${shape.frets.join('-')}</div>`;
      }
    }

    const typeLabels = {
      '': 'מז׳ור',  'm': 'מינור', '7': 'דומיננטי 7', 'm7': 'מינור 7',
      'maj7': 'מז׳ור 7', 'dim': 'דימינישד', 'sus4': 'sus4'
    };
    const typeName = typeLabels[suffix] || suffix;

    detail.innerHTML = `
      <div class="sl-detail-row">
        <div>
          <div class="sl-detail-name">${chordName}</div>
          <div class="sl-detail-type">${typeName}</div>
          ${rootIdx >= 0 ? `<div class="sl-detail-root">שורש: ${NOTE_NAMES_HE[rootIdx]}</div>` : ''}
          ${fretHtml}
          <button class="btn btn-sm" onclick="SongLearn.playChord('${chordName}')">🔊 שמעו</button>
        </div>
        <div class="sl-detail-diagram" id="sl-detail-diagram"></div>
      </div>
    `;
    if (typeof ChordTooltip !== 'undefined') ChordTooltip.renderInto('#sl-detail-diagram', chordName);
  }

  function playChordByName(chordName) {
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    const root = NOTE_NAMES_EN.indexOf(chordName.replace(/m7?|maj7|dim|sus4|7/g,''));
    if (root < 0) return;
    const suffix = chordName.slice(NOTE_NAMES_EN[root].length);
    // build MIDI notes for chord (simple voicing)
    const intervals = { '': [0,4,7], 'm': [0,3,7], '7': [0,4,7,10], 'm7': [0,3,7,10],
                        'maj7': [0,4,7,11], 'dim': [0,3,6], 'sus4': [0,5,7] };
    const ivs = intervals[suffix] || [0,4,7];
    const baseMidi = 60 + root; // C4 + root
    const t = AudioEngine.ctx.currentTime;
    ivs.forEach((iv, i) => {
      AudioEngine.pluckMidi(baseMidi + iv, t + i * 0.06, 0.5);
    });
  }

  /* --------- File handling --------- */
  async function handleFile(file) {
    if (!file || !file.type.startsWith('audio/')) {
      showError('נא להעלות קובץ אודיו (MP3, WAV, M4A, OGG)');
      return;
    }
    const prog = document.getElementById('sl-progress');
    const progFill = document.getElementById('sl-prog-fill');
    const progMsg = document.getElementById('sl-prog-msg');
    if (prog) prog.style.display = 'block';

    function onProgress(pct, msg) {
      if (progFill) progFill.style.width = (pct * 100) + '%';
      if (progMsg) progMsg.textContent = msg;
    }

    try {
      onProgress(0.01, 'טוען קובץ...');
      const arrayBuf = await file.arrayBuffer();
      onProgress(0.04, 'מפענח אודיו...');
      const tmpCtx = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await tmpCtx.decodeAudioData(arrayBuf);
      await tmpCtx.close();

      initPlayer(audioBuffer);

      const result = await analyzeBuffer(audioBuffer, onProgress);
      if (prog) prog.style.display = 'none';
      renderResults(result);

      // play a preview of the detected key
      if (typeof AudioEngine !== 'undefined') AudioEngine.ensureCtx();

    } catch(e) {
      if (prog) prog.style.display = 'none';
      showError('שגיאה בניתוח הקובץ: ' + e.message);
    }
  }

  function showError(msg) {
    const el = document.getElementById('sl-error');
    if (el) el.textContent = msg;
  }

  /* --------- Init --------- */
  function init() {
    const app = document.getElementById('song-learn-app');
    if (!app) return;

    app.innerHTML = `
      <div id="sl-song-title" style="font-size:16px;font-weight:700;color:var(--gold);min-height:20px;margin-bottom:10px"></div>

      <!-- YouTube search -->
      <div class="sl-yt-input-row">
        <span style="font-size:20px">🔴</span>
        <input type="text" id="sl-yt-search" placeholder="חפשו שיר — למשל: Misirlou bouzouki" class="sl-yt-input">
        <button class="btn gold" id="sl-yt-go">חפש</button>
      </div>
      <div id="sl-search-results" class="sl-search-results"></div>
      <div id="sl-yt-wrap" style="display:none;margin:10px 0;border-radius:12px;overflow:hidden;"></div>

      <!-- divider -->
      <div class="sl-divider"><span>או</span></div>

      <!-- file upload -->
      <div class="sl-upload-zone" id="sl-drop-zone">
        <div class="sl-upload-icon">🎵</div>
        <div class="sl-upload-title">גררו קובץ מוזיקה לכאן</div>
        <div class="sl-upload-sub">MP3 · WAV · M4A · OGG · FLAC</div>
        <button class="btn sl-upload-btn" id="sl-upload-btn">בחרו קובץ</button>
        <input type="file" id="sl-file-input" accept="audio/*" style="display:none">
      </div>

      <div class="sl-progress" id="sl-progress" style="display:none">
        <div class="sl-prog-bar"><div class="sl-prog-fill" id="sl-prog-fill"></div></div>
        <div class="sl-prog-msg" id="sl-prog-msg">מנתח...</div>
      </div>

      <div id="sl-error" style="color:var(--accent-red);margin:10px 0;font-size:14px"></div>
      <div id="sl-results"></div>
    `;

    const zone = document.getElementById('sl-drop-zone');
    const input = document.getElementById('sl-file-input');

    // YouTube search
    const ytBtn = document.getElementById('sl-yt-go');
    const ytInput = document.getElementById('sl-yt-search');
    ytBtn.addEventListener('click', () => { if (ytInput.value.trim()) searchYouTube(ytInput.value.trim()); });
    ytInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && ytInput.value.trim()) searchYouTube(ytInput.value.trim()); });

    document.getElementById('sl-upload-btn').addEventListener('click', () => input.click());
    input.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });

    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault(); zone.classList.remove('drag');
      if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
    });

    injectStyles();
  }

  function stop() {
    stopPlayer();
  }

  function injectStyles() {
    if (document.getElementById('sl-styles')) return;
    const s = document.createElement('style');
    s.id = 'sl-styles';
    s.textContent = `
      .sl-yt-input-row { display:flex; align-items:center; gap:8px; margin-bottom:6px; }
      .sl-yt-input { flex:1; background:var(--bg-elev,#222); border:1px solid var(--line,#444); border-radius:8px; padding:10px 14px; color:var(--text,#eee); font-size:14px; direction:ltr; }
      .sl-yt-input:focus { outline:none; border-color:var(--gold,#e3b341); }
      .sl-yt-note { font-size:13px; color:var(--aegean,#4fb3d9); margin:8px 0 12px; text-align:center; }
      .sl-search-results { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:8px; margin:10px 0; max-height:380px; overflow-y:auto; }
      .sl-searching { grid-column:1/-1; text-align:center; color:var(--text-dim,#999); font-size:14px; padding:20px; }
      .sl-result-card { background:var(--bg-card,#1a1a2e); border:1px solid var(--line,#333); border-radius:10px; overflow:hidden; cursor:pointer; transition:border-color .2s,transform .1s; }
      .sl-result-card:hover { border-color:var(--gold,#e3b341); transform:translateY(-2px); }
      .sl-result-thumb { width:100%; aspect-ratio:16/9; object-fit:cover; display:block; background:#111; }
      .sl-result-thumb-ph { width:100%; aspect-ratio:16/9; background:var(--bg-elev,#222); }
      .sl-result-info { padding:8px; }
      .sl-result-title { font-size:12px; font-weight:600; color:var(--text,#eee); line-height:1.3; max-height:36px; overflow:hidden; }
      .sl-result-meta { font-size:11px; color:var(--text-dim,#999); margin-top:3px; }
      .sl-divider { display:flex; align-items:center; gap:10px; margin:16px 0; color:var(--text-dim,#999); font-size:13px; }
      .sl-divider::before,.sl-divider::after { content:''; flex:1; height:1px; background:var(--line,#333); }
      .sl-upload-zone { border:2px dashed var(--line,#444); border-radius:16px; padding:40px 20px; text-align:center; transition:border-color .2s,background .2s; cursor:pointer; }
      .sl-upload-zone.drag,.sl-upload-zone:hover { border-color:var(--gold,#e3b341); background:rgba(227,179,65,.05); }
      .sl-upload-icon { font-size:48px; margin-bottom:12px; }
      .sl-upload-title { font-size:18px; font-weight:700; margin-bottom:6px; }
      .sl-upload-sub { font-size:13px; color:var(--text-dim,#999); margin-bottom:16px; }
      .sl-upload-btn { pointer-events:none; }
      .sl-upload-zone:hover .sl-upload-btn { pointer-events:all; }
      .sl-progress { margin:16px 0; }
      .sl-prog-bar { height:8px; background:var(--bg-elev,#222); border-radius:4px; overflow:hidden; margin-bottom:8px; }
      .sl-prog-fill { height:100%; background:var(--gold,#e3b341); border-radius:4px; transition:width .3s; width:0%; }
      .sl-prog-msg { font-size:13px; color:var(--text-dim,#999); text-align:center; }
      .sl-meta-row { display:flex; gap:12px; margin:16px 0 12px; flex-wrap:wrap; }
      .sl-meta-badge { background:var(--bg-card,#1a1a2e); border:1px solid var(--gold,#e3b341); border-radius:12px; padding:10px 18px; text-align:center; min-width:80px; }
      .sl-meta-val { display:block; font-size:20px; font-weight:900; color:var(--gold,#e3b341); }
      .sl-meta-lbl { display:block; font-size:11px; color:var(--text-dim,#999); margin-top:2px; }
      .sl-player-row { display:flex; align-items:center; gap:10px; margin:12px 0; }
      .sl-loop-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:8px 0 12px; }
      .sl-loop-lbl { font-size:12px; color:var(--text-dim,#999); }
      .sl-loop-status { font-size:12px; color:var(--gold,#e3b341); font-weight:600; margin-right:4px; }
      #sl-play-btn { width:44px; height:44px; border-radius:50%; font-size:18px; flex-shrink:0; }
      .sl-chord-timeline { display:flex; gap:6px; overflow-x:auto; padding:12px 4px; margin:8px 0; scroll-behavior:smooth; }
      .sl-chord-block { flex-shrink:0; border:2px solid; border-radius:10px; padding:8px 10px; cursor:pointer; transition:transform .1s,box-shadow .1s; text-align:center; }
      .sl-chord-block:hover,.sl-chord-block.active { transform:translateY(-3px); box-shadow:0 4px 16px rgba(0,0,0,.4); }
      .sl-chord-block.active { border-width:3px; }
      .sl-chord-name { font-size:15px; font-weight:700; }
      .sl-chord-beats { font-size:10px; color:var(--text-dim,#999); margin-top:2px; }
      .sl-chord-detail { background:var(--bg-card,#1a1a2e); border-radius:12px; padding:14px 18px; margin:12px 0; min-height:64px; }
      .sl-detail-row { display:flex; justify-content:space-between; align-items:center; gap:12px; }
      .sl-detail-diagram { flex-shrink:0; }
      .sl-detail-name { font-size:32px; font-weight:900; color:var(--gold,#e3b341); }
      .sl-detail-type,.sl-detail-root { font-size:14px; color:var(--text-dim,#999); }
      .sl-fret-hint { font-size:13px; color:var(--text,#eee); margin:6px 0; font-family:monospace; }
      .sl-section-title { font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:var(--text-dim,#999); margin-bottom:8px; }
      .sl-unique-grid { display:flex; flex-wrap:wrap; gap:8px; }
      .sl-unique-chip { display:flex; gap:6px; align-items:center; padding:6px 12px; border:1px solid; border-radius:8px; cursor:pointer; }
      .sl-unique-chip:hover { background:rgba(255,255,255,.05); }
      .sl-unique-chords { margin-top:16px; }
    `;
    document.head.appendChild(s);
  }

  return {
    init, stop,
    showChordByName: showChordDetail,
    playChord: playChordByName
  };
})();
