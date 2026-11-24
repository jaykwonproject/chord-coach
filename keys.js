// Two octaves of piano from middle C, drawn into an <svg viewBox="0 0 560 160">.
// Keys listed in `midis` get class `cls` (styled by the page) and the matching note name from `names`.
export function drawKeys(svg, midis = [], names = [], cls = 'on') {
  const W = 40, BW = 24, WH = 160, BH = 100;
  let white = '', black = '';
  for (let o = 0; o < 2; o++) {
    [0, 2, 4, 5, 7, 9, 11].forEach((s, i) => {
      const k = midis.indexOf(60 + o * 12 + s), x = (o * 7 + i) * W;
      white += `<rect class="w${k >= 0 ? ' ' + cls : ''}" x="${x}" y="0" width="${W}" height="${WH}" rx="3"/>`;
      if (k >= 0) white += `<text x="${x + W / 2}" y="${WH - 14}">${names[k] ?? ''}</text>`;
      else if (s === 0) white += `<text class="c" x="${x + W / 2}" y="${WH - 14}">C</text>`;
    });
    [[1, 0], [3, 1], [6, 3], [8, 4], [10, 5]].forEach(([s, i]) => {
      const k = midis.indexOf(60 + o * 12 + s), x = (o * 7 + i + 1) * W - BW / 2;
      black += `<rect class="b${k >= 0 ? ' ' + cls : ''}" x="${x}" y="0" width="${BW}" height="${BH}" rx="2"/>`;
      if (k >= 0) black += `<text x="${x + BW / 2}" y="${BH - 10}" style="font-size:13px">${names[k] ?? ''}</text>`;
    });
  }
  svg.innerHTML = white + black;
}
