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
- [x] `.well-known/assetlinks.json` — תבנית עם placeholders (למילוי אחרי יצירת keystore, ראו למטה)
- [x] `mobile/capacitor.config.json` — קונפיג Capacitor מוכן (appId/appName/צבעים)
- [x] `scripts/prepare-capacitor-www.js` (גם `npm run mobile:www`) — מעתיק את קבצי האתר ל-`mobile/www` (הרצה מאומתת: 75 קבצים, בלי `api/`/`tools/`/`penia-master`/סודות)

## Google Play — שלבים שנשארו אצלך (Android Studio + JDK נדרשים, לא זמינים בסביבה הזו)

1. התקן Java 17 JDK ו-Android Studio (ל-build ה-AAB בפועל).
2. הרץ (ניסיתי כאן — האשף אינטראקטיבי ומבקש להתקין JDK, לא ניתן להריץ ללא טרמינל אינטראקטיבי):
   ```
   npx @bubblewrap/cli init --manifest=https://bouzoukifret.vercel.app/manifest.json
   ```
3. פרמטרים מוכנים להזנה באשף (מבוססי `manifest.json` הנוכחי):
   - **Host**: `bouzoukifret.vercel.app`
   - **Package ID מוצע**: `app.vercel.bouzoukifret.twa` (Bubblewrap מציע ברירת מחדל דומה מה-host; אפשר לשנות — **בלתי הפיך אחרי פרסום ראשון בחנות**, כדאי להחליט מראש אם יש דומיין/מותג אחר שעדיף)
   - **App name**: בוזוקי אקדמי — Μπουζούκι
   - **Theme color / Background color**: `#0b1623`
   - **Icon URL**: `https://bouzoukifret.vercel.app/icons/icon-512.png`
   - **Maskable icon URL**: `https://bouzoukifret.vercel.app/icons/icon-512-maskable.png`
4. בסיום `bubblewrap init` יווצר keystore חתימה — קח את ה-**SHA256 fingerprint** שלו (`keytool -list -v -keystore <your.keystore>`) ואת ה-**package name** הסופי, ומלא אותם ב-`.well-known/assetlinks.json` (במקום ה-placeholders), ואז **פרסם מחדש** את האתר כדי שהקובץ יהיה זמין ב-`https://bouzoukifret.vercel.app/.well-known/assetlinks.json` — TWA לא יאומת בלי זה.
5. `bubblewrap build` מפיק את ה-AAB — מעלים אותו ל-Play Console.
6. במסך Play Console: למלא Data Safety Form (טבלה למעלה), להעלות `privacy.html` כקישור מדיניות פרטיות, ולצרף את "App Review notes" למעלה בשדה ההערות לבודק.

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
