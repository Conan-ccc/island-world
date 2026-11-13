export { STAGES } from './stages.js';
export const meta = { id: 'march', name: '꼬마 행진', control: 'tap', body: false, cheerAt: null,
  how: '빈 길을 톡 눌러 다리를 놓고 동물들을 집에 데려다줘!', goal: '동물들이 집에 가도록 다리를 놓아 줘!',
  accepts: { speed: 3, hint: 2, reach: 2 }, feel: ['speed', 'every'], };
export const Y = 430, SIZE = 110, GAP = 64;
export const difficulty = row => row.speed + row.need * 10 - row.every;
export function init(row, { mods, rng }) {
  return { row, mods, t: 0, score: 0, need: row.need, next: 0, serial: 0,
    phase: rng(), animals: [], gaps: Array.from({ length: row.holes }, (_, i) => ({
      x: 260 + i * (480 / Math.max(1, row.holes - 1)), bridge: false, used: false,
    })) };
}
export const available = g => g.row.planks - g.gaps.filter(h => h.bridge).length;
export function step(g, input, dt) {
  const events = []; g.t += dt; g.noStock = Math.max(0, (g.noStock || 0) - dt);
  if (input.pressed && input.y >= Y - 19 * g.mods.reach && input.y <= Y + 98 * g.mods.reach) {
    const h = g.gaps.find(h => Math.abs(input.x - h.x) <= (GAP / 2 + 12) * g.mods.reach);
    if (h && !h.used) {
      if (h.bridge) {
        if (g.row.planks < g.gaps.length && g.t - h.placedAt >= .6) h.bridge = false;
      }
      else {
        if (available(g) <= 0) {
          const distance = gap => Math.min(...g.animals.filter(a => !a.returning).map(a => Math.abs(a.x - gap.x)));
          const spare = g.gaps.filter(gap => gap.bridge && !gap.used && !g.animals.some(a =>
            !a.returning && a.x < gap.x + (GAP + SIZE) / 2 && gap.x < h.x
          )).sort((a, b) => distance(b) - distance(a) || b.x - a.x)[0];
          if (spare) spare.bridge = false;
        }
        if (available(g) > 0) { h.bridge = true; h.placedAt = g.t; }
        else g.noStock = 1;
      }
      events.push({ type: 'sound', name: 'tap' });
    }
  }
  g.next -= dt;
  if (g.next <= 0 && g.animals.length < g.need - g.score) {
    g.animals.push({ id: g.serial++, x: 55, wait: 0, waiting: -1, returning: 0 });
    g.next = g.row.every / g.mods.speed * (1 + .08 * Math.sin(g.serial * 2.4 + g.phase));
  }
  for (const a of g.animals) {
    if (a.returning > 0) { a.returning = Math.max(0, a.returning - dt); if (!a.returning) { a.x = 55; a.waiting = -1; } continue; }
    let next = a.x + g.row.speed * g.mods.speed * dt;
    for (let i = 0; i < g.gaps.length; i++) {
      const h = g.gaps[i], edge = h.x - GAP / 2 - SIZE / 2;
      if (a.x <= edge && next > edge && !h.bridge) {
        if (g.row.hesitate && a.waiting !== i) { a.waiting = i; a.wait = g.row.hesitate; }
        if (a.wait > 0) { a.wait = Math.max(0, a.wait - dt); next = edge; }
        else { a.returning = .65; events.push({ type: 'bad', x: edge, y: Y }); next = edge; }
        break;
      }
      if (h.bridge && next > edge && a.x < h.x + GAP / 2 + SIZE / 2) h.used = true;
    }
    a.x = next;
    if (a.x >= 920) { g.score++; events.push({ type: 'good', x: 920, y: Y - 35 }); if (g.score >= g.need) events.push({ type: 'goal' }); }
  }
  g.animals = g.animals.filter(a => a.x < 920);
  for (const h of g.gaps) {
    // Fold only once the last overlapping animal has completely crossed.
    if (h.bridge && h.used && !g.animals.some(a => !a.returning && Math.abs(a.x - h.x) < (GAP + SIZE) / 2)) {
      h.bridge = false; h.used = false;
    }
  }
  return events;
}
export function urgent(g) {
  let best = null, distance = Infinity;
  for (const a of g.animals) if (!a.returning) for (const h of g.gaps) {
    const d = h.x - GAP / 2 - SIZE / 2 - a.x;
    if (!h.bridge && d >= -.01 && d < distance) { best = h; distance = d; }
  }
  return distance < 110 ? best : null;
}
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: 500, y: 650 };
  let placed = actions.get(rng);
  if (!placed) { placed = new Map(); actions.set(rng, placed); }
  const h = urgent(seen); if (!h) return idle;
  if (seen.t < (placed.get(h.x) ?? 0)) return idle;
  placed.set(h.x, seen.t + (skill.reactMs ?? 180) / 1000 + (skill.jitterMs ?? 40) / 1000 + .05);
  if (rng() < skill.wrongRate) return idle;
  return { down: true, pressed: true, x: h.x, y: Y };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, animals: g.animals.map(a => ({ ...a })), gaps: g.gaps.map(h => ({ ...h })) };
}
