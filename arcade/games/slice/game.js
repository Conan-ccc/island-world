export { STAGES } from './stages.js';
export const meta = { id: 'slice', name: '싹둑 과일', control: 'drag', body: false, feel: ['speed', 'gap'],
  how: '튀어 오르는 과일을 손가락으로 쓱 그어! 돌은 피해.', goal: '과일을 쓱 그어서 잘라!',
  accepts: { speed: 3, reach: 3, fewer: 2 } };
export const GRAVITY = 900;
export const difficulty = row => row.speed * 100 + row.need + row.rocks * 10 - row.gap;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function distance(x, y, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
  return Math.hypot(x - ax - dx * t, y - ay - dy * t);
}
function spawn(g) {
  const x = 240 + random(g) * 520, vx = (random(g) - .5) * 160;
  g.items.push({ id: ++g.serial, x, y: 650, vx, vy: -740, bad: false, color: Math.floor(random(g) * 4) });
  if (random(g) < g.row.rocks * (1 - g.mods.fewer)) {
    g.items.push({ id: ++g.serial, x: x + (x > 500 ? -1 : 1) * 110, y: 650, vx, vy: -740, bad: true, color: 0 });
  }
}
export function init(row, { mods, rng }) {
  return { row, mods, items: [], serial: 0, next: .35, was: false, lx: 0, ly: 0,
    trail: [], score: 0, need: row.need, random: Math.floor(rng() * 4294967296) };
}
export function step(g, input, dt) {
  const events = [], elapsed = dt * g.row.speed * g.mods.speed;
  g.next -= elapsed;
  if (g.next <= 0) { g.next += g.row.gap; spawn(g); }
  for (const it of g.items) { it.x += it.vx * elapsed; it.y += it.vy * elapsed + GRAVITY * elapsed ** 2 / 2; it.vy += GRAVITY * elapsed; }
  const down = !!input.down && Number.isFinite(input.x) && Number.isFinite(input.y);
  if (down && (input.pressed || (g.was && Math.hypot(input.x - g.lx, input.y - g.ly) > 4))) {
    // Stones take priority on a stroke; the same object can only be cut once.
    const ax = input.pressed ? input.x : g.lx, ay = input.pressed ? input.y : g.ly;
    const hits = g.items.filter(it => distance(it.x, it.y, ax, ay, input.x, input.y) <= (it.bad ? 40 : 48 * g.mods.reach));
    const stones = hits.filter(it => it.bad);
    for (const it of hits) it.gone = true;
    if (stones.length) events.push({ type: 'bad', x: stones[0].x, y: stones[0].y });
    else for (const it of hits) {
      g.score++; events.push({ type: 'good', x: it.x, y: it.y });
      if (g.score >= g.need) { events.push({ type: 'goal' }); break; }
    }
    g.trail.push({ x: ax, y: ay, bx: input.x, by: input.y, life: .18 });
  }
  g.was = down; g.lx = down ? input.x : 0; g.ly = down ? input.y : 0;
  for (const p of g.trail) p.life -= dt;
  g.trail = g.trail.filter(p => p.life > 0);
  // Dropped fruit carries no penalty; another wave always arrives.
  g.items = g.items.filter(it => !it.gone && it.y < 730 && it.x > -80 && it.x < 1080);
  return events;
}
const hands = new WeakMap();
export function policy(seen, skill, rng) {
  let hand = hands.get(rng);
  if (!hand) { hand = { cut: null, tried: new Set() }; hands.set(rng, hand); }
  if (hand.cut) { const point = hand.cut; hand.cut = null; return { down: true, pressed: false, ...point }; }
  const idle = { down: false, pressed: false, x: 500, y: 600 };
  const elapsed = skill.reactMs / 1000 * seen.row.speed * seen.mods.speed;
  const predicted = seen.items.map(it => ({ ...it, x: it.x + it.vx * elapsed,
    y: it.y + it.vy * elapsed + GRAVITY * elapsed ** 2 / 2 }));
  const target = predicted.find(it => !it.bad && !hand.tried.has(it.id) && it.y > 160 && it.y < 570);
  if (!target) return idle;
  hand.tried.add(target.id);
  // A short stroke through the observed target, with no access to live state.
  const chosen = rng() < skill.wrongRate ? predicted.find(it => it.bad) ?? target : target;
  const x = chosen.x, y = chosen.y;
  hand.cut = { x: x + 28, y };
  return { down: true, pressed: true, x: x - 28, y };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, items: g.items.map(it => ({ ...it })), trail: g.trail.map(p => ({ ...p })) };
}
