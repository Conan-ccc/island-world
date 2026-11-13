export { STAGES } from './stages.js';
export const meta = { id: 'garden', name: '시들시들 꽃밭', control: 'tap', body: true,
  how: '고개 숙인 꽃을 누르면 친구가 물을 줘!', goal: '목마른 꽃에게 물을 줘!',
  feel: ['dry', 'move', 'rescue'], accepts: { speed: 3, time: 2, hint: 2 } };
export const HIT = { width: 130, height: 160 };
export const difficulty = row => row.dry * 100 + row.pots + row.need;
export const decay = (g, p) => g.row.dry * p.fast * g.mods.speed / g.mods.time;
export function init(row, { mods, rng }) {
  const pots = Array.from({ length: row.pots }, (_, i) => ({
    x: row.pots === 2 ? 310 + i * 380 : 230 + (i % 3) * 270,
    y: row.pots <= 3 ? 340 : i < 3 ? 250 : 480,
    water: .65 + rng() * .35, fast: (row.fast ? i < row.fast : row.pots >= 5 && i % 2) ? 1.15 : 1,
    sleep: 0, splash: 0,
  }));
  return { row, mods, pots, x: 500, y: 570, target: -1, score: 0, need: row.need };
}
export function step(g, input, dt) {
  const events = [];
  if (input.pressed && Number.isFinite(input.x) && Number.isFinite(input.y)) {
    const index = g.pots.findIndex(p => !p.sleep && Math.abs(input.x - p.x) <= HIT.width / 2 && Math.abs(input.y - p.y) <= HIT.height / 2);
    if (index >= 0) g.target = index;
  }
  for (const p of g.pots) {
    p.splash = Math.max(0, p.splash - dt);
    if (p.sleep > 0) {
      p.sleep = Math.max(0, p.sleep - dt);
      if (!p.sleep) p.water = 1;
      continue;
    }
    p.water = Math.max(0, p.water - decay(g, p) * dt);
    if (p.water <= 0) {
      p.sleep = 1.8;
      if (!g.row.safe) events.push({ type: 'bad', x: p.x, y: p.y });
    }
  }
  const p = g.pots[g.target];
  if (p) {
    if (p.sleep) g.target = -1;
    else {
      const dx = p.x - g.x, dy = p.y + 90 - g.y, distance = Math.hypot(dx, dy);
      const travel = Math.min(distance, g.row.move * dt);
      if (distance > 0) { g.x += dx / distance * travel; g.y += dy / distance * travel; }
      if (distance <= travel) {
        if (p.water < g.row.rescue) {
          g.score++; events.push({ type: 'good', x: p.x, y: p.y - 40 });
          if (g.score >= g.need) events.push({ type: 'goal' });
        }
        p.water = 1; p.splash = .45; g.target = -1;
      }
    }
  }
  return events;
}
const hands = new WeakMap();
export function policy(seen, skill, rng) {
  let hand = hands.get(rng);
  if (!hand) { hand = { wait: 0 }; hands.set(rng, hand); }
  hand.wait -= 1 / 60;
  if (hand.wait > 0 || seen.target >= 0) return {};
  const thirsty = seen.pots.filter(p => !p.sleep && p.water < seen.row.rescue)
    .sort((a, b) => a.water / decay(seen, a) - b.water / decay(seen, b));
  if (!thirsty.length) return {};
  const p = rng() < skill.wrongRate ? seen.pots[Math.floor(rng() * seen.pots.length)] : thirsty[0];
  hand.wait = skill.reactMs / 1000;
  return { pressed: true, down: true, x: p.x, y: p.y };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods }, pots: g.pots.map(p => ({ ...p })) }; }
