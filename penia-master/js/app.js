/* ממשק — מאסטר הפנייה (אפליקציה עצמאית) */
'use strict';

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

const UI = (() => {
  let currentLevel = LEVELS[0];
  let bpm = LEVELS[0].bpm;
  let seenTutorial = localStorage.getItem('penia-tutorial') === '1';

  function showScreen(id) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $('#screen-' + id).classList.add('active');
    $$('.bottom-nav .nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.screen === id);
    });
  }

  function boot() {
    if (!seenTutorial) showScreen('onboard');
    else showScreen('home');
    refreshPlayerChip();
    renderLevelMap();
    refreshCommunity();
  }

  /* ---- Splash ---- */
  function initSplash() {
    setTimeout(() => {
      $('#splash').classList.add('hide');
      boot();
    }, 2200);
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
    $('#ob-next').addEventListener('click', () => {
      if (step < steps.length - 1) showStep(step + 1);
      else { localStorage.setItem('penia-tutorial', '1'); seenTutorial = true; showScreen('home'); }
    });
    $('#ob-skip').addEventListener('click', () => {
      localStorage.setItem('penia-tutorial', '1');
      showScreen('home');
    });
    showStep(0);
  }

  /* ---- Home: מפת שלבים ---- */
  function renderLevelMap() {
    const grid = $('#level-map');
    grid.innerHTML = '';
    const p = Players.current();
    LEVELS.forEach(lv => {
      const unlocked = Players.isUnlocked(lv.id);
      const prog = p.progress[lv.id] || {};
      const card = document.createElement('div');
      card.className = 'level-card' + (unlocked ? '' : ' locked');
      card.innerHTML = `
        <div class="lc-num">${lv.icon}</div>
        <div class="lc-body">
          <div class="lc-name">${lv.name}</div>
          <div class="lc-sub">${lv.subtitle}</div>
          <div class="lc-stars">${'★'.repeat(prog.stars || 0)}${'☆'.repeat(3 - (prog.stars || 0))}</div>
        </div>
        ${unlocked ? '<div class="lc-play">▶</div>' : '<div class="lc-lock">🔒</div>'}`;
      if (unlocked) {
        card.addEventListener('click', () => openPlay(lv));
      }
      grid.appendChild(card);
    });
  }

  function refreshPlayerChip() {
    const p = Players.current();
    $('#player-chip').innerHTML = `<span class="chip-av">${p.avatar}</span><span>${p.name}</span>`;
    renderPlayersList();
  }

  function refreshCommunity() {
    const s = Community.stats();
    $('#comm-local').innerHTML = `
      <div class="comm-stat"><b>${s.localPlayers}</b><span>שחקנים במכשיר</span></div>
      <div class="comm-stat"><b>${s.localGames}</b><span>משחקים שוחקו</span></div>`;
    const globalEl = $('#comm-global');
    if (s.online && s.globalGames != null) {
      globalEl.innerHTML = `
        <div class="comm-banner online">
          <div class="comm-group">${s.groupName}</div>
          <div class="comm-global-row">
            <div><b>${s.globalPlayers}</b> נגנים בקהילה</div>
            <div><b>${s.globalGames}</b> משחקים סה"כ</div>
          </div>
        </div>`;
    } else {
      globalEl.innerHTML = `
        <div class="comm-banner offline">
          <p>רוצים לראות כמה נגנים בקבוצות הבוזוקי שלכם? העתיקו <code>config.example.js</code> ל-<code>config.js</code> והגדירו Firebase (חינם).</p>
        </div>`;
    }
  }

  /* ---- Play ---- */
  function openPlay(lv) {
    currentLevel = lv;
    bpm = lv.bpm;
    $('#play-title').textContent = lv.name;
    $('#play-sub').textContent = lv.subtitle + ' · ' + lv.bpm + ' BPM';
    $('#play-teach').textContent = lv.teach;
    $('#play-tip').textContent = '💡 ' + lv.tip;
    $('#play-bpm-val').textContent = bpm;
    renderPattern($('#play-pattern'), lv.strokes);
    const prog = Players.current().progress[lv.id];
    $('#play-best').textContent = prog?.best ? `שיא: ${prog.best}` : '';
    $('#results-panel').classList.remove('show');
    showScreen('play');
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

  function startGame() {
    Engine.stop();
    AudioEngine.ensureCtx();
    $('#play-hint').classList.add('hide');
    $('#calib-msg').textContent = '';
    $('#btn-play').textContent = '⏹ עצור';
    $('#btn-play').classList.add('playing');
    $('#btn-calib').disabled = true;
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
    $('#btn-play').textContent = '▶ שחק';
    $('#btn-play').classList.remove('playing');
    $('#btn-calib').disabled = false;
    $('#play-hint').classList.remove('hide');
  }

  function showResults(r) {
    stopGame();
    const prev = Players.current().progress[r.level.id]?.best || 0;
    const isRecord = r.score > prev;
    Players.recordResult(r.level.id, r.score, r.stars, r.counts, r.bpm);
    renderLevelMap();
    refreshCommunity();

    const msgs = [
      '💪 האטו — דיוק לפני מהירות',
      '👍 התבנית נכנסת! עוד סבב',
      '⭐ מצוין! כמעט מושלם',
      '🏆 μάστορα! שליטה מלאה'
    ];

    const panel = $('#results-panel');
    panel.className = 'results-panel show ' + ['work', 'ok', 'good', 'gold'][r.stars];
    panel.innerHTML = `
      <div class="res-stars">${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div>
      <div class="res-score">${Math.round(r.score)} ${isRecord ? '<span class="rec">שיא!</span>' : ''}</div>
      <div class="res-msg">${msgs[r.stars]}</div>
      <div class="res-detail">דיוק ${(r.acc * 100).toFixed(0)}% · מושלם ${r.counts.perfect} · קומבו ${r.maxCombo}</div>
      <div class="res-btns">
        <button class="btn gold" id="res-retry">🔁 שוב</button>
        ${r.stars >= 2 ? '<button class="btn" id="res-faster">⚡ +5 BPM</button>' : ''}
        ${r.stars >= 1 && LEVELS.find(l => l.id === r.level.id)?.num < 8 ? '<button class="btn" id="res-next">⬆ שלב הבא</button>' : ''}
        <button class="btn" id="res-share">📤 שתף בקבוצה</button>
      </div>`;
    $('#res-retry').onclick = () => { panel.classList.remove('show'); startGame(); };
    const faster = $('#res-faster');
    if (faster) faster.onclick = () => { bpm += 5; $('#play-bpm-val').textContent = bpm; panel.classList.remove('show'); startGame(); };
    const next = $('#res-next');
    if (next) next.onclick = () => {
      const idx = LEVELS.findIndex(l => l.id === r.level.id);
      if (idx < LEVELS.length - 1) openPlay(LEVELS[idx + 1]);
    };
    $('#res-share').onclick = () => shareScore(r, isRecord);
    $('#btn-play').textContent = '▶ שחק';
    $('#btn-play').classList.remove('playing');
    $('#btn-calib').disabled = false;
    $('#play-hint').classList.remove('hide');
  }

  function shareScore(r, isRecord) {
    const p = Players.current();
    const text = `🎸 מאסטר הפנייה — ${p.name}\n` +
      `שלב: ${r.level.name} (${r.bpm} BPM)\n` +
      `ניקוד: ${Math.round(r.score)} ${isRecord ? '🏆 שיא!' : ''}\n` +
      `כוכבים: ${'★'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}\n` +
      `דיוק: ${(r.acc * 100).toFixed(0)}%\n` +
      `נסו גם: ${location.href}`;
    if (navigator.share) {
      navigator.share({ title: 'מאסטר הפנייה', text }).catch(() => copy(text));
    } else copy(text);
  }

  function copy(text) {
    navigator.clipboard?.writeText(text);
    alert('הועתק! הדביקו בקבוצת הוואטסאפ 🎸');
  }

  /* ---- Leaderboard ---- */
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
    list.innerHTML = rows.length ? '' : '<p class="empty">עדיין אין תוצאות — שחקו!</p>';
    rows.forEach((row, i) => {
      const div = document.createElement('div');
      div.className = 'lb-row' + (i === 0 ? ' first' : '');
      div.innerHTML = `
        <span class="lb-rank">${i + 1}</span>
        <span class="lb-av">${row.avatar}</span>
        <span class="lb-name">${row.name}</span>
        <span class="lb-stars">${'★'.repeat(row.stars)}</span>
        <span class="lb-score">${row.best}</span>`;
      list.appendChild(div);
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
    initSplash();
    initOnboard();
    initPlayersForm();

    $$('.bottom-nav .nav-item').forEach(n => {
      n.addEventListener('click', () => {
        Engine.stop();
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
        if (sc === 'home') { renderLevelMap(); refreshCommunity(); }
      });
    });

    $('#btn-play').addEventListener('click', () => {
      if ($('#btn-play').classList.contains('playing')) stopGame();
      else startGame();
    });
    $('#btn-bpm-down').addEventListener('click', () => { bpm = Math.max(40, bpm - 5); $('#play-bpm-val').textContent = bpm; });
    $('#btn-bpm-up').addEventListener('click', () => { bpm = Math.min(200, bpm + 5); $('#play-bpm-val').textContent = bpm; });
    $('#btn-calib').addEventListener('click', () => {
      if ($('#btn-play').classList.contains('playing')) stopGame();
      const btn = $('#btn-calib');
      btn.disabled = true;
      btn.textContent = 'מקישים…';
      Engine.calibrate(
        $('#game-canvas'),
        (msg, ok) => {
          $('#calib-msg').textContent = msg;
          $('#calib-msg').className = 'calib-msg' + (ok ? ' ok' : ' err');
          btn.disabled = false;
          btn.textContent = '⚙ כיול תזמון';
          if (ok) $('#play-hint').textContent = 'כיול הושלם — לחצו ▶ שחק עכשיו';
        },
        msg => { $('#calib-msg').textContent = msg; $('#calib-msg').className = 'calib-msg'; }
      );
    });
    $('#btn-back-play').addEventListener('click', () => { stopGame(); showScreen('home'); });

    $('#player-chip').addEventListener('click', () => {
      showScreen('players');
      renderPlayersList();
      setTimeout(() => $('#new-player-name')?.focus({ preventScroll: true }), 80);
    });

    Engine.bindInput($('#game-canvas'));
    window.addEventListener('resize', () => { if ($('#btn-play').classList.contains('playing')) Engine.stop(); });
  }

  return { init, refreshCommunity, boot };
})();

document.addEventListener('DOMContentLoaded', UI.init);
