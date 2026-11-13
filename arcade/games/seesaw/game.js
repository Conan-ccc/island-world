export { STAGES } from './stages.js';
export const meta = { id: 'seesaw', name: '시소 균형', control: 'tap', body: false, cheerAt: null,
  how: '왼쪽이나 오른쪽을 눌러 친구를 앉혀 줘!', goal: '시소를 반듯하게 맞춰 줘!',
  accepts: { hint: 3, reach: 2, speed: 2 }, feel: ['fall', 'green', 'limit', 'speed'] };
export const difficulty = row => 100 / row.fall + row.need;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function weight(g) { return 1 + Math.floor(random(g) * g.row.weights); }
export function torque(g, side, w = g.current) {
  return g.load + w * (side - g.row.offset);
}
export function bestSide(g) { return Math.abs(torque(g, -1)) <= Math.abs(torque(g, 1)) ? -1 : 1; }
function next(g) {
  g.current = g.next; g.next = weight(g); g.age = 0; g.turn++;
  g.side = g.pending ?? bestSide(g); g.chosen = g.pending !== null; g.pending = null;
}
export function init(row, { mods, rng }) {
  const g = { row, mods, random: Math.floor(rng() * 4294967296), score: 0, need: row.need,
    load: 0, angle: 0, displayAngle: 0, age: 0, turn: 0, current: 1, next: 1, side: -1, chosen: false,
    seats: [], rest: 0, leaving: false, pending: null };
  g.current = weight(g); g.next = weight(g); return g;
}
export function step(g, input, dt) {
  const events = [];
  g.displayAngle += (g.angle - g.displayAngle) * (1 - Math.exp(-dt * g.row.speed * 4 * g.mods.speed));
  if (g.rest > 0) {
    if (input.pressed && Number.isFinite(input.x)) g.pending = input.x < 500 ? -1 : 1;
    g.rest = Math.max(0, g.rest - dt);
    if (!g.rest) {
      if (g.leaving) { g.seats = []; g.load = 0; g.angle = 0; g.leaving = false; }
      next(g);
    }
    return events;
  }
  if (input.pressed && Number.isFinite(input.x)) {
    g.side = input.x < 500 ? -1 : 1; g.chosen = true;
  }
  if (!g.chosen && g.row.wait) return events;
  if (!g.chosen) g.side = bestSide(g);
  g.age += dt * g.mods.speed;
  const target = g.load * .055;
  g.angle += (target - g.angle) * (1 - Math.exp(-dt * g.row.speed * g.mods.speed));
  if (g.age + 1e-9 < g.row.fall) return events;
  g.load = torque(g, g.side);
  g.seats.push({ weight: g.current, side: g.side });
  const x = g.side < 0 ? 300 : 700;
  g.angle = g.load * .055;
  if (Math.abs(g.load) > g.row.limit) {
    g.leaving = true; g.rest = 1; events.push({ type: 'bad', x, y: 460 });
  } else {
      if (g.chosen && Math.abs(g.load) <= g.row.green * g.mods.reach) {
      g.score++; events.push({ type: 'good', x, y: 420 });
      if (g.score >= g.need) events.push({ type: 'goal' });
    }
    g.leaving = g.seats.length >= 6; g.rest = g.leaving ? 1 : .16;
  }
  return events;
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 450 };
  if (seen.rest || seen.turn <= (actions.get(rng) ?? -1)) return idle;
  actions.set(rng, seen.turn);
  // Count the visible animals independently; a hint removes counting mistakes.
  let load = seen.load;
  if (!seen.mods.hint) for (const seat of seen.seats) {
    if (rng() < skill.wrongRate) load += seat.weight * seat.side;
  }
  let side = bestSide({ ...seen, load });
  if (!seen.mods.hint && rng() < skill.wrongRate) side *= -1;
  return { down: true, pressed: true, x: side < 0 ? 250 : 750, y: 450 };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods }, seats: g.seats.map(s => ({ ...s })) }; }
