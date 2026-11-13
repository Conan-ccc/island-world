import { newSession, tick } from './session.js';
import { pool, tierOf } from '../content.js';

export const SKILL = {
  slow: { reactMs: 700, jitterMs: 250, wrongRate: .12 },
  expert: { reactMs: 180, jitterMs: 40, wrongRate: 0 },
};

export function seededRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let t = Math.imul(value ^ value >>> 15, value | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function runBot(game, stageNo, { heroId = 'pal', skill = SKILL.slow, seed = 1, state } = {}) {
  // Separate streams: jitter and policy decisions never advance game randomness.
  const rng = seededRng(seed), reactionRng = seededRng(seed ^ 0x9E3779B9), policyRng = seededRng(seed ^ 0x85EBCA6B);
  const content = pool(state, state?.arcade?.subject ?? 'mix', tierOf(stageNo));
  const s = newSession(game, stageNo, { heroId, content, rng });
  const dt = 1 / 60, maxDelay = Math.max(0, Math.ceil((skill.reactMs + skill.jitterMs) / (dt * 1000)));
  const history = new Array(maxDelay + 1);
  let ticks = 0;
  while (!s.done && ticks < 10800) {
    history[ticks % history.length] = (game.snapshot ?? structuredClone)(s.g);
    const delay = Math.max(0, Math.round((skill.reactMs + (reactionRng() * 2 - 1) * skill.jitterMs) / (dt * 1000)));
    const seen = history[Math.max(0, ticks - delay) % history.length];
    tick(s, game.policy(seen, skill, policyRng), dt);
    ticks++;
  }
  return { done: s.done ?? 'fail', hearts: s.hearts, ticks };
}

const rates = new WeakMap();

export function botResults(game, stageNo, opts = {}, seeds = 10) {
  if (!Number.isInteger(seeds) || seeds < 1) throw new RangeError('Expected at least one seed');
  // Function identity shares module/registry wrappers without conflating different games.
  let cache = rates.get(game.init);
  if (!cache || cache.step !== game.step || cache.policy !== game.policy || cache.snapshot !== game.snapshot) {
    cache = { step: game.step, policy: game.policy, snapshot: game.snapshot, values: new Map() };
    rates.set(game.init, cache);
  }
  const key = JSON.stringify([game.STAGES[stageNo - 1], stageNo, opts.heroId ?? 'pal',
    opts.skill ?? SKILL.slow, opts.seed ?? 1, seeds, opts.state ?? null]);
  if (cache.values.has(key)) return cache.values.get(key);
  const results = [];
  for (let i = 0; i < seeds; i++) {
    results.push(Object.freeze(runBot(game, stageNo, { ...opts, seed: (opts.seed ?? 1) + i })));
  }
  Object.freeze(results);
  cache.values.set(key, results);
  return results;
}

export function clearRate(game, stageNo, opts = {}, seeds = 10) {
  return botResults(game, stageNo, opts, seeds).filter(r => r.done === 'clear').length / seeds;
}
