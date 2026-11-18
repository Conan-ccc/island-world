// The one save of the island world (pure; storage is injected so tests can use a fake).
// The three old games live on the same origin: their keys are read by legacy.js and never written or removed here,
// and nothing clears the whole storage.
export const SAVE_KEY = 'island-world-save';
export const SAVE_VERSION = 1;
export const CODE_PREFIX = 'IW1:';

// each subject's own settings (the old games' settings without volume and music, which are shared)
export const SUBJECT_SETTINGS = {
  hangul: {},
  english: { letterNames: true, showUpper: true, excludeCharacter: null },
  number: { excludeCharacter: null },
};
export const SUBJECTS = Object.keys(SUBJECT_SETTINGS);

export function newIsland() {
  return { cleared: false, visited: [], days: [], mastery: {}, plays: {} };
}

export function newSubject(subject) {
  return { characterId: null, stage: 0, decorations: [], wearing: null, lastRewardDay: null, today: null, islands: {}, quests: {}, settings: { ...SUBJECT_SETTINGS[subject] } };
}

export const defaultFamily = () => [
  { name: '', role: '엄마' },
  { name: '', role: '아빠' },
  { name: '', role: '할머니' },
  { name: '', role: '할아버지' },
  { name: '', role: '기타' },
];

export function defaultState() {
  return {
    version: SAVE_VERSION,
    profile: { childName: '', family: defaultFamily() },
    settings: { volume: 0.8, music: true },
    usedCharacters: [],
    subjects: { hangul: newSubject('hangul'), english: newSubject('english'), number: newSubject('number') },
    friends: [],
    imported: { hangul: false, english: false, number: false },
    arcade: defaultArcade(),
    room: { owned: [], placed: [], snacks: 0, opened: 0 },
    saveError: false,
  };
}

// the arcade's own slot: games[id].medals[stage - 1] is 0..3 (0 = not won yet)
export function defaultArcade() {
  return { heroes: { picked: null, owned: [] }, games: {}, opened: [], allGames: false, scale: null, subject: 'mix', seen: {} };
}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
export const ARCADE_STAGES = 30;
export const ARCADE_SUBJECTS = ['mix', ...SUBJECTS];
const medal = v => (typeof v === 'number' && Number.isFinite(v) ? Math.min(3, Math.max(0, Math.trunc(v))) : 0);
// a key that would change an object's prototype instead of adding a field (a save is text anyone could have edited)
const BAD_KEY = '__proto__';
const strings = list => [...new Set((Array.isArray(list) ? list : []).filter(x => typeof x === 'string'))];
const union = (a, b) => strings([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]);
const bounded = (v, max) => Number.isInteger(v) && v >= 0 && v <= max ? v : 0;
export function repairRoom(value) {
  const r = isObj(value) ? value : {};
  return { owned: strings(r.owned), placed: (Array.isArray(r.placed) ? r.placed : []).filter(p =>
    isObj(p) && typeof p.id === 'string' && [p.x, p.y].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100)
  ).map(({ id, x, y }) => ({ id, x, y })), snacks: bounded(r.snacks, 9), opened: bounded(r.opened, 12) };
}
export function repairQuests(value) {
  const quests = {};
  for (const [id, q] of Object.entries(isObj(value) ? value : {})) {
    if (id === BAD_KEY || !isObj(q)) continue;
    quests[id] = { found: strings(q.found), done: q.done === true, gift: q.gift === true };
  }
  return quests;
}
const gameOf = g => {
  const game = isObj(g) ? g : {};
  return { ...game, medals: (Array.isArray(game.medals) ? game.medals : []).slice(0, ARCADE_STAGES).map(medal) };
};

// a broken part of the arcade slot goes back to its default; a well-formed value is never touched
function repairArcade(a) {
  const d = defaultArcade();
  if (!isObj(a)) return d;
  if (!isObj(a.heroes)) a.heroes = d.heroes;
  if (typeof a.heroes.picked !== 'string') a.heroes.picked = null;
  a.heroes.owned = strings(a.heroes.owned);
  const games = {};
  for (const [id, g] of Object.entries(isObj(a.games) ? a.games : {})) if (id !== BAD_KEY) games[id] = gameOf(g);
  a.games = games;
  a.opened = strings(a.opened);
  if (typeof a.allGames !== 'boolean') a.allGames = false;
  if (!(typeof a.scale === 'number' && Number.isFinite(a.scale) && a.scale > 0)) a.scale = null;
  if (!ARCADE_SUBJECTS.includes(a.subject)) a.subject = d.subject;
  if (!isObj(a.seen)) a.seen = {};
  return a;
}

// two copies of the arcade (two arcade tabs, or a parent's switch while the arcade was played): nothing won is lost.
// owned, opened and seen are joined; medals take the larger value per stage; picked and scale are mine when I have one;
// subject, allGames and anything else are mine (the save path decides whose allGames counts).
export function mergeArcade(mine, theirs) {
  const m = isObj(mine) ? mine : {}, t = isObj(theirs) ? theirs : {};
  const mg = isObj(m.games) ? m.games : {}, tg = isObj(t.games) ? t.games : {};
  const games = {};
  for (const id of union(Object.keys(mg), Object.keys(tg))) {
    if (id === BAD_KEY) continue;
    const a = gameOf(mg[id]).medals, b = gameOf(tg[id]).medals;
    const medals = Array.from({ length: Math.max(a.length, b.length) }, (_, i) => Math.max(a[i] ?? 0, b[i] ?? 0));
    games[id] = { ...(isObj(tg[id]) ? tg[id] : {}), ...(isObj(mg[id]) ? mg[id] : {}), medals };
  }
  const mh = isObj(m.heroes) ? m.heroes : {}, th = isObj(t.heroes) ? t.heroes : {};
  const seen = {};
  for (const src of [t.seen, m.seen]) if (isObj(src)) for (const [k, v] of Object.entries(src)) if (k !== BAD_KEY) seen[k] = v;
  return {
    ...t, ...m,
    heroes: { ...th, ...mh, picked: mh.picked ?? th.picked ?? null, owned: union(mh.owned, th.owned) },
    games,
    opened: union(m.opened, t.opened),
    scale: m.scale ?? t.scale ?? null,
    seen,
  };
}

// make `target` hold what `src` holds without replacing it: a page that keeps a reference to its arcade, its heroes or
// one of its games still sees the saved values
function fillIn(target, src) {
  for (const k of Object.keys(target)) if (!Object.hasOwn(src, k)) delete target[k];
  for (const [k, v] of Object.entries(src)) if (k !== BAD_KEY) target[k] = v;
}
function fillArcade(state, src) {
  const a = state.arcade;
  if (!isObj(a)) { state.arcade = src; return; }
  const heroes = a.heroes, games = a.games;
  fillIn(a, src);
  if (isObj(heroes) && isObj(src.heroes)) { fillIn(heroes, src.heroes); a.heroes = heroes; }
  if (isObj(games) && isObj(src.games)) {
    const kept = Object.fromEntries(Object.entries(games));
    fillIn(games, src.games);
    for (const [id, g] of Object.entries(src.games)) if (isObj(kept[id]) && isObj(g) && kept[id] !== g) { fillIn(kept[id], g); games[id] = kept[id]; }
    a.games = games;
  }
}

// objects are merged key by key, everything else (arrays included) is taken from raw as it is
export function merge(base, raw) {
  if (!isObj(raw)) return base;
  const out = { ...base };
  for (const k of Object.keys(raw)) {
    if (k === BAD_KEY) continue; // would change out's prototype instead of adding a field
    if (isObj(base[k]) && isObj(raw[k])) out[k] = merge(base[k], raw[k]);
    else if (raw[k] !== undefined) out[k] = raw[k];
  }
  return out;
}

export function migrate(raw) {
  if (!isObj(raw)) throw new Error('bad-save');
  const v = Number(raw.version || 0);
  if (v > SAVE_VERSION) throw new Error('newer-save');
  const st = merge(defaultState(), raw);
  delete st.readOnly;
  st.version = SAVE_VERSION;
  // a part of the wrong type (null, a string, an array where an object belongs, ...) holds nothing to keep:
  // it goes back to its default instead of stopping the game; a well-formed value is never touched
  const d = defaultState();
  for (const k of ['settings', 'profile', 'imported', 'arcade', 'subjects']) if (!isObj(st[k])) st[k] = d[k];
  for (const k of ['friends', 'usedCharacters']) if (!Array.isArray(st[k])) st[k] = d[k];
  // a friend entry that is not an object (null, a string) would stop the friend room and island 8: dropped
  st.friends = st.friends.filter(isObj);
  st.arcade = repairArcade(st.arcade);
  st.room = repairRoom(st.room);
  for (const subject of SUBJECTS) {
    if (!isObj(st.subjects[subject])) st.subjects[subject] = newSubject(subject);
    const sub = st.subjects[subject];
    sub.quests = repairQuests(sub.quests);
    if (!isObj(sub.islands)) sub.islands = {};
    if (!isObj(sub.settings)) sub.settings = { ...SUBJECT_SETTINGS[subject] };
    for (const [n, isl] of Object.entries(sub.islands)) sub.islands[n] = merge(newIsland(), isl);
  }
  return st;
}

function defaultStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

// Several pages can be open at once (two tabs, or a page the browser keeps in its back/forward cache), and each holds
// the whole save in memory. So that one page does not write its stale copy of another subject over that subject's
// newer progress, a state remembers (outside its own fields, never saved):
//   OWN    the subject its page works on (loadState's `own`): a subject id, 'arcade' for the arcade page, null for none
//          (the entrance), ALL when not given (tests, tools: the old behaviour)
//   READ   the save text the page last read or wrote
//   CLAIM  subjects (or 'arcade') the page has just changed on purpose (claimSubjects: a pasted old code, a whole IW1:
//          code, old saves brought in on load, a parent's switch); they are written from memory once, on the next save
// saveState: when the text in storage is no longer READ, another page has written since. If it is a newer version, this
// page does not write and becomes readOnly. If it reads, every subject this page does not own or claim (its slice, its
// imported flag, its friends) is taken from storage first, and a character another subject holds there stays in
// usedCharacters. The arcade slot is taken from storage too unless the page owns or claims it; then the page merges
// its own with storage's (mergeArcade) so nothing won in another tab is lost, and only a claiming page's allGames
// counts. The arcade object (and each game in it) is filled in place, never replaced.
// The shared fields (settings, profile, the rest of usedCharacters) are the last writer's.
// If it does not read (broken), it is written over as before. Two pages of the same subject still overwrite each other.
const ALL = '*';
const OWN = new WeakMap(), READ = new WeakMap(), CLAIM = new WeakMap();

// this page changes these subjects (or ALL) on purpose: they are written from memory on the next save
export function claimSubjects(state, subjects) {
  if (subjects === ALL) { CLAIM.set(state, ALL); return; }
  const cur = CLAIM.get(state);
  if (cur === ALL) return;
  CLAIM.set(state, new Set([...(cur || []), ...[].concat(subjects)]));
}
export const CLAIM_ALL = ALL;

// an earlier copy of a broken save with the same text (so a page opened again and again does not add one each time)
function hasCorruptCopy(storage, txt) {
  try {
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k && k.startsWith(SAVE_KEY + '-corrupt-') && storage.getItem(k) === txt) return true;
    }
  } catch { /* a storage that cannot be listed: make the copy */ }
  return false;
}

// A broken save is kept aside under <key>-corrupt-<time> (once per text) and the game starts from the default state;
// if the copy cannot be made, the default state is readOnly so that nothing writes over the broken save.
// A newer save is left alone: the default state comes back with readOnly, and saveState will not write over it.
export function loadState(storage, { own = ALL } = {}) {
  if (storage === undefined) storage = defaultStorage();
  let txt = null;
  try { txt = storage ? storage.getItem(SAVE_KEY) : null; } catch { txt = null; }
  const done = st => { OWN.set(st, own); READ.set(st, txt || null); return st; };
  if (!txt) return done(defaultState());
  try {
    return done(migrate(JSON.parse(txt)));
  } catch (e) {
    if (e?.message === 'newer-save') return done({ ...defaultState(), readOnly: true });
    if (!hasCorruptCopy(storage, txt)) {
      try {
        // never over an earlier copy made in the same millisecond
        let k = SAVE_KEY + '-corrupt-' + Date.now();
        for (let i = 1; storage.getItem(k) !== null; i++) k = SAVE_KEY + '-corrupt-' + Date.now() + '-' + i;
        storage.setItem(k, txt);
      } catch { return done({ ...defaultState(), readOnly: true }); }
    }
    return done(defaultState());
  }
}

// take what other pages wrote for the subjects (and the arcade) this page neither owns nor claims; false: a newer save is there
function takeOthers(state, now, own, claimed) {
  let other;
  try { other = migrate(JSON.parse(now)); } catch (e) { return e?.message !== 'newer-save'; }
  const mine = s => s === own || claimed.has(s);
  const room = repairRoom(state.room);
  let base;
  try { base = migrate(JSON.parse(READ.get(state))).room; } catch { /* unreadable baseline: keep local placement and snacks */ }
  state.room = { ...room, owned: union(room.owned, other.room.owned), opened: Math.max(room.opened, other.room.opened),
    placed: base && JSON.stringify(room.placed) === JSON.stringify(base.placed) ? other.room.placed : room.placed,
    snacks: base ? Math.max(0, Math.min(9, other.room.snacks + room.snacks - base.snacks)) : room.snacks };
  if (!isObj(state.subjects)) state.subjects = {};
  if (!isObj(state.imported)) state.imported = {};
  for (const s of SUBJECTS) {
    if (mine(s)) continue;
    state.subjects[s] = other.subjects[s];
    state.imported[s] = other.imported[s];
  }
  const kept = (Array.isArray(state.friends) ? state.friends : []).filter(f => !isObj(f) || !SUBJECTS.includes(f.subject) || mine(f.subject));
  const theirs = other.friends.filter(f => SUBJECTS.includes(f.subject) && !mine(f.subject));
  state.friends = [...kept, ...theirs];
  const held = new Set(SUBJECTS.filter(s => !mine(s)).map(s => state.subjects[s]?.characterId).filter(Boolean));
  for (const f of theirs) if (f.characterId) held.add(f.characterId);
  const used = Array.isArray(state.usedCharacters) ? [...state.usedCharacters] : [];
  for (const id of other.usedCharacters) if (held.has(id) && !used.includes(id)) used.push(id);
  state.usedCharacters = used;
  // the arcade: merged when this page owns or claims it, else storage's; allGames is a parent's switch, so only a page
  // that claimed the arcade (the parent page) writes its own, every other page (the arcade page included) takes storage's
  const stored = other.arcade;
  if (claimed.has('arcade')) fillArcade(state, mergeArcade(state.arcade, stored));
  else if (own === 'arcade') fillArcade(state, { ...mergeArcade(state.arcade, stored), allGames: stored.allGames });
  else fillArcade(state, stored);
  return true;
}

export function saveState(state, storage) {
  if (storage === undefined) storage = defaultStorage();
  if (state.readOnly) { state.saveError = true; return false; }
  try {
    const own = OWN.has(state) ? OWN.get(state) : ALL;
    const claim = CLAIM.get(state);
    if (own !== ALL && claim !== ALL && READ.has(state)) {
      const now = storage.getItem(SAVE_KEY);
      if (now && now !== READ.get(state) && !takeOthers(state, now, own, claim || new Set())) {
        state.readOnly = true; // a newer version wrote it: leave it alone, as on loading a newer save
        state.saveError = true;
        return false;
      }
    }
    const { saveError, readOnly, ...rest } = state;
    const txt = JSON.stringify({ ...rest, saveError: false });
    storage.setItem(SAVE_KEY, txt);
    READ.set(state, txt);
    CLAIM.delete(state);
    state.saveError = false;
    return true;
  } catch {
    state.saveError = true;
    return false;
  }
}

// "Start over" for one subject, like the old games' own reset: its character, progress and friends go, and the
// characters it used leave usedCharacters unless another subject has that character now or as a friend.
// Its own settings stay (the old english and number games kept their settings too), and so do the profile,
// the shared settings and the arcade. imported stays true so the old save does not come back in on the next load.
export function clearSubject(state, subject) {
  const old = isObj(state.subjects?.[subject]) ? state.subjects[subject] : {};
  const friends = Array.isArray(state.friends) ? state.friends : [];
  const mine = friends.filter(f => isObj(f) && f.subject === subject);
  const gone = new Set([old.characterId, ...mine.map(f => f.characterId)].filter(Boolean));
  const rest = friends.filter(f => !(isObj(f) && f.subject === subject));
  const stillHeld = new Set(rest.filter(isObj).map(f => f.characterId));
  for (const [s, sub] of Object.entries(isObj(state.subjects) ? state.subjects : {})) if (s !== subject && isObj(sub) && sub.characterId) stillHeld.add(sub.characterId);
  const used = Array.isArray(state.usedCharacters) ? state.usedCharacters.filter(id => !gone.has(id) || stillHeld.has(id)) : [];

  const fresh = newSubject(subject);
  if (isObj(old.settings)) fresh.settings = old.settings;
  state.subjects[subject] = fresh;
  state.friends = rest;
  state.usedCharacters = used;
  state.imported = { hangul: false, english: false, number: false, ...(isObj(state.imported) ? state.imported : {}), [subject]: true };
}

function toB64(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
// UTF-8 base64 -> text (throws on anything that is not)
export function fromB64(b64) {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

export function exportCode(state) {
  const { saveError, readOnly, ...rest } = state;
  return CODE_PREFIX + toB64(JSON.stringify(rest));
}

export function importCode(code) {
  const c = String(code ?? '').trim();
  if (!c.startsWith(CODE_PREFIX)) throw new Error('bad-code');
  let obj;
  try { obj = JSON.parse(fromB64(c.slice(CODE_PREFIX.length).replace(/\s+/g, ''))); } catch { throw new Error('bad-code'); }
  try { return migrate(obj); } catch (e) { if (e.message === 'newer-save') throw e; throw new Error('bad-code'); }
}
