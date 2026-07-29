# תוכן לרישום בחנויות — בוזוקי אקדמי

מסמך מרוכז: כל טקסט/נכס גרפי דרוש למילוי טופסי Google Play Console ו-App Store Connect. משלים את `STORE-SUBMISSION.md` (שם המידע הטכני/תאימות).

> **עדכון 2026-07-28**: האפליקציה עלתה ל-Play Console בפועל — `mobile/android/twa-manifest.json` עבר build אמיתי דרך `bubblewrap-cli` (AAB+APK חתומים קיימים ב-`mobile/android/`), `.well-known/assetlinks.json` אומת **חי** מול הפרודקשן (תואם בדיוק ל-fingerprint של keystore החתימה). בקונסולה: כל 10 הצהרות התוכן הושלמו (מדיניות פרטיות, מודעות, פרטי כניסה, סיווג תוכן IARC — יצא Everyone/PEGI 3/USK 0, קהל יעד כל הגילאים, אבטחת נתונים — "לא נאסף", אפליקציות ממשלתיות, תכונות פיננסיות, בריאות, מזהה פרסום), וכן שם/תיאור קצר/תיאור מלא/קטגוריה (חינוך)/פרטי קשר (אימייל+אתר) בדף החנות הראשי. **נשאר לך בלבד**: להעלות ידנית את 3 קבצי הגרפיקה (אייקון, feature graphic, screenshots — הכלי לא יכול לגשת לקבצים מקומיים מחוץ לתיקיית השיתוף של הדפדפן) ולצלם מסכים אמיתיים (עדיין לא הופקו — ראו הוראות למטה, זה קל ולוקח כמה דקות).

---

## נכסים גרפיים מוכנים

| קובץ | שימוש |
|---|---|
| `store-assets/app-icon-1024.png` | אייקון לאפל (App Store Connect דורש בדיוק 1024×1024, ריבוע מלא בלי שקיפות/פינות מעוגלות — כך נבנה). **עודכן 2026-07-29**: עוצב מחדש — בוזוקי אמיתי ומפורט (גוף אגס עם גרדיאנט, חור-קול עם רוזטה, גשר, צוואר עם סריגים ונקודות-סימון, ראש עם 8 מפתחות כיוונון) במקום העיגול המופשט הקודם. אומת פיקסל-לפיקסל: 0 שקיפות. |
| `icons/icon-512.png` (קיים) | אייקון לגוגל פליי — אותו עיצוב חדש, מיוצא מ-`icons/icon.svg` |
| `store-assets/play-store-feature-graphic.png` | Feature Graphic ל-Play Console (1024×500) — **הערת אזהרה**: יש בו טקסט בעברית שנבנה עם תיקון-כיוון ידני (אין לי ספריית bidi בסביבה), ולא הצלחתי לוודא ויזואלית שהוא מוצג נכון (אותה תקלת צילום-מסך). **תפתח את הקובץ בעצמך ותוודא שהטקסט העברי קריא ולא הפוך/מבולגן** לפני שמעלים אותו — אם משהו נראה לא תקין, תגיד לי ואני אבנה גרסה חלופית (למשל טקסט אנגלית בלבד, שהיא בטוחה לגמרי).

---

## Google Play — טופס הרישום

**שם האפליקציה** (עד 30 תווים): `בוזוקי אקדמי`

**תיאור קצר** (עד 80 תווים):
> למידת בוזוקי יווני: דרומוסים, תרגילים, מכוון ומאמן שמיעה

**תיאור מלא** (עד 4000 תווים):
> בוזוקי אקדמי הוא כלי לימוד אינטראקטיבי לבוזוקי יווני בן 8 המיתרים (טטראחורדו, כיוונון דו-פה-לה-רה), בעברית מלאה.
>
> 🎸 **תיאוריה בפרטבורד** — למעלה מ-15 דרומוסים (סולמות יווניים) ומקאמות מוצגים ישירות על גריף אינטראקטיבי, עם השמעה בזמן אמת (סינתזת קרפלוס-שטרונג — בלי קבצי אודיו, הכל מנוגן חי בדפדפן).
>
> 🎯 **תרגול מובנה** — למעלה מ-60 תרגילים ב-12 קטגוריות (יסודות, טריולים, טרמולו, זייבקיקו ועוד), משחקי דרומוס (Master Modes), משחק אקורדים עם זיהוי מיקרופון, ומקצבים יווניים אותנטיים (זייבקיקו 9/4, חסאפיקו, קלמטיאנו 7/8).
>
> 🎤 **מאמן שמיעה** — המיקרופון מזהה את מה שאתם מנגנים או שרים, בזמן אמת, ומשווה לתו היעד — כל הניתוח על המכשיר, בלי להעלות אודיו לשום שרת.
>
> 🎼 **כלי וכיוונון** — כלי כיוון עם צלילי-ייחוס אמיתיים, מפת תווים על הגריף, ותרשים הכלי.
>
> 📊 **מעקב התקדמות** — גרף פעילות, רצף ימים, ונקודות ניסיון — הכל נשמר מקומית על המכשיר שלכם.
>
> ללא חשבון, ללא פרסומות, ללא מעקב. כל הנתונים נשארים על המכשיר.

**קטגוריה**: חינוך (Education) — או מוזיקה וקול (Music & Audio), לבחור אחת (Play מאפשר קטגוריה ראשית אחת + תגית משנית)

**תגים/מילות חיפוש רלוונטיות** (לא שדה נפרד ב-Play, אבל שווה לשלב בטקסט): בוזוקי, יווני, רבטיקו, לאיקו, דרומוס, מקאם, זייבקיקו

**Screenshots** — Google דורש **לפחות 2** (מומלץ 4-8) בפורמט טלפון. הצילומים הכי מומלצים לצלם (מסך → מה להראות):
1. מסך הבית ("הכלי והכיוונון") — הכלי + הכיוונון
2. מסך "דרומוסים" — הפרטבורד האינטראקטיבי עם דרומוס נבחר
3. מסך "ספריית שירים" — רשימת שירים + דיאגרמת אקורד
4. מסך "תרגילים" — TAB עם תווים
5. מסך "מאמן מאזין" או "הכלי והכיוונון" (מיקרופון) — מציג את פיצ'ר הזיהוי
6. מסך "התקדמות" — הגרף/הרצף

**איך לצלם בקלות**: פתחו את `bouzoukifret.vercel.app` בכרום על הטלפון שלכם (או במחשב עם DevTools במצב תצוגת-מובייל, Ctrl+Shift+M), נווטו לכל מסך, וצלמו מסך רגיל (Volume Down + Power באנדרואיד).

---

## Apple App Store — טופס הרישום

**App Name** (עד 30 תווים): `Bouzouki Academy`

**Subtitle** (עד 30 תווים): `Learn Greek Bouzouki`

**Description** (עד 4000 תווים):
> Bouzouki Academy is an interactive learning app for the 8-string Greek bouzouki (tetrachordo, C-F-A-D tuning), with a full Hebrew interface.
>
> 🎸 **Fretboard theory** — 15+ dromoi (Greek modal scales) and maqamat shown directly on an interactive fretboard, played in real time (Karplus-Strong string synthesis — no audio files, everything is synthesized live).
>
> 🎯 **Structured practice** — 60+ exercises across 12 categories (fundamentals, triplets, tremolo, zeibekiko, and more), scale-learning games, a chord game with microphone detection, and authentic Greek rhythms (zeibekiko 9/4, hasapiko, kalamatianos 7/8).
>
> 🎤 **Listening coach** — the microphone detects what you play or sing in real time and compares it to the target note — all analysis happens on-device, nothing is uploaded.
>
> 🎼 **Tuner** — real reference tones, a note map on the fretboard, and an instrument diagram.
>
> 📊 **Progress tracking** — activity graph, daily streak, and XP — all stored locally on your device.
>
> No account required, no ads, no tracking. All data stays on your device.

**Keywords** (עד 100 תווים, מופרד בפסיקים, בלי רווחים מיותרים — אפל לא אוהב חזרה על מילים מה-title/subtitle):
```
greek music,dromoi,rebetiko,laiko,maqam,fretboard,music lesson,tuner,greek instrument,ear training
```

**Promotional Text** (עד 170 תווים, אפשר לעדכן בלי הגשה חדשה):
> Learn dromoi scales, practice with real-time feedback from your microphone, and track your progress — all in Hebrew, all on-device.

**Support URL**: `https://github.com/boaz65sa-byte/bouzoukifret` (או כתובת אחרת אם יש לך אתר תמיכה)

**Marketing URL** (אופציונלי): `https://bouzoukifret.vercel.app`

**Screenshots** — אפל דורש גדלים ספציפיים לפי מכשיר (לפחות iPhone 6.7" — 1290×2796 פיקסלים). אותם 6 מסכים שהוצעו למעלה לגוגל פליי מתאימים גם כאן, פשוט בגודל/יחס אחר. אם תצלם קודם ב-DevTools עם רזולוציה מתאימה (או ישירות מ-iPhone כשיהיה לך גישה למק לבדיקה), זה יעבוד.

---

## שדות חסרים שאתה צריך למלא בעצמך

- [x] **כתובת אימייל ליצירת קשר** — הוגדר `boaz65sa@gmail.com` בפועל בטופס "פרטים ליצירת קשר" ב-Play Console (הגדרות החנות) ובשאלון סיווג התוכן.
- [x] **צילומי מסך אמיתיים** — הופקו ב-`store-assets/screenshots/` (480×960, דרך Chrome headless מקומי + ניווט בין המסכים בפועל): `01-home.png` (הכלים), `02-dromoi.png` (דרומוסים), `03-songs.png` (ספריית שירים), `04-exercises.png` (תרגילים), `05-listen.png` (מאמן מאזין), `06-progress.png` (התקדמות). **הערה על 06-progress.png**: זו סשן טרי בלי היסטוריית שימוש, אז כל המספרים (פעילות/XP/רצף) מוצגים כ-0 — נראה תקין מבנית אבל לא "מרשים" שיווקית. אם יש למשתמש נתוני שימוש אמיתיים במכשיר שלו, כדאי לצלם גרסה עם נתונים; אחרת אפשר להשתמש כמו שהוא (5 המסכים האחרים תקינים לגמרי).
- [x] **בדיקה ויזואלית** של `play-store-feature-graphic.png` — נבדק ישירות (הצגת התמונה): הטקסט העברי תקין וקריא, לא הפוך ולא מבולגן.
- [x] **דירוג תוכן (Content Rating)** — מולא בפועל דרך שאלון ה-IARC ב-Play Console (2026-07-28): קטגוריה "כל סוגי האפליקציות האחרים", שימוש עיקרי = חינוך, כל שאר השאלות "לא". תוצאה: PEGI 3, USK 0 (כל הגילאים), IARC Generic 3+ — Everyone בכל האזורים, כצפוי.
- [ ] **העלאת קבצי גרפיקה ל-Play Console** — כל הקבצים מוכנים (`store-assets/app-icon-1024.png`/`icons/icon-512.png`, `store-assets/play-store-feature-graphic.png`, `store-assets/screenshots/*.png`), אבל צריך גרירה **ידנית** לדף "דף האפליקציה בחנות" ← "נכסים חזותיים נפוצים"/"נכסים חזותיים ייעודיים" — כלי האוטומציה של הדפדפן לא יכול לגשת לקבצים מקומיים מחוץ לתיקיית השיתוף שלו (זו הסיבה שהצילומים הופקו דרך Chrome headless מקומי במקום דרך אוטומציית הדפדפן).
- [ ] **העברת הגרסה מ-Internal Testing ל-Production** — יש כבר release שנוצר ואושר במסלול הבדיקה הפנימית ("בדיקה פנימית: 2/3 הושלמו", חסר רק בחירת בודקים). אחרי שהגרפיקה מועלית, יש לעבור למסלול "ייצור" (Production), להעלות/לאשר את ה-AAB (`mobile/android/app-release-bundle.aab`) ולשלוח לבדיקה.
