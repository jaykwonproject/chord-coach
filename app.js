import { startMic, candidates } from './listen.js';
import { drawKeys } from './keys.js';
import { inferKey, suggest, rateMove, label, same, voice, noteName, rootName, keyName, PALETTES } from './theory.js';

const REPS = 3; // ponytail: plays of a chord before the next one shows in grey; make it a setting if 3 feels wrong
const HINTS = { keys: 'Keys', name: 'Name', off: 'Off' }; // how much of the next chord to show; Off = free play
const STYLES = { jazz: 'Jazz', pop: 'Pop' };
const LEVELS = { easy: 'Easy', medium: 'Medium', full: 'Full' };
const LISTS = { jazz: candidates(PALETTES.jazz), pop: candidates(PALETTES.pop) };
const FIRST = { jazz: { root: 0, q: 'maj7' }, pop: { root: 0, q: '' } };
const $ = id => document.getElementById(id);
const load = (k, ok) => { try { const v = localStorage.getItem(k); return ok[v] ? v : null; } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
const cycle = (obj, v) => { const ks = Object.keys(obj); return ks[(ks.indexOf(v) + 1) % ks.length]; };

let hints = load('hints', HINTS) || 'keys', style = load('style', STYLES) || 'jazz', level = load('level', LEVELS) || 'easy';
let key, history, current, currentVoice, reps, picks, heard, heardVoice, note, stray, flashTimer;

const nameHTML = c => `${rootName(c, key)}<small>${c.q}</small>`;
const plain = c => rootName(c, key) + c.q;
const jobText = c => { const l = label(c, key); return l.roman ? `${l.job} · ${l.roman}` : l.job; };
const ready = () => reps >= REPS && !!picks[0]; // has the next chord been unlocked?

// A chord's keys: finger number on top, note name below.
function marks(c, v, lh = 'lh', rh = 'rh') {
  return [
    ...v.lh.map((midi, i) => ({ midi, cls: lh, top: v.lhFingers[i], bottom: noteName(c, midi, key) })),
    ...v.rh.map((midi, i) => ({ midi, cls: rh, top: v.rhFingers[i], bottom: noteName(c, midi, key) })),
  ];
}

function setPicks() {
  if (!key) { picks = []; return; }
  const [main, ...rest] = suggest(current.chord, key, history, style), inKey = rest.filter(s => s.roman), colour = rest.filter(s => !s.roman);
  picks = [main, inKey[0], colour[0] ?? inKey[1]].filter(Boolean);
}

function reset() {
  key = null; history = []; reps = 0; picks = []; heard = null; stray = null; note = '';
  current = { chord: FIRST[style], move: 'the home chord of C: a good first chord' };
  currentVoice = voice(current.chord, null, level);
}

// Practise `s` from now on; you've just played it `count` times.
function moveTo(s, count) {
  const prev = current.chord, oldKey = key;
  history = [...history, s.chord].slice(-6);
  key = inferKey(history, key);
  const rating = oldKey ? rateMove(prev, s.chord, oldKey, style) : '';
  note = oldKey ? `${plain(prev)} → ${plain(s.chord)} · ${rating}` : `Starting from ${plain(s.chord)} · key of ${keyName(key)}`;
  if (oldKey && keyName(oldKey) !== keyName(key)) note += ` · now in ${keyName(key)}`;
  current = { chord: s.chord, move: s.move || rating };
  currentVoice = voice(s.chord, currentVoice.rh, level);
  reps = count;
  stray = null;
  setPicks();
}

function onChord(best) {
  const chord = { root: best.root, q: best.q };
  if (hints === 'off') return freePlay(chord);
  if (same(chord, current.chord)) { // another good rep
    if (!key) { history = [current.chord]; key = inferKey(history, null); setPicks(); }
    reps++;
    stray = null;
    note = reps < REPS ? `✓ ${reps} of ${REPS}` : reps === REPS ? '✓ Nice. The next chord is in pink: play it when you’re ready.' : `✓ ${reps} times`;
    heard = current.chord; heardVoice = currentVoice;
    return flash();
  }
  if (ready() && same(chord, picks[0].chord)) { // moving on to the grey chord
    moveTo(picks[0], 1);
    heard = current.chord; heardVoice = currentVoice;
    return flash();
  }
  // Something else. Once could be a slip (or the mic mishearing); twice in a row means you want to practise it.
  stray = same(stray, chord) ? { ...stray, n: stray.n + 1 } : { ...chord, n: 1 };
  heard = chord; heardVoice = voice(chord, currentVoice.rh, level);
  if (stray.n >= 2) { moveTo({ chord }, 2); heard = current.chord; heardVoice = currentVoice; return flash(); }
  note = `Not ${plain(current.chord)}. Play it again to practise ${plain(chord)} instead.`;
  render();
}

// Hints off: the app follows every chord you play, names it and rates the move.
function freePlay(chord) {
  if (same(chord, heard)) return;
  const prev = heard, oldKey = key;
  history = [...history, chord].slice(-6);
  key = inferKey(history, key);
  const rating = prev && oldKey ? rateMove(prev, chord, oldKey, style) : '';
  note = prev ? `${plain(prev)} → ${plain(chord)} · ${rating}` : `Key of ${keyName(key)}`;
  heard = chord; heardVoice = voice(chord, heardVoice?.rh, level);
  current = { chord, move: rating }; currentVoice = heardVoice; // so practice can pick up from here
  render();
}

function render() {
  $('hints').textContent = 'Hints: ' + HINTS[hints];
  $('style').textContent = STYLES[style];
  $('level').textContent = LEVELS[level];
  $('key').textContent = key ? 'Key of ' + keyName(key) : 'Key: not yet';

  $('pName').innerHTML = heard ? nameHTML(heard) : '–';
  $('pTag').textContent = heard && key ? jobText(heard) : '';
  drawKeys($('pKeys'), heard ? marks(heard, heardVoice, 'you', 'you') : []);
  $('pMove').textContent = note || 'Strike the chord with both hands and hold it a moment.';

  if (hints === 'off') {
    const [mv, strength] = (current.move || '').split(' · ');
    $('nLabel').textContent = 'Free play';
    $('nName').innerHTML = `<span class="dim msg">${heard ? strength || mv : 'play anything'}</span>`;
    $('nTag').textContent = heard && strength ? mv : 'The app names each chord and rates the move.';
    $('nSub').textContent = '';
    $('then').innerHTML = '';
    return drawKeys($('keys'), heard ? marks(heard, heardVoice) : []);
  }

  const done = Math.min(reps, REPS);
  $('nLabel').textContent = 'Practise';
  $('nName').innerHTML = `${nameHTML(current.chord)}<span class="reps">${'●'.repeat(done)}${'○'.repeat(REPS - done)}</span>`;
  $('nTag').textContent = '';
  $('nSub').textContent = [current.move, key && jobText(current.chord), currentVoice.extra.length && `adds the ${currentVoice.extra.join(' and ')}`].filter(Boolean).join(' · ');

  const next = picks[0], now = marks(current.chord, currentVoice);
  let ahead = [];
  if (ready()) {
    const alts = picks.slice(1).map((s, i) => `<button data-i="${i + 1}">${nameHTML(s.chord)}</button>`).join('');
    $('then').innerHTML = `<span>Next <b>${nameHTML(next.chord)}</b> ${next.move}</span>${alts ? `<span class="alts">or ${alts}</span>` : ''}`;
    if (hints === 'keys') { // next chord's keys in pink; keys it shares with this chord get a pink stripe (that finger stays)
      for (const m of marks(next.chord, voice(next.chord, currentVoice.rh, level), 'next', 'next')) {
        const shared = now.find(k => k.midi === m.midi);
        if (shared) shared.band = 'next'; else ahead.push(m);
      }
    }
  } else {
    $('then').innerHTML = `<span class="dim">Play it ${REPS - done} more time${REPS - done === 1 ? '' : 's'} to see what comes next.</span>`;
  }
  drawKeys($('keys'), [...now, ...ahead]);
}

function flash() { // the chord's keys flash green, then back to normal
  render();
  drawKeys($('keys'), marks(current.chord, currentVoice, 'hit', 'hit'));
  clearTimeout(flashTimer);
  flashTimer = setTimeout(render, 350);
}

$('then').onclick = e => { // pick a different next chord
  const i = Number(e.target.closest('button')?.dataset.i);
  if (i) { [picks[0], picks[i]] = [picks[i], picks[0]]; render(); }
};
$('hints').onclick = () => {
  const wasFree = hints === 'off';
  hints = cycle(HINTS, hints);
  save('hints', hints);
  if (wasFree) reps = heard ? 1 : 0; // back from free play: practise the chord you're on
  setPicks();
  render();
};
$('style').onclick = () => { style = cycle(STYLES, style); save('style', style); reset(); render(); };
$('level').onclick = () => {
  level = cycle(LEVELS, level);
  save('level', level);
  currentVoice = voice(current.chord, null, level);
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
      onChord, onFrame,
      getList: () => LISTS[style],
      getPrefer: () => (hints === 'off' ? null : [current.chord, ready() ? picks[0].chord : null]),
    });
    wake();
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && wake());
  } catch (e) {
    $('startMsg').textContent = `Couldn't open the microphone (${e.message}). Allow it for this site in Chrome, then reload.`;
    $('go').disabled = false;
  }
};

reset();
render();
