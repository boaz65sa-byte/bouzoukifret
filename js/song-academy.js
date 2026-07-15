/* ============================================================
   SongAcademy — אקדמיית השירים 📀
   לומדים אקורדים ודרומוסים מתוך שירים מוכרים.
   כל שיר = מסע בן 4 תחנות: סקירה → אקורדים → דרומוס → תרגול.
   "כל שיר יווני = דרומוס + אקורדים + פראזה."
   ============================================================ */
'use strict';

const SongAcademy = (() => {

  const D_OPEN = 74; // מיתר D פתוח (D5)
  const TUNE = [48, 53, 57, 62]; // C3 F3 A3 D4 — מיתרי הבוזוקי לפי CHORDS.shape
  const NN = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

  /* ---------- דרומוסים ----------
     צבע וטקסט פדגוגי בלבד. הסולם עצמו נלקח מ-DROMOI שב-data.js — מקור אמת יחיד,
     כדי שהאקדמיה ומסך הדרומוסים לא יוכלו ללמד שני סולמות שונים לאותו שם. */
  const DROMOS_STYLE = {
    rast:      { color:'#e3b341', fp:'כמו מז׳ור אך עם 3 ו-7 רכות — בהיר, אצילי, "שמשי".', tell:'רזולוציה עליזה, כמעט מערבית.' },
    hitzaz:    { color:'#e0884a', fp:'שנייה מוגברת בין מי♭ לפה# (סריג 1→4) — הצליל ה"מזרחי".', tell:'הקפיצה מי♭→פה#.' },
    ousak:     { color:'#7b9ee0', fp:'שנייה רכה (מי♭) נשענת מטה אל הטוניקה — קינה עמוקה.', tell:'אנחה כלפי מטה אל הבסיס.' },
    minore:    { color:'#9d8ec0', fp:'מינור עם רגישה מוגבהת (דו#) — הדומיננטה A7 היא הצליל שלו.', tell:'המתח של דו#→רה.' },
    kiourdi:   { color:'#6b8caf', fp:'מינור עם סקסטה טבעית (סי בקר) — דוריאן, רך ומואר יותר ממינורה.', tell:'הסי הבקר — מינור "לא עצוב".' },
    niavent:   { color:'#c265a0', fp:'מינור עם סול# (סריג 6) — שנייה מוגברת דרמטית.', tell:'סול# בתוך מינור — מתח תיאטרלי.' },
    pireotikos:{ color:'#e05f5f', fp:'חיג׳אז עם קוורטה מוגברת (סול#) — הצליל של פיראוס.', tell:'הסול# החד בתוך חיג׳אז.' },
    matzore:   { color:'#5fc88f', fp:'מז׳ור פשוט ובהיר — בלי שניות מוגברות, בלי צלילים רכים.', tell:'נשמע "מערבי" לגמרי — חגיגי וישיר.' },
  };

  /** ממזג את הצבע/הטקסט המקומי עם הסולם הקנוני מ-data.js */
  const DR = (() => {
    const out = {};
    for (const [id, style] of Object.entries(DROMOS_STYLE)) {
      const canon = (typeof DROMOI !== 'undefined') ? DROMOI.find(d => d.id === id) : null;
      out[id] = canon
        ? { ...style, he: canon.nameHe, frets: canon.intervals.concat(12) }
        : { ...style, he: id, frets: [0, 2, 3, 5, 7, 8, 10, 12] };
    }
    return out;
  })();

  /* ---------- ספריית השירים (לפי סדר לימוד) ---------- */
  const SONGS = [
    {
      id:'frankosyriani', name:'Frankosyriani', he:'פרנקוסיריאני', greek:'Φραγκοσυριανή',
      artist:'Markos Vamvakaris', era:'1935', diff:1,
      dromos:'rast', root:'רה',
      chords:['D','G','A7'], prog:'D – G – A7 – D',
      phrase:{ frets:[0,2,4,5,4,2,0], desc:'פראזה בהירה ועולה — הפתיחה האייקונית' },
      why:'הדרומוס הקרוב ביותר למז׳ור המערבי — כניסה עדינה ללימוד. השיר הראשון הקלאסי.',
      sections:[{label:'כל השיר', dromos:'rast'}]
    },
    {
      id:'pedia-pirea', name:'Ta Pedia tou Pirea', he:'ילדי פיראוס', greek:'Τα Παιδιά του Πειραιά',
      artist:'M. Hadjidakis', era:'1960', diff:1,
      dromos:'matzore', root:'רה',
      chords:['D','A7'], prog:'D – A7 – D (סיבוב Bm)',
      phrase:{ frets:[0,2,4,7,4,2,0], desc:'פזמון מקפץ ובהיר' },
      why:'מז׳ור עליז עם שני אקורדים בלבד — מושלם לתרגול מעבר D↔A7.',
      sections:[{label:'כל השיר', dromos:'matzore'}]
    },
    {
      id:'antilaloune', name:'Antilaloune ta Vouna', he:'ההרים מהדהדים', greek:'Αντιλαλούνε τα Βουνά',
      artist:'מסורתי', era:'—', diff:2,
      dromos:'matzore', root:'רה',
      chords:['D','G','A7'], prog:'D – G – A7 – D',
      phrase:{ frets:[0,2,4,5,7,9,11,12], desc:'מז׳ור פתוח וגאה — המנון זאימבקיקו' },
      why:'מז׳ורה פתוח ובהיר — שלושה אקורדים בסיסיים. שימו לב: השיר הוא על פיראוס, אך אינו בדרומוס פיריאוטיקוס (שהוא חיג׳אז עם קוורטה מוגברת).',
      sections:[{label:'כל השיר', dromos:'matzore'}]
    },
    {
      id:'zorba', name:'Zorba (Syrtaki)', he:'זורבה (סירטאקי)', greek:'Συρτάκι',
      artist:'M. Theodorakis', era:'1964', diff:2,
      dromos:'hitzaz', root:'רה',
      chords:['D','A7'], prog:'D – A7 – D (מאיץ)',
      phrase:{ frets:[0,1,4,5,7,8,7,5], desc:'האוסטינטו המטפס המפורסם' },
      why:'חיג׳אז שמאיץ בהדרגה — מראה איך דרומוס אחד מחזיק מתח לאורך כל השיר.',
      sections:[{label:'כל השיר', dromos:'hitzaz'}]
    },
    {
      id:'ena-karavi', name:'Ena Karavi apo ti Chio', he:'ספינה מחיוס', greek:'Ένα Καράβι από τη Χίο',
      artist:'מסורתי נסיוטיקו', era:'—', diff:2,
      dromos:'rast', root:'רה',
      chords:['D','A7'], prog:'D – A7 – D',
      phrase:{ frets:[0,2,4,5,7,5,4,2,0], desc:'מנגינת אי בהירה וקופצנית' },
      why:'שיר אי (nisiotiko) פשוט ובהיר — חיזוק ראסט/מז׳ור עם שני אקורדים.',
      sections:[{label:'כל השיר', dromos:'rast'}]
    },
    {
      id:'misirlou', name:'Misirlou', he:'מיסירלו', greek:'Μισιρλού',
      artist:'מסורתי / N. Roubanis', era:'1927', diff:2,
      dromos:'hitzaz', root:'רה',
      chords:['D','A7'], prog:'D – A7 – D – Gm – A7 – D',
      phrase:{ frets:[0,1,4,1,4,5,4,1], desc:'הניגון המחליק במורד החיג׳אז — בטרמולו' },
      why:'השנייה המוגברת (מי♭→פה#) הכי מזוהה במוזיקה — "שיעור ה-וואו" של החיג׳אז.',
      sections:[{label:'כל השיר', dromos:'hitzaz'}]
    },
    {
      id:'polis-hamam', name:'Mes stis Polis to Hamam', he:'בחמאם של העיר', greek:'Μες στης Πόλης το Χαμάμ',
      artist:'מסורתי סמירנאי', era:'1930s', diff:2,
      dromos:'hitzaz', root:'רה',
      chords:['D','A7'], prog:'D – Eb – A7 – D',
      phrase:{ frets:[0,1,4,5,4,1,0], desc:'פראזת חיג׳אז סמירנאית' },
      why:'חיג׳אז שני — אותו דרומוס, שיר אחר. ככה הדפוס מתקבע באוזן.',
      sections:[{label:'כל השיר', dromos:'hitzaz'}]
    },
    {
      id:'apopse', name:'Apopse Kanis Den Kimatai', he:'הלילה איש לא ישן', greek:'Απόψε Κανείς Δεν Κοιμάται',
      artist:'M. Theodorakis', era:'1960s', diff:3,
      dromos:'ousak', root:'לה',
      chords:['Am','Dm','E7'], prog:'Am – Dm – E7 – Am',
      phrase:{ frets:[7,8,7,5,3,1,0], desc:'אנחה יורדת אל הטוניקה' },
      why:'מבוא למשפחת הקינה (אוסאק). שימו לב לשנייה הרכה שנשענת מטה.',
      sections:[{label:'כל השיר', dromos:'ousak'}]
    },
    {
      id:'strose-stroma', name:'Strose to Stroma sou', he:'הציעי את מצעך', greek:'Στρώσε το Στρώμα σου',
      artist:'M. Hadjidakis', era:'1950s', diff:2,
      dromos:'minore', root:'לה',
      chords:['Am','E7'], prog:'Am – E7 – Am',
      phrase:{ frets:[0,2,3,5,3,2,0], desc:'מינור פשוט עם שני אקורדים' },
      why:'שני אקורדים בלבד (Am↔E7) — מצוין לאימון המעבר הקלאסי של הרבטיקו.',
      sections:[{label:'כל השיר', dromos:'minore'}]
    },
    {
      id:'apo-kseno-topo', name:'Apo Kseno Topo', he:'מארץ זרה', greek:'Από Ξένο Τόπο',
      artist:'סמירנאיקו מסורתי', era:'1920s', diff:3,
      dromos:'hitzaz', root:'רה',
      chords:['D','A7'], prog:'D – A7 – D',
      phrase:{ frets:[0,1,4,5,4,1,0], desc:'"הנערה מארץ זרה" — פראזת חיג׳אז קלאסית' },
      why:'מהשירים הסמירנאיים האהובים — חיג׳אז טהור ומזוהה.',
      sections:[{label:'כל השיר', dromos:'hitzaz'}]
    },
    {
      id:'kaimos', name:'Kaimos', he:'קאימוס (כאב)', greek:'Καημός',
      artist:'V. Tsitsanis', era:'1950s', diff:3,
      dromos:'hitzaz', root:'רה',
      chords:['D','A7','Gm'], prog:'D – A7 – D – Gm – A7 – D',
      phrase:{ frets:[0,1,4,5,7,8,7,4,1,0], desc:'זאימבקיקו חיג׳אז עמוק' },
      why:'אחד הזאימבקיקו היפים — חיג׳אז בהקשר איטי ורגשי.',
      sections:[{label:'כל השיר', dromos:'hitzaz'}]
    },
    {
      id:'chaidari', name:'Chaidari', he:'חאידארי', greek:'Χαϊδάρι',
      artist:'V. Tsitsanis', era:'1940s', diff:3,
      dromos:'hitzaz', root:'רה',
      chords:['D','Gm','A7'], prog:'D – Gm – A7 – D',
      phrase:{ frets:[4,5,4,1,0,1,4], desc:'פראזה סובבת סביב המי♭→פה#' },
      why:'חיג׳אז של טסיטסאניס — מחזק את הזיהוי בהקשר זאימבקיקו.',
      sections:[{label:'כל השיר', dromos:'hitzaz'}]
    },
    {
      id:'limanakia', name:'Ta Limanakia', he:'הנמלים הקטנים', greek:'Τα Λιμανάκια',
      artist:'מסורתי', era:'—', diff:3,
      dromos:'ousak', root:'לה',
      chords:['Am','Dm','E7'], prog:'Am – Dm – E7 – Am',
      phrase:{ frets:[7,8,7,5,3,1,0], desc:'אנחת אוסאק יורדת' },
      why:'אוסאק נוסף לחיזוק זיהוי משפחת הקינה.',
      sections:[{label:'כל השיר', dromos:'ousak'}]
    },
    {
      id:'pente-ellines', name:'Pente Ellines ston Adi', he:'חמישה יוונים בשאול', greek:'Πέντε Έλληνες στον Άδη',
      artist:'M. Theodorakis', era:'1960s', diff:3,
      dromos:'hitzaz', root:'רה',
      chords:['D','Gm','A7'], prog:'D – Gm – A7 – D',
      phrase:{ frets:[7,8,7,4,1,0], desc:'ירידה דרמטית במורד החיג׳אז' },
      why:'חיג׳אז דרמטי — מחזק את זיהוי השנייה המוגברת בהקשר אחר.',
      sections:[{label:'כל השיר', dromos:'hitzaz'}]
    },
    {
      id:'drapetsona', name:'Drapetsona', he:'דראפטסונה', greek:'Δραπετσώνα',
      artist:'M. Theodorakis', era:'1960', diff:3,
      dromos:'kiourdi', root:'לה',
      chords:['Am','Dm','E7'], prog:'Am – Dm – E7 – Am',
      phrase:{ frets:[7,8,7,5,3,2,0], desc:'מינור עדין וזורם' },
      why:'קיורדי מול אוסאק — אותם אקורדים, צבע מעט שונה (השישית). אוזן מבחינה בעדינות.',
      sections:[{label:'כל השיר', dromos:'kiourdi'}]
    },
    {
      id:'minore-avgis', name:'To Minore tis Avgis', he:'המינור של השחר', greek:'Το Μινόρε της Αυγής',
      artist:'S. Peristeris', era:'1930s', diff:3,
      dromos:'minore', root:'רה',
      chords:['Dm','Gm','A7'], prog:'Dm – Gm – A7 – Dm',
      phrase:{ frets:[0,2,3,5,3,2,0], desc:'מליסמה של שחר' },
      why:'מינור פשוט (דוריאן) — עוגן לפני שעוברים למודולציות.',
      sections:[{label:'כל השיר', dromos:'minore'}]
    },
    {
      id:'mana-ellas', name:'Mana mou Ellas', he:'אמא שלי יוון', greek:'Μάνα μου Ελλάς',
      artist:'M. Theodorakis', era:'1972', diff:3,
      dromos:'minore', root:'רה',
      chords:['Dm','Gm','A7'], prog:'Dm – Gm – A7 – Dm',
      phrase:{ frets:[0,2,3,5,7,5,3,2,0], desc:'מינור גאה ונוגע' },
      why:'מינורה (דוריאן) בהקשר המנוני — עוגן נוסף למינור הפשוט.',
      sections:[{label:'כל השיר', dromos:'minore'}]
    },
    {
      id:'archontissa', name:'Archontissa', he:'הגבירה', greek:'Αρχόντισσα',
      artist:'M. Hiotis', era:'1950s', diff:3,
      dromos:'rast', root:'רה',
      chords:['D','G','A7'], prog:'D – G – A7 – D',
      phrase:{ frets:[0,2,4,5,7,9,7,5], desc:'ראסט בהיר ואלגנטי' },
      why:'ראסט אלגנטי של חיוטיס — מז׳ור יווני קלאסי.',
      sections:[{label:'כל השיר', dromos:'rast'}]
    },
    {
      id:'zeibekiko-anazito', name:"Zeibekiko (S'anazito)", he:'זאימבקיקו (מחפש אותך)', greek:'Σ’ αναζητώ στη Σαλονίκη',
      artist:'Th. Mikroutsikos', era:'1991', diff:4,
      dromos:'minore', root:'לה',
      chords:['Am','Dm','E7'], prog:'Am – Dm – E7 – Am',
      phrase:{ frets:[7,9,10,9,7,5,3,2,0], desc:'מינור מודרני ודרמטי' },
      why:'זאימבקיקו מודרני אהוב — מינורה במשקל 9/4 רגשי.',
      sections:[{label:'כל השיר', dromos:'minore'}]
    },
    {
      id:'xarama', name:'Harama', he:'חאראמה (שחר)', greek:'Χάραμα',
      artist:'M. Hiotis', era:'1950s', diff:5,
      dromos:'rast', root:'רה',
      chords:['D','G','A7','Bm'], prog:'D – G – A7 – D (וירטואוזי)',
      phrase:{ frets:[0,2,4,5,7,9,10,12], desc:'ראסט מהיר וטכני — אתגר' },
      why:'ראסט בקצב וירטואוזי — אתגר מתקדם לאחר שהבסיס יציב.',
      sections:[{label:'כל השיר', dromos:'rast'}]
    },
    {
      id:'roza', name:'Roza', he:'רוזה', greek:'Ρόζα',
      artist:'M. Loizos', era:'1972', diff:4,
      dromos:'ousak', root:'רה',
      chords:['Dm','Gm','A7'], prog:'Dm – Gm – A7 (פזמון למז׳ור)',
      phrase:{ frets:[0,1,3,5,3,1,0], desc:'בית אוסאק נוגה, פזמון נפתח למז׳ור' },
      why:'מודולציה בינונית: בית באוסאק (קינה), פזמון נפתח למז׳ור יחסי — ניגוד רגשי.',
      sections:[
        {label:'בית', dromos:'ousak'},
        {label:'פזמון', dromos:'rast'}
      ]
    },
    {
      id:'synnefiasmeni', name:'Synnefiasmeni Kyriaki', he:'יום ראשון מעונן', greek:'Συννεφιασμένη Κυριακή',
      artist:'V. Tsitsanis', era:'1948', diff:4,
      dromos:'minore', root:'רה',
      chords:['Dm','Gm','A7'], prog:'Dm – Gm – A7 (פנייה ל-ניאוונט)',
      phrase:{ frets:[0,2,3,6,3,2,0], desc:'הרמת הניאוונט (סול#) בגשר — שינוי הדרומוס' },
      why:'שינוי דרומוס אמיתי בתוך שיר: הבית במינורה, הגשר נפנה לניאוונט. שמעו את ה"הרמה".',
      sections:[
        {label:'בית', dromos:'minore'},
        {label:'גשר', dromos:'niavent'},
        {label:'חזרה לבית', dromos:'minore'}
      ]
    },
  ];

  /* ---------- מצב ---------- */
  let activeSong = null, activeTab = 'overview';
  let mic = { stream:null, ctx:null, analyser:null, timer:null };
  const BEST_KEY = 'song-academy-cpm';

  /* ---------- אודיו: נגינת אקורד ---------- */
  function chordToMidiNotes(name) {
    if (typeof CHORDS === 'undefined') return [];
    const key = (typeof ChordTooltip !== 'undefined') ? ChordTooltip.resolveKey(name) : name;
    const ch = CHORDS[key];
    if (!ch) return [];
    const notes = [];
    ch.shape.forEach((fret, i) => { if (fret !== 'x') notes.push(TUNE[i] + fret); });
    return notes;
  }
  function playChord(name) {
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    const t = AudioEngine.ctx.currentTime;
    chordToMidiNotes(name).forEach((m, i) => AudioEngine.pluckMidi(m, t + i * 0.05, 0.55));
  }
  function playFrets(frets, gap=340) {
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    const t = AudioEngine.ctx.currentTime + 0.05;
    frets.forEach((f,i) => AudioEngine.pluckMidi(D_OPEN + f, t + i*(gap/1000), 0.5));
  }

  let _phraseAnim = null;

  /** ממפה shape [C,F,A,D] לקורסים 3→0 */
  function _shapeFingerings(shape) {
    const out = [];
    shape.forEach((f, i) => {
      if (f === 'x') return;
      out.push({ ci: 3 - i, f: Number(f) });
    });
    return out;
  }

  function _mountFretboard(svgId) {
    const el = document.getElementById(svgId);
    if (!el || typeof drawFretboard !== 'function') return null;
    el.innerHTML = '';
    return el;
  }

  let _saScalePanel = null;

  /** סולם דרומוס — פוזיציה גיטרתית */
  function drawScaleBoard(svgId, scaleFrets, rootPc = 2, intervals = null) {
    const el = document.getElementById(svgId);
    if (!el) return null;
    const wrap = el.parentElement;
    if (typeof FretboardScale !== 'undefined' && FretboardScale.mountDromosScalePanel && wrap) {
      wrap.innerHTML = '';
      const panelOpts = intervals?.length
        ? { intervals, rootPc }
        : { frets: scaleFrets, rootPc };
      _saScalePanel = FretboardScale.mountDromosScalePanel(wrap, panelOpts);
      return _saScalePanel;
    }
    const svg = _mountFretboard(svgId);
    if (!svg) return;
    const set = new Set(scaleFrets);
    const pcs = typeof FretboardScale !== 'undefined'
      ? FretboardScale.pcsFromDFrets(scaleFrets)
      : new Set(scaleFrets.map(f => (TUNING[0].midi + f) % 12));
    drawFretboard(svg, (ci, f, midi) => {
      if (!pcs.has(midi % 12)) return null;
      const isRoot = (midi % 12) === (TUNING[0].midi % 12);
      return { type: isRoot ? 'root' : 'note', label: NOTE_NAMES[midi % 12] };
    });
  }

  /** פראזה — סולם מלא על כל המיתרים, מסלול ממוספר על D */
  function drawPhraseBoard(svgId, phraseFrets, scaleFrets, activeIdx = -1) {
    const el = document.getElementById(svgId);
    const wrap = el?.parentElement;
    if (typeof FretboardScale !== 'undefined' && wrap) {
      const activeFret = activeIdx >= 0 ? phraseFrets[activeIdx] : undefined;
      FretboardScale.mount(wrap, {
        frets: scaleFrets || phraseFrets,
        phraseFrets,
        activeCi: activeFret != null ? 0 : undefined,
        activeFret,
        pathLabels: true,
      });
      return;
    }
    const svg = _mountFretboard(svgId);
    if (!svg) return;
    drawFretboard(svg, (ci, f) => {
      if (ci !== 0) return null;
      const idx = phraseFrets.indexOf(f);
      if (idx < 0) return null;
      const active = idx === activeIdx;
      return {
        type: (f === 0 || active) ? 'root' : 'note',
        label: active ? '▶' : String(idx + 1),
      };
    });
  }

  /** אקורד — כל נקודות האחיזה */
  function drawChordBoard(svgId, chordName) {
    const svg = _mountFretboard(svgId);
    if (!svg || typeof CHORDS === 'undefined') return;
    const key = (typeof ChordTooltip !== 'undefined') ? ChordTooltip.resolveKey(chordName) : chordName;
    const ch = CHORDS[key];
    if (!ch) return;
    const fingers = _shapeFingerings(ch.shape);
    drawFretboard(svg, (ci, f) => {
      const hit = fingers.find(p => p.ci === ci && p.f === f);
      if (!hit) return null;
      return { type: f === 0 ? 'root' : 'note', label: String(f) };
    });
    if (typeof FretboardMirror !== 'undefined' && svg.parentElement) {
      const wrap = svg.parentElement;
      if (!wrap.querySelector('.fb-mirror-btn')) {
        FretboardMirror.mountToggle(wrap, { onChange: () => drawChordBoard(svgId, chordName) });
      }
    }
  }

  function playPhraseAnimated(frets, scaleFrets, gap = 320) {
    if (typeof scaleFrets === 'number') {
      gap = scaleFrets;
      scaleFrets = null;
    }
    if (_phraseAnim) { clearInterval(_phraseAnim.timer); _phraseAnim = null; }
    if (typeof AudioEngine === 'undefined') return;
    AudioEngine.ensureCtx();
    let i = 0;
    const step = () => {
      if (i >= frets.length) {
        drawPhraseBoard('sa-fb-phrase', frets, scaleFrets, -1);
        if (_phraseAnim) { clearInterval(_phraseAnim.timer); _phraseAnim = null; }
        return;
      }
      drawPhraseBoard('sa-fb-phrase', frets, scaleFrets, i);
      const f = frets[i];
      AudioEngine.pluckMidi(D_OPEN + f, AudioEngine.ctx.currentTime + 0.02, 0.55);
      if (typeof flashDot === 'function') {
        const svg = document.getElementById('sa-fb-phrase');
        if (svg) flashDot(svg, 0, f);
      }
      i++;
    };
    step();
    const scaledGap = typeof PlaybackSpeed !== 'undefined' ? PlaybackSpeed.scaleGap(gap) : gap;
    _phraseAnim = { timer: setInterval(step, scaledGap) };
  }

  /* ---------- מיקרופון + זיהוי כרומה ---------- */
  async function ensureMic() {
    if (mic.stream) return true;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      mic.stream = await navigator.mediaDevices.getUserMedia({ audio:{ echoCancellation:false, noiseSuppression:false, autoGainControl:false } });
      mic.ctx = new (window.AudioContext||window.webkitAudioContext)();
      const src = mic.ctx.createMediaStreamSource(mic.stream);
      mic.analyser = mic.ctx.createAnalyser();
      mic.analyser.fftSize = 8192;
      AudioEngine.micBoost(src).connect(mic.analyser);
      return true;
    } catch { return false; }
  }
  function stopMic() {
    if (mic.timer) { clearInterval(mic.timer); mic.timer = null; }
    if (mic.stream) { mic.stream.getTracks().forEach(t=>t.stop()); mic.stream = null; }
    if (mic.ctx) { mic.ctx.close(); mic.ctx = null; }
    mic.analyser = null;
  }

  function liveChroma() {
    const a = mic.analyser, sr = mic.ctx.sampleRate;
    const bins = new Float32Array(a.frequencyBinCount);
    a.getFloatFrequencyData(bins); // dB
    const chroma = new Float32Array(12);
    const nyq = sr/2, n = bins.length;
    let energy = 0;
    for (let i=1;i<n;i++){
      const freq = i*nyq/n;
      if (freq<70 || freq>2200) continue;
      const mag = Math.pow(10, bins[i]/20);
      energy += mag;
      const pc = ((Math.round(69+12*Math.log2(freq/440))%12)+12)%12;
      chroma[pc] += mag;
    }
    let mx=0; for (let i=0;i<12;i++) mx=Math.max(mx,chroma[i]);
    if (mx>0) for (let i=0;i<12;i++) chroma[i]/=mx;
    return { chroma, energy };
  }

  function chordTemplate(name) {
    const m = name.match(/^([A-G][#b]?)(.*)$/);
    if (!m) return null;
    let root = NN.indexOf(m[1].replace('b',''));
    if (root < 0) { const map={A:9,B:11,C:0,D:2,E:4,F:5,G:7}; root=map[m[1][0]]??0; if(m[1].includes('#'))root++; if(m[1].includes('b'))root--; root=((root%12)+12)%12; }
    const suf = m[2];
    const iv = suf.startsWith('m') && !suf.startsWith('maj') ? (suf.includes('7')?[0,3,7,10]:[0,3,7])
             : suf.includes('7') ? [0,4,7,10] : [0,4,7];
    const t = new Float32Array(12);
    iv.forEach(x => t[(root+x)%12] = 1);
    return t;
  }
  function matchScore(chroma, tmpl) {
    let dot=0, na=0, nb=0;
    for (let i=0;i<12;i++){ dot+=chroma[i]*tmpl[i]; na+=chroma[i]*chroma[i]; nb+=tmpl[i]*tmpl[i]; }
    return (na&&nb) ? dot/Math.sqrt(na*nb) : 0;
  }
  /** מחזיר את האקורד הקרוב ביותר מרשימת מועמדים, או null אם חלש/לא ברור */
  function detectChord(chroma, energy, candidates) {
    if (energy < 0.5) return null;
    let best=null, bestS=-1, second=-1;
    for (const c of candidates) {
      const s = matchScore(chroma, chordTemplate(c));
      if (s>bestS) { second=bestS; bestS=s; best=c; }
      else if (s>second) second=s;
    }
    if (bestS < 0.55 || bestS - second < 0.05) return null;
    return best;
  }

  /* ---------- רינדור: ספריית שירים ---------- */
  function renderHome() {
    const app = document.getElementById('song-academy-app');
    if (!app) return;
    app.innerHTML = `
      <p class="sa-intro">לומדים אקורדים ודרומוסים <b>מתוך שירים אמיתיים</b> — לא בעל-פה. כל שיר מלמד את האקורדים שהוא צריך, את הדרומוס שלו, ואת הפראזה. סדורים מהקל לקשה.
      <br><small style="color:var(--text-dim)">אקורדים נפוצים — ייתכנו וריאציות לפי ביצוע/סולם.</small></p>
      <div class="sa-song-grid">
        ${SONGS.map((s,i) => {
          const dr = DR[s.dromos];
          return `<button class="sa-song-card" data-id="${s.id}" style="border-color:${dr.color}">
            <div class="sa-song-num">${i+1}</div>
            <div class="sa-song-main">
              <div class="sa-song-name">${s.he} <span class="sa-song-greek">${s.greek}</span></div>
              <div class="sa-song-sub">${s.artist} · ${s.era}</div>
              <div class="sa-song-tags">
                <span class="sa-tag" style="border-color:${dr.color};color:${dr.color}">${dr.he}</span>
                <span class="sa-tag">${s.chords.length} אקורדים</span>
                ${s.sections.length>1?'<span class="sa-tag sa-tag-mod">שינוי דרומוס</span>':''}
                <span class="sa-diff">${'●'.repeat(s.diff)}${'○'.repeat(5-s.diff)}</span>
              </div>
            </div>
          </button>`;
        }).join('')}
      </div>`;
    app.querySelectorAll('.sa-song-card').forEach(c => c.addEventListener('click', () => openSong(c.dataset.id)));
  }

  function openSong(id) {
    activeSong = SONGS.find(s => s.id===id);
    activeTab = 'overview';
    renderSong();
  }

  const TABS = [
    { id:'overview', icon:'📖', label:'סקירה' },
    { id:'chords',   icon:'🎸', label:'אקורדים' },
    { id:'dromos',   icon:'🧭', label:'דרומוס' },
    { id:'practice', icon:'🔁', label:'תרגול' },
  ];

  function renderSong() {
    stopMic(); stopLoop(); stopStem();
    if (_phraseAnim) { clearInterval(_phraseAnim.timer); _phraseAnim = null; }
    const app = document.getElementById('song-academy-app');
    if (!app || !activeSong) return;
    const s = activeSong, dr = DR[s.dromos];
    app.innerHTML = `
      <div class="sa-song-head">
        <button class="sa-back" id="sa-back">← כל השירים</button>
        <div class="sa-song-title" style="color:${dr.color}">${s.he} <span class="sa-song-greek">${s.greek}</span></div>
        <div class="sa-song-sub">${s.artist} · ${s.era} · דרומוס ${dr.he}</div>
      </div>
      <div class="sa-tabs">
        ${TABS.map(t => `<button class="sa-tab ${t.id===activeTab?'active':''}" data-tab="${t.id}" style="${t.id===activeTab?`border-color:${dr.color}`:''}">
          <span>${t.icon}</span><span>${t.label}</span></button>`).join('')}
      </div>
      <div class="sa-tab-body" id="sa-tab-body"></div>`;
    app.querySelector('#sa-back').addEventListener('click', () => { stopMic(); renderHome(); });
    app.querySelectorAll('.sa-tab').forEach(t => t.addEventListener('click', () => { stopMic(); activeTab=t.dataset.tab; renderSong(); }));
    ({ overview:renderOverview, chords:renderChords, dromos:renderDromos, practice:renderPractice }[activeTab])();
  }

  /* ----- תחנה: סקירה ----- */
  function renderOverview() {
    const s = activeSong, dr = DR[s.dromos], body = document.getElementById('sa-tab-body');
    body.innerHTML = `
      <div class="sa-overview-card" style="border-color:${dr.color}">
        <div class="sa-ov-line">🎸 <b>השיר הזה דורש ${s.chords.length} אקורדים:</b> ${s.chords.join(' · ')}</div>
        <div class="sa-ov-line">🧭 <b>דרומוס:</b> ${dr.he} (שורש ${s.root})</div>
        <div class="sa-ov-line">🎵 <b>רצף:</b> <span dir="ltr">${s.prog}</span></div>
        ${s.sections.length>1?`<div class="sa-ov-line sa-ov-mod">⚡ <b>שינוי דרומוס בשיר</b> — לכו לתחנת "דרומוס" לראות איפה</div>`:''}
      </div>
      <div class="sa-why">💡 ${s.why}</div>
      <div class="sa-ov-fp" style="border-color:${dr.color}">
        <b>טביעת האצבע של ${dr.he}:</b> ${dr.fp}
      </div>
      <div class="sa-fb-section">
        <h3 class="sa-fb-title">תצוגה מהירה — פראזה + סולם על כל המיתרים</h3>
        <p class="sa-hint">${s.phrase.desc}</p>
        <div class="sa-fb-wrap" dir="ltr"><svg id="sa-fb-overview" class="fretboard"></svg></div>
      </div>
      <div class="sa-btn-row">
        <button class="btn gold" id="sa-ov-next">בואו נלמד את האקורדים →</button>
        <button class="btn" id="sa-ov-yt">▶️ נגן מ-YouTube</button>
      </div>
      <div id="sa-yt"></div>`;
    drawPhraseBoard('sa-fb-overview', s.phrase.frets, dr.frets);
    document.getElementById('sa-ov-next').addEventListener('click', () => { activeTab='chords'; renderSong(); });
    document.getElementById('sa-ov-yt').addEventListener('click', () => showYouTube(s));
  }

  function showYouTube(s) {
    const box = document.getElementById('sa-yt');
    if (!box) return;
    const q = encodeURIComponent(`${s.greek} ${s.name} μπουζούκι`);
    const results = `https://www.youtube.com/results?search_query=${q}`;
    box.innerHTML = `
      <div class="sa-yt-wrap">
        <iframe class="sa-yt-frame" src="https://www.youtube-nocookie.com/embed?listType=search&list=${q}"
          title="${s.he}" loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>
      <a class="sa-yt-link" href="${results}" target="_blank" rel="noopener">לא נטען? פתחו חיפוש ב-YouTube ↗</a>`;
    box.scrollIntoView({ block:'nearest', behavior:'smooth' });
  }

  /* ----- תחנה: אקורדים + אימון מעבר בדקה ----- */
  function renderChords() {
    const s = activeSong, body = document.getElementById('sa-tab-body');
    body.innerHTML = `
      <div class="sa-chord-row" id="sa-chord-row">
        ${s.chords.map(c => `<div class="sa-chord-slot"><div class="sa-chord-diag" data-chord="${c}"></div></div>`).join('')}
      </div>
      <p class="sa-hint">לחצו על אקורד לשמיעה ולראות איפה לאחוז על הלוח. הסוד: לא לשנן צורות — לתרגל את ה<b>מעבר</b> בין שניים.</p>

      <div class="sa-fb-section">
        <h3 class="sa-fb-title">לוח סריגים — אחיזת האקורד</h3>
        <div class="sa-fb-wrap" dir="ltr"><svg id="sa-fb-chord" class="fretboard"></svg></div>
        <p class="sa-hint">🟡 = סריג פתוח · 🔵 = לחיצה · D למעלה, C למטה · לחצו על נקודה לשמיעה</p>
      </div>

      <div class="sa-drill" style="margin-top:14px">
        <div class="sa-drill-title">⏱️ אימון המעבר בדקה</div>
        <p class="sa-hint">בחרו שני אקורדים, לחצו התחל, ופרטו ביניהם הלוך-ושוב במשך 60 שניות. המיקרופון סופר מעברים נקיים.</p>
        <div class="sa-drill-ctrls">
          <select id="sa-drill-a" class="ctrl-select">${s.chords.map(c=>`<option>${c}</option>`).join('')}</select>
          <span>↔</span>
          <select id="sa-drill-b" class="ctrl-select">${s.chords.map((c,i)=>`<option ${i===1?'selected':''}>${c}</option>`).join('')}</select>
          <button class="btn gold" id="sa-drill-go">▶ התחל (60 שנ׳)</button>
        </div>
        <div class="sa-drill-display">
          <div class="sa-drill-count" id="sa-drill-count">0</div>
          <div class="sa-drill-lbl">מעברים</div>
          <div class="sa-drill-time" id="sa-drill-time"></div>
        </div>
        <div class="sa-drill-best" id="sa-drill-best"></div>
        <div class="sa-meter"><span>🎤</span><div class="sa-vu"><div class="sa-vu-fill" id="sa-vu"></div></div><span id="sa-drill-now" class="sa-now"></span></div>
      </div>`;

    s.chords.forEach(c => {
      const el = body.querySelector(`.sa-chord-diag[data-chord="${c}"]`);
      if (el && typeof ChordTooltip!=='undefined') ChordTooltip.renderInto(el, c);
      if (el) el.parentElement.addEventListener('click', () => {
        playChord(c);
        drawChordBoard('sa-fb-chord', c);
      });
    });
    drawChordBoard('sa-fb-chord', s.chords[0]);
    showBest();
    document.getElementById('sa-drill-go').addEventListener('click', toggleDrill);
  }

  let drill = null;
  function showBest() {
    const el = document.getElementById('sa-drill-best');
    if (!el) return;
    const best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
    el.textContent = best ? `🏆 השיא שלך: ${best} מעברים בדקה` : '';
  }
  async function toggleDrill() {
    const btn = document.getElementById('sa-drill-go');
    if (drill) { endDrill(); return; }
    const ok = await ensureMic();
    if (!ok) { document.getElementById('sa-drill-now').textContent = 'אין מיקרופון'; return; }
    const A = document.getElementById('sa-drill-a').value;
    const B = document.getElementById('sa-drill-b').value;
    if (A === B) { document.getElementById('sa-drill-now').textContent = 'בחרו שני אקורדים שונים'; return; }
    drill = { A, B, count:0, last:null, t0:Date.now(), end:Date.now()+60000, stableC:null, stableN:0 };
    btn.textContent = '⏹ עצור';
    document.getElementById('sa-drill-count').textContent = '0';
    mic.timer = setInterval(() => drillTick(), 80);
  }
  function drillTick() {
    if (!drill) return;
    const remain = Math.max(0, drill.end - Date.now());
    document.getElementById('sa-drill-time').textContent = (remain/1000).toFixed(0) + ' שנ׳';
    if (remain <= 0) { endDrill(); return; }
    const { chroma, energy } = liveChroma();
    const vu = document.getElementById('sa-vu'); if (vu) vu.style.width = Math.min(100, energy*8) + '%';
    const det = detectChord(chroma, energy, [drill.A, drill.B]);
    // יציבות: דורש 2 פריימים זהים
    if (det && det === drill.stableC) drill.stableN++;
    else { drill.stableC = det; drill.stableN = det?1:0; }
    if (det && drill.stableN === 2) {
      const now = document.getElementById('sa-drill-now'); if (now) now.textContent = det;
      if (drill.last && det !== drill.last) {
        drill.count++;
        const cEl = document.getElementById('sa-drill-count');
        if (cEl) { cEl.textContent = drill.count; cEl.classList.add('pop'); setTimeout(()=>cEl.classList.remove('pop'),150); }
      }
      drill.last = det;
    }
  }
  function endDrill() {
    if (mic.timer) { clearInterval(mic.timer); mic.timer = null; }
    const btn = document.getElementById('sa-drill-go');
    if (btn) btn.textContent = '▶ התחל (60 שנ׳)';
    if (drill) {
      const cpm = drill.count;
      const best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
      if (cpm > best) localStorage.setItem(BEST_KEY, String(cpm));
      const now = document.getElementById('sa-drill-now');
      if (now) now.textContent = cpm > best ? `🎉 שיא חדש: ${cpm}!` : `סיימת: ${cpm} מעברים`;
      showBest();
    }
    drill = null;
  }

  /* ----- תחנה: דרומוס (ציר זמן + סולם + פראזה) ----- */
  function renderDromos() {
    const s = activeSong, body = document.getElementById('sa-tab-body');
    const multi = s.sections.length > 1;
    body.innerHTML = `
      <div class="sa-timeline" dir="ltr">
        ${s.sections.map((sec,i) => {
          const dr = DR[sec.dromos];
          return `<button class="sa-tl-seg" data-i="${i}" style="background:${dr.color}22;border-color:${dr.color};flex:${sec.label==='גשר'?1:2}">
            <span class="sa-tl-label">${sec.label}</span>
            <span class="sa-tl-dr" style="color:${dr.color}">${dr.he}</span>
          </button>`;
        }).join('')}
      </div>
      ${multi?'<p class="sa-hint">⚡ השיר עובר בין דרומוסים! לחצו על כל קטע כדי לשמוע ולראות את ההבדל.</p>':'<p class="sa-hint">לחצו על הקטע כדי ללמוד את הדרומוס.</p>'}
      <div id="sa-dromos-detail"></div>`;
    body.querySelectorAll('.sa-tl-seg').forEach(seg => seg.addEventListener('click', () => showDromosDetail(parseInt(seg.dataset.i,10))));
    showDromosDetail(0);
  }
  function showDromosDetail(i) {
    const s = activeSong, sec = s.sections[i], dr = DR[sec.dromos];
    document.querySelectorAll('.sa-tl-seg').forEach((el,j)=>el.classList.toggle('sel', j===i));
    const d = document.getElementById('sa-dromos-detail');
    if (!d) return;
    d.innerHTML = `
      <div class="sa-dr-card" style="border-color:${dr.color}">
        <div class="sa-dr-name" style="color:${dr.color}">${dr.he} <span style="font-size:13px;color:var(--text-dim)">(${sec.label})</span></div>
        <div class="sa-dr-fp">👂 <b>איך מזהים:</b> ${dr.fp}</div>
        <div class="sa-dr-tell">🔑 ${dr.tell}</div>

        <h3 class="sa-fb-title">לוח סריגים — סולם ${dr.he} על כל המיתרים</h3>
        <div class="sa-fb-wrap" dir="ltr"><svg id="sa-fb-scale" class="fretboard"></svg></div>
        <p class="sa-hint">כל הנקודות = צלילי הסולם בכל הפוזיציות · בחרו פוזיציה על הצוואר</p>
        ${tabSvg(dr.frets, dr.color)}

        <h3 class="sa-fb-title">פראזת השיר — מסלול ממוספר (מיתר D מודגש)</h3>
        <p class="sa-hint">${s.phrase.desc} · המספרים = סדר הנגינה</p>
        <div class="sa-fb-wrap" dir="ltr"><svg id="sa-fb-phrase" class="fretboard"></svg></div>

        <div class="sa-btn-row">
          <button class="btn gold" id="sa-dr-scale">🔊 שמעו את הסולם</button>
          <button class="btn" id="sa-dr-phrase">🎶 הפראזה של השיר (עם הדגשה)</button>
        </div>
      </div>`;
    const mainDr = (typeof DROMOI !== 'undefined') ? DROMOI.find(x => x.id === sec.dromos) : null;
    drawScaleBoard('sa-fb-scale', dr.frets, 2, mainDr?.intervals);
    drawPhraseBoard('sa-fb-phrase', s.phrase.frets, dr.frets);
    document.getElementById('sa-dr-scale').addEventListener('click', () => {
      const st = _saScalePanel?.getState?.() || { posBase: 0, stringMode: 4 };
      const ivs = mainDr?.intervals
        || (typeof FretboardScale !== 'undefined' ? FretboardScale.fretsOnDToIntervals(dr.frets) : []);
      if (typeof AudioEngine !== 'undefined' && AudioEngine.playModeScale && ivs.length) {
        AudioEngine.playModeScale(ivs, 2, {
          gapMs: 300, gain: 0.5, descending: true,
          posBase: st.posBase, stringMode: st.stringMode,
        });
      }
    });
    document.getElementById('sa-dr-phrase').addEventListener('click', () => playPhraseAnimated(s.phrase.frets, dr.frets, 320));
    if (typeof PlaybackSpeed !== 'undefined') {
      const btnRow = d.querySelector('.sa-btn-row');
      if (btnRow) PlaybackSpeed.mountChips(btnRow);
    }
  }

  function tabSvg(frets, color) {
    const w = Math.max(220, frets.length*38+30);
    const cells = frets.map((f,i) => {
      const x = 26 + i*38;
      return `<circle cx="${x}" cy="26" r="12" fill="${color}22" stroke="${color}"/><text x="${x}" y="31" text-anchor="middle" fill="${color}" font-size="12" font-weight="700">${f}</text>`;
    }).join('');
    return `<svg viewBox="0 0 ${w} 52" class="sa-tab-svg" dir="ltr">
      <line x1="12" y1="26" x2="${w-12}" y2="26" stroke="var(--line,#444)"/>
      <text x="4" y="30" fill="var(--text-dim)" font-size="10">D</text>${cells}</svg>`;
  }

  /* ----- תחנה: תרגול בלולאה ----- */
  let loopState = null;
  function renderPractice() {
    const s = activeSong, body = document.getElementById('sa-tab-body');
    const chords = (s.prog.match(/[A-G][#b]?(?:maj7|m7|maj|m|dim|sus4|sus2|7)?/g) || s.chords);
    body.innerHTML = `
      <p class="sa-hint">הלולאה ההרמונית של השיר. התחילו לאט, נגנו יחד, האיצו כשנקי. <b>הזיזו את היד השמאלית על הביט הריק</b> כדי שהאקורד יהיה מוכן בזמן.</p>
      <div class="sa-loop-chords" dir="ltr" id="sa-loop-chords">
        ${chords.map((c,i)=>`<span class="sa-loop-ch" id="sa-loop-${i}" data-chord="${c}">${c}</span>`).join('<span class="sa-loop-arr">→</span>')}
      </div>

      <div class="sa-fb-section">
        <h3 class="sa-fb-title">לוח סריגים — האקורד הפעיל</h3>
        <div class="sa-fb-wrap" dir="ltr"><svg id="sa-fb-practice" class="fretboard"></svg></div>
        <p class="sa-hint">הנקודות מראות <b>איפה ללחוץ</b> באקורד שמודגש בלולאה. D למעלה, C למטה.</p>
      </div>
      <div class="sa-loop-ctrls">
        <button class="btn small" id="sa-bpm-down">−</button>
        <span class="sa-bpm"><b id="sa-bpm">70</b> BPM</span>
        <button class="btn small" id="sa-bpm-up">+</button>
        <button class="btn gold" id="sa-loop-play">▶ נגן לולאה</button>
      </div>
      <p class="sa-hint" style="margin-top:6px">💡 כל אקורד = תיבה אחת. כשהמעבר נקי ב-70, העלו ל-85, ואז ל-100.</p>

      <div class="sa-stem" id="sa-stem">
        <div class="sa-stem-title">🎻 נגנו עם הבוזוקי המבודד</div>
        <p class="sa-hint">העלו הקלטה של השיר — מנוע ההפרדה יבודד את <b>הבוזוקי בלבד</b>, ותוכלו לנגן יחד איתו, לאט ובלולאה.</p>
        <div id="sa-stem-body"></div>
      </div>`;
    let bpm = 70;
    const setBpm = v => { bpm = Math.max(50, Math.min(140, v)); document.getElementById('sa-bpm').textContent = bpm; if (loopState) { stopLoop(); startLoop(chords, bpm); } };
    document.getElementById('sa-bpm-down').addEventListener('click', ()=>setBpm(bpm-5));
    document.getElementById('sa-bpm-up').addEventListener('click', ()=>setBpm(bpm+5));
    document.getElementById('sa-loop-play').addEventListener('click', () => {
      if (loopState) { stopLoop(); document.getElementById('sa-loop-play').textContent = '▶ נגן לולאה'; }
      else { startLoop(chords, bpm); document.getElementById('sa-loop-play').textContent = '⏹ עצור'; }
    });
    chords.forEach((c, i) => {
      const el = document.getElementById(`sa-loop-${i}`);
      if (el) el.addEventListener('click', () => { playChord(c); drawChordBoard('sa-fb-practice', c); });
    });
    drawChordBoard('sa-fb-practice', chords[0]);
    setupStemPanel();
  }

  /* ---------- הפרדת stems: נגינה עם בוזוקי מבודד ---------- */
  let stemPlayer = { rate: 1, playing: false, loop: true, raf: null };

  async function setupStemPanel() {
    const body = document.getElementById('sa-stem-body');
    if (!body) return;
    body.innerHTML = '<div class="sa-hint">בודק זמינות מנוע הפרדה…</div>';

    if (typeof StemAPI === 'undefined') { body.innerHTML = stemSetupHint(); return; }
    let health = { ok:false };
    try { health = await StemAPI.checkHealth(); } catch {}
    const hasKey = !!(window.BOUZOUKI_CONFIG?.lalalLicenseKey);
    if (!health.ok && !hasKey) { body.innerHTML = stemSetupHint(); return; }

    body.innerHTML = `
      <div class="sa-stem-ready">
        <input type="file" id="sa-stem-file" accept="audio/*" style="display:none">
        <button class="btn gold" id="sa-stem-pick">📁 בחרו קובץ אודיו לבידוד</button>
        <span class="sa-stem-ok">✓ מנוע הפרדה זמין</span>
      </div>
      <div class="sa-stem-prog" id="sa-stem-prog" style="display:none">
        <div class="sa-stem-bar"><div class="sa-stem-fill" id="sa-stem-fill"></div></div>
        <div class="sa-stem-msg" id="sa-stem-msg"></div>
      </div>
      <div class="sa-stem-player" id="sa-stem-player" style="display:none"></div>`;
    const input = document.getElementById('sa-stem-file');
    document.getElementById('sa-stem-pick').addEventListener('click', () => input.click());
    input.addEventListener('change', e => { if (e.target.files[0]) isolateAndLoad(e.target.files[0]); });
  }

  function stemSetupHint() {
    return `<div class="sa-stem-hint">
      ⚙️ כדי לבודד בוזוקי צריך <b>stem-proxy</b> פעיל + מפתח LALAL.ai.
      <br><small>הריצו <code>tools/stem-proxy</code> והגדירו <code>stemProxyUrl</code> ב-<code>config.js</code>. ראו את ה-README בתיקיה.</small>
      <br>בינתיים תוכלו לתרגל עם לולאת האקורדים למעלה ☝️</div>`;
  }

  async function isolateAndLoad(file) {
    const prog = document.getElementById('sa-stem-prog');
    const fill = document.getElementById('sa-stem-fill');
    const msg = document.getElementById('sa-stem-msg');
    const playerEl = document.getElementById('sa-stem-player');
    prog.style.display = 'block';
    playerEl.style.display = 'none';
    const onProgress = (m, pct) => { if (msg) msg.textContent = m; if (fill) fill.style.width = (pct||0) + '%'; };
    try {
      const blob = await StemAPI.separate(file, { provider:'lalal', stem:'strings', onProgress });
      onProgress('מפענח את הבוזוקי המבודד…', 99);
      const ab = await blob.arrayBuffer();
      const tmp = new (window.AudioContext||window.webkitAudioContext)();
      const buf = await tmp.decodeAudioData(ab);
      await tmp.close();
      prog.style.display = 'none';
      if (typeof PitchPreservingPlayer !== 'undefined') {
        PitchPreservingPlayer.load(buf);
        renderStemPlayer(buf.duration);
      } else {
        msg.textContent = 'נגן לא זמין';
      }
    } catch (err) {
      onProgress('שגיאה: ' + err.message, 0);
    }
  }

  function renderStemPlayer(duration) {
    const el = document.getElementById('sa-stem-player');
    if (!el) return;
    el.style.display = 'block';
    el.innerHTML = `
      <div class="sa-stem-ctrls">
        <button class="btn gold" id="sa-stem-play">▶</button>
        <label class="sa-stem-loop"><input type="checkbox" id="sa-stem-loopchk" checked> לולאה</label>
        <select id="sa-stem-rate" class="ctrl-select" style="width:96px">
          <option value="1">1× מהירות</option>
          <option value="0.85">0.85×</option>
          <option value="0.7">0.7× איטי</option>
          <option value="0.5">0.5× איטי מאוד</option>
        </select>
      </div>
      <div class="sa-hint">🎸 זה הבוזוקי לבד מהשיר — נגנו יחד איתו. האיטו ל-0.5× כדי לתפוס כל תו.</div>`;
    const P = PitchPreservingPlayer;
    const playBtn = document.getElementById('sa-stem-play');
    playBtn.addEventListener('click', () => {
      if (stemPlayer.playing) { P.pause(); stemPlayer.playing = false; playBtn.textContent = '▶'; cancelAnimationFrame(stemPlayer.raf); }
      else { P.setTempo(stemPlayer.rate, true); P.play(); stemPlayer.playing = true; playBtn.textContent = '⏸'; loopWatch(duration); }
    });
    document.getElementById('sa-stem-loopchk').addEventListener('change', e => stemPlayer.loop = e.target.checked);
    document.getElementById('sa-stem-rate').addEventListener('change', e => { stemPlayer.rate = parseFloat(e.target.value); P.setTempo(stemPlayer.rate, true); });
  }

  function loopWatch(duration) {
    const P = PitchPreservingPlayer;
    const tick = () => {
      if (!stemPlayer.playing) return;
      if (stemPlayer.loop && P.getCurrentTime() >= duration - 0.15) { P.seek(0); P.play(); }
      else if (!P.isPlaying() && P.getCurrentTime() >= duration - 0.15) {
        stemPlayer.playing = false;
        const b = document.getElementById('sa-stem-play'); if (b) b.textContent = '▶';
        return;
      }
      stemPlayer.raf = requestAnimationFrame(tick);
    };
    stemPlayer.raf = requestAnimationFrame(tick);
  }
  function startLoop(chords, bpm) {
    if (typeof AudioEngine==='undefined') return;
    AudioEngine.ensureCtx();
    const beat = 60/bpm;
    let idx = 0;
    const step = () => {
      if (!loopState) return;
      document.querySelectorAll('.sa-loop-ch').forEach((e,j)=>e.classList.toggle('active', j===idx));
      const ch = chords[idx];
      drawChordBoard('sa-fb-practice', ch);
      playChord(ch);
      idx = (idx+1) % chords.length;
    };
    loopState = { timer: setInterval(step, beat*1000) };
    step();
  }
  function stopLoop() {
    if (loopState) { clearInterval(loopState.timer); loopState = null; }
    document.querySelectorAll('.sa-loop-ch').forEach(e=>e.classList.remove('active'));
  }

  /* ---------- אתחול ---------- */
  function init() {
    if (!document.getElementById('song-academy-app')) return;
    injectStyles();
    renderHome();
  }
  function stopStem() {
    if (stemPlayer.raf) cancelAnimationFrame(stemPlayer.raf);
    stemPlayer.playing = false;
    if (typeof PitchPreservingPlayer !== 'undefined') { try { PitchPreservingPlayer.pause(); } catch {} }
  }
  function stop() { stopMic(); stopLoop(); endDrill(); stopStem(); if (_phraseAnim) { clearInterval(_phraseAnim.timer); _phraseAnim = null; } }

  function injectStyles() {
    if (document.getElementById('sa-styles')) return;
    const st = document.createElement('style');
    st.id = 'sa-styles';
    st.textContent = `
      .sa-intro { font-size:14px; background:var(--bg-card,#1a1a2e); border-radius:10px; padding:12px 16px; border-right:3px solid var(--gold,#e3b341); margin-bottom:16px; line-height:1.5; }
      .sa-song-grid { display:flex; flex-direction:column; gap:10px; }
      .sa-song-card { display:flex; align-items:center; gap:12px; text-align:right; background:var(--bg-card,#1a1a2e); border:1px solid; border-radius:12px; padding:12px 14px; cursor:pointer; transition:transform .1s; }
      .sa-song-card:hover { transform:translateX(-3px); }
      .sa-song-num { width:30px; height:30px; flex-shrink:0; border-radius:50%; background:var(--bg-elev,#222); display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--gold,#e3b341); }
      .sa-song-main { flex:1; min-width:0; }
      .sa-song-name { font-size:16px; font-weight:700; color:var(--text,#eee); }
      .sa-song-greek { font-size:12px; opacity:.55; font-weight:400; }
      .sa-song-sub { font-size:12px; color:var(--text-dim,#999); margin:2px 0 6px; }
      .sa-song-tags { display:flex; flex-wrap:wrap; gap:5px; align-items:center; }
      .sa-tag { font-size:11px; padding:2px 8px; border-radius:6px; background:var(--bg-elev,#222); color:var(--text-dim,#999); border:1px solid var(--line,#333); }
      .sa-tag-mod { color:#c265a0; border-color:#c265a0; }
      .sa-diff { font-size:10px; color:var(--gold,#e3b341); letter-spacing:1px; }
      .sa-song-head { margin-bottom:12px; }
      .sa-back { background:none; border:none; color:var(--aegean,#4fb3d9); cursor:pointer; font:inherit; font-size:13px; padding:0; }
      .sa-song-title { font-size:22px; font-weight:800; margin-top:4px; }
      .sa-tabs { display:flex; gap:6px; margin-bottom:14px; }
      .sa-tab { flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 4px; border-radius:10px; border:2px solid var(--line,#333); background:var(--bg-card,#1a1a2e); color:var(--text,#eee); cursor:pointer; font:inherit; font-size:12px; opacity:.65; }
      .sa-tab.active { opacity:1; }
      .sa-tab span:first-child { font-size:18px; }
      .sa-overview-card { background:var(--bg-card,#1a1a2e); border:2px solid; border-radius:12px; padding:14px; margin-bottom:12px; }
      .sa-ov-line { font-size:14px; margin:6px 0; color:var(--text,#eee); }
      .sa-ov-mod { color:#c265a0; }
      .sa-yt-wrap { position:relative; width:100%; aspect-ratio:16/9; margin:12px 0 6px; border-radius:12px; overflow:hidden; background:#000; }
      .sa-yt-frame { position:absolute; inset:0; width:100%; height:100%; border:0; }
      .sa-yt-link { display:inline-block; font-size:13px; color:var(--aegean,#4fb3d9); margin-bottom:8px; }
      .sa-why { font-size:13px; color:var(--text,#eee); background:rgba(255,255,255,.03); border-radius:8px; padding:10px 14px; margin:10px 0; line-height:1.5; }
      .sa-ov-fp { font-size:13px; color:var(--text-dim,#999); border-right:3px solid; padding:8px 12px; margin:10px 0; }
      .sa-btn-row { display:flex; gap:8px; flex-wrap:wrap; margin:12px 0; }
      .sa-chord-row { display:flex; gap:12px; flex-wrap:wrap; justify-content:center; margin:10px 0; }
      .sa-chord-slot { cursor:pointer; padding:6px; border-radius:10px; transition:background .15s; }
      .sa-chord-slot:hover { background:var(--bg-elev,#222); }
      .sa-hint { font-size:12px; color:var(--text-dim,#999); line-height:1.5; margin:8px 0; }
      .sa-drill { background:var(--bg-card,#1a1a2e); border:1px solid var(--line,#333); border-radius:12px; padding:14px; }
      .sa-drill-title { font-size:15px; font-weight:700; color:var(--gold,#e3b341); }
      .sa-drill-ctrls { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin:10px 0; }
      .sa-drill-display { text-align:center; margin:10px 0; }
      .sa-drill-count { font-size:48px; font-weight:900; color:var(--gold,#e3b341); line-height:1; transition:transform .15s; }
      .sa-drill-count.pop { transform:scale(1.25); }
      .sa-drill-lbl { font-size:12px; color:var(--text-dim,#999); }
      .sa-drill-time { font-size:13px; color:var(--aegean,#4fb3d9); margin-top:4px; }
      .sa-drill-best { font-size:13px; color:var(--text-dim,#999); text-align:center; margin:6px 0; }
      .sa-meter { display:flex; align-items:center; gap:8px; margin-top:8px; }
      .sa-vu { flex:1; height:8px; background:var(--bg-elev,#222); border-radius:4px; overflow:hidden; }
      .sa-vu-fill { height:100%; width:0%; background:var(--gold,#e3b341); transition:width .08s; }
      .sa-now { min-width:60px; font-size:14px; font-weight:700; color:var(--ok,#27ae60); text-align:center; }
      .sa-timeline { display:flex; gap:4px; margin:10px 0; }
      .sa-tl-seg { border:2px solid; border-radius:10px; padding:12px 6px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; transition:transform .1s; }
      .sa-tl-seg.sel { transform:translateY(-3px); }
      .sa-tl-label { font-size:13px; font-weight:700; color:var(--text,#eee); }
      .sa-tl-dr { font-size:12px; font-weight:600; }
      .sa-dr-card { background:var(--bg-card,#1a1a2e); border:2px solid; border-radius:12px; padding:14px; margin-top:8px; }
      .sa-dr-name { font-size:20px; font-weight:800; }
      .sa-dr-fp,.sa-dr-tell { font-size:13px; color:var(--text,#eee); margin:6px 0; line-height:1.5; }
      .sa-tab-svg { max-width:100%; height:52px; margin:8px 0; }
      .sa-fb-section { margin:14px 0; }
      .sa-fb-title { font-size:14px; font-weight:700; color:var(--gold,#e3b341); margin:12px 0 6px; }
      .sa-fb-wrap { background:var(--bg-elev,#222); border-radius:12px; padding:8px 4px; margin:6px 0; overflow-x:auto; }
      .sa-fb-wrap .fretboard { width:100%; min-width:320px; height:auto; display:block; }
      .sa-loop-chords { display:flex; flex-wrap:wrap; gap:6px; align-items:center; justify-content:center; margin:14px 0; }
      .sa-loop-ch { font-size:20px; font-weight:800; padding:10px 16px; border-radius:10px; background:var(--bg-card,#1a1a2e); border:2px solid var(--line,#333); color:var(--text,#eee); }
      .sa-loop-ch.active { background:var(--gold,#e3b341); color:#111; border-color:var(--gold,#e3b341); transform:scale(1.08); }
      .sa-loop-arr { color:var(--text-dim,#999); }
      .sa-loop-ctrls { display:flex; align-items:center; gap:8px; justify-content:center; flex-wrap:wrap; }
      .sa-bpm { font-size:14px; color:var(--text-dim,#999); }
      .sa-bpm b { font-size:18px; color:var(--text,#eee); }
      .sa-stem { margin-top:18px; padding-top:14px; border-top:1px solid var(--line,#333); }
      .sa-stem-title { font-size:15px; font-weight:700; color:var(--gold,#e3b341); margin-bottom:4px; }
      .sa-stem-hint { font-size:13px; color:var(--text-dim,#999); background:rgba(255,255,255,.03); border-radius:8px; padding:10px 14px; line-height:1.6; }
      .sa-stem-hint code { background:var(--bg-elev,#222); padding:1px 5px; border-radius:4px; font-size:12px; }
      .sa-stem-ready { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:8px 0; }
      .sa-stem-ok { font-size:12px; color:var(--ok,#27ae60); }
      .sa-stem-prog { margin:10px 0; }
      .sa-stem-bar { height:8px; background:var(--bg-elev,#222); border-radius:4px; overflow:hidden; }
      .sa-stem-fill { height:100%; width:0%; background:var(--gold,#e3b341); transition:width .3s; }
      .sa-stem-msg { font-size:12px; color:var(--text-dim,#999); margin-top:6px; text-align:center; }
      .sa-stem-ctrls { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:10px 0 6px; }
      .sa-stem-loop { font-size:13px; color:var(--text,#eee); display:flex; align-items:center; gap:4px; }
      #sa-stem-play { width:44px; height:44px; border-radius:50%; font-size:18px; }
    `;
    document.head.appendChild(st);
  }

  return { init, stop };
})();
