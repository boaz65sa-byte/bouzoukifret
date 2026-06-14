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

  function drawBoard(container, playNotes, opts = {}) {
    const scaleNotes = uniqueScaleNotes(playNotes);
    const scaleMarkers = Fretboard.uniqueModeScaleMarkers(scaleNotes);
    const fbWrap = document.createElement('div');
    fbWrap.className = opts.compact ? 'fb-wrap fb-wrap-compact' : 'fb-wrap';
    container.appendChild(fbWrap);

    Fretboard.draw(fbWrap, {
      compact: opts.compact,
      markers: scaleMarkers,
      defMin: 0,
      defMax: Math.max(5, ...scaleNotes.map(n => n.fret)),
    });

    function highlightStep(idx, live) {
      const n = playNotes[idx];
      if (!n) return;
      fbWrap.querySelectorAll('.fb-marker').forEach(g => {
        g.classList.remove('active', 'pulse');
      });
      const g = fbWrap.querySelector(`.fb-marker[data-id="scale-f${n.fret}"]`);
      if (g) {
        g.classList.add('active');
        if (live) g.classList.add('pulse');
      }
      if (opts.onFocus) opts.onFocus(n, focusText(n), live);
      if (opts.onChip) opts.onChip(idx, live);
    }

    return { highlightStep, playNotes };
  }

  function draw(container, notes, opts = {}) {
    container.innerHTML = '';
    container.className = 'mode-diagram learn-graph-box';
    const playNotes = opts.playNotes || notes;

    LearnGraph.wrapLearnHeader(
      container,
      '📍 גרף לימוד — סריגים ומיתרים',
      'ציר שמאל = סריג · למטה = מיתר (1=דו … 4=רה) · הנקודות = איפה ללחוץ'
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

    const fbWrap = container.querySelector('.fb-wrap');
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
    head.innerHTML = '<span class="pli-title">📍 גרף לימוד</span><span class="pli-sub">סריג · מיתר · לחצו צליל</span>';
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

    container.appendChild(seqWrap);
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
