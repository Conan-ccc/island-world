// 영어 섬: what the english game does its own way. The island engine, core/activities and core/speech read this.
import * as curriculum from './curriculum.js';
import * as themes from './themes.js';
import * as strokes from './strokes.js';
import { islandUnits, buildMechs, creditable } from './island-content.js';
import { voiceHash, LINES, SUFFIXES } from './voice-keys.js';
import { VOICE_FILES } from './voice-index.js';
import { SOUND_MODE, EN_LINES } from './en-voice.js';
import { isLetter, parseToken } from './english.js';
import { asset, siteUrl } from '../../core/env.js';
import { el, esc, showBoard } from '../../core/activities/common.js';

const { WORDS, LETTERS } = curriculum;

// What a play token looks like: a letter is a big lowercase letter, a word is its picture with the word small underneath
export function tokenHtml(t, px = 56) {
  if (isLetter(t)) return `<span class="tok-letter" style="font-size:${px}px">${esc(t)}</span>`;
  const w = WORDS[t];
  return `<span class="tok-word"><img src="${w ? asset(w.pic) : ''}" alt=""><small>${esc(t)}</small></span>`;
}
// What tapping a token says
export const tokenSay = t => (isLetter(t) ? 'en:sound:' + t : 'en:' + t);

const EAR = '<svg viewBox="0 0 60 60" width="90" height="90"><path d="M20 40 C8 26 16 8 32 8 C46 8 52 20 46 30 C42 36 36 36 36 44 C36 52 26 54 22 48" fill="#FFE3EC" stroke="#FF8FB1" stroke-width="4" stroke-linecap="round"/><path d="M28 28 C28 22 36 20 38 26" fill="none" stroke="#FF8FB1" stroke-width="4" stroke-linecap="round"/></svg>';
// Top board: "S s" + keyword picture + keyword with its first letter highlighted, or a word picture, or (listen-only) an ear
export function board(ctx, spec) {
  let inner = '';
  if (!spec) {
    inner = EAR;
  } else {
    if (spec.letter) inner += `<div class="bbig tok-letter">${ctx.settings?.showUpper === false ? '' : `<span class="bup">${esc(spec.letter.toUpperCase())}</span>`}${esc(spec.letter)}</div>`;
    if (spec.pic) inner += `<img src="${asset(spec.pic)}" alt="">`;
    if (spec.word) {
      const w = spec.word, l = spec.letter;
      inner += `<div class="bword tok-letter">${l && w.startsWith(l) ? `<b>${esc(l)}</b>${esc(w.slice(1))}` : `<b>${esc(w)}</b>`}</div>`;
    }
  }
  return showBoard(ctx, inner);
}

// A letter block (lowercase letter in the letter font)
export function jblock(text, size = 110) {
  const b = el('div', `position:absolute;left:0;top:0;width:${size}px;height:${size}px;font-size:${Math.round(size * 0.66)}px`, '', 'jblock tok-letter' + (/[aeiou]/.test(text) ? ' v' : ''));
  b.textContent = text; b.dataset.text = text;
  return b;
}

// how the plays draw the english game's letters and words (core/activities/<play>.js says what each key does)
const look = {
  gift: {
    bubble: () => ({ style: 'position:absolute;background:#fff;border-radius:30px;padding:10px 26px;box-shadow:0 8px 18px rgba(80,60,100,.18);z-index:4;min-width:110px;text-align:center;font-size:64px;font-weight:800;color:#FF6FA5;cursor:pointer', html: '?', cls: 'bubble' }),
    card: (t, k) => ({ style: 'position:absolute;width:min(17vw,22vh);padding:8px;border-radius:22px;background:#fff;border:4px solid #FFC2D9;text-align:center;box-shadow:0 6px 0 rgba(0,0,0,.08);z-index:5', html: tokenHtml(t), cls: 'card pic-card', x: 28 + (k % 2) * 16, y: 28 + k * 23 }),
    say: t => 'en:' + t,
    // tapping the bubble or the friend says the word again (without "친구가 뭘 갖고 싶대?")
    again: r => r.line,
    solved: (bubble, r) => { bubble.innerHTML = tokenHtml(r.answer); },
  },
  door: {
    board: key => (key.length === 1 ? { letter: key } : { word: key }),
    line: (key, lines) => lines[key] || ['en:' + key],
    // writing lines: x-height and baseline (letters sit on the baseline)
    guides: key => {
      const k = key.length === 1 ? 1 : Math.min(1, 1.9 / key.length);
      const y = v => 50 + (v - 50) * k;
      return `<svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><line x1="4" x2="96" y1="${y(45)}" y2="${y(45)}" stroke="#E7D8EE" stroke-width="1" stroke-dasharray="3 3"/><line x1="4" x2="96" y1="${y(80)}" y2="${y(80)}" stroke="#D9C2E4" stroke-width="1.4"/></svg>`;
    },
    tracer: key => ({ width: key.length === 1 ? 10 : 6 }),
  },
  scratch: {
    picture: r => `<img src="${asset(r.pic)}" alt="" style="width:80%;height:80%;object-fit:contain;pointer-events:none">`,
    afterRub: r => ['en:' + r.word],
    button: (t, options) => {
      const letters = options.every(isLetter);
      return { style: `border:none;min-width:${letters ? 'min(15vw,19vh)' : 'min(22vw,26vh)'};height:min(15vw,19vh);padding:0 18px;border-radius:26px;background:#fff;box-shadow:0 8px 0 #F3C4D8,0 14px 18px rgba(80,50,80,.2);color:#4A3A48;display:flex;align-items:center;justify-content:center;cursor:pointer;transform:scale(.3);opacity:0;transition:transform .35s cubic-bezier(.3,1.6,.5,1), opacity .35s`, html: `<span class="tok-letter" style="font-size:${letters ? 'min(10vw,12vh)' : t.length > 5 ? 'min(4.6vw,5.6vh)' : 'min(6.4vw,7.8vh)'}">${t.replace(/[<>&]/g, '')}</span>` };
    },
  },
  pairs: {
    // side 'a' is the picture, side 'b' the letter (letter islands) or the word
    face: (f, p, side, spec) => {
      const kind = spec.kind ?? 'pic-letter';
      if (side === 'a') f.innerHTML = `<img src="${asset(p.pic)}" alt="" style="width:80%;height:80%;object-fit:contain">`;
      else f.innerHTML = `<span class="tok-letter" style="font-size:${kind === 'pic-letter' ? 'min(10vw,12vh)' : p.face.length > 4 ? 'min(4.5vw,5.5vh)' : 'min(6vw,7.5vh)'};color:#4A3A48">${p.face.replace(/[<>&]/g, '')}</span>`;
    },
  },
  bridge: {
    block: jblock,
    say: t => 'en:sound:' + t,
    size: n => Math.min(130, Math.floor((window.innerWidth * 0.8) / Math.max(3, n)) - 12),
    workshop: mode => mode === 'cvc',
    walk: mode => mode === 'initial',
    mergedFont: (S, n) => `font-size:${Math.round(Math.min(S * 1.3, 900 / n))}px;`,
    mergedClass: 'tok-letter merged',
  },
};

// the english content in the shape the core plays read (the content functions themselves are unchanged)
function shapeMechs(mechs) {
  const out = { ...mechs };
  // the word picture is the board; the blocks are the letters
  out.bridge = () => { const m = mechs.bridge(); return { ...m, rounds: m.rounds.map(r => ({ ...r, show: { pic: r.pic } })) }; };
  // turning over the picture says its word; a found pair says the letter's sound and the word (letter islands) or the word
  out.pairs = () => {
    const m = mechs.pairs();
    const kind = m.kind ?? 'pic-letter';
    return { ...m, pairs: m.pairs.map(p => ({ ...p, sayA: ['en:' + p.word], line: kind === 'pic-letter' ? [...p.say, 'en:' + p.word] : ['en:' + p.word] })) };
  };
  return out;
}

// the clip played for a letter sound follows SOUND_MODE and the parent's choice; the built-in voice says the keyword
function resolve(piece, ch) {
  const p = parseToken(piece);
  if (p.kind !== 'sound') return String(piece).trim();
  const c = ch[p.value];
  if (c === 'word' || (SOUND_MODE[p.value] === 'word' && !c)) return 'en:' + LETTERS[p.value].keyword;
  if (c === 2 || c === 3) return `en:soundcand:${p.value}:${c}`;
  return String(piece).trim();
}
function ttsText(piece) {
  const p = parseToken(piece);
  if (p.kind === 'sound' || p.kind === 'soundcand') return { lang: 'en', text: LETTERS[p.value]?.keyword || '' };
  if (p.kind === 'name') return { lang: 'en', text: p.value };
  return { lang: p.lang, text: p.value };
}

// the parent panel: letter names, capitals, the hangul-island friend and the pronunciation check, after the sound
const VOICE_CHECK = siteUrl('tools/voice-check.html?subject=english');
function parentRows(state, ctx) {
  const s = state.subjects.english.settings; // this subject's own settings
  ctx.onSave(() => {
    s.letterNames = ctx.$('.pp-names').checked;
    s.showUpper = ctx.$('.pp-upper').checked;
    s.excludeCharacter = ctx.$('.pp-exclude').value || null;
    return true;
  });
  return ctx.nodes(`
    ${ctx.check('pp-names', !!s.letterNames, '글자 이름도 들려주기 (예: "ess, sss, sun") — 기본은 켜짐')}
    ${ctx.check('pp-upper', s.showUpper !== false, '대문자도 옆에 작게 보이기 (예: "S s")')}
    <h3>한글 섬 친구</h3><div style="font-size:13px;color:#888">한글 섬에서 키우는 친구를 고르면, 영어 섬에서는 다른 친구가 태어나요.</div>
    ${ctx.characterSelect(s.excludeCharacter)}
    <h3>발음 확인</h3><div style="font-size:13px;color:#888">글자 소리가 어색하면 <a href="${VOICE_CHECK}" target="_blank">발음 확인 페이지</a>에서 글자마다 다른 소리나 "단어로 대신"을 고를 수 있어요.</div>`);
}

export const subject = {
  id: 'english',
  world: { id: 'autumn', accent: '#FF8A3C', accentSoft: '#FFB36B', drift: 'leaf' },
  title: '영어 섬 여행',
  themeColor: '#7FD8C4',
  islands: { available: [1, 2, 3, 4, 5, 6, 7, 8], count: 8 },
  curriculum,
  themes,
  strokes,
  // ctx = { profile, settings, rng, islands }
  content: {
    islandUnits: n => islandUnits(n),
    buildMechs: (n, island, ctx = {}) => shapeMechs(buildMechs(n, island, ctx.settings, ctx.rng, ctx.islands)),
    creditable: (n, mech) => creditable(n, mech),
  },
  lines: LINES,
  voice: { index: VOICE_FILES, hash: voiceHash, base: 'voice/', phrases: { ...SUFFIXES, tryAgain: LINES.tryAgain, great: LINES.great, soon: LINES.soon, cleared: LINES.cleared }, extra: { resolve, ttsText } },
  runners: ['fruit', 'bridge', 'gift', 'door', 'find', 'rise', 'pairs', 'catch', 'hop', 'scratch'],
  features: { party: true, plays: true },
  token: { html: tokenHtml, say: tokenSay, isSpecial: isLetter },
  board,
  praise: ['와, 잘했어!', '최고야!', '멋지다!', ...EN_LINES.good],
  look,
  onIslandStart() {},
  // the letter font (one-storey a and g), put in by core/env.js useFonts: the old ui.css @font-face
  fonts: [{ family: 'Island Letters', file: 'font/island-letters.woff2', descriptors: { 'font-weight': '400 900', 'font-display': 'block' } }],
  // the island map (core/island.js): "Hello!" before the welcome, "Bye-bye!" before going home, what a mission bar
  // button shows and says, review questions recorded on the island the unit belongs to
  greet: EN_LINES.hello,
  byeLine: EN_LINES.bye,
  preloadLines: [...EN_LINES.good, EN_LINES.hello, EN_LINES.bye],
  unitLine: (u, kind, settings) => curriculum.unitLine(curriculum.unitOf(u, kind), settings, SOUND_MODE),
  unitBadge: (u, kind) => (kind === 'letter' ? tokenHtml(u, 34) : `<img src="${asset(curriculum.unitOf(u, kind).pic)}" alt="" style="height:42px;width:42px;object-fit:contain;display:block">`),
  recordIsland: curriculum.homeIsland,
  // the home (core/sea.js): the parent can name another island's friend so this game hatches a different one
  friendChoice: true,
  parent: {
    needsSetup: () => false, // this game never asks for names
    // "mark as cleared" grows the character one stage, the same as clearing the island in play
    clearStage: stage => Math.min(7, stage + 1),
    rows: parentRows,
    rowsAt: 'sound',
    voiceCheckUrl: VOICE_CHECK,
    allIslands: true, // the progress table lists every island ("아직 안 감" for one not visited)
    label: (n, k) => (curriculum.ISLANDS[n].kind === 'letter' ? `${k} ${LETTERS[k].ipa}` : k),
    accent: '#BFEDE2',
    words: {
      sound: '소리',
      units: '익힌 것',
      clearAsk: '섬을 완료로 처리할까요? 캐릭터가 한 단계 자라요.',
      reset: '영어 섬의 캐릭터와 진행 상황만 지워져요(한글 섬 기록은 그대로).',
      newerCode: '더 새 버전의 코드예요. 앱을 새로 고친 뒤 다시 해 주세요.',
    },
  },
};
export default subject;
