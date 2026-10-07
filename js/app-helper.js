/* ============================================================
   העוזר — כדור זהב עם עיניים, על כל מסך.
   טס אל הפקד הרלוונטי, טיפ בעברית, סיור קצר בכניסה הראשונה,
   «?» פותח שוב, אפשר לקפל, ומכבד prefers-reduced-motion.
   ============================================================ */
'use strict';

const AppHelper = (() => {
  const SEEN_KEY = 'bouzouki_helper_seen_v1';

  const TIPS = {
    home: {
      idle: 'כאן רואים את מבנה הבוזוקי ואת כל הצלילים על הצוואר. לחצו על נקודה כדי לשמוע.',
      tour: [
        { spot: '#anatomy-svg', text: 'זו מפת הכלי: גוף, צוואר עם סריגי מתכת, ראש ומפתחות.' },
        { spot: '#fb-home', text: 'הצוואר המלא. הנקודה הזהובה נושאת את שם התו בעברית ובלטינית.' },
        { spot: '#tuner', text: 'ארבעה קורסים כפולים: דו, פה, לה, רה. לחצו כדי לשמוע מיתר פתוח.' },
      ],
    },
    dromoi: {
      idle: 'בחרו דרומוס ותראו את הסולם על אותו צוואר. הזהוב הוא הטוניקה.',
      tour: [
        { spot: '#dromoi-list', text: 'כאן מחליפים דרומוס. כל בחירה צובעת את הצוואר מחדש.' },
        { spot: '#fb-dromos', text: 'הסולם יושב על צוואר הבוזוקי. נקודה זהובה עם שם התו, וכחולות לשאר המדרגות.' },
      ],
    },
    listen: {
      idle: 'נגנו את התו שהנקודה הזהובה מראה. ירוק — נכון, ואז מתקדמים.',
      tour: [
        { spot: '#fb-listen', text: 'היעד מסומן על הצוואר: נקודה זהובה ושם התו.' },
        { spot: '#ls-start', text: 'התחילו תרגול ואשרו את המיקרופון. נגנו צליל אחד בכל פעם.' },
      ],
    },
    tuner: {
      idle: 'הפעילו את המכוון. התו שזוהה נדלק על הצוואר עם שמו.',
      tour: [
        { spot: '#ct-toggle', text: 'הפעילו את המכוון ואשרו מיקרופון. הכול נשאר על המכשיר.' },
        { spot: '#ct-neck', text: 'הקורס שזיהינו נדלק בנקודה הזהובה, עם השם בעברית ובלטינית.' },
      ],
    },
    'master-modes': {
      idle: 'נגנו את התו שהנקודה מראה. הזהוב הוא הטוניקה, הירוק הוא התו שצריך עכשיו.',
      tour: [
        { spot: '#fb-master-modes', text: 'הדרומוס על הצוואר. עקבו אחרי הנקודה הזהובה ושם התו.' },
        { spot: '#mm-start', text: 'כאן מתחילים. נגנו את התו, והמאמן מאזין.' },
      ],
    },
    'master-chords': {
      idle: 'נגנו את כל תווי האקורד. כל תו שזוהה נדלק על הצוואר.',
      tour: [
        { spot: '#fb-master-chords', text: 'צורת האקורד על צוואר הבוזוקי, עם שם התו בנקודה הזהובה.' },
        { spot: '#mc-start', text: 'התחילו ונגנו את כל התווים. ירוק אומר שזיהינו את התו.' },
      ],
    },
    exercises: {
      idle: 'בחרו תרגיל. צורת האקורד מופיעה על צוואר הבוזוקי, לא על דיאגרמה חסרת סריגים.',
      tour: [
        { spot: '#ex-list', text: 'כאן בוחרים תרגיל מהספרייה.' },
        { spot: '#fb-exercise', text: 'התרגיל מסומן על צוואר הבוזוקי. הנקודה הזהובה נושאת את שם התו.' },
      ],
    },
    explorer: {
      idle: 'בחרו דרומוס וראו איך הוא יושב על הצוואר.',
      tour: [
        { spot: '#screen-explorer .fretboard', text: 'הסולם על צוואר הבוזוקי. לחצו על נקודה כדי לשמוע.' },
      ],
    },
    scalechords: {
      idle: 'האקורדים של הדרומוס מסומנים על הצוואר.',
      tour: [
        { spot: '#screen-scalechords .fretboard', text: 'כל אקורד יושב על אותו צוואר, עם נקודה זהובה ושם התו.' },
      ],
    },
    'mode-positions': {
      idle: 'החליפו פוזיציה וראו את אותו סולם במקום אחר על הצוואר.',
      tour: [
        { spot: '#screen-mode-positions .fretboard', text: 'הפוזיציה מצוירת על צוואר הבוזוקי, עם סריגי מתכת ושם התו.' },
      ],
    },
    composer: {
      idle: 'התווים שכתבתם נדלקים על הצוואר.',
      tour: [
        { spot: '#screen-composer .fretboard', text: 'המנגינה יושבת על אותו צוואר. הנקודה הזהובה היא התו הנוכחי.' },
      ],
    },
    'song-academy': {
      idle: 'הסולם, האקורד והפראזה — כולם על אותו צוואר.',
      tour: [
        { spot: '#screen-song-academy .fretboard', text: 'כאן רואים את הצוואר עם סריגים, מפתחות ושם התו.' },
      ],
    },
    maqam: {
      idle: 'המקאם מוצג על צוואר הבוזוקי.',
      tour: [
        { spot: '#screen-maqam .fretboard', text: 'הצלילים מסומנים על הצוואר. הזהוב הוא העוגן, ולידו שם התו.' },
      ],
    },
    'dromos-learn': {
      idle: 'לומדים את הדרומוס על הצוואר, צעד אחרי צעד.',
      tour: [
        { spot: '#screen-dromos-learn .fretboard, #screen-dromos-learn .tl-neck-scroll', text: 'הדרומוס על צוואר אמיתי: סריגי מתכת, ארבעה קורסים, ונקודה עם שם התו.' },
      ],
    },
    neck: {
      idle: 'לחצו נגן ועקבו אחרי הנקודה הזהובה על הצוואר.',
      tour: [],
    },
  };

  const state = {
    screen: 'home',
    collapsed: true,
    tourStep: -1,
    steps: [],
    text: '',
    look: null,
    spot: null,
    following: false,
    idle: true,
    external: false,
    userPinned: false,
    coachOnLeft: null,
    seen: {},
  };

  function storageGet() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); } catch (e) { return {}; }
  }
  function storageSet() {
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(state.seen)); } catch (e) { /* פרטי */ }
  }

  function reducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function mascotSvg() {
    return '<svg class="neck-face" viewBox="0 0 80 80" aria-hidden="true">'
      + '<defs><radialGradient id="neckOrb" cx="36%" cy="32%">'
      + '<stop offset="0" stop-color="#fff6d2"/><stop offset="0.42" stop-color="#e8c56b"/><stop offset="1" stop-color="#8a4e16"/>'
      + '</radialGradient></defs>'
      + '<circle cx="40" cy="40" r="30" fill="url(#neckOrb)" stroke="#fff1c9" stroke-width="2"/>'
      + '<ellipse cx="31" cy="28" rx="10" ry="6" fill="#fff8e4" opacity="0.55"/>'
      + '<ellipse cx="29" cy="40" rx="9.2" ry="10.4" fill="#fff"/>'
      + '<ellipse cx="51" cy="40" rx="9.2" ry="10.4" fill="#fff"/>'
      + '<g class="neck-pupil-g"><circle cx="29" cy="41" r="4.6" fill="#3a2414"/><circle cx="27.2" cy="39" r="1.5" fill="#fff"/></g>'
      + '<g class="neck-pupil-g"><circle cx="51" cy="41" r="4.6" fill="#3a2414"/><circle cx="49.2" cy="39" r="1.5" fill="#fff"/></g>'
      + '<ellipse class="neck-lid" cx="29" cy="40" rx="10" ry="11.2" fill="#e4bc62"/>'
      + '<ellipse class="neck-lid" cx="51" cy="40" rx="10" ry="11.2" fill="#e4bc62"/>'
      + '<path d="M32 54 Q40 60 48 54" fill="none" stroke="#6a3d16" stroke-width="1.8" stroke-linecap="round"/>'
      + '</svg>';
  }

  function mount() {
    if (document.getElementById('app-helper')) return;
    state.seen = storageGet();
    const help = document.createElement('button');
    help.type = 'button';
    help.id = 'app-helper-help';
    help.className = 'app-helper-help';
    help.setAttribute('aria-label', 'עזרה');
    help.textContent = '?';
    const coach = document.createElement('div');
    coach.id = 'app-helper';
    coach.className = 'neck-coach is-collapsed is-idle';
    coach.innerHTML = '<button type="button" class="neck-avatar" id="app-helper-avatar" aria-label="העוזר">' + mascotSvg() + '</button>'
      + '<div class="neck-coach-bubble" id="app-helper-bubble" hidden>'
      + '<p class="neck-coach-who">העוזר</p>'
      + '<p class="neck-coach-text" id="app-helper-text" aria-live="polite"></p>'
      + '<div class="neck-coach-actions" id="app-helper-actions"></div>'
      + '</div>';
    document.body.appendChild(help);
    document.body.appendChild(coach);
    help.addEventListener('click', onHelp);
    coach.addEventListener('click', onCoachClick);
    window.addEventListener('resize', () => place());
    document.addEventListener('scroll', () => place(), true);
  }

  function onHelp() {
    if (screenIs('neck') && typeof NeckPlay !== 'undefined' && NeckPlay.startTour) {
      NeckPlay.startTour();
      return;
    }
    beginTour(state.screen, true);
  }

  function onCoachClick(e) {
    const tourBtn = e.target.closest('[data-tour]');
    if (tourBtn) {
      const action = tourBtn.dataset.tour;
      if (state.external || screenIs('neck')) {
        document.dispatchEvent(new CustomEvent('app-helper-action', { detail: action }));
        return;
      }
      if (action === 'next') nextStep();
      else if (action === 'skip' || action === 'hide') finishTour(action === 'hide');
      return;
    }
    if (e.target.closest('#app-helper-avatar')) {
      if (state.external || (screenIs('neck') && state.tourStep < 0)) {
        document.dispatchEvent(new CustomEvent('app-helper-action', { detail: 'toggle' }));
        if (screenIs('neck')) return;
      }
      if (state.tourStep >= 0) return;
      state.collapsed = !state.collapsed;
      state.userPinned = !state.collapsed;
      state.idle = state.collapsed;
      render();
    }
  }

  function screenIs(id) {
    return typeof isScreenActive === 'function' ? isScreenActive(id) : state.screen === id;
  }

  function specFor(id) {
    if (TIPS[id]) return TIPS[id];
    const head = '#screen-' + id + ' h1';
    const board = '#screen-' + id + ' .fretboard, #screen-' + id + ' .bn-neck, #screen-' + id + ' .chord-diagrams';
    return {
      idle: 'אפשר לשאול אותי כאן. לחצו על העיניים או על סימן השאלה.',
      tour: [
        { spot: head, text: 'ברוכים הבאים. אעבור איתכם על מה שחשוב במסך הזה.' },
        { spot: board, text: 'איפה שיש צוואר — זה אותו בוזוקי: סריגי מתכת, ארבעה קורסים, ונקודה זהובה עם שם התו.' },
      ],
    };
  }

  function liveSteps(id) {
    const spec = specFor(id);
    return (spec.tour || []).filter((step) => {
      if (!step.spot) return false;
      return !!document.querySelector(step.spot);
    });
  }

  function enter(screenId) {
    if (!screenId) return;
    state.screen = screenId;
    spotlight(null);
    if (screenId === 'neck') {
      state.external = true;
      return;
    }
    state.external = false;
    state.following = false;
    if (!state.seen[screenId]) beginTour(screenId, false);
    else showIdle(screenId);
  }

  function showIdle(screenId) {
    const spec = specFor(screenId);
    state.tourStep = -1;
    state.steps = [];
    state.collapsed = true;
    state.idle = true;
    state.userPinned = false;
    state.text = spec.idle;
    state.look = null;
    state.spot = null;
    render();
  }

  function beginTour(screenId, force) {
    const steps = liveSteps(screenId);
    state.screen = screenId;
    state.external = false;
    state.following = false;
    if (!steps.length) {
      showIdle(screenId);
      state.collapsed = false;
      state.idle = false;
      render();
      return;
    }
    state.steps = steps;
    state.tourStep = 0;
    state.collapsed = false;
    state.idle = false;
    state.userPinned = true;
    state.coachOnLeft = null;
    if (force) state.seen[screenId] = false;
    showStep();
  }

  function showStep() {
    const step = state.steps[state.tourStep];
    if (!step) { finishTour(false); return; }
    state.text = step.text;
    state.look = step.look || step.spot;
    state.spot = step.spot;
    state.collapsed = false;
    render();
    const el = document.querySelector(step.spot);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', inline: 'nearest' });
  }

  function nextStep() {
    if (state.tourStep >= state.steps.length - 1) finishTour(false);
    else { state.tourStep += 1; showStep(); }
  }

  function finishTour() {
    if (state.screen) {
      state.seen[state.screen] = true;
      storageSet();
    }
    spotlight(null);
    showIdle(state.screen);
  }

  function show(opts) {
    opts = opts || {};
    state.external = true;
    state.text = opts.text || '';
    state.look = opts.look || null;
    state.spot = opts.spot || null;
    state.collapsed = !!opts.collapsed;
    state.following = !!opts.following;
    state.idle = !!opts.idle;
    state.tourUi = opts.tour || null;
    if (opts.tour) state.tourStep = opts.tour.index;
    else if (opts.collapsed) state.tourStep = -1;
    render();
  }

  function spotlight(sel) {
    document.querySelectorAll('.neck-spotlight').forEach((node) => node.classList.remove('neck-spotlight'));
    if (!sel) return null;
    const node = document.querySelector(sel);
    if (node) node.classList.add('neck-spotlight');
    return node;
  }

  function render() {
    const coach = document.getElementById('app-helper');
    const bubble = document.getElementById('app-helper-bubble');
    const text = document.getElementById('app-helper-text');
    const actions = document.getElementById('app-helper-actions');
    if (!coach) return;
    const inTour = state.external ? !!(state.tourUi) : state.tourStep >= 0;
    const collapsed = state.collapsed && !inTour;
    coach.classList.toggle('is-collapsed', collapsed);
    coach.classList.toggle('is-following', !!state.following && collapsed);
    coach.classList.toggle('is-idle', !!state.idle && collapsed && !state.following);
    bubble.hidden = collapsed;
    if (!collapsed) {
      text.textContent = state.text || '';
      if (state.external && state.tourUi) {
        const last = state.tourUi.index >= state.tourUi.total - 1;
        actions.innerHTML = '<span class="neck-coach-step">' + (state.tourUi.index + 1) + ' מתוך ' + state.tourUi.total + '</span>'
          + '<button type="button" class="neck-btn tiny" data-tour="skip">דלג</button>'
          + '<button type="button" class="neck-btn tiny primary" data-tour="next">' + (last ? 'יאללה, ננגן' : 'הבא') + '</button>';
        spotlight(state.spot);
      } else if (!state.external && state.tourStep >= 0) {
        const last = state.tourStep >= state.steps.length - 1;
        actions.innerHTML = '<span class="neck-coach-step">' + (state.tourStep + 1) + ' מתוך ' + state.steps.length + '</span>'
          + '<button type="button" class="neck-btn tiny" data-tour="skip">דלג</button>'
          + '<button type="button" class="neck-btn tiny primary" data-tour="next">' + (last ? 'הבנתי' : 'הבא') + '</button>';
        spotlight(state.spot);
      } else {
        spotlight(null);
        actions.innerHTML = '<button type="button" class="neck-btn tiny" data-tour="hide">הסתר</button>';
      }
    } else spotlight(null);
    place({ glide: true });
  }

  function targetEl() {
    if (!state.look) return null;
    return document.querySelector(state.look);
  }

  function pointEyes(target) {
    const avatar = document.getElementById('app-helper-avatar');
    const coach = document.getElementById('app-helper');
    if (!avatar) return;
    const pupils = avatar.querySelectorAll('.neck-pupil-g');
    const idle = coach && coach.classList.contains('is-idle');
    if (!target || idle || !target.getBoundingClientRect().width) {
      pupils.forEach((g) => g.removeAttribute('transform'));
      return;
    }
    const a = avatar.getBoundingClientRect();
    const t = target.getBoundingClientRect();
    if (!a.width || !t.width) return;
    const dx = (t.left + t.width / 2) - (a.left + a.width / 2);
    const dy = (t.top + t.height / 2) - (a.top + a.height / 2);
    const len = Math.hypot(dx, dy) || 1;
    const mag = 3.4;
    const tr = 'translate(' + (dx / len * mag).toFixed(2) + ' ' + (dy / len * mag).toFixed(2) + ')';
    pupils.forEach((g) => g.setAttribute('transform', tr));
  }

  function glideEyes() {
    if (reducedMotion()) return;
    const until = performance.now() + 820;
    const tick = () => {
      pointEyes(targetEl());
      if (performance.now() < until) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function cssPx(name) {
    const n = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name));
    return Number.isFinite(n) ? n : 0;
  }

  function place(opts) {
    const coach = document.getElementById('app-helper');
    if (!coach) return;
    const inTour = state.external ? !!state.tourUi : state.tourStep >= 0;
    const collapsed = state.collapsed && !inTour;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const safeTop = cssPx('--safe-top');
    const safeBottom = cssPx('--safe-bottom');
    const margin = vw < 860 ? 16 : 12;
    const topSafe = (vw < 860 ? 10 : 12) + safeTop;
    const bottomSafe = (vw < 860 ? 108 : 16) + safeBottom;
    const cw = coach.offsetWidth || (collapsed ? 68 : 340);
    const ch = coach.offsetHeight || (collapsed ? 68 : 132);
    const target = targetEl();
    let x = margin;
    let y = vh - ch - bottomSafe;
    let flip = false;
    coach.classList.toggle('is-following', collapsed && !!state.following);

    if (collapsed && state.following && target) {
      const host = document.getElementById('neck-board-host') || target.closest('.fretboard-wrap, .neck-board-host');
      const t = target.getBoundingClientRect();
      const h = host ? host.getBoundingClientRect() : t;
      const orb = 62;
      let cx = t.width ? t.left + t.width / 2 : h.left + 40;
      if (h.width) cx = clamp(cx, h.left + 28, h.right - 28);
      x = cx - orb / 2;
      y = (h.top || 80) - orb - 8;
    } else if (!collapsed && target && target.getBoundingClientRect().width) {
      const t = target.getBoundingClientRect();
      const gap = 12;
      const wide = t.width > Math.min(480, vw * 0.5);
      const spaceLeft = t.left - margin;
      const spaceRight = vw - t.right - margin;
      let onLeft = spaceLeft >= spaceRight;
      if (!wide && state.coachOnLeft === true && spaceLeft >= cw * 0.55) onLeft = true;
      else if (!wide && state.coachOnLeft === false && spaceRight >= cw * 0.55) onLeft = false;
      else if (wide) onLeft = true;
      if (!wide) state.coachOnLeft = onLeft;
      const side = [];
      if (!wide && spaceLeft >= cw + gap) side.push({ x: t.left - cw - gap, y: t.top + t.height / 2 - 30, flip: false, onLeft: true });
      if (!wide && spaceRight >= cw + gap) side.push({ x: t.right + gap, y: t.top + t.height / 2 - 30, flip: true, onLeft: false });
      side.sort((a, b) => (a.onLeft === onLeft ? 0 : 1) - (b.onLeft === onLeft ? 0 : 1));
      const above = { x: clamp(t.left + Math.min(t.width * 0.2, 80), margin, vw - cw - margin), y: t.top - ch - gap, flip: false };
      const below = { x: clamp(t.left, margin, vw - cw - margin), y: t.bottom + gap, flip: false };
      const pick = side[0] || (t.top > ch + topSafe + 24 ? above : below);
      x = pick.x;
      y = pick.y;
      flip = !!pick.flip;
    }
    x = clamp(x, margin, Math.max(margin, vw - cw - margin));
    y = clamp(y, topSafe, Math.max(topSafe, vh - ch - bottomSafe));
    coach.classList.toggle('is-flip', flip && !collapsed);
    coach.style.left = Math.round(x) + 'px';
    coach.style.top = Math.round(y) + 'px';
    pointEyes(collapsed && !state.following ? null : target);
    if (opts && opts.glide) glideEyes();
  }

  function init() {
    mount();
    const active = document.querySelector('.nav-btn.active');
    const screen = active && active.dataset.screen ? active.dataset.screen : 'home';
    if (screen === 'neck') return;
    enter(screen);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { enter, show, place, beginTour, init };
})();
