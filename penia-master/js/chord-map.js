/* מפת אקורדים — התקדמות לפני המשחק */
const ChordMap = (() => {
  function uniqueSeq(ids) {
    return ids.filter((id, i) => i === 0 || id !== ids[i - 1]);
  }

  function drawProgression(container, chordIds, opts = {}) {
    container.innerHTML = '';
    container.className = 'chord-map';
    const seq = opts.fullSeq || chordIds;
    const unique = uniqueSeq(chordIds);

    const title = document.createElement('p');
    title.className = 'chord-map-title';
    title.textContent = opts.title || 'מפת האקורדים — לחץ ▶ שחק כשמוכנים';
    container.appendChild(title);

    /* מפה ויזואלית — אקורדים ייחודיים */
    const row = document.createElement('div');
    row.className = 'chord-map-row';
    row.dir = 'ltr';
    unique.forEach((id, i) => {
      const box = document.createElement('div');
      box.className = 'chord-map-item';
      const ch = getChord(id);
      box.innerHTML = `<div class="cm-diag"></div><b>${id}</b><small>${ch?.he || ''}</small>`;
      ChordDiagram.draw(box.querySelector('.cm-diag'), id, { noLabel: true });
      row.appendChild(box);
      if (i < unique.length - 1) {
        const arr = document.createElement('span');
        arr.className = 'chord-map-arrow';
        arr.textContent = '→';
        row.appendChild(arr);
      }
    });
    container.appendChild(row);

    /* ציר זמן — הסדר המלא במשחק */
    const timeline = document.createElement('div');
    timeline.className = 'chord-timeline';
    timeline.dir = 'ltr';
    seq.forEach((id, i) => {
      const step = document.createElement('span');
      step.className = 'chord-tl-step' + (i === 0 ? ' first' : '');
      step.innerHTML = `<b>${i + 1}</b>${id}`;
      timeline.appendChild(step);
    });
    container.appendChild(timeline);

    const hint = document.createElement('p');
    hint.className = 'chord-map-hint';
    hint.textContent = opts.song
      ? '🎵 מצב שיר — האקורדים יזרמו בזמן · פרטו על הבוזוקי כשכל אקורד מגיע לקו'
      : 'כל אקורד מגיע לקו הזהב — החזיקו את הצורה ופרטו ↓ בזמן';
    container.appendChild(hint);
  }

  return { drawProgression, uniqueSeq };
})();
