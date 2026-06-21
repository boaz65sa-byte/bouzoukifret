# Stem Proxy — שרת הפרדת בוזוקי

שרת relay קטן שמסתיר את מפתח LALAL.ai מהדפדפן ומאפשר הורדת אודיו מ-YouTube.
האפליקציה (`js/stem-api.js`) פונה אליו דרך `stemProxyUrl` ב-`config.js`.

## מה הוא עושה

| נתיב | תיאור |
|------|-------|
| `GET /health` | בדיקת זמינות + אם מפתח LALAL מוגדר |
| `POST /api/separate` | מקבל קובץ אודיו, מבודד את המיתרים/בוזוקי דרך LALAL.ai, מחזיר MP3 |
| `GET /api/youtube-audio?id=VIDEO_ID` | מוריד אודיו מיוטיוב עם yt-dlp |

## דרישות

- **Node.js 18+** (ל-`--env-file` עדיף 20+; אחרת השתמש ב-`npm run start:noenv` עם משתני סביבה)
- **מפתח LALAL.ai** — הירשם ב-[lalal.ai](https://www.lalal.ai), קנה חבילה, העתק את ה-License Key
- **yt-dlp** (רק לפיצ׳ר YouTube) — `pip install yt-dlp` או `winget install yt-dlp`

## התקנה והרצה (מקומי)

```bash
cd tools/stem-proxy
npm install
cp .env.example .env
# ערוך .env והכנס את LALAL_LICENSE_KEY
npm start
```

השרת יעלה על `http://localhost:3456`. ודא שב-`config.js` של האפליקציה:

```js
window.BOUZOUKI_CONFIG = {
  stemProxyUrl: 'http://localhost:3456',
};
```

## פריסה לענן (מומלץ לשימוש קבוע)

⚠️ **Vercel / Netlify לא מתאימים** — הפרדת stems לוקחת 1-3 דקות (חורג מ-timeout של serverless),
ו-yt-dlp דורש בינארי. השתמש בפלטפורמה שמריצה שרת Node מתמשך:

### Render.com (הכי פשוט)
1. צור Web Service חדש, חבר את הריפו, root = `tools/stem-proxy`
2. Build: `npm install` · Start: `node server.js`
3. Environment → הוסף `LALAL_LICENSE_KEY` ו-`ALLOW_ORIGIN` (כתובת האפליקציה)
4. ל-yt-dlp: הוסף build command `pip install yt-dlp` (Render תומך ב-Python)

### Railway / Fly.io / VPS
זהה — `npm install && node server.js`, הגדר את משתני הסביבה, התקן yt-dlp.

לאחר הפריסה עדכן ב-`config.js`: `stemProxyUrl: 'https://your-proxy.onrender.com'`.

## אבטחה

- **לעולם אל תכניס את `.env` או מפתחות ל-git** (כבר ב-`.gitignore`).
- בפרודקשן הגדר `ALLOW_ORIGIN` לכתובת האפליקציה בלבד (לא `*`).
- מפתח LALAL נשאר בשרת בלבד — הדפדפן לעולם לא רואה אותו.
