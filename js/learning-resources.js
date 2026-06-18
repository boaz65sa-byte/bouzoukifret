/* ============================================================
   משאבי לימוד חיצוניים — בוזוקי 8 מיתרים
   נאסף ממקורות מקצועיים ברשת (דרומוסים, טכניקה, אקורדים)
   ============================================================ */
'use strict';

const LEARNING_RESOURCES = [
  {
    id: 'doctor-dark-roads',
    title: 'Rebetiko Roads — מפת דרומוסים',
    titleHe: 'מפת דרומוסים ברבטיקו',
    url: 'http://www.doctor-dark.co.uk/rebetiko/roads.html',
    category: 'dromoi',
    desc: 'מדריך מקיף לדרומוסים (Roads) ברבטיקו — חיג׳אז, מינורה, אוסאκ, סבאח ועוד. כולל הסבר על מבנה הסולמות והקשר לשירים.',
    level: 'בינוני',
  },
  {
    id: 'trigas-method',
    title: 'Trigas Bouzouki Method',
    titleHe: 'שיטת טריגאס — 178 תרגילים',
    url: 'https://www.trigas.gr/',
    category: 'technique',
    desc: 'שיטת לימוד מקצועית לבוזוקי: תרגילי פנייה, מקצבים, 24 שירים עם תווים. אחד המקורות המובילים ללימוד מסודר.',
    level: 'כל הרמות',
  },
  {
    id: 'karantinis-modes',
    title: 'Karantinis — Modes & Chords',
    titleHe: 'קרנטיניס — מודוסים ואקורדים',
    url: 'https://karantinis.com/downloads/modes-chords-impros/',
    category: 'modes',
    desc: 'PDF חינמי: 13 מודוסים יווניים, אקורדים מתאימים ודוגמאות אלתור — מעולה לחיבור בין דרומוס לליווי.',
    level: 'מתקדם',
  },
  {
    id: 'theodorou-technique',
    title: 'Dionysis Theodorou — Basic Technique',
    titleHe: 'דיוניסיס תאודורו — טכניקת בסיס',
    url: 'https://www.dionysistheodorou.com/basictechnique',
    category: 'technique',
    desc: 'פנייה מתחלפת (alternate picking), מיקום יד שמאל, ותרגילי חימום — הבסיס לנגינה נקייה על 8 מיתרים.',
    level: 'מתחיל',
  },
  {
    id: 'brackleforth-scales',
    title: 'Greek Bouzouki Scales Booklet',
    titleHe: 'חוברת סולמות יווניים (Brackleforth)',
    url: 'https://www.brackleforth.com/greek-bouzouki-scales/',
    category: 'dromoi',
    desc: '12 סולמות יווניים עם דיאגרמות על הצוואר ואקורדים מומלצים — מ complement טוב ללוח הסריגים באפליקציה.',
    level: 'בינוני',
  },
  {
    id: 'pagiatis-dromoi',
    title: 'Pagiatis — Laikoi Dromoi',
    titleHe: 'פגיאטיס — דרומוסים לאיקיים',
    url: 'https://en.wikipedia.org/wiki/Greek_tonos',
    category: 'theory',
    desc: 'ספר הייחוס הקלאסי לדרומוסים (τόνοι) במוזיקה היוונית. מומלץ לקרוא יחד עם מסך הדרומוסים באפליקציה.',
    level: 'תיאוריה',
  },
  {
    id: 'rebetiko-wiki',
    title: 'Rebetiko — Wikipedia',
    titleHe: 'רבטיקו — רקע היסטורי',
    url: 'https://en.wikipedia.org/wiki/Rebetiko',
    category: 'culture',
    desc: 'הקשר בין זεϊμπέκικο, חסאפיקו, מינורה ותרבות הנמל — עוזר להבין *למה* כל דרומוס נשמע כמו שהוא נשמע.',
    level: 'כל הרמות',
  },
  {
    id: 'zeibekiko-dance',
    title: 'Zeibekiko — dance & rhythm',
    titleHe: 'ζεϊμπέκικο — ריקוד ומקצב 9/4',
    url: 'https://en.wikipedia.org/wiki/Zeybek',
    category: 'rhythm',
    desc: 'מקור המקצב 9/4 והריקוד הבודד — חיוני ללימוד ליווי וטקסימי במינורה/חיג׳אזκיאר.',
    level: 'בינוני',
  },
];

const RESOURCE_CATEGORIES = {
  dromoi: 'דרומוסים',
  technique: 'טכניקה ופנייה',
  modes: 'מודוסים ואקורדים',
  rhythm: 'מקצבים',
  theory: 'תיאוריה',
  culture: 'הקשר תרבותי',
};
