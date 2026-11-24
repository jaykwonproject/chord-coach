// Music theory for Chord Coach: which key you're in, what can come next, how notes are spelled. Pure functions.
// A chord is {root: 0-11 (C=0), q: '' | 'm' | 'dim'}. A key is {tonic: 0-11, mode: 'major' | 'minor'}.

export const SHAPES = { '': [0, 4, 7], m: [0, 3, 7], dim: [0, 3, 6] }; // semitones above the root

// The chords that belong to a key: [semitones above the tonic, quality, roman numeral, job].
const DEGREES = {
  major: [[0, '', 'I', 'home'], [2, 'm', 'ii', 'away'], [4, 'm', 'iii', 'home'], [5, '', 'IV', 'away'],
    [7, '', 'V', 'tension'], [9, 'm', 'vi', 'home'], [11, 'dim', 'vii°', 'tension']],
  minor: [[0, 'm', 'i', 'home'], [2, 'dim', 'ii°', 'away'], [3, '', 'III', 'home'], [5, 'm', 'iv', 'away'],
    [7, '', 'V', 'tension'], [7, 'm', 'v', 'tension'], [8, '', 'VI', 'away'], [10, '', 'VII', 'tension']],
};

// How naturally one chord leads to the next: 3 strong, 2 common, 1 occasional.
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

const WHY = {
  'V>I': 'pulls back home', 'V>i': 'pulls back home', 'IV>I': 'soft landing', 'iv>i': 'soft landing',
  'V>vi': 'fake-out', 'V>VI': 'fake-out', 'ii>V': 'sets up home', 'ii°>V': 'sets up home', 'vi>IV': 'pop staple',
  'I>vi': 'turns sad', 'VI>VII': 'climbs back up', 'VII>i': 'home, rock style',
};
const JOB_WHY = { home: 'feels like rest', away: 'leaves home', tension: 'wants to go home' };
const RATING = { 3: 'strong move', 2: 'common move', 1: 'occasional move' };

export const same = (a, b) => !!a && !!b && a.root === b.root && a.q === b.q;
export const keysOf = c => SHAPES[c.q].map(i => 60 + c.root + i); // root position, from middle C up

export function degree(chord, key) {
  const off = (chord.root - key.tonic + 12) % 12;
  const d = DEGREES[key.mode].find(([o, q]) => o === off && q === chord.q);
  return d && { roman: d[2], job: d[3] };
}

// Best key for the recent chords (oldest first). Newer chords count more; the current key gets a bonus so it doesn't flicker.
export function inferKey(history, current) {
  let best = current, bestScore = -Infinity;
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const mode of ['major', 'minor']) {
      const key = { tonic, mode };
      let s = current && current.tonic === tonic && current.mode === mode ? 1 : 0;
      history.forEach((c, i) => {
        const d = degree(c, key), w = 0.75 ** (history.length - 1 - i);
        s += w * (!d ? -1 : d.job === 'home' && d.roman.toUpperCase() === 'I' ? 2 : d.roman === 'V' ? 1.5 : 1);
      });
      if (s > bestScore) { best = key; bestScore = s; }
    }
  }
  return best;
}

// Next-chord options, best first: [{chord, roman, job, weight, why}].
export function suggest(chord, key, history = []) {
  const d = degree(chord, key), list = DEGREES[key.mode];
  let entries; // [roman, weight, why]
  if (d) {
    entries = Object.entries(MOVES[key.mode][d.roman]).map(([r, w]) => [r, w]);
  } else { // outside the key: a major chord resolves down a fifth if that lands in the key; otherwise go home
    const res = chord.q === '' && list.find(([o]) => o === (chord.root + 5 - key.tonic + 12) % 12);
    const home = list[0][2], away = list.find(([o]) => o === 5)[2];
    entries = [...(res ? [[res[2], 3, 'resolves it']] : []), [home, 2, 'back home'], [away, 1, 'steps away']]
      .filter((e, i, a) => a.findIndex(x => x[0] === e[0]) === i);
  }
  const lastSeen = c => history.findLastIndex(h => same(h, c));
  return entries.map(([roman, weight, why]) => {
    const [off, q, , job] = list.find(x => x[2] === roman);
    return { chord: { root: (key.tonic + off) % 12, q }, roman, job, weight, why: why || WHY[`${d.roman}>${roman}`] || JOB_WHY[job] };
  }).sort((a, b) => b.weight - a.weight || lastSeen(a.chord) - lastSeen(b.chord)); // ties: the one you played least recently
}

export function rateMove(prev, chord, key) {
  const a = degree(prev, key), b = degree(chord, key);
  if (!b) return 'outside the key';
  const w = a && MOVES[key.mode][a.roman][b.roman];
  return w ? RATING[w] : 'unusual move';
}

// Spelling: sharps or flats depending on the key, and chord notes by letter (E major is E G♯ B, not E A♭ B).
const LETTERS = 'CDEFGAB', LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
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

export const rootName = (c, key) => roots(key)[c.root];
export const keyName = key => `${roots(key)[key.tonic]} ${key.mode}`;
export function spell(c, key) {
  const li = LETTERS.indexOf(rootName(c, key)[0]);
  return SHAPES[c.q].map((iv, k) => {
    const l = (li + 2 * k) % 7, diff = (((c.root + iv - LETTER_PC[l]) % 12) + 18) % 12 - 6;
    return LETTERS[l] + (diff > 0 ? '♯'.repeat(diff) : '♭'.repeat(-diff));
  });
}
