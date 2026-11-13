import { ART, drawBackground, drawStrip, drawAsset, drawHero } from '../../art.js';
import { LAND_MIN, LAND_RANGE } from './game.js';
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#e2f5ff'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.toss?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#c7e9bd'; ctx.fillRect(0, 470, 1000, 230);
    ctx.fillStyle = '#f5ffed';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(100 + i * 280, 460, 180, 80, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  const width = g.row.width * g.mods.reach;
  if (!drawStrip(ctx, ART.games.toss?.basket, g.bx - width, 430, width * 2, 90)) {
    ctx.fillStyle = '#dca574'; ctx.strokeStyle = '#9b674e'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(g.bx - width, 430); ctx.lineTo(g.bx + width, 430);
    ctx.lineTo(g.bx + width * .75, 515); ctx.lineTo(g.bx - width * .75, 515); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f7d8a1'; ctx.beginPath(); ctx.ellipse(g.bx, 430, width, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  drawHero(ctx, heroId, g.ball ? 'jump' : pose, 120, 450, 120, time);
  const t = Math.min(1, g.ball?.t ?? 0);
  const x = g.ball ? 120 + (g.ball.lx - 120) * t : 160;
  const y = g.ball ? 430 - Math.sin(t * Math.PI) * 270 : 380;
  if (!drawAsset(ctx, ART.games.toss?.ball, x - 24, y - 24, 48, 48)) {
    ctx.fillStyle = '#f285aa'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.roundRect(190, 550, 620, 64, 24); ctx.fill();
  if (g.row.zone || g.mods.hint) {
    const center = 210 + (g.bx - LAND_MIN) / LAND_RANGE * 580, half = width / LAND_RANGE * 580;
    const left = Math.max(210, center - half), right = Math.min(790, center + half);
    ctx.fillStyle = '#8ddd9c'; ctx.beginPath(); ctx.roundRect(left, 556, right - left, 52, 12); ctx.fill();
  }
  ctx.fillStyle = '#eb719c'; ctx.beginPath(); ctx.roundRect(210 + g.p * 580 - 10, 540, 20, 84, 10); ctx.fill();
  ctx.fillStyle = '#526780'; ctx.textAlign = 'center'; ctx.font = 'bold 28px sans-serif';
  ctx.fillText(g.ball ? '공이 날아가!' : g.row.zone || g.mods.hint ? '초록 칸에 오면 톡!' : '바구니까지 힘을 맞춰 톡!', 500, 665);
}
