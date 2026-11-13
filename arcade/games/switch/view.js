import { ART, drawBackground, drawAsset } from '../../art.js';
import { junctions, basket, destination, position, nextTurn, COLORS, MARKS, BUTTON_RADIUS } from './game.js';
export function draw(ctx, g) {
  const art = ART.games.switch ?? {}, nodes = junctions(g);
  ctx.fillStyle = '#eff4e6'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art.background, 0, 0, 1000, 700);
  function rail(a, b) {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(Math.atan2(b.y - a.y, b.x - a.x) - Math.PI / 2);
    const drawn = drawAsset(ctx, art.rail, -18, 0, 36, Math.hypot(b.x - a.x, b.y - a.y)); ctx.restore();
    if (drawn) return;
    ctx.lineCap = 'round';
    for (const [width, color] of [[36, '#987c59'], [26, '#f8db9c'], [5, '#fff3d0']]) {
      ctx.lineWidth = width; ctx.strokeStyle = color; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
  }
  rail({ x: 500, y: 70 }, nodes[0]);
  for (const node of nodes) for (const target of node.to) rail(node, destination(g, target));
  const hint = g.mods.hint ? nextTurn(g) : -1;
  nodes.forEach((node, i) => {
    if (i === hint) { ctx.fillStyle = '#ffe68b'; ctx.beginPath(); ctx.arc(node.x, node.y, 57, 0, Math.PI * 2); ctx.fill(); }
    if (!drawAsset(ctx, art.junction, node.x - BUTTON_RADIUS, node.y - BUTTON_RADIUS, BUTTON_RADIUS * 2, BUTTON_RADIUS * 2)) {
      ctx.fillStyle = '#fff2ce'; ctx.strokeStyle = '#65472f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(node.x, node.y, BUTTON_RADIUS, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    const target = destination(g, node.to[g.directions[i]]), angle = Math.atan2(target.y - node.y, target.x - node.x);
    ctx.save(); ctx.translate(node.x, node.y); ctx.rotate(angle); ctx.strokeStyle = '#65472f'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(22, 0); ctx.moveTo(9, -13); ctx.lineTo(22, 0); ctx.lineTo(9, 13); ctx.stroke(); ctx.restore();
  });
  for (let i = 0; i < g.colors; i++) {
    const p = basket(g, i);
    if (!drawAsset(ctx, art['basket' + i], p.x - 64, p.y - 22, 128, 98)) {
      ctx.fillStyle = COLORS[i]; ctx.strokeStyle = '#65472f'; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(p.x - 64, p.y - 22, 128, 98, 22); ctx.fill(); ctx.stroke();
    }
    ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#573c2b'; ctx.fillText(MARKS[i], p.x, p.y + 61);
  }
  const p = g.rest ? g.feedback : position(g), color = g.ball.color;
  if (p && (!g.rest || !p.good)) {
    const bounce = g.rest ? Math.sin((1 - g.rest / g.row.pause) * Math.PI) * 65 : 0;
    ctx.save(); if (g.rest) ctx.globalAlpha = g.rest / g.row.pause;
    if (!drawAsset(ctx, art['ball' + color], p.x - 26, p.y - 26 - bounce, 52, 52)) {
      ctx.fillStyle = COLORS[color]; ctx.strokeStyle = '#65472f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y - bounce, 26, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#573c2b'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(MARKS[color], p.x, p.y + 8 - bounce); ctx.restore();
  }
  ctx.fillStyle = '#fff9ec'; ctx.beginPath(); ctx.roundRect(220, 652, 560, 38, 18); ctx.fill();
  ctx.fillStyle = '#65472f'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.rest ? g.feedback.good ? '쏙! 같은 색이야!' : '앗! 다음 구슬을 보내 보자!' : '화살표를 톡! 같은 색 바구니로!', 500, 678);
}
