/* גרף לימוד מודוס — סריגים + מיתרים */
const ModeDiagram = (() => {
  const D_STRING = 4;

  function uniqueScaleNotes(notes) {
    const seen = new Set();
    return notes.filter(n => {
      if (seen.has(n.fret)) return false;
      seen.add(n.fret);
      return true;
    }).sort((a, b) => a.fret - b.fret);
  }

  function focusText(note) {
    if (!note) return 'לחצו על צליל';
    if (note.fret === 0) return `מיתר ${D_STRING} (רה) — פתוח ○`;
    return `סריג ${note.fret} · מיתר ${D_STRING} (רה)`;
  }

  function positionFor(fret) {
    if (fret <= 5) return 0;
    return Math.max(0, Math.min(fret - 3, 12 - 5));
  }

  function drawBoard(container, playNotes, opts = {}) {
    const scaleNotes = uniqueScaleNotes(playNotes);
    const scaleMarkers = Fretboard.uniqueModeScaleMarkers(scaleNotes);
    const fbHost = document.createElement('div');
    fbHost.className = opts.compact ? 'fb-host fb-host-bottom' : 'fb-host';
    container.appendChild(fbHost);

    let fb = null;

    function renderAt(fret) {
      fbHost.innerHTML = '';
      const wrap = document.createElement('div');
      wrap.className = opts.compact ? 'fb-wrap fb-wrap-real fb-wrap-compact' : 'fb-wrap fb-wrap-real';
      fbHost.appendChild(wrap);
      fb = Fretboard.draw(wrap, {
        compact: opts.compact,
        markers: scaleMarkers,
        positionStart: positionFor(fret),
        onCellClick(c, f, txt) {
          if (opts.onFocus) {
            const n = playNotes.find(p => p.fret === f && (f > 0 || c === 3)) || playNotes[0];
            opts.onFocus(n, txt, false);
          }
        },
      });
    }

    function highlightStep(idx, live) {
      const n = playNotes[idx];
      if (!n) return;
      renderAt(n.fret);
      fbHost.querySelectorAll('.fb-marker').forEach(g => g.classList.remove('active', 'pulse'));
      const g = fbHost.querySelector(`.fb-marker[data-id="scale-f${n.fret}"]`);
      if (g) {
        g.classList.add('active');
        if (live) g.classList.add('pulse');
      }
      if (opts.onFocus) opts.onFocus(n, focusText(n), live);
      if (opts.onChip) opts.onChip(idx, live);
    }

    renderAt(playNotes[0]?.fret ?? 0);
    return { highlightStep, playNotes };
  }

  function draw(container, notes, opts = {}) {
    container.innerHTML = '';
    container.className = 'mode-diagram learn-graph-box';
    const playNotes = opts.playNotes || notes;

    LearnGraph.wrapLearnHeader(
      container,
      '📍 גרף לימוד — דיאגרמת בוזוקי',
      '8 מיתרים (4 זוגות) · גרף לרוחב · לחצו על תא לראות מיתר + סריג'
    );

    const panel = LearnGraph.focusPanel(container);
    const lfpV = panel.querySelector('.lfp-visual');
    const lfpH = panel.querySelector('.lfp-hint');
    const lfpLabel = panel.querySelector('.lfp-label');

    const ctrl = drawBoard(container, playNotes, {
      compact: false,
      onFocus(n, txt) {
        lfpLabel.textContent = n.label || n.solfege;
        lfpV.innerHTML = `<span class="lfp-big-fret">${n.fret === 0 ? '○' : n.fret}</span><span class="lfp-big-name">${txt}</span>`;
        lfpH.textContent = n.fret === 0
          ? 'מיתר 4 (רה) פתוח — בלי לחיצה על הסריג'
          : `לחצו: סריג ${n.fret} · מיתר 4 (רה) · צליל ${n.label || n.solfege}`;
        panel.classList.add('show');
      },
      onChip(idx) {
        container.querySelectorAll('.mode-seq-chip').forEach((chip, i) => {
          chip.classList.toggle('active', i === idx);
        });
      },
    });

    const fbWrap = container.querySelector('.fb-host');
    if (fbWrap) container.insertBefore(fbWrap, panel);

    const seqLabel = document.createElement('p');
    seqLabel.className = 'learn-seq-label';
    seqLabel.textContent = 'סדר במשחק — לחצו צליל לראות סריג + מיתר:';
    container.appendChild(seqLabel);

    const seqWrap = document.createElement('div');
    seqWrap.className = 'mode-seq-row learn-seq-row';
    seqWrap.dir = 'ltr';
    playNotes.forEach((n, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'mode-seq-chip';
      chip.dataset.i = i;
      chip.innerHTML = `<b>${i + 1}</b><span>${n.label || n.solfege}</span><small>ס${n.fret}·מ${D_STRING}</small>`;
      chip.addEventListener('click', () => ctrl.highlightStep(i, false));
      seqWrap.appendChild(chip);
      if (i < playNotes.length - 1) {
        const arr = document.createElement('span');
        arr.className = 'mode-seq-arrow';
        arr.textContent = '→';
        seqWrap.appendChild(arr);
      }
    });
    container.appendChild(seqWrap);

    const hint = document.createElement('p');
    hint.className = 'mode-map-hint';
    hint.textContent = 'למדו את הגרף ↑ · ▶ שחק — הצלילים יזרמו לקו הזהב';
    container.appendChild(hint);

    ctrl.highlightStep(0, false);
    return { highlightStep: ctrl.highlightStep };
  }

  function drawPlay(container, notes, opts = {}) {
    container.innerHTML = '';
    container.className = 'mode-diagram play-learn-inline';
    const playNotes = opts.playNotes || notes;

    const head = document.createElement('div');
    head.className = 'pli-head';
    head.innerHTML = '<span class="pli-title">📍 גרף לימוד</span><span class="pli-sub">דיאגרמת בוזוקי · לחצו צליל</span>';
    container.appendChild(head);

    const focus = document.createElement('div');
    focus.className = 'pli-focus';
    focus.innerHTML = '<span class="pli-fret">—</span><span class="pli-name">לחצו על צליל</span><span class="pli-hint"></span>';
    container.appendChild(focus);
    const lfpFret = focus.querySelector('.pli-fret');
    const lfpName = focus.querySelector('.pli-name');
    const lfpHint = focus.querySelector('.pli-hint');

    const seqWrap = document.createElement('div');
    seqWrap.className = 'pli-seq';
    seqWrap.dir = 'ltr';
    container.appendChild(seqWrap);

    const ctrl = drawBoard(container, playNotes, {
      compact: true,
      onFocus(n, txt) {
        lfpFret.textContent = n.fret === 0 ? '○' : n.fret;
        lfpName.textContent = n.label || n.solfege;
        lfpHint.textContent = txt;
        focus.classList.add('show');
      },
      onChip(idx, live) {
        seqWrap.querySelectorAll('.mode-seq-chip').forEach((chip, i) => {
          chip.classList.toggle('active', i === idx);
          chip.classList.toggle('live', live && i === idx);
        });
      },
    });

    playNotes.forEach((n, i) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'mode-seq-chip pli-chip';
      chip.dataset.i = i;
      chip.innerHTML = `<span>${n.label || n.solfege}</span><small>ס${n.fret}·מ${D_STRING}</small>`;
      chip.addEventListener('click', () => ctrl.highlightStep(i, false));
      seqWrap.appendChild(chip);
    });

    ctrl.highlightStep(0, false);
    return { highlightStep: ctrl.highlightStep };
  }

  return { draw, drawPlay, uniqueScaleNotes };
})();
