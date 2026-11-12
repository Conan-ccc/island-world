// Number token helpers. A play token is a numeral ('7', '12') or a quantity card ('q:7').
// isNum, isQty, qtyOf are pure (no DOM); the rest draws the things, tokens and the question board of the number plays.
import { asset } from '../../core/env.js';
import { nameOf, COUNT_WORDS } from './curriculum.js';

export const isNum = t => typeof t === 'string' && /^\d+$/.test(t);
export const isQty = t => typeof t === 'string' && /^q:\d+$/.test(t);
export const qtyOf = t => Number(String(t).slice(2));

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// The thing that is counted on this island (set once by the island engine)
let QTY = { pic: 'pic/apple.webp', tens: false };
export function setQty(q) { QTY = { ...QTY, ...q }; }

const cell = (pic, u, cls = '') => `<i class="qcell ${cls}" style="width:${u}px;height:${u}px"><img src="${asset(pic)}" alt=""></i>`;
const grid = (cells, cols, u, extra = '') => `<span class="qgrid ${extra}" style="grid-template-columns:repeat(${cols},${u}px)">${cells}</span>`;
// A group of n things: rows of five; tens are tied up in boxes of ten (always on the tens island, otherwise above ten).
// gone = how many of them (the last ones) are crossed out (taken away)
export function qtyHtml(n, { pic = QTY.pic, tens = QTY.tens, unit = 34, gone = 0 } = {}) {
  n = Number(n);
  if (!n) return `<span class="qty zero" data-n="0" style="width:${unit * 2.4}px;height:${unit * 1.5}px"></span>`;
  const boxes = tens || n > 10 ? Math.floor(n / 10) : 0;
  const rest = n - boxes * 10;
  const mini = Math.round(unit * (boxes > 2 ? 0.5 : 0.62));
  let html = '';
  for (let b = 0; b < boxes; b++) html += grid(cell(pic, mini).repeat(10), 5, mini, 'ten');
  if (rest) html += grid(Array.from({ length: rest }, (_, i) => cell(pic, boxes ? mini : unit, i >= rest - gone ? 'gone' : '')).join(''), Math.min(5, rest), boxes ? mini : unit);
  return `<span class="qty" data-n="${n}">${html}</span>`;
}
const numHtml = (t, px) => `<span class="tok-num" style="font-size:${Math.round(String(t).length >= 2 ? px * 0.8 : px)}px">${esc(t)}</span>`;
export const factText = (u, answer) => `${u.a} ${u.op === '-' ? '\u2212' : '+'} ${u.b}${answer == null ? '' : ' = ' + answer}`;
// The things of a question: a number of things, two groups to add, or a group with some taken away
export function thingsHtml(th, unit = 34) {
  if (th.mode === 'add') return `<span class="things">${qtyHtml(th.a, { pic: th.pic, unit, tens: false })}<b class="op">+</b>${qtyHtml(th.b, { pic: th.pic, unit, tens: false })}</span>`;
  if (th.mode === 'sub') return `<span class="things">${qtyHtml(th.a, { pic: th.pic, unit, tens: false, gone: th.b })}</span>`;
  return `<span class="things">${qtyHtml(th.n, { pic: th.pic, unit })}</span>`;
}

// What a play token looks like: a numeral is a big number, a quantity card ('q:3') is that many things
export function tokenHtml(t, px = 56) {
  if (isQty(t)) { const n = qtyOf(t); return qtyHtml(n, { unit: QTY.tens ? 26 : n > 10 ? 36 : n > 5 ? 30 : 40 }); }
  return numHtml(t, px);
}
// What tapping a token says: a numeral is read ("삼"), a group of things is counted ("셋")
export const tokenSay = t => (isQty(t) ? (!QTY.tens && COUNT_WORDS[qtyOf(t)]) || nameOf(qtyOf(t)) : nameOf(t));

const EAR = '<svg viewBox="0 0 60 60" width="90" height="90"><path d="M20 40 C8 26 16 8 32 8 C46 8 52 20 46 30 C42 36 36 36 36 44 C36 52 26 54 22 48" fill="#FFE3EC" stroke="#FF8FB1" stroke-width="4" stroke-linecap="round"/><path d="M28 28 C28 22 36 20 38 26" fill="none" stroke="#FF8FB1" stroke-width="4" stroke-linecap="round"/></svg>';
// Top board: a numeral with that many things, a sum ("2 + 1", with the things while it is new), or (listen-only) an ear
export function boardHtml(spec) {
  if (!spec) return EAR;
  if (spec.fact) {
    const u = spec.fact;
    let inner = `<div class="bbig tok-num" data-key="${esc(u.key)}">${esc(factText(u, spec.answer))}</div>`;
    if (spec.pic) inner += thingsHtml({ mode: u.op === '+' ? 'add' : 'sub', a: u.a, b: u.b, pic: spec.pic }, u.a + (u.op === '+' ? u.b : 0) > 6 ? 34 : 46);
    return inner;
  }
  let inner = `<div class="bbig tok-num" data-key="${esc(spec.num)}">${esc(spec.num)}</div>`;
  if (spec.qty) inner += qtyHtml(spec.qty.n, { pic: spec.qty.pic, unit: QTY.tens ? 30 : spec.qty.n > 10 ? 40 : spec.qty.n > 5 ? 38 : 54 });
  return inner;
}
