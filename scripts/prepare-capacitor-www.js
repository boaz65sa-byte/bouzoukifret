'use strict';
/* מעתיק את קבצי האתר הסטטיים ל-mobile/www — העתקה בלבד, בלי טרנספורמציה.
   הגייטינג בין אתר/חנות הוא runtime (StoreMode.isStoreBuild), אז אין צורך
   ב-build נפרד לגרסת ה-app — אותם קבצים בדיוק. */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const DEST = path.join(ROOT, 'mobile', 'www');

// קבצים/תיקיות שלא נכנסים לאפליקציית המובייל (שרת-בלבד, כלי-פיתוח, פרויקט-משנה נפרד)
const EXCLUDE = new Set([
  'api', 'tools', '.github', '.git', '.claude', 'mobile', 'node_modules',
  'penia-master', 'scripts', '.well-known', // assetlinks.json רלוונטי רק לאימות ה-domain, לא לתוך ה-APK
  'config.js', // סודות מקומיים — אם קיים, לא מועתק (config.example.js כן מועתק)
  '.gitignore', 'package.json', 'package-lock.json', 'render.yaml', 'vercel.json',
  'README.md', 'APP-OVERVIEW.md', 'APP-OVERVIEW-EN.md', 'STORE-SUBMISSION.md', 'PROGRESS.md',
  'learn-downloads', 'screenshots', 'start-download.bat',
]);

function copyRecursive(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    if (srcDir === ROOT && EXCLUDE.has(entry.name)) continue;
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (fs.existsSync(DEST)) {
  fs.rmSync(DEST, { recursive: true, force: true });
}
copyRecursive(ROOT, DEST);

let fileCount = 0;
(function count(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count(path.join(dir, entry.name));
    else fileCount++;
  }
})(DEST);

console.log(`[prepare-capacitor-www] copied ${fileCount} files to mobile/www`);
