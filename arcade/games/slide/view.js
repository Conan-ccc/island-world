import { ART, drawAsset, drawBackground, drawHero } from '../../art.js';
import { layout, center, solve, DX, DY } from './game.js';
export function draw(ctx, g, { heroId = 'pal', time = 0 } = {}) {
  const art = ART.games.slide ?? {}, b = layout(g), size = b.size;
  ctx.fillStyle = '#e9f3f5'; ctx.fillRect(0, 0, 1000, 700); drawBackground(ctx, art.background, 0, 0, 1000, 700);
  ctx.fillStyle = '#688ea0'; ctx.beginPath(); ctx.roundRect(b.x - 8, b.y - 8, size * g.row.size + 16, size * g.row.size + 16, 18); ctx.fill();
  for (let i = 0; i < g.row.size ** 2; i++) {
    const c = center(g, i), x = c.x - size / 2, y = c.y - size / 2;
    ctx.fillStyle = '#d4edf5'; ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    drawAsset(ctx, art.ice, x + 2, y + 2, size - 4, size - 4);
    if (g.rocks.includes(i) && !drawAsset(ctx, art.rock, x + 3, y + 3, size - 6, size - 6)) {
      ctx.fillStyle = '#8d91ae'; ctx.beginPath(); ctx.roundRect(x + 4, y + 4, size - 8, size - 8, 18); ctx.fill();
    }
    if (g.holes.includes(i)) {
      // Whole-cell lip makes the discrete hazard footprint visible.
      ctx.strokeStyle = '#446d80'; ctx.lineWidth = 3; ctx.strokeRect(x + 3, y + 3, size - 6, size - 6);
      if (!drawAsset(ctx, art.hole, x + 5, y + 5, size - 10, size - 10)) { ctx.fillStyle = '#35596f'; ctx.beginPath(); ctx.ellipse(c.x, c.y, size * .4, size * .32, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    const star = g.stars.indexOf(i);
    if (star >= 0 && !(g.mask & (1 << star)) && !drawAsset(ctx, art.star, x + size * .16, y + size * .16, size * .68, size * .68)) {
      ctx.fillStyle = '#e6a628'; ctx.font = `${size * .7}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('★', c.x, c.y + size * .25);
    }
  }
  let c = center(g, g.pos);
  if (g.motion) { const a = center(g, g.motion.from), z = center(g, g.motion.to), t = g.motion.t / g.motion.duration; c = { x: a.x + (z.x - a.x) * t, y: a.y + (z.y - a.y) * t }; }
  drawHero(ctx, heroId, g.won ? 'happy' : g.rest ? 'sad' : 'idle', c.x, c.y, size * .92, time);
  if (g.mods.hint && !g.motion && !g.rest) {
    const d = solve(g)?.[0];
    if (d !== undefined) { ctx.fillStyle = '#f1ad26'; ctx.globalAlpha = .7 + .3 * Math.sin(time * 5); ctx.font = 'bold 52px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(['↑','→','↓','←'][d], c.x + DX[d] * size * .65, c.y + DY[d] * size * .65 + 16); ctx.globalAlpha = 1; }
  }
  if (g.row.limited) {
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.roundRect(340, 559, 320, 40, 16); ctx.fill();
    ctx.fillStyle = g.moves <= 2 ? '#986029' : '#397f70'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(`쓸기 ${g.moves}번 남았어`, 500, 589);
  }
  ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.roundRect(170, 603, 660, 58, 24); ctx.fill();
  ctx.fillStyle = '#62442f'; ctx.font = 'bold 25px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.won ? '반짝! 별을 모두 모았어!' : g.rest ? '앗! 처음부터 다시 해 보자!' : '손가락으로 쓱! 별을 모아 줘!', 500, 641);
}
