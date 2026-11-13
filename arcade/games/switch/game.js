export { STAGES } from './stages.js';
export const meta = { id: 'switch', name: '갈림길 구슬', control: 'tap', body: false, cheerAt: null,
  how: '화살표를 톡 눌러 같은 색 바구니로 보내 줘!', goal: '구슬을 같은 색 바구니에 모아 줘!',
  accepts: { speed: 3, hint: 2, fewer: 2 }, feel: ['speed', 'pause', 'show'] };
export const difficulty = r => r.speed + r.need + r.colors;
export const BUTTON_RADIUS = 48;
export const COLORS = ['#f47c88', '#75bdeb', '#f4cc65', '#85cd9e'];
export const MARKS = ['●', '◆', '▲', '■'];
export function basket(g, i) { return { x: 180 + i * 640 / (g.colors - 1), y: 566 }; }
// Negative destinations encode baskets. Every branch leads to a visible basket.
export function junctions(g) {
  if (g.colors === 2) return [{ x: 500, y: 290, to: [-1, -2] }];
  if (g.colors === 3) return [{ x: 500, y: 250, to: [-1, 1] }, { x: 660, y: 395, to: [-2, -3] }];
  return [{ x: 500, y: 240, to: [1, 2] }, { x: 290, y: 395, to: [-1, -2] }, { x: 710, y: 395, to: [-3, -4] }];
}
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function spawn(g) {
  g.show = g.row.show; g.round++; g.ball = { color: Math.floor(random(g) * g.colors), from: { x: 500, y: 70 }, target: 0, progress: 0 };
}
export function init(row, { mods, rng }) {
  const g = { row, mods, score: 0, need: row.need, colors: Math.max(2, row.colors - (mods.fewer ? 1 : 0)),
    random: Math.floor(rng() * 4294967296), round: 0, elapsed: 0, rest: 0, feedback: null, ball: null, directions: [] };
  g.directions = junctions(g).map(() => 0); spawn(g); return g;
}
export function destination(g, target) { return target < 0 ? basket(g, -target - 1) : junctions(g)[target]; }
export function position(g) {
  const b = g.ball, end = destination(g, b.target);
  return { x: b.from.x + (end.x - b.from.x) * b.progress, y: b.from.y + (end.y - b.from.y) * b.progress };
}
function contains(nodes, target, color) { return target < 0 ? -target - 1 === color : nodes[target].to.some(t => contains(nodes, t, color)); }
// Hints and policy follow only the visible marble, arrows and basket shapes.
export function nextTurn(g) {
  if (!g.ball || g.ball.target < 0 || g.rest) return -1;
  const nodes = junctions(g); let i = g.ball.target;
  while (i >= 0) {
    const wanted = nodes[i].to.findIndex(t => contains(nodes, t, g.ball.color));
    if (wanted < 0) return -1;
    if (g.directions[i] !== wanted) return i;
    i = nodes[i].to[wanted];
  }
  return -1;
}
export function step(g, input, dt) {
  g.elapsed += dt;
  const events = [], nodes = junctions(g);
  if (input.pressed) {
    const i = nodes.findIndex(p => Math.hypot(input.x - p.x, input.y - p.y) <= BUTTON_RADIUS);
    if (i >= 0) { g.directions[i] = 1 - g.directions[i]; events.push({ type: 'sound', name: 'tap' }); }
  }
  if (g.rest > 0) { g.rest = Math.max(0, g.rest - dt); if (!g.rest) { g.feedback = null; spawn(g); } return events; }
  if (g.show > 0) { g.show = Math.max(0, g.show - dt); return events; }
  const b = g.ball;
  b.progress += dt * g.row.speed * g.mods.speed;
  while (b.progress >= 1) {
    b.progress--;
    const end = destination(g, b.target);
    if (b.target < 0) {
      const good = -b.target - 1 === b.color;
      if (good) g.score++;
      g.feedback = { ...end, color: b.color, good }; g.rest = g.row.pause;
      events.push({ type: good ? 'good' : 'bad', x: end.x, y: end.y });
      if (g.score >= g.need) events.push({ type: 'goal' });
      break;
    }
    b.from = { x: end.x, y: end.y }; b.target = end.to[g.directions[b.target]];
  }
  return events;
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 0, y: 0 }, last = actions.get(rng);
  if (seen.rest || (last && seen.elapsed < last.until)) return idle;
  let i = nextTurn(seen); if (i < 0) return idle;
  if (!seen.mods.hint && rng() < skill.wrongRate) i = Math.floor(rng() * seen.directions.length);
  actions.set(rng, { until: seen.elapsed + (skill.reactMs + skill.jitterMs) / 1000 + .08 });
  return { down: true, pressed: true, x: junctions(seen)[i].x, y: junctions(seen)[i].y };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods }, directions: [...g.directions],
  ball: { ...g.ball, from: { ...g.ball.from } }, feedback: g.feedback ? { ...g.feedback } : null }; }
