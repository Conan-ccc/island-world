import { ART, drawBackground, drawAsset, drawStrip } from '../../art.js';
import { bestSide } from './game.js';
const colors = ['#ffda68', '#ffc2a1', '#afe0b1', '#d6b7ec'];
function animal(ctx, art, weight, x, bottom, wave = false) {
  const size = 90 + (weight - 1) * 80 / 3;
  if (!drawAsset(ctx, art?.[`animal${weight}`], x - size / 2, bottom - size, size, size)) {
    ctx.fillStyle = colors[weight - 1]; ctx.strokeStyle = '#54352b'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(x - size / 2, bottom - size, size, size, size * .4); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#54352b';
    for (const dx of [-12, 12]) { ctx.beginPath(); ctx.arc(x + dx, bottom - size * .65, 3, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = '#54352b';
  for (let i = 0; i < weight; i++) {
    ctx.beginPath(); ctx.arc(x + (i - (weight - 1) / 2) * 18, bottom - size * .24, 7, 0, Math.PI * 2); ctx.fill();
  }
  if (wave) { ctx.strokeStyle = '#54352b'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + size * .6, bottom - size * .7, 9, -.9, .9); ctx.stroke(); }
}
export function draw(ctx, g, { time = 0 } = {}) {
  const art = ART.games.seesaw;
  ctx.fillStyle = '#e6f4df'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  const pivot = 500 + g.row.offset * 200, green = Math.min(g.row.limit, g.row.green * g.mods.reach);
  ctx.fillStyle = '#fff9ed'; ctx.beginPath(); ctx.roundRect(330, 28, 340, 62, 22); ctx.fill();
  ctx.fillStyle = '#a6dba0'; ctx.fillRect(500 - green * 20, 46, green * 40, 25);
  ctx.fillStyle = '#54352b'; ctx.beginPath(); ctx.arc(500 + Math.max(-7, Math.min(7, g.load)) * 20, 59, 10, 0, Math.PI * 2); ctx.fill();
  for (const side of [-1, 1]) {
    const lit = g.mods.hint && bestSide(g) === side && !g.rest;
    ctx.fillStyle = lit ? `rgba(125,215,100,${.28 + Math.sin(time * 5) * .08})` : 'rgba(255,255,255,.38)';
    ctx.beginPath(); ctx.roundRect(side < 0 ? 50 : 520, 210, 430, 365, 36); ctx.fill();
    ctx.fillStyle = '#655445'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(side < 0 ? '←' : '→', side < 0 ? 250 : 750, 550);
  }
  if (!drawAsset(ctx, art?.support, pivot - 55, 460, 110, 100)) {
    ctx.fillStyle = '#62c6c2'; ctx.strokeStyle = '#54352b'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(pivot, 455); ctx.lineTo(pivot + 60, 560); ctx.lineTo(pivot - 60, 560); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.save(); ctx.translate(pivot, 460); ctx.rotate(g.displayAngle);
  if (!drawStrip(ctx, art?.plank, 140 - pivot, -8, 720, 30)) {
    ctx.fillStyle = '#f78c92'; ctx.strokeStyle = '#54352b'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(140 - pivot, -8, 720, 30, 15); ctx.fill(); ctx.stroke();
  }
  const counts = { '-1': 0, '1': 0 };
  for (const seat of g.seats) {
    const count = counts[seat.side]++, x = (seat.side < 0 ? 200 + count % 3 * 105 : 800 - count % 3 * 105) - pivot;
    const slide = g.leaving ? (1 - g.rest) * seat.side * 55 : 0;
    ctx.globalAlpha = g.leaving ? Math.max(0, g.rest) : 1;
    animal(ctx, art, seat.weight, x + slide, -8 - Math.floor(count / 3) * 132, g.leaving);
  }
  ctx.restore();
  if (!g.rest) {
    const p = Math.min(1, g.age / g.row.fall), x = 500 + g.side * 200 * p;
    animal(ctx, art, g.current, x, 280 + p * 110);
    ctx.setLineDash([8, 10]); ctx.strokeStyle = '#8f9d88'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, 290 + p * 110); ctx.lineTo(500 + g.side * 200, 425); ctx.stroke(); ctx.setLineDash([]);
  }
  if (g.row.preview) {
    ctx.fillStyle = '#fff9ed'; ctx.beginPath(); ctx.roundRect(780, 20, 190, 208, 25); ctx.fill();
    animal(ctx, art, g.next, 875, 198); ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#655445'; ctx.fillText('다음 친구', 875, 222);
  }
  ctx.fillStyle = '#fff9ed'; ctx.beginPath(); ctx.roundRect(200, 610, 600, 62, 24); ctx.fill();
  ctx.fillStyle = '#655445'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.leaving ? '손 흔들고 다시 만나!' : '가벼운 쪽을 톡! 초록 안으로 맞춰 줘!', 500, 650);
}
