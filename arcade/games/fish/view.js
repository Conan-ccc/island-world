import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
const colors = ['#ffbd79', '#ffa4be', '#ffe295', '#a8e2bb'];
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#def4ff'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.fish?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#a2dcf3'; ctx.fillRect(0, 170, 1000, 530);
    ctx.fillStyle = '#83c3e1'; ctx.fillRect(0, 450, 1000, 250);
    ctx.fillStyle = '#e5d6ad'; ctx.beginPath(); ctx.ellipse(500, 730, 650, 100, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#cd9d76'; ctx.beginPath(); ctx.roundRect(380, 125, 240, 45, 20); ctx.fill();
  drawHero(ctx, heroId, pose, 455, 82, 100, time);
  ctx.strokeStyle = '#66576b'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(500, 95); ctx.lineTo(500, g.hy + 10); ctx.stroke();
  ctx.fillStyle = 'rgba(255, 245, 173, .3)'; ctx.strokeStyle = '#e3b45d'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(500, g.hy + 22, 44 * g.mods.reach, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  if (!drawAsset(ctx, ART.games.fish?.hook, 480, g.hy + 2, 40, 40)) {
    ctx.strokeStyle = '#66576b'; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(500, g.hy + 22, 20, 0, Math.PI); ctx.stroke();
  }
  for (const f of g.fish) {
    ctx.save(); ctx.translate(f.x, f.y);
    if (!f.bad) {
      if (f.id === g.hooked) ctx.rotate(-Math.PI / 2); else ctx.scale(Math.sign(f.vx), 1);
    }
    if (drawAsset(ctx, ART.games.fish?.[f.bad ? 'jelly' : 'fish'], -48, -40, 96, 80)) { ctx.restore(); continue; }
    ctx.fillStyle = f.bad ? '#b39bdf' : colors[f.color]; ctx.strokeStyle = '#6b6483'; ctx.lineWidth = 3;
    if (f.bad) {
      ctx.beginPath(); ctx.arc(0, 0, 32, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 12, 0); ctx.quadraticCurveTo(i * 12 - 10, 15, i * 12, 30); ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.moveTo(-25, 0); ctx.lineTo(-48, -20); ctx.lineTo(-48, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, 0, 34, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#60546c'; ctx.beginPath(); ctx.arc(18, -5, 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  ctx.textAlign = 'center'; ctx.font = 'bold 28px sans-serif'; ctx.fillStyle = '#50677b';
  ctx.fillText(g.hooked !== null ? '걸렸어! 손을 떼!' : '꾹 누르면 내려가!', 790, 90);
}
