export { STAGES } from './stages.js';
export const meta = { id: 'tree', name: '쑥쑥 나무', control: 'tap', body: true, cheerAt: null,
  how: '왼쪽이나 오른쪽을 눌러 올라가. 바로 위 가지가 없는 쪽을 골라!', goal: '가지 없는 쪽으로 올라가!',
  accepts: { hint: 3, fewer: 2, time: 2 }, feel: ['branches', 'pace'] };
export const difficulty = row => row.branches * 100 + row.need + 10 / row.pace + (row.time ? 10 / row.time : 0);
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function segment(g) {
  const last = g.segs[g.segs.length - 1];
  return { b: last?.b || random(g) >= g.row.branches * (1 - g.mods.fewer) ? 0 : (random(g) < .5 ? -1 : 1) };
}
export function init(row, { mods, rng }) {
  const g = { row, mods, score: 0, need: row.need, side: 1, segs: [{ b: 0 }, { b: 0 }],
    random: Math.floor(rng() * 4294967296), attempt: 0, cool: 0, flash: 0, hit: false,
    remaining: row.time ? row.time * mods.time : null };
  while (g.segs.length < 8) g.segs.push(segment(g));
  return g;
}
export function step(g, input, dt) {
  g.flash = Math.max(0, g.flash - dt);
  if (g.cool > 0) { g.cool = Math.max(0, g.cool - dt); return []; }
  if (g.remaining !== null) {
    g.remaining -= dt;
    if (g.remaining <= 0) {
      g.remaining = g.row.time * g.mods.time; g.attempt++; g.flash = .35; g.hit = false;
      return [{ type: 'timeout', x: 500 + g.side * 150, y: 500 }];
    }
  }
  if (!input.pressed || !Number.isFinite(input.x) || input.x < 0 || input.x > 1000) return [];
  g.side = input.x < 500 ? -1 : 1;
  g.segs.shift(); g.segs.push(segment(g)); g.attempt++; g.cool = g.row.pace;
  g.hit = g.segs[0].b !== g.side; g.flash = .35;
  g.remaining = g.row.time ? g.row.time * g.mods.time : null;
  const at = { x: 500 + g.side * 150, y: 500 };
  if (!g.hit) { g.segs[0].b = 0; return [{ type: 'bad', ...at }]; }
  g.score++;
  return [{ type: 'sound', name: 'tap' }, { type: 'good', ...at }, ...(g.score >= g.need ? [{ type: 'goal' }] : [])];
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 570 };
  if (seen.cool > 0 || (actions.get(rng) ?? -1) >= seen.attempt) return idle;
  actions.set(rng, seen.attempt);
  const branch = seen.segs[1].b;
  let side = branch ? -branch : seen.side;
  // A visible hint reduces choosing the wrong side, not collision rules.
  if (branch && rng() < skill.wrongRate * (seen.mods.hint ? .25 : 1)) side = branch;
  return { down: true, pressed: true, x: 500 + side * 250, y: 570 };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, segs: g.segs.map(s => ({ ...s })) };
}
