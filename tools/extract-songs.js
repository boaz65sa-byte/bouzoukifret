'use strict';
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const src = path.join(root, 'js', 'songs.js');
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const outDir = path.join(root, 'js', 'songs');
fs.mkdirSync(outDir, { recursive: true });

const refHeader = `'use strict';\nwindow.SongRefData = (() => {\n`;
const refFooter = `\n  return { songRef, normalizeReference, SONG_YT_REFERENCES };\n})();\n`;
const refBody = lines.slice(21, 179).join('\n').replace('const SONG_REFERENCES', 'const SONG_YT_REFERENCES');
fs.writeFileSync(path.join(outDir, 'song-references.js'), refHeader + refBody + refFooter);

const catalog = `'use strict';\nwindow.SONG_CATALOG = ${lines.slice(578, 4977).join('\n').replace('const BUILTIN_SONGS = ', '')};\n`;
fs.writeFileSync(path.join(outDir, 'song-catalog.js'), catalog);
console.log('Done:', outDir);
