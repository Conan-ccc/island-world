import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
import { LX, CAR_Y } from './game.js';
export function draw(ctx, g, { heroId = 'pal', time = 0, pose = 'idle' } = {}) {
  ctx.fillStyle = '#d6edc5'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, ART.games.lane?.background, 0, 0, 1000, 700);
  ctx.fillStyle = '#b9b0c6'; ctx.fillRect(190, 0, 620, 700);
  ctx.fillStyle = '#fff9ee';
  for (const x of [400, 600]) for (let i = -1; i < 8; i++) ctx.fillRect(x - 5, (i * 100 + g.distance % 100), 10, 50);
  for (const w of g.waves) {
    ctx.globalAlpha = w.done || w.y > CAR_Y + 50 ? .25 : 1;
    for (const lane of w.cones) {
      const x = LX[lane];
      if (!drawAsset(ctx, ART.games.lane?.cone, x - 48, w.y - 52, 96, 104)) {
        ctx.fillStyle = '#f56b16'; ctx.strokeStyle = '#813900'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, w.y - 52); ctx.lineTo(x + 48, w.y + 34); ctx.lineTo(x - 48, w.y + 34); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#fff9ee'; ctx.fillRect(x - 28, w.y - 4, 56, 14);
      }
    }
    if (!drawAsset(ctx, ART.games.lane?.star, LX[w.free] - 48, w.y - 48, 96, 96)) {
      ctx.fillStyle = '#ffcf00'; ctx.strokeStyle = '#694900'; ctx.lineWidth = 5; ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 23 : 48;
        ctx.lineTo(LX[w.free] + Math.cos(angle) * r, w.y + Math.sin(angle) * r);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  const scale = g.mods.small;
  ctx.save(); ctx.translate(g.x, CAR_Y); ctx.scale(scale, scale);
  if (!drawAsset(ctx, ART.games.lane?.car, -46, -55, 92, 110)) {
    ctx.fillStyle = '#655d75';
    for (const x of [-54, 40]) for (const y of [-38, 27]) ctx.fillRect(x, y, 14, 25);
    ctx.fillStyle = '#f49fba'; ctx.strokeStyle = '#92657e'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(-46, -55, 92, 110, 24); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e4f5fa'; ctx.beginPath(); ctx.roundRect(-32, -39, 64, 40, 12); ctx.fill();
  }
  drawHero(ctx, heroId, pose, 0, 10, 58, time); ctx.restore();
  ctx.fillStyle = '#fff9ee';
  for (const x of [270, 730]) { ctx.beginPath(); ctx.roundRect(x - 135, 608, 270, 68, 24); ctx.fill(); }
  ctx.fillStyle = '#66566f'; ctx.font = 'bold 27px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('◀ 왼쪽 톡!', 270, 651); ctx.fillText('오른쪽 톡! ▶', 730, 651);
}
