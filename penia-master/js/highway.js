/* כביש בוזוקי — מיתרים אופקיים, סריגים אנכיים, תווים זזים לקו */
const Highway = (() => {
  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];
  const STRING_COLORS = ['#5ec8e8', '#e8c85e', '#c88ee8', '#e3b341'];
  const NUM_FRETS = 5;
  const HIT_X_RATIO = 0.26;

  function positionForFret(fret) {
    if (fret <= 5) return 0;
    return Math.max(0, Math.min(fret - 3, 12 - NUM_FRETS));
  }

  function geom(w, h) {
    const capH = Math.min(36, h * 0.14);
    const neckTop = capH + 6;
    const neckBot = h - 14;
    const strGap = (neckBot - neckTop) / 3;
    const strY = si => neckTop + si * strGap;
    const hitX = w * HIT_X_RATIO;
    const fretW = Math.min(w * 0.105, 72);
    const nutX = hitX;

    function fretX(fret, posStart) {
      if (fret === 0) return nutX;
      return nutX + (fret - posStart - 0.5) * fretW;
    }

    return { w, h, capH, neckTop, neckBot, strGap, strY, hitX, fretW, nutX, fretX };
  }

  function drawWood(cctx, g) {
    const grd = cctx.createLinearGradient(0, g.neckTop, 0, g.neckBot);
    grd.addColorStop(0, '#5c4030');
    grd.addColorStop(0.35, '#7a5238');
    grd.addColorStop(0.65, '#6b4528');
    grd.addColorStop(1, '#4a3020');
    cctx.fillStyle = grd;
    cctx.fillRect(0, g.neckTop - 4, g.w, g.neckBot - g.neckTop + 8);

    /* תבנית עץ */
    cctx.strokeStyle = 'rgba(0,0,0,0.06)';
    cctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const y = g.neckTop + (g.neckBot - g.neckTop) * (i / 12);
      cctx.beginPath();
      cctx.moveTo(0, y);
      cctx.lineTo(g.w, y + 3);
      cctx.stroke();
    }
  }

  function drawFrets(cctx, g, posStart) {
    /* נוט */
    cctx.strokeStyle = '#e8dcc8';
    cctx.lineWidth = 5;
    cctx.beginPath();
    cctx.moveTo(g.nutX, g.neckTop - 2);
    cctx.lineTo(g.nutX, g.neckBot + 2);
    cctx.stroke();

    for (let f = 1; f <= NUM_FRETS + 2; f++) {
      const x = g.nutX + (f - 0.5) * g.fretW;
      if (x > g.w + 10) break;
      cctx.strokeStyle = 'rgba(180,190,200,0.75)';
      cctx.lineWidth = 2.5;
      cctx.beginPath();
      cctx.moveTo(x, g.neckTop - 2);
      cctx.lineTo(x, g.neckBot + 2);
      cctx.stroke();

      const label = posStart + f;
      cctx.fillStyle = '#f0cc74';
      cctx.font = '800 13px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'bottom';
      cctx.fillText(String(label), x, g.neckTop - 6);
    }
  }

  function drawStrings(cctx, g, activeStrings) {
    const active = activeStrings ? new Set(activeStrings) : null;
    for (let s = 0; s < 4; s++) {
      const y = g.strY(s);
      const isOn = !active || active.has(s);
      cctx.strokeStyle = isOn
        ? (s === 3 ? 'rgba(255,220,120,0.95)' : 'rgba(220,230,240,0.7)')
        : 'rgba(120,140,160,0.3)';
      cctx.lineWidth = isOn ? (s === 3 ? 2.5 : 1.8) : 1;
      cctx.beginPath();
      cctx.moveTo(0, y);
      cctx.lineTo(g.w, y);
      cctx.stroke();
    }
  }

  function drawHitLine(cctx, g, pulse) {
    const p = 0.5 + 0.5 * Math.sin(pulse / 160);
    cctx.shadowColor = '#4fd9e8';
    cctx.shadowBlur = 14 + p * 16;
    cctx.strokeStyle = `rgba(79,217,232,${0.65 + p * 0.35})`;
    cctx.lineWidth = 3 + p * 2;
    cctx.beginPath();
    cctx.moveTo(g.hitX, g.neckTop - 8);
    cctx.lineTo(g.hitX, g.neckBot + 8);
    cctx.stroke();
    cctx.shadowBlur = 0;
  }

  function drawReceptors(cctx, g, activeStrings, upcoming) {
    for (let s = 0; s < 4; s++) {
      const y = g.strY(s);
      const isActive = activeStrings && activeStrings.has(s);
      const r = isActive ? 13 : 8;
      cctx.beginPath();
      cctx.arc(g.hitX, y, r, 0, Math.PI * 2);
      cctx.fillStyle = isActive ? 'rgba(79,217,232,0.2)' : 'rgba(20,30,45,0.5)';
      cctx.fill();
      cctx.strokeStyle = isActive ? '#4fd9e8' : 'rgba(100,130,160,0.4)';
      cctx.lineWidth = isActive ? 2.5 : 1;
      cctx.stroke();
    }

    cctx.fillStyle = '#8fa6bc';
    cctx.font = '700 10px Heebo, sans-serif';
    cctx.textAlign = 'right';
    cctx.textBaseline = 'middle';
    for (let s = 0; s < 4; s++) {
      cctx.fillStyle = s === 3 ? '#e3b341' : '#8fa6bc';
      cctx.fillText(`מ${s + 1}·${STRING_HE[s]}`, g.hitX - 14, g.strY(s));
    }

    if (upcoming?.text) {
      cctx.fillStyle = '#f0cc74';
      cctx.font = '800 15px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(upcoming.text, g.w * 0.55, g.capH * 0.55);
    }
  }

  function gemColor(status, base) {
    if (status === 'wrong' || status === 'miss') return '#d96459';
    if (status === 'perfect' || status === 'good') return 'rgba(227,179,65,0.35)';
    return base;
  }

  function drawGem(cctx, x, y, r, color, label, status, glow) {
    let alpha = 1;
    if (status === 'perfect' || status === 'good') alpha = 0.25;
    cctx.save();
    cctx.globalAlpha = alpha;
    if (glow && !status) {
      cctx.shadowColor = color;
      cctx.shadowBlur = 18;
    }
    cctx.beginPath();
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fillStyle = color;
    cctx.fill();
    cctx.strokeStyle = '#fff';
    cctx.lineWidth = 2;
    cctx.stroke();
    if (label) {
      cctx.shadowBlur = 0;
      cctx.fillStyle = '#1a1408';
      cctx.font = `900 ${r > 9 ? 13 : 10}px Heebo, sans-serif`;
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(label, x, y);
    }
    cctx.restore();
  }

  /* תו יורד לאורך מיתר — x זז מימין לקו */
  function drawNoteGem(cctx, g, scrollX, note, posStart, status) {
    const si = 3;
    const y = g.strY(si);
    const x = g.hitX + scrollX;
    const col = gemColor(status, STRING_COLORS[si]);
    const label = note.fret === 0 ? '○' : String(note.fret);
    drawGem(cctx, x, y, 14, col, label, status, true);
    if (!status && note.label) {
      cctx.fillStyle = '#f0cc74';
      cctx.font = '700 10px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.fillText(note.label || note.solfege, x, y - 20);
    }
    return { x, y };
  }

  function drawChordGems(cctx, g, scrollX, chordId, posStart, status) {
    const ch = getChord(chordId);
    if (!ch) return { x: g.hitX, y: g.strY(1) };
    let first = null;
    ch.shape.forEach((f, si) => {
      const y = g.strY(si);
      const x = g.hitX + scrollX;
      const col = gemColor(status, STRING_COLORS[si]);
      if (f === 'x') {
        cctx.fillStyle = '#d96459';
        cctx.font = '800 14px Heebo, sans-serif';
        cctx.textAlign = 'center';
        cctx.fillText('×', x, y - 16);
      } else if (f === 0) {
        drawGem(cctx, x, y, 9, gemColor(status, '#5fc88f'), '○', status, false);
      } else {
        drawGem(cctx, x, y, 12, col, String(f), status, true);
      }
      if (!first) first = { x, y };
    });
    return first || { x: g.hitX, y: g.strY(1) };
  }

  function drawMuteMarkers(cctx, g, scrollX, chordId, status) {
    const ch = getChord(chordId);
    if (!ch || status) return;
    ch.shape.forEach((f, si) => {
      if (f !== 'x') return;
      const x = g.hitX + scrollX;
      const y = g.strY(si);
      cctx.fillStyle = '#d96459';
      cctx.font = '800 16px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText('×', x, y);
    });
  }

  function activeStringsForTarget(tg, gameType) {
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
      if (n.fret === 0) return `${n.label || n.solfege}  ·  מיתר רה — פתוח ○`;
      return `${n.label || n.solfege}  ·  סריג ${n.fret}  ·  מיתר רה (${STRING_HE[3]})`;
    }
    return `${tg.chordId}  ·  ${LearnGraph.shapeHint(tg.chordId)}`;
  }

  function drawFrame(cctx, opts) {
    const { w, h, tNow, pxPerSec, posStart, gameType, targets, upcoming, pulse, countIn } = opts;
    const g = geom(w, h);

    cctx.fillStyle = '#0a1218';
    cctx.fillRect(0, 0, w, h);

    drawWood(cctx, g);
    drawFrets(cctx, g, posStart);
    const activeStr = upcoming ? activeStringsForTarget(upcoming, gameType) : null;
    drawStrings(cctx, g, activeStr);
    drawHitLine(cctx, g, pulse);
    drawReceptors(cctx, g, activeStr, {
      text: upcoming ? upcomingCaption(upcoming, gameType) : '',
    });

    if (countIn > 0) {
      cctx.fillStyle = '#f0cc74';
      cctx.font = '900 48px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.fillText(String(countIn), w / 2, h * 0.5);
    }

    for (const tg of targets) {
      const scrollX = (tg.t - tNow) * pxPerSec;
      if (scrollX < -80 || scrollX > w - g.hitX + 40) continue;
      if (gameType === 'note') {
        drawNoteGem(cctx, g, scrollX, tg.note, posStart, tg.status);
      } else {
        drawChordGems(cctx, g, scrollX, tg.chordId, posStart, tg.status);
      }
    }

    return g;
  }

  return {
    geom, drawFrame, activeStringsForTarget, upcomingCaption, positionForFret,
    HIT_X_RATIO, STRING_HE, NUM_FRETS,
  };
})();
