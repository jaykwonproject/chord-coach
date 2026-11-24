// node listen.test.js
import assert from 'node:assert';
import { chroma, classify, candidates } from './listen.js';

// Fake analyser spectrum: each note has 10 overtones, each 30% quieter, smeared over nearby bins.
const binHz = 48000 / 8192;
function spectrum(midis) {
  const lin = new Float64Array(4096).fill(1e-6);
  for (const m of midis) {
    const f0 = 440 * 2 ** ((m - 69) / 12);
    for (let h = 1; h <= 10; h++) {
      const bin = f0 * h / binHz;
      for (let i = Math.floor(bin) - 3; i <= Math.ceil(bin) + 3; i++)
        if (i > 0 && i < lin.length) lin[i] += 0.7 ** (h - 1) * Math.exp(-(((i - bin) / 1.2) ** 2));
    }
  }
  return Array.from(lin, v => 20 * Math.log10(v));
}
const heard = (midis, extra) => classify(chroma(spectrum(midis), binHz), candidates(extra))[0].name;

assert.equal(heard([60, 64, 67]), 'C');            // C E G
assert.equal(heard([64, 67, 72]), 'C');            // E G C, inversion
assert.equal(heard([48, 60, 64, 67]), 'C');        // with a left-hand C
assert.equal(heard([57, 60, 64]), 'Am');
assert.equal(heard([62, 65, 69]), 'Dm');
assert.equal(heard([53, 57, 60]), 'F');
assert.equal(heard([55, 59, 62]), 'G');
assert.equal(heard([59, 62, 65]), 'Bdim');
assert.equal(heard([60]), 'C (one note)');         // a lone key must not pass as a chord
assert.equal(heard([60, 64, 67], true), 'C');      // still C with 7ths/sus allowed
assert.equal(heard([55, 59, 62, 65], true), 'G7');
console.log('listen ok');
