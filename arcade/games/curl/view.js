import { ART, drawBackground, drawStrip, drawAsset, drawHero } from '../../art.js';
import { START, stopAt } from './game.js';
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#e4f5ff'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.curl?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.ellipse(i * 300, 290, 190, 90, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#c5e5f3'; ctx.fillRect(0, 490, 1000, 12);
    ctx.fillStyle = '#f4fcff'; ctx.fillRect(0, 330, 1000, 160);
  }
  const radius = g.row.radius * g.mods.reach;
  const predicted = stopAt(g.pull), ready = (g.row.guide || g.mods.hint) && g.drag && Math.abs(predicted - g.tx) <= radius;
  if (!drawStrip(ctx, ART.games.curl?.target, g.tx - radius, 384, radius * 2, 72)) {
    ctx.fillStyle = ready ? '#9ce8bf' : '#fbd4e2'; ctx.strokeStyle = ready ? '#228763' : '#b84478'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(g.tx, 420, radius, 36, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(g.tx, 420, 6, 0, Math.PI * 2); ctx.fill();
  }
  if (ready) {
    ctx.strokeStyle = '#228763'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.ellipse(g.tx, 420, radius, 36, 0, 0, Math.PI * 2); ctx.stroke();
  }
  if (g.drag) {
    ctx.strokeStyle = '#655b80'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(START, 470); ctx.lineTo(START - g.pull * .32, 470); ctx.stroke();
    if (g.row.guide || g.mods.hint) {
      ctx.fillStyle = ready ? '#228763' : '#87909c';
      ctx.beginPath(); ctx.arc(predicted, 420, 20, 0, Math.PI * 2); ctx.fill();
    }
  }
  const x = g.x - (g.drag ? g.pull * .32 : 0);
  if (!drawAsset(ctx, ART.games.curl?.sled, x - 43, 425, 86, 26)) {
    ctx.fillStyle = '#eeb64e'; ctx.strokeStyle = '#976524'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(x - 43, 425, 86, 26, 12); ctx.fill(); ctx.stroke();
  }
  drawHero(ctx, heroId, g.hold ? (g.hit ? 'happy' : 'sad') : g.v ? 'jump' : pose, x, 388, 90, time);
  ctx.fillStyle = '#526780'; ctx.textAlign = 'center'; ctx.font = 'bold 30px sans-serif';
  ctx.fillText(g.hold ? (g.hit ? '동그라미 안에 쏙!' : '힘을 조금 바꿔 봐!')
    : g.v ? '미끄러져 가!' : g.drag ? (ready && (g.row.guide || g.mods.hint) ? '지금 놓아!' : '왼쪽으로 당겼다 놓아!')
    : '어디서든 누르고 왼쪽으로 당겨!', 500, 610);
  if (!g.v && !g.hold && !g.drag) {
    ctx.strokeStyle = '#655b80'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(650, 535); ctx.lineTo(400, 535); ctx.lineTo(425, 520);
    ctx.moveTo(400, 535); ctx.lineTo(425, 550); ctx.stroke();
  }
}
