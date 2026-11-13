import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
export function draw(ctx, g, { heroId = 'pal', time = 0 } = {}) {
  ctx.fillStyle = '#eee9ff'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, ART.games.cups?.background, 0, 0, 1000, 700);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#625579'; ctx.font = 'bold 36px sans-serif';
  ctx.fillText(g.phase === 'pick' ? '어느 컵일까? 골라!' : g.phase === 'reveal' ?
    (g.chosen === g.has ? '찾았다!' : '여기 숨어 있었네!') : g.repeated ? '한 번 더 잘 봐!' : '잘 봐!', 500, 90);
  ctx.fillStyle = '#d9c7ae'; ctx.beginPath(); ctx.roundRect(65, 445, 870, 65, 25); ctx.fill();
  // Draw the back crossing cup first; all cups look alike so tracking matters.
  const order = g.cups.map((c, i) => ({ ...c, i })).sort((a, b) => b.lift - a.lift);
  for (const c of order) {
    const up = (g.phase === 'show' && c.i === g.has) || (g.phase === 'reveal' && (c.i === g.has || c.i === g.chosen));
    if (up && c.i === g.has) drawHero(ctx, heroId, g.phase === 'reveal' ? 'happy' : 'idle', c.x, 400, 96, time);
    const y = 290 - (up ? 125 : 0) - c.lift;
    if (!drawAsset(ctx, ART.games.cups?.cup, c.x - 86, y, 172, 160)) {
      ctx.fillStyle = '#a5cde9'; ctx.strokeStyle = '#625579'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(c.x - 60, y); ctx.lineTo(c.x + 60, y);
      ctx.lineTo(c.x + 86, y + 160); ctx.lineTo(c.x - 86, y + 160); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#dcedf7'; ctx.fillRect(c.x - 57, y + 22, 114, 15);
    }
    if (g.phase === 'pick') {
      ctx.strokeStyle = '#8776a4'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(c.x, 473, 90, 10, 0, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.fillStyle = '#625579'; ctx.font = '28px sans-serif';
  ctx.fillText(g.phase === 'pick' ? '컵 하나를 톡!' : g.phase === 'mix' ? '숨은 친구를 눈으로 따라가!' : '컵 아래 친구를 기억해!', 500, 585);
}
