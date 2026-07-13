/* ============================================================
   InstallPrompt — כפתור/באנר התקנה ל-PWA (beforeinstallprompt)
   ============================================================ */
'use strict';

const InstallPrompt = (() => {
  const KEY = 'bouzouki_install_prompt_dismissed_v1';
  const DISMISS_DAYS = 14;
  const BANNER_ID = 'install-prompt-banner';
  const STYLE_ID = 'install-prompt-styles';

  let deferredEvent = null;
  let bannerEl = null;

  function isStandalone() {
    try {
      return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    } catch {
      return false;
    }
  }

  function isDismissed() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const until = parseInt(raw, 10);
      if (!until || Number.isNaN(until)) return false;
      return Date.now() < until;
    } catch {
      return false;
    }
  }

  function rememberDismissal() {
    try {
      const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
      localStorage.setItem(KEY, String(until));
    } catch { /* noop */ }
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = `
      .install-prompt-banner {
        position: fixed; left: 12px; right: 12px; bottom: calc(16px + env(safe-area-inset-bottom));
        z-index: 9000; display: flex; align-items: center; gap: 10px;
        background: var(--bg-card, #16283c); border: 1px solid var(--gold, #e3b341);
        border-radius: var(--radius, 14px); box-shadow: var(--shadow, 0 8px 28px rgba(0,0,0,.35));
        padding: 12px 14px; direction: rtl; font-family: inherit;
      }
      .install-prompt-text { flex: 1; font-size: 14px; color: var(--text, #e8eef5); line-height: 1.4; }
      .install-prompt-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
      .install-prompt-install {
        background: var(--gold, #e3b341); color: var(--bg-deep, #0b1623); border: none;
        border-radius: 10px; padding: 8px 14px; font-size: 13px; font-weight: 700; cursor: pointer;
      }
      .install-prompt-dismiss {
        background: transparent; color: var(--text-dim, #9db2c7); border: none;
        font-size: 18px; line-height: 1; cursor: pointer; padding: 4px 6px;
      }
      @media (max-width: 860px) {
        .install-prompt-banner { bottom: calc(86px + env(safe-area-inset-bottom)); }
      }
    `;
    document.head.appendChild(s);
  }

  function hideBanner() {
    if (bannerEl) {
      bannerEl.remove();
      bannerEl = null;
    }
  }

  function showBanner() {
    if (bannerEl || isStandalone() || isDismissed()) return;
    injectStyles();

    bannerEl = document.createElement('div');
    bannerEl.id = BANNER_ID;
    bannerEl.className = 'install-prompt-banner';
    bannerEl.setAttribute('role', 'dialog');
    bannerEl.setAttribute('aria-live', 'polite');
    bannerEl.innerHTML = `
      <span class="install-prompt-text">📲 התקינו את האפליקציה למסך הבית לגישה מהירה ושימוש גם ללא אינטרנט</span>
      <span class="install-prompt-actions">
        <button type="button" class="install-prompt-install">התקנה</button>
        <button type="button" class="install-prompt-dismiss" aria-label="סגור">×</button>
      </span>`;
    document.body.appendChild(bannerEl);

    bannerEl.querySelector('.install-prompt-install')?.addEventListener('click', async () => {
      const evt = deferredEvent;
      hideBanner();
      if (!evt) return;
      try {
        evt.prompt();
        await evt.userChoice;
      } catch { /* noop */ }
      deferredEvent = null;
    });

    bannerEl.querySelector('.install-prompt-dismiss')?.addEventListener('click', () => {
      rememberDismissal();
      hideBanner();
    });
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredEvent = event;
    if (!isStandalone() && !isDismissed()) showBanner();
  });

  window.addEventListener('appinstalled', () => {
    deferredEvent = null;
    hideBanner();
  });

  return {};
})();
