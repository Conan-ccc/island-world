// Ability values live here; callers receive their own mutable modifiers.
export const BASE_MODS = Object.freeze({ speed: 1, reach: 1, small: 1, time: 1,
  hearts: 0, shield: 0, revive: 0, magnet: 0, hint: 0, fewer: 0, jump: 0, replay: 0 });
export const HEROES = Object.freeze([
  { id: 'pal', name: '섬 친구', stars: 0, mods: {} },
  { id: 'shell', name: '등딱지 친구', stars: 20, mods: { shield: 1 } },
  { id: 'bouncy', name: '통통 친구', stars: 60, mods: { jump: 1 } },
  { id: 'slow', name: '느릿 친구', stars: 120, mods: { speed: .7 } },
  { id: 'magnet', name: '자석 친구', stars: 200, mods: { magnet: 1 } },
  { id: 'bighand', name: '큰손 친구', stars: 300, mods: { reach: 1.5 } },
  { id: 'sparkle', name: '반짝 친구', stars: 420, mods: { hint: 1 } },
  { id: 'heart', name: '하트 친구', stars: 560, mods: { hearts: 1 } },
  { id: 'clock', name: '시계 친구', stars: 720, mods: { time: 1.5 } },
  { id: 'memory', name: '기억 친구', stars: 900, mods: { replay: 1 } },
  { id: 'tiny', name: '꼬마 친구', stars: 1100, mods: { small: .6 } },
  { id: 'lucky', name: '행운 친구', stars: 1350, mods: { fewer: .5 } },
  { id: 'rainbow', name: '무지개 친구', stars: 1600, mods: { revive: 1 } },
].map(h => Object.freeze({ ...h, mods: Object.freeze(h.mods) })));

export function modsOf(heroId) {
  return { ...BASE_MODS, ...HEROES.find(h => h.id === heroId)?.mods };
}

export function fit(game, heroId) {
  const hero = HEROES.find(h => h.id === heroId);
  return Math.max(0, ...Object.keys(hero?.mods ?? {}).map(key =>
    ['hearts', 'shield', 'revive'].includes(key) ? 2 : game.meta.accepts[key] ?? 0));
}
