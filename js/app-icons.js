/* אייקונים אחידים — קו דק ומילוי רך. לא נוגעים בצוואר, בזוהר הנקודה או בעוזר. */
'use strict';

const AppIcons = (() => {
  const SVG = 'http://www.w3.org/2000/svg';

  function g(inner) {
    return '<g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + inner + '</g>';
  }
  function soft(d) {
    return '<path d="' + d + '" fill="currentColor" stroke="none" opacity="0.16"/>';
  }
  function line(d) {
    return '<path d="' + d + '"/>';
  }
  function head(x, y, rx) {
    rx = rx || 2.15;
    const ry = Math.round(rx * 0.7 * 10) / 10;
    return '<ellipse cx="' + x + '" cy="' + y + '" rx="' + rx + '" ry="' + ry + '" transform="rotate(-22 ' + x + ' ' + y + ')" fill="currentColor" stroke="none"/>';
  }
  function stem(x, y, top) {
    const sx = Math.round((x + 1.65) * 10) / 10;
    return '<path d="M' + sx + ' ' + (y - 0.2) + 'V' + top + '"/>';
  }
  function eighth(x, y) {
    const top = Math.round((y - 7) * 10) / 10;
    const sx = Math.round((x + 1.65) * 10) / 10;
    return head(x, y) + stem(x, y, top) + '<path d="M' + sx + ' ' + top + 'c2.1.8 3.2 2.2 2.1 3.7"/>';
  }
  function staff(x1, x2, y) {
    return [0, 3.1, 6.2].map((d) => '<path d="M' + x1 + ' ' + (y + d) + 'H' + x2 + '"/>').join('');
  }

  const PATHS = {
    note: g(eighth(9.2, 16.2)),
    play: g(soft('M7.2 5.6v12.8L18.2 12z') + line('M7.2 5.6v12.8L18.2 12z')),
    stop: g(line('M5 14.8h14') + line('M7.2 14.8c.4-3.6 9.2-3.6 9.6 0') + head(12, 17.2, 1.35)),
    speaker: g(soft('M4 9.4h3.1L11.2 6v12L7.1 14.6H4z') + line('M4 9.4h3.1L11.2 6v12L7.1 14.6H4zM14.4 9.2c1.3 1.1 1.3 4.5 0 5.6M16.6 7.2c2.2 1.8 2.2 7.8 0 9.6')),
    mic: g(soft('M9 4.2a2.6 2.6 0 0 1 2.6 2.6v4.2a2.6 2.6 0 0 1-5.2 0V6.8A2.6 2.6 0 0 1 9 4.2z') + line('M9 4.2a2.6 2.6 0 0 1 2.6 2.6v4.2a2.6 2.6 0 0 1-5.2 0V6.8A2.6 2.6 0 0 1 9 4.2zM5.2 11.2a3.8 3.8 0 0 0 7.6 0M9 15.2v2.4') + eighth(16.4, 14.6)),
    home: g(soft('M7.6 13.4c.3-1.4 1.4-2.2 2.4-2.4h4c1 .2 2.1 1 2.4 2.4.5 1.8.2 3.4-.8 4.4-1 1.4-2.4 2-3.6 2s-2.6-.6-3.6-2c-1-1-1.3-2.6-.8-4.4z') + line('M10.2 4.6h3.6v8.2M8.2 4.6h7.6M8.2 6.1 6.6 5.2M15.8 6.1l1.6-.9M11.2 6.4v5.6M12.8 6.4v5.6M7.6 13.4c.3-1.4 1.4-2.2 2.4-2.4h4c1 .2 2.1 1 2.4 2.4.5 1.8.2 3.4-.8 4.4-1 1.4-2.4 2-3.6 2s-2.6-.6-3.6-2c-1-1-1.3-2.6-.8-4.4z') + '<ellipse cx="12" cy="16.6" rx="1.35" ry="1.05" fill="none"/>'),
    learn: g(soft('M3.8 7.4v9.2l7.4-4.6z') + line('M3.8 7.4v9.2l7.4-4.6z') + eighth(16.2, 16.4)),
    'learn-lib': g(line('M8 7.2h11v12H8zM6 5.4h11') + staff(9.2, 17.2, 9.2) + head(15.2, 14.6, 1.5)),
    neck: g(soft('M4.5 5h15v14h-15z') + line('M4.5 5h15v14h-15zM8.2 5v14M12 5v14M15.8 5v14M4.5 8.4h15M4.5 12h15M4.5 15.6h15') + head(10.1, 12, 1.25)),
    'vocal-melody': g(soft('M8.2 4.4a2.5 2.5 0 0 1 2.5 2.5v3.8a2.5 2.5 0 0 1-5 0V6.9a2.5 2.5 0 0 1 2.5-2.5z') + line('M8.2 4.4a2.5 2.5 0 0 1 2.5 2.5v3.8a2.5 2.5 0 0 1-5 0V6.9a2.5 2.5 0 0 1 2.5-2.5zM4.8 11a3.4 3.4 0 0 0 6.8 0M8.2 14.6V17') + eighth(16.6, 15.2)),
    'bouzouki-studio': g(line('M5 5v14M5 8.2h3.2M10 5v14M10 14.2h3.2') + eighth(17.2, 15.4)),
    progress: g(line('M4 19.2h16') + eighth(6.2, 16.8) + eighth(12, 13.2) + eighth(17.6, 9.4)),
    songs: g(staff(4, 20, 7.2) + head(8, 15.2) + head(14.2, 14.4) + line('M9.7 14.8V8.2M15.9 14V7.4M9.7 8.2h6.2')),
    listen: g(line('M6.2 13.2c0-3.6 2.4-6.4 5.4-6.4 2.6 0 4.4 1.8 4.4 4.2 0 1.8-1 2.8-2.1 3.2-.7.3-.9 1-.6 1.6M8.6 13c.5 1.5 1.6 2.2 2.8 1.8') + eighth(17.4, 10.2)),
    dromoi: g(staff(3.5, 20.5, 8) + head(6.2, 16.2, 1.7) + head(11.2, 13.2, 1.7) + head(16.4, 10.2, 1.7) + stem(6.2, 16.2, 10) + stem(11.2, 13.2, 7.2) + stem(16.4, 10.2, 5)),
    penia: g(soft('M12 3.6c2.8 0 5.6 2.8 5.6 7 0 4.8-2.4 9.2-5.6 9.2s-5.6-4.4-5.6-9.2c0-4.2 2.8-7 5.6-7z') + line('M12 3.6c2.8 0 5.6 2.8 5.6 7 0 4.8-2.4 9.2-5.6 9.2s-5.6-4.4-5.6-9.2c0-4.2 2.8-7 5.6-7zM9.2 10.4c1.4 1.2 4.2 1.2 5.6 0')),
    'penia-learn': g(soft('M7.2 4.2c1.8 0 3.4 1.8 3.4 4.4S9 13.6 7.2 13.6 3.8 11.2 3.8 8.6 5.4 4.2 7.2 4.2z') + line('M7.2 4.2c1.8 0 3.4 1.8 3.4 4.4S9 13.6 7.2 13.6 3.8 11.2 3.8 8.6 5.4 4.2 7.2 4.2z') + eighth(14.2, 17.2) + eighth(18.6, 13.2)),
    'dromos-learn': g(line('M4.5 18.5h4.2V14h4.2V9.6H17V5.4') + head(6.2, 17.2, 1.45) + head(10.6, 12.8, 1.45) + head(15.2, 8.4, 1.45)),
    'theory-lab': g(line('M12 7.2C10.2 5.8 7.8 5.4 5 6v11.2c2.8-.6 5.2-.2 7 1.2 1.8-1.4 4.2-1.8 7-1.2V6c-2.8-.6-5.2-.2-7 1.2z') + staff(13.4, 18.2, 9.2)),
    'arp-studio': g(line('M5 8.2c3.2-2.8 10.6-2.8 14 0') + eighth(6.4, 17.4) + eighth(12, 14.2) + eighth(17.4, 11)),
    'reference-cards': g(line('M8.2 5.2h10.2v11.2H8.2zM5.6 7.4h10.4v11.4H5.6zM7.4 10h6.6M7.4 13h6.6M7.4 16h6.6M9.2 10v6M11.4 10v6') + head(12.6, 12.2, 1.15)),
    worksheets: g(soft('M6 3.8h12v16.4H6z') + line('M6 3.8h12v16.4H6z') + staff(7.6, 16.4, 6) + staff(7.6, 16.4, 13.2)),
    'song-teacher': g(staff(3.6, 15.2, 8) + eighth(8.2, 16.4) + line('M15.6 7.2a3.4 3.4 0 1 1 .2 6.4') + head(12.2, 13.6, 1.35)),
    'song-academy': g(soft('M4 9.2 12 5.6l8 3.6L12 12.8z') + line('M4 9.2 12 5.6l8 3.6L12 12.8zM12 9.2v2.6M8.4 11.2v2.2c1.2.9 6.4.9 7.6 0v-2.2') + eighth(16.4, 19.2)),
    'modus-path': g(line('M4.5 16.5c2.4-1 3.6-3.6 6.2-3.6s3.4 2.4 6.2 1.6') + head(6.2, 16.2, 1.55) + head(11.6, 13.2, 1.55) + head(17.2, 13.6, 1.55)),
    adaptive: g(line('M6.2 12.4v-.4a5.8 5.8 0 0 1 11.6 0v.4M6 12.2h2.4v5.2H6.8A1.2 1.2 0 0 1 5.6 16v-2.4A1.4 1.4 0 0 1 6 12.2zM18 12.2h-2.4v5.2h1.6a1.2 1.2 0 0 0 1.2-1.4v-2.4a1.4 1.4 0 0 0-1.4-1.4z') + head(12, 8.2, 1.45)),
    'daily-workout': g(line('M12 4.2 8.2 19.2h7.6zM12 7.2 15.2 14.2M10.6 3.4h2.8') + eighth(17.6, 16.6)),
    'practice-lib': g(line('M4.6 6.2h6.4v12.2H5.8A1.2 1.2 0 0 1 4.6 17zM13 6.2h6.4v12.2h-5.2A1.2 1.2 0 0 1 13 17z') + eighth(16.2, 14.8)),
    exercises: g(line('M7.2 5.2 4.8 16.8h4.8zM7.2 7.4l1.8 4.2') + line('M12.2 9.2h7.2M12.2 13.4h7.2M12.2 17.4h5.2') + head(11.2, 9.2, 1.15) + head(11.2, 13.4, 1.15)),
    rhythms: g(soft('M7.2 6h9.6L15.2 13l1.2 2.2c.7 1.3 0 2.6-1.7 3.2H9.3c-1.7-.6-2.4-1.9-1.7-3.2L8.8 13z') + line('M7.2 6h9.6L15.2 13l1.2 2.2c.7 1.3 0 2.6-1.7 3.2H9.3c-1.7-.6-2.4-1.9-1.7-3.2L8.8 13 7.2 6zM7.6 8.5h8.8')),
    practice: g(soft('M12 4.4 7.6 19.6h8.8z') + line('M12 4.4 7.6 19.6h8.8zM12 7.2 16.2 15M10.4 3.4h3.2') + head(14.6, 13.4, 1.35)),
    course: g(soft('M5 8.4 12 5.4l7 3L12 11.4z') + line('M5 8.4 12 5.4l7 3L12 11.4zM12 8.4v2') + staff(5, 19, 13.2) + head(14, 18.2, 1.45)),
    game: g(line('M4 10.5h16M4 14h16M4 17.5h16') + soft('M13.2 4.2c1.6 0 3.2 1.6 3.2 4.2 0 2.8-1.4 5.4-3.2 5.4s-3.2-2.6-3.2-5.4c0-2.6 1.6-4.2 3.2-4.2z') + line('M13.2 4.2c1.6 0 3.2 1.6 3.2 4.2 0 2.8-1.4 5.4-3.2 5.4s-3.2-2.6-3.2-5.4c0-2.6 1.6-4.2 3.2-4.2z')),
    'master-modes': g(staff(3.5, 20.5, 7.4) + eighth(11.2, 16.2) + line('M11.2 10.6a3.6 3.6 0 1 1 .2 6.8')),
    'master-chords': g(line('M6.2 4.6h11.6v14.8H6.2zM8.8 4.6v14.8M12 4.6v14.8M15.2 4.6v14.8M6.2 8.4h11.6M6.2 12.2h11.6M6.2 16h11.6') + head(8.8, 12.2, 1.2) + head(15.2, 8.4, 1.2)),
    tuner: g(line('M5.4 16.2V9.2M9.2 16.2V9.2M5.4 9.2c0-2.2 3.8-2.2 3.8 0M14.2 16.4a5.2 5.2 0 0 1 5.4-3.6M16.6 16.2 19.4 10.6') + head(18.2, 10.2, 1.2)),
    skills: g(head(5.6, 16.4) + head(11, 13.2) + head(16.6, 9.8) + line('M7.3 16V9.2M12.7 12.8V6.4M18.3 9.4V4.2M7.3 9.2 18.3 4.2')),
    'song-learn': g(line('M10.2 6.2a4.4 4.4 0 1 1 0 8.8 4.4 4.4 0 0 1 0-8.8zM13.6 13.4 18.2 18') + head(10.2, 11.4, 1.7) + stem(10.2, 11.4, 7.2)),
    intervals: g(line('M5.2 5.4v13.2M5.2 5.4h2.2M5.2 18.6h2.2') + eighth(10.2, 16.6) + eighth(16.6, 10.4)),
    modequiz: g(staff(3.2, 13.6, 8) + line('M16.2 7.4a2.6 2.6 0 0 1 4.4 1.8c0 1.8-2.2 2.2-2.2 4') + head(18.4, 16.8, 1.25)),
    explorer: g(staff(3.2, 13.4, 8.4) + line('M15.2 7.2a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2zM17.8 13.2l2.6 2.6') + head(15.2, 10.8, 1.35)),
    scalechords: g(line('M4.4 5.2h9.2v13.2H4.4zM6.6 5.2v13.2M9 5.2v13.2M11.4 5.2v13.2M4.4 8.6h9.2M4.4 12.2h9.2') + head(7.8, 12.2, 1.15) + eighth(17.4, 15.6)),
    'duet-voices': g(line('M5.4 8.4c3.4-2.4 9.6-2.4 13.2 0') + eighth(7.4, 17.2) + eighth(14.8, 15.2)),
    'mode-positions': g(soft('M4.2 5.2h15.6v13.6H4.2z') + line('M4.2 5.2h15.6v13.6H4.2zM8 5.2v13.6M12 5.2v13.6M16 5.2v13.6M4.2 9h15.6M4.2 12.6h15.6') + line('M9.2 7.2h5.2v6.2H9.2z')),
    composer: g(staff(3.2, 13.2, 8) + line('M15.2 19.2 20.2 8.4M14.4 18.2l1.6 1.6M18.8 7.2l1.4 1.2-1.2 2.2')),
    backing: g(soft('M3.8 9.6h3L10.6 6.2v11.6L6.8 14.4h-3z') + line('M3.8 9.6h3L10.6 6.2v11.6L6.8 14.4h-3zM14 9.4c1.2 1.2 1.2 4 0 5.2M16.4 7.2c2.2 1.8 2.2 7.8 0 9.6')),
    jam: g(line('M5.2 5.2h1.8v6.2M4.2 5.2h3.8M6.1 6.6v4.2') + soft('M4.6 11.2c.2.8.8 1.4 1.5 1.5.8.2 1.6-.2 1.8-1 .2-.6 0-1.2-.4-1.6h-1.6c-.6.2-1.1.6-1.3 1.1z') + line('M4.6 11.2c.2.8.8 1.4 1.5 1.5.8.2 1.6-.2 1.8-1 .2-.6 0-1.2-.4-1.6h-1.6c-.6.2-1.1.6-1.3 1.1zM13.2 15.2h3.2l4.2-2.4v6.2l-4.2-2.4h-3.2z') + soft('M13.2 15.2h3.2l4.2-2.4v6.2l-4.2-2.4h-3.2z')),
    exgen: g(staff(3.4, 14, 8.2) + eighth(7.2, 16.6) + eighth(12.2, 14.8) + head(17.6, 9.2, 1.55) + line('M17.6 5.2v2.2M17.6 11.2v2M14.6 9.2h2M18.8 9.2h2')),
    melodygen: g(staff(3.2, 14.2, 9) + eighth(8.4, 17.2) + head(17.4, 8.4, 1.6) + line('M17.4 4.6v2M17.4 10.4v2M14.4 8.4h2M18.6 8.4h2')),
    recorder: g(soft('M7.4 4.6a2.4 2.4 0 0 1 2.4 2.4v4a2.4 2.4 0 0 1-4.8 0v-4a2.4 2.4 0 0 1 2.4-2.4z') + line('M7.4 4.6a2.4 2.4 0 0 1 2.4 2.4v4a2.4 2.4 0 0 1-4.8 0v-4a2.4 2.4 0 0 1 2.4-2.4zM4.2 11.2a3.2 3.2 0 0 0 6.4 0M7.4 14.6v2.2M13.6 10.2c.8-1.6 1.6-1.6 2.4 0s1.6 1.6 2.4 0 1.4-1.6 2.2-1.6M13.6 14.4c.8-1.6 1.6-1.6 2.4 0s1.6 1.6 2.4 0')),
    sightread: g(line('M3.6 12.2c2.6-3.4 6.4-3.4 9 0-2.6 3.4-6.4 3.4-9 0z') + head(8.1, 12.2, 1.55) + staff(13.2, 20.6, 7.6)),
    drums: g(line('M12 5.2a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6zM8.2 7.4l1.2 1.2M14.6 7.4l-1.2 1.2M7.2 12.2h1.8M15 12.2h1.8M9.2 16.2l1 1.2M13.6 16.2l-1 1.2') + head(12, 12.2, 1.45)),
    analyzer: g(line('M3.2 12h2.2l1.3-4.2 2.2 8.4 2-6.2 1.6 3.2 1.4-2.4 1.5 1.2H20.8')),
    maqam: g(line('M5.2 19V11.2C5.2 7 8.2 4.4 12 4.4s6.8 2.6 6.8 6.8V19M12 4.4v3.2') + eighth(12, 16.8)),
    glossary: g(line('M12 7c-1.8-1.2-4-1.6-6.6-1v11.4c2.6-.6 4.8-.2 6.6 1.2 1.8-1.4 4-1.8 6.6-1.2V6c-2.6-.6-4.8-.2-6.6 1z') + line('M15.2 9.2h1.1v3.4M14.6 9.2h2.3M15.7 10.2v2') + soft('M14.8 12.4c.15.5.5.9.9.9s.9-.3 1-.8c.1-.4 0-.7-.3-.9h-.8c-.3.1-.6.4-.8.8z')),
    help: g(line('M9.2 8.8a2.8 2.8 0 1 1 4.6 2.2c-.8.6-1.4 1.2-1.4 2.4') + head(12.2, 16.8, 1.45)),
    glow: g(eighth(10.2, 16.4) + line('M12 3.4v2.2M18.6 6.2l-1.5 1.5M20.2 12.4h-2.2M5.2 6.2l1.5 1.5')),
  };

  const SCREEN = {
    home: 'home', learn: 'learn', 'learn-lib': 'learn-lib', neck: 'neck',
    'vocal-melody': 'vocal-melody', 'bouzouki-studio': 'bouzouki-studio', progress: 'progress',
    songs: 'songs', listen: 'listen', dromoi: 'dromoi', penia: 'penia',
    'penia-learn': 'penia-learn', 'dromos-learn': 'dromos-learn', 'theory-lab': 'theory-lab',
    'arp-studio': 'arp-studio', 'reference-cards': 'reference-cards', worksheets: 'worksheets',
    'song-teacher': 'song-teacher', 'song-academy': 'song-academy', 'modus-path': 'modus-path',
    adaptive: 'adaptive', 'daily-workout': 'daily-workout', 'practice-lib': 'practice-lib',
    exercises: 'exercises', rhythms: 'rhythms', practice: 'practice', course: 'course',
    game: 'game', 'master-modes': 'master-modes', 'master-chords': 'master-chords',
    tuner: 'tuner', skills: 'skills', 'song-learn': 'song-learn', intervals: 'intervals',
    modequiz: 'modequiz', explorer: 'explorer', scalechords: 'scalechords',
    'duet-voices': 'duet-voices', 'mode-positions': 'mode-positions', composer: 'composer',
    backing: 'backing', jam: 'jam', exgen: 'exgen', melodygen: 'melodygen',
    recorder: 'recorder', sightread: 'sightread', drums: 'drums', analyzer: 'analyzer',
    maqam: 'maqam', glossary: 'glossary',
  };

  const LEAD = [
    [/^(?:▶️|▶)\s*/, 'play'],
    [/^(?:⏹️|⏹|■)\s*/, 'stop'],
    [/^🔊\s*/, 'speaker'],
    [/^🎤\s*/, 'mic'],
    [/^🎵\s*/, 'note'],
  ];

  function el(name) {
    const markup = (name && (PATHS[name] || PATHS[SCREEN[name]])) || PATHS.note;
    const holder = document.createElement('div');
    holder.innerHTML = '<svg viewBox="0 0 24 24" class="ui-ico" aria-hidden="true" focusable="false">' + markup + '</svg>';
    return holder.firstChild;
  }

  function mountNav() {
    document.querySelectorAll('.nav-btn[data-screen]').forEach((btn) => {
      let slot = btn.querySelector('.nav-ico');
      if (!slot) {
        slot = document.createElement('span');
        slot.className = 'nav-ico';
        btn.prepend(slot);
      }
      if (!slot.querySelector('svg')) {
        slot.replaceChildren(el(btn.dataset.screen));
      }
      if (btn.querySelector('.nav-label')) return;
      const text = [...btn.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\s+/g, ' ').trim();
      [...btn.childNodes].forEach((n) => { if (n.nodeType === 3) n.remove(); });
      const lab = document.createElement('span');
      lab.className = 'nav-label';
      lab.textContent = text;
      btn.appendChild(lab);
    });
  }

  function mountHeads() {
    document.querySelectorAll('section.screen').forEach((sec) => {
      const head = sec.querySelector('.screen-head');
      if (!head || head.querySelector('.screen-ico')) return;
      const id = (sec.id || '').replace(/^screen-/, '');
      const h1 = head.querySelector('h1');
      if (!h1 || !SCREEN[id]) return;
      const row = document.createElement('div');
      row.className = 'screen-title-row';
      const slot = document.createElement('span');
      slot.className = 'screen-ico';
      slot.setAttribute('aria-hidden', 'true');
      slot.appendChild(el(id));
      h1.before(row);
      row.append(slot, h1);
    });
  }

  let busy = false;
  function upgradeButton(btn) {
    if (busy || !btn || !btn.classList) return;
    if (btn.classList.contains('nav-btn') || btn.classList.contains('hub-card') || btn.id === 'bn-glow-toggle' || btn.id === 'app-helper-help') return;
    if (![...btn.childNodes].every((n) => n.nodeType === 3)) return;
    const raw = btn.textContent.replace(/^\s+/, '');
    const hit = LEAD.find(([re]) => re.test(raw));
    if (!hit) return;
    const rest = raw.replace(hit[0], '').trim();
    busy = true;
    btn.replaceChildren(el(hit[1]), document.createTextNode(rest ? ' ' + rest : ''));
    busy = false;
  }

  function scan(root) {
    (root || document).querySelectorAll('button').forEach(upgradeButton);
  }

  function decorateChrome() {
    const help = document.getElementById('app-helper-help');
    if (help && !help.querySelector('svg')) {
      help.replaceChildren(el('help'));
    }
    const glow = document.getElementById('bn-glow-toggle');
    if (glow && !glow.querySelector('svg')) {
      const label = (glow.textContent || 'זוהר').trim() || 'זוהר';
      glow.replaceChildren(el('glow'), document.createTextNode(' ' + label));
    }
  }

  function watch() {
    if (!document.body) return;
    const obs = new MutationObserver((records) => {
      records.forEach((rec) => {
        if (rec.type !== 'childList') return;
        rec.addedNodes.forEach((node) => {
          if (node.nodeType === 3 && rec.target && rec.target.matches && rec.target.matches('button')) {
            upgradeButton(rec.target);
          } else if (node.nodeType === 1) {
            if (node.matches && node.matches('button')) upgradeButton(node);
            if (node.querySelectorAll) node.querySelectorAll('button').forEach(upgradeButton);
          }
        });
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  mountNav();
  let booted = false;
  function boot() {
    mountNav();
    mountHeads();
    decorateChrome();
    scan(document);
    if (booted) return;
    booted = true;
    watch();
  }
  document.addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();

  return { el, mountNav, scan };
})();
