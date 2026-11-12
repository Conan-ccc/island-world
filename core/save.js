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
  return { characterId: null, stage: 0, decorations: [], wearing: null, lastRewardDay: null, today: null, islands: {}, settings: { ...SUBJECT_SETTINGS[subject] } };
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
    arcade: { heroes: { picked: null, owned: [] }, games: {}, seen: {} },
    saveError: false,
  };
}

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);

// objects are merged key by key, everything else (arrays included) is taken from raw as it is
export function merge(base, raw) {
  if (!isObj(raw)) return base;
  const out = { ...base };
  for (const k of Object.keys(raw)) {
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
  for (const subject of SUBJECTS) {
    if (!isObj(st.subjects[subject])) st.subjects[subject] = newSubject(subject);
    const sub = st.subjects[subject];
    if (!isObj(sub.islands)) sub.islands = {};
    if (!isObj(sub.settings)) sub.settings = { ...SUBJECT_SETTINGS[subject] };
    for (const [n, isl] of Object.entries(sub.islands)) sub.islands[n] = merge(newIsland(), isl);
  }
  return st;
}

function defaultStorage() {
  try { return globalThis.localStorage || null; } catch { return null; }
}

// A broken save is kept aside under <key>-corrupt-<time> and the game starts from the default state.
// A newer save is left alone: the default state comes back with readOnly, and saveState will not write over it.
export function loadState(storage) {
  if (storage === undefined) storage = defaultStorage();
  let txt = null;
  try { txt = storage ? storage.getItem(SAVE_KEY) : null; } catch { txt = null; }
  if (!txt) return defaultState();
  try {
    return migrate(JSON.parse(txt));
  } catch (e) {
    if (e?.message === 'newer-save') return { ...defaultState(), readOnly: true };
    try { storage.setItem(SAVE_KEY + '-corrupt-' + Date.now(), txt); } catch { /* ignore */ }
    return defaultState();
  }
}

export function saveState(state, storage) {
  if (storage === undefined) storage = defaultStorage();
  if (state.readOnly) { state.saveError = true; return false; }
  try {
    const { saveError, readOnly, ...rest } = state;
    storage.setItem(SAVE_KEY, JSON.stringify({ ...rest, saveError: false }));
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
