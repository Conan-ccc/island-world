export { STAGES } from './stages.js';
export const meta = { id: 'bowl', name: '와르르 볼링', control: 'drag', body: false,
  how: '아래 공을 위로 쓱 밀어서 인형 핀을 넘어뜨려!', goal: '인형 핀을 넘어뜨려!',
  accepts: { reach: 3, speed: 2, hint: 2 }, feel: ['radius'] };
export const BALL = 28, START = { x: 500, y: 600 }, LEFT = 160, RIGHT = 840;
export const difficulty = row => 100 - row.radius + row.need;
export const pinRadius = g => g.row.radius * g.mods.reach;
export const obstacleX = g => 500 + Math.sin(g.clock * .65 * g.mods.speed) * 180;
function rack(g) {
  g.pins = Array.from({ length: g.row.pins }, (_, i) => ({
    x: 250 + (i % 3) * 250, base: 250 + (i % 3) * 250,
    y: 190 - Math.floor(i / 3) * 85, down: false, fade: 0,
  }));
}
export function init(row, { mods }) {
  const g = { row, mods, ...START, vx: 0, vy: 0, drag: false, ax: 0, ay: 0,
    dx: 0, dy: 0, elapsed: 0, clock: 0, hold: 0, hits: 0, attempt: 0,
    gutter: false, bounced: false, score: 0, need: row.need };
  rack(g); return g;
}
export function step(g, input, dt) {
  g.clock += dt;
  for (const p of g.pins) {
    if (p.down) p.fade += dt;
    else p.x = p.base + (g.row.moving ? Math.sin(g.clock * .55) * 38 : 0);
  }
  if (g.hold > 0) {
    g.hold = Math.max(0, g.hold - dt);
    if (!g.hold) {
      Object.assign(g, START, { gutter: false, bounced: false, hits: 0 });
      if (g.pins.every(p => p.down)) rack(g);
      else if (g.row.bumpers) {
        const standing = g.pins.filter(p => !p.down);
        standing.forEach((p, i) => { p.x = p.base = 500 + (i - (standing.length - 1) / 2) * (2 * pinRadius(g) * .8); });
      }
    }
    if (g.hold) return [];
  }
  if (g.vy) {
    const events = [], slices = Math.max(1, Math.ceil(dt * Math.hypot(g.vx, g.vy) / 8));
    for (let i = 0; i < slices; i++) {
      g.x += g.vx * dt / slices; g.y += g.vy * dt / slices;
      if (g.x < LEFT + BALL || g.x > RIGHT - BALL) {
        if (g.row.bumpers) {
          g.x = Math.max(LEFT + BALL, Math.min(RIGHT - BALL, g.x)); g.vx *= -1;
        } else { g.gutter = true; g.x = Math.max(LEFT - 25, Math.min(RIGHT + 25, g.x)); g.vx = 0; }
      }
      if (!g.gutter && g.row.obstacle && !g.bounced && Math.hypot(g.x - obstacleX(g), g.y - 350) <= BALL + 34) {
        g.bounced = true; g.vx += (g.x < obstacleX(g) ? -1 : 1) * 180;
      }
      if (!g.gutter) for (const p of g.pins) {
        if (!p.down && Math.hypot(g.x - p.x, g.y - p.y) <= BALL + pinRadius(g)) {
          p.down = true; p.fade = 0; g.hits++; g.score++;
          events.push({ type: 'good', x: p.x, y: p.y });
          if (g.score >= g.need) { events.push({ type: 'goal' }); return events; }
        }
      }
      if (g.y < -30) {
        g.vx = 0; g.vy = 0; g.hold = .65; g.attempt++;
        if (!g.hits && !g.row.bumpers) events.push({ type: 'bad', x: g.x, y: 80 });
        break;
      }
    }
    return events;
  }
  const startX = input.pressed ? input.startX ?? input.x : input.x, startY = input.pressed ? input.startY ?? input.y : input.y;
  if ((input.pressed || input.down) && !g.drag && Math.hypot(startX - g.x, startY - g.y) <= 70) {
    g.drag = true; g.ax = startX; g.ay = startY; g.elapsed = 0;
  }
  if (g.drag) {
    g.elapsed += dt;
    if (input.down) { g.dx = input.x - g.ax; g.dy = input.y - g.ay; }
    else {
      g.drag = false;
      if (Number.isFinite(input.startX)) { g.dx = input.x - g.ax; g.dy = input.y - g.ay; }
      if (g.dy < -20) {
        const speed = Math.max(260, Math.min(620, Math.hypot(g.dx, g.dy) / g.elapsed));
        const angle = Math.max(-.85, Math.min(.85, Math.atan2(g.dx, -g.dy)));
        g.vx = Math.sin(angle) * speed; g.vy = -Math.cos(angle) * speed;
        return [{ type: 'sound', name: 'tap' }];
      }
      g.dx = 0; g.dy = 0;
    }
  }
  return [];
}
const gestures = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { x: 500, y: 600, down: false, pressed: false };
  let a = gestures.get(rng);
  if (!a || seen.attempt > a.attempt) {
    if (seen.vy || seen.hold) return idle;
    // Aim at an observed standing pin; own gesture memory never reads live state.
    const p = seen.pins.filter(p => !p.down).sort((a, b) => Math.abs(b.x - 500) - Math.abs(a.x - 500))[0];
    if (!p) return idle;
    const flight = (600 - p.y) / 450 + skill.reactMs / 1000;
    const targetX = seen.row.moving ? p.base + Math.sin((seen.clock + flight) * .55) * 38 : p.x;
    const crossing = 500 + (targetX - 500) * 250 / (600 - p.y);
    if (seen.row.obstacle && Math.abs(crossing - (500 + Math.sin((seen.clock + .6 + skill.reactMs / 1000) * .65 * seen.mods.speed) * 180)) < 85) return idle;
    const error = (rng() * 2 - 1) * skill.jitterMs * .4;
    a = { attempt: seen.attempt, dx: (targetX + error - 500) * 180 / (600 - p.y), frame: 0 };
    gestures.set(rng, a); return { ...idle, down: true, pressed: true };
  }
  if (++a.frame > 22) return idle;
  return { ...idle, down: true, x: 500 + a.dx * a.frame / 22, y: 600 - 180 * a.frame / 22 };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods }, pins: g.pins.map(p => ({ ...p })) }; }
