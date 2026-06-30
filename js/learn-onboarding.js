/* ============================================================
   LearnOnboarding — הסבר ראשון ללימוד מהשיר (פשוט למשתמש)
   ============================================================ */
'use strict';

const LearnOnboarding = (() => {
  const KEY = 'bouzouki_learn_setup_seen_v3';

  function seen() {
    return localStorage.getItem(KEY) === '1';
  }

  function dismiss() {
    localStorage.setItem(KEY, '1');
    document.getElementById('learn-onboarding-overlay')?.remove();
  }

  function injectStyles() {
    if (document.getElementById('learn-onboard-styles')) return;
    const s = document.createElement('style');
    s.id = 'learn-onboard-styles';
    s.textContent = `
      .learn-onboard-overlay { position:fixed; inset:0; z-index:10000; background:rgba(0,0,0,.72);
        display:flex; align-items:center; justify-content:center; padding:16px; }
      .learn-onboard-card { max-width:440px; width:100%; background:var(--bg-card,#1a1a2e); border-radius:16px;
        border:1px solid var(--gold,#e3b341); padding:22px; box-shadow:0 12px 48px rgba(0,0,0,.6); }
      .learn-onboard-card h2 { margin:0 0 8px; font-size:20px; color:var(--gold,#e3b341); }
      .learn-onboard-steps { margin:14px 0; padding-right:20px; line-height:1.85; font-size:15px; }
      .learn-onboard-status { padding:10px 12px; border-radius:8px; margin:12px 0; font-size:13px; }
      .learn-onboard-status.ok { background:rgba(95,200,143,.12); border:1px solid rgba(95,200,143,.35); }
      .learn-onboard-actions { display:flex; flex-wrap:wrap; gap:8px; margin-top:16px; }
      .learn-onboard-advanced { margin-top:12px; font-size:12px; }
      .learn-onboard-advanced summary { cursor:pointer; color:var(--text-dim,#999); }
      .learn-onboard-advanced code { background:var(--bg-elev,#222); padding:2px 6px; border-radius:4px; direction:ltr; font-size:11px; }
    `;
    document.head.appendChild(s);
  }

  async function showIfNeeded() {
    if (seen()) return;
    if (!document.getElementById('screen-learn')?.classList.contains('active')
      && !document.getElementById('screen-learn-lib')?.classList.contains('active')) return;

    injectStyles();
    const onPublic = typeof DeviceUtils !== 'undefined' && DeviceUtils.isPublicHostedPage();

    const advancedBlock = onPublic ? '' : `
      <details class="learn-onboard-advanced">
        <summary>הגדרות מתקדמות (מפתחים בלבד)</summary>
        <p class="hint" style="margin:8px 0 0">אופציונלי — לשיפור מהירות או בידוד בוזוקי במחשב מקומי:</p>
        <ol style="padding-right:18px;line-height:1.6;margin:8px 0 0">
          <li><code>tools/stem-proxy/start-windows.bat</code></li>
          <li>yt-dlp: <code>winget install yt-dlp</code></li>
        </ol>
      </details>`;

    const overlay = document.createElement('div');
    overlay.id = 'learn-onboarding-overlay';
    overlay.className = 'learn-onboard-overlay';
    overlay.innerHTML = `
      <div class="learn-onboard-card" role="dialog" aria-labelledby="learn-onboard-title">
        <h2 id="learn-onboard-title">🎓 ברוכים הבאים ללימוד מהשיר</h2>
        <p>שלושה צעדים — ומתחילים:</p>
        <ol class="learn-onboard-steps">
          <li><b>חפשו שיר</b> — בשם או אמן (יוונית / עברית)</li>
          <li><b>לחצו 📥</b> — השיר נשמר אצלכם בספריית לימוד</li>
          <li><b>למדו</b> — תווים, מילים ונגינה על הגריף</li>
        </ol>
        <div class="learn-onboard-status ok">✓ הכל מוכן — אפשר להתחיל מיד, בלי התקנות</div>
        <p class="hint" style="margin:8px 0 0;font-size:12px">השירים נשמרים במכשיר הזה (מחשב / טלפון / טאבלט).</p>
        ${advancedBlock}
        <div class="learn-onboard-actions">
          <button type="button" class="btn gold" id="learn-onboard-ok">הבנתי — התחל ללמוד</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#learn-onboard-ok')?.addEventListener('click', dismiss);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) dismiss(); });
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

  function initOnNav() {
    document.querySelectorAll('.nav-btn[data-screen="learn"], .nav-btn[data-screen="learn-lib"]').forEach((btn) => {
      btn.addEventListener('click', () => setTimeout(showIfNeeded, 300));
    });
  }

  return { showIfNeeded, dismiss, initOnNav, checkProxyStatus };
})();
