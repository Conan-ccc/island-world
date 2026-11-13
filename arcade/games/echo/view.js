import { ART, drawBackground, drawAsset } from '../../art.js';
import { COLORS } from './game.js';
export function draw(ctx, g) {
  ctx.fillStyle = '#fff1f5'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, ART.games.echo?.background, 0, 0, 1000, 700);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#645371'; ctx.font = 'bold 36px sans-serif';
  ctx.fillText(g.phase === 'input' ? '이제 네 차례!' : g.repeated ? '한 번 더 잘 봐!' : '잘 봐!', 500, 75);
  for (const [i, p] of g.pads.entries()) {
    const lit = g.lit === i;
    const image = drawAsset(ctx, ART.games.echo?.[`pad${i + 1}`], p.x - p.w / 2, p.y - p.h / 2, p.w, p.h);
    if (!image) {
      ctx.fillStyle = '#d9cbd6'; ctx.beginPath(); ctx.roundRect(p.x - p.w / 2, p.y - p.h / 2 + 8, p.w, p.h, 36); ctx.fill();
      ctx.fillStyle = lit ? '#fff8cc' : COLORS[i];
      ctx.beginPath(); ctx.roundRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 36); ctx.fill();
    }
    if (lit) {
      ctx.fillStyle = '#fff8ccbb'; ctx.beginPath(); ctx.roundRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 36); ctx.fill();
    }
    ctx.fillStyle = '#645371'; ctx.font = 'bold 65px sans-serif';
    ctx.fillText(['●', '▲', '■', '♥', '◆', '★'][i], p.x, p.y);
    if (lit || !image) {
      ctx.strokeStyle = lit ? '#fff' : '#81738c'; ctx.lineWidth = lit ? 12 : 3;
      ctx.beginPath(); ctx.roundRect(p.x - p.w / 2, p.y - p.h / 2, p.w, p.h, 36); ctx.stroke();
    }
  }
  for (let i = 0; i < g.seq.length; i++) {
    ctx.fillStyle = g.phase === 'input' && i < g.index ? '#74b78b' : '#dfd4e6';
    ctx.beginPath(); ctx.arc(500 + (i - (g.seq.length - 1) / 2) * 32, 650, 10, 0, Math.PI * 2); ctx.fill();
  }
}
