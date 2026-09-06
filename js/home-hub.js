/* ============================================================
   HomeHub — כרטיסיית "כל הכלים" בעמוד הבית, מקובצת לפי קטגוריה.
   נגזרת בזמן ריצה מהניווט הראשי (.nav-section-label + .nav-btn),
   כך שאין מקור נתונים כפול לתחזק — כל שינוי בניווט משתקף כאן אוטומטית.
   ============================================================ */
'use strict';

const HomeHub = (() => {
  function buildGroups() {
    const nav = document.querySelector('.nav');
    if (!nav) return [];
    const groups = [];
    let current = null;
    Array.from(nav.children).forEach((el) => {
      if (el.classList.contains('nav-section-label')) {
        current = { title: el.textContent.trim(), buttons: [] };
        groups.push(current);
      } else if (el.classList.contains('nav-btn') && current) {
        if (typeof StoreMode !== 'undefined' && !StoreMode.isScreenAllowed(el.dataset.screen)) return;
        if (el.style.display === 'none') return; // מוסתר ע"י StoreMode (ראו app.js) — לא לשכפל לכרטיס
        current.buttons.push(el);
      }
    });
    return groups.filter((g) => g.buttons.length > 0);
  }

  function cardFor(navBtn) {
    const ico = navBtn.querySelector('.nav-ico');
    const clone = navBtn.cloneNode(true);
    const cloneIco = clone.querySelector('.nav-ico');
    if (cloneIco) cloneIco.remove();
    const label = clone.textContent.trim();
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'hub-card';
    const icoSpan = document.createElement('span');
    icoSpan.className = 'hub-card-ico';
    icoSpan.textContent = ico ? ico.textContent : '•';
    const labelSpan = document.createElement('span');
    labelSpan.className = 'hub-card-label';
    labelSpan.textContent = label;
    card.appendChild(icoSpan);
    card.appendChild(labelSpan);
    card.addEventListener('click', () => navBtn.click());
    return card;
  }

  function render() {
    const host = document.getElementById('home-hub');
    if (!host) return;
    const groups = buildGroups();
    if (!groups.length) return;
    host.innerHTML = '';

    const buttons = groups.flatMap(group => group.buttons);
    const find = screen => buttons.find(btn => btn.dataset.screen === screen);
    const hero = document.createElement('div');
    hero.className = 'practice-hero';
    hero.innerHTML = '<div><p class="practice-eyebrow">זמן לבוזוקי שלך</p><h2>קצת תרגול.<br>עוד צעד קדימה.</h2><p class="practice-copy">חימום, סולמות וטכניקה — אימון יומי אחד שמחבר הכול.</p></div><div class="practice-action"><span>כ־15 דקות · בקצב שלך</span></div>';
    const workout = find('daily-workout');
    if (workout) {
      const start = document.createElement('button');
      start.type = 'button';
      start.className = 'practice-start';
      start.textContent = 'מתחילים את האימון ←';
      start.addEventListener('click', () => workout.click());
      hero.querySelector('.practice-action').appendChild(start);
    }
    host.appendChild(hero);

    const quickTitle = document.createElement('h2');
    quickTitle.className = 'hub-title';
    quickTitle.textContent = 'מה מתרגלים היום?';
    host.appendChild(quickTitle);
    const quick = document.createElement('div');
    quick.className = 'practice-shortcuts';
    [['tuner', 'לפני שמתחילים לנגן'], ['dromoi', 'מכירים את הצלילים'],
      ['songs', 'מנגנים משהו שאוהבים'], ['progress', 'רואים את הדרך שעשינו']].forEach(([screen, text]) => {
      const nav = find(screen);
      if (!nav) return;
      const card = cardFor(nav);
      const subtitle = document.createElement('small');
      subtitle.textContent = text;
      card.appendChild(subtitle);
      quick.appendChild(card);
    });
    host.appendChild(quick);

    const catalog = document.createElement('details');
    catalog.className = 'hub-catalog';
    const summary = document.createElement('summary');
    summary.textContent = 'כל הכלים והמסלולים';
    catalog.appendChild(summary);
    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'hub-search';
    search.placeholder = 'חיפוש כלי, תרגיל או מסלול…';
    search.setAttribute('aria-label', 'חיפוש בכל הכלים והמסלולים');
    catalog.appendChild(search);
    const empty = document.createElement('p');
    empty.className = 'hub-empty';
    empty.textContent = 'לא מצאנו כלי בשם הזה. נסו מילה אחרת.';
    empty.hidden = true;
    catalog.appendChild(empty);
    host.appendChild(catalog);

    groups.forEach((group) => {
      const section = document.createElement('div');
      section.className = 'hub-group';
      const title = document.createElement('h3');
      title.className = 'hub-group-title';
      title.textContent = group.title;
      section.appendChild(title);
      const grid = document.createElement('div');
      grid.className = 'hub-grid';
      group.buttons.forEach((btn) => grid.appendChild(cardFor(btn)));
      section.appendChild(grid);
      catalog.appendChild(section);
    });
    search.addEventListener('input', () => {
      const query = search.value.trim().toLocaleLowerCase();
      let count = 0;
      catalog.querySelectorAll('.hub-group').forEach(group => {
        let visible = 0;
        group.querySelectorAll('.hub-card').forEach(card => {
          const match = card.textContent.toLocaleLowerCase().includes(query);
          card.hidden = !match;
          if (match) visible++;
        });
        group.hidden = visible === 0;
        count += visible;
      });
      empty.hidden = count !== 0;
    });
  }

  function init() {
    render();
  }

  return { init };
})();
