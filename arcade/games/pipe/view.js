import { ART, drawBackground, drawAsset } from '../../art.js';
import { layout, center, ports, solve } from './game.js';
export function draw(ctx, g) {
  const art = ART.games.pipe ?? {}, b = layout(g);
  ctx.fillStyle = '#e7efda'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art.background, 0, 0, 1000, 700);
  const hint = g.mods.hint ? solve(g).find(p => g.tiles[p.i].rot !== p.rot && !g.wet.includes(p.i))?.i : -1;
  g.tiles.forEach((tile, i) => {
    const c = center(g, i), half = b.size / 2;
    ctx.fillStyle = hint === i ? '#fff3aa' : '#fff9ec'; ctx.strokeStyle = '#c7c9ac'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(c.x - half + 2, c.y - half + 2, b.size - 4, b.size - 4, 12); ctx.fill(); ctx.stroke();
    ctx.save(); ctx.translate(c.x, c.y); ctx.rotate(tile.rot * Math.PI / 2);
    const drawn = drawAsset(ctx, art[tile.kind], -half, -half, b.size, b.size); ctx.restore();
    // Sprites share these port axes; fallback pipes and water use the exact same coordinates.
    for (const [width, color] of [...(drawn ? [] : [[b.size * .29, '#65472f'], [b.size * .21, '#f4bd71']]), ...(g.wet.includes(i) ? [[b.size * .11, '#3bbcf0']] : [])]) {
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
      for (const d of ports(tile)) { ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(c.x + [0,1,0,-1][d] * half, c.y + [-1,0,1,0][d] * half); ctx.stroke(); }
    }
    if (hint === i && g.elapsed % 1 < .55) {
      ctx.strokeStyle = '#efad32'; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.roundRect(c.x - half + 7, c.y - half + 7, b.size - 14, b.size - 14, 12); ctx.stroke();
    }
  });
  const a = center(g, g.start), z = center(g, g.end), left = b.x - 105, right = b.x + b.size * g.row.cols + 10;
  if (!drawAsset(ctx, art.tank, left, a.y - 55, 95, 110)) { ctx.fillStyle = '#74cde3'; ctx.fillRect(left, a.y - 45, 85, 90); }
  if (!drawAsset(ctx, g.bloom ? art.flower : art.bud, right, z.y - 60, 95, 120)) { ctx.font = '70px sans-serif'; ctx.fillText(g.bloom ? '🌸' : '🌷', right, z.y + 30); }
  ctx.fillStyle = '#fff9ec'; ctx.beginPath(); ctx.roundRect(180, 602, 640, 65, 24); ctx.fill();
  ctx.fillStyle = '#65472f'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.bloom ? '활짝! 꽃이 피었어!' : g.rest ? '앗! 다시 이어 보자!' : '물길을 톡톡 돌려서 꽃까지!', 500, 644);
  if (g.row.auto && !g.flowing && !g.rest) { ctx.fillStyle = '#7ccde5'; ctx.fillRect(350, 565, 300 * Math.min(1, g.elapsed / g.row.wait), 12); }
}
