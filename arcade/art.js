import { siteUrl, asset } from '../core/env.js';
import { charUrl } from '../core/characters.js';
import { HEROES } from './heroes.js';

// Generated assets are registered here only when they exist; no missing-image requests.
export const ART = { heroes: {}, games: {}, home: null, icons: {} };
for (const id of ['pal', 'shell', 'bouncy', 'slow', 'magnet', 'bighand', 'sparkle', 'heart', 'clock', 'memory', 'tiny', 'lucky', 'rainbow']) {
  ART.heroes[id] = Object.fromEntries(['idle', 'jump', 'happy', 'sad'].map(pose =>
    [pose, `assets/arcade/heroes/${id}-${pose}.webp`]));
}
// Keep this manifest explicit: ungenerated art never causes a network request.
const gameArt = {
  run: 'rock pit',
  float: 'cloud balloon',
  stack: 'block block0 block1 block2 block3',
  pour: 'jug cup0 cup1 cup2 belt',
  paddle: 'ball paddle block',
  light: 'box plant curtain chair cat rabbit mouse owl-sleep owl-awake',
  aim: 'drop nozzle',
  pinball: 'mushroom flower wing star ball',
  echo: 'pad1 pad2 pad3 pad4 pad5 pad6',
  cross: 'duck car-red car-blue',
  fish: 'fish jelly hook',
  herd: 'sheep startled fence gate',
  beat: 'drum note',
  train: 'engine carriage passenger',
  toss: 'basket ball',
  balance: 'tray cup0 cup1 cup2 table',
  trace: 'finish',
  tilt: 'ball star hole wall',
  cups: 'cup',
  pipe: 'tank bud flower straight elbow tee',
  lane: 'car cone star',
  draw: 'machine ball basket cloud',
  swing: 'platform bar',
  jelly: 'jelly0 jelly1 jelly2 jelly3 jelly4',
  slice: 'fruit0 fruit1 fruit2 fruit3 rock',
  bowl: 'ball pin fallen obstacle',
  chase: 'cloud star',
  garden: 'pot bloom wilt sleep can',
  signal: 'lamp',
  whirl: 'machine stick candy0 candy1 candy2',
  rocket: 'rocket pad',
  row: 'boat oar buoy rock log',
  curl: 'sled target',
  seesaw: 'animal1 animal2 animal3 animal4 plank support',
  wheel: 'ball0 ball1 ball2 ball3 petal0 petal1 petal2 petal3',
  sling: 'sling balloon0 balloon1 balloon2 cloud',
  tree: 'trunk branch',
  switch: 'ball0 ball1 ball2 ball3 basket0 basket1 basket2 basket3 junction rail',
  march: 'animal0 animal1 animal2 plank house path',
  slide: 'ice rock star hole',
};
for (const [id, names] of Object.entries(gameArt)) {
  ART.games[id] = { background: `assets/arcade/games/${id}/bg.webp` };
  for (const name of names.split(' ')) ART.games[id][name] = `assets/arcade/games/${id}/${name}.webp`;
  ART.icons[id] = `assets/arcade/icons/${id}.webp`;
}
ART.home = 'assets/arcade/home/bg.webp';
const images = new Map();
let pal = null;
const colors = ['#f6b98c', '#96c7b7', '#d9b4ed', '#a8d9cb', '#e8a6c9', '#f0cb83', '#f7df8b', '#f4b2b9', '#a5c8e6', '#b7b3df', '#abd6a5', '#efce97', '#c4b2ed'];
const marks = ['●', '⬡', '〰', '◷', '∪', '✋', '✦', '♥', '◴', '◎', '•', '♧', '✧'];
function picture(url) {
  if (!url || typeof Image === 'undefined') return null;
  if (!images.has(url)) { const img = new Image(); img.src = url; images.set(url, img); }
  const img = images.get(url);
  return img.complete && img.naturalWidth ? img : null;
}
export function preloadArt(gameId, heroId) {
  for (const path of Object.values(ART.games[gameId] ?? {})) picture(siteUrl(path));
  for (const path of Object.values(ART.heroes[heroId] ?? {})) picture(siteUrl(path));
  if (heroId === 'pal' && pal) picture(pal);
}
export function setPal(state) {
  const entries = Object.entries(state.subjects).filter(([, s]) => s.characterId).sort((a, b) => b[1].stage - a[1].stage);
  if (!entries.length) { pal = null; return; }
  const [subject, s] = entries[0];
  const name = new URL(charUrl(s.characterId, s.stage)).pathname.split('/').pop();
  pal = asset(`char/${name}`, subject);
}
export function drawAsset(ctx, path, x, y, width, height, inset = 0) {
  const img = picture(path ? siteUrl(path) : null);
  if (!img) return false;
  if (inset) ctx.drawImage(img, inset, inset, img.naturalWidth - inset * 2, img.naturalHeight - inset * 2, x, y, width, height);
  else ctx.drawImage(img, x, y, width, height);
  return true;
}
// Cover crops preserve scenery proportions on the 1000 x 700 playfield.
export function drawBackground(ctx, path, x, y, width, height) {
  const img = picture(path ? siteUrl(path) : null);
  if (!img) return false;
  const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
  const sw = width / scale, sh = height / scale;
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, x, y, width, height);
  return true;
}
// Resize only the flat center of variable-width blocks; rounded ends stay round.
export function drawStrip(ctx, path, x, y, width, height) {
  const img = picture(path ? siteUrl(path) : null);
  if (!img) return false;
  const sw = img.naturalWidth, sh = img.naturalHeight;
  const cap = Math.min(sh / 2, sw / 3), edge = Math.min(height * cap / sh, width / 2);
  ctx.drawImage(img, 0, 0, cap, sh, x, y, edge, height);
  if (width > edge * 2) ctx.drawImage(img, cap, 0, sw - 2 * cap, sh, x + edge, y, width - 2 * edge, height);
  ctx.drawImage(img, sw - cap, 0, cap, sh, x + width - edge, y, edge, height);
  return true;
}
// Clouds repeat at their native aspect ratio and clip at the collision wall ends.
export function drawCloudWall(ctx, path, x, y, width, height, upward = false) {
  const img = picture(path ? siteUrl(path) : null);
  if (!img) return false;
  if (height <= 0) return true;
  const tileHeight = width * img.naturalHeight / img.naturalWidth;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  // Paint the gap-facing cap last, so overlapping tiles cannot hide its outline.
  const count = Math.ceil(height / (tileHeight * .78));
  for (let i = count - 1; i >= 0; i--) {
    const top = upward ? y + height - tileHeight - i * tileHeight * .78 : y + i * tileHeight * .78;
    ctx.drawImage(img, x, top, width, tileHeight);
  }
  ctx.restore(); return true;
}
export function drawHero(ctx, heroId, pose, x, y, size, t = 0) {
  const img = picture(heroId === 'pal' && pal ? pal : ART.heroes[heroId]?.[pose] ? siteUrl(ART.heroes[heroId][pose]) : null);
  if (img) { ctx.drawImage(img, x - size / 2, y - size / 2, size, size); return; }
  const i = Math.max(0, HEROES.findIndex(h => h.id === heroId));
  ctx.save(); ctx.translate(x, y + (pose === 'happy' ? Math.sin(t * 8) * 5 : 0));
  ctx.fillStyle = colors[i]; ctx.strokeStyle = '#5c5269'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.ellipse(0, 0, size * .42, size * .43, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#51465b'; ctx.font = `${size * .24}px sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(marks[i], 0, -size * .16);
  for (const dx of [-.14, .14]) { ctx.beginPath(); ctx.arc(size * dx, size * .04, size * .035, 0, Math.PI * 2); ctx.fill(); }
  ctx.beginPath(); ctx.arc(0, size * (pose === 'sad' ? .23 : .1), size * .1, pose === 'sad' ? Math.PI : 0, pose === 'sad' ? Math.PI * 2 : Math.PI); ctx.stroke();
  ctx.restore();
}
export function heroIcon(id, pose = 'idle') {
  const i = Math.max(0, HEROES.findIndex(h => h.id === id));
  const url = id === 'pal' && pal ? pal : ART.heroes[id]?.[pose] ? siteUrl(ART.heroes[id][pose]) : null;
  const svg = `<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="42" fill="${colors[i]}" stroke="#5c5269" stroke-width="3"/><text x="50" y="45" text-anchor="middle" font-size="30">${marks[i]}</text><circle cx="36" cy="58" r="3"/><circle cx="64" cy="58" r="3"/><path d="${pose === 'sad' ? 'M40 78 Q50 64 60 78' : 'M40 70 Q50 80 60 70'}" fill="none" stroke="#5c5269" stroke-width="3"/></svg>`;
  return url ? `<span class="hero-picture">${svg}<img src="${url}" alt="" onload="this.previousElementSibling.style.visibility='hidden'" onerror="this.remove()"></span>` : svg;
}
export function drawToken(ctx, token, x, y, size, { hint = false } = {}) {
  ctx.save(); ctx.fillStyle = hint ? '#fff1a3' : '#fffdf4'; ctx.strokeStyle = '#9a84ae'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.roundRect(x - size / 2, y - size / 2, size, size, 20); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#50435f'; ctx.font = `bold ${Math.min(size * .52, size / Math.max(1, token.label.length) * 1.4)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(token.label, x, y); ctx.restore();
}
