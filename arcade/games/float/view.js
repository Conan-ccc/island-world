import { ART, drawBackground, drawCloudWall, drawAsset, drawHero } from '../../art.js';
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#e2f3fc'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.float?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#fff9ee';
    for (let i = 0; i < 6; i++) {
      const x = ((i * 230 - g.distance * .15) % 1380 + 1380) % 1380 - 150;
      ctx.beginPath(); ctx.ellipse(x, 100 + (i % 3) * 220, 85, 28, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const w of g.walls) {
    ctx.globalAlpha = w.done ? .4 : 1;
    const top = w.y - w.gap / 2, bottom = w.y + w.gap / 2;
    for (const [y, height] of [[0, top], [bottom, 700 - bottom]]) {
      if (!drawCloudWall(ctx, ART.games.float?.cloud, w.x - 38, y, 76, height, y === 0)) {
        ctx.fillStyle = w.hit ? '#e1bacd' : '#c7d7ed'; ctx.strokeStyle = '#8b9fbc'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(w.x - 38, y, 76, height, 22); ctx.fill(); ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  const size = 60 * g.mods.small;
  // The string and balloon are decorative; the friend's body is the collision circle.
  ctx.strokeStyle = '#887296'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(220, g.y - size / 2); ctx.lineTo(256, g.y - 4); ctx.stroke();
  if (!drawAsset(ctx, ART.games.float?.balloon, 230, g.y - 60, 52, 56)) {
    ctx.fillStyle = '#f59dbb'; ctx.beginPath(); ctx.ellipse(256, g.y - 32, 26, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  drawHero(ctx, heroId, pose === 'sad' ? pose : g.down ? 'jump' : 'idle', 220, g.y, size, time);
}
