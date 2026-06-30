/**
 * פרוקסי Stem + YouTube (yt-dlp)
 *
 * POST /api/separate     — LALAL / Moises
 * GET  /api/youtube-audio?id=VIDEO_ID  — הורדת MP3 (yt-dlp)
 * GET  /health
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { spawn } from 'child_process';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { randomUUID } from 'crypto';

const PORT = Number(process.env.PORT || 3456);
const LALAL_KEY = process.env.LALAL_LICENSE_KEY || '';
const MOISES_KEY = process.env.MOISES_API_KEY || '';
const YTDLP_BIN = process.env.YTDLP_PATH || 'yt-dlp';
const TMP = join(process.cwd(), 'tmp');

mkdirSync(TMP, { recursive: true });

const upload = multer({ dest: TMP, limits: { fileSize: 80 * 1024 * 1024 } });
const app = express();
app.use(cors());
app.use(express.json());

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function runCmd(cmd, args, timeoutMs = 180000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    const timer = setTimeout(() => {
      proc.kill('SIGKILL');
      reject(new Error(`${cmd} timeout`));
    }, timeoutMs);
    proc.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(stderr);
      else reject(new Error(`${cmd} exit ${code}: ${stderr.slice(-500)}`));
    });
    proc.on('error', err => {
      clearTimeout(timer);
      reject(new Error(`${cmd} not found — התקן yt-dlp`));
    });
  });
}

async function checkYtDlp() {
  try {
    await runCmd(YTDLP_BIN, ['--version'], 15000);
    return true;
  } catch {
    return false;
  }
}

let _ytDlpOk = null;
async function ytDlpReady() {
  if (_ytDlpOk === null) _ytDlpOk = await checkYtDlp();
  return _ytDlpOk;
}

/** הורדת אודיו מ-YouTube → MP3 בזיכרון */
async function downloadYoutubeAudio(videoId) {
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 11);
  if (safeId.length !== 11) throw new Error('Invalid YouTube id');

  const outBase = join(TMP, `yt-${safeId}-${Date.now()}`);
  const outTemplate = `${outBase}.%(ext)s`;
  const url = `https://www.youtube.com/watch?v=${safeId}`;

  await runCmd(YTDLP_BIN, [
    '--no-playlist',
    '-f', 'bestaudio/best',
    '-x', '--audio-format', 'mp3',
    '--audio-quality', '5',
    '-o', outTemplate,
    url,
  ], 300000);

  const files = readdirSync(TMP).filter(f => f.startsWith(basename(outBase)) || f.startsWith(`yt-${safeId}`));
  const mp3 = files.find(f => f.endsWith('.mp3'));
  if (!mp3) throw new Error('yt-dlp: MP3 not created');
  const path = join(TMP, mp3);
  const buf = readFileSync(path);
  try { unlinkSync(path); } catch { /* noop */ }
  files.forEach(f => { try { unlinkSync(join(TMP, f)); } catch { /* noop */ } });
  return buf;
}

async function lalalUpload(filePath, filename) {
  const buf = readFileSync(filePath);
  const resp = await fetch('https://www.lalal.ai/api/v1/upload/', {
    method: 'POST',
    headers: {
      'X-License-Key': LALAL_KEY,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
    body: buf,
  });
  if (!resp.ok) throw new Error(`LALAL upload ${resp.status}: ${await resp.text()}`);
  return (await resp.json()).id;
}

async function lalalSplit(sourceId, stem) {
  const resp = await fetch('https://www.lalal.ai/api/v1/split/stem_separator/', {
    method: 'POST',
    headers: { 'X-License-Key': LALAL_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      source_id: sourceId,
      presets: { stem: stem || 'strings', extraction_level: 'deep_extraction', splitter: 'andromeda' },
    }),
  });
  if (!resp.ok) throw new Error(`LALAL split ${resp.status}`);
  return (await resp.json()).task_id;
}

async function lalalWait(taskId) {
  for (let i = 0; i < 120; i++) {
    const resp = await fetch('https://www.lalal.ai/api/v1/check/', {
      method: 'POST',
      headers: { 'X-License-Key': LALAL_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_ids: [taskId] }),
    });
    const data = await resp.json();
    const task = data.result?.[taskId];
    if (task?.status === 'success') return task.result;
    if (task?.status === 'cancelled' || task?.status === 'error') throw new Error(`LALAL ${task.status}`);
    await sleep(3000);
  }
  throw new Error('LALAL timeout');
}

async function downloadBuffer(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download ${resp.status}`);
  return Buffer.from(await resp.arrayBuffer());
}

function pickLalalTrack(tracks, stem) {
  const list = tracks || [];
  const wantVocal = /vocal|voice|sing/i.test(String(stem || ''));
  if (wantVocal) {
    return list.find(t => /vocal|voice|sing/i.test(t.label || ''))
      || list.find(t => !/string|stem|instrument|drum|bass|piano|guitar|other|accompan/i.test(t.label || ''))
      || list[0];
  }
  return list.find(t => /string|stem|instrument/i.test(t.label || '')) || list[0];
}

async function separateLalal(filePath, originalName, stem) {
  const sourceId = await lalalUpload(filePath, originalName);
  const taskId = await lalalSplit(sourceId, stem);
  const result = await lalalWait(taskId);
  const tracks = result?.tracks || [];
  const stemTrack = pickLalalTrack(tracks, stem);
  if (!stemTrack?.url) throw new Error('No stem track');
  return downloadBuffer(stemTrack.url);
}

function publicFileUrl(req, id, ext) {
  const host = req.headers.host || `localhost:${PORT}`;
  const proto = req.headers['x-forwarded-proto'] || 'http';
  return `${proto}://${host}/tmp/${id}${ext}`;
}

async function separateMoises(filePath, originalName, req, stem = 'other') {
  const id = randomUUID();
  const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '.mp3';
  const dest = join(TMP, `${id}${ext}`);
  writeFileSync(dest, readFileSync(filePath));
  const inputUrl = publicFileUrl(req, id, ext);

  const resp = await fetch('https://developer-api.moises.ai/api/job', {
    method: 'POST',
    headers: { Authorization: MOISES_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'bouzouki-stem',
      workflow: 'moises/stems-vocals-drums-bass-other',
      params: { inputUrl },
    }),
  });
  if (!resp.ok) throw new Error(`Moises ${resp.status}`);
  const { id: jobId } = await resp.json();

  for (let i = 0; i < 120; i++) {
    const poll = await fetch(`https://developer-api.moises.ai/api/job/${jobId}`, {
      headers: { Authorization: MOISES_KEY },
    });
    const job = await poll.json();
    if (job.status === 'SUCCEEDED') {
      const wantVocal = /vocal|voice|sing/i.test(String(stem || ''));
      const stemUrl = wantVocal
        ? (job.result?.vocals || job.result?.voice || job.result?.vocal)
        : (job.result?.other || job.result?.accompaniments);
      if (!stemUrl) throw new Error(wantVocal ? 'Moises: no vocals stem' : 'Moises: no other stem');
      const audio = await downloadBuffer(stemUrl);
      try { unlinkSync(dest); } catch { /* noop */ }
      return audio;
    }
    if (job.status === 'FAILED' || job.status === 'CANCELLED') throw new Error(`Moises ${job.status}`);
    await sleep(4000);
  }
  throw new Error('Moises timeout');
}

app.get('/health', async (_req, res) => {
  const ytdlp = await ytDlpReady();
  res.json({ ok: true, lalal: !!LALAL_KEY, moises: !!MOISES_KEY, ytdlp });
});

app.get('/tmp/:name', (req, res) => {
  const p = join(TMP, basename(req.params.name));
  if (!existsSync(p)) return res.status(404).end();
  res.sendFile(p);
});

app.get('/api/youtube-audio', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'Missing id' });
  if (!(await ytDlpReady())) {
    return res.status(503).json({ error: 'yt-dlp not installed. Run: pip install yt-dlp (or winget install yt-dlp)' });
  }
  try {
    const audio = await downloadYoutubeAudio(String(id));
    res.set('Content-Type', 'audio/mpeg');
    res.set('Content-Disposition', `inline; filename="${id}.mp3"`);
    res.send(audio);
  } catch (e) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.post('/api/separate', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const provider = req.body.provider || 'lalal';
  const stem = req.body.stem || 'strings';
  try {
    let audio;
    if (provider === 'moises') {
      if (!MOISES_KEY) return res.status(400).json({ error: 'MOISES_API_KEY not configured' });
      audio = await separateMoises(req.file.path, req.file.originalname, req, stem);
    } else {
      if (!LALAL_KEY) return res.status(400).json({ error: 'LALAL_LICENSE_KEY not configured' });
      audio = await separateLalal(req.file.path, req.file.originalname, stem);
    }
    try { unlinkSync(req.file.path); } catch { /* noop */ }
    res.set('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (e) {
    try { unlinkSync(req.file.path); } catch { /* noop */ }
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.listen(PORT, async () => {
  const ytdlp = await ytDlpReady();
  console.log(`Stem proxy http://localhost:${PORT}`);
  console.log(`  LALAL: ${!!LALAL_KEY} | Moises: ${!!MOISES_KEY} | yt-dlp: ${ytdlp}`);
});
