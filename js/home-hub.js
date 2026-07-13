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
        current.buttons.push(el);
      }
    });
    return groups;
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

    const heading = document.createElement('h2');
    heading.className = 'hub-title';
    heading.textContent = '🧭 כל הכלים';
    host.appendChild(heading);

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
      host.appendChild(section);
    });
  }

  function init() {
    render();
  }

  return { init };
})();
