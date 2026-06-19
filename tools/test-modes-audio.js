#!/usr/bin/env node
/* בדיקת מיפוי דרומוסים → סריגים על מיתר D (קורס 0) */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dataJs = fs.readFileSync(path.join(__dirname, '../js/data.js'), 'utf8');
const ctx = { console, NOTE_NAMES: undefined, SOLFEGE: undefined, TUNING: undefined, DROMOI: undefined, NUM_FRETS: undefined };
vm.createContext(ctx);
vm.runInContext(dataJs + '\nthis.DROMOI=DROMOI;this.TUNING=TUNING;this.NOTE_NAMES=NOTE_NAMES;', ctx);

const { DROMOI, TUNING, NOTE_NAMES } = ctx;

function modeScaleFrets(intervals, rootPc, includeOctave = true) {
  const openPc = TUNING[0].midi % 12;
  const ivs = includeOctave ? [...intervals, 12] : [...intervals];
  return ivs.map(iv => ((rootPc - openPc + iv) % 12 + 12) % 12);
}

function fretToPc(fret) {
  return (TUNING[0].midi + fret) % 12;
}

let errors = 0;
const lines = [];

for (const d of DROMOI) {
  for (let rootPc = 0; rootPc < 12; rootPc++) {
    const expected = d.intervals.map(iv => (rootPc + iv) % 12);
    const frets = modeScaleFrets(d.intervals, rootPc, false);
    for (let i = 0; i < expected.length; i++) {
      const got = fretToPc(frets[i]);
      if (got !== expected[i]) {
        errors++;
        lines.push(
          `FAIL ${d.nameEn} root=${NOTE_NAMES[rootPc]} deg ${i}: ` +
          `expected ${NOTE_NAMES[expected[i]]}, got ${NOTE_NAMES[got]} (fret ${frets[i]})`
        );
      }
    }
  }
}

if (errors) {
  lines.forEach(l => console.error(l));
  console.error(`\n${errors} pitch errors in ${DROMOI.length} dromoi`);
  process.exit(1);
}

console.log(`OK: ${DROMOI.length} dromoi × 12 roots — all intervals map to correct pitch on D string`);
console.log('Sample Hitzaz D:', modeScaleFrets(DROMOI.find(x => x.id === 'hitzaz').intervals, 2).join(', '));
