export { STAGES } from './stages.js';
export const meta = { id: 'trace', name: '구불구불 길', control: 'drag', body: true,
  how: '친구를 잡고 노란 길을 따라 끝까지 끌어!', goal: '친구와 길 끝까지 가자!',
  accepts: { reach: 3, time: 2 } };
export const START = 90, END = 910, MOVE_SPEED = 180, GRAB = 90;
export const difficulty = row => row.amp + row.segs * 30 + row.need * 10 - row.width;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function pathY(g, x) {
  const t = clamp((x - START) / (END - START), 0, 1) * g.row.segs;
  const i = Math.min(g.row.segs - 1, Math.floor(t)), f = (1 - Math.cos((t - i) * Math.PI)) / 2;
  return g.heights[i] + (g.heights[i + 1] - g.heights[i]) * f;
}
export function onPath(g, x, y) {
  const radius = g.row.width * g.mods.reach / 2;
  // Same 8px polyline and round caps as the view; test only nearby segments.
  const from = Math.max(START, START + Math.floor((x - radius - START) / 8) * 8);
  const to = Math.min(END, x + radius);
  for (let a = from; a <= to; a += 8) {
    const b = Math.min(END, a + 8), ay = pathY(g, a), by = pathY(g, b);
    const dx = b - a, dy = by - ay;
    const t = clamp(((x - a) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1);
    if (Math.hypot(x - a - dx * t, y - ay - dy * t) <= radius) return true;
  }
  return false;
}
function deal(g) {
  g.heights = Array.from({ length: g.row.segs + 1 }, (_, i) => i ? 330 + (i % 2 ? 1 : -1) * (.45 + random(g) * .55) * g.row.amp : 330);
  g.x = START; g.y = 330; g.cp = START; g.hold = false; g.round++;
}
export function init(row, { mods, rng }) {
  const g = { row, mods, random: Math.floor(rng() * 4294967296), heights: [], x: START, y: 330,
    cp: START, hold: false, round: 0, score: 0, need: row.need,
    remaining: row.time ? row.time * mods.time : null };
  deal(g); return g;
}
function reset(g) { g.x = g.cp; g.y = pathY(g, g.cp); g.hold = false; }
export function step(g, input, dt) {
  const events = [];
  if (!input.down) g.hold = false;
  const valid = Number.isFinite(input.x) && Number.isFinite(input.y);
  if (input.down && input.pressed && !g.hold && valid && Math.hypot(input.x - g.x, input.y - g.y) <= GRAB) {
    g.hold = true; events.push({ type: 'sound', name: 'tap' });
  }
  if (g.hold && valid) {
    const tx = clamp(input.x, 0, 1000), ty = clamp(input.y, 0, 700);
    const dx = tx - g.x, dy = ty - g.y, length = Math.hypot(dx, dy);
    const fraction = length ? Math.min(1, MOVE_SPEED * dt / length) : 0;
    const x = g.x + dx * fraction, y = g.y + dy * fraction;
    // The cursor travels at a bounded speed, so a far pointer cannot skip bends.
    if (!onPath(g, x, y)) {
      events.push({ type: 'bad', x, y }); reset(g);
    } else {
      g.x = x; g.y = y;
      const quarter = (END - START) / 4;
      g.cp = Math.max(g.cp, START + Math.floor(clamp((x - START) / quarter, 0, 3)) * quarter);
      if (x >= END - 4 && Math.abs(y - pathY(g, END)) <= g.row.width * g.mods.reach / 2) {
        g.score++; events.push({ type: 'good', x: END, y: pathY(g, END) });
        if (g.score >= g.need) { events.push({ type: 'goal' }); return events; }
        deal(g);
      }
    }
  }
  if (g.remaining !== null) {
    g.remaining -= dt;
    if (g.remaining <= 0) {
      reset(g); g.remaining = g.row.time * g.mods.time;
      events.push({ type: 'timeout' });
    }
  }
  return events;
}
export function policy(seen, skill) {
  if (!seen.hold) return { down: true, pressed: true, x: seen.x, y: seen.y };
  // A delayed hand aims farther ahead; chords cut tight bends, as a real drag can.
  const x = Math.min(END, seen.x + MOVE_SPEED * skill.reactMs / 1000 + 8);
  return { down: true, pressed: false, x, y: pathY(seen, x) };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods }, heights: [...g.heights] }; }
