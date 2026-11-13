export { STAGES } from './stages.js';
export const meta = { id: 'echo', name: '따라 해봐', control: 'tap', body: false,
  how: '반짝인 순서를 잘 보고 그대로 눌러!', goal: '반짝인 순서대로 눌러!',
  accepts: { speed: 3, replay: 3, time: 2 } };
export const difficulty = row => row.need * 10 + row.length * 5 + row.count + 1 / row.show;
export const COLORS = ['#ed91af', '#82c9ed', '#f1ce70', '#88cfa3', '#baa3e8', '#edac7d'];
export function padsFor(count) {
  const cols = count / 2;
  return Array.from({ length: count }, (_, i) => ({ x: 500 + (i % cols - (cols - 1) / 2) * 280,
    y: 235 + Math.floor(i / cols) * 260, w: 220, h: 210 }));
}
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function replay(g) {
  g.attempt++;
  g.phase = 'wait'; g.t = .8; g.index = 0; g.showIndex = 0; g.lit = -1; g.litTime = 0;
  g.repeated = false; g.cool = 0; g.remaining = null;
}
export function init(row, { mods, rng }) {
  const g = { row, mods, pads: padsFor(row.count), seq: [], score: 0, need: row.need,
    random: Math.floor(rng() * 4294967296), phase: 'wait', t: 0, index: 0, showIndex: 0,
    attempt: 0, lit: -1, litTime: 0, cool: 0, repeated: false, remaining: null };
  for (let i = 0; i < row.length; i++) g.seq.push(Math.floor(random(g) * row.count));
  replay(g); return g;
}
export function step(g, input, dt) {
  const events = [];
  g.cool = Math.max(0, g.cool - dt);
  g.litTime = Math.max(0, g.litTime - dt);
  if (!g.litTime) g.lit = -1;
  if (g.phase !== 'input') {
    g.t -= dt;
    if (g.t > 0) return events;
    if (g.phase === 'wait') { g.phase = 'show'; g.showIndex = 0; }
    if (g.showIndex < g.seq.length) {
      g.lit = g.seq[g.showIndex++]; g.litTime = g.row.show / g.mods.speed;
      g.t = g.litTime + .22; return events;
    }
    if (g.mods.replay && !g.repeated) {
      g.repeated = true; g.showIndex = 0; g.t = .7;
      return [{ type: 'ability', ability: 'replay' }];
    }
    g.phase = 'input'; g.index = 0; g.lit = -1;
    g.remaining = g.row.time ? g.row.time * g.mods.time : null;
    return events;
  }
  if (g.remaining !== null) {
    g.remaining -= dt;
    if (g.remaining <= 0) { replay(g); return [{ type: 'timeout' }]; }
  }
  if (!input.pressed || g.cool > 0) return events;
  const k = g.pads.findIndex(p => Math.abs(input.x - p.x) <= p.w / 2 && Math.abs(input.y - p.y) <= p.h / 2);
  if (k < 0) return events;
  g.lit = k; g.litTime = .3; g.cool = .25;
  if (k !== g.seq[g.index]) { replay(g); return [{ type: 'bad', x: g.pads[k].x, y: g.pads[k].y }]; }
  g.index++;
  if (g.index === g.seq.length) {
    g.score++; events.push({ type: 'good', x: g.pads[k].x, y: g.pads[k].y });
    if (g.score >= g.need) { events.push({ type: 'goal' }); return events; }
    g.seq.push(Math.floor(random(g) * g.row.count)); replay(g);
  }
  return events;
}
// Each RNG identifies one bot's own taps, never the current game state.
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 650 };
  if (seen.phase !== 'input' || seen.cool > 0) return idle;
  const last = actions.get(rng);
  if (last && (seen.attempt < last.attempt || (seen.attempt === last.attempt && seen.index <= last.index))) return idle;
  actions.set(rng, { attempt: seen.attempt, index: seen.index });
  // Recall errors grow with the shown sequence and shrink with viewing time/repetition.
  // Recall uses only the delayed snapshot; own tap history prevents duplicate commands.
  const exposure = seen.row.show / seen.mods.speed * (seen.mods.replay ? 2 : 1);
  const error = Math.min(.8, skill.wrongRate * (seen.seq.length - 1) * .12 / exposure);
  let k = seen.seq[seen.index];
  if (rng() < error) k = (k + 1 + Math.floor(rng() * (seen.pads.length - 1))) % seen.pads.length;
  const p = seen.pads[k];
  return { down: true, pressed: true, x: p.x, y: p.y };
}

// Detached bot history; keep in sync with the game state shape.
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, pads: g.pads.map(p => ({ ...p })), seq: [...g.seq] };
}
