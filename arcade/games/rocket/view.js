import { ART, drawBackground, drawStrip, drawAsset, drawHero } from '../../art.js';
import { LAND } from './game.js';
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#eeeafa'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.rocket?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#c2b3df';
    for (let i = 0; i < 22; i++) {
      ctx.beginPath(); ctx.arc(30 + (i * 173) % 940, 40 + (i * 97) % 450, 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#d5cae5'; ctx.beginPath(); ctx.ellipse(500, 740, 740, 180, 0, 0, Math.PI * 2); ctx.fill();
  }
  const safe = g.row.safe * g.mods.reach, gentle = g.vy <= safe;
  if (!drawStrip(ctx, ART.games.rocket?.pad, 370, LAND + 54, 260, 28)) {
    ctx.fillStyle = gentle ? '#67cba0' : '#c49acb'; ctx.strokeStyle = '#51466d'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.roundRect(370, LAND + 54, 260, 28, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(410, LAND + 61, 180, 7);
  }
  ctx.fillStyle = gentle ? '#67cba0' : '#c49acb'; ctx.fillRect(410, LAND + 61, 180, 7);
  if (g.burn) {
    ctx.fillStyle = '#ffbf54'; ctx.strokeStyle = '#d77940'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(480, g.y + 50); ctx.lineTo(520, g.y + 50);
    ctx.lineTo(500, g.y + 100 + Math.sin(time * 18) * 8); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (!drawAsset(ctx, ART.games.rocket?.rocket, 440, g.y - 78, 120, 136)) {
    ctx.fillStyle = '#f295b9'; ctx.strokeStyle = '#724b76'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(500, g.y - 78); ctx.quadraticCurveTo(554, g.y - 25, 540, g.y + 54);
    ctx.lineTo(460, g.y + 54); ctx.quadraticCurveTo(446, g.y - 25, 500, g.y - 78); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(500, g.y - 5, 36, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(462, g.y + 10); ctx.lineTo(440, g.y + 54); ctx.lineTo(462, g.y + 44); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(538, g.y + 10); ctx.lineTo(560, g.y + 54); ctx.lineTo(538, g.y + 44); ctx.stroke();
  }
  drawHero(ctx, heroId, g.hold > 0 ? (g.landed ? 'happy' : 'sad') : pose, 500, g.y - 3, 62, time);
  // Fuel and speed are gauges, never a countdown. The speed marker shows the landing limit.
  const speedHeight = Math.min(1, Math.max(0, g.vy) / 600) * 300;
  const fuelHeight = g.fuel / (g.row.tank * g.mods.time) * 300;
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#74618c'; ctx.lineWidth = 4;
  for (const x of [140, 800]) { ctx.beginPath(); ctx.roundRect(x, 180, 60, 320, 20); ctx.fill(); ctx.stroke(); }
  ctx.fillStyle = '#efb44f'; ctx.fillRect(150, 490 - fuelHeight, 40, fuelHeight);
  ctx.fillStyle = gentle ? '#48b98a' : '#e45e78'; ctx.fillRect(810, 490 - speedHeight, 40, speedHeight);
  ctx.strokeStyle = '#237f63'; ctx.lineWidth = 5;
  const line = 490 - Math.min(1, safe / 600) * 300;
  ctx.beginPath(); ctx.moveTo(790, line); ctx.lineTo(870, line); ctx.stroke();
  ctx.fillStyle = '#fff9e7';
  for (const x of [115, 775]) { ctx.beginPath(); ctx.roundRect(x, 128, 110, 38, 12); ctx.fill(); }
  ctx.beginPath(); ctx.roundRect(775, 511, 110, 40, 12); ctx.fill();
  ctx.fillStyle = '#51466d'; ctx.textAlign = 'center'; ctx.font = 'bold 27px sans-serif';
  ctx.fillText('연료', 170, 155); ctx.fillText('빠르기', 830, 155);
  ctx.fillText(gentle ? '좋아!' : '빨라!', 830, 540);
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(g.hold > 0 ? (g.landed ? '살포시 내려앉았어!' : '조금 더 천천히!')
    : g.fuel <= 0 ? '연료가 다 됐어!' : '누르면 불꽃! 손을 떼면 내려와!', 500, 650);
}
