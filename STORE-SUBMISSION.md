# הגשה לחנויות — בוזוקי אקדמי

מסמך עבודה להגשת האפליקציה ל-Google Play ו-Apple App Store. לא חלק מהאפליקציה עצמה — refeence בלבד לתהליך ההגשה.

> **חשוב**: כל הסעיפים כאן מתייחסים ל**גרסת החנות** (עם `StoreMode.isStoreBuild()` פעיל) — שבה מסך "למד מהשיר (YouTube)" מוסתר לגמרי, ולכן שרשרת ההורדה/פרוקסי-צד-שלישי **לא פעילה בכלל** בגרסה הזו. הטפסים למטה מתארים את מה שהאפליקציה **בפועל עושה בגרסת החנות** — לא את הסופרסט המלא של גרסת האתר (המתועד ב-`privacy.html`).

---

## Google Play — Data Safety Form (תשובות מוכנות)

| שאלה | תשובה |
|---|---|
| האם האפליקציה אוספת או משתפת נתוני משתמש? | לא (No data collected) |
| מיקרופון | נגיש (Audio), **לא נאסף/משותף** — מעובד על המכשיר בלבד, בזמן אמת, לצורך מכוון/זיהוי-צליל. מסומן "Data is processed ephemerally" / "not collected". |
| Personal info (שם/אימייל/טלפון) | לא נאסף כלל — אין חשבון/התחברות |
| App activity / App info & performance | לא נאסף (אין אנליטיקס/קריסות מדווחות לשרת חיצוני) |
| Files and docs | לא רלוונטי בגרסת החנות (תכונת שמירת אודיו מהורדה קיימת רק באתר) |
| מחיקת נתונים | לא רלוונטי — הכל local, מחיקת האפליקציה מוחקת הכל. אין מסלול "בקשת מחיקת נתונים" כי אין שרת ששומר כלום. |
| הצפנה בהעברה | כן (HTTPS לכל התוכן הסטטי; אין שליחת נתוני משתמש כלל) |
| קטגוריית תוכן | חינוך / מוזיקה |

## Apple — App Privacy (Nutrition Label, תשובות מוכנות)

| קטגוריה | תשובה |
|---|---|
| Data Used to Track You | None |
| Data Linked to You | None |
| Data Not Linked to You | None (אין אפילו אנונימי — אין שום נתון שיוצא מהמכשיר בגרסת החנות) |
| NSMicrophoneUsageDescription (טקסט ל-Info.plist) | עברית: `"האפליקציה משתמשת במיקרופון כדי לזהות את הצליל שאתם מנגנים או שרים בזמן אמת (מכוון, זיהוי אקורדים, תרגילי קצב) — הניתוח קורה כולו על המכשיר ואינו נשמר או נשלח."` <br> English: `"This app uses the microphone to analyze the sound you play or sing in real time (tuner, chord detection, rhythm drills) — all analysis happens on-device and nothing is recorded or transmitted."` |

## App Review notes (טקסט חופשי מומלץ להגשה — שני החנויות)

הצעת ניסוח להסבר לבודק/ת למה זו לא "עוד wrapper לאתר" (guideline 4.2 של אפל בפרט):

> This app provides real-time, on-device audio analysis (Web Audio synthesis, microphone-based pitch/chord detection), persistent local practice-progress tracking (IndexedDB), and full offline functionality after first launch. No account or login is required — all user data stays on-device. The web version of this app includes an additional YouTube-based song-download feature; that feature is intentionally disabled in this store build (see StoreMode gating in the source) since it is not compliant with store policy — it does not affect the app's core teaching/practice functionality.

---

## מה מוכן בקוד (נעשה בסביבה הזו, מאומת)

- [x] `js/store-mode.js` — זיהוי runtime (TWA/Capacitor), נטען מוקדם ב-`index.html`
- [x] מסך "למד מהשיר" (וכל מה שתלוי בו) מוסתר בגרסת חנות
- [x] מילות שירים מוסרות בגרסת חנות (אקורדים/שם/אמן/מבנה נשארים)
- [x] תוקן באג חוסן שיכל לעצור רישום Service Worker בפתיחה ראשונה אופליין
- [x] `privacy.html` — מדיניות פרטיות מלאה (סופרסט, כולל תיאור מה שונה בגרסת חנות)
- [x] `manifest.json` — אייקון maskable (SVG+PNG, אומת עם ניתוח פיקסלים שהתוכן נשאר בתוך אזור 80% הבטוח), `id`, `categories`
- [x] `.well-known/assetlinks.json` — **מולא בערכים אמיתיים ומאומת חי בפרודקשן** (package `app.vercel.bouzoukifret.twa`, fingerprint תואם לקיסטור החתימה בפועל — נבדק ב-2026-07-28 מול `https://bouzoukifret.vercel.app/.well-known/assetlinks.json`, זהה ל-100% לקובץ המקומי)
- [x] `mobile/capacitor.config.json` — קונפיג Capacitor מוכן (appId/appName/צבעים)
- [x] `scripts/prepare-capacitor-www.js` (גם `npm run mobile:www`) — מעתיק את קבצי האתר ל-`mobile/www` (הרצה מאומתת: 75 קבצים, בלי `api/`/`tools/`/`penia-master`/סודות)
- [x] **Bubblewrap build הושלם בפועל** (2026-07-19/20, על המכשיר של המשתמש) — `mobile/android/twa-manifest.json` הוא כעת פלט אמיתי של הכלי (`generatorApp: bubblewrap-cli`, לא ידני), `mobile/android/android.keystore` נוצר, וקיימים `app-release-bundle.aab` + `app-release-signed.apk` מוכנים להעלאה. כל הקבצים הרגישים (keystore, aab, apk) מוגנים ב-`.gitignore`.
- [x] **אייקון עוצב מחדש + rebuild חוזר** (2026-07-29) — אייקון בוזוקי מפורט/מקצועי (`icons/icon.svg`) הוחלף פנימה, ו-`bubblewrap build` רץ שוב עם `appVersionCode: 3` (עלה מ-2, כי גוגל דורשת קוד עולה בכל upload). ה-`app-release-bundle.aab`/`app-release-signed.apk` **הנוכחיים** כוללים בפועל את האייקון החדש (נארז בזמן ה-build לתוך כל צפיפויות ה-mipmap). תקלת "אין מספיק זיכרון" בזמן ה-build נפתרה ע"י הורדת `org.gradle.jvmargs` ל-`-Xmx1024m` ב-`mobile/android/gradle.properties` (לא ב-git, קובץ מקומי).
- [x] **Play Console — כל 10 הצהרות התוכן הושלמו** (2026-07-28, דרך אוטומציית דפדפן עם אישור המשתמש לפני כל שמירה): מדיניות פרטיות (קישור ל-`privacy.html`), מודעות (ללא), פרטי כניסה (ללא הגבלות גישה), סיווג תוכן IARC (קטגוריה "כל סוגי האפליקציות האחרים", שימוש עיקרי=חינוך → **PEGI 3 / USK 0 / IARC Generic 3+**, Everyone בכל האזורים), קהל יעד (כל הגילאים, לא הצטרפות ל-Teacher Approved), אבטחת נתונים (לא נאסף/לא משותף + תג התחייבות ל-Families Policy), אפליקציות ממשלתיות (לא), תכונות פיננסיות (לא), אפליקציות בתחום הבריאות (לא), מזהה פרסום Android 13 (לא בשימוש). כמו כן מולאו שם/תיאורים/קטגוריה (חינוך)/פרטי קשר בדף החנות הראשי.

## Google Play — מה נשאר לך (רק שני פריטים ידניים)

1. **העלאת נכסים גרפיים** — הכלי לא יכול לגשת לקבצים מקומיים מחוץ לתיקיית השיתוף שלו, אז צריך לגרור ידנית ב-Play Console → "דף האפליקציה בחנות" → "נכסים חזותיים נפוצים"/"נכסים חזותיים ייעודיים": האייקון (`store-assets/app-icon-1024.png` — הפוך ל-512×512 PNG אם צריך, `icons/icon-512.png` כבר בגודל הנכון), ה-Feature Graphic (`store-assets/play-store-feature-graphic.png`, 1024×500 — נבדק ויזואלית, העברית תקינה), וצילומי מסך אמיתיים (עדיין לא צולמו — פתחו את `bouzoukifret.vercel.app` בטלפון/DevTools בתצוגת מובייל וצלמו את 6 המסכים המפורטים ב-`STORE-LISTING.md`).
2. **העלאת ה-AAB המעודכן (versionCode 3) ומעבר מ-Internal Testing ל-Production** — יש כבר release ישן (versionCode 2, עם האייקון הקודם) שאושר במסלול הבדיקה הפנימית; צריך להעלות את `mobile/android/app-release-bundle.aab` **החדש** (versionCode 3, עם האייקון המעודכן) כדי שהוא יחליף אותו. אחרי שהגרפיקה מוכנה: לעבור למסלול "ייצור" (Production) ב-Play Console, לוודא שה-AAB הנכון מקושר, ולשלוח לבדיקה — כל שאר הטפסים (Data Safety, App content, Store listing) כבר מוכנים ולא ידרשו מילוי נוסף.

## Apple App Store — שלבים שנשארו אצלך (Mac + Xcode הכרחיים, לא זמינים בסביבה הזו בכלל)

1. `npm run mobile:www` (כבר ניתן להריץ, מעדכן את `mobile/www` בכל שינוי באתר).
2. בתוך `mobile/`: `npx cap add ios` (יוצר את פרויקט ה-Xcode; דורש macOS+Xcode+CocoaPods, לא זמין כאן).
3. פתח ב-Xcode: `npx cap open ios`.
4. הוסף ל-`ios/App/App/Info.plist` את `NSMicrophoneUsageDescription` עם הטקסט המוכן בטבלה למעלה.
5. ודא ב-Xcode Signing & Capabilities שיש Team (מהחשבון ב-Apple Developer) ו-Bundle Identifier תואם ל-`appId` ב-`capacitor.config.json` (`com.bouzoukifret.app` — ניתן לשנות לפני ההגשה הראשונה בלבד).
6. Archive → Distribute App → App Store Connect.
7. ב-App Store Connect: למלא App Privacy (טבלה למעלה), לצרף קישור ל-`privacy.html`, ולהדביק את "App Review notes" למעלה בשדה ההערות לבודק/ת.

## הערה חשובה — עדכונים עתידיים

כל עוד השינוי הוא בקוד האתר (js/css/html) ולא בפלאגין/הרשאה נייטיבית חדשה: TWA (אנדרואיד) מתעדכן **אוטומטית** כי הוא בסך הכל עוטף את האתר החי — אין צורך בהגשה מחדש לחנות. Capacitor (iOS) עוטף **עותק מקומי** — כל עדכון דורש `npm run mobile:www` מחדש + build+archive+הגשה חדשה ב-Xcode. זה הבדל מהותי בין שתי הפלטפורמות ששווה לזכור.
