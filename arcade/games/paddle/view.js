import { BALL_RADIUS } from './game.js';
import { ART, drawBackground, drawStrip, drawAsset, drawHero } from '../../art.js';
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#e8f6f2'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, ART.games.paddle?.background, 0, 0, 1000, 700);
  const colors = ['#f4b5ce', '#b3dbee', '#f4da94'];
  for (const br of g.bricks) if (br.alive) {
    if (!drawStrip(ctx, ART.games.paddle?.block, br.x - br.w / 2, br.y - br.h / 2, br.w, br.h)) {
      ctx.fillStyle = colors[Math.round((br.y - 90) / 62) % 3]; ctx.strokeStyle = '#8d7c9e'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(br.x - br.w / 2, br.y - br.h / 2, br.w, br.h, 12); ctx.fill(); ctx.stroke();
    }
  }
  ctx.fillStyle = '#f2bd91'; ctx.strokeStyle = '#8d7c9e'; ctx.lineWidth = 4;
  if (!drawStrip(ctx, ART.games.paddle?.paddle, g.px - g.pw / 2, 540, g.pw, 26)) {
    ctx.beginPath(); ctx.roundRect(g.px - g.pw / 2, 540, g.pw, 26, 13); ctx.fill(); ctx.stroke();
  }
  const b = g.ball ?? { x: g.px, y: 500 };
  if (!drawAsset(ctx, ART.games.paddle?.ball, b.x - BALL_RADIUS, b.y - BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2)) {
    ctx.fillStyle = '#8c80bb'; ctx.beginPath(); ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2); ctx.fill();
  }
  drawHero(ctx, heroId, pose, g.px, 615, 68, time);
}
