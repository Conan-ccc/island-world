import { ART, drawBackground, drawAsset, drawHero, drawToken } from '../../art.js';
import { grid, point } from './game.js';
export function draw(ctx, g, { heroId = 'pal', time = 0, pose = 'idle' } = {}) {
  const { cols: COLS, rows: ROWS, cell: CELL, left: LEFT, top: TOP } = grid(g);
  const tokenSize = CELL === 90 ? 90 : 72;
  ctx.fillStyle = '#e4efdd'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, ART.games.train?.background, 0, 0, 1000, 700);
  ctx.fillStyle = '#fff9e9e8'; ctx.strokeStyle = '#b3bda5'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(LEFT - 5, TOP - 5, COLS * CELL + 10, ROWS * CELL + 10, 15); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#d5d7bc'; ctx.lineWidth = 2;
  for (let c = 1; c < COLS; c++) { ctx.beginPath(); ctx.moveTo(LEFT + c * CELL, TOP); ctx.lineTo(LEFT + c * CELL, TOP + ROWS * CELL); ctx.stroke(); }
  for (let r = 1; r < ROWS; r++) { ctx.beginPath(); ctx.moveTo(LEFT, TOP + r * CELL); ctx.lineTo(LEFT + COLS * CELL, TOP + r * CELL); ctx.stroke(); }
  for (const rider of g.passengers) {
    const p = point(rider, g);
    drawAsset(ctx, ART.games.train?.passenger, p.x - tokenSize / 2, p.y - tokenSize / 2, tokenSize, tokenSize);
    drawToken(ctx, rider.token, p.x, p.y, tokenSize, { hint: !!g.mods.hint && rider.good });
  }
  for (let i = g.body.length - 1; i >= 0; i--) {
    const p = point(g.body[i], g);
    ctx.save(); ctx.translate(p.x, p.y);
    const d = i ? { c: g.body[i - 1].c - g.body[i].c, r: g.body[i - 1].r - g.body[i].r } : g.dir;
    ctx.rotate(Math.atan2(d.r, d.c));
    if (!drawAsset(ctx, ART.games.train?.[i ? 'carriage' : 'engine'], -32, -32, 64, 64)) {
      ctx.fillStyle = i ? '#f5bd63' : '#6dc5b5'; ctx.strokeStyle = '#67442e'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(-29, -27, 58, 54, 12); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#67442e'; ctx.fillRect(21, -10, 10, 20);
    }
    ctx.restore();
    if (!i) drawHero(ctx, heroId, g.oops ? 'sad' : pose, p.x - g.dir.c * 10, p.y - g.dir.r * 10, 48, time);
  }
  ctx.fillStyle = '#fffdf3'; ctx.beginPath(); ctx.roundRect(130, 620, 740, 54, 20); ctx.fill();
  ctx.fillStyle = '#604835'; ctx.font = 'bold 25px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.oops ? '앗! 가운데에서 다시 출발!' : g.waiting ? '가고 싶은 쪽을 톡 눌러 줘!' : '가고 싶은 쪽을 톡! 같은 글자 친구를 태워!', 500, 655);
}
