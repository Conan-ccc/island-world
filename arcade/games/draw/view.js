import { RADIUS, FLOOR } from './game.js';
import { ART, drawAsset, drawBackground, drawStrip } from '../../art.js';
export function draw(ctx, g) {
  const art = ART.games.draw;
  ctx.fillStyle = '#faf5e8'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#d8d1c2'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(35, FLOOR + 62); ctx.lineTo(965, FLOOR + 62); ctx.stroke();
  if (!drawAsset(ctx, art?.machine, 451, 20, 98, 145)) {
    ctx.fillStyle = '#a5dbcb'; ctx.strokeStyle = '#684639'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(440, 25, 120, 110, 25); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#eb8faa'; ctx.fillRect(480, 130, 40, 32);
  }
  if (g.mods.hint || !g.launched && !g.row.move) {
    ctx.save(); ctx.setLineDash([10, 14]); ctx.lineWidth = 5; ctx.strokeStyle = '#b0a2d2';
    ctx.beginPath(); ctx.moveTo(500, 235); ctx.lineTo(g.basket, 525); ctx.stroke(); ctx.restore();
  }
  const colors = ['#e97794', '#edbd59', '#6ac9b5', '#8e9bdb'];
  if (g.path.length > 1) {
    const line = offset => {
      ctx.beginPath(); ctx.moveTo(g.path[0].x, g.path[0].y + offset);
      for (const p of g.path.slice(1)) ctx.lineTo(p.x, p.y + offset);
      ctx.stroke();
    };
    ctx.strokeStyle = '#70493d'; ctx.lineWidth = 40;
    line(14);
    for (let stripe = 0; stripe < colors.length; stripe++) {
      const offset = 1 + stripe * 9;
      ctx.strokeStyle = colors[stripe]; ctx.lineWidth = 9;
      line(offset);
    }
  }
  for (const c of g.clouds) {
    if (!drawStrip(ctx, art?.cloud, c.x - c.w / 2, c.y, c.w, c.h)) {
      ctx.fillStyle = '#d6c8e8'; ctx.strokeStyle = '#70493d'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.roundRect(c.x - c.w / 2, c.y, c.w, c.h, 16); ctx.fill(); ctx.stroke();
    }
  }
  const width = g.row.width * g.mods.reach;
  if (!drawStrip(ctx, art?.basket, g.basket - width / 2, FLOOR, width, 65)) {
    ctx.fillStyle = '#f5cc7d'; ctx.strokeStyle = '#70493d'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(g.basket - width / 2, FLOOR, width, 65, 15); ctx.fill(); ctx.stroke();
  }
  if (g.ball) {
    const b = g.ball;
    ctx.save(); ctx.globalAlpha = b.released ? .35 : 1;
    if (!drawAsset(ctx, art?.ball, b.x - RADIUS, b.y - RADIUS, RADIUS * 2, RADIUS * 2)) {
      ctx.fillStyle = '#ec7794'; ctx.strokeStyle = '#70493d'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.fillStyle = '#e4dded'; ctx.beginPath(); ctx.roundRect(40, 40, 190, 20, 10); ctx.fill();
  ctx.fillStyle = '#ac8ecb'; ctx.beginPath(); ctx.roundRect(40, 40, 190 * g.ink / g.row.ink, 20, 10); ctx.fill();
  if (g.wind) {
    ctx.strokeStyle = '#94b6bf'; ctx.lineWidth = 4;
    const dir = Math.sign(g.wind), x = dir > 0 ? 75 : 925;
    for (let i = 0; i < 3; i++) {
      const y = 450 + i * 18;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dir * 45, y);
      ctx.lineTo(x + dir * 35, y - 5); ctx.stroke();
    }
  }
}
