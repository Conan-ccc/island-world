export { STAGES } from './stages.js';
export const meta = { id: 'slide', name: '미끌 얼음 퍼즐', control: 'drag', body: true, cheerAt: null,
  how: '손가락으로 쓱 밀어서 별을 모두 모아 줘!', goal: '미끄러져서 별을 모두 모아 줘!',
  accepts: { hint: 3, fewer: 2, time: 2 }, feel: ['glide'] };
export const difficulty = r => r.level;
export const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
export function layout(g) { const size = Math.max(78, 490 / g.row.size); return { size, x: (1000 - size * g.row.size) / 2, y: 65 }; }
export function center(g, i) { const b = layout(g); return { x: b.x + (i % g.row.size + .5) * b.size, y: b.y + (Math.floor(i / g.row.size) + .5) * b.size }; }
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
// The renderer, human swipes and BFS all share this cell traversal.
export function travel(g, pos, mask, dir) {
  const cells = []; let hole = false;
  while (true) {
    const x = pos % g.row.size + DX[dir], y = Math.floor(pos / g.row.size) + DY[dir];
    if (x < 0 || y < 0 || x >= g.row.size || y >= g.row.size) break;
    const next = y * g.row.size + x;
    if (g.rocks.includes(next)) break;
    pos = next; cells.push(pos);
    if (g.holes.includes(pos)) { hole = true; break; }
    const star = g.stars.indexOf(pos); if (star >= 0) mask |= 1 << star;
  }
  return { pos, mask, cells, hole };
}
export function solve(g) {
  const full = (1 << g.stars.length) - 1, queue = [{ pos: g.pos, mask: g.mask, route: [] }], seen = new Set([`${g.pos}:${g.mask}`]);
  for (let q = 0; q < queue.length; q++) {
    const a = queue[q]; if (a.mask === full) return a.route;
    for (let d = 0; d < 4; d++) {
      const b = travel(g, a.pos, a.mask, d), key = `${b.pos}:${b.mask}`;
      if (b.hole || seen.has(key)) continue;
      seen.add(key); queue.push({ pos: b.pos, mask: b.mask, route: [...a.route, d] });
    }
  }
  return null;
}
function restart(g) { g.pos = g.start; g.mask = 0; g.moves = (g.budget ?? g.row.moves) + (g.mods.time > 1 ? 2 : 0); g.queued = null; g.anchor = null; g.motion = null; g.serial++; }
function board(g) {
  const count = g.row.size ** 2;
  // Rejection sampling keeps only puzzles whose visible shortest path fits the move budget.
  for (let attempt = 0; attempt < 8000; attempt++) {
    const cells = Array.from({ length: count }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(random(g) * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
    g.start = cells.pop(); g.rocks = cells.splice(0, g.row.rocks); g.holes = cells.splice(0, g.row.holes); g.stars = cells.splice(0, g.row.stars);
    restart(g); const route = solve(g);
    if (route && route.length >= g.row.depth && route.length <= g.row.depth + (g.row.level >= 6 && g.row.level <= 10 ? 0 : 1)) break;
    if (attempt === 7999) {
      // Guaranteed two-swipe perimeter puzzle if a seeded search is exhausted.
      g.start = 0; g.rocks = [g.row.size + 1]; g.holes = []; g.stars = [count - 1]; restart(g);
    }
  }
  if (g.mods.fewer) g.holes = g.holes.slice(0, Math.floor(g.holes.length * (1 - g.mods.fewer)));
  g.budget = solve(g).length + (g.row.level <= 10 ? 2 : 1);
  g.moves = g.budget + (g.mods.time > 1 ? 2 : 0);
  g.round++; g.won = false;
}
export function init(row, { mods, rng }) {
  const g = { row, mods, score: 0, need: row.need, random: Math.floor(rng() * 4294967296), round: 0, serial: 0,
    pos: 0, mask: 0, start: 0, rocks: [], holes: [], stars: [], anchor: null, motion: null, rest: 0, won: false, elapsed: 0 };
  board(g); return g;
}
function finish(g, events) {
  if (g.motion.hole) { events.push({ type: 'bad', ...center(g, g.pos) }); g.rest = .8; }
  else if (g.mask === (1 << g.stars.length) - 1) {
    g.score++; g.won = true; g.rest = 1;
    events.push({ type: 'good', ...center(g, g.pos) }); if (g.score >= g.need) events.push({ type: 'goal' });
  } else if (g.row.limited && g.moves <= 0) { events.push({ type: 'bad', ...center(g, g.pos) }); g.rest = .8; }
  g.motion = null; g.serial++;
  if (!g.rest && solve(g) === null) { if (g.row.limited) events.push({ type: 'bad', ...center(g, g.pos) }); g.rest = .8; }
}
export function step(g, input, dt) {
  g.elapsed += dt; const events = [];
  if (input.pressed && Number.isFinite(input.x) && Number.isFinite(input.y)) {
    g.anchor = { x: input.startX ?? input.x, y: input.startY ?? input.y };
  }
  if (g.anchor) {
    const dx = input.x - g.anchor.x, dy = input.y - g.anchor.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= 12) {
      g.queued = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
      g.anchor = null;
    } else if (!input.down) g.anchor = null;
  }
  if (g.rest) {
    g.rest = Math.max(0, g.rest - dt);
    if (g.rest) return events;
    const queued = g.queued, anchor = g.anchor;
    if (g.won) board(g); else restart(g);
    g.queued = queued; g.anchor = anchor;
  }
  if (g.motion) {
    const m = g.motion; m.t = Math.min(m.duration, m.t + dt);
    const passed = Math.min(m.cells.length, Math.floor(m.t / m.duration * m.cells.length));
    for (let k = m.passed; k < passed; k++) { const star = g.stars.indexOf(m.cells[k]); if (star >= 0) g.mask |= 1 << star; }
    m.passed = passed;
    if (m.t >= m.duration) { g.pos = m.to; finish(g, events); }
    return events;
  }
  if (g.queued !== null) {
    const dir = g.queued, next = travel(g, g.pos, g.mask, dir); g.queued = null; g.serial++;
    if (next.cells.length) {
      g.moves--;
      g.motion = { from: g.pos, to: next.pos, cells: next.cells, hole: next.hole, t: 0, passed: 0, duration: Math.max(.45, next.cells.length * g.row.glide) };
      events.push({ type: 'sound', name: 'tap' });
    }
  }
  return events;
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 350 }, last = actions.get(rng);
  if (last?.release) { last.release = false; return { ...idle, x: 500 + DX[last.dir] * 80, y: 350 + DY[last.dir] * 80 }; }
  if (seen.rest || seen.motion || (last && (seen.serial <= last.serial || seen.elapsed < last.until))) return idle;
  const route = solve(seen); if (route?.length === 0) return idle;
  const dir = rng() < skill.wrongRate && !seen.mods.hint ? Math.floor(rng() * 4) : route?.[0] ?? 0;
  actions.set(rng, { serial: seen.serial, until: seen.elapsed + (skill.reactMs + skill.jitterMs) / 1000, dir, release: true });
  return { ...idle, down: true, pressed: true };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods }, rocks: [...g.rocks], holes: [...g.holes], stars: [...g.stars], anchor: g.anchor && { ...g.anchor }, motion: g.motion && { ...g.motion, cells: [...g.motion.cells] } }; }
