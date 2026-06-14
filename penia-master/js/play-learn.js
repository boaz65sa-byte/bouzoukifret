/* גרף לימוד — חלון אחד, זז עם המשחק */
const PlayLearnGraph = (() => {
  let state = null;

  function positionFor(fret) {
    if (fret <= 5) return 0;
    return Math.max(0, Math.min(fret - 3, 12 - 5));
  }

  function noteCaption(n) {
    const name = n.label || n.solfege;
    if (n.fret === 0) return `${name} · מיתר רה — פתוח ○`;
    return `${name} · סריג ${n.fret} · מיתר רה`;
  }

  function chordCaption(id) {
    const ch = getChord(id);
    const he = ch?.he ? ` · ${ch.he}` : '';
    return `${id}${he} · ${LearnGraph.shapeHint(id)}`;
  }

  function render(idx, live) {
    if (!state) return;
    const { level, gt, root, captionEl, boardEl } = state;
    const posChanged = state.lastIdx != null && state.lastIdx !== idx;
    state.lastIdx = idx;
    state.lastPos = state.lastPos ?? 0;

    boardEl.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'fb-wrap fb-wrap-real fb-wrap-live';
    boardEl.appendChild(wrap);

    let posStart = 0;
    let fbResult = null;

    if (gt === 'note') {
      const n = level.notes[idx];
      if (!n) return;
      posStart = positionFor(n.fret);
      captionEl.textContent = noteCaption(n);
      fbResult = Fretboard.draw(wrap, {
        compact: true,
        markers: [{ stringIdx: 3, fret: n.fret, id: 'now', label: n.label || n.solfege }],
        positionStart: posStart,
        activeCourseIdx: 3,
      });
    } else if (gt === 'chord') {
      const id = level.chordSeq[idx];
      if (!id) return;
      captionEl.textContent = chordCaption(id);
      const markers = Fretboard.markersFromChord(id);
      posStart = Fretboard.calcPositionStart(markers);
      fbResult = Fretboard.draw(wrap, {
        compact: true,
        markers,
        positionStart: posStart,
      });
    }

    captionEl.classList.toggle('live', !!live);
    root.classList.toggle('live', !!live);

    wrap.querySelectorAll('.fb-marker').forEach(g => {
      g.classList.add('active');
      if (live) g.classList.add('pulse');
    });

    if (posStart !== state.lastPos) {
      root.classList.add('pls-shift');
      clearTimeout(state.shiftTimer);
      state.shiftTimer = setTimeout(() => root.classList.remove('pls-shift'), 350);
      state.lastPos = posStart;
    } else if (posChanged) {
      root.classList.add('pls-tick');
      clearTimeout(state.tickTimer);
      state.tickTimer = setTimeout(() => root.classList.remove('pls-tick'), 200);
    }
  }

  function mount(container, level) {
    if (!container || !level) return null;
    destroy();
    const gt = level.gameType || 'pick';
    if (gt !== 'note' && gt !== 'chord') return null;

    container.innerHTML = '';
    const root = document.createElement('div');
    root.className = 'play-learn-single';
    const captionEl = document.createElement('div');
    captionEl.className = 'pls-caption';
    const boardEl = document.createElement('div');
    boardEl.className = 'pls-board';
    root.appendChild(captionEl);
    root.appendChild(boardEl);
    container.appendChild(root);

    state = {
      level, gt, root, captionEl, boardEl,
      lastIdx: null, lastPos: null,
      shiftTimer: null, tickTimer: null,
    };

    render(0, false);
    return { highlightStep: render };
  }

  function highlight(idx, live = false) {
    render(idx, live);
  }

  function destroy() {
    if (state?.shiftTimer) clearTimeout(state.shiftTimer);
    if (state?.tickTimer) clearTimeout(state.tickTimer);
    state = null;
  }

  return { mount, highlight, destroy };
})();
