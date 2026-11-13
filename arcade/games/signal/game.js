export { STAGES } from './stages.js';
export const meta = { id: 'signal', name: '반짝 신호', control: 'tap', body: false,
  how: '빨강과 파랑은 기다려. 초록불이 켜지면 어디든 톡!', goal: '초록불이 켜질 때만 톡!',
  feel: ['window'], accepts: { speed: 3, reach: 2, fewer: 2 } };
export const difficulty = row => 1 / row.window + row.fake + row.need;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function red(g) { g.phase = 'red'; g.left = 1.2 + random(g) * 1.1; g.turn++; }
export function init(row, { mods, rng }) {
  const g = { row, mods, phase: 'red', left: 0, pulse: 0, turn: -1, score: 0, need: row.need,
    random: Math.floor(rng() * 4294967296) };
  red(g); return g;
}
export function step(g, input, dt) {
  const events = [];
  g.left -= dt;
  g.pulse = Math.max(0, g.pulse - dt);
  // Judge against the signal that was visible when the finger went down.
  // An expired green cannot be rescued by a tap in the same simulation tick.
  if (input.pressed || (g.phase === 'green' && g.left <= 0)) {
    if (g.phase === 'green' && g.left > 0) {
      g.score++; events.push({ type: 'good', x: 500, y: 390 });
      if (g.score >= g.need) events.push({ type: 'goal' });
    } else if (!(g.phase === 'green' && g.row.missFree)) events.push({ type: 'bad', x: 500, y: g.phase === 'red' ? 170 : 390 });
    red(g); return events;
  }
  if (g.left > 0) return events;
  if (g.phase === 'blue') red(g);
  else {
    g.phase = random(g) < g.row.fake * (1 - g.mods.fewer) && g.turn > 0 ? 'blue' : 'green';
    g.left = g.phase === 'blue' ? .5 : g.row.window / g.mods.speed * g.mods.reach;
    g.turn++;
    if (g.phase === 'green') { g.pulse = .3; events.push({ type: 'sound', name: 'tap' }); }
  }
  return events;
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 570 };
  if (seen.phase === 'red' || seen.turn <= (actions.get(rng) ?? -1)) return idle;
  // Remember one decision per observed signal, even when jitter reorders snapshots.
  actions.set(rng, seen.turn);
  if (seen.phase === 'blue' && rng() >= skill.wrongRate) return idle;
  return { ...idle, down: true, pressed: true };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods } }; }
