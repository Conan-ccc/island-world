import { round } from '../../content.js';
export { STAGES } from './stages.js';
export const meta = { id: 'run', name: '숲길 달리기', control: 'tap', body: true, ask: '이걸 모아!',
  how: '눌러서 뛰어. 돌과 구덩이는 넘고, 맞는 글자만 모아!',
  accepts: { jump: 3, speed: 3, small: 3, magnet: 2, hint: 1, fewer: 2 } };
export const difficulty = row => row.speed + row.need * 10 + row.obstacles * 100;
export function init(row, { mods, content, rng }) {
  const question = round(content, row.tier, rng, meta.ask);
  return { row, mods, question, score: 0, need: row.need, distance: 0, end: row.length,
    y: 0, vy: 0, jumps: 0, objects: [], next: 0, serial: 0,
    random: Math.floor(rng() * 4294967296), elapsed: 0, remaining: row.time ? row.time * mods.time : null };
}
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function spawn(g) {
  const rock = random(g) < g.row.obstacles * (1 - g.mods.fewer);
  const bad = !rock && random(g) < g.row.badShare * (1 - g.mods.fewer);
  const kind = rock ? (random(g) < .25 ? 'pit' : 'rock') : 'token';
  const tokens = bad ? g.question.bad : g.question.good;
  g.objects.push({ id: ++g.serial, x: 1060, kind, good: !bad, h: 150,
    token: tokens[Math.floor(random(g) * tokens.length)] ?? g.question.good[0], hit: false });
}
export function step(g, input, dt) {
  const events = [];
  if (input.pressed && (g.y === 0 || (g.mods.jump && g.jumps < 2))) {
    g.vy = 780; g.jumps++; if (g.jumps === 2) events.push({ type: 'ability', ability: 'jump' });
  }
  g.y += g.vy * dt;
  g.vy -= (g.mods.jump && g.vy < 0 ? 1050 : 1800) * dt;
  if (g.y <= 0) { g.y = 0; g.vy = 0; g.jumps = 0; }
  const travel = g.row.speed * g.mods.speed * dt;
  g.distance += travel; g.elapsed += dt; g.next -= travel;
  if (g.next <= 0) { spawn(g); g.next += g.row.gapMin * (1 + random(g) * .25); }
  for (const o of g.objects) {
    o.x -= travel;
    if (o.hit) continue;
    const dx = Math.abs(o.x - 200);
    if (o.kind !== 'token') {
      if (dx < 32 + 22 * g.mods.small && g.y < (o.kind === 'pit' ? 30 : 60 * g.mods.small)) {
        o.hit = true; events.push({ type: 'bad', x: 200, y: 580 });
      }
    } else {
      if (g.mods.magnet && o.good && dx < 240) o.h += Math.sign(g.y + 40 - o.h) * Math.min(Math.abs(g.y + 40 - o.h), 440 * dt);
      if (dx < 50 && Math.abs(g.y + 40 - o.h) < 65) {
        o.hit = true;
        if (o.good) g.score++;
        events.push({ type: o.good ? 'good' : 'bad', x: o.x, y: 580 - o.h });
      }
    }
  }
  g.objects = g.objects.filter(o => o.x > -80);
  if (g.remaining !== null) {
    g.remaining -= dt;
    if (g.remaining <= 0) { events.push({ type: 'timeout' }); g.remaining = g.row.time * g.mods.time; }
  }
  if (g.distance >= g.end) {
    if (g.score >= g.need) events.push({ type: 'goal' });
    else g.end += g.row.length;
  }
  return events;
}
export function policy(seen, skill, rng) {
  const o = seen.objects.find(o => !o.hit && o.x > 150);
  let pressed = false;
  if (o) {
    const wanted = o.kind !== 'token' || o.good;
    const speed = seen.row.speed * seen.mods.speed;
    const cue = skill.reactMs > 400 ? 260 : speed * .58;
    if (o.x - 200 < cue && (seen.y === 0 || (seen.mods.jump && seen.jumps === 1 && seen.vy < 0))) {
      pressed = wanted ? rng() >= skill.wrongRate : rng() < skill.wrongRate / 60;
    }
  }
  return { down: pressed, pressed, x: 200, y: 500 };
}

// Detached bot history; keep in sync with the game state shape.
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, question: copyQuestion(g.question), objects: g.objects.map(o => ({ ...o, token: { ...o.token } })) };
}
function copyQuestion(q) {
  return { ...q, ask: { ...q.ask }, good: q.good.map(t => ({ ...t })), bad: q.bad.map(t => ({ ...t })) };
}
