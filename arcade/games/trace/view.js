import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
import { START, END, pathY, GRAB } from './game.js';
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#e4f6db'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.trace?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#cde7c3';
    for (const [x, y] of [[120, 100], [820, 100], [300, 610], [780, 620]]) {
      ctx.beginPath(); ctx.ellipse(x, y, 100, 45, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  function path(width, color, end = END) {
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(START, pathY(g, START));
    for (let x = START + 8; x < end; x += 8) ctx.lineTo(x, pathY(g, x));
    ctx.lineTo(end, pathY(g, end)); ctx.stroke();
  }
  path(g.row.width * g.mods.reach + 12, '#d9bd78'); path(g.row.width * g.mods.reach, '#ffe9a8');
  path(8, '#eda479', Math.max(START, g.x));
  for (const x of [295, 500, 705]) {
    ctx.fillStyle = x <= g.cp ? '#73bb96' : '#fff'; ctx.beginPath();
    ctx.arc(x, pathY(g, x), 10, 0, Math.PI * 2); ctx.fill();
  }
  const endY = pathY(g, END);
  if (!drawAsset(ctx, ART.games.trace?.finish, END - 38, endY - 38, 76, 76)) {
    ctx.fillStyle = '#ed8fa8'; ctx.beginPath(); ctx.arc(END, endY, 38, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#fff'; ctx.font = 'bold 27px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('끝', END, endY + 9);
  if (!g.hold) {
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(g.x, g.y, GRAB, 0, Math.PI * 2); ctx.stroke();
  }
  drawHero(ctx, heroId, g.hold ? 'jump' : pose, g.x, g.y, 100, time);
  ctx.fillStyle = '#52634d'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.hold ? '노란 길을 따라 천천히!' : '친구를 잡고 끝까지 끌어!', 500, 660);
}
