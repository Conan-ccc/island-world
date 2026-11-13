export { STAGES } from './stages.js';
export const meta = { id: 'cups', name: '숨바꼭질 컵', control: 'tap', body: true,
  how: '친구가 숨은 컵을 눈으로 따라가다가 골라!', goal: '친구가 숨은 컵을 찾아!',
  accepts: { speed: 3, replay: 3, time: 2 } };
export const difficulty = row => row.count * 10 + row.swaps * 5 + row.need * 5 + 1 / row.duration;
export const cupX = (i, count) => 500 + (i - (count - 1) / 2) * (count === 4 ? 215 : 265);
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function reset(g) {
  g.cups = Array.from({ length: g.row.count }, (_, i) => ({ x: cupX(i, g.row.count), lift: 0 }));
  g.phase = 'show'; g.t = 1.2; g.index = 0; g.move = null; g.chosen = -1; g.remaining = null;
}
function deal(g) {
  g.round++; g.has = Math.floor(random(g) * g.row.count); g.plan = [];
  for (let i = 0; i < g.row.swaps; i++) {
    const a = Math.floor(random(g) * g.row.count);
    let b = Math.floor(random(g) * (g.row.count - 1)); if (b >= a) b++;
    g.plan.push([a, b]);
  }
  g.repeated = false; reset(g);
}
export function init(row, { mods, rng }) {
  const g = { row, mods, score: 0, need: row.need, random: Math.floor(rng() * 4294967296), round: 0 };
  deal(g); return g;
}
export function step(g, input, dt) {
  if (g.phase === 'show' || g.phase === 'reveal') {
    g.t -= dt;
    if (g.t <= 0) {
      if (g.phase === 'reveal') deal(g);
      else g.phase = 'mix';
    }
    return [];
  }
  if (g.phase === 'mix') {
    if (!g.move) {
      if (g.index === g.plan.length) {
        if (g.mods.replay && !g.repeated) {
          g.repeated = true; reset(g);
          return [{ type: 'ability', ability: 'replay' }];
        }
        g.phase = 'pick'; g.remaining = g.row.time ? g.row.time * g.mods.time : null;
        return [{ type: 'sound', name: 'tap' }];
      }
      const [a, b] = g.plan[g.index++];
      g.move = { a, b, ax: g.cups[a].x, bx: g.cups[b].x, t: 0 };
    }
    const m = g.move; m.t += dt;
    const k = Math.min(1, m.t / (g.row.duration / g.mods.speed)), ease = (1 - Math.cos(k * Math.PI)) / 2;
    g.cups[m.a].x = m.ax + (m.bx - m.ax) * ease;
    g.cups[m.b].x = m.bx + (m.ax - m.bx) * ease;
    g.cups[m.a].lift = Math.sin(k * Math.PI) * 48;
    g.cups[m.b].lift = -Math.sin(k * Math.PI) * 32;
    if (k === 1) { g.cups[m.a].lift = 0; g.cups[m.b].lift = 0; g.move = null; }
    return [];
  }
  if (g.remaining !== null) {
    g.remaining -= dt;
    if (g.remaining <= 0) {
      // Retry the same hidden friend and swap sequence, without advancing the RNG.
      g.round++; g.repeated = false; reset(g); return [{ type: 'timeout' }];
    }
  }
  if (!input.pressed || !Number.isFinite(input.x) || !Number.isFinite(input.y) || input.y < 280 || input.y > 460) return [];
  const i = g.cups.reduce((best, c, index) => Math.abs(input.x - c.x) < Math.abs(input.x - g.cups[best].x) ? index : best, 0);
  if (Math.abs(input.x - g.cups[i].x) > (g.row.count === 4 ? 215 : 265) / 2) return [];
  g.chosen = i; g.phase = 'reveal'; g.t = 1; g.remaining = null;
  const at = { x: g.cups[i].x, y: 265 };
  if (i !== g.has) return [{ type: 'bad', ...at }];
  g.score++;
  return [{ type: 'good', ...at }, ...(g.score >= g.need ? [{ type: 'goal' }] : [])];
}
// Remember only the bot's own submitted round so jitter cannot submit twice.
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 580 };
  if (seen.phase !== 'pick' || (actions.get(rng) ?? 0) >= seen.round) return idle;
  actions.set(rng, seen.round);
  // Recall burden grows with swaps and shorter viewing time. Only the supplied history is read.
  const exposure = seen.row.duration / seen.mods.speed * (seen.mods.replay ? 2 : 1);
  const error = Math.min(.8, skill.wrongRate * seen.row.swaps * .16 / exposure);
  let i = seen.has;
  if (rng() < error) i = (i + 1 + Math.floor(rng() * (seen.cups.length - 1))) % seen.cups.length;
  return { down: true, pressed: true, x: seen.cups[i].x, y: 370 };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, cups: g.cups.map(c => ({ ...c })),
    plan: g.plan.map(pair => [...pair]), move: g.move ? { ...g.move } : null };
}
