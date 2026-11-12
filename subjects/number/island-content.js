// Builds activity parameters for any island and mechanic (pure; rng injected).
// unit = the curriculum unit that gets the credit ('7' or '2+1'), target = the numeral the child has to pick ('7' or '3').
import { ISLANDS, NAMES, LOOKALIKE, earlierKeys, unitLine, unitOf, homeIsland, nameOf, COUNT_WORDS, factQuestion } from './curriculum.js';
import { isMastered, MASTERY_COUNT } from '../../core/mastery.js';
import { themeOf, MECH_TYPE, mechAt } from './themes.js';
import { strokesFor } from './strokes.js';
import { LINES, SUFFIXES } from './voice-keys.js';

const uniq = a => [...new Set(a)];
function shuffle(a, rng) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const noRecord = { mastery: {} };

export function islandUnits(n) { return ISLANDS[n] ? ISLANDS[n].units.map(u => u.key) : []; }

// Units this activity type would help most come first: missing this type, then too few successes, then the rest.
// With 4 or more questions, one in four is a review unit (oldest success first); the returned array carries .review.
export function pickFor(island, keys, n, rng, type, review = []) {
  const m = k => island.mastery[k] || { count: 0, types: [] };
  const need = k => !isMastered(island, k) && (!m(k).types.includes(type) ? 2 : m(k).count < MASTERY_COUNT ? 1 : 0.5);
  const r = n >= 4 ? Math.min(Math.floor(n / 4), review.length) : 0;
  const rev = review.slice(0, r);
  const groups = [2, 1, 0.5, false].map(g => shuffle(keys.filter(k => !rev.includes(k) && need(k) === g), rng));
  const out = uniq(groups.flat()).slice(0, n - rev.length);
  for (const k of rev) out.splice(Math.floor(rng() * (out.length + 1)), 0, k);
  out.review = rev;
  return out;
}

// Review candidates: earlier islands' units of the same kind + units already mastered here, oldest success first.
// The tens island keeps to its own numbers (its things come in boxes of ten).
export function reviewCandidates(n, islands = {}) {
  const isl = ISLANDS[n];
  const here = islands[String(n)] || noRecord;
  const own = isl.units.map(u => u.key).filter(k => isMastered(here, k));
  const earlier = isl.tens ? [] : earlierKeys(n);
  const lastOf = k => islands[String(homeIsland(k, n))]?.mastery?.[k]?.lastAt || 0;
  return uniq([...earlier, ...own]).map((k, i) => ({ k, t: lastOf(k), i })).sort((a, b) => a.t - b.t || a.i - b.i).map(x => x.k);
}

// Wrong numerals for an answer: at most one look-alike (6/9, 12/21), then the numbers next to it
// (one, two, three away; on the tens island ten, twenty, thirty away). Only numbers the game can say.
export function decoysFor(value, rng, n, opts = {}) {
  const v = Number(value), step = opts.tens ? 10 : 1, min = opts.tens ? 10 : 0;
  const out = [];
  const look = opts.tens || opts.noLook ? [] : shuffle(LOOKALIKE[v] || [], rng).slice(0, 1);
  const near = [1, 2, 3, 4].flatMap(d => shuffle([v - d * step, v + d * step], rng));
  for (const x of [...look, ...near]) { if (out.length >= n) break; if (x >= min && x !== v && x in NAMES && !out.includes(x)) out.push(x); }
  return out.map(String);
}

// Which units a mechanic can give credit to on this island (map markers, tests, parent report)
export function creditable(n, mech) {
  const isl = ISLANDS[n];
  const keys = islandUnits(n);
  if (mech === 'door') return keys.filter(k => isl.trace.includes(String(unitOf(k).value)) && strokesFor(String(unitOf(k).value)));
  if (mech === 'compare' || mech === 'next') return isl.extra === mech ? keys : [];
  return keys;
}

export function buildMechs(n, island, settings = {}, rng = Math.random, islands = {}) {
  const isl = ISLANDS[n];
  const kind = isl.kind;
  const keys = isl.units.map(u => u.key);
  const U = k => unitOf(k);
  const T = MECH_TYPE;
  const A = k => String(U(k).value);
  const review = () => reviewCandidates(n, islands);
  const recOf = k => islands[String(homeIsland(k, n))] || (homeIsland(k, n) === n ? island : noRecord);
  const known = k => isMastered(recOf(k), k);
  const dopts = { tens: !!isl.tens, noLook: kind === 'fact' };
  const decoys = (k, c) => decoysFor(A(k), rng, c, dopts);
  const options = (k, c) => shuffle([A(k), ...decoys(k, c)], rng);
  const line = k => unitLine(U(k));
  const qty = k => ({ n: U(k).value, pic: isl.pic });
  // What the board shows. A number: the numeral with that many things. A sum: "2 + 1" with the things (without them once it is known).
  // A number that is already known is asked by ear only (no board).
  const show = k => { const u = U(k); return u.kind === 'fact' ? { fact: u, pic: known(k) ? null : isl.pic } : (known(k) ? null : { num: u.value, qty: qty(k) }); };
  const reveal = k => { const u = U(k); return u.kind === 'fact' ? { fact: u, pic: isl.pic, answer: u.value } : { num: u.value, qty: qty(k) }; };
  const ask = (k, suffix) => { const u = U(k); return u.kind === 'fact' ? [factQuestion(u.a, u.op, u.b)] : (known(k) ? [LINES.listen, nameOf(u.value)] : [nameOf(u.value), suffix]); };
  const choice = (k, suffix, c) => ({ unit: k, target: A(k), show: show(k), reveal: reveal(k), line: line(k), prompt: ask(k, suffix), listenOnly: kind === 'fact' || !show(k), options: options(k, c), decoys: decoys(k, c) });
  // the things to look at and count: a number of things, a + b things, or a things with b of them taken away
  const things = k => { const u = U(k); return u.kind === 'fact' ? { mode: u.op === '+' ? 'add' : 'sub', a: u.a, b: u.b, pic: isl.pic } : { mode: 'count', n: u.value, pic: isl.pic }; };
  const howMany = k => (U(k).op === '-' ? LINES.howManyLeft : LINES.howMany);
  // what is said for each tap while counting: one by one ("하나, 둘"); a box of ten is one tap ("열" / "십, 이십")
  const countWords = k => {
    const u = U(k);
    if (isl.tens) return Array.from({ length: u.value / 10 }, (_, i) => nameOf((i + 1) * 10));
    if (u.kind === 'num' && u.value > 10) return Array.from({ length: u.value - 9 }, (_, i) => COUNT_WORDS[i + 10]);
    return Array.from({ length: u.value }, (_, i) => COUNT_WORDS[i + 1]);
  };

  return {
    fruit: () => ({ rounds: pickFor(island, keys, 4, rng, T.fruit, review()).map(k => choice(k, SUFFIXES.pickFruit, 3)) }),
    rise: () => ({ rounds: pickFor(island, keys, 2, rng, T.rise).map(k => ({ ...choice(k, SUFFIXES.findAll, 3), need: 4 })) }),
    catch: () => ({ rounds: pickFor(island, keys, 2, rng, T.catch).map(k => ({ ...choice(k, SUFFIXES.catchIt, 3), need: 3 })) }),
    hop: () => ({ rounds: pickFor(island, keys, 4, rng, T.hop, review()).map(k => choice(k, SUFFIXES.hop, 2)) }),
    find: () => ({ ...choice(pickFor(island, keys, 1, rng, T.find)[0], SUFFIXES.findAll, 3), count: 5 }),
    // rub out the hidden things, count them, pick the numeral
    scratch: () => ({ rounds: pickFor(island, keys, 3, rng, T.scratch).map(k => ({ unit: k, target: A(k), things: things(k), tens: !!isl.tens, options: options(k, 2), reveal: reveal(k), line: line(k), prompt: [howMany(k)] })) }),
    // tap the things one by one (each tap says the count), then pick the numeral
    count: () => ({ rounds: pickFor(island, keys, 2, rng, T.count).map(k => ({ unit: k, target: A(k), things: things(k), tens: !!isl.tens, words: countWords(k), options: options(k, 2), reveal: reveal(k), line: line(k),
      prompt: [U(k).value === 0 ? LINES.nothing : LINES.countAll], ask: [howMany(k)] })) }),
    // a friend wants a number of things: give the card that has that many (sums: the bubble shows the sum, the cards are numerals)
    gift: () => ({ rounds: pickFor(island, keys, 3, rng, T.gift).map(k => {
      const u = U(k);
      const card = v => (kind === 'fact' ? String(v) : 'q:' + v);
      return { answer: card(u.value), credit: [k], bubble: kind === 'fact' ? { fact: u } : { num: u.value }, options: shuffle([String(u.value), ...decoysFor(u.value, rng, 2, { ...dopts, noLook: true })], rng).map(card),
        prompt: kind === 'fact' ? [factQuestion(u.a, u.op, u.b)] : [LINES.giftWant, (!isl.tens && COUNT_WORDS[u.value]) || nameOf(u.value)], line: line(k) };
    }) }),
    door: () => {
      const want = pickFor(island, keys, keys.length, rng, T.door);
      // a traced numeral gives credit to the unit with that value that needs tracing most
      const unitOfKey = {};
      for (const t of isl.trace) { const k = want.find(x => A(x) === t); if (k) unitOfKey[t] = k; }
      const rank = t => { const i = want.indexOf(unitOfKey[t]); return i < 0 ? 99 : i; };
      const ks = isl.trace.filter(t => strokesFor(t)).sort((a, b) => rank(a) - rank(b)).slice(0, 3);
      return { keys: ks, unitOf: unitOfKey, lines: Object.fromEntries(ks.map(t => [t, [nameOf(t)]])), guideOpacity: Math.max(0.25, 0.6 - (n - 1) * 0.05) };
    },
    // memory: a numeral and the card with that many things (sums: the sum and its answer; every pair has a different answer)
    pairs: () => {
      const picks = [];
      for (const k of pickFor(island, keys, keys.length, rng, T.pairs)) { if (picks.length < 4 && !picks.some(p => A(p) === A(k))) picks.push(k); }
      return { prompt: LINES.pairs, pairs: picks.map(k => { const u = U(k); return { key: k,
        a: kind === 'fact' ? { fact: u } : { qty: qty(k) }, b: { num: u.value },
        sayA: kind === 'fact' ? [factQuestion(u.a, u.op, u.b)] : [(!isl.tens && COUNT_WORDS[u.value]) || nameOf(u.value)], say: [nameOf(u.value)], line: line(k), credit: [k] }; }) };
    },
    // island 1: two plates, tap the one with more (or fewer) things; the credit goes to the number on the right plate
    compare: () => ({ rounds: pickFor(island, keys, 3, rng, T.compare).map(k => {
      const v = U(k).value;
      const vals = keys.map(x => U(x).value);
      const more = v === Math.min(...vals) ? false : v === Math.max(...vals) ? true : rng() < 0.5;
      const others = vals.filter(x => (more ? x < v : x > v));
      const other = others[Math.floor(rng() * others.length)];
      return { unit: k, more, sides: shuffle([v, other], rng), right: v, pic: isl.pic, prompt: [more ? LINES.more : LINES.less], line: line(k) };
    }) }),
    // island 2: "6 7 ?" what comes next, or "6 ? 8" which one is missing
    next: () => ({ rounds: pickFor(island, keys, 3, rng, T.next).map(k => {
      const v = U(k).value;
      const middle = v + 1 in NAMES && v + 1 <= 10 && rng() < 0.4;
      return { unit: k, target: String(v), seq: middle ? [v - 1, null, v + 1] : [v - 2, v - 1, null], options: options(k, 2), prompt: [middle ? LINES.missing : LINES.nextIs], line: line(k) };
    }) }),
  };
}

// Places of an island with their params builder (theme decides which mechanics take turns at each place)
export function buildPlaces(n, island, settings, rng = Math.random, islands = {}) {
  const mechs = buildMechs(n, island, settings, rng, islands);
  return Object.fromEntries(themeOf(n).places.map(p => [p.id, () => mechs[mechAt(p, island.plays?.[p.id])]()]));
}
export const placeIdsOf = n => themeOf(n).places.map(p => p.id);
