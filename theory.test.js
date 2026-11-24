// node theory.test.js
import assert from 'node:assert';
import { inferKey, suggest, rateMove, spell, keyName, rootName } from './theory.js';

const ch = (root, q = '') => ({ root, q });
const name = (c, key) => rootName(c, key) + c.q;
const keyAfter = chords => keyName(chords.reduce((key, _, i) => inferKey(chords.slice(Math.max(0, i - 5), i + 1), key), null));
const C_MAJOR = { tonic: 0, mode: 'major' };

assert.equal(keyAfter([ch(0)]), 'C major');
assert.equal(keyAfter([ch(9, 'm')]), 'A minor');
assert.equal(keyAfter([ch(0), ch(9, 'm'), ch(5), ch(7)]), 'C major');           // C Am F G
assert.equal(keyAfter([ch(9, 'm'), ch(2, 'm'), ch(4), ch(9, 'm')]), 'A minor'); // Am Dm E Am
assert.equal(keyAfter([ch(7), ch(0), ch(2), ch(7)]), 'G major');                // G C D G

assert.ok(['F', 'G'].includes(name(suggest(ch(0), C_MAJOR)[0].chord, C_MAJOR))); // from C: F or G
assert.equal(name(suggest(ch(7), C_MAJOR)[0].chord, C_MAJOR), 'C');              // G pulls home to C
assert.equal(name(suggest(ch(4), C_MAJOR)[0].chord, C_MAJOR), 'Am');             // E (outside C) resolves to Am
assert.equal(name(suggest(ch(0), C_MAJOR, [ch(0), ch(5), ch(0)])[0].chord, C_MAJOR), 'G'); // tie goes to the chord not played lately

assert.equal(rateMove(ch(7), ch(0), C_MAJOR), 'strong move');
assert.equal(rateMove(ch(0), ch(4, 'm'), C_MAJOR), 'occasional move');
assert.equal(rateMove(ch(0), ch(4), C_MAJOR), 'outside the key');

assert.deepEqual(spell(ch(4), C_MAJOR), ['E', 'G♯', 'B']);
assert.deepEqual(spell(ch(10), { tonic: 5, mode: 'major' }), ['B♭', 'D', 'F']);
assert.deepEqual(spell(ch(6, 'm'), { tonic: 2, mode: 'major' }), ['F♯', 'A', 'C♯']);
assert.deepEqual(spell(ch(11, 'dim'), C_MAJOR), ['B', 'D', 'F']);
assert.equal(keyName({ tonic: 10, mode: 'major' }), 'B♭ major');
console.log('theory ok');
