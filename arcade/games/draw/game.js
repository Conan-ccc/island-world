export { STAGES } from './stages.js';
export const meta = { id: 'draw', name: '무지개 길', control: 'drag', body: false, cheerAt: null,
  how: '손가락으로 길을 그려 공을 바구니에 넣어!', goal: '무지개 길로 공을 바구니에 모아!',
  accepts: { hint: 3, reach: 2, speed: 2 }, feel: ['width', 'ink', 'speed', 'every'] };
export const RADIUS = 18;
export const FLOOR = 590;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const difficulty = r => r.speed + 1000 / r.every + 1000 - r.width - r.ink;
function random(g) {
  g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0;
  return g.random / 4294967296;
}
function target(g) {
  g.age = 0;
  g.basket = g.row.move ? (random(g) < .5 ? 280 : 720) : 650;
  g.wind = g.row.wind ? (g.basket < 500 ? -1 : 1) * g.row.wind : 0;
}
export function init(row, { mods, rng }) {
  const g = { row, mods, path: [], ink: row.ink, drawing: false, ball: null, launched: false,
    elapsed: 0, score: 0, need: row.need, basket: 650, wind: 0,
    clouds: row.cloud ? [{ x: 175, y: 355, w: 150, h: 32 }, { x: 825, y: 355, w: 150, h: 32 }] : [],
    random: Math.floor(rng() * 4294967296) };
  target(g); return g;
}
export function step(g, input, dt) {
  const down = !!input.down && Number.isFinite(input.x) && Number.isFinite(input.y);
  if (down) {
    const p = { x: clamp(input.x, 30, 970), y: clamp(input.y, 190, 570) };
    if (!g.drawing || input.pressed) {
      g.path = [p]; g.ink = g.row.ink;
      if (g.ball) { g.ball.rail = -1; g.ball.skipFrom = g.ball.skipTo = -2; }
    } else {
      const last = g.path.at(-1);
      if (p.y < last.y && p.y >= last.y - 3) p.y = last.y;
      const distance = Math.hypot(p.x - last.x, p.y - last.y);
      if (distance >= 4 && g.ink > 0) {
        const length = Math.min(distance, g.ink);
        g.path.push({ x: last.x + (p.x - last.x) * length / distance, y: last.y + (p.y - last.y) * length / distance });
        g.ink = Math.max(0, g.ink - length);
      }
    }
  }
  g.drawing = down;
  g.elapsed += dt; g.age += dt;
  // The first five boards wait for an actual stroke before releasing the first candy.
  if (!g.ball && (g.row.move || g.path.length > 1) && g.elapsed >= g.row.every) {
    g.ball = { x: 500, y: 145, vx: 0, vy: 0, rail: -1, dir: 1 }; g.elapsed = 0; g.launched = true;
  }
  const b = g.ball;
  if (!b) return [];
  const speed = g.row.speed * g.mods.speed;
  if (b.anchorX === undefined || Math.hypot(b.x - b.anchorX, b.y - b.anchorY) > RADIUS * 2) {
    b.anchorX = b.x; b.anchorY = b.y; b.still = 0;
  } else b.still = (b.still ?? 0) + dt;
  if (b.still > 2) {
    b.released = true; b.rail = -1; b.skipFrom = 0; b.skipTo = g.path.length; b.vy = Math.max(80, b.vy);
  }
  // Small physics steps keep fast candy from tunnelling through a drawn segment.
  const steps = Math.max(1, Math.ceil(dt / (1 / 120))), h = dt / steps;
  for (let k = 0; k < steps; k++) {
    const oldY = b.y;
    if (b.rail >= 0 && g.path[b.rail + 1]) {
      const dir = b.dir ?? 1;
      const a = g.path[b.rail + (dir < 0 ? 1 : 0)], end = g.path[b.rail + (dir > 0 ? 1 : 0)];
      const length = Math.hypot(end.x - a.x, end.y - a.y);
      const distance = Math.hypot(end.x - b.x, end.y - RADIUS - 6 - b.y);
      if (distance <= speed * h) {
        b.x = end.x; b.y = end.y - RADIUS - 6;
        const previousRail = b.rail;
        b.rail += dir;
        const next = g.path[b.rail + (dir > 0 ? 1 : 0)];
        if (b.rail < 0 || !next || next.y < end.y) { b.released = !!next; b.skipFrom = previousRail - 1; b.skipTo = previousRail + 1; b.rail = -1; b.vx = (end.x - a.x) / length * 28; b.vy = 35; }
      } else {
        b.x += (end.x - a.x) / length * speed * h; b.y += (end.y - a.y) / length * speed * h;
      }
    } else {
      b.rail = -1;
      b.vx += g.wind * h; b.vy += 410 * g.mods.speed * g.mods.speed * h;
      b.x += b.vx * h; b.y += b.vy * h;
      if (b.vy > 0) for (let i = 0; i < g.path.length - 1; i++) {
        if (i >= b.skipFrom && i <= b.skipTo) continue;
        const a = g.path[i], end = g.path[i + 1];
        const vertical = Math.abs(end.x - a.x) < 1;
        if (vertical && Math.abs(b.x - a.x) > RADIUS + 6) continue;
        const t = vertical ? (end.y >= a.y ? 0 : 1) : (b.x - a.x) / (end.x - a.x);
        const surface = a.y + t * (end.y - a.y) - RADIUS - 6;
        if (t >= 0 && t <= 1 && oldY <= surface + 1 && b.y >= surface) {
          if (vertical) b.x = a.x;
          b.released = false; b.y = surface; b.rail = i; b.dir = end.y >= a.y ? 1 : -1; b.vx = 0; b.vy = 0; break;
        }
      }
    }
    for (const c of g.clouds) {
      if (b.y > oldY && oldY + RADIUS <= c.y && b.y + RADIUS >= c.y && Math.abs(b.x - c.x) <= c.w / 2 + RADIUS) {
        b.y = c.y - RADIUS; b.vy = -Math.max(Math.abs(b.vy), speed) * .55;
        b.vx += b.x < c.x ? -65 : 65; b.rail = -1;
      }
    }
    if (b.y + RADIUS >= FLOOR) {
      const caught = Math.abs(b.x - g.basket) <= g.row.width * g.mods.reach / 2 - RADIUS;
      const events = caught || g.row.move ? [{ type: caught ? 'good' : 'bad', x: b.x, y: FLOOR }] : [];
      if (caught) g.score++;
      g.ball = null; target(g);
      if (g.score >= g.need) events.push({ type: 'goal' });
      return events;
    }
  }
  return [];
}
export function policy(seen, skill, rng) {
  // Each observed round begins with a new stroke. Holding the endpoint avoids
  // turning delayed release snapshots into extra, unintended strokes.
  if (seen.age < .65) return { down: true, pressed: true, x: 500, y: 235 };
  const error = seen.mods.hint ? 0 : Math.sin(seen.basket + seen.score * 13) * skill.wrongRate * 500;
  return { down: true, x: seen.basket + error, y: 525 };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, path: g.path.map(p => ({ ...p })),
    clouds: g.clouds.map(c => ({ ...c })), ball: g.ball && { ...g.ball } };
}
