export { STAGES } from './stages.js';
export const meta = { id: 'sling', name: '풍선 새총', control: 'drag', body: true,
  how: '친구를 뒤로 당겼다 놓아서 풍선을 맞혀 봐!', goal: '친구를 날려 풍선을 맞혀 봐!',
  accepts: { hint: 3, reach: 2, speed: 2 }, feel: ['radius', 'distance', 'drift'], cheerAt: null };
export const ORIGIN = { x: 180, y: 480 }, GRAVITY = 500, POWER = 6, MAX_PULL = 130, HERO_RADIUS = 44;
export const difficulty = row => row.distance + 100 - row.radius + row.drift + row.need;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function target(g) {
  const b = { bx: g.row.distance + random(g) * 100, by: 240 + random(g) * 110,
    phase: random(g) * Math.PI * 2, color: g.attempt % 3, hit: false };
  g.balloons = [b]; locate(g, b);
}
function locate(g, b) {
  b.x = b.bx + (g.row.moving ? Math.sin(g.elapsed * g.row.drift * g.mods.speed + b.phase) * 65 : 0);
  b.y = b.by + (g.row.moving ? Math.cos(g.elapsed * g.row.drift * g.mods.speed + b.phase) * 25 : 0);
}
export function pull(x, y) {
  const dx = x - ORIGIN.x, dy = y - ORIGIN.y, scale = Math.min(1, MAX_PULL / (Math.hypot(dx, dy) || 1));
  return { x: ORIGIN.x + dx * scale, y: ORIGIN.y + dy * scale };
}
export function trajectory(p, wind, t) {
  return { x: ORIGIN.x + (ORIGIN.x - p.x) * POWER * t + wind * t * t / 2,
    y: ORIGIN.y + Math.max((ORIGIN.y - p.y) * POWER, -Math.sqrt(2 * GRAVITY * (ORIGIN.y - HERO_RADIUS * 1.2))) * t + GRAVITY * t * t / 2 };
}
export function previewTime(g) { return g.mods.hint ? 3 : g.row.preview; }
export function init(row, { mods, rng }) {
  const g = { row, mods, random: Math.floor(rng() * 4294967296), score: 0, need: row.need,
    elapsed: 0, attempt: 0, dragging: false, pull: { ...ORIGIN }, flight: null, rest: 0,
    landing: { ...ORIGIN }, wind: row.moving ? row.wind : 0, balloons: [], stars: [] };
  target(g); return g;
}
export function step(g, input, dt) {
  const events = [];
  g.elapsed += dt;
  g.stars = g.stars.filter(s => (s.life -= dt) > 0);
  for (const b of g.balloons) locate(g, b);
  if (g.rest > 0) { g.rest = Math.max(0, g.rest - dt); if (g.rest) return events; }
  if (!g.flight) {
    if ((input.pressed || input.down) && Math.hypot(input.x - ORIGIN.x, input.y - ORIGIN.y) <= 65) g.dragging = true;
    if (g.dragging && input.down) g.pull = pull(input.x, input.y);
    if (g.dragging && !input.down) {
      g.dragging = false;
      if (Math.hypot(g.pull.x - ORIGIN.x, g.pull.y - ORIGIN.y) >= 8) {
        g.flight = { t: 0, pull: { ...g.pull }, x: ORIGIN.x, y: ORIGIN.y, hits: 0 };
        events.push({ type: 'sound', name: 'tap' });
      }
      g.pull = { ...ORIGIN };
    }
    return events;
  }
  // Small substeps prevent a fast flight passing through a balloon between frames.
  const f = g.flight, slices = Math.max(1, Math.ceil(dt / .008));
  for (let i = 0; i < slices; i++) {
    f.t += dt / slices;
    Object.assign(f, trajectory(f.pull, g.wind, f.t));
    for (const b of g.balloons) if (!b.hit && Math.hypot(f.x - b.x, f.y - b.y) <= g.row.radius * g.mods.reach + HERO_RADIUS + 1e-9) {
      b.hit = true; f.hits++; g.score++;
      g.stars.push({ x: b.x, y: b.y, life: .8 });
      events.push({ type: 'good', x: b.x, y: b.y });
      if (g.score >= g.need) { events.push({ type: 'goal' }); return events; }
    }
    if (f.y >= 555 || f.x < 25 || f.x > 975 || f.t >= 3) {
      g.landing = { x: Math.max(55, Math.min(945, f.x)), y: 555 };
      if (!f.hits && g.row.miss) events.push({ type: 'bad', ...g.landing });
      g.flight = null; g.rest = .55; g.attempt++;
      target(g); return events;
    }
  }
  return events;
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, ...ORIGIN };
  let action = actions.get(rng);
  if (action && action.phase > 0 && action.phase < 20) {
    action.phase++;
    return action.phase < 20 ? { down: true, pressed: false, ...action.p } : idle;
  }
  if (seen.flight || seen.rest > 0) return idle;
  if (!action || seen.attempt > action.attempt) {
    const b = seen.balloons.find(b => !b.hit);
    if (!b) return idle;
    const t = 1, error = skill.jitterMs / 1000 * 100 / (seen.mods.hint ? 2.8 : 1);
    const x = b.x + (rng() * 2 - 1) * error, y = b.y + (rng() * 2 - 1) * error;
    // Short/no preview leaves more uncertainty in judging distance; no hidden state is read.
    const uncertainty = (rng() * 2 - 1) * skill.reactMs / 1000 * (seen.mods.hint ? 4 : 24);
    const p = pull(ORIGIN.x - (x - ORIGIN.x - seen.wind * t * t / 2) / (POWER * t),
      ORIGIN.y - (y - ORIGIN.y - GRAVITY * t * t / 2) / (POWER * t) + uncertainty);
    action = { attempt: seen.attempt, phase: 0, p }; actions.set(rng, action);
  }
  if (seen.attempt !== action.attempt) return idle;
  if (action.phase++ === 0) return { down: true, pressed: true, ...ORIGIN };
  if (action.phase < 20) return { down: true, pressed: false, ...action.p };
  return idle;
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, pull: { ...g.pull }, landing: { ...g.landing },
    flight: g.flight ? { ...g.flight, pull: { ...g.flight.pull } } : null,
    balloons: g.balloons.map(b => ({ ...b })), stars: g.stars.map(s => ({ ...s })) };
}
