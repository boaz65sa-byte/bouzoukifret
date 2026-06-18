/* ============================================================
   בוזוקי אקדמי — מסלולי לימוד
   PeniaLearn, DromosLearn
   משלב נתונים מ-PENIA_CURRICULUM, DROMOS_CURRICULUM (data.js)
   ומ-EDUCATION_CONTENT (education-content.js)
   ============================================================ */
'use strict';

/* ============================================================
   PeniaLearn — מסלול לימוד פנייה (8 שלבים)
   ============================================================ */
const PeniaLearn = (() => {
  const STORE = 'penia-curriculum-progress-v1';

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; }
  }
  function saveProgress(p) { localStorage.setItem(STORE, JSON.stringify(p)); }

  function init() {
    const el = document.querySelector('#penia-learn-app');
    if (!el) return;
    render(el);
  }

  function render(el) {
    const progress = loadProgress();
    el.innerHTML = '';

    // כותרת + סיכום התקדמות
    const done = PENIA_CURRICULUM.filter(s => progress[s.id]).length;
    const total = PENIA_CURRICULUM.length;
    const pct = Math.round(done / total * 100);

    // מדריך יד ימין מ-EDUCATION_CONTENT
    const edu = (typeof EDUCATION_CONTENT !== 'undefined') ? EDUCATION_CONTENT.peniaCurriculum : null;

    if (edu) {
      const guide = document.createElement('div');
      guide.className = 'card';
      guide.innerHTML = `
        <h2 style="margin:0 0 14px">🤚 ${edu.rightHandGuide.title}</h2>
        <p style="color:var(--text-dim);margin-bottom:16px;font-size:14px">${edu.intro.he}</p>
        <div class="rh-guide-grid" id="rh-guide-grid"></div>`;
      const grid = guide.querySelector('#rh-guide-grid');
      edu.rightHandGuide.sections.forEach(sec => {
        const card = document.createElement('div');
        card.className = 'rh-section-card';
        card.innerHTML = `
          <h3 class="rh-sec-title">${sec.title}</h3>
          <ul class="rh-sec-points">${sec.points.map(p => `<li>${p}</li>`).join('')}</ul>`;
        grid.appendChild(card);
      });
      el.appendChild(guide);
    }

    // שורת התקדמות
    const header = document.createElement('div');
    header.className = 'card';
    header.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="margin:0">🎯 תרגילים: ${done} / ${total} שלבים הושלמו</h2>
          <p style="margin:6px 0 0;color:var(--muted)">סמנו כל שלב כ"הושלם" אחרי שתרגלתם</p>
        </div>
        <div style="text-align:center;">
          <div style="font-size:2.2rem;font-weight:900;color:var(--gold)">${pct}%</div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        </div>
      </div>`;
    el.appendChild(header);

    // רשת שלבים — מאחד PENIA_CURRICULUM עם EDUCATION_CONTENT
    const grid = document.createElement('div');
    grid.className = 'curriculum-grid';
    el.appendChild(grid);

    PENIA_CURRICULUM.forEach((stage, stageIdx) => {
      const isDone = !!progress[stage.id];

      // מצא תוכן מתאים מ-EDUCATION_CONTENT
      const eduLevel = edu ? edu.levels[stageIdx] : null;

      const card = document.createElement('div');
      card.className = 'curriculum-card' + (isDone ? ' done' : '');

      const extraExercises = eduLevel ? eduLevel.exercises.map(ex =>
        `<li><b>${ex.name}</b> (${ex.bpm} BPM) — ${ex.desc}${ex.focus ? `<br><span class="ex-focus">🎯 ${ex.focus}</span>` : ''}</li>`
      ).join('') : '';

      card.innerHTML = `
        <div class="cc-head">
          <span class="cc-icon">${stage.icon}</span>
          <div class="cc-meta">
            <div class="cc-level">שלב ${stage.level}</div>
            <h3 class="cc-title">${stage.title}</h3>
            ${stage.bpmRange[0] ? `<div class="cc-bpm">${stage.bpmRange[0]}–${stage.bpmRange[1]} BPM</div>` : ''}
          </div>
          <div class="cc-check ${isDone ? 'checked' : ''}" data-id="${stage.id}">✓</div>
        </div>
        <div class="cc-focus"><b>מיקוד:</b> ${stage.focus}</div>
        <div class="cc-body">
          <div class="cc-theory"><b>תיאוריה:</b> ${eduLevel ? eduLevel.theory : stage.theory}</div>
          <div class="cc-exercises-title">תרגילים:</div>
          <ol class="cc-exercises">
            ${stage.exercises.map(e => `<li>${e}</li>`).join('')}
            ${extraExercises}
          </ol>
          <div class="cc-tip">💡 <b>טיפ:</b> ${stage.tips}</div>
          ${stage.patternId ? `<button class="btn small cc-go" data-pattern="${stage.patternId}">▶ פתח מאמן פנייה: ${stage.title}</button>` : ''}
        </div>
        <button class="cc-expand-btn">הצג פרטים ▾</button>`;

      // toggle expand
      const expandBtn = card.querySelector('.cc-expand-btn');
      const body = card.querySelector('.cc-body');
      body.style.display = 'none';
      expandBtn.addEventListener('click', () => {
        const open = body.style.display !== 'none';
        body.style.display = open ? 'none' : '';
        expandBtn.textContent = open ? 'הצג פרטים ▾' : 'הסתר ▲';
      });

      // mark done
      card.querySelector('.cc-check').addEventListener('click', (e) => {
        e.stopPropagation();
        const p = loadProgress();
        p[stage.id] = !p[stage.id];
        saveProgress(p);
        render(el);
      });

      // go to penia trainer
      const goBtn = card.querySelector('.cc-go');
      if (goBtn) {
        goBtn.addEventListener('click', () => {
          const idx = PENIA_PATTERNS.findIndex(p => p.id === goBtn.dataset.pattern);
          if (idx >= 0) {
            document.querySelector('[data-screen="penia"]').click();
            setTimeout(() => {
              const sel = document.querySelector('#penia-select');
              if (sel) { sel.value = idx; sel.dispatchEvent(new Event('change')); }
            }, 100);
          }
        });
      }

      grid.appendChild(card);
    });

    // כפתור איפוס
    const resetWrap = document.createElement('div');
    resetWrap.style.cssText = 'text-align:center;margin-top:16px;';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn';
    resetBtn.textContent = 'איפוס התקדמות';
    resetBtn.addEventListener('click', () => {
      if (confirm('לאפס את כל ההתקדמות?')) { saveProgress({}); render(el); }
    });
    resetWrap.appendChild(resetBtn);
    el.appendChild(resetWrap);
  }

  function stop() {}
  return { init, stop };
})();

/* ============================================================
   DromosLearn — מסלול לימוד מודוסים
   ============================================================ */
const DromosLearn = (() => {
  const STORE = 'dromos-curriculum-progress-v1';

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; }
  }
  function saveProgress(p) { localStorage.setItem(STORE, JSON.stringify(p)); }

  function init() {
    const el = document.querySelector('#dromos-learn-app');
    if (!el) return;
    render(el);
  }

  function render(el) {
    const progress = loadProgress();
    el.innerHTML = '';

    const edu = (typeof EDUCATION_CONTENT !== 'undefined') ? EDUCATION_CONTENT.modalCurriculum : null;

    // כותרת
    if (edu) {
      const intro = document.createElement('div');
      intro.className = 'card';
      intro.innerHTML = `<p style="font-size:15px;line-height:1.7">${edu.intro.he}</p>`;
      el.appendChild(intro);
    }

    // סיכום התקדמות
    const totalStages = DROMOS_CURRICULUM.reduce((s, d) => s + d.stages.length, 0);
    const doneStages = DROMOS_CURRICULUM.reduce((s, d) =>
      s + d.stages.filter((st, i) => progress[d.id + '-' + i]).length, 0);
    const pct = Math.round(doneStages / totalStages * 100);

    const summary = document.createElement('div');
    summary.className = 'card';
    summary.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
        <div>
          <h2 style="margin:0">התקדמות: ${doneStages} / ${totalStages} שלבים</h2>
          <p style="margin:6px 0 0;color:var(--muted)">לחצו על כל שלב לסמן כהושלם</p>
        </div>
        <div style="text-align:center;">
          <div style="font-size:2.2rem;font-weight:900;color:var(--gold)">${pct}%</div>
          <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        </div>
      </div>`;
    el.appendChild(summary);

    DROMOS_CURRICULUM.forEach((dc, dromosIdx) => {
      const dromos = (typeof DROMOI !== 'undefined') ? DROMOI.find(d => d.id === dc.dromosId) : null;
      const stagesDone = dc.stages.filter((st, i) => progress[dc.id + '-' + i]).length;
      const allDone = stagesDone === dc.stages.length;

      // חפש תוכן מ-EDUCATION_CONTENT
      const eduLevel = edu ? edu.levels.find(l => l.dromos === dc.dromosId) : null;

      const card = document.createElement('div');
      card.className = 'dromos-learn-card card' + (allDone ? ' all-done' : '');

      // כותרת דרומוס
      const head = document.createElement('div');
      head.className = 'dlc-head';
      head.innerHTML = `
        <span class="dlc-icon">${dc.icon}</span>
        <div class="dlc-meta">
          <h2 class="dlc-title">${dc.title}</h2>
          <p class="dlc-sub">${dc.subtitle}</p>
          ${eduLevel ? `<p class="dlc-level-badge">${eduLevel.level}</p>` : ''}
        </div>
        <div class="dlc-prog">${stagesDone} / ${dc.stages.length}</div>`;
      card.appendChild(head);

      // אופי ותיאוריה מ-EDUCATION_CONTENT
      if (eduLevel) {
        const moodBox = document.createElement('div');
        moodBox.className = 'dlc-mood-box';
        moodBox.innerHTML = `
          <div class="dlc-mood">"${eduLevel.mood.he}"</div>
          <div class="dlc-theory-text">${eduLevel.theory}</div>`;
        card.appendChild(moodBox);
      }

      // מרווחים מאפיינים
      const intervals = document.createElement('div');
      intervals.className = 'dlc-intervals';
      intervals.innerHTML = `<b>מרווחים מאפיינים:</b> ${dc.characteristic_intervals.join(' · ')}`;
      card.appendChild(intervals);

      // שלבי לימוד עם תיבות סימון
      const stagesWrap = document.createElement('div');
      stagesWrap.className = 'dlc-stages';
      dc.stages.forEach((stage, i) => {
        const done = !!progress[dc.id + '-' + i];
        const stageEl = document.createElement('div');
        stageEl.className = 'dlc-stage' + (done ? ' done' : '');
        stageEl.innerHTML = `
          <div class="dlc-stage-head">
            <div class="dlc-stage-check ${done ? 'checked' : ''}" data-key="${dc.id}-${i}">✓</div>
            <div>
              <b>שלב ${stage.stage}: ${stage.title}</b>
              <p>${stage.desc}</p>
              <div class="dlc-ex">🎯 <b>תרגיל:</b> ${stage.exercise}</div>
            </div>
          </div>`;
        stageEl.querySelector('.dlc-stage-check').addEventListener('click', () => {
          const p = loadProgress();
          p[dc.id + '-' + i] = !p[dc.id + '-' + i];
          saveProgress(p);
          render(el);
        });
        stagesWrap.appendChild(stageEl);
      });
      card.appendChild(stagesWrap);

      // פראזות אופייניות מ-EDUCATION_CONTENT
      if (eduLevel && eduLevel.characteristicPhrases && eduLevel.characteristicPhrases.length) {
        const phrasesSection = document.createElement('div');
        phrasesSection.className = 'dlc-phrases';
        phrasesSection.innerHTML = `<h3 class="dlc-section-title">🎵 פראזות אופייניות</h3>`;
        const phrasesGrid = document.createElement('div');
        phrasesGrid.className = 'dlc-phrases-grid';
        eduLevel.characteristicPhrases.forEach(ph => {
          const p = document.createElement('div');
          p.className = 'dlc-phrase-card';
          p.innerHTML = `
            <div class="dlc-phrase-name">${ph.name}</div>
            <div class="dlc-phrase-desc">${ph.desc}</div>
            ${ph.tab ? `<div class="dlc-phrase-tab" dir="ltr">${ph.tab}</div>` : ''}
            ${ph.strokes ? `<div class="dlc-phrase-strokes">${ph.strokes}</div>` : ''}`;
          phrasesGrid.appendChild(p);
        });
        phrasesSection.appendChild(phrasesGrid);
        card.appendChild(phrasesSection);
      }

      // תרגילים מ-EDUCATION_CONTENT
      if (eduLevel && eduLevel.exercises && eduLevel.exercises.length) {
        const exSection = document.createElement('div');
        exSection.className = 'dlc-edu-exercises';
        exSection.innerHTML = `
          <h3 class="dlc-section-title">🎼 תרגילים מפורטים</h3>
          <div class="dlc-ex-grid"></div>`;
        const exGrid = exSection.querySelector('.dlc-ex-grid');
        eduLevel.exercises.forEach(ex => {
          const div = document.createElement('div');
          div.className = 'dlc-ex-card';
          div.innerHTML = `
            <div class="dlc-ex-name">${ex.name} <span class="dlc-ex-bpm">${ex.bpm} BPM</span></div>
            <div class="dlc-ex-desc">${ex.desc}</div>
            ${ex.tab ? `<div class="dlc-ex-tab" dir="ltr">${ex.tab}</div>` : ''}
            ${ex.focus ? `<div class="dlc-ex-focus">🎯 ${ex.focus}</div>` : ''}`;
          exGrid.appendChild(div);
        });
        card.appendChild(exSection);
      }

      // שירים לדוגמה
      if (eduLevel && eduLevel.exampleSongs) {
        const songsDiv = document.createElement('div');
        songsDiv.className = 'dlc-example-songs';
        songsDiv.innerHTML = `<h3 class="dlc-section-title">🎶 שירים לאזנה</h3>
          <ul class="dlc-songs-list">
            ${eduLevel.exampleSongs.map(s =>
              `<li><b>${s.name}</b> — ${s.artist}<br><small style="color:var(--text-dim)">${s.note}</small></li>`
            ).join('')}
          </ul>`;
        card.appendChild(songsDiv);
      }

      // אקורדים ופרוגרסיות
      if (eduLevel && eduLevel.chordProgressions) {
        const chordsDiv = document.createElement('div');
        chordsDiv.className = 'dlc-chord-progressions';
        chordsDiv.innerHTML = `<h3 class="dlc-section-title">🎸 פרוגרסיות אקורדים</h3>
          <div class="dlc-prog-list">
            ${eduLevel.chordProgressions.map(cp =>
              `<div class="dlc-prog-item">
                <div class="dlc-prog-name">${cp.name}</div>
                <div class="dlc-prog-chords" dir="ltr">${cp.prog}</div>
                <div class="dlc-prog-desc">${cp.desc}</div>
              </div>`
            ).join('')}
          </div>`;
        card.appendChild(chordsDiv);
      }

      // כפתורי ניווט
      const footer = document.createElement('div');
      footer.className = 'dlc-footer';
      footer.innerHTML = `
        <div class="dlc-chords"><b>אקורדים עיקריים:</b> ${dc.common_chords.join(', ')}</div>
        <div class="dlc-tips"><b>טיפים:</b><ul>${dc.practice_tips.map(t => `<li>${t}</li>`).join('')}</ul></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn small dlc-go-dromos" data-dromos="${dc.dromosId}">🛤️ דרומוסים</button>
          <button class="btn small dlc-go-mm" data-dromos="${dc.dromosId}">🎯 מאסטר מודוסים</button>
          <button class="btn small dlc-go-listen" data-dromos="${dc.dromosId}">🎤 מאמן מאזין</button>
        </div>`;
      card.appendChild(footer);

      // event listeners
      footer.querySelector('.dlc-go-dromos').addEventListener('click', () => {
        document.querySelector('[data-screen="dromoi"]').click();
        setTimeout(() => {
          const idx = (typeof DROMOI !== 'undefined') ? DROMOI.findIndex(d => d.id === dc.dromosId) : -1;
          const items = document.querySelectorAll('.dromos-item');
          if (idx >= 0 && items[idx]) items[idx].click();
        }, 150);
      });

      footer.querySelector('.dlc-go-mm').addEventListener('click', () => {
        document.querySelector('[data-screen="master-modes"]').click();
        setTimeout(() => {
          const sel = document.querySelector('#mm-dromos-select');
          if (sel) {
            for (const opt of sel.options) {
              if (opt.value === dc.dromosId) { opt.selected = true; break; }
            }
            sel.dispatchEvent(new Event('change'));
          }
        }, 150);
      });

      footer.querySelector('.dlc-go-listen').addEventListener('click', () => {
        document.querySelector('[data-screen="listen"]').click();
      });

      el.appendChild(card);
    });

    // איפוס
    const resetWrap = document.createElement('div');
    resetWrap.style.cssText = 'text-align:center;margin-top:16px;';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn';
    resetBtn.textContent = 'איפוס התקדמות';
    resetBtn.addEventListener('click', () => {
      if (confirm('לאפס את כל ההתקדמות?')) { saveProgress({}); render(el); }
    });
    resetWrap.appendChild(resetBtn);
    el.appendChild(resetWrap);
  }

  function stop() {}
  return { init, stop };
})();
