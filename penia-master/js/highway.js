/* גרף בוזוקי — מיתרים + סריגים, מתקדם לפי מיקום על הצוואר */
const Highway = (() => {
  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];
  const STRING_COLORS = ['#4ec8e8', '#e8c85e', '#c88ee8', '#e3b341'];
  const VISIBLE_FRETS = 7;
  const HIT_X_RATIO = 0.22;

  function positionForFret(fret) {
    if (fret <= 0) return 0;
    if (fret <= VISIBLE_FRETS - 1) return 0;
    return Math.min(fret - 2, 12 - VISIBLE_FRETS + 1);
  }

  function geom(w, h) {
    const capH = Math.min(32, h * 0.12);
    const neckTop = capH + 4;
    const neckBot = h - 10;
    const strGap = (neckBot - neckTop) / 3;
    const strY = si => neckTop + si * strGap;
    const hitX = w * HIT_X_RATIO;
    const fretW = Math.max(36, Math.min(w * 0.11, 64));

    function columnX(fret, viewStart) {
      return hitX + (fret - viewStart) * fretW;
    }

    return { w, h, capH, neckTop, neckBot, strGap, strY, hitX, fretW, columnX };
  }

  function drawWood(cctx, g) {
    const grd = cctx.createLinearGradient(0, g.neckTop, 0, g.neckBot);
    grd.addColorStop(0, '#6b4a32');
    grd.addColorStop(0.5, '#8b6244');
    grd.addColorStop(1, '#5a3824');
    cctx.fillStyle = grd;
    cctx.fillRect(0, g.neckTop - 6, g.w, g.neckBot - g.neckTop + 12);
  }

  function drawFretGrid(cctx, g, viewStart) {
    const p = 0.5 + 0.5 * Math.sin(performance.now() / 160);
    cctx.shadowColor = '#4fd9e8';
    cctx.shadowBlur = 12 + p * 10;
    cctx.strokeStyle = `rgba(79,217,232,${0.75 + p * 0.25})`;
    cctx.lineWidth = 3;
    cctx.beginPath();
    cctx.moveTo(g.hitX, g.neckTop - 10);
    cctx.lineTo(g.hitX, g.neckBot + 10);
    cctx.stroke();
    cctx.shadowBlur = 0;

    if (viewStart > 0) {
      cctx.strokeStyle = '#b8c4d0';
      cctx.lineWidth = 4;
      cctx.beginPath();
      cctx.moveTo(g.hitX - 3, g.neckTop - 8);
      cctx.lineTo(g.hitX - 3, g.neckBot + 8);
      cctx.stroke();
      cctx.fillStyle = '#e3b341';
      cctx.font = '900 12px Heebo, sans-serif';
      cctx.textAlign = 'right';
      cctx.textBaseline = 'top';
      cctx.fillText(String(viewStart), g.hitX - 8, g.neckTop - 8);
    } else {
      cctx.strokeStyle = '#f0e8d8';
      cctx.lineWidth = 5;
      cctx.beginPath();
      cctx.moveTo(g.hitX, g.neckTop - 8);
      cctx.lineTo(g.hitX, g.neckBot + 8);
      cctx.stroke();
    }

    for (let fi = -2; fi <= VISIBLE_FRETS + 2; fi++) {
      const fretNum = viewStart + fi;
      if (fretNum < 0) continue;
      const x = g.hitX + fi * g.fretW;
      if (x < -20) continue;
      if (x > g.w + 20) break;
      cctx.strokeStyle = 'rgba(190,200,210,0.7)';
      cctx.lineWidth = fi === 0 && viewStart === 0 ? 0 : 2;
      if (cctx.lineWidth > 0) {
        cctx.beginPath();
        cctx.moveTo(x, g.neckTop - 4);
        cctx.lineTo(x, g.neckBot + 4);
        cctx.stroke();
      }
      if (fi > 0 || viewStart > 0) {
        cctx.fillStyle = '#f0cc74';
        cctx.font = '800 12px Heebo, sans-serif';
        cctx.textAlign = 'center';
        cctx.textBaseline = 'bottom';
        cctx.fillText(String(fretNum), x - g.fretW * 0.5, g.neckTop - 8);
      }
      if ([3, 5, 7, 9, 12].includes(fretNum) && fi > 0) {
        const dotY = (g.neckTop + g.neckBot) / 2;
        cctx.fillStyle = 'rgba(0,0,0,0.45)';
        cctx.beginPath();
        cctx.arc(x - g.fretW * 0.5, dotY, 4, 0, Math.PI * 2);
        cctx.fill();
      }
    }
  }

  function drawStrings(cctx, g, activeStrings) {
    const active = activeStrings ? new Set(activeStrings) : null;
    for (let s = 0; s < 4; s++) {
      const y = g.strY(s);
      const on = !active || active.has(s);
      cctx.strokeStyle = on
        ? (s === 3 ? 'rgba(255,230,140,0.95)' : 'rgba(230,238,248,0.75)')
        : 'rgba(100,120,140,0.25)';
      cctx.lineWidth = on ? (s === 3 ? 2.4 : 1.6) : 0.8;
      cctx.beginPath();
      cctx.moveTo(0, y);
      cctx.lineTo(g.w, y);
      cctx.stroke();
    }
  }

  function drawStringLabels(cctx, g) {
    cctx.font = '700 10px Heebo, sans-serif';
    cctx.textAlign = 'left';
    cctx.textBaseline = 'middle';
    for (let s = 0; s < 4; s++) {
      cctx.fillStyle = s === 3 ? '#e3b341' : '#8fa6bc';
      cctx.fillText(`מיתר ${s + 1} · ${STRING_HE[s]}`, 6, g.strY(s));
    }
  }

  function drawReceptors(cctx, g, markers, viewStart) {
    if (!markers) return;
    markers.forEach(m => {
      if (m.fret === 'x') return;
      const y = g.strY(m.stringIdx);
      const x = g.columnX(m.fret === 0 ? 0 : m.fret, viewStart);
      cctx.beginPath();
      cctx.arc(x, y, 10, 0, Math.PI * 2);
      cctx.strokeStyle = 'rgba(79,217,232,0.5)';
      cctx.lineWidth = 2;
      cctx.stroke();
    });
  }

  function gemColor(status, base) {
    if (status === 'wrong' || status === 'miss') return '#d96459';
    if (status === 'perfect' || status === 'good') return 'rgba(227,179,65,0.3)';
    return base;
  }

  function drawGem(cctx, x, y, r, color, label, status, glow) {
    if (x < -30 || x > cctx.canvas.width / (window.devicePixelRatio || 1) + 30) return;
    let alpha = 1;
    if (status === 'perfect' || status === 'good') alpha = 0.22;
    cctx.save();
    cctx.globalAlpha = alpha;
    if (glow && !status) {
      cctx.shadowColor = color;
      cctx.shadowBlur = 16;
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
      cctx.fillStyle = '#1a1008';
      cctx.font = `900 ${r > 10 ? 12 : 10}px Heebo, sans-serif`;
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(label, x, y);
    }
    cctx.restore();
  }

  function noteMarkers(note) {
    return [{ stringIdx: 3, fret: note.fret, label: note.label || note.solfege }];
  }

  function chordMarkers(chordId) {
    const ch = getChord(chordId);
    if (!ch) return [];
    return ch.shape.map((f, stringIdx) => ({ stringIdx, fret: f, label: '' }));
  }

  function gemPos(g, fret, stringIdx, viewStart, timeToHit, pxPerSec) {
    const y = g.strY(stringIdx);
    const f = fret === 'x' ? 0 : fret;
    const colX = g.columnX(typeof f === 'number' ? f : 0, viewStart);
    const x = colX + timeToHit * pxPerSec;
    return { x, y };
  }

  function drawMarkers(cctx, g, markers, viewStart, timeToHit, pxPerSec, status) {
    markers.forEach(m => {
      if (m.fret === 'x') {
        const { x, y } = gemPos(g, 0, m.stringIdx, viewStart, timeToHit, pxPerSec);
        cctx.fillStyle = '#d96459';
        cctx.font = '800 15px Heebo, sans-serif';
        cctx.textAlign = 'center';
        cctx.textBaseline = 'bottom';
        cctx.fillText('×', x, y - 14);
        return;
      }
      const { x, y } = gemPos(g, m.fret, m.stringIdx, viewStart, timeToHit, pxPerSec);
      const col = gemColor(status, STRING_COLORS[m.stringIdx]);
      if (m.fret === 0) {
        drawGem(cctx, x, y, 10, gemColor(status, '#5fc88f'), '○', status, true);
      } else {
        drawGem(cctx, x, y, 13, col, String(m.fret), status, true);
      }
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
      if (n.fret === 0) return `${n.label || n.solfege} · מיתר 4 רה — פתוח ○`;
      return `${n.label || n.solfege} · סריג ${n.fret} · מיתר 4 (${STRING_HE[3]})`;
    }
    return `${tg.chordId} · ${LearnGraph.shapeHint(tg.chordId)}`;
  }

  function targetViewStart(targets, tNow, gameType) {
    let best = null, bestDt = Infinity;
    targets.forEach(tg => {
      if (tg.status) return;
      const dt = tg.t - tNow;
      if (dt >= -0.2 && dt < bestDt) { bestDt = dt; best = tg; }
    });
    if (!best) return 0;
    if (gameType === 'note') return Math.max(0, best.note.fret);
    const ch = getChord(best.chordId);
    if (!ch) return 0;
    const frets = ch.shape.filter(f => typeof f === 'number' && f > 0);
    return frets.length ? Math.min(...frets) : 0;
  }

  function drawFrame(cctx, opts) {
    const { w, h, tNow, pxPerSec, viewStart, gameType, targets, upcoming, countIn } = opts;
    const g = geom(w, h);

    cctx.fillStyle = '#0c141c';
    cctx.fillRect(0, 0, w, h);

    drawWood(cctx, g);
    drawFretGrid(cctx, g, viewStart);
    const activeStr = upcoming ? activeStringsForTarget(upcoming, gameType) : null;
    drawStrings(cctx, g, activeStr);
    drawStringLabels(cctx, g);

    if (upcoming) {
      const cap = upcomingCaption(upcoming, gameType);
      cctx.fillStyle = '#f0cc74';
      cctx.font = '800 14px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(cap, w * 0.58, g.capH * 0.55);
      const preview = gameType === 'note'
        ? noteMarkers(upcoming.note)
        : chordMarkers(upcoming.chordId);
      drawReceptors(cctx, g, preview.map(m => ({ ...m, fret: m.fret === 'x' ? 0 : m.fret })), viewStart);
    }

    if (countIn > 0) {
      cctx.fillStyle = 'rgba(8,15,24,0.55)';
      cctx.fillRect(w * 0.38, h * 0.38, w * 0.24, 64);
      cctx.fillStyle = '#f0cc74';
      cctx.font = '900 44px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.fillText(String(countIn), w / 2, h * 0.44);
    }

    for (const tg of targets) {
      const timeToHit = tg.t - tNow;
      if (timeToHit < -0.3 || timeToHit * pxPerSec > w - g.hitX + 80) continue;
      const markers = gameType === 'note'
        ? noteMarkers(tg.note)
        : chordMarkers(tg.chordId);
      drawMarkers(cctx, g, markers, viewStart, timeToHit, pxPerSec, tg.status);
    }

    return g;
  }

  return {
    geom, drawFrame, activeStringsForTarget, upcomingCaption,
    positionForFret, targetViewStart, noteMarkers, chordMarkers,
    HIT_X_RATIO, STRING_HE, VISIBLE_FRETS,
  };
})();
