/* ספריית אקורדים — ברירת מחדל + עריכה / הוספה (localStorage) */
const ChordLibrary = (() => {
  const STORAGE = 'bouzouki-chord-library-v1';
  const COURSE_LABELS = ['D', 'A', 'F', 'C'];
  const COURSE_HE = ['רה', 'לה', 'פה', 'דו'];

  const DEFAULT_CHORDS = [
    { id: 'D Major', name: 'D Major', he: 'רה מז׳ור', frets: [0, 2, 3, 2], cat: 'greek', desc: 'אקורד בסיסי לרמבטיקו' },
    { id: 'D Minor', name: 'D Minor', he: 'רה מינור', frets: [0, 2, 2, 1], cat: 'greek', desc: 'לשירי זייבקיקו' },
    { id: 'D7', name: 'D7', he: 'רה 7', frets: [0, 2, 1, 2], cat: 'greek', desc: 'דומיננטה יוונית' },
    { id: 'Am', name: 'Am', he: 'לה מינור', frets: [5, 0, 0, 0], cat: 'greek', desc: 'אקורד מפתח יווני' },
    { id: 'Em', name: 'Em', he: 'מי מינור', frets: [2, 2, 0, 0], cat: 'greek', desc: 'שכיח ברמבטיקו' },
    { id: 'A7', name: 'A7', he: 'לה 7', frets: [5, 0, 2, 0], cat: 'greek', desc: 'סיום יווני' },
    { id: 'Gm', name: 'Gm', he: 'סול מינור', frets: [5, 5, 3, 3], cat: 'greek', desc: 'צליל עצוב' },
    { id: 'F', name: 'F', he: 'פה מז׳ור', frets: [3, 0, 0, 1], cat: 'greek', desc: 'שכיח' },
    { id: 'C', name: 'C', he: 'דו מז׳ור', frets: [10, 9, 10, 0], cat: 'greek', desc: 'בסיסי' },
    { id: 'Bb', name: 'Bb', he: 'סי♭', frets: [8, 7, 8, 6], cat: 'greek', desc: 'לשירים יווניים' },
    { id: 'E7', name: 'E7', he: 'מי 7', frets: [2, 2, 2, 3], cat: 'greek', desc: 'רמבטיקו אופייני' },
    { id: 'Hijaz D', name: 'Hijaz D', he: 'חיג׳אז רה', frets: [0, 1, 4, 1], cat: 'oriental', desc: 'מקאם חיג׳אז' },
    { id: 'Bayat D', name: 'Bayat D', he: 'ביאת רה', frets: [0, 2, 2, 0], cat: 'oriental', desc: 'מקאם ביאת' },
    { id: 'Nahawand', name: 'Nahawand', he: 'נהוואנד', frets: [0, 2, 2, 1], cat: 'oriental', desc: 'מקאם נהוואנד' },
    { id: 'Kurd D', name: 'Kurd D', he: 'כורד רה', frets: [0, 1, 2, 1], cat: 'oriental', desc: 'מקאם כורד' },
    { id: 'Saba', name: 'Saba', he: 'סבא', frets: [0, 1, 2, 0], cat: 'oriental', desc: 'מקאם סבא' },
    { id: 'Rast', name: 'Rast', he: 'ראסט', frets: [0, 2, 3, 0], cat: 'oriental', desc: 'מקאם ראסט' },
    { id: 'Nikriz', name: 'Nikriz', he: 'ניקריז', frets: [0, 1, 4, 2], cat: 'oriental', desc: 'מקאם ניקריז' },
  ];

  function loadStore() {
    try {
      const raw = localStorage.getItem(STORAGE);
      if (!raw) return { overrides: {}, custom: [] };
      const p = JSON.parse(raw);
      return {
        overrides: p.overrides && typeof p.overrides === 'object' ? p.overrides : {},
        custom: Array.isArray(p.custom) ? p.custom : [],
      };
    } catch (e) {
      return { overrides: {}, custom: [] };
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE, JSON.stringify(store));
    syncToGlobalChords();
  }

  function normFretInput(v) {
    if (v === '' || v == null) return null;
    const s = String(v).trim().toLowerCase();
    if (s === 'x' || s === '×' || s === '-') return null;
    const n = parseInt(s, 10);
    if (Number.isNaN(n) || n < 0 || n > NUM_FRETS) return null;
    return n;
  }

  function parseFretsRow(row) {
    return row.map(normFretInput);
  }

  function fretsToShape(frets) {
    return frets.map(f => (f === null || f === 'x') ? 'x' : f);
  }

  function cloneChord(c) {
    return { ...c, frets: [...c.frets] };
  }

  function getAll() {
    const store = loadStore();
    const map = new Map();
    DEFAULT_CHORDS.forEach(c => {
      const base = cloneChord(c);
      const ov = store.overrides[c.id];
      map.set(c.id, ov ? { ...base, ...cloneChord(ov), id: c.id, builtin: true, overridden: true } : { ...base, builtin: true });
    });
    store.custom.forEach(c => {
      if (!c.id) return;
      map.set(c.id, { ...cloneChord(c), custom: true });
    });
    return [...map.values()];
  }

  function getById(id) {
    return getAll().find(c => c.id === id) || null;
  }

  function syncToGlobalChords() {
    if (typeof CHORDS === 'undefined') return;
    getAll().forEach(c => {
      CHORDS[c.name] = { shape: fretsToShape(c.frets), he: c.he || c.name };
    });
  }

  function upsertFromForm(data, editingId) {
    const frets = parseFretsRow(data.frets);
    const chord = {
      id: editingId || data.id || ('custom-' + Date.now()),
      name: (data.name || '').trim() || 'Custom',
      he: (data.he || '').trim() || data.name || 'אקורד',
      frets,
      cat: data.cat || 'custom',
      desc: (data.desc || '').trim(),
    };
    const store = loadStore();
    const isBuiltin = DEFAULT_CHORDS.some(d => d.id === chord.id);
    if (isBuiltin || store.overrides[chord.id]) {
      store.overrides[chord.id] = chord;
    } else if (editingId && store.custom.some(c => c.id === editingId)) {
      if (editingId !== chord.id) {
        store.custom = store.custom.filter(c => c.id !== editingId);
        store.custom.push(chord);
      } else {
        store.custom = store.custom.map(c => c.id === editingId ? chord : c);
      }
    } else {
      store.custom.push(chord);
    }
    saveStore(store);
    return chord;
  }

  function remove(id) {
    const store = loadStore();
    if (DEFAULT_CHORDS.some(d => d.id === id)) {
      delete store.overrides[id];
    } else {
      store.custom = store.custom.filter(c => c.id !== id);
    }
    saveStore(store);
  }

  function resetAll() {
    localStorage.removeItem(STORAGE);
    syncToGlobalChords();
  }

  function resetOne(id) {
    const store = loadStore();
    delete store.overrides[id];
    store.custom = store.custom.filter(c => c.id !== id);
    saveStore(store);
  }

  function exportJson() {
    return JSON.stringify(loadStore(), null, 2);
  }

  function importJson(text) {
    const p = JSON.parse(text);
    if (!p || typeof p !== 'object') throw new Error('invalid');
    saveStore({
      overrides: p.overrides && typeof p.overrides === 'object' ? p.overrides : {},
      custom: Array.isArray(p.custom) ? p.custom : [],
    });
  }

  function fretSummary(frets) {
    return frets.map((f, i) => COURSE_LABELS[i] + ':' + (f === null ? 'x' : f)).join(' ');
  }

  /* --- עורך UI --- */
  let editingId = null;
  let previewHandler = null;

  function bindEditor(containerSel) {
    const root = document.querySelector(containerSel);
    if (!root) return;

    root.innerHTML = `
      <div class="cl-toolbar">
        <button type="button" class="btn gold" id="cl-add">➕ הוסף אקורד</button>
        <button type="button" class="btn" id="cl-export">ייצוא JSON</button>
        <label class="btn cl-import-label">ייבוא JSON<input type="file" id="cl-import" accept="application/json,.json" hidden></label>
        <button type="button" class="btn" id="cl-reset-all">איפוס ספרייה</button>
      </div>
      <p class="hint cl-hint">סריגים לפי מיתרים: D (רה) · A (לה) · F (פה) · C (דו). x או ריק = מושתק. שינויים נשמרים במחשב ומשמשיכים גם במשחק ובתרגילים.</p>
      <div class="cl-layout">
        <div class="cl-list" id="cl-list"></div>
        <form class="cl-form card" id="cl-form">
          <h3 id="cl-form-title">עריכת אקורד</h3>
          <div class="cl-field"><label>שם (אנגלית)</label><input id="cl-name" required placeholder="D7"></div>
          <div class="cl-field"><label>שם בעברית</label><input id="cl-he" placeholder="רה ספטים"></div>
          <div class="cl-frets-row">
            ${COURSE_LABELS.map((l, i) => `
              <div class="cl-field cl-fret-field">
                <label>${l} (${COURSE_HE[i]})</label>
                <input class="cl-fret" data-i="${i}" inputmode="numeric" placeholder="0 / x">
              </div>`).join('')}
          </div>
          <div class="cl-field"><label>קטגוריה</label>
            <select id="cl-cat">
              <option value="greek">יווני</option>
              <option value="oriental">מזרחי</option>
              <option value="custom">שלי</option>
            </select>
          </div>
          <div class="cl-field"><label>הערה</label><input id="cl-desc" placeholder="לשירי רמבטיקו…"></div>
          <div class="cl-form-actions">
            <button type="submit" class="btn gold">💾 שמור</button>
            <button type="button" class="btn" id="cl-preview">🔊 תצוגה</button>
            <button type="button" class="btn" id="cl-delete">🗑 מחק</button>
            <button type="button" class="btn" id="cl-cancel">ביטול</button>
          </div>
          <p class="cl-status" id="cl-status"></p>
        </form>
      </div>`;

    $('#cl-add').addEventListener('click', () => openForm(null));
    $('#cl-cancel').addEventListener('click', () => { editingId = null; $('#cl-form').classList.remove('open'); setStatus(''); });
    $('#cl-delete').addEventListener('click', () => {
      if (!editingId) return;
      if (!confirm('למחוק את האקורד?')) return;
      remove(editingId);
      editingId = null;
      renderList();
      $('#cl-form').classList.remove('open');
      setStatus('נמחק.', 'ok');
    });
    $('#cl-reset-all').addEventListener('click', () => {
      if (!confirm('לאפס את כל האקורדים המערכו והמותאמים?')) return;
      resetAll();
      editingId = null;
      renderList();
      setStatus('הספרייה אופסה לברירת מחדל.', 'ok');
    });
    $('#cl-export').addEventListener('click', () => {
      const blob = new Blob([exportJson()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bouzouki-chords.json';
      a.click();
    });
    $('#cl-import').addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          importJson(reader.result);
          renderList();
          setStatus('יובא בהצלחה.', 'ok');
        } catch (err) {
          setStatus('קובץ לא תקין.', 'err');
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    });
    $('#cl-preview').addEventListener('click', previewFormChord);
    $('#cl-form').addEventListener('submit', e => {
      e.preventDefault();
      const data = readForm();
      if (!data.name) { setStatus('נא שם באנגלית.', 'err'); return; }
      const saved = upsertFromForm(data, editingId);
      editingId = saved.id;
      renderList();
      openForm(saved);
      setStatus('נשמר ✓', 'ok');
    });

    renderList();
  }

  function setStatus(msg, kind) {
    const el = $('#cl-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'cl-status' + (kind ? ' ' + kind : '');
  }

  function readForm() {
    const frets = $$('.cl-fret').map(inp => inp.value);
    return {
      name: $('#cl-name').value.trim(),
      he: $('#cl-he').value.trim(),
      frets,
      cat: $('#cl-cat').value,
      desc: $('#cl-desc').value.trim(),
    };
  }

  function openForm(chord) {
    editingId = chord ? chord.id : null;
    $('#cl-form-title').textContent = chord ? 'עריכת אקורד' : 'אקורד חדש';
    $('#cl-name').value = chord ? chord.name : '';
    $('#cl-he').value = chord ? chord.he : '';
    $$('.cl-fret').forEach((inp, i) => {
      const f = chord ? chord.frets[i] : null;
      inp.value = f === null ? 'x' : String(f);
    });
    $('#cl-cat').value = chord ? chord.cat : 'custom';
    $('#cl-desc').value = chord ? (chord.desc || '') : '';
    $('#cl-delete').style.display = chord ? '' : 'none';
    $('#cl-form').classList.add('open');
    setStatus('');
  }

  function previewFormChord() {
    const data = readForm();
    AudioEngine.ensureCtx();
    data.frets.forEach((v, ci) => {
      const f = normFretInput(v);
      if (f !== null) setTimeout(() => AudioEngine.pluckCourse(ci, f, 0, 0.5), ci * 70);
    });
  }

  function renderList() {
    const list = $('#cl-list');
    if (!list) return;
    list.innerHTML = '';
    const items = getAll().sort((a, b) => {
      const ca = a.cat.localeCompare(b.cat);
      return ca !== 0 ? ca : a.he.localeCompare(b.he, 'he');
    });
    items.forEach(c => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'cl-item' + (c.id === editingId ? ' active' : '');
      const badge = c.custom ? 'שלי' : c.overridden ? 'עודכן' : 'מובנה';
      row.innerHTML = `<div class="cl-item-name">${c.he}</div>
        <div class="cl-item-sub">${c.name} · ${fretSummary(c.frets)}</div>
        <span class="cl-badge">${badge}</span>`;
      row.addEventListener('click', () => openForm(c));
      list.appendChild(row);
    });
    if (!items.length) {
      list.innerHTML = '<p class="hint">אין אקורדים — הוסיפו אחד חדש.</p>';
    }
  }

  function onPreview(fn) { previewHandler = fn; }

  function init() {
    syncToGlobalChords();
    bindEditor('#mc-chord-editor');
  }

  return {
    init, getAll, getById, syncToGlobalChords, upsertFromForm, remove, resetAll,
    fretsToShape, DEFAULT_CHORDS, onPreview, renderList,
  };
})();
