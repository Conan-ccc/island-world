import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
import { BOUNDS, RADIUS } from './game.js';

function fence(ctx, art, x, y, length, vertical = false) {
  ctx.save(); ctx.translate(x, y); if (vertical) ctx.rotate(Math.PI / 2);
  const count = Math.ceil(length / 100), width = length / count;
  for (let i = 0; i < count; i++) {
    if (drawAsset(ctx, art?.fence, i * width, -24, width, 48)) continue;
    ctx.fillStyle = '#f3bb68'; ctx.strokeStyle = '#74503a'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(i * width, -13, width, 26, 5); ctx.fill(); ctx.stroke();
    ctx.fillRect(i * width, -24, 10, 48);
  }
  ctx.restore();
}
export function draw(ctx, g, { heroId = 'pal', pose = 'idle', time = 0 } = {}) {
  const art = ART.games.herd, { left, right, top, bottom } = BOUNDS;
  ctx.fillStyle = '#d4e6b3'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  ctx.fillStyle = '#8ac7d8'; ctx.beginPath(); ctx.roundRect(left - 20, bottom, right - left + 40, 40, 20); ctx.fill();
  ctx.fillStyle = '#ffffff55';
  for (let x = 120; x < 900; x += 100) ctx.fillRect(x, bottom + 18, 40, 4);
  const gateLeft = 500 - g.row.gate / 2, gateRight = 500 + g.row.gate / 2;
  ctx.fillStyle = '#f7f3bf'; ctx.beginPath(); ctx.roundRect(gateLeft, top - 55, g.row.gate, 90, 24); ctx.fill();
  fence(ctx, art, left, top, gateLeft - left);
  fence(ctx, art, gateRight, top, right - gateRight);
  fence(ctx, art, left, top, bottom - top, true);
  fence(ctx, art, right, top, bottom - top, true);
  if (!g.row.open) fence(ctx, art, left, bottom, right - left);
  const archWidth = g.row.gate / .56;
  if (!drawAsset(ctx, art?.gate, 500 - archWidth / 2, top - 105, archWidth, 110)) {
    ctx.strokeStyle = '#91633c'; ctx.lineWidth = 16; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(gateLeft - 8, top); ctx.lineTo(gateLeft - 8, top - 65);
    ctx.lineTo(gateRight + 8, top - 65); ctx.lineTo(gateRight + 8, top); ctx.stroke();
  }
  ctx.fillStyle = '#779c50'; ctx.beginPath(); ctx.moveTo(500, 92); ctx.lineTo(482, 112); ctx.lineTo(518, 112); ctx.closePath(); ctx.fill();
  for (const s of g.sheep) {
    if (drawAsset(ctx, s.scared ? art?.startled : art?.sheep, s.x - RADIUS, s.y - RADIUS, RADIUS * 2, RADIUS * 2)) continue;
    ctx.fillStyle = '#fff9e9'; ctx.strokeStyle = '#694932'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(s.x, s.y, RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#edc99d'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 3, 18, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#694932';
    for (const dx of [-7, 7]) { ctx.beginPath(); ctx.arc(s.x + dx, s.y, 3, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.arc(s.x, s.y + 10, s.scared ? 4 : 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.save(); ctx.setLineDash([8, 12]); ctx.strokeStyle = '#5b855b66'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(g.x, g.y, g.row.flee * g.mods.reach, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  drawHero(ctx, heroId, pose, g.x, g.y, 88, time);
  ctx.fillStyle = '#fffdf2'; ctx.beginPath(); ctx.roundRect(150, 620, 700, 60, 22); ctx.fill();
  ctx.fillStyle = '#584b3d'; ctx.font = 'bold 27px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.message > 0 ? '멀리 갔어! 다시 데려오자!' : '양 뒤에서 살살! 문으로 보내 줘!', 500, 660);
}
