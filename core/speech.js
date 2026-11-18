// Speech: prepared free AI voice clips (<subject assets>/voice/<hash>.mp3) through Web Audio.
// speak() takes one text or an array of texts and plays them in order, e.g. ['삼', '열매를 따볼까?'].
// Missing clips can fall back to the built-in voice. A prepared clip stays silent while audio is locked.
// What differs between the subjects comes in once per page with configureSpeech(): the clip index and hash, the phrases,
// and optional hooks (english: letter-sound tokens and the parent's sound choice; hangul: "<item> <ending>" clips, jamo names).
import { audioContext, outputNode, duckMusic } from './fx.js';
import { asset } from './env.js';

const NO_HOOKS = { suffixes: null, resolve: null, ttsText: null, spokenForm: null, keepTtsResult: false };
let cfg = { files: new Set(), hash: t => String(t), base: '', sources: [], subject: null, ...NO_HOOKS };
export let PHRASES = {};
export const SPEECH_OVERRIDES = {};

// index: Set of clip hashes, hash: the subject's voiceHash, base: the clip folder under the subject's assets (each
// clip's address is made by asset(): a clip the subjects share is under assets/common/),
// phrases: phrase keys -> text ({item} etc. filled in by phrase()), extra: optional hooks
//   suffixes: endings a sentence may be split at ("나" + "열매를 따볼까?"), resolve(piece, choices): the clip token played,
//   ttsText(piece): { lang, text } for the built-in voice, spokenForm(token): how a letter is said,
//   keepTtsResult: speak() reports the built-in voice's own result even when a newer speech cut it off
export function configureSpeech({ index, hash, base = 'voice/', subject, sources = [], phrases = {}, extra = {} }) {
  cfg = { files: index, hash, base, subject, sources, ...NO_HOOKS, ...extra };
  PHRASES = phrases;
  buffers.clear();
}

export function phrase(key, vars = {}) {
  const t = PHRASES[key] || '';
  return t.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '')).trim();
}

export function spokenForm(token) {
  const t = String(token ?? '');
  if (SPEECH_OVERRIDES[t]) return SPEECH_OVERRIDES[t];
  return cfg.spokenForm ? cfg.spokenForm(t) : t;
}

// Parent's choice per letter on tools/voice-check.html (english): 1..3 = sound candidate, 'word' = say the keyword instead.
// The english game kept it under its own key: it is copied once to the new key, the old key is only ever read.
export const CHOICE_KEY = 'island-world-sound-choice';
const OLD_CHOICE_KEY = 'english-island-sound-choice';
let choices = null;
function defaultStorage() { try { return globalThis.localStorage || null; } catch { return null; } }
function readChoices(st) {
  let txt = null;
  try {
    txt = st ? st.getItem(CHOICE_KEY) : null;
    if (txt === null && st) {
      const old = st.getItem(OLD_CHOICE_KEY);
      if (old !== null) { txt = old; try { st.setItem(CHOICE_KEY, old); } catch { /* ignore */ } }
    }
  } catch { txt = null; }
  try { return JSON.parse(txt || '{}') || {}; } catch { return {}; }
}
// storage given (tests): read it now; not given: this page's storage, read once
export function soundChoices(storage) {
  if (storage !== undefined) return readChoices(storage);
  if (!choices) choices = readChoices(defaultStorage());
  return choices;
}
export function setSoundChoice(letter, value, storage) {
  const own = storage === undefined;
  const st = own ? defaultStorage() : storage;
  const c = { ...(own ? soundChoices() : readChoices(st)) };
  if (value === 1 || value === '1' || value == null) delete c[letter]; else c[letter] = value === 'word' ? 'word' : Number(value);
  if (own) choices = c;
  try { st?.setItem(CHOICE_KEY, JSON.stringify(c)); } catch { /* ignore */ }
}

// The clip token actually played for a piece
export function resolvePiece(piece, ch) {
  return cfg.resolve ? cfg.resolve(piece, ch === undefined ? soundChoices() : ch) : String(piece).trim();
}
// Text for the built-in voice
export function ttsText(piece) {
  return cfg.ttsText ? cfg.ttsText(piece) : { lang: 'ko', text: String(piece ?? '').trim() };
}

export const pieces = x => (Array.isArray(x) ? x : [x]).map(t => String(t ?? '').trim()).filter(Boolean);

let volume = 0.8;
export function setSpeechVolume(v) { volume = Math.max(0, Math.min(1, Number(v))); }

// Sources share the token hash and base path. Each index points to its own asset directory.
function clipSource(hash) {
  return cfg.files.has(hash) ? cfg : cfg.sources.find(source => source.index.has(hash));
}
export const hasClip = token => !!clipSource(cfg.hash(token));

// Clip-able parts of a piece: the exact clip, or "<item> <ending>" (subjects that give endings), or null (built-in voice)
export function clipParts(text) {
  const t = String(text ?? '').trim();
  if (!t) return [];
  if (hasClip(t)) return [t];
  for (const s of cfg.suffixes || []) {
    if (t.endsWith(s)) {
      const head = t.slice(0, t.length - s.length).replace(/[\s,]+$/, '');
      if (head && hasClip(head)) return [head, s];
    }
  }
  return null;
}

const buffers = new Map();
function loadClip(token) {
  const h = cfg.hash(token);
  if (!buffers.has(h)) {
    const ctx = audioContext();
    const subject = clipSource(h)?.subject ?? cfg.subject;
    const p = ctx ? fetch(asset(cfg.base + h + '.mp3', subject)).then(r => { if (!r.ok) throw new Error('nofile'); return r.arrayBuffer(); }).then(b => ctx.decodeAudioData(b)) : Promise.reject(new Error('noaudio'));
    buffers.set(h, p);
    p.catch(() => buffers.delete(h));
  }
  return buffers.get(h);
}
export function preloadSpeech(list) {
  for (const t of list.flatMap(pieces)) { const p = clipParts(resolvePiece(t)); if (p) p.forEach(x => loadClip(x).catch(() => {})); }
}

let current = null;
let token = 0, releaseTimer;
function speechStarted() { clearTimeout(releaseTimer); duckMusic(true); }
function speechEnded(my) {
  if (my !== token) return;
  clearTimeout(releaseTimer);
  releaseTimer = setTimeout(() => duckMusic(false), 300);
}
function stopCurrent() {
  token++;
  if (current) { try { current.stop(); } catch { /* ignore */ } current = null; }
  try { globalThis.speechSynthesis?.cancel(); } catch { /* ignore */ }
}
export function stopSpeech() { stopCurrent(); clearTimeout(releaseTimer); duckMusic(false); }

async function playClips(parts, my) {
  const ctx = audioContext();
  if (!ctx) return false;
  // resume() can stay pending forever without a user gesture: never wait on it for long
  if (ctx.state === 'suspended') { try { await Promise.race([ctx.resume(), new Promise(r => setTimeout(r, 300))]); } catch { /* ignore */ } }
  if (ctx.state !== 'running') return null; // locked: skip this piece without using TTS
  for (let i = 0; i < parts.length; i++) {
    let buf;
    try { buf = await loadClip(parts[i]); } catch { return false; }
    if (my !== token) return true;
    await new Promise(res => {
      const src = ctx.createBufferSource(); const g = ctx.createGain();
      g.gain.value = Math.max(0.0001, volume * 1.25);
      src.buffer = buf; src.connect(g); g.connect(outputNode() || ctx.destination);
      src.onended = res; current = src; src.start(); speechStarted();
      setTimeout(res, buf.duration * 1000 + 400);
    });
    speechEnded(my);
    if (my !== token) return true;
    if (i < parts.length - 1) await new Promise(r => setTimeout(r, 90));
  }
  return true;
}

function synth() { return globalThis.speechSynthesis || null; }
const voices = { ko: null, en: null };
function pickVoice(lang) {
  const s = synth(); if (!s || !s.getVoices) return null;
  const all = s.getVoices();
  if (lang === 'en') {
    const us = all.filter(v => /^en[-_]US/i.test(v.lang)), en = all.filter(v => /^en/i.test(v.lang));
    return us.find(v => /enhanced|premium/i.test(v.name)) || us.find(v => v.default) || us[0] || en[0] || null;
  }
  const vs = all.filter(v => /^ko/i.test(v.lang));
  return vs.find(v => /enhanced|premium|고품질/i.test(v.name)) || vs.find(v => v.default) || vs.find(v => v.localService) || vs[0] || null;
}
export function unlockSpeech() {
  const s = synth(); if (!s || typeof SpeechSynthesisUtterance === 'undefined') return;
  try {
    const u = new SpeechSynthesisUtterance(' '); u.volume = 0; u.lang = 'ko-KR'; s.speak(u);
    voices.ko = pickVoice('ko'); voices.en = pickVoice('en');
    s.addEventListener?.('voiceschanged', () => { voices.ko = pickVoice('ko'); voices.en = pickVoice('en'); });
  } catch { /* ignore */ }
}
function tts({ lang, text }, opts, my) {
  const s = synth();
  if (!text || !s || typeof SpeechSynthesisUtterance === 'undefined') return Promise.resolve(false);
  return new Promise(resolve => {
    let done = false;
    const finish = ok => { if (!done) { done = true; clearTimeout(timer); speechEnded(my); resolve(ok); } };
    const timer = setTimeout(() => finish(false), Math.max(3000, String(text).length * 400));
    try {
      const u = new SpeechSynthesisUtterance(String(text));
      if (lang === 'en') { u.lang = 'en-US'; u.rate = 0.8; u.pitch = 1; } else { u.lang = 'ko-KR'; u.rate = opts.rate ?? 0.85; u.pitch = opts.pitch ?? 1.1; }
      u.volume = volume;
      if (!voices[lang]) voices[lang] = pickVoice(lang);
      if (voices[lang]) u.voice = voices[lang];
      u.onstart = () => { if (!done && my === token) speechStarted(); };
      u.onend = () => finish(my === token); u.onerror = () => finish(false);
      s.speak(u);
    } catch { finish(false); }
  });
}

// Resolves true when every piece was spoken, false when some piece could not be played at all.
export async function speak(x, opts = {}) {
  const list = pieces(x);
  if (!list.length) return false;
  speechEnded(token); stopCurrent();
  const my = token;
  let all = true;
  for (let i = 0; i < list.length; i++) {
    const piece = resolvePiece(list[i]);
    const parts = clipParts(piece);
    let ok = !!(parts && parts.length) && await playClips(parts, my);
    if (my !== token) return true;
    if (ok === false) {
      ok = await tts(ttsText(piece), opts, my);
      if (my !== token && !cfg.keepTtsResult) return true;
    }
    if (!ok) all = false;
    if (i < list.length - 1) await new Promise(r => setTimeout(r, 90));
  }
  return all;
}
