import { modsOf } from '../heroes.js';

// Game contract:
// meta = { id, name, control: 'tap'|'hold'|'drag', body, accepts: { modKey: 1|2|3 } }
// meta.cheerAt overrides the default top-left cheer with { x, y, size }; null hides it.
// STAGES has 30 rows; init(row, { mods, content, rng }) returns mutable game state g.
// g must be structured-cloneable data (no functions/DOM); keep any random state as numbers.
// step(g, input, dt) mutates g and returns good/bad/timeout/goal/ability/sound events in order.
// sound { type: 'sound', name } passes through; play uses existing SFX_NAMES only.
// input = { down, pressed, x, y }, coordinates 0..1000 by 0..700; pressed lasts one tick.
// policy(seen, skill, rng) returns input using only the delayed snapshot it receives.
// policy must not mutate seen: the bot reuses its detached history snapshots.
// Optional snapshot(g) returns a fully detached data copy for bot history; fallback is structuredClone.
// difficulty(row) returns a number. Games handle targets, timers/retries and progress;
// The shared HUD reads g.score/g.need for goal progress, optional g.question.ask/say,
// g.remaining/g.row.time (with g.mods.time) for time, and g.distance/g.end for the path.
// Games with a question provide meta.ask and use that same verb in question.say.
// Games without a question provide meta.goal: a short one-line objective, not meta.how.
// good events supply x/y in board coordinates for the +1 feedback at the scoring spot.
// A separate view.draw(ctx, g, { heroId, time, pose }) is registered alongside the pure game.
// sessions alone handle hearts. Stages 1..10 have no timer. A timeout retries that question.
// The first terminal event wins; subsequent events in that tick are not processed.
export function newSession(game, stageNo, { heroId = 'pal', content = [], rng = Math.random } = {}) {
  if (!Number.isInteger(stageNo) || stageNo < 1 || stageNo > 30 || !game.STAGES[stageNo - 1]) {
    throw new RangeError('Invalid arcade stage');
  }
  const mods = modsOf(heroId);
  return { game, stageNo, heroId, hearts: 3 + mods.hearts, shield: mods.shield,
    revive: mods.revive, done: null, medals: 0, g: game.init(game.STAGES[stageNo - 1], { mods, content, rng }) };
}

export function tick(s, input, dt) {
  if (s.done) return [];
  const out = [];
  for (const event of s.game.step(s.g, input, dt)) {
    out.push(event);
    if (event.type === 'bad' || event.type === 'timeout') {
      if (s.shield > 0) {
        s.shield--;
        out.push({ type: 'ability', ability: 'shield' });
      } else {
        s.hearts--;
        if (s.hearts <= 0) {
          if (s.revive > 0) {
            s.revive--; s.hearts = 1;
            out.push({ type: 'ability', ability: 'revive' });
          } else s.done = 'fail';
        }
      }
    } else if (event.type === 'goal') {
      s.done = 'clear';
      s.medals = Math.min(3, Math.max(1, s.hearts));
    }
    if (s.done) break;
  }
  return out;
}

export function recordResult(state, gameId, stageNo, s) {
  if (s.done !== 'clear') return;
  if (!Number.isInteger(stageNo) || stageNo < 1 || stageNo > 30) throw new RangeError('Invalid arcade stage');
  const record = state.arcade.games[gameId] ??= { medals: [] };
  while (record.medals.length < stageNo) record.medals.push(0);
  record.medals[stageNo - 1] = Math.max(record.medals[stageNo - 1], s.medals);
}
