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

### Render.com — בלחיצה אחת (Blueprint + Docker)
הריפו כולל `render.yaml` ו-`Dockerfile` (כולל yt-dlp + ffmpeg מובנים).
1. [render.com](https://render.com) → **New → Blueprint** → חבר את הריפו → Render יזהה את `render.yaml`
2. אחרי היצירה: **Dashboard → Environment** → הוסף `LALAL_LICENSE_KEY` (הסוד שלך)
3. עדכן `ALLOW_ORIGIN` לכתובת האפליקציה (במקום `*`)
4. עדכן ב-`config.js`: `stemProxyUrl: 'https://<your-service>.onrender.com'`

> ⚠️ **Free tier**: השירות "נרדם" אחרי 15 דק׳ חוסר פעילות — הבקשה הראשונה איטית (~50 שניות).
> לשימוש קבוע שדרג ל-Starter, או השתמש ב-Railway.

### Railway / Fly.io (גם Docker)
שתיהן קוראות את ה-`Dockerfile` אוטומטית. הגדר את משתני הסביבה ב-Dashboard.

### VPS ידני
```bash
cd tools/stem-proxy && npm install
cp .env.example .env   # הכנס LALAL_LICENSE_KEY
# התקן yt-dlp: pip install yt-dlp
node server.js
```

לאחר הפריסה עדכן ב-`config.js`: `stemProxyUrl: 'https://your-proxy.onrender.com'`.

## אבטחה

- **לעולם אל תכניס את `.env` או מפתחות ל-git** (כבר ב-`.gitignore`).
- בפרודקשן הגדר `ALLOW_ORIGIN` לכתובת האפליקציה בלבד (לא `*`).
- מפתח LALAL נשאר בשרת בלבד — הדפדפן לעולם לא רואה אותו.
