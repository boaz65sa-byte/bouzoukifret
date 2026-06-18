/* ============================================================
   PitchPreservingPlayer — OLA time-stretch (איכות משופרת)
   ============================================================ */
'use strict';

const PitchPreservingPlayer = (() => {
  let _ctx = null;
  let _original = null;
  let _source = null;
  let _gain = null;
  let _tempo = 1;
  let _preserve = true;
  let _stretchCache = new Map();
  let _playing = false;
  let _startedCtxTime = 0;
  let _sourceOffsetSec = 0;
  let _pausedSourceTime = 0;

  const GRAIN = 2048;
  const OVERLAP = 1024;

  function _ensureCtx() {
    if (!_ctx) {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      _gain = _ctx.createGain();
      _gain.connect(_ctx.destination);
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  function _hannWindow(size) {
    const w = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
    }
    return w;
  }

  /** Overlap-add time stretch — טוב יותר מ-linear interpolation */
  function _stretchOla(buffer, tempo) {
    if (!buffer || tempo >= 0.999) return buffer;
    const key = `ola:${buffer.length}:${tempo.toFixed(3)}`;
    if (_stretchCache.has(key)) return _stretchCache.get(key);

    const ch = buffer.numberOfChannels;
    const sr = buffer.sampleRate;
    const synHop = GRAIN - OVERLAP;
    const anaHop = Math.max(64, Math.round(synHop * tempo));
    const outLen = Math.ceil(buffer.length / tempo) + GRAIN;
    const ctx = _ensureCtx();
    const out = ctx.createBuffer(ch, outLen, sr);
    const win = _hannWindow(GRAIN);
    const norm = new Float32Array(outLen);

    for (let c = 0; c < ch; c++) {
      const inp = buffer.getChannelData(c);
      const o = out.getChannelData(c);
      let inPos = 0;
      let outPos = 0;

      while (outPos + GRAIN <= outLen && inPos + GRAIN <= inp.length) {
        for (let i = 0; i < GRAIN; i++) {
          const oi = outPos + i;
          const ii = inPos + i;
          if (oi < outLen && ii < inp.length) {
            o[oi] += inp[ii] * win[i];
            norm[oi] += win[i];
          }
        }
        inPos += anaHop;
        outPos += synHop;
      }

      for (let i = 0; i < outLen; i++) {
        if (norm[i] > 0.001) o[i] /= norm[i];
      }
    }

    _stretchCache.set(key, out);
    return out;
  }

  function _playbackBuffer() {
    if (_preserve && _tempo < 0.999) return _stretchOla(_original, _tempo);
    return _original;
  }

  function _wallToSource(wallSec) {
    return _pausedSourceTime + wallSec * _tempo;
  }

  function stop() {
    if (_source) {
      try { _source.stop(); } catch { /* noop */ }
      _source.disconnect();
      _source = null;
    }
    _playing = false;
  }

  function load(buffer) {
    stop();
    _original = buffer;
    _stretchCache.clear();
    _pausedSourceTime = 0;
    _sourceOffsetSec = 0;
    _tempo = 1;
    _preserve = true;
  }

  function getDuration() {
    return _original?.duration || 0;
  }

  function getCurrentTime() {
    if (_playing && _ctx) {
      return _wallToSource(_ctx.currentTime - _startedCtxTime);
    }
    return _pausedSourceTime;
  }

  function seek(sourceTime) {
    const dur = getDuration();
    _pausedSourceTime = Math.max(0, Math.min(dur, sourceTime));
    if (_playing) {
      stop();
      play();
    }
  }

  function setTempo(tempo, preservePitch) {
    _tempo = Math.max(0.25, Math.min(2, tempo));
    if (preservePitch !== undefined) _preserve = preservePitch;
    if (_playing) {
      const t = getCurrentTime();
      stop();
      _pausedSourceTime = t;
      play();
    }
  }

  function play() {
    if (!_original) return;
    const ctx = _ensureCtx();
    stop();
    const buf = _playbackBuffer();
    _source = ctx.createBufferSource();
    _source.buffer = buf;

    if (!_preserve || _tempo >= 0.999) {
      _source.playbackRate.value = _tempo;
      _sourceOffsetSec = _pausedSourceTime;
    } else {
      _source.playbackRate.value = 1;
      _sourceOffsetSec = _pausedSourceTime / _tempo;
    }

    _source.connect(_gain);
    _startedCtxTime = ctx.currentTime;
    _source.start(0, Math.min(_sourceOffsetSec, buf.duration - 0.01));
    _playing = true;

    _source.onended = () => {
      if (_playing && getCurrentTime() >= getDuration() - 0.1) {
        _playing = false;
        _pausedSourceTime = 0;
      }
    };
  }

  function pause() {
    if (!_playing) return;
    _pausedSourceTime = getCurrentTime();
    stop();
  }

  function toggle() {
    if (_playing) { pause(); return false; }
    play(); return true;
  }

  function isPlaying() { return _playing; }

  function setPreservePitch(v) {
    _preserve = v;
    if (_playing) {
      const t = getCurrentTime();
      stop();
      _pausedSourceTime = t;
    }
  }

  function destroy() {
    stop();
    if (_ctx) { _ctx.close(); _ctx = null; }
    _gain = null;
    _original = null;
    _stretchCache.clear();
  }

  return {
    load, play, pause, stop, toggle, seek, setTempo, setPreservePitch,
    getCurrentTime, getDuration, isPlaying, destroy,
  };
})();
