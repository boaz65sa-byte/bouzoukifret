/* גרף לימוד אקורדים — סריגים + מיתרים */
const ChordMap = (() => {
  function uniqueSeq(ids) {
    return ids.filter((id, i) => i === 0 || id !== ids[i - 1]);
  }

  function chordFocusText(id) {
    const ch = getChord(id);
    if (!ch) return id;
    return ch.shape
      .map((f, i) => {
        if (f === 'x') return null;
        if (f === 0) return `מ${i + 1}○`;
        return `ס${f}·מ${i + 1}`;
      })
      .filter(Boolean)
      .join(' · ');
  }

  function drawChordBoard(container, chordId, opts = {}) {
    const fbHost = document.createElement('div');
    fbHost.className = opts.compact ? 'fb-host fb-host-bottom' : 'fb-host';
    container.appendChild(fbHost);
    const wrap = document.createElement('div');
    wrap.className = opts.compact ? 'fb-wrap fb-wrap-real fb-wrap-compact' : 'fb-wrap fb-wrap-real';
    fbHost.appendChild(wrap);
    Fretboard.draw(wrap, {
      compact: opts.compact,
      markers: Fretboard.markersFromChord(chordId),
    });
    return fbHost;
  }

  function drawProgression(container, chordIds, opts = {}) {
    container.innerHTML = '';
    container.className = 'chord-map learn-graph-box';
    const seq = opts.fullSeq || chordIds;
    const unique = uniqueSeq(chordIds);

    LearnGraph.wrapLearnHeader(
      container,
      '📍 גרף לימוד — דיאגרמת בוזוקי',
      'כמו בגיטרה אמיתית · מיתרים ↕ · סריגים ↔ · נקודות = איפה ללחוץ'
    );

    const panel = LearnGraph.focusPanel(container);
    const lfpV = panel.querySelector('.lfp-visual');
    const lfpH = panel.querySelector('.lfp-hint');
    const lfpLabel = panel.querySelector('.lfp-label');
    const boardHost = document.createElement('div');
    boardHost.className = 'chord-fb-host';
    container.appendChild(boardHost);
    container.insertBefore(boardHost, panel);

    function showChord(id, stepNum) {
      const ch = getChord(id);
      lfpLabel.textContent = stepNum ? `שלב ${stepNum} — ${id}` : id;
      boardHost.innerHTML = '';
      drawChordBoard(boardHost, id, { compact: false });
      lfpV.innerHTML = `<span class="lfp-big-name">${chordFocusText(id)}</span>`;
      lfpH.textContent = LearnGraph.shapeHint(id);
      panel.classList.add('show');

      container.querySelectorAll('.chord-map-item').forEach(el => {
        el.classList.toggle('active', el.dataset.chord === id);
      });
      container.querySelectorAll('.chord-tl-step').forEach(el => {
        el.classList.toggle('active', el.dataset.chord === id && el.dataset.step === String(stepNum));
      });
    }

    const mapLabel = document.createElement('p');
    mapLabel.className = 'learn-seq-label';
    mapLabel.textContent = 'כל האקורדים — לחצו לראות סריג + מיתר:';
    container.appendChild(mapLabel);

    const row = document.createElement('div');
    row.className = 'chord-map-row learn-chord-row';
    row.dir = 'ltr';
    unique.forEach((id, i) => {
      const box = document.createElement('button');
      box.type = 'button';
      box.className = 'chord-map-item';
      box.dataset.chord = id;
      const ch = getChord(id);
      box.innerHTML = `<div class="cm-diag"></div><b>${id}</b><small>${ch?.he || ''}</small>`;
      ChordDiagram.draw(box.querySelector('.cm-diag'), id, { noLabel: true });
      box.addEventListener('click', () => showChord(id, null));
      row.appendChild(box);
      if (i < unique.length - 1) {
        const arr = document.createElement('span');
        arr.className = 'chord-map-arrow';
        arr.textContent = '→';
        row.appendChild(arr);
      }
    });
    container.appendChild(row);

    const tlLabel = document.createElement('p');
    tlLabel.className = 'learn-seq-label';
    tlLabel.textContent = opts.song ? '🎵 סדר השיר במשחק:' : 'סדר האקורדים במשחק:';
    container.appendChild(tlLabel);

    const timeline = document.createElement('div');
    timeline.className = 'chord-timeline learn-timeline';
    timeline.dir = 'ltr';
    seq.forEach((id, i) => {
      const step = document.createElement('button');
      step.type = 'button';
      step.className = 'chord-tl-step' + (i === 0 ? ' first' : '');
      step.dataset.chord = id;
      step.dataset.step = i + 1;
      step.innerHTML = `<b>${i + 1}</b><span>${id}</span>`;
      step.addEventListener('click', () => showChord(id, i + 1));
      timeline.appendChild(step);
    });
    container.appendChild(timeline);

    const hint = document.createElement('p');
    hint.className = 'chord-map-hint';
    hint.textContent = opts.song
      ? 'למדו את הגרף ↑ · ▶ שחק — האקורדים יזרמו כמו בשיר'
      : 'למדו את הגרף ↑ · ▶ שחק — כל אקורד מגיע לקו';
    container.appendChild(hint);

    showChord(seq[0], 1);
    return { showChord };
  }

  function drawPlay(container, chordIds, opts = {}) {
    container.innerHTML = '';
    container.className = 'chord-map play-learn-inline';
    const seq = opts.fullSeq || chordIds;

    const head = document.createElement('div');
    head.className = 'pli-head';
    head.innerHTML = '<span class="pli-title">📍 גרף לימוד</span><span class="pli-sub">דיאגרמת בוזוקי · לחצו אקורד</span>';
    container.appendChild(head);

    const focus = document.createElement('div');
    focus.className = 'pli-focus pli-focus-chord';
    focus.innerHTML = '<b class="pli-chord-id">—</b><span class="pli-chord-pos"></span><p class="pli-chord-hint"></p>';
    container.appendChild(focus);
    const idEl = focus.querySelector('.pli-chord-id');
    const posEl = focus.querySelector('.pli-chord-pos');
    const hintEl = focus.querySelector('.pli-chord-hint');

    const timeline = document.createElement('div');
    timeline.className = 'pli-seq pli-chord-seq';
    timeline.dir = 'ltr';
    container.appendChild(timeline);

    const boardHost = document.createElement('div');
    boardHost.className = 'chord-fb-host chord-fb-play';
    container.appendChild(boardHost);

    function showStep(idx, live) {
      const id = seq[idx];
      if (!id) return;
      const ch = getChord(id);
      boardHost.innerHTML = '';
      drawChordBoard(boardHost, id, { compact: true });
      idEl.textContent = id + (ch?.he ? ' · ' + ch.he : '');
      posEl.textContent = chordFocusText(id);
      hintEl.textContent = LearnGraph.shapeHint(id);
      focus.classList.add('show');
      timeline.querySelectorAll('.chord-tl-step').forEach((el, i) => {
        el.classList.toggle('active', i === idx);
        el.classList.toggle('live', live && i === idx);
      });
    }

    seq.forEach((id, i) => {
      const step = document.createElement('button');
      step.type = 'button';
      step.className = 'chord-tl-step pli-chip' + (i === 0 ? ' first' : '');
      step.dataset.i = i;
      step.innerHTML = `<b>${i + 1}</b><span>${id}</span>`;
      step.addEventListener('click', () => showStep(i, false));
      timeline.appendChild(step);
    });

    showStep(0, false);
    return { showStep, highlightStep: showStep };
  }

  return { drawProgression, drawPlay, uniqueSeq };
})();
