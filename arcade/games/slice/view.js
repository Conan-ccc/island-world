import { ART, drawBackground, drawAsset } from '../../art.js';
const COLORS = ['#f8839b', '#ffc94c', '#8cd99a', '#ffaa68'];
export function draw(ctx, g) {
  ctx.fillStyle = '#fff4da'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.slice?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#e4edc5'; ctx.fillRect(0, 590, 1000, 110);
  }
  for (const it of g.items) {
    const drawn = drawAsset(ctx, ART.games.slice?.[it.bad ? 'rock' : 'fruit' + it.color], it.x - 48, it.y - 48, 96, 96);
    ctx.lineWidth = 5;
    if (it.bad) {
      if (!drawn) {
        ctx.fillStyle = '#887b98'; ctx.strokeStyle = '#50445f'; ctx.beginPath();
        ctx.roundRect(it.x - 39, it.y - 35, 78, 70, 19); ctx.fill(); ctx.stroke();
      }
      ctx.strokeStyle = '#efe8f3'; ctx.beginPath(); ctx.moveTo(it.x - 12, it.y - 14); ctx.lineTo(it.x + 13, it.y + 13);
      ctx.moveTo(it.x + 13, it.y - 14); ctx.lineTo(it.x - 12, it.y + 13); ctx.stroke();
    } else if (!drawn) {
      ctx.fillStyle = COLORS[it.color]; ctx.strokeStyle = '#9c5c49'; ctx.beginPath(); ctx.arc(it.x, it.y, 44, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#559f50'; ctx.beginPath(); ctx.ellipse(it.x + 10, it.y - 44, 17, 9, -.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.save(); ctx.strokeStyle = '#e85689'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  for (const p of g.trail) { ctx.globalAlpha = p.life / .18; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.bx, p.by); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = '#fffdf5'; ctx.beginPath(); ctx.roundRect(190, 610, 620, 68, 24); ctx.fill();
  ctx.fillStyle = '#65516b'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('과일은 쓱! 돌은 피해!', 500, 653);
}
