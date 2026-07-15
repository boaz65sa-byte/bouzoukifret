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

  /** אחרי מירור אופקי, התוכן הרלוונטי (למשל מיתר פתוח) עובר לצד הנגדי
   *  של קנבס רחב-גלילה — בלי זה המשתמש נשאר מסתכל על החלק הריק/הלא-רלוונטי.
   *  משקף את מיקום הגלילה של כל אלמנט גולל שנמצא בתוך root.
   *  הדף RTL, ודפדפנים שונים משתמשים במוסכמות scrollLeft שונות ב-RTL
   *  (טווח [0,max] או [-max,0]) — לכן קובעים את הגבולות בפועל בזמן ריצה
   *  במקום להניח מוסכמה קבועה. */
  function mirrorNearbyScroll(root) {
    if (!root) return;
    const candidates = [root, ...root.querySelectorAll('*')];
    candidates.forEach((el) => {
      if (el.scrollWidth > el.clientWidth + 2) {
        const cur = el.scrollLeft;
        el.scrollLeft = 1e6;
        const posBound = el.scrollLeft;
        el.scrollLeft = -1e6;
        const negBound = el.scrollLeft;
        el.scrollLeft = negBound + posBound - cur;
      }
    });
  }

  /** מוסיף שני כפתורי צ'יפ (⇋ אופקי, ⇅ אנכי) ל-host.
   *  opts.onChange() נקרא אחרי כל שינוי — הקורא אחראי לרנדר מחדש. */
  function mountToggle(host, opts = {}) {
    if (!host) return null;
    const bar = document.createElement('div');
    bar.className = 'fb-mirror-bar';

    const mk = (label, title, isActive, onClick, isHorizontal) => {
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
        if (isHorizontal) {
          // host/bar may have been detached and replaced by onChange's re-render —
          // anchor on the live active screen, not the (possibly stale) host reference.
          const scope = document.querySelector('.screen.active') || host.closest('.screen') || host.parentElement || host;
          mirrorNearbyScroll(scope);
        }
      });
      return b;
    };

    bar.appendChild(mk('⇋', 'הפוך אופקית (ימין-שמאל, כמו מול מישהו שמנגן)', isH, toggleH, true));
    bar.appendChild(mk('⇅', 'הפוך אנכית (מיתר גבוה/נמוך)', isV, toggleV, false));
    host.appendChild(bar);
    return bar;
  }

  return { isH, isV, setH, setV, toggleH, toggleV, subscribe, mountToggle };
})();
