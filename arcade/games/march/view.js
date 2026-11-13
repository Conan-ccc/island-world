import { ART, drawAsset, drawBackground } from '../../art.js';
import { Y, SIZE, GAP, available, urgent } from './game.js';
export function draw(ctx, g, { time = 0 } = {}) {
  const art = ART.games.march;
  ctx.fillStyle = '#dcebd2'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  ctx.fillStyle = '#edc994'; ctx.fillRect(0, Y - 8, 1000, 100);
  ctx.fillStyle = '#d4af7e'; ctx.fillRect(0, Y + 79, 1000, 13);
  const hint = g.mods.hint ? urgent(g) : null;
  for (const h of g.gaps) {
    drawAsset(ctx, art?.path, h.x - 53, Y - 8, 106, 100);
    // The open silhouette uses the exact collision width, independent of sprite margins.
    ctx.fillStyle = '#216d68'; ctx.fillRect(h.x - GAP / 2, Y - 8, GAP, 100);
    if (hint === h && Math.sin(time * 8) > 0) { ctx.strokeStyle = '#fff5a1'; ctx.lineWidth = 7; ctx.strokeRect(h.x - 44, Y - 19, 88, 117); }
    if (h.bridge) {
      if (!drawAsset(ctx, art?.plank, h.x - 44, Y - 12, 88, 104)) {
        ctx.fillStyle = '#ffc96e'; ctx.strokeStyle = '#69462f'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.roundRect(h.x - 44, Y - 12, 88, 104, 8); ctx.fill(); ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#fff8df'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(h.x - 10, Y + 38); ctx.lineTo(h.x + 10, Y + 38); ctx.moveTo(h.x, Y + 28); ctx.lineTo(h.x, Y + 48); ctx.stroke();
    }
  }
  if (!drawAsset(ctx, art?.house, 870, Y - 145, 125, 157)) {
    ctx.fillStyle = '#f69b8e'; ctx.beginPath(); ctx.roundRect(876, Y - 140, 114, 150, 25); ctx.fill();
    ctx.fillStyle = '#527c7b'; ctx.beginPath(); ctx.roundRect(909, Y - 67, 50, 77, 23); ctx.fill();
  }
  for (const a of g.animals) {
    const drop = a.returning ? (1 - a.returning / .65) * 46 : 0;
    ctx.save(); ctx.globalAlpha = a.returning ? a.returning / .65 : 1;
    const bob = a.returning ? 0 : Math.sin(time * 9 + a.id) * 2;
    if (!drawAsset(ctx, art?.['animal' + a.id % 3], a.x - SIZE / 2, Y - SIZE + bob + drop, SIZE, SIZE)) {
      ctx.fillStyle = ['#ffbf8a', '#a6d8b1', '#c3abe5'][a.id % 3]; ctx.strokeStyle = '#603f29'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(a.x - SIZE / 2, Y - SIZE + drop, SIZE, SIZE, 19); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#603f29'; ctx.beginPath(); ctx.arc(a.x + 10, Y - 31 + drop, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    if (a.returning) { ctx.fillStyle = '#654d43'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('앗!', a.x, Y - 65); }
  }
  // Reusable stock is shown as pictures, not a reading/counting task.
  if (g.noStock > 0) { ctx.fillStyle = '#594a40'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('널빤지 없음', 500, 540); }
  for (let i = 0; i < g.row.planks; i++) {
    ctx.save(); ctx.globalAlpha = i < available(g) ? 1 : .23;
    if (!drawAsset(ctx, art?.plank, 435 + i * 80, 560, 70, 30)) { ctx.fillStyle = '#cb944f'; ctx.fillRect(435 + i * 80, 560, 70, 30); }
    ctx.restore();
  }
  ctx.fillStyle = '#fff9ee'; ctx.beginPath(); ctx.roundRect(220, 626, 560, 52, 22); ctx.fill();
  ctx.fillStyle = '#594a40'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('빈 길을 톡! 다리는 다시 돌아와!', 500, 661);
}
