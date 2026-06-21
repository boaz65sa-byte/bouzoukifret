/* ============================================================
   LearnOffline — שירים שהורדו ללימוד (IndexedDB)
   ============================================================ */
'use strict';

const LearnOffline = (() => {
  const DB_NAME = 'bouzouki_learn_offline_v1';
  const DB_VER = 1;
  const STORE = 'tracks';
  let _db = null;

  function open() {
    if (_db) return Promise.resolve(_db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VER);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const os = db.createObjectStore(STORE, { keyPath: 'videoId' });
          os.createIndex('savedAt', 'savedAt', { unique: false });
        }
      };
    });
  }

  async function save(videoId, blob, meta = {}) {
    const db = await open();
    const rec = {
      videoId,
      title: meta.title || videoId,
      titleHe: meta.titleHe || '',
      author: meta.author || '',
      songId: meta.songId || '',
      thumbUrl: meta.thumbUrl || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
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
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(videoId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function list() {
    const db = await open();
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
