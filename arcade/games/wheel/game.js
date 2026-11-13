export { STAGES } from './stages.js';
export const meta = { id: 'wheel', name: '빙글 색판', control: 'tap', body: true, cheerAt: null,
  how: '눌러서 색판을 돌려. 떨어지는 공과 같은 색이 위로 오게 해!', goal: '공과 같은 색으로 받아!',
  accepts: { speed: 3 }, feel: ['speed', 'gap'] };
export const HIT_Y = 318;
export const topColor = g => (g.row.colors - g.rot % g.row.colors) % g.row.colors;
export const difficulty = row => row.speed + row.colors * 100 + row.need * 10 - row.gap * 10;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function ball(g) { return { id: g.serial++, y: 40, c: Math.floor(random(g) * g.row.colors) }; }
export function init(row, { mods, rng }) {
  const g = { row, mods, rot: 0, ang: 0, balls: [], next: row.gap, serial: 0,
    score: 0, need: row.need, flash: 0, hit: false, random: Math.floor(rng() * 4294967296) };
  g.balls.push(ball(g)); return g;
}
export function step(g, input, dt) {
  const events = [];
  g.flash = Math.max(0, g.flash - dt);
  if (input.pressed) { g.rot++; events.push({ type: 'sound', name: 'tap' }); }
  g.ang += (g.rot * Math.PI * 2 / g.row.colors - g.ang) * Math.min(1, dt * 18);
  g.next -= dt * g.mods.speed;
  if (g.next <= 0) { g.next += g.row.gap; g.balls.push(ball(g)); }
  for (const b of g.balls) b.y += g.row.speed * g.mods.speed * dt;
  while (g.balls[0]?.y >= HIT_Y) {
    const b = g.balls.shift(); g.hit = b.c === topColor(g); g.flash = .35;
    if (g.hit) {
      g.score++; events.push({ type: 'good', x: 500, y: HIT_Y });
      if (g.score >= g.need) { events.push({ type: 'goal' }); break; }
    } else events.push({ type: 'bad', x: 500, y: HIT_Y });
  }
  return events;
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 470 };
  let action = actions.get(rng);
  if (!action) { action = { rot: seen.rot, wait: 0 }; actions.set(rng, action); }
  action.rot = Math.max(action.rot, seen.rot);
  if (action.wait > 0) { action.wait--; return idle; }
  const b = seen.balls[0];
  if (!b || (seen.row.colors - action.rot % seen.row.colors) % seen.row.colors === b.c) return idle;
  // Remember our own taps instead of tapping again on stale wheel observations.
  action.rot++; action.wait = Math.ceil(skill.reactMs / 1000 * 60);
  return { ...idle, down: true, pressed: true };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, balls: g.balls.map(b => ({ ...b })) };
}
