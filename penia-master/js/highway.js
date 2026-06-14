/* כביש Guitar Hero — מיתרים + סריגים, תווים יורדים למטה */
const Highway = (() => {
  const STRING_HE = ['דו', 'פה', 'לה', 'רה'];
  const HIT_Y = 0.875;
  const VAN_Y = 0.06;
  const NUM_FRETS = 5;

  function lerp(a, b, t) { return a + (b - a) * t; }

  function geom(w, h) {
    const hitY = h * HIT_Y;
    const vanY = h * VAN_Y;
    const botL = w * 0.1;
    const botR = w * 0.9;
    const topL = w * 0.28;
    const topR = w * 0.72;
    const yToT = y => Math.max(0, Math.min(1, (hitY - y) / (hitY - vanY)));
    const tToY = t => hitY - t * (hitY - vanY);
    const strX = (si, y) => {
      const t = yToT(y);
      const left = lerp(botL, topL, t);
      const right = lerp(botR, topR, t);
      return lerp(left, right, si / 3);
    };
    const edgeL = y => lerp(botL, topL, yToT(y));
    const edgeR = y => lerp(botR, topR, yToT(y));
    return { w, h, hitY, vanY, botL, botR, topL, topR, yToT, tToY, strX, edgeL, edgeR };
  }

  function positionForFret(fret) {
    if (fret <= 5) return 0;
    return Math.max(0, Math.min(fret - 3, 12 - NUM_FRETS));
  }

  function fretBandY(g, fret, posStart) {
    const rel = fret === 0 ? 0 : (fret - posStart) / NUM_FRETS;
    const t = Math.max(0.05, Math.min(0.95, 1 - rel * 0.85));
    return g.tToY(t);
  }

  function drawBackground(cctx, g) {
    const { w, h, hitY, vanY, edgeL, edgeR } = g;
    const grd = cctx.createLinearGradient(0, vanY, 0, hitY);
    grd.addColorStop(0, '#1a0e08');
    grd.addColorStop(0.4, '#2a1810');
    grd.addColorStop(1, '#3d2818');
    cctx.fillStyle = grd;
    cctx.beginPath();
    cctx.moveTo(edgeL(vanY), vanY);
    cctx.lineTo(edgeR(vanY), vanY);
    cctx.lineTo(edgeR(hitY), hitY);
    cctx.lineTo(edgeL(hitY), hitY);
    cctx.closePath();
    cctx.fill();

    cctx.strokeStyle = 'rgba(201,169,98,0.35)';
    cctx.lineWidth = 2;
    cctx.beginPath();
    cctx.moveTo(edgeL(vanY), vanY);
    cctx.lineTo(edgeL(hitY), hitY);
    cctx.moveTo(edgeR(vanY), vanY);
    cctx.lineTo(edgeR(hitY), hitY);
    cctx.stroke();
  }

  function drawFretLines(cctx, g, posStart) {
    const { hitY, vanY, edgeL, edgeR } = g;
    for (let f = 0; f <= NUM_FRETS; f++) {
      const t = f / NUM_FRETS;
      const y = lerp(hitY, vanY, t * 0.92 + 0.04);
      cctx.strokeStyle = f === 0 ? 'rgba(232,217,176,0.55)' : 'rgba(59,86,111,0.45)';
      cctx.lineWidth = f === 0 ? 3 : 1;
      cctx.beginPath();
      cctx.moveTo(edgeL(y), y);
      cctx.lineTo(edgeR(y), y);
      cctx.stroke();
      if (f > 0 && f <= NUM_FRETS) {
        const label = posStart + f;
        cctx.fillStyle = 'rgba(143,166,188,0.7)';
        cctx.font = '700 11px Heebo, sans-serif';
        cctx.textAlign = 'right';
        cctx.fillText(String(label), edgeL(y) - 6, y + 4);
      }
    }
  }

  function drawStrings(cctx, g, activeStrings) {
    const active = activeStrings ? new Set(activeStrings) : null;
    for (let s = 0; s < 4; s++) {
      const isOn = !active || active.has(s);
      cctx.strokeStyle = isOn ? (s === 3 ? 'rgba(227,179,65,0.85)' : 'rgba(200,212,222,0.55)') : 'rgba(100,120,140,0.25)';
      cctx.lineWidth = isOn ? (s === 3 ? 2.2 : 1.4) : 1;
      cctx.beginPath();
      cctx.moveTo(g.strX(s, g.hitY), g.hitY);
      cctx.lineTo(g.strX(s, g.vanY), g.vanY);
      cctx.stroke();
    }
  }

  function drawHitLine(cctx, g, pulse) {
    const y = g.hitY;
    const p = 0.5 + 0.5 * Math.sin(pulse / 180);
    cctx.shadowColor = '#e3b341';
    cctx.shadowBlur = 10 + p * 12;
    cctx.strokeStyle = `rgba(240,204,116,${0.7 + p * 0.3})`;
    cctx.lineWidth = 4;
    cctx.beginPath();
    cctx.moveTo(g.edgeL(y), y);
    cctx.lineTo(g.edgeR(y), y);
    cctx.stroke();
    cctx.shadowBlur = 0;
  }

  function drawReceptors(cctx, g, activeStrings, upcoming) {
    for (let s = 0; s < 4; s++) {
      const x = g.strX(s, g.hitY);
      const y = g.hitY;
      const isActive = activeStrings && activeStrings.has(s);
      const r = isActive ? 16 : 11;
      cctx.beginPath();
      cctx.arc(x, y, r, 0, Math.PI * 2);
      cctx.fillStyle = isActive ? 'rgba(227,179,65,0.25)' : 'rgba(30,45,60,0.6)';
      cctx.fill();
      cctx.strokeStyle = isActive ? '#e3b341' : 'rgba(100,130,160,0.5)';
      cctx.lineWidth = isActive ? 2.5 : 1.5;
      cctx.stroke();
      cctx.fillStyle = isActive ? '#ffd86b' : '#5a7187';
      cctx.font = `${isActive ? 11 : 9}px Heebo, sans-serif`;
      cctx.textAlign = 'center';
      cctx.textBaseline = 'top';
      cctx.fillText(STRING_HE[s], x, y + r + 2);
    }
    if (upcoming?.text) {
      cctx.fillStyle = '#f0cc74';
      cctx.font = '800 14px Heebo, sans-serif';
      cctx.textAlign = 'center';
      cctx.textBaseline = 'bottom';
      cctx.fillText(upcoming.text, g.w / 2, g.hitY - 22);
    }
  }

  function gemColor(status, base) {
    if (status === 'wrong' || status === 'miss') return '#d96459';
    if (status === 'perfect' || status === 'good') return 'rgba(227,179,65,0.28)';
    return base;
  }

  function drawGem(cctx, x, y, r, color, label, sub, status, glow) {
    let alpha = 1;
    if (status === 'perfect' || status === 'good') alpha = 0.2;
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
    cctx.strokeStyle = '#f0cc74';
    cctx.lineWidth = 2;
    cctx.stroke();
    if (label) {
      cctx.shadowBlur = 0;
      cctx.fillStyle = '#1a1408';
      cctx.font = `900 ${r > 10 ? 14 : 11}px Heebo, sans-serif`;
      cctx.textAlign = 'center';
      cctx.textBaseline = 'middle';
      cctx.fillText(label, x, y + (sub ? -3 : 0));
      if (sub) {
        cctx.fillStyle = '#2a1810';
        cctx.font = '700 8px Heebo, sans-serif';
        cctx.fillText(sub, x, y + 9);
      }
    }
    cctx.restore();
  }

  function drawNoteGem(cctx, g, y, note, status) {
    const si = 3;
    const x = g.strX(si, y);
    const col = gemColor(status, '#e3b341');
    const label = note.fret === 0 ? '○' : String(note.fret);
    const sub = note.label || note.solfege || '';
    drawGem(cctx, x, y, 14, col, label, sub.slice(0, 4), status, true);
    return { x, y };
  }

  function drawChordGems(cctx, g, y, chordId, status) {
    const ch = getChord(chordId);
    if (!ch) return { x: g.w / 2, y };
    const pts = [];
    ch.shape.forEach((f, si) => {
      if (f === 'x') return;
      const x = g.strX(si, y);
      if (f === 0) {
        drawGem(cctx, x, y - 18, 7, gemColor(status, '#5fc88f'), '○', '', status, false);
      } else {
        drawGem(cctx, x, y, 12, gemColor(status, '#e3b341'), String(f), '', status, true);
      }
      pts.push({ x, y });
    });
    return pts[0] || { x: g.w / 2, y };
  }

  function activeStringsForTarget(tg, gameType) {
    const set = new Set();
    if (gameType === 'note') {
      set.add(3);
    } else if (gameType === 'chord') {
      const ch = getChord(tg.chordId);
      ch?.shape.forEach((f, i) => { if (f !== 'x') set.add(i); });
    }
    return set;
  }

  function upcomingCaption(tg, gameType) {
    if (!tg) return '';
    if (gameType === 'note') {
      const n = tg.note;
      if (n.fret === 0) return `${n.label || n.solfege} · מיתר רה — פתוח ○`;
      return `${n.label || n.solfege} · סריג ${n.fret} · מיתר רה`;
    }
    return `${tg.chordId} · ${LearnGraph.shapeHint(tg.chordId)}`;
  }

  return {
    geom, drawBackground, drawFretLines, drawStrings, drawHitLine, drawReceptors,
    drawNoteGem, drawChordGems, activeStringsForTarget, upcomingCaption,
    positionForFret, HIT_Y, STRING_HE, NUM_FRETS,
  };
})();
