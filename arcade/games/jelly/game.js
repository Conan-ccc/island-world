export { STAGES } from './stages.js';
export const meta = { id: 'jelly', name: '젤리 셋 맞추기', control: 'drag', body: false, cheerAt: null,
  how: '젤리를 옆 칸으로 끌어서 같은 모양 셋을 이어 줘!', goal: '같은 젤리 셋을 이어 줘!',
  accepts: { hint: 3, fewer: 2 }, feel: ['moves', 'settle'] };
export const difficulty = r => r.need + 100 / r.moves + r.colors + r.size;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function layout(g) { const size = 490 / g.row.size; return { size, x: (1000 - 490) / 2, y: 75 }; }
export function center(g, i) { const b = layout(g); return { x: b.x + (i % g.row.size + .5) * b.size, y: b.y + (Math.floor(i / g.row.size) + .5) * b.size }; }
function cell(g, x, y) { const b = layout(g), col = Math.floor((x - b.x) / b.size), row = Math.floor((y - b.y) / b.size); return col >= 0 && col < g.row.size && row >= 0 && row < g.row.size ? row * g.row.size + col : -1; }
export function adjacent(g, a, b) { return a >= 0 && b >= 0 && a < g.tiles.length && b < g.tiles.length && Math.abs(a % g.row.size - b % g.row.size) + Math.abs(Math.floor(a / g.row.size) - Math.floor(b / g.row.size)) === 1; }
export function lines(tiles, size) {
  const found = [];
  for (const vertical of [false, true]) for (let a = 0; a < size; a++) {
    let run = [];
    for (let b = 0; b <= size; b++) {
      const i = vertical ? b * size + a : a * size + b;
      if (b === size || (run.length && tiles[i] !== tiles[run[0]])) { if (run.length >= 3 && tiles[run[0]] >= 0) found.push(run); run = []; }
      if (b < size) run.push(i);
    }
  }
  return found;
}
export function findMoves(g) {
  const result = [], tiles = [...g.tiles], n = g.row.size;
  for (let a = 0; a < tiles.length; a++) for (const b of [a + 1, a + n]) {
    if (!adjacent(g, a, b) || tiles[a] === tiles[b]) continue;
    [tiles[a], tiles[b]] = [tiles[b], tiles[a]];
    const matched = lines(tiles, n);
    if (matched.length) result.push({ a, b, count: matched.length, cleared: new Set(matched.flat()).size });
    [tiles[a], tiles[b]] = [tiles[b], tiles[a]];
  }
  return result;
}
function fresh(g) {
  const n = g.row.size;
  g.tiles = [];
  for (let i = 0; i < n * n; i++) {
    const allowed = Array.from({ length: g.colors }, (_, k) => k).filter(k =>
      !(i % n >= 2 && g.tiles[i - 1] === k && g.tiles[i - 2] === k) && !(i >= n * 2 && g.tiles[i - n] === k && g.tiles[i - n * 2] === k));
    g.tiles.push(allowed.length ? allowed[Math.floor(random(g) * allowed.length)] : Math.floor(random(g) * g.colors));
  }
}
export function ensureMove(g) {
  if (!lines(g.tiles, g.row.size).length && findMoves(g).length) return false;
  for (let tries = 0; tries < 100; tries++) { fresh(g); if (!lines(g.tiles, g.row.size).length && findMoves(g).length) { g.shuffled = true; return true; } }
  // A bounded fallback constructs a playable motif without a pre-existing line.
  const n = g.row.size;
  g.tiles = Array.from({ length: n * n }, (_, i) => (i % n + Math.floor(i / n)) % g.colors);
  g.tiles[0] = 0; g.tiles[1] = 1; g.tiles[2] = 0; g.tiles[n + 1] = 0;
  g.shuffled = true; return true;
}
export function init(row, { mods, rng }) {
  const g = { row, mods, score: 0, need: row.need, colors: Math.max(2, row.colors - (mods.fewer ? 1 : 0)),
    random: Math.floor(rng() * 4294967296), tiles: [], moves: row.moves, selected: -1, dragX: 0, dragY: 0,
    phase: 'idle', rest: 0, elapsed: 0, round: 0, popped: [], falls: [], swapped: [], shuffled: false };
  fresh(g); ensureMove(g); return g;
}
function refill(g) {
  const n = g.row.size, removed = new Set(g.popped); g.falls = [];
  for (let x = 0; x < n; x++) {
    const kept = [];
    for (let y = n - 1; y >= 0; y--) if (!removed.has(y * n + x)) kept.push({ color: g.tiles[y * n + x], from: y });
    for (let y = n - 1; y >= 0; y--) {
      const t = kept[n - 1 - y] ?? { color: -1, from: -(n - y) };
      g.tiles[y * n + x] = t.color; g.falls.push({ i: y * n + x, distance: y - t.from });
    }
  }
  // Refill without gifting a random line; gravity can still join surviving jellies.
  for (let i = 0; i < g.tiles.length; i++) if (g.tiles[i] < 0) {
    const allowed = [];
    for (let color = 0; color < g.colors; color++) { g.tiles[i] = color; if (!lines(g.tiles,n).some(line => line.includes(i))) allowed.push(color); }
    g.tiles[i] = allowed.length ? allowed[Math.floor(random(g)*allowed.length)] : Math.floor(random(g)*g.colors);
  }
  g.popped = []; g.phase = 'fall'; g.rest = g.row.settle;
}
function pop(g, matches, events) {
  g.popped = [...new Set(matches.flat())]; g.phase = 'pop'; g.rest = g.row.settle;
  for (const line of matches) { g.score++; events.push({ type: 'good', ...center(g, line[Math.floor(line.length / 2)]) }); }
  if (g.score >= g.need) events.push({ type: 'goal' });
}
function finish(g, events) {
  g.phase = 'idle'; g.round++; g.swapped = []; g.falls = [];
  if (g.row.limited && g.moves <= 0) { g.moves = g.row.moves; events.push({ type: 'bad', x: 500, y: 605 }); }
  ensureMove(g);
}
export function step(g, input, dt) {
  const events = []; g.elapsed += dt;
  if (g.phase !== 'idle') {
    g.selected = -1; g.rest = Math.max(0, g.rest - dt);
    if (g.rest) return events;
    if (g.phase === 'swap') { const matches = lines(g.tiles, g.row.size); if (matches.length) pop(g, matches, events); else { if (g.row.limited) g.moves--; const [a,b] = g.swapped; [g.tiles[a],g.tiles[b]] = [g.tiles[b],g.tiles[a]]; g.phase = 'return'; g.rest = g.row.settle; } }
    else if (g.phase === 'pop') refill(g);
    else if (g.phase === 'fall') { const matches = lines(g.tiles,g.row.size); if (matches.length) pop(g,matches,events); else finish(g,events); }
    else finish(g,events);
    return events;
  }
  if ((input.pressed || input.down) && g.selected < 0) { g.selected = cell(g,input.x,input.y); g.shuffled = false; }
  if (g.selected < 0) return events;
  g.dragX = input.x; g.dragY = input.y;
  if (!input.down) {
    const a = g.selected; let b = cell(g,input.x,input.y); g.selected = -1;
    if (b >= 0 && !adjacent(g,a,b)) {
      const from = center(g,a), dx = input.x-from.x, dy = input.y-from.y;
      if (Math.abs(dx) > Math.abs(dy)) b = a + Math.sign(dx);
      else if (Math.abs(dy) > Math.abs(dx)) b = a + Math.sign(dy)*g.row.size;
    }
    if (!adjacent(g,a,b)) return events;
    [g.tiles[a],g.tiles[b]] = [g.tiles[b],g.tiles[a]]; g.swapped = [a,b];
    g.phase = 'swap'; g.rest = g.row.settle; events.push({ type: 'sound', name: 'tap' });
  }
  return events;
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 0, y: 0 };
  let action = actions.get(rng);
  if (action && seen.round <= action.round) {
    if (seen.elapsed < action.release) return { down: true, pressed: false, ...center(seen, action.a) };
    if (seen.elapsed < action.until) return { down: false, pressed: false, ...center(seen, action.b) };
    return idle;
  }
  if (seen.phase !== 'idle') return idle;
  const choices = findMoves(seen); if (!choices.length) return idle;
  const target = seen.mods.hint || !skill.wrongRate ? choices.reduce((best, move) => move.count + move.cleared / 100 > best.count + best.cleared / 100 ? move : best) : choices[Math.floor(rng() * choices.length)];
  let a = target.a, b = target.b;
  if (!seen.mods.hint && rng() < skill.wrongRate) { a = Math.floor(rng() * seen.tiles.length); b = a % seen.row.size < seen.row.size - 1 ? a + 1 : a - 1; }
  const delay = (skill.reactMs + skill.jitterMs) / 1000;
  action = { a, b, round: seen.round, release: seen.elapsed + delay + .12, until: seen.elapsed + delay * 2 + .5 };
  actions.set(rng,action);
  return { down: true, pressed: true, ...center(seen,a) };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods }, tiles: [...g.tiles], popped: [...g.popped], falls: g.falls.map(f => ({ ...f })), swapped: [...g.swapped] }; }
