/* ממשק — מאסטר הפנייה (מסך משחק יחיד) */
'use strict';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const UI = (() => {
  let currentLevel = LEVELS[0];
  let bpm = LEVELS[0].bpm;
  let seenTutorial = localStorage.getItem('penia-tutorial') === '1';

  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    const el = $('#screen-' + id);
    if (el) el.classList.add('active');
    $('#app').classList.toggle('in-game', id === 'game');
    closeMenu();
  }

  function openMenu() {
    $('#menu-sheet').classList.add('open');
    $('#sheet-backdrop').classList.add('open');
    refreshPlayerChip();
    refreshCommunity();
  }

  function closeMenu() {
    $('#menu-sheet').classList.remove('open');
    $('#sheet-backdrop').classList.remove('open');
  }

  function setStatus(msg, type) {
    const el = $('#status-line');
    el.textContent = msg || '';
    el.className = 'status-line' + (type ? ' ' + type : '');
  }

  function boot() {
    renderLevelSelect();
    setLevel(currentLevel, false);
    refreshPlayerChip();
    refreshCommunity();
    if (!seenTutorial) showScreen('onboard');
    else showScreen('game');
    requestAnimationFrame(() => Engine.resize($('#game-canvas')));
  }

  function initSplash() {
    setTimeout(() => {
      $('#splash').classList.add('hide');
      boot();
    }, 1600);
  }

  function initOnboard() {
    $('#ob-start').addEventListener('click', () => {
      localStorage.setItem('penia-tutorial', '1');
      seenTutorial = true;
      showScreen('game');
      AudioEngine.ensureCtx();
    });
  }

  function renderLevelSelect() {
    const sel = $('#level-select');
    sel.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = `${lv.icon}. ${lv.name}`;
      o.disabled = !Players.isUnlocked(lv.id);
      sel.appendChild(o);
    });
    sel.addEventListener('change', () => {
      const idx = parseInt(sel.value, 10);
      if (!isNaN(idx)) setLevel(LEVELS[idx]);
    });
  }

  function setLevel(lv, updateSelect = true) {
    if (!Players.isUnlocked(lv.id)) return;
    currentLevel = lv;
    bpm = lv.bpm;
    if (updateSelect) {
      const idx = LEVELS.findIndex(l => l.id === lv.id);
      if (idx >= 0) $('#level-select').value = String(idx);
    }
    $('#bar-bpm').textContent = bpm + ' BPM';
    $('#play-bpm-val').textContent = bpm;
    $('#play-tip').textContent = lv.teach + ' — ' + lv.tip;
    updateLevelNav();
    $('#results-panel').classList.remove('show');
    setStatus('');
  }

  function updateLevelNav() {
    const idx = LEVELS.findIndex(l => l.id === currentLevel.id);
    $('#btn-level-prev').disabled = idx <= 0;
    const next = LEVELS[idx + 1];
    $('#btn-level-next').disabled = !next || !Players.isUnlocked(next.id);
  }

  function shiftLevel(dir) {
    const idx = LEVELS.findIndex(l => l.id === currentLevel.id);
    const next = LEVELS[idx + dir];
    if (next && Players.isUnlocked(next.id)) {
      stopGame();
      setLevel(next);
    }
  }

  function refreshPlayerChip() {
    const p = Players.current();
    $('#player-chip').innerHTML = `<span class="chip-av">${p.avatar}</span><span class="chip-name">${p.name}</span><span class="chip-arrow">‹</span>`;
    renderPlayersList();
    renderLevelSelect();
    updateLevelNav();
  }

  function refreshCommunity() {
    const s = Community.stats();
    $('#comm-local').innerHTML = `
      <span><b>${s.localPlayers}</b> שחקנים</span>
      <span><b>${s.localGames}</b> משחקים</span>`;
    const globalEl = $('#comm-global');
    if (s.online && s.globalGames != null) {
      globalEl.innerHTML = `<p class="comm-online">${s.groupName}: <b>${s.globalPlayers}</b> נגנים · <b>${s.globalGames}</b> משחקים</p>`;
    } else globalEl.innerHTML = '';
  }

  function startGame() {
    Engine.stop();
    closeMenu();
    AudioEngine.ensureCtx();
    setStatus('');
    const btn = $('#btn-play');
    btn.textContent = '⏹ עצור';
    btn.classList.add('playing');
    $('#level-select').disabled = true;
    $('#btn-level-prev').disabled = true;
    $('#btn-level-next').disabled = true;
    $('#btn-menu').disabled = true;
    Engine.start(currentLevel, bpm, $('#game-canvas'),
      ({ score, combo }) => {
        $('#hud-score').textContent = Math.round(score);
        $('#hud-combo').textContent = combo > 1 ? combo + '×' : '';
      },
      result => showResults(result)
    );
  }

  function stopGame() {
    Engine.stop();
    const btn = $('#btn-play');
    btn.textContent = '▶ שחק';
    btn.classList.remove('playing');
    $('#level-select').disabled = false;
    $('#btn-menu').disabled = false;
    updateLevelNav();
  }

  function showResults(r) {
    stopGame();
    const prev = Players.current().progress[r.level.id]?.best || 0;
    const isRecord = r.score > prev;
    Players.recordResult(r.level.id, r.score, r.stars, r.counts, r.bpm);
    renderLevelSelect();
    refreshCommunity();

    const msgs = ['האטו — דיוק קודם', 'מתקדמים!', 'מצוין!', 'μάστορα!'];
    const panel = $('#results-panel');
    panel.className = 'results-overlay show ' + ['work', 'ok', 'good', 'gold'][r.stars];
    panel.innerHTML = `
      <div class="res-inner">
        <div class="res-stars">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div>
        <div class="res-score">${Math.round(r.score)} ${isRecord ? '<span class="rec">שיא</span>' : ''}</div>
        <div class="res-msg">${msgs[r.stars]}</div>
        <div class="res-btns">
          <button class="btn gold" id="res-retry">🔁 שוב</button>
          ${r.stars >= 1 && LEVELS.find(l => l.id === r.level.id)?.num < 8 ? '<button class="btn" id="res-next">שלב הבא</button>' : ''}
          <button class="btn ghost" id="res-share">שתף</button>
        </div>
      </div>`;
    $('#res-retry').onclick = () => { panel.classList.remove('show'); startGame(); };
    const next = $('#res-next');
    if (next) next.onclick = () => {
      panel.classList.remove('show');
      const idx = LEVELS.findIndex(l => l.id === r.level.id);
      if (idx < LEVELS.length - 1) setLevel(LEVELS[idx + 1]);
      startGame();
    };
    $('#res-share').onclick = () => shareScore(r, isRecord);
  }

  function shareScore(r, isRecord) {
    const p = Players.current();
    const text = `🎸 מאסטר הפנייה — ${p.name}\n${r.level.name} · ${Math.round(r.score)} נק׳ ${'★'.repeat(r.stars)}\n${location.href}`;
    if (navigator.share) navigator.share({ title: 'מאסטר הפנייה', text }).catch(() => copy(text));
    else copy(text);
  }

  function copy(text) {
    navigator.clipboard?.writeText(text);
    setStatus('הועתק לוואטסאפ ✓', 'ok');
  }

  function renderLeaderboard() {
    const sel = $('#lb-level');
    if (!sel.options.length) {
      LEVELS.forEach((lv, i) => {
        const o = document.createElement('option');
        o.value = i; o.textContent = lv.name;
        sel.appendChild(o);
      });
      sel.addEventListener('change', renderLeaderboard);
    }
    const lv = LEVELS[parseInt(sel.value, 10) || 0];
    const rows = Players.leaderboard(lv.id);
    const list = $('#lb-list');
    list.innerHTML = rows.length ? '' : '<p class="empty">עדיין אין תוצאות</p>';
    rows.forEach((row, i) => {
      const div = document.createElement('div');
      div.className = 'lb-row' + (i === 0 ? ' first' : '');
      div.innerHTML = `
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-av">${row.avatar}</span>
        <span class="lb-name">${row.name}</span>
        <span class="lb-score">${row.best}</span>`;
      list.appendChild(div);
    });
  }

  function renderPlayersList() {
    const list = $('#players-list');
    if (!list) return;
    list.innerHTML = '';
    Players.all().forEach(p => {
      const div = document.createElement('div');
      div.className = 'player-row' + (p.id === Players.current().id ? ' active' : '');
      div.innerHTML = `
        <span class="pr-av">${p.avatar}</span>
        <div class="pr-info"><b>${p.name}</b><small>${p.stats.games} משחקים</small></div>
        ${p.id === Players.current().id ? '<span class="pr-badge">פעיל</span>' : ''}`;
      div.addEventListener('click', () => {
        Players.setCurrent(p.id);
        refreshPlayerChip();
      });
      list.appendChild(div);
    });
  }

  function addPlayer() {
    const nameInput = $('#new-player-name');
    const feedback = $('#player-feedback');
    const name = nameInput.value.trim();
    if (!name) {
      feedback.textContent = 'הקלידו שם';
      feedback.className = 'player-feedback err';
      nameInput.focus();
      return;
    }
    try {
      Players.create(name, $('#avatar-pick').dataset.sel || AVATARS[0]);
      nameInput.value = '';
      feedback.textContent = `${name} ✓`;
      feedback.className = 'player-feedback ok';
      refreshPlayerChip();
      refreshCommunity();
    } catch (e) {
      feedback.textContent = 'שגיאת שמירה';
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
    $('#add-player-form').addEventListener('submit', e => { e.preventDefault(); addPlayer(); });
  }

  function runCalib() {
    closeMenu();
    if ($('#btn-play').classList.contains('playing')) stopGame();
    setStatus('הקישו ↓↑ עם 8 הקליקים…');
    Engine.calibrate(
      $('#game-canvas'),
      (msg, ok) => setStatus(msg, ok ? 'ok' : 'err'),
      () => setStatus('הקישו ↓↑ עם הקליקים…')
    );
  }

  function init() {
    initSplash();
    initOnboard();
    initPlayersForm();

    $('#btn-menu').addEventListener('click', openMenu);
    $('#btn-close-menu').addEventListener('click', closeMenu);
    $('#sheet-backdrop').addEventListener('click', closeMenu);

    $('#btn-play').addEventListener('click', () => {
      if ($('#btn-play').classList.contains('playing')) stopGame();
      else startGame();
    });

    $('#btn-level-prev').addEventListener('click', () => shiftLevel(-1));
    $('#btn-level-next').addEventListener('click', () => shiftLevel(1));

    $('#btn-bpm-down').addEventListener('click', () => {
      bpm = Math.max(40, bpm - 5);
      $('#play-bpm-val').textContent = bpm;
      $('#bar-bpm').textContent = bpm + ' BPM';
    });
    $('#btn-bpm-up').addEventListener('click', () => {
      bpm = Math.min(200, bpm + 5);
      $('#play-bpm-val').textContent = bpm;
      $('#bar-bpm').textContent = bpm + ' BPM';
    });

    $('#btn-calib').addEventListener('click', runCalib);
    $('#btn-show-lb').addEventListener('click', () => { closeMenu(); showScreen('leaderboard'); renderLeaderboard(); });
    $('#btn-show-players').addEventListener('click', () => { closeMenu(); showScreen('players'); renderPlayersList(); });

    $$('.overlay-back').forEach(b => {
      b.addEventListener('click', () => showScreen(b.dataset.back));
    });

    $('#player-chip').addEventListener('click', () => {
      closeMenu();
      showScreen('players');
      renderPlayersList();
    });

    Engine.bindInput($('#game-canvas'));
    window.addEventListener('resize', () => {
      Engine.resize($('#game-canvas'));
      if ($('#btn-play').classList.contains('playing')) Engine.stop();
    });
  }

  return { init, refreshCommunity, boot };
})();

document.addEventListener('DOMContentLoaded', UI.init);
