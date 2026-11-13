export { STAGES } from './stages.js';
export const meta = { id: 'curl', name: '얼음 미끄럼', control: 'drag', body: true,
  how: '손가락을 왼쪽으로 당겼다 놓아! 동그라미 안에 멈추게 해!',
  goal: '동그라미 안에 멈춰!', accepts: { reach: 3, hint: 2 }, feel: ['radius'] };
export const START = 140, FRICTION = 600, GAIN = 3.2, MAX_PULL = 300;
export const stopAt = pull => START + (pull * GAIN) ** 2 / (2 * FRICTION);
export const difficulty = row => 200 - row.radius + row.need * 10;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function init(row, { mods, rng }) {
  const g = { row, mods, x: START, v: 0, pull: 0, ax: 0, drag: false, hold: 0,
    hit: false, attempt: 0, score: 0, need: row.need, random: Math.floor(rng() * 4294967296) };
  g.tx = 520 + random(g) * 300;
  return g;
}
export function step(g, input, dt) {
  if (g.hold > 0) {
    g.hold = Math.max(0, g.hold - dt);
    if (!g.hold) { g.x = START; g.pull = 0; g.tx = 520 + random(g) * 300; }
    return [];
  }
  if (g.v > 0) {
    // Integrate only the moving fraction of the last tick: guide and landing agree.
    const moving = Math.min(dt, g.v / FRICTION);
    g.x += g.v * moving - FRICTION * moving * moving / 2;
    g.v = Math.max(0, g.v - FRICTION * dt);
    if (g.v > 0) return [];
    g.hit = Math.abs(g.x - g.tx) <= g.row.radius * g.mods.reach;
    g.hold = .8; g.attempt++;
    const events = [{ type: g.hit ? 'good' : 'bad', x: g.x, y: 420 }];
    if (g.hit && ++g.score >= g.need) events.push({ type: 'goal' });
    return events;
  }
  if (input.pressed && input.down && !g.drag) { g.drag = true; g.ax = input.x; }
  if (g.drag && input.down) g.pull = Math.max(0, Math.min(MAX_PULL, g.ax - input.x));
  if (g.drag && !input.down) {
    g.drag = false;
    if (g.pull > 20) { g.v = g.pull * GAIN; g.pull = 0; return [{ type: 'sound', name: 'tap' }]; }
    g.pull = 0;
  }
  return [];
}
// A motor plan uses only the observed target and one imprecise pull per attempt.
// Remember our own gesture so delayed snapshots cannot replay a release.
const gestures = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 650, y: 550 };
  let action = gestures.get(rng);
  if (!action || seen.attempt > action.attempt) {
    if (seen.v > 0 || seen.hold > 0) return idle;
    const ideal = Math.sqrt((seen.tx - START) * 2 * FRICTION) / GAIN;
    action = { attempt: seen.attempt, pull: Math.max(21, Math.min(MAX_PULL,
      ideal + (rng() * 2 - 1) * skill.jitterMs * .085)), moved: 0, released: false };
    gestures.set(rng, action);
    return { ...idle, down: true, pressed: true };
  }
  if (action.released) return idle;
  if (action.moved >= action.pull) { action.released = true; return idle; }
  action.moved = Math.min(action.pull, action.moved + 3);
  return { ...idle, down: true, x: 650 - action.moved };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods } }; }
