export { STAGES } from './stages.js';
export const meta = { id: 'cross', name: '꽥꽥 건널목', control: 'tap', body: false, cheerAt: null,
  how: '자동차를 톡 눌러 멈추고 아기 오리가 건너게 해 줘!', goal: '아기 오리가 길을 건너게 도와줘!',
  accepts: { speed: 3, time: 2, hint: 2 }, feel: ['speed', 'duck', 'stop'] };
export const CAR_W = 116, CAR_H = 80, DUCK_W = 48, DUCK_H = 56;
export const laneY = i => 490 - i * 140;
export const difficulty = row => row.speed + row.duck + row.need * 10 - row.stop;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function init(row, { mods, rng }) {
  const g = { row, mods, t: 0, y: 610, returning: false, rest: 0, score: 0, need: row.need,
    random: Math.floor(rng() * 4294967296), cars: [] };
  for (let i = 0; i < row.lanes; i++) g.cars.push({ id: i, x: i % 2 ? 1000 + random(g) * 180 : -random(g) * 180, y: laneY(i), dir: i % 2 ? -1 : 1, stopped: 0, safePass: false });
  return g;
}
export function nearDuck(g, car, horizon = 1.2) {
  const arrival = (g.y - car.y) / g.row.duck;
  const distance = (500 - car.x) * car.dir;
  return !g.returning && arrival > -.95 && arrival < Math.min(horizon + .7, g.row.stop * g.mods.time - .3) && distance > -94 && distance < 100 + g.row.speed * g.mods.speed * horizon;
}
export function step(g, input, dt) {
  const events = []; g.t += dt;
  if (input.pressed) {
    const car = g.cars.find(c => Math.abs(input.x - c.x) <= CAR_W / 2 && Math.abs(input.y - c.y) <= CAR_H / 2);
    if (car) { car.stopped = g.row.stop * g.mods.time; car.safePass = Math.abs(car.x - 500) < (CAR_W + DUCK_W) / 2 + 12; events.push({ type: 'sound', name: 'tap' }); }
  }
  let nextY = g.y - g.row.duck * dt;
  if (g.returning) {
    const backY = Math.min(610, g.y + 550 * dt);
    const occupied = g.cars.some(c => Math.abs(c.x - 500) < (CAR_W + DUCK_W) / 2 + 12 &&
      c.y >= g.y && Math.abs(backY - c.y) < (CAR_H + DUCK_H) / 2 + 10);
    if (!occupied) g.y = backY;
    if (g.y === 610) { g.returning = false; g.rest = 4; }
  } else if (g.rest > 0) { g.rest = Math.max(0, g.rest - dt); }
  else {
    for (const c of g.cars) {
      const nextX = c.x + (c.stopped > 0 ? 0 : c.dir * g.row.speed * g.mods.speed * dt);
      // Brake BEFORE silhouettes touch, including a car approaching a duck already in its lane.
      if (Math.abs(nextX - 500) < (CAR_W + DUCK_W) / 2 + 12 && Math.abs(nextY - c.y) < (CAR_H + DUCK_H) / 2 + 10) {
        if (c.stopped > 0 || c.safePass) { nextY = g.y; }
        else { c.stopped = 1; c.safePass = true; g.returning = true; events.push({ type: 'bad', x: 500, y: g.y }); break; }
      }
    }
    if (!g.returning) g.y = nextY;
    if (g.y <= 100) {
      g.score++; g.y = 610; g.rest = .65;
      events.push({ type: 'good', x: 500, y: 100 });
      if (g.score >= g.need) events.push({ type: 'goal' });
    }
  }
  for (const c of g.cars) {
    if (c.stopped > 0) c.stopped = Math.max(0, c.stopped - dt);
    else {
      const nextX = c.x + c.dir * g.row.speed * g.mods.speed * dt;
      const besideReturn = g.returning && Math.abs(g.y - c.y) < (CAR_H + DUCK_H) / 2 + 24;
      const leaving = Math.abs(c.x - 500) < (CAR_W + DUCK_W) / 2 + 12;
      if (leaving || !besideReturn || Math.abs(nextX - 500) >= (CAR_W + DUCK_W) / 2 + 12) c.x = nextX;
    }
    if (Math.abs(c.x - 500) > 100) c.safePass = false;
    if (c.x > 1080) c.x = -80 - random(g) * g.row.gap;
    if (c.x < -80 - g.row.gap) c.x = 1080;
  }
  return events;
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 650 };
  if (seen.returning || seen.t < (actions.get(rng) ?? 0)) return idle;
  const car = seen.cars.find(c => c.stopped <= 1.3 && !c.safePass && nearDuck(seen, c, 2.2));
  if (!car) return idle;
  actions.set(rng, seen.t + .28);
  if (rng() < skill.wrongRate) return idle;
  return { down: true, pressed: true, x: car.x + (car.stopped > skill.reactMs / 1000 ? 0 : car.dir * seen.row.speed * seen.mods.speed * Math.max(0, skill.reactMs / 1000 - car.stopped)), y: car.y };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, cars: g.cars.map(c => ({ ...c })) };
}
