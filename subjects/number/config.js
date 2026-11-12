// 숫자 섬: what the number game does its own way. The island engine, core/activities and core/speech read this.
import * as curriculum from './curriculum.js';
import * as themes from './themes.js';
import * as strokes from './strokes.js';
import { islandUnits, buildMechs, creditable } from './island-content.js';
import { voiceHash, LINES, SUFFIXES } from './voice-keys.js';
import { VOICE_FILES } from './voice-index.js';
import { isNum, setQty, qtyHtml, thingsHtml, factText, tokenHtml, tokenSay, boardHtml } from './numbers.js';
import { showBoard } from '../../core/activities/common.js';

// how the plays that every subject has draw the number game's things (core/activities/<play>.js says what each key does)
const look = {
  gift: {
    bubble: r => ({ style: 'position:absolute;background:#fff;border-radius:30px;padding:10px 26px;box-shadow:0 8px 18px rgba(80,60,100,.18);z-index:4;min-width:110px;text-align:center;font-size:64px;font-weight:800;color:#FF6FA5;cursor:pointer;white-space:nowrap', html: `<span class="tok-num">${r.bubble.fact ? factText(r.bubble.fact) : r.bubble.num}</span>`, cls: 'bubble' }),
    card: (t, k) => ({ style: 'position:absolute;width:min(17vw,22vh);min-height:min(13vw,17vh);padding:8px;border-radius:22px;background:#fff;border:4px solid #FFC2D9;text-align:center;display:flex;align-items:center;justify-content:center;color:#4A3A48;box-shadow:0 6px 0 rgba(0,0,0,.08);z-index:5', html: tokenHtml(t), cls: 'card pic-card', x: 28 + (k % 2) * 16, y: 28 + k * 23 }),
    // a sum shows its answer once the right card is given
    solved: (bubble, r) => { if (r.bubble.fact) bubble.innerHTML = `<span class="tok-num">${factText(r.bubble.fact, r.bubble.fact.value)}</span>`; },
  },
  door: {
    board: key => ({ num: key }),
    line: (key, lines) => lines[key] || [key],
    // writing lines: the top and the bottom of the numerals
    guides: key => {
      const k = key.length === 1 ? 1 : Math.min(1, 1.7 / key.length);
      const y = v => 50 + (v - 50) * k;
      return `<svg viewBox="0 0 100 100" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"><line x1="4" x2="96" y1="${y(12)}" y2="${y(12)}" stroke="#E7D8EE" stroke-width="1" stroke-dasharray="3 3"/><line x1="4" x2="96" y1="${y(88)}" y2="${y(88)}" stroke="#D9C2E4" stroke-width="1.4"/></svg>`;
    },
    tracer: key => ({ width: key.length === 1 ? 10 : 6 }),
  },
  scratch: {
    picture: r => thingsHtml(r.things, r.things.mode !== 'count' ? (r.things.a + (r.things.mode === 'add' ? r.things.b : 0) > 6 ? 44 : 58) : r.tens ? 34 : r.things.n > 10 ? 54 : r.things.n > 5 ? 54 : 70),
    button: (t, options) => {
      const letters = options.every(o => o.length === 1);
      return { style: 'border:none;min-width:min(15vw,19vh);height:min(15vw,19vh);padding:0 18px;border-radius:26px;background:#fff;box-shadow:0 8px 0 #F3C4D8,0 14px 18px rgba(80,50,80,.2);color:#4A3A48;display:flex;align-items:center;justify-content:center;cursor:pointer;transform:scale(.3);opacity:0;transition:transform .35s cubic-bezier(.3,1.6,.5,1), opacity .35s', html: `<span class="tok-num" style="font-size:${letters ? 'min(10vw,12vh)' : 'min(8vw,10vh)'}">${t.replace(/[<>&]/g, '')}</span>` };
    },
  },
  pairs: {
    face: (f, p, side) => {
      const face = p[side];
      if (face.qty) f.innerHTML = qtyHtml(face.qty.n, { pic: face.qty.pic, unit: face.qty.n > 10 ? 30 : face.qty.n > 5 ? 26 : 36 });
      else f.innerHTML = `<span class="tok-num" style="font-size:${face.fact ? 'min(5.4vw,6.6vh)' : 'min(9vw,11vh)'};color:${face.fact ? '#FF6FA5' : '#4A3A48'};white-space:nowrap">${face.fact ? factText(face.fact) : face.num}</span>`;
    },
    mark: (card, c) => { card.dataset.side = c.side; card.dataset.key = c.p.key; },
  },
};

// the parent panel: the other islands' friend, after the sound
function parentRows(state, ctx) {
  const s = state.subjects.number.settings; // this subject's own settings
  ctx.onSave(() => { s.excludeCharacter = ctx.$('.pp-exclude').value || null; return true; });
  return ctx.nodes(`
    <h3>다른 섬 친구</h3><div style="font-size:13px;color:#888">한글 섬이나 영어 섬에서 키우는 친구를 고르면, 숫자 섬에서는 다른 친구가 태어나요.</div>
    ${ctx.characterSelect(s.excludeCharacter)}`);
}

export const subject = {
  id: 'number',
  title: '숫자 섬 여행',
  themeColor: '#FFB86B',
  islands: { available: [1, 2, 3, 4, 5, 6, 7, 8], count: 8 },
  curriculum,
  themes,
  strokes,
  // ctx = { profile, settings, rng, islands }
  content: {
    islandUnits: n => islandUnits(n),
    buildMechs: (n, island, ctx = {}) => buildMechs(n, island, ctx.settings, ctx.rng, ctx.islands),
    creditable: (n, mech) => creditable(n, mech),
  },
  lines: LINES,
  voice: { index: VOICE_FILES, hash: voiceHash, base: 'voice/', phrases: { ...SUFFIXES, tryAgain: LINES.tryAgain, great: LINES.great, soon: LINES.soon, cleared: LINES.cleared }, extra: {} },
  runners: ['fruit', 'count', 'compare', 'next', 'gift', 'door', 'find', 'rise', 'pairs', 'catch', 'hop', 'scratch'],
  features: { party: true, plays: true },
  token: { html: tokenHtml, say: tokenSay, isSpecial: isNum },
  board: (ctx, spec) => showBoard(ctx, boardHtml(spec)),
  draw: { qtyHtml, thingsHtml, factText },
  look,
  // the thing that is counted on this island
  onIslandStart(n) { setQty({ pic: curriculum.ISLANDS[n].pic, tens: !!curriculum.ISLANDS[n].tens }); },
  fonts: [],
  // the island map (core/island.js): "안녕, 또 만나!" before going home, what a mission bar button shows and says,
  // review questions recorded on the island the unit belongs to
  byeLine: LINES.bye,
  unitLine: u => curriculum.unitLine(curriculum.unitOf(u)),
  unitBadge: (u, kind) => (kind === 'num' ? tokenHtml(u, 34) : `<span class="tok-num" style="font-size:22px;white-space:nowrap">${factText(curriculum.unitOf(u)).replace(/ /g, '')}</span>`),
  recordIsland: curriculum.homeIsland,
  // the home (core/sea.js): the parent can name another island's friend so this game hatches a different one
  friendChoice: true,
  parent: {
    needsSetup: () => false, // this game never asks for names
    // "mark as cleared" grows the character one stage, the same as clearing the island in play
    clearStage: stage => Math.min(7, stage + 1),
    rows: parentRows,
    rowsAt: 'sound',
    voiceCheckUrl: null,
    allIslands: true, // the progress table lists every island ("아직 안 감" for one not visited)
    accent: '#BFEDE2',
    words: {
      sound: '소리',
      units: '익힌 것',
      clearAsk: '섬을 완료로 처리할까요? 캐릭터가 한 단계 자라요.',
      reset: '숫자 섬의 캐릭터와 진행 상황만 지워져요(한글 섬·영어 섬 기록은 그대로).',
      newerCode: '더 새 버전의 코드예요. 앱을 새로 고친 뒤 다시 해 주세요.',
    },
  },
};
export default subject;
