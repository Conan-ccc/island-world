export { STAGES } from './stages.js';
export const meta = { id: 'pour', name: '주스 따르기', control: 'hold', body: false,
  how: '꾹 눌러 주스를 따르고 초록 띠에서 손을 떼!', goal: '주스를 초록 띠에 맞춰 줘!',
  accepts: { speed: 3, reach: 2, hint: 2 }, feel: ['flow', 'band', 'lag', 'travel'] };
export const difficulty = row => row.flow * 100 - row.band + row.need;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function cup(g) {
  g.level = 0; g.tail = 0; g.pouring = false; g.elapsed = 0;
  g.variant = g.row.varied ? Math.floor(random(g) * 3) : 0;
  g.capacity = [1, .86, 1.14][g.variant];
  g.center = g.row.varied ? .56 + random(g) * .15 : .64;
}
export function bounds(g) {
  const half = g.row.band * g.mods.reach / 2;
  return { low: g.center - half, high: g.center + half };
}
export const flow = g => g.row.flow * g.mods.speed / g.capacity;
export const cupX = g => g.row.moving ? 330 + 390 * Math.min(1, g.elapsed / g.row.travel) : 500;
export function init(row, { mods, rng }) {
  const g = { row, mods, random: Math.floor(rng() * 4294967296), score: 0, need: row.need,
    attempt: 0, rest: 0, result: null };
  cup(g); return g;
}
export function step(g, input, dt) {
  if (g.rest > 0) {
    g.rest = Math.max(0, g.rest - dt);
    if (!g.rest) { g.attempt++; g.result = null; cup(g); }
    return [];
  }
  g.elapsed += dt;
  const down = !!input.down, rate = flow(g);
  if (down) { g.level += rate * dt; g.tail = g.row.lag; }
  else { g.level += rate * Math.min(dt, g.tail); g.tail = Math.max(0, g.tail - dt); }
  g.pouring = down || g.tail > 0;
  const { low, high } = bounds(g);
  const spilled = g.level > high + 1e-9;
  const filled = !down && g.tail === 0 && g.level >= low - 1e-9 && !spilled;
  const missed = g.row.moving && g.elapsed >= g.row.travel && !filled;
  if (!spilled && !filled && !missed) return [];
  g.result = filled ? 'good' : spilled ? 'spill' : 'miss'; g.rest = 1.1; g.pouring = false;
  const event = { type: filled ? 'good' : 'bad', x: cupX(g), y: 420 };
  if (!filled) return [event];
  g.score++;
  return g.score >= g.need ? [event, { type: 'goal' }] : [event];
}
const released = new WeakMap();
export function policy(seen, skill, rng) {
  // The decision sees only the harness's delayed cup, never the live state.
  // Remember a release until a new cup is observed, so old frames cannot restart it.
  const idle = { down: false, pressed: false, x: 500, y: 580 };
  if (seen.rest > 0 || seen.attempt <= (released.get(rng) ?? -1)) return idle;
  if (seen.level >= Math.max(.01, bounds(seen).low - flow(seen) * seen.row.lag)) {
    released.set(rng, seen.attempt); return idle;
  }
  return { ...idle, down: true };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods } }; }
