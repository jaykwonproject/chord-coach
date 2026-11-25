// node theory.test.js
import assert from 'node:assert';
import { inferKey, suggest, rateMove, spell, keyName, rootName, voice, same, PROGRESSIONS, progChords, findProgression, continuation } from './theory.js';

const ch = (root, q = '') => ({ root, q });
const name = (c, key) => rootName(c, key) + c.q;
const keyAfter = chords => keyName(chords.reduce((key, _, i) => inferKey(chords.slice(Math.max(0, i - 5), i + 1), key), null));
const next = (c, key, style, history) => suggest(c, key, history, style).map(s => name(s.chord, key));
const C_MAJOR = { tonic: 0, mode: 'major' }, F_MAJOR = { tonic: 5, mode: 'major' };

// Keys
assert.equal(keyAfter([ch(0)]), 'C major');
assert.equal(keyAfter([ch(9, 'm')]), 'A minor');
assert.equal(keyAfter([ch(0), ch(9, 'm'), ch(5), ch(7)]), 'C major');           // C Am F G
assert.equal(keyAfter([ch(9, 'm'), ch(2, 'm'), ch(4), ch(9, 'm')]), 'A minor'); // Am Dm E Am
assert.equal(keyAfter([ch(7), ch(0), ch(2), ch(7)]), 'G major');                // G C D G
assert.equal(keyAfter([ch(2, 'm7'), ch(7, '7'), ch(0, 'maj7')]), 'C major');    // ii–V–I
const IIVI_C = [ch(0, 'maj7'), ch(2, 'm7'), ch(7, '7'), ch(0, 'maj7')];
assert.equal(keyAfter([...IIVI_C, ch(9, '7'), ch(2, 'm7')]), 'C major');          // A7 -> Dm7 is a secondary dominant, still C
assert.equal(keyAfter([ch(0, 'maj7'), ch(9, '7'), ch(2, 'm7'), ch(7, '7')]), 'C major'); // turnaround I–VI7–ii–V
assert.equal(keyAfter([ch(11, 'm7♭5'), ch(4, '7'), ch(9, 'm6')]), 'A minor');     // minor ii–V–i
assert.equal(keyAfter([...IIVI_C, ch(7, 'm7'), ch(0, '7'), ch(5, 'maj7'), ch(7, 'm7'), ch(0, '7'), ch(5, 'maj7')]), 'F major'); // real move to F

// Pop style
assert.ok(['F', 'G'].includes(next(ch(0), C_MAJOR, 'pop')[0]));                   // from C: F or G
assert.equal(next(ch(7), C_MAJOR, 'pop')[0], 'C');                                // G pulls home to C
assert.equal(next(ch(4), C_MAJOR, 'pop')[0], 'Am');                               // E (outside C) resolves to Am
assert.equal(next(ch(0), C_MAJOR, 'pop', [ch(0), ch(5), ch(0)])[0], 'G');         // tie goes to the chord not played lately

// Jazz style
assert.equal(next(ch(2, 'm7'), C_MAJOR, 'jazz')[0], 'G7');                        // ii–V
assert.ok(next(ch(2, 'm7'), C_MAJOR, 'jazz').includes('D♭7'));                     // tritone sub on offer
assert.equal(next(ch(7, '7'), C_MAJOR, 'jazz')[0], 'Cmaj7');                      // V–I
assert.equal(next(ch(9, '7'), C_MAJOR, 'jazz')[0], 'Dm7');                        // secondary dominant A7 -> Dm7
assert.equal(next(ch(1, '7'), C_MAJOR, 'jazz')[0], 'Cmaj7');                      // tritone sub D♭7 -> Cmaj7 (and G♭... not in key)
assert.equal(next(ch(10, '7'), C_MAJOR, 'jazz')[0], 'Cmaj7');                     // backdoor B♭7 -> Cmaj7
assert.ok(next(ch(7, '7'), F_MAJOR, 'jazz').includes('Gm7'));                     // bossa turn G7 -> Gm7 in F
assert.ok(next(ch(0, 'maj7'), C_MAJOR, 'jazz').some(n => n.endsWith('7') && !n.includes('maj') && !n.includes('m'))); // a secondary dominant from I

assert.equal(rateMove(ch(2, 'm7'), ch(7, '7'), C_MAJOR), 'ii–V: sets up the pull · strong');
assert.equal(rateMove(ch(7), ch(0), C_MAJOR, 'pop'), 'V–I: resolves home · strong');
assert.equal(rateMove(ch(0), ch(6), C_MAJOR, 'pop'), 'outside the key');

// Progressions: every step (including back to the start) is a move the app can name, no chord repeats itself,
// the key comes out right, and every variation exists
for (const [style, list] of Object.entries(PROGRESSIONS)) {
  for (const p of list) {
    const tonic = p.mode === 'minor' ? 9 : 0, key = { tonic, mode: p.mode }, cs = progChords(p, tonic);
    cs.forEach((c, i) => {
      const nx = cs[(i + 1) % cs.length], r = rateMove(c, nx, key, style);
      assert.ok(!same(c, nx), `${p.romans}: ${name(c, key)} repeats`);
      assert.ok(r !== 'unusual move' && r !== 'outside the key', `${p.romans}: ${name(c, key)} -> ${name(nx, key)} is "${r}"`);
    });
    const relative = { tonic: (tonic + (p.mode === 'major' ? 9 : 3)) % 12, mode: p.mode === 'major' ? 'minor' : 'major' };
    assert.ok([keyName(key), keyName(relative)].includes(keyAfter([...cs, ...cs])), `${p.romans} should read as ${keyName(key)}`);
    for (const id of p.next) assert.ok(findProgression(id), `${p.id} -> ${id} missing`);
  }
}
assert.deepEqual(progChords(findProgression('j2'), 0).map(c => name(c, C_MAJOR)), ['Cmaj7', 'Am7', 'Dm7', 'G7']);

// Free play: the chord that continues a known progression
const cont = (h, style, key = C_MAJOR) => name(continuation(h, key, style).chord, key);
assert.equal(cont([ch(0), ch(7)], 'pop'), 'Am');                                  // C G -> Am (I–V–vi–IV)
assert.equal(cont([ch(0), ch(9, 'm')], 'pop'), 'F');                              // C Am -> F (I–vi–IV–V)
assert.equal(cont([ch(2, 'm7'), ch(7, '7')], 'jazz'), 'Cmaj7');                   // Dm7 G7 -> Cmaj7
assert.equal(cont([ch(0, 'maj7'), ch(9, '7')], 'jazz'), 'Dm7');                   // Cmaj7 A7 -> Dm7
assert.equal(continuation([ch(0), ch(6)], C_MAJOR, 'pop'), null);                 // nothing known

// sus, aug and add9 chords (heard in free play)
assert.equal(next(ch(0, 'sus4'), C_MAJOR, 'pop')[0], 'C');                        // Csus4 settles to C
assert.equal(next(ch(0, 'aug'), C_MAJOR, 'pop')[0], 'F');                         // Caug pushes up to F
assert.deepEqual(voice(ch(0, 'add9')).rh, [60, 62, 64, 67]);                       // Cadd9: C D E G
assert.deepEqual(spell(ch(0, 'sus4'), C_MAJOR), ['C', 'F', 'G']);

// Two-hand voicings: ii–V–I keeps the right hand almost still
const v1 = voice(ch(2, 'm7')), v2 = voice(ch(7, '7'), v1.rh), v3 = voice(ch(0, 'maj7'), v2.rh);
const moved = (a, b) => a.reduce((s, x, i) => s + Math.abs(x - b[i]), 0);
assert.deepEqual(v2.lh, [55]);                                                     // left hand: G below middle C
assert.ok(moved(v1.rh, v2.rh) <= 4 && moved(v2.rh, v3.rh) <= 6, `${v1.rh} ${v2.rh} ${v3.rh}`);
assert.deepEqual(v3.rhFingers, [1, 2, 3, 5]);
assert.deepEqual(voice(ch(0)).rh, [60, 64, 67]);                                   // first pop chord: root position
assert.deepEqual(voice(ch(0)).rhFingers, [1, 3, 5]);
assert.deepEqual(voice(ch(5), [60, 64, 67]).rh, [60, 65, 69]);                     // C -> F: closest shape is C F A
assert.deepEqual(voice(ch(5), [60, 64, 67]).rhFingers, [1, 3, 5]);
assert.deepEqual(voice(ch(4, 'm')).rhFingers, [1, 3, 5]);                          // Em root position: E G B
assert.deepEqual(voice(ch(0), [64, 67, 72]).rh, [64, 67, 72]);                     // C first inversion E G C…
assert.deepEqual(voice(ch(0), [64, 67, 72]).rhFingers, [1, 2, 5]);                 // …is fingered 1-2-5
assert.deepEqual(voice(ch(0, 'sus4')).rhFingers, [1, 4, 5]);                       // C F G
// Easy: 2-note shells (3rd + 7th) under a left-hand root; a ii–V–I moves one finger at a time
const e1 = voice(ch(2, 'm7'), null, 'easy'), e2 = voice(ch(7, '7'), e1.rh, 'easy'), e3 = voice(ch(0, 'maj7'), e2.rh, 'easy');
assert.equal(e1.rh.length, 2);
assert.deepEqual(e1.lh, [50]);
assert.ok(moved(e1.rh, e2.rh) <= 1 && moved(e2.rh, e3.rh) <= 1, `${e1.rh} ${e2.rh} ${e3.rh}`);
assert.deepEqual(voice(ch(0), null, 'easy').lh, []);                               // easy triad: right hand only
// Medium: 3 notes above the root
assert.equal(voice(ch(7, '7'), null, 'medium').rh.length, 3);

// Spelling
assert.deepEqual(spell(ch(4), C_MAJOR), ['E', 'G♯', 'B']);
assert.deepEqual(spell(ch(10), F_MAJOR), ['B♭', 'D', 'F']);
assert.deepEqual(spell(ch(6, 'm'), { tonic: 2, mode: 'major' }), ['F♯', 'A', 'C♯']);
assert.deepEqual(spell(ch(11, 'm7♭5'), C_MAJOR), ['B', 'D', 'F', 'A']);
assert.deepEqual(spell(ch(1, 'dim7'), C_MAJOR), ['C♯', 'E', 'G', 'B♭']);           // passing dim: sharp
assert.equal(name(ch(1, '7'), C_MAJOR), 'D♭7');                                     // tritone sub: flat
assert.equal(keyName({ tonic: 10, mode: 'major' }), 'B♭ major');
console.log('theory ok');
