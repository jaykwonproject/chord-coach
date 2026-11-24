// node listen.test.js
import assert from 'node:assert';
import { peaks, chroma, bass, classify, candidates } from './listen.js';
import { PALETTES } from './theory.js';

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
const POP = candidates(PALETTES.pop), JAZZ = candidates(PALETTES.jazz);
const hear = (midis, list = POP, prefer = null) => {
  const ps = peaks(spectrum(midis), binHz);
  return classify(chroma(ps), list, { bass: bass(ps), prefer })[0];
};
const heard = (midis, list, prefer) => hear(midis, list, prefer).name;

// Pop: one hand, triads
assert.equal(heard([60, 64, 67]), 'C');            // C E G
assert.equal(heard([64, 67, 72]), 'C');            // E G C, inversion
assert.equal(heard([48, 60, 64, 67]), 'C');        // with a left-hand C
assert.equal(heard([57, 60, 64]), 'Am');
assert.equal(heard([62, 65, 69]), 'Dm');
assert.equal(heard([53, 57, 60]), 'F');
assert.equal(heard([55, 59, 62]), 'G');
assert.equal(heard([59, 62, 65]), 'Bdim');
assert.equal(heard([60]), 'C (one note)');         // a lone key must not pass as a chord

// Jazz: left-hand root + right-hand rootless voicing (what the app shows)
const famOf = (midis, prefer) => { const b = hear(midis, JAZZ, prefer); return `${b.root}:${b.q}`; };
assert.match(famOf([50, 65, 69, 72, 76]), /^2:m(7|9)$/);       // D + F A C E = Dm7/Dm9
assert.match(famOf([55, 65, 69, 71, 76]), /^7:(7|9|13)$/);     // G + F A B E = G13
assert.match(famOf([48, 64, 67, 71, 74]), /^0:maj(7|9)$/);     // C + E G B D = Cmaj9
assert.equal(heard([57, 60, 64, 67], JAZZ), 'Am7');            // A + C E G: the bass says Am7, not C6
assert.equal(heard([48, 64, 67, 69], JAZZ), 'C6');             // C + E G A: the bass says C6, not Am7
assert.equal(heard([55, 59, 62, 65], JAZZ), 'G7');
console.log('listen ok');
