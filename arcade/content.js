import { ISLANDS as hangul } from '../subjects/hangul/curriculum.js';
import { ISLANDS as english } from '../subjects/english/curriculum.js';
import { ISLANDS as number } from '../subjects/number/curriculum.js';

const curricula = { hangul, english, number };
export const TIERS = { sprout: [1, 10], tree: [11, 20], star: [21, 30] };
export const tierOf = n => n <= 10 ? 'sprout' : n <= 20 ? 'tree' : 'star';
const token = (subject, key) => ({ subject, key: String(key), label: String(key) });
const unique = tokens => [...new Map(tokens.map(t => [`${t.subject}:${t.key}`, t])).values()];

export function pool(state, choice, tier) {
  const subjects = choice === 'mix' ? Object.keys(curricula) : [choice];
  const out = [];
  for (const subject of subjects) {
    const islands = curricula[subject];
    const tokens = [];
    for (const [n, island] of Object.entries(islands)) {
      if (island.kind === 'family' || (tier === 'sprout' && island.kind === 'fact')) continue;
      const mastery = state?.subjects?.[subject]?.islands?.[n]?.mastery;
      const visited = mastery && typeof mastery === 'object' && !Array.isArray(mastery) && Object.keys(mastery).length > 0;
      if (tier === 'star' || visited) tokens.push(...island.units.map(u => token(subject, u.key)));
    }
    // Top up each subject separately, so an empty subject still participates in mix.
    if (unique(tokens).length < 4) tokens.push(...islands[1].units.map(u => token(subject, u.key)));
    out.push(...tokens);
  }
  return unique(out);
}

function shuffle(items, rng) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const FIRST_OPERAND = 10, LAST_OPERAND = 99;
const operand = rng => FIRST_OPERAND + Math.floor(rng() * (LAST_OPERAND - FIRST_OPERAND + 1));
export function round(tokens, tier, rng, askText = '이걸 모아!') {
  const source = tokens.length ? tokens : pool(null, 'mix', tier);
  // One quarter of star rounds include arithmetic, only when number is selected.
  if (tier === 'star' && source.some(t => t.subject === 'number') && rng() < .25) {
    const a = operand(rng), b = operand(rng);
    const plus = rng() < .5, hi = Math.max(a, b), lo = Math.min(a, b);
    const answer = plus ? a + b : hi - lo;
    const ask = token('number', plus ? `${a}+${b}` : `${hi}-${lo}`);
    const bad = shuffle([1, 2, 3, 4, 5].map(d => token('number', answer + d)), rng);
    return { ask, good: [token('number', answer)], bad, say: `${ask.label}! ${askText}` };
  }
  const ask = source[Math.floor(rng() * source.length)];
  const good = source.filter(t => t.label === ask.label);
  const candidates = source.filter(t => t.label !== ask.label);
  const preferred = [...shuffle(candidates.filter(t => t.subject === ask.subject), rng),
    ...shuffle(candidates.filter(t => t.subject !== ask.subject), rng)];
  const bad = [...new Map(preferred.map(t => [t.label, t])).values()].slice(0, 3 + Math.floor(rng() * 3));
  return { ask, good, bad, say: `${ask.label}! ${askText}` };
}

const orderedKeys = Object.fromEntries(Object.entries(curricula).map(([s, islands]) =>
  [s, [...new Set(Object.values(islands).flatMap(i => i.units?.map(u => u.key) ?? []))]]));
const numericValue = key => {
  const m = key.match(/^(\d+)([+-])(\d+)$/);
  return m ? (m[2] === '+' ? +m[1] + +m[3] : +m[1] - +m[3]) : Number(key);
};

export function sequence(tokens, n, rng) {
  return shuffle(unique(tokens), rng).slice(0, Math.max(0, n)).sort((a, b) => {
    if (a.subject !== b.subject) return Object.keys(curricula).indexOf(a.subject) - Object.keys(curricula).indexOf(b.subject);
    return a.subject === 'number' ? numericValue(a.key) - numericValue(b.key) :
      orderedKeys[a.subject].indexOf(a.key) - orderedKeys[b.subject].indexOf(b.key);
  });
}
