import { ART, drawBackground, drawAsset, drawHero } from '../../art.js';
import { BOAT_Y, river, gateWidth } from './game.js';
export function draw(ctx, g, { heroId = 'pal', time = 0 } = {}) {
  const art = ART.games.row;
  ctx.fillStyle = '#dcefc7'; ctx.fillRect(0, 0, 1000, 700);
  const background = drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  ctx.globalAlpha = background ? .8 : 1;
  ctx.fillStyle = '#dcefc7';
  for (const side of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(side < 0 ? 0 : 1000, 0);
    for (let y = 0; y <= 700; y += 20) ctx.lineTo(river(g, g.z + BOAT_Y - y) + side * 380, y);
    ctx.lineTo(side < 0 ? 0 : 1000, 700); ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = background ? .3 : 1;
  ctx.fillStyle = '#a5dfdf'; ctx.beginPath();
  for (let y = 0; y <= 700; y += 20) { const x = river(g, g.z + BOAT_Y - y) - 380; if (!y) ctx.moveTo(x,y); else ctx.lineTo(x,y); }
  for (let y = 700; y >= 0; y -= 20) ctx.lineTo(river(g, g.z + BOAT_Y - y) + 380,y);
  ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = '#e2f7ef'; ctx.lineWidth = 4;
  for (let y = (g.z % 90); y < 700; y += 90) for (const x of [300,500,700]) {
    ctx.beginPath(); ctx.moveTo(x-14,y); ctx.quadraticCurveTo(x,y+8,x+14,y); ctx.stroke();
  }
  const gy = BOAT_Y - (g.gateZ - g.z), width = gateWidth(g);
  ctx.strokeStyle = '#fffbe8'; ctx.lineWidth = 4; ctx.setLineDash([12,12]);
  ctx.beginPath(); ctx.moveTo(g.gateX-width,gy); ctx.lineTo(g.gateX+width,gy); ctx.stroke(); ctx.setLineDash([]);
  for (const x of [g.gateX-width-35,g.gateX+width+35]) {
    if (!drawAsset(ctx,art?.buoy,x-35,gy-35,70,70)) { ctx.fillStyle='#ef8b79'; ctx.beginPath(); ctx.ellipse(x,gy,35,35,0,0,Math.PI*2);ctx.fill(); }
  }
  for (const o of g.obstacles) {
    const y = BOAT_Y-(o.z-g.z);
    ctx.globalAlpha = o.hit ? .5 : 1;
    if (!drawAsset(ctx,art?.[o.kind],o.x-o.rx,y-o.ry,o.rx*2,o.ry*2)) { ctx.fillStyle=o.kind==='rock'?'#8c999b':'#b57c4e';ctx.beginPath();ctx.ellipse(o.x,y,o.rx,o.ry,0,0,Math.PI*2);ctx.fill(); }
    ctx.globalAlpha=1;
  }
  ctx.save();ctx.translate(g.x,BOAT_Y);ctx.rotate(g.angle);ctx.scale(g.mods.small * 3,g.mods.small * 3);
  for (const side of [-1,1]) {
    ctx.save();ctx.translate(side*18,0);ctx.rotate(-side*(.7+(g.lastSide===-side?Math.sin(g.paddle/.3*Math.PI)*.5:0)));
    if (!drawAsset(ctx,art?.oar,-7,-8,14,36)) {ctx.fillStyle='#b87c42';ctx.fillRect(-6,0,12,28);}ctx.restore();
  }
  if (!drawAsset(ctx,art?.boat,-25,-35,50,70)) {ctx.fillStyle='#f4ad54';ctx.strokeStyle='#68442c';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,25,35,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
  drawHero(ctx,heroId,g.cooldown?'sad':'idle',0,-5,Math.max(35,25/g.mods.small),time);ctx.restore();
  ctx.fillStyle='#fff9eee8';ctx.beginPath();ctx.roundRect(150,615,700,65,24);ctx.fill();
  ctx.fillStyle='#604b40';ctx.font='bold 25px sans-serif';ctx.textAlign='center';
  ctx.fillText(g.cooldown?'앗! 다시 저어 가자!':'왼쪽 톡!   영차!   오른쪽 톡!',500,657);
}
