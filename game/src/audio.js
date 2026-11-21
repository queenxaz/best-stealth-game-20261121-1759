// audio.js — every sound in EMBERWATCH is synthesized with WebAudio: no
// audio files, no network. Footsteps, pebble clatter, key chimes, the alarm
// sting, crickets at night and a soft win arpeggio. Created lazily on the
// first user gesture (browsers block audio before one).

let ctx = null;
let muted = false;
let cricketTimer = null;

function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  return ctx;
}

/** Call from the first click/keypress; starts the night ambience. */
export function unlockAudio() {
  const c = ensureCtx();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  startCrickets();
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, lowFreq) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowFreq;
  const gain = c.createGain();
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

/** A soft footstep; pitch alternates so it never sounds mechanical. */
export function playStep(sneaking, alternate) {
  if (sneaking) noiseBurst(0.05, 0.05, 500);
  else noiseBurst(0.07, 0.11, 900 + (alternate ? 120 : 0));
}

/** A guard's heavier boot, heard when one walks near the keeper. */
export function playGuardStep(distance) {
  const vol = Math.max(0.02, 0.16 - distance / 1400);
  noiseBurst(0.08, vol, 420);
}

/** The pebble's clatter on stone. */
export function playPebble() {
  tone(1900, 0.05, 'square', 0.05);
  tone(1400, 0.06, 'square', 0.045, 0.05);
  tone(950, 0.09, 'square', 0.04, 0.11);
}

/** An ember key is collected: a bright two-note chime. */
export function playKey() {
  tone(880, 0.14, 'sine', 0.12);
  tone(1318, 0.22, 'sine', 0.1, 0.09);
}

/** The alarm sting when a guard's suspicion fills. */
export function playAlarm() {
  tone(220, 0.28, 'sawtooth', 0.09, 0, 440);
  tone(220, 0.28, 'sawtooth', 0.09, 0.24, 440);
  tone(330, 0.4, 'sawtooth', 0.08, 0.5, 660);
}

/** A short rising "someone saw something" blip at half suspicion. */
export function playSpotted() {
  tone(660, 0.1, 'triangle', 0.1);
  tone(880, 0.14, 'triangle', 0.09, 0.08);
}

/** The gate swings open: a low warm swell. */
export function playGateOpen() {
  tone(196, 0.7, 'sine', 0.1, 0, 392);
  tone(294, 0.7, 'sine', 0.07, 0.12, 587);
}

/** A level is cleared. */
export function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'sine', 0.11, i * 0.11));
}

/** Caught. */
export function playCaught() {
  tone(392, 0.25, 'sawtooth', 0.1, 0, 196);
  tone(262, 0.5, 'sawtooth', 0.1, 0.2, 131);
}

/** A soft click for menus and buttons. */
export function playClick() {
  tone(1200, 0.05, 'sine', 0.07);
}

/** Night crickets: a quiet chirp every couple of seconds, at random pitch. */
function startCrickets() {
  if (cricketTimer !== null || !ctx) return;
  const chirp = () => {
    if (!muted && ctx && ctx.state === 'running' && Math.random() < 0.8) {
      const base = 3800 + Math.random() * 800;
      for (let i = 0; i < 3; i++) tone(base, 0.03, 'sine', 0.012, i * 0.05);
    }
    cricketTimer = window.setTimeout(chirp, 1400 + Math.random() * 2200);
  };
  cricketTimer = window.setTimeout(chirp, 900);
}
