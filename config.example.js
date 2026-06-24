/** העתק ל-config.js והזן מפתחות API (config.js ב-.gitignore) */
window.BOUZOUKI_CONFIG = {
  /** פרוקסי מקומי — הרץ: cd tools/stem-proxy && npm install && npm start
   *  YouTube: התקן yt-dlp (pip install yt-dlp / winget install yt-dlp)
   *  מובייל: פתחו את האפליקציה דרך IP המחשב (לא localhost), למשל http://192.168.1.5:8080
   *  הפרוקסי יתחבר אוטומטית לאותו IP — ודאו ש-stem-proxy רץ על המחשב */
  stemProxyUrl: 'http://localhost:3456',
  /** LALAL.AI — stem "strings" = מיתרים / בוזוקי */
  lalalLicenseKey: '',

  /** Moises Music AI — workflow 4 stems; "other" ≈ כלי נגינה */
  moisesApiKey: '',
};
