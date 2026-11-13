import { ART, drawBackground, drawAsset } from '../../art.js';
import { layout, center, findMoves } from './game.js';
const COLORS = ['#fa7790', '#ffce47', '#39cdd4', '#78dea0', '#c18ae2'];
function fallback(ctx, color, x, y, size) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 100, size / 100);
  ctx.fillStyle = COLORS[color]; ctx.strokeStyle = '#59321f'; ctx.lineWidth = 5; ctx.lineJoin = 'round'; ctx.beginPath();
  if (color === 0) { ctx.moveTo(0,36); ctx.bezierCurveTo(-68,-5,-35,-54,0,-22); ctx.bezierCurveTo(35,-54,68,-5,0,36); }
  else if (color === 1 || color === 4) {
    for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - Math.PI / 2, r = i % 2 ? (color === 4 ? 30 : 20) : 42; const px = Math.cos(a) * r, py = Math.sin(a) * r; if (i) ctx.lineTo(px,py); else ctx.moveTo(px,py); } ctx.closePath();
  } else if (color === 2) { ctx.moveTo(0,-42); ctx.bezierCurveTo(65,20,25,50,0,40); ctx.bezierCurveTo(-45,40,-48,10,0,-42); }
  else ctx.roundRect(-37,-37,74,74,18);
  ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-15,-15,9,5,-.7,0,Math.PI*2); ctx.fill(); ctx.restore();
}
export function draw(ctx, g) {
  const art = ART.games.jelly ?? {}, b = layout(g), n = g.row.size;
  ctx.fillStyle = '#faefd9'; ctx.fillRect(0,0,1000,700); drawBackground(ctx,art.background,0,0,1000,700);
  ctx.fillStyle = '#d8bfa7'; ctx.beginPath(); ctx.roundRect(b.x-14,b.y-14,518,518,26); ctx.fill();
  const hint = g.mods.hint && g.phase === 'idle' ? findMoves(g).reduce((best, move) => !best || move.count + move.cleared / 100 > best.count + best.cleared / 100 ? move : best, null) : null;
  for (let i = 0; i < n*n; i++) {
    const c = center(g,i), half = b.size/2;
    ctx.fillStyle = (i % n + Math.floor(i/n)) % 2 ? '#fff9ec' : '#f5e9d7'; ctx.beginPath(); ctx.roundRect(c.x-half+2,c.y-half+2,b.size-4,b.size-4,12); ctx.fill();
    if (hint && (hint.a === i || hint.b === i)) { ctx.strokeStyle = '#efac31'; ctx.lineWidth = 4; ctx.stroke(); }
  }
  ctx.save(); ctx.beginPath(); ctx.rect(b.x,b.y,490,490); ctx.clip();
  for (let i = 0; i < n*n; i++) {
    const c = center(g,i); let x = c.x, y = c.y, size = b.size*.82;
    if (g.phase === 'swap' || g.phase === 'return') {
      const other = g.swapped[0] === i ? g.swapped[1] : g.swapped[1] === i ? g.swapped[0] : -1;
      if (other >= 0) { const from = center(g,other), t = g.rest/g.row.settle; x += (from.x-x)*t; y += (from.y-y)*t; }
    }
    if (g.phase === 'fall') y -= (g.falls.find(f => f.i === i)?.distance ?? 0)*b.size*g.rest/g.row.settle;
    if (g.popped.includes(i)) size *= Math.max(0,g.rest/g.row.settle);
    if (g.selected === i) { x += Math.max(-b.size*.4,Math.min(b.size*.4,g.dragX-c.x)); y += Math.max(-b.size*.4,Math.min(b.size*.4,g.dragY-c.y)); }
    if (hint && (hint.a === i || hint.b === i)) x += Math.sin(g.elapsed*8)*3;
    if (!drawAsset(ctx,art['jelly'+g.tiles[i]],x-size/2,y-size/2,size,size)) fallback(ctx,g.tiles[i],x,y,size);
    if (g.popped.includes(i)) { ctx.fillStyle = '#f3b237'; ctx.font = '24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✦',c.x,c.y-20); }
  }
  ctx.restore();
  ctx.fillStyle = '#fff9ec'; ctx.beginPath(); ctx.roundRect(220,590,560,75,24); ctx.fill();
  ctx.fillStyle = '#65472f'; ctx.font = 'bold 25px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.shuffled ? '새로 섞었어! 다시 이어 보자!' : g.phase === 'return' ? '앗! 다른 젤리를 이어 보자!' : '옆 칸으로 쏙! 같은 모양 셋!',500,625);
  if (g.row.limited) { ctx.fillStyle = '#e3d5c1'; ctx.fillRect(350,644,300,10); ctx.fillStyle = '#79cfa8'; ctx.fillRect(350,644,300*g.moves/g.row.moves,10); }
}
