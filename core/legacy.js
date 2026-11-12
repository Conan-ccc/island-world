// The three old games' saves and backup codes, brought into the one save (pure; storage is injected).
// The old keys are only ever read here: nothing in this file writes or removes a storage key.
import { newIsland, newSubject, defaultFamily, merge, fromB64, SUBJECT_SETTINGS } from './save.js';

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const clone = v => JSON.parse(JSON.stringify(v));
// the same keys with the same values (JSON), in any key order
const canon = v => (Array.isArray(v) ? v.map(canon) : isObj(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v);
const sameEntry = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

// ---- the old games' own migrate, moved here as they were (the old games' save.js; same merge and island shape) ----

// hangul island (save version 1): keeps a profile, settings only { volume }, keeps other subjects it finds
function hangulDefault() {
  return {
    version: 1,
    profile: {
      childName: '',
      family: [
        { name: '', role: '엄마' },
        { name: '', role: '아빠' },
        { name: '', role: '할머니' },
        { name: '', role: '할아버지' },
        { name: '', role: '기타' },
      ],
    },
    settings: { volume: 0.8 },
    usedCharacters: [],
    subjects: {
      hangul: { characterId: null, stage: 0, decorations: [], wearing: null, lastRewardDay: null, islands: {} },
    },
    friends: [],
    saveError: false,
  };
}
function hangulMigrate(raw) {
  if (!isObj(raw)) throw new Error('bad-save');
  const v = Number(raw.version || 0);
  if (v > 1) throw new Error('newer-save');
  const st = merge(hangulDefault(), raw);
  st.version = 1;
  for (const [n, isl] of Object.entries(st.subjects.hangul.islands || {})) {
    st.subjects.hangul.islands[n] = merge(newIsland(), isl);
  }
  return st;
}

// english island (save version 2): never keeps names, drops a hangul subject, v1 -> v2 turns letter names on
function englishDefault() {
  return {
    version: 2,
    settings: { volume: 0.8, music: true, letterNames: true, showUpper: true, excludeCharacter: null },
    usedCharacters: [],
    subjects: {
      english: { characterId: null, stage: 0, decorations: [], wearing: null, lastRewardDay: null, today: null, islands: {} },
    },
    friends: [],
    saveError: false,
  };
}
function englishMigrate(raw) {
  if (!isObj(raw)) throw new Error('bad-save');
  const v = Number(raw.version || 0);
  if (v > 2) throw new Error('newer-save');
  const { profile, ...rest } = raw; // this game never keeps names
  const st = merge(englishDefault(), rest);
  delete st.profile;
  if (st.subjects.hangul) delete st.subjects.hangul;
  // v2: letter names (A = "ay", C = "see") are on by default; turn them on once for older saves
  if (v < 2) st.settings.letterNames = true;
  st.version = 2;
  for (const [n, isl] of Object.entries(st.subjects.english.islands || {})) {
    st.subjects.english.islands[n] = merge(newIsland(), isl);
  }
  return st;
}

// number island (save version 1): never keeps names, keeps only its own subject
function numberDefault() {
  return {
    version: 1,
    settings: { volume: 0.8, music: true, excludeCharacter: null },
    usedCharacters: [],
    subjects: {
      number: { characterId: null, stage: 0, decorations: [], wearing: null, lastRewardDay: null, today: null, islands: {} },
    },
    friends: [],
    saveError: false,
  };
}
function numberMigrate(raw) {
  if (!isObj(raw)) throw new Error('bad-save');
  const v = Number(raw.version || 0);
  if (v > 1) throw new Error('newer-save');
  const { profile, ...rest } = raw; // this game never keeps names
  const st = merge(numberDefault(), rest);
  delete st.profile;
  for (const k of Object.keys(st.subjects)) if (k !== 'number') delete st.subjects[k];
  st.version = 1;
  for (const [n, isl] of Object.entries(st.subjects.number.islands || {})) {
    st.subjects.number.islands[n] = merge(newIsland(), isl);
  }
  return st;
}

export const LEGACY = {
  hangul: { key: 'hangul-island-save', prefix: 'HG1:', version: 1, migrate: hangulMigrate },
  english: { key: 'english-island-save', prefix: 'EI1:', version: 2, migrate: englishMigrate },
  number: { key: 'number-island-save', prefix: 'NI1:', version: 1, migrate: numberMigrate },
};
const ORDER = ['hangul', 'english', 'number'];

function defaultStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

// every old save that can be read, already through its old migrate; broken and newer ones are skipped
export function readLegacy(storage) {
  if (storage === undefined) storage = defaultStorage();
  const out = {};
  for (const subject of ORDER) {
    let txt = null;
    try { txt = storage ? storage.getItem(LEGACY[subject].key) : null; } catch { txt = null; }
    if (!txt) continue;
    try { out[subject] = LEGACY[subject].migrate(JSON.parse(txt)); } catch { /* broken or newer: leave it */ }
  }
  return out;
}

// an old backup code (HG1:, EI1:, NI1:) -> { subject, legacy }, read the way the old importCode read it
export function decodeLegacyCode(code) {
  const c = String(code ?? '').trim();
  const subject = ORDER.find(s => c.startsWith(LEGACY[s].prefix));
  if (!subject) throw new Error('bad-code');
  let obj;
  try { obj = JSON.parse(fromB64(c.slice(LEGACY[subject].prefix.length).replace(/\s+/g, ''))); } catch { throw new Error('bad-code'); }
  try { return { subject, legacy: LEGACY[subject].migrate(obj) }; } catch (e) { if (e.message === 'newer-save') throw e; throw new Error('bad-code'); }
}

// a character, or any mastery record on any island
export function hasProgress(sub) {
  if (!isObj(sub)) return false;
  if (sub.characterId) return true;
  return Object.values(sub.islands || {}).some(isl => isObj(isl?.mastery) && Object.keys(isl.mastery).length > 0);
}

// One old save into one subject of the state. Without force a subject that already has progress is left alone.
// Everything is worked out first and assigned at the end, so a throw leaves the state exactly as it was.
// keepSound: the shared volume and music stay as they are (a code pasted in the parent panel); without it the rule below.
export function mergeLegacy(state, subject, legacy, { force = false, keepSound = false } = {}) {
  const lg = clone(LEGACY[subject].migrate(legacy)); // raw or already migrated; newer-save is thrown as it is
  if (!force && hasProgress(state.subjects[subject])) return { ok: false, reason: 'has-progress' };
  const imported = isObj(state.imported) ? state.imported : {};
  const firstImport = !Object.values(imported).some(Boolean);

  // the subject: old record on a fresh subject, every island on a fresh island; mastery keys are kept as they are
  const sub = merge(newSubject(subject), lg.subjects[subject]);
  sub.islands = {};
  for (const [n, isl] of Object.entries(lg.subjects[subject]?.islands || {})) sub.islands[n] = merge(newIsland(), isl);
  sub.settings = { ...SUBJECT_SETTINGS[subject] };
  const ls = isObj(lg.settings) ? lg.settings : {};
  for (const k of Object.keys(SUBJECT_SETTINGS[subject])) if (k in ls) sub.settings[k] = ls[k];

  // volume and music: hangul always wins; english and number only when they are the first subject brought in
  const sound = {};
  if (!keepSound && (subject === 'hangul' || firstImport)) {
    if (ls.volume !== undefined) sound.volume = ls.volume;
    sound.music = ls.music !== false; // the old games all treated a missing music as on
  }

  const used = Array.isArray(state.usedCharacters) ? [...state.usedCharacters] : [];
  for (const id of Array.isArray(lg.usedCharacters) ? lg.usedCharacters : []) if (!used.includes(id)) used.push(id);

  // friends: entries that are not objects are dropped (they would stop the friend room and island 8)
  let friends = Array.isArray(state.friends) ? [...state.friends] : [];
  if (force) friends = friends.filter(f => f?.subject !== subject);
  for (const f of Array.isArray(lg.friends) ? lg.friends : []) {
    if (!isObj(f)) continue;
    const item = { ...f, subject: f.subject || subject };
    // only an entry the same in every field is the same friend (two friends with the same character finished on
    // different days are two, as the old games kept them)
    if (!friends.some(g => isObj(g) && sameEntry(g, item))) friends.push(item);
  }

  let profile = null;
  if (subject === 'hangul' && isObj(lg.profile)) {
    const fam = lg.profile.family;
    profile = { ...lg.profile, family: Array.isArray(fam) && fam.length === 0 ? defaultFamily() : fam };
  }

  // nothing above changed the state; from here on only plain assignments
  if (!isObj(state.subjects)) state.subjects = {};
  state.subjects[subject] = sub;
  if (isObj(state.settings)) Object.assign(state.settings, sound);
  else state.settings = { volume: 0.8, music: true, ...sound };
  state.usedCharacters = used;
  state.friends = friends;
  if (profile) state.profile = profile;
  state.imported = { hangul: false, english: false, number: false, ...imported, [subject]: true };
  return { ok: true };
}

// Bring in every old save not brought in yet (hangul, english, number). The caller saves when something came in.
export function adoptLegacy(state, storage) {
  if (state.readOnly) return [];
  const imported = state.imported || {};
  if (ORDER.every(s => imported[s])) return [];
  const found = readLegacy(storage);
  const got = [];
  for (const subject of ORDER) {
    if (imported[subject] || !found[subject]) continue;
    try { if (mergeLegacy(state, subject, found[subject]).ok) got.push(subject); } catch { /* leave this subject as it is */ }
  }
  return got;
}
