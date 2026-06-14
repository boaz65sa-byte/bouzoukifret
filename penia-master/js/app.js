/* ממשק — בוזוקי מאסטר */
'use strict';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const UI = (() => {
  let currentLevel = LEVELS[0];
  let bpm = LEVELS[0].bpm;
  let playBackTarget = 'pick-levels';
  let currentGameKind = 'pick';
  let seenTutorial = localStorage.getItem('penia-tutorial') === '1';
  let inputMode = localStorage.getItem('penia-input') || 'mic';
  let currentChord = null;
  let chordDrillActive = false;
  let chordDrillHits = 0;
  let chordDrillRound = 0;
  const CHORD_ROUNDS = 4;

  const GAME_NAMES = {
    pick: 'מאסטר הפריטה',
    modes: 'מאסטר המודוסים',
    chords: 'מאסטר האקורדים',
  };

  function levelListForKind(kind) {
    if (kind === 'modes') return MODE_LEVELS;
    if (kind === 'chords') return CHORD_FLOW_LEVELS;
    return LEVELS;
  }

  function kindFromLevel(lv) {
    if (lv.gameType === 'note') return 'modes';
    if (lv.gameType === 'chord') return 'chords';
    return 'pick';
  }

  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $('#screen-' + id).classList.add('active');
    $$('.bottom-nav .nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.screen === id);
    });
    $('.app').classList.toggle('play-mode', id === 'play' || id === 'chord-play');
    if (id === 'play') requestAnimationFrame(() => Engine.resize($('#game-canvas')));
  }

  function goHub(target) {
    try { stopGame(); stopChordDrill(); } catch (e) { /* */ }
    if (typeof Engine !== 'undefined') Engine.stopPreview();
    if (typeof PlayLearnGraph !== 'undefined') PlayLearnGraph.destroy();
    const dest = target || 'home';
    /* מעבר מסך קודם — גם אם הרינדור נכשל */
    if (dest === 'pick-levels') showScreen('pick-levels');
    else if (dest === 'chords') showScreen('chords');
    else if (dest === 'modes') showScreen('modes');
    else showScreen('home');
    window.scrollTo(0, 0);
    const active = document.querySelector('.screen.active');
    if (active) active.scrollTop = 0;

    try {
      if (dest === 'pick-levels') renderLevelMap();
      else if (dest === 'chords') { renderChordFlowMap(); renderChordGrid(); }
      else if (dest === 'modes') renderModeMap();
    } catch (e) {
      console.warn('render maps', e);
    }
  }

  /* גיבוי — onclick ב-HTML + רענון מפות */
  window.__peniaGoHub = goHub;
  window.__peniaGoHubFull = goHub;
  window.__peniaRefreshMaps = dest => {
    try {
      if (dest === 'pick-levels') renderLevelMap();
      else if (dest === 'chords') { renderChordFlowMap(); renderChordGrid(); }
      else if (dest === 'modes') renderModeMap();
    } catch (e) { console.warn('refresh maps', e); }
  };

  function bindHubNavigation() {
    const hub = $('#game-hub');
    const activate = (hubId, e) => {
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (hubId) goHub(hubId);
    };
    if (hub) {
      hub.addEventListener('click', e => {
        const btn = e.target.closest('[data-hub]');
        if (btn) activate(btn.getAttribute('data-hub'), e);
      });
    }
    $$('[data-hub]').forEach(btn => {
      const hubId = btn.getAttribute('data-hub');
      if (!hubId) return;
      btn.addEventListener('click', e => activate(hubId, e));
    });
  }

  function bind(el, evt, fn) {
    if (el) el.addEventListener(evt, fn);
  }

  let splashDone = false;

  function dismissSplash() {
    if (splashDone) return;
    splashDone = true;
    const sp = $('#splash');
    if (sp) sp.classList.add('hide');
    try { localStorage.setItem('penia-booted', '1'); } catch (e) { /* */ }
    boot();
  }

  function boot() {
    showScreen('home');
    try { refreshPlayerChip(); } catch (e) { console.warn('chip', e); }
    try { renderLevelMap(); renderModeMap(); renderChordFlowMap(); } catch (e) { console.warn('maps', e); }
    try { refreshCommunity(); } catch (e) { console.warn('community', e); }
  }

  /* ---- Splash ---- */
  function initSplash() {
    const sp = $('#splash');
    if (!sp) { boot(); return; }
    if (localStorage.getItem('penia-booted') === '1') {
      sp.classList.add('hide');
      splashDone = true;
      boot();
      return;
    }
    sp.addEventListener('click', dismissSplash);
    sp.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') dismissSplash();
    });
    setTimeout(dismissSplash, 600);
  }

  /* ---- Onboarding ---- */
  function initOnboard() {
    let step = 0;
    const steps = $$('.ob-step');
    const dots = $$('.ob-dot');
    function showStep(i) {
      steps.forEach((s, j) => s.classList.toggle('active', j === i));
      dots.forEach((d, j) => d.classList.toggle('active', j === i));
      step = i;
    }
    $('#ob-next')?.addEventListener('click', () => {
      if (step < steps.length - 1) showStep(step + 1);
      else { localStorage.setItem('penia-tutorial', '1'); seenTutorial = true; showScreen('home'); }
    });
    $('#ob-skip')?.addEventListener('click', () => {
      localStorage.setItem('penia-tutorial', '1');
      seenTutorial = true;
      showScreen('home');
    });
    showStep(0);
  }

  function renderChordCard(c, rank) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'chord-card-btn';
    card.innerHTML = `
      <span class="cc-rank">${rank || c.id}</span>
      <div class="cc-diag"></div>
      <div class="cc-info">
        <b>${c.id}</b>
        <small>${c.he}</small>
        <span>${c.role || ''}</span>
      </div>`;
    ChordDiagram.draw(card.querySelector('.cc-diag'), c.id, { noLabel: true });
    card.addEventListener('click', () => openChordPlay(c));
    return card;
  }

  function renderChordGrid() {
    renderChordLibrary();
  }

  function renderChordLibrary() {
    const wrap = $('#chord-library');
    if (!wrap) return;
    wrap.innerHTML = '';
    CHORD_CATEGORIES.forEach(cat => {
      const title = document.createElement('h4');
      title.className = 'chord-cat-title';
      title.textContent = cat.label;
      wrap.appendChild(title);
      const grid = document.createElement('div');
      grid.className = 'chord-grid';
      cat.ids.forEach((id, i) => {
        const c = getChord(id);
        if (c) grid.appendChild(renderChordCard(c, cat.id === 'iron' ? i + 1 : id));
      });
      wrap.appendChild(grid);
    });
  }

  function openChordPlay(chord) {
    currentChord = chord;
    stopChordDrill();
    $('#chord-play-title').textContent = chord.id + ' · ' + chord.he;
    $('#chord-play-sub').textContent = chord.role;
    ChordDiagram.draw($('#chord-diagram-big'), chord.id, { large: true });
    $('#chord-prep').classList.remove('hide');
    $('#chord-drill-status').textContent = 'לחצו ▶ שחק — החזיקו את האקורד ופרטו ↓';
    $('#chord-drill-score').textContent = '';
    showScreen('chord-play');
  }

  function stopChordDrill() {
    chordDrillActive = false;
    MicInput.stop();
    $('#chord-prep').classList.remove('hide');
  }

  async function startChordDrill() {
    if (!currentChord || chordDrillActive) return;
    AudioEngine.ensureCtx();
    $('#chord-prep').classList.add('hide');
    chordDrillHits = 0;
    chordDrillRound = 0;
    chordDrillActive = true;
    let roundScored = false;

    try {
      await MicInput.start(({ freq }) => {
        if (!chordDrillActive || roundScored) return;
        if (freq) {
          $('#chord-drill-status').textContent = `שומע: ${MicInput.freqLabel(freq)} — ${currentChord.id}?`;
        }
        if (freq && matchChord(currentChord, freq)) {
          roundScored = true;
          chordDrillHits++;
          $('#chord-drill-status').textContent = '✓ נשמע נכון!';
          $('#chord-drill-status').className = 'chord-drill-status ok';
        }
      }, null, { pitchMode: true });
    } catch (e) {
      chordDrillActive = false;
      $('#chord-prep').classList.remove('hide');
      $('#chord-drill-status').textContent = 'אין מיקרופון — אשרו גישה';
      return;
    }

    for (let r = 1; r <= CHORD_ROUNDS && chordDrillActive; r++) {
      roundScored = false;
      chordDrillRound = r;
      $('#chord-drill-status').className = 'chord-drill-status';
      $('#chord-drill-status').textContent = `סיבוב ${r}/${CHORD_ROUNDS} — 3…`;
      await wait(700);
      if (!chordDrillActive) break;
      $('#chord-drill-status').textContent = `סיבוב ${r} — 2…`;
      await wait(700);
      if (!chordDrillActive) break;
      $('#chord-drill-status').textContent = `סיבוב ${r} — 1… פרטו!`;
      await wait(700);
      if (!chordDrillActive) break;
      const before = chordDrillHits;
      $('#chord-drill-status').textContent = '▼ פרטו עכשיו ↓';
      await wait(1800);
      if (chordDrillHits === before) {
        $('#chord-drill-status').textContent = 'לא נקלט — בדקו את הפרט';
        $('#chord-drill-status').className = 'chord-drill-status err';
      }
      await wait(600);
    }

    MicInput.stop();
    chordDrillActive = false;
    const pct = Math.round((chordDrillHits / CHORD_ROUNDS) * 100);
    $('#chord-drill-score').textContent = `${chordDrillHits}/${CHORD_ROUNDS} פגיעות · ${pct}%`;
    $('#chord-drill-status').textContent = pct >= 75 ? '🏆 מצוין! האקורד נכנס' : '💪 עוד סיבוב — החזיקו את הפרט';
    $('#chord-drill-status').className = 'chord-drill-status ' + (pct >= 75 ? 'ok' : '');
    $('#chord-prep').classList.remove('hide');
  }

  function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

  function renderGenericMap(list, containerId, onOpen) {
    const grid = $(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    if (!Array.isArray(list) || !list.length) {
      grid.innerHTML = '<p class="map-empty">שלבים לא נטענו — רעננו את הדף (Ctrl+F5)</p>';
      return;
    }
    const p = Players.current();
    list.forEach(lv => {
      try {
        const unlocked = Players.isUnlocked(lv.id);
        const prog = p.progress[lv.id] || {};
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'level-card' + (unlocked ? '' : ' locked') + (lv.song ? ' song-level' : '');
        card.disabled = !unlocked;
        card.innerHTML = `
        <div class="lc-num">${lv.icon}</div>
        <div class="lc-body">
          <div class="lc-name">${lv.name}</div>
          <div class="lc-sub">${lv.subtitle}</div>
          <div class="lc-stars">${'★'.repeat(prog.stars || 0)}${'☆'.repeat(3 - (prog.stars || 0))}</div>
        </div>
        ${unlocked ? '<div class="lc-play">▶</div>' : '<div class="lc-lock">🔒</div>'}`;
        if (unlocked) {
          card.addEventListener('click', () => {
            try { onOpen(lv); }
            catch (err) {
              console.warn('open level', err);
              if (typeof openPlay === 'function') openPlay(lv, playBackTarget, currentGameKind);
            }
          });
        }
        grid.appendChild(card);
      } catch (err) {
        console.warn('level card', lv?.id, err);
      }
    });
  }

  function renderLevelMap() {
    renderGenericMap(LEVELS, '#level-map', lv => openPlay(lv, 'pick-levels', 'pick'));
  }

  function renderModeMap() {
    const list = typeof MODE_LEVELS !== 'undefined' ? MODE_LEVELS : [];
    renderGenericMap(list, '#mode-map', lv => openPlay(lv, 'modes', 'modes'));
  }

  function renderChordFlowMap() {
    const all = typeof CHORD_FLOW_LEVELS !== 'undefined' ? CHORD_FLOW_LEVELS : [];
    const flow = all.filter(l => !l.song);
    const songs = all.filter(l => l.song);
    renderGenericMap(flow, '#chord-flow-map', lv => openPlay(lv, 'chords', 'chords'));
    renderGenericMap(songs, '#chord-song-map', lv => openPlay(lv, 'chords', 'chords'));
  }

  function refreshPlayerChip() {
    const p = Players.current();
    $('#player-chip').innerHTML = `<span class="chip-av">${p.avatar}</span><span>${p.name}</span>`;
    renderPlayersList();
  }

  function refreshCommunity() {
    const s = Community.stats();
    $('#comm-local').innerHTML = `
      <div class="comm-stat"><b>${s.localPlayers}</b><span>שחקנים</span></div>
      <div class="comm-stat"><b>${s.localGames}</b><span>משחקים</span></div>`;
    const globalEl = $('#comm-global');
    if (s.online && s.globalGames != null) {
      globalEl.hidden = false;
      globalEl.innerHTML = `
        <div class="comm-banner online">
          <div class="comm-group">${s.groupName}</div>
          <div class="comm-global-row">
            <div><b>${s.globalPlayers}</b> נגנים בקהילה</div>
            <div><b>${s.globalGames}</b> משחקים סה"כ</div>
          </div>
        </div>`;
    } else {
      globalEl.hidden = true;
      globalEl.innerHTML = '';
    }
  }

  function updateInputModeUI() {
    const btn = $('#btn-input-mode');
    const isMic = inputMode === 'mic';
    btn.textContent = isMic ? '🎸' : '📱';
    btn.classList.toggle('mic', isMic);
    btn.classList.toggle('touch', !isMic);
    btn.title = isMic ? 'מצב: בוזוקי אמיתי (מיקרופון)' : 'מצב: הקשה על המסך';
    $('#mic-meter').hidden = !isMic;
    $('#mic-status').textContent = isMic ? 'פרטו על מיתר מושתק — המשחק שומע' : '';
    localStorage.setItem('penia-input', inputMode);
  }

  function buildFeedback(counts, gt) {
    const tips = [];
    if (gt === 'pick') {
      if (counts.wrong > 2) tips.push('↕ בדקו כיוון: ↓ למטה · ↑ למעלה');
    } else if (gt === 'note') {
      if (counts.wrong > 2) tips.push('♩ בדקו סריג ואינטונציה — צליל אחד בכל פעם');
    } else {
      if (counts.wrong > 2) tips.push('🎸 החזיקו את האקורד לפני הקו — פריטה ↓ נקייה');
    }
    if (counts.early > counts.late + 2) tips.push('⏱ מוקדמים — חכו עוד רגע לקו הזהב');
    if (counts.late > counts.early + 2) tips.push('⏱ מאוחרים — נגנו מעט לפני הקו');
    if (counts.miss > 3) tips.push('👂 הקשיבו למטרונום — דיוק לפני מהירות');
    if (!tips.length && counts.perfect > counts.good) tips.push('🎸 נקי — המשיכו כך!');
    return tips.join(' · ');
  }

  function updateLaneZones(gt) {
    const lane = $('#lane-box');
    lane.classList.toggle('lane-pick', gt === 'pick');
    lane.classList.toggle('lane-notes', gt === 'note');
    lane.classList.toggle('lane-chords', gt === 'chord');
    lane.classList.toggle('lane-highway', gt === 'note' || gt === 'chord');
    const zu = $('#zone-up'), zd = $('#zone-down');
    if (gt === 'pick') {
      zu.textContent = '↑ למעלה'; zd.textContent = '↓ למטה';
      zu.hidden = false; zd.hidden = false;
    } else {
      zu.hidden = true; zd.hidden = true;
    }
    $('#btn-input-mode').hidden = gt !== 'pick';
  }

  async function startMicForGame() {
    if (inputMode !== 'mic') return;
    const gt = currentLevel.gameType || 'pick';
    const needsPitch = gt === 'note' || gt === 'chord';
    try {
      await MicInput.start(
        ({ dir, freq, hitTime }) => {
          if (gt === 'pick') Engine.handleInput(dir, hitTime);
          else if (gt === 'note') {
            if (freq) $('#mic-status').textContent = '🎤 זוהה: ' + MicInput.freqLabel(freq);
            Engine.handleNoteHit(freq, hitTime);
          } else {
            if (freq) $('#mic-status').textContent = '🎤 זוהה: ' + MicInput.freqLabel(freq);
            Engine.handleChordHit(freq, hitTime);
          }
        },
        lvl => { $('#mic-fill').style.width = (lvl * 100) + '%'; },
        { pitchMode: needsPitch }
      );
      const msg = gt === 'pick' ? '🎤 שומע — פרטו בזמן'
        : gt === 'note' ? '🎤 שומע — צליל אחד, סריג ברור, ליד הקו'
        : '🎤 שומע — החזיקו אקורד, פרטו ↓ ליד הקו';
      $('#mic-status').textContent = msg;
    } catch (e) {
      inputMode = 'touch';
      updateInputModeUI();
      const msg = e.message === 'denied'
        ? 'אין גישה למיקרופון — עברתם למצב הקשה'
        : 'מיקרופון לא זמין — מצב הקשה';
      $('#calib-msg').textContent = msg;
      $('#calib-msg').className = 'calib-msg err';
    }
  }

  function stopMicForGame() {
    MicInput.stop();
    $('#mic-fill').style.width = '0%';
    if (inputMode === 'mic') $('#mic-status').textContent = 'פרטו על מיתר מושתק — המשחק שומע';
  }

  /* ---- Prep (מפת מודוס / אקורדים) ---- */
  function openPrep(lv, backTo, kind) {
    currentLevel = lv;
    currentGameKind = kind || kindFromLevel(lv);
    playBackTarget = backTo || 'home';
    const gt = lv.gameType || 'pick';
    $('#prep-title').textContent = lv.name;
    $('#prep-sub').textContent = lv.subtitle + ' · ' + lv.bpm + ' BPM';
    $('#prep-teach').textContent = lv.teach;
    $('#prep-tip').textContent = '💡 ' + lv.tip;
    const vis = $('#prep-visual');
    try {
      if (gt === 'note') {
        $('#prep-badge').textContent = lv.dromos
          ? '📍 גרף לימוד · ' + lv.dromos
          : '📍 גרף לימוד · מיתר רה';
        if (typeof ModeDiagram !== 'undefined' && lv.notes?.length) {
          ModeDiagram.draw(vis, ModeDiagram.uniqueScaleNotes(lv.notes), {
            playNotes: lv.notes,
            title: (lv.dromos || lv.name) + ' · מיתר רה',
          });
        } else if (vis) {
          vis.innerHTML = '<p class="map-empty">מפת מודוס · ' + (lv.notes?.length || 0) + ' צלילים</p>';
        }
      } else {
        $('#prep-badge').textContent = lv.song ? '📍 גרף לימוד · שיר יווני' : '📍 גרף לימוד · אקורדים';
        if (typeof ChordMap !== 'undefined' && lv.chordSeq?.length) {
          ChordMap.drawProgression(vis, lv.chordSeq, { fullSeq: lv.chordSeq, song: !!lv.song });
        } else if (vis) {
          vis.innerHTML = '<p class="map-empty">' + (lv.chordSeq || []).join(' → ') + '</p>';
        }
      }
    } catch (err) {
      console.warn('prep visual', err);
      if (vis) vis.innerHTML = '<p class="map-empty">תצוגה מקדימה · לחצו ▶ שחק</p>';
    }
    $('#prep-flow-hint').textContent = gt === 'note'
      ? 'כשמוכנים — הצלילים יזרמו לקו הזהב · נגנו כל צליל על מיתר רה'
      : lv.song
        ? 'כשמוכנים — האקורדים יזרמו כמו בשיר · פרטו ↓ על הבוזוקי בזמן'
        : 'כשמוכנים — האקורדים יזרמו לקו הזהב · החזיקו צורה ופרטו ↓';
    showScreen('prep');
    window.scrollTo(0, 0);
  }

  /* ---- Play ---- */
  function openPlay(lv, backTo, kind) {
    currentLevel = lv;
    currentGameKind = kind || kindFromLevel(lv);
    playBackTarget = backTo || 'pick-levels';
    bpm = lv.bpm;
    const gt = lv.gameType || 'pick';
    $('#play-title').textContent = lv.name;
    $('#play-sub').textContent = lv.subtitle + ' · ' + lv.bpm + ' BPM';
    $('#play-teach').textContent = lv.teach;
    $('#play-tip').textContent = '💡 ' + lv.tip;
    $('#play-bpm-val').textContent = bpm;
    renderPlayPattern(lv, gt);
    updateLaneZones(gt);
    const prog = Players.current().progress[lv.id];
    $('#play-best').textContent = prog?.best ? `שיא ${prog.best}` : '';
    $('#results-panel').classList.remove('show');
    $('#hud-score').textContent = '0';
    $('#hud-combo').textContent = '';
    const learnWrap = $('#play-learn-wrap');
    if (learnWrap) learnWrap.hidden = true;
    if (typeof PlayLearnGraph !== 'undefined') PlayLearnGraph.destroy();
    const playDetails = document.querySelector('#screen-play .play-details');
    if (playDetails) playDetails.hidden = gt === 'note' || gt === 'chord';
    setPlayUIState(false);
    updateInputModeUI();
    showScreen('play');
    requestAnimationFrame(() => {
      Engine.resize($('#game-canvas'));
      if (gt === 'note' || gt === 'chord') {
        Engine.showPreview(lv, $('#game-canvas'));
      } else {
        Engine.stopPreview();
      }
    });
  }

  function renderPlayPattern(lv, gt) {
    const el = $('#play-pattern');
    el.innerHTML = '';
    if (gt === 'pick') {
      renderPattern(el, lv.strokes);
    } else if (gt === 'note') {
      lv.notes.forEach(n => {
        const sp = document.createElement('span');
        sp.className = 'pat note';
        sp.textContent = n.label || n.solfege;
        el.appendChild(sp);
      });
    } else {
      lv.chordSeq.forEach(id => {
        const sp = document.createElement('span');
        sp.className = 'pat chord';
        sp.textContent = id;
        el.appendChild(sp);
      });
    }
  }

  function renderPattern(el, strokes) {
    el.innerHTML = '';
    strokes.forEach(s => {
      const sp = document.createElement('span');
      const rest = s === '-', acc = s === 'D' || s === 'U';
      sp.className = 'pat' + (acc ? ' acc' : '') + (rest ? ' rest' : '');
      sp.textContent = rest ? '·' : s.toLowerCase() === 'd' ? '↓' : '↑';
      el.appendChild(sp);
    });
  }

  function setPlayUIState(running) {
    $('#lane-box').classList.toggle('game-running', running);
    $('#btn-stop').hidden = !running;
    if (!running) $('#lane-box').classList.remove('calibrating');
  }

  function startGame() {
    Engine.stopPreview();
    Engine.stop();
    stopMicForGame();
    AudioEngine.ensureCtx();
    setPlayUIState(true);
    $('#calib-msg').textContent = '';
    Engine.start(currentLevel, bpm, $('#game-canvas'),
      ({ score, combo }) => {
        $('#hud-score').textContent = Math.round(score);
        $('#hud-combo').textContent = combo > 1 ? combo + '×' : '';
      },
      result => showResults(result)
    );
    startMicForGame();
  }

  function stopGame() {
    Engine.stop();
    stopMicForGame();
    setPlayUIState(false);
    const gt = currentLevel?.gameType || 'pick';
    if (gt === 'note' || gt === 'chord') {
      requestAnimationFrame(() => Engine.showPreview(currentLevel, $('#game-canvas')));
    }
  }

  function showResults(r) {
    stopGame();
    const list = levelListForKind(currentGameKind);
    const prev = Players.current().progress[r.level.id]?.best || 0;
    const isRecord = r.score > prev;
    Players.recordResult(r.level.id, r.score, r.stars, r.counts, r.bpm);
    renderLevelMap();
    renderModeMap();
    renderChordFlowMap();
    refreshCommunity();

    const msgs = [
      '💪 האטו — דיוק לפני מהירות',
      '👍 נכנס! עוד סבב',
      '⭐ מצוין! כמעט מושלם',
      '🏆 μάστορα! שליטה מלאה'
    ];

    const feedback = buildFeedback(r.counts, r.gameType || 'pick');
    const panel = $('#results-panel');
    panel.className = 'results-panel show ' + ['work', 'ok', 'good', 'gold'][r.stars];
    const idx = list.findIndex(l => l.id === r.level.id);
    const hasNext = r.stars >= 1 && idx < list.length - 1;
    panel.innerHTML = `
      <div class="res-inner">
        <div class="res-stars">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div>
        <div class="res-score">${Math.round(r.score)} ${isRecord ? '<span class="rec">שיא!</span>' : ''}</div>
        <div class="res-msg">${msgs[r.stars]}</div>
        <div class="res-detail">דיוק ${(r.acc * 100).toFixed(0)}% · מושלם ${r.counts.perfect} · קומבו ${r.maxCombo}</div>
        ${feedback ? `<div class="res-feedback">${feedback}</div>` : ''}
        <div class="res-btns">
          <button class="btn gold" id="res-retry">🔁 שוב</button>
          ${r.stars >= 2 ? '<button class="btn" id="res-faster">⚡ +5 BPM</button>' : ''}
          ${hasNext ? '<button class="btn" id="res-next">⬆ שלב הבא</button>' : ''}
          <button class="btn" id="res-share">📤 שתף</button>
        </div>
      </div>`;
    $('#res-retry').onclick = () => { panel.classList.remove('show'); startGame(); };
    const faster = $('#res-faster');
    if (faster) faster.onclick = () => { bpm += 5; $('#play-bpm-val').textContent = bpm; panel.classList.remove('show'); startGame(); };
    const next = $('#res-next');
    if (next) next.onclick = () => openPlay(list[idx + 1], playBackTarget, currentGameKind);
    $('#res-share').onclick = () => shareScore(r, isRecord);
  }

  function shareScore(r, isRecord) {
    const p = Players.current();
    const gameName = GAME_NAMES[currentGameKind] || 'בוזוקי מאסטר';
    const text = `🎸 בוזוקי מאסטר — ${p.name}\n` +
      `${gameName} · ${r.level.name} (${r.bpm} BPM)\n` +
      `ניקוד: ${Math.round(r.score)} ${isRecord ? '🏆 שיא!' : ''}\n` +
      `כוכבים: ${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}\n` +
      `דיוק: ${(r.acc * 100).toFixed(0)}%\n` +
      `נסו גם: ${location.href}`;
    if (navigator.share) {
      navigator.share({ title: 'בוזוקי מאסטר', text }).catch(() => copy(text));
    } else copy(text);
  }

  function copy(text) {
    navigator.clipboard?.writeText(text);
    alert('הועתק! הדביקו בקבוצת הוואטסאפ 🎸');
  }

  /* ---- Leaderboard ---- */
  function fillLbLevels(kind) {
    const sel = $('#lb-level');
    const list = levelListForKind(kind);
    sel.innerHTML = '';
    list.forEach((lv, i) => {
      const o = document.createElement('option');
      o.value = i; o.textContent = lv.name;
      sel.appendChild(o);
    });
  }

  function renderLeaderboard() {
    const gameSel = $('#lb-game');
    const kind = gameSel.value || 'pick';
    fillLbLevels(kind);
    const list = levelListForKind(kind);
    const lv = list[parseInt($('#lb-level').value, 10) || 0];
    const rows = Players.leaderboard(lv.id);
    const listEl = $('#lb-list');
    listEl.innerHTML = rows.length ? '' : '<p class="empty">עדיין אין תוצאות — שחקו!</p>';
    rows.forEach((row, i) => {
      const div = document.createElement('div');
      div.className = 'lb-row' + (i === 0 ? ' first' : '');
      div.innerHTML = `
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-av">${row.avatar}</span>
        <span class="lb-name">${row.name}</span>
        <span class="lb-stars">${'★'.repeat(row.stars)}</span>
        <span class="lb-score">${row.best}</span>`;
      listEl.appendChild(div);
    });
  }

  /* ---- Players ---- */
  function renderPlayersList() {
    const list = $('#players-list');
    list.innerHTML = '';
    Players.all().forEach(p => {
      const div = document.createElement('div');
      div.className = 'player-row' + (p.id === Players.current().id ? ' active' : '');
      div.innerHTML = `
        <span class="pr-av">${p.avatar}</span>
        <div class="pr-info"><b>${p.name}</b><small>${p.stats.games} משחקים · ${p.stats.totalScore} נק׳</small></div>
        ${p.id === Players.current().id ? '<span class="pr-badge">פעיל</span>' : ''}`;
      div.addEventListener('click', () => {
        Players.setCurrent(p.id);
        refreshPlayerChip();
        renderLevelMap();
        renderModeMap();
        renderChordFlowMap();
      });
      list.appendChild(div);
    });
  }

  function addPlayer() {
    const nameInput = $('#new-player-name');
    const feedback = $('#player-feedback');
    const name = nameInput.value.trim();
    if (!name) {
      feedback.textContent = 'הקלידו שם לפני הוספה';
      feedback.className = 'player-feedback err';
      nameInput.focus();
      return;
    }
    try {
      Players.create(name, $('#avatar-pick').dataset.sel || AVATARS[0]);
      nameInput.value = '';
      feedback.textContent = `נוסף: ${name} ✓`;
      feedback.className = 'player-feedback ok';
      refreshPlayerChip();
      renderLevelMap();
      renderModeMap();
      renderChordFlowMap();
      refreshCommunity();
      setTimeout(() => { feedback.textContent = ''; feedback.className = 'player-feedback'; }, 2500);
    } catch (e) {
      feedback.textContent = 'לא ניתן לשמור — בדקו שהדפדפן לא חוסם אחסון';
      feedback.className = 'player-feedback err';
    }
  }

  function initPlayersForm() {
    const avWrap = $('#avatar-pick');
    AVATARS.forEach(a => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'av-btn'; b.textContent = a;
      b.addEventListener('click', () => {
        $$('.av-btn').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        avWrap.dataset.sel = a;
      });
      avWrap.appendChild(b);
    });
    $$('.av-btn')[0]?.classList.add('sel');
    avWrap.dataset.sel = AVATARS[0];

    $('#add-player-form').addEventListener('submit', e => {
      e.preventDefault();
      addPlayer();
    });
  }

  /* ---- Init ---- */
  function init() {
    bindHubNavigation();
    initSplash();
    initOnboard();
    try { initPlayersForm(); } catch (e) { console.warn('players form', e); }
    try { renderChordGrid(); } catch (e) { console.warn('chord grid', e); }
    try { renderModeMap(); renderChordFlowMap(); renderLevelMap(); } catch (e) { console.warn('maps', e); }

    $$('[data-back]').forEach(btn => bind(btn, 'click', () => goHub(btn.dataset.back)));
    bind($('#btn-back-play'), 'click', () => goHub(playBackTarget));
    bind($('#btn-back-prep'), 'click', () => goHub(playBackTarget));
    bind($('#btn-prep-play'), 'click', () => openPlay(currentLevel, playBackTarget, currentGameKind));
    bind($('#btn-back-chord'), 'click', () => { stopChordDrill(); goHub('chords'); });
    bind($('#btn-chord-play'), 'click', () => startChordDrill());

    $$('.bottom-nav .nav-item').forEach(n => {
      n.addEventListener('click', () => {
        stopGame();
        const sc = n.dataset.screen;
        showScreen(sc);
        if (sc === 'leaderboard') renderLeaderboard();
        if (sc === 'players') {
          renderPlayersList();
          setTimeout(() => {
            $('#screen-players').scrollTop = $('#screen-players').scrollHeight;
            $('#new-player-name')?.focus({ preventScroll: true });
          }, 80);
        }
        if (sc === 'home') {
          try { renderLevelMap(); renderModeMap(); renderChordFlowMap(); } catch (e) { /* */ }
          refreshCommunity();
        }
      });
    });

    bind($('#lb-game'), 'change', renderLeaderboard);
    bind($('#lb-level'), 'change', renderLeaderboard);
    bind($('#btn-play'), 'click', () => startGame());
    bind($('#btn-stop'), 'click', () => stopGame());
    bind($('#btn-bpm-down'), 'click', () => { bpm = Math.max(40, bpm - 5); $('#play-bpm-val').textContent = bpm; });
    bind($('#btn-bpm-up'), 'click', () => { bpm = Math.min(200, bpm + 5); $('#play-bpm-val').textContent = bpm; });
    bind($('#btn-calib'), 'click', () => {
      if ($('#lane-box')?.classList.contains('game-running')) stopGame();
      const btn = $('#btn-calib');
      if (!btn) return;
      btn.disabled = true;
      $('#lane-box').classList.add('calibrating');
      $('#calib-msg').textContent = 'הקישו ↓↑ עם 8 הקליקים על המסלול';
      Engine.calibrate(
        $('#game-canvas'),
        (msg, ok) => {
          $('#calib-msg').textContent = msg;
          $('#calib-msg').className = 'calib-msg' + (ok ? ' ok' : ' err');
          btn.disabled = false;
          $('#lane-box').classList.remove('calibrating');
        },
        msg => { $('#calib-msg').textContent = msg; $('#calib-msg').className = 'calib-msg'; }
      );
    });

    bind($('#btn-input-mode'), 'click', () => {
      if ($('#lane-box')?.classList.contains('game-running')) return;
      inputMode = inputMode === 'mic' ? 'touch' : 'mic';
      updateInputModeUI();
      $('#calib-msg').textContent = inputMode === 'mic'
        ? 'מצב בוזוקי — אשרו מיקרофון בלחיצה על ▶ שחק'
        : 'מצב הקשה — הקישו על המסך או ↓↑';
      $('#calib-msg').className = 'calib-msg';
    });
    updateInputModeUI();

    if ($('#game-canvas')) Engine.bindInput($('#game-canvas'));

    bind($('#player-chip'), 'click', () => {
      showScreen('players');
      renderPlayersList();
      setTimeout(() => $('#new-player-name')?.focus({ preventScroll: true }), 80);
    });

    window.addEventListener('resize', () => {
      Engine.resize($('#game-canvas'));
      if ($('#lane-box')?.classList.contains('game-running')) stopGame();
    });
  }

  return { init, refreshCommunity, boot };
})();

document.addEventListener('DOMContentLoaded', UI.init);
