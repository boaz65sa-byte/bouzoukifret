/* ============================================================
   PlaybackSpeed — מכפיל מהירות גלובלי לכל אנימציית מסלול/תווים
   על הפרטבורד (DromosRoad, theory-lab, song-academy, וכו').
   נכנס לתוקף בתחילת כל נגינה חדשה (לא live באמצע נגינה).
   ============================================================ */
'use strict';

const PlaybackSpeed = (() => {
  const KEY = 'playback-speed-v1';
  const STEPS = [0.5, 0.75, 1, 1.25, 1.5];

  let mult = parseFloat(localStorage.getItem(KEY));
  if (!STEPS.includes(mult)) mult = 1;

  function get() { return mult; }
  function set(v) {
    mult = STEPS.includes(v) ? v : 1;
    try { localStorage.setItem(KEY, String(mult)); } catch { /* noop */ }
    document.dispatchEvent(new CustomEvent('playback-speed-change', { detail: { speed: mult } }));
  }

  /** ממיר משך "בסיס x1" (ms) למשך בפועל לפי המכפיל הנוכחי. */
  function scaleGap(baseMs) {
    return Math.max(30, Math.round(baseMs / mult));
  }

  function subscribe(fn) {
    document.addEventListener('playback-speed-change', (e) => fn(e.detail.speed));
  }

  /** מוסיף שורת צ'יפים ×0.5/×0.75/×1/×1.25/×1.5 ל-host. */
  function mountChips(host, opts = {}) {
    if (!host) return null;
    const bar = document.createElement('div');
    bar.className = 'pbs-speed-bar';
    const label = document.createElement('span');
    label.className = 'fs-pos-label';
    label.textContent = 'מהירות:';
    bar.appendChild(label);

    STEPS.forEach((s) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn secondary fs-pos-chip pbs-speed' + (s === mult ? ' active' : '');
      b.textContent = '×' + s;
      b.dataset.s = String(s);
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        set(s);
        bar.querySelectorAll('.pbs-speed').forEach((x) => x.classList.toggle('active', Number(x.dataset.s) === s));
        opts.onChange?.(s);
      });
      bar.appendChild(b);
    });

    host.appendChild(bar);
    return bar;
  }

  return { get, set, scaleGap, subscribe, mountChips, STEPS };
})();
