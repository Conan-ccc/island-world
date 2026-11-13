import { ART, drawBackground, drawAsset } from '../../art.js';
import { bounds, CENTER, RADIUS } from './game.js';
export function draw(ctx, g) {
  const art = ART.games.whirl, { x, y } = CENTER, band = bounds(g);
  ctx.fillStyle = '#fff5df'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  if (!drawAsset(ctx, art?.machine, 285, 275, 430, 305)) {
    ctx.fillStyle = '#79c9c1'; ctx.strokeStyle = '#65452e'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.roundRect(355, 380, 290, 180, 50); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffb8d3'; ctx.beginPath(); ctx.ellipse(x, 370, 215, 95, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  // The whole shaded annulus is interactive, with precisely the same radii as the rules.
  ctx.fillStyle = '#fffdf340'; ctx.beginPath();
  ctx.arc(x, y, RADIUS.max, 0, Math.PI * 2); ctx.arc(x, y, RADIUS.min, 0, Math.PI * 2, true); ctx.fill();
  ctx.strokeStyle = '#96b8a7'; ctx.lineWidth = 3; ctx.setLineDash([8, 10]);
  for (const r of [RADIUS.min, RADIUS.max]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
  ctx.setLineDash([]);
  ctx.strokeStyle = '#32996b'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(x, y, 125, 0, Math.PI * 2); ctx.stroke();
  if (!drawAsset(ctx, art?.stick, x - 10, y + 5, 20, 190)) {
    ctx.strokeStyle = '#b58054'; ctx.lineWidth = 16; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 195); ctx.stroke();
  }
  const size = 40 + g.size * 210, colors = ['#ffa7cf', '#90d9f4', '#c9a9f1'];
  if (g.result !== 'burst') {
    if (!drawAsset(ctx, art?.[`candy${g.color}`], x - size / 2, y - size / 2, size, size)) {
      ctx.fillStyle = colors[g.color]; ctx.strokeStyle = '#65452e'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  if (g.speed > band.high || g.result === 'burst') {
    ctx.fillStyle = colors[g.color];
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7, r = 145 + (1 - g.rest) * 40;
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 12, 0, Math.PI * 2); ctx.fill();
    }
  }
  const a = g.angle ?? g.elapsed * .8;
  ctx.fillStyle = '#fff5c4'; ctx.strokeStyle = '#65452e'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x + Math.cos(a) * RADIUS.guide, y + Math.sin(a) * RADIUS.guide, 18, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  const gauge = v => 250 + Math.min(10, Math.max(0, v)) / 10 * 500;
  ctx.fillStyle = '#f4d58d'; ctx.beginPath(); ctx.roundRect(250, 590, 500, 30, 15); ctx.fill();
  ctx.fillStyle = '#58bd7e'; ctx.fillRect(gauge(band.low), 590, gauge(band.high) - gauge(band.low), 30);
  ctx.fillStyle = '#65452e'; ctx.beginPath(); ctx.moveTo(gauge(g.speed), 587); ctx.lineTo(gauge(g.speed) - 11, 573); ctx.lineTo(gauge(g.speed) + 11, 573); ctx.fill();
  if (g.hot > 0 && g.row.risky) {
    ctx.fillStyle = '#ee9c88'; ctx.fillRect(350, 630, 300 * Math.min(1, g.hot / (g.row.burst * g.mods.time)), 20);
  }
  ctx.fillStyle = '#65452e'; ctx.textAlign = 'center'; ctx.font = 'bold 27px sans-serif';
  ctx.fillText(g.result === 'good' ? '폭신폭신 다 됐어!' : g.result === 'timeout' ? '잠깐 쉬고 다시 돌려 보자!' : g.result ? '구름처럼 훨훨! 다시 해 보자!' : '빙글빙글, 초록 칸에 맞춰 봐!', 500, 675);
}
