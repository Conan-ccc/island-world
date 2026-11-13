import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
import { HIT, decay } from './game.js';
export function draw(ctx, g, { heroId = 'pal', time = 0, pose = 'idle' } = {}) {
  const art = ART.games.garden;
  ctx.fillStyle = '#e1edd2'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  const urgent = g.pots.filter(p => !p.sleep && p.water < g.row.rescue).sort((a, b) => a.water / decay(g, a) - b.water / decay(g, b))[0];
  for (const [i, p] of g.pots.entries()) {
    const thirsty = p.water < g.row.rescue;
    ctx.fillStyle = '#fffdf3dc'; ctx.strokeStyle = i === g.target ? '#439eb7' : '#b4c99a'; ctx.lineWidth = i === g.target ? 5 : 2;
    ctx.beginPath(); ctx.roundRect(p.x - HIT.width / 2, p.y - HIT.height / 2, HIT.width, HIT.height, 28); ctx.fill(); ctx.stroke();
    if (g.mods.hint && p === urgent) {
      ctx.strokeStyle = '#efbd47'; ctx.lineWidth = 5 + Math.sin(time * 5) * 2;
      ctx.beginPath(); ctx.roundRect(p.x - 70, p.y - 85, 140, 170, 30); ctx.stroke();
    }
    const flower = p.sleep ? 'sleep' : thirsty ? 'wilt' : 'bloom';
    if (!drawAsset(ctx, art?.[flower], p.x - 47, p.y - 65, 94, 105)) {
      ctx.strokeStyle = '#528646'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(p.x, p.y + 30); ctx.lineTo(p.x + (thirsty ? 18 : 0), p.y - 25); ctx.stroke();
      ctx.fillStyle = p.sleep ? '#c4bac6' : thirsty ? '#ecc1ce' : '#f578a7';
      ctx.beginPath(); ctx.arc(p.x + (thirsty ? 18 : 0), p.y - (thirsty ? 15 : 35), 26, 0, Math.PI * 2); ctx.fill();
    }
    if (!drawAsset(ctx, art?.pot, p.x - 42, p.y + 25, 84, 50)) {
      ctx.fillStyle = '#d38c59'; ctx.beginPath(); ctx.roundRect(p.x - 38, p.y + 25, 76, 50, 12); ctx.fill();
    }
    ctx.fillStyle = '#fafaf2'; ctx.beginPath(); ctx.roundRect(p.x - 55, p.y - 78, 110, 16, 8); ctx.fill();
    ctx.fillStyle = thirsty ? '#e9ae45' : '#56b7cd'; ctx.beginPath(); ctx.roundRect(p.x - 55, p.y - 78, 110 * p.water, 16, 8); ctx.fill();
    ctx.strokeStyle = '#6c6951'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x - 55 + 110 * g.row.rescue, p.y - 80); ctx.lineTo(p.x - 55 + 110 * g.row.rescue, p.y - 60); ctx.stroke();
    if (p.splash) {
      ctx.fillStyle = '#3eaed0';
      for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.ellipse(p.x - 22 + j * 22, p.y - 45 + (1 - p.splash / .45) * 35, 5, 10, -.3, 0, Math.PI * 2); ctx.fill(); }
    }
  }
  drawHero(ctx, heroId, pose, g.x - 30, g.y, 75, time);
  if (!drawAsset(ctx, art?.can, g.x + 5, g.y - 28, 65, 55)) {
    ctx.fillStyle = '#49b7c1'; ctx.beginPath(); ctx.roundRect(g.x + 5, g.y - 20, 45, 35, 9); ctx.fill();
  }
  ctx.fillStyle = '#fffdf4ee'; ctx.beginPath(); ctx.roundRect(160, 625, 680, 56, 24); ctx.fill();
  ctx.fillStyle = '#675441'; ctx.font = 'bold 25px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('고개 숙인 꽃을 톡! 친구가 물을 줘요', 500, 662);
}
