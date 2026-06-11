/* ניהול שחקנים, התקדמות ולוח תוצאות מקומי */
const Players = (() => {
  const KEY = 'penia-master-players';

  let data = { currentId: null, players: [] };

  function load() {
    try { data = JSON.parse(localStorage.getItem(KEY)) || data; } catch (e) { /* */ }
    if (!data.players.length) {
      create('נגן 1', AVATARS[0]);
    }
    if (!data.currentId && data.players.length) data.currentId = data.players[0].id;
    save();
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); }
    catch (e) { throw new Error('localStorage blocked'); }
  }

  function uid() { return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function create(name, avatar) {
    const p = {
      id: uid(), name: name.trim() || 'נגן', avatar: avatar || '🎸',
      joined: Date.now(),
      stats: { games: 0, perfect: 0, totalScore: 0 },
      progress: {},
    };
    data.players.push(p);
    data.currentId = p.id;
    save();
    if (typeof Community !== 'undefined') Community.onPlayerRegistered();
    return p;
  }

  function current() { return data.players.find(p => p.id === data.currentId) || data.players[0]; }
  function all() { return [...data.players].sort((a, b) => b.stats.totalScore - a.stats.totalScore); }
  function setCurrent(id) { data.currentId = id; save(); }

  function levelListFor(id) {
    if (id.startsWith('m')) return MODE_LEVELS;
    if (id.startsWith('c')) return CHORD_FLOW_LEVELS;
    return LEVELS;
  }

  function isUnlockedIn(list, levelId) {
    const lv = list.find(l => l.id === levelId);
    if (!lv || lv.unlock === 0) return true;
    const prev = list.find(l => l.num === lv.unlock);
    if (!prev) return true;
    const prog = current().progress[prev.id];
    return prog && prog.stars >= 1;
  }

  function isUnlocked(levelId) {
    return isUnlockedIn(levelListFor(levelId), levelId);
  }

  function recordResult(levelId, score, stars, counts, bpm) {
    const p = current();
    p.stats.games++;
    p.stats.perfect += counts.perfect || 0;
    p.stats.totalScore += Math.round(score);
    const prev = p.progress[levelId] || { stars: 0, best: 0, bestBpm: 0 };
    p.progress[levelId] = {
      stars: Math.max(prev.stars, stars),
      best: Math.max(prev.best, Math.round(score)),
      bestBpm: score > prev.best ? bpm : prev.bestBpm || bpm,
      lastPlayed: Date.now(),
    };
    save();
    if (typeof Community !== 'undefined') Community.onGamePlayed({ levelId, score, stars, playerName: p.name });
    return p.progress[levelId];
  }

  function leaderboard(levelId) {
    return data.players
      .map(p => ({
        name: p.name, avatar: p.avatar,
        best: p.progress[levelId]?.best || 0,
        stars: p.progress[levelId]?.stars || 0,
      }))
      .filter(x => x.best > 0)
      .sort((a, b) => b.best - a.best)
      .slice(0, 20);
  }

  function totalPlayers() { return data.players.length; }

  load();
  return { create, current, all, setCurrent, isUnlocked, isUnlockedIn, levelListFor, recordResult, leaderboard, totalPlayers, save };
})();
