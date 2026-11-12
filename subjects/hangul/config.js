// 한글 섬: what the hangul game does its own way. The island engine, core/activities and core/speech read this.
// The hangul plays show a token as plain bold text whose size follows its length (no token font), and the hangul
// content builds its questions from phrases: shapeMechs() turns its specs into the shape the core plays read.
import * as curriculum from './curriculum.js';
import * as themes from './themes.js';
import * as strokes from './strokes.js';
import { islandUnits, buildMechs, creditable } from './island-content.js';
import { voiceHash, LINES, SUFFIXES, PHRASES } from './voice-keys.js';
import { VOICE_FILES } from './voice-index.js';
import { compose, isConsonant, isVowel, jamoName } from './hangul.js';
import { el, esc, picUrl, showBoard } from '../../core/activities/common.js';
import { defaultFamily } from '../../core/save.js';

const fill = (key, vars = {}) => (PHRASES[key] || '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? '')).trim();
const isJamo = t => !/[가-힣]/.test(t);

// Top letter board: picture + word with the target highlighted, or just a big letter
export function board(ctx, { pic, word, target, big }) {
  let inner = '';
  if (pic) inner += `<img src="${picUrl(pic)}" alt="">`;
  if (word) {
    const t = target || '';
    const i = t ? word.indexOf(t) : -1;
    inner += `<div class="bword">${i >= 0 ? word.slice(0, i) + '<b>' + t + '</b>' + word.slice(i + t.length) : '<b>' + word + '</b>'}</div>`;
  } else if (big || target) inner += `<div class="bbig">${big || target}</div>`;
  return showBoard(ctx, inner);
}

export const isVowelJamo = j => /[ㅏ-ㅣ]/.test(j);
// A letter block (jamo or syllable) styled by kind
export function jblock(text, size = 110) {
  const kind = text.length > 1 || /[가-힣]/.test(text) ? 's' : (isVowelJamo(text) ? 'v' : '');
  const b = el('div', `position:absolute;left:0;top:0;width:${size}px;height:${size}px;font-size:${Math.round(size * (text.length > 1 ? 0.42 : 0.62))}px`, '', 'jblock ' + kind);
  b.textContent = text; b.dataset.text = text;
  return b;
}

// how a jamo or syllable is said: a consonant by its name and a sample syllable, a vowel by its name and its syllable
export function spokenForm(t) {
  if (t.length === 1 && isConsonant(t)) {
    try { return jamoName(t) + ', ' + compose(t, 'ㅏ'); } catch { return jamoName(t); }
  }
  if (t.length === 1 && isVowel(t)) return jamoName(t) + ', ' + compose('ㅇ', t);
  return t;
}

const HEART = '<svg viewBox="-10 -2 20 18" width="70" height="64"><path d="M0 4 C-6 -2 -12 2 -8 8 L0 15 L8 8 C12 2 6 -2 0 4Z" fill="#FF8FB1"/></svg>';
const bold = px => `font-size:${px}px;font-weight:800;`;
const sayBlock = t => (t.length === 1 && isJamo(t) ? jamoName(t) : t);

// how the plays draw the hangul tokens (core/activities/<play>.js says what each key does)
const look = {
  fruit: {
    // long words make big fruit: spots that do not overlap
    wordSpots: options => options.some(t => t.length >= 3) && options.length <= 4,
    size: t => (t.length >= 3 ? 150 : t.length === 2 ? 128 : 108),
    font: (t, onItem) => bold(onItem ? (t.length >= 2 ? 38 : 56) : (t.length >= 2 ? 40 : 58)),
  },
  find: {
    box: () => 'min-width:110px;height:110px;padding:0 12px;',
    font: (t, onItem) => bold(t.length >= 3 ? 34 : onItem ? 52 : 48),
  },
  rise: {
    fieldClass: '',
    size: () => 120,
    font: t => bold(t.length >= 4 ? 24 : t.length === 3 ? 30 : t.length === 2 ? 36 : 50),
  },
  catch: {
    size: (t, letter, skin) => (skin.item ? 160 : t.length >= 3 ? 140 : 120),
    ink: t => `${bold(t.length >= 4 ? 26 : t.length === 3 ? 32 : t.length === 2 ? 40 : 56)}color:#4A3A48;text-shadow:0 0 6px #fff,0 0 12px #fff,0 0 16px #fff;`,
  },
  hop: {
    font: t => `font-weight:800;font-size:${t.length >= 4 ? 'min(3.4vw,4.2vh)' : t.length === 3 ? 'min(4.2vw,5.2vh)' : t.length === 2 ? 'min(5.4vw,6.6vh)' : 'min(7.6vw,9.2vh)'};`,
  },
  gift: {
    // the friend shows the picture, a heart (a family member), or the name itself ("이 이름을 찾아줄래?")
    bubble: r => ({
      style: 'position:absolute;background:#fff;border-radius:30px;padding:12px 18px;box-shadow:0 8px 18px rgba(80,60,100,.18);z-index:4;min-width:120px;text-align:center',
      html: r.role === '기타' ? `<div style="font-size:46px;font-weight:800;color:#FF6FA5">${r.answer.replace(/[<>&]/g, '')}</div>`
        : r.pic ? `<img src="${picUrl(r.pic)}" alt="" style="height:min(20vh,16vw);display:block">` : HEART,
      cls: '',
    }),
    card: (t, k) => ({ style: `position:absolute;min-width:150px;padding:14px 22px;border-radius:22px;background:#fff;border:4px solid #FFC2D9;font-size:${t.length >= 3 ? 44 : 54}px;font-weight:800;color:#4A3A48;text-align:center;box-shadow:0 6px 0 rgba(0,0,0,.08);z-index:5`, html: esc(t), cls: 'card', x: 24, y: 28 + k * 22 }),
    friendAsks: false,
    solved: () => {},
  },
  door: {
    board: key => ({ big: key }),
    line: key => (isJamo(key) ? jamoName(key) : key),
    padClass: '',
    tracer: () => ({ inkWidth: 7 }),
    // the line first; the prompt only if the child has not started tracing yet
    promptAfterLine: true,
  },
  scratch: {
    picture: r => `<img src="${picUrl(r.pic)}" alt="" style="width:80%;height:80%;object-fit:contain;pointer-events:none">`,
    afterRub: r => r.word,
    button: (t, options) => {
      const single = options.every(o => o.length === 1);
      return { style: `border:none;min-width:${single ? 'min(15vw,19vh)' : 'min(22vw,26vh)'};height:min(15vw,19vh);padding:0 18px;border-radius:26px;background:#fff;box-shadow:0 8px 0 #F3C4D8,0 14px 18px rgba(80,50,80,.2);color:#4A3A48;font-weight:800;font-size:${single ? 'min(9vw,11vh)' : t.length >= 4 ? 'min(4.6vw,5.6vh)' : 'min(6vw,7.4vh)'};display:flex;align-items:center;justify-content:center;cursor:pointer;transform:scale(.3);opacity:0;transition:transform .35s cubic-bezier(.3,1.6,.5,1), opacity .35s`, html: esc(t) };
    },
  },
  pairs: {
    gridClass: '',
    cardClass: '',
    setsPrompt: false,
    // side 'a' is the picture (the word on a yellow card when there is none), side 'b' the word
    face: (f, p, side) => {
      if (side === 'a' && p.pic) f.innerHTML = `<img src="${picUrl(p.pic)}" alt="" style="width:80%;height:80%;object-fit:contain">`;
      else f.innerHTML = `<span style="font-size:${p.word.length >= 3 ? 34 : 44}px;font-weight:800;color:#4A3A48">${p.word.replace(/[<>&]/g, '')}</span>`;
      if (side === 'a' && !p.pic) f.style.background = '#FFF3D6';
    },
  },
  bridge: {
    block: jblock,
    say: sayBlock,
    size: () => Math.min(130, Math.floor(window.innerWidth * 0.11)),
    workshop: mode => mode === 'build',
    walk: mode => mode !== 'build',
    mergedFont: S => `font-size:${Math.round(S * 1.3)}px;font-weight:800;`,
    mergedClass: '',
  },
};

// the hangul content in the shape the core plays read (the content functions themselves are unchanged)
const boardOf = r => ({ pic: r.pic, word: r.word, target: r.target });
function shapeMechs(mechs) {
  const out = { ...mechs };
  const rounds = (mech, key) => () => { const m = mechs[mech](); return { ...m, rounds: m.rounds.map(r => ({ ...r, show: boardOf(r), prompt: fill(key, { item: r.target }) })) }; };
  out.fruit = rounds('fruit', 'pickFruit');
  out.rise = rounds('rise', 'findName');
  out.catch = rounds('catch', 'catchIt');
  out.hop = rounds('hop', 'hop');
  out.find = () => {
    const f = mechs.find();
    return { ...f, show: boardOf(f), line: f.word && f.word !== f.target ? `${f.target}! ${f.word}의 ${f.target}!` : f.target, prompt: fill('findName', { item: f.target }) };
  };
  out.gift = () => {
    const m = mechs.gift();
    return { ...m, rounds: m.rounds.map(r => ({
      ...r,
      prompt: r.role === '나' ? LINES.findMyName : r.role === '기타' ? LINES.thisName : r.role ? fill('giveName', { role: r.role }) : fill('giveGift', { item: r.answer }),
      line: r.answer,
      credit: [r.answer, ...(r.credit || [])],
    })) };
  };
  if (mechs.scratch) out.scratch = () => { const m = mechs.scratch(); return { ...m, rounds: m.rounds.map(r => ({ ...r, reveal: boardOf(r), prompt: fill('which', { item: r.target }) })) }; };
  out.pairs = () => {
    const m = mechs.pairs();
    return { ...m, prompt: LINES.pairs, pairs: m.pairs.map(p => ({ ...p, sayA: null, say: p.word, line: p.word, credit: [p.word, ...(p.credit || [])] })) };
  };
  // build: jamo blocks into a syllable; words: syllable blocks into a word, every syllable counts
  out.bridge = () => {
    const m = mechs.bridge();
    const build = m.mode === 'build';
    return { ...m, rounds: m.rounds.map(r => {
      const target = build ? r.target : r.word;
      const letters = build ? r.parts : r.blocks;
      return {
        ...r, target, letters,
        show: { pic: r.pic, word: r.word, target: build ? r.target : null, big: target },
        line: r.line || target,
        prompt: fill(build ? 'buildSyllable' : 'buildBridge', { item: target }),
        merged: build ? compose(letters[0], letters[1], letters[2] || '') : target,
        creditEach: !build,
      };
    }) };
  };
  return out;
}

// the parent panel: the child's name and the family names (the family island is built from them), before the sound
const ROLES = ['엄마', '아빠', '할머니', '할아버지', '외할머니', '외할아버지', '이모', '삼촌', '고모', '언니', '오빠', '누나', '형', '동생', '기타'];
const needsSetup = state => !/[가-힣]/.test(state.profile.childName);
function parentRows(state, ctx) {
  const fam = state.profile.family.length ? state.profile.family : defaultFamily();
  const famRow = f => `<div class="fam-row" style="display:flex;gap:8px;margin:6px 0">
      <select class="fam-role" style="padding:8px;border-radius:10px">${ROLES.map(r => `<option ${r === f.role ? 'selected' : ''}>${r}</option>`).join('')}</select>
      <input class="fam-name" value="${esc(f.name)}" placeholder="이름 (예: 홍길동)" style="flex:1;padding:8px 10px;border-radius:10px;border:1px solid #ddd;font-size:16px">
      <button class="fam-del" style="border:none;background:#f3eef3;border-radius:10px;padding:0 12px">삭제</button></div>`;
  ctx.onClick(t => {
    if (t.closest('.fam-del')) { t.closest('.fam-row').remove(); return true; }
    if (t.closest('.fam-add')) { ctx.$('.fam-list').insertAdjacentHTML('beforeend', famRow({ name: '', role: '기타' })); return true; }
    return false;
  });
  // the name is required: without Hangul in it nothing is saved
  ctx.onSave(() => {
    state.profile.childName = ctx.$('.pp-child').value.trim();
    state.profile.family = [...ctx.$('.fam-list').querySelectorAll('.fam-row')].map(r => ({ role: r.querySelector('.fam-role').value, name: r.querySelector('.fam-name').value.trim() }));
    if (needsSetup(state)) { ctx.$('.pp-child-err').style.display = 'block'; return false; }
    return true;
  });
  return ctx.nodes(`<h3>아이 이름</h3><input class="pp-child" value="${esc(state.profile.childName)}" placeholder="성까지 포함 (예: 홍길동)" style="width:100%;padding:10px;border-radius:10px;border:1px solid #ddd;font-size:18px">
    <div class="pp-child-err" style="color:#B00020;font-size:14px;display:none">아이 이름을 한글로 입력해 주세요.</div>
    <h3>가족 이름</h3><div style="font-size:13px;color:#888">게임에서 아이가 찾는 이름이에요. 이 아이패드 안에만 저장돼요.</div>
    <div class="fam-list">${fam.map(famRow).join('')}</div>
    <button class="fam-add" style="border:none;background:#f3eef3;border-radius:10px;padding:8px 14px;margin-top:4px">+ 가족 추가</button>
    `);
}

export const subject = {
  id: 'hangul',
  title: '한글 섬 여행',
  themeColor: '#FFC2D9',
  islands: { available: [1, 2, 3, 4, 5, 6, 7, 8], count: 8 },
  curriculum,
  themes,
  strokes,
  // ctx = { profile, settings, rng, islands }; the family island (8) is built from the profile's names
  content: {
    islandUnits: (n, ctx = {}) => islandUnits(n, ctx.profile),
    buildMechs: (n, island, ctx = {}) => shapeMechs(buildMechs(n, ctx.profile, island, ctx.rng)),
    creditable: (n, mech, ctx = {}) => creditable(n, mech, ctx.profile),
  },
  lines: LINES,
  voice: { index: VOICE_FILES, hash: voiceHash, base: 'voice/', phrases: PHRASES, extra: { suffixes: SUFFIXES, spokenForm, keepTtsResult: true } },
  runners: ['fruit', 'bridge', 'gift', 'door', 'find', 'rise', 'pairs', 'catch', 'hop', 'scratch'],
  features: { party: true, plays: true },
  token: { html: t => esc(t), say: t => t, isSpecial: () => true },
  board,
  look,
  onIslandStart() {},
  fonts: [],
  // the island map (core/island.js): no greeting before the welcome and no goodbye (the home button leaves at once),
  // a mission bar button shows and says the unit itself in a size that follows its length; a success is recorded on
  // the island being played (no recordIsland); the home hatches from every character not used yet (no friend choice)
  unitLine: u => u,
  unitBadge: u => u,
  unitFont: u => (u.length > 2 ? 20 : u.length === 2 ? 24 : 30),
  parent: {
    needsSetup,
    // "mark as cleared" on island n: the character is at least at stage n (clearing in play grows one stage)
    clearStage: (stage, n) => Math.min(7, Math.max(stage, n)),
    rows: parentRows,
    rowsAt: 'top',
    voiceCheckUrl: null,
    allIslands: false, // the progress table lists the islands the save has
    accent: '#FFC2D9',
    words: {
      sound: '소리 크기',
      units: '익힌 글자',
      clearAsk: '섬을 완료로 처리할까요? 캐릭터가 한 단계 자라고 다음 섬이 열려요.',
      reset: '캐릭터와 진행 상황이 모두 지워져요.',
      newerCode: null, // the old hangul panel said "코드가 올바르지 않아요." for a newer code too
    },
  },
};
export default subject;
