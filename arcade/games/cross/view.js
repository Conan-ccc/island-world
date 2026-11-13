import { ART, drawAsset, drawBackground } from '../../art.js';
import { CAR_W, CAR_H, DUCK_W, DUCK_H, laneY, nearDuck } from './game.js';
export function draw(ctx, g, { time = 0 } = {}) {
  ctx.fillStyle = '#d9e9be'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, ART.games.cross?.background, 0, 0, 1000, 700);
  for (let i = 0; i < g.row.lanes; i++) {
    const y = laneY(i);
    ctx.fillStyle = '#aab8bb'; ctx.fillRect(0, y - 58, 1000, 116);
    ctx.fillStyle = '#f5f4df';
    for (let x = 25; x < 1000; x += 100) if (x < 410 || x > 560) ctx.fillRect(x, y - 2, 48, 4);
    for (let dy = -48; dy < 50; dy += 24) ctx.fillRect(448, y + dy, 104, 13);
  }
  for (const c of g.cars) {
    ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.dir, 1);
    if (g.mods.hint && nearDuck(g, c) && Math.sin(time * 9) > 0) {
      ctx.fillStyle = '#fff2a0'; ctx.beginPath(); ctx.ellipse(0, 0, 70, 50, 0, 0, Math.PI * 2); ctx.fill();
    }
    if (!drawAsset(ctx, ART.games.cross?.[c.id % 2 ? 'car-blue' : 'car-red'], -CAR_W / 2, -CAR_H / 2, CAR_W, CAR_H)) {
      ctx.fillStyle = c.id % 2 ? '#5ab6ed' : '#ff7b70'; ctx.strokeStyle = '#603f29'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.roundRect(-58, -40, 116, 80, 24); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d9f4ff'; ctx.fillRect(-24, -28, 52, 24);
    }
    ctx.restore();
    if (c.stopped > 0) {
      ctx.fillStyle = '#fff9e8'; ctx.beginPath(); ctx.arc(c.x, c.y - 54, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#527466'; ctx.fillRect(c.x - 8, c.y - 63, 5, 18); ctx.fillRect(c.x + 3, c.y - 63, 5, 18);
      ctx.fillStyle = '#6ca47c'; ctx.fillRect(c.x - 28, c.y + 47, 56 * Math.min(1, c.stopped / (g.row.stop * g.mods.time)), 5);
    }
  }
  if (!drawAsset(ctx, ART.games.cross?.duck, 500 - DUCK_W / 2, g.y - DUCK_H / 2, DUCK_W, DUCK_H)) {
    ctx.fillStyle = '#ffdc65'; ctx.strokeStyle = '#603f29'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(500, g.y, 24, 28, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#f28d3c'; ctx.fillRect(493, g.y - 8, 14, 9);
  }
  ctx.textAlign = 'center'; ctx.font = 'bold 26px sans-serif';
  if (g.returning) { ctx.fillStyle = '#654d43'; ctx.fillText('앗!', 500, g.y - 42); }
  if (!g.returning && g.rest > 0) {
    ctx.fillStyle = '#fff9ee'; ctx.beginPath(); ctx.roundRect(425, g.y - 88, 150, 42, 18); ctx.fill();
    ctx.fillStyle = '#654d43'; ctx.fillText('기다려!', 500, g.y - 58);
  }
  ctx.fillStyle = '#fff9ee'; ctx.beginPath(); ctx.roundRect(250, 642, 500, 48, 20); ctx.fill();
  ctx.fillStyle = '#594a40'; ctx.fillText('자동차를 톡 누르면 잠깐 멈춰!', 500, 675);
}
