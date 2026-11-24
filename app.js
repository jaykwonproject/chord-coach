import { startMic, candidates } from './listen.js';
import { drawKeys } from './keys.js';
import { inferKey, suggest, rateMove, label, same, voice, noteName, rootName, keyName, PALETTES } from './theory.js';

const WAIT_MS = 3000; // Hints "Wait": how long before the next chord is revealed
const HINTS = { show: 'Show', wait: 'Wait', off: 'Off' };
const STYLES = { jazz: 'Jazz', pop: 'Pop' };
const LISTS = { jazz: candidates(PALETTES.jazz), pop: candidates(PALETTES.pop) };
const FIRST = { jazz: { root: 0, q: 'maj7' }, pop: { root: 0, q: '' } };
const $ = id => document.getElementById(id);
const load = (k, ok) => { try { const v = localStorage.getItem(k); return ok[v] ? v : null; } catch { return null; } };
const save = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

let hints = load('hints', HINTS) || 'show', style = load('style', STYLES) || 'jazz';
let last = null, lastVoice = null, history = [], key = null, move = '', rating = '', hidden = false, waitTimer = 0, flashTimer = 0;
let picks = []; // [main suggestion, in-key alternative, colour alternative]

const nameHTML = c => `${rootName(c, key)}<small>${c.q}</small>`;
const plain = c => rootName(c, key) + c.q;

// Both hands on the keyboard: finger number on top, note name below.
function marks(c, v, lh = 'lh', rh = 'rh') {
  return [
    ...v.lh.map((midi, i) => ({ midi, cls: lh, top: v.lhFingers[i], bottom: noteName(c, midi, key) })),
    ...v.rh.map((midi, i) => ({ midi, cls: rh, top: v.rhFingers[i], bottom: noteName(c, midi, key) })),
  ];
}

function setPicks() {
  if (!last) { picks = [{ chord: FIRST[style], move: 'the home chord of C: a good first chord', roman: 'I', job: 'home' }]; return; }
  const [main, ...rest] = suggest(last, key, history, style), inKey = rest.filter(s => s.roman), colour = rest.filter(s => !s.roman);
  picks = [main, inKey[0], colour[0] ?? inKey[1]].filter(Boolean);
}

function renderPlayed() {
  const l = label(last, key);
  $('pName').innerHTML = nameHTML(last);
  $('pTag').textContent = l.roman ? `${l.job} · ${l.roman}` : l.job;
  drawKeys($('pKeys'), marks(last, lastVoice, 'you', 'you'));
  $('pMove').textContent = move;
  $('key').textContent = 'Key of ' + keyName(key);
}

function renderNext() {
  $('hints').textContent = 'Hints: ' + HINTS[hints];
  $('style').textContent = STYLES[style];
  $('alts').innerHTML = '';
  $('nSub').textContent = '';
  if (hints === 'off') { // free play: no suggestions; the big keyboard shows what you played
    const [mv, strength] = rating.split(' · ');
    $('nLabel').textContent = 'Free play';
    $('nName').innerHTML = `<span class="dim msg">${strength || mv || 'play anything'}</span>`;
    $('nTag').textContent = strength ? mv : 'The app names each chord and rates the move.';
    return drawKeys($('keys'), last ? marks(last, lastVoice) : []);
  }
  $('nLabel').textContent = 'Next';
  if (hidden) {
    $('nName').innerHTML = '<span class="dim msg">your move…</span>';
    $('nTag').textContent = 'Tap here for a hint.';
    return drawKeys($('keys'));
  }
  const t = picks[0], v = voice(t.chord, lastVoice?.rh);
  $('nName').innerHTML = nameHTML(t.chord);
  $('nTag').textContent = t.move;
  $('nSub').textContent = [t.roman ? `${t.job} · ${t.roman}` : t.job, v.extra.length && `right hand adds the ${v.extra.join(' and ')}`].filter(Boolean).join(' · ');
  if (picks.length > 1) $('alts').innerHTML = 'or ' + picks.slice(1).map((s, i) => `<button data-i="${i + 1}">${nameHTML(s.chord)}</button>`).join('');
  drawKeys($('keys'), marks(t.chord, v));
}

function onChord(best) {
  const heard = { root: best.root, q: best.q }, target = picks[0]?.chord;
  const hit = hints !== 'off' && same(heard, target), chord = hit ? target : heard; // a hit keeps the name the app asked for
  if (same(chord, last)) return; // the same chord again isn't a move
  const oldKey = key;
  rating = last ? rateMove(last, chord, oldKey, style) : '';
  history = [...history, chord].slice(-6);
  key = inferKey(history, key);
  move = last ? `${plain(last)} → ${plain(chord)} · ${rating}` : `First chord · key of ${keyName(key)}`;
  if (oldKey && keyName(oldKey) !== keyName(key)) move += ` · now in ${keyName(key)}`;
  lastVoice = voice(chord, lastVoice?.rh);
  last = chord;
  setPicks();
  hidden = hints === 'wait';
  clearTimeout(waitTimer);
  if (hidden) waitTimer = setTimeout(() => { hidden = false; renderNext(); }, WAIT_MS);
  renderPlayed();
  clearTimeout(flashTimer);
  if (!hit) return renderNext();
  $('nName').innerHTML = `<span class="ok">✓ ${nameHTML(chord)}</span>`; // flash green, then show what's next
  drawKeys($('keys'), marks(chord, lastVoice, 'hit', 'hit'));
  flashTimer = setTimeout(renderNext, 400);
}

$('alts').onclick = e => {
  const i = Number(e.target.closest('button')?.dataset.i);
  if (i) { [picks[0], picks[i]] = [picks[i], picks[0]]; renderNext(); }
};
$('next').onclick = () => { if (hidden) { hidden = false; renderNext(); } };
$('hints').onclick = () => {
  hints = { show: 'wait', wait: 'off', off: 'show' }[hints];
  save('hints', hints);
  hidden = false;
  renderNext();
};
$('style').onclick = () => {
  style = style === 'jazz' ? 'pop' : 'jazz';
  save('style', style);
  setPicks();
  renderNext();
};

let ready = false, earOn = false;
function onFrame(f) {
  if (f.calibrating) { $('startMsg').textContent = 'Stay quiet for a second…'; return; }
  if (!ready) { ready = true; $('start').hidden = true; }
  if (f.loud !== earOn) { earOn = f.loud; $('ear').classList.toggle('on', earOn); }
}

const wake = () => navigator.wakeLock?.request('screen').catch(() => {});
$('go').onclick = async () => {
  $('go').disabled = true;
  document.documentElement.requestFullscreen?.()?.catch(() => {});
  try {
    await startMic({ onChord, onFrame, getList: () => LISTS[style], getPrefer: () => (hints === 'off' ? null : picks[0]?.chord) });
    wake();
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && wake());
  } catch (e) {
    $('startMsg').textContent = `Couldn't open the microphone (${e.message}). Allow it for this site in Chrome, then reload.`;
    $('go').disabled = false;
  }
};

setPicks();
renderNext();
