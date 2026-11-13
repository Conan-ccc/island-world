import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
import { ORIGIN, trajectory, previewTime, HERO_RADIUS } from './game.js';
export function draw(ctx, g, { heroId, time }) {
  const art = ART.games.sling;
  ctx.fillStyle = '#d9f2ff'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  for (let x = 0; x < 1000; x += 150) {
    if (!drawAsset(ctx, art?.cloud, x - 25, 570, 210, 85)) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x + 80, 605, 110, 40, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (const b of g.balloons) if (!b.hit) {
    const r = Math.max(30, g.row.radius * g.mods.reach);
    ctx.strokeStyle = '#9b859b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x, b.y + r); ctx.quadraticCurveTo(b.x - 10, b.y + r + 20, b.x, b.y + r + 36); ctx.stroke();
    if (!drawAsset(ctx, art?.[`balloon${b.color}`], b.x - r, b.y - r, r * 2, r * 2.22)) {
      ctx.fillStyle = ['#ff7893', '#ffd04f', '#bb8ded'][b.color]; ctx.strokeStyle = '#653d32'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  }
  if (!drawAsset(ctx, art?.sling, 123, 460, 114, 160)) {
    ctx.strokeStyle = '#8f593a'; ctx.lineWidth = 18; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(180, 610); ctx.lineTo(180, 530); ctx.lineTo(135, 480); ctx.moveTo(180, 530); ctx.lineTo(225, 480); ctx.stroke();
  }
  if (!g.flight && !g.rest) {
    ctx.strokeStyle = '#a45069'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(137, 480); ctx.lineTo(g.pull.x, g.pull.y); ctx.lineTo(223, 480); ctx.stroke();
    if (g.dragging) {
      ctx.fillStyle = '#65788f';
      for (let t = .08; t <= previewTime(g); t += .08) {
        const p = trajectory(g.pull, g.wind, t);
        if (p.y > 555 || p.x < 25 || p.x > 975) break;
        ctx.beginPath(); ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2); ctx.fill();
      }
    } else {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(ORIGIN.x, ORIGIN.y, 48, 0, Math.PI * 2); ctx.stroke();
    }
  }
  const p = g.flight ?? (g.rest ? g.landing : g.pull);
  drawHero(ctx, heroId, g.flight ? 'jump' : g.rest ? 'happy' : 'idle', p.x, p.y, HERO_RADIUS * 2, time);
  for (const s of g.stars) {
    ctx.save(); ctx.globalAlpha = Math.min(1, s.life * 2); ctx.fillStyle = '#ffcf4b'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center'; ctx.strokeText('★', s.x, s.y - (1 - s.life) * 60); ctx.fillText('★', s.x, s.y - (1 - s.life) * 60); ctx.restore();
  }
  if (g.row.moving) {
    ctx.strokeStyle = '#678da0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(790, 95); ctx.lineTo(870, 95); ctx.lineTo(855, 84); ctx.moveTo(870, 95); ctx.lineTo(855, 106); ctx.stroke();
  }
  ctx.fillStyle = '#fff9ee'; ctx.beginPath(); ctx.roundRect(220, 625, 560, 60, 22); ctx.fill();
  ctx.fillStyle = '#425f79'; ctx.textAlign = 'center'; ctx.font = 'bold 25px sans-serif';
  ctx.fillText(g.flight ? '풍선까지 슝!' : g.rest ? '구름에 폭신!' : '친구를 뒤로 당겼다 놓아 봐!', 500, 665);
}
