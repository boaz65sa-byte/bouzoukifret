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

  /* ===================== בסיס נתונים — שירים ===================== */
  const BUILTIN_SONGS = [
    /* 1 */
    {
      id: 'misirlou',
      title: 'Misirlou',
      titleGr: 'Μισιρλού',
      titleHe: 'מיסירלו',
      artist: 'Μανόλης Χιώτης',
      artistHe: 'מאנוליס חיוטיס',
      dromos: 'Hitzaz',
      key: 'D',
      bpm: 120,
      timeSignature: '4/4',
      difficulty: 2,
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
      artist: 'Μίκης Θεοδωράκης',
      artistHe: 'מיקיס תיאודורakis',
      dromos: 'Hasapiko',
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

    /* יוצר רשימה שטוחה של כל האקורדים */
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

  function stopSong() {
    if (_scheduler) {
      _scheduler.stop();
      _scheduler = null;
    }
    _playing = false;
    _currentStep = 0;
    _clearHighlights();
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

  function _renderList(filter, search) {
    const container = document.getElementById('songs-entries');
    if (!container) return;
    let songs = getAllSongs();

    if (filter && filter !== 'all') {
      if (filter === 'custom') {
        songs = songs.filter(s => s.custom);
      } else if (filter === 'zeibekiko') {
        songs = songs.filter(s => _isZeibekikoSong(s));
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
        (s.artist || '').toLowerCase().includes(q) ||
        (s.artistHe || '').toLowerCase().includes(q)
      );
    }

    container.innerHTML = songs.map(s => {
      const hasRef = !!getSongReference(s);
      return `
      <div class="songs-entry" data-id="${s.id}">
        <div class="songs-entry-title">${hasRef ? '🎧 ' : ''}${s.titleGr || s.title}</div>
        <div class="songs-entry-sub">${s.artistHe || s.artist} &middot; ${s.dromos || ''} &middot; ${s.key}${_isZeibekikoSong(s) ? ' &middot; 9/4' : ''}</div>
        ${s.custom ? '<span class="songs-entry-badge">מותאם</span>' : ''}
        ${_isZeibekikoSong(s) ? '<span class="songs-entry-badge zeibekiko-badge">ζεϊμπέκικο</span>' : ''}
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
      if (_scheduler) _scheduler.stepDur = 60 / _currentBpm;
    };
    if (bpmUp) bpmUp.onclick = () => {
      displaySong = { ...displaySong, bpm: Math.min(240, displaySong.bpm + 5) };
      _currentBpm = displaySong.bpm;
      if (bpmVal) bpmVal.textContent = displaySong.bpm;
      if (_scheduler) _scheduler.stepDur = 60 / _currentBpm;
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
