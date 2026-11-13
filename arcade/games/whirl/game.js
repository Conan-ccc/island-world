export { STAGES } from './stages.js';
export const meta = { id: 'whirl', name: '빙글빙글 솜사탕', control: 'drag', body: false,
  how: '동그라미를 빙글 돌려 초록 칸에 맞춰 봐!', goal: '솜사탕을 큰 동그라미까지 키워 줘!',
  accepts: { reach: 3, time: 2, speed: 2 }, feel: ['band', 'burst', 'grow', 'drift', 'center'] };
export const difficulty = row => 10 / row.band + row.need;
export const CENTER = { x: 500, y: 330 };
export const RADIUS = { min: 65, max: 235, guide: 185 };
export function bounds(g) {
  const center = g.row.center + (g.row.moving ? .35 * g.color + .55 * Math.sin(g.elapsed * g.row.drift * g.mods.speed) : 0);
  const half = g.row.band * g.mods.reach / 2;
  return { low: Math.max(.25, center - half), high: center + half, center };
}
export function init(row, { mods, rng }) {
  return { row, mods, score: 0, need: row.need, attempt: 0, color: Math.floor(rng() * 3),
    elapsed: 0, size: 0, angle: null, pointer: 0, speed: 0, hot: 0, rest: 0, result: null,
    sweep: 0, direction: 0, sampleAge: 0, angular: 0, remaining: row.time ? row.time * mods.time : null };
}
export function step(g, input, dt) {
  if (!(dt > 0)) return [];
  if (g.rest > 0) {
    g.rest = Math.max(0, g.rest - dt);
    if (!g.rest) {
      g.attempt++; g.color = (g.color + 1) % 3; g.elapsed = 0; g.size = 0;
      g.angle = null; g.speed = 0; g.hot = 0; g.result = null;
      g.sweep = 0; g.direction = 0; g.sampleAge = 0; g.angular = 0;
      g.remaining = g.row.time ? g.row.time * g.mods.time : null;
    }
    return [];
  }
  g.elapsed += dt;
  if (g.remaining !== null) g.remaining = Math.max(0, g.row.time * g.mods.time - g.elapsed);
  const x = input.x - CENTER.x, y = input.y - CENTER.y, radius = Math.hypot(x, y);
  const valid = input.down && radius >= RADIUS.min && radius <= RADIUS.max;
  let angular = 0, fresh = 0;
  if (valid) {
    const angle = Math.atan2(y, x);
    if (g.angle !== null) {
      const delta = Math.atan2(Math.sin(angle - g.angle), Math.cos(angle - g.angle));
      g.sampleAge += dt;
      if (Math.abs(delta) > 1e-9) { g.angular = Math.abs(delta) / g.sampleAge; g.sampleAge = 0; }
      else if (g.sampleAge > .05) g.angular = 0;
      angular = g.angular;
      if (delta && Math.sign(delta) !== g.direction) { g.direction = Math.sign(delta); g.sweep = 0; }
      const previous = Math.max(0, g.sweep - .35);
      g.sweep += Math.abs(delta);
      fresh = Math.max(0, g.sweep - .35) - previous;
    } else { g.sampleAge = 0; g.angular = 0; }
    g.angle = angle; g.pointer = angle;
  } else { g.angle = null; g.sampleAge = 0; g.angular = 0; }
  // Smooth browser pointer samples; stationary holds decay to zero rather than winding candy.
  g.speed += (angular - g.speed) * (1 - Math.exp(-dt / .12));
  const { low, high, center } = bounds(g);
  const winding = valid && angular > .05 && g.speed >= low && g.speed <= high;
  // Revisiting one short arc cannot substitute for circling the bowl.
  if (winding) g.size = Math.min(1, g.size + fresh / (center * g.row.grow));
  g.hot = valid && g.speed > high ? g.hot + dt : 0;
  const good = g.size >= 1;
  const burst = g.row.risky && g.hot >= g.row.burst * g.mods.time;
  const timeout = g.row.time && g.elapsed >= g.row.time * g.mods.time;
  if (!good && !burst && !timeout) return [];
  g.result = good ? 'good' : burst ? 'burst' : 'timeout'; g.rest = .85; g.angle = null;
  const event = { type: good ? 'good' : 'bad', x: CENTER.x, y: CENTER.y };
  if (!good) return [event];
  g.score++;
  return g.score >= g.need ? [event, { type: 'goal' }] : [event];
}
const hands = new WeakMap();
export function policy(seen, skill, rng) {
  // Motor state belongs to the hand, not the game. Only the supplied delayed gauge is observed.
  let hand = hands.get(rng);
  if (!hand) { hand = { angle: 0, attempt: -1, error: 0 }; hands.set(rng, hand); }
  if (seen.attempt !== hand.attempt) {
    hand.attempt = seen.attempt;
    hand.error = rng() * (skill.jitterMs / 140 + skill.wrongRate);
  }
  hand.angle += (bounds(seen).center + hand.error) / 60;
  return { down: seen.rest <= 0, pressed: false,
    x: CENTER.x + RADIUS.guide * Math.cos(hand.angle), y: CENTER.y + RADIUS.guide * Math.sin(hand.angle) };
}
export function snapshot(g) { return { ...g, row: { ...g.row }, mods: { ...g.mods } }; }
