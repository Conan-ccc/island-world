import { BALL_RADIUS, WING_Y, wings } from './game.js';
import { ART, drawBackground, drawAsset, drawStrip } from '../../art.js';
export function draw(ctx, g) {
  const art = ART.games.pinball;
  ctx.fillStyle = '#edf4e6'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  ctx.strokeStyle = '#aac6b5'; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.moveTo(65, 650); ctx.lineTo(65, 50); ctx.lineTo(935, 50); ctx.lineTo(935, 650); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(65, 350); ctx.lineTo(308, 620); ctx.moveTo(935, 350); ctx.lineTo(692, 620); ctx.stroke();
  for (const [i, p] of g.bumpers.entries()) {
    if (!drawAsset(ctx, i % 2 ? art?.flower : art?.mushroom, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2)) {
      ctx.fillStyle = i % 2 ? '#ee9fb6' : '#f6bc79'; ctx.strokeStyle = '#664c39'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  const t = g.target;
  ctx.save(); ctx.globalAlpha = g.dark ? .2 : 1;
  ctx.fillStyle = '#fff3b9'; ctx.strokeStyle = '#e8c665'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (!drawAsset(ctx, art?.star, t.x - t.r, t.y - t.r, t.r * 2, t.r * 2)) {
    ctx.fillStyle = '#ffd558'; ctx.strokeStyle = '#664c39'; ctx.lineWidth = 4; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = t.r * (i % 2 ? .5 : 1); ctx.lineTo(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  for (const [i, w] of wings(g).entries()) {
    const length = g.active ? w.end - w.x : 100;
    ctx.save(); ctx.translate(i ? w.end : w.x, WING_Y + 16);
    if (i) ctx.scale(-1, 1);
    // Active wings meet y=550; resting wings fold outside the ball funnel.
    ctx.rotate(g.active ? 0 : Math.PI / 2);
    if (!drawStrip(ctx, art?.wing, 0, -16, length, 32)) {
      ctx.fillStyle = '#ec9aab'; ctx.strokeStyle = '#664c39'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(0, -16, length, 32, 16); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.fillStyle = '#94cbb3'; ctx.strokeStyle = '#547c68'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(500 - g.row.safe / 2, 620, g.row.safe, 18, 9); ctx.fill(); ctx.stroke();
  if (g.ball) {
    const b = g.ball;
    if (!drawAsset(ctx, art?.ball, b.x - BALL_RADIUS, b.y - BALL_RADIUS, BALL_RADIUS * 2, BALL_RADIUS * 2)) {
      ctx.fillStyle = '#7dbbe0'; ctx.strokeStyle = '#664c39'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, BALL_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
}
