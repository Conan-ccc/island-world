export { STAGES } from './stages.js';
export const meta = { id: 'pinball', name: '뿅뿅 핀볼', control: 'tap', body: false, cheerAt: null,
  how: '공이 내려오면 톡 눌러 날개로 올려 줘!', goal: '공으로 반짝이는 별을 맞혀 줘!',
  accepts: { reach: 3, speed: 3 }, feel: ['speed', 'safe', 'radius', 'wing'] };
export const BALL_RADIUS = 32, WING_Y = 550;
export const difficulty = row => row.speed + 500 - row.safe + row.need;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export const pace = g => g.row.speed * g.mods.speed / 300;
export const gravity = g => 430 * pace(g) ** 2;
export function wings(g) {
  const length = Math.min(320, g.row.wing * g.mods.reach);
  return [{ x: 180, end: 180 + length }, { x: 820 - length, end: 820 }];
}
// A falling circle meets the bar top, or the circular distance to its corner.
function barSurface(x, left, right, y) {
  const dx = x - clamp(x, left, right);
  return Math.abs(dx) <= BALL_RADIUS ? y - Math.sqrt(BALL_RADIUS ** 2 - dx ** 2) : Infinity;
}
function target(g) {
  const positions = [350, 500, 650];
  g.target = { x: positions[(g.targetIndex += 1 + Math.floor(random(g) * 2)) % 3], y: 155, r: g.row.radius };
}
export function init(row, { mods, rng }) {
  const g = { row, mods, score: 0, need: row.need, ball: null, wait: .6, active: 0, cooldown: 0,
    dark: 0, targetIndex: 0, target: null, random: Math.floor(rng() * 4294967296),
    bumpers: [{ x: 200, y: 290, r: 45 }, { x: 800, y: 290, r: 45 }] };
  if (row.extra) g.bumpers.push({ x: 120, y: 160, r: 40 }, { x: 880, y: 160, r: 40 });
  target(g); return g;
}
function launch(g, b) {
  // A gentle assisted shot aims at the lit star; the player supplies the timing.
  const flight = 1.1 / pace(g), a = gravity(g);
  b.vx = (g.target.x - b.x) / flight;
  b.vy = (g.target.y - b.y - a * flight * flight / 2) / flight;
}
export function step(g, input, dt) {
  g.active = Math.max(0, g.active - dt); g.cooldown = Math.max(0, g.cooldown - dt);
  g.dark = Math.max(0, g.dark - dt);
  if (input.pressed && g.cooldown === 0) { g.active = Math.max(.24, .24 / pace(g)); g.cooldown = .58; }
  if (!g.ball) {
    g.wait -= dt;
    if (g.wait <= 0) g.ball = { x: 350 + random(g) * 300, y: 80, vx: (random(g) - .5) * 70 * pace(g), vy: 70 * pace(g) };
    return [];
  }
  const b = g.ball, events = [], count = Math.max(1, Math.ceil(dt / (1 / 240))), h = dt / count;
  for (let i = 0; i < count; i++) {
    const oldY = b.y;
    b.x += b.vx * h; b.y += b.vy * h + gravity(g) * h * h / 2; b.vy += gravity(g) * h;
    if (b.x < 65 + BALL_RADIUS) { b.x = 65 + BALL_RADIUS; b.vx = Math.abs(b.vx); }
    if (b.x > 935 - BALL_RADIUS) { b.x = 935 - BALL_RADIUS; b.vx = -Math.abs(b.vx); }
    if (b.y > 350 && b.y < 620) {
      const edge = 65 + (b.y - 350) * .9 + (BALL_RADIUS + 6) * Math.hypot(1, .9);
      if (b.x < edge) { b.x = edge; b.vx = Math.max(40 * pace(g), Math.abs(b.vx)); }
      if (b.x > 1000 - edge) { b.x = 1000 - edge; b.vx = -Math.max(40 * pace(g), Math.abs(b.vx)); }
    }
    if (b.y < 50 + BALL_RADIUS) { b.y = 50 + BALL_RADIUS; b.vy = Math.abs(b.vy); }
    for (const p of g.bumpers) {
      const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy), r = p.r + BALL_RADIUS;
      if (d >= r || d === 0) continue;
      const nx = dx / d, ny = dy / d, dot = b.vx * nx + b.vy * ny;
      b.x = p.x + nx * r; b.y = p.y + ny * r;
      if (dot < 0) { b.vx -= 2 * dot * nx; b.vy -= 2 * dot * ny; }
    }
    const t = g.target;
    if (!g.dark && b.vy < 0 && Math.hypot(b.x - t.x, b.y - t.y) <= t.r + BALL_RADIUS) {
      g.score++; events.push({ type: 'good', x: t.x, y: t.y });
      g.dark = .65; b.vy = Math.abs(b.vy); target(g);
      if (g.score >= g.need) { events.push({ type: 'goal' }); return events; }
    }
    if (b.vy > 0 && g.active > 0) {
      for (const w of wings(g)) {
        const surface = barSurface(b.x, w.x, w.end, WING_Y);
        if (oldY <= surface && b.y >= surface) { b.y = surface; launch(g, b); break; }
      }
    }
    // The safety bar returns a missed ball only to the lower playfield: no free stars.
    const safety = barSurface(b.x, 500 - g.row.safe / 2, 500 + g.row.safe / 2, 620);
    if (b.vy > 0 && oldY <= safety && b.y >= safety) {
      b.y = safety; b.vy = -350 * pace(g); b.vx = (b.vx < 0 ? -1 : 1) * Math.max(55 * pace(g), Math.abs(b.vx) * .4);
    }
    if (b.y > 720) { events.push({ type: 'bad', x: b.x, y: 670 }); g.ball = null; g.wait = .6; break; }
  }
  return events;
}
export function policy(seen, skill, rng) {
  const b = seen.ball;
  if (!b || b.vy <= 0) return {};
  const age = skill.reactMs / 1000, a = gravity(seen);
  const distance = WING_Y - BALL_RADIUS - b.y;
  const until = (-b.vy + Math.sqrt(Math.max(0, b.vy * b.vy + 2 * a * distance))) / a - age;
  return { pressed: until >= -.04 && until <= .16 && rng() >= skill.wrongRate, x: 500, y: 570 };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, ball: g.ball && { ...g.ball },
    target: { ...g.target }, bumpers: g.bumpers.map(b => ({ ...b })) };
}

