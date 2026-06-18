/* Service worker — cache בסיסי לשימוש offline (HTML/CSS/JS מקומי) */
'use strict';

const CACHE = 'bouzouki-academy-v1';
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './config.example.js',
  './icons/icon.svg',
  './js/data.js',
  './js/audio.js',
  './js/chord-library.js',
  './js/chord-tooltip.js',
  './js/app.js',
  './js/exercises.js',
  './js/listen.js',
  './js/learn-youtube.js',
  './js/song-analyzer.js',
  './js/essentia-analyzer.js',
  './js/pitch-player.js',
  './js/daily-streak.js',
  './js/progress-db.js',
  './js/progress-dashboard.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((resp) => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
        const copy = resp.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
        return resp;
      }).catch(() => cached);
    })
  );
});
