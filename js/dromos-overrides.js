/* ============================================================
   DromosOverrides — פוזיציות/אצבוע מותאמים-אישית לדרומוי, נשמר
   כמו "מילון": dromosId+root+פוזיציה+מיתרים -> מסלול ידני שהמשתמש
   ערך על הפרטבורד, במקום החישוב האוטומטי.
   ============================================================ */
'use strict';

const DromosOverrides = (() => {
  const STORAGE = 'bouzouki-position-overrides-v1';

  function normPc(pc) { return ((pc % 12) + 12) % 12; }
  function keyOf(dromosId, rootPc, posBase, stringMode) {
    return `${dromosId}|${normPc(rootPc)}|${posBase}|${stringMode}`;
  }

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return {};
      const p = JSON.parse(raw);
      return (p && typeof p === 'object') ? p : {};
    } catch { return {}; }
  }
  function saveStore(store) {
    try { localStorage.setItem(STORAGE, JSON.stringify(store)); } catch { /* quota/noop */ }
  }

  /** מחזיר {span, path[], savedAt} או null */
  function get(dromosId, rootPc, posBase, stringMode, span) {
    if (!dromosId) return null;
    const rec = loadStore()[keyOf(dromosId, rootPc, posBase, stringMode)];
    if (!rec || !Array.isArray(rec.path)) return null;
    if (span != null && rec.span != null && rec.span !== span) return null;
    return rec;
  }

  function set(dromosId, rootPc, posBase, stringMode, span, path) {
    if (!dromosId) return;
    const store = loadStore();
    store[keyOf(dromosId, rootPc, posBase, stringMode)] = {
      span,
      path: path.map(p => ({
        ci: p.ci, fret: p.fret, midi: p.midi,
        degree: p.degree, positionBase: p.positionBase, finger: p.finger,
      })),
      savedAt: Date.now(),
    };
    saveStore(store);
  }

  function has(dromosId, rootPc, posBase, stringMode) {
    return !!loadStore()[keyOf(dromosId, rootPc, posBase, stringMode)];
  }
  function hasAny(dromosId) {
    if (!dromosId) return false;
    return Object.keys(loadStore()).some(k => k.startsWith(dromosId + '|'));
  }
  function reset(dromosId, rootPc, posBase, stringMode) {
    const store = loadStore();
    delete store[keyOf(dromosId, rootPc, posBase, stringMode)];
    saveStore(store);
  }
  function resetAll() { localStorage.removeItem(STORAGE); }

  return { get, set, has, hasAny, reset, resetAll };
})();
