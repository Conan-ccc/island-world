import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
import { BOUNDS } from './game.js';
export function draw(ctx, g, { heroId = 'pal', time = 0, pose = 'idle' } = {}) {
  ctx.fillStyle = '#eee9fc'; ctx.fillRect(0, 0, 1000, 700);
  const background = drawBackground(ctx, ART.games.chase?.background, 0, 0, 1000, 700);
  ctx.fillStyle = background ? '#f8f5ff59' : '#f8f5ff'; ctx.strokeStyle = '#c3b8db'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(BOUNDS.left - 44, BOUNDS.top - 44,
    BOUNDS.right - BOUNDS.left + 88, BOUNDS.bottom - BOUNDS.top + 88, 40); ctx.fill(); ctx.stroke();
  if (!drawAsset(ctx, ART.games.chase?.star, g.star.x - 48, g.star.y - 48, 96, 96)) {
    ctx.fillStyle = '#ffcf36'; ctx.strokeStyle = '#97701d'; ctx.lineWidth = 4; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 24 : 48;
      const x = g.star.x + Math.cos(a) * r, y = g.star.y + Math.sin(a) * r;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  for (const f of g.foes) {
    if (drawAsset(ctx, ART.games.chase?.cloud, f.x - 48, f.y - 48, 96, 96)) continue;
    ctx.fillStyle = '#8975b8'; ctx.strokeStyle = '#51406c'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(f.x - 44, f.y - 34, 88, 68, 28); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fffaf2';
    for (const dx of [-16, 16]) { ctx.beginPath(); ctx.arc(f.x + dx, f.y - 5, 10, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#453853';
    for (const dx of [-16, 16]) { ctx.beginPath(); ctx.arc(f.x + dx, f.y - 3, 4, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#fffaf2'; ctx.beginPath(); ctx.moveTo(f.x - 12, f.y + 18); ctx.lineTo(f.x + 12, f.y + 18); ctx.stroke();
  }
  ctx.save();
  if (g.safe > 0) {
    ctx.strokeStyle = '#66aa9a'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(g.x, g.y, 49, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = .65;
  }
  drawHero(ctx, heroId, pose, g.x, g.y, 80 * g.mods.small, time); ctx.restore();
  ctx.fillStyle = '#fffdf5'; ctx.beginPath(); ctx.roundRect(150, 616, 700, 64, 24); ctx.fill();
  ctx.fillStyle = '#57456b'; ctx.font = 'bold 27px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('손가락을 따라와! 별을 모으고 구름은 피해!', 500, 657);
}
