export { STAGES } from './stages.js';
export const meta = { id: 'pipe', name: '물길 잇기', control: 'tap', body: false, cheerAt: null,
  how: '물길을 톡톡 돌려서 꽃까지 이어 줘!', goal: '물을 보내 꽃을 피워 줘!',
  accepts: { speed: 3, hint: 3 }, feel: ['wait', 'flow'] };
export const difficulty = r => 100 / r.wait + r.flow + r.need;
const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
const BASE = { straight: [1, 3], elbow: [0, 1], tee: [0, 1, 3] };
export const ports = t => BASE[t.kind].map(d => (d + t.rot) % 4);
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function layout(g) { const size = Math.min(150, 660 / g.row.cols, 420 / g.row.rows); return { size, x: (1000 - size * g.row.cols) / 2, y: (700 - size * g.row.rows) / 2 }; }
export function center(g, i) { const b = layout(g); return { x: b.x + (i % g.row.cols + .5) * b.size, y: b.y + (Math.floor(i / g.row.cols) + .5) * b.size }; }
function neighbor(g, i, d) { const x = i % g.row.cols + DX[d], y = Math.floor(i / g.row.cols) + DY[d]; return x < 0 || y < 0 || x >= g.row.cols || y >= g.row.rows ? -1 : y * g.row.cols + x; }
function resetWater(g) { g.elapsed = 0; g.water = 0; g.wet = []; g.front = [{ i: g.start, enter: 3 }]; g.flowing = false; }
function board(g) {
  const { cols, rows, turns } = g.row;
  g.tiles = Array.from({ length: cols * rows }, () => ({ kind: 'tee', rot: Math.floor(random(g) * 4) }));
  let y = Math.floor(random(g) * rows), route = [y * cols]; g.start = route[0];
  for (let x = 0; x < cols; x++) {
    const next = Math.floor(random(g) * rows);
    while (y !== next) { y += Math.sign(next - y); route.push(y * cols + x); }
    if (x < cols - 1) route.push(y * cols + x + 1);
  }
  g.end = route.at(-1);
  route.forEach((i, k) => {
    const direction = j => { const dx = j % cols - i % cols, dy = Math.floor(j / cols) - Math.floor(i / cols); return dx > 0 ? 1 : dx < 0 ? 3 : dy > 0 ? 2 : 0; };
    const a = k ? direction(route[k - 1]) : 3, b = k === route.length - 1 ? 1 : direction(route[k + 1]);
    const kind = (a + 2) % 4 === b ? 'straight' : 'elbow';
    let rot = 0; while (!ports({ kind, rot }).includes(a) || !ports({ kind, rot }).includes(b)) rot++;
    g.tiles[i] = { kind, rot };
  });
  const choices = [...route];
  for (let n = 0; n < Math.min(turns, choices.length); n++) {
    const index = Math.floor(random(g) * choices.length), i = choices.splice(index, 1)[0];
    g.tiles[i].rot = (g.tiles[i].rot + 3) % 4;
  }
  g.round++; resetWater(g);
}
export function init(row, { mods, rng }) {
  const g = { row, mods, score: 0, need: row.need, random: Math.floor(rng() * 4294967296), round: 0, rest: 0, bloom: false, tiles: [], wet: [], front: [] };
  board(g); return g;
}
// Search only visible tile shapes and rotations. No stored answer is used by hints or policy.
export function solve(g) {
  const visit = (i, enter, seen) => {
    if (seen.has(i) || g.tiles[i].kind === 'tee') return null;
    const nextSeen = new Set(seen).add(i), t = g.tiles[i];
    for (let n = 0; n < 4; n++) {
      const rot = (t.rot + n) % 4, p = ports({ ...t, rot });
      if (!p.includes(enter) || (g.wet.includes(i) && n)) continue;
      const out = p.find(d => d !== enter), j = neighbor(g, i, out);
      if (i === g.end && out === 1) return [{ i, rot }];
      if (j < 0) continue;
      const tail = visit(j, (out + 2) % 4, nextSeen);
      if (tail) return [{ i, rot }, ...tail];
    }
    return null;
  };
  return visit(g.start, 3, new Set()) ?? [];
}
function connected(g) { const route = solve(g); return route.length > 0 && route.every(p => ports(g.tiles[p.i]).join() === ports({ ...g.tiles[p.i], rot: p.rot }).join()); }
export function step(g, input, dt) {
  if (g.rest > 0) { g.rest = Math.max(0, g.rest - dt); if (!g.rest) { if (g.bloom) board(g); else resetWater(g); g.bloom = false; } return []; }
  const events = [];
  if (input.pressed && (g.row.auto || !g.flowing)) {
    const b = layout(g), x = Math.floor((input.x - b.x) / b.size), y = Math.floor((input.y - b.y) / b.size), i = y * g.row.cols + x;
    if (x >= 0 && x < g.row.cols && y >= 0 && y < g.row.rows && !g.wet.includes(i)) { g.tiles[i].rot = (g.tiles[i].rot + 1) % 4; events.push({ type: 'sound', name: 'tap' }); }
  }
  g.elapsed += dt * g.mods.speed;
  if (!g.flowing && ((g.row.auto && g.elapsed >= g.row.wait) || connected(g))) g.flowing = true;
  if (!g.flowing) return events;
  g.water += dt * g.row.flow * g.mods.speed;
  while (g.water >= 1 && !g.rest) {
    g.water--; const next = []; let leak = false, flower = false;
    for (const f of g.front) {
      const p = ports(g.tiles[f.i]);
      if (!p.includes(f.enter)) { leak = true; continue; }
      if (g.wet.includes(f.i)) continue;
      g.wet.push(f.i);
      for (const d of p.filter(d => d !== f.enter)) {
        if (f.i === g.end && d === 1) { flower = true; continue; }
        const j = neighbor(g, f.i, d);
        if (j < 0) leak = true; else if (!g.wet.includes(j)) next.push({ i: j, enter: (d + 2) % 4 });
      }
    }
    g.front = next;
    if (leak || (!next.length && !flower)) { g.rest = .8; events.push({ type: 'bad', ...center(g, g.wet.at(-1) ?? g.start) }); }
    else if (flower) { g.score++; g.bloom = true; g.rest = 1.2; events.push({ type: 'good', ...center(g, g.end) }); if (g.score >= g.need) events.push({ type: 'goal' }); }
  }
  return events;
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 0, y: 0 };
  if (seen.rest) return idle;
  const last = actions.get(rng);
  if (last && last.round === seen.round && seen.elapsed < last.until) return idle;
  const route = solve(seen), target = route.find(p => !seen.wet.includes(p.i) && !ports(seen.tiles[p.i]).every(d => ports({ ...seen.tiles[p.i], rot: p.rot }).includes(d)));
  if (!target) return idle;
  const i = rng() < skill.wrongRate && !seen.mods.hint ? Math.floor(rng() * seen.tiles.length) : target.i;
  actions.set(rng, { round: seen.round, until: seen.elapsed + (skill.reactMs + skill.jitterMs) / 1000 * seen.mods.speed + .08 });
  return { down: true, pressed: true, ...center(seen, i) };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods }, tiles: g.tiles.map(t => ({ ...t })), wet: [...g.wet], front: g.front.map(f => ({ ...f })) }; }
