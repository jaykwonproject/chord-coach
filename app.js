import { startMic, candidates } from './listen.js';
import { drawKeys } from './keys.js';
import {
  inferKey, suggest, rateMove, label, same, voice, noteName, rootName, keyName, PALETTES,
  PROGRESSIONS, findProgression, progChords, continuation,
} from './theory.js';

const LOOPS = 3; // ponytail: times round a progression before variations are offered; make it a setting if 3 feels wrong
const MODES = { keys: 'Progressions', off: 'Free play' }; // saved under 'hints' so earlier settings carry over
const STYLES = { jazz: 'Jazz', pop: 'Pop' };
const LEVELS = { easy: 'Easy', medium: 'Medium', full: 'Full' };
const LISTS = { jazz: candidates(PALETTES.jazz), pop: candidates(PALETTES.pop) };
const $ = id => document.getElementById(id);
const load = (k, ok) => { try { const v = localStorage.getItem(k); return ok[v] ? v : null; } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const cycle = (obj, v) => { const ks = Object.keys(obj); return ks[(ks.indexOf(v) + 1) % ks.length]; };

let mode = load('hints', MODES) || 'keys', style = load('style', STYLES) || 'jazz', level = load('level', LEVELS) || 'easy';
let key = null, heard = null, heardVoice = null, note = '', flashTimer = 0;
let prog, chords, voices, pos, loops;           // progressions: the loop you're practising and where you are in it
let history = [], current = null, currentVoice = null, picks = []; // free play: what you've played, what could come next

const nameHTML = c => `${rootName(c, key)}<small>${c.q}</small>`;
const plain = c => rootName(c, key) + c.q;
const jobText = c => { const l = label(c, key); return l.roman ? `${l.job} · ${l.roman}` : l.job; };
const free = () => mode === 'off';

// A chord's keys: finger number on top, note name below.
function marks(c, v, lh = 'lh', rh = 'rh') {
  return [
    ...v.lh.map((midi, i) => ({ midi, cls: lh, top: v.lhFingers[i], bottom: noteName(c, midi, key) })),
    ...v.rh.map((midi, i) => ({ midi, cls: rh, top: v.rhFingers[i], bottom: noteName(c, midi, key) })),
  ];
}

// This chord in colour, the next one in pink; keys they share get a pink stripe (that finger stays put).
function drawWithNext(c, v, nc, nv) {
  const now = marks(c, v), ahead = [];
  if (nc) for (const m of marks(nc, nv, 'next', 'next')) {
    const shared = now.find(k => k.midi === m.midi);
    if (shared) shared.band = 'next'; else ahead.push(m);
  }
  drawKeys($('keys'), [...now, ...ahead]);
}

function flash(c, v) { // keys flash green, then back to normal
  render();
  drawKeys($('keys'), marks(c, v, 'hit', 'hit'));
  clearTimeout(flashTimer);
  flashTimer = setTimeout(render, 350);
}

// ---- Progressions: play the loop round and round ----

function startProg(p) {
  prog = p;
  key = { tonic: p.mode === 'minor' ? 9 : 0, mode: p.mode };
  chords = progChords(p, key.tonic);
  revoice();
  pos = 0; loops = 0; heard = null; note = '';
}

function revoice() { // the same shapes every time round, each moving as little as possible from the one before
  let prev = null;
  voices = [];
  for (let pass = 0; pass < 2; pass++) chords.forEach((c, i) => { voices[i] = voice(c, prev, level); prev = voices[i].rh; });
}

function onProgChord(chord) {
  const n = chords.length, want = chords[pos];
  if (same(chord, want)) {
    heard = want; heardVoice = voices[pos];
    if (pos === n - 1) note = ++loops < LOOPS ? `✓ Round ${loops} done. Again from ${plain(chords[0])}.` : `✓ Round ${loops}. Nice! Try a variation whenever you like.`;
    else note = `✓ ${plain(want)}`;
    pos = (pos + 1) % n;
    return flash(heard, heardVoice);
  }
  if (same(chord, chords[(pos - 1 + n) % n])) return; // struck the last chord again: nothing changes
  const at = chords.findIndex(c => same(c, chord));
  heard = chord;
  if (at >= 0) { // a chord from elsewhere in the loop: carry on from there
    heardVoice = voices[at]; pos = (at + 1) % n;
    note = `${plain(chord)}: carrying on from there.`;
    return flash(chord, heardVoice);
  }
  heardVoice = voice(chord, voices[pos].rh, level);
  note = `That was ${plain(chord)}. This progression wants ${plain(want)} here.`;
  render();
}

function renderProg() {
  const n = chords.length, done = Math.min(loops, LOOPS), after = (pos + 1) % n;
  $('pLabel').textContent = 'You played';
  $('pName').innerHTML = heard ? nameHTML(heard) : '–';
  $('pTag').textContent = heard ? jobText(heard) : '';
  drawKeys($('pKeys'), heard ? marks(heard, heardVoice, 'you', 'you') : []);
  $('pMove').textContent = note || `Play the chords in order, round and round. Start with ${plain(chords[0])}.`;

  $('nLabel').innerHTML = `Progression · <span class="romans">${prog.romans}</span> · ${prog.name}`;
  $('nName').innerHTML = chords.map((c, i) => `<span class="chip${i === pos ? ' now' : i === after ? ' after' : ''}">${nameHTML(c)}</span>`).join('')
    + `<span class="reps">${'●'.repeat(done)}${'○'.repeat(LOOPS - done)}</span>`;
  $('nSub').textContent = `${plain(chords[pos])} → ${plain(chords[after])}: ${rateMove(chords[pos], chords[after], key, style).split(' · ')[0]}`;
  $('then').innerHTML = loops >= LOOPS
    ? `<span>Try a variation:</span><span class="alts">${prog.next.map(id => findProgression(id)).map(p => `<button data-p="${p.id}">${p.romans}</button>`).join('')}</span>`
    : `<span class="dim">Go round ${LOOPS - done} more time${LOOPS - done === 1 ? '' : 's'}, then try a variation.</span>`;
  drawWithNext(chords[pos], voices[pos], chords[after], voices[after]);
}

// ---- Free play: play anything; the app names it and shows what can come next ----

function setPicks() {
  if (!key || !current) { picks = []; return; }
  const c = continuation(history, key, style), sug = suggest(current.chord, key, history, style);
  const [main, ...rest] = c ? [c, ...sug.filter(s => !same(s.chord, c.chord))] : sug;
  const inKey = rest.filter(s => s.roman), colour = rest.filter(s => !s.roman);
  picks = [main, inKey[0], colour[0] ?? inKey[1]].filter(Boolean);
}

function onFreeChord(chord) {
  if (current && same(chord, current.chord)) return; // the same chord again isn't a move
  const followed = picks[0] && same(chord, picks[0].chord), prev = current?.chord, oldKey = key;
  history = [...history, chord].slice(-12);
  key = inferKey(history.slice(-6), key);
  const rating = prev && oldKey ? rateMove(prev, chord, oldKey, style) : '';
  note = prev ? `${plain(prev)} → ${plain(chord)} · ${rating}` : `Key of ${keyName(key)}`;
  if (oldKey && keyName(oldKey) !== keyName(key)) note += ` · now in ${keyName(key)}`;
  currentVoice = voice(chord, currentVoice?.rh, level);
  current = { chord, move: rating };
  heard = chord; heardVoice = currentVoice;
  setPicks();
  followed ? flash(chord, currentVoice) : render();
}

function renderFree() {
  $('pLabel').textContent = 'Your chords';
  $('pName').innerHTML = history.length ? history.slice(-4).map(nameHTML).join(' → ') : '–';
  $('pTag').textContent = '';
  $('pMove').textContent = note || 'Play anything. The app names it and shows what can come next.';
  if (!current) {
    $('nLabel').textContent = 'Free play';
    $('nName').innerHTML = '<span class="dim msg">play anything</span>';
    $('nSub').textContent = $('then').innerHTML = '';
    return drawKeys($('keys'));
  }
  const next = picks[0], nv = next && voice(next.chord, currentVoice.rh, level);
  $('nLabel').textContent = 'You played';
  $('nName').innerHTML = nameHTML(current.chord);
  $('nSub').textContent = [jobText(current.chord), currentVoice.extra.length && `adds the ${currentVoice.extra.join(' and ')}`].filter(Boolean).join(' · ');
  const alts = picks.slice(1).map((s, i) => `<button data-i="${i + 1}">${nameHTML(s.chord)}</button>`).join('');
  $('alts').innerHTML = alts ? `or ${alts}` : '';
  $('then').innerHTML = next ? `<span>Next <b>${nameHTML(next.chord)}</b> ${next.move}</span>` : '';
  drawWithNext(current.chord, currentVoice, next?.chord, nv);
}

// ---- Shared ----

function render() {
  document.body.classList.toggle('free', free());
  $('alts').innerHTML = '';
  $('hints').textContent = MODES[mode];
  $('style').textContent = STYLES[style];
  $('level').textContent = LEVELS[level];
  $('key').textContent = key ? 'Key of ' + keyName(key) : 'Key: not yet';
  free() ? renderFree() : renderProg();
}

function onChord(best) { (free() ? onFreeChord : onProgChord)({ root: best.root, q: best.q }); }

function onUnclear(best) { // the mic heard something but couldn't name it
  note = best.chord ? 'Didn’t catch that one. Strike it again and hold it a moment.'
    : `Just one note (${best.name.split(' ')[0]}). Press two or three keys together for a chord.`;
  render();
}

$('then').onclick = $('alts').onclick = e => {
  const b = e.target.closest('button');
  if (b?.dataset.p) { startProg(findProgression(b.dataset.p)); render(); }                 // a variation
  else if (b?.dataset.i) { const i = +b.dataset.i; [picks[0], picks[i]] = [picks[i], picks[0]]; render(); } // another next chord
};
$('hints').onclick = () => {
  mode = cycle(MODES, mode);
  save('hints', mode);
  if (free()) { history = []; current = null; currentVoice = null; picks = []; note = ''; } // free play starts fresh
  else startProg(prog);
  render();
};
$('style').onclick = () => { style = cycle(STYLES, style); save('style', style); startProg(PROGRESSIONS[style][0]); render(); };
$('level').onclick = () => {
  level = cycle(LEVELS, level);
  save('level', level);
  revoice();
  if (current) currentVoice = voice(current.chord, null, level);
  if (heard) heardVoice = voice(heard, null, level);
  render();
};

let started = false, earOn = false;
function onFrame(f) {
  if (f.calibrating) { $('startMsg').textContent = 'Stay quiet for a second…'; return; }
  if (!started) { started = true; $('start').hidden = true; }
  if (f.loud !== earOn) { earOn = f.loud; $('ear').classList.toggle('on', earOn); }
}

const wake = () => navigator.wakeLock?.request('screen').catch(() => {});
$('go').onclick = async () => {
  $('go').disabled = true;
  document.documentElement.requestFullscreen?.()?.catch(() => {});
  try {
    await startMic({
      onChord, onFrame, onUnclear,
      getList: () => (free() ? LISTS.jazz : LISTS[style]), // free play listens for every chord type
      getPrefer: () => (free() ? (picks[0] ? [picks[0].chord] : null) : [chords[pos], chords[(pos + 1) % chords.length]]),
    });
    wake();
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && wake());
  } catch (e) {
    $('startMsg').textContent = `Couldn't open the microphone (${e.message}). Allow it for this site in Chrome, then reload.`;
    $('go').disabled = false;
  }
};

$('ver').textContent = 'v' + (new URL(import.meta.url).searchParams.get('v') ?? '?'); // which code the phone is running

startProg(PROGRESSIONS[style][0]);
render();
