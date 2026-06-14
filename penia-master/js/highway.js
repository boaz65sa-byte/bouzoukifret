/* גרף בוזוקי — כמו אפליקציית גיטרה: גוף + לוח סריגים + נקודות צבע */
const Highway = (() => {
  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];
  const GEM_COLORS = ['#e878c8', '#f0b84a', '#5ec8e8', '#e3b341'];
  const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const VISIBLE_FRETS = 6;
  const BODY_RATIO = 0.28;

  function noteLabel(stringIdx, fret, fallback) {
    if (fallback) return fallback.length <= 2 ? fallback : fallback.charAt(0);
    if (typeof fret !== 'number') return '';
    const pc = (TUNING_MIDI[stringIdx] + fret) % 12;
    return PC_NAMES[pc];
  }

  function calcViewStart(markers) {
    const frets = markers
      .filter(m => m.fret !== 'x' && typeof m.fret === 'number' && m.fret > 0)
      .map(m => m.fret);
    if (!frets.length) return 0;
    const minF = Math.min(...frets);
    const maxF = Math.max(...frets);
    if (maxF <= VISIBLE_FRETS) return 0;
    return Math.max(0, minF - 1);
  }

  function geom(w, h) {
    const capH = Math.min(28, h * 0.1);
    const neckTop = capH + 8;
    const neckBot = h - 12;
    const strGap = (neckBot - neckTop) / 3;
    const strY = si => neckTop + si * strGap;
    const bodyW = w * BODY_RATIO;
    const nutX = bodyW;
    const cy = (neckTop + neckBot) / 2;
    const fretW = Math.max(34, Math.min((w - bodyW) / (VISIBLE_FRETS + 1), 58));

    function dotX(fret, viewStart) {
      if (fret === 'x') return nutX;
      if (fret === 0) {
        if (viewStart === 0) return nutX - fretW * 0.14;
        return nutX + (0 - viewStart - 0.5) * fretW;
      }
      return nutX + (fret - viewStart - 0.5) * fretW;
    }

    function fretWireX(fi, viewStart) {
      return nutX + (viewStart + fi) * fretW;
    }

    return { w, h, capH, neckTop, neckBot, strGap, strY, bodyW, nutX, cy, fretW, dotX, fretWireX };
  }

  function drawWood(cctx, g) {
    const grd = cctx.createLinearGradient(0, g.neckTop, 0, g.neckBot);
    grd.addColorStop(0, '#7a5238');
    grd.addColorStop(0.45, '#9a6848');
    grd.addColorStop(1, '#6b4428');
    cctx.fillStyle = grd;
    cctx.fillRect(g.bodyW - 4, g.neckTop - 8, g.w - g.bodyW + 8, g.neckBot - g.neckTop + 16);

    cctx.strokeStyle = 'rgba(0,0,0,0.07)';
    cctx.lineWidth = 1;
    for (let i = 0; i < 14; i++) {
      const y = g.neckTop + (g.neckBot - g.neckTop) * (i / 14);
      cctx.beginPath();
      cctx.moveTo(g.bodyW, y);
      cctx.lineTo(g.w, y + 2);
      cctx.stroke();
    }
  }

  function drawSoundhole(cctx, g) {
    const cx = g.bodyW * 0.48;
    const r = Math.min(g.bodyW * 0.42, (g.neckBot - g.neckTop) * 0.72);

    cctx.save();
    cctx.beginPath();
    cctx.arc(cx, g.cy, r + 14, 0, Math.PI * 2);
    cctx.fillStyle = '#3d2818';
    cctx.fill();

    for (let ring = 0; ring < 5; ring++) {
      const rr = r + 10 - ring * 2.2;
      cctx.beginPath();
      cctx.arc(cx, g.cy, rr, 0, Math.PI * 2);
      cctx.strokeStyle = ring % 2 ? '#c9a86c' : '#8b6914';
      cctx.lineWidth = ring === 0 ? 3 : 1.5;
      cctx.stroke();
    }

    cctx.beginPath();
    cctx.arc(cx, g.cy, r * 0.88, 0, Math.PI * 2);
    cctx.fillStyle = '#0a0806';
    cctx.fill();
    cctx.restore();
  }

  function drawFretGrid(cctx, g, viewStart) {
    if (viewStart > 0) {
      cctx.strokeStyle = '#c8d4e0';
      cctx.lineWidth = 4;
      cctx.beginPath();
      cctx.moveTo(g.nutX, g.neckTop - 6);
      cctx.lineTo(g.nutX, g.neckBot + 6);
      cctx.stroke();
      cctx.fillStyle = '#f0cc74';
      cctx.font = '900 13px Heebo, sans-serif';
      cctx.textAlign = 'right';
      cctx.textBaseline = 'top';
      cctx.fillText(String(viewStart), g.nutX - 6, g.neckTop - 10);
    } else {
      cctx.strokeStyle = '#f2e8d0';
      cctx.lineWidth = 5;
      cctx.beginPath();
      cctx.moveTo(g.nutX, g.neckTop - 6);
      cctx.lineTo(g.nutX, g.neckBot + 6);
      cctx.stroke();
    }

    for (let fi = 1; fi <= VISIBLE_FRETS + 2; fi++) {
      const x = g.fretWireX(fi, viewStart);
      if (x > g.w + 10) break;
      cctx.strokeStyle = 'rgba(200,210,220,0.85)';
      cctx.lineWidth = 2.5;
      cctx.beginPath();
      cctx.moveTo(x, g.neckTop - 4);
      cctx.lineTo(x, g.neckBot + 4);
      cctx.stroke();

      const label = viewStart + fi;
      cctx.fillStyle = '#b8c8d8';
      cctx.font = '800 11px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'bottom';
      cctx.fillText(String(label), x - g.fretW * 0.5, g.neckTop - 6);

      if ([3, 5, 7, 9, 12].includes(label)) {
        cctx.fillStyle = 'rgba(0,0,0,0.4)';
        cctx.beginPath();
        cctx.arc(x - g.fretW * 0.5, g.cy, 3.5, 0, Math.PI * 2);
        cctx.fill();
      }
    }
  }

  function drawStrings(cctx, g, activeStrings) {
    const active = activeStrings ? new Set(activeStrings) : null;
    for (let s = 0; s < 4; s++) {
      const y = g.strY(s);
      const on = !active || active.has(s);
      const thick = 1.4 + s * 0.35;
      cctx.strokeStyle = on
        ? (s === 3 ? 'rgba(255,235,160,0.95)' : 'rgba(235,242,250,0.82)')
        : 'rgba(90,110,130,0.28)';
      cctx.lineWidth = on ? thick : 0.9;
      cctx.beginPath();
      cctx.moveTo(0, y);
      cctx.lineTo(g.w, y);
      cctx.stroke();
    }
  }

  function gemColor(status, base) {
    if (status === 'wrong' || status === 'miss') return '#d96459';
    if (status === 'perfect' || status === 'good') return 'rgba(227,179,65,0.28)';
    return base;
  }

  function drawGem(cctx, x, y, r, color, label, status) {
    if (x < -40 || x > cctx.canvas.width / (window.devicePixelRatio || 1) + 40) return;
    cctx.save();
    cctx.globalAlpha = (status === 'perfect' || status === 'good') ? 0.25 : 1;
    cctx.shadowColor = color;
    cctx.shadowBlur = status ? 0 : 14;
    cctx.beginPath();
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fillStyle = gemColor(status, color);
    cctx.fill();
    cctx.strokeStyle = 'rgba(255,255,255,0.92)';
    cctx.lineWidth = 2.5;
    cctx.stroke();
    if (label) {
      cctx.shadowBlur = 0;
      cctx.fillStyle = '#1a1008';
      cctx.font = `900 ${r > 11 ? 14 : 11}px Heebo, sans-serif`;
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(label, x, y + 0.5);
    }
    cctx.restore();
  }

  function noteMarkers(note) {
    return [{
      stringIdx: 3,
      fret: note.fret,
      label: note.label || note.solfege || noteLabel(3, note.fret),
    }];
  }

  function chordMarkers(chordId) {
    const ch = getChord(chordId);
    if (!ch) return [];
    return ch.shape.map((f, stringIdx) => ({
      stringIdx,
      fret: f,
      label: f === 'x' || f === 0 ? '' : noteLabel(stringIdx, f),
    }));
  }

  function gemPos(g, marker, viewStart, timeToHit, pxPerSec) {
    const y = g.strY(marker.stringIdx);
    if (marker.fret === 'x') {
      return { x: g.nutX + timeToHit * pxPerSec, y, muted: true };
    }
    const baseX = g.dotX(marker.fret, viewStart);
    return { x: baseX + timeToHit * pxPerSec, y, muted: false };
  }

  function drawMarkers(cctx, g, markers, viewStart, timeToHit, pxPerSec, status) {
    markers.forEach(m => {
      const { x, y, muted } = gemPos(g, m, viewStart, timeToHit, pxPerSec);
      if (muted) {
        cctx.fillStyle = '#e04040';
        cctx.font = '900 16px Heebo, sans-serif';
        cctx.textAlign = 'center';
        cctx.textBaseline = 'bottom';
        cctx.fillText('×', g.nutX - 4, g.strY(m.stringIdx) - 12);
        return;
      }
      const col = GEM_COLORS[m.stringIdx];
      if (m.fret === 0) {
        drawGem(cctx, x, y, 11, gemColor(status, '#6fd89a'), '○', status);
      } else {
        const lbl = m.label || String(m.fret);
        drawGem(cctx, x, y, 14, col, lbl, status);
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
      if (n.fret === 0) return `${n.label || n.solfege} · מיתר 4 · פתוח`;
      return `${n.label || n.solfege} · סריג ${n.fret} · מיתר 4`;
    }
    return tg.chordId;
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

  function drawFrame(cctx, opts) {
    const { w, h, tNow, pxPerSec, viewStart, gameType, targets, upcoming, countIn } = opts;
    const g = geom(w, h);

    cctx.fillStyle = '#1a2430';
    cctx.fillRect(0, 0, w, h);

    drawSoundhole(cctx, g);
    drawWood(cctx, g);
    drawFretGrid(cctx, g, viewStart);
    const activeStr = upcoming ? activeStringsForTarget(upcoming, gameType) : null;
    drawStrings(cctx, g, activeStr);

    if (upcoming) {
      cctx.fillStyle = '#f0cc74';
      cctx.font = '900 16px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(upcomingCaption(upcoming, gameType), g.bodyW + (w - g.bodyW) * 0.52, g.capH * 0.5);
    }

    if (countIn > 0) {
      cctx.fillStyle = 'rgba(8,15,24,0.6)';
      cctx.fillRect(w * 0.38, h * 0.38, w * 0.24, 64);
      cctx.fillStyle = '#f0cc74';
      cctx.font = '900 44px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.fillText(String(countIn), w / 2, h * 0.44);
    }

    for (const tg of targets) {
      const timeToHit = tg.t - tNow;
      if (timeToHit < -0.35 || timeToHit * pxPerSec > w - g.nutX + 100) continue;
      const markers = gameType === 'note'
        ? noteMarkers(tg.note)
        : chordMarkers(tg.chordId);
      drawMarkers(cctx, g, markers, viewStart, timeToHit, pxPerSec, tg.status);
    }

    return g;
  }

  return {
    geom, drawFrame, activeStringsForTarget, upcomingCaption,
    calcViewStart, targetViewStart, noteMarkers, chordMarkers,
    STRING_HE, VISIBLE_FRETS, BODY_RATIO,
  };
})();
