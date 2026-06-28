# Bouzouki Academy — App Overview (for Gemini review)

## What it is
A web app for learning the Greek bouzouki (8-string, tetrachordo, C-F-A-D tuning).
Interactive learning: a fretboard that lights up notes, real-time sound synthesis, microphone listening to check your playing, AI song analysis, and games.
Hebrew RTL UI + Greek terminology. PWA (partial offline).

## Tech stack
- **Vanilla JavaScript only** — no framework (no React/Vue), no build step, no bundler.
- Every module is an IIFE exposing a single global (`const X = (()=>{...})()`).
- ~56 JS files, **~35,800 lines of JS**, one CSS file (~2,360 lines), index.html (~1,240 lines).
- **Web Audio API** — all sounds synthesized in real time (Karplus-Strong for strings, metronome) — zero audio files.
- **Storage:** IndexedDB + localStorage (progress, streak, XP, downloads).
- **PWA:** manifest.json + service worker (caches JS/CSS + CDN libs).

## External dependencies (CDN, lazy-loaded)
- **Essentia.js** (0.1.3) — in-browser audio analysis (BPM, chords, tab) via WASM.
- **Meyda** (5.6.2) — audio feature extraction.
- **Spotify basic-pitch** (1.0.1) — audio→notes (ML model).
- **Optional proxy** (`tools/stem-proxy`, Node) — YouTube search/download (yt-dlp) and stem separation (LALAL/Moises API). Runs locally, not required.

## Architecture
- Single-page app with **45 screens** (`data-screen` navigation), all in index.html.
- Script load order determines global availability; modules touch each other only at runtime (render), not at load time.
- `js/data.js` (~2,000 lines) = all musical knowledge: **36 dromoi/maqamat**, rhythms, patterns.
- No automated tests.

## Feature inventory (45 screens)

### Fretboard & theory
- **Dromoi** — 15+ dromoi on the fretboard, scale playback, drone, maqam section (6 jins).
- **Scale Explorer** — pick dromos/tonic, guitar-style position, "the Road" (practical path on 1–4 strings with frets + fingerings), dromos comparison.
- **Scale Chords** — degrees, progressions, "the Road".
- **Theory Lab, Modus Path, Reference Cards, Worksheets, Rebetiko Glossary, Intervals.**

### Playing & practice
- **Master Modes** — dromos-learning game: note-by-note / full scale / Hero Mode (falling notes).
- **Master Chords** — 17 chords, colored chip per note, mic detection.
- **Master Penia** — two-way rhythm game (8 stages, up to 7/8).
- **Exercise Library** — 61+ exercises, 12 categories (basics, triplets, tremolo, zeibekiko...).
- **Greek Rhythms** — zeibekiko 9/4, hasapiko, tsifteteli, kalamatianos 7/8 (doum/tek machine).
- **Practice Room, Daily Workout, Arpeggio Studio, Bouzouki Studio, Skills.**

### Listening & detection
- **Listening Coach** — mic → note detection → compare to target + score.
- **Tuner** — real reference tones (octave pairs), note map on fretboard, instrument diagram.

### Learn from song (Bouzouki 2.0)
- **YouTube search** (via proxy) or built-in song library (~130 songs).
- **Download → Library → AI analysis (Essentia) → practice** (TAB, chords, BPM, play-along).
- **Chord tooltip** on hover everywhere; JSON/TXT export.
- **Song Teacher, Song Academy, Song Library** with accompaniment and transposition.

### Progress
- Dashboard: 14-day activity graph, streak, XP — stored in IndexedDB.

## File map (JS, by size & role)

| File | Lines | Role |
|---|---|---|
| js/songs/song-catalog.js | 4400 | Built-in song catalog |
| js/data.js | 1974 | All musical knowledge (dromoi, rhythms, patterns) |
| js/education-content.js | 1813 | Educational content / explanations |
| js/songs.js | 1710 | Song library UI, playback, transpose |
| js/features2.js | 1666 | Features: backing, melodygen, recorder, sightread, drums |
| js/app.js | 1340 | Core logic, navigation, fretboard drawing |
| js/features.js | 1167 | Explorer, ScaleChords, JamSimulator, exgen |
| js/fretboard-scale.js | 1099 | Scale-path engine on the fretboard (positions) |
| js/learn-youtube.js | 1092 | Learn Hub — YouTube, paths, analysis |
| js/theory-lab.js | 1066 | Theory Lab |
| js/song-academy.js | 1014 | Song Academy |
| js/song-learn.js | 917 | Song learning |
| js/song-analyzer.js | 909 | Song analysis (Essentia, waveform, play-along) |
| js/skills.js | 851 | Skills |
| js/master.js | 833 | Master Modes + Master Chords |
| js/arp-studio.js | 826 | Arpeggio Studio |
| js/tuner.js | 776 | Tuner |
| js/course.js | 764 | Course |
| js/modus-path.js | 672 | Modus Path |
| js/song-teacher.js | 669 | Song Teacher |
| js/dromos-visuals.js | 639 | Dromos visualizations |
| js/game.js | 562 | Master Penia (rhythm game) |
| js/audio.js | 539 | Sound engine (Karplus-Strong, metronome) |
| js/bouzouki-studio.js | 525 | Bouzouki Studio |
| js/reference-cards.js | 498 | Reference Cards |
| js/essentia-analyzer.js | 458 | Essentia/WASM analysis engine |
| js/listen.js | 448 | Listening Coach (mic) |
| ~25 more files | <450 | Additional content/helper modules |

**Folders:** `js/` (code), `css/` (style.css), `api/` (serverless YouTube functions), `tools/stem-proxy/` (Node proxy), `icons/`, `screenshots/`, `learn-downloads/`, `penia-master/` (separate rhythm-game repo).

## Known characteristics & limitations (for context)
- No build/framework/tests — trivial to open (double-click index.html), but the codebase is large and tightly coupled to globals.
- Some features (YouTube/stems) need a local Node proxy + yt-dlp + API keys.
- AI analysis runs in-browser (WASM) — CPU-heavy; accuracy depends on Essentia/basic-pitch.
- Mobile: adapted UI (bottom nav, touch buttons).

## What I'd like Gemini's opinion on
1. Is a vanilla/IIFE/globals architecture still reasonable at ~36K lines, or should it move to ES modules/a bundler?
2. Any maintainability/performance risk in loading ~56 synchronous scripts in index.html?
3. Product/UX assessment: are 45 screens a strength or cognitive overload?
4. Reliance on external CDNs (Essentia/Meyda/basic-pitch) — reliability/offline risk?
5. Ideas to improve note-detection and analysis accuracy.
