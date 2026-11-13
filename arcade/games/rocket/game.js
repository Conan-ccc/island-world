export { STAGES } from './stages.js';
export const meta = { id: 'rocket', name: '로켓 착륙', control: 'hold', body: true,
  how: '누르고 있으면 불을 뿜어 천천히 내려와. 손을 떼고 다시 누르며 살살 내려앉아!',
  goal: '빠르기를 줄여 살살 착륙해!', feel: ['gravity', 'safe', 'tank'],
  accepts: { speed: 3, reach: 2, time: 2 } };
export const TOP = 110, LAND = 500, THRUST = 650;
export const difficulty = row => row.gravity + 1000 / row.safe + 100 / row.tank + row.need;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function reset(g) {
  g.y = TOP + 10; g.vy = 40 + random(g) * 60; g.fuel = g.row.tank * g.mods.time;
  g.burn = false; g.hold = 0; g.landed = false;
}
export function init(row, { mods, rng }) {
  const g = { row, mods, score: 0, need: row.need, attempt: 0,
    random: Math.floor(rng() * 4294967296) };
  reset(g); return g;
}
export function step(g, input, dt) {
  if (g.hold > 0) {
    g.hold = Math.max(0, g.hold - dt);
    if (g.hold === 0) reset(g);
    return [];
  }
  const elapsed = dt * g.mods.speed;
  // Fuel is measured in simulation seconds; partial final burns retain their impulse.
  const burnTime = input.down ? Math.min(elapsed, g.fuel) : 0;
  g.fuel = Math.max(0, g.fuel - burnTime); g.burn = burnTime > 0;
  g.vy = Math.max(-260, g.vy + g.row.gravity * (elapsed - burnTime) - THRUST * burnTime);
  g.y += g.vy * elapsed;
  if (g.y < TOP) { g.y = TOP; g.vy = 0; }
  if (g.y < LAND) return [];
  g.y = LAND; g.burn = false; g.hold = .8; g.attempt++;
  g.landed = g.vy <= g.row.safe * g.mods.reach;
  if (!g.landed) return [{ type: 'bad', x: 500, y: LAND }];
  g.score++;
  const events = [{ type: 'good', x: 500, y: LAND }];
  if (g.score >= g.need) events.push({ type: 'goal' });
  return events;
}
export function policy(seen) {
  // A delayed speed gauge is the only control signal, just as on the visible board.
  const down = seen.hold <= 0 && seen.fuel > 0 && seen.vy > seen.row.safe * seen.mods.reach * .65;
  return { down, pressed: false, x: 700, y: 580 };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods } }; }
