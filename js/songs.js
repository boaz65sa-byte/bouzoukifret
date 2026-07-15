/* ============================================================
   בוזוקי אקדמי — ספריית שירים (Song Library)
   שירי רבטיקו ולאיקו יווניים עם אקורדים, גלילה אוטומטית ונגינה
   ============================================================ */
'use strict';

const SongLibrary = (() => {

  /* ===================== קבועים ===================== */
  const STORAGE_KEY = 'bouzouki-songs-custom-v1';
  const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const ENHARMONIC = {
    'Db': 'C#', 'Eb': 'D#', 'Fb': 'E', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#', 'Cb': 'B',
    'E#': 'F', 'B#': 'C',
  };
  const SHARP_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const FLAT_NAMES  = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  /* regex for chord detection */
  const CHORD_RE = /^([A-G][#b]?)(m|min|dim|aug|sus[24]|maj|add)?(2|4|5|6|7|9|11|13)?(b5|#5|b9|#9|#11|b13)?(\/[A-G][#b]?)?$/;


  const { songRef, normalizeReference, SONG_YT_REFERENCES } = window.SongRefData || {
    songRef: () => null, normalizeReference: () => null, SONG_YT_REFERENCES: {},
  };
  const BUILTIN_SONGS = window.SONG_CATALOG || [];

  function getSongReference(song) {
    return normalizeReference(song.reference) || SONG_YT_REFERENCES[song.id] || null;
  }
  function _renderReference(song) {
    const ref = getSongReference(song);
    if (!ref) return '';
    const safeLabel = ref.label.replace(/"/g, '&quot;');
    return `
      <div class="song-reference">
        <div class="song-ref-header">
          <span class="song-ref-title">🎧 ${ref.label}</span>
          <a class="song-ref-link" href="${ref.url}" target="_blank" rel="noopener noreferrer">פתח ביוטיוב ↗</a>
        </div>
        <div class="song-yt-wrap">
          <iframe class="song-yt-iframe" loading="lazy"
            src="https://www.youtube-nocookie.com/embed/${ref.youtubeId}?rel=0&modestbranding=1"
            title="${safeLabel}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen></iframe>
        </div>
      </div>`;
  }

  /* ===================== מצב מודול ===================== */
  let _scheduler = null;
  let _playing = false;
  let _currentSong = null;
  let _scrollTimer = null;
  let _currentBpm = 120;
  let _currentStep = 0;
  let _highlightEls = [];
  let _playMode = 'bouzouki'; /* 'bouzouki' | 'simple' */
  let _bouzoukiMeta = null;   /* מטא-נתונים של ליווי נוכחי */
  let _dromosIntroTimer = null;

  function _isMobileSongs() {
    return window.matchMedia('(max-width: 860px)').matches;
  }

  function _setMobileDetailOpen(open) {
    const layout = document.querySelector('.songs-layout');
    if (!layout || !_isMobileSongs()) return;
    layout.classList.toggle('detail-open', open);
    if (open) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function _closeMobileDetail() {
    stopSong();
    _setMobileDetailOpen(false);
    const entries = document.getElementById('songs-entries');
    if (entries) entries.querySelectorAll('.songs-entry').forEach(e => e.classList.remove('selected'));
  }

  /* ===================== תבניות ליווי בוזוקי ===================== */
  const COURSE_LABELS = ['D', 'A', 'F', 'C']; /* רה, לה, פה, דו — מיתר עליון → תחתון */

  const BOUZOUKI_PATTERNS = {
    hasapiko: {
      id: 'hasapiko', nameHe: 'חסאפיקו (4/4)', sub: 2, exerciseId: 'ch3',
      desc: 'בס–פריטה–בס–פריטה (↓↑ בסוף). תבנית ברירת המחדל לרוב השירים ב-4/4.',
    },
    zeibekiko: {
      id: 'zeibekiko', nameHe: 'ζεϊμπέκικο (9/4)', sub: 2, exerciseId: 'ch4',
      desc: '9 פעימות עם שקטים — בס על 1, 5 ו-7. לשירי 9/4 ורבטיקו איטי.',
    },
    tsifteteli: {
      id: 'tsifteteli', nameHe: 'ציפטטלי (4/4)', sub: 2, exerciseId: 'ch5',
      desc: 'גרוב מזרחי: בס ופריטות למעלה עם שקטים. לשירים מהירים וריקודיים.',
    },
    ballad: {
      id: 'ballad', nameHe: 'בלדה / איטי (4/4)', sub: 2, exerciseId: 'ch2',
      desc: 'בס ואז אקורד מלא — פשוט ונקי לשירים איטיים ומינורה.',
    },
  };

  function _cloneEv(ev, chord) {
    const e = { ...ev, chord: chord || ev.chord };
    if (ev.len !== undefined) e.len = ev.len;
    return e;
  }

  function _hasapikoMeasure(ch) {
    return [
      { kind: 'bass', chord: ch, len: 2 },
      { kind: 'strum', chord: ch, dir: 'd', len: 2 },
      { kind: 'bass', chord: ch, len: 2 },
      { kind: 'strum', chord: ch, dir: 'd', len: 1 },
      { kind: 'strum', chord: ch, dir: 'u', len: 1 },
    ];
  }

  function _hasapikoFromBeats(beatChords, beatBase = 0) {
    const events = [];
    const beats = beatChords.length ? beatChords : ['Dm'];
    beats.forEach((ch, i) => {
      const c = ch || beats[i - 1] || beats[0] || 'Dm';
      const beatIdx = beatBase + i;
      events.push({ kind: 'bass', chord: c, len: 2, beatIdx });
      if (i === beats.length - 1) {
        events.push({ kind: 'strum', chord: c, dir: 'd', len: 1, beatIdx });
        events.push({ kind: 'strum', chord: c, dir: 'u', len: 1, beatIdx });
      } else {
        events.push({ kind: 'strum', chord: c, dir: 'd', len: 2, beatIdx });
      }
    });
    return events;
  }

  function _zeibekikoMeasure(ch) {
    return [
      { kind: 'bass', chord: ch, len: 2 },
      { kind: 'rest', len: 2 },
      { kind: 'strum', chord: ch, dir: 'd', len: 2 },
      { kind: 'rest', len: 2 },
      { kind: 'bass', chord: ch, len: 2 },
      { kind: 'strum', chord: ch, dir: 'd', len: 2 },
      { kind: 'bass', chord: ch, len: 2 },
      { kind: 'strum', chord: ch, dir: 'd', len: 1 },
      { kind: 'strum', chord: ch, dir: 'u', len: 1 },
      { kind: 'rest', len: 2 },
    ];
  }

  function _tsifteteliMeasure(ch) {
    return [
      { kind: 'bass', chord: ch, len: 1 },
      { kind: 'strum', chord: ch, dir: 'u', len: 1 },
      { kind: 'rest', len: 1 },
      { kind: 'strum', chord: ch, dir: 'u', len: 1 },
      { kind: 'bass', chord: ch, len: 1 },
      { kind: 'rest', len: 1 },
      { kind: 'strum', chord: ch, dir: 'd', len: 1 },
      { kind: 'rest', len: 1 },
      { kind: 'bass', chord: ch, len: 1 },
      { kind: 'strum', chord: ch, dir: 'u', len: 1 },
      { kind: 'rest', len: 1 },
      { kind: 'strum', chord: ch, dir: 'u', len: 1 },
      { kind: 'bass', chord: ch, len: 1 },
      { kind: 'rest', len: 1 },
      { kind: 'strum', chord: ch, dir: 'd', len: 1 },
      { kind: 'rest', len: 1 },
    ];
  }

  function _balladFromBeats(beatChords, beatBase = 0) {
    const events = [];
    const beats = beatChords.length ? beatChords : ['Dm'];
    beats.forEach((ch, i) => {
      const c = ch || beats[i - 1] || beats[0] || 'Dm';
      const beatIdx = beatBase + i;
      events.push({ kind: 'bass', chord: c, len: 2, beatIdx });
      events.push({ kind: 'strum', chord: c, dir: 'd', len: 2, beatIdx });
    });
    return events;
  }

  function _beatsPerMeasure(song) {
    if (song.timeSignature === '9/4') return 9;
    if (song.timeSignature === '3/4') return 3;
    if (song.timeSignature === '2/4') return 2;
    return 4;
  }

  function _collectBeatChords(song) {
    const beats = [];
    song.sections.forEach(sec => {
      sec.lines.forEach(line => {
        (line.chords || []).forEach(ch => beats.push(ch || null));
      });
    });
    let last = null;
    return beats.map(ch => {
      if (ch) { last = ch; return ch; }
      return last;
    });
  }

  function _pickBouzoukiPattern(song) {
    if (song.bouzoukiPattern && BOUZOUKI_PATTERNS[song.bouzoukiPattern]) {
      return BOUZOUKI_PATTERNS[song.bouzoukiPattern];
    }
    if (song.bouzoukiPart && song.bouzoukiPart.pattern) {
      const p = BOUZOUKI_PATTERNS[song.bouzoukiPart.pattern];
      if (p) return p;
    }
    if (_isZeibekikoSong(song)) return BOUZOUKI_PATTERNS.zeibekiko;
    if (song.style === 'tsifteteli') return BOUZOUKI_PATTERNS.tsifteteli;
    if ((song.bpm || 120) <= 85) return BOUZOUKI_PATTERNS.ballad;
    return BOUZOUKI_PATTERNS.hasapiko;
  }

  function _buildMeasureEvents(patternId, beatChords, beatBase = 0) {
    const primary = [...beatChords].reverse().find(Boolean) || beatChords[0] || 'Dm';
    if (patternId === 'zeibekiko') {
      return _zeibekikoMeasure(primary).map(ev => ({ ..._cloneEv(ev, primary), beatIdx: beatBase }));
    }
    if (patternId === 'tsifteteli') {
      return _tsifteteliMeasure(primary).map(ev => ({ ..._cloneEv(ev, primary), beatIdx: beatBase }));
    }
    if (patternId === 'ballad') {
      return _balladFromBeats(beatChords, beatBase);
    }
    return _hasapikoFromBeats(beatChords, beatBase);
  }

  function _buildBouzoukiAccompaniment(song) {
    if (song.bouzoukiPart && song.bouzoukiPart.events && song.bouzoukiPart.events.length) {
      const pat = _pickBouzoukiPattern(song);
      return {
        pattern: pat,
        events: song.bouzoukiPart.events,
        sub: song.bouzoukiPart.sub || pat.sub,
        custom: true,
      };
    }

    const pattern = _pickBouzoukiPattern(song);
    const beats = _collectBeatChords(song);
    if (!beats.length || !beats.some(Boolean)) return null;

    const bpm = _beatsPerMeasure(song);
    const events = [];
    let beatBase = 0;
    for (let i = 0; i < beats.length; i += bpm) {
      const slice = [];
      for (let j = 0; j < bpm; j++) {
        slice.push(beats[i + j] || beats[i + j - 1] || beats[i] || null);
      }
      events.push(..._buildMeasureEvents(pattern.id, slice, beatBase));
      beatBase += bpm;
    }

    return { pattern, events, sub: pattern.sub, custom: false };
  }

  function _bouzoukiTotalSteps(events) {
    return events.reduce((s, n) => s + (n.len || 1), 0);
  }

  function _bouzoukiEventsAtSteps(events) {
    const map = new Map();
    let step = 0;
    events.forEach((ev, idx) => {
      map.set(step, { idx, ev });
      step += ev.len || 1;
    });
    return map;
  }

  function _renderFretTable(chordNames) {
    const names = [...chordNames].filter(ch => CHORDS[ch]);
    if (!names.length) return '';
    const rows = names.map(name => {
      const shape = CHORDS[name].shape;
      const cells = shape.map((f, i) => {
        const fret = f === 'x' ? '×' : f;
        return `<td><span class="fret-num">${fret}</span><span class="fret-course">${COURSE_LABELS[i]}</span></td>`;
      }).join('');
      return `<tr><th class="fret-chord-name">${name}</th>${cells}</tr>`;
    }).join('');
    return `
      <table class="song-fret-table">
        <thead><tr><th>אקורד</th>${COURSE_LABELS.map(l => `<th>${l}</th>`).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="song-fret-hint">סדר מיתרים: רה (D) · לה (A) · פה (F) · דו (C) — מלמעלה למטה בטבלה</div>`;
  }

  function _drawSongStrumStrip(container, events) {
    if (!container) return;
    container.innerHTML = '';
    events.forEach((ev, idx) => {
      const cell = document.createElement('div');
      const w = 30 + (ev.len || 1) * 26;
      cell.style.width = w + 'px';
      cell.style.flexShrink = '0';
      cell.dataset.idx = idx;
      if (ev.kind === 'rest') {
        cell.className = 'strum-cell rest';
        cell.innerHTML = '<div class="sc-top">·</div><div class="sc-bottom">שקט</div>';
      } else if (ev.kind === 'bass') {
        cell.className = 'strum-cell bass';
        cell.dataset.chord = ev.chord;
        cell.innerHTML = `<div class="sc-top">↓</div><div class="sc-bottom">בס ${ev.chord}</div>`;
      } else {
        cell.className = 'strum-cell';
        cell.dataset.chord = ev.chord;
        cell.innerHTML = `<div class="sc-top">${ev.dir === 'd' ? '↓' : '↑'}</div><div class="sc-bottom">${ev.chord}</div>`;
      }
      container.appendChild(cell);
    });
    if (typeof ChordTooltip !== 'undefined') ChordTooltip.bindContainer(container);
  }

  function _renderBouzoukiPart(song) {
    const acc = _buildBouzoukiAccompaniment(song);
    if (!acc || !acc.events.length) {
      return '<div class="song-bouzouki-empty">אין מספיק אקורדים לבניית ליווי בוזוקי</div>';
    }

    const uniqueChords = new Set();
    acc.events.forEach(ev => { if (ev.chord) uniqueChords.add(ev.chord); });

    const modeSimple = _playMode === 'simple';
    return `
      <div class="song-bouzouki-part">
        <div class="song-bouzouki-head">
          <h3 class="song-bouzouki-title">🎸 תפקיד בוזוקי — ליווי</h3>
          <span class="song-bouzouki-pattern badge alt">${acc.pattern.nameHe}</span>
          ${acc.custom ? '<span class="song-bouzouki-custom badge">מותאם</span>' : '<span class="song-bouzouki-auto badge">אוטומטי</span>'}
        </div>
        <p class="song-bouzouki-desc">${acc.pattern.desc}${acc.custom ? '' : ' · נבנה אוטומטית מהאקורדים ומסגנון השיר.'}</p>
        ${song.bouzoukiTips ? `<p class="song-bouzouki-tips">💡 ${song.bouzoukiTips}</p>` : ''}
        <div class="song-play-mode">
          <button type="button" class="btn btn-sm ${_playMode === 'bouzouki' ? 'btn-gold' : ''}" id="song-mode-bouzouki">ליווי בוזוקי</button>
          <button type="button" class="btn btn-sm ${_playMode === 'simple' ? 'btn-gold' : ''}" id="song-mode-simple">אקורדים בלבד</button>
        </div>
        <div class="song-bouzouki-section">
          <div class="song-bouzouki-label">סריגים על הלוח (CFAD)</div>
          ${_renderFretTable(uniqueChords)}
        </div>
        <div class="song-bouzouki-section" style="${modeSimple ? 'display:none' : ''}">
          <div class="song-bouzouki-label">תבנית פריטה לאורך השיר</div>
          <div class="song-strum-scroll">
            <div class="strum-strip song-strum-strip" id="song-strum-strip"></div>
          </div>
          <div class="song-bouzouki-hint">↓ = פריטה · <span class="hint-gold">בס</span> = מיתר נמוך בלבד · · = שקט · רוחב תא = אורך הצליל</div>
        </div>
        <div class="song-bouzouki-learn">
          <span>לתרגל את התבנית:</span>
          <button type="button" class="btn btn-sm" id="song-goto-exercise" data-ex-id="${acc.pattern.exerciseId}">תרגיל ${acc.pattern.exerciseId} →</button>
        </div>
      </div>`;
  }

  function _bindBouzoukiPartEvents(detail, song) {
    const strip = detail.querySelector('#song-strum-strip');
    if (strip && _playMode === 'bouzouki') {
      const acc = _buildBouzoukiAccompaniment(song);
      if (acc) _drawSongStrumStrip(strip, acc.events);
    }

    const modeB = detail.querySelector('#song-mode-bouzouki');
    const modeS = detail.querySelector('#song-mode-simple');
    if (modeB) modeB.onclick = () => {
      _playMode = 'bouzouki';
      _refreshSongView(song, detail);
    };
    if (modeS) modeS.onclick = () => {
      _playMode = 'simple';
      _refreshSongView(song, detail);
    };

    const gotoEx = detail.querySelector('#song-goto-exercise');
    if (gotoEx) gotoEx.onclick = () => {
      const exId = gotoEx.dataset.exId;
      const exBtn = document.querySelector('.nav-btn[data-screen="exercises"]');
      if (exBtn) exBtn.click();
      setTimeout(() => {
        if (typeof EXERCISES === 'undefined') return;
        for (const cat of EXERCISES) {
          const item = cat.items.find(it => it.id === exId);
          if (item) {
            const catIdx = EXERCISES.indexOf(cat);
            const tabs = document.querySelectorAll('#ex-cats .rhythm-tab');
            if (tabs[catIdx]) tabs[catIdx].click();
            setTimeout(() => {
              const items = document.querySelectorAll('#ex-list .dromos-item');
              const itemIdx = cat.items.indexOf(item);
              if (items[itemIdx]) items[itemIdx].click();
            }, 80);
            break;
          }
        }
      }, 120);
    };
  }

  /* ===================== טרנספוזיציה ===================== */

  /** מחלץ את השורש (root) וסיומת של שם אקורד */
  function parseChordName(name) {
    if (!name) return null;
    const m = name.match(/^([A-G][#b]?)(.*)/);
    if (!m) return null;
    return { root: m[1], suffix: m[2] };
  }

  /** ממיר שורש לאינדקס כרומטי */
  function rootToIndex(root) {
    const norm = ENHARMONIC[root] || root;
    const idx = CHROMATIC.indexOf(norm);
    return idx >= 0 ? idx : -1;
  }

  /** מזיז אקורד בודד */
  function transposeChord(chord, semitones, preferFlats) {
    const parsed = parseChordName(chord);
    if (!parsed) return chord;
    const idx = rootToIndex(parsed.root);
    if (idx < 0) return chord;
    const newIdx = ((idx + semitones) % 12 + 12) % 12;
    const names = preferFlats ? FLAT_NAMES : SHARP_NAMES;
    return names[newIdx] + parsed.suffix;
  }

  /** בודק אם טונאליות משתמשת בדירוג (flats) */
  function usesFlats(key) {
    return ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb',
            'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'].some(k => key.startsWith(k));
  }

  /** טרנספוז לשיר שלם — מחזיר עותק חדש */
  function transpose(song, semitones) {
    if (semitones === 0) return song;
    const preferFlats = usesFlats(song.key);
    const newKey = transposeChord(song.key, semitones, preferFlats);

    const newSections = song.sections.map(sec => ({
      name: sec.name,
      lines: sec.lines.map(line => ({
        chords: line.chords.map(ch =>
          ch ? transposeChord(ch, semitones, usesFlats(newKey)) : null
        ),
        lyrics: line.lyrics,
      })),
    }));

    return {
      ...song,
      key: newKey,
      sections: newSections,
      _transposed: (song._transposed || 0) + semitones,
    };
  }

  /* ===================== פרסר שירים ===================== */

  function parseSong(text) {
    const lines = text.split(/\r?\n/);
    const meta = {};
    const sections = [];
    let currentSection = null;
    let i = 0;

    /* שלב 1: כותרות מטא */
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) { i++; continue; }
      const metaMatch = line.match(/^(Title|Artist|Dromos|Key|BPM|Time|Reference|YouTube)\s*:\s*(.+)/i);
      if (metaMatch) {
        const k = metaMatch[1].toLowerCase();
        const v = metaMatch[2].trim();
        if (k === 'title') meta.title = v;
        else if (k === 'artist') meta.artist = v;
        else if (k === 'dromos') meta.dromos = v;
        else if (k === 'key') meta.key = v;
        else if (k === 'bpm') meta.bpm = parseInt(v, 10) || 120;
        else if (k === 'time') meta.timeSignature = v;
        else if (k === 'reference' || k === 'youtube') meta.reference = v;
        i++;
      } else {
        break;
      }
    }

    /* שלב 2: סקציות ושורות */
    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      /* סימון סקציה */
      const secMatch = trimmed.match(/^\[(Intro|Verse|Chorus|Bridge|Outro|Theme|Solo|Interlude)\d*\]/i);
      if (secMatch) {
        currentSection = { name: secMatch[1], lines: [] };
        sections.push(currentSection);
        i++;
        continue;
      }

      if (!trimmed) { i++; continue; }

      if (!currentSection) {
        currentSection = { name: 'Verse', lines: [] };
        sections.push(currentSection);
      }

      /* שורת תיבות: |D    |Gm   |A7   |D    | */
      const barMatch = trimmed.match(/^\|(.+)\|?\s*$/);
      if (barMatch) {
        const bars = barMatch[1].split('|').map(b => b.trim()).filter(Boolean);
        const chords = bars.map(b => {
          const ch = b.split(/\s+/)[0];
          return CHORD_RE.test(ch) ? ch : null;
        });
        currentSection.lines.push({ chords, lyrics: '' });
        i++;
        continue;
      }

      /* שורת אקורדים מעל מילים */
      if (_isChordLine(trimmed)) {
        const chords = _parseChordPositions(trimmed);
        let lyrics = '';
        if (i + 1 < lines.length && !_isChordLine(lines[i + 1].trim()) &&
            !lines[i + 1].trim().match(/^\[/) && lines[i + 1].trim()) {
          lyrics = lines[i + 1].trim();
          i++;
        }
        currentSection.lines.push({ chords, lyrics });
        i++;
        continue;
      }

      /* שורת מילים בלבד */
      currentSection.lines.push({ chords: [], lyrics: trimmed });
      i++;
    }

    return {
      id: 'custom-' + Date.now(),
      title: meta.title || 'שיר ללא שם',
      titleGr: meta.title || '',
      titleHe: '',
      artist: meta.artist || '',
      artistHe: '',
      dromos: meta.dromos || '',
      key: meta.key || 'D',
      bpm: meta.bpm || 120,
      timeSignature: meta.timeSignature || '4/4',
      difficulty: 0,
      reference: meta.reference ? normalizeReference(meta.reference) : null,
      sections,
      custom: true,
    };
  }

  function _isChordLine(line) {
    if (!line) return false;
    const tokens = line.split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return false;
    const chordCount = tokens.filter(t => CHORD_RE.test(t)).length;
    return chordCount / tokens.length >= 0.5;
  }

  function _parseChordPositions(line) {
    const chords = [];
    const re = /([A-G][#b]?(?:m|min|dim|aug|sus[24]|maj|add)?(?:2|4|5|6|7|9|11|13)?(?:b5|#5|b9|#9|#11|b13)?(?:\/[A-G][#b]?)?)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      chords.push(m[1]);
    }
    return chords.length ? chords : [null];
  }

  /* ===================== אחסון מקומי ===================== */

  function loadCustomSongs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }

  function saveCustomSongs(songs) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  }

  function saveSong(song) {
    const list = loadCustomSongs();
    const idx = list.findIndex(s => s.id === song.id);
    if (idx >= 0) list[idx] = song;
    else list.push(song);
    saveCustomSongs(list);
  }

  function deleteSong(id) {
    const list = loadCustomSongs().filter(s => s.id !== id);
    saveCustomSongs(list);
  }

  function getAllSongs() {
    return [...BUILTIN_SONGS, ...loadCustomSongs()];
  }

  /* ===================== נגינה ===================== */

  function _findDromos(song) {
    if (typeof DROMOI === 'undefined' || !song?.dromos) return null;
    const q = song.dromos;
    return DROMOI.find(d =>
      d.nameEn === q || d.id === String(q).toLowerCase() || d.nameHe === q
    ) || null;
  }

  function _keyToRootPc(key) {
    if (!key) return 2;
    const m = String(key).match(/^([A-G][#b]?)/);
    if (!m) return 2;
    let name = m[1];
    if (ENHARMONIC[name]) name = ENHARMONIC[name];
    const idx = CHROMATIC.indexOf(name);
    return idx >= 0 ? idx : 2;
  }

  function _renderDromosCard(song) {
    const dr = _findDromos(song);
    if (!dr) return '';
    const mood = dr.mood ? `<p class="song-dromos-mood">${dr.mood}</p>` : '';
    const chords = dr.chords ? `<p class="song-dromos-chords"><b>אקורדים בדרומוס:</b> ${dr.chords}</p>` : '';
    return `
      <div class="song-dromos-card" id="song-dromos-card">
        <div class="song-dromos-card-head">
          <h3>🛤️ דרומוס: ${dr.nameHe} <span class="song-dromos-gr">${dr.nameGr || dr.nameEn}</span></h3>
          <button type="button" class="btn btn-sm" id="song-preview-dromos">▶ שמע סולם</button>
        </div>
        ${mood}
        ${chords}
        <p class="song-dromos-play-hint">בלחיצה על <b>נגינה</b> — קודם נשמע הסולם, ואז ליווי בוזוקי לפי האקורדים בשיר.</p>
      </div>`;
  }

  function _previewDromos(song) {
    const dr = _findDromos(song);
    if (!dr || typeof AudioEngine.playModeScale !== 'function') return;
    if (typeof stopAllPlayback === 'function') stopAllPlayback();
    AudioEngine.ensureCtx();
    AudioEngine.playModeScale(dr.intervals, _keyToRootPc(song.key), {
      gapMs: 300, gain: 0.48, includeOctave: true, descending: false, dromosId: dr.id,
    });
    document.getElementById('song-dromos-card')?.classList.add('playing');
    const n = dr.intervals.length + 1;
    setTimeout(() => {
      document.getElementById('song-dromos-card')?.classList.remove('playing');
    }, n * 300 + 400);
  }

  function _highlightBeat(beatIdx) {
    _clearHighlights();
    const el = document.querySelector(`.song-chord[data-beat-idx="${beatIdx}"]`);
    if (el) {
      el.classList.add('chord-active');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      document.querySelectorAll('.song-line.line-active').forEach(l => l.classList.remove('line-active'));
      el.closest('.song-line')?.classList.add('line-active');
    }
  }

  function _runSongPlayback(song) {
    if (_playMode === 'bouzouki') {
      _bouzoukiMeta = _buildBouzoukiAccompaniment(song);
      if (_bouzoukiMeta && _bouzoukiMeta.events.length) {
        const { events, sub } = _bouzoukiMeta;
        const evMap = _bouzoukiEventsAtSteps(events);
        const total = _bouzoukiTotalSteps(events);
        const strumCells = document.querySelectorAll('#song-strum-strip .strum-cell');

        const sched = new AudioEngine.Scheduler(
          (step, time) => {
            const hit = evMap.get(step);
            if (hit) {
              const ev = hit.ev;
              const chord = CHORDS[ev.chord];
              if (chord) {
                if (ev.kind === 'strum') AudioEngine.strumChord(chord.shape, ev.dir, time, 0.44);
                else if (ev.kind === 'bass') AudioEngine.bassOfChord(chord.shape, time, 0.58);
              }
            }
          },
          (step) => {
            _currentStep = step;
            _highlightBouzoukiStep(evMap, step, strumCells);
          }
        );
        sched.stepDur = 60 / _currentBpm / sub;
        sched.numSteps = total;
        sched.start();
        _scheduler = sched;
        if (typeof activeSchedulers !== 'undefined') activeSchedulers.push(sched);
        return;
      }
    }

    /* אקורדים לפי פעימות בשיר — מסונכרן עם הטקסט */
    const beats = _collectBeatChords(song);
    if (!beats.length) return;

    const sched = new AudioEngine.Scheduler(
      (step, time) => {
        const ch = beats[step % beats.length];
        if (ch && CHORDS[ch]) {
          AudioEngine.strumChord(CHORDS[ch].shape, 'd', time, 0.52);
        }
      },
      (step) => {
        _currentStep = step % beats.length;
        _highlightBeat(_currentStep);
      }
    );
    sched.stepDur = 60 / _currentBpm;
    sched.numSteps = beats.length;
    sched.start();
    _scheduler = sched;
    if (typeof activeSchedulers !== 'undefined') activeSchedulers.push(sched);
  }

  function playSong(song) {
    stopSong();
    if (!song || !song.sections) return;

    _currentSong = song;
    _playing = true;
    _currentBpm = song.bpm || 120;
    _currentStep = 0;

    const dr = _findDromos(song);
    const card = document.getElementById('song-dromos-card');
    if (card) card.classList.add('playing');

    const begin = () => {
      if (card) card.classList.remove('playing');
      _runSongPlayback(song);
    };

    if (dr && typeof AudioEngine.playModeScale === 'function') {
      AudioEngine.ensureCtx();
      AudioEngine.playModeScale(dr.intervals, _keyToRootPc(song.key), {
        gapMs: 300, gain: 0.48, includeOctave: true, descending: false, dromosId: dr.id,
      });
      const n = dr.intervals.length + 1;
      _dromosIntroTimer = setTimeout(() => {
        _dromosIntroTimer = null;
        begin();
      }, n * 300 + 350);
    } else {
      begin();
    }
  }

  function _highlightBouzoukiStep(evMap, step, strumCells) {
    _clearHighlights();
    const hit = evMap.get(step);
    if (!hit) return;
    if (strumCells.length) {
      strumCells.forEach(el => el.classList.remove('lit'));
      const cell = document.querySelector(`#song-strum-strip .strum-cell[data-idx="${hit.idx}"]`);
      if (cell) {
        cell.classList.add('lit');
        cell.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
      }
    }
    if (hit.ev.beatIdx != null) {
      _highlightBeat(hit.ev.beatIdx);
    } else if (hit.ev.chord) {
      document.querySelectorAll('.song-chord').forEach(el => {
        el.classList.toggle('chord-active', el.dataset.chord === hit.ev.chord);
      });
    }
  }

  function stopSong() {
    if (_dromosIntroTimer) {
      clearTimeout(_dromosIntroTimer);
      _dromosIntroTimer = null;
    }
    if (typeof AudioEngine !== 'undefined' && AudioEngine.stopModeScale) {
      AudioEngine.stopModeScale();
    }
    if (_scheduler) {
      _scheduler.stop();
      _scheduler = null;
    }
    _playing = false;
    _currentStep = 0;
    _bouzoukiMeta = null;
    _clearHighlights();
    document.querySelectorAll('#song-strum-strip .strum-cell.lit').forEach(e => e.classList.remove('lit'));
    if (_scrollTimer) {
      clearInterval(_scrollTimer);
      _scrollTimer = null;
    }
  }

  function _clearHighlights() {
    document.querySelectorAll('.chord-active').forEach(e => e.classList.remove('chord-active'));
    document.querySelectorAll('.song-line.line-active').forEach(e => e.classList.remove('line-active'));
  }

  /* ===================== דיאגרמת אקורד מיני ===================== */

  function _chordDiagramSVG(chordName) {
    if (typeof ChordDiagram !== 'undefined') return ChordDiagram.miniHTML(chordName);
    return '';
  }

  function _bindSongChordTooltips(detail) {
    if (typeof ChordTooltip === 'undefined' || !detail) return;
    ChordTooltip.bindContainer(detail.querySelector('.song-chord-diagrams'));
    ChordTooltip.bindContainer(detail.querySelector('#song-strum-strip'));
    ChordTooltip.bindContainer(detail.querySelector('#song-scroll-area'));
    detail.querySelectorAll('.fret-chord-name').forEach(th => {
      if (th.dataset.chordBound) return;
      th.dataset.chord = th.textContent.trim();
      th.dataset.chordBound = '1';
      th.style.cursor = 'help';
      ChordTooltip.bindHover(th, () => th.dataset.chord);
    });
  }

  /* ===================== UI — רינדור ===================== */

  function init() {
    const app = document.getElementById('songs-app');
    if (!app) return;

    app.innerHTML = `
      <div class="songs-layout">
        <div class="songs-sidebar" id="songs-list">
          <div class="songs-list-head">
            <span class="songs-list-count" id="songs-count"></span>
          </div>
          <div class="songs-search-box">
            <input type="text" id="songs-search" placeholder="חיפוש שיר..." class="songs-input" />
          </div>
          <div class="songs-filter">
            <button class="btn btn-sm songs-filter-btn active" data-filter="all">הכל</button>
            <button class="btn btn-sm songs-filter-btn" data-filter="Hitzaz">חיג׳אז</button>
            <button class="btn btn-sm songs-filter-btn" data-filter="Minore">מינורה</button>
            <button class="btn btn-sm songs-filter-btn" data-filter="Ousak">אוסאק</button>
            <button class="btn btn-sm songs-filter-btn" data-filter="Rast">ראסט</button>
            <button class="btn btn-sm songs-filter-btn" data-filter="Niavent">ניאוונט</button>
            <button class="btn btn-sm songs-filter-btn" data-filter="zeibekiko">זεϊμπέκικο</button>
            <button class="btn btn-sm songs-filter-btn" data-filter="famous">מפורסמים</button>
            <button class="btn btn-sm songs-filter-btn" data-filter="israeli-hit">להיטים בישראל</button>
            <button class="btn btn-sm songs-filter-btn" data-filter="kazantzidis">קזנצידיס</button>
            <button class="btn btn-sm songs-filter-btn" data-filter="custom">שלי</button>
          </div>
          <div class="songs-entries" id="songs-entries"></div>
          <button class="btn btn-gold songs-add-btn" id="songs-add-btn">+ הוספת שיר</button>
        </div>
        <div class="songs-main" id="songs-detail">
          <div class="songs-empty-state">
            <div class="songs-empty-icon">🎵</div>
            <h2>ספריית שירים</h2>
            <p>בחרו שיר מהרשימה או הוסיפו שיר חדש</p>
          </div>
        </div>
      </div>
    `;

    _injectStyles();
    _renderList();
    _bindEvents();
    window.addEventListener('resize', () => {
      if (!_isMobileSongs()) {
        document.querySelector('.songs-layout')?.classList.remove('detail-open');
      }
    });
  }

  function _isZeibekikoSong(s) {
    return s.style === 'zeibekiko' || s.timeSignature === '9/4';
  }

  function _isKazantzidisSong(s) {
    return (s.tags || []).includes('kazantzidis') ||
      (s.artist || '').includes('Καζαντζίδης');
  }

  function _isFamousSong(s) {
    return (s.tags || []).includes('famous');
  }

  function _isIsraeliHitSong(s) {
    return (s.tags || []).includes('israeli-hit');
  }

  function _renderList(filter, search) {
    const container = document.getElementById('songs-entries');
    if (!container) return;
    let songs = getAllSongs();

    if (filter && filter !== 'all') {
      if (filter === 'custom') {
        songs = songs.filter(s => s.custom);
      } else if (filter === 'zeibekiko') {
        songs = songs.filter(s => _isZeibekikoSong(s));
      } else if (filter === 'kazantzidis') {
        songs = songs.filter(s => _isKazantzidisSong(s));
      } else if (filter === 'famous') {
        songs = songs.filter(s => _isFamousSong(s));
      } else if (filter === 'israeli-hit') {
        songs = songs.filter(s => _isIsraeliHitSong(s));
      } else {
        songs = songs.filter(s => s.dromos === filter);
      }
    }
    if (search) {
      const q = search.toLowerCase();
      songs = songs.filter(s =>
        (s.title || '').toLowerCase().includes(q) ||
        (s.titleGr || '').toLowerCase().includes(q) ||
        (s.titleHe || '').toLowerCase().includes(q) ||
        (s.hebrewHit || '').toLowerCase().includes(q) ||
        (s.israeliArtist || '').toLowerCase().includes(q) ||
        (s.artist || '').toLowerCase().includes(q) ||
        (s.artistHe || '').toLowerCase().includes(q)
      );
    }

    container.innerHTML = songs.map(s => {
      const hasRef = !!getSongReference(s);
      return `
      <div class="songs-entry" data-id="${s.id}">
        <div class="songs-entry-title">${hasRef ? '🎧 ' : ''}${s.titleGr || s.title}</div>
        <div class="songs-entry-sub">${s.artistHe || s.artist}${s.israeliArtist ? ' · feat. ' + s.israeliArtist : ''} &middot; ${s.dromos || ''} &middot; ${s.key}${_isZeibekikoSong(s) ? ' &middot; 9/4' : ''}</div>
        ${s.custom ? '<span class="songs-entry-badge">מותאם</span>' : ''}
        ${s.israeliMedley ? '<span class="songs-entry-badge medley-badge">מחרוזת</span>' : ''}
        ${_isZeibekikoSong(s) ? '<span class="songs-entry-badge zeibekiko-badge">ζεϊμπέκικο</span>' : ''}
        ${_isKazantzidisSong(s) ? '<span class="songs-entry-badge kaz-badge">קזנצידיס</span>' : ''}
        ${_isFamousSong(s) ? '<span class="songs-entry-badge famous-badge">מפורסם</span>' : ''}
        ${_isIsraeliHitSong(s) ? '<span class="songs-entry-badge israeli-hit-badge">🇮🇱 להיט</span>' : ''}
      </div>`;
    }).join('');

    const countEl = document.getElementById('songs-count');
    if (countEl) {
      countEl.textContent = songs.length
        ? `${songs.length} שירים`
        : 'אין שירים במסנן זה';
    }
  }

  function _showSong(song) {
    const detail = document.getElementById('songs-detail');
    if (!detail) return;

    _setMobileDetailOpen(true);

    const dromosInfo = (typeof DROMOI !== 'undefined')
      ? DROMOI.find(d => d.nameEn === song.dromos || d.id === song.dromos.toLowerCase())
      : null;

    /* אוסף אקורדים ייחודיים */
    const uniqueChords = new Set();
    song.sections.forEach(sec =>
      sec.lines.forEach(line =>
        (line.chords || []).forEach(ch => { if (ch) uniqueChords.add(ch); })
      )
    );

    detail.innerHTML = `
      <button type="button" class="btn btn-sm song-back-btn" id="song-back-list">← רשימת שירים</button>
      <div class="song-header">
        <div class="song-title-row">
          <h2 class="song-title">${song.titleGr || song.title}</h2>
          ${song.titleHe ? `<span class="song-title-he">${song.titleHe}</span>` : ''}
          ${song.hebrewHit ? `<span class="song-hebrew-hit">🇮🇱 ${song.hebrewHit}</span>` : ''}
          ${song.israeliArtist ? `<span class="song-israeli-artist">🎤 feat. ${song.israeliArtist}</span>` : ''}
        </div>
        <div class="song-meta">
          <span class="badge">${song.artistHe || song.artist}</span>
          <span class="badge alt">${song.dromos}</span>
          <span class="badge">${song.key}</span>
          <span class="badge alt">${song.bpm} BPM</span>
          <span class="badge">${song.timeSignature}</span>
        </div>
        ${dromosInfo ? `<div class="song-dromos-info">${dromosInfo.nameHe} — ${dromosInfo.mood || ''}</div>` : ''}
      </div>

      ${_renderDromosCard(song)}

      ${_renderReference(song)}

      <div class="song-controls">
        <button class="btn btn-gold" id="song-play">&#9654; נגינה</button>
        <button class="btn" id="song-stop">&#9632; עצירה</button>
        <div class="song-tempo-ctrl">
          <label>טמפו:</label>
          <button class="btn btn-sm" id="song-bpm-down">-</button>
          <span id="song-bpm-val">${song.bpm}</span>
          <button class="btn btn-sm" id="song-bpm-up">+</button>
        </div>
        <div class="song-transpose-ctrl">
          <label>טרנספוז:</label>
          <button class="btn btn-sm" id="song-tr-down">-1</button>
          <span id="song-tr-val">0</span>
          <button class="btn btn-sm" id="song-tr-up">+1</button>
        </div>
        ${song.custom ? `<button class="btn song-del-btn" id="song-delete">מחיקה</button>` : ''}
      </div>

      <div class="song-chords-bar">
        <div class="song-chords-label">אקורדים בשיר:</div>
        <div class="song-chord-diagrams">
          ${[...uniqueChords].map(ch => _chordDiagramSVG(ch)).join('')}
        </div>
      </div>

      ${_renderBouzoukiPart(song)}

      <div class="song-scroll-area" id="song-scroll-area">
        ${_renderSections(song)}
      </div>
    `;

    /* אירועים */
    let transposeSemi = 0;
    let displaySong = song;

    const playBtn = detail.querySelector('#song-play');
    const stopBtn = detail.querySelector('#song-stop');
    const bpmDown = detail.querySelector('#song-bpm-down');
    const bpmUp = detail.querySelector('#song-bpm-up');
    const bpmVal = detail.querySelector('#song-bpm-val');
    const trDown = detail.querySelector('#song-tr-down');
    const trUp = detail.querySelector('#song-tr-up');
    const trVal = detail.querySelector('#song-tr-val');
    const delBtn = detail.querySelector('#song-delete');
    const backBtn = detail.querySelector('#song-back-list');

    if (backBtn) backBtn.onclick = () => _closeMobileDetail();

    if (playBtn) playBtn.onclick = () => {
      playBtn.classList.add('playing');
      playSong(displaySong);
    };
    if (stopBtn) stopBtn.onclick = () => {
      if (playBtn) playBtn.classList.remove('playing');
      stopSong();
    };

    if (bpmDown) bpmDown.onclick = () => {
      displaySong = { ...displaySong, bpm: Math.max(30, displaySong.bpm - 5) };
      _currentBpm = displaySong.bpm;
      if (bpmVal) bpmVal.textContent = displaySong.bpm;
      if (_scheduler) {
        const sub = (_bouzoukiMeta && _playMode === 'bouzouki') ? _bouzoukiMeta.sub : 1;
        _scheduler.stepDur = 60 / _currentBpm / sub;
      }
    };
    if (bpmUp) bpmUp.onclick = () => {
      displaySong = { ...displaySong, bpm: Math.min(240, displaySong.bpm + 5) };
      _currentBpm = displaySong.bpm;
      if (bpmVal) bpmVal.textContent = displaySong.bpm;
      if (_scheduler) {
        const sub = (_bouzoukiMeta && _playMode === 'bouzouki') ? _bouzoukiMeta.sub : 1;
        _scheduler.stepDur = 60 / _currentBpm / sub;
      }
    };

    if (trDown) trDown.onclick = () => {
      transposeSemi--;
      displaySong = transpose(song, transposeSemi);
      if (trVal) trVal.textContent = transposeSemi;
      _refreshSongView(displaySong, detail);
    };
    if (trUp) trUp.onclick = () => {
      transposeSemi++;
      displaySong = transpose(song, transposeSemi);
      if (trVal) trVal.textContent = transposeSemi;
      _refreshSongView(displaySong, detail);
    };

    if (delBtn) delBtn.onclick = () => {
      deleteSong(song.id);
      _renderList();
      detail.innerHTML = '<div class="songs-empty-state"><h2>השיר נמחק</h2></div>';
    };

    const previewDromos = detail.querySelector('#song-preview-dromos');
    if (previewDromos) previewDromos.onclick = () => _previewDromos(displaySong);

    _bindBouzoukiPartEvents(detail, displaySong);
    _bindSongChordTooltips(detail);
  }

  function _refreshSongView(song, detail) {
    const area = detail.querySelector('#song-scroll-area');
    if (area) area.innerHTML = _renderSections(song);
    /* עדכון פס האקורדים */
    const diagrams = detail.querySelector('.song-chord-diagrams');
    if (diagrams) {
      const uniqueChords = new Set();
      song.sections.forEach(sec =>
        sec.lines.forEach(line =>
          (line.chords || []).forEach(ch => { if (ch) uniqueChords.add(ch); })
        )
      );
      diagrams.innerHTML = [...uniqueChords].map(ch => _chordDiagramSVG(ch)).join('');
    }
    /* עדכון badge של key */
    const badges = detail.querySelectorAll('.badge');
    badges.forEach(b => {
      if (CHROMATIC.includes(b.textContent) || b.textContent.match(/^[A-G][#b]?m?$/)) {
        b.textContent = song.key;
      }
    });
    const bouzPart = detail.querySelector('.song-bouzouki-part');
    const bouzEmpty = detail.querySelector('.song-bouzouki-empty');
    const bouzHtml = _renderBouzoukiPart(song);
    if (bouzPart) {
      const tmp = document.createElement('div');
      tmp.innerHTML = bouzHtml;
      bouzPart.replaceWith(tmp.firstElementChild);
      _bindBouzoukiPartEvents(detail, song);
      _bindSongChordTooltips(detail);
    } else if (bouzEmpty) {
      const tmp = document.createElement('div');
      tmp.innerHTML = bouzHtml;
      bouzEmpty.replaceWith(tmp.firstElementChild);
      _bindBouzoukiPartEvents(detail, song);
      _bindSongChordTooltips(detail);
    }
    _bindSongChordTooltips(detail);
  }

  function _renderSections(song) {
    let beatIdx = 0;
    return song.sections.map(sec => {
      const linesHtml = sec.lines.map(line => {
        const chordsHtml = (line.chords || []).map(ch => {
          const idx = beatIdx;
          beatIdx++;
          const html = ch
            ? `<span class="song-chord" data-beat-idx="${idx}" data-chord="${ch}">${ch}</span>`
            : `<span class="song-chord-space" data-beat-idx="${idx}"></span>`;
          return html;
        }).join('');
        const isGreek = /[Ͱ-Ͽ]/.test(line.lyrics);
        const dirAttr = isGreek ? ' dir="ltr" class="song-lyrics-ltr"' : '';
        return `
          <div class="song-line">
            <div class="song-line-chords">${chordsHtml}</div>
            ${line.lyrics ? `<div class="song-line-lyrics"${dirAttr}>${line.lyrics}</div>` : ''}
          </div>
        `;
      }).join('');
      return `
        <div class="song-section">
          <div class="song-section-name">[${sec.name}]</div>
          ${linesHtml}
        </div>
      `;
    }).join('');
  }

  function _startAutoScroll() {
    if (_scrollTimer) clearInterval(_scrollTimer);
    const area = document.getElementById('song-scroll-area');
    if (!area) return;
    const pxPerSec = 30 * (_currentBpm / 120);
    _scrollTimer = setInterval(() => {
      if (_playing) area.scrollTop += pxPerSec / 10;
    }, 100);
  }

  /* ===================== אירועים ===================== */

  function _bindEvents() {
    /* רשימת שירים */
    const entries = document.getElementById('songs-entries');
    if (entries) {
      entries.addEventListener('click', e => {
        const entry = e.target.closest('.songs-entry');
        if (!entry) return;
        const id = entry.dataset.id;
        const song = getAllSongs().find(s => s.id === id);
        if (song) {
          entries.querySelectorAll('.songs-entry').forEach(e => e.classList.remove('selected'));
          entry.classList.add('selected');
          stopSong();
          _showSong(song);
        }
      });
    }

    /* חיפוש */
    const searchInput = document.getElementById('songs-search');
    let currentFilter = 'all';
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        _renderList(currentFilter, searchInput.value);
      });
    }

    /* מסנני דרומוס */
    const filterBtns = document.querySelectorAll('.songs-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        _renderList(currentFilter, searchInput ? searchInput.value : '');
      });
    });

    /* כפתור הוספה */
    const addBtn = document.getElementById('songs-add-btn');
    if (addBtn) addBtn.onclick = _showAddSongDialog;
  }

  function _showAddSongDialog() {
    const detail = document.getElementById('songs-detail');
    if (!detail) return;
    _setMobileDetailOpen(true);

    detail.innerHTML = `
      <button type="button" class="btn btn-sm song-back-btn" id="song-back-list">← רשימת שירים</button>
      <div class="song-header">
        <h2 class="song-title">הוספת שיר חדש</h2>
        <p>הדביקו טקסט עם אקורדים ומילים בפורמט הבא:</p>
      </div>
      <div class="song-add-form">
        <div class="song-add-hint">
          <pre dir="ltr">Title: Song Name
Artist: Artist Name
Dromos: Hitzaz
Key: D
BPM: 120
Reference: https://www.youtube.com/watch?v=VIDEO_ID

[Intro]
|D    |D    |Eb   |D    |

[Verse]
     D              Eb
Lyrics go here under chords
     D              Gm
More lyrics here</pre>
        </div>
        <textarea id="song-paste-area" class="songs-textarea" rows="18"
                  placeholder="הדביקו כאן את טקסט השיר..."></textarea>
        <div class="song-add-actions">
          <button class="btn btn-gold" id="song-parse-btn">ניתוח ושמירה</button>
          <button class="btn" id="song-cancel-btn">ביטול</button>
        </div>
      </div>
    `;

    detail.querySelector('#song-parse-btn').onclick = () => {
      const text = detail.querySelector('#song-paste-area').value;
      if (!text.trim()) return;
      const song = parseSong(text);
      song.custom = true;
      saveSong(song);
      _renderList();
      _showSong(song);
    };

    detail.querySelector('#song-cancel-btn').onclick = () => {
      _closeMobileDetail();
      detail.innerHTML = '<div class="songs-empty-state"><div class="songs-empty-icon">🎵</div><h2>ספריית שירים</h2></div>';
    };

    const backBtn = detail.querySelector('#song-back-list');
    if (backBtn) backBtn.onclick = () => _closeMobileDetail();
  }

  /* ===================== סטיילינג ===================== */

  function _injectStyles() {
    if (document.getElementById('song-lib-styles')) return;
    const style = document.createElement('style');
    style.id = 'song-lib-styles';
    style.textContent = `
      /* ====== Song Library Layout ====== */
      .songs-layout {
        display: flex; gap: 0; min-height: 520px;
      }
      .songs-sidebar {
        width: 280px; min-width: 220px; max-width: 320px;
        background: var(--bg-card); border-left: 1px solid rgba(79,179,217,0.12);
        display: flex; flex-direction: column; overflow: hidden;
      }
      .songs-main {
        flex: 1; overflow-y: auto; padding: 24px 28px;
      }
      .songs-search-box { padding: 12px 12px 6px; }
      .songs-input {
        width: 100%; padding: 8px 12px; border-radius: 8px;
        border: 1px solid rgba(79,179,217,0.18); background: var(--bg-deep);
        color: var(--text); font-family: Heebo, sans-serif; font-size: 14px;
        outline: none; transition: border-color 0.2s;
      }
      .songs-input:focus { border-color: var(--aegean); }
      .songs-filter {
        padding: 6px 12px; display: flex; flex-wrap: wrap; gap: 4px;
      }
      .songs-filter-btn {
        font-size: 12px !important; padding: 3px 8px !important;
      }
      .songs-filter-btn.active {
        background: var(--aegean) !important; color: #fff !important;
        border-color: var(--aegean) !important;
      }
      .songs-entries {
        flex: 1 1 auto; min-height: 120px; overflow-y: auto; padding: 4px 8px;
        -webkit-overflow-scrolling: touch;
      }
      .songs-entry {
        padding: 10px 12px; border-radius: 8px; cursor: pointer;
        border: 1px solid transparent; margin-bottom: 4px;
        transition: background 0.15s, border-color 0.15s;
        touch-action: manipulation;
        -webkit-tap-highlight-color: transparent;
      }
      .songs-entry:hover { background: rgba(79,179,217,0.07); }
      .songs-entry.selected {
        background: rgba(227,179,65,0.1); border-color: var(--gold);
      }
      .songs-entry-title {
        font-weight: 600; font-size: 14px; color: var(--text);
        direction: ltr; text-align: right;
      }
      .songs-entry-sub {
        font-size: 12px; color: var(--text-dim); margin-top: 2px;
      }
      .songs-entry-badge {
        display: inline-block; font-size: 10px; background: rgba(227,179,65,0.15);
        color: var(--gold); padding: 1px 6px; border-radius: 4px; margin-top: 4px;
      }
      .songs-entry-badge.zeibekiko-badge {
        background: rgba(180,100,140,0.18); color: #d4a0b8; margin-right: 4px;
      }
      .songs-entry-badge.kaz-badge {
        background: rgba(79,140,200,0.18); color: #9fd0f0; margin-right: 4px;
      }
      .songs-entry-badge.famous-badge {
        background: rgba(227,179,65,0.22); color: var(--gold-soft); margin-right: 4px;
      }
      .songs-entry-badge.israeli-hit-badge {
        background: rgba(80,160,120,0.18); color: #8fd4b0; margin-right: 4px;
      }
      .songs-entry-badge.medley-badge {
        background: rgba(140,120,200,0.18); color: #c0b0f0; margin-right: 4px;
      }
      .songs-add-btn {
        margin: 8px 12px; flex-shrink: 0;
      }
      .songs-list-head {
        padding: 8px 12px 0; display: none;
      }
      .songs-list-count {
        font-size: 13px; font-weight: 700; color: var(--aegean);
      }
      .song-back-btn {
        display: none;
        margin-bottom: 12px;
      }

      /* ====== Song Detail ====== */
      .songs-empty-state {
        text-align: center; padding: 60px 20px; color: var(--text-dim);
      }
      .songs-empty-icon { font-size: 48px; margin-bottom: 12px; }
      .song-header { margin-bottom: 16px; }
      .song-title-row { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
      .song-title {
        font-size: 26px; color: var(--gold-soft); font-weight: 700; margin: 0;
        direction: ltr;
      }
      .song-title-he { font-size: 16px; color: var(--text-dim); }
      .song-hebrew-hit {
        font-size: 14px; color: #8fd4b0; background: rgba(80,160,120,0.12);
        padding: 2px 10px; border-radius: 6px;
      }
      .song-israeli-artist {
        font-size: 13px; color: #c0b0f0; background: rgba(140,120,200,0.12);
        padding: 2px 10px; border-radius: 6px;
      }
      .song-meta {
        display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;
      }
      .song-dromos-info {
        font-size: 13px; color: var(--aegean); margin-top: 8px; font-style: italic;
      }
      .song-dromos-card {
        margin: 14px 0; padding: 14px 16px;
        background: rgba(79,179,217,0.06); border-radius: 12px;
        border: 1px solid rgba(79,179,217,0.22);
      }
      .song-dromos-card.playing {
        border-color: var(--gold);
        box-shadow: 0 0 0 2px rgba(227,179,65,0.15);
      }
      .song-dromos-card-head {
        display: flex; align-items: center; justify-content: space-between;
        gap: 10px; flex-wrap: wrap; margin-bottom: 8px;
      }
      .song-dromos-card h3 {
        margin: 0; font-size: 16px; color: var(--aegean);
      }
      .song-dromos-gr { font-size: 13px; color: var(--text-dim); font-weight: 500; }
      .song-dromos-mood { font-size: 13px; color: var(--text-dim); margin: 0 0 6px; }
      .song-dromos-chords { font-size: 13px; margin: 0 0 8px; line-height: 1.5; }
      .song-dromos-play-hint { font-size: 12px; color: var(--text-dim); margin: 8px 0 0; }
      .song-line.line-active {
        background: rgba(227,179,65,0.06);
        border-radius: 8px;
        margin: 0 -6px; padding: 2px 6px;
      }

      /* Reference / YouTube player */
      .song-reference {
        margin: 12px 0 16px;
        padding: 12px 14px;
        border-radius: 10px;
        background: rgba(11,22,35,0.55);
        border: 1px solid rgba(79,179,217,0.15);
      }
      .song-ref-header {
        display: flex; align-items: center; justify-content: space-between;
        gap: 10px; flex-wrap: wrap; margin-bottom: 10px;
      }
      .song-ref-title {
        font-size: 14px; color: var(--gold-soft); font-weight: 600;
      }
      .song-ref-link {
        font-size: 13px; color: var(--aegean); text-decoration: none;
      }
      .song-ref-link:hover { text-decoration: underline; }
      .song-yt-wrap {
        position: relative; width: 100%; padding-bottom: 56.25%;
        border-radius: 8px; overflow: hidden; background: #000;
      }
      .song-yt-iframe {
        position: absolute; inset: 0; width: 100%; height: 100%;
        border: 0;
      }

      /* Controls */
      .song-controls {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        padding: 12px 0; border-bottom: 1px solid rgba(79,179,217,0.1);
      }
      .song-tempo-ctrl, .song-transpose-ctrl {
        display: flex; align-items: center; gap: 5px; font-size: 13px;
      }
      .song-tempo-ctrl label, .song-transpose-ctrl label {
        color: var(--text-dim); font-size: 12px;
      }
      .song-del-btn {
        background: rgba(217,100,89,0.15) !important;
        border-color: var(--accent-red) !important;
        color: var(--accent-red) !important;
        margin-right: auto;
      }

      /* Chord bar */
      .song-chords-bar {
        padding: 12px 0; border-bottom: 1px solid rgba(79,179,217,0.1);
      }
      .song-chords-label {
        font-size: 13px; color: var(--text-dim); margin-bottom: 8px;
      }
      .song-chord-diagrams {
        display: flex; gap: 6px; flex-wrap: wrap;
      }
      .chord-mini-svg {
        width: 52px; height: 68px; background: rgba(11,22,35,0.5);
        border-radius: 6px; border: 1px solid rgba(79,179,217,0.12);
      }

      /* Bouzouki accompaniment part */
      .song-bouzouki-part {
        margin: 16px 0; padding: 16px;
        background: rgba(11,22,35,0.45); border-radius: 12px;
        border: 1px solid rgba(227,179,65,0.22);
      }
      .song-bouzouki-head {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 8px;
      }
      .song-bouzouki-title {
        margin: 0; font-size: 17px; color: var(--gold);
      }
      .song-bouzouki-desc {
        font-size: 13px; color: var(--text-dim); margin: 0 0 12px; line-height: 1.5;
      }
      .song-bouzouki-tips {
        font-size: 13px; color: var(--gold); margin: -4px 0 12px; line-height: 1.5;
        padding: 8px 12px; background: rgba(227,179,65,0.08); border-radius: 8px;
        border-right: 3px solid var(--gold);
      }
      .song-play-mode { display: flex; gap: 8px; margin-bottom: 14px; }
      .song-bouzouki-section { margin-bottom: 14px; }
      .song-bouzouki-label {
        font-size: 12px; font-weight: 700; color: var(--aegean);
        margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;
      }
      .song-fret-table {
        width: 100%; max-width: 420px; border-collapse: collapse;
        font-family: 'Courier New', monospace; direction: ltr;
      }
      .song-fret-table th, .song-fret-table td {
        border: 1px solid rgba(79,179,217,0.15); padding: 6px 10px; text-align: center;
      }
      .song-fret-table th { background: rgba(79,179,217,0.08); color: var(--aegean); font-size: 12px; }
      .song-fret-table .fret-chord-name { color: var(--gold); font-weight: 700; }
      .song-fret-table .fret-num { display: block; font-size: 18px; font-weight: 900; color: var(--text); }
      .song-fret-table .fret-course { display: block; font-size: 10px; color: var(--text-dim); }
      .song-fret-hint { font-size: 11px; color: var(--text-dim); margin-top: 6px; direction: rtl; }
      .song-strum-scroll {
        overflow-x: auto; padding-bottom: 6px;
        -webkit-overflow-scrolling: touch;
      }
      .song-strum-strip {
        display: flex; gap: 4px; min-width: min-content; padding: 4px 0;
      }
      .song-bouzouki-hint { font-size: 11.5px; color: var(--text-dim); margin-top: 6px; }
      .song-bouzouki-hint .hint-gold { color: var(--gold); font-weight: 700; }
      .song-bouzouki-learn {
        display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
        font-size: 13px; color: var(--text-dim); margin-top: 4px;
      }
      .song-bouzouki-auto { background: rgba(79,179,217,0.15); }
      .song-bouzouki-custom { background: rgba(227,179,65,0.15); }
      .song-bouzouki-empty {
        padding: 12px; color: var(--text-dim); font-size: 13px;
      }

      /* Scroll area */
      .song-scroll-area {
        padding-top: 16px; max-height: 55vh; overflow-y: auto;
        scroll-behavior: smooth;
      }
      .song-section { margin-bottom: 20px; }
      .song-section-name {
        color: var(--aegean); font-weight: 700; font-size: 14px;
        margin-bottom: 6px; direction: ltr;
      }
      .song-line {
        margin-bottom: 8px; padding: 2px 0;
      }
      .song-line-chords {
        display: flex; gap: 16px; direction: ltr;
        font-family: 'Courier New', monospace; font-weight: 700;
        min-height: 22px;
      }
      .song-chord {
        color: var(--gold); font-size: 15px; cursor: pointer;
        padding: 1px 4px; border-radius: 4px;
        transition: background 0.15s, color 0.15s;
      }
      .song-chord:hover {
        background: rgba(227,179,65,0.15);
      }
      .song-chord.chord-active {
        background: var(--gold); color: var(--bg-deep);
      }
      .song-chord-space { min-width: 24px; }
      .song-line-lyrics {
        font-size: 15px; color: var(--text); line-height: 1.55;
        white-space: pre-wrap;
      }
      .song-line-lyrics.song-lyrics-ltr {
        direction: ltr; text-align: left;
      }

      /* Add dialog */
      .song-add-form { margin-top: 12px; }
      .song-add-hint {
        background: var(--bg-deep); border-radius: 8px; padding: 12px;
        margin-bottom: 12px; border: 1px solid rgba(79,179,217,0.1);
      }
      .song-add-hint pre {
        font-size: 12px; color: var(--text-dim); margin: 0; white-space: pre-wrap;
        direction: ltr; text-align: left;
      }
      .songs-textarea {
        width: 100%; padding: 12px; border-radius: 8px;
        border: 1px solid rgba(79,179,217,0.18); background: var(--bg-deep);
        color: var(--text); font-family: 'Courier New', monospace; font-size: 13px;
        resize: vertical; outline: none; direction: ltr; text-align: left;
      }
      .songs-textarea:focus { border-color: var(--aegean); }
      .song-add-actions {
        display: flex; gap: 8px; margin-top: 10px;
      }

      /* Responsive */
      @media (max-width: 860px) {
        .songs-layout {
          flex-direction: column;
          min-height: auto;
          height: auto;
        }
        .songs-sidebar {
          width: 100%;
          max-width: none;
          min-width: auto;
          max-height: none;
          border-left: none;
          border-bottom: none;
          overflow: visible;
          flex: none;
        }
        .songs-list-head { display: block; }
        .songs-entries {
          flex: none;
          min-height: calc(100dvh - 340px);
          max-height: none;
          overflow-y: auto;
        }
        .songs-main {
          padding: 14px;
          min-height: auto;
          flex: none;
        }
        /* master/detail: רשימה מלאה או שיר — לא שניהם דחוסים */
        .songs-layout:not(.detail-open) .songs-main {
          display: none;
        }
        .songs-layout.detail-open .songs-sidebar {
          display: none;
        }
        .songs-layout.detail-open .songs-main {
          display: block;
          min-height: calc(100dvh - 220px);
        }
        .song-back-btn { display: inline-flex; }
        .songs-filter {
          overflow-x: auto;
          flex-wrap: nowrap;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          padding-bottom: 8px;
        }
        .songs-filter::-webkit-scrollbar { display: none; }
        .songs-filter-btn {
          white-space: nowrap;
          flex-shrink: 0;
        }
        .song-scroll-area { max-height: none; }
        .songs-entry-title { font-size: 13px; }
        .songs-entry-sub { font-size: 11px; }
        .songs-search-box { padding: 8px 8px 4px; }
        .songs-add-btn { margin: 6px 8px 12px; font-size: 13px; }
      }
      @media (max-width: 400px) {
        .songs-entries { min-height: calc(100dvh - 320px); }
        .songs-entry { padding: 8px 10px; }
        .songs-filter-btn { font-size: 11px !important; padding: 2px 6px !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function openSongById(songId) {
    const song = getAllSongs().find(s => s.id === songId);
    if (!song) return false;
    const navBtn = document.querySelector('.nav-btn[data-screen="songs"]');
    if (navBtn) navBtn.click();
    setTimeout(() => {
      const entry = document.querySelector(`.songs-entry[data-id="${songId}"]`);
      if (entry) {
        document.querySelectorAll('.songs-entry').forEach(e => e.classList.remove('selected'));
        entry.classList.add('selected');
        stopSong();
        _showSong(song);
      }
    }, 80);
    return true;
  }

  /* ===================== API ===================== */

  return {
    init,
    parseSong,
    playSong,
    stopSong,
    transpose,
    saveSong,
    deleteSong,
    getAllSongs,
    getSongReference,
    openSongById,
    resetMobileView: _closeMobileDetail,
    BUILTIN_SONGS,
  };

})();
