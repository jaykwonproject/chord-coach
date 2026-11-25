// Music theory for Chord Coach: chord types, keys, next-chord moves, two-hand voicings, spelling. Pure functions.
// A chord is {root: 0-11 (C=0), q: a key of QUALITIES}. A key is {tonic: 0-11, mode: 'major' | 'minor'}.

// Semitones above the root, and the family (the job a chord can do: maj, m, dom, hdim, dim, sus, aug).
export const QUALITIES = {
  '': { iv: [0, 4, 7], fam: 'maj' }, m: { iv: [0, 3, 7], fam: 'm' }, dim: { iv: [0, 3, 6], fam: 'dim' },
  sus2: { iv: [0, 2, 7], fam: 'sus' }, sus4: { iv: [0, 5, 7], fam: 'sus' }, aug: { iv: [0, 4, 8], fam: 'aug' },
  add9: { iv: [0, 4, 7, 14], fam: 'maj' },
  maj7: { iv: [0, 4, 7, 11], fam: 'maj' }, 6: { iv: [0, 4, 7, 9], fam: 'maj' }, maj9: { iv: [0, 4, 7, 11, 14], fam: 'maj' },
  m7: { iv: [0, 3, 7, 10], fam: 'm' }, m6: { iv: [0, 3, 7, 9], fam: 'm' }, m9: { iv: [0, 3, 7, 10, 14], fam: 'm' },
  7: { iv: [0, 4, 7, 10], fam: 'dom' }, 9: { iv: [0, 4, 7, 10, 14], fam: 'dom' }, 13: { iv: [0, 4, 10, 14, 21], fam: 'dom' },
  'm7♭5': { iv: [0, 3, 6, 10], fam: 'hdim' }, dim7: { iv: [0, 3, 6, 9], fam: 'dim' },
};
// Chords the mic listens for: practising pop listens for plain triads; jazz (and free play) for everything.
export const PALETTES = { pop: ['', 'm', 'dim'], jazz: Object.keys(QUALITIES) };

// The chords that belong to a key, with the quality each style uses for them.
const DEGREES = {
  major: [
    { off: 0, roman: 'I', job: 'home', fams: ['maj'], pop: '', jazz: 'maj7' },
    { off: 2, roman: 'ii', job: 'away', fams: ['m'], pop: 'm', jazz: 'm7' },
    { off: 4, roman: 'iii', job: 'home', fams: ['m'], pop: 'm', jazz: 'm7' },
    { off: 5, roman: 'IV', job: 'away', fams: ['maj'], pop: '', jazz: 'maj7' },
    { off: 7, roman: 'V', job: 'tension', fams: ['dom', 'maj'], pop: '', jazz: '7' },
    { off: 9, roman: 'vi', job: 'home', fams: ['m'], pop: 'm', jazz: 'm7' },
    { off: 11, roman: 'vii°', job: 'tension', fams: ['hdim', 'dim'], pop: 'dim', jazz: 'm7♭5' },
  ],
  minor: [
    { off: 0, roman: 'i', job: 'home', fams: ['m'], pop: 'm', jazz: 'm6' },
    { off: 2, roman: 'ii°', job: 'away', fams: ['hdim', 'dim'], pop: 'dim', jazz: 'm7♭5' },
    { off: 3, roman: 'III', job: 'home', fams: ['maj'], pop: '', jazz: 'maj7' },
    { off: 5, roman: 'iv', job: 'away', fams: ['m'], pop: 'm', jazz: 'm7' },
    { off: 7, roman: 'V', job: 'tension', fams: ['dom', 'maj'], pop: '', jazz: '7' },
    { off: 7, roman: 'v', job: 'tension', fams: ['m'], pop: 'm', jazz: 'm7' },
    { off: 8, roman: 'VI', job: 'away', fams: ['maj'], pop: '', jazz: 'maj7' },
    { off: 10, roman: 'VII', job: 'tension', fams: ['dom', 'maj'], pop: '', jazz: '7' },
  ],
};

// How naturally one chord of the key leads to another: 3 strong, 2 common, 1 occasional.
const MOVES = {
  major: {
    I: { IV: 3, V: 3, vi: 2, ii: 2, iii: 1 }, ii: { V: 3, IV: 2, iii: 1 }, iii: { vi: 3, IV: 2, ii: 1 },
    IV: { V: 3, I: 3, ii: 2, vi: 2, iii: 1 }, V: { I: 3, vi: 2, IV: 1 }, vi: { IV: 3, ii: 2, V: 2, iii: 1 }, 'vii°': { I: 3, iii: 1 },
  },
  minor: {
    i: { iv: 3, VI: 3, VII: 3, V: 2, III: 2 }, 'ii°': { V: 3 }, III: { VI: 3, iv: 2, VII: 2 }, iv: { V: 3, i: 3, VII: 2 },
    V: { i: 3, VI: 2 }, v: { i: 2, VI: 2, iv: 1 }, VI: { VII: 3, III: 2, iv: 2, 'ii°': 1 }, VII: { III: 3, i: 3, VI: 2 },
  },
};
// Jazz leans on the circle of fifths: I–vi–ii–V, iii–vi–ii–V, and minor ii°–V–i.
const MOVES_JAZZ = {
  major: {
    I: { ii: 3, vi: 3, IV: 2, iii: 2, V: 1 }, ii: { V: 3, iii: 1, vi: 1 }, iii: { vi: 3, ii: 1 },
    IV: { iii: 2, V: 2, I: 2, ii: 1 }, V: { I: 3, vi: 2 }, vi: { ii: 3, IV: 2, V: 1 }, 'vii°': { I: 2 },
  },
  minor: {
    i: { iv: 3, 'ii°': 3, VI: 2, III: 1 }, 'ii°': { V: 3 }, III: { VI: 2, iv: 2, 'ii°': 1 }, iv: { V: 2, i: 2, 'ii°': 1 },
    V: { i: 3, VI: 2 }, v: { i: 2 }, VI: { 'ii°': 2, V: 2, VII: 1 }, VII: { III: 3 },
  },
};
const WHY = {
  'I>ii': 'steps up to ii', 'IV>iii': 'steps down', 'VI>V': 'slides down to V', 'i>ii°': 'starts a minor ii–V',
  'V>I': 'V–I: resolves home', 'V>i': 'V–i: resolves home', 'IV>I': 'soft landing', 'iv>i': 'soft landing',
  'V>vi': 'fake-out', 'V>VI': 'fake-out', 'ii>V': 'ii–V: sets up the pull', 'ii°>V': 'ii–V: sets up the pull',
  'vi>IV': 'pop staple', 'iii>vi': 'falls a fifth', 'vi>ii': 'falls a fifth', 'I>vi': 'turns sad',
  'VI>VII': 'climbs back up', 'VII>i': 'home, rock style', 'VII>III': 'falls a fifth',
};
const JOB_WHY = { home: 'feels like rest', away: 'leaves home', tension: 'wants to go home' };
const STRENGTH = { 3: 'strong', 2: 'common', 1: 'occasional' };

export const fam = c => QUALITIES[c.q].fam;
export const same = (a, b) => !!a && !!b && a.root === b.root && fam(a) === fam(b); // Cmaj7 counts as C, G9 as G7
export const keysOf = c => QUALITIES[c.q].iv.map(i => 60 + c.root + i); // root position, from middle C up

export function degree(chord, key) {
  const off = (chord.root - key.tonic + 12) % 12, f = fam(chord);
  return DEGREES[key.mode].find(g => g.off === off && g.fams.includes(f));
}

// Best key for the recent chords (oldest first). Newer chords count more; the current key gets a head start so it
// doesn't flicker. Outside dominant chords (A7 in C) are usually secondary dominants, so they don't count against a key.
export function inferKey(history, current) {
  let best = current, bestScore = -Infinity;
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const mode of ['major', 'minor']) {
      const key = { tonic, mode };
      let s = current && current.tonic === tonic && current.mode === mode ? 2 : 0;
      history.forEach((c, i) => {
        const d = degree(c, key), w = 0.75 ** (history.length - 1 - i), p = history[i - 1];
        // a minor 7th chord is usually a ii or vi in jazz; a minor key's home chord is m6 (or a plain minor triad)
        const home = d && d.off === 0 && !(key.mode === 'minor' && ['m7', 'm9'].includes(c.q));
        s += w * (!d ? (['dom', 'sus', 'aug'].includes(fam(c)) ? 0 : -1) : home ? 2 : d.roman === 'V' ? 1.5 : 1);
        // a cadence (G7 -> C, or its tritone sub D♭7 -> C) points straight at this key's home chord
        if (p && home && fam(p) === 'dom' && [5, 11].includes((c.root - p.root + 12) % 12)) s += w * 1.5;
      });
      if (s > bestScore) { best = key; bestScore = s; }
    }
  }
  return best;
}

// Next-chord options, best first: [{chord, weight, move, roman, job}]. Jazz adds the moves jazz and bossa players lean on.
export function suggest(chord, key, history = [], style = 'jazz') {
  const out = new Map(), d = degree(chord, key), f = fam(chord), r = chord.root;
  const at = (pc, q) => { // the key's own chord on this note, if there is one
    const g = DEGREES[key.mode].find(x => x.off === (pc - key.tonic + 24) % 12);
    return g && { root: (key.tonic + g.off) % 12, q: q ?? g[style] };
  };
  const name = c => rootName(c, key) + c.q;
  const add = (c, weight, move) => {
    if (!c || same(c, chord)) return;
    const k = `${c.root}:${fam(c)}`;
    if (!out.has(k) || out.get(k).weight < weight) out.set(k, { chord: c, weight, move });
  };

  // Named moves first, so on a tie their label wins over the generic one.
  if (f === 'dom' || f === 'aug' || (!d && chord.q === '')) { // a dominant (or outside major, or augmented) chord wants to fall a fifth
    const t = at(r + 5);
    add(t, 3, t && t.root === key.tonic ? 'V–I: resolves home' : `resolves to ${t && name(t)}`);
  }
  if (f === 'sus') add(at(r) ?? { root: r, q: '' }, 3, 'sus resolves: same root, settled'); // Csus4 -> C
  if (style === 'jazz') {
    const fromTonic = (r - key.tonic + 12) % 12;
    if (f === 'dom' && fromTonic === 10 && key.mode === 'major') add(at(key.tonic), 3, 'backdoor: sneaks home');
    if (f === 'dom') add(at(r - 1), 3, 'tritone sub: slides down a half step');
    if (f === 'm' || f === 'hdim') {
      add({ root: (r + 5) % 12, q: '7' }, (r + 5) % 12 === (key.tonic + 7) % 12 ? 3 : 2, 'ii–V: sets up the pull');
      add({ root: (r + 11) % 12, q: '7' }, 2, 'tritone sub of the V');
    }
    if (d && d.off === 0 && key.mode === 'major') {
      add({ root: (r + 2) % 12, q: '7' }, 2, 'II7: the bossa lift');
      add({ root: (r + 1) % 12, q: 'dim7' }, 1, 'passing diminished');
    }
    if (f === 'dom' && fromTonic === 2) add({ root: r, q: 'm7' }, 2, 'bossa turn: same root, now minor');
    if (f === 'dim') add(at(r + 1), 3, 'diminished rises a half step');
    if (d && d.roman === 'IV') add({ root: r, q: 'm7' }, 2, 'borrowed minor iv: bittersweet');
    if (f === 'm' && !d && fromTonic === 5) add({ root: (key.tonic + 10) % 12, q: '7' }, 3, 'backdoor: ♭VII7 sneaks home');
  }
  if (d) {
    for (const [roman, w] of Object.entries((style === 'jazz' ? MOVES_JAZZ : MOVES)[key.mode][d.roman])) {
      const g = DEGREES[key.mode].find(x => x.roman === roman);
      add(at(key.tonic + g.off), w, WHY[`${d.roman}>${roman}`] || JOB_WHY[g.job]);
    }
  } else { // outside the key: head back home
    add(at(key.tonic), 2, 'back home');
    add(at(key.tonic + 5), 1, 'steps away');
  }
  if (style === 'jazz') {
    for (const s of [...out.values()]) { // secondary dominants: the V7 of where we're heading
      if (s.weight >= 2 && s.chord.root !== key.tonic && fam(s.chord) !== 'dom' && fam(s.chord) !== 'dim') {
        add({ root: (s.chord.root + 7) % 12, q: '7' }, s.weight - 1, `secondary dominant, leads to ${name(s.chord)}`);
      }
    }
  }
  // Variety: a move you made lately (C -> F) sinks, so next time from C you're shown another way out; chords you've
  // played lately sink a little; going straight back to the chord before last sinks more.
  // ponytail: fixed penalties; tune if suggestions feel too jumpy or too repetitive.
  const lastSeen = c => history.findLastIndex(h => same(h, c));
  const made = c => history.filter((h, i) => i > 0 && same(history[i - 1], chord) && same(h, c)).length;
  const fresh = s => s.weight - 1.2 * made(s.chord) - 0.3 * history.filter(h => same(h, s.chord)).length
    - (same(history.at(-2), s.chord) ? 1 : 0);
  return [...out.values()]
    .map(s => ({ ...s, ...label(s.chord, key) }))
    // ties: chords of the key first, then the one you played least recently
    .sort((a, b) => fresh(b) - fresh(a) || !!b.roman - !!a.roman || lastSeen(a.chord) - lastSeen(b.chord));
}

// Roman numeral and job of a chord in the key; chords from outside get a short description instead.
export function label(c, key) {
  const d = degree(c, key);
  if (d) return { roman: d.roman, job: d.job };
  const f = fam(c);
  return { roman: '', job: { dom: 'tension', aug: 'tension', dim: 'passing', sus: 'suspended' }[f] ?? 'color' };
}

// "ii–V: sets up the pull · strong", or how far outside the move was.
export function rateMove(prev, chord, key, style = 'jazz') {
  const s = suggest(prev, key, [], style).find(x => same(x.chord, chord));
  if (s) return `${s.move} · ${STRENGTH[s.weight]}`;
  return degree(chord, key) ? 'unusual move' : 'outside the key';
}

// Two hands: left pinky on the root (octave below middle C), right hand a close voicing starting between
// middle C and B above it, chosen to move as little as possible from `prev` (the last right-hand notes).
// Levels: easy = 2-note shells for 7th chords (3rd + 7th), right hand alone for triads;
//         medium = 3 notes above the root; full = 4-note rootless jazz voicings.
const ROOTLESS = { // two shapes each: 3rd on the bottom, or 7th on the bottom
  maj7: [[4, 7, 11, 14], [11, 14, 16, 19]], 6: [[4, 7, 9, 14], [9, 14, 16, 19]],
  m7: [[3, 7, 10, 14], [10, 14, 15, 19]], m6: [[3, 7, 9, 14], [9, 14, 15, 19]],
  7: [[4, 9, 10, 14], [10, 14, 16, 21]], 'm7♭5': [[3, 6, 10, 12], [10, 12, 15, 18]], dim7: [[3, 6, 9, 12], [0, 3, 6, 9]],
};
const UPPER = { maj7: [4, 7, 11], 6: [4, 7, 9], m7: [3, 7, 10], m6: [3, 7, 9], 7: [4, 7, 10], 'm7♭5': [3, 6, 10], dim7: [3, 6, 9] };
const SHELL = { maj7: [4, 11], 6: [4, 9], m7: [3, 10], m6: [3, 9], 7: [4, 10] };
const BASE = { maj9: 'maj7', m9: 'm7', 9: '7', 13: '7' };
export const LEVELS = ['easy', 'medium', 'full'];
const rotations = iv => iv.map((_, k) => [...iv.slice(k), ...iv.slice(0, k).map(i => i + 12)]); // a shape and its inversions

export function voice(c, prev, level = 'full') {
  const b = BASE[c.q] ?? c.q, seventh = !!UPPER[b];
  const forms = !seventh ? rotations([...new Set(QUALITIES[c.q].iv.map(i => i % 12))].sort((a, b) => a - b)) // triads, sus, add9: close shapes
    : level === 'full' ? ROOTLESS[b] : rotations(level === 'easy' && SHELL[b] ? SHELL[b] : UPPER[b]);
  let rh, best = Infinity;
  forms.forEach((form, fi) => {
    for (let k = -12; k <= 72; k += 12) {
      const n = form.map(i => c.root + i + k);
      if (n[0] < 60 || n[0] > 71) continue;
      const cost = prev
        ? n.reduce((s, x, i) => s + Math.abs(x - (prev[i] ?? prev[prev.length - 1])), 0)
        : Math.abs(n[0] + n[n.length - 1] - 136) + fi * 12; // first chord: the standard shape, centred near G♯4
      if (cost < best) { rh = n; best = cost; }
    }
  });
  // 3 notes: 1-3-5, but 1-2-5 when the top gap is wide (E G C) and 1-4-5 when it's a step (C F G)
  const top = rh[2] - rh[1];
  const fingers = rh.length === 4 ? [1, 2, 3, 5] : rh.length === 3 ? [1, top >= 5 ? 2 : top <= 2 ? 4 : 3, 5] : [1, rh[1] - rh[0] <= 5 ? 4 : 5];
  const core = QUALITIES[c.q].iv.map(i => i % 12);
  const extra = [...new Set(rh.map(x => (x - c.root + 120) % 12).filter(i => !core.includes(i)))].map(i => ({ 2: '9', 9: '13' })[i]).filter(Boolean).sort((a, b) => a - b);
  const lh = level === 'easy' && !seventh ? [] : [48 + c.root]; // easy triads: right hand only
  return { lh, lhFingers: lh.map(() => 5), rh, rhFingers: fingers, extra };
}

// Spelling: sharps or flats depending on the key, and chord notes by letter (E major is E G♯ B, not E A♭ B).
const LETTERS = 'CDEFGAB', LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const STEPS = [0, 1, 1, 2, 2, 3, 4, 4, 4, 5, 6, 6]; // semitones above the root -> letters above the root
const ROOTS = {
  sharp: ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'],
  flat: ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'],
  plain: ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'],
};
function roots(key) {
  if (!key) return ROOTS.plain;
  const major = key.mode === 'major' ? key.tonic : (key.tonic + 3) % 12; // minor keys share their relative major's signature
  return [7, 2, 9, 4, 11, 6].includes(major) ? ROOTS.sharp : [5, 10, 3, 8, 1].includes(major) ? ROOTS.flat : ROOTS.plain;
}

const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10, 11] };
// Roots from outside the key are written as flats (D♭7, B♭7), except passing diminished chords (C♯dim7).
export function rootName(c, key) {
  if (!key || SCALE[key.mode].includes((c.root - key.tonic + 12) % 12)) return roots(key)[c.root];
  return (fam(c) === 'dim' ? ROOTS.sharp : ROOTS.flat)[c.root];
}
export const keyName = key => `${roots(key)[key.tonic]} ${key.mode}`;
// Name of the note `midi` inside chord c.
export function noteName(c, midi, key) {
  const iv = (midi - c.root + 120) % 12, step = fam(c) === 'dim' && iv === 9 ? 6 : STEPS[iv]; // a dim7's top note is a 7th
  const li = (LETTERS.indexOf(rootName(c, key)[0]) + step) % 7;
  const diff = (((midi - LETTER_PC[li]) % 12) + 18) % 12 - 6;
  return LETTERS[li] + (diff > 0 ? '♯'.repeat(diff) : '♭'.repeat(-diff));
}
export const spell = (c, key) => keysOf(c).map(m => noteName(c, m, key));
