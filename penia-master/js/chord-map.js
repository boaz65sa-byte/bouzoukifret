/* גרף לימוד אקורדים — איפה ללחוץ */
const ChordMap = (() => {
  function uniqueSeq(ids) {
    return ids.filter((id, i) => i === 0 || id !== ids[i - 1]);
  }

  function drawProgression(container, chordIds, opts = {}) {
    container.innerHTML = '';
    container.className = 'chord-map learn-graph-box';
    const seq = opts.fullSeq || chordIds;
    const unique = uniqueSeq(chordIds);

    LearnGraph.wrapLearnHeader(
      container,
      '📍 גרף לימוד — איפה ללחוץ',
      'כל ריבוע = אקורד · הנקודות הצהובות = איפה ללחוץ · לחצו על שלב בציר הזמן'
    );

    const panel = LearnGraph.focusPanel(container);
    const lfpV = panel.querySelector('.lfp-visual');
    const lfpH = panel.querySelector('.lfp-hint');
    const lfpLabel = panel.querySelector('.lfp-label');

    function showChord(id, stepNum) {
      const ch = getChord(id);
      lfpLabel.textContent = stepNum ? `שלב ${stepNum} — ${id}` : id;
      lfpV.innerHTML = '';
      const diagWrap = document.createElement('div');
      diagWrap.className = 'lfp-chord-big';
      lfpV.appendChild(diagWrap);
      ChordDiagram.draw(diagWrap, id, { large: true, noLabel: true });
      const nameEl = document.createElement('p');
      nameEl.className = 'lfp-chord-name';
      nameEl.textContent = (ch?.he || id) + (ch?.role ? ' · ' + ch.role : '');
      lfpV.appendChild(nameEl);
      lfpH.textContent = LearnGraph.shapeHint(id);
      panel.classList.add('show');

      container.querySelectorAll('.chord-map-item').forEach(el => {
        el.classList.toggle('active', el.dataset.chord === id);
      });
      container.querySelectorAll('.chord-tl-step').forEach(el => {
        el.classList.toggle('active', el.dataset.chord === id && el.dataset.step === String(stepNum));
      });
    }

    /* מפת אקורדים ייחודיים */
    const mapLabel = document.createElement('p');
    mapLabel.className = 'learn-seq-label';
    mapLabel.textContent = 'כל האקורדים בשלב — לחצו לראות איפה ללחוץ:';
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

    /* ציר זמן — הסדר במשחק */
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
      ? 'למדו את הגרף ↑ · ▶ שחק — האקורדים יזרמו כמו בשיר · פרטו ↓ בזמן'
      : 'למדו את הגרף ↑ · ▶ שחק — כל אקורד מגיע לקו · החזיקו צורה ופרטו ↓';
    container.appendChild(hint);

    showChord(seq[0], 1);
    return { showChord };
  }

  return { drawProgression, uniqueSeq };
})();
