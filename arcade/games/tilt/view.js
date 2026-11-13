import { ART, drawAsset, drawBackground, drawStrip } from '../../art.js';
import { BALL, STAR, SPAWN } from './game.js';
export function draw(ctx, g) {
  const art = ART.games.tilt ?? {};
  ctx.fillStyle = '#f5dfb4'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art.background, 0, 0, 1000, 700);
  ctx.strokeStyle = '#b88a57'; ctx.lineWidth = 8;
  ctx.strokeRect(60, 90, 880, 520);
  ctx.fillStyle = '#b8dbc7'; ctx.beginPath(); ctx.arc(SPAWN.x, SPAWN.y, 28, 0, Math.PI * 2); ctx.fill();
  for (const w of g.walls) {
    ctx.save(); ctx.translate(w.x, w.y);
    if (w.h > w.w) { ctx.translate(w.w, 0); ctx.rotate(Math.PI / 2); }
    const width = Math.max(w.w, w.h), height = Math.min(w.w, w.h);
    if (!drawStrip(ctx, art.wall, 0, 0, width, height)) {
      ctx.fillStyle = '#c59157'; ctx.strokeStyle = '#613a27'; ctx.lineWidth = 3;
      ctx.fillRect(0, 0, width, height); ctx.strokeRect(0, 0, width, height);
    }
    ctx.restore();
  }
  for (const h of g.holes) {
    // The dark inner opening has radius h.r; the decorative rim is outside it.
    const size = h.r / .7;
    if (!drawAsset(ctx, art.hole, h.x - size, h.y - size, size * 2, size * 2)) {
      ctx.fillStyle = '#ae794f'; ctx.beginPath(); ctx.arc(h.x, h.y, size, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#482443'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2); ctx.fill();
    }
  }
  const star = g.stars[g.target];
  ctx.strokeStyle = '#fffbee'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(star.x, star.y, STAR + 7, 0, Math.PI * 2); ctx.stroke();
  if (!drawAsset(ctx, art.star, star.x - STAR, star.y - STAR, STAR * 2, STAR * 2)) {
    ctx.fillStyle = '#ffcf37'; ctx.font = 'bold 56px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('★', star.x, star.y + 19);
  }
  const r = BALL * g.mods.small;
  if (!drawAsset(ctx, art.ball, g.x - r, g.y - r, r * 2, r * 2)) {
    ctx.fillStyle = '#23c7c7'; ctx.strokeStyle = '#603e2e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(g.x, g.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.strokeStyle = '#a28c6f'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(500, 350, 24, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(500, 350); ctx.lineTo(500 + g.tiltX * 42, 350 + g.tiltY * 42); ctx.stroke();
  ctx.fillStyle = '#fff9e9'; ctx.beginPath(); ctx.roundRect(190, 630, 620, 48, 20); ctx.fill();
  ctx.fillStyle = '#614832'; ctx.textAlign = 'center'; ctx.font = 'bold 25px sans-serif';
  ctx.fillText(g.surprised ? '앗! 다시 굴려 볼까?' : '가고 싶은 쪽으로 꾹! 떼면 천천히 멈춰', 500, 662);
}
