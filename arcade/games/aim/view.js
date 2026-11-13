import { ART, drawBackground, drawAsset, drawHero, drawToken } from '../../art.js';
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#e2f5ff'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.aim?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#c6e8c0'; ctx.beginPath(); ctx.ellipse(500, 700, 700, 130, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c7e3ef'; ctx.lineWidth = 4;
    for (const y of [160, 290, 420]) { ctx.beginPath(); ctx.moveTo(70, y); ctx.lineTo(930, y); ctx.stroke(); }
  }
  for (const t of g.targets) drawToken(ctx, t.token, t.x, t.y, 108, { hint: !!g.mods.hint && t.good });
  if (g.shot && !drawAsset(ctx, ART.games.aim?.drop, g.shot.x - 16, g.shot.y - 16, 32, 32)) {
    ctx.fillStyle = '#63b7e5'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(g.shot.x, g.shot.y, 16, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  drawHero(ctx, heroId, pose, 500, 625, 100, time);
  if (!drawAsset(ctx, ART.games.aim?.nozzle, 480, 550, 40, 35)) {
    ctx.fillStyle = '#7fbbc9'; ctx.beginPath(); ctx.roundRect(480, 550, 40, 35, 12); ctx.fill();
  }
  ctx.fillStyle = '#fff'; ctx.fillRect(430, 665, 140, 12);
  ctx.fillStyle = '#63b7e5'; ctx.fillRect(430, 665, 140 * (1 - g.cool / g.row.cool), 12);
  ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#526780';
  ctx.fillText(g.cool > 0 ? '물방울을 모으고 있어!' : '글자를 향해 톡!', 500, 540);
}
