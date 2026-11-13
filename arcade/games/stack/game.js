export { STAGES } from './stages.js';
export const meta = { id: 'stack', name: '탑 쌓기', control: 'tap', body: false, cheerAt: null,
  how: '움직이는 블록이 탑 위에 올 때 눌러서 쌓아!',
  goal: '탑 위에 딱 올 때 눌러!', accepts: { speed: 3, reach: 3, magnet: 2 } };
export const difficulty = row => row.speed + 500 - row.width + row.need * 10;
export function init(row, { mods, rng }) {
  const w = row.width * mods.reach;
  return { row, mods, tower: [{ x: 500, w }], cur: { x: edge(w), w, dir: 1 },
    score: 0, need: row.need, cam: 0, rest: 0, random: Math.floor(rng() * 4294967296) };
}
const edge = width => Math.max(120, width / 2 + 20);
function next(g) {
  g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0;
  const left = g.random / 4294967296 < .5;
  const w = g.tower.at(-1).w;
  g.cur = { x: left ? edge(w) : 1000 - edge(w), w, dir: left ? 1 : -1 };
  // Let the landed block settle before the next one starts moving.
  g.rest = 1;
}
export function step(g, input, dt) {
  g.cam += (Math.max(0, g.tower.length - 6) * 46 - g.cam) * Math.min(1, dt * 6);
  if (g.rest > 0) { g.rest = Math.max(0, g.rest - dt); return []; }
  const c = g.cur, top = g.tower.at(-1);
  c.x += c.dir * g.row.speed * g.mods.speed * dt;
  const lo = edge(c.w), hi = 1000 - lo;
  if (c.x > hi) { c.x = 2 * hi - c.x; c.dir = -1; }
  if (c.x < lo) { c.x = 2 * lo - c.x; c.dir = 1; }
  if (!input.pressed) return [];
  if (g.mods.magnet && Math.abs(c.x - top.x) < 34) c.x = top.x;
  const left = Math.max(c.x - c.w / 2, top.x - top.w / 2);
  const right = Math.min(c.x + c.w / 2, top.x + top.w / 2), overlap = right - left;
  const y = 560 - g.tower.length * 46 + g.cam;
  if (overlap < 14) { const x = c.x; next(g); return [{ type: 'bad', x, y }]; }
  const block = g.row.minWidth < 1 && overlap > c.w * .88 ? { x: top.x, w: c.w } : { x: (left + right) / 2, w: Math.max(overlap, g.row.width * g.mods.reach * g.row.minWidth) };
  g.tower.push(block); g.score++;
  const events = [{ type: 'good', x: block.x, y }];
  if (g.score >= g.need) events.push({ type: 'goal' });
  next(g);
  return events;
}
export function policy(seen, skill, rng) {
  const c = seen.cur, top = seen.tower.at(-1);
  // Estimate motion from the delayed snapshot, including reflections at the edges.
  let x = c.x + c.dir * seen.row.speed * seen.mods.speed * skill.reactMs / 1000;
  const lo = edge(c.w), hi = 1000 - lo;
  if (x > hi) x = 2 * hi - x;
  if (x < lo) x = 2 * lo - x;
  const pressed = seen.rest === 0 && Math.abs(x - top.x) < Math.max(4, c.w * .04) && rng() >= skill.wrongRate;
  return { down: pressed, pressed, x: 500, y: 350 };
}

// Detached bot history; keep in sync with the game state shape.
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, tower: g.tower.map(b => ({ ...b })), cur: { ...g.cur } };
}
