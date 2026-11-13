import { countStars } from '../core/stars.js';
import { HEROES, fit } from './heroes.js';

export const GAME_STARS = Object.freeze({ run: 0, float: 0, stack: 0, paddle: 40, aim: 90,
  echo: 160, fish: 250, beat: 360, toss: 480, trace: 620, cups: 800, lane: 1000,
  swing: 1200, slice: 1450, chase: 1700, signal: 2000, rocket: 2300, curl: 2600, wheel: 3000, tree: 3400 });
export const threshold = base => base;

// Call after loadState/migrate. These functions mutate only the arcade slice and never save.
export function syncArcade(state) {
  const a = state.arcade, stars = countStars(state);
  let changed = a.scale !== 1;
  a.scale = 1;
  for (const [id, base] of Object.entries(GAME_STARS)) {
    if (stars >= threshold(base) && !a.opened.includes(id)) {
      a.opened.push(id); changed = true;
    }
  }
  return changed;
}

export function gameOpen(state, id) {
  return Object.hasOwn(GAME_STARS, id) &&
    (state.arcade.allGames || GAME_STARS[id] === 0 || state.arcade.opened.includes(id));
}

export function canWelcome(state) {
  const stars = countStars(state);
  return HEROES.filter(h => h.id !== 'pal' && !state.arcade.heroes.owned.includes(h.id) && stars >= h.stars).map(h => h.id);
}

export function welcome(state, heroId) {
  if (!canWelcome(state).includes(heroId)) return false;
  state.arcade.heroes.owned.push(heroId);
  return true;
}

// hero fields in nextHero/helpCard are ids, resolved through HEROES by the screens.
export function nextHero(state) {
  const stars = countStars(state);
  const hero = HEROES.find(h => !state.arcade.heroes.owned.includes(h.id) && h.stars > stars);
  return hero ? { hero: hero.id, need: hero.stars - stars } : null;
}

export function stageOpen(state, gameId, n) {
  return Object.hasOwn(GAME_STARS, gameId) && Number.isInteger(n) && n >= 1 && n <= 30 &&
    (n === 1 || (state.arcade.games[gameId]?.medals[n - 2] ?? 0) >= 1);
}

export function helpCard(state, game) {
  const { owned, picked } = state.arcade.heroes;
  const use = HEROES.find(h => owned.includes(h.id) && h.id !== picked && fit(game, h.id) === 3);
  if (use) return { kind: 'use', hero: use.id };
  const earn = HEROES.filter(h => h.id !== 'pal' && !owned.includes(h.id) && fit(game, h.id) > 0)
    .sort((a, b) => fit(game, b.id) - fit(game, a.id) || a.stars - b.stars)[0];
  return earn ? { kind: 'earn', hero: earn.id, need: Math.max(0, earn.stars - countStars(state)) } : null;
}

// Recommendations only read the existing save; they never unlock or record anything.
export function suggestGame(state) {
  return Object.keys(GAME_STARS).find(id => gameOpen(state, id) && !(state.arcade.games[id]?.medals[0] > 0)) ?? null;
}

export function suggestStage(state, gameId) {
  if (!gameOpen(state, gameId)) return null;
  let highest = null;
  for (let n = 1; n <= 30; n++) {
    if (!stageOpen(state, gameId, n)) continue;
    highest = n;
    if (!(state.arcade.games[gameId]?.medals[n - 1] > 0)) return n;
  }
  return highest;
}
