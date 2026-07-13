/* ============================================================
   ProgressLog — IndexedDB לאירועי לימוד והתקדמות
   ============================================================ */
'use strict';

const ProgressLog = (() => {
  const DB_NAME = 'bouzouki_progress_v1';
  const DB_VER = 1;
  const STORE = 'events';
  let _db = null;
  let _dbUnavailable = false;

  function _dateKey(ts = Date.now()) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function _showIdbNotice(message) {
    if (window.__bzIdbNoticeShown) return;
    window.__bzIdbNoticeShown = true;
    try {
      const el = document.createElement('div');
      el.setAttribute('dir', 'rtl');
      el.style.cssText = 'position:fixed;bottom:14px;left:14px;right:14px;max-width:420px;margin:0 auto;z-index:99999;background:#1c2a38;color:#e8eef5;border:1px solid rgba(217,100,89,.5);border-radius:12px;padding:12px 14px;font-family:Heebo,Arial,sans-serif;font-size:13px;line-height:1.5;box-shadow:0 8px 24px rgba(0,0,0,.4);display:flex;align-items:flex-start;gap:10px;';
      el.innerHTML = `<span style="flex:1">⚠️ ${message}</span>` +
        '<button type="button" aria-label="סגור" style="background:none;border:none;color:#e8eef5;font-size:16px;line-height:1;cursor:pointer;padding:0 2px;">✕</button>';
      el.querySelector('button').addEventListener('click', () => el.remove());
      (document.body || document.documentElement).appendChild(el);
      setTimeout(() => { if (el.isConnected) el.remove(); }, 20000);
    } catch (_) { /* לא קריטי */ }
  }

  function _onUnavailable(e) {
    if (_dbUnavailable) return;
    _dbUnavailable = true;
    console.warn('ProgressLog: IndexedDB אינה זמינה (למשל גלישה פרטית) — ההתקדמות לא תישמר.', e);
    _showIdbNotice('שמירת ההתקדמות, ה-XP והרצף היומי אינה זמינה בדפדפן הזה (למשל גלישה פרטית ב-Safari). האפליקציה תמשיך לעבוד, אך הנתונים לא יישמרו בין ביקורים.');
  }

  function open() {
    if (_db) return Promise.resolve(_db);
    if (_dbUnavailable) return Promise.resolve(null);
    if (!window.indexedDB) {
      _onUnavailable();
      return Promise.resolve(null);
    }
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VER);
        req.onerror = () => { _onUnavailable(req.error); resolve(null); };
        req.onsuccess = () => { _db = req.result; resolve(_db); };
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains(STORE)) {
            const os = db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
            os.createIndex('date', 'date', { unique: false });
            os.createIndex('type', 'type', { unique: false });
            os.createIndex('ts', 'ts', { unique: false });
          }
        };
      } catch (e) {
        _onUnavailable(e);
        resolve(null);
      }
    });
  }

  /**
   * @param {string} type — xp | song_analyze | play_along | routine | exercise | session
   * @param {string} label
   * @param {{ durationSec?: number, meta?: object }} opts
   */
  async function log(type, label, opts = {}) {
    try {
      const db = await open();
      if (!db) return null;
      const ts = Date.now();
      const ev = {
        ts,
        date: _dateKey(ts),
        type,
        label: String(label || type).slice(0, 200),
        durationSec: opts.durationSec || 0,
        meta: opts.meta || {},
      };
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        const req = tx.objectStore(STORE).add(ev);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('ProgressLog:', e);
      return null;
    }
  }

  async function getAll(limit = 500) {
    const db = await open();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).index('ts').openCursor(null, 'prev');
      const out = [];
      req.onsuccess = () => {
        const cur = req.result;
        if (cur && out.length < limit) {
          out.push(cur.value);
          cur.continue();
        } else resolve(out);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function getSince(days = 30) {
    const cutoff = _dateKey(Date.now() - days * 86400000);
    const all = await getAll(2000);
    return all.filter(e => e.date >= cutoff);
  }

  async function clearAll() {
    const db = await open();
    if (!db) return;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /** סיכום ל-dashboard */
  async function summarize(days = 14) {
    const events = await getSince(days);
    const byDate = {};
    const byType = {};
    let totalMin = 0;

    events.forEach(e => {
      byDate[e.date] = byDate[e.date] || { count: 0, minutes: 0 };
      byDate[e.date].count += 1;
      const min = e.durationSec ? e.durationSec / 60 : _estimateMinutes(e);
      byDate[e.date].minutes += min;
      totalMin += min;
      byType[e.type] = (byType[e.type] || 0) + 1;
    });

    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(_dateKey(d.getTime()));
    }

    return {
      events,
      byDate,
      byType,
      dates,
      totalEvents: events.length,
      totalMinutes: Math.round(totalMin),
      songs: events.filter(e => e.type === 'song_analyze').length,
      playAlongs: events.filter(e => e.type === 'play_along').length,
      routines: events.filter(e => e.type === 'routine').length,
    };
  }

  function _estimateMinutes(e) {
    switch (e.type) {
      case 'song_analyze': return 5;
      case 'play_along': return (e.meta?.notes || 10) * 0.15;
      case 'routine': return 25;
      case 'exercise': return 8;
      case 'session': return (e.durationSec || 120) / 60;
      case 'xp': return 2;
      default: return 3;
    }
  }

  let _sessionScreen = null;
  let _sessionStart = null;

  function trackScreen(screenId) {
    if (_sessionScreen && _sessionStart) {
      const sec = Math.round((Date.now() - _sessionStart) / 1000);
      if (sec >= 30) {
        log('session', _sessionScreen, { durationSec: sec });
      }
    }
    _sessionScreen = screenId;
    _sessionStart = Date.now();
  }

  function initNavTracking() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => trackScreen(btn.dataset.screen));
    });
    trackScreen('home');
  }

  return { log, getAll, getSince, summarize, clearAll, initNavTracking, open };
})();
