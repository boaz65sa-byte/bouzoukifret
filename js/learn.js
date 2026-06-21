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

    const done = PENIA_CURRICULUM.filter(s => progress[s.id]).length;
    const total = PENIA_CURRICULUM.length;
    const pct = Math.round(done / total * 100);
    const firstOpen = PENIA_CURRICULUM.find(s => !progress[s.id])?.id || PENIA_CURRICULUM[0].id;

    const header = document.createElement('div');
    header.className = 'card penia-learn-header';
    header.innerHTML = `
      <h2 style="margin:0 0 8px">🎯 מסלול פנייה מעשי — עשה, אל תקרא</h2>
      <p class="hint" style="margin:0 0 12px">כל שלב: תמונה · צעדים · תבנית · כפתור נגן. סמנו ✓ אחרי שתרגלתם 5+ דקות.</p>
      <div class="penia-learn-progress">
        <span><strong>${done}/${total}</strong> שלבים</span>
        <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <span class="penia-pct">${pct}%</span>
      </div>`;
    el.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'penia-practical-grid';
    el.appendChild(grid);

    PENIA_CURRICULUM.forEach(stage => {
      const isDone = !!progress[stage.id];
      const practical = typeof PeniaVisuals !== 'undefined' ? PeniaVisuals.getPractical(stage.id) : null;
      const isCurrent = stage.id === firstOpen;
      const strokes = practical?.strokes || (stage.patternId
        ? PENIA_PATTERNS.find(p => p.id === stage.patternId)?.strokes
        : null);

      const card = document.createElement('article');
      card.className = 'penia-practical-card card' + (isDone ? ' done' : '') + (isCurrent ? ' current' : '');

      card.innerHTML = `
        <div class="ppc-head">
          <span class="ppc-num">${stage.level}</span>
          <div class="ppc-title-wrap">
            <h3>${stage.icon} ${stage.title}</h3>
            <p class="ppc-focus">${stage.focus}</p>
            ${stage.bpmRange[0] ? `<span class="ppc-bpm">${practical?.bpmStart || stage.bpmRange[0]} BPM להתחלה</span>` : ''}
          </div>
          <button type="button" class="ppc-check ${isDone ? 'checked' : ''}" data-id="${stage.id}" aria-label="סמן הושלם">✓</button>
        </div>
        <div class="ppc-visual" id="ppc-vis-${stage.id}"></div>
        ${practical?.caption ? `<p class="ppc-caption">${practical.caption}</p>` : ''}
        <div class="ppc-do">
          <h4>עשה עכשיו</h4>
          <ol class="ppc-steps"></ol>
        </div>
        ${practical?.strings ? `<p class="ppc-meta"><b>מיתרים:</b> ${practical.strings}</p>` : ''}
        <div class="ppc-strip-wrap">
          <span class="ppc-strip-label">תבנית פריטה:</span>
          <div class="ppc-strip" id="ppc-strip-${stage.id}"></div>
        </div>
        ${practical?.check ? `<p class="ppc-checklist">✅ <b>עברת שלב כש:</b> ${practical.check}</p>` : ''}
        <div class="ppc-actions"></div>
        <details class="ppc-theory">
          <summary>📖 למה זה חשוב (תיאוריה קצרה)</summary>
          <p>${stage.theory}</p>
          <p class="ppc-tip">💡 ${stage.tips}</p>
        </details>`;

      const stepsOl = card.querySelector('.ppc-steps');
      const steps = practical?.steps || stage.exercises.map((e, i) => ({ icon: String(i + 1), title: 'תרגיל', detail: e }));
      steps.forEach((st, i) => {
        const li = document.createElement('li');
        li.innerHTML = `<span class="ppc-step-n">${st.icon || i + 1}</span><div><strong>${st.title}</strong><p>${st.detail}</p></div>`;
        stepsOl.appendChild(li);
      });

      if (typeof PeniaVisuals !== 'undefined' && practical?.visual) {
        PeniaVisuals.mountIllustration(card.querySelector(`#ppc-vis-${stage.id}`), practical.visual);
      }

      const stripEl = card.querySelector(`#ppc-strip-${stage.id}`);
      if (strokes && typeof PeniaVisuals !== 'undefined') {
        PeniaVisuals.renderStrokeStrip(stripEl, strokes);
      } else if (stripEl) {
        stripEl.closest('.ppc-strip-wrap').style.display = 'none';
      }

      const actions = card.querySelector('.ppc-actions');
      if (stage.patternId) {
        const playBtn = document.createElement('button');
        playBtn.type = 'button';
        playBtn.className = 'btn gold';
        playBtn.textContent = '▶ נגן במאמן פנייה';
        playBtn.addEventListener('click', () => {
          const idx = PENIA_PATTERNS.findIndex(p => p.id === stage.patternId);
          if (idx >= 0) {
            document.querySelector('[data-screen="penia"]')?.click();
            setTimeout(() => {
              const sel = document.querySelector('#penia-select');
              if (sel) { sel.value = idx; sel.dispatchEvent(new Event('change')); }
              document.querySelector('#penia-play')?.click();
            }, 120);
          }
        });
        actions.appendChild(playBtn);
      }
      const gameBtn = document.createElement('button');
      gameBtn.type = 'button';
      gameBtn.className = 'btn secondary';
      gameBtn.textContent = '🎮 מאסטר הפנייה';
      gameBtn.addEventListener('click', () => document.querySelector('[data-screen="game"]')?.click());
      actions.appendChild(gameBtn);

      const metBtn = document.createElement('button');
      metBtn.type = 'button';
      metBtn.className = 'btn secondary';
      metBtn.textContent = '🥁 מטרונום';
      metBtn.addEventListener('click', () => document.querySelector('[data-screen="practice"]')?.click());
      actions.appendChild(metBtn);

      (practical?.exerciseIds || []).forEach(exId => {
        const found = typeof getExerciseById === 'function' ? getExerciseById(exId) : null;
        if (!found) return;
        const exBtn = document.createElement('button');
        exBtn.type = 'button';
        exBtn.className = 'btn secondary';
        exBtn.textContent = `📚 ${found.item.name}`;
        exBtn.addEventListener('click', () => {
          if (typeof openExerciseById === 'function') openExerciseById(exId);
        });
        actions.appendChild(exBtn);
      });

      card.querySelector('.ppc-check').addEventListener('click', () => {
        const p = loadProgress();
        p[stage.id] = !p[stage.id];
        saveProgress(p);
        render(el);
      });

      grid.appendChild(card);
    });

    if (typeof TECHNIQUE_PRINCIPLES !== 'undefined') {
      const tech = document.createElement('details');
      tech.className = 'card penia-tech-ref';
      tech.innerHTML = `<summary>🤚 מדריך אחיזה ותנועה (4 איורים)</summary><div class="penia-tech-grid"></div>`;
      const tgrid = tech.querySelector('.penia-tech-grid');
      TECHNIQUE_PRINCIPLES.forEach(tp => {
        const box = document.createElement('div');
        box.className = 'penia-tech-item';
        box.innerHTML = `<h4>${tp.title}</h4><div class="penia-tech-svg" data-kind="${tp.svg}"></div><ul>${tp.points.slice(0, 3).map(p => `<li>${p}</li>`).join('')}</ul>`;
        if (typeof PeniaVisuals !== 'undefined') {
          PeniaVisuals.mountIllustration(box.querySelector('.penia-tech-svg'), tp.svg);
        }
        tgrid.appendChild(box);
      });
      el.appendChild(tech);
    }

    const resetWrap = document.createElement('div');
    resetWrap.className = 'penia-reset-wrap';
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
