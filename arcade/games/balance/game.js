export { STAGES } from './stages.js';
export const meta = { id: 'balance', name: '아슬아슬 쟁반', control: 'drag', body: true, cheerAt: null,
  how: '컵이 기우는 쪽으로 쟁반을 움직여 줘!', goal: '컵을 식탁까지 날라 줘!',
  accepts: { speed: 3, reach: 2 }, feel: ['speed', 'limit', 'trip'] };
export const difficulty = row => row.speed * 100 + row.need;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function reset(g) {
  g.angle = (random(g) < .5 ? -1 : 1) * (g.row.wind ? .08 : g.score > 0 ? .1 : .035);
  g.x = 500; g.wind = 0; g.nextWind = g.elapsed + 1;
  g.bump = g.distance >= g.end * .5; g.fallen = false;
}
export function init(row, { mods, rng }) {
  const g = { row, mods, score: 0, need: row.need, angle: 0, x: 500, wind: 0,
    nextWind: 1, bump: false, fallen: false, rest: 0, elapsed: 0, distance: 0,
    end: row.trip, random: Math.floor(rng() * 4294967296) };
  reset(g); return g;
}
export function step(g, input, dt) {
  if (g.rest > 0) {
    g.rest = Math.max(0, g.rest - dt);
    if (!g.rest) reset(g);
    return [];
  }
  if (input.down && Number.isFinite(input.x)) g.x = clamp(input.x, 260, 740);
  g.elapsed += dt;
  if (g.row.wind && g.elapsed >= g.nextWind) {
    g.wind = (random(g) * 2 - 1) * g.row.wind;
    g.nextWind = g.elapsed + 1.2 + random(g);
  }
  if (g.row.cups > 2 && !g.bump && g.distance >= g.end * .5) {
    g.angle += (random(g) < .5 ? -1 : 1) * .08; g.bump = true;
  }
  // An unstable, overdamped top-heavy tower: moving its support under the lean restores it.
  g.angle += (g.angle * 1.3 - (g.x - 500) / 200 + g.wind) * g.row.speed * g.mods.speed * dt;
  if (Math.abs(g.angle) > g.row.limit * g.mods.reach) {
    g.fallen = true; g.rest = .8;
    return [{ type: 'bad', x: g.x, y: 430 }];
  }
  g.distance += dt;
  if (g.distance >= g.end) {
    g.score++; g.distance = 0; g.rest = .65;
    const events = [{ type: 'good', x: 820, y: 410 }];
    if (g.score >= g.need) events.push({ type: 'goal' });
    return events;
  }
  return [];
}
export function policy(seen) {
  return { down: true, pressed: false, x: clamp(500 + 200 * (seen.angle * 2.8 + seen.wind), 260, 740), y: 480 };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods } }; }
