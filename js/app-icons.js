/* אייקונים אחידים — קו דק ומילוי רך. לא נוגעים בצוואר, בזוהר הנקודה או בעוזר. */
'use strict';

const AppIcons = (() => {
  const SVG = 'http://www.w3.org/2000/svg';

  function g(inner) {
    return '<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + inner + '</g>';
  }
  function soft(d) {
    return '<path d="' + d + '" fill="currentColor" stroke="none" opacity="0.16"/>';
  }
  function line(d) {
    return '<path d="' + d + '"/>';
  }

  const PATHS = {
    home: g(soft('M4 11.2 12 4.5l8 6.7V20a1 1 0 0 1-1 1h-5.2v-5.2H10.2V21H5a1 1 0 0 1-1-1z') + line('M4 11.2 12 4.5l8 6.7V20a1 1 0 0 1-1 1h-5.2v-5.2H10.2V21H5a1 1 0 0 1-1-1z')),
    play: g(soft('M8 5.5v13l11-6.5z') + line('M8 5.5v13l11-6.5z')),
    stop: g(soft('M6 6h12v12H6z') + line('M6 6h12v12H6z')),
    speaker: g(soft('M4 10h3.2L12 6.2v11.6L7.2 14H4z') + line('M4 10h3.2L12 6.2v11.6L7.2 14H4zM15.2 9.2a3.2 3.2 0 0 1 0 5.6M17.4 7a6 6 0 0 1 0 10')),
    mic: g(soft('M12 3.5a3 3 0 0 1 3 3V12a3 3 0 0 1-6 0V6.5a3 3 0 0 1 3-3z') + line('M12 3.5a3 3 0 0 1 3 3V12a3 3 0 0 1-6 0V6.5a3 3 0 0 1 3-3zM6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.2')),
    note: g(soft('M9 16.8a2.4 2.4 0 1 1-2.2-2.4') + line('M9 17.2V6.2l9-2v9.2M9 17.2a2.4 2.4 0 1 1-2.2-2.4M18 13.4a2.4 2.4 0 1 1-2.2-2.4')),
    download: g(soft('M5 15.5V19h14v-3.5') + line('M12 4v10M8.2 10.2 12 14l3.8-3.8M5 19h14')),
    neck: g(soft('M4 8h16v8H4z') + line('M4 8h16v8H4zM8 8v8M12 8v8M16 8v8M7 12h.01M11 12h.01')),
    sliders: g(line('M4 8h16M4 16h16M8 8v0M8 5.5v5M16 16v0M16 13.5v5')),
    chart: g(soft('M5 19V11h3.2v8zM10.4 19V7h3.2v12zM15.8 19v-6H19v6z') + line('M5 19V11h3.2v8M10.4 19V7h3.2v12M15.8 19v-6H19v6')),
    listen: g(line('M4 12h2.2l1.6-3.2 2.4 6.4 2-3.2H20')),
    dromoi: g(line('M4 17c2.2-6 4-6 6.2 0s4 6 6.2 0 3.2-6 3.6-6') + '<circle cx="6" cy="15" r="1.3" fill="currentColor" stroke="none" opacity="0.35"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="18" cy="9" r="1.3" fill="currentColor" stroke="none" opacity="0.35"/>'),
    hand: g(line('M8 11V6.5M12 11V5M16 11V7M8 11v6.2a3 3 0 0 0 3 3h2.2a3 3 0 0 0 3-2.4L17.2 13')),
    cap: g(soft('M3.5 10 12 6l8.5 4L12 14z') + line('M3.5 10 12 6l8.5 4L12 14zM7 12.2V16c1.6 1.4 8.4 1.4 10 0v-3.8')),
    star: g(soft('m12 3.8 2.1 4.4 4.8.6-3.5 3.3.9 4.7L12 14.6 7.7 16.8l.9-4.7L5.1 8.8l4.8-.6z') + line('m12 3.8 2.1 4.4 4.8.6-3.5 3.3.9 4.7L12 14.6 7.7 16.8l.9-4.7L5.1 8.8l4.8-.6z')),
    book: g(soft('M5 5.5h6.2A2.8 2.8 0 0 1 14 8.3V19H7.2A2.2 2.2 0 0 0 5 16.8z') + line('M5 5.5h6.2A2.8 2.8 0 0 1 14 8.3V19M5 5.5A2.2 2.2 0 0 0 7.2 7.7H14M14 8.3A2.8 2.8 0 0 1 16.8 5.5H19V17h-5')),
    target: g(line('M12 12h.01M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zM12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z')),
    cards: g(line('M7 6.5h11.5v12H7zM5.5 8.5v10.2A1.3 1.3 0 0 0 6.8 20') + soft('M7 6.5h11.5v12H7z')),
    print: g(line('M7 9V4.5h10V9M7 16.5H5.5A1.5 1.5 0 0 1 4 15v-4a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 11v4a1.5 1.5 0 0 1-1.5 1.5H17') + soft('M7 14h10v5.5H7z') + line('M7 14h10v5.5H7z')),
    disc: g(soft('M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15z') + line('M12 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15zM12 10.2a1.8 1.8 0 1 1 0 3.6 1.8 1.8 0 0 1 0-3.6z')),
    compass: g(soft('M12 4.2a7.8 7.8 0 1 1 0 15.6 7.8 7.8 0 0 1 0-15.6z') + line('M12 4.2a7.8 7.8 0 1 1 0 15.6 7.8 7.8 0 0 1 0-15.6zM14.6 9.4 13 13l-3.6 1.6L11 11z')),
    spark: g(line('M12 3.5v3.2M12 17.3V20.5M3.5 12h3.2M17.3 12h3.2M6.2 6.2l2.2 2.2M15.6 15.6l2.2 2.2M17.8 6.2l-2.2 2.2M8.4 15.6l-2.2 2.2') + soft('M12 9.2 13.1 12 15.8 12.8 13.1 13.6 12 16.4 10.9 13.6 8.2 12.8 10.9 12z') + line('M12 9.2 13.1 12 15.8 12.8 13.1 13.6 12 16.4 10.9 13.6 8.2 12.8 10.9 12z')),
    calendar: g(soft('M5 7.5h14V19H5z') + line('M5 7.5h14V19H5zM8 5.2V9M16 5.2V9M5 11h14')),
    books: g(line('M5 6.2h5.2v12H6.2A1.2 1.2 0 0 1 5 17zM13.8 6.2H19v10.8a1.2 1.2 0 0 1-1.2 1.2h-4z')),
    staff: g(line('M5 8h14M5 12h14M5 16h14M15 6.5v11')),
    drum: g(soft('M5 10.5h14v2.2c0 3-3.1 5-7 5s-7-2-7-5z') + line('M5 10.5h14M5 10.5v2.2c0 3 3.1 5 7 5s7-2 7-5v-2.2M12 6.2v4')),
    timer: g(line('M12 13.2V9.2M9.2 4.5h5.6M12 6.2a6.6 6.6 0 1 1 0 13.2 6.6 6.6 0 0 1 0-13.2z')),
    game: g(soft('M7 9.5h10a4 4 0 0 1 3.8 5.1l-.7 2.4a2 2 0 0 1-3.2.9L15 16H9l-1.9 1.9a2 2 0 0 1-3.2-.9l-.7-2.4A4 4 0 0 1 7 9.5z') + line('M8.2 13h2.2M9.3 11.9v2.2M15.6 12.4h.01M17.2 14h.01')),
    chord: g(line('M6 6.5h12v11H6zM9 6.5v11M12 6.5v11M15 6.5v11') + '<circle cx="9" cy="12" r="1.15" fill="currentColor" stroke="none"/><circle cx="15" cy="9.5" r="1.15" fill="currentColor" stroke="none"/>'),
    tuner: g(line('M8 19.5 15.2 5.2M9.2 14.2h4.2M12 4.2v2.2') + soft('M14.2 4.2h3.2v3.2h-3.2z') + line('M14.2 4.2h3.2v3.2h-3.2z')),
    bolt: g(soft('M13 3.5 6.5 13H12l-1 7.5 6.5-9.5H12z') + line('M13 3.5 6.5 13H12l-1 7.5 6.5-9.5H12z')),
    search: g(line('M11 6.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6zM15 15l3.2 3.2')),
    intervals: g(line('M7 17V7.2l0 0M7 17a2 2 0 1 1-1.8-2M16 15.5V5.5M16 15.5a2 2 0 1 1-1.8-2')),
    headphones: g(soft('M6.5 13.5h2.2V19H7a2 2 0 0 1-2-2v-2.2A1.3 1.3 0 0 1 6.5 13.5z') + line('M5.2 13.5v-.2a6.8 6.8 0 0 1 13.6 0v.2M6.5 13.5H8.7V19H7a2 2 0 0 1-2-2v-2.2A1.3 1.3 0 0 1 6.5 13.5zM17.5 13.5H15.3V19H17a2 2 0 0 0 2-2v-2.2a1.3 1.3 0 0 0-1.5-1.3z')),
    keys: g(soft('M4.5 6.5h15V18h-15z') + line('M4.5 6.5h15V18h-15zM8.2 6.5V12M12 6.5V12M15.8 6.5V12')),
    people: g(line('M8 11.2a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4zM4.8 18.2c.4-2.2 1.8-3.2 3.2-3.2s2.8 1 3.2 3.2M16 10.8a2 2 0 1 1 0-4 2 2 0 0 1 0 4zM13.6 18c.3-1.8 1.4-2.8 2.6-2.8 1.1 0 2.2.9 2.6 2.8')),
    steps: g(line('M5 18h4v-3.2h3.4V11H16V7.8H19')),
    quill: g(line('M5 19c6-1 8.5-4 11.5-9.5C18.2 6 16.5 4.5 14.8 4.8 10 8 7 12.5 5 19zM13 11.2l-2.2 2.2')),
    waves: g(line('M4 9c1.4 1.2 2.2 1.2 3.6 0S9.8 7.8 11.2 9s2.2 1.2 3.6 0 2.2-1.2 3.6 0 2.2 1.2 1.6 1.2M4 15c1.4 1.2 2.2 1.2 3.6 0s2.2-1.2 3.6 0 2.2 1.2 3.6 0 2.2-1.2 3.6 0')),
    horn: g(line('M7 10.5h4.2l6-3.2v9.4l-6-3.2H7zM7 10.5v3') + soft('M7 10.5h4.2l6-3.2v9.4l-6-3.2H7z')),
    dice: g(soft('M5.5 5.5h13v13h-13z') + line('M5.5 5.5h13v13h-13zM9 9h.01M15 15h.01M15 9h.01M9 15h.01')),
    record: g(line('M12 4.8a7.2 7.2 0 1 1 0 14.4 7.2 7.2 0 0 1 0-14.4z') + '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" opacity="0.85"/>'),
    openbook: g(line('M12 7.2C10.2 5.8 7.6 5.4 5 6v11.2c2.6-.6 5.2-.2 7 1.2 1.8-1.4 4.4-1.8 7-1.2V6c-2.6-.6-5.2-.2-7 1.2z')),
    arch: g(line('M5 19V11.2A7 7 0 0 1 12 4.2a7 7 0 0 1 7 7V19M9 19v-4.2a3 3 0 0 1 6 0V19')),
    scroll: g(soft('M7 5.5h10.2A1.8 1.8 0 0 1 19 7.3V17H8.2') + line('M7 5.5h10.2A1.8 1.8 0 0 1 19 7.3V17H8.2M7 5.5A1.8 1.8 0 0 0 5.2 7.3V18.2A1.8 1.8 0 0 0 7 20h10.2M9.2 9.2h6.2M9.2 12.5h6.2')),
    help: g(line('M12 4.2a7.8 7.8 0 1 1 0 15.6 7.8 7.8 0 0 1 0-15.6zM9.6 9.4a2.4 2.4 0 1 1 3.2 2.3c-.7.3-1.2.9-1.2 1.6V14') + '<circle cx="12" cy="17" r="0.8" fill="currentColor" stroke="none"/>'),
    glow: g(line('M12 3.2v2.2M12 18.6v2.2M3.2 12h2.2M18.6 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6') + soft('M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z') + line('M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6z')),
    map: g(line('M9 5.2 4.5 7v12L9 17.2l6 2.2 4.5-1.8v-12L15 7.2zM9 5.2v12M15 7.2v12')),
    dot: g('<circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" opacity="0.85"/>'),
  };

  const SCREEN = {
    home: 'home',
    learn: 'play',
    'learn-lib': 'download',
    neck: 'neck',
    'vocal-melody': 'mic',
    'bouzouki-studio': 'sliders',
    progress: 'chart',
    songs: 'note',
    listen: 'listen',
    dromoi: 'dromoi',
    penia: 'hand',
    'penia-learn': 'cap',
    'dromos-learn': 'star',
    'theory-lab': 'book',
    'arp-studio': 'target',
    'reference-cards': 'cards',
    worksheets: 'print',
    'song-teacher': 'cap',
    'song-academy': 'disc',
    'modus-path': 'compass',
    adaptive: 'spark',
    'daily-workout': 'calendar',
    'practice-lib': 'books',
    exercises: 'staff',
    rhythms: 'drum',
    practice: 'timer',
    course: 'cap',
    game: 'game',
    'master-modes': 'target',
    'master-chords': 'chord',
    tuner: 'tuner',
    skills: 'bolt',
    'song-learn': 'search',
    intervals: 'intervals',
    modequiz: 'headphones',
    explorer: 'search',
    scalechords: 'keys',
    'duet-voices': 'people',
    'mode-positions': 'steps',
    composer: 'quill',
    backing: 'waves',
    jam: 'horn',
    exgen: 'dice',
    melodygen: 'spark',
    recorder: 'record',
    sightread: 'openbook',
    drums: 'drum',
    analyzer: 'chart',
    maqam: 'arch',
    glossary: 'scroll',
  };

  const LEAD = [
    [/^(?:▶️|▶)\s*/, 'play'],
    [/^(?:⏹️|⏹|■)\s*/, 'stop'],
    [/^🔊\s*/, 'speaker'],
    [/^🎤\s*/, 'mic'],
    [/^🎵\s*/, 'note'],
  ];

  function el(name) {
    const markup = PATHS[name] || PATHS[SCREEN[name]] || PATHS.dot;
    const holder = document.createElement('div');
    holder.innerHTML = '<svg viewBox="0 0 24 24" class="ui-ico" aria-hidden="true" focusable="false">' + markup + '</svg>';
    return holder.firstChild;
  }

  function mountNav() {
    document.querySelectorAll('.nav-btn[data-screen]').forEach((btn) => {
      const slot = btn.querySelector('.nav-ico');
      if (!slot || slot.querySelector('svg')) return;
      slot.textContent = '';
      slot.appendChild(el(btn.dataset.screen));
      if (btn.querySelector('.nav-label')) return;
      const text = [...btn.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
      [...btn.childNodes].forEach((n) => { if (n.nodeType === 3) n.remove(); });
      if (!text) return;
      const lab = document.createElement('span');
      lab.className = 'nav-label';
      lab.textContent = text;
      btn.appendChild(lab);
    });
  }

  function mountHeads() {
    document.querySelectorAll('section.screen').forEach((sec) => {
      const head = sec.querySelector('.screen-head');
      if (!head || head.querySelector('.screen-ico')) return;
      const id = (sec.id || '').replace(/^screen-/, '');
      const h1 = head.querySelector('h1');
      if (!h1 || !SCREEN[id]) return;
      const row = document.createElement('div');
      row.className = 'screen-title-row';
      const slot = document.createElement('span');
      slot.className = 'screen-ico';
      slot.setAttribute('aria-hidden', 'true');
      slot.appendChild(el(id));
      h1.before(row);
      row.append(slot, h1);
    });
  }

  let busy = false;
  function upgradeButton(btn) {
    if (busy || !btn || !btn.classList) return;
    if (btn.classList.contains('nav-btn') || btn.classList.contains('hub-card') || btn.id === 'bn-glow-toggle' || btn.id === 'app-helper-help') return;
    if (![...btn.childNodes].every((n) => n.nodeType === 3)) return;
    const raw = btn.textContent.replace(/^\s+/, '');
    const hit = LEAD.find(([re]) => re.test(raw));
    if (!hit) return;
    const rest = raw.replace(hit[0], '').trim();
    busy = true;
    btn.replaceChildren(el(hit[1]), document.createTextNode(rest ? ' ' + rest : ''));
    busy = false;
  }

  function scan(root) {
    (root || document).querySelectorAll('button').forEach(upgradeButton);
  }

  function decorateChrome() {
    const help = document.getElementById('app-helper-help');
    if (help && !help.querySelector('svg')) {
      help.replaceChildren(el('help'));
    }
    const glow = document.getElementById('bn-glow-toggle');
    if (glow && !glow.querySelector('svg')) {
      const label = (glow.textContent || 'זוהר').trim() || 'זוהר';
      glow.replaceChildren(el('glow'), document.createTextNode(' ' + label));
    }
  }

  function watch() {
    if (!document.body) return;
    const obs = new MutationObserver((records) => {
      records.forEach((rec) => {
        if (rec.type !== 'childList') return;
        rec.addedNodes.forEach((node) => {
          if (node.nodeType === 3 && rec.target && rec.target.matches && rec.target.matches('button')) {
            upgradeButton(rec.target);
          } else if (node.nodeType === 1) {
            if (node.matches && node.matches('button')) upgradeButton(node);
            if (node.querySelectorAll) node.querySelectorAll('button').forEach(upgradeButton);
          }
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  mountNav();
  let booted = false;
  function boot() {
    mountNav();
    mountHeads();
    decorateChrome();
    scan(document);
    if (booted) return;
    booted = true;
    watch();
  }
  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();

  return { el, mountNav, scan };
})();
