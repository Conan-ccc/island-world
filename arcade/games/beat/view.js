import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
import { DRUM_X, DRUM_Y } from './game.js';
const colors = ['#ffe08a', '#9edcff', '#a6e8b8'];
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#fff0f5'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.beat?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#fff9f2'; ctx.fillRect(0, 450, 1000, 250);
    ctx.fillStyle = '#efd9e6';
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(400 + i * 150, 170, 36, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = '#e5dbe7'; ctx.fillRect(0, DRUM_Y - 12, 1000, 24);
  const radius = g.row.window * g.mods.reach;
  ctx.fillStyle = '#ffe7ef'; ctx.strokeStyle = '#d86791'; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(DRUM_X, DRUM_Y, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (!drawAsset(ctx, ART.games.beat?.drum, 115, 420, 170, 150)) {
    ctx.fillStyle = '#ed91af'; ctx.beginPath(); ctx.roundRect(115, 440, 170, 110, 20); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff5d8'; ctx.beginPath(); ctx.ellipse(200, 440, 85, 30, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  for (const note of g.notes) {
    if (!drawAsset(ctx, ART.games.beat?.note, note.x - 48, DRUM_Y - 48, 96, 96)) {
      ctx.fillStyle = colors[note.color]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(note.x, DRUM_Y, 48, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#62566d'; ctx.textAlign = 'center'; ctx.font = 'bold 30px sans-serif';
    ctx.fillText(['●', '◆', '★'][note.color], note.x, DRUM_Y + 10);
  }
  if (g.pulse > 0) {
    ctx.strokeStyle = '#f1b34c'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(DRUM_X, DRUM_Y, radius + 12, 0, Math.PI * 2); ctx.stroke();
  }
  drawHero(ctx, heroId, g.pulse > 0 ? 'jump' : pose, 200, 610 - (g.pulse > 0 ? 12 : 0), 90, time);
  ctx.fillStyle = '#6d5c77'; ctx.textAlign = 'center'; ctx.font = 'bold 28px sans-serif';
  ctx.fillText('동그라미가 북 위에 오면 톡!', 650, 560);
}
