/* ספריית אקורדים — ברירת מחדל + עריכה / הוספה (localStorage) */
const ChordLibrary = (() => {
  const STORAGE = 'bouzouki-chord-library-v2';
  /* סדר TUNING / TAB — מלמעלה למטה: D · A · F · C (קורסים 0–3) */
  const COURSE_LABELS = ['D', 'A', 'F', 'C'];
  const COURSE_HE = ['רה', 'לה', 'פה', 'דו'];

  /** shape ב-data.js / strumChord: [C, F, A, D] מהבס לגבוה */
  function shapeToFrets(shape) {
    return shape.slice().reverse().map(f =>
      f === 'x' || f === null || f === undefined ? null : Number(f)
    );
  }

  function fretsToShape(frets) {
    return frets.slice().reverse().map(f => (f === null || f === 'x') ? 'x' : f);
  }

  function mkFromShape(id, name, he, shape, cat, desc) {
    return { id, name, he, frets: shapeToFrets(shape), cat, desc };
  }

  const GREEK_KEYS = ['D', 'Dm', 'D7', 'Am', 'Em', 'A7', 'Gm', 'F', 'C', 'Bb', 'E7'];
  const DEFAULT_CHORDS = [
    ...GREEK_KEYS.map(k => mkFromShape(
      k, k, CHORDS[k].he, CHORDS[k].shape, 'greek',
      k === 'D' ? 'אקורד בסיסי לרמבטיקו' :
      k === 'Dm' ? 'לשירי זייבקיקו' :
      k === 'D7' ? 'דומיננטה יוונית' : ''
    )),
    mkFromShape('Hijaz D', 'Hijaz D', 'חיג׳אז רה', [1, 4, 1, 0], 'oriental', 'מקאם חיג׳אז'),
    mkFromShape('Bayat D', 'Bayat D', 'ביאת רה', [0, 2, 2, 0], 'oriental', 'מקאם ביאת'),
    mkFromShape('Nahawand', 'Nahawand', 'נהוואנד', [1, 2, 2, 0], 'oriental', 'מקאם נהוואנד'),
    mkFromShape('Kurd D', 'Kurd D', 'כורד רה', [1, 2, 1, 0], 'oriental', 'מקאם כורד'),
    mkFromShape('Saba', 'Saba', 'סבא', [0, 2, 1, 0], 'oriental', 'מקאם סבא'),
    mkFromShape('Rast', 'Rast', 'ראסט', [0, 3, 2, 0], 'oriental', 'מקאם ראסט'),
    mkFromShape('Nikriz', 'Nikriz', 'ניקריז', [2, 4, 1, 0], 'oriental', 'מקאם ניקריז'),
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

  /** שומר סריגים חדשים לאקורד קיים/חדש מתוך אינטראקציה על הדיאגרמה (בלי הטופס הטקסטואלי) —
   *  שומר he/cat/desc קיימים כדי לא לאבד אותם. frets בסדר D,A,F,C (כמו shapeToFrets). */
  function setFret(chordName, frets) {
    const existing = getById(chordName);
    const data = {
      id: chordName,
      name: chordName,
      he: existing?.he || (typeof CHORDS !== 'undefined' && CHORDS[chordName]?.he) || chordName,
      frets,
      cat: existing?.cat || 'custom',
      desc: existing?.desc || '',
    };
    return upsertFromForm(data, chordName);
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
  let editorRoot = null;
  const q = (s) => (editorRoot || document).querySelector(s);
  const qa = (s) => [...(editorRoot || document).querySelectorAll(s)];

  function bindEditor(containerSel) {
    editorRoot = document.querySelector(containerSel);
    if (!editorRoot) return;
    editorRoot.innerHTML = `
      <div class="cl-toolbar">
        <button type="button" class="btn gold" id="cl-add">➕ הוסף אקורד</button>
        <button type="button" class="btn" id="cl-export">ייצוא JSON</button>
        <label class="btn cl-import-label">ייבוא JSON<input type="file" id="cl-import" accept="application/json,.json" hidden></label>
        <button type="button" class="btn" id="cl-reset-all">איפוס ספרייה</button>
      </div>
      <p class="hint cl-hint">סריגים לפי TAB (מלמעלה למטה): <b>D</b> רה · <b>A</b> לה · <b>F</b> פה · <b>C</b> דו (בס). x = מושתק. זהה ללוח הסריגים ולכיוונון CFAD של הבוזוקי.</p>
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

    q('#cl-add').addEventListener('click', () => openForm(null));
    q('#cl-cancel').addEventListener('click', () => { editingId = null; q('#cl-form').classList.remove('open'); setStatus(''); });
    q('#cl-delete').addEventListener('click', () => {
      if (!editingId) return;
      if (!confirm('למחוק את האקורד?')) return;
      remove(editingId);
      editingId = null;
      renderList();
      q('#cl-form').classList.remove('open');
      setStatus('נמחק.', 'ok');
    });
    q('#cl-reset-all').addEventListener('click', () => {
      if (!confirm('לאפס את כל האקורדים המערכו והמותאמים?')) return;
      resetAll();
      editingId = null;
      renderList();
      setStatus('הספרייה אופסה לברירת מחדל.', 'ok');
    });
    q('#cl-export').addEventListener('click', () => {
      const blob = new Blob([exportJson()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'bouzouki-chords.json';
      a.click();
    });
    q('#cl-import').addEventListener('change', e => {
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
    q('#cl-preview').addEventListener('click', previewFormChord);
    q('#cl-form').addEventListener('submit', e => {
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
    const el = q('#cl-status');
    if (!el) return;
    el.textContent = msg;
    el.className = 'cl-status' + (kind ? ' ' + kind : '');
  }

  function readForm() {
    const frets = qa('.cl-fret').map(inp => inp.value);
    return {
      name: q('#cl-name').value.trim(),
      he: q('#cl-he').value.trim(),
      frets,
      cat: q('#cl-cat').value,
      desc: q('#cl-desc').value.trim(),
    };
  }

  function openForm(chord) {
    editingId = chord ? chord.id : null;
    q('#cl-form-title').textContent = chord ? 'עריכת אקורד' : 'אקורד חדש';
    q('#cl-name').value = chord ? chord.name : '';
    q('#cl-he').value = chord ? chord.he : '';
    qa('.cl-fret').forEach((inp, i) => {
      const f = chord ? chord.frets[i] : null;
      inp.value = f === null ? 'x' : String(f);
    });
    q('#cl-cat').value = chord ? chord.cat : 'custom';
    q('#cl-desc').value = chord ? (chord.desc || '') : '';
    q('#cl-delete').style.display = chord ? '' : 'none';
    q('#cl-form').classList.add('open');
    setStatus('');
  }

  function previewFormChord() {
    const data = readForm();
    AudioEngine.ensureCtx();
    const frets = parseFretsRow(data.frets);
    AudioEngine.strumChord(fretsToShape(frets), 'd', 0, 0.55);
  }

  function renderList() {
    const list = q('#cl-list');
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
    init, getAll, getById, syncToGlobalChords, upsertFromForm, setFret, remove, resetAll,
    shapeToFrets, fretsToShape, DEFAULT_CHORDS, onPreview, renderList,
  };
})();
