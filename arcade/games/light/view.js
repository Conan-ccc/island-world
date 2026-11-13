import { ART, drawAsset, drawBackground } from '../../art.js';
import { lit, radius } from './game.js';
const furniture = ['box', 'plant', 'curtain', 'chair'];
const animals = ['cat', 'rabbit', 'mouse'];
let shade;
function object(ctx, path, x, y, w, h, color) {
  if (drawAsset(ctx, path, x - w / 2, y - h / 2, w, h)) return;
  ctx.fillStyle = color; ctx.strokeStyle = '#604532'; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2, w, h, 20); ctx.fill(); ctx.stroke();
}
function face(ctx, x, y, sleeping) {
  ctx.fillStyle = '#604532'; ctx.strokeStyle = '#604532'; ctx.lineWidth = 4;
  for (const dx of [-11, 11]) {
    ctx.beginPath();
    if (sleeping) { ctx.moveTo(x + dx - 5, y); ctx.lineTo(x + dx + 5, y + 3); ctx.stroke(); }
    else { ctx.arc(x + dx, y, 4, 0, Math.PI * 2); ctx.fill(); }
  }
}
export function draw(ctx, g) {
  const art = ART.games.light;
  ctx.fillStyle = '#f2e8db'; ctx.fillRect(0, 0, 1000, 700);
  drawBackground(ctx, art?.background, 0, 0, 1000, 700);
  for (const a of g.animals) {
    // The head peeks above the furniture; the visible head center is the light target.
    if (!a.found) {
      const key = animals[a.id], size = g.row.size * 2;
      if (!drawAsset(ctx, art?.[key], a.x - size / 2, a.y - size / 2, size, size)) {
        object(ctx, null, a.x, a.y, size, size, ['#ffc18f', '#9bd9bc', '#9fd2ec'][a.id]); face(ctx, a.x, a.y, false);
      }
    }
    object(ctx, art?.[furniture[(a.id + g.room - 1) % 4]], a.home, a.y + g.row.size + 42, 140, 140, '#d8b594');
  }
  for (const o of g.owls) {
    const key = o.awake ? 'owl-awake' : 'owl-sleep';
    if (!drawAsset(ctx, art?.[key], o.x - 42, o.y - 42, 84, 84)) {
      object(ctx, null, o.x, o.y, 84, 84, '#bcb0df'); face(ctx, o.x, o.y, !o.awake);
    }
  }
  // Erase only the offscreen darkness, never the room/animals beneath it.
  if (typeof document !== 'undefined') {
    if (!shade) { shade = document.createElement('canvas'); shade.width = 1000; shade.height = 700; }
    const mask = shade.getContext('2d');
    mask.clearRect(0, 0, 1000, 700);
    mask.fillStyle = '#25283af5'; mask.fillRect(0, 0, 1000, 700);
    if (g.down) {
      mask.globalCompositeOperation = 'destination-out'; mask.beginPath();
      mask.arc(g.x, g.y, radius(g), 0, Math.PI * 2); mask.fill();
      mask.globalCompositeOperation = 'source-over';
    }
    ctx.drawImage(shade, 0, 0);
  } else { ctx.fillStyle = '#25283ad0'; ctx.fillRect(0, 0, 1000, 700); }
  if (g.down) {
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 4; ctx.beginPath();
    ctx.arc(g.x, g.y, radius(g), 0, Math.PI * 2); ctx.stroke();
  }
  for (const a of g.animals) {
    if (a.found) continue;
    if (lit(g, a) && a.held > 0) {
      ctx.strokeStyle = '#8fe9b4'; ctx.lineWidth = 6; ctx.beginPath();
      ctx.arc(a.x, a.y, g.row.size + 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, a.held / g.row.hold)); ctx.stroke();
    }
    if (g.mods.hint && g.clock % 3 < .65) {
      ctx.fillStyle = '#ffed9b'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('✦', a.x, a.y - g.row.size - 10);
    }
  }
  for (const o of g.owls) if (o.held > 0 || o.awake) {
    ctx.strokeStyle = '#ffd69a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(o.x, o.y, 49, 0, Math.PI * 2); ctx.stroke();
    // Warning outline stays above the artwork without painting another face.

    ctx.fillStyle = '#fff3cf'; ctx.font = 'bold 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(o.awake ? '앗!' : '쉿!', o.x, o.y - 58);
  }
  ctx.fillStyle = '#fff6df'; ctx.beginPath(); ctx.roundRect(150, 610, 700, 65, 24); ctx.fill();
  ctx.fillStyle = '#604532'; ctx.font = 'bold 27px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(g.rest > 0 ? '새 방에서 찾아보자!' : g.down ? '동물을 가만히 비춰 줘!' : '손가락으로 빛을 움직여 봐!', 500, 652);
}
