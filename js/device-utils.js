/* ============================================================
   DeviceUtils — מובייל, פרוקסי ברשת מקומית
   ============================================================ */
'use strict';

const DeviceUtils = (() => {
  function isMobile() {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      || (navigator.maxTouchPoints > 1 && window.innerWidth < 900);
  }

  function isIOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  /** אם האפליקציה נפתחה מ-IP ברשת — השתמש באותו IP לפרוקסי */
  function resolveProxyUrl(configUrl) {
    const raw = configUrl || window.BOUZOUKI_CONFIG?.stemProxyUrl || 'http://127.0.0.1:3456';
    try {
      const u = new URL(String(raw).replace(/\/$/, ''));
      const pageHost = location.hostname;
      const localHosts = ['localhost', '127.0.0.1', '::1'];
      if (pageHost && !localHosts.includes(pageHost) && localHosts.includes(u.hostname)) {
        u.hostname = pageHost;
      }
      return u.origin;
    } catch {
      return 'http://127.0.0.1:3456';
    }
  }

  function proxyHintMessage(proxyUrl) {
    if (!isMobile()) {
      return `הריצו stem-proxy: cd tools\\stem-proxy && npm start (${proxyUrl})`;
    }
    const pageHost = location.hostname;
    const local = ['localhost', '127.0.0.1'];
    if (local.includes(pageHost)) {
      return 'במובייל: פתחו את האפליקציה דרך IP המחשב (לא localhost). לדוגמה: http://192.168.1.5:8080 — והריצו stem-proxy על המחשב.';
    }
    return `ודאו ש-stem-proxy רץ על המחשב ב-${proxyUrl} (אותה רשת WiFi). השיר נשמר תמיד ב<strong>ספריית לימוד</strong> באפליקציה.`;
  }

  return { isMobile, isIOS, resolveProxyUrl, proxyHintMessage };
})();
