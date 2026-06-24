'use strict';
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'js', 'songs.js');
const lines = fs.readFileSync(src, 'utf8').split(/\r?\n/);
const head = lines.slice(0, 21); // through CHORD_RE line
const wire = [
  '',
  '  const { songRef, normalizeReference, SONG_YT_REFERENCES } = window.SongRefData || {',
  '    songRef: () => null, normalizeReference: () => null, SONG_YT_REFERENCES: {},',
  '  };',
  '  const BUILTIN_SONGS = window.SONG_CATALOG || [];',
  '',
  '  function getSongReference(song) {',
  '    return normalizeReference(song.reference) || SONG_YT_REFERENCES[song.id] || null;',
  '  }',
];
const mid = lines.slice(180, 577); // from getSongReference area - wait, 180 is after SONG_REFERENCES, includes getSongReference at 181
// lines 180-184 are getSongReference - we have it in wire now
// skip 181-183 old getSongReference (lines index 180-182)
const midStart = 184; // _renderReference
const tail = lines.slice(4977); // from transpose section - but we need everything from _renderReference to before BUILTIN_SONGS end
// Actually: keep 184-577 (before BUILTIN_SONGS) and 4978-end (after array)
const part1 = lines.slice(184, 577);
const part2 = lines.slice(4978);
const out = [...head, ...wire, ...part1, ...part2].join('\n');
fs.writeFileSync(src, out);
console.log('songs.js lines:', out.split('\n').length);
