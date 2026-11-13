import { ART, drawBackground, drawStrip, drawHero } from '../../art.js';
const colors = ['#9edcff', '#ffe08a', '#ff9ebb', '#a6e8b8', '#c9b6ff', '#ffc09e'];
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#fff3d6'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.stack?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#fffaf0';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(i * 300, 160 + i % 2 * 90, 110, 35, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#bfe8a8'; ctx.fillRect(0, 604 + g.cam, 1000, 96);
  }
  function block(b, y, i) {
    if (drawStrip(ctx, ART.games.stack?.[`block${i % 4}`], b.x - b.w / 2, y, b.w, 42)) return;
    ctx.fillStyle = colors[i % colors.length]; ctx.strokeStyle = '#7a6c86'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(b.x - b.w / 2, y, b.w, 42, Math.min(10, b.w / 3)); ctx.fill(); ctx.stroke();
  }
  g.tower.forEach((b, i) => block(b, 560 - i * 46 + g.cam, i));
  const y = 560 - g.tower.length * 46 + g.cam, c = g.cur;
  if (!g.rest) {
    ctx.strokeStyle = '#b4a4af'; ctx.lineWidth = 3; ctx.setLineDash([6, 8]);
    ctx.beginPath(); ctx.moveTo(c.x, y - 28); ctx.lineTo(c.x, y + 42); ctx.stroke(); ctx.setLineDash([]);
    block(c, y - 70, g.tower.length);
  }
  const top = g.tower.at(-1);
  drawHero(ctx, heroId, pose, g.rest ? top.x : c.x, g.rest ? y + 10 : y - 110, 62, time);
}
