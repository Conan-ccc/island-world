import { round } from '../../content.js';
export { STAGES } from './stages.js';
export const meta = { id: 'aim', name: '물방울 쏘기', control: 'tap', body: true, ask: '이걸 맞혀!',
  how: '맞는 글자 쪽을 눌러 물방울을 쏴!',
  accepts: { speed: 3, reach: 3, hint: 2, fewer: 2, time: 2 } };
export const difficulty = row => row.speed + row.need * 10 + row.badShare * 100 + row.count * 10;
export const SHOT_SPEED = 1000;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const reflect = x => { const t = ((x - 70) % 1720 + 1720) % 1720; return 70 + (t <= 860 ? t : 1720 - t); };
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function spawn(g, slot, initial = false) {
  const good = !g.targets.some(t => t.good) || random(g) >= g.row.badShare * (1 - g.mods.fewer);
  const tokens = good ? g.question.good : g.question.bad;
  g.targets.push({ id: ++g.serial, slot, x: initial ? 160 + slot % 2 * 680 : (random(g) < .5 ? 70 : 930),
    y: 160 + Math.floor(slot / 2) * 130, vx: (random(g) < .5 ? -1 : 1) * g.row.speed * (.8 + random(g) * .4),
    good, token: tokens[Math.floor(random(g) * tokens.length)] ?? g.question.good[0] });
}
export function init(row, { mods, content, rng }) {
  const question = round(content, row.tier, rng, meta.ask);
  const g = { row, mods, question, targets: [], shot: null, cool: 0, serial: 0, score: 0, need: row.need,
    remaining: row.time ? row.time * mods.time : null, random: Math.floor(rng() * 4294967296) };
  for (let i = 0; i < row.count; i++) spawn(g, i, true);
  return g;
}
export function step(g, input, dt) {
  const events = [];
  for (const t of g.targets) {
    t.x += t.vx * g.mods.speed * dt;
    if (t.x < 70) { t.x = 140 - t.x; t.vx = Math.abs(t.vx); }
    if (t.x > 930) { t.x = 1860 - t.x; t.vx = -Math.abs(t.vx); }
  }
  g.cool = Math.max(0, g.cool - dt);
  if (input.pressed && !g.shot && g.cool <= 0 && Number.isFinite(input.x) && Number.isFinite(input.y)) {
    const dx = clamp(input.x, 0, 1000) - 500, dy = clamp(input.y, 0, 470) - 570, length = Math.hypot(dx, dy);
    g.shot = { x: 500, y: 570, vx: dx / length * SHOT_SPEED, vy: dy / length * SHOT_SPEED }; g.cool = g.row.cool;
  }
  const s = g.shot;
  if (s) {
    s.x += s.vx * dt; s.y += s.vy * dt;
    const hit = g.targets.find(t => Math.hypot(t.x - s.x, t.y - s.y) <= 54 * g.mods.reach);
    if (hit) {
      g.targets.splice(g.targets.indexOf(hit), 1); g.shot = null;
      if (hit.good) g.score++;
      events.push({ type: hit.good ? 'good' : 'bad', x: hit.x, y: hit.y });
      if (g.score >= g.need) { events.push({ type: 'goal' }); return events; }
      spawn(g, hit.slot);
    } else if (s.y < -20 || s.x < -20 || s.x > 1020) g.shot = null;
  }
  if (g.remaining !== null) {
    g.remaining -= dt;
    if (g.remaining <= 0) { events.push({ type: 'timeout' }); g.remaining = g.row.time * g.mods.time; g.shot = null; }
  }
  return events;
}
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 300 };
  if (seen.shot || seen.cool > 0) return idle;
  const good = seen.targets.filter(t => t.good).sort((a, b) => b.y - a.y);
  for (const t of good) {
    // Predict only from the delayed snapshot, including flight time and wall bounces.
    let x = t.x;
    for (let i = 0; i < 3; i++) {
      const flight = Math.hypot(x - 500, t.y - 570) / SHOT_SPEED;
      x = reflect(t.x + t.vx * seen.mods.speed * (skill.reactMs / 1000 + flight));
    }
    const flight = Math.hypot(x - 500, t.y - 570) / SHOT_SPEED;
    const blocked = seen.targets.some(other => {
      if (other.good || other.y < t.y) return false;
      const ratio = (570 - other.y) / (570 - t.y);
      const ox = reflect(other.x + other.vx * seen.mods.speed * (skill.reactMs / 1000 + flight * ratio));
      return Math.abs(ox - (500 + (x - 500) * ratio)) < 75 * seen.mods.reach;
    });
    if (blocked) continue;
    const error = rng() < skill.wrongRate ? (rng() - .5) * 180 : 0;
    return { down: true, pressed: true, x: x + error, y: t.y };
  }
  return idle;
}

// Detached bot history; keep in sync with the game state shape.
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, question: copyQuestion(g.question), targets: g.targets.map(t => ({ ...t, token: { ...t.token } })), shot: g.shot && { ...g.shot } };
}
function copyQuestion(q) {
  return { ...q, ask: { ...q.ask }, good: q.good.map(t => ({ ...t })), bad: q.bad.map(t => ({ ...t })) };
}
