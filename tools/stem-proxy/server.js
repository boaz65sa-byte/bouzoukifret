/* ============================================================
   Stem Proxy — שרת relay להפרדת מיתרים/בוזוקי
   מסתיר את מפתח LALAL.ai מהדפדפן + מוריד אודיו מ-YouTube.
   תואם לפרוטוקול של js/stem-api.js בצד הלקוח:
     GET  /health
     POST /api/separate          (multipart: file, provider, stem)
     GET  /api/youtube-audio?id=VIDEO_ID
   ============================================================ */
'use strict';

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

/* טעינת .env בלי תלות חיצונית (אם הקובץ קיים) */
(function loadEnv() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch { /* התעלם */ }
})();

const PORT = process.env.PORT || 3456;
const LALAL_KEY = process.env.LALAL_LICENSE_KEY || '';
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || '*';
const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';

const app = express();
app.use(cors({ origin: ALLOW_ORIGIN }));
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 60 * 1024 * 1024 } });

/* ---------- helpers ---------- */
function lalalHeaders(extra = {}) {
  return { 'X-License-Key': LALAL_KEY, ...extra };
}

async function lalalUpload(buffer, filename) {
  const resp = await fetch('https://www.lalal.ai/api/v1/upload/', {
    method: 'POST',
    headers: lalalHeaders({ 'Content-Disposition': `attachment; filename="${filename}"` }),
    body: buffer,
  });
  if (!resp.ok) throw new Error(`LALAL upload ${resp.status}`);
  const data = await resp.json();
  if (!data.id) throw new Error('LALAL upload: no source id — ' + JSON.stringify(data));
  return data.id;
}

async function lalalSplit(sourceId, stem) {
  const resp = await fetch('https://www.lalal.ai/api/v1/split/stem_separator/', {
    method: 'POST',
    headers: lalalHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      source_id: sourceId,
      presets: { stem, extraction_level: 'deep_extraction', splitter: 'andromeda' },
    }),
  });
  if (!resp.ok) throw new Error(`LALAL split ${resp.status}`);
  const data = await resp.json();
  if (!data.task_id) throw new Error('LALAL split: no task id — ' + JSON.stringify(data));
  return data.task_id;
}

async function lalalPoll(taskId, onTick) {
  for (let i = 0; i < 160; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const resp = await fetch('https://www.lalal.ai/api/v1/check/', {
      method: 'POST',
      headers: lalalHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ task_ids: [taskId] }),
    });
    const data = await resp.json();
    const task = data.result?.[taskId];
    onTick?.(task?.status, task?.progress);
    if (task?.status === 'success') {
      const url = task.result?.tracks?.[0]?.url || task.split?.stem_track;
      if (!url) throw new Error('LALAL: success but no track url');
      return url;
    }
    if (task?.status === 'error' || task?.status === 'cancelled') {
      throw new Error('LALAL task failed: ' + (task?.error || task?.status));
    }
  }
  throw new Error('LALAL timeout');
}

/* ---------- routes ---------- */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    lalal: !!LALAL_KEY,
    ytdlp: true,
    time: Date.now(),
  });
});

app.post('/api/separate', upload.single('file'), async (req, res) => {
  if (!LALAL_KEY) return res.status(500).json({ error: 'LALAL_LICENSE_KEY לא מוגדר בשרת' });
  if (!req.file) return res.status(400).json({ error: 'לא התקבל קובץ' });
  const stem = req.body.stem || 'strings';
  const filename = req.file.originalname || 'audio.mp3';

  try {
    console.log(`[separate] ${filename} (${(req.file.size / 1e6).toFixed(1)}MB) stem=${stem}`);
    const sourceId = await lalalUpload(req.file.buffer, filename);
    const taskId = await lalalSplit(sourceId, stem);
    const trackUrl = await lalalPoll(taskId, (status, pct) => console.log(`[separate] ${status} ${pct || ''}`));
    const dl = await fetch(trackUrl);
    if (!dl.ok) throw new Error(`download stem ${dl.status}`);
    const buf = Buffer.from(await dl.arrayBuffer());
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Disposition', `attachment; filename="stem-${stem}.mp3"`);
    res.send(buf);
    console.log(`[separate] done — ${(buf.length / 1e6).toFixed(1)}MB`);
  } catch (err) {
    console.error('[separate] error:', err.message);
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/youtube-search', (req, res) => {
  const q = String(req.query.q || '').trim().slice(0, 120);
  if (q.length < 2) return res.status(400).json({ error: 'חיפוש קצר מדי' });

  const args = ['--flat-playlist', '-j', '--no-warnings', '--no-download', `ytsearch12:${q}`];
  const proc = spawn(YTDLP, args);
  let out = '';
  let errBuf = '';
  proc.stdout.on('data', (d) => { out += d.toString(); });
  proc.stderr.on('data', (d) => { errBuf += d.toString(); });
  proc.on('error', (e) => {
    res.status(500).json({ error: `yt-dlp לא נמצא (${e.message})` });
  });
  proc.on('close', (code) => {
    if (code !== 0) {
      console.error('[youtube-search] failed:', errBuf.slice(-300));
      return res.status(502).json({ error: 'חיפוש YouTube נכשל' });
    }
    const results = [];
    for (const line of out.split(/\r?\n/)) {
      if (!line.trim()) continue;
      try {
        const j = JSON.parse(line);
        const id = j.id || j.video_id;
        if (!id || id.length !== 11) continue;
        results.push({
          videoId: id,
          title: j.title || '',
          author: j.channel || j.uploader || '',
          lengthSeconds: typeof j.duration === 'number' ? j.duration : null,
          thumbUrl: j.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        });
      } catch { /* skip bad line */ }
    }
    console.log(`[youtube-search] "${q}" → ${results.length} results`);
    res.json({ results });
  });
});

app.get('/api/youtube-audio', (req, res) => {
  const id = String(req.query.id || '').trim();
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return res.status(400).json({ error: 'מזהה YouTube לא תקין' });

  const tmp = path.join(os.tmpdir(), `yt-${id}-${Date.now()}.m4a`);
  console.log(`[youtube] downloading ${id}`);
  const args = ['-f', 'bestaudio[ext=m4a]/bestaudio', '--no-playlist', '-o', tmp, `https://www.youtube.com/watch?v=${id}`];
  const proc = spawn(YTDLP, args);
  let errBuf = '';
  proc.stderr.on('data', (d) => { errBuf += d.toString(); });
  proc.on('error', (e) => {
    res.status(500).json({ error: `yt-dlp לא נמצא (${e.message}). התקן: pip install yt-dlp` });
  });
  proc.on('close', (code) => {
    if (code !== 0 || !fs.existsSync(tmp)) {
      console.error('[youtube] yt-dlp failed:', errBuf.slice(-300));
      return res.status(502).json({ error: 'הורדת YouTube נכשלה' });
    }
    res.set('Content-Type', 'audio/mp4');
    res.sendFile(tmp, (err) => {
      fs.unlink(tmp, () => {});
      if (err) console.error('[youtube] send error:', err.message);
      else console.log(`[youtube] sent ${id}`);
    });
  });
});

app.listen(PORT, () => {
  console.log(`Stem proxy על http://localhost:${PORT}`);
  console.log(`  LALAL key: ${LALAL_KEY ? 'מוגדר ✓' : 'חסר ✗ (הגדר LALAL_LICENSE_KEY)'}`);
  console.log(`  CORS origin: ${ALLOW_ORIGIN}`);
});
