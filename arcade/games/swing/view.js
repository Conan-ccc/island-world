import { ART, drawBackground, drawStrip, drawAsset, drawHero } from '../../art.js';
import { hanging, landing, LAND_Y } from './game.js';
export function draw(ctx, g, { heroId = 'pal', time = 0, pose = 'idle' } = {}) {
  ctx.fillStyle = '#ddf4fa'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.swing?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#a9ddec'; ctx.fillRect(0, 570, 1000, 130);
    ctx.fillStyle = '#a0cc9d'; ctx.beginPath(); ctx.ellipse(155, 670, 230, 100, 0, 0, Math.PI * 2); ctx.fill();
  }
  const width = g.row.width * g.mods.reach;
  const body = g.fly || hanging(g);
  const guide = !g.fly && (g.row.guide || g.mods.hint) && body.vx > 0;
  const ready = guide && Math.abs(landing(body) - g.px) <= width;
  if (!drawStrip(ctx, ART.games.swing?.platform, g.px - width, LAND_Y + 36, width * 2, 58)) {
    ctx.fillStyle = ready ? '#a9f579' : '#66b874'; ctx.strokeStyle = '#386d49'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(g.px - width, LAND_Y + 36, width * 2, 58, 18); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c8eda5'; ctx.fillRect(g.px - width + 12, LAND_Y + 42, width * 2 - 24, 10);
  }
  if (!drawAsset(ctx, ART.games.swing?.bar, 210, 60, 140, 24)) {
    ctx.fillStyle = '#80664e'; ctx.beginPath(); ctx.roundRect(210, 60, 140, 24, 10); ctx.fill();
  }
  if (ready) {
    ctx.strokeStyle = '#238052'; ctx.lineWidth = 6;
    ctx.strokeRect(g.px - width, LAND_Y + 36, width * 2, 58);
  }
  if (!g.fly) {
    ctx.strokeStyle = '#675468'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(280, 80); ctx.lineTo(body.x, body.y); ctx.stroke();
    if (guide) {
      const x = landing(body), hit = Math.abs(x - g.px) <= width;
      ctx.fillStyle = hit ? '#238052' : '#c26372'; ctx.beginPath(); ctx.arc(x, LAND_Y + 28, 20, 0, Math.PI * 2); ctx.fill();
      if (hit) { ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('지금 톡!', g.px, 470); }
    }
  }
  drawHero(ctx, heroId, g.fly ? (g.landed ? 'happy' : 'jump') : pose, body.x, body.y, 88, time);
  ctx.fillStyle = '#fff9ee'; ctx.beginPath(); ctx.roundRect(210, 610, 580, 68, 24); ctx.fill();
  ctx.fillStyle = '#66566f'; ctx.font = 'bold 27px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.fly ? (g.landed ? '사뿐! 잘했어!' : '발판으로 날아가!') : '알맞을 때 아무 데나 톡!', 500, 653);
}
