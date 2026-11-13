export { STAGES } from './stages.js';
export const meta = { id: 'fish', name: '낚시', control: 'hold', body: true,
  how: '누르면 낚싯줄이 내려가. 물고기가 걸리면 손을 떼! 해파리는 피해.', goal: '물고기를 걸어서 끌어올려!',
  accepts: { speed: 3, reach: 3, fewer: 2, time: 2 } };
export const HOOK_SPEED = 340;
export const difficulty = row => row.speed + row.jellies * 40 + row.need * 10;
const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const reflect = x => { const t = ((x - 60) % 1760 + 1760) % 1760; return 60 + (t <= 880 ? t : 1760 - t); };
function random(g) { g.random = (Math.imul(g.random, 1664525) + 1013904223) >>> 0; return g.random / 4294967296; }
function spawn(g, bad) {
  const f = { id: ++g.serial, x: 60 + random(g) * 880, y: 240 + random(g) * 340,
    vx: (random(g) < .5 ? -1 : 1) * g.row.speed * (.7 + random(g) * .6), bad,
    color: Math.floor(random(g) * 4) };
  g.fish.push(f); return f;
}
export function init(row, { mods, rng }) {
  const g = { row, mods, hy: 120, hooked: null, fish: [], serial: 0, cool: 0,
    random: Math.floor(rng() * 4294967296), score: 0, need: row.need,
    remaining: row.time ? row.time * mods.time : null };
  for (let i = 0; i < 5; i++) spawn(g, false);
  for (let i = 0; i < Math.ceil(row.jellies * (1 - mods.fewer)); i++) spawn(g, true);
  return g;
}
export function step(g, input, dt) {
  const events = [];
  g.cool = Math.max(0, g.cool - dt);
  g.down = !!input.down;
  g.hy = clamp(g.hy + (input.down ? 1 : -1) * HOOK_SPEED * g.mods.speed * dt, 120, 580);
  for (const f of g.fish) {
    if (f.id === g.hooked) { f.x = 500; f.y = g.hy + 22; continue; }
    f.x += f.vx * g.mods.speed * dt;
    if (f.x < 60) { f.x = 120 - f.x; f.vx = Math.abs(f.vx); }
    if (f.x > 940) { f.x = 1880 - f.x; f.vx = -Math.abs(f.vx); }
  }
  // One penalty per contact; retreat safely before another attempt.
  const bad = !g.cool && g.fish.find(f => f.bad && Math.hypot(f.x - 500, f.y - g.hy - 22) <= 44);
  if (bad) {
    if (g.hooked !== null) {
      g.fish = g.fish.filter(f => f.id !== g.hooked); spawn(g, false);
    }
    g.hooked = null; g.hy = 120; g.cool = 1.3;
    events.push({ type: 'bad', x: bad.x, y: bad.y });
  } else if (g.hooked !== null && g.hy <= 124) {
    g.fish = g.fish.filter(f => f.id !== g.hooked); g.hooked = null; g.score++;
    events.push({ type: 'good', x: 500, y: 170 });
    if (g.score >= g.need) { events.push({ type: 'goal' }); return events; }
    spawn(g, false);
  } else if (g.hooked === null && !g.cool) {
    const caught = g.fish.find(f => !f.bad && Math.hypot(f.x - 500, f.y - g.hy - 22) <= 44 * g.mods.reach);
    if (caught) { g.hooked = caught.id; caught.x = 500; caught.y = g.hy + 22; events.push({ type: 'sound', name: 'tap' }); }
  }
  if (g.remaining !== null) {
    g.remaining -= dt;
    if (g.remaining <= 0) {
      if (g.hooked !== null) { g.fish = g.fish.filter(f => f.id !== g.hooked); spawn(g, false); }
      g.hooked = null; g.hy = 120; g.cool = 1.3; g.remaining = g.row.time * g.mods.time;
      events.push({ type: 'timeout' });
    }
  }
  return events;
}
export function policy(seen, skill, rng) {
  let down = false;
  if (seen.hooked === null && !seen.cool) {
    const delay = skill.reactMs / 1000;
    const candidates = seen.fish.filter(f => !f.bad).map(f => {
      const travel = Math.abs(f.y - 22 - seen.hy) / (HOOK_SPEED * seen.mods.speed);
      return { f, distance: Math.abs(reflect(f.x + f.vx * seen.mods.speed * (delay + travel)) - 500) };
    }).sort((a, b) => a.distance - b.distance);
    const target = candidates[0]?.f;
    down = !!target && seen.hy < target.y - 22;
    if (rng() < skill.wrongRate / 60) down = !down;
  }
  const delay = skill.reactMs / 1000;
  const hy = clamp(seen.hy + (seen.down ? 1 : -1) * HOOK_SPEED * seen.mods.speed * delay, 120, 580);
  function risk(held) {
    let danger = 0;
    for (let t = 0; t <= .5; t += .05) {
      const y = clamp(hy + (held ? 1 : -1) * HOOK_SPEED * seen.mods.speed * t, 120, 580) + 22;
      for (const f of seen.fish) if (f.bad) {
        const x = reflect(f.x + f.vx * seen.mods.speed * (delay + t));
        danger += Math.max(0, 75 - Math.hypot(x - 500, f.y - y));
      }
    }
    return danger;
  }
  if (!seen.cool) {
    const chosen = risk(down), other = risk(!down);
    if (other < chosen) down = !down;
  }
  return { down, pressed: false, x: 500, y: 350 };
}

// Detached bot history; keep in sync with the game state shape.
export function snapshot(g) {
  return { ...g, row: { ...g.row }, mods: { ...g.mods }, fish: g.fish.map(f => ({ ...f })) };
}
