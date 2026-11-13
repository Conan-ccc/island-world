export { STAGES } from './stages.js';
export const meta = { id: 'toss', name: '공 던지기', control: 'tap', body: true,
  how: '힘 막대가 알맞게 찼을 때 눌러서 바구니에 넣어!', goal: '힘을 맞춰 바구니에 넣어!',
  accepts: { speed: 3, reach: 3, hint: 2, time: 2 } };
export const LAND_MIN = 370, LAND_RANGE = 650, FLIGHT = .7;
export const difficulty = row => row.speed * 1000 + row.need * 10 + 200 - row.width;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function power(phase) { const q = ((phase % 2) + 2) % 2; return q <= 1 ? q : 2 - q; }
export function init(row, { mods, rng }) {
  const g = { row, mods, phase: 0, p: 0, bx: 0, ball: null, attempt: 0, score: 0, need: row.need,
    random: Math.floor(rng() * 4294967296), remaining: row.time ? row.time * mods.time : null };
  g.bx = 450 + random(g) * 380;
  return g;
}
export function step(g, input, dt) {
  const events = [];
  if (g.ball) {
    g.ball.t += dt / FLIGHT;
    if (g.ball.t >= 1) {
      const hit = Math.abs(g.ball.lx - g.bx) <= g.row.width * g.mods.reach;
      const x = g.ball.lx;
      g.ball = null; g.attempt++;
      if (hit) {
        g.score++; events.push({ type: 'good', x: g.bx, y: 430 });
        if (g.score >= g.need) { events.push({ type: 'goal' }); return events; }
        g.bx = 450 + random(g) * 380;
      } else events.push({ type: 'bad', x, y: 430 });
    }
  } else {
    g.phase = (g.phase + dt * g.row.speed * g.mods.speed) % 2;
    g.p = power(g.phase);
    if (input.pressed) {
      g.ball = { t: 0, lx: LAND_MIN + g.p * LAND_RANGE };
      events.push({ type: 'sound', name: 'tap' });
    }
  }
  if (g.remaining !== null) {
    g.remaining -= dt;
    if (g.remaining <= 0) {
      g.ball = null; g.attempt++; g.phase = 0; g.p = 0;
      g.remaining = g.row.time * g.mods.time;
      events.push({ type: 'timeout' });
    }
  }
  return events;
}
// A throw is remembered only until its result appears in delayed observations.
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 570 };
  if (seen.ball || seen.attempt <= (actions.get(rng) ?? -1)) return idle;
  const p = power(seen.phase + seen.row.speed * seen.mods.speed * skill.reactMs / 1000);
  if (Math.abs(LAND_MIN + p * LAND_RANGE - seen.bx) > seen.row.width * seen.mods.reach * .2) return idle;
  actions.set(rng, seen.attempt);
  return { ...idle, down: true, pressed: true };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, ball: g.ball ? { ...g.ball } : null };
}
