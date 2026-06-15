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

  /** קישור לביצוע מקורי ב-YouTube */
  function songRef(youtubeId, label) {
    if (!youtubeId) return null;
    const m = String(youtubeId).match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const id = m ? m[1] : String(youtubeId).slice(0, 11);
    return {
      youtubeId: id,
      url: 'https://www.youtube.com/watch?v=' + id,
      label: label || 'הקלטה מקורית',
    };
  }

  function normalizeReference(ref) {
    if (!ref) return null;
    if (typeof ref === 'string') return songRef(ref);
    if (ref.youtubeId) return songRef(ref.youtubeId, ref.label);
    if (ref.url) {
      const m = ref.url.match(/(?:v=|\/embed\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      return m ? songRef(m[1], ref.label) : null;
    }
    return null;
  }

  /** הפניות לביצועים מקוריים (YouTube) */
  const SONG_REFERENCES = {
    misirlou: songRef('oJN6QYVmcH0', 'Τέτος Δημητριάδης, 1927'),
    frangosyriani: songRef('P2dQdqurqQ0', 'Τρίο Τεκέ — πρώτη εκτέλεση'),
    'varka-sto-gialo': songRef('4Rxpk-9eI4c', 'Βασίλης Τσιτσάνης'),
    'ta-matomena-chomata': songRef('yuTWdVn0kn8', 'Βασίλης Τσιτσάνης'),
    'minore-tou-teke': songRef('SNODpNOX6mo', 'Σπύρος Περιστέρης'),
    'o-xenos': songRef('5d8aCbgibm8', 'Απόστολος Χατζηχρήστος'),
    'trelos-tsiganos': songRef('yuTWdVn0kn8', 'Βασίλης Τσιτσάνης'),
    'hasapiko-andreiomeno': songRef('Xsen9Jh-TPo', 'Μίκης Θεοδωράκης'),
    'ti-se-melei-esenane': songRef('0vLN50BR7xs', 'Μάρκος Βαμβακάρης'),
    'apopse-tha-pio': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'i-geitonia-mas': songRef('4Rxpk-9eI4c', 'Βασίλης Τσιτσάνης'),
    'san-sfyrixeis-treis-fores': songRef('yuTWdVn0kn8', 'Βασίλης Τσιτσάνης'),
    'palios-stratiotis': songRef('0vLN50BR7xs', 'Μάρκος Βαμβακάρης'),
    'vre-melahrinaki': songRef('5yC7Th21kw4', 'Μανώλης Χιώτης'),
    'zeibekiko-tis-evdokias': songRef('FFC5pMixoi8', 'Μάνος Λοΐζος — Ευδοκία'),
    'synefiasmeni-kyriaki': songRef('yuTWdVn0kn8', 'Βασίλης Τσιτσάνης'),
    'ta-paidia-tou-peiraia': songRef('VcTdvBr30xY', 'Μελίνα Μερκούρη'),
    'zorbas-syrtaki': songRef('Xsen9Jh-TPo', 'Μίκης Θεοδωράκης — Ζορμπάς'),
    iliovasilemata: songRef('5yC7Th21kw4', 'Μανώλης Χιώτης & Μαίρη Λίντα'),
    'o-charmanis': songRef('0vLN50BR7xs', 'Μάρκος Βαμβακάρης, 1933'),
    'to-vaporaki': songRef('4Rxpk-9eI4c', 'Βασίλης Τσιτσάνης'),
    karadouzeni: songRef('0vLN50BR7xs', 'Μάρκος Βαμβακάρης, 1933'),
    'omorfi-thessaloniki': songRef('2eJB0BiHShE', 'Πρόδρομος Τσαουσάκης, 1950'),
    'den-thelo-na-xeniteveis': songRef('yuTWdVn0kn8', 'Γρηγόρης Μπιθικώτσης'),
    'stou-oneirou-tis-agapis': songRef('Xsen9Jh-TPo', 'Μίκης Θεοδωράκης'),
    'haroumena-xenia': songRef('4Rxpk-9eI4c', 'Βασίλης Τσιτσάνης'),
    'mana-mou-psilellada': songRef('0vLN50BR7xs', 'Μάρκος Βαμβακάρης'),
    'stin-akrogialia-delpen': songRef('VcTdvBr30xY', 'Βασίλης Τσιτσάνης'),
    'i-atakti': songRef('a5R9iUiVMj8', 'Μάρκος Βαμβακάρης, 1963'),
    'san-apokliros-gyrizo': songRef('xCL8wBw4mzU', 'Σωτηρία Μπέλλου, 1951'),
    'kane-ligaki-ipomoni': songRef('wDoAUD4gyro', 'Σωτηρία Μπέλλου, 1949'),
    'o-dervisis': songRef('0vLN50BR7xs', 'Μάρκος Βαμβακάρης, 1933'),
    'ta-matoklada-sou-lampoun': songRef('nsCcFV-A324', 'Γρηγόρης Μπιθικώτσης'),
    'minore-tis-avgis': songRef('0vLN50BR7xs', 'Μάρκος Βαμβακάρης, 1946'),
    'oli-i-rebetes-tou-ntounia': songRef('0vLN50BR7xs', 'Μάρκος Βαμβακάρης, 1937'),
    'trexe-magka-na-rotisis': songRef('yuTWdVn0kn8', 'Στέλλα Χασκίλ & Μ. Βαμβακάρης'),
    'mortissa-hasiklou': songRef('0vLN50BR7xs', 'Μάρκος Βαμβακάρης, 1933'),
    'magkas-vgike-gia-sergiani': songRef('4Rxpk-9eI4c', 'Μάρκος Βαμβακάρης & Β. Τσιτσάνης'),
    'to-mystiko-zeibekiko': songRef('SNODpNOX6mo', 'Ιωάννης Χαλικιάς, 1932'),
    'i-zoi-mou-oli': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης, 1974'),
    'to-vrady-tha-se-paro': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'to-paidi-tis-gitonias-sou': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'den-tha-klapso-kanenas': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'mia-zoi-monahi': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης & Μαρινέλλα'),
    'o-anthropos-pou-agapas': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'gia-sou-mana': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'ena-komvos-pou-ton-dyo': songRef('4Rxpk-9eI4c', 'Βασίλης Τσιτσάνης'),
    'sto-kafe-tis-gitonias': songRef('2eJB0BiHShE', 'Γιώργος Ζαμπέτας'),
    'ixe-mia-fora-enas-mangas': songRef('0vLN50BR7xs', 'Μάρκος Βαμβακάρης, 1933'),
    'rixe-mia-zaria-kali': songRef('nsCcFV-A324', 'Γρηγόρης Μπιθικώτσης'),
    'i-otiki': songRef('a5R9iUiVMj8', 'Μάρκος Βαμβακάρης'),
    'synefiasmeni-kaz': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'yparho': songRef('pF7ldspZ6-g', 'Στέλιος Καζαντζίδης'),
    'to-teleutaio-vrady-mou': songRef('2qK9JkW6Ikw', 'Στέλιος Καζαντζίδης'),
    'sto-trapezi-pou-ta-pino': songRef('tp-OXnfaFGI', 'Στέλιος Καζαντζίδης'),
    'to-psomi-tis-xenitias': songRef('L3lKycDfBd4', 'Στέλιος Καζαντζίδης'),
    'afti-i-nyhta-menei': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης, 1959'),
    'monos-kaz': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'se-xeni-hora-monos': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης & Μαρινέλλα, 1966'),
    'otan-vradiazei-stin-xenitia': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'stis-famprikes-tis-xenitias': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης, 1965'),
    'nyhterides-ki-arachnes': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'dyo-portes-echei-i-zoi': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'apones-exousies': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης & Μίκης Θεοδωράκης, 1974'),
    'min-taxideveis-more': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'ach-koritsi-mou': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'zigkouala': songRef('QKdIAT4vERI', 'Στέλιος Καζαντζίδης & Μαρινέλλα, 1960'),
    'emis-mazi-tha-zisoume': songRef('3h264pPSqdI', 'Στέλιος Καζαντζίδης & Μαρινέλλα, 1965'),
    'o-vrachos': songRef('xepMvz5KYEg', 'Στέλιος Καζαντζίδης'),
    'to-pelago-einai-vathy': songRef('wcOUFwczuME', 'Στέλιος Καζαντζίδης & Μαρινέλλα'),
    'to-tholomeno-mou-myalo': songRef('v2qZHK4RqnE', 'Στέλιος Καζαντζίδης, 1974'),
    'opoiia-kai-na-eisai': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης & Μαρινέλλα'),
    'gia-mas-pote-min-ximerosei': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης & Μαρινέλλα'),
    'gi-afto-se-filo': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'ena-spiti-den-einai-spiti': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'eisai-i-zoi-mou': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης & Μαρινέλλα'),
    'an-m-agapouses-oso-s-agapo': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης & Μαρινέλλα'),
    'mi-mou-thimonis-matia-mou': songRef('wgi-PTjWdRo', 'Γιώργος Νταλάρας'),
    'itan-pente-itan-exi': songRef('pB3HolfMjpE', 'Γιώργος Νταλάρας, 1974'),
    'namoun-o-megalexandros': songRef('sPT0ipPkYkk', 'Γιώργος Νταλάρας'),
    'ta-pedia-tis-aminas': songRef('NrVjfX9PHCg', 'Γιώργος Νταλάρας — Σταύρος Ξαρχάκος'),
    'ola-kala': songRef('5C7fYJMiQn8', 'Γιώργος Νταλάρας, 1975'),
    'siko-horepse-koukli-mou': songRef('vMLFc8xeCpI', 'Στέλιος Καζαντζίδης, 1958'),
    'dinata-dinata': songRef('6Aj2ah4H5dU', 'Ελευθερία Αρβανιτάκη'),
    'bum-pam': songRef('IzBoFYMoR2k', 'Άρης Σαν'),
    'ena-apogevma-thlimeno': songRef('G8FgFx_zYjY', 'Ζαφείρης Μέλας, 1987'),
    'roza': songRef('EXVamHhnQy4', 'Δημήτρης Μητροπάνος, 1996'),
    agonia: songRef('ep8SJljnd4E', 'Τρύφωνas — Koliphone'),
    'stalia-stalia': songRef('w-FUcCSvf9g', 'Μαρινέλλα, 1968'),
    'vrehisti-sti-ftohogeitonia': songRef('WVpKC9vbpoE', 'Γρηγόρης Μπιθικώτσης, 1960'),
    'odos-aristotelous': songRef('fwuJNZxxoPA', 'Χάρις Αλεξίου, 1974'),
    opalala: songRef('BskC66jVmMA', 'Τρύφωνas — Koliphone'),
    barbaryanis: songRef('oh_JZ_KUUKE', 'Τρύφωνas — Koliphone'),
    'stin-anatoli': songRef('3i7IGP_rebs', 'Τρύφωνas — Koliphone'),
    mitilini: songRef('8g3Gx9ZXsJA', 'Τρύφωνas — Koliphone'),
    salonikios: songRef('ZrdUsYGbVLE', 'Τρύφωνas — Koliphone'),
    palamakia: songRef('BFvlYR2y6Jc', 'Παλαμάκια — λαϊκό'),
    torna: songRef('9npmaiqJm2Y', 'Τρύφωνas — Koliphone'),
    'piga-medley': songRef('5yC7Th21kw4', 'Μεdley — Koliphone'),
    'asi-toktialo': songRef('5yC7Th21kw4', 'Μεdley — Koliphone'),
    'to-megalitero-souxe': songRef('5yC7Th21kw4', 'Άννα Βίσση'),
    'konta-stin-kardia': songRef('5yC7Th21kw4', 'Λαϊκό'),
    'pos-na-se-lismoniso': songRef('5yC7Th21kw4', 'Χάρις Αλεξίου'),
    'an-imoun-mazi-sou': songRef('5yC7Th21kw4', 'Λαϊκό'),
    'teli-teli-teli': songRef('5yC7Th21kw4', 'Χάρις Αλεξίου'),
    'pia-esi': songRef('5yC7Th21kw4', 'Νίκος Βέρτης'),
    'meno-ektos': songRef('5yC7Th21kw4', 'Ελευθερία Αρβανιτάκη'),
    'ta-yi-leo': songRef('5yC7Th21kw4', 'Γιώργος Μαργαρίτης'),
    'ti-thelis-yero': songRef('5yC7Th21kw4', 'Ρένα Κουμιώτη'),
    'poia-thisia': songRef('5yC7Th21kw4', 'Αντζέλα Δημητρίου'),
    'stin-porta-sou': songRef('5yC7Th21kw4', 'Λαϊκό'),
    'ta-mavra-matia-sou': songRef('5yC7Th21kw4', 'Μανώλης Αγγελόπουλος'),
    'den-axizi-ton-kopo': songRef('5yC7Th21kw4', 'Κατερίνα Στανίση'),
    'papse-loipon': songRef('5yC7Th21kw4', 'Σωτήρης Βολάνης'),
    'o-baglamas': songRef('5yC7Th21kw4', 'Γιώργος Νταλάρας'),
    'mou-leipei': songRef('5yC7Th21kw4', 'Σωτήρης Βολάνης'),
    'fevgo-ksana': songRef('5yC7Th21kw4', 'Σωτήρης Βολάνης'),
    'tha-me-thimithis': songRef('5yC7Th21kw4', 'Γιάννης Πάριος'),
    'gie-mou': songRef('5yC7Th21kw4', 'Σταμάτης Κόκοτας'),
    eleni: songRef('5yC7Th21kw4', 'Άννα Βίσση'),
    'halom-metuk': songRef('5yC7Th21kw4', 'Μουσική יוונית-ישראלית'),
    'kolot-pireas': songRef('5yC7Th21kw4', 'Λαϊκό'),
    'ta-daxtylidia': songRef('5yC7Th21kw4', 'Γλυκερία & Γιώργος Μητσάκης'),
    'an-eisai-ena-asteri': songRef('5yC7Th21kw4', 'Νίκος Βέρτης'),
    sigal: songRef('5yC7Th21kw4', 'Άρης Σαν'),
    'dam-dam': songRef('5yC7Th21kw4', 'Τρύφωνas — Koliphone'),
    dirlada: songRef('5yC7Th21kw4', 'Καπετάν Παντελής Γκίνης'),
    'ouiski-gin-vermouth': songRef('5yC7Th21kw4', 'Στέλιος Καζαντζίδης'),
    'fyge-fyge': songRef('5yC7Th21kw4', 'Τάσος Μπογάς'),
    'to-tango-tis-nefelis': songRef('fwuJNZxxoPA', 'Χάρις Αλεξίου'),
    pitsirika: songRef('5yC7Th21kw4', 'Ματθαίος Γιαννούλης'),
    'astin-na-leei': songRef('5yC7Th21kw4', 'Βασίλης Καρράς'),
  };

  function getSongReference(song) {
    return normalizeReference(song.reference) || SONG_REFERENCES[song.id] || null;
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

  function _hasapikoFromBeats(beatChords) {
    const events = [];
    const beats = beatChords.length ? beatChords : ['Dm'];
    beats.forEach((ch, i) => {
      const c = ch || beats[i - 1] || 'Dm';
      events.push({ kind: 'bass', chord: c, len: 2 });
      if (i === beats.length - 1) {
        events.push({ kind: 'strum', chord: c, dir: 'd', len: 1 });
        events.push({ kind: 'strum', chord: c, dir: 'u', len: 1 });
      } else {
        events.push({ kind: 'strum', chord: c, dir: 'd', len: 2 });
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

  function _balladFromBeats(beatChords) {
    const events = [];
    const beats = beatChords.length ? beatChords : ['Dm'];
    beats.forEach((ch, i) => {
      const c = ch || beats[i - 1] || 'Dm';
      events.push({ kind: 'bass', chord: c, len: 2 });
      events.push({ kind: 'strum', chord: c, dir: 'd', len: 2 });
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

  function _buildMeasureEvents(patternId, beatChords) {
    const primary = [...beatChords].reverse().find(Boolean) || beatChords[0] || 'Dm';
    if (patternId === 'zeibekiko') {
      return _zeibekikoMeasure(primary).map(ev => _cloneEv(ev, primary));
    }
    if (patternId === 'tsifteteli') {
      return _tsifteteliMeasure(primary).map(ev => _cloneEv(ev, primary));
    }
    if (patternId === 'ballad') {
      return _balladFromBeats(beatChords);
    }
    return _hasapikoFromBeats(beatChords);
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
    for (let i = 0; i < beats.length; i += bpm) {
      const slice = [];
      for (let j = 0; j < bpm; j++) {
        slice.push(beats[i + j] || beats[i + j - 1] || beats[i] || null);
      }
      events.push(..._buildMeasureEvents(pattern.id, slice));
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
        cell.innerHTML = `<div class="sc-top">↓</div><div class="sc-bottom">בס ${ev.chord}</div>`;
      } else {
        cell.className = 'strum-cell';
        cell.innerHTML = `<div class="sc-top">${ev.dir === 'd' ? '↓' : '↑'}</div><div class="sc-bottom">${ev.chord}</div>`;
      }
      container.appendChild(cell);
    });
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

  /* ===================== בסיס נתונים — שירים ===================== */
  const BUILTIN_SONGS = [
    /* 1 */
    {
      id: 'misirlou',
      title: 'Misirlou',
      titleGr: 'Μισιρλού',
      titleHe: 'מיסירלו',
      hebrewHit: 'להיט עולמי — "ספרות זולה" (Pulp Fiction)',
      artist: 'Μανόλης Χιώτης',
      artistHe: 'מאנוליס חיוטיס',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 120,
      timeSignature: '4/4',
      difficulty: 2,
      bouzoukiPattern: 'hasapiko',
      bouzoukiTips: 'חיג׳אז מהיר: הדגישו D→Eb (מי♭) — הבס על D ואז מעבר חד ל-Eb. שמרו על ↓↑ בסוף כל תיבה.',
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['D', null, 'Eb', 'D'], lyrics: '' },
            { chords: ['D', null, 'Eb', 'D'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, 'Eb', null], lyrics: 'Μισιρλού μου η γλυκειά σου ματιά' },
            { chords: ['D', null, 'Gm', null], lyrics: 'Φωτιά μου \'χεις ανάψει φωτιά' },
            { chords: ['Gm', null, null, null], lyrics: 'Αχ για χαμπίμπι' },
            { chords: ['D', null, null, null], lyrics: 'Αχ για λε λέλι' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Gm', null, 'D', null], lyrics: 'Μισιρλού, Μισιρλού' },
            { chords: ['A7', null, 'D', null], lyrics: 'Τα μάτια σου τα μαύρα' },
            { chords: ['Gm', null, 'D', null], lyrics: 'Μισιρλού, Μισιρλού' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μου κάνεις τα μαύρα' },
          ]
        }
      ]
    },
    /* 2 */
    {
      id: 'frangosyriani',
      title: 'Frangosyriani',
      titleGr: 'Φραγκοσυριανή',
      titleHe: 'פרנגוסיריאני',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Minore',
      key: 'Dm',
      bpm: 100,
      timeSignature: '4/4',
      difficulty: 2,
      bouzoukiPattern: 'hasapiko',
      bouzoukiTips: 'מינורה קלאסית Dm–Gm–A7: בס נקי לפני כל פריטה, מעבר חלק בין הצורות בלי לעצור את יד ימין.',
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Φραγκοσυριανή μου ωραία' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Βγες να σε δω στο παραθύρι' },
            { chords: ['Dm', null, null, null], lyrics: 'Που \'ν\' τα κλειδιά τ\' ουρανού' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Ν\' ανοίξω τα αστέρια' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Φραγκοσυριανή μου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Κάνε μου ένα φιλί' },
            { chords: ['Gm', null, 'Bb', null], lyrics: 'Πώς να υποφέρω' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Χωρίς εσένα πια' },
          ]
        }
      ]
    },
    /* 3 */
    {
      id: 'varka-sto-gialo',
      title: 'Varka sto Gialo',
      titleGr: 'Βάρκα στο Γιαλό',
      titleHe: 'וארקה סטו ג\'יאלו',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Hitzaz',
      key: 'D',
      bpm: 110,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['D', null, 'Eb', 'D'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Βάρκα μου βαρκούλα μου' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Γέρνε στο γιαλό' },
            { chords: ['Gm', null, null, null], lyrics: 'Κι εσύ μικρή μου αγάπη' },
            { chords: ['D', null, null, null], lyrics: 'Γέρνε στον καημό' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Gm', null, 'D', null], lyrics: 'Βάρκα στο γιαλό' },
            { chords: ['A7', null, 'D', null], lyrics: 'Και βάρκα στο γιαλό' },
            { chords: ['Gm', null, 'Eb', null], lyrics: 'Η αγάπη θέλει' },
            { chords: ['A7', null, 'D', null], lyrics: 'Πάντα δυο παιδιά' },
          ]
        }
      ]
    },
    /* 4 */
    {
      id: 'ta-matomena-chomata',
      title: 'Ta Matomena Chomata',
      titleGr: 'Τα Ματωμένα Χώματα',
      titleHe: 'טא מאטומנה חומאטה',
      artist: 'Γιώργος Ζαμπέτας',
      artistHe: 'ג\'ורגוס זמבטאס',
      dromos: 'Minore',
      key: 'Dm',
      bpm: 90,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Dm', null, 'A7', null, 'Dm'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Τα ματωμένα χώματα' },
            { chords: ['Gm', null, 'Dm', null], lyrics: 'Τρέμουν σαν τα χείλη μου' },
            { chords: ['Bb', null, 'A7', null], lyrics: 'Κι εσύ δεν ξέρεις τίποτα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Από τα βάσανά μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Τα ματωμένα χώματα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Κρατούν τα μυστικά μου' },
            { chords: ['Bb', null, 'Gm', null], lyrics: 'Κι ο κόσμος δεν μπορεί' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Να δει τα δάκρυά μου' },
          ]
        }
      ]
    },
    /* 5 */
    {
      id: 'minore-tou-teke',
      title: 'Minore tou Teke',
      titleGr: 'Μινόρε του Τεκέ',
      titleHe: 'מינורה טו טקה',
      artist: 'Παναγιώτης Τούντας',
      artistHe: 'פאנגיוטיס טונטאס',
      dromos: 'Minore',
      key: 'Am',
      bpm: 80,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Am', null, 'E7', 'Am'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Κάθε βράδυ στου τεκέ' },
            { chords: ['Dm', null, 'Am', null], lyrics: 'Σ\' ένα κόσμο μαγικό' },
            { chords: ['E7', null, null, null], lyrics: 'Ο ναργιλές φυσάει' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Κι ο καημός περνάει' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Μινόρε, μινόρε' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Του τεκέ μινόρε' },
            { chords: ['Dm', null, 'F', null], lyrics: 'Σαν ακούω μπουζούκι' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Κλαίω μοναχός' },
          ]
        }
      ]
    },
    /* 6 */
    {
      id: 'o-xenos',
      title: 'O Xenos',
      titleGr: 'Ο Ξένος',
      titleHe: 'או קסנוס',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליוס קזנצידיס',
      dromos: 'Ousak',
      key: 'Dm',
      bpm: 72,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Dm', null, 'Eb', 'Dm'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Είμαι ξένος μες στον κόσμο' },
            { chords: ['Eb', null, 'Dm', null], lyrics: 'Ξένος κι εδώ ξένος κι εκεί' },
            { chords: ['Gm', null, null, null], lyrics: 'Δεν με θέλει κανένας' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Πουθενά δεν ανήκω πια' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Ο ξένος, ο ξένος' },
            { chords: ['Eb', null, 'Dm', null], lyrics: 'Γυρίζει μοναχός' },
            { chords: ['Cm', null, 'Gm', null], lyrics: 'Χωρίς πατρίδα, χωρίς αγάπη' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μόνο πόνος κι αυτός' },
          ]
        }
      ]
    },
    /* 7 */
    {
      id: 'trelos-tsiganos',
      title: 'Trelos Tsiganos',
      titleGr: 'Τρελός Τσιγγάνος',
      titleHe: 'טרלוס ציגאנוס',
      artist: 'Γιώργος Ζαμπέτας',
      artistHe: 'ג\'ורגוס זמבטאס',
      dromos: 'Niavent',
      key: 'Dm',
      bpm: 95,
      timeSignature: '4/4',
      difficulty: 3,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Τρελός τσιγγάνος γυρίζω' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Στους δρόμους τους παλιούς' },
            { chords: ['Gm', null, null, null], lyrics: 'Με το βιολί στο χέρι' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και πόνο μες στην ψυχή' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Τρελός τσιγγάνος είμαι' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και τρελός θα πεθάνω' },
            { chords: ['Gm', null, 'Bb', null], lyrics: 'Μα ό,τι κι αν γίνει' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Εγώ τραγούδι θα πω' },
          ]
        }
      ]
    },
    /* 8 */
    {
      id: 'hasapiko-andreiomeno',
      title: 'Hasapiko Andreiomeno',
      titleGr: 'Χάσαπικο Αντρειωμένο',
      titleHe: 'חסאפיקו אנטריומנו',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Minore',
      key: 'Am',
      bpm: 96,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Am', null, 'E7', 'Am'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Χάσαπικο αντρειωμένο' },
            { chords: ['Dm', null, 'Am', null], lyrics: 'Χορεύω στο μεράκι μου' },
            { chords: ['E7', null, null, null], lyrics: 'Με λεβεντιά και χάρη' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Σαν γνήσιος Ρωμιός' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Χάσαπικο, χάσαπικο' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Αντρειωμένο μου' },
            { chords: ['F', null, 'G', null], lyrics: 'Σε χορεύω μ\' αγάπη' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Και με καημό βαθύ' },
          ]
        }
      ]
    },
    /* 9 */
    {
      id: 'ti-se-melei-esenane',
      title: 'Ti se Melei Esenane',
      titleGr: 'Τι Σε Μέλει Εσένανε',
      titleHe: 'טי סה מלי אסנאנה',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Rast',
      key: 'D',
      bpm: 108,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['D', null, 'C', 'D'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Τι σε μέλει εσένανε' },
            { chords: ['C', null, 'D', null], lyrics: 'Αν θα \'ρθω αν δε θα \'ρθω' },
            { chords: ['G', null, null, null], lyrics: 'Εσύ δική σου κάνε' },
            { chords: ['A7', null, 'D', null], lyrics: 'Και μη μ\' αναζητάς' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'G', null], lyrics: 'Τι σε μέλει εσένανε' },
            { chords: ['C', null, 'D', null], lyrics: 'Τι σε μέλει πια' },
            { chords: ['G', null, 'A7', null], lyrics: 'Άσε με να ζήσω' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μόνος μου σ\' αυτή τη γη' },
          ]
        }
      ]
    },
    /* 10 */
    {
      id: 'apopse-tha-pio',
      title: 'Apopse tha Pio',
      titleGr: 'Απόψε θα Πιώ',
      titleHe: 'אפופסה תא פיו',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליוס קזנצידיס',
      dromos: 'Hitzaz',
      tags: ['kazantzidis', 'famous', 'zeibekiko'],
      style: 'zeibekiko',
      key: 'D',
      bpm: 68,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['D', null, 'Eb', 'D'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Απόψε θα πιω θα μεθύσω' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Θα σπάσω τον κόσμο ολόκληρο' },
            { chords: ['Gm', null, null, null], lyrics: 'Κι αύριο πάλι θα κλάψω' },
            { chords: ['A7', null, 'D', null], lyrics: 'Γιατί θα \'μαι μοναχός' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Απόψε θα πιω' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Θα πιω και θα χαθώ' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μα εσύ δε θα \'σαι εδώ' },
            { chords: ['A7', null, 'D', null], lyrics: 'Για να με λυπηθείς' },
          ]
        }
      ]
    },
    /* 11 */
    {
      id: 'i-geitonia-mas',
      title: 'I Geitonia Mas',
      titleGr: 'Η Γειτονιά Μας',
      titleHe: 'אי ג\'יטוניא מאס',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Rast',
      key: 'C',
      bpm: 104,
      timeSignature: '4/4',
      difficulty: 1,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['C', null, 'G7', 'C'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['C', null, null, null], lyrics: 'Η γειτονιά μας η παλιά' },
            { chords: ['F', null, 'C', null], lyrics: 'Που κάναμε παρέα' },
            { chords: ['G7', null, null, null], lyrics: 'Κι εσύ μου χαμογέλαγες' },
            { chords: ['G7', null, 'C', null], lyrics: 'Από το παραθύρι' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['C', null, 'F', null], lyrics: 'Η γειτονιά μας' },
            { chords: ['G7', null, 'C', null], lyrics: 'Η γειτονιά μας' },
            { chords: ['Am', null, 'Dm', null], lyrics: 'Πού πήγαν εκείνες' },
            { chords: ['G7', null, 'C', null], lyrics: 'Οι παλιές στιγμές' },
          ]
        }
      ]
    },
    /* 12 */
    {
      id: 'san-sfyrixeis-treis-fores',
      title: 'San Sfyrixeis Treis Fores',
      titleGr: 'Σαν Σφυρίξεις Τρεις Φορές',
      titleHe: 'סאן ספיריקסיס טריס פורס',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Hitzaz',
      key: 'Em',
      bpm: 100,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Em', null, 'F', 'Em'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Em', null, null, null], lyrics: 'Σαν σφυρίξεις τρεις φορές' },
            { chords: ['F', null, 'Em', null], lyrics: 'Εγώ θα κατεβώ' },
            { chords: ['Am', null, null, null], lyrics: 'Μα πρόσεχε μη σ\' ακούσουν' },
            { chords: ['B7', null, 'Em', null], lyrics: 'Οι γείτονες κοιμούνται' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Em', null, 'Am', null], lyrics: 'Σφύριξε, σφύριξε' },
            { chords: ['F', null, 'Em', null], lyrics: 'Τρεις φορές σφύριξε' },
            { chords: ['Am', null, 'B7', null], lyrics: 'Κι εγώ θα \'ρθω κοντά σου' },
            { chords: ['B7', null, 'Em', null], lyrics: 'Μέσα στη σιωπή' },
          ]
        }
      ]
    },
    /* 13 */
    {
      id: 'palios-stratiotis',
      title: 'Palios Stratiotis',
      titleGr: 'Παλιός Στρατιώτης',
      titleHe: 'פליוס סטרטיוטיס',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Ousak',
      key: 'Dm',
      bpm: 76,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Dm', null, 'Eb', 'Dm'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Παλιός στρατιώτης είμαι' },
            { chords: ['Eb', null, 'Dm', null], lyrics: 'Και τα \'χω δει όλα' },
            { chords: ['Gm', null, null, null], lyrics: 'Πολέμησα στη ζωή' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Αλλά χωρίς λευτεριά' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Cm', null], lyrics: 'Παλιός στρατιώτης' },
            { chords: ['Eb', null, 'Dm', null], lyrics: 'Κουρασμένος πια' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μα δε λέω να σκύψω' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Σ\' αυτή τη ζωή' },
          ]
        }
      ]
    },
    /* 14 */
    {
      id: 'vre-melahrinaki',
      title: 'Vre Melahrinaki',
      titleGr: 'Βρε Μελαχρινάκι',
      titleHe: 'ברה מלאחרינאקי',
      artist: 'Μανόλης Χιώτης',
      artistHe: 'מאנוליס חיוטיס',
      dromos: 'Hitzaz',
      key: 'D',
      bpm: 114,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['D', null, 'Eb', 'D'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Βρε μελαχρινάκι μου' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Με τα μάτια τα μεγάλα' },
            { chords: ['Gm', null, null, null], lyrics: 'Με κοιτάζεις και χαμογελάς' },
            { chords: ['A7', null, 'D', null], lyrics: 'Και μου λες τα πάντα' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Βρε μελαχρινάκι' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Πώς μ\' έκανες έτσι' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Δεν μπορώ να ζήσω' },
            { chords: ['A7', null, 'D', null], lyrics: 'Χωρίς τη ματιά σου' },
          ]
        }
      ]
    },
    /* 15 */
    {
      id: 'zeibekiko-tis-evdokias',
      title: 'Zeibekiko tis Evdokias',
      titleGr: 'Ζεϊμπέκικο της Ευδοκίας',
      titleHe: 'זאימבקיקו של אבדוקיה',
      artist: 'Μάνος Λοΐζος',
      artistHe: 'מאנוס לויזוס',
      dromos: 'Minore',
      key: 'Am',
      bpm: 60,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Am', null, 'E7', null, 'Am'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: '' },
            { chords: ['Dm', null, 'Am', null], lyrics: '' },
            { chords: ['E7', null, null, null], lyrics: '' },
            { chords: ['E7', null, 'Am', null], lyrics: '' },
          ]
        },
        {
          name: 'Theme',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: '' },
            { chords: ['E7', null, 'Am', null], lyrics: '' },
            { chords: ['F', null, 'G', null], lyrics: '' },
            { chords: ['E7', null, 'Am', null], lyrics: '' },
          ]
        }
      ]
    },
    /* 16 — bonus */
    {
      id: 'synefiasmeni-kyriaki',
      title: 'Synefiasmeni Kyriaki',
      titleGr: 'Συννεφιασμένη Κυριακή',
      titleHe: 'סינפיאסמני קיריאקי',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Minore',
      key: 'Dm',
      bpm: 76,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Συννεφιασμένη Κυριακή' },
            { chords: ['Gm', null, 'Dm', null], lyrics: 'Μοιάζεις με την καρδιά μου' },
            { chords: ['A7', null, null, null], lyrics: 'Που \'ναι πάντα συννεφιασμένη' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Χριστέ και Παναγιά μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Bb', null], lyrics: 'Συννεφιασμένη Κυριακή' },
            { chords: ['Gm', null, 'Dm', null], lyrics: 'Σε μισώ γιατί μου μοιάζεις' },
            { chords: ['Bb', null, 'A7', null], lyrics: 'Είσαι πάντα βρόχινη' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και δεν μου χαμογελάς ποτέ' },
          ]
        }
      ]
    },
    /* 17 — Τα παιδιά του Πειραιά */
    {
      id: 'ta-paidia-tou-peiraia',
      title: 'Ta Paidia tou Peiraia',
      titleGr: 'Τα Παιδιά του Πειραιά',
      titleHe: 'ילדי הפיראוס',
      artist: 'Μάνος Λοΐζος',
      artistHe: 'מאנוס לויזוס',
      dromos: 'Hasapiko',
      key: 'Dm',
      bpm: 110,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Τα παιδιά του Πειραιά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Με τα μπουκάλια στο χέρι' },
            { chords: ['Dm', null, null, null], lyrics: 'Και τα μάτια γεμάτα φως' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και την καρδιά γεμάτη πόνο' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Bb', null], lyrics: 'Τα παιδιά του Πειραιά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Με τα μπουκάλια στο χέρι' },
            { chords: ['Bb', null, 'A7', null], lyrics: 'Και τα μάτια γεμάτα φως' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και την καρδιά γεμάτη πόνο' },
          ]
        }
      ]
    },
    /* 18 — Ζορμπάς / Συρτάκι */
    {
      id: 'zorbas-syrtaki',
      title: 'Zorbas (Sirtaki)',
      titleGr: 'Ζορμπάς (Συρτάκι)',
      titleHe: 'זורבס (סירטאקי)',
      hebrewHit: 'זורבה היווני',
      artist: 'Μίκης Θεοδωράκης',
      artistHe: 'מיקיס תיאודורakis',
      dromos: 'Hasapiko',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 120,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['D', null, 'G', 'D'], lyrics: '' },
            { chords: ['A7', null, 'D', null], lyrics: '' },
          ]
        },
        {
          name: 'Theme',
          lines: [
            { chords: ['D', null, 'G', null], lyrics: '' },
            { chords: ['A7', null, 'D', null], lyrics: '' },
            { chords: ['Bm', null, 'G', null], lyrics: '' },
            { chords: ['A7', null, 'D', null], lyrics: '' },
          ]
        },
        {
          name: 'Bridge',
          lines: [
            { chords: ['D', null, 'A7', null], lyrics: '' },
            { chords: ['Bm', null, 'G', null], lyrics: '' },
            { chords: ['A7', null, 'D', null], lyrics: '' },
          ]
        }
      ]
    },
    /* 19 — Ηλιοβασιλέματα */
    {
      id: 'iliovasilemata',
      title: 'Iliovasilemata',
      titleGr: 'Ηλιοβασιλέματα',
      titleHe: 'שקיעות',
      artist: 'Μανώλης Χιώτης',
      artistHe: 'מאנוליס חיוטיס',
      dromos: 'Hitzaz',
      key: 'D',
      bpm: 100,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['D', null, 'Eb', 'D'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Ηλιοβασιλέματα' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Γεμάτα αναμνήσεις' },
            { chords: ['Gm', null, null, null], lyrics: 'Θυμάμαι ακόμα και πονώ' },
            { chords: ['A7', null, 'D', null], lyrics: 'Το τελευταίο δειλινό' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Δειλινά αξέχαστα' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Μες στα στενά δρομάκια' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Ηλιοβασιλέματα' },
            { chords: ['A7', null, 'D', null], lyrics: 'Και τι δεν μου θυμίζουν' },
          ]
        }
      ]
    },
    /* 20 — Ο Χαρμάνης */
    {
      id: 'o-charmanis',
      title: 'O Charmanis',
      titleGr: 'Ο Χαρμάνης',
      titleHe: 'הצ\'רמאניס',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Hasapiko',
      key: 'D',
      bpm: 110,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['D', null, 'A7', 'D'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Ο χαρμάνης ο δικός μου' },
            { chords: ['G', null, 'A7', null], lyrics: 'Μ\' έκανε και τρελάθηκα' },
            { chords: ['D', null, null, null], lyrics: 'Και τώρα πίνω φαρμάκια' },
            { chords: ['A7', null, 'D', null], lyrics: 'Να ξεχάσω τα μαύρα μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'G', null], lyrics: 'Ο χαρμάνης μου' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μ\' έσκασε την καρδιά' },
            { chords: ['G', null, 'A7', null], lyrics: 'Και τώρα πίνω' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μέχρι να ξημερώσω' },
          ]
        }
      ]
    },
    /* 21 — Το βαπόρι απ\' την Περσία */
    {
      id: 'to-vaporaki',
      title: 'To Vaporaki ap\' tin Persia',
      titleGr: 'Το Βαπόρι απ\' την Περσία',
      titleHe: 'הספינה מפרס',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Ousak',
      key: 'F#m',
      bpm: 120,
      timeSignature: '9/8',
      difficulty: 3,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['F#m', null, 'G', 'F#m'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['F#m', null, null, null], lyrics: 'Το βαπόρι απ\' την Περσία' },
            { chords: ['G', null, 'F#m', null], lyrics: 'Πιάστηκε στην Κορινθία' },
            { chords: ['Bm', null, null, null], lyrics: 'Τόνοι έντεκα γεμάτο' },
            { chords: ['C#7', null, 'F#m', null], lyrics: 'Με χασίσι μυρωδάτο' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['F#m', null, 'Bm', null], lyrics: 'Τώρα κλαίν\' όλα τ\' αλάνια' },
            { chords: ['G', null, 'F#m', null], lyrics: 'Που θα μείνουνε χαρμάνια' },
            { chords: ['Bm', null, 'C#7', null], lyrics: 'Βρε κουρνάζε μου τελώνη' },
            { chords: ['C#7', null, 'F#m', null], lyrics: 'Τη ζημιά ποιός τη πληρώνει' },
          ]
        }
      ]
    },
    /* 22 — Καραντουζένι */
    {
      id: 'karadouzeni',
      title: 'Karadouzeni',
      titleGr: 'Καραντουζένι',
      titleHe: 'קראנטוז\'ני',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Minore',
      key: 'Dm',
      bpm: 72,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Έπρεπε να \'ρχόσουνα' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μα εσύ δεν ήρθες ποτέ' },
            { chords: ['Dm', null, null, null], lyrics: 'Και τώρα πίνω φαρμάκια' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και κλαίω μοναχός μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Καραντουζένι μου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μ\' έκανες και τρελάθηκα' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και τώρα πίνω' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μέχρι να ξημερώσω' },
          ]
        }
      ]
    },
    /* 23 — Όμορφη Θεσσαλονίκη */
    {
      id: 'omorfi-thessaloniki',
      title: 'Omorfi Thessaloniki',
      titleGr: 'Όμορφη Θεσσαλονίκη',
      titleHe: 'סלוניקי היפה',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Rast',
      key: 'D',
      bpm: 104,
      timeSignature: '4/4',
      difficulty: 1,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['D', null, 'A7', 'D'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Όμορφη Θεσσαλονίκη' },
            { chords: ['G', null, 'D', null], lyrics: 'Γλυκιά κι αν ζω στην Αθήνα' },
            { chords: ['A7', null, null, null], lyrics: 'Για σένα τραγουδώ' },
            { chords: ['A7', null, 'D', null], lyrics: 'Κάθε βραδιά' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'G', null], lyrics: 'Ώ! όμορφη Θεσσαλονίκη' },
            { chords: ['A7', null, 'D', null], lyrics: 'Τα μαγικά σου βράδια' },
            { chords: ['Bm', null, 'G', null], lyrics: 'Νοσταλγώ' },
            { chords: ['A7', null, 'D', null], lyrics: 'Κάθε βραδιά' },
          ]
        }
      ]
    },
    /* 24 — Δεν θέλω να ξενητεύεις */
    {
      id: 'den-thelo-na-xeniteveis',
      title: 'Den Thelo na Xeniteveis',
      titleGr: 'Δεν Θέλω να Ξενητεύεις',
      titleHe: 'אני לא רוצה שתצא לגלות',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Minore',
      key: 'Em',
      bpm: 88,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Em', null, 'Am', 'Em'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Em', null, null, null], lyrics: 'Δεν θέλω να ξενητεύεις' },
            { chords: ['Am', null, 'Em', null], lyrics: 'Λεβέντικο κορμί' },
            { chords: ['B7', null, null, null], lyrics: 'Είναι πικρό της θάλασσας' },
            { chords: ['B7', null, 'Em', null], lyrics: 'Παιδί μου το ψωμί' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Em', null, 'Am', null], lyrics: 'Δεν θέλω να ξενητεύεις' },
            { chords: ['B7', null, 'Em', null], lyrics: 'Λεβέντικο κορμί' },
            { chords: ['Am', null, 'B7', null], lyrics: 'Είναι τα ξένα μαύρα' },
            { chords: ['B7', null, 'Em', null], lyrics: 'Και βαριά σαν φυλακή' },
          ]
        }
      ]
    },
    /* 25 — Στου ονείρου της αγάπης */
    {
      id: 'stou-oneirou-tis-agapis',
      title: 'Stou Oneirou tis Agapis',
      titleGr: 'Στου Ονείρου της Αγάπης',
      titleHe: 'בחלום האהבה',
      artist: 'Μίκης Θεοδωράκης',
      artistHe: 'מיקיס תיאודורakis',
      dromos: 'Minore',
      key: 'Am',
      bpm: 72,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Am', null, 'E7', 'Am'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Στου ονείρου της αγάπης' },
            { chords: ['Dm', null, 'Am', null], lyrics: 'Την άκρη του δρόμου' },
            { chords: ['E7', null, null, null], lyrics: 'Μ\' άφησες μόνο' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Και πήρες το δρόμο σου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Στου ονείρου της αγάπης' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Την άκρη του δρόμου' },
            { chords: ['F', null, 'E7', null], lyrics: 'Μ\' άφησες μόνο' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Και πήρες το δρόμο σου' },
          ]
        }
      ]
    },
    /* 26 — Χαρούμενα ξένα */
    {
      id: 'haroumena-xenia',
      title: 'Haroumena Xenia',
      titleGr: 'Χαρούμενα Ξένα',
      titleHe: 'אורחים שמחים',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Rast',
      key: 'C',
      bpm: 108,
      timeSignature: '4/4',
      difficulty: 1,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['C', null, 'G7', 'C'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['C', null, null, null], lyrics: 'Χαρούμενα ξένα' },
            { chords: ['F', null, 'C', null], lyrics: 'Και γλυκά ματάκια' },
            { chords: ['G7', null, null, null], lyrics: 'Μ\' έκανες και τρελάθηκα' },
            { chords: ['G7', null, 'C', null], lyrics: 'Με τα γλυκά σου ματάκια' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['C', null, 'F', null], lyrics: 'Χαρούμενα ξένα' },
            { chords: ['G7', null, 'C', null], lyrics: 'Και γλυκά ματάκια' },
            { chords: ['Am', null, 'Dm', null], lyrics: 'Μ\' έκανες και τρελάθηκα' },
            { chords: ['G7', null, 'C', null], lyrics: 'Με τα γλυκά σου ματάκια' },
          ]
        }
      ]
    },
    /* 27 — Μάνα μου ψιλέλλαδα */
    {
      id: 'mana-mou-psilellada',
      title: 'Mana Mou Psilellada',
      titleGr: 'Μάνα μου Ψιλέλλαδα',
      titleHe: 'אמא שלי ירוקה',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Minore',
      key: 'Dm',
      bpm: 96,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Μάνα μου ψιλέλλαδα' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μη μ\' αφήνεις μοναχό' },
            { chords: ['Dm', null, null, null], lyrics: 'Και τώρα πίνω φαρμάκια' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Να ξεχάσω τα μαύρα μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Μάνα μου ψιλέλλαδα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μη μ\' αφήνεις μοναχό' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και τώρα πίνω' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μέχρι να ξημερώσω' },
          ]
        }
      ]
    },
    /* 28 — Στην ακρογιαλιά Δελφών */
    {
      id: 'stin-akrogialia-delpen',
      title: 'Stin Akrogialia Delpen',
      titleGr: 'Στην Ακρογιαλιά Δελφών',
      titleHe: 'בחוף דלפי',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Hitzaz',
      key: 'D',
      bpm: 100,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Intro',
          lines: [
            { chords: ['D', null, 'Eb', 'D'], lyrics: '' },
          ]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Στην ακρογιαλιά Δελφών' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Κάτω απ\' το φεγγάρι' },
            { chords: ['Gm', null, null, null], lyrics: 'Μ\' άφησες μόνο' },
            { chords: ['A7', null, 'D', null], lyrics: 'Και πήρες το δρόμο σου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Στην ακρογιαλιά Δελφών' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Κάτω απ\' το φεγγάρι' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μ\' άφησες μόνο' },
            { chords: ['A7', null, 'D', null], lyrics: 'Και πήρες το δρόμο σου' },
          ]
        }
      ]
    },
    /* 29 — Η Άτακτη (ζεϊμπέκικο) */
    {
      id: 'i-atakti',
      title: 'I Atakti',
      titleGr: 'Η Άτακτη',
      titleHe: 'השובבה',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Minore',
      style: 'zeibekiko',
      key: 'Am',
      bpm: 68,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        { name: 'Intro', lines: [{ chords: ['Am', null, 'E7', 'Am'], lyrics: '' }] },
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Δε σε θέλω, δε σε θέλω' },
            { chords: ['Dm', null, 'Am', null], lyrics: 'Πια δε σ\' αγαπώ' },
            { chords: ['E7', null, null, null], lyrics: 'Και πάρε και δρόμο' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Και τράβα στο καλό' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Ήθελα να σ\' αντάμωνα' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Να σου \'λεγα καμπόσα' },
            { chords: ['F', null, 'E7', null], lyrics: 'Κι εσύ \'σαι τόσο άταχτη' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Στρίψε για να γλιτώσω' },
          ]
        }
      ]
    },
    /* 30 — Σαν απόκληρος γυρίζω */
    {
      id: 'san-apokliros-gyrizo',
      title: 'San Apokliros Gyrizo',
      titleGr: 'Σαν Απόκληρος Γυρίζω',
      titleHe: 'כמו נידה אני שב',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Minore',
      style: 'zeibekiko',
      key: 'Am',
      bpm: 64,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        { name: 'Intro', lines: [{ chords: ['Am', null, 'E7', 'Am'], lyrics: '' }] },
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Σαν απόκληρος γυρίζω' },
            { chords: ['Dm', null, 'Am', null], lyrics: 'Στην κακούργα ξενιτιά' },
            { chords: ['E7', null, null, null], lyrics: 'Μακριά απ\' της μάνας μου' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Την αγκαλιά' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Κλαίνε τα πουλιά για αέρα' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Και τα δέντρα για νερό' },
            { chords: ['F', null, 'E7', null], lyrics: 'Κλαίω μανούλα μου κι εγώ' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Για σένα που έχω χρόνια' },
          ]
        }
      ]
    },
    /* 31 — Κάνε λιγάκι υπομονή */
    {
      id: 'kane-ligaki-ipomoni',
      title: 'Kane Ligaki Ipomoni',
      titleGr: 'Κάνε Λιγάκι Υπομονή',
      titleHe: 'תן קצת סבלנות',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Minore',
      style: 'zeibekiko',
      key: 'Dm',
      bpm: 66,
      timeSignature: '9/4',
      difficulty: 2,
      sections: [
        { name: 'Intro', lines: [{ chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' }] },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Μην απελπίζεσαι' },
            { chords: ['Gm', null, 'Dm', null], lyrics: 'Και δε θ\' αργήσει' },
            { chords: ['A7', null, null, null], lyrics: 'Κοντά σου θα \'ρθει μια χαραυγή' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Κάνε λιγάκι υπομονή' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Διώξε τα σύννεφα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Απ\' την καρδιά σου' },
            { chords: ['Bb', null, 'A7', null], lyrics: 'Θα \'ρθει μια μέρα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μην το ξεχνάς' },
          ]
        }
      ]
    },
    /* 32 — Ο Δερβίσης */
    {
      id: 'o-dervisis',
      title: 'O Dervisis',
      titleGr: 'Ο Δερβίσης',
      titleHe: 'הדרוויש',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Ousak',
      style: 'zeibekiko',
      key: 'Dm',
      bpm: 72,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        { name: 'Intro', lines: [{ chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' }] },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Ο δερβίσης ο δικός μου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μ\' έκανε και τρελάθηκα' },
            { chords: ['Dm', null, null, null], lyrics: 'Και τώρα πίνω φαρμάκια' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Να ξεχάσω τα μαύρα μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Ο δερβίσης μου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μ\' έσκασε την καρδιά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και τώρα πίνω' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μέχρι να ξημερώσω' },
          ]
        }
      ]
    },
    /* 33 — Τα ματοκλάδα σου λάμπουν */
    {
      id: 'ta-matoklada-sou-lampoun',
      title: 'Ta Matoklada Sou Lampoun',
      titleGr: 'Τα Ματοκλάδα σου Λάμπουν',
      titleHe: 'ריסיך זורחים',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Minore',
      style: 'zeibekiko',
      key: 'D',
      bpm: 70,
      timeSignature: '9/4',
      difficulty: 2,
      sections: [
        { name: 'Intro', lines: [{ chords: ['D', null, 'A7', 'D'], lyrics: '' }] },
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Τα ματοκλάδα σου λάμπουν' },
            { chords: ['G', null, 'D', null], lyrics: 'Σαν τα λουλούδια του κάμπου' },
            { chords: ['A7', null, null, null], lyrics: 'Και η ζωή μου όλη μια ζάρι' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μ\' έκανες και τρελάθηκα' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'G', null], lyrics: 'Τα ματοκλάδα σου λάμπουν' },
            { chords: ['A7', null, 'D', null], lyrics: 'Σαν τα λουλούδια του κάμπου' },
            { chords: ['Bm', null, 'G', null], lyrics: 'Και η ζωή μου όλη μια ζάρι' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μ\' έκανες και τρελάθηκα' },
          ]
        }
      ]
    },
    /* 34 — Μινόρε της Αυγής */
    {
      id: 'minore-tis-avgis',
      title: 'Minore tis Avgis',
      titleGr: 'Το Μινόρε της Αυγής',
      titleHe: 'מינור השחר',
      artist: 'Σπύρος Περιστέρης',
      artistHe: 'ספירוס פריסטריס',
      dromos: 'Minore',
      style: 'zeibekiko',
      key: 'Am',
      bpm: 60,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        { name: 'Intro', lines: [{ chords: ['Am', null, 'E7', 'Am'], lyrics: '' }] },
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Ξύπνα, μικρό μου, κι άκουσε' },
            { chords: ['Dm', null, 'Am', null], lyrics: 'Κάποιο μινόρε της αυγής' },
            { chords: ['E7', null, null, null], lyrics: 'Για σένανε είναι γραμμένο' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Από το κλάμα κάποιας ψυχής' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Το παραθύρι σου άνοιξε' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Ρίξε μου μια γλυκιά ματιά' },
            { chords: ['F', null, 'E7', null], lyrics: 'Κι ας σβήσω πια τότε, μικρό μου' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Μπροστά στο σπίτι σου σε μια γωνιά' },
          ]
        }
      ]
    },
    /* 35 — Όλοι οι ρεμπέτες του ντουνιά */
    {
      id: 'oli-i-rebetes-tou-ntounia',
      title: 'Oli i Rebetes tou Ntounia',
      titleGr: 'Όλοι οι Ρεμπέτες του Ντουνιά',
      titleHe: 'כל הרבטים בעולם',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Minore',
      style: 'zeibekiko',
      key: 'Dm',
      bpm: 68,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        { name: 'Intro', lines: [{ chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' }] },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Όλοι οι ρεμπέτες του ντουνιά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μαζί μ\' έχουνε φιλήσει' },
            { chords: ['Dm', null, null, null], lyrics: 'Κι εγώ στα χέρια τους' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Έχω περάσει' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Όλοι οι ρεμπέτες' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Του ντουνιά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μαζί μ\' έχουνε' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Φιλήσει' },
          ]
        }
      ]
    },
    /* 36 — Τρέξε μάγκα να ρωτήσεις (Ντερμπεντέρισσα) */
    {
      id: 'trexe-magka-na-rotisis',
      title: 'Trexe Magka na Rotisis',
      titleGr: 'Τρέξε Μάγκα να Ρωτήσεις',
      titleHe: 'רוץ מάγκα לשאול (דербεντέρισα)',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Niavent',
      style: 'zeibekiko',
      key: 'Em',
      bpm: 74,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        { name: 'Intro', lines: [{ chords: ['Em', null, 'B7', 'Em'], lyrics: '' }] },
        {
          name: 'Verse',
          lines: [
            { chords: ['Em', null, null, null], lyrics: 'Τρέξε, μάγκα, να ρωτήσεις' },
            { chords: ['Am', null, 'Em', null], lyrics: 'Να σου πουν ποια είμαι εγώ' },
            { chords: ['B7', null, null, null], lyrics: 'Είμαι γυναίκα φίνα' },
            { chords: ['B7', null, 'Em', null], lyrics: 'Ντερμπεντέρισσα' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Em', null, 'Am', null], lyrics: 'Που τους άντρες σαν τα ζάρια' },
            { chords: ['B7', null, 'Em', null], lyrics: 'Τους μπεγλέρισα' },
            { chords: ['Am', null, 'B7', null], lyrics: 'Δε γουστάρω τις παρόλες' },
            { chords: ['B7', null, 'Em', null], lyrics: 'Σου \'ξηγήθηκα' },
          ]
        }
      ]
    },
    /* 37 — Μοίρισσα χασικλού */
    {
      id: 'mortissa-hasiklou',
      title: 'Mortissa Hasiklou',
      titleGr: 'Μοίρισσα Χασικλού',
      titleHe: 'גורל חשיש',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Ousak',
      style: 'zeibekiko',
      key: 'Dm',
      bpm: 70,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        { name: 'Intro', lines: [{ chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' }] },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Μοίρισσα χασικλού' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μ\' έκανες και τρελάθηκα' },
            { chords: ['Dm', null, null, null], lyrics: 'Και τώρα πίνω φαρμάκια' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Να ξεχάσω τα μαύρα μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Μοίρισσα χασικλού' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μ\' έσκασε την καρδιά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και τώρα πίνω' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μέχρι να ξημερώσω' },
          ]
        }
      ]
    },
    /* 38 — Μάγκας βγήκε για σεργιάνι */
    {
      id: 'magkas-vgike-gia-sergiani',
      title: 'Magkas Vgike gia Sergiani',
      titleGr: 'Μάγκας Βγήκε για Σεργιάνι',
      titleHe: 'מאג\'ה יצא לסיבוב',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Minore',
      style: 'zeibekiko',
      key: 'Dm',
      bpm: 72,
      timeSignature: '9/4',
      difficulty: 2,
      sections: [
        { name: 'Intro', lines: [{ chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' }] },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Μάγκας βγήκε για σεργιάνι' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Με το μπουζούκι στο χέρι' },
            { chords: ['Dm', null, null, null], lyrics: 'Και στα μαύρα ματάκια του' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Κρύβεται η καρδιά του' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Μάγκας βγήκε' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Για σεργιάνι' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Με το μπουζούκι' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Στο χέρι' },
          ]
        }
      ]
    },
    /* 39 — Το μυστικό ζεϊμπέκικο (οργανικό) */
    {
      id: 'to-mystiko-zeibekiko',
      title: 'To Mystiko Zeibekiko',
      titleGr: 'Το Μυστικό Ζεϊμπέκικο',
      titleHe: 'הזεϊμπέκיקו הסודי',
      artist: 'Ιωάννης Χαλικιάς',
      artistHe: 'יואניס חליקias',
      dromos: 'Minore',
      style: 'zeibekiko',
      key: 'Am',
      bpm: 58,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        { name: 'Intro', lines: [{ chords: ['Am', null, 'E7', 'Am'], lyrics: '' }] },
        {
          name: 'Theme',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: '' },
            { chords: ['E7', null, 'Am', null], lyrics: '' },
            { chords: ['F', null, 'E7', null], lyrics: '' },
            { chords: ['E7', null, 'Am', null], lyrics: '' },
          ]
        },
        {
          name: 'Bridge',
          lines: [
            { chords: ['Dm', null, 'Am', null], lyrics: '' },
            { chords: ['E7', null, 'Am', null], lyrics: '' },
            { chords: ['Am', null, 'E7', 'Am'], lyrics: '' },
          ]
        }
      ]
    },
    /* 40 — Η ζωή μου όλη (Καζαντζίδης) */
    {
      id: 'i-zoi-mou-oli',
      title: 'I Zoi Mou Oli',
      titleGr: 'Η ζωή μου όλη',
      titleHe: 'כל חיי',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 72,
      timeSignature: '4/4',
      difficulty: 3,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Η ζωή μου όλη είναι μια ευθύνη' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Όλα μου τα παίρνει τίποτα δε δίνει' },
            { chords: ['Dm', null, null, null], lyrics: 'Η ζωή μου όλη είναι ένα καμίνι' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Που \'χω πέσει μέσα και με σιγοψήνει' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Η ζωή μου όλη μια ανοησία' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Κι η μοναδική μου η περιουσία' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Η ζωή μου όλη είναι μια θυσία' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Που σκοπό δεν έχει ούτε σημασία' },
          ]
        }
      ]
    },
    /* 41 — Το βράδυ θα σε πάρω */
    {
      id: 'to-vrady-tha-se-paro',
      title: 'To Vrady tha se Paro',
      titleGr: 'Το βράδυ θα σε πάρω',
      titleHe: 'בערב אקח אותך',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Hitzaz',
      tags: ['kazantzidis', 'famous'],
      key: 'D',
      bpm: 76,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Το βράδυ θα σε πάρω' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Θα σε πάρω και θα φύγω' },
            { chords: ['Gm', null, null, null], lyrics: 'Μακριά απ\' τη γειτονιά σου' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μακριά απ\' τα μάτια σου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Το βράδυ θα σε πάρω' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Θα σε πάρω και θα φύγω' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μακριά απ\' τη γειτονιά σου' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μακριά απ\' τα μάτια σου' },
          ]
        }
      ]
    },
    /* 42 — Το παιδί της γειτονιάς σου */
    {
      id: 'to-paidi-tis-gitonias-sou',
      title: 'To Paidi tis Gitonias Sou',
      titleGr: 'Το παιδί της γειτονιάς σου',
      titleHe: 'ילד השכונה שלך',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 70,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Το παιδί της γειτονιάς σου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Με πήρε και μ\' έκλεψε' },
            { chords: ['Dm', null, null, null], lyrics: 'Και τώρα είμαι μακριά σου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και δεν μπορώ να γυρίσω' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Το παιδί της γειτονιάς σου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Με πήρε και μ\' έκλεψε' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και τώρα είμαι μακριά σου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και δεν μπορώ να γυρίσω' },
          ]
        }
      ]
    },
    /* 43 — Δεν θα κλάψει κανένας (ζεϊμπέκικο) */
    {
      id: 'den-tha-klapso-kanenas',
      title: 'Den tha Klapso Kanenas',
      titleGr: 'Δεν θα κλάψει κανένας',
      titleHe: 'אף אחד לא יבכה',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous', 'zeibekiko'],
      style: 'zeibekiko',
      key: 'Dm',
      bpm: 58,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Δεν θα κλάψει κανένας' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Για το δικό μου τον πόνο' },
            { chords: ['Dm', null, null, null], lyrics: 'Μόνος θα περάσω' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Τη ζωή μου ολόκληρη' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Δεν θα κλάψει κανένας' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Για το δικό μου τον πόνο' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μόνος θα περάσω' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Τη ζωή μου ολόκληρη' },
          ]
        }
      ]
    },
    /* 44 — Μια ζωή μονάχη */
    {
      id: 'mia-zoi-monahi',
      title: 'Mia Zoi Monahi',
      titleGr: 'Μια ζωή μονάχη',
      titleHe: 'חיים בודדים',
      artist: 'Στέλιος Καζαντζίδης & Μαρινέλλα',
      artistHe: 'סטליος קזנצידיס ומרינלה',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 68,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Μια ζωή μονάχη' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Χωρίς αγάπη και χαρά' },
            { chords: ['Dm', null, null, null], lyrics: 'Μια ζωή μονάχη' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μακριά απ\' ό,τι αγαπώ' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Μια ζωή μονάχη' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Χωρίς αγάπη και χαρά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μια ζωή μονάχη' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μακριά απ\' ό,τι αγαπώ' },
          ]
        }
      ]
    },
    /* 45 — Ο άνθρωπος που αγαπάς */
    {
      id: 'o-anthropos-pou-agapas',
      title: 'O Anthropos pou Agapas',
      titleGr: 'Ο άνθρωπος που αγαπάς',
      titleHe: 'האדם שאתה אוהב',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Hitzaz',
      tags: ['kazantzidis'],
      key: 'D',
      bpm: 74,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Ο άνθρωπος που αγαπάς' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Δεν είναι πια εδώ' },
            { chords: ['Gm', null, null, null], lyrics: 'Και εσύ μόνος θα μείνεις' },
            { chords: ['A7', null, 'D', null], lyrics: 'Με την καρδιά σου πληγωμένη' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Ο άνθρωπος που αγαπάς' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Δεν είναι πια εδώ' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και εσύ μόνος θα μείνεις' },
            { chords: ['A7', null, 'D', null], lyrics: 'Με την καρδιά σου πληγωμένη' },
          ]
        }
      ]
    },
    /* 46 — Γεια σου μάνα */
    {
      id: 'gia-sou-mana',
      title: 'Geia sou Mana',
      titleGr: 'Γεια σου μάνα',
      titleHe: 'שלום אמא',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 66,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Γεια σου μάνα μου αγαπημένη' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Που μ\' έδωσες τη ζωή' },
            { chords: ['Dm', null, null, null], lyrics: 'Γεια σου μάνα μου αγαπημένη' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Που μ\' έδωσες τη ζωή' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Γεια σου μάνα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μου αγαπημένη' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Που μ\' έδωσες' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Τη ζωή' },
          ]
        }
      ]
    },
    /* 47 — Ένας κόμπος που τον δύο (ζεϊμπέκικο) */
    {
      id: 'ena-komvos-pou-ton-dyo',
      title: 'Enas Komvos pou ton Dyo',
      titleGr: 'Ένας κόμπος που τον δύο',
      titleHe: 'קשר אחד לשניים',
      artist: 'Βασίλης Τσιτσάνης',
      artistHe: 'וסיליס ציצאניס',
      dromos: 'Minore',
      tags: ['famous', 'zeibekiko'],
      style: 'zeibekiko',
      key: 'Dm',
      bpm: 60,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Ένας κόμπος που τον δύο' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μας κρατάει μαζί' },
            { chords: ['Dm', null, null, null], lyrics: 'Κι όσο ζούμε ακόμα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Δεν θα σπάσει ποτέ' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Ένας κόμπος που τον δύο' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μας κρατάει μαζί' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Κι όσο ζούμε ακόμα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Δεν θα σπάσει ποτέ' },
          ]
        }
      ]
    },
    /* 48 — Στο καφέ της γειτονιάς */
    {
      id: 'sto-kafe-tis-gitonias',
      title: 'Sto Kafe tis Gitonias',
      titleGr: 'Στο καφέ της γειτονιάς',
      titleHe: 'בבית הקפה של השכונה',
      artist: 'Γιώργος Ζαμπέτας',
      artistHe: 'ג\'ורג\'וס זαμπטאס',
      dromos: 'Hitzaz',
      tags: ['famous'],
      key: 'D',
      bpm: 82,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Στο καφέ της γειτονιάς' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Κάθε βράδυ θα σε βρω' },
            { chords: ['Gm', null, null, null], lyrics: 'Με το μπουζούκι και το τραγούδι' },
            { chords: ['A7', null, 'D', null], lyrics: 'Θα σου πω πόσο σ\' αγαπώ' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Στο καφέ της γειτονιάς' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Κάθε βράδυ θα σε βρω' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Με το μπουζούκι και το τραγούδι' },
            { chords: ['A7', null, 'D', null], lyrics: 'Θα σου πω πόσο σ\' αγαπώ' },
          ]
        }
      ]
    },
    /* 49 — Ήχε μια φορά ένας μάγκας */
    {
      id: 'ixe-mia-fora-enas-mangas',
      title: 'Ixe mia Fora enas Mangas',
      titleGr: 'Ήχε μια φορά ένας μάγκας',
      titleHe: 'היה פעם מάγκας',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Minore',
      tags: ['famous'],
      key: 'Dm',
      bpm: 78,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Ήχε μια φορά ένας μάγκας' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Που είχε καρδιά μεγάλη' },
            { chords: ['Dm', null, null, null], lyrics: 'Και όλοι τον αγαπούσανε' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Στη γειτονιά του Πειραιά' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Ήχε μια φορά ένας μάγκας' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Που είχε καρδιά μεγάλη' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και όλοι τον αγαπούσανε' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Στη γειτονιά του Πειραιά' },
          ]
        }
      ]
    },
    /* 50 — Ρίξε μια ζαριά καλή */
    {
      id: 'rixe-mia-zaria-kali',
      title: 'Rixe mia Zaria Kali',
      titleGr: 'Ρίξε μια ζαριά καλή',
      titleHe: 'זרוק קובייה טובה',
      artist: 'Γρηγόρης Μπιθικώτσης',
      artistHe: 'גריגוריס ביתיקוטיס',
      dromos: 'Minore',
      tags: ['famous'],
      key: 'Dm',
      bpm: 80,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Ρίξε μια ζαριά καλή' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Να \'ρθει η τύχη μαζί σου' },
            { chords: ['Dm', null, null, null], lyrics: 'Ρίξε μια ζαριά καλή' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Να \'ρθει η τύχη μαζί σου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Ρίξε μια ζαριά καλή' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Να \'ρθει η τύχη μαζί σου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Ρίξε μια ζαριά καλή' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Να \'ρθει η τύχη μαζί σου' },
          ]
        }
      ]
    },
    /* 51 — Η Ωτική (ζεϊμπέκικο) */
    {
      id: 'i-otiki',
      title: 'I Otiki',
      titleGr: 'Η Ωτική',
      titleHe: 'האוטיקה',
      artist: 'Μάρκος Βαμβακάρης',
      artistHe: 'מרקוס ואמוואקריס',
      dromos: 'Minore',
      tags: ['famous', 'zeibekiko'],
      style: 'zeibekiko',
      key: 'Dm',
      bpm: 56,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        {
          name: 'Intro',
          lines: [{ chords: ['Dm', null, 'A7', 'Dm'], lyrics: '' }]
        },
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Η Ωτική μ\' έκλεψε' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και μ\' έφερε στον Πειραιά' },
            { chords: ['Dm', null, null, null], lyrics: 'Με το μπουζούκι στο χέρι' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και την καρδιά μου πληγωμένη' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Η Ωτική μ\' έκλεψε' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και μ\' έφερε στον Πειραιά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Με το μπουζούκι στο χέρι' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και την καρδιά μου πληγωμένη' },
          ]
        }
      ]
    },
    /* 52 — Συννεφιασμένη Κυριακή (Καζαντζίδης) */
    {
      id: 'synefiasmeni-kaz',
      title: 'Synefiasmeni Kyriaki',
      titleGr: 'Συννεφιασμένη Κυριακή',
      titleHe: 'יום ראשון מעונן (קזנצידיס)',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Matzore',
      tags: ['kazantzidis', 'famous'],
      key: 'D',
      bpm: 70,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Συννεφιασμένη Κυριακή' },
            { chords: ['G', null, 'A7', null], lyrics: 'Βροχή και κρύο' },
            { chords: ['D', null, null, null], lyrics: 'Και εγώ μονάχος μου' },
            { chords: ['A7', null, 'D', null], lyrics: 'Με την καρδιά μου πληγωμένη' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'G', null], lyrics: 'Συννεφιασμένη Κυριακή' },
            { chords: ['A7', null, 'D', null], lyrics: 'Βροχή και κρύο' },
            { chords: ['G', null, 'A7', null], lyrics: 'Και εγώ μονάχος μου' },
            { chords: ['A7', null, 'D', null], lyrics: 'Με την καρδιά μου πληγωμένη' },
          ]
        }
      ]
    },
    /* 53 — Υπάρχω */
    {
      id: 'yparho',
      title: 'Yparho',
      titleGr: 'Υπάρχω',
      titleHe: 'אני קיים',
      hebrewHit: 'אלינור — זוהר ארגוב',
      israeliArtist: 'זוהר ארגוב',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous', 'israeli-hit'],
      key: 'Dm',
      bpm: 68,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Υπάρχω κι όσο υπάρχεις θα υπάρχω' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Σκλάβα τη ζωή σου θά\' χω' },
            { chords: ['Dm', null, null, null], lyrics: 'Κι ας βαδίζουμε σε δρόμους χωριστούς' },
            { chords: ['A7', null, 'Dm', null], lyrics: '' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Υπάρχω μέσ\' στα μάτια σου που κλαίνε' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μέσ\' στα χείλη σου που καίνε' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και θα υπάρχω στα τραγούδια που θ\' ακούς' },
            { chords: ['A7', null, 'Dm', null], lyrics: '' },
          ]
        }
      ]
    },
    /* 54 — Το τελευταίο βράδυ μου */
    {
      id: 'to-teleutaio-vrady-mou',
      title: 'To Teleutaio Vrady Mou',
      titleGr: 'Το τελευταίο βράδυ μου',
      titleHe: 'הערב האחרון שלי',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 70,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Το τελευταίο βράδυ μου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Θα πιω και θα μεθύσω' },
            { chords: ['Dm', null, null, null], lyrics: 'Θα σπάσω τον κόσμο ολόκληρο' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και θα χαθώ' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Το τελευταίο βράδυ μου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Θα πιω και θα μεθύσω' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Θα σπάσω τον κόσμο ολόκληρο' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και θα χαθώ' },
          ]
        }
      ]
    },
    /* 55 — Στο τραπέζι που τα πίνω */
    {
      id: 'sto-trapezi-pou-ta-pino',
      title: 'Sto Trapezi pou ta Pino',
      titleGr: 'Στο τραπέζι που τα πίνω',
      titleHe: 'בשולחן שבו אני שותה',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 72,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Στο τραπέζι που τα πίνω' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Λείπει το ποτήρι σου' },
            { chords: ['Dm', null, null, null], lyrics: 'Λείπουν τα γλυκά σου λόγια' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Που άκουγα απ\' τα χείλη σου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Η θύμησή σου τη νύχτα αυτή' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μες στην καρδιά μου είναι καρφί' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Όπου ρίξω την ματιά μου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Βλέπω την σφραγίδα σου' },
          ]
        }
      ]
    },
    /* 56 — Το ψωμί της ξενιτιάς */
    {
      id: 'to-psomi-tis-xenitias',
      title: 'To Psomi tis Xenitias',
      titleGr: 'Το ψωμί της ξενιτιάς',
      titleHe: 'לחם הגולה',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 66,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Το ψωμί της ξενιτιάς είναι πικρό' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Το νερό της θλίψης και των δακρύων' },
            { chords: ['Dm', null, null, null], lyrics: 'Τα λεφτά που αποκτάς τα βλασφημάς' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Υποφέρεις πονάς την πατρίδα ζητάς' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Κλέφτρα ξενιτιά τα παλικάρια κλέβεις' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μαγιά κακιά με τα λεφτά μαγεύεις' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Πάντα μανιά χωρίζεις μάνες και παιδιά' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Κάνε παναγιά η ξενιά να παύει' },
          ]
        }
      ]
    },
    /* 57 — Αυτή η νύχτα μένει */
    {
      id: 'afti-i-nyhta-menei',
      title: 'Afti i Nyhta Menei',
      titleGr: 'Αυτή η νύχτα μένει',
      titleHe: 'הלילה הזה נשאר',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 68,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Αυτή η νύχτα μένει που θα \'μαστε μαζί' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Θα φύγεις μακριά μου πριν έρθει το πρωί' },
            { chords: ['Dm', null, null, null], lyrics: 'Αγάπη μου σε χάνω έτσι ήτανε γραμμένο' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μα όσο ζω στον κόσμο εσένα θα προσμένω' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Αυτή η νύχτα μένει' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Που θα \'μαστε μαζί' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Θα φύγεις μακριά μου πριν έρθει το πρωί' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Αυτή η νύχτα μένει' },
          ]
        }
      ]
    },
    /* 58 — Μόνος */
    {
      id: 'monos-kaz',
      title: 'Monos',
      titleGr: 'Μόνος',
      titleHe: 'לבד',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 64,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Μόνος περνάω κάθε βράδυ' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μόνος πίνω κάθε πρωί' },
            { chords: ['Dm', null, null, null], lyrics: 'Μόνος ζω και μόνος πεθαίνω' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μόνος πάντα θα μείνω' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Μόνος περνάω κάθε βράδυ' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μόνος πίνω κάθε πρωί' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μόνος ζω και μόνος πεθαίνω' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μόνος πάντα θα μείνω' },
          ]
        }
      ]
    },
    /* 59 — Σε ξένη χώρα μόνος */
    {
      id: 'se-xeni-hora-monos',
      title: 'Se Xeni Chora Monos',
      titleGr: 'Σε ξένη χώρα μόνος',
      titleHe: 'בארץ זרה לבד',
      artist: 'Στέλιος Καζαντζίδης & Μαρινέλλα',
      artistHe: 'סטליος קזנצידיס ומרינלה',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 66,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Μακριά απ\' τη μανούλα μου κι από τη γλυκιά πατρίδα' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Πήγα να βρω την τύχη μου μ\' ένα σκοπό κι ελπίδα' },
            { chords: ['Dm', null, null, null], lyrics: 'Και να γυρίσω με λεφτά μα γέμισα ρυτίδα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Σε ξένη χώρα μόνος' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Σε ξένα χέρια, ξένη γη' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Σκληρή δουλειά και πόνος' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Είναι μαρτύριο να ζεις' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Σε ξένη χώρα μόνος' },
          ]
        }
      ]
    },
    /* 60 — Όταν βραδιάζει στην ξενητιά */
    {
      id: 'otan-vradiazei-stin-xenitia',
      title: 'Otan Vradiazei stin Xenitia',
      titleGr: 'Όταν βραδιάζει στην ξενητιά',
      titleHe: 'כשחושך בגולה',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 62,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Όταν βραδιάζει στην ξενητιά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και τελειώνω απ\' την δουλειά' },
            { chords: ['Dm', null, null, null], lyrics: 'Τότε θυμάμαι εσένα μάνα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Κι όσους πονάω εκεί μακριά' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Μονάχος μου και έρημος' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Στα ξένα σαν βραδιάζει' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Με παίρνει το παράπονο' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και την καρδιά μου σφάζει' },
          ]
        }
      ]
    },
    /* 61 — Στις φάμπρικες της ξενιτιάς */
    {
      id: 'stis-famprikes-tis-xenitias',
      title: 'Stis Fabrikes tis Xenitias',
      titleGr: 'Στις φάμπρικες της ξενιτιάς',
      titleHe: 'במפעלי הגולה',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 68,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Στις φάμπρικες της ξενιτιάς' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μες τον ιδρώτα λιώνω' },
            { chords: ['Dm', null, null, null], lyrics: 'Κι έχω παρέα τον καημό' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Αχ! το δάκρυ και τον πόνο' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Στα ξένα εργοστάσια δουλεύω σαν το σκύλο' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μανούλα μου κι αγάπη μου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Λεφτά για να σας στείλω' },
            { chords: ['A7', null, 'Dm', null], lyrics: '' },
          ]
        }
      ]
    },
    /* 62 — Νυχτερίδες κι αράχνες */
    {
      id: 'nyhterides-ki-arachnes',
      title: 'Nyhterides ki Arachnes',
      titleGr: 'Νυχτερίδες κι αράχνες',
      titleHe: 'עטלפים ועכבישים',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 66,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Νυχτερίδες κι αράχνες, γλυκιά μου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Έχουν χτίσει φωλιά' },
            { chords: ['Dm', null, null, null], lyrics: 'Μέσα στο έρημο κι άδειο μας σπίτι' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Όσο λείπεις μακριά' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Γύρισε, γλυκιά μου, στην αγκαλιά μου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Στα βασανά μου, μη μ\' απαρνηθείς' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Εσένα, στερνή μου αγάπη' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Με πόνο ζητώ για να \'ρθεις' },
          ]
        }
      ]
    },
    /* 63 — Δύο πόρτες έχει η ζωή */
    {
      id: 'dyo-portes-echei-i-zoi',
      title: 'Dyo Portes echei i Zoi',
      titleGr: 'Δύο πόρτες έχει η ζωή',
      titleHe: 'לחיים שתי דלתות',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 70,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Δύο πόρτες έχει η ζωή' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μια για να μπεις και μια για να βγεις' },
            { chords: ['Dm', null, null, null], lyrics: 'Κι όποια πόρτα κι αν ανοίξεις' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Δε γυρίζεις πίσω ποτέ' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Δύο πόρτες έχει η ζωή' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μια για να μπεις και μια για να βγεις' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Κι όποια πόρτα κι αν ανοίξεις' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Δε γυρίζεις πίσω ποτέ' },
          ]
        }
      ]
    },
    /* 64 — Άπονες εξουσίες */
    {
      id: 'apones-exousies',
      title: 'Apones Exousies',
      titleGr: 'Άπονες εξουσίες',
      titleHe: 'שלטונות חסרי רחמים',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 64,
      timeSignature: '4/4',
      difficulty: 3,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Μια νύχτα που βουλιάζανε τα σπίτια' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μες στο χιόνι καρδούλα μου' },
            { chords: ['Dm', null, null, null], lyrics: 'Στον κάτω δρόμο του χωριού' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Σκοτώσαν τον Αντώνη' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Μάνα σε ξεκληρίσανε' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Άπονες εξουσίες' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Ψυχή δε σου αφήσανε' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μόνο φωτογραφίες' },
          ]
        }
      ]
    },
    /* 65 — Μην ταξιδεύεις μωρέ */
    {
      id: 'min-taxideveis-more',
      title: 'Min Taxideveis More',
      titleGr: 'Μην ταξιδεύεις μωρέ',
      titleHe: 'אל תיסע, חבר',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis'],
      key: 'Dm',
      bpm: 72,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Μην ταξιδεύεις μωρέ' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μην φεύγεις μακριά' },
            { chords: ['Dm', null, null, null], lyrics: 'Η ξενιτιά είναι πικρή' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και δεν αξίζει τίποτα' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Μην ταξιδεύεις μωρέ' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μην φεύγεις μακριά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Η ξενιτιά είναι πικρή' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και δεν αξίζει τίποτα' },
          ]
        }
      ]
    },
    /* 66 — Αχ κορίτσι μου */
    {
      id: 'ach-koritsi-mou',
      title: 'Ach Koritsi Mou',
      titleGr: 'Αχ κορίτσι μου',
      titleHe: 'אה, ילדתי',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Hitzaz',
      tags: ['kazantzidis', 'famous'],
      key: 'D',
      bpm: 74,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Αχ κορίτσι μου γλυκό' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Που μ\' έκλεψες την καρδιά' },
            { chords: ['Gm', null, null, null], lyrics: 'Και μ\' άφησες μόνο' },
            { chords: ['A7', null, 'D', null], lyrics: 'Με τον πόνο και τη λύπη' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Αχ κορίτσι μου γλυκό' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Που μ\' έκλεψες την καρδιά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και μ\' άφησες μόνο' },
            { chords: ['A7', null, 'D', null], lyrics: 'Με τον πόνο και τη λύπη' },
          ]
        }
      ]
    },
    /* 67 — Ζιγκουάλα (Η κυρία Δήμαρχος) */
    {
      id: 'zigkouala',
      title: 'Zigkouala',
      titleGr: 'Ζιγκουάλα',
      titleHe: 'זינגואלה',
      artist: 'Στέλιος Καζαντζίδης & Μαρινέλλα',
      artistHe: 'סטליος קזנצידיס ומרינלה',
      dromos: 'Hitzaz',
      tags: ['kazantzidis', 'famous', 'israeli-hit'],
      israeliArtist: 'ניקולס',
      hebrewHit: 'זיגוואלה — להיט יווני-ישראלי',
      key: 'D',
      bpm: 76,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Ζιγκουάλα Ζιγκουάλα Ζιγκουάλα' },
            { chords: ['Eb', null, 'D', null], lyrics: 'Εισ\' ο ήλιος το φεγγάρι και το φως μου' },
            { chords: ['Gm', null, null, null], lyrics: 'Μονάκριβο στολίδι είσαι του κόσμου' },
            { chords: ['Cm', null, 'D', null], lyrics: 'Μελαχρινή ομορφιά μου παντοτινή χαρά μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Eb', null], lyrics: 'Ζιγκουάλα Ζιγκουάλα Ζιγκουάλα' },
            { chords: ['Gm', null, 'Cm', null], lyrics: 'Πες μου ποιο είναι το πικρό παράπονό σου' },
            { chords: ['D', null, 'Eb', null], lyrics: 'Αν μου φύγεις δε θ\' αντέξω στο χαμό σου' },
            { chords: ['Gm', null, 'D', null], lyrics: 'Μελαχρινή ομορφιά μου παντοτινή χαρά μου' },
          ]
        }
      ]
    },
    /* 68 — Εμείς μαζί θα ζήσουμε */
    {
      id: 'emis-mazi-tha-zisoume',
      title: 'Emis Mazi tha Zisoume',
      titleGr: 'Εμείς μαζί θα ζήσουμε',
      titleHe: 'יחד נחיה',
      artist: 'Στέλιος Καζαντζίδης & Μαρινέλλα',
      artistHe: 'סטליος קזנצידיס ומרינלה',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 72,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Πες μου τι ζήλεψες απ\' την καρδιά μου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Κι απ\' το χαμένο μου κορμί' },
            { chords: ['Dm', null, null, null], lyrics: 'Φύγε από μένανε, φύγε γλυκιά μου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Προτού σε βρει η καταστροφή' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Εμείς μαζί θα ζήσουμε' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Ποτέ δε θα χωρίσουμε' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Δεν θα χωρίσουμε' },
            { chords: ['A7', null, 'Dm', null], lyrics: '' },
          ]
        }
      ]
    },
    /* 69 — Ο βράχος */
    {
      id: 'o-vrachos',
      title: 'O Vrachos',
      titleGr: 'Ο βράχος',
      titleHe: 'הסלע',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 66,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Σαν βράχο μέσ\' στα κύματα' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Αχμ\' άφησες να χτυπιέμαι' },
            { chords: ['Dm', null, null, null], lyrics: 'Στου χωρισμού την κόλαση' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Να κλαίω να τυραννιέμαι' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Ως πότε πια αγάπη μου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μες στην ζωή μονάχος' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Στα οργισμένα κύματα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Λησμονημένος βράχος' },
          ]
        }
      ]
    },
    /* 70 — Το πέλαγο είναι βαθύ */
    {
      id: 'to-pelago-einai-vathy',
      title: 'To Pelago einai Vathy',
      titleGr: 'Το πέλαγο είναι βαθύ',
      titleHe: 'הים עמוק',
      artist: 'Στέλιος Καζαντζίδης & Μαρινέλλα',
      artistHe: 'סטליος קזנצידיס ומרינלה',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Em',
      bpm: 68,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Em', null, null, null], lyrics: 'Το πέλαγο είναι βαθύ' },
            { chords: ['Am', null, 'B7', null], lyrics: 'Και η αγάπη μακριά' },
            { chords: ['Em', null, null, null], lyrics: 'Και δεν ξέρω πού να πάω' },
            { chords: ['B7', null, 'Em', null], lyrics: 'Μακριά απ\' τη ζωή μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Em', null, 'Am', null], lyrics: 'Το πέλαγο είναι βαθύ' },
            { chords: ['B7', null, 'Em', null], lyrics: 'Και η αγάπη μακριά' },
            { chords: ['Am', null, 'B7', null], lyrics: 'Και δεν ξέρω πού να πάω' },
            { chords: ['B7', null, 'Em', null], lyrics: 'Μακριά απ\' τη ζωή μου' },
          ]
        }
      ]
    },
    /* 71 — Το θολωμένο μου μυαλό */
    {
      id: 'to-tholomeno-mou-myalo',
      title: 'To Tholomeno Mou Myalo',
      titleGr: 'Το θολωμένο μου μυαλό',
      titleHe: 'המוח המעורפל שלי',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 64,
      timeSignature: '4/4',
      difficulty: 3,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Στο θολωμένο μου μυαλό' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Ο κόσμος είναι μια σταλιά' },
            { chords: ['Dm', null, null, null], lyrics: 'Κάτι σκιές απ\' τα παλιά' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Και κάποιο πάθος μου τρελό' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Το θολωμένο μου μυαλό' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μ\' έχει προδώσει προ πολλού' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Του λέω αλλού και τρέχει αλλού' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Με κάνει και παραμιλώ' },
          ]
        }
      ]
    },
    /* 72 — Όποια και να 'σαι */
    {
      id: 'opoiia-kai-na-eisai',
      title: 'Opoia kai na eisai',
      titleGr: 'Όποια και να \'σαι',
      titleHe: 'מי שאת',
      artist: 'Στέλιος Καζαντζίδης & Μαρινέλλα',
      artistHe: 'סטליος קזנצידיס ומרינלה',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 70,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Όποια και να \'σαι' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Ό,τι κι αν κάνεις' },
            { chords: ['Dm', null, null, null], lyrics: 'Εγώ θα σ\' αγαπώ' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μέχρι να πεθάνω' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Όποια και να \'σαι' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Ό,τι κι αν κάνεις' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Εγώ θα σ\' αγαπώ' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μέχρι να πεθάνω' },
          ]
        }
      ]
    },
    /* 73 — Για μας ποτέ μην ξημερώσει */
    {
      id: 'gia-mas-pote-min-ximerosei',
      title: 'Gia mas Pote min Ximerosei',
      titleGr: 'Για μας ποτέ μην ξημερώσει',
      titleHe: 'שלא יבוקר לנו לעולם',
      artist: 'Στέλιος Καζαντζίδης & Μαρινέλλα',
      artistHe: 'סטליος קזנצידיס ומרינלה',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 68,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Για μας ποτέ μην ξημερώσει' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μέσα στη νύχτα αυτή' },
            { chords: ['Dm', null, null, null], lyrics: 'Να χαθούμε μαζί' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Στην αγκαλιά μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Για μας ποτέ μην ξημερώσει' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Μέσα στη νύχτα αυτή' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Να χαθούμε μαζί' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Στην αγκαλιά μου' },
          ]
        }
      ]
    },
    /* 74 — Γι' αυτό σε φιλώ */
    {
      id: 'gi-afto-se-filo',
      title: 'Gi\' afto se Filo',
      titleGr: 'Γι\' αυτό σε φιλώ',
      titleHe: 'לכן אני אוהב אותך',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 70,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Γι\' αυτό σε φιλώ' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Γιατί είσαι η ζωή μου' },
            { chords: ['Dm', null, null, null], lyrics: 'Γι\' αυτό σε φιλώ' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Γιατί είσαι η καρδιά μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Γι\' αυτό σε φιλώ' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Γιατί είσαι η ζωή μου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Γι\' αυτό σε φιλώ' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Γιατί είσαι η καρδιά μου' },
          ]
        }
      ]
    },
    /* 75 — Ένα σπίτι δεν είναι σπίτι */
    {
      id: 'ena-spiti-den-einai-spiti',
      title: 'Ena Spiti den einai Spiti',
      titleGr: 'Ένα σπίτι δεν είναι σπίτι',
      titleHe: 'בית בלי אהבה',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליος קזנצידיס',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 68,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Ένα σπίτι δεν είναι σπίτι' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Χωρίς αγάπη και στοργή' },
            { chords: ['Dm', null, null, null], lyrics: 'Ένα σπίτι δεν είναι σπίτι' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Χωρίς εσένα κοντά μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Ένα σπίτι δεν είναι σπίτι' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Χωρίς αγάπη και στοργή' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Ένα σπίτι δεν είναι σπίτι' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Χωρίς εσένα κοντά μου' },
          ]
        }
      ]
    },
    /* 76 — Είσαι η ζωή μου */
    {
      id: 'eisai-i-zoi-mou',
      title: 'Eisai i Zoi Mou',
      titleGr: 'Είσαι η ζωή μου',
      titleHe: 'אתה החיים שלי',
      artist: 'Στέλιος Καζαντζίδης & Μαρινέλλα',
      artistHe: 'סטליος קזנצידיס ומרינלה',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 72,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Είσαι η ζωή μου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Είσαι η καρδιά μου' },
            { chords: ['Dm', null, null, null], lyrics: 'Είσαι η αγάπη μου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Είσαι η ψυχή μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Είσαι η ζωή μου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Είσαι η καρδιά μου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Είσαι η αγάπη μου' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Είσαι η ψυχή μου' },
          ]
        }
      ]
    },
    /* 77 — Αν μ' αγαπούσες όσο σ' αγαπώ */
    {
      id: 'an-m-agapouses-oso-s-agapo',
      title: 'An m\' Agapouses Oso s\' Agapo',
      titleGr: 'Αν μ\' αγαπούσες όσο σ\' αγαπώ',
      titleHe: 'אם היית אוהב אותי כמו שאני אוהב אותך',
      artist: 'Στέλιος Καζαντζίδης & Μαρινέλλα',
      artistHe: 'סטליος קזנצידיס ומרינלה',
      dromos: 'Minore',
      tags: ['kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 68,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Αν μ\' αγαπούσες όσο σ\' αγαπώ' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Δεν θα \'χαμε ποτέ χωρίσει' },
            { chords: ['Dm', null, null, null], lyrics: 'Αν μ\' αγαπούσες όσο σ\' αγαπώ' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Θα \'μαστε ακόμα μαζί' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Αν μ\' αγαπούσες όσο σ\' αγαπώ' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Δεν θα \'χαμε ποτέ χωρίσει' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Αν μ\' αγαπούσες όσο σ\' αγαπώ' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Θα \'μαστε ακόμα μαζί' },
          ]
        }
      ]
    },
    /* 78 — Μη μου θυμώνεις μάτια μου (אל תכעסי עיניים שלי) */
    {
      id: 'mi-mou-thimonis-matia-mou',
      title: 'Mi Mou Thimonis, Matia Mou',
      titleGr: 'Μη μου θυμώνεις μάτια μου',
      titleHe: 'אל תכעסי עלי',
      hebrewHit: 'עיניים שלי — יהודה פוליקר',
      israeliArtist: 'יהודה פוליקר',
      artist: 'Γιώργος Νταλάρας',
      artistHe: 'יורגוס דאלארס',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 72,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Μη μου θυμώνεις μάτια μου' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Μη μου λες πως δε σ\' αγαπώ' },
            { chords: ['Am', null, null, null], lyrics: 'Μη μου θυμώνεις μάτια μου' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Μη μου λες πως δε σ\' αγαπώ' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Μη μου θυμώνεις μάτια μου' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Μη μου λες πως δε σ\' αγαπώ' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Μη μου θυμώνεις μάτια μου' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Μη μου λες πως δε σ\' αγαπώ' },
          ]
        }
      ]
    },
    /* 79 — Ήταν πέντε ήταν έξι (השעה הייתה שש / בוקר ים ראשון) */
    {
      id: 'itan-pente-itan-exi',
      title: 'Itan Pente Itan Exi',
      titleGr: 'Ήταν πέντε ήταν έξι',
      titleHe: 'בוקר יום ראשון',
      hebrewHit: 'בוקר יום ראשון — יהודה פוליקר',
      israeliArtist: 'יהודה פוליקר',
      artist: 'Γιώργος Νταλάρας',
      artistHe: 'יורגוס דאלארס',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Dm',
      bpm: 78,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Ήταν πέντε ήταν έξι κι έγινε εφτά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Το παράπονο με πήρε κι έκλαψα πικρά' },
            { chords: ['Dm', null, null, null], lyrics: 'Έκλαψα για τη ζωή μου και για το γραφτό' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Το ρολόι μου δείχνει οχτώ' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Διάβασα τα γεγονότα και την κοσμική' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Για ποδόσφαιρο για φόνους και πολιτική' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Στην Ασία φασαρίες πείνα κι ερημιά' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Το ρολόι μου δείχνει εννιά' },
          ]
        }
      ]
    },
    /* 80 — Να \'μουν ο Μεγαλέξανδρος (אלקו — יהודה פוליקר) */
    {
      id: 'namoun-o-megalexandros',
      title: 'Namoun o Megalexandros',
      titleGr: 'Να \'μουν ο Μεγαλέξανδρος',
      titleHe: 'אלקו',
      hebrewHit: 'אלקו — יהודה פוליקר',
      artist: 'Γιώργος Νταλάρας',
      artistHe: 'יורגוס דאלארס',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Dm',
      bpm: 68,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Dm', null, null, null], lyrics: 'Να \'μουν ο Μεγαλέξανδρος' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Και να \'σουν η γοργόνα μου' },
            { chords: ['Dm', null, null, null], lyrics: 'Μα είμαι φτωχός και ταπεινός' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Αλέκο με φωνάζουνε' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Dm', null, 'Gm', null], lyrics: 'Κάστρα ψηλά να γκρέμιζα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Με το σπαθί στο χέρι μου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Χρυσάφια να σε γέμιζα' },
            { chords: ['A7', null, 'Dm', null], lyrics: 'Να θάμπωνες αστέρι μου' },
          ]
        }
      ]
    },
    /* 81 — Τα παιδιά της άμυνας (שיר השיירה — אריק איינשטיין) */
    {
      id: 'ta-pedia-tis-aminas',
      title: 'Tis Amynis Ta Paidia',
      titleGr: 'Τα παιδιά της άμυνας',
      titleHe: 'ילדי ההגנה',
      hebrewHit: 'ילדי ההגנה · שיר השיירה — אריק איינשטיין',
      israeliArtist: 'אריק איינשטיין',
      artist: 'Σταύρος Ξαρχάκος',
      artistHe: 'סטברוס ז\'ארחאκος',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 110,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Τα παιδιά της άμυνας' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μια μέρα θα το γράψει η ιστορία' },
            { chords: ['D', null, null, null], lyrics: 'Που έδιωξ\' από την Αθήνα τα θηρία' },
            { chords: ['A7', null, 'D', null], lyrics: 'Του έδιωξε βασιλείς και βουλευτάδες' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Της άμυνης τα παιδιά διώξανε το Βασιλιά' },
            { chords: ['A7', null, 'D', null], lyrics: 'Και του δώσαν τα πανιά του' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Για να πάει στη δουλειά του' },
            { chords: ['A7', null, 'D', null], lyrics: 'Τον περίδρομο να τρώει με το ξένο του το σόι' },
          ]
        }
      ]
    },
    /* 82 — Όλα καλά (תודה — חיים משה) */
    {
      id: 'ola-kala',
      title: 'Ola Kala',
      titleGr: 'Όλα καλά',
      titleHe: 'הכל בסדר',
      hebrewHit: 'הכל בסדר / תודה — חיים משה',
      israeliArtist: 'חיים משה',
      artist: 'Γιώργος Νταλάρας',
      artistHe: 'יורגוס דאלארס',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 74,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Όλα καλά κι όλα ωραία' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Χτες ήσουν μ\' άλλονε παρέα' },
            { chords: ['Am', null, null, null], lyrics: 'Και που σοκάκι να τραγουδήσεις' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Δεν επιτρέπονται οι αναμνήσεις' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Μίλα σιγά και μη φωνάζεις' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Είμαι κουτός και με τρομάζεις' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Δε θέλω κόσμο και φασαρία' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Αύριο μπαίνω στην ανεργία' },
          ]
        }
      ]
    },
    /* 83 — Σήκω χόρεψε κουκλί μου */
    {
      id: 'siko-horepse-koukli-mou',
      title: 'Siko Horepse Koukli Mou',
      titleGr: 'Σήκου χόρεψε, κουκλί μου',
      titleHe: 'קום ורקדי, יקירתי',
      hebrewHit: 'שיר טברנה קצבי — סטליוס קזנצידיס',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליוס קזנצידיס',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'kazantzidis', 'famous'],
      key: 'D',
      bpm: 128,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Σήκου χόρεψε, κουκλί μου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Μην κοιτάς τους γύρω σου' },
            { chords: ['D', null, null, null], lyrics: 'Σήκου χόρεψε, κουκλί μου' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μην κοιτάς τους γύρω σου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Σήκου χόρεψε, κουκλί μου' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μην κοιτάς τους γύρω σου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Σήκου χόρεψε, κουκλί μου' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μην κοιτάς τους γύρω σου' },
          ]
        }
      ]
    },
    /* 84 — Δυνατά Δυνατά */
    {
      id: 'dinata-dinata',
      title: 'Dinata Dinata',
      titleGr: 'Δυνατά Δυνατά',
      titleHe: 'חזק חזק',
      hebrewHit: 'להיט מסיבות בישראל — אלפטריה ארבניטאκי',
      artist: 'Ελευθερία Αρβανιτάκη',
      artistHe: 'אלפטריה ארבניטאקי',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 120,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Δυνατά, δυνατά' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Γίναν όλα δυνατά τ\' αδύνατα' },
            { chords: ['Am', null, null, null], lyrics: 'Δυνατά, δυνατά' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Σ\' ένα θέαμα κοινό' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Δυνατά, δυνατά' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Κι όπως πάνε του χορού τα βήματα' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Με τα χέρια ανοιχτά' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Όλα τα περιφρονώ' },
          ]
        }
      ]
    },
    /* 85 — Bum Pam (בום פם — אריס סאן) */
    {
      id: 'bum-pam',
      title: 'Bum Pam',
      titleGr: 'Bum Pam',
      titleHe: 'בום פם',
      hebrewHit: 'בום פם — אריס סאן',
      artist: 'Άρης Σαν',
      artistHe: 'אריס סאן',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 130,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Bum Pam Bum Pam' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Bum Pam Bum Pam' },
            { chords: ['D', null, null, null], lyrics: 'Bum Pam Bum Pam' },
            { chords: ['A7', null, 'D', null], lyrics: 'Bum Pam Bum Pam' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Bum Pam Bum Pam' },
            { chords: ['A7', null, 'D', null], lyrics: 'Bum Pam Bum Pam' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Bum Pam Bum Pam' },
            { chords: ['A7', null, 'D', null], lyrics: 'Bum Pam Bum Pam' },
          ]
        }
      ]
    },
    /* 86 — Ένα απόγευμα θλιμμένο (שלומי סרנגה) */
    {
      id: 'ena-apogevma-thlimeno',
      title: 'Ena Apogevma Thlimeno',
      titleGr: 'Ένα απόγευμα θλιμμένο',
      titleHe: 'אחר צהריים עצוב',
      hebrewHit: 'שלומי סרנגה',
      artist: 'Ζαφείρης Μέλας',
      artistHe: 'זafiris Melas',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 66,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Ένα απόγευμα θλιμμένο σε θυμήθηκα' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Όσα περάσαμε σκεφτόμουν και λυπήθηκα' },
            { chords: ['Am', null, null, null], lyrics: 'Με την ανάμνησή σου ζω και τυραννιέμαι' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Μα πίστεψέ με: σ\' αγαπώ, δε σε αρνιέμαι' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Λυπάμαι γιατί δεν μπορώ ν\' αντέξω στο χωρισμό' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Και κάθε απόγευμα θλιμμένο σε θυμάμαι' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Με παίρνουνε τα δάκρυα, οι καημοί και τα παράπονα' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Και νιώθω τη ζωή μου να τελειώνει' },
          ]
        }
      ]
    },
    /* 87 — Ρόζα */
    {
      id: 'roza',
      title: 'Roza',
      titleGr: 'Ρόζα',
      titleHe: 'רוזה',
      hebrewHit: 'להיט בקרב חובבי יוונית בישראל',
      artist: 'Δημήτρης Μητροπάνος',
      artistHe: 'דימיטריס מיטרופאנוס',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous', 'zeibekiko'],
      style: 'zeibekiko',
      key: 'Am',
      bpm: 56,
      timeSignature: '9/4',
      difficulty: 3,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Τα χείλη μου ξερά και διψασμένα' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Ψάχνουν για νερό στο άσφαλτο' },
            { chords: ['Am', null, null, null], lyrics: 'Περνάνε δίπλα μου τα τροχοφόρα' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Κι εσύ μου λες πως μας περιμένει καταιγίδα' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Περπατάμε στην ίδια δρόμο μαζί' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Μα τα κύτταρά μας χωριστά' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Τι με κοιτάζεις Ρόζα μουδιασμένο' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Συγχώρα με που δεν καταλαβαίνω' },
          ]
        }
      ]
    },
    /* 88 — Αγωνία (טריפונas בישראל) */
    {
      id: 'agonia',
      title: 'Agonia',
      titleGr: 'Αγωνία',
      titleHe: 'עגוניה',
      hebrewHit: 'קומפילציה יוונית-ישראלית · feat. טריפונוס',
      israeliArtist: 'טריפונוס',
      artist: 'Τόλης Βοσκόπουλος / Τρύφωνas',
      artistHe: 'טוליס בוסקופoulos · טריפונוס (ישראל)',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 88,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Η καρδιά μου πληγωμένη' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Σαν καμπάνα ραγισμένη' },
            { chords: ['D', null, null, null], lyrics: 'Μυστικά με βασανίζει με μανία' },
            { chords: ['A7', null, 'D', null], lyrics: 'Η ζωή πριν μας χωρίσει' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Αγωνία, αγωνία' },
            { chords: ['A7', null, 'D', null], lyrics: 'Αγωνία με λαχτάρα να σε νοιάζομαι' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Αγωνία δυστυχώς να σε μοιράζομαι' },
            { chords: ['A7', null, 'D', null], lyrics: 'Αγωνία, αγωνία' },
          ]
        }
      ]
    },
    /* 89 — Σταλιά σταλιά (מרינלה) */
    {
      id: 'stalia-stalia',
      title: 'Stalia Stalia',
      titleGr: 'Σταλιά σταλιά',
      titleHe: 'טיפה טיפה',
      hebrewHit: 'שיר קצבי ושמח — מרינלה · "טיפה טיפה"',
      artist: 'Μαρινέλλα',
      artistHe: 'מרינלה',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 118,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Αγόρι μου, στολίδι μου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Σα\' γέρνεις και μ\' αγγίζεις' },
            { chords: ['D', null, null, null], lyrics: 'Πιο πέρα κι απ\' τα πέρατα του κόσμου' },
            { chords: ['A7', null, 'D', null], lyrics: 'Μ\' αρμενίζεις' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Σταλιά σταλιά κι αχόρταγα' },
            { chords: ['A7', null, 'D', null], lyrics: 'Τα πίνω τα φιλιά σου' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Κουρνιάζω σαν αδύνατο πουλί' },
            { chords: ['A7', null, 'D', null], lyrics: 'Στην αγκαλιά σου' },
          ]
        }
      ]
    },
    /* 90 — Βρέχει στη φτωχογειτονιά */
    {
      id: 'vrehisti-sti-ftohogeitonia',
      title: 'Vrehisti sti Ftohogeitonia',
      titleGr: 'Βρέχει στη φτωχογειτονιά',
      titleHe: 'גשם בשכונת העוני',
      hebrewHit: 'קלאסיקה יוונית עצובה — מίκης Θεοδωράκης',
      artist: 'Γρηγόρης Μπιθικώτσης',
      artistHe: 'גריגוריס ביתיקוטיס',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 64,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Μικρά κι ανήλιαγα στενά' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Και σπίτια χαμηλά μου' },
            { chords: ['Am', null, null, null], lyrics: 'Βρέχει στη φτωχογειτονιά' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Βρέχει και στην καρδιά μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Αχ ψεύτη κι άδικε ντουνιά' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Π\' άναψες τον καημό μου' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Είσαι μικρός και δεν χωράς' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Τον αναστεναγμό μου' },
          ]
        }
      ]
    },
    /* 91 — Οδός Αριστοτέλους */
    {
      id: 'odos-aristotelous',
      title: 'Odos Aristotelous',
      titleGr: 'Οδός Αριστοτέλους',
      titleHe: 'רחוב אריסטו',
      hebrewHit: 'נוסטלגיה יוונית — רחוב אריסטו בסלוניקי',
      artist: 'Χάρις Αλεξίου',
      artistHe: 'חריס אלεξiou',
      dromos: 'Rast',
      tags: ['israeli-hit', 'famous'],
      key: 'G',
      bpm: 76,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['G', null, null, null], lyrics: 'Σάββατο κι απόβραδο και ασετυλίνη' },
            { chords: ['Cm', null, 'D7', null], lyrics: 'Στην Αριστοτέλους που γερνάς' },
            { chords: ['G', null, null, null], lyrics: 'Έβγαζα απ\' τις τσέπες μου φλούδες μανταρίνι' },
            { chords: ['D7', null, 'G', null], lyrics: 'Σου \'ριχνα στα μάτια' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['G', null, 'Cm', null], lyrics: 'Τ\' Άϊ Γιάννη θα \'τανε θαρρώ' },
            { chords: ['D7', null, 'G', null], lyrics: 'Οδός Αριστοτέλους' },
            { chords: ['Cm', null, 'D7', null], lyrics: 'Σάββατο κι απόβραδο και ασετυλίνη' },
            { chords: ['D7', null, 'G', null], lyrics: 'Στην Αριστοτέλους που γερνάς' },
          ]
        }
      ]
    },
    /* 92 — Opalala (טריפונוס — Koliphone) */
    {
      id: 'opalala',
      title: 'Opalala',
      titleGr: 'Opalala',
      titleHe: 'אופללה',
      hebrewHit: 'להיט Koliphone · feat. טריפונוס',
      israeliArtist: 'טריפונוס',
      artist: 'Τρύφωνas Νικολαΐδης',
      artistHe: 'טריפונוס',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 132,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Opa la la opa la la' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Opa la la opa la la' },
            { chords: ['D', null, null, null], lyrics: 'Opa la la opa la la' },
            { chords: ['A7', null, 'D', null], lyrics: 'Opa la la opa la la' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Opa opa opalala' },
            { chords: ['A7', null, 'D', null], lyrics: 'Opa opa opalala' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Opa opa opalala' },
            { chords: ['A7', null, 'D', null], lyrics: 'Opa opa opalala' },
          ]
        }
      ]
    },
    /* 93 — Barbaryanis (ברבריאניס) */
    {
      id: 'barbaryanis',
      title: 'Barbaryanis',
      titleGr: 'Barbaryanis',
      titleHe: 'ברבריאניס',
      hebrewHit: 'קומפילציה יוונית-ישראלית · feat. טריפונוס',
      israeliArtist: 'טריפונוס',
      artist: 'Τρύφωνas Νικολαΐδης',
      artistHe: 'טריפונוס',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 128,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Barbaryanis barbaryanis' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Barbaryanis barbaryanis' },
            { chords: ['D', null, null, null], lyrics: 'Barbaryanis barbaryanis' },
            { chords: ['A7', null, 'D', null], lyrics: 'Barbaryanis barbaryanis' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Barbaryanis' },
            { chords: ['A7', null, 'D', null], lyrics: 'Barbaryanis' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Barbaryanis' },
            { chords: ['A7', null, 'D', null], lyrics: 'Barbaryanis' },
          ]
        }
      ]
    },
    /* 94 — Στην ανατολή (סטיננטולי) */
    {
      id: 'stin-anatoli',
      title: 'Stin Anatoli',
      titleGr: 'Στην ανατολή',
      titleHe: 'סטיננטולי',
      hebrewHit: 'קומפילציה יוונית-ישראלית · feat. טריפונוס',
      israeliArtist: 'טריפונוס',
      artist: 'Τρύφωνas Νικολαΐδης',
      artistHe: 'טריפונוס',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 110,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Στην ανατολή του ουρανού' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Έλα μαζί μου να χορέψουμε' },
            { chords: ['D', null, null, null], lyrics: 'Στην ανατολή του ουρανού' },
            { chords: ['A7', null, 'D', null], lyrics: 'Έλα μαζί μου να χορέψουμε' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Στην ανατολή' },
            { chords: ['A7', null, 'D', null], lyrics: 'Στην ανατολή' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Στην ανατολή' },
            { chords: ['A7', null, 'D', null], lyrics: 'Στην ανατολή' },
          ]
        }
      ]
    },
    /* 95 — Μυτιλήνη (מטליוסים) */
    {
      id: 'mitilini',
      title: 'Mitilini',
      titleGr: 'Μυτιλήνη',
      titleHe: 'מטליוסים',
      hebrewHit: 'קומפילציה יוונית-ישראלית · feat. סטלוס',
      israeliArtist: 'סטלוס',
      artist: 'Τρύφωνas / Λαϊκό',
      artistHe: 'סטלוס · Μυτιλήνη',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 92,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Μυτιλήνη μου γλυκιά' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Σ\' αγαπώ και σε λατρεύω' },
            { chords: ['Am', null, null, null], lyrics: 'Μυτιλήνη μου γλυκιά' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Σ\' αγαπώ και σε λατρεύω' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['Am', null, 'Dm', null], lyrics: 'Μυτιλήνη' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Μυτιλήνη' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Μυτιλήνη' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Μυτιλήνη' },
          ]
        }
      ]
    },
    /* 96 — Θεσσαλονίκη (סלוניקיוס) */
    {
      id: 'salonikios',
      title: 'Salonikios',
      titleGr: 'Θεσσαλονίκη',
      titleHe: 'סלוניקיוס',
      hebrewHit: 'קומפילציה יוונית-ישראלית · feat. רוניוס',
      israeliArtist: 'רוניוס',
      artist: 'Τρύφωνas / Λαϊκό',
      artistHe: 'רוניוס · Θεσσαλονίκη',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 108,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Θεσσαλονίκη μου γλυκιά' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Πόλη της καρδιάς μου' },
            { chords: ['D', null, null, null], lyrics: 'Θεσσαλονίκη μου γλυκιά' },
            { chords: ['A7', null, 'D', null], lyrics: 'Πόλη της καρδιάς μου' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Θεσσαλονίκη' },
            { chords: ['A7', null, 'D', null], lyrics: 'Θεσσαλονίκη' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Θεσσαλονίκη' },
            { chords: ['A7', null, 'D', null], lyrics: 'Θεσσαλονίκη' },
          ]
        }
      ]
    },
    /* 97 — Παλαμάκια (מחרוזת) */
    {
      id: 'palamakia',
      title: 'Palamakia',
      titleGr: 'Παλαμάκια',
      titleHe: 'מחרוזת: פלמκיה',
      hebrewHit: 'מחרוזת · feat. אליאניס',
      israeliArtist: 'אליאניס',
      israeliMedley: true,
      artist: 'Λαϊκό / Δημήτρης Γαλάνης',
      artistHe: 'אליאניס · Παλαμάκια',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 130,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Medley',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Παλαμάκια παλαμάκια' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Χτυπάω τα χέρια μου' },
            { chords: ['D', null, null, null], lyrics: 'Παλαμάκια παλαμάκια' },
            { chords: ['A7', null, 'D', null], lyrics: 'Χτυπάω τα χέρια μου' },
          ]
        }
      ]
    },
    /* 98 — Asi Toktialo (מחרוזת) */
    {
      id: 'asi-toktialo',
      title: 'Asi Toktialo',
      titleGr: 'Asi Toktialo',
      titleHe: 'מחרוזת אסי תוקטיאלו',
      hebrewHit: 'מחרוזת · feat. סטלוס',
      israeliArtist: 'סטלוס',
      israeliMedley: true,
      artist: 'Λαϊκό / Koliphone',
      artistHe: 'סטלוס · מחרוזת',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 128,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Medley',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Asi to ktialo asi to ktialo' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Asi to ktialo asi to ktialo' },
            { chords: ['D', null, null, null], lyrics: 'Asi to ktialo asi to ktialo' },
            { chords: ['A7', null, 'D', null], lyrics: 'Asi to ktialo asi to ktialo' },
          ]
        }
      ]
    },
    /* 99 — Πήγα (מחרוזת) */
    {
      id: 'piga-medley',
      title: 'Piga',
      titleGr: 'Πήγα',
      titleHe: 'מחרוזת: פיגα',
      hebrewHit: 'מחרוזת · feat. אליאניס',
      israeliArtist: 'אליאניס',
      israeliMedley: true,
      artist: 'Λαϊκό / Koliphone',
      artistHe: 'אליאניס · Πήγα',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 96,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Medley',
          lines: [
            { chords: ['Am', null, null, null], lyrics: 'Πήγα σε γλυκό τραπέζι' },
            { chords: ['Dm', null, 'E7', null], lyrics: 'Και πήρα μια γουλιά' },
            { chords: ['Am', null, null, null], lyrics: 'Πήγα σε γλυκό τραπέζι' },
            { chords: ['E7', null, 'Am', null], lyrics: 'Και πήρα μια γουλιά' },
          ]
        }
      ]
    },
    /* 100 — Torna (טורנה) */
    {
      id: 'torna',
      title: 'Torna',
      titleGr: 'Torna',
      titleHe: 'טורנה',
      hebrewHit: 'קומפילציה יוונית-ישראלית · feat. טריפונוס',
      israeliArtist: 'טריפונוס',
      artist: 'Τρύφωνas Νικολαΐδης',
      artistHe: 'טריפונוס',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 126,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [
        {
          name: 'Verse',
          lines: [
            { chords: ['D', null, null, null], lyrics: 'Torna torna torna' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Torna torna torna' },
            { chords: ['D', null, null, null], lyrics: 'Torna torna torna' },
            { chords: ['A7', null, 'D', null], lyrics: 'Torna torna torna' },
          ]
        },
        {
          name: 'Chorus',
          lines: [
            { chords: ['D', null, 'Gm', null], lyrics: 'Torna torna' },
            { chords: ['A7', null, 'D', null], lyrics: 'Torna torna' },
            { chords: ['Gm', null, 'A7', null], lyrics: 'Torna torna' },
            { chords: ['A7', null, 'D', null], lyrics: 'Torna torna' },
          ]
        }
      ]
    },
    /* 101 — Το μεγαλύτερο σουξέ */
    {
      id: 'to-megalitero-souxe',
      title: 'To Megalitero Souxe',
      titleGr: 'Το μεγαλύτερο σουξέ',
      titleHe: 'הסουξה הגדול ביותר',
      artist: 'Άννα Βίσση',
      artistHe: 'אנה בissi',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 120,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['D', null, 'Gm', null], lyrics: 'Το μεγαλύτερο σουξέ' },
        { chords: ['A7', null, 'D', null], lyrics: 'Το μεγαλύτερο σουξέ' },
        { chords: ['D', null, 'Gm', null], lyrics: 'Το μεγαλύτερο σουξέ' },
        { chords: ['A7', null, 'D', null], lyrics: 'Το μεγαλύτερο σουξέ' },
      ]}]
    },
    /* 102 — Κοντά στην καρδιά (בואי אהובה) */
    {
      id: 'konta-stin-kardia',
      title: 'Konta stin Kardia',
      titleGr: 'Κοντά στην καρδιά',
      titleHe: 'בואי אהובה',
      hebrewHit: 'בואי אהובה (קרוב ללב) — חיים משה',
      israeliArtist: 'חיים משה',
      artist: 'Λαϊκό',
      artistHe: 'להיט יווני',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 76,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Κοντά στην καρδιά μου' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Έλα αγάπη μου' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Κοντά στην καρδιά μου' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Έλα αγάπη μου' },
      ]}]
    },
    /* 103 — Πώς να σε λησμονήσω */
    {
      id: 'pos-na-se-lismoniso',
      title: 'Pos na se Lismoniso',
      titleGr: 'Πώς να σε λησμονήσω',
      titleHe: 'איך אשכח אותך',
      artist: 'Χάρις Αλεξίου',
      artistHe: 'חריס אלεξiou',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 70,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Πώς να σε λησμονήσω' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Πώς να σε ξεχάσω' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Πώς να σε λησμονήσω' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Πώς να σε ξεχάσω' },
      ]}]
    },
    /* 104 — Αν ήμουν μαζί σου */
    {
      id: 'an-imoun-mazi-sou',
      title: 'An Imoun Mazi Sou',
      titleGr: 'Αν ήμουν μαζί σου',
      titleHe: 'אילו הייתי איתך',
      hebrewHit: 'אילו הייתי איתך — יהודית תמיר',
      israeliArtist: 'יהודית תמיר',
      artist: 'Λαϊκό',
      artistHe: 'להיט יווני',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Dm',
      bpm: 72,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Αν ήμουν μαζί σου' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Αν ήμουν μαζί σου' },
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Αν ήμουν μαζί σου' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Αν ήμουν μαζί σου' },
      ]}]
    },
    /* 105 — Τελί τελί τελί */
    {
      id: 'teli-teli-teli',
      title: 'Teli Teli Teli',
      titleGr: 'Τελί τελί τελί',
      titleHe: 'טלי טלי טלי',
      hebrewHit: 'טלי טלי טלי — מיקי גבריאלוב',
      israeliArtist: 'מיקי גבריאלוב',
      artist: 'Χάρις Αλεξίου',
      artistHe: 'חריס אלεξiou',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 118,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['D', null, 'Gm', null], lyrics: 'Τελί τελί τελί' },
        { chords: ['A7', null, 'D', null], lyrics: 'Τελί τελί τελί' },
        { chords: ['D', null, 'Gm', null], lyrics: 'Τελί τελί τελί' },
        { chords: ['A7', null, 'D', null], lyrics: 'Τελί τελί τελί' },
      ]}]
    },
    /* 106 — Ποιά είσαι */
    {
      id: 'pia-esi',
      title: 'Pia Esi',
      titleGr: 'Ποιά είσαι',
      titleHe: 'זה אני',
      hebrewHit: 'זה אני — אייל גולן',
      israeliArtist: 'אייל גולן',
      artist: 'Νίκος Βέρτης',
      artistHe: 'ניקוס וertis',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 90,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Ποιά είσαι εσύ' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Που μ\' έκανες να πονώ' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Ποιά είσαι εσύ' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Που μ\' έκανες να πονώ' },
      ]}]
    },
    /* 107 — Μένω εκτός */
    {
      id: 'meno-ektos',
      title: 'Meno Ektos',
      titleGr: 'Μένω εκτός',
      titleHe: 'נשארתי בחוץ',
      artist: 'Ελευθερία Αρβανιτάκη & Ara Dinkjian',
      artistHe: 'אלפטריה ארבניטאκי',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 82,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Μένω εκτός' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Μένω εκτός' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Μένω εκτός' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Μένω εκτός' },
      ]}]
    },
    /* 108 — Τα γη λέω */
    {
      id: 'ta-yi-leo',
      title: 'Ta Yi Leo',
      titleGr: 'Τα γη λέω',
      titleHe: 'בלילה',
      hebrewHit: 'בלילה — זוהר ארגוב',
      israeliArtist: 'זוהר ארגוב',
      artist: 'Γιώργος Μαργαρίτης',
      artistHe: 'ג\'ורγος מargaritis',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Dm',
      bpm: 68,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Τα γη λέω τα γη λέω' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Τα γη λέω τα γη λέω' },
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Τα γη λέω τα γη λέω' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Τα γη λέω τα γη λέω' },
      ]}]
    },
    /* 109 — Τι θες γέρο */
    {
      id: 'ti-thelis-yero',
      title: 'Ti Thelis Yero',
      titleGr: 'Τι θες γέρο',
      titleHe: 'מה אתה רוצה, איש זקן?',
      artist: 'Ρένα Κουμιώτη',
      artistHe: 'ρένα Κουμιώτη',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 74,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Τι θες γέρο τι θες γέρο' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Τι θες γέρο τι θες γέρο' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Τι θες γέρο τι θες γέρο' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Τι θες γέρο τι θες γέρο' },
      ]}]
    },
    /* 110 — Ποια θυσία */
    {
      id: 'poia-thisia',
      title: 'Poia Thisia',
      titleGr: 'Ποια θυσία',
      titleHe: 'תפילת האמהות',
      hebrewHit: 'תפילת האמהות — אמאל מרקוס, יהודית תמיר, גליקריה',
      israeliArtist: 'יהודית תמיר',
      artist: 'Αντζέλα Δημητρίου',
      artistHe: 'אנטzela דimitriou',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Dm',
      bpm: 66,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Ποια θυσία ποια θυσία' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Ποια θυσία ποια θυσία' },
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Ποια θυσία ποια θυσία' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Ποια θυσία ποια θυσία' },
      ]}]
    },
    /* 111 — Στην πόρτα σου (על סף דלתך) */
    {
      id: 'stin-porta-sou',
      title: 'Stin Porta Sou',
      titleGr: 'Στην πόρτα σου',
      titleHe: 'על סף דלתך',
      hebrewHit: 'על סף דלתך — חיים משה',
      israeliArtist: 'חיים משה',
      artist: 'Λαϊκό',
      artistHe: 'להיט יווני',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 70,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Στην πόρτα σου στέκομαι' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Στην πόρτα σου στέκομαι' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Στην πόρτα σου στέκομαι' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Στην πόρτα σου στέκομαι' },
      ]}]
    },
    /* 112 — Τα μαύρα μάτια σου */
    {
      id: 'ta-mavra-matia-sou',
      title: 'Ta Mavra Matia Sou',
      titleGr: 'Τα μαύρα μάτια σου',
      titleHe: 'עינייך השחורות',
      hebrewHit: 'עינייך השחורות — ניקולס',
      israeliArtist: 'ניקולס',
      artist: 'Μανώλης Αγγελόπουλος / Nikolas',
      artistHe: 'מנolis אngelopoulos',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 102,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['D', null, 'Gm', null], lyrics: 'Τα μαύρα μάτια σου' },
        { chords: ['A7', null, 'D', null], lyrics: 'Τα μαύρα μάτια σου' },
        { chords: ['D', null, 'Gm', null], lyrics: 'Τα μαύρα μάτια σου' },
        { chords: ['A7', null, 'D', null], lyrics: 'Τα μαύρα μάτια σου' },
      ]}]
    },
    /* 113 — Δεν αξίζει τον κόπο */
    {
      id: 'den-axizi-ton-kopo',
      title: 'Den Axizi Ton Kopo',
      titleGr: 'Δεν αξίζει τον κόπο',
      titleHe: 'לא שווה את זה',
      artist: 'Κατερίνα Στανίση',
      artistHe: 'קaterina סtanisi',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 88,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Δεν αξίζει τον κόπο' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Δεν αξίζει τον κόπο' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Δεν αξίζει τον κόπο' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Δεν αξίζει τον κόπο' },
      ]}]
    },
    /* 114 — Πάψε λοιπόν */
    {
      id: 'papse-loipon',
      title: 'Papse Loipon',
      titleGr: 'Πάψε λοιπόν',
      titleHe: 'ילדה רעה',
      hebrewHit: 'ילדה רעה — נתי לוי ופיני חדד',
      israeliArtist: 'נתי לוי',
      artist: 'Σωτήρης Βολάνης',
      artistHe: 'סotis וolanis',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 112,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['D', null, 'Gm', null], lyrics: 'Πάψε λοιπόν πάψε λοιπόν' },
        { chords: ['A7', null, 'D', null], lyrics: 'Πάψε λοιπόν πάψε λοιπόν' },
        { chords: ['D', null, 'Gm', null], lyrics: 'Πάψε λοιπόν πάψε λοιπόν' },
        { chords: ['A7', null, 'D', null], lyrics: 'Πάψε λοιπόν πάψε λοιπόν' },
      ]}]
    },
    /* 115 — Ο μπαγλαμάς */
    {
      id: 'o-baglamas',
      title: 'O Baglamas',
      titleGr: 'Ο μπαγλαμάς',
      titleHe: 'כך עוברים חיי',
      hebrewHit: 'כך עוברים חיי — זוהר ארגוב',
      israeliArtist: 'זוהר ארגוב',
      artist: 'Γιώργος Νταλάρας',
      artistHe: 'יורגוס דאלארס',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 72,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Ο μπαγλαμάς μου θα πει' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Ο μπαγλαμάς μου θα πει' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Ο μπαγλαμάς μου θα πει' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Ο μπαγλαμάς μου θα πει' },
      ]}]
    },
    /* 116 — Μου λείπει */
    {
      id: 'mou-leipei',
      title: 'Mou Leipei',
      titleGr: 'Μου λείπει',
      titleHe: 'חסר לי',
      artist: 'Σωτήρης Βολάνης',
      artistHe: 'סotis וolanis',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Dm',
      bpm: 76,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Μου λείπεις μου λείπεις' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Μου λείπεις μου λείπεις' },
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Μου λείπεις μου λείπεις' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Μου λείπεις μου λείπεις' },
      ]}]
    },
    /* 117 — Φεύγω ξανά */
    {
      id: 'fevgo-ksana',
      title: 'Fevgo Ksana',
      titleGr: 'Φεύγω ξανά',
      titleHe: 'יש לי אותך',
      hebrewHit: 'יש לי אותך — מושיק עפיה',
      israeliArtist: 'מושיק עפיה',
      artist: 'Σωτήρης Βολάνης',
      artistHe: 'סotis וolanis',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 80,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Φεύγω ξανά μακριά σου' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Φεύγω ξανά μακριά σου' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Φεύγω ξανά μακριά σου' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Φεύγω ξανά μακριά σου' },
      ]}]
    },
    /* 118 — Θα με θυμηθείς */
    {
      id: 'tha-me-thimithis',
      title: 'Tha me Thimithis',
      titleGr: 'Θα με θυμηθείς',
      titleHe: 'את כבר לא איתי',
      hebrewHit: 'את כבר לא איתי — חיים משה',
      israeliArtist: 'חיים משה',
      artist: 'Γιάννης Πάριος',
      artistHe: 'ג\'annis פarios',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Dm',
      bpm: 68,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Θα με θυμηθείς κάποια στιγμή' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Θα με θυμηθείς κάποια στιγμή' },
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Θα με θυμηθείς κάποια στιγμή' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Θα με θυμηθείς κάποια στιγμή' },
      ]}]
    },
    /* 119 — Γειε μου */
    {
      id: 'gie-mou',
      title: 'Gie Mou',
      titleGr: 'Γειε μου',
      titleHe: 'רעיה',
      hebrewHit: 'רעיה — זוהר ארגוב',
      israeliArtist: 'זוהר ארגוב',
      artist: 'Σταμάτης Κόκοτας',
      artistHe: 'סtamatis קokotas',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 70,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Γειε μου γειε μου' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Γειε μου γειε μου' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Γειε μου γειε μου' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Γειε μου γειε μου' },
      ]}]
    },
    /* 120 — Έλενα */
    {
      id: 'eleni',
      title: 'Eleni',
      titleGr: 'Έλενα',
      titleHe: 'תני לי',
      hebrewHit: 'תני לי — חיים משה ולידור יוספי',
      israeliArtist: 'חיים משה',
      artist: 'Άννα Βίσση',
      artistHe: 'אנה בissi',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 74,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Έλενα Έλενα' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Έλενα Έλενα' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Έλενα Έλενα' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Έλενα Έλενα' },
      ]}]
    },
    /* 121 — חלום מתוק (עפיה & סרנגה) */
    {
      id: 'halom-metuk',
      title: 'Halom Metuk',
      titleGr: 'Γλυκό όνειρο',
      titleHe: 'חלום מתוק',
      hebrewHit: 'חלום מתוק — מושיק עפיה ושלומי סרנגה',
      israeliArtist: 'מושיק עפיה',
      artist: 'Λαϊκό / Koliphone',
      artistHe: 'שלומי סרנגה',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 96,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['D', null, 'Gm', null], lyrics: 'Γλυκό όνειρο γλυκό όνειρο' },
        { chords: ['A7', null, 'D', null], lyrics: 'Γλυκό όνειρο γλυκό όνειρο' },
        { chords: ['D', null, 'Gm', null], lyrics: 'Γλυκό όνειρο γλυκό όνειρο' },
        { chords: ['A7', null, 'D', null], lyrics: 'Γλυκό όνειρο γλυκό όνειρο' },
      ]}]
    },
    /* 122 — הקולות של פיראוס */
    {
      id: 'kolot-pireas',
      title: 'Kolot tou Pirea',
      titleGr: 'Τα κουδούνια του Πειραιά',
      titleHe: 'הקולות של פיראוס',
      hebrewHit: 'הקולות של פיראוס — חיים משה',
      israeliArtist: 'חיים משה',
      artist: 'Λαϊκό',
      artistHe: 'פיראוס',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 100,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['D', null, 'Gm', null], lyrics: 'Τα κουδούνια του Πειραιά' },
        { chords: ['A7', null, 'D', null], lyrics: 'Τα κουδούνια του Πειραιά' },
        { chords: ['D', null, 'Gm', null], lyrics: 'Τα κουδούνια του Πειραιά' },
        { chords: ['A7', null, 'D', null], lyrics: 'Τα κουδούνια του Πειραιά' },
      ]}]
    },
    /* 123 — Τα δαχτυλίδια (הטבעות) */
    {
      id: 'ta-daxtylidia',
      title: 'Ta Daxtylidia',
      titleGr: 'Τα δαχτυλίδια',
      titleHe: 'הטבעות',
      hebrewHit: 'הטבעות — גליקריה',
      israeliArtist: 'גליקריה',
      artist: 'Γλυκερία & Γιώργος Μητσάκης',
      artistHe: 'גליקריה וג\'ורγος Mitsakis',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 84,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Τα δαχτυλίδια σου φοράς' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Τα δαχτυλίδια σου φοράς' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Τα δαχτυλίδια σου φοράς' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Τα δαχτυλίδια σου φοράς' },
      ]}]
    },
    /* 124 — Αν είσαι ένα αστέρι */
    {
      id: 'an-eisai-ena-asteri',
      title: 'An Eisai Ena Asteri',
      titleGr: 'Αν είσαι ένα αστέρι',
      titleHe: 'אם אתה כוכב',
      artist: 'Νίκος Βέρτης',
      artistHe: 'ניקוס Vertis',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 78,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Αν είσαι ένα αστέρι' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Πέφτω στα πόδια σου' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Αν είσαι ένα αστέρι' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Πέφτω στα πόδια σου' },
      ]}]
    },
    /* 125 — Sigal (סיגל) — אריס סאן */
    {
      id: 'sigal',
      title: 'Sigal',
      titleGr: 'Sigal',
      titleHe: 'סיגל',
      hebrewHit: 'סיגל — אריס סאן',
      israeliArtist: 'אריס סאן',
      artist: 'Άρης Σαν',
      artistHe: 'אריס סאן',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 128,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['D', null, 'Gm', null], lyrics: 'Sigal Sigal Sigal' },
        { chords: ['A7', null, 'D', null], lyrics: 'Sigal Sigal Sigal' },
        { chords: ['D', null, 'Gm', null], lyrics: 'Sigal Sigal Sigal' },
        { chords: ['A7', null, 'D', null], lyrics: 'Sigal Sigal Sigal' },
      ]}]
    },
    /* 126 — Dam Dam (דאם דאם) — טריפונוס */
    {
      id: 'dam-dam',
      title: 'Dam Dam',
      titleGr: 'Dam Dam',
      titleHe: 'דאם דאם',
      hebrewHit: 'דאם דאם — טריפונוס',
      israeliArtist: 'טריפונוס',
      artist: 'Τρύφωνas Νικολαΐδης',
      artistHe: 'טריפונוס',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 130,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['D', null, 'Gm', null], lyrics: 'Dam dam dam dam' },
        { chords: ['A7', null, 'D', null], lyrics: 'Dam dam dam dam' },
        { chords: ['D', null, 'Gm', null], lyrics: 'Dam dam dam dam' },
        { chords: ['A7', null, 'D', null], lyrics: 'Dam dam dam dam' },
      ]}]
    },
    /* 127 — Dirlada (דרלה דירלאדה) */
    {
      id: 'dirlada',
      title: 'Dirlada',
      titleGr: 'Ντιρλαντάδα',
      titleHe: 'דרלה דירלאדה',
      hebrewHit: 'דרלה דירלאדה — קפטן פנטליס גיניס',
      artist: 'Καπετάν Παντελής Γκίνης',
      artistHe: 'קapetan Pantelis Ginis',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 125,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['D', null, 'Gm', null], lyrics: 'Ντιρλαντάδα ντιρλαντάδα' },
        { chords: ['A7', null, 'D', null], lyrics: 'Ντιρλαντάδα ντιρλαντάδα' },
        { chords: ['D', null, 'Gm', null], lyrics: 'Ντιρλαντάδα ντιρλαντάδα' },
        { chords: ['A7', null, 'D', null], lyrics: 'Ντιρλαντάδα ντιρλαντάδα' },
      ]}]
    },
    /* 128 — Ουίσκυ, τζιν κι βερμούτ */
    {
      id: 'ouiski-gin-vermouth',
      title: 'Ouiski Gin ke Vermouth',
      titleGr: 'Ουίσκυ, τζιν κι βερμούτ',
      titleHe: 'וויסקי, ג\'ין ופרומל',
      artist: 'Στέλιος Καζαντζίδης',
      artistHe: 'סטליוס קזנצידיס',
      dromos: 'Minore',
      tags: ['israeli-hit', 'kazantzidis', 'famous'],
      key: 'Dm',
      bpm: 88,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Ουίσκυ, τζιν κι βερμούτ' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Ουίσκυ, τζιν κι βερμούτ' },
        { chords: ['Dm', null, 'Gm', null], lyrics: 'Ουίσκυ, τζιν κι βερμούτ' },
        { chords: ['A7', null, 'Dm', null], lyrics: 'Ουίσκυ, τζιν κι βερμούτ' },
      ]}]
    },
    /* 129 — Φύγε φύγε (מגורשת מגורשת) */
    {
      id: 'fyge-fyge',
      title: 'Fyge Fyge',
      titleGr: 'Φύγε φύγε',
      titleHe: 'מגורשת מגורשת',
      artist: 'Τάσος Μπογάς',
      artistHe: 'טasos Bogas',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 82,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Φύγε φύγε μακριά μου' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Φύγε φύγε μακριά μου' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Φύγε φύγε μακριά μου' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Φύγε φύγε μακριά μου' },
      ]}]
    },
    /* 130 — Το τανγκό της Νεφέλης */
    {
      id: 'to-tango-tis-nefelis',
      title: 'To Tango tis Nefelis',
      titleGr: 'Το τανγκό της Νεφέλης',
      titleHe: 'הטנגו של נפלי',
      artist: 'Χάρις Αλεξίου',
      artistHe: 'חריס אלεξiou',
      dromos: 'Minore',
      tags: ['israeli-hit', 'famous'],
      key: 'Am',
      bpm: 72,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['Am', null, 'Dm', null], lyrics: 'Το τανγκό της Νεφέλης' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Το τανγκό της Νεφέλης' },
        { chords: ['Am', null, 'Dm', null], lyrics: 'Το τανγκό της Νεφέλης' },
        { chords: ['E7', null, 'Am', null], lyrics: 'Το τανγκό της Νεφέλης' },
      ]}]
    },
    /* 131 — Πιτσιρίκα (ילדה יפה) */
    {
      id: 'pitsirika',
      title: 'Pitsirika',
      titleGr: 'Πιτσιρίκα',
      titleHe: 'ילדה יפה',
      artist: 'Ματθαίος Γιαννούλης',
      artistHe: 'מתיוס Giannoulis',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 114,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['D', null, 'Gm', null], lyrics: 'Πιτσιρίκα μου γλυκιά' },
        { chords: ['A7', null, 'D', null], lyrics: 'Πιτσιρίκα μου γλυκιά' },
        { chords: ['D', null, 'Gm', null], lyrics: 'Πιτσιρίκα μου γλυκιά' },
        { chords: ['A7', null, 'D', null], lyrics: 'Πιτσιρίκα μου γλυκιά' },
      ]}]
    },
    /* 132 — Άστε να λέει (תנו לה לדבר) */
    {
      id: 'astin-na-leei',
      title: 'Astin Na Leei',
      titleGr: 'Άστε να λέει',
      titleHe: 'תנו לה לדבר',
      artist: 'Βασίλης Καρράς',
      artistHe: 'וasilis Karras',
      dromos: 'Hitzaz',
      tags: ['israeli-hit', 'famous'],
      key: 'D',
      bpm: 108,
      timeSignature: '4/4',
      difficulty: 2,
      sections: [{ name: 'Verse', lines: [
        { chords: ['D', null, 'Gm', null], lyrics: 'Άστε να λέει άστε να λέει' },
        { chords: ['A7', null, 'D', null], lyrics: 'Άστε να λέει άστε να λέει' },
        { chords: ['D', null, 'Gm', null], lyrics: 'Άστε να λέει άστε να λέει' },
        { chords: ['A7', null, 'D', null], lyrics: 'Άστε να λέει άστε να λέει' },
      ]}]
    },
  ];

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

  function playSong(song) {
    stopSong();
    if (!song || !song.sections) return;

    _currentSong = song;
    _playing = true;
    _currentBpm = song.bpm || 120;
    _currentStep = 0;

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

    /* מצב פשוט — אקורד אחד לכל beat */
    const allChords = [];
    song.sections.forEach(sec => {
      sec.lines.forEach(line => {
        (line.chords || []).forEach(ch => {
          if (ch) allChords.push(ch);
        });
      });
    });

    if (!allChords.length) return;

    const beatDur = 60 / _currentBpm;

    const sched = new AudioEngine.Scheduler(
      (step, time) => {
        const ch = allChords[step % allChords.length];
        if (ch && CHORDS[ch]) {
          AudioEngine.strumChord(CHORDS[ch].shape, 'd', time, 0.52);
        }
      },
      (step) => {
        _currentStep = step % allChords.length;
        _highlightCurrent();
      }
    );
    sched.stepDur = beatDur;
    sched.numSteps = allChords.length;
    sched.start();
    _scheduler = sched;

    if (typeof activeSchedulers !== 'undefined') {
      activeSchedulers.push(sched);
    }
  }

  function _highlightBouzoukiStep(evMap, step, strumCells) {
    _clearHighlights();
    const hit = evMap.get(step);
    if (hit && strumCells.length) {
      strumCells.forEach(el => el.classList.remove('lit'));
      const cell = document.querySelector(`#song-strum-strip .strum-cell[data-idx="${hit.idx}"]`);
      if (cell) {
        cell.classList.add('lit');
        cell.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
      }
      if (hit.ev.chord) {
        document.querySelectorAll('.song-chord').forEach(el => {
          el.classList.toggle('chord-active', el.dataset.chord === hit.ev.chord);
        });
      }
    }
  }

  function stopSong() {
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

  function _highlightCurrent() {
    _clearHighlights();
    const el = document.querySelector(`.song-chord[data-idx="${_currentStep}"]`);
    if (el) {
      el.classList.add('chord-active');
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function _clearHighlights() {
    document.querySelectorAll('.chord-active').forEach(e => e.classList.remove('chord-active'));
  }

  /* ===================== דיאגרמת אקורד מיני ===================== */

  function _chordDiagramSVG(chordName) {
    const data = CHORDS[chordName];
    if (!data) return '';
    const shape = data.shape;
    /* SVG מינימלי: 4 מיתרים, 4 סריגים */
    const w = 52, h = 68;
    const left = 10, top = 16, sw = 10, sh = 12;
    let svg = `<svg viewBox="0 0 ${w} ${h}" class="chord-mini-svg">`;
    svg += `<text x="${w / 2}" y="11" text-anchor="middle" fill="var(--gold)" font-size="9" font-family="Heebo,sans-serif">${chordName}</text>`;
    /* nut */
    svg += `<line x1="${left}" y1="${top}" x2="${left + 3 * sw}" y2="${top}" stroke="var(--text)" stroke-width="2.5"/>`;
    /* frets */
    for (let f = 1; f <= 4; f++) {
      const y = top + f * sh;
      svg += `<line x1="${left}" y1="${y}" x2="${left + 3 * sw}" y2="${y}" stroke="var(--text-dim)" stroke-width="0.5"/>`;
    }
    /* strings */
    for (let s = 0; s < 4; s++) {
      const x = left + s * sw;
      svg += `<line x1="${x}" y1="${top}" x2="${x}" y2="${top + 4 * sh}" stroke="var(--text-dim)" stroke-width="0.8"/>`;
    }
    /* dots - shape is [C,F,A,D] = courses 3,2,1,0 — display as strings left to right D,A,F,C */
    const displayOrder = [3, 2, 1, 0]; // D, A, F, C on strings left to right
    for (let s = 0; s < 4; s++) {
      const fret = shape[displayOrder[s]];
      const x = left + s * sw;
      if (fret === 'x') {
        svg += `<text x="${x}" y="${top - 3}" text-anchor="middle" fill="var(--accent-red)" font-size="8">x</text>`;
      } else if (fret === 0) {
        svg += `<circle cx="${x}" cy="${top - 4}" r="2.5" fill="none" stroke="var(--ok)" stroke-width="1"/>`;
      } else {
        const y = top + (fret - 0.5) * sh;
        svg += `<circle cx="${x}" cy="${y}" r="3.5" fill="var(--aegean)"/>`;
      }
    }
    svg += '</svg>';
    return svg;
  }

  /* ===================== UI — רינדור ===================== */

  function init() {
    const app = document.getElementById('songs-app');
    if (!app) return;

    app.innerHTML = `
      <div class="songs-layout">
        <div class="songs-sidebar" id="songs-list">
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
  }

  function _showSong(song) {
    const detail = document.getElementById('songs-detail');
    if (!detail) return;

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

    if (playBtn) playBtn.onclick = () => {
      playBtn.classList.add('playing');
      playSong(displaySong);
      _startAutoScroll();
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

    _bindBouzoukiPartEvents(detail, displaySong);
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
    } else if (bouzEmpty) {
      const tmp = document.createElement('div');
      tmp.innerHTML = bouzHtml;
      bouzEmpty.replaceWith(tmp.firstElementChild);
      _bindBouzoukiPartEvents(detail, song);
    }
  }

  function _renderSections(song) {
    let chordIdx = 0;
    return song.sections.map(sec => {
      const linesHtml = sec.lines.map(line => {
        const chordsHtml = (line.chords || []).map(ch => {
          const html = ch
            ? `<span class="song-chord" data-idx="${chordIdx}" data-chord="${ch}">${ch}</span>`
            : `<span class="song-chord-space" data-idx="${chordIdx}"></span>`;
          chordIdx++;
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

    detail.innerHTML = `
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
      detail.innerHTML = '<div class="songs-empty-state"><div class="songs-empty-icon">🎵</div><h2>ספריית שירים</h2></div>';
    };
  }

  /* ===================== סטיילינג ===================== */

  function _injectStyles() {
    if (document.getElementById('song-lib-styles')) return;
    const style = document.createElement('style');
    style.id = 'song-lib-styles';
    style.textContent = `
      /* ====== Song Library Layout ====== */
      .songs-layout {
        display: flex; gap: 0; height: 100%; min-height: 520px;
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
        flex: 1; overflow-y: auto; padding: 4px 8px;
      }
      .songs-entry {
        padding: 10px 12px; border-radius: 8px; cursor: pointer;
        border: 1px solid transparent; margin-bottom: 4px;
        transition: background 0.15s, border-color 0.15s;
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
      @media (max-width: 768px) {
        .songs-layout { flex-direction: column; }
        .songs-sidebar { width: 100%; max-width: none; max-height: 240px; border-left: none; border-bottom: 1px solid rgba(79,179,217,0.12); }
        .songs-main { padding: 14px; }
        .song-scroll-area { max-height: 50vh; }
      }
    `;
    document.head.appendChild(style);
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
    BUILTIN_SONGS,
  };

})();
