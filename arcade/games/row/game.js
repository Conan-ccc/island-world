export { STAGES } from './stages.js';
export const meta = { id: 'row', name: '영차 노 젓기', control: 'tap', body: true, cheerAt: null, multiPress: true,
  how: '왼쪽 오른쪽을 번갈아 눌러 배를 저어 가!', goal: '부표 사이로 배를 저어 가!',
  accepts: { speed: 3, small: 2, reach: 2 }, feel: ['flow', 'width', 'turn'] };
export const BOAT_Y = 510;
export const difficulty = r => r.flow + r.turn * 100 - r.width + r.need;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function river(g, z) { return 500 + g.row.bend * Math.sin(z / 520); }
export function gateWidth(g) { return Math.min(g.row.hazards ? 275 : 300, g.row.width * g.mods.reach); }
export function boatRadius(g) { return Math.hypot(75 * Math.cos(g.angle), 105 * Math.sin(g.angle)) * g.mods.small; }
function next(g) {
  g.gateZ = g.z + 340;
  const center = river(g, g.gateZ), obstacleCenter = river(g, g.gateZ - 40);
  const margin = gateWidth(g) + (g.row.hazards ? 96 : 70);
  const left = Math.max(0, center - 380, obstacleCenter - 380) + margin;
  const right = Math.min(1000, center + 380, obstacleCenter + 380) - margin;
  g.gateX = clamp(center + (random(g) * 2 - 1) * g.row.scatter, left, right);
  g.obstacles = g.row.hazards ? [-1, 1].map((side, i) => ({
    x: g.gateX + side * (gateWidth(g) + 48), z: g.gateZ - 40, rx: 48, ry: 32,
    kind: i ? 'log' : 'rock', hit: false })) : [];
  g.strokes = 0; g.round++;
}
export function init(row, { mods, rng }) {
  const g = { row, mods, x: 500, z: 0, angle: 0, thrust: 0, elapsed: 0,
    lastSide: 0, paddle: 0, cooldown: 0, score: 0, need: row.need, round: 0,
    random: Math.floor(rng() * 4294967296), obstacles: [] };
  next(g); return g;
}
export function step(g, input, dt) {
  const events = []; g.elapsed += dt; g.paddle = Math.max(0, g.paddle - dt);
  g.cooldown = Math.max(0, g.cooldown - dt);
  if (input.pressed) {
    const side = input.x < 500 ? 1 : -1;
    g.angle = clamp(g.angle + side * g.row.turn, -1.1, 1.1);
    g.thrust = Math.min(150, g.thrust + 65); g.lastSide = side; g.paddle = .3; g.strokes++;
    events.push({ type: 'sound', name: 'tap' });
  }
  const v = g.thrust;
  g.x += (Math.sin(g.angle) * v * 2.8 + g.row.current * g.mods.speed * Math.sin(g.elapsed * 1.4)) * dt;
  g.z += Math.max(0, v * Math.cos(g.angle) - g.row.flow * g.mods.speed) * dt;
  g.thrust *= Math.exp(-.7 * dt); g.angle *= Math.exp(-.45 * dt);
  const center = river(g, g.z), radius = boatRadius(g);
  g.x = clamp(g.x, Math.max(150 * g.mods.small, center - 380 + radius), Math.min(1000 - 150 * g.mods.small, center + 380 - radius));
  for (const o of g.obstacles) {
    if (!o.hit && !g.cooldown && ((g.x - o.x) / (o.rx + radius)) ** 2 + ((g.z - o.z) / (o.ry + Math.hypot(105 * Math.cos(g.angle), 75 * Math.sin(g.angle)) * g.mods.small)) ** 2 <= 1) {
      o.hit = true; g.z -= 42; g.thrust = 35; g.angle *= -.5; g.cooldown = .9;
      events.push({ type: 'bad', x: g.x, y: BOAT_Y });
    }
  }
  if (g.z >= g.gateZ) {
    if (Math.abs(g.x - g.gateX) + radius <= gateWidth(g) && g.strokes >= 2) {
      g.score++; events.push({ type: 'good', x: g.x, y: BOAT_Y });
      if (g.score >= g.need) events.push({ type: 'goal' });
    }
    next(g);
  }
  return events;
}
const hands = new WeakMap();
export function policy(seen, skill, rng) {
  let hand = hands.get(rng);
  if (!hand) { hand = { wait: 0 }; hands.set(rng, hand); }
  hand.wait -= 1 / 60;
  const idle = { down: false, pressed: false, x: 500, y: 600 };
  if (hand.wait > 0) return idle;
  hand.wait = skill.reactMs / 1000;
  const desired = clamp((seen.gateX - seen.x) / 160, -.7, .7);
  let side = seen.angle < desired ? 1 : -1;
  if (rng() < skill.wrongRate) side *= -1;
  return { down: true, pressed: true, x: side === 1 ? 250 : 750, y: 600 };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods }, obstacles: g.obstacles.map(o => ({ ...o })) }; }

