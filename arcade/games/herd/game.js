export { STAGES } from './stages.js';
export const meta = { id: 'herd', name: '양 몰이', control: 'drag', body: true,
  how: '손가락으로 친구를 움직여 양을 문 안으로 보내 줘!', goal: '양을 문 안으로 보내 줘!',
  feel: ['speed', 'gate', 'wander', 'flee'], accepts: { speed: 3, reach: 2, magnet: 2 } };
export const MOVE = 460, RADIUS = 32;
export const BOUNDS = { left: 90, right: 910, top: 130, bottom: 560 };
export const difficulty = r => r.speed + r.wander + r.count * 10 + r.need + 400 / r.gate;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function sheep(g, id) {
  return { id, x: 280 + random(g) * 440, y: 310 + random(g) * 90,
    phase: random(g) * Math.PI * 2, scared: false };
}
export function init(row, { mods, rng }) {
  const g = { row, mods, x: 500, y: 510, elapsed: 0, score: 0, need: row.need,
    random: Math.floor(rng() * 4294967296), sheep: [], nextId: 0, message: 0 };
  for (let i = 0; i < row.count; i++) g.sheep.push(sheep(g, g.nextId++));
  return g;
}
export function step(g, input, dt) {
  const events = []; g.elapsed += dt; g.message = Math.max(0, g.message - dt);
  if (input.down && Number.isFinite(input.x) && Number.isFinite(input.y)) {
    const dx = clamp(input.x, 55, 945) - g.x, dy = clamp(input.y - 70, 75, 605) - g.y;
    const d = Math.hypot(dx, dy), move = Math.min(d, MOVE * dt);
    if (d > 0) { g.x += dx / d * move; g.y += dy / d * move; }
  }
  for (let i = 0; i < g.sheep.length; i++) {
    const s = g.sheep[i], dx = s.x - g.x, dy = s.y - g.y, d = Math.hypot(dx, dy);
    s.scared = d < g.row.flee * g.mods.reach;
    let vx = Math.sin(g.elapsed * .8 + s.phase) * g.row.wander;
    let vy = g.row.wander * .55;
    if (s.scared && d > 0) { vx = dx / d * g.row.speed; vy = dy / d * g.row.speed; }
    if (g.mods.magnet && Math.hypot(s.x - 500, s.y - BOUNDS.top) < 170) {
      vx += (500 - s.x) * 2; vy -= 90;
    }
    s.x += vx * dt * g.mods.speed; s.y += vy * dt * g.mods.speed;
    s.x = clamp(s.x, BOUNDS.left + RADIUS, BOUNDS.right - RADIUS);
    if (s.y <= BOUNDS.top + RADIUS) {
      if (Math.abs(s.x - 500) <= g.row.gate / 2 - RADIUS) {
        g.score++; events.push({ type: 'good', x: s.x, y: BOUNDS.top });
        g.sheep[i] = sheep(g, g.nextId++);
        if (g.score >= g.need) { events.push({ type: 'goal' }); break; }
      } else s.y = BOUNDS.top + RADIUS;
    }
    if (s.y > BOUNDS.bottom - RADIUS) {
      if (g.row.open) {
        events.push({ type: 'bad', x: s.x, y: BOUNDS.bottom }); g.message = 1.5;
        g.sheep[i] = sheep(g, g.nextId++);
      } else s.y = BOUNDS.bottom - RADIUS;
    }
  }
  return events;
}
const hands = new WeakMap();
export function policy(seen, skill, rng) {
  // Steer behind the observed sheep, aiming its flight at the visible gate.
  // No live state, future randomness, or skill-dependent rule shortcuts.
  let hand = hands.get(rng);
  if (!hand) { hand = { x: seen.x, y: seen.y }; hands.set(rng, hand); }
  const s = seen.sheep.find(s => s.id === hand.target) ?? [...seen.sheep].sort((a, b) => a.id - b.id)[0];
  hand.target = s.id;
  const dx = s.x - 500, dy = s.y - BOUNDS.top, d = Math.hypot(dx, dy);
  const distance = seen.row.flee * seen.mods.reach * .72;
  let x = s.x + dx / d * distance, y = s.y + dy / d * distance;
  // Walk around instead of through a sheep when approaching from above.
  if (hand.y < s.y + 15 && Math.abs(hand.x - s.x) < distance) {
    x = s.x + (hand.x < s.x ? -1 : 1) * (distance + 70); y = s.y + 60;
  }
  x = clamp(x, 55, 945); y = clamp(y, 75, 605);
  const hx = x - hand.x, hy = y - hand.y, hd = Math.hypot(hx, hy);
  if (hd > 0) { const move = Math.min(hd, MOVE / 60); hand.x += hx / hd * move; hand.y += hy / hd * move; }
  return { down: true, pressed: false, x, y: y + 70 };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods }, sheep: g.sheep.map(s => ({ ...s })) }; }
