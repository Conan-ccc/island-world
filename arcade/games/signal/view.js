import { ART, drawBackground, drawAsset } from '../../art.js';
export function draw(ctx, g) {
  ctx.fillStyle = '#fff0f5'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.signal?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#e0ecd1'; ctx.beginPath(); ctx.ellipse(500, 690, 700, 160, 0, 0, Math.PI * 2); ctx.fill();
  }
  if (!drawAsset(ctx, ART.games.signal?.lamp, 360, 75, 280, 460)) {
    ctx.fillStyle = '#75637e'; ctx.strokeStyle = '#4e3c5b'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.roundRect(360, 75, 280, 460, 65); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#75637e'; ctx.fillRect(475, 535, 50, 70);
  for (const [y, active, color] of [[185, g.phase === 'red', '#ff777b'], [405, g.phase !== 'red', g.phase === 'green' ? '#55d69c' : '#78adf6']]) {
    ctx.fillStyle = active ? color : '#50435d'; ctx.strokeStyle = active ? '#fff' : '#94839d'; ctx.lineWidth = active ? 9 : 4;
    const radius = 88 + (y === 405 && g.phase === 'green' ? 18 * g.pulse / .3 : 0);
    ctx.beginPath(); ctx.arc(500, y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    if (active) {
      ctx.strokeStyle = '#3a384d'; ctx.lineWidth = 10; ctx.lineCap = 'round';
      ctx.beginPath();
      if (g.phase === 'green') { ctx.moveTo(466, y); ctx.lineTo(490, y + 25); ctx.lineTo(535, y - 28); }
      else { ctx.moveTo(470, y - 25); ctx.lineTo(530, y + 25); ctx.moveTo(530, y - 25); ctx.lineTo(470, y + 25); }
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#4e3c5b'; ctx.textAlign = 'center'; ctx.font = 'bold 32px sans-serif';
  if (g.phase === 'green') ctx.fillText('지금!', 500, 310);
  ctx.fillText(g.phase === 'green' ? '지금이야! 어디든 톡!' : g.phase === 'blue' ? '파랑도 기다려!' : '빨강은 기다려!', 500, 650);
}
