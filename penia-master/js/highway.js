/* גרף בוזוקי — שכפול ויזואלי של אפליקציית גיטרה (גוף + לוח + נקודות) */
const Highway = (() => {
  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];
  const GEM_COLORS = ['#d96ec4', '#f0b84a', '#4ec8e8', '#e3b341'];
  const PC_NAMES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const VISIBLE_FRETS = 5;
  const BODY_RATIO = 0.34;

  function noteLabel(stringIdx, fret, fallback) {
    if (fallback) {
      const t = String(fallback);
      if (t.length <= 2) return t;
      if (/^[א-ת]/.test(t)) return t.charAt(0);
      return t.charAt(0);
    }
    if (typeof fret !== 'number') return '';
    return PC_NAMES[(TUNING_MIDI[stringIdx] + fret) % 12];
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
    const capH = Math.min(24, h * 0.08);
    const neckTop = capH + 14;
    const neckBot = h - capH - 8;
    const span = neckBot - neckTop;
    const strY = si => neckTop + span * (0.08 + si * 0.28);
    const bodyW = w * BODY_RATIO;
    const nutX = bodyW + 2;
    const cy = (neckTop + neckBot) / 2;
    const neckW = w - bodyW;
    const fretW = Math.max(38, Math.min(neckW / (VISIBLE_FRETS + 0.6), 62));

    function dotX(fret, viewStart) {
      if (fret === 'x') return nutX;
      if (fret === 0) {
        if (viewStart === 0) return nutX - fretW * 0.22;
        return nutX + (0 - viewStart - 0.5) * fretW;
      }
      return nutX + (fret - viewStart - 0.5) * fretW;
    }

    function fretWireX(fi, viewStart) {
      return nutX + (viewStart + fi) * fretW;
    }

    return { w, h, capH, neckTop, neckBot, span, strY, bodyW, nutX, cy, neckW, fretW, dotX, fretWireX };
  }

  function drawBackground(cctx, g) {
    const bg = cctx.createLinearGradient(0, 0, g.w, g.h);
    bg.addColorStop(0, '#2a1810');
    bg.addColorStop(0.35, '#3d2818');
    bg.addColorStop(1, '#1e2830');
    cctx.fillStyle = bg;
    cctx.fillRect(0, 0, g.w, g.h);
  }

  function drawBody(cctx, g) {
    const grd = cctx.createRadialGradient(g.bodyW * 0.45, g.cy, 8, g.bodyW * 0.5, g.cy, g.span * 0.9);
    grd.addColorStop(0, '#8b5a38');
    grd.addColorStop(0.55, '#6b4028');
    grd.addColorStop(1, '#4a2818');
    cctx.fillStyle = grd;
    cctx.beginPath();
    cctx.moveTo(0, g.neckTop - 16);
    cctx.lineTo(g.bodyW + 12, g.neckTop - 10);
    cctx.lineTo(g.bodyW + 12, g.neckBot + 10);
    cctx.lineTo(0, g.neckBot + 16);
    cctx.closePath();
    cctx.fill();

    cctx.strokeStyle = 'rgba(0,0,0,0.25)';
    cctx.lineWidth = 2;
    cctx.stroke();
  }

  function drawRosette(cctx, cx, cy, r) {
    cctx.save();
    for (let ring = 0; ring < 8; ring++) {
      const rr = r + 16 - ring * 2.4;
      cctx.beginPath();
      cctx.arc(cx, cy, rr, 0, Math.PI * 2);
      cctx.strokeStyle = ring % 2 === 0 ? '#c9a050' : '#5c3810';
      cctx.lineWidth = ring === 0 ? 3.5 : 1.8;
      cctx.stroke();
    }
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const x1 = cx + Math.cos(a) * (r + 4);
      const y1 = cy + Math.sin(a) * (r + 4);
      const x2 = cx + Math.cos(a) * (r + 14);
      const y2 = cy + Math.sin(a) * (r + 14);
      cctx.strokeStyle = i % 2 ? '#ddb866' : '#8b6018';
      cctx.lineWidth = 2;
      cctx.beginPath();
      cctx.moveTo(x1, y1);
      cctx.lineTo(x2, y2);
      cctx.stroke();
    }
    cctx.beginPath();
    cctx.arc(cx, cy, r * 0.92, 0, Math.PI * 2);
    cctx.fillStyle = '#060504';
    cctx.fill();
    cctx.restore();
  }

  function drawSoundhole(cctx, g) {
    const cx = g.bodyW * 0.46;
    const r = Math.min(g.bodyW * 0.38, g.span * 0.38);
    drawRosette(cctx, cx, g.cy, r);
  }

  function drawNeckWood(cctx, g) {
    const grd = cctx.createLinearGradient(g.bodyW, g.neckTop, g.w, g.neckBot);
    grd.addColorStop(0, '#9a6848');
    grd.addColorStop(0.4, '#b07850');
    grd.addColorStop(1, '#7a5038');
    cctx.fillStyle = grd;
    cctx.fillRect(g.bodyW, g.neckTop - 6, g.w - g.bodyW, g.neckBot - g.neckTop + 12);

    cctx.strokeStyle = 'rgba(0,0,0,0.12)';
    cctx.lineWidth = 1;
    for (let i = 0; i < 18; i++) {
      const y = g.neckTop + (g.neckBot - g.neckTop) * (i / 18);
      cctx.beginPath();
      cctx.moveTo(g.bodyW + 4, y);
      cctx.lineTo(g.w, y + 1.5);
      cctx.stroke();
    }

    cctx.strokeStyle = 'rgba(40,25,15,0.5)';
    cctx.lineWidth = 3;
    cctx.beginPath();
    cctx.moveTo(g.bodyW, g.neckTop - 4);
    cctx.lineTo(g.w, g.neckTop - 4);
    cctx.stroke();
    cctx.beginPath();
    cctx.moveTo(g.bodyW, g.neckBot + 4);
    cctx.lineTo(g.w, g.neckBot + 4);
    cctx.stroke();
  }

  function drawFretGrid(cctx, g, viewStart) {
    if (viewStart > 0) {
      cctx.strokeStyle = '#d0dce8';
      cctx.lineWidth = 4.5;
      cctx.beginPath();
      cctx.moveTo(g.nutX, g.neckTop - 4);
      cctx.lineTo(g.nutX, g.neckBot + 4);
      cctx.stroke();
      cctx.fillStyle = '#fff';
      cctx.font = '900 12px Heebo, sans-serif';
      cctx.textAlign = 'right';
      cctx.textBaseline = 'top';
      cctx.fillText(String(viewStart), g.nutX - 8, g.neckTop - 12);
    } else {
      cctx.strokeStyle = '#f5ead8';
      cctx.lineWidth = 5.5;
      cctx.beginPath();
      cctx.moveTo(g.nutX, g.neckTop - 4);
      cctx.lineTo(g.nutX, g.neckBot + 4);
      cctx.stroke();
    }

    for (let fi = 1; fi <= VISIBLE_FRETS + 1; fi++) {
      const x = g.fretWireX(fi, viewStart);
      if (x > g.w + 8) break;

      cctx.strokeStyle = 'rgba(210,218,228,0.95)';
      cctx.lineWidth = 3;
      cctx.beginPath();
      cctx.moveTo(x, g.neckTop - 2);
      cctx.lineTo(x, g.neckBot + 2);
      cctx.stroke();

      const label = viewStart + fi;
      cctx.fillStyle = 'rgba(255,255,255,0.75)';
      cctx.font = '800 11px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'bottom';
      cctx.fillText(String(label), x - g.fretW * 0.5, g.neckTop - 4);

      if ([3, 5, 7, 12].includes(label)) {
        cctx.fillStyle = 'rgba(0,0,0,0.35)';
        cctx.beginPath();
        cctx.arc(x - g.fretW * 0.5, g.cy, 4, 0, Math.PI * 2);
        cctx.fill();
      }
    }
  }

  function drawStrings(cctx, g, activeStrings) {
    const active = activeStrings ? new Set(activeStrings) : null;
    for (let s = 0; s < 4; s++) {
      const y = g.strY(s);
      const on = !active || active.has(s);
      const lw = 1.2 + s * 0.55;
      const strGrd = cctx.createLinearGradient(0, y - 1, 0, y + 1);
      strGrd.addColorStop(0, 'rgba(180,190,200,0.5)');
      strGrd.addColorStop(0.5, on ? 'rgba(255,255,255,0.95)' : 'rgba(120,130,140,0.35)');
      strGrd.addColorStop(1, 'rgba(100,110,120,0.4)');
      cctx.strokeStyle = strGrd;
      cctx.lineWidth = on ? lw : 0.8;
      cctx.beginPath();
      cctx.moveTo(0, y);
      cctx.lineTo(g.w, y);
      cctx.stroke();
    }
  }

  function drawMutedX(cctx, g, stringIdx) {
    const y = g.strY(stringIdx);
    cctx.fillStyle = '#e03030';
    cctx.font = '900 18px Heebo, sans-serif';
    cctx.textAlign = 'center';
    cctx.textBaseline = 'bottom';
    cctx.fillText('×', g.nutX - 6, y - 14);
  }

  function gemColor(status, base) {
    if (status === 'wrong' || status === 'miss') return '#d96459';
    if (status === 'perfect' || status === 'good') return 'rgba(227,179,65,0.3)';
    return base;
  }

  function drawGem(cctx, x, y, r, color, label, status) {
    if (x < -50 || x > cctx.canvas.width / (window.devicePixelRatio || 1) + 50) return;
    cctx.save();
    cctx.globalAlpha = (status === 'perfect' || status === 'good') ? 0.28 : 1;

    const grd = cctx.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
    grd.addColorStop(0, '#fff');
    grd.addColorStop(0.25, color);
    grd.addColorStop(1, shade(color, -30));

    cctx.shadowColor = 'rgba(0,0,0,0.45)';
    cctx.shadowBlur = status ? 0 : 8;
    cctx.shadowOffsetY = 2;
    cctx.beginPath();
    cctx.arc(x, y, r, 0, Math.PI * 2);
    cctx.fillStyle = status ? gemColor(status, color) : grd;
    cctx.fill();
    cctx.strokeStyle = 'rgba(255,255,255,0.95)';
    cctx.lineWidth = 2.5;
    cctx.stroke();

    if (label) {
      cctx.shadowBlur = 0;
      cctx.shadowOffsetY = 0;
      cctx.fillStyle = '#1a0c04';
      cctx.font = `900 ${r > 12 ? 15 : 12}px Heebo, sans-serif`;
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(label, x, y + 1);
    }
    cctx.restore();
  }

  function shade(hex, amt) {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, Math.min(255, (n >> 16) + amt));
    const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    const b = Math.max(0, Math.min(255, (n & 255) + amt));
    return `rgb(${r},${g},${b})`;
  }

  function drawGhost(cctx, g, marker, viewStart) {
    if (marker.fret === 'x') return;
    const x = g.dotX(marker.fret, viewStart);
    const y = g.strY(marker.stringIdx);
    cctx.beginPath();
    cctx.arc(x, y, 16, 0, Math.PI * 2);
    cctx.strokeStyle = 'rgba(255,255,255,0.22)';
    cctx.lineWidth = 2;
    cctx.stroke();
  }

  function noteMarkers(note) {
    return [{
      stringIdx: 3,
      fret: note.fret,
      label: noteLabel(3, note.fret, note.label || note.solfege),
    }];
  }

  function chordMarkers(chordId) {
    const ch = getChord(chordId);
    if (!ch) return [];
    return ch.shape.map((f, stringIdx) => ({
      stringIdx,
      fret: f,
      label: f === 'x' ? '' : noteLabel(stringIdx, f === 0 ? 0 : f),
    }));
  }

  function gemPos(g, marker, viewStart, timeToHit, pxPerSec) {
    const y = g.strY(marker.stringIdx);
    if (marker.fret === 'x') return { x: 0, y, muted: true };
    const baseX = g.dotX(marker.fret, viewStart);
    return { x: baseX + timeToHit * pxPerSec, y, muted: false };
  }

  function drawMarkers(cctx, g, markers, viewStart, timeToHit, pxPerSec, status, showGhost) {
    if (showGhost && timeToHit > 0.05) {
      markers.forEach(m => drawGhost(cctx, g, m, viewStart));
    }
    markers.forEach(m => {
      if (m.fret === 'x') {
        if (Math.abs(timeToHit) < 0.5 || timeToHit > 0) drawMutedX(cctx, g, m.stringIdx);
        return;
      }
      const { x, y } = gemPos(g, m, viewStart, timeToHit, pxPerSec);
      const col = GEM_COLORS[m.stringIdx];
      const lbl = m.label || (m.fret === 0 ? noteLabel(m.stringIdx, 0) : String(m.fret));
      const r = m.fret === 0 ? 13 : 16;
      drawGem(cctx, x, y, r, col, lbl, status);
    });
  }

  function drawCaption(cctx, g, text, chordId) {
    if (!text) return;
    cctx.fillStyle = 'rgba(0,0,0,0.35)';
    cctx.fillRect(g.bodyW + 8, 4, g.w - g.bodyW - 16, g.capH + 6);
    cctx.fillStyle = '#fff';
    cctx.font = '900 17px Heebo, sans-serif';
    cctx.textAlign = 'center';
    cctx.textBaseline = 'middle';
    cctx.fillText(text, g.bodyW + (g.w - g.bodyW) * 0.5, g.capH * 0.55);

    if (chordId) {
      cctx.font = '800 13px Heebo, sans-serif';
      cctx.fillStyle = 'rgba(255,255,255,0.65)';
      cctx.fillText(LearnGraph.shapeHint(chordId), g.bodyW + (g.w - g.bodyW) * 0.5, g.capH * 0.55 + 16);
    }
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

    drawBackground(cctx, g);
    drawBody(cctx, g);
    drawNeckWood(cctx, g);
    drawSoundhole(cctx, g);
    drawFretGrid(cctx, g, viewStart);

    const activeStr = upcoming ? activeStringsForTarget(upcoming, gameType) : null;
    drawStrings(cctx, g, activeStr);

    if (upcoming) {
      const cap = upcomingCaption(upcoming, gameType);
      drawCaption(cctx, g, cap, gameType === 'chord' ? upcoming.chordId : null);
      const preview = gameType === 'note'
        ? noteMarkers(upcoming.note)
        : chordMarkers(upcoming.chordId);
      preview.forEach(m => {
        if (m.fret === 'x') drawMutedX(cctx, g, m.stringIdx);
        else drawGhost(cctx, g, m, viewStart);
      });
    }

    if (countIn > 0) {
      cctx.fillStyle = 'rgba(0,0,0,0.55)';
      cctx.fillRect(w * 0.36, h * 0.36, w * 0.28, 72);
      cctx.fillStyle = '#fff';
      cctx.font = '900 48px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(String(countIn), w / 2, h * 0.42);
    }

    for (const tg of targets) {
      const timeToHit = tg.t - tNow;
      if (timeToHit < -0.4 || timeToHit * pxPerSec > w - g.nutX + 120) continue;
      const markers = gameType === 'note'
        ? noteMarkers(tg.note)
        : chordMarkers(tg.chordId);
      drawMarkers(cctx, g, markers, viewStart, timeToHit, pxPerSec, tg.status, true);
    }

    return g;
  }

  return {
    geom, drawFrame, activeStringsForTarget, upcomingCaption,
    calcViewStart, targetViewStart, noteMarkers, chordMarkers,
    STRING_HE, VISIBLE_FRETS, BODY_RATIO,
  };
})();
