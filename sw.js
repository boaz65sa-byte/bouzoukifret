/* Service worker — offline: קבצים מקומיים + Essentia/Meyda מה-CDN */
'use strict';

const CACHE_STATIC = 'bouzouki-static-v26';
const CACHE_CDN = 'bouzouki-cdn-v1';

const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './config.example.js',
  './js/device-utils.js',
  './js/proxy-settings.js',
  './icons/icon.svg',
  './js/data.js',
  './js/maqamat-data.js',
  './js/audio.js',
  './js/chord-library.js',
  './js/chord-tooltip.js',
  './js/course.js',
  './js/app.js',
  './js/fretboard-scale.js',
  './js/exercises.js',
  './js/listen.js',
  './js/game.js',
  './js/songs/song-references.js',
  './js/songs/song-catalog.js',
  './js/songs.js',
  './js/learning-resources.js',
  './js/dromos-paths.js',
  './js/learn-offline.js',
  './js/learn-flow.js',
  './js/learn-onboarding.js',
  './js/learn-library.js',
  './js/youtube-search.js',
  './js/learn-youtube.js',
  './js/stem-api.js',
  './js/pitch-player.js',
  './js/live-chord.js',
  './js/essentia-analyzer.js',
  './js/song-analyzer.js',
  './js/master.js',
  './js/tuner.js',
  './js/daily-streak.js',
  './js/progress-db.js',
  './js/features.js',
  './js/progress-dashboard.js',
  './js/features2.js',
  './js/basic-pitch-engine.js',
  './js/bouzouki-studio.js',
  './js/song-teacher.js',
  './js/vocal-melody-teacher.js',
  './js/theory-lab.js',
  './js/arp-studio.js',
  './js/reference-cards.js',
  './js/worksheets.js',
  './js/education-content.js',
  './js/penia-visuals.js',
  './js/dromos-visuals.js',
  './js/learn.js',
  './js/song-learn.js',
  './js/song-academy.js',
  './js/adaptive.js',
  './js/daily-workout.js',
  './js/practice-library.js',
  './js/modus-path.js',
  './js/skills.js',
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.web.js',
  'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia.js-core.js',
  'https://unpkg.com/meyda@5.6.2/dist/web/meyda.min.js',
];

const CDN_HOSTS = new Set(['cdn.jsdelivr.net', 'unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com']);

async function cacheCdnAssets() {
  const cache = await caches.open(CACHE_CDN);
  await Promise.allSettled(
    CDN_ASSETS.map(async (url) => {
      const resp = await fetch(url, { mode: 'cors' });
      if (resp.ok) await cache.put(url, resp);
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => cacheCdnAssets())
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_STATIC && k !== CACHE_CDN).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function cacheableResponse(resp) {
  return resp && resp.status === 200 && (resp.type === 'basic' || resp.type === 'cors');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // network-first עבור HTML ו-CSS — כדי שעדכון/תיקון לא ייתקע במטמון ישן
    const isDoc = req.mode === 'navigate' || url.pathname.endsWith('.html') ||
                  url.pathname.endsWith('.css') || url.pathname === '/';
    if (isDoc) {
      event.respondWith(
        fetch(req).then((resp) => {
          if (cacheableResponse(resp)) {
            const copy = resp.clone();
            caches.open(CACHE_STATIC).then((c) => c.put(req, copy));
          }
          return resp;
        }).catch(() => caches.match(req))
      );
      return;
    }
    // stale-while-revalidate עבור שאר הקבצים (JS וכו׳)
    event.respondWith(
      caches.match(req).then((cached) => {
        const net = fetch(req).then((resp) => {
          if (cacheableResponse(resp)) {
            const copy = resp.clone();
            caches.open(CACHE_STATIC).then((c) => c.put(req, copy));
          }
          return resp;
        }).catch(() => cached);
        return cached || net;
      })
    );
    return;
  }

  if (!CDN_HOSTS.has(url.hostname)) return;

  event.respondWith(
    fetch(req).then((resp) => {
      if (cacheableResponse(resp)) {
        const copy = resp.clone();
        caches.open(CACHE_CDN).then((c) => c.put(req, copy));
      }
      return resp;
    }).catch(() => caches.match(req))
  );
});
