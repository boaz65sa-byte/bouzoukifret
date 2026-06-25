/* ============================================================
   ProxySettings — כתובת stem-proxy (config.js + localStorage + שרת)
   ============================================================ */
'use strict';

const ProxySettings = (() => {
  const LS_KEY = 'bouzouki_stem_proxy_url';

  function normalize(url) {
    const raw = String(url || '').trim().replace(/\/$/, '');
    if (!raw) return '';
    try {
      const u = new URL(raw);
      return u.origin;
    } catch {
      return '';
    }
  }

  function fromConfig() {
    return normalize(window.BOUZOUKI_CONFIG?.stemProxyUrl);
  }

  function fromStorage() {
    try {
      return normalize(localStorage.getItem(LS_KEY));
    } catch {
      return '';
    }
  }

  function getRaw() {
    return fromStorage() || fromConfig() || 'http://127.0.0.1:3456';
  }

  function getResolved() {
    const raw = getRaw();
    return typeof DeviceUtils !== 'undefined'
      ? DeviceUtils.resolveProxyUrl(raw)
      : raw;
  }

  function save(url) {
    const n = normalize(url);
    if (!n) {
      localStorage.removeItem(LS_KEY);
      return '';
    }
    localStorage.setItem(LS_KEY, n);
    return n;
  }

  function clear() {
    localStorage.removeItem(LS_KEY);
  }

  function hasOverride() {
    return !!fromStorage();
  }

  async function loadSiteConfig() {
    try {
      const r = await fetch('/api/site-config', { signal: AbortSignal.timeout(5000) });
      if (!r.ok) return null;
      const data = await r.json();
      const url = normalize(data.stemProxyUrl);
      if (!url) return null;
      if (!window.BOUZOUKI_CONFIG) window.BOUZOUKI_CONFIG = {};
      if (!fromStorage()) window.BOUZOUKI_CONFIG.stemProxyUrl = url;
      return url;
    } catch {
      return null;
    }
  }

  return {
    getRaw, getResolved, save, clear, hasOverride, fromStorage, fromConfig, loadSiteConfig,
  };
})();
