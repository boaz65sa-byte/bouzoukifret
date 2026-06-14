/* גרף לימוד בתוך המשחק */
const PlayLearnGraph = (() => {
  let ctrl = null;

  function mount(container, level) {
    if (!container || !level) return null;
    destroy();
    const gt = level.gameType || 'pick';
    if (gt === 'note' && typeof ModeDiagram !== 'undefined') {
      ctrl = ModeDiagram.drawPlay(container, ModeDiagram.uniqueScaleNotes(level.notes), {
        playNotes: level.notes,
        title: (level.dromos || level.name) + ' · מיתר רה',
      });
    } else if (gt === 'chord' && typeof ChordMap !== 'undefined') {
      ctrl = ChordMap.drawPlay(container, level.chordSeq, {
        fullSeq: level.chordSeq,
        song: !!level.song,
      });
    }
    return ctrl;
  }

  function highlight(idx, live = false) {
    if (ctrl?.highlightStep) ctrl.highlightStep(idx, live);
    else if (ctrl?.showStep) ctrl.showStep(idx, live);
  }

  function destroy() {
    ctrl = null;
  }

  return { mount, highlight, destroy };
})();
