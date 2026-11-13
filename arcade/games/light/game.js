export { STAGES } from './stages.js';
export const meta = { id: 'light', name: '손전등 찾기', control: 'drag', body: false,
  how: '빛으로 동물을 찾아 주고 잠자는 부엉이는 피해!', goal: '빛으로 숨은 동물을 찾아 줘!',
  accepts: { reach: 3, hint: 3, fewer: 2 }, feel: ['beam', 'size', 'hold', 'owl', 'speed'] };
export const difficulty = r => 200 - r.beam + r.speed + r.need;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export const radius = g => g.row.beam * g.mods.reach;
export const lit = (g, p) => g.down && Math.hypot(g.x - p.x, g.y - p.y) <= radius(g) + 1e-9;
function room(g) {
  g.room++; g.rest = .65; g.elapsed = 0;
  g.animals = [0, 1, 2].map(i => ({ id: i, x: 180 + i * 320, y: 220 + random(g) * 90,
    home: 180 + i * 320, phase: random(g) * Math.PI * 2, held: 0, found: false }));
  const count = Math.ceil(g.row.owls * (1 - g.mods.fewer));
  g.owls = Array.from({ length: count }, (_, i) => ({ x: 180 + i * 320, y: 470, held: 0, awake: 0 }));
}
export function init(row, { mods, rng }) {
  const g = { row, mods, random: Math.floor(rng() * 4294967296), score: 0, need: row.need,
    room: 0, x: 500, y: 350, down: false, clock: 0, safe: 0, remaining: (row.time ?? 0) * mods.time };
  room(g); return g;
}
export function step(g, input, dt) {
  const events = []; g.clock += dt; g.safe = Math.max(0, g.safe - dt);
  g.down = !!input.down && Number.isFinite(input.x) && Number.isFinite(input.y);
  if (g.down) { g.x = clamp(input.x, 40, 960); g.y = clamp(input.y, 80, 580); }
  if (g.rest > 0) { g.rest = Math.max(0, g.rest - dt); return events; }
  g.elapsed += dt;
  if (g.row.time) {
    g.remaining -= dt;
    if (g.remaining <= 0) { g.remaining = g.row.time * g.mods.time; room(g); return [{ type: 'timeout' }]; }
  }
  for (const owl of g.owls) {
    owl.awake = Math.max(0, owl.awake - dt);
    owl.held = lit(g, owl) && !owl.awake ? owl.held + dt : 0;
    if (owl.held >= g.row.owl * (1 + g.mods.fewer) && !g.safe) {
      owl.held = 0; owl.awake = 1.2; g.safe = 1.2;
      events.push({ type: 'bad', x: owl.x, y: owl.y });
    }
  }
  for (const a of g.animals) {
    if (a.found) continue;
    if (g.row.moving) a.x = a.home + Math.sin(g.elapsed * g.row.speed / 60 + a.phase) * 85;
    a.held = lit(g, a) ? a.held + dt : Math.max(0, a.held - dt * 2);
    if (a.held + 1e-9 >= g.row.hold) {
      a.found = true; g.score++; events.push({ type: 'good', x: a.x, y: a.y });
      if (g.score >= g.need) { events.push({ type: 'goal' }); return events; }
    }
  }
  if (g.animals.every(a => a.found)) room(g);
  return events;
}
const hands = new WeakMap();
export function policy(seen, skill, rng) {
  // Only delayed observations and this hand's previous aiming decision are available.
  let hand = hands.get(rng);
  if (!hand) { hand = { until: -1, dx: 0, dy: 0 }; hands.set(rng, hand); }
  if (seen.clock >= hand.until) {
    hand.until = seen.clock + .9;
    const angle = rng() * Math.PI * 2, error = skill.jitterMs * .8 * rng();
    hand.dx = Math.cos(angle) * error; hand.dy = Math.sin(angle) * error;
  }
  const target = seen.animals.find(a => !a.found);
  if (!target || seen.rest > 0) return { down: false };
  if (seen.owls.some(o => o.held > .08)) return { down: false };
  return { down: true, pressed: false, x: target.x + hand.dx, y: target.y + hand.dy };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods },
  animals: g.animals.map(a => ({ ...a })), owls: g.owls.map(o => ({ ...o })) }; }
