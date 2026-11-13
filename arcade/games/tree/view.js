import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#e3f5f4'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.tree?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#c9e9b6'; ctx.beginPath(); ctx.ellipse(500, 690, 650, 120, 0, 0, Math.PI * 2); ctx.fill();
  }
  const shift = g.cool / g.row.pace * 80;
  // Continue the lowest tile to the ground during the climbing animation.
  ctx.save(); ctx.beginPath(); ctx.rect(440, 0, 120, 550); ctx.clip();
  if (!drawAsset(ctx, ART.games.tree?.trunk, 440, 535 - shift, 120, 80, 2)) {
    ctx.fillStyle = '#c99259'; ctx.fillRect(440, 0, 120, 550);
  }
  ctx.restore();
  g.segs.forEach((s, i) => {
    const y = 500 - i * 80 - shift;
    if (!drawAsset(ctx, ART.games.tree?.trunk, 440, y - 45, 120, 80, 2)) {
      ctx.strokeStyle = '#9d7048'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(440, y + 35); ctx.lineTo(560, y + 35); ctx.stroke();
    }
    if (!s.b) return;
    const x = s.b < 0 ? 290 : 560;
    if (!drawAsset(ctx, ART.games.tree?.branch, x, y - 18, 150, 40)) {
      ctx.fillStyle = '#43875a'; ctx.strokeStyle = '#315f42'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(x, y - 18, 150, 40, 18); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#93cf68'; ctx.beginPath(); ctx.ellipse(x + 75, y - 15, 28, 13, -.3, 0, Math.PI * 2); ctx.fill();
    }
  });
  const branch = g.segs[1].b;
  for (const side of [-1, 1]) {
    const x = side < 0 ? 120 : 650;
    const hint = g.mods.hint && (!branch || branch !== side);
    ctx.fillStyle = hint ? '#b7e992' : '#fff9e7'; ctx.strokeStyle = hint ? '#43875a' : '#ae9779'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(x, 565, 230, 105, 25); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#4e6454'; ctx.font = 'bold 38px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(hint ? '↑ 여기!' : '↑', x + 115, 632);
  }
  drawHero(ctx, heroId, g.flash ? (g.hit ? 'jump' : 'sad') : pose, 500 + g.side * 150, 500 - Math.sin(g.cool / g.row.pace * Math.PI) * 20, 100, time);
  ctx.fillStyle = '#fff9e7'; ctx.beginPath(); ctx.roundRect(275, 55, 450, 44, 16); ctx.fill();
  ctx.fillStyle = '#3c624e'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.flash && !g.hit ? '가지 없는 쪽을 골라 봐!' : '바로 위 가지를 보고 톡!', 500, 85);
}
