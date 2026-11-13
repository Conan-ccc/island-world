import { ART, drawBackground, drawAsset, drawStrip } from '../../art.js';
import { bounds, flow, cupX } from './game.js';
export function draw(ctx, g) {
  const art = ART.games.pour;
  ctx.fillStyle = '#fff2da'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  if (!drawStrip(ctx, art?.belt, 150, 520, 700, 56)) {
    ctx.fillStyle = '#a4c6bc'; ctx.beginPath(); ctx.roundRect(150, 520, 700, 56, 26); ctx.fill();
  }
  if (g.row.moving) {
    ctx.fillStyle = '#577c71'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('→     →     →', 500, 558);
  }
  const x = cupX(g), h = [230, 205, 255][g.variant], bottom = 515, top = bottom - h;
  const { low, high } = bounds(g), ready = g.level + flow(g) * g.row.lag >= low && g.level + flow(g) * g.row.lag <= high;
  ctx.save(); ctx.translate(x + 77, top - 65); ctx.rotate(g.pouring ? -.35 : 0);
  if (g.mods.hint && ready) { ctx.fillStyle = '#ffe070'; ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI * 2); ctx.fill(); }
  if (!drawAsset(ctx, art?.jug, -70, -70, 140, 140)) {
    ctx.fillStyle = '#ffb94c'; ctx.strokeStyle = '#65452e'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.roundRect(-60, -55, 110, 110, 25); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-60, -40); ctx.lineTo(-90, -30); ctx.lineTo(-60, 0); ctx.fill(); ctx.stroke();
  }
  ctx.restore();
  // Code owns the cup interior and all level marks, so art cannot hide the target.
  ctx.fillStyle = '#fffdf5'; ctx.beginPath(); ctx.roundRect(x - 76, top, 152, h, 15); ctx.fill();
  ctx.fillStyle = '#ffb638'; ctx.fillRect(x - 68, bottom - Math.min(1, g.level) * (h - 16) - 8, 136, Math.min(1, g.level) * (h - 16));
  if (!drawAsset(ctx, art?.[`cup${g.variant}`], x - 82, top - 5, 164, h + 10)) {
    ctx.strokeStyle = '#65452e'; ctx.lineWidth = 7; ctx.beginPath(); ctx.roundRect(x - 76, top, 152, h, 15); ctx.stroke();
  }
  const y = v => bottom - 8 - v * (h - 16);
  ctx.fillStyle = '#65bd7770'; ctx.fillRect(x - 70, y(high), 140, y(low) - y(high));
  for (const [v, color] of [[low, '#27834d'], [high, '#c9574b']]) {
    ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x - 90, y(v)); ctx.lineTo(x + 90, y(v)); ctx.stroke();
  }
  if (g.pouring) { ctx.strokeStyle = '#ffb638'; ctx.lineWidth = 12; ctx.beginPath(); ctx.moveTo(x + 10, top - 77); ctx.lineTo(x, y(g.level)); ctx.stroke(); }
  if (g.result === 'spill') { ctx.fillStyle = '#ffb638'; ctx.beginPath(); ctx.ellipse(x + 85, 518, 35, 12, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.roundRect(170, 603, 660, 66, 24); ctx.fill();
  ctx.fillStyle = '#65452e'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.result === 'good' ? '딱 맞았어!' : g.result ? '앗! 다시 따라 보자!' : g.pouring ? '초록 띠에서 손을 떼!' : '아무 데나 꾹 눌러 따라 봐!', 500, 647);
}
