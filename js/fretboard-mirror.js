/* ============================================================
   FretboardMirror — הופך את תצוגת הפרטבורד אופקית/אנכית, כך
   שהיא נראית כמו מבט על מישהו שמנגן מולך ולא על הכלי שלך.
   ============================================================ */
'use strict';

const FretboardMirror = (() => {
  const KEY_H = 'fb-mirror-h';
  const KEY_V = 'fb-mirror-v';

  let mirrorH = localStorage.getItem(KEY_H) === '1';
  let mirrorV = localStorage.getItem(KEY_V) === '1';

  function isH() { return mirrorH; }
  function isV() { return mirrorV; }

  function broadcast() {
    document.dispatchEvent(new CustomEvent('fretboard-mirror-change', { detail: { h: mirrorH, v: mirrorV } }));
  }

  function setH(v) {
    mirrorH = !!v;
    try { localStorage.setItem(KEY_H, mirrorH ? '1' : '0'); } catch { /* noop */ }
    broadcast();
  }
  function setV(v) {
    mirrorV = !!v;
    try { localStorage.setItem(KEY_V, mirrorV ? '1' : '0'); } catch { /* noop */ }
    broadcast();
  }
  function toggleH() { setH(!mirrorH); }
  function toggleV() { setV(!mirrorV); }

  function subscribe(fn) {
    document.addEventListener('fretboard-mirror-change', (e) => fn(e.detail));
  }

  /** מוסיף שני כפתורי צ'יפ (⇋ אופקי, ⇅ אנכי) ל-host.
   *  opts.onChange() נקרא אחרי כל שינוי — הקורא אחראי לרנדר מחדש. */
  function mountToggle(host, opts = {}) {
    if (!host) return null;
    const bar = document.createElement('div');
    bar.className = 'fb-mirror-bar';

    const mk = (label, title, isActive, onClick) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'btn secondary fs-pos-chip fb-mirror-btn' + (isActive() ? ' active' : '');
      b.title = title;
      b.setAttribute('aria-label', title);
      b.textContent = label;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        onClick();
        b.classList.toggle('active', isActive());
        opts.onChange?.();
      });
      return b;
    };

    bar.appendChild(mk('⇋', 'הפוך אופקית (ימין-שמאל, כמו מול מישהו שמנגן)', isH, toggleH));
    bar.appendChild(mk('⇅', 'הפוך אנכית (מיתר גבוה/נמוך)', isV, toggleV));
    host.appendChild(bar);
    return bar;
  }

  return { isH, isV, setH, setV, toggleH, toggleV, subscribe, mountToggle };
})();
