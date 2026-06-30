/* ============================================================
   LearnOnboarding — הסבר ראשון על stem-proxy ו-config
   ============================================================ */
'use strict';

const LearnOnboarding = (() => {
  const KEY = 'bouzouki_learn_setup_seen_v2';

  function seen() {
    return localStorage.getItem(KEY) === '1';
  }

  function dismiss() {
    localStorage.setItem(KEY, '1');
    document.getElementById('learn-onboarding-overlay')?.remove();
  }

  function esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  async function checkProxyStatus() {
    if (typeof YoutubeSearch === 'undefined') return { online: false, needsRestart: false };
    const health = await YoutubeSearch.checkProxy();
    let needsRestart = false;
    if (health.online) {
      try {
        const r = await fetch(`${YoutubeSearch.getProxyUrl()}/api/youtube-search?q=test`, { signal: AbortSignal.timeout(3000) });
        needsRestart = r.status === 404;
      } catch { /* noop */ }
    }
    return { ...health, needsRestart };
  }

  function injectStyles() {
    if (document.getElementById('learn-onboard-styles')) return;
    const s = document.createElement('style');
    s.id = 'learn-onboard-styles';
    s.textContent = `
      .learn-onboard-overlay { position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,.72);
        display:flex; align-items:center; justify-content:center; padding:16px; }
      .learn-onboard-card { max-width:480px; width:100%; background:var(--bg-card,#1a1a2e); border-radius:16px;
        border:1px solid var(--gold,#e3b341); padding:22px; box-shadow:0 12px 48px rgba(0,0,0,.6); }
      .learn-onboard-card h2 { margin:0 0 8px; font-size:20px; color:var(--gold,#e3b341); }
      .learn-onboard-steps { margin:14px 0; padding-right:20px; line-height:1.75; font-size:14px; }
      .learn-onboard-steps code { background:var(--bg-elev,#222); padding:2px 8px; border-radius:4px; font-size:12px; direction:ltr; }
      .learn-onboard-status { padding:10px 12px; border-radius:8px; margin:12px 0; font-size:13px; }
      .learn-onboard-status.ok { background:rgba(95,200,143,.12); border:1px solid rgba(95,200,143,.35); }
      .learn-onboard-status.warn { background:rgba(217,100,89,.12); border:1px solid rgba(217,100,89,.35); }
      .learn-onboard-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
    `;
    document.head.appendChild(s);
  }

  async function showIfNeeded() {
    if (seen()) return;
    if (!document.getElementById('screen-learn')?.classList.contains('active')
      && !document.getElementById('screen-learn-lib')?.classList.contains('active')) return;

    injectStyles();
    const st = await checkProxyStatus();
    const proxyUrl = typeof YoutubeSearch !== 'undefined' ? YoutubeSearch.getProxyUrl() : 'http://127.0.0.1:3456';
    const hasConfig = !!(window.BOUZOUKI_CONFIG?.stemProxyUrl);

    let statusHtml = '';
    const onPublic = typeof DeviceUtils !== 'undefined' && DeviceUtils.isPublicHostedPage();
    if (st.online && !st.needsRestart) {
      statusHtml = '<div class="learn-onboard-status ok">✓ stem-proxy פעיל — חיפוש YouTube והורדה זמינים</div>';
    } else if (st.needsRestart) {
      statusHtml = '<div class="learn-onboard-status warn">🔄 stem-proxy דורש הפעלה מחדש (npm start ב-tools/stem-proxy)</div>';
    } else if (onPublic) {
      statusHtml = '<div class="learn-onboard-status ok">✓ חיפוש והורדה זמינים מהאתר — לחצו 📥 על סרטון. לשיפור איכות: stem-proxy מקומי (אופציונלי)</div>';
    } else {
      statusHtml = '<div class="learn-onboard-status ok">✓ אפשר לחפש ולהוריד — stem-proxy מקומי משפר מהירות (אופציונלי)</div>';
    }

    const overlay = document.createElement('div');
    overlay.id = 'learn-onboarding-overlay';
    overlay.className = 'learn-onboard-overlay';
    overlay.innerHTML = `
      <div class="learn-onboard-card" role="dialog" aria-labelledby="learn-onboard-title">
        <h2 id="learn-onboard-title">🎓 ברוכים הבאים ללימוד מהשיר</h2>
        <p>חפשו שיר, לחצו 📥 להורדה לספריית הלימוד. stem-proxy מקומי משפר מהירות (אופציונלי):</p>
        <ol class="learn-onboard-steps">
          <li>העתיקו <code>config.example.js</code> → <code>config.js</code>${hasConfig ? ' ✓' : ''}</li>
          <li>בטרמינל: <code>cd tools/stem-proxy && npm install && npm start</code></li>
          <li>התקינו yt-dlp: <code>winget install yt-dlp</code></li>
          <li>כתובת פרוקסי: <code>${esc(proxyUrl)}</code></li>
          ${typeof DeviceUtils !== 'undefined' && DeviceUtils.isMobile()
    ? '<li><b>מובייל:</b> פתחו את האפליקציה דרך IP המחשב (לא localhost). השירים נשמרים ב<strong>ספריית לימוד</strong> באפליקציה.</li>'
    : ''}
        </ol>
        ${statusHtml}
        <p class="hint" style="margin:8px 0 0;font-size:12px">בלי פרוקסי — עדיין אפשר לחפש שירים מהספרייה המובנית ולנתח MP3 שהעליתם.</p>
        <div class="learn-onboard-actions">
          <button type="button" class="btn gold" id="learn-onboard-ok">הבנתי — התחל ללמוד</button>
          <button type="button" class="btn secondary" id="learn-onboard-recheck">↻ בדוק שוב</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#learn-onboard-ok')?.addEventListener('click', dismiss);
    overlay.querySelector('#learn-onboard-recheck')?.addEventListener('click', async () => {
      overlay.remove();
      localStorage.removeItem(KEY);
      await showIfNeeded();
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) dismiss(); });
  }

  function initOnNav() {
    document.querySelectorAll('.nav-btn[data-screen="learn"], .nav-btn[data-screen="learn-lib"]').forEach(btn => {
      btn.addEventListener('click', () => setTimeout(showIfNeeded, 300));
    });
  }

  return { showIfNeeded, dismiss, initOnNav, checkProxyStatus };
})();
