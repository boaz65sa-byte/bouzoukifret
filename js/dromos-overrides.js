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
  /** מפתח "כל הטוניקות" — לתבניות אצבוע שהמשתמש סימן כמתעתקות נקי בין טוניקות */
  function keyOfInvariant(dromosId, posBase, stringMode) {
    return `${dromosId}|*|${posBase}|${stringMode}`;
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

  /** {span, path[]} או null — path נשמר יחסית לטוניקה (intervalIdx), לא fret/midi אבסולוטיים */
  function getInvariant(dromosId, posBase, stringMode, span) {
    if (!dromosId) return null;
    const rec = loadStore()[keyOfInvariant(dromosId, posBase, stringMode)];
    if (!rec || !Array.isArray(rec.path)) return null;
    if (span != null && rec.span != null && rec.span !== span) return null;
    return rec;
  }

  /** שומר תבנית "כל הטוניקות" — קלט: path כבר מחושב יחסית לעוגן-השורש
   *  ({courseOffset, intervalIdx, degree, finger}[], ראו FretboardScale.saveInvariantOverride).
   *  מודול זה נשאר "טיפש" (storage בלבד) — חישוב היחסיות הוא באחריות fretboard-scale.js. */
  function setInvariant(dromosId, posBase, stringMode, span, relPath) {
    if (!dromosId) return;
    const store = loadStore();
    store[keyOfInvariant(dromosId, posBase, stringMode)] = {
      span,
      path: relPath.map(p => ({
        courseOffset: p.courseOffset, intervalIdx: p.intervalIdx, degree: p.degree, finger: p.finger,
      })),
      savedAt: Date.now(),
    };
    saveStore(store);
  }

  function has(dromosId, rootPc, posBase, stringMode) {
    const store = loadStore();
    return !!store[keyOf(dromosId, rootPc, posBase, stringMode)]
      || !!store[keyOfInvariant(dromosId, posBase, stringMode)];
  }
  /** 'exact' | 'invariant' | null — לתיוג הבאדג' ("✓ מותאם" מול "✓ מותאם (כל הטוניקות)") */
  function getKind(dromosId, rootPc, posBase, stringMode) {
    const store = loadStore();
    if (store[keyOf(dromosId, rootPc, posBase, stringMode)]) return 'exact';
    if (store[keyOfInvariant(dromosId, posBase, stringMode)]) return 'invariant';
    return null;
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
  function resetInvariant(dromosId, posBase, stringMode) {
    const store = loadStore();
    delete store[keyOfInvariant(dromosId, posBase, stringMode)];
    saveStore(store);
  }
  function resetAll() { localStorage.removeItem(STORAGE); }

  return {
    get, set, has, hasAny, reset, resetAll,
    getInvariant, setInvariant, getKind, resetInvariant,
  };
})();
