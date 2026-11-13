import { round } from '../../content.js';
export { STAGES } from './stages.js';
export const meta = { id: 'train', name: '칙칙폭폭 기차', control: 'tap', body: true, ask: '이걸 태워!',
  how: '가고 싶은 쪽을 톡 눌러서 같은 글자 친구를 태워!', goal: '같은 글자 친구를 기차에 태워!',
  feel: ['speed'], accepts: { speed: 3, magnet: 2, fewer: 2, hint: 2 } };
export const COLS = 12, ROWS = 7, CELL = 76, LEFT = 44, TOP = 68;
export function grid(g) {
  const cols = g?.row.cols ?? COLS, rows = g?.row.rows ?? ROWS;
  const cell = cols === 10 ? 90 : CELL;
  return { cols, rows, cell, left: (1000 - cols * cell) / 2, top: TOP };
}
export function point(p, g) {
  const { cell, left, top } = grid(g);
  return { x: left + (p.c + .5) * cell, y: top + (p.r + .5) * cell };
}
const same = (a, b) => a.c === b.c && a.r === b.r;
const inside = (p, g) => p.c >= 0 && p.c < grid(g).cols && p.r >= 0 && p.r < grid(g).rows;
const dirs = [{ c: 1, r: 0 }, { c: 0, r: 1 }, { c: -1, r: 0 }, { c: 0, r: -1 }];
export const difficulty = row => row.speed + row.need + row.wrong;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function reset(g) { g.body = [{ c: 5, r: 3 }, { c: 4, r: 3 }]; g.dir = { c: 1, r: 0 }; g.turn = null; g.clock = 0; }
function passengers(g) {
  const cells = [];
  for (let r = 0; r < grid(g).rows; r++) for (let c = 0; c < grid(g).cols; c++) {
    const p = { c, r };
    if (!g.body.some(b => same(b, p)) && Math.abs(c - g.body[0].c) + Math.abs(r - g.body[0].r) >= 4) cells.push(p);
  }
  g.passengers = [];
  const count = 1 + Math.floor(g.row.wrong * (1 - g.mods.fewer));
  for (let i = 0; i < count && cells.length; i++) {
    const p = cells.splice(Math.floor(random(g) * cells.length), 1)[0];
    const tokens = i ? g.question.bad : g.question.good;
    if (!tokens.length) continue;
    g.passengers.push({ ...p, good: i === 0, token: { ...tokens[Math.floor(random(g) * tokens.length)] } });
  }
}
export function init(row, { mods, content, rng }) {
  const g = { row, mods, question: round(content, row.tier, rng, meta.ask), score: 0, need: row.need,
    random: Math.floor(rng() * 4294967296), body: [], dir: null, turn: null, clock: 0, passengers: [], oops: 0, waiting: false };
  reset(g); passengers(g); return g;
}
export function step(g, input, dt) {
  const events = []; g.oops = Math.max(0, g.oops - dt);
  if (input.pressed && Number.isFinite(input.x) && Number.isFinite(input.y)) {
    const p = point(g.body[0], g), dx = input.x - p.x, dy = input.y - p.y;
    if (dx || dy) {
      let d = Math.abs(dx) >= Math.abs(dy) ? { c: Math.sign(dx), r: 0 } : { c: 0, r: Math.sign(dy) };
      if (d.c === -g.dir.c && d.r === -g.dir.r) {
        const preferred = g.dir.c ? { c: 0, r: Math.sign(dy) || 1 } : { c: Math.sign(dx) || 1, r: 0 };
        d = [preferred, { c: -preferred.c || 0, r: -preferred.r || 0 }].find(turn => {
          const q = { c: g.body[0].c + turn.c, r: g.body[0].r + turn.r };
          return inside(q, g) && !g.body.slice(0, -1).some(b => same(b, q));
        });
      }
      if (d) g.turn = d;
    }
  }
  g.clock += dt * g.row.speed * g.mods.speed;
  while (g.clock >= 1) {
    g.clock -= 1;
    if (g.turn) { g.dir = g.turn; g.turn = null; }
    const head = g.body[0], next = { c: head.c + g.dir.c, r: head.r + g.dir.r };
    g.waiting = false;
    if (!inside(next, g) || g.body.slice(0, -1).some(p => same(p, next))) {
      if (g.row.gentle) { g.waiting = true; break; }
      events.push({ type: 'bad', ...point(head, g) }); reset(g); passengers(g); g.oops = .8; break;
    }
    const rider = g.passengers.find(p => same(p, next));
    g.body.unshift(next);
    if (!rider?.good || g.row.gentle) g.body.pop();
    if (rider) {
      events.push({ type: rider.good ? 'good' : 'bad', ...point(rider, g) });
      if (rider.good) {
        g.score++;
        if (g.score >= g.need) { events.push({ type: 'goal' }); break; }
      } else { reset(g); g.oops = .8; }
      passengers(g);
    }
    // One cell of attraction per train step, only when close and the destination is free.
    if (g.mods.magnet) {
      const p = g.passengers.find(p => p.good), h = g.body[0];
      if (p && Math.abs(p.c - h.c) + Math.abs(p.r - h.r) === 2) {
        const q = { c: p.c + Math.sign(h.c - p.c), r: p.r };
        if (q.c === p.c) q.r += Math.sign(h.r - p.r);
        if (!g.body.some(b => same(b, q)) && !g.passengers.some(b => b !== p && same(b, q))) Object.assign(p, q);
      }
    }
  }
  return events;
}
const hands = new WeakMap();
export function policy(seen, skill, rng) {
  const h = seen.body[0], key = `${h.c},${h.r},${seen.score},${seen.oops > 0}`;
  const hand = hands.get(rng);
  if (hand?.key === key && hand.wait-- > 0) return {};
  hands.set(rng, { key, wait: 40 });
  const target = seen.passengers.find(p => p.good);
  if (!target) return {};
  const blocked = p => seen.body.slice(1, -1).some(b => same(b, p)) || seen.passengers.some(b => !b.good && same(b, p));
  const queue = [{ ...h, first: null }], visited = new Set([`${h.c},${h.r}`]);
  let choice = null;
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (same(p, target)) { choice = p.first; break; }
    for (const d of dirs) {
      if (!p.first && d.c === -seen.dir.c && d.r === -seen.dir.r) continue;
      const q = { c: p.c + d.c, r: p.r + d.r, first: p.first ?? d }, k = `${q.c},${q.r}`;
      if (!inside(q, seen) || blocked(q) || visited.has(k)) continue;
      visited.add(k); queue.push(q);
    }
  }
  choice ??= dirs.find(d => inside({ c: h.c + d.c, r: h.r + d.r }, seen) && !blocked({ c: h.c + d.c, r: h.r + d.r }) && (d.c !== -seen.dir.c || d.r !== -seen.dir.r)) ?? seen.dir;
  if (rng() < skill.wrongRate) return {};
  const p = point(h, seen);
  return { down: true, pressed: true, x: p.x + choice.c * 1000, y: p.y + choice.r * 1000 };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, dir: { ...g.dir }, turn: g.turn && { ...g.turn },
    body: g.body.map(p => ({ ...p })), passengers: g.passengers.map(p => ({ ...p, token: { ...p.token } })),
    question: { ...g.question, ask: { ...g.question.ask }, good: g.question.good.map(t => ({ ...t })), bad: g.question.bad.map(t => ({ ...t })) } };
}
