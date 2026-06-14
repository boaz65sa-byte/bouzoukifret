/* גרף משחק — 8 מיתרים (זוגות), אנכי + אזור תפיסה בתחתית */
const Highway = (() => {
  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];
  const GEM_COLORS = ['#e878c8', '#f0b84a', '#5ec8e8', '#e3b341'];
  const NUM_FRETS = 5;
  const PAIRS = 4;
  let lastGeom = null;
  let lastViewStart = 0;

  function calcViewStart(markers) {
    const frets = markers
      .filter(m => m.fret !== 'x' && typeof m.fret === 'number' && m.fret > 0)
      .map(m => m.fret);
    if (!frets.length) return 0;
    const maxF = Math.max(...frets);
    if (maxF <= NUM_FRETS) return 0;
    return Math.max(0, Math.min(...frets) - 1);
  }

  function geom(w, h) {
    const padT = Math.min(36, h * 0.1);
    const padB = Math.min(52, h * 0.15);
    const padL = Math.min(38, w * 0.1);
    const gridTop = padT + 8;
    const catchZoneH = Math.min(44, h * 0.11);
    const gridBot = h - padB - catchZoneH;
    const gridH = gridBot - gridTop;
    const frH = gridH / NUM_FRETS;
    const courseW = (w - padL - 12) / PAIRS;
    const pairGap = Math.min(10, courseW * 0.22);
    const nutY = gridTop;
    const catchY = gridBot + catchZoneH * 0.48;
    const catchTop = gridBot + 2;
    const catchBot = gridBot + catchZoneH;

    function courseCenterX(course) {
      return padL + course * courseW + courseW / 2;
    }

    function stringX(course, side) {
      const cx = courseCenterX(course);
      return cx - pairGap / 2 + side * pairGap;
    }

    function rowY(fret, viewStart) {
      if (fret === 0) return nutY + frH * 0.08;
      const rel = fret - viewStart;
      return nutY + (rel - 0.5) * frH;
    }

    function fretLineY(fi) {
      return nutY + fi * frH;
    }

    return {
      w, h, padT, padB, padL, gridTop, gridBot, gridH, frH, courseW, pairGap,
      nutY, catchY, catchTop, catchBot, catchZoneH,
      courseCenterX, stringX, rowY, fretLineY,
    };
  }

  function roundRect(cctx, x, y, rw, rh, r) {
    cctx.beginPath();
    cctx.moveTo(x + r, y);
    cctx.lineTo(x + rw - r, y);
    cctx.quadraticCurveTo(x + rw, y, x + rw, y + r);
    cctx.lineTo(x + rw, y + rh - r);
    cctx.quadraticCurveTo(x + rw, y + rh, x + rw - r, y + rh);
    cctx.lineTo(x + r, y + rh);
    cctx.quadraticCurveTo(x, y + rh, x, y + rh - r);
    cctx.lineTo(x, y + r);
    cctx.quadraticCurveTo(x, y, x + r, y);
    cctx.closePath();
  }

  function drawCatchZone(cctx, g) {
    const boardW = g.courseW * PAIRS;
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 180);

    cctx.fillStyle = 'rgba(79,217,232,0.1)';
    roundRect(cctx, g.padL - 8, g.catchTop, boardW + 16, g.catchBot - g.catchTop, 5);
    cctx.fill();

    cctx.strokeStyle = `rgba(79,217,232,${0.45 + pulse * 0.35})`;
    cctx.lineWidth = 2.5;
    cctx.setLineDash([6, 4]);
    cctx.beginPath();
    cctx.moveTo(g.padL - 4, g.catchY);
    cctx.lineTo(g.padL + boardW + 4, g.catchY);
    cctx.stroke();
    cctx.setLineDash([]);

    for (let c = 0; c < PAIRS; c++) {
      const cx = g.courseCenterX(c);
      cctx.beginPath();
      cctx.ellipse(cx, g.catchY, g.pairGap * 0.95 + 4, 14, 0, 0, Math.PI * 2);
      cctx.strokeStyle = `rgba(79,217,232,${0.25 + pulse * 0.2})`;
      cctx.lineWidth = 1.5;
      cctx.stroke();
    }

    cctx.fillStyle = '#4fd9e8';
    cctx.font = '800 10px Heebo, sans-serif';
    cctx.textAlign = 'left';
    cctx.textBaseline = 'middle';
    cctx.fillText('▼ אזור תפיסה — נגנו כאן', g.padL, g.catchTop + 10);
  }

  function drawBoard(cctx, g, viewStart) {
    const boardW = g.courseW * PAIRS;
    cctx.fillStyle = 'rgba(42,24,16,0.94)';
    cctx.strokeStyle = 'rgba(232,217,176,0.28)';
    cctx.lineWidth = 1.5;
    roundRect(cctx, g.padL - 8, g.nutY - 6, boardW + 16, g.gridH + 12, 6);
    cctx.fill();
    cctx.stroke();

    if (viewStart > 0) {
      cctx.strokeStyle = '#8fa6bc';
      cctx.lineWidth = 3.5;
      cctx.beginPath();
      cctx.moveTo(g.padL - 4, g.nutY);
      cctx.lineTo(g.padL + boardW + 4, g.nutY);
      cctx.stroke();
      cctx.fillStyle = '#e3b341';
      cctx.font = '900 13px Heebo, sans-serif';
      cctx.textAlign = 'right';
      cctx.textBaseline = 'middle';
      cctx.fillText(String(viewStart), g.padL - 10, g.nutY + 4);
    } else {
      cctx.strokeStyle = '#f0e8d8';
      cctx.lineWidth = 5;
      cctx.beginPath();
      cctx.moveTo(g.padL - 4, g.nutY);
      cctx.lineTo(g.padL + boardW + 4, g.nutY);
      cctx.stroke();
    }

    for (let f = 1; f <= NUM_FRETS; f++) {
      const y = g.fretLineY(f);
      cctx.strokeStyle = '#4a6078';
      cctx.lineWidth = 1.5;
      cctx.beginPath();
      cctx.moveTo(g.padL, y);
      cctx.lineTo(g.padL + boardW, y);
      cctx.stroke();
      cctx.fillStyle = '#8fa6bc';
      cctx.font = '700 11px Heebo, sans-serif';
      cctx.textAlign = 'right';
      cctx.textBaseline = 'middle';
      cctx.fillText(String(viewStart + f), g.padL - 8, g.nutY + (f - 0.5) * g.frH);
    }
  }

  function drawStrings(cctx, g, activeCourses) {
    const active = activeCourses ? new Set(activeCourses) : null;
    for (let c = 0; c < PAIRS; c++) {
      const on = !active || active.has(c);
      for (let side = 0; side < 2; side++) {
        const x = g.stringX(c, side);
        cctx.strokeStyle = on ? (c === 3 ? '#ffe08a' : '#dce8f4') : 'rgba(80,100,120,0.3)';
        cctx.lineWidth = on ? (1.2 + c * 0.35) : 0.8;
        cctx.beginPath();
        cctx.moveTo(x, g.nutY);
        cctx.lineTo(x, g.catchBot);
        cctx.stroke();
      }
    }
  }

  function drawLabels(cctx, g, activeCourses) {
    const active = activeCourses ? new Set(activeCourses) : null;
    for (let c = 0; c < PAIRS; c++) {
      const cx = g.courseCenterX(c);
      const on = !active || active.has(c);
      cctx.textAlign = 'center';
      cctx.fillStyle = on ? '#e3b341' : '#5a7088';
      cctx.font = `800 ${g.w < 320 ? 10 : 12}px Heebo, sans-serif`;
      cctx.fillText(`מיתר ${c + 1}`, cx, g.h - g.padB + 14);
      cctx.fillStyle = on ? '#ffd86b' : '#8fa6bc';
      cctx.font = `900 ${g.w < 320 ? 12 : 14}px Heebo, sans-serif`;
      cctx.fillText(STRING_HE[c], cx, g.h - g.padB + 30);
      cctx.fillStyle = '#5a7088';
      cctx.font = '700 9px Heebo, sans-serif';
      cctx.fillText('זוג', cx, g.h - g.padB + 42);
    }
  }

  function drawStaticMarker(cctx, g, m, viewStart, alpha) {
    if (m.fret === 'x') return;
    const cx = g.courseCenterX(m.courseIdx);
    if (m.fret === 0) {
      cctx.globalAlpha = alpha;
      cctx.strokeStyle = '#5fc88f';
      cctx.lineWidth = 2;
      cctx.beginPath();
      cctx.arc(cx, g.nutY + 6, 5, 0, Math.PI * 2);
      cctx.stroke();
      cctx.globalAlpha = 1;
      return;
    }
    const cy = g.rowY(m.fret, viewStart);
    if (cy < g.nutY || cy > g.gridBot) return;
    cctx.globalAlpha = alpha;
    cctx.beginPath();
    cctx.ellipse(cx, cy, g.pairGap * 0.75 + 2, 9, 0, 0, Math.PI * 2);
    cctx.fillStyle = 'rgba(227,179,65,0.35)';
    cctx.fill();
    cctx.strokeStyle = 'rgba(240,204,116,0.6)';
    cctx.lineWidth = 1.5;
    cctx.stroke();
    cctx.fillStyle = '#f0cc74';
    cctx.font = '700 8px Heebo, sans-serif';
    cctx.textAlign = 'center';
    cctx.textBaseline = 'middle';
    cctx.fillText(`ס${m.fret}`, cx, cy);
    cctx.globalAlpha = 1;
  }

  function drawGem(cctx, cx, cy, rx, ry, color, label, sub, status) {
    cctx.save();
    cctx.globalAlpha = (status === 'perfect' || status === 'good') ? 0.28 : 1;
    cctx.shadowColor = color;
    cctx.shadowBlur = status ? 0 : 10;
    cctx.beginPath();
    cctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    cctx.fillStyle = status === 'wrong' || status === 'miss' ? '#d96459' : color;
    cctx.fill();
    cctx.strokeStyle = '#fff';
    cctx.lineWidth = 2;
    cctx.stroke();
    if (label) {
      cctx.shadowBlur = 0;
      cctx.fillStyle = '#1a1008';
      cctx.font = `900 ${ry > 10 ? 12 : 10}px Heebo, sans-serif`;
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(label, cx, cy);
    }
    if (sub) {
      cctx.fillStyle = '#f0cc74';
      cctx.font = '700 9px Heebo, sans-serif';
      cctx.fillText(sub, cx, cy - ry - 8);
    }
    cctx.restore();
  }

  function noteMarkers(note) {
    return [{
      courseIdx: 3,
      fret: note.fret,
      label: note.label || note.solfege || '',
    }];
  }

  function chordMarkers(chordId) {
    const ch = getChord(chordId);
    if (!ch) return [];
    return ch.shape.map((f, courseIdx) => ({ courseIdx, fret: f, label: '' }));
  }

  function markerLabel(m) {
    if (m.fret === 0) return '○';
    if (m.label) return m.label.length <= 2 ? m.label : m.label.charAt(0);
    if (typeof m.fret === 'number') return String(m.fret);
    return '';
  }

  function drawApproachMarker(cctx, g, m, timeToHit, pxPerSec, status) {
    const cx = g.courseCenterX(m.courseIdx);
    if (m.fret === 'x') {
      cctx.fillStyle = '#e04040';
      cctx.font = '900 17px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'bottom';
      cctx.fillText('×', cx, g.nutY - 4);
      return;
    }
    const y = g.catchY - timeToHit * pxPerSec;
    const sub = `מ${m.courseIdx + 1}·ס${m.fret}`;
    drawGem(cctx, cx, y, g.pairGap * 0.85 + 2, 11, GEM_COLORS[m.courseIdx], markerLabel(m), sub, status);
  }

  function activeCoursesForTarget(tg, gameType) {
    const set = new Set();
    if (gameType === 'note') set.add(3);
    else if (gameType === 'chord') {
      getChord(tg.chordId)?.shape.forEach((f, i) => { if (f !== 'x') set.add(i); });
    }
    return set;
  }

  function upcomingCaption(tg, gameType) {
    if (!tg) return '';
    if (gameType === 'note') {
      const n = tg.note;
      if (n.fret === 0) return `${n.label || n.solfege} · מיתר 4 (רה) · פתוח ○`;
      return `${n.label || n.solfege} · סריג ${n.fret} · מיתר 4 (רה)`;
    }
    return `${tg.chordId} — ${LearnGraph.shapeHint(tg.chordId)}`;
  }

  function targetViewStart(targets, tNow, gameType) {
    let best = null, bestDt = Infinity;
    targets.forEach(tg => {
      if (tg.status) return;
      const dt = tg.t - tNow;
      if (dt >= -0.2 && dt < bestDt) { bestDt = dt; best = tg; }
    });
    if (!best) return 0;
    const markers = gameType === 'note'
      ? noteMarkers(best.note)
      : chordMarkers(best.chordId);
    return calcViewStart(markers);
  }

  function drawCaption(cctx, g, text) {
    cctx.fillStyle = 'rgba(0,0,0,0.45)';
    cctx.fillRect(0, 0, g.w, g.padT + 4);
    cctx.fillStyle = '#f0cc74';
    cctx.font = `800 ${g.w < 300 ? 12 : 14}px Heebo, sans-serif`;
    cctx.textAlign = 'center';
    cctx.textBaseline = 'middle';
    cctx.fillText(text, g.w / 2, g.padT * 0.45);
  }

  function drawFrame(cctx, opts) {
    const { w, h, tNow, pxPerSec, viewStart, gameType, targets, upcoming, countIn, clickHint } = opts;
    const g = geom(w, h);
    lastGeom = g;
    lastViewStart = viewStart;

    cctx.fillStyle = '#0c141c';
    cctx.fillRect(0, 0, w, h);

    if (upcoming) drawCaption(cctx, g, upcomingCaption(upcoming, gameType));
    else drawCaption(cctx, g, 'גרף בוזוקי · נקודות יורדות לאזור התפיסה למטה');

    drawBoard(cctx, g, viewStart);
    const active = upcoming ? [...activeCoursesForTarget(upcoming, gameType)] : null;
    drawStrings(cctx, g, active);

    if (upcoming) {
      const shape = gameType === 'note'
        ? noteMarkers(upcoming.note)
        : chordMarkers(upcoming.chordId);
      shape.forEach(m => drawStaticMarker(cctx, g, m, viewStart, 0.85));
    }

    drawCatchZone(cctx, g);
    drawLabels(cctx, g, active);

    if (clickHint) {
      cctx.fillStyle = 'rgba(79,217,232,0.2)';
      cctx.strokeStyle = '#4fd9e8';
      cctx.lineWidth = 2;
      const cx = g.courseCenterX(clickHint.course);
      const cy = clickHint.atCatch ? g.catchY : g.rowY(clickHint.fret, viewStart);
      cctx.beginPath();
      cctx.arc(cx, cy, 18, 0, Math.PI * 2);
      cctx.fill();
      cctx.stroke();
    }

    if (countIn > 0) {
      cctx.fillStyle = 'rgba(0,0,0,0.55)';
      cctx.fillRect(w * 0.35, h * 0.32, w * 0.3, 64);
      cctx.fillStyle = '#f0cc74';
      cctx.font = '900 44px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(String(countIn), w / 2, h * 0.38);
    }

    for (const tg of targets) {
      const timeToHit = tg.t - tNow;
      if (timeToHit < -0.4) continue;
      const maxTravel = g.catchY - g.nutY + 60;
      if (timeToHit * pxPerSec > maxTravel) continue;
      const markers = gameType === 'note'
        ? noteMarkers(tg.note)
        : chordMarkers(tg.chordId);
      markers.forEach(m => drawApproachMarker(cctx, g, m, timeToHit, pxPerSec, tg.status));
    }

    return g;
  }

  function hitTest(x, y, w, h) {
    const g = lastGeom || geom(w, h);
    const viewStart = lastViewStart;
    if (x < g.padL || x > g.padL + g.courseW * PAIRS) return null;

    let course = Math.floor((x - g.padL) / g.courseW);
    course = Math.max(0, Math.min(PAIRS - 1, course));

    if (y >= g.catchTop && y <= g.catchBot) {
      return {
        course,
        fret: null,
        atCatch: true,
        stringNum: course + 1,
        name: STRING_HE[course],
        text: `אזור תפיסה · מיתר ${course + 1} (${STRING_HE[course]})`,
      };
    }

    if (y < g.nutY - g.frH || y > g.gridBot) return null;

    let fret = 0;
    if (y >= g.nutY) {
      const rel = (y - g.nutY) / g.frH + 0.5;
      fret = Math.round(viewStart + rel);
      if (fret < 1) fret = 1;
    }

    return {
      course,
      fret,
      atCatch: false,
      stringNum: course + 1,
      name: STRING_HE[course],
      text: Fretboard.pressText(course, fret),
    };
  }

  function catchPoint(course) {
    const g = lastGeom;
    if (!g) return null;
    return { x: g.courseCenterX(course), y: g.catchY };
  }

  return {
    geom, drawFrame, hitTest, catchPoint, activeCoursesForTarget, upcomingCaption,
    calcViewStart, targetViewStart, noteMarkers, chordMarkers,
    STRING_HE, NUM_FRETS, PAIRS,
  };
})();
