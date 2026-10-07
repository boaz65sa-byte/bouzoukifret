/* ============================================================
   DeviceUtils — מובייל, פרוקסי ברשת מקומית
   ============================================================ */
'use strict';

const DeviceUtils = (() => {
  const LOCAL_HOSTS = ['localhost', '127.0.0.1', '::1'];

  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 1 && window.innerWidth < 900);
  }

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isLocalProxyHost(hostname) {
    return LOCAL_HOSTS.includes(hostname);
  }

  function isLanHost(host) {
    return /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host || '');
  }

  /** אתר מפורסם (Vercel/GitHub Pages וכו') — לא להחליף localhost לדומיין הזה */
  function isPublicHostedPage(host) {
    const h = host || location.hostname;
    if (!h || LOCAL_HOSTS.includes(h) || isLanHost(h)) return false;
    return true;
  }

  /** אם האפליקציה נפתחה מ-IP ברשת מקומית — השתמש באותו IP לפרוקסי */
  function resolveProxyUrl(configUrl) {
    const raw = configUrl || window.BOUZOUKI_CONFIG?.stemProxyUrl || 'http://127.0.0.1:3456';
    try {
      const u = new URL(String(raw).replace(/\/$/, ''));
      const pageHost = location.hostname;
      if (!isLocalProxyHost(u.hostname)) return u.origin;
      if (isPublicHostedPage(pageHost)) return u.origin;
      if (pageHost && !LOCAL_HOSTS.includes(pageHost)) {
        u.hostname = pageHost;
      }
      return u.origin;
    } catch {
      return 'http://127.0.0.1:3456';
    }
  }

  /**
   * אתר ציבורי (HTTPS) לא יכול להגיע ל-localhost של המחשב.
   * לא מנסים את הבקשה — מציגים הסבר בעברית במקום.
   */
  function proxyReachableFromPage(proxyUrl) {
    const raw = proxyUrl || window.BOUZOUKI_CONFIG?.stemProxyUrl || '';
    let host = '';
    try { host = new URL(String(raw)).hostname; } catch { host = ''; }
    if (isPublicHostedPage() && (!host || isLocalProxyHost(host))) return false;
    return true;
  }

  /** יוצרים ומעירים AudioContext בתוך מחוות המשתמש, לפני await של getUserMedia. */
  function armUserGestureAudio() {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    let resume = Promise.resolve();
    try {
      const pending = ctx.resume();
      if (pending && typeof pending.then === 'function') resume = pending;
    } catch { /* already running */ }
    return {
      ctx,
      resume,
      close() { try { ctx.close(); } catch { /* noop */ } },
    };
  }

  const DEFAULT_API_ORIGIN = 'https://bouzoukifret.vercel.app';

  /** כתובות API לנסות (יחסי + Vercel) — web.app אין לו /api */
  function apiOriginUrls(apiPath) {
    const path = String(apiPath || '').startsWith('/') ? apiPath : `/${apiPath || ''}`;
    const configured = window.BOUZOUKI_CONFIG?.apiOrigins
      || window.BOUZOUKI_CONFIG?.downloadApiOrigins
      || [DEFAULT_API_ORIGIN];
    const urls = [];
    const add = (u) => { if (u && !urls.includes(u)) urls.push(u); };
    if (typeof location !== 'undefined' && location.protocol.startsWith('http')) {
      add(path);
    }
    for (const raw of configured) {
      try {
        const origin = new URL(String(raw).replace(/\/$/, '')).origin;
        if (origin !== location?.origin) add(`${origin}${path}`);
      } catch { /* skip */ }
    }
    if (!urls.length) add(`${DEFAULT_API_ORIGIN}${path}`);
    return urls;
  }

  function proxyHintMessage(proxyUrl) {
    if (isPublicHostedPage() && isLocalProxyHost(new URL(proxyUrl).hostname)) {
      return 'באתר הציבורי אין שרת מקומי. החיפוש והניתוח רצים בדפדפן, בלי לפנות אל localhost:3456. שרת stem-proxy זמין רק כשמריצים את האפליקציה על המחשב.';
    }
    if (!isMobile()) {
      return `הריצו stem-proxy: cd tools\\stem-proxy && npm start (${proxyUrl})`;
    }
    const pageHost = location.hostname;
    if (LOCAL_HOSTS.includes(pageHost)) {
      return 'במובייל: פתחו את האפליקציה דרך IP המחשב (לא localhost). לדוגמה: http://192.168.1.5:8080 — והריצו stem-proxy על המחשב.';
    }
    return `ודאו שיש חיבור אינטרנט. השיר נשמר ב<strong>ספריית לימוד</strong> במכשיר הזה (טלפון / טאבלט / מחשב). stem-proxy מקומי (${proxyUrl}) אופציונלי לשיפור מהירות במחשב בלבד.`;
  }

  return {
    isMobile, isIOS, isPublicHostedPage, isLocalProxyHost,
    resolveProxyUrl, proxyReachableFromPage, armUserGestureAudio, proxyHintMessage,
    apiOriginUrls, DEFAULT_API_ORIGIN,
  };
})();
