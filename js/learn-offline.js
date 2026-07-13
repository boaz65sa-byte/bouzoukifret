/* ============================================================
   LearnOffline — שירים שהורדו ללימוד (IndexedDB)
   ============================================================ */
'use strict';

const LearnOffline = (() => {
  const DB_NAME = 'bouzouki_learn_offline_v1';
  const DB_VER = 1;
  const STORE = 'tracks';
  let _db = null;
  let _dbUnavailable = false;

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
    console.warn('LearnOffline: IndexedDB אינה זמינה (למשל גלישה פרטית) — הורדות לא יישמרו.', e);
    _showIdbNotice('שמירת שירים להאזנה לא מקוונת אינה זמינה בדפדפן הזה (למשל גלישה פרטית ב-Safari). אפשר להמשיך להשתמש באפליקציה, אך ההורדה לא תישמר בין ביקורים.');
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
            const os = db.createObjectStore(STORE, { keyPath: 'videoId' });
            os.createIndex('savedAt', 'savedAt', { unique: false });
          }
        };
      } catch (e) {
        _onUnavailable(e);
        resolve(null);
      }
    });
  }

  async function save(videoId, blob, meta = {}) {
    const db = await open();
    if (!db) return null;
    const rec = {
      videoId,
      title: meta.title || videoId,
      titleHe: meta.titleHe || '',
      author: meta.author || '',
      songId: meta.songId || '',
      thumbUrl: meta.thumbUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      audioFormat: meta.audioFormat || '',
      size: blob.size,
      savedAt: Date.now(),
      blob,
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).put(rec);
      req.onsuccess = () => resolve(rec);
      req.onerror = () => reject(req.error);
    });
  }

  async function get(videoId) {
    const db = await open();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(videoId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function list() {
    const db = await open();
    if (!db) return [];
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).index('savedAt').openCursor(null, 'prev');
      const out = [];
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) {
          const { blob, ...meta } = cur.value;
          out.push(meta);
          cur.continue();
        } else resolve(out);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async function stats() {
    const tracks = await list();
    const totalSize = tracks.reduce((n, t) => n + (t.size || 0), 0);
    return { count: tracks.length, totalSize };
  }

  async function remove(videoId) {
    const db = await open();
    if (!db) return false;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(videoId);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function has(videoId) {
    return !!(await get(videoId));
  }

  function fmtSize(bytes) {
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return { save, get, list, remove, has, stats, fmtSize };
})();
