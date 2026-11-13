export { STAGES } from './stages.js';
export const meta = { id: 'float', name: '풍선 여행', control: 'hold', body: true,
  how: '누르고 있으면 올라가고, 떼면 내려와. 구름 사이를 지나가!',
  goal: '구름 사이를 지나가!', accepts: { speed: 2, reach: 3, small: 3 } };
export const difficulty = row => row.speed + row.lift + row.need * 10 + 700 - row.gap;
export function init(row, { mods, rng }) {
  return { row, mods, y: 350, vy: 0, down: false, score: 0, need: row.need,
    walls: [], next: 180, distance: 0, serial: 0, random: Math.floor(rng() * 4294967296) };
}
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function step(g, input, dt) {
  const events = [], speed = g.row.speed * g.mods.speed;
  g.down = !!input.down;
  const lift = g.row.lift * g.mods.speed;
  g.vy += (g.down ? -1 : 1) * lift * 5 * g.mods.speed * dt;
  g.vy = Math.max(-lift, Math.min(lift, g.vy));
  g.y += g.vy * dt;
  if (g.y < 60) { g.y = 60; g.vy = 0; }
  if (g.y > 640) { g.y = 640; g.vy = 0; }
  g.distance += speed * dt; g.next -= speed * dt;
  const gap = Math.min(580, g.row.gap * g.mods.reach);
  if (g.next <= 0) {
    const range = Math.min(g.row.spread, (640 - gap) / 2);
    g.walls.push({ id: ++g.serial, x: 1080, y: 350 + (random(g) * 2 - 1) * range, gap, done: false, hit: false });
    g.next += g.row.spacing;
  }
  const radius = 30 * g.mods.small;
  for (const w of g.walls) {
    w.x -= speed * dt;
    if (w.done) continue;
    if (Math.abs(w.x - 220) < 38 + radius && Math.abs(g.y - w.y) + radius > w.gap / 2) {
      w.done = w.hit = true; events.push({ type: 'bad', x: 220, y: g.y });
    } else if (w.x + 38 < 220 - radius) {
      w.done = true; g.score++;
      events.push({ type: 'good', x: 220, y: g.y });
      if (g.score >= g.need) { events.push({ type: 'goal' }); break; }
    }
  }
  g.walls = g.walls.filter(w => w.x > -80);
  return events;
}
export function policy(seen, skill, rng) {
  const wall = seen.walls.find(w => !w.done && w.x + 38 >= 220 - 30 * seen.mods.small);
  const target = wall?.y ?? 350;
  // Predict from the delayed observation only; no live state or future walls.
  const projected = seen.y + seen.vy * (skill.reactMs / 1000 + .1);
  let down = projected > target;
  if (rng() < skill.wrongRate) down = !down;
  return { down, pressed: false, x: 220, y: 350 };
}

// Detached bot history; keep in sync with the game state shape.
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, walls: g.walls.map(w => ({ ...w })) };
}
