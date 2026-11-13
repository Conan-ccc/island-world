import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
import { topColor } from './game.js';
export const COLORS = ['#f1c747', '#70c997', '#a990dd', '#ef9863'];
const MARKS = ['●', '◆', '★', '■'];
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#fff5df'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.wheel?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#f4e3bf'; ctx.fillRect(0, 590, 1000, 110);
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.roundRect(450, 25, 100, 285, 40); ctx.fill();
  }
  const size = Math.PI * 2 / g.row.colors;
  for (let i = 0; i < g.row.colors; i++) {
    const center = -Math.PI / 2 + i * size + g.ang;
    ctx.strokeStyle = '#655b80'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(500, 470); ctx.lineTo(500 + Math.cos(center) * 92, 470 + Math.sin(center) * 92); ctx.stroke();
    ctx.save(); ctx.translate(500 + Math.cos(center) * 88, 470 + Math.sin(center) * 88); ctx.rotate(center);
    const petal = drawAsset(ctx, ART.games.wheel?.['petal' + i], -52, -35, 104, 70); ctx.restore();
    if (!petal) {
      ctx.fillStyle = COLORS[i]; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(500 + Math.cos(center) * 88, 470 + Math.sin(center) * 88, 52, 35, center, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#51465b'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(MARKS[i], 500 + Math.cos(center) * 90, 470 + Math.sin(center) * 90);
  }
  drawHero(ctx, heroId, g.flash ? (g.hit ? 'happy' : 'sad') : pose, 730, 520, 96, time);
  // This fixed swatch shows the actual selected color even during the turn animation.
  ctx.fillStyle = COLORS[topColor(g)]; ctx.strokeStyle = '#655b80'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(500, 341); ctx.lineTo(478, 307); ctx.lineTo(522, 307); ctx.closePath(); ctx.fill(); ctx.stroke();
  for (const b of g.balls) {
    if (!drawAsset(ctx, ART.games.wheel?.['ball' + b.c], 500 - 30, b.y - 30, 60, 60)) {
      ctx.fillStyle = COLORS[b.c]; ctx.strokeStyle = '#655b80'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(500, b.y, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#51465b'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(MARKS[b.c], 500, b.y);
  }
  ctx.fillStyle = '#655b80'; ctx.font = 'bold 28px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.flash ? (g.hit ? '같은 색이야!' : '다음 공의 색을 맞춰 봐!') : '톡톡 눌러 같은 색을 위로!', 500, 650);
}
