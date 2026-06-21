/* ============================================================
   Stem API — LALAL.ai (strings) / Moises (other)
   דרך פרוקסי מקומי או ישיר (אם CORS מאפשר)
   ============================================================ */
'use strict';

const StemAPI = (() => {
  const cfg = () => ({
    stemProxyUrl: 'http://127.0.0.1:3456',
    ...(window.BOUZOUKI_CONFIG || {}),
  });

  async function checkHealth() {
    const url = cfg().stemProxyUrl;
    if (!url) return { ok: false, reason: 'no_proxy' };
    try {
      const r = await fetch(`${url.replace(/\/$/, '')}/health`, { signal: AbortSignal.timeout(4000) });
      return r.ok ? await r.json() : { ok: false };
    } catch {
      return { ok: false, reason: 'offline' };
    }
  }

  /**
   * @param {File|Blob} file
   * @param {{ provider?: 'lalal'|'moises', stem?: string, onProgress?: (msg:string,pct:number)=>void }} opts
   * @returns {Promise<Blob>}
   */
  async function separate(file, opts = {}) {
    const { provider = 'lalal', stem = 'strings', onProgress } = opts;
    const proxy = cfg().stemProxyUrl?.replace(/\/$/, '');

    if (proxy) {
      onProgress?.('שולח לפרוקסי stem separation…', 10);
      const form = new FormData();
      form.append('file', file, file.name || 'audio.mp3');
      form.append('provider', provider);
      form.append('stem', stem);
      const resp = await fetch(`${proxy}/api/separate`, { method: 'POST', body: form });
      if (!resp.ok) {
        let msg = `Stem failed (${resp.status})`;
        try { msg = (await resp.json()).error || msg; } catch { /* noop */ }
        throw new Error(msg);
      }
      onProgress?.('מיתרים מבודדים — מוכן לניתוח', 100);
      return resp.blob();
    }

    const key = cfg().lalalLicenseKey;
    if (!key) throw new Error('הגדר stemProxyUrl או lalalLicenseKey ב-config.js');

    onProgress?.('מעלה ל-LALAL.ai…', 5);
    const filename = file.name || 'audio.mp3';
    const respUp = await fetch('https://www.lalal.ai/api/v1/upload/', {
      method: 'POST',
      headers: {
        'X-License-Key': key,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: file,
    });
    if (!respUp.ok) throw new Error(`LALAL upload: ${respUp.status} (ייתכן CORS — הרץ את stem-proxy)`);
    const { id: sourceId } = await respUp.json();

    onProgress?.('מפריד stems (strings)…', 20);
    const respSplit = await fetch('https://www.lalal.ai/api/v1/split/stem_separator/', {
      method: 'POST',
      headers: { 'X-License-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_id: sourceId,
        presets: { stem, extraction_level: 'deep_extraction', splitter: 'andromeda' },
      }),
    });
    if (!respSplit.ok) throw new Error(`LALAL split: ${respSplit.status}`);
    const { task_id: taskId } = await respSplit.json();

    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const chk = await fetch('https://www.lalal.ai/api/v1/check/', {
        method: 'POST',
        headers: { 'X-License-Key': key, 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_ids: [taskId] }),
      });
      const data = await chk.json();
      const task = data.result?.[taskId];
      const pct = Math.min(95, 25 + (task?.progress || i));
      onProgress?.(`LALAL: ${task?.status || '…'} ${pct}%`, pct);
      if (task?.status === 'success') {
        const url = task.result?.tracks?.[0]?.url;
        if (!url) throw new Error('No track URL');
        const dl = await fetch(url);
        return dl.blob();
      }
      if (task?.status === 'error' || task?.status === 'cancelled') throw new Error('LALAL task failed');
    }
    throw new Error('LALAL timeout');
  }

  /**
   * @param {string} videoId
   * @param {(msg:string,pct:number)=>void} [onProgress]
   */
  async function fetchYoutube(videoId, onProgress, meta = {}) {
    const proxy = cfg().stemProxyUrl?.replace(/\/$/, '');
    if (!proxy) throw new Error('הגדר stemProxyUrl ב-config.js והרץ stem-proxy');
    onProgress?.('מוריד מ-YouTube (yt-dlp)…', 8);
    const qs = new URLSearchParams({ id: videoId, library: '1' });
    if (meta.title) qs.set('title', meta.title);
    if (meta.author) qs.set('author', meta.author);
    const resp = await fetch(`${proxy}/api/youtube-audio?${qs}`, {
      signal: AbortSignal.timeout(300000),
    });
    if (!resp.ok) {
      let msg = `YouTube ${resp.status}`;
      try { msg = (await resp.json()).error || msg; } catch { /* noop */ }
      throw new Error(msg);
    }
    onProgress?.('הורדה הושלמה', 25);
    return resp.blob();
  }

  function saveBlobAsFile(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'audio.mp3';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
  }

  /**
   * הורדת MP3 מ-YouTube — שמירה במכשיר + IndexedDB (LearnOffline)
   * @param {string} videoId
   * @param {{ title?: string, titleHe?: string, author?: string, songId?: string, onProgress?: Function, saveOffline?: boolean, saveToDisk?: boolean }} opts
   */
  async function downloadForLearning(videoId, opts = {}) {
    const {
      title = videoId,
      titleHe = '',
      author = '',
      songId = '',
      onProgress,
      saveOffline = true,
      saveToDisk = true,
    } = opts;

    const health = await checkHealth();
    if (!health.ok) throw new Error('stem-proxy לא פעיל — הרץ tools/stem-proxy והגדר config.js');
    if (!health.ytdlp) throw new Error('yt-dlp לא מותקן — pip install yt-dlp');

    const blob = await fetchYoutube(videoId, onProgress, { title: titleHe || title, author });

    if (saveOffline && typeof LearnOffline !== 'undefined') {
      onProgress?.('שומר בספריית לימוד…', 98);
      await LearnOffline.save(videoId, blob, {
        title, titleHe, author, songId,
        thumbUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      });
    }

    if (saveToDisk) {
      const safe = String(titleHe || title).replace(/[^\w\u0590-\u05FF.-]+/g, '_').slice(0, 40);
      saveBlobAsFile(blob, `${safe || videoId}_${videoId}.mp3`);
    }

    onProgress?.('מוכן ללימוד', 100);
    if (typeof LearnLibrary !== 'undefined') LearnLibrary.refresh();
    return blob;
  }

  async function listDiskLibrary() {
    const proxy = cfg().stemProxyUrl?.replace(/\/$/, '');
    if (!proxy) return null;
    try {
      const r = await fetch(`${proxy}/api/learn-library`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return null;
      return r.json();
    } catch {
      return null;
    }
  }

  return { separate, checkHealth, fetchYoutube, saveBlobAsFile, downloadForLearning, listDiskLibrary };
})();
