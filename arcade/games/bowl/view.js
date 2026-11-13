import { ART, drawAsset, drawBackground } from '../../art.js';
import { BALL, LEFT, RIGHT, pinRadius, obstacleX } from './game.js';
export function draw(ctx, g) {
  const art = ART.games.bowl;
  ctx.fillStyle = '#eef3df'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  ctx.fillStyle = '#fff2d4'; ctx.fillRect(LEFT, 60, RIGHT - LEFT, 590);
  ctx.strokeStyle = g.row.bumpers ? '#77b9af' : '#b9a99e'; ctx.lineWidth = g.row.bumpers ? 16 : 8;
  for (const x of [LEFT, RIGHT]) { ctx.beginPath(); ctx.moveTo(x, 60); ctx.lineTo(x, 650); ctx.stroke(); }
  function sprite(name, x, y, r, color) {
    if (!drawAsset(ctx, art?.[name], x - r, y - r, 2 * r, 2 * r)) {
      ctx.fillStyle = color; ctx.strokeStyle = '#5a342b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  if (g.mods.hint && !g.vy && !g.hold) {
    const dx = g.drag ? g.dx : 0, dy = g.drag && g.dy < -20 ? -g.dy : 180;
    ctx.save(); ctx.setLineDash([9, 12]); ctx.strokeStyle = '#78a69c'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(g.x, g.y); ctx.lineTo(g.x + dx / dy * 480, g.y - 480); ctx.stroke(); ctx.restore();
  }
  for (const p of g.pins) {
    if (p.down && p.fade > .65) continue;
    ctx.save(); ctx.globalAlpha = p.down ? Math.max(0, 1 - p.fade / .65) : 1;
    sprite(p.down ? 'fallen' : 'pin', p.x + (p.down ? p.fade * 65 : 0), p.y,
      pinRadius(g), '#fff8e3'); ctx.restore();
  }
  if (g.row.obstacle) sprite('obstacle', obstacleX(g), 350, 34, '#c9a4e3');
  if (!g.hold) {
    // The halo is the finger target; the solid ball is exactly its collision diameter.
    if (!g.vy) {
      ctx.strokeStyle = '#86bbb4'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(g.x, g.y, 58, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(500, 544); ctx.lineTo(500, 487); ctx.lineTo(487, 503);
      ctx.moveTo(500, 487); ctx.lineTo(513, 503); ctx.stroke();
    }
    sprite('ball', g.x, g.y, BALL, '#41b8bc');
  }
  ctx.fillStyle = '#5a4039'; ctx.textAlign = 'center'; ctx.font = 'bold 25px sans-serif';
  ctx.fillText(g.hold ? (g.hits ? '와르르! 한 번 더!' : '방향을 바꿔 봐!') : '아래 공을 위로 쓱!', 500, 687);
}
