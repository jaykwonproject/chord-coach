import { startMic } from './listen.js';
import { drawKeys } from './keys.js';
import { inferKey, suggest, rateMove, degree, same, spell, keysOf, rootName, keyName } from './theory.js';

const WAIT_MS = 3000; // Hints "Wait": how long before the next chord is revealed
const HINTS = { show: 'Show', wait: 'Wait', off: 'Off' };
const $ = id => document.getElementById(id);
const saved = (() => { try { return localStorage.getItem('hints'); } catch { return null; } })();

let hints = HINTS[saved] ? saved : 'show';
let last = null, history = [], key = null, move = '', rating = '', hidden = false, waitTimer = 0, flashTimer = 0;
let next = [{ chord: { root: 0, q: '' }, roman: '', job: '', why: 'all white keys, a good first chord' }];

const nameHTML = c => `${rootName(c, key)}<small>${c.q}</small>`;
const plain = c => rootName(c, key) + c.q;

function renderPlayed() {
  const d = degree(last, key);
  $('pName').innerHTML = nameHTML(last);
  $('pTag').textContent = `${d ? `${d.job} · ${d.roman}` : 'outside the key'} · ${spell(last, key).join(' ')}`;
  drawKeys($('pKeys'), keysOf(last), [], 'you');
  $('pMove').textContent = move;
  $('key').textContent = 'Key of ' + keyName(key);
}

function renderNext() {
  $('hints').textContent = 'Hints: ' + HINTS[hints];
  $('alts').innerHTML = '';
  if (hints === 'off') { // free play: no suggestions, the big keyboard shows what you played
    $('nLabel').textContent = 'Free play';
    $('nName').innerHTML = `<span class="dim" style="font-size:.5em">${rating || 'play anything'}</span>`;
    $('nTag').textContent = 'The app names each chord and rates the move.';
    return drawKeys($('keys'), last ? keysOf(last) : [], last ? spell(last, key) : [], 'you');
  }
  $('nLabel').textContent = 'Next';
  if (hidden) {
    $('nName').innerHTML = '<span class="dim" style="font-size:.5em">your move…</span>';
    $('nTag').textContent = 'Tap here for a hint.';
    return drawKeys($('keys'));
  }
  const t = next[0];
  $('nName').innerHTML = nameHTML(t.chord);
  $('nTag').textContent = (t.roman ? `${t.job} · ${t.roman} — ` : '') + t.why;
  if (next.length > 1) $('alts').innerHTML = 'or ' + next.slice(1, 3).map((s, i) => `<button data-i="${i + 1}">${nameHTML(s.chord)}</button>`).join('');
  drawKeys($('keys'), keysOf(t.chord), spell(t.chord, key));
}

function onChord(best) {
  const chord = { root: best.root, q: best.q };
  if (same(chord, last)) return; // the same chord again isn't a move
  const hit = hints !== 'off' && same(chord, next[0].chord), oldKey = key;
  rating = last ? rateMove(last, chord, oldKey) : '';
  history = [...history, chord].slice(-6);
  key = inferKey(history, key);
  move = last ? `${plain(last)} → ${plain(chord)} · ${rating}` : `First chord · key of ${keyName(key)}`;
  if (oldKey && keyName(oldKey) !== keyName(key)) move += ` · now in ${keyName(key)}`;
  last = chord;
  next = suggest(chord, key, history);
  hidden = hints === 'wait';
  clearTimeout(waitTimer);
  if (hidden) waitTimer = setTimeout(() => { hidden = false; renderNext(); }, WAIT_MS);
  renderPlayed();
  clearTimeout(flashTimer);
  if (!hit) return renderNext();
  $('nName').innerHTML = `<span class="ok">✓ ${nameHTML(chord)}</span>`; // flash green, then show what's next
  drawKeys($('keys'), keysOf(chord), spell(chord, key), 'hit');
  flashTimer = setTimeout(renderNext, 400);
}

$('alts').onclick = e => {
  const i = Number(e.target.closest('button')?.dataset.i);
  if (i) { [next[0], next[i]] = [next[i], next[0]]; renderNext(); }
};
$('next').onclick = () => { if (hidden) { hidden = false; renderNext(); } };
$('hints').onclick = () => {
  hints = { show: 'wait', wait: 'off', off: 'show' }[hints];
  try { localStorage.setItem('hints', hints); } catch {}
  hidden = false;
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
    await startMic({ onChord, onFrame });
    wake();
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && wake());
  } catch (e) {
    $('startMsg').textContent = `Couldn't open the microphone (${e.message}). Allow it for this site in Chrome, then reload.`;
    $('go').disabled = false;
  }
};

renderNext();
