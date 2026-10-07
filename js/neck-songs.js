/* ============================================================
   שירים לנגן על הצוואר — פורמט הנתונים
   ------------------------------------------------------------
   כל שיר הוא אובייקט פשוט. כדי להוסיף שיר, מעתיקים בלוק וממלאים
   תווים. אין צורך לגעת במסך עצמו.

   song = {
     id:         מזהה קצר באנגלית
     titleHe:    שם בעברית (הכותרת הגדולה)
     titleGr:    שם ביוונית
     subtitle:   שורה משנית — מלחין / "מסורתי" / "עיבוד לימודי"
     dromos:     שם הדרומוס בעברית (חיג׳אז, מינורה…)
     meter:      משקל, למשל '4/4' או '9/4'
     bpm:        קצב התחלתי (40–200)
     rhythmId:   מזהה מ-RHYTHMS: hasapiko | zeibekiko | tsifteteli | syrtos | karsilamas
     sections:   [{ id, nameHe, startMeasure }]
                 startMeasure מתחיל ב-1. הקטע נמשך עד תחילת הקטע הבא.
     notes:      מערך תווים לפי הסדר
   }

   note = {
     string:   0–3   קורס. 0 = רה (גבוה), 1 = לה, 2 = פה, 3 = דו (נמוך)
                      אותו סדר כמו TUNING בכיוונון C–F–A–D
     fret:     0–15  סריג. 0 = מיתר פתוח
     finger:   0–4   אצבע שמאל. 0 = פתוח, 1 אצבע, 2 אמה, 3 קמיצה, 4 זרת
     duration: מספר  משך בפעימות רבע. 0.5 שמינית, 1 רבע, 2 חצי, 4 שלמה
     pick:     'd' | 'u'
               d = רישה יורדת (▼), u = רישה עולה (∧)
   }

   שתיקה: { rest: true, duration }  — בלי שאר השדות.

   סכום ה-duration בכל שיר חייב להתחלק במשקל
   (4 ב-4/4, 9 ב-9/4) כדי שהתיבות ייסגרו.
   ============================================================ */
'use strict';

(function (root) {
  function n(string, fret, finger, duration, pick) {
    return { string, fret, finger, duration, pick };
  }
  function rest(duration) {
    return { rest: true, duration };
  }

  const NECK_SONGS = [
    {
      id: 'misirlou',
      titleHe: 'מיסירלו',
      titleGr: 'Μισιρλού',
      subtitle: 'עיבוד לימודי · מסורתי',
      dromos: 'חיג׳אז',
      meter: '4/4',
      bpm: 96,
      rhythmId: 'hasapiko',
      sections: [
        { id: 'open', nameHe: 'פתיחה', startMeasure: 1 },
        { id: 'hook', nameHe: 'פזמון', startMeasure: 5 },
      ],
      /* מנגינת לימוד בפוזיציה הראשונה: פתוח, אצבע 1 על סריג 1,
         אצבע 3 על הסריג הרביעי (המרווח של החיג׳אז), אצבע 4 על החמישי. */
      notes: [
        n(0, 0, 0, 0.5, 'd'), n(0, 1, 1, 0.5, 'u'), n(0, 4, 3, 1, 'd'), n(0, 5, 4, 1, 'd'), n(1, 0, 0, 1, 'd'),
        n(1, 1, 1, 1, 'd'), n(1, 0, 0, 1, 'd'), n(0, 5, 4, 1, 'd'), n(0, 4, 3, 1, 'd'),
        n(0, 1, 1, 1, 'd'), n(0, 0, 0, 1, 'd'), n(0, 1, 1, 0.5, 'd'), n(0, 0, 0, 0.5, 'u'), n(0, 1, 1, 1, 'd'),
        n(0, 4, 3, 1, 'd'), n(0, 5, 4, 1, 'd'), n(1, 0, 0, 2, 'd'),
        n(1, 0, 0, 0.5, 'd'), n(1, 1, 1, 0.5, 'u'), n(1, 0, 0, 0.5, 'd'), n(0, 5, 4, 0.5, 'u'), n(0, 4, 3, 1, 'd'), n(0, 1, 1, 1, 'd'),
        n(0, 0, 0, 1, 'd'), n(0, 5, 4, 1, 'd'), n(0, 4, 3, 1, 'd'), n(0, 1, 1, 1, 'd'),
        n(0, 0, 0, 0.5, 'd'), n(0, 1, 1, 0.5, 'u'), n(0, 4, 3, 0.5, 'd'), n(0, 5, 4, 0.5, 'u'),
        n(1, 0, 0, 0.5, 'd'), n(1, 1, 1, 0.5, 'u'), n(1, 3, 3, 0.5, 'd'), n(1, 4, 4, 0.5, 'u'),
        n(1, 5, 4, 2, 'd'), n(0, 0, 0, 2, 'd'),
      ],
    },
    {
      id: 'zeibekiko-minore',
      titleHe: 'זאימבקיקו במינורה',
      titleGr: 'Ζεϊμπέκικο μινόρε',
      subtitle: 'תרגיל אטי · מהאקדמיה',
      dromos: 'מינורה',
      meter: '9/4',
      bpm: 66,
      rhythmId: 'zeibekiko',
      sections: [
        { id: 'taximi', nameHe: 'טקסימי', startMeasure: 1 },
        { id: 'answer', nameHe: 'מענה', startMeasure: 3 },
      ],
      /* מלודיה דלילה על מינורה: הרבה אוויר, כמו בתרגילי הזאימבקיקו של האקדמיה.
         לה פתוח במקום סריג 7 — אצבוע נוח למתחילים. */
      notes: [
        n(0, 0, 0, 2, 'd'), rest(1), n(0, 3, 2, 2, 'd'), n(0, 5, 4, 2, 'd'), n(1, 0, 0, 2, 'd'),
        n(1, 0, 0, 2, 'd'), n(0, 5, 4, 2, 'd'), n(0, 3, 2, 1, 'd'), n(0, 2, 1, 1, 'u'), n(0, 0, 0, 3, 'd'),
        n(0, 0, 0, 1, 'd'), n(0, 2, 1, 1, 'd'), n(0, 3, 2, 1, 'd'), n(0, 5, 4, 2, 'd'), n(1, 0, 0, 2, 'd'), n(1, 1, 1, 2, 'd'),
        n(1, 0, 0, 2, 'd'), n(0, 5, 4, 1, 'd'), n(0, 3, 2, 1, 'u'), n(0, 2, 1, 1, 'd'), n(0, 0, 0, 4, 'd'),
      ],
    },
    {
      id: 'syrtos-nisiotiko',
      titleHe: 'סירטוס ניסיוטי',
      titleGr: 'Συρτός νησιώτικος',
      subtitle: 'מסורתי · איים',
      dromos: 'ניסיוטיקו',
      meter: '4/4',
      bpm: 108,
      rhythmId: 'syrtos',
      sections: [
        { id: 'verse', nameHe: 'בית', startMeasure: 1 },
        { id: 'close', nameHe: 'סיום', startMeasure: 5 },
      ],
      notes: [
        n(0, 0, 0, 1, 'd'), n(0, 2, 1, 1, 'd'), n(0, 3, 2, 1, 'd'), n(0, 5, 4, 1, 'd'),
        n(1, 0, 0, 1, 'd'), n(0, 5, 4, 1, 'd'), n(0, 3, 2, 1, 'd'), n(0, 2, 1, 1, 'd'),
        n(0, 0, 0, 1, 'd'), n(0, 3, 2, 1, 'd'), n(1, 0, 0, 2, 'd'),
        n(0, 5, 4, 1, 'd'), n(0, 3, 2, 1, 'd'), n(0, 2, 1, 1, 'd'), n(0, 0, 0, 1, 'd'),
        n(1, 0, 0, 0.5, 'd'), n(1, 1, 1, 0.5, 'u'), n(1, 0, 0, 0.5, 'd'), n(0, 5, 4, 0.5, 'u'), n(0, 3, 2, 1, 'd'), n(0, 2, 1, 1, 'd'),
        n(0, 0, 0, 1, 'd'), n(0, 2, 1, 1, 'd'), n(0, 3, 2, 1, 'd'), n(0, 5, 4, 1, 'd'),
        n(1, 0, 0, 1, 'd'), n(1, 1, 1, 1, 'd'), n(1, 0, 0, 1, 'd'), n(0, 5, 4, 1, 'd'),
        n(0, 3, 2, 1, 'd'), n(0, 2, 1, 1, 'd'), n(0, 0, 0, 2, 'd'),
      ],
    },
  ];

  function meterBeats(meter) {
    const parts = String(meter || '4/4').split('/');
    const num = +parts[0] || 4;
    const den = +parts[1] || 4;
    return num * (4 / den);
  }

  /** בדיקות מבנה — מחזיר מערך הודעות. ריק = תקין. */
  function neckSongIssues(songs) {
    const list = songs || NECK_SONGS;
    const issues = [];
    list.forEach((song) => {
      if (!song.id || !song.notes || !song.notes.length) {
        issues.push(song.id + ': אין תווים');
        return;
      }
      const beats = meterBeats(song.meter);
      let sum = 0;
      song.notes.forEach((note, i) => {
        const where = song.id + ' תו ' + (i + 1);
        if (!(note.duration > 0)) issues.push(where + ': duration חסר');
        sum += note.duration || 0;
        if (note.rest) return;
        if (note.string < 0 || note.string > 3) issues.push(where + ': string לא 0–3');
        if (note.fret < 0 || note.fret > 15) issues.push(where + ': fret לא 0–15');
        if (note.finger < 0 || note.finger > 4) issues.push(where + ': finger לא 0–4');
        if (note.pick !== 'd' && note.pick !== 'u') issues.push(where + ': pick חייב להיות d או u');
      });
      const measures = sum / beats;
      if (Math.abs(measures - Math.round(measures)) > 0.001) {
        issues.push(song.id + ': סכום המשכים ' + sum + ' לא נסגר למשקל ' + song.meter);
      }
      const count = Math.round(measures);
      (song.sections || []).forEach((section, idx) => {
        if (section.startMeasure < 1 || section.startMeasure > count) {
          issues.push(song.id + ': קטע ' + section.id + ' מחוץ לתיבות');
        }
        if (idx === 0 && section.startMeasure !== 1) issues.push(song.id + ': הקטע הראשון חייב להתחיל בתיבה 1');
      });
    });
    return issues;
  }

  root.NECK_SONGS = NECK_SONGS;
  root.neckSongIssues = neckSongIssues;
})(typeof window !== 'undefined' ? window : globalThis);
