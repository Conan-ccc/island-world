export { STAGES } from './stages.js';
export const meta = { id: 'swing', name: '줄타기 점프', control: 'tap', body: true, cheerAt: null,
  how: '줄에 매달려 흔들리다가 눌러서 발판으로 날아가!', goal: '발판에 사뿐히 내려앉아!',
  accepts: { speed: 3, reach: 3, hint: 2 } };
export const LAND_Y = 480, GRAVITY = 1400;
export const difficulty = row => row.speed * 1000 + row.need * 10 - row.width;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function hanging(g, phase = g.phase) {
  const angle = .9 * Math.sin(phase), velocity = .9 * g.row.speed * Math.cos(phase);
  // Slow widens the release window without shortening the reachable jump.
  return { x: 280 + 290 * Math.sin(angle), y: 80 + 290 * Math.cos(angle),
    vx: 290 * Math.cos(angle) * velocity, vy: -290 * Math.sin(angle) * velocity };
}
export function landing(body) {
  const t = (-body.vy + Math.sqrt(body.vy ** 2 + 2 * GRAVITY * (LAND_Y - body.y))) / GRAVITY;
  return body.x + body.vx * t;
}
function platform(g) { g.px = 480 + (g.maxX - 480) * (.55 + random(g) * .3); }
export function init(row, { mods, rng }) {
  const g = { row, mods, phase: -.8, fly: null, rest: 0, landed: false, attempt: 0,
    score: 0, need: row.need, px: 0, maxX: 0, random: Math.floor(rng() * 4294967296) };
  for (let i = 0; i < 120; i++) g.maxX = Math.max(g.maxX, landing(hanging(g, i * Math.PI * 2 / 120)));
  platform(g); return g;
}
export function step(g, input, dt) {
  const events = [];
  if (g.rest > 0) {
    g.rest = Math.max(0, g.rest - dt);
    if (!g.rest) { if (g.landed) platform(g); g.fly = null; g.landed = false; g.attempt++; }
    return events;
  }
  if (!g.fly) {
    g.phase = (g.phase + dt * g.row.speed * g.mods.speed) % (Math.PI * 2);
    if (input.pressed) {
      const body = hanging(g);
      g.fly = { ...body, startX: body.x, startY: body.y, t: 0 };
      events.push({ type: 'sound', name: 'tap' });
    }
    return events;
  }
  const f = g.fly, oldY = f.y;
  f.t += dt; f.x = f.startX + f.vx * f.t; f.y = f.startY + f.vy * f.t + GRAVITY * f.t ** 2 / 2;
  if (oldY < LAND_Y && f.y >= LAND_Y) {
    const x = landing({ x: f.startX, y: f.startY, vx: f.vx, vy: f.vy });
    if (Math.abs(x - g.px) <= g.row.width * g.mods.reach) {
      f.x = x; f.y = LAND_Y; g.landed = true; g.rest = g.row.rest ?? .55; g.score++;
      events.push({ type: 'good', x, y: LAND_Y });
      if (g.score >= g.need) events.push({ type: 'goal' });
    }
  }
  if (!g.landed && f.y > 720) { g.rest = .55; events.push({ type: 'bad', x: f.x, y: 650 }); }
  return events;
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 600 };
  if (seen.fly || seen.rest > 0 || seen.attempt <= (actions.get(rng) ?? -1)) return idle;
  const body = hanging(seen, seen.phase + seen.row.speed * seen.mods.speed * skill.reactMs / 1000);
  if (body.vx <= 0 || Math.abs(landing(body) - seen.px) > seen.row.width * seen.mods.reach * .2) return idle;
  actions.set(rng, seen.attempt);
  return { ...idle, down: true, pressed: true };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, fly: g.fly ? { ...g.fly } : null };
}
