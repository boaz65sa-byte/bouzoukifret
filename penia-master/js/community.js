/* סטטיסטיקות קהילה — מקומי + Firebase אופציונלי */
const Community = (() => {
  const LOCAL_KEY = 'penia-master-community';
  let local = { gamesPlayed: 0, playersRegistered: 0 };
  let remote = { players: null, games: null, online: false };
  let fb = null;

  function loadLocal() {
    try { local = { ...local, ...JSON.parse(localStorage.getItem(LOCAL_KEY)) }; } catch (e) { /* */ }
  }
  function saveLocal() { localStorage.setItem(LOCAL_KEY, JSON.stringify(local)); }

  async function initFirebase() {
    const cfg = window.PENIA_CONFIG?.firebase;
    if (!cfg?.apiKey || cfg.apiKey === 'YOUR_API_KEY') return false;
    try {
      const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
      const { getDatabase, ref, runTransaction, onValue } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js');
      const app = initializeApp(cfg);
      fb = { db: getDatabase(app), ref, runTransaction, onValue };
      const statsRef = fb.ref(fb.db, 'stats');
      fb.onValue(statsRef, snap => {
        const v = snap.val() || {};
        remote.players = v.players || 0;
        remote.games = v.games || 0;
        remote.online = true;
        UI?.refreshCommunity?.();
      });
      return true;
    } catch (e) {
      console.warn('Firebase לא זמין:', e.message);
      return false;
    }
  }

  function bumpRemote(field) {
    if (!fb) return;
    const r = fb.ref(fb.db, `stats/${field}`);
    fb.runTransaction(r, v => (v || 0) + 1);
  }

  function onPlayerRegistered() {
    local.playersRegistered = Players.totalPlayers();
    saveLocal();
    bumpRemote('players');
  }

  function onGamePlayed(meta) {
    local.gamesPlayed++;
    saveLocal();
    bumpRemote('games');
  }

  function stats() {
    return {
      localPlayers: Players.totalPlayers(),
      localGames: local.gamesPlayed,
      globalPlayers: remote.online ? remote.players : null,
      globalGames: remote.online ? remote.games : null,
      online: remote.online,
      groupName: window.PENIA_CONFIG?.groupName || 'קהילת הבוזוקי',
    };
  }

  loadLocal();
  initFirebase();
  return { onPlayerRegistered, onGamePlayed, stats, initFirebase };
})();
