export { STAGES } from './stages.js';
export const meta = { id: 'paddle', name: '통통 공', control: 'drag', body: false, cheerAt: null,
  how: '손가락으로 판을 움직여 공을 튕기고 블록을 깨!',
  goal: '공을 튕겨서 블록을 모두 깨!', accepts: { speed: 3, reach: 3 } };
export const difficulty = row => row.speed + 400 - row.width + row.rows * 100;
export const BALL_RADIUS = 22;
const PADDLE_TOP = 540 - BALL_RADIUS;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const reflect = x => { const width = 1000 - 2 * BALL_RADIUS, span = 2 * width; const t = ((x - BALL_RADIUS) % span + span) % span; return BALL_RADIUS + (t <= width ? t : span - t); };
export function init(row, { mods, rng }) {
  const bricks = [];
  for (let r = 0; r < row.rows; r++) for (let c = 0; c < 6; c++)
    bricks.push({ x: 95 + c * 162, y: 90 + r * 62, w: 140, h: 46, alive: true });
  return { row, mods, bricks, px: 500, pw: row.width * mods.reach,
    ball: null, wait: .7, score: 0, need: bricks.length, random: Math.floor(rng() * 4294967296) };
}
export function step(g, input, dt) {
  if (input.down && Number.isFinite(input.x))
    g.px = clamp(input.x, g.pw / 2, 1000 - g.pw / 2);
  const speed = g.row.speed * g.mods.speed;
  if (!g.ball) {
    g.wait -= dt;
    if (g.wait <= 0) {
      g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0;
      const k = (g.random / 4294967296 - .5) * .8;
      g.ball = { x: g.px, y: 500, vx: speed * k, vy: -speed * Math.sqrt(1 - k * k) };
    }
    return [];
  }
  const b = g.ball, oldX = b.x, oldY = b.y;
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (b.x < BALL_RADIUS) { b.x = 2 * BALL_RADIUS - b.x; b.vx = Math.abs(b.vx); }
  if (b.x > 1000 - BALL_RADIUS) { b.x = 2 * (1000 - BALL_RADIUS) - b.x; b.vx = -Math.abs(b.vx); }
  if (b.y < BALL_RADIUS) { b.y = 2 * BALL_RADIUS - b.y; b.vy = Math.abs(b.vy); }
  // Crossing the paddle plane avoids missing a fast ball between frames.
  if (b.vy > 0 && oldY <= PADDLE_TOP && b.y >= PADDLE_TOP) {
    const hitX = oldX + (b.x - oldX) * (PADDLE_TOP - oldY) / (b.y - oldY);
    if (Math.abs(hitX - g.px) <= g.pw / 2 + BALL_RADIUS) {
      const k = clamp((hitX - g.px) / (g.pw / 2), -.85, .85);
      b.x = hitX; b.y = PADDLE_TOP; b.vx = speed * k; b.vy = -speed * Math.sqrt(1 - k * k);
    }
  }
  for (const br of g.bricks) {
    if (!br.alive || Math.abs(b.x - br.x) > br.w / 2 + BALL_RADIUS || Math.abs(b.y - br.y) > br.h / 2 + BALL_RADIUS) continue;
    br.alive = false; g.score++;
    if (Math.abs(oldX - br.x) > br.w / 2 + BALL_RADIUS && Math.abs(oldY - br.y) <= br.h / 2 + BALL_RADIUS) b.vx *= -1;
    else b.vy *= -1;
    const events = [{ type: 'good', x: br.x, y: br.y }];
    if (g.score >= g.need) events.push({ type: 'goal' });
    return events;
  }
  if (b.y > 660) {
    const x = b.x; g.ball = null; g.wait = .7;
    return [{ type: 'bad', x, y: 640 }];
  }
  return [];
}
export function policy(seen, skill, rng) {
  const b = seen.ball;
  if (!b) return { down: true, pressed: false, x: seen.px, y: 550 };
  const x = reflect(b.x + b.vx * skill.reactMs / 1000);
  // Aim the rebound at a remaining brick, using only the delayed ball and board.
  const target = seen.bricks.find(br => br.alive);
  const dx = target ? target.x - x : 0, dy = target ? PADDLE_TOP - target.y : 400;
  const k = clamp(dx / Math.hypot(dx, dy), -.75, .75);
  const offset = b.vy > 0 ? k * seen.pw / 2 : 0;
  return { down: true, pressed: false, x: x - offset + (rng() < skill.wrongRate ? seen.pw * .3 : 0), y: 550 };
}

// Detached bot history; keep in sync with the game state shape.
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, bricks: g.bricks.map(b => ({ ...b })), ball: g.ball && { ...g.ball } };
}
