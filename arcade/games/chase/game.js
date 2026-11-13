export { STAGES } from './stages.js';
export const meta = { id: 'chase', name: '별 따라잡기', control: 'drag', body: true,
  how: '친구가 손가락을 따라와. 별을 모으고 구름 도깨비는 피해!', goal: '별을 모으고 구름 도깨비는 피해!',
  feel: ['speed'], accepts: { speed: 3, reach: 2, small: 3, magnet: 2, fewer: 2 } };
export const MOVE = 460, BOUNDS = { left: 60, right: 940, top: 100, bottom: 560 };
export const difficulty = row => row.speed + row.foes * 30 + row.need;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function star(g) {
  // A distant target prevents instant repeated scoring; keep it clear of moving hazards.
  let best = null, bestDistance = -1;
  for (let i = 0; i < 24; i++) {
    const p = { x: 120 + random(g) * 760, y: 150 + random(g) * 360 };
    const distance = Math.min(Math.hypot(p.x - g.x, p.y - g.y), ...g.foes.map(f => Math.hypot(p.x - f.x, p.y - f.y) + 160));
    if (distance > bestDistance) { best = p; bestDistance = distance; }
    if (distance >= (g.need === 10 ? 420 : 330)) break;
  }
  g.star = best;
}
export function init(row, { mods, rng }) {
  const g = { row, mods, x: 500, y: 330, vx: 0, vy: 0, star: null, foes: [], safe: 1.3,
    score: 0, need: row.need, random: Math.floor(rng() * 4294967296) };
  const count = Math.max(1, Math.ceil(row.foes * (1 - mods.fewer)));
  for (let i = 0; i < count; i++) {
    const angle = random(g) * Math.PI * 2;
    g.foes.push({ x: 100 + random(g) * 800, y: i % 2 ? 110 : 550,
      vx: Math.cos(angle) * row.speed, vy: Math.sin(angle) * row.speed });
  }
  star(g); return g;
}
export function bounce(p, dt) {
  p.x += p.vx * dt; p.y += p.vy * dt;
  for (const [key, v, min, max] of [['x', 'vx', BOUNDS.left, BOUNDS.right], ['y', 'vy', BOUNDS.top, BOUNDS.bottom]]) {
    // Reflect overshoot as well as velocity, including more than one crossing.
    while (p[key] < min || p[key] > max) {
      if (p[key] < min) { p[key] = min * 2 - p[key]; p[v] = Math.abs(p[v]); }
      if (p[key] > max) { p[key] = max * 2 - p[key]; p[v] = -Math.abs(p[v]); }
    }
  }
}
export function step(g, input, dt) {
  const events = []; g.safe = Math.max(0, g.safe - dt); g.vx = 0; g.vy = 0;
  if (input.down && Number.isFinite(input.x) && Number.isFinite(input.y)) {
    const dx = clamp(input.x, BOUNDS.left, BOUNDS.right) - g.x, dy = clamp(input.y - 70, BOUNDS.top, BOUNDS.bottom) - g.y;
    const d = Math.hypot(dx, dy), travel = Math.min(d, MOVE * dt);
    if (d > 0) { g.x += dx / d * travel; g.y += dy / d * travel; if (dt > 0) { g.vx = dx / d * travel / dt; g.vy = dy / d * travel / dt; } }
  }
  for (const f of g.foes) bounce(f, dt * g.mods.speed);
  if (g.safe <= 0 && g.foes.some(f => Math.hypot(f.x - g.x, f.y - g.y) <= 32 + 30 * g.mods.small)) {
    g.safe = 1.3; events.push({ type: 'bad', x: g.x, y: g.y });
  }
  if (g.mods.magnet) {
    const dx = g.x - g.star.x, dy = g.y - g.star.y, d = Math.hypot(dx, dy);
    if (d > 0 && d < 260) { const move = Math.min(d, 160 * dt); g.star.x += dx / d * move; g.star.y += dy / d * move; }
  }
  if (Math.hypot(g.x - g.star.x, g.y - g.star.y) <= 62 * g.mods.reach) {
    g.score++; events.push({ type: 'good', x: g.star.x, y: g.star.y });
    if (g.score >= g.need) events.push({ type: 'goal' });
    else star(g);
  }
  return events;
}
const hands = new WeakMap();
export function policy(seen, skill, rng) {
  // Estimate only from the delayed observation. Candidate routes sample the next half-second.
  const delay = skill.reactMs / 1000;
  let hand = hands.get(rng);
  if (!hand) { hand = { x: seen.x, y: seen.y }; hands.set(rng, hand); }
  const { x, y } = hand;
  const foes = seen.foes.map(f => { const p = { ...f }; bounce(p, delay * seen.mods.speed); return p; });
  const heading = Math.atan2(seen.star.y - y, seen.star.x - x);
  let best = null, bestCost = Infinity;
  for (let i = 0; i < 9; i++) {
    const angle = heading + (i === 8 ? 0 : (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 4);
    const length = i === 8 ? 0 : Math.min(180, Math.hypot(seen.star.x - x, seen.star.y - y));
    const tx = clamp(x + Math.cos(angle) * length, BOUNDS.left, BOUNDS.right);
    const ty = clamp(y + Math.sin(angle) * length, BOUNDS.top, BOUNDS.bottom);
    let cost = Math.hypot(tx - seen.star.x, ty - seen.star.y);
    for (const f of foes) {
      const p = { ...f };
      for (let j = 1; j <= 4; j++) {
        bounce(p, .1 * seen.mods.speed);
        const d = Math.hypot(x + (tx - x) * j / 4 - p.x, y + (ty - y) * j / 4 - p.y);
        cost += Math.max(0, 100 - d) * 18;
      }
    }
    if (cost < bestCost) { bestCost = cost; best = { x: tx, y: ty }; }
  }
  // Integrate the bot's own intended movement, never read the live player state.
  const dx = best.x - x, dy = best.y - y, distance = Math.hypot(dx, dy);
  if (distance > 0) { const move = Math.min(distance, MOVE / 60); hand.x += dx / distance * move; hand.y += dy / distance * move; }
  return { down: true, pressed: false, x: best.x, y: best.y + 70 };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods }, star: { ...g.star }, foes: g.foes.map(f => ({ ...f })) }; }
