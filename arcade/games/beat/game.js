export { STAGES } from './stages.js';
export const meta = { id: 'beat', name: '둥둥 북', control: 'tap', body: false, cheerAt: null,
  how: '동그라미가 북 위에 올 때 맞춰서 두드려!', goal: '북 위에 올 때 두드려!',
  accepts: { speed: 3, reach: 3, time: 2 } };
export const DRUM_X = 200, DRUM_Y = 320;
export const difficulty = row => row.speed + row.need * 10 + 100 / row.gap + 100 - row.window;
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
export function init(row, { mods, rng }) {
  return { row, mods, notes: [], next: 1, serial: 0, pulse: 0, cool: 0, score: 0, need: row.need,
    random: Math.floor(rng() * 4294967296), remaining: row.time ? row.time * mods.time : null };
}
export function step(g, input, dt) {
  const events = [], speed = g.row.speed * g.mods.speed, window = g.row.window * g.mods.reach;
  g.pulse = Math.max(0, g.pulse - dt); g.cool = Math.max(0, g.cool - dt);
  g.next -= dt * g.mods.speed;
  if (g.next <= 0) {
    // Include the initial spawn delay so the first beat arrives at three seconds.
    const x = g.serial === 0 ? DRUM_X + speed * (3 - 1 / g.mods.speed) : 1060;
    g.notes.push({ id: ++g.serial, x, color: (g.serial - 1) % 3 });
    g.next += g.row.gap * [1, 1, 1, .75, 1.25][Math.floor(random(g) * 5)];
  }
  for (const note of g.notes) note.x -= speed * dt;
  // Consume each passed note once, using the same window that the ring shows.
  while (g.notes.length && g.notes[0].x < DRUM_X - window) {
    g.notes.shift(); events.push({ type: 'bad', x: DRUM_X, y: DRUM_Y });
  }
  if (input.pressed && !g.cool) {
    g.cool = .12; g.pulse = .18;
    events.push({ type: 'sound', name: 'tap' });
    const note = g.notes[0];
    if (note && Math.abs(note.x - DRUM_X) <= window) {
      g.notes.shift(); g.score++;
      events.push({ type: 'good', x: DRUM_X, y: DRUM_Y });
      if (g.score >= g.need) { events.push({ type: 'goal' }); return events; }
    } else if (g.row.strict) events.push({ type: 'bad', x: DRUM_X, y: DRUM_Y });
  }
  if (g.remaining !== null) {
    g.remaining -= dt;
    if (g.remaining <= 0) {
      g.notes = []; g.next = 1; g.remaining = g.row.time * g.mods.time;
      events.push({ type: 'timeout' });
    }
  }
  return events;
}
// Remember only our own attempted note IDs, so delayed observations cannot repeat a tap.
const actions = new WeakMap();
export function policy(seen, skill, rng) {
  const idle = { down: false, pressed: false, x: DRUM_X, y: DRUM_Y };
  const note = seen.notes[0];
  if (!note || note.id <= (actions.get(rng) ?? 0) || seen.cool > 0) return idle;
  const predicted = note.x - seen.row.speed * seen.mods.speed * skill.reactMs / 1000;
  if (predicted > DRUM_X + seen.row.window * seen.mods.reach * .25) return idle;
  actions.set(rng, note.id);
  return { ...idle, down: true, pressed: true };
}
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, notes: g.notes.map(n => ({ ...n })) };
}
