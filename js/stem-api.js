/* ============================================================
   Stem API — LALAL.ai (strings) / Moises (other)
   דרך פרוקסי מקומי או ישיר (אם CORS מאפשר)
   ============================================================ */
'use strict';

const StemAPI = (() => {
  const cfg = () => {
    const base = {
      stemProxyUrl: 'http://127.0.0.1:3456',
      ...(window.BOUZOUKI_CONFIG || {}),
    };
    if (typeof ProxySettings !== 'undefined') {
      base.stemProxyUrl = ProxySettings.getRaw();
    }
    base.stemProxyUrl = typeof DeviceUtils !== 'undefined'
      ? DeviceUtils.resolveProxyUrl(base.stemProxyUrl)
      : String(base.stemProxyUrl || '').replace(/\/$/, '');
    return base;
  };

  function proxyUrl() {
    return cfg().stemProxyUrl?.replace(/\/$/, '') || '';
  }

  const DL_FORMAT_KEY = 'bouzouki_download_format_v1';

  function normalizeDownloadFormat(fmt) {
    return fmt === 'mp3' ? 'mp3' : 'm4a';
  }

  function getDownloadFormat() {
    try {
      return normalizeDownloadFormat(localStorage.getItem(DL_FORMAT_KEY));
    } catch {
      return 'm4a';
    }
  }

  function setDownloadFormat(fmt) {
    try {
      localStorage.setItem(DL_FORMAT_KEY, normalizeDownloadFormat(fmt));
    } catch { /* noop */ }
  }

  function blobAudioExt(blob) {
    const t = String(blob?.type || '').toLowerCase();
    if (t.includes('mpeg') || t.includes('mp3')) return 'mp3';
    return 'm4a';
  }

  function downloadFilename(base, videoId, blob, preferredFormat) {
    const ext = blobAudioExt(blob) || normalizeDownloadFormat(preferredFormat);
    return `${base || videoId}_${videoId}.${ext}`;
  }

  async function checkHealth() {
    const url = proxyUrl();
    if (!url) return { ok: false, reason: 'no_proxy' };
    try {
      const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(4000) });
      return r.ok ? await r.json() : { ok: false };
    } catch {
      return { ok: false, reason: 'offline' };
    }
  }

  const PIPED_BASES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.tokhmi.xyz',
    'https://piped-api.garudalinux.org',
  ];

  const INVIDIOUS_BASES = [
    'https://invidious.materialio.us',
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://yewtu.be',
    'https://invidious.f5.si',
  ];

  async function loadSiteDownloadConfig() {
    try {
      const r = await fetch('/api/site-config', { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return null;
      return r.json();
    } catch {
      return null;
    }
  }

  /** האם הורדה אפשרית — תמיד מנסים (אתר / Piped / פרוקסי מקומי) */
  async function checkDownloadReady() {
    const onPublic = typeof DeviceUtils !== 'undefined' && DeviceUtils.isPublicHostedPage();
    if (onPublic) {
      return { ready: true, via: 'device', label: 'מכשיר' };
    }

    const health = await checkHealth();
    if (health.ok && health.ytdlp !== false) {
      return { ready: true, via: 'proxy', label: 'stem-proxy' };
    }

    const site = await loadSiteDownloadConfig();
    if (site?.downloadViaPiped !== false) {
      return { ready: true, via: 'piped', label: 'Piped' };
    }

    return { ready: true, via: 'piped', label: 'Piped' };
  }

  function downloadApiUrls() {
    if (typeof DeviceUtils !== 'undefined' && DeviceUtils.apiOriginUrls) {
      return DeviceUtils.apiOriginUrls('/api/youtube-audio');
    }
    return ['/api/youtube-audio', 'https://bouzoukifret.vercel.app/api/youtube-audio'];
  }

  async function fetchViaPipedOrInvidious(videoId, onProgress) {
    onProgress?.('מחפש מקור אודיו…', 10);
    for (const base of PIPED_BASES) {
      try {
        const r = await fetch(`${base}/streams/${videoId}`, { signal: AbortSignal.timeout(25000) });
        if (!r.ok) continue;
        const data = await r.json();
        const streams = Array.isArray(data.audioStreams) ? data.audioStreams : [];
        const best = streams.slice().sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
        if (!best?.url) continue;
        onProgress?.('מוריד אודיו (Piped)…', 18);
        const audioR = await fetch(best.url, { signal: AbortSignal.timeout(300000) });
        if (!audioR.ok) continue;
        onProgress?.('הורדה הושלמה', 25);
        return ensureAudioBlob(await audioR.blob(), audioR.headers.get('content-type') || '');
      } catch { /* next */ }
    }

    for (const base of INVIDIOUS_BASES) {
      try {
        const r = await fetch(
          `${base}/api/v1/videos/${videoId}?fields=adaptiveFormats`,
          { signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' } },
        );
        if (!r.ok) continue;
        const data = await r.json();
        const fmt = (data.adaptiveFormats || []).find(f => String(f.type || '').startsWith('audio/'));
        if (!fmt?.url) continue;
        onProgress?.('מוריד אודיו (Invidious)…', 18);
        const audioR = await fetch(fmt.url, { signal: AbortSignal.timeout(300000) });
        if (!audioR.ok) continue;
        onProgress?.('הורדה הושלמה', 25);
        return ensureAudioBlob(await audioR.blob(), audioR.headers.get('content-type') || '');
      } catch { /* next */ }
    }

    throw new Error('לא הצלחנו להוריד — נסו שוב בעוד דקה או פתחו את bouzoukifret.vercel.app');
  }

  /**
   * @param {File|Blob} file
   * @param {{ provider?: 'lalal'|'moises', stem?: string, onProgress?: (msg:string,pct:number)=>void }} opts
   * @returns {Promise<Blob>}
   */
  async function separate(file, opts = {}) {
    const { provider = 'lalal', stem = 'strings', onProgress } = opts;
    const proxy = proxyUrl();

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
      const stemDone = /vocal|voice|sing/i.test(stem)
        ? 'קול הזמר מבודד — מוכן לתמלול'
        : 'מיתרים מבודדים — מוכן לניתוח';
      onProgress?.(stemDone, 100);
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

    const stemLabel = /vocal|voice|sing/i.test(stem) ? 'vocals' : stem;
    onProgress?.(`מפריד stems (${stemLabel})…`, 20);
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
        const tracks = task.result?.tracks || [];
        const wantVocal = /vocal|voice|sing/i.test(stem);
        const track = wantVocal
          ? tracks.find(t => /vocal|voice|sing/i.test(t.label || '')) || tracks[0]
          : tracks.find(t => /string|stem|instrument/i.test(t.label || '')) || tracks[0];
        const url = track?.url;
        if (!url) throw new Error('No track URL');
        const dl = await fetch(url);
        return dl.blob();
      }
      if (task?.status === 'error' || task?.status === 'cancelled') throw new Error('LALAL task failed');
    }
    throw new Error('LALAL timeout');
  }

  async function ensureAudioBlob(blob, contentType = '') {
    if (!blob || blob.size < 4096) {
      throw new Error('קובץ אודיו ריק או לא שלם — נסו להוריד שוב');
    }
    const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const isWebm = head[0] === 0x1a && head[1] === 0x45;
    const isMp4 = head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70;
    const isMp3 = (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33)
      || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0);
    if (!isWebm && !isMp4 && !isMp3) {
      const peek = await blob.slice(0, 64).text().catch(() => '');
      if (peek.includes('<!DOCTYPE') || peek.trim().startsWith('{')) {
        throw new Error('הורדה נכשלה — התקבל קובץ שגוי מהשרת. נסו שוב בעוד דקה.');
      }
      throw new Error('פורמט אודיו לא נתמך — נסו להוריד שוב');
    }
    const type = contentType.split(';')[0]
      || (isMp4 ? 'audio/mp4' : isWebm ? 'audio/webm' : 'audio/mpeg');
    if (blob.type === type) return blob;
    return new Blob([await blob.arrayBuffer()], { type });
  }

  /**
   * @param {string} videoId
   * @param {(msg:string,pct:number)=>void} [onProgress]
   */
  async function fetchYoutube(videoId, onProgress, meta = {}) {
    const proxy = proxyUrl();
    const format = normalizeDownloadFormat(meta.format || getDownloadFormat());
    const qs = new URLSearchParams({ id: videoId, library: '1', format });
    if (meta.title) qs.set('title', meta.title);
    if (meta.author) qs.set('author', meta.author);

    async function _fetchFrom(url, label) {
      onProgress?.(`מוריד למכשיר שלך (${label})…`, 8);
      const resp = await fetch(`${url}?${qs}`, { signal: AbortSignal.timeout(300000) });
      if (!resp.ok) {
        let msg = `הורדה נכשלה (${resp.status})`;
        try {
          const j = await resp.json();
          msg = j.error || msg;
        } catch { /* noop */ }
        throw new Error(msg);
      }
      const ct = resp.headers.get('content-type') || '';
      if (ct.includes('json')) {
        const j = await resp.json();
        if (j.streamUrl) {
          onProgress?.('מוריד אודיו…', 15);
          const ar = await fetch(j.streamUrl, { signal: AbortSignal.timeout(300000) });
          if (!ar.ok) throw new Error(`הורדת אודיו נכשלה (${ar.status})`);
          onProgress?.('הורדה הושלמה', 25);
          return ensureAudioBlob(await ar.blob(), ar.headers.get('content-type') || '');
        }
        throw new Error(j.error || 'לא הצלחנו להוריד את השיר — נסו שוב');
      }
      onProgress?.('הורדה הושלמה — שומר במכשיר…', 25);
      const raw = await resp.blob();
      return ensureAudioBlob(raw, ct);
    }

    const onPublic = typeof DeviceUtils !== 'undefined' && DeviceUtils.isPublicHostedPage();
    const desktop = typeof DeviceUtils !== 'undefined' && !DeviceUtils.isMobile();
    const errors = [];
    const apiPaths = downloadApiUrls().map((path) => ({
      path,
      label: (!path.startsWith('http') || path.startsWith(location.origin)) ? 'אתר' : 'שרת',
    }));

    if (proxy) {
      try {
        const health = await checkHealth();
        if (health.ok) {
          return await _fetchFrom(`${proxy}/api/youtube-audio`, 'מחשב מקומי');
        }
      } catch (e) { errors.push(e); }
    }

    for (const { path, label } of apiPaths) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) {
            onProgress?.(`מנסה שוב להוריד (${attempt + 1}/3)…`, 4 + attempt * 2);
            await new Promise((r) => setTimeout(r, 1200 * attempt));
          }
          return await _fetchFrom(path, label);
        } catch (e) { errors.push(e); }
      }
    }

    if (!onPublic) {
      try {
        return await fetchViaPipedOrInvidious(videoId, onProgress);
      } catch (e) { errors.push(e); }
    }

    const last = errors[errors.length - 1];
    if (desktop) {
      throw last || new Error(
        'לא הצלחנו להוריד למחשב. הריצו tools\\stem-proxy\\start-windows.bat (השאירו פתוח) — ודאו ש-yt-dlp מותקן: winget install yt-dlp',
      );
    }
    throw last || new Error('לא הצלחנו להוריד — נסו שוב בעוד דקה');
  }

  /** שמירת שיר שכבר בספריית הלימוד — בלי הורדה מחדש */
  async function saveLibraryTrack(videoId, opts = {}) {
    if (typeof LearnOffline === 'undefined') throw new Error('ספריית לימוד לא זמינה');
    const rec = await LearnOffline.get(videoId);
    if (!rec?.blob) throw new Error('השיר לא מוכן בספרייה — הורידו אותו קודם (📥)');
    const safe = String(rec.titleHe || rec.title || videoId)
      .replace(/[^\w\u0590-\u05FF.-]+/g, '_').slice(0, 40);
    const format = normalizeDownloadFormat(opts.format || rec.audioFormat || getDownloadFormat());
    const filename = downloadFilename(safe, videoId, rec.blob, format);
    const result = await saveBlobAsFile(rec.blob, filename);
    return { filename, method: result.method, size: rec.blob.size };
  }

  async function saveBlobAsFile(blob, filename) {
    const name = filename || 'audio.mp3';
    const mobile = typeof DeviceUtils !== 'undefined' && DeviceUtils.isMobile();
    const mime = blob.type || 'audio/mp4';

    if (mobile && navigator.share) {
      try {
        const file = new File([blob], name, { type: mime });
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: name });
          return { method: 'share' };
        }
      } catch (e) {
        if (e?.name === 'AbortError') return { method: 'cancelled' };
      }
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(a.href), 8000);
    return { method: mobile ? 'library-only' : 'download' };
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
      format: formatOpt,
    } = opts;

    const format = normalizeDownloadFormat(formatOpt || getDownloadFormat());

    onProgress?.(`מוריד למכשיר שלך (${format.toUpperCase()})…`, 3);
    const blob = await fetchYoutube(videoId, onProgress, { title: titleHe || title, author, format });
    const mobile = typeof DeviceUtils !== 'undefined' && DeviceUtils.isMobile();

    if (saveOffline && typeof LearnOffline !== 'undefined') {
      onProgress?.('שומר בספריית לימוד במכשיר…', 88);
      await LearnOffline.save(videoId, blob, {
        title, titleHe, author, songId,
        thumbUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        audioFormat: blobAudioExt(blob),
      });
    }

    if (saveToDisk) {
      const safe = String(titleHe || title).replace(/[^\w\u0590-\u05FF.-]+/g, '_').slice(0, 40);
      const fileResult = await saveBlobAsFile(blob, downloadFilename(safe, videoId, blob, format));
      if (fileResult.method === 'share') {
        onProgress?.('נשמר באפליקציה + שותף מהמכשיר', 96);
      } else if (!mobile) {
        onProgress?.('נשמר גם כקובץ במחשב', 96);
      }
    }

    onProgress?.('מוכן ללימוד במכשיר הזה', 100);
    if (typeof LearnLibrary !== 'undefined') LearnLibrary.refresh();
    return blob;
  }

  async function listDiskLibrary() {
    const proxy = proxyUrl();
    if (!proxy) return null;
    try {
      const r = await fetch(`${proxy}/api/learn-library`, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return null;
      return r.json();
    } catch {
      return null;
    }
  }

  /** בידוד קול הזמר בלבד */
  async function separateVocals(file, opts = {}) {
    return separate(file, { ...opts, stem: 'vocals' });
  }

  /** בידוד ליווי — בוזוקי/בס/כלים (ללא קול) */
  async function separateBacking(file, opts = {}) {
    const provider = opts.provider || 'lalal';
    const stem = provider === 'moises' ? 'other' : 'strings';
    return separate(file, { ...opts, stem });
  }

  return {
    separate,
    separateVocals,
    separateBacking,
    checkHealth,
    checkDownloadReady,
    fetchYoutube,
    saveBlobAsFile,
    saveLibraryTrack,
    downloadForLearning,
    getDownloadFormat,
    setDownloadFormat,
    normalizeDownloadFormat,
    downloadFilename,
    blobAudioExt,
    listDiskLibrary,
    getProxyUrl: proxyUrl,
  };
})();
