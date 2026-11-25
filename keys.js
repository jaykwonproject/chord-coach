// Piano keys as SVG, `octaves` octaves up from MIDI note `start` (a C).
// marks: [{midi, cls, top, bottom, band}] — the key gets class `cls` (styled by the page), `top` big (a finger number),
// `bottom` small (a note name), and optionally a stripe along its bottom edge with class `band`.
export function drawKeys(svg, marks = [], start = 48, octaves = 3) {
  const W = 40, BW = 24, WH = 160, BH = 100, S = 14; // S: stripe height
  const at = m => marks.find(k => k.midi === m);
  const stripe = (k, x, w, h) => (k?.band ? `<rect class="band ${k.band}" x="${x + 2}" y="${h - S - 2}" width="${w - 4}" height="${S}" rx="2"/>` : '');
  let white = '', black = '';
  for (let o = 0; o < octaves; o++) {
    [0, 2, 4, 5, 7, 9, 11].forEach((s, i) => {
      const m = start + o * 12 + s, x = (o * 7 + i) * W, k = at(m);
      white += `<rect class="w${k ? ' ' + k.cls : ''}" x="${x}" y="0" width="${W}" height="${WH}" rx="3"/>${stripe(k, x, W, WH)}`;
      if (k) white += `<text class="f" x="${x + W / 2}" y="${WH - 37}">${k.top ?? ''}</text><text x="${x + W / 2}" y="${WH - 20}">${k.bottom ?? ''}</text>`;
      else if (s === 0) white += `<text class="c" x="${x + W / 2}" y="${WH - 20}">${m === 60 ? 'mid C' : 'C'}</text>`;
    });
    [[1, 0], [3, 1], [6, 3], [8, 4], [10, 5]].forEach(([s, i]) => {
      const m = start + o * 12 + s, x = (o * 7 + i + 1) * W - BW / 2, k = at(m);
      black += `<rect class="b${k ? ' ' + k.cls : ''}" x="${x}" y="0" width="${BW}" height="${BH}" rx="2"/>${stripe(k, x, BW, BH)}`;
      if (k) black += `<text class="f" x="${x + BW / 2}" y="${BH - 44}" style="font-size:17px">${k.top ?? ''}</text><text x="${x + BW / 2}" y="${BH - 22}" style="font-size:11px">${k.bottom ?? ''}</text>`;
    });
  }
  svg.setAttribute('viewBox', `0 0 ${octaves * 7 * W} ${WH}`);
  svg.innerHTML = white + black;
}
