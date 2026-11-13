import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
export function draw(ctx, g, { heroId = 'pal', time = 0, pose = 'idle' } = {}) {
  const art = ART.games.balance ?? {}, limit = g.row.limit * g.mods.reach;
  ctx.fillStyle = '#e8f2db'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, art.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#f6e6c7'; ctx.fillRect(0, 440, 1000, 260);
  }
  const travel = g.distance / g.end;
  if (!drawAsset(ctx, art.table, 820 - travel * 100, 430, 170, 140)) {
    ctx.fillStyle = '#b79cd7'; ctx.beginPath(); ctx.roundRect(820 - travel * 100, 430, 170, 30, 12); ctx.fill();
    ctx.fillRect(835 - travel * 100, 460, 20, 100); ctx.fillRect(950 - travel * 100, 460, 20, 100);
  }
  if (g.row.cups > 2) {
    ctx.fillStyle = '#baa48e'; ctx.beginPath(); ctx.roundRect(860 - travel * 720, 558, 65, 12, 6); ctx.fill();
  }
  // Cups and the failure limit share the same pivot and angle, in radians.
  ctx.save(); ctx.translate(g.x, 420);
  ctx.setLineDash([7, 9]); ctx.strokeStyle = '#b9ab97'; ctx.lineWidth = 3;
  for (const sign of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.sin(limit * sign) * 230, -Math.cos(limit) * 230); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.restore();
  drawHero(ctx, heroId, g.fallen ? 'sad' : g.rest ? 'happy' : pose, g.x, 500 + (g.rest ? 0 : Math.sin(time * 8) * 3), 138, time);
  if (!drawAsset(ctx, art.tray, g.x - 115, 411, 230, 40)) {
    ctx.fillStyle = '#83d8bc'; ctx.strokeStyle = '#624632'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(g.x - 115, 411, 230, 32, 14); ctx.fill(); ctx.stroke();
  }
  ctx.save(); ctx.translate(g.x, 420); ctx.rotate(g.angle);
  for (let i = 0; i < g.row.cups; i++) {
    const roll = g.fallen ? (1 - g.rest / .8) * 110 : 0;
    const x = -48 + Math.sign(g.angle) * roll * (i + 1) / g.row.cups, y = -60 - i * 48 + roll;
    if (!drawAsset(ctx, art[`cup${i % 3}`], x, y, 96, 62)) {
      ctx.fillStyle = ['#fa968b', '#8dcbe7', '#f2cd75'][i % 3]; ctx.strokeStyle = '#624632'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.roundRect(x, y, 96, 62, 14); ctx.fill(); ctx.stroke();
    }
  }
  ctx.restore();
  if (Math.abs(g.wind) > .025) {
    ctx.strokeStyle = '#7a9caa'; ctx.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      const x = g.wind > 0 ? 180 : 800, dir = Math.sign(g.wind);
      ctx.beginPath(); ctx.moveTo(x, 190 + i * 22); ctx.lineTo(x + dir * 65, 190 + i * 22);
      ctx.lineTo(x + dir * 50, 180 + i * 22); ctx.stroke();
    }
  }
  ctx.fillStyle = '#fff9ee'; ctx.beginPath(); ctx.roundRect(140, 610, 720, 66, 24); ctx.fill();
  ctx.fillStyle = '#624632'; ctx.font = 'bold 27px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.fallen ? '앗! 다시 쌓아 볼까?' : g.rest ? '식탁에 도착했어!' : '컵이 기우는 쪽으로 쟁반을 움직여 줘!', 500, 653);
}
