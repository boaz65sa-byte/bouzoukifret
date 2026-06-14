/* גרף בוזוקי — סגנון PLAY GUITAR: גוף+חור סאונד משמאל, סריגים מימין, 8 מיתרים */

const Highway = (() => {

  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];

  const NUM_FRETS = 6;

  const PAIRS = 4;

  const LOOKAHEAD = 4.5;

  let lastGeom = null;

  let lastViewStart = 0;



  function calcViewStart(markers) {

    const frets = markers

      .filter(m => m.fret !== 'x' && typeof m.fret === 'number' && m.fret > 0)

      .map(m => m.fret);

    if (!frets.length) return 0;

    if (Math.max(...frets) <= NUM_FRETS) return 0;

    return Math.max(0, Math.min(...frets) - 1);

  }



  function geom(w, h) {

    const padT = Math.min(28, h * 0.12);

    const padB = Math.min(10, h * 0.05);

    const bodyW = Math.max(72, w * 0.3);

    const hitX = bodyW + 6;

    const nutX = hitX + 5;

    const gridRight = w - 6;

    const gridW = gridRight - nutX;

    const frW = gridW / NUM_FRETS;

    const gridH = Math.max(88, Math.min(h - padT - padB, h * 0.78));

    const gridTop = padT + 4;

    const gridBot = gridTop + gridH;

    const courseStep = gridH / 3.1;

    const pairGap = Math.min(6, courseStep * 0.2);

    const soundCX = bodyW * 0.52;

    const soundCY = (gridTop + gridBot) / 2;

    const soundR = Math.min(bodyW * 0.28, gridH * 0.36);



    function stringCenterY(course) {

      return gridTop + course * courseStep + courseStep * 0.42;

    }



    function stringY(course, side) {

      const cy = stringCenterY(course);

      return cy - pairGap / 2 + side * pairGap;

    }



    function columnX(fret, viewStart) {

      if (fret === 0) return hitX - frW * 0.15;

      return nutX + (fret - viewStart - 0.5) * frW;

    }



    function fretWireX(fi) { return nutX + fi * frW; }



    return {

      w, h, padT, padB, bodyW, hitX, nutX, gridTop, gridBot, gridH, gridW, gridRight,

      frW, courseStep, pairGap, soundCX, soundCY, soundR,

      stringCenterY, stringY, columnX, fretWireX,

      catchX: hitX, catchLeft: hitX - 8, catchRight: bodyW,

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



  function drawBackground(cctx, g) {

    const bg = cctx.createLinearGradient(0, 0, g.w, g.h);

    bg.addColorStop(0, '#0a1218');

    bg.addColorStop(0.5, '#101820');

    bg.addColorStop(1, '#080e14');

    cctx.fillStyle = bg;

    cctx.fillRect(0, 0, g.w, g.h);



    cctx.strokeStyle = 'rgba(180,190,200,0.25)';

    cctx.lineWidth = 1.5;

    roundRect(cctx, 2, 2, g.w - 4, g.h - 4, 10);

    cctx.stroke();

  }



  function drawBody(cctx, g) {

    const y = g.gridTop - 6;

    const h = g.gridH + 12;

    const top = cctx.createLinearGradient(0, y, g.bodyW, y + h);

    top.addColorStop(0, '#1a6878');

    top.addColorStop(0.35, '#2a98a8');

    top.addColorStop(0.7, '#1e7888');

    top.addColorStop(1, '#145868');

    roundRect(cctx, 4, y, g.bodyW - 2, h, 6);

    cctx.fillStyle = top;

    cctx.fill();



    const glow = cctx.createRadialGradient(g.soundCX, g.soundCY, 4, g.soundCX, g.soundCY, g.soundR * 2.2);

    glow.addColorStop(0, 'rgba(80,220,240,0.35)');

    glow.addColorStop(0.5, 'rgba(40,160,190,0.12)');

    glow.addColorStop(1, 'rgba(0,0,0,0)');

    cctx.fillStyle = glow;

    cctx.fillRect(4, y, g.bodyW, h);



    for (let i = 0; i < 8; i++) {

      cctx.strokeStyle = 'rgba(255,255,255,0.04)';

      cctx.beginPath();

      cctx.moveTo(8, y + (h * i) / 8);

      cctx.lineTo(g.bodyW - 4, y + (h * (i + 1)) / 8);

      cctx.stroke();

    }

  }



  function drawRosette(cctx, g) {

    const { soundCX: cx, soundCY: cy, soundR: R } = g;

    cctx.save();

    cctx.beginPath();

    cctx.arc(cx, cy, R + 8, 0, Math.PI * 2);

    cctx.fillStyle = '#1a2830';

    cctx.fill();



    for (let ring = 0; ring < 5; ring++) {

      const r = R * (0.35 + ring * 0.14);

      cctx.beginPath();

      cctx.arc(cx, cy, r, 0, Math.PI * 2);

      cctx.strokeStyle = ring % 2 ? '#e8eef2' : '#8898a8';

      cctx.lineWidth = ring === 0 ? 2 : 1.2;

      cctx.stroke();

    }



    for (let i = 0; i < 12; i++) {

      const a = (i / 12) * Math.PI * 2;

      cctx.beginPath();

      cctx.moveTo(cx + Math.cos(a) * R * 0.4, cy + Math.sin(a) * R * 0.4);

      cctx.lineTo(cx + Math.cos(a) * R * 0.85, cy + Math.sin(a) * R * 0.85);

      cctx.strokeStyle = 'rgba(200,210,220,0.5)';

      cctx.lineWidth = 1;

      cctx.stroke();

    }



    const hole = cctx.createRadialGradient(cx, cy, 2, cx, cy, R * 0.32);

    hole.addColorStop(0, '#080c10');

    hole.addColorStop(1, '#141c24');

    cctx.beginPath();

    cctx.arc(cx, cy, R * 0.32, 0, Math.PI * 2);

    cctx.fillStyle = hole;

    cctx.fill();

    cctx.restore();

  }



  function drawHitZone(cctx, g) {

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 220);

    const gx = g.hitX - 18;

    const gw = 36;

    const grd = cctx.createLinearGradient(gx, 0, gx + gw, 0);

    grd.addColorStop(0, 'rgba(40,200,220,0)');

    grd.addColorStop(0.5, `rgba(60,220,240,${0.15 + pulse * 0.2})`);

    grd.addColorStop(1, 'rgba(40,200,220,0)');

    cctx.fillStyle = grd;

    cctx.fillRect(gx, g.gridTop - 4, gw, g.gridH + 8);



    cctx.strokeStyle = `rgba(240,200,100,${0.55 + pulse * 0.35})`;

    cctx.lineWidth = 2;

    cctx.beginPath();

    cctx.moveTo(g.hitX, g.gridTop - 6);

    cctx.lineTo(g.hitX, g.gridBot + 6);

    cctx.stroke();



    for (let c = 0; c < PAIRS; c++) {

      const cy = g.stringCenterY(c);

      cctx.save();

      cctx.shadowColor = '#e8c040';

      cctx.shadowBlur = 8 + pulse * 6;

      cctx.fillStyle = '#d4a830';

      cctx.strokeStyle = '#fff0a0';

      cctx.lineWidth = 1.5;

      cctx.beginPath();

      cctx.moveTo(g.hitX, cy - 7);

      cctx.lineTo(g.hitX + 8, cy);

      cctx.lineTo(g.hitX, cy + 7);

      cctx.lineTo(g.hitX - 8, cy);

      cctx.closePath();

      cctx.fill();

      cctx.stroke();

      cctx.restore();

    }

  }



  function drawFretboard(cctx, g) {

    const x = g.nutX - 3;

    const y = g.gridTop - 5;

    const w = g.gridRight - x + 3;

    const h = g.gridH + 10;

    const wood = cctx.createLinearGradient(x, y, x + w, y);

    wood.addColorStop(0, '#2a1810');

    wood.addColorStop(0.4, '#3d2818');

    wood.addColorStop(1, '#2a1810');

    roundRect(cctx, x, y, w, h, 3);

    cctx.fillStyle = wood;

    cctx.fill();

    cctx.strokeStyle = 'rgba(0,0,0,0.4)';

    cctx.lineWidth = 1;

    cctx.stroke();

  }



  function drawNut(cctx, g, viewStart) {

    cctx.fillStyle = viewStart > 0 ? '#b8c4d0' : '#f0e8d8';

    cctx.fillRect(g.nutX - 2, g.gridTop - 2, 3, g.gridH + 4);

  }



  function drawFretWire(cctx, g, x) {

    const grd = cctx.createLinearGradient(x - 1, 0, x + 1, 0);

    grd.addColorStop(0, '#505860');

    grd.addColorStop(0.5, '#e8ecf0');

    grd.addColorStop(1, '#505860');

    cctx.strokeStyle = grd;

    cctx.lineWidth = 2.2;

    cctx.beginPath();

    cctx.moveTo(x, g.gridTop);

    cctx.lineTo(x, g.gridBot);

    cctx.stroke();

  }



  function drawFretDots(cctx, g, viewStart) {

    for (let f = 1; f <= NUM_FRETS; f++) {

      const label = viewStart + f;

      const x = g.fretWireX(f) - g.frW * 0.5;

      if ([3, 5, 7, 12].includes(label)) {

        cctx.fillStyle = 'rgba(255,255,255,0.12)';

        cctx.beginPath();

        cctx.arc(x, (g.gridTop + g.gridBot) / 2, 3.5, 0, Math.PI * 2);

        cctx.fill();

      }

    }

  }



  function drawStringLine(cctx, x1, x2, y, lw, bright) {

    cctx.strokeStyle = bright ? 'rgba(240,245,250,0.92)' : 'rgba(180,190,200,0.55)';

    cctx.lineWidth = lw;

    cctx.beginPath();

    cctx.moveTo(x1, y);

    cctx.lineTo(x2, y);

    cctx.stroke();

    if (bright) {

      cctx.strokeStyle = 'rgba(255,255,255,0.25)';

      cctx.lineWidth = lw + 1.5;

      cctx.stroke();

    }

  }



  function drawStrings(cctx, g, activeCourses) {

    const active = activeCourses ? new Set(activeCourses) : null;

    const x1 = 8;

    const x2 = g.gridRight;

    for (let c = 0; c < PAIRS; c++) {

      const on = !active || active.has(c);

      const lw = 0.8 + c * 0.35;

      for (let s = 0; s < 2; s++) {

        drawStringLine(cctx, x1, x2, g.stringY(c, s), lw, on);

      }

    }

  }



  function fretColumnX(g, fret, viewStart) {

    if (fret === 0) return g.hitX - 4;

    return g.columnX(fret, viewStart);

  }



  function approachProgress(timeToHit) {

    return Math.max(0, Math.min(1, 1 - timeToHit / LOOKAHEAD));

  }



  function approachX(g, m, timeToHit, viewStart) {

    const fromX = fretColumnX(g, m.fret, viewStart);

    const t = approachProgress(timeToHit);

    return fromX + t * (g.hitX - fromX);

  }



  function drawGlowingNote(cctx, cx, cy, label, color, status, urgent) {

    const r = urgent ? 15 : 13;

    cctx.save();

    if (status === 'perfect' || status === 'good') cctx.globalAlpha = 0.25;

    else if (status === 'wrong' || status === 'miss') cctx.globalAlpha = 0.7;



    cctx.shadowColor = color;

    cctx.shadowBlur = urgent ? 22 : 14;



    cctx.beginPath();

    cctx.arc(cx, cy, r + 5, 0, Math.PI * 2);

    cctx.strokeStyle = color + '99';

    cctx.lineWidth = 2;

    cctx.stroke();



    const dot = cctx.createRadialGradient(cx - 2, cy - 3, 1, cx, cy, r);

    dot.addColorStop(0, '#ffffff');

    dot.addColorStop(0.35, color);

    dot.addColorStop(1, color + 'cc');

    cctx.beginPath();

    cctx.arc(cx, cy, r, 0, Math.PI * 2);

    cctx.fillStyle = dot;

    cctx.fill();



    if (label) {

      cctx.shadowBlur = 0;

      cctx.fillStyle = status === 'wrong' || status === 'miss' ? '#fff' : '#0a1820';

      cctx.font = `900 ${urgent ? 13 : 11}px Heebo, sans-serif`;

      cctx.textAlign = 'center';

      cctx.textBaseline = 'middle';

      cctx.fillText(label, cx, cy + 0.5);

    }

    cctx.restore();

  }



  function noteLabel(m, tg, gameType) {

    if (gameType === 'note') {

      const n = tg.note || {};

      return n.label || n.solfege || (m.fret === 0 ? '○' : String(m.fret));

    }

    if (m.label) return m.label;

    return m.fret === 0 ? '○' : String(m.fret);

  }



  function drawApproachMarker(cctx, g, m, timeToHit, viewStart, tg, gameType, status) {

    if (m.fret === 'x') return;

    const cy = g.stringCenterY(m.courseIdx);

    const cx = approachX(g, m, timeToHit, viewStart);

    const urgent = timeToHit < 0.5;

    const color = gameType === 'chord' ? '#e8c040' : '#40d8ff';

    const label = status === 'wrong' || status === 'miss' ? '!' : noteLabel(m, tg, gameType);

    drawGlowingNote(cctx, cx, cy, label, status === 'wrong' || status === 'miss' ? '#e85050' : color, status, urgent);

  }



  function drawStaticTarget(cctx, g, m, viewStart) {

    if (m.fret === 'x') return;

    const cx = fretColumnX(g, m.fret, viewStart);

    const cy = g.stringCenterY(m.courseIdx);

    if (cx < g.nutX - 20 && m.fret !== 0) return;

    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);

    cctx.strokeStyle = `rgba(64,216,255,${0.25 + pulse * 0.35})`;

    cctx.lineWidth = 2;

    cctx.beginPath();

    cctx.arc(cx, cy, 17 + pulse * 4, 0, Math.PI * 2);

    cctx.stroke();

  }



  function noteMarkers(note) {

    return [{ courseIdx: 3, fret: note.fret, label: note.label || note.solfege || '' }];

  }



  function chordMarkers(chordId) {

    const ch = getChord(chordId);

    if (!ch) return [];

    return ch.shape.map((f, i) => ({ courseIdx: i, fret: f, label: i === 0 ? chordId : '' }));

  }



  function activeCoursesForTarget(tg, gameType) {

    const set = new Set();

    if (gameType === 'note') set.add(3);

    else getChord(tg.chordId)?.shape.forEach((f, i) => { if (f !== 'x') set.add(i); });

    return set;

  }



  function upcomingCaption(tg, gameType) {

    if (!tg) return '';

    if (gameType === 'note') {

      const n = tg.note;

      if (n.fret === 0) return `${n.label || n.solfege} · מיתר 4 (רה) · פתוח`;

      return `${n.label || n.solfege} · סריג ${n.fret} · מיתר 4`;

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

    const markers = gameType === 'note' ? noteMarkers(best.note) : chordMarkers(best.chordId);

    return calcViewStart(markers);

  }



  function drawCaption(cctx, g, text) {

    cctx.fillStyle = 'rgba(0,0,0,0.35)';

    cctx.fillRect(0, 0, g.w, g.padT + 2);

    cctx.fillStyle = 'rgba(255,255,255,0.92)';

    cctx.font = `700 ${g.w < 300 ? 10 : 12}px Heebo, sans-serif`;

    cctx.textAlign = 'center';

    cctx.textBaseline = 'middle';

    cctx.fillText(text, g.w / 2, g.padT * 0.45);

  }



  function drawFrame(cctx, opts) {

    const { w, h, viewStart, gameType, targets, upcoming, countIn, clickHint, tNow } = opts;

    const g = geom(w, h);

    lastGeom = g;

    lastViewStart = viewStart;



    drawBackground(cctx, g);

    if (upcoming) drawCaption(cctx, g, upcomingCaption(upcoming, gameType));

    else drawCaption(cctx, g, 'בוזוקי · 8 מיתרים · גרף לרוחב');



    drawBody(cctx, g);

    drawRosette(cctx, g);

    drawFretboard(cctx, g);

    for (let f = 1; f <= NUM_FRETS; f++) drawFretWire(cctx, g, g.fretWireX(f));

    drawNut(cctx, g, viewStart);

    drawFretDots(cctx, g, viewStart);



    const active = upcoming ? [...activeCoursesForTarget(upcoming, gameType)] : null;

    drawStrings(cctx, g, active);

    drawHitZone(cctx, g);



    if (upcoming) {

      const shape = gameType === 'note' ? noteMarkers(upcoming.note) : chordMarkers(upcoming.chordId);

      shape.forEach(m => drawStaticTarget(cctx, g, m, viewStart));

    }



    if (clickHint) {

      const cx = clickHint.atCatch ? g.hitX : g.columnX(clickHint.fret || 0, viewStart);

      const cy = g.stringCenterY(clickHint.course);

      cctx.strokeStyle = '#40d8ff';

      cctx.lineWidth = 2.5;

      cctx.beginPath();

      cctx.arc(cx, cy, 16, 0, Math.PI * 2);

      cctx.stroke();

    }



    if (countIn > 0) {

      cctx.fillStyle = 'rgba(0,0,0,0.55)';

      roundRect(cctx, w * 0.38, h * 0.3, w * 0.24, 52, 8);

      cctx.fill();

      cctx.fillStyle = '#fff';

      cctx.font = '900 38px Heebo, sans-serif';

      cctx.textAlign = 'center';

      cctx.textBaseline = 'middle';

      cctx.fillText(String(countIn), w / 2, h * 0.36);

    }



    for (const tg of targets) {

      const timeToHit = tg.t - tNow;

      if (timeToHit < -0.45 || timeToHit > LOOKAHEAD + 0.35) continue;

      const markers = gameType === 'note' ? noteMarkers(tg.note) : chordMarkers(tg.chordId);

      markers.forEach(m => drawApproachMarker(cctx, g, m, timeToHit, viewStart, tg, gameType, tg.status));

    }



    return g;

  }



  function hitTest(x, y, w, h) {

    const g = lastGeom || geom(w, h);

    const viewStart = lastViewStart;

    if (y < g.gridTop - 10 || y > g.gridBot + 10) return null;



    let course = 0, bestDy = Infinity;

    for (let c = 0; c < PAIRS; c++) {

      const dy = Math.abs(y - g.stringCenterY(c));

      if (dy < bestDy) { bestDy = dy; course = c; }

    }

    if (bestDy > g.courseStep * 0.45) return null;



    if (x <= g.hitX + 14 && x >= 4) {

      return {

        course, fret: null, atCatch: true, stringNum: course + 1,

        name: STRING_HE[course],

        text: `נקודת נגינה · מיתר ${course + 1} (${STRING_HE[course]})`,

      };

    }

    if (x < g.nutX - 8 || x > g.gridRight + 10) return null;



    let fret = 0;

    if (x >= g.nutX) {

      fret = Math.round(viewStart + (x - g.nutX) / g.frW + 0.5);

      if (fret < 1) fret = 1;

    }

    return {

      course, fret, atCatch: false, stringNum: course + 1,

      name: STRING_HE[course], text: Fretboard.pressText(course, fret),

    };

  }



  function catchPoint(course) {

    const g = lastGeom;

    return g ? { x: g.hitX, y: g.stringCenterY(course) } : null;

  }



  return {

    geom, drawFrame, hitTest, catchPoint, activeCoursesForTarget, upcomingCaption,

    calcViewStart, targetViewStart, noteMarkers, chordMarkers,

    STRING_HE, NUM_FRETS, PAIRS,

  };

})();


