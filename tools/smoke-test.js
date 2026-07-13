#!/usr/bin/env node
/**
 * smoke-test.js — zero-dependency structural smoke test for the Bouzouki Academy app.
 *
 * Plain Node only (fs, path, child_process). No npm, no build step, no headless
 * browser. Run with:  node tools/smoke-test.js
 *
 * Checks:
 *   1. Every <script src="..."> tag in index.html points at a file that exists.
 *   2. Every .js file under js/ (plus any other local JS referenced by index.html)
 *      parses cleanly (`node --check`).
 *   3. Every nav button's data-screen="X" has a matching <section id="screen-X">
 *      (orphan sections with no nav button are a warning, not a failure).
 *   4. (best-effort) Every module referenced inside stopAllPlayback() in js/app.js
 *      is actually defined as a top-level `const Name = (...` somewhere in js/*.js
 *      (warning only).
 *
 * Exit code 0 + PASS summary if everything checks out, exit code 1 with clear
 * failure messages otherwise.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const INDEX_HTML = path.join(ROOT, 'index.html');

const failures = [];
const warnings = [];
let checksRun = 0;

function fail(msg) {
  failures.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

// ---------------------------------------------------------------------------
// Check 1 + setup: parse index.html for <script src="..."> tags
// ---------------------------------------------------------------------------

if (!fs.existsSync(INDEX_HTML)) {
  console.error('FAIL: index.html not found at ' + INDEX_HTML);
  process.exit(1);
}

const html = readFile(INDEX_HTML);
const htmlLines = html.split('\n');

function lineOf(index) {
  // index: character offset into `html`. Returns 1-based line number.
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (html[i] === '\n') line++;
  }
  return line;
}

checksRun++;
console.log('[1/4] Checking <script src="..."> tags resolve to real files...');

const scriptTagRe = /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi;
const localScriptFiles = []; // relative paths (as referenced), for check #2
let scriptTagCount = 0;
let m;
while ((m = scriptTagRe.exec(html)) !== null) {
  const src = m[1];
  scriptTagCount++;
  // Skip absolute URLs (http/https) or protocol-relative — nothing to check on disk.
  if (/^(https?:)?\/\//i.test(src)) continue;

  const tagText = m[0];
  const hasOnErrorFallback = /\bonerror\s*=/i.test(tagText);
  const resolved = path.join(ROOT, src.split('?')[0].split('#')[0]);
  const exists = fs.existsSync(resolved);
  const ln = lineOf(m.index);

  if (!exists) {
    if (hasOnErrorFallback) {
      // Explicitly marked as optional (e.g. config.js with onerror="void 0").
      warn(`index.html:${ln}: script "${src}" not found on disk, but has onerror fallback — treated as optional`);
    } else {
      fail(`index.html:${ln}: <script src="${src}"> does not resolve to a file on disk (expected ${resolved})`);
    }
  } else if (src.toLowerCase().endsWith('.js')) {
    localScriptFiles.push(src);
  }
}

if (scriptTagCount === 0) {
  fail('index.html: no <script src="..."> tags found at all — parsing likely broken');
} else {
  console.log(`      ${scriptTagCount} script tags found, ${localScriptFiles.length} local .js files to syntax-check.`);
}

// ---------------------------------------------------------------------------
// Check 2: node --check every .js file under js/ plus anything index.html references
// ---------------------------------------------------------------------------

console.log('[2/4] Running `node --check` on all JS files...');

function walkJsFiles(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkJsFiles(full));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

const jsDir = path.join(ROOT, 'js');
const jsFilesSet = new Set(walkJsFiles(jsDir).map((p) => path.resolve(p)));

// Add any other local .js referenced directly by index.html (e.g. config.example.js at root)
for (const src of localScriptFiles) {
  const resolved = path.resolve(ROOT, src.split('?')[0].split('#')[0]);
  if (fs.existsSync(resolved)) jsFilesSet.add(resolved);
}

const jsFiles = Array.from(jsFilesSet).sort();

let syntaxChecked = 0;
for (const file of jsFiles) {
  const rel = path.relative(ROOT, file);
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' });
    syntaxChecked++;
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : String(err.message || err);
    fail(`${rel}: syntax error via \`node --check\`:\n      ${stderr.trim().split('\n').join('\n      ')}`);
  }
}
console.log(`      ${syntaxChecked}/${jsFiles.length} files passed syntax check.`);

// ---------------------------------------------------------------------------
// Check 3: data-screen (nav-btn) <-> id="screen-X" (section) integrity
// ---------------------------------------------------------------------------

console.log('[3/4] Checking data-screen nav buttons vs. screen sections...');

// Find every <button ... class="...nav-btn..." ... data-screen="X" ...> (attribute order-agnostic)
const navBtnScreens = new Map(); // screenId -> line number (first occurrence)
const buttonTagRe = /<button\b([^>]*)>/gi;
while ((m = buttonTagRe.exec(html)) !== null) {
  const attrs = m[1];
  const classMatch = /\bclass\s*=\s*["']([^"']*)["']/i.exec(attrs);
  const isNavBtn = classMatch && /\bnav-btn\b/.test(classMatch[1]);
  if (!isNavBtn) continue;
  const screenMatch = /\bdata-screen\s*=\s*["']([^"']+)["']/i.exec(attrs);
  if (!screenMatch) {
    warn(`index.html:${lineOf(m.index)}: .nav-btn element has no data-screen attribute`);
    continue;
  }
  const screenId = screenMatch[1];
  if (!navBtnScreens.has(screenId)) navBtnScreens.set(screenId, lineOf(m.index));
}

// Find every <section ... id="screen-X" ...>
const screenSections = new Map(); // screenId -> line number
const sectionIdRe = /\bid\s*=\s*["']screen-([a-zA-Z0-9_-]+)["']/gi;
while ((m = sectionIdRe.exec(html)) !== null) {
  const screenId = m[1];
  if (!screenSections.has(screenId)) screenSections.set(screenId, lineOf(m.index));
}

if (navBtnScreens.size === 0) {
  fail('index.html: no .nav-btn[data-screen] elements found — parsing likely broken');
}
if (screenSections.size === 0) {
  fail('index.html: no id="screen-*" sections found — parsing likely broken');
}

for (const [screenId, ln] of navBtnScreens) {
  if (!screenSections.has(screenId)) {
    fail(`index.html:${ln}: nav button data-screen="${screenId}" has no matching <section id="screen-${screenId}">`);
  }
}
for (const [screenId, ln] of screenSections) {
  if (!navBtnScreens.has(screenId)) {
    warn(`index.html:${ln}: <section id="screen-${screenId}"> has no nav button with data-screen="${screenId}" (orphaned screen)`);
  }
}
console.log(`      ${navBtnScreens.size} nav buttons, ${screenSections.size} screen sections checked.`);

// ---------------------------------------------------------------------------
// Check 4 (best-effort, warn-only): stopAllPlayback() registry sanity
// ---------------------------------------------------------------------------

console.log('[4/4] Checking stopAllPlayback() module references (best-effort, warnings only)...');

const appJsPath = path.join(jsDir, 'app.js');
if (!fs.existsSync(appJsPath)) {
  warn('js/app.js not found — skipping stopAllPlayback() sanity check');
} else {
  const appJs = readFile(appJsPath);
  const fnMatch = /function\s+stopAllPlayback\s*\(\s*\)\s*\{/.exec(appJs);
  if (!fnMatch) {
    warn('js/app.js: could not locate `function stopAllPlayback() {` — skipping check');
  } else {
    // Extract the function body by brace-matching from the opening brace.
    let start = fnMatch.index + fnMatch[0].length;
    let depth = 1;
    let i = start;
    while (i < appJs.length && depth > 0) {
      if (appJs[i] === '{') depth++;
      else if (appJs[i] === '}') depth--;
      i++;
    }
    const body = appJs.slice(start, i - 1);

    // Pull out names referenced via `typeof Name !== 'undefined'`
    const nameRe = /typeof\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*!==\s*['"]undefined['"]/g;
    const referenced = new Set();
    let nm;
    while ((nm = nameRe.exec(body)) !== null) {
      referenced.add(nm[1]);
    }

    if (referenced.size === 0) {
      warn('js/app.js: stopAllPlayback() body found but no `typeof X !== \'undefined\'` references extracted — skipping check');
    } else {
      // Build the set of top-level `const Name = (` module definitions across all js files.
      const definedModules = new Set();
      const defRe = /^const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=/gm;
      for (const file of jsFiles) {
        const content = readFile(file);
        let dm;
        while ((dm = defRe.exec(content)) !== null) {
          definedModules.add(dm[1]);
        }
      }

      let undefinedRefs = 0;
      for (const name of referenced) {
        if (!definedModules.has(name)) {
          undefinedRefs++;
          warn(`js/app.js: stopAllPlayback() references "${name}" via typeof-check, but no top-level "const ${name} = ..." definition was found in js/*.js (possibly a typo or stale reference)`);
        }
      }
      console.log(`      ${referenced.size} module references checked, ${referenced.size - undefinedRefs} matched a top-level const definition.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log('');
if (warnings.length) {
  console.log(`WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log('  - ' + w);
  console.log('');
}

if (failures.length) {
  console.log(`FAILURES (${failures.length}):`);
  for (const f of failures) console.log('  - ' + f);
  console.log('');
  console.log(`SMOKE TEST FAILED: ${failures.length} failure(s), ${warnings.length} warning(s).`);
  process.exit(1);
} else {
  console.log(`SMOKE TEST PASSED: ${scriptTagCount} script tags, ${jsFiles.length} JS files, ${navBtnScreens.size} nav screens checked, ${warnings.length} warning(s).`);
  process.exit(0);
}
