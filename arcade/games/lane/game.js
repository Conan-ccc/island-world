export { STAGES } from './stages.js';
export const meta = { id: 'lane', name: '씽씽 자동차', control: 'tap', body: true, cheerAt: null,
  how: '화면 왼쪽·오른쪽을 눌러 길을 바꿔. 고깔은 피하고 별을 모아!',
  goal: '고깔을 피하고 별을 모아!', accepts: { speed: 3, magnet: 2, reach: 2, small: 2, fewer: 2 } };
export const LX = [300, 500, 700];
export const CAR_Y = 510;
export const difficulty = row => row.speed + 100 / row.gap + row.need * 10 + row.cone * 50;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function init(row, { mods, rng }) {
  return { row, mods, lane: 1, x: 500, waves: [], next: .4, distance: 0, elapsed: 0,
    score: 0, need: row.need, serial: 0, random: Math.floor(rng() * 4294967296) };
}
export function step(g, input, dt) {
  const events = [], speed = g.row.speed * g.mods.speed;
  g.elapsed += dt;
  if (input.pressed && Number.isFinite(input.x)) {
    const lane = Math.max(0, Math.min(2, g.lane + (input.x < 500 ? -1 : 1)));
    if (lane !== g.lane) { g.lane = lane; events.push({ type: 'sound', name: 'tap' }); }
  }
  g.x += (LX[g.lane] - g.x) * Math.min(1, dt * 16);
  g.distance += speed * dt; g.next -= dt * g.mods.speed;
  if (g.next <= 0) {
    const free = Math.floor(random(g) * 3), cones = [];
    for (let i = 0; i < 3; i++) if (i !== free && random(g) < g.row.cone * (1 - g.mods.fewer)) cones.push(i);
    // Keep a safe route in every row. Every row also offers a collectible.
    g.waves.push({ id: ++g.serial, free, cones, y: -50, done: false, hit: false });
    g.next += g.row.gap;
  }
  for (const w of g.waves) {
    w.y += speed * dt;
    if (w.done || w.y < CAR_Y - 55 || w.y > CAR_Y + 50) continue;
    if (w.cones.some(lane => Math.abs(LX[lane] - g.x) < 36 + 38 * g.mods.small)) {
      w.done = w.hit = true; events.push({ type: 'bad', x: g.x, y: CAR_Y });
    } else if (Math.abs(LX[w.free] - g.x) < (g.mods.magnet ? 260 : 80 * g.mods.reach)) {
      w.done = true; g.score++;
      events.push({ type: 'good', x: LX[w.free], y: w.y });
      if (g.score >= g.need) { events.push({ type: 'goal' }); break; }
    }
  }
  g.waves = g.waves.filter(w => w.y < 740);
  return events;
}
// Track only our own button presses; delayed frames must not repeat a lane change.
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 620 };
  let a = actions.get(rng);
  if (!a) { a = { id: 0, lane: seen.lane, target: seen.lane, last: -1 }; actions.set(rng, a); }
  const w = seen.waves.find(w => !w.done && w.y <= CAR_Y + 50);
  if (!w || w.id < a.id) return idle;
  if (w.id > a.id) {
    a.id = w.id; a.target = w.free;
    if (rng() < skill.wrongRate) a.target = (a.target + 1 + Math.floor(rng() * 2)) % 3;
  }
  if (a.lane === a.target || seen.elapsed - a.last < .2) return idle;
  const direction = Math.sign(a.target - a.lane);
  a.lane += direction; a.last = seen.elapsed;
  return { down: true, pressed: true, x: direction < 0 ? 250 : 750, y: 620 };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, waves: g.waves.map(w => ({ ...w, cones: [...w.cones] })) };
}
