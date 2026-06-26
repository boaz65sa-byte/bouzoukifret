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
   DromosLearn — מסלול לימוד מודוסים (מעשי)
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

  function stageKey(dc, i) { return `${dc.id}-${i}`; }

  function render(el) {
    const progress = loadProgress();
    el.innerHTML = '';

    const totalStages = DROMOS_CURRICULUM.reduce((s, d) => s + d.stages.length, 0);
    const doneStages = DROMOS_CURRICULUM.reduce((s, d) =>
      s + d.stages.filter((st, i) => progress[stageKey(d, i)]).length, 0);
    const pct = Math.round(doneStages / totalStages * 100);
    const firstOpen = (() => {
      for (const dc of DROMOS_CURRICULUM) {
        const i = dc.stages.findIndex((st, idx) => !progress[stageKey(dc, idx)]);
        if (i >= 0) return stageKey(dc, i);
      }
      return stageKey(DROMOS_CURRICULUM[0], 0);
    })();

    const header = document.createElement('div');
    header.className = 'card penia-learn-header';
    header.innerHTML = `
      <h2 style="margin:0 0 8px">🎯 מסלול מודוסים מעשי — עשה, אל תקרא</h2>
      <p class="hint" style="margin:0 0 12px">כל שלב: לוח סריגים · סריגים · צעדים · נגן. סמנו ✓ אחרי 5+ דקות תרגול.</p>
      <div class="penia-learn-progress">
        <span><strong>${doneStages}/${totalStages}</strong> שלבים</span>
        <div class="progress-bar-wrap"><div class="progress-bar-fill" style="width:${pct}%"></div></div>
        <span class="penia-pct">${pct}%</span>
      </div>`;
    el.appendChild(header);

    DROMOS_CURRICULUM.forEach(dc => {
      const dromos = (typeof DROMOI !== 'undefined') ? DROMOI.find(d => d.id === dc.dromosId) : null;
      const stagesDone = dc.stages.filter((st, i) => progress[stageKey(dc, i)]).length;
      const allDone = stagesDone === dc.stages.length;

      const section = document.createElement('section');
      section.className = 'dpc-dromos-section card' + (allDone ? ' all-done' : '');
      section.innerHTML = `
        <div class="dpc-dromos-head">
          <span class="dlc-icon">${dc.icon}</span>
          <div>
            <h2 class="dlc-title">${dc.title}</h2>
            <p class="dlc-sub">${dc.subtitle}</p>
            <p class="dpc-prog">${stagesDone}/${dc.stages.length} שלבים · אקורדים: ${dc.common_chords.join(', ')}</p>
          </div>
        </div>
        <div class="dpc-road-host" id="dpc-road-${dc.id}"></div>
        <div class="penia-practical-grid dpc-stages-grid"></div>`;
      const grid = section.querySelector('.dpc-stages-grid');

      // "הכביש" — מסלול מעשי על 1–4 מיתרים + פוזיציות (רכיב משותף)
      if (dromos && typeof DromosRoad !== 'undefined') {
        DromosRoad.renderInto(section.querySelector(`#dpc-road-${dc.id}`), {
          intervals: dromos.intervals, rootPc: 2, nameHe: dromos.nameHe || dc.title,
        });
      }

      dc.stages.forEach((stage, i) => {
        const key = stageKey(dc, i);
        const isDone = !!progress[key];
        const isCurrent = key === firstOpen;
        const practical = typeof DromosVisuals !== 'undefined' ? DromosVisuals.getPractical(dc.id, i) : null;
        const frets = practical?.phraseFrets || practical?.frets || (typeof DromosVisuals !== 'undefined' ? DromosVisuals.getScaleFrets(dc.dromosId) : []);

        const card = document.createElement('article');
        card.className = 'penia-practical-card card dpc-stage-card' + (isDone ? ' done' : '') + (isCurrent ? ' current' : '');

        card.innerHTML = `
          <div class="ppc-head">
            <span class="ppc-num">${stage.stage}</span>
            <div class="ppc-title-wrap">
              <h3>${stage.title}</h3>
              <p class="ppc-focus">${practical?.caption || stage.desc}</p>
              ${practical?.bpmStart ? `<span class="ppc-bpm">${practical.bpmStart} BPM להתחלה</span>` : ''}
            </div>
            <button type="button" class="ppc-check ${isDone ? 'checked' : ''}" data-key="${key}" aria-label="סמן הושלם">✓</button>
          </div>
          <div class="ppc-visual" id="dpc-vis-${key}"></div>
          <div class="dpc-fb-wrap" dir="ltr" id="dpc-fb-${key}"></div>
          <div class="dpc-strip" id="dpc-strip-${key}"></div>
          <div class="ppc-do">
            <h4>עשה עכשיו</h4>
            <ol class="ppc-steps"></ol>
          </div>
          ${practical?.check ? `<p class="ppc-checklist">✅ <b>עברת שלב כש:</b> ${practical.check}</p>` : ''}
          <div class="ppc-strip-wrap" id="dpc-strokes-wrap-${key}" style="display:none">
            <span class="ppc-strip-label">תבנית פריטה:</span>
            <div class="ppc-strip" id="dpc-strokes-${key}"></div>
          </div>
          <div class="ppc-actions"></div>
          <details class="ppc-theory">
            <summary>📖 תיאוריה + טיפים</summary>
            <p>${stage.desc}</p>
            <p><b>תרגיל:</b> ${stage.exercise}</p>
            <p><b>מרווחים:</b> ${dc.characteristic_intervals.join(' · ')}</p>
            <ul>${dc.practice_tips.map(t => `<li>${t}</li>`).join('')}</ul>
            ${dromos ? `<p class="ppc-tip">💡 ${dromos.tips}</p>` : ''}
          </details>`;

        const stepsOl = card.querySelector('.ppc-steps');
        const steps = practical?.steps || [{ icon: '🎯', title: 'תרגיל', detail: stage.exercise }];
        steps.forEach((st, si) => {
          const li = document.createElement('li');
          li.innerHTML = `<span class="ppc-step-n">${st.icon || si + 1}</span><div><strong>${st.title}</strong><p>${st.detail}</p></div>`;
          stepsOl.appendChild(li);
        });

        if (typeof DromosVisuals !== 'undefined') {
          if (practical?.visual) {
            DromosVisuals.mountIllustration(card.querySelector(`#dpc-vis-${key}`), practical.visual);
          }
          const fbEl = card.querySelector(`#dpc-fb-${key}`);
          if (practical?.chords) {
            DromosVisuals.mountChordBoard(fbEl, practical.chords[0]);
          } else if (frets.length) {
            DromosVisuals.mountFretboard(fbEl, frets, {
              dromosId: dc.dromosId,
              numbered: !!practical?.phraseFrets,
              scaleFrets: practical?.phraseFrets
                ? (practical.frets || DromosVisuals.getScaleFrets(dc.dromosId))
                : undefined,
            });
          }
          DromosVisuals.renderFretStrip(card.querySelector(`#dpc-strip-${key}`), frets);
          if (practical?.strokes) {
            const sw = card.querySelector(`#dpc-strokes-wrap-${key}`);
            sw.style.display = '';
            DromosVisuals.renderStrokeStrip(card.querySelector(`#dpc-strokes-${key}`), practical.strokes);
          }
        }

        const actions = card.querySelector('.ppc-actions');
        const fbContainer = card.querySelector(`#dpc-fb-${key}`);

        if (practical?.playMode === 'scale' && frets.length) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn gold';
          btn.textContent = '▶ נגן סולם (עלייה+ירידה)';
          btn.addEventListener('click', () => {
            if (typeof DromosVisuals !== 'undefined') DromosVisuals.playScaleAnimated(fbContainer, frets, 300, { dromosId: dc.dromosId });
          });
          actions.appendChild(btn);
        }
        if (practical?.playMode === 'phrase' && practical.phraseFrets) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn gold';
          btn.textContent = '▶ נגן פראזה (עם הדגשה)';
          btn.addEventListener('click', () => {
            if (typeof DromosVisuals !== 'undefined') {
              DromosVisuals.playPhraseAnimated(
                fbContainer,
                practical.phraseFrets,
                practical.frets || DromosVisuals.getScaleFrets(dc.dromosId),
                320,
              );
            }
          });
          actions.appendChild(btn);
        }
        if (practical?.playMode === 'chords' && practical.chords) {
          practical.chords.forEach(ch => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn';
            btn.textContent = `🔊 ${ch}`;
            btn.addEventListener('click', () => {
              const cKey = (typeof ChordTooltip !== 'undefined') ? ChordTooltip.resolveKey(ch) : ch;
              if (typeof CHORDS !== 'undefined' && CHORDS[cKey] && typeof AudioEngine !== 'undefined') {
                AudioEngine.ensureCtx();
                AudioEngine.strumChord(CHORDS[cKey].shape, 'd', 0, 0.55);
              }
              if (typeof DromosVisuals !== 'undefined') DromosVisuals.mountChordBoard(fbContainer, ch);
            });
            actions.appendChild(btn);
          });
        }
        if (practical?.playMode === 'compare' && practical.altFrets) {
          const btnK = document.createElement('button');
          btnK.type = 'button';
          btnK.className = 'btn';
          btnK.textContent = '▶ קיורדי';
          btnK.addEventListener('click', () => {
            if (typeof DromosVisuals !== 'undefined') DromosVisuals.playScaleAnimated(fbContainer, practical.frets, 280, { dromosId: dc.dromosId });
          });
          const btnO = document.createElement('button');
          btnO.type = 'button';
          btnO.className = 'btn';
          btnO.textContent = '▶ אוסאק';
          btnO.addEventListener('click', () => {
            if (typeof DromosVisuals !== 'undefined') DromosVisuals.playScaleAnimated(fbContainer, practical.altFrets, 280, { dromosId: dc.dromosId });
          });
          actions.appendChild(btnK);
          actions.appendChild(btnO);
        }

        const dromosBtn = document.createElement('button');
        dromosBtn.type = 'button';
        dromosBtn.className = 'btn secondary';
        dromosBtn.textContent = '🛤️ מסך דרומוסים';
        dromosBtn.addEventListener('click', () => {
          document.querySelector('[data-screen="dromoi"]')?.click();
          setTimeout(() => {
            const idx = (typeof DROMOI !== 'undefined') ? DROMOI.findIndex(d => d.id === dc.dromosId) : -1;
            document.querySelectorAll('.dromos-item')[idx]?.click();
          }, 120);
        });
        actions.appendChild(dromosBtn);

        const mmBtn = document.createElement('button');
        mmBtn.type = 'button';
        mmBtn.className = 'btn secondary';
        mmBtn.textContent = '🎯 מאסטר מודוסים';
        mmBtn.addEventListener('click', () => {
          document.querySelector('[data-screen="master-modes"]')?.click();
          setTimeout(() => {
            const sel = document.querySelector('#mm-dromos-select');
            if (sel) {
              for (const opt of sel.options) {
                if (opt.value === dc.dromosId) { opt.selected = true; break; }
              }
              sel.dispatchEvent(new Event('change'));
            }
          }, 120);
        });
        actions.appendChild(mmBtn);

        if (practical?.peniaStage) {
          const penBtn = document.createElement('button');
          penBtn.type = 'button';
          penBtn.className = 'btn secondary';
          penBtn.textContent = '🤘 מסלול פנייה';
          penBtn.addEventListener('click', () => document.querySelector('[data-screen="penia-learn"]')?.click());
          actions.appendChild(penBtn);
        }
        if (practical?.navScreen === 'backing') {
          const btBtn = document.createElement('button');
          btBtn.type = 'button';
          btBtn.className = 'btn secondary';
          btBtn.textContent = '🎵 רצועות ליווי';
          btBtn.addEventListener('click', () => document.querySelector('[data-screen="backing"]')?.click());
          actions.appendChild(btBtn);
        }
        if (practical?.songId) {
          const songBtn = document.createElement('button');
          songBtn.type = 'button';
          songBtn.className = 'btn secondary';
          songBtn.textContent = '🎵 שיר בספרייה';
          songBtn.addEventListener('click', () => {
            document.querySelector('[data-screen="songs"]')?.click();
            setTimeout(() => {
              if (typeof SongLibrary !== 'undefined' && SongLibrary.openSongById) SongLibrary.openSongById(practical.songId);
            }, 150);
          });
          actions.appendChild(songBtn);
        }

        card.querySelector('.ppc-check').addEventListener('click', () => {
          const p = loadProgress();
          p[key] = !p[key];
          saveProgress(p);
          render(el);
        });

        grid.appendChild(card);
      });

      el.appendChild(section);
    });

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
