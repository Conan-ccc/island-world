import { ART, drawBackground, drawAsset, drawHero, drawToken } from '../../art.js';
export function draw(ctx, g, { heroId, time, pose = 'idle' }) {
  ctx.fillStyle = '#e3f5ef'; ctx.fillRect(0, 0, 1000, 700);
  if (!drawBackground(ctx, ART.games.run?.background, 0, 0, 1000, 700)) {
    ctx.fillStyle = '#c4e3c5';
    for (let i = 0; i < 7; i++) { const x = ((i * 200 - g.distance * .2) % 1400 + 1400) % 1400 - 200; ctx.beginPath(); ctx.arc(x, 580, 140, Math.PI, 0); ctx.fill(); }
    ctx.fillStyle = '#a3cf95'; ctx.fillRect(0, 580, 1000, 120);
  }
  for (const o of g.objects) {
    ctx.globalAlpha = o.hit ? .25 : 1;
    if (o.kind === 'token') drawToken(ctx, o.token, o.x, 580 - o.h, 100, { hint: !!g.mods.hint && o.good });
    else if (!drawAsset(ctx, ART.games.run?.[o.kind], o.x - 42, o.kind === 'pit' ? 575 : 520, 84, o.kind === 'pit' ? 30 : 60)) {
      ctx.fillStyle = o.kind === 'pit' ? '#615c74' : '#a79db5'; ctx.beginPath();
      ctx.roundRect(o.x - 42, o.kind === 'pit' ? 575 : 520, 84, o.kind === 'pit' ? 30 : 60, 16); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  drawHero(ctx, heroId, g.y > 0 ? 'jump' : pose, 200, 540 - g.y, 100 * g.mods.small, time);
}
