import { startMic, candidates } from './listen.js';
import { drawKeys } from './keys.js';
import { inferKey, suggest, rateMove, label, same, voice, noteName, rootName, keyName, PALETTES } from './theory.js';

const REPS = 3; // ponytail: plays of a chord before the next one shows in grey; make it a setting if 3 feels wrong
const HINTS = { keys: 'Next: keys', off: 'Free play' }; // practise with the next chord's keys shown, or free play
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

// Remember a chord you played: the last 12 steer variety in suggestions, the last 6 decide the key.
function remember(chord) {
  history = [...history, chord].slice(-12);
  key = inferKey(history.slice(-6), key);
}

// Practise `s` from now on; you've just played it `count` times.
function moveTo(s, count) {
  const prev = current.chord, oldKey = key;
  remember(s.chord);
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
    if (!key) { remember(current.chord); setPicks(); }
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

// Free play: the app follows every chord you play, names it, rates the move and shows what can come next.
function freePlay(chord) {
  if (heard && same(chord, current.chord)) return; // the same chord again isn't a move
  const followed = heard && picks[0] && same(chord, picks[0].chord), prev = heard ? current.chord : null, oldKey = key;
  remember(chord);
  const rating = prev && oldKey ? rateMove(prev, chord, oldKey, style) : '';
  note = prev ? `${plain(prev)} → ${plain(chord)} · ${rating}` : `Key of ${keyName(key)}`;
  if (oldKey && keyName(oldKey) !== keyName(key)) note += ` · now in ${keyName(key)}`;
  current = { chord, move: rating };
  currentVoice = voice(chord, currentVoice.rh, level);
  heard = chord; heardVoice = currentVoice;
  reps = REPS; // no practising here: the next chord shows straight away
  setPicks();
  followed ? flash() : render();
}

// The mic heard something but couldn't name it.
function onUnclear(best) {
  note = best.chord ? 'Didn’t catch that one. Strike it again and hold it a moment.'
    : `Just one note (${best.name.split(' ')[0]}). Press two or three keys together for a chord.`;
  render();
}

function render() {
  const free = hints === 'off';
  document.body.classList.toggle('free', free);
  $('hints').textContent = HINTS[hints];
  $('style').textContent = STYLES[style];
  $('level').textContent = LEVELS[level];
  $('key').textContent = key ? 'Key of ' + keyName(key) : 'Key: not yet';

  if (free) { // left: the chords you've played so far
    $('pLabel').textContent = 'Your chords';
    $('pName').innerHTML = heard ? history.slice(-4).map(nameHTML).join(' → ') : '–';
    $('pTag').textContent = '';
    $('pMove').textContent = note || 'Play anything. The app names it and shows what can come next.';
  } else {
    $('pLabel').textContent = 'You played';
    $('pName').innerHTML = heard ? nameHTML(heard) : '–';
    $('pTag').textContent = heard && key ? jobText(heard) : '';
    drawKeys($('pKeys'), heard ? marks(heard, heardVoice, 'you', 'you') : []);
    $('pMove').textContent = note || 'Strike the chord with both hands and hold it a moment.';
  }

  if (free && !heard) {
    $('nLabel').textContent = 'Free play';
    $('nName').innerHTML = '<span class="dim msg">play anything</span>';
    $('nSub').textContent = '';
    $('then').innerHTML = '';
    return drawKeys($('keys'));
  }

  const done = Math.min(reps, REPS);
  $('nLabel').textContent = free ? 'You played' : 'Practise';
  $('nName').innerHTML = nameHTML(current.chord) + (free ? '' : `<span class="reps">${'●'.repeat(done)}${'○'.repeat(REPS - done)}</span>`);
  $('nTag').textContent = '';
  $('nSub').textContent = [current.move, key && jobText(current.chord), currentVoice.extra.length && `adds the ${currentVoice.extra.join(' and ')}`].filter(Boolean).join(' · ');

  const next = picks[0], now = marks(current.chord, currentVoice);
  let ahead = [];
  if (ready()) {
    const alts = picks.slice(1).map((s, i) => `<button data-i="${i + 1}">${nameHTML(s.chord)}</button>`).join('');
    $('then').innerHTML = `<span>Next <b>${nameHTML(next.chord)}</b> ${next.move}</span>${alts ? `<span class="alts">or ${alts}</span>` : ''}`;
    // next chord's keys in pink; keys it shares with this chord get a pink stripe (that finger stays)
    for (const m of marks(next.chord, voice(next.chord, currentVoice.rh, level), 'next', 'next')) {
      const shared = now.find(k => k.midi === m.midi);
      if (shared) shared.band = 'next'; else ahead.push(m);
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
  hints = cycle(HINTS, hints);
  save('hints', hints);
  reps = hints === 'off' ? REPS : heard ? 1 : 0; // free play shows the next chord at once; practice starts on the chord you're on
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
      onChord, onFrame, onUnclear,
      getList: () => (hints === 'off' ? LISTS.jazz : LISTS[style]), // free play listens for every chord type
      getPrefer: () => (hints === 'off' ? (heard && picks[0] ? [picks[0].chord] : null) : [current.chord, ready() ? picks[0].chord : null]),
    });
    wake();
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && wake());
  } catch (e) {
    $('startMsg').textContent = `Couldn't open the microphone (${e.message}). Allow it for this site in Chrome, then reload.`;
    $('go').disabled = false;
  }
};

$('ver').textContent = 'v' + (new URL(import.meta.url).searchParams.get('v') ?? '?'); // which code the phone is running

reset();
render();
