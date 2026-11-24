// Mic sound -> chord name. Pure functions, so they run in the browser and in `node listen.test.js`.

export const NAMES = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];

// A piano note also rings faintly at its 5th (3rd overtone) and 3rd (5th overtone).
// ponytail: guessed weights; tune them by watching the bars on the real keyboard.
const OVERTONE = { 0: 1, 7: 0.35, 4: 0.12 };

const BASIC = { '': [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6] };
const EXTRA = { aug: [0, 4, 8], sus2: [0, 2, 7], sus4: [0, 5, 7], 7: [0, 4, 7, 10], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10] };

const FMIN = 100, FMAX = 2500; // Hz: chord notes and their first overtones
const PEAK_DB = 30;            // ignore peaks this far below the loudest

function template(pcs) {
  const t = Array(12).fill(0);
  for (const p of pcs) for (const k in OVERTONE) t[(p + Number(k)) % 12] += OVERTONE[k];
  return t.map(Math.sqrt);
}

// Every chord it may answer with, plus lone notes so a single key isn't mistaken for a chord.
export function candidates(extra = false) {
  const quals = extra ? { ...BASIC, ...EXTRA } : BASIC;
  const list = [];
  for (let r = 0; r < 12; r++) {
    list.push({ name: NAMES[r] + ' (one note)', chord: false, root: r, q: null, t: template([r]) });
    for (const q in quals) list.push({ name: NAMES[r] + q, chord: true, root: r, q, t: template(quals[q].map(i => (r + i) % 12)) });
  }
  for (const c of list) c.norm = Math.hypot(...c.t);
  return list;
}

// Spectrum in dB (AnalyserNode.getFloatFrequencyData) -> loudness of each of the 12 note names.
export function chroma(db, binHz) {
  const c = Array(12).fill(0);
  const lo = Math.ceil(FMIN / binHz), hi = Math.floor(FMAX / binHz);
  let max = -Infinity;
  for (let i = lo; i <= hi; i++) if (db[i] > max) max = db[i];
  for (let i = lo; i <= hi; i++) {
    const a = db[i - 1], b = db[i], d = db[i + 1];
    if (b < max - PEAK_DB || b <= a || b < d) continue; // only peaks
    const off = 0.5 * (a - d) / (a - 2 * b + d) || 0;    // exact peak position between bins
    const midi = 69 + 12 * Math.log2((i + off) * binHz / 440);
    const key = Math.round(midi);
    if (Math.abs(midi - key) > 0.35) continue;          // between keys: noise, not a note
    c[((key % 12) + 12) % 12] += 10 ** (b / 20);
  }
  return c;
}

// Best match first. score is 0..1 (cosine similarity).
export function classify(c, list) {
  const obs = c.map(Math.sqrt), n = Math.hypot(...obs) || 1;
  return list
    .map(k => ({ name: k.name, chord: k.chord, root: k.root, q: k.q, score: obs.reduce((s, v, i) => s + v * k.t[i], 0) / (n * k.norm) }))
    .sort((a, b) => b.score - a.score);
}

// ponytail: guessed tuning knobs; re-tune with mictest.html on the real keyboard.
const ONSET_RATIO = 1.4; // loudness jump that counts as a newly struck chord
const GATE = 3;          // sound must be this many times louder than the room
const MIN_SCORE = 0.85;  // how sure it must be before naming a chord
const RETRY_MS = 250;    // keeps trying this long after a strike, then gives up
const BASIC_LIST = candidates(false);

// Opens the mic (call it from a tap). The first second measures the room, so stay quiet.
// onChord(best) for each struck chord it's sure of, onUnclear(best) when it gives up,
// onFrame({calibrating, level, room, loud, chroma, ranked}) on every screen frame.
export async function startMic({ onChord, onUnclear = () => {}, onFrame = () => {}, getList = () => BASIC_LIST }) {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const ctx = new AudioContext();
  ctx.resume();
  document.addEventListener('visibilitychange', () => ctx.resume());
  const src = ctx.createMediaStreamSource(stream), big = ctx.createAnalyser(), fast = ctx.createAnalyser();
  big.fftSize = 8192;  // fine pitch detail (~170 ms of sound)
  big.smoothingTimeConstant = 0;
  fast.fftSize = 1024; // quick loudness, to catch the moment you strike
  src.connect(big);
  src.connect(fast);
  const spec = new Float32Array(big.frequencyBinCount), wave = new Float32Array(fast.fftSize);
  const binHz = ctx.sampleRate / big.fftSize, windowMs = 1000 * big.fftSize / ctx.sampleRate;
  const t0 = performance.now();
  let room = 0.002, env = 0, struckAt = 0, armed = false;

  requestAnimationFrame(function frame(now) {
    requestAnimationFrame(frame);
    fast.getFloatTimeDomainData(wave);
    let sum = 0;
    for (const x of wave) sum += x * x;
    const level = Math.sqrt(sum / wave.length);
    if (now - t0 < 1000) { room = Math.max(room, level); return onFrame({ calibrating: true }); }

    const loud = level > room * GATE;
    if (loud && level > env * ONSET_RATIO) { struckAt = now; armed = true; } // a strike: wait for a clean window of the new sound
    env = Math.max(level, env * 0.9);

    big.getFloatFrequencyData(spec);
    const c = chroma(spec, binHz), ranked = classify(c, getList());
    onFrame({ calibrating: false, level, room, loud, chroma: c, ranked });

    if (!armed || now - struckAt < windowMs + 20) return;
    const best = ranked[0];
    if (best.chord && best.score >= MIN_SCORE) { armed = false; onChord(best); }
    else if (now - struckAt > windowMs + RETRY_MS) { armed = false; onUnclear(best); }
  });
}
