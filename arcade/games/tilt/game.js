export { STAGES } from './stages.js';
export const meta = { id: 'tilt', name: '데굴데굴 미로', control: 'drag', body: false, cheerAt: null,
  how: '가고 싶은 쪽을 누르고 움직여 구슬을 굴려 봐!', goal: '구슬을 굴려 별을 모아 봐!',
  accepts: { speed: 3, small: 2 }, feel: ['speed', 'gap', 'hole'] };
export const BALL = 20, STAR = 25;
export const SPAWN = { x: 100, y: 550 };
export const difficulty = row => row.speed;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export function layout(row) {
  const walls = [{ x: 350, y: 150 + row.gap, w: 30, h: 440 - row.gap }];
  if (row.walls > 1) walls.push({ x: 620, y: row.walls === 2 ? 150 + row.gap : 110, w: 30, h: 440 - row.gap });
  if (row.walls > 2) walls.push({ x: 480, y: 325, w: 80, h: 30 });
  const holes = [{ x: 500, y: 150 }, { x: 230, y: row.walls === 2 ? 500 : 350 }, { x: 770, y: 350 }, { x: 500, y: 550 }]
    .slice(0, row.holes).map(p => ({ ...p, r: row.hole }));
  return { walls, holes };
}
export function init(row, { mods }) {
  return { row, mods, ...layout(row), ...SPAWN, vx: 0, vy: 0, tiltX: 0, tiltY: 0,
    target: 0, stars: [{ x: 900, y: 150 }, { x: 100, y: 450 }, { x: 900, y: 550 }, { x: 100, y: 150 }],
    score: 0, need: row.need, rest: 0, surprised: false };
}
function blocked(g, x, y, margin = BALL * g.mods.small) {
  return g.walls.some(w => x > w.x - margin && x < w.x + w.w + margin && y > w.y - margin && y < w.y + w.h + margin);
}
export function safeLine(g, a, b, padding = 8) {
  const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 12);
  for (let i = 0; i <= steps; i++) {
    const f = steps ? i / steps : 0, x = a.x + (b.x - a.x) * f, y = a.y + (b.y - a.y) * f;
    if (blocked(g, x, y, BALL * g.mods.small + Math.max(0, padding)) || g.holes.some(h => Math.hypot(x - h.x, y - h.y) < h.r + BALL * g.mods.small * (padding < 0 ? .35 : 1) + Math.max(0, padding))) return false;
  }
  return true;
}
export function step(g, input, dt) {
  const events = [];
  if (g.rest > 0) { g.rest = Math.max(0, g.rest - dt); return events; }
  g.surprised = false;
  g.tiltX = input.down && Number.isFinite(input.x) ? clamp((input.x - 500) / 300, -1, 1) : 0;
  g.tiltY = input.down && Number.isFinite(input.y) ? clamp((input.y - 350) / 250, -1, 1) : 0;
  const norm = Math.max(1, Math.hypot(g.tiltX, g.tiltY));
  g.tiltX /= norm; g.tiltY /= norm;
  const radius = BALL * g.mods.small, count = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / count;
  for (let i = 0; i < count; i++) {
    const drag = Math.exp(-h / .18), speed = g.row.speed * g.mods.speed;
    g.vx = g.vx * drag + g.tiltX * speed * (1 - drag);
    g.vy = g.vy * drag + g.tiltY * speed * (1 - drag);
    const x = clamp(g.x + g.vx * h, 60 + radius, 940 - radius);
    if (!blocked(g, x, g.y)) g.x = x; else g.vx = 0;
    const y = clamp(g.y + g.vy * h, 90 + radius, 610 - radius);
    if (!blocked(g, g.x, y)) g.y = y; else g.vy = 0;
    if (g.holes.some(p => Math.hypot(g.x - p.x, g.y - p.y) < p.r + radius * .35)) {
      events.push({ type: 'bad', x: g.x, y: g.y });
      g.x = SPAWN.x; g.y = SPAWN.y; g.vx = 0; g.vy = 0; g.tiltX = 0; g.tiltY = 0;
      g.rest = .8; g.surprised = true; return events;
    }
    const star = g.stars[g.target];
    if (Math.hypot(g.x - star.x, g.y - star.y) <= radius + STAR) {
      events.push({ type: 'good', x: star.x, y: star.y }); g.score++;
      if (g.score >= g.need) events.push({ type: 'goal' });
      g.target = (g.target + 1) % g.stars.length; g.rest = .55;
      g.vx = 0; g.vy = 0; return events;
    }
  }
  return events;
}
// A visibility graph on a fixed grid routes around the same walls and holes the player sees.
// Cache only geometry: no live state or future observations enter the policy.
const routes = new Map();
export function routeMap(g) {
  const key = JSON.stringify([g.row.gap, g.row.hole, g.row.holes, g.row.walls, g.mods.small, g.target]);
  if (routes.has(key)) return routes.get(key);
  const nodes = [];
  for (let y = 150; y <= 550; y += 50) for (let x = 100; x <= 900; x += 50) nodes.push({ x, y });
  const goal = g.stars[g.target], dist = nodes.map(p => p.x === goal.x && p.y === goal.y ? 0 : Infinity);
  const visited = new Set();
  for (let k = 0; k < nodes.length; k++) {
    let best = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && Number.isFinite(dist[i]) && (best < 0 || dist[i] < dist[best])) best = i;
    if (best < 0) break;
    visited.add(best);
    for (let i = 0; i < nodes.length; i++) {
      const d = Math.hypot(nodes[i].x - nodes[best].x, nodes[i].y - nodes[best].y);
      if (d <= 75 && safeLine(g, nodes[i], nodes[best])) dist[i] = Math.min(dist[i], dist[best] + d);
    }
  }
  const map = nodes.map((p, i) => ({ ...p, distance: dist[i] })); routes.set(key, map); return map;
}
export function policy(seen) {
  if (seen.rest > 0) return { down: false, x: 500, y: 350 };
  const map = routeMap(seen);
  let target = null, best = Infinity;
  for (const p of map) {
    const d = Math.hypot(p.x - seen.x, p.y - seen.y);
    if ((d >= 25 || p.distance === 0) && d + p.distance < best && safeLine(seen, seen, p)) { target = p; best = d + p.distance; }
  }
  if (!target) {
    for (const p of map) {
      const d = Math.hypot(p.x - seen.x, p.y - seen.y);
      if (Number.isFinite(p.distance) && d < best && safeLine(seen, seen, p, -1)) { target = p; best = d; }
    }
  }
  if (!target) return { down: false, x: 500, y: 350 };
  const dx = target.x - seen.x - seen.vx * .18, dy = target.y - seen.y - seen.vy * .18;
  const scale = Math.max(80, Math.hypot(dx, dy));
  return { down: true, x: 500 + 300 * dx / scale, y: 350 + 250 * dy / scale };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, walls: g.walls.map(p => ({ ...p })),
    holes: g.holes.map(p => ({ ...p })), stars: g.stars.map(p => ({ ...p })) };
}
