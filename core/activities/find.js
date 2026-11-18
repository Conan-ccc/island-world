import { onTap } from '../tap.js';
// 찾기: tap every card that shows what you heard (and see on the board)
import { scene, shuffle, at, el, glow, unglow, wiggle, buddy, wait, center, ask, praise, progress, asset } from './common.js';

// what a subject's look may change (ctx.subject.look.find): the size of a plain card, a font for plain-text tokens
const LOOK = {
  box: (t, letter) => `width:${letter ? 110 : 128}px;height:${letter ? 110 : 140}px;`,
  font: () => '',
};

// Where the centres of `count` cards of w x h px go in a stage of the given size so that no card covers another:
// below the board (top), right of the friend (left), in rows of `cols`. When the room is too small the cards shrink
// (scale) instead of overlapping. jitter[i] = [x, y] in -0.5..0.5 nudges a card only inside its own free space.
// Pure: returns { scale, points: [[x, y] in px] }.
export function findLayout({ width, height, top, left, w, h, count, cols, jitter = [] }) {
  const rows = Math.ceil(count / cols);
  const right = width * 0.97, bottom = height - 12;
  const scale = Math.max(0.5, Math.min(1, (right - left - (cols - 1) * 10) / (cols * w), (bottom - top - (rows - 1) * 10) / (rows * h)));
  const cw = w * scale, ch = h * scale;
  const stepX = cols > 1 ? (right - left - cw) / (cols - 1) : 0;
  const stepY = rows > 1 ? Math.min(ch + 30, (bottom - top - ch) / (rows - 1)) : 0;
  const y0 = top + (bottom - top - (stepY * (rows - 1) + ch)) / 2 + ch / 2;
  const jx = Math.max(0, Math.min(width * 0.012, (stepX - cw - 8) / 2)), jy = Math.max(0, Math.min(height * 0.012, (stepY - ch - 8) / 2));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const points = Array.from({ length: count }, (_, i) => [
    clamp(left + cw / 2 + (i % cols) * stepX + (jitter[i]?.[0] || 0) * 2 * jx, left + cw / 2, right - cw / 2),
    clamp(y0 + Math.floor(i / cols) * stepY + (jitter[i]?.[1] || 0) * 2 * jy, top + ch / 2, bottom - ch / 2),
  ]);
  return { scale, points };
}

// The room a w x h card takes when it is turned by deg degrees (its upright bounding box). Pure.
export function tiltedSize(w, h, deg) {
  const a = Math.abs(deg || 0) * Math.PI / 180;
  return [w * Math.cos(a) + h * Math.sin(a), h * Math.cos(a) + w * Math.sin(a)];
}

// put the cards where findLayout says (measured on the real stage; a stage without a size keeps the first positions).
// Each card is tilted a little, so the room it needs is its tilted size: no corner reaches into a neighbour.
function spread(stage, cards, jitter, cols) {
  const box = stage.getBoundingClientRect?.();
  const sizes = cards.map(c => tiltedSize(c.offsetWidth || 0, c.offsetHeight || 0, parseFloat(c.style.rotate)));
  const w = Math.max(0, ...sizes.map(s => s[0])), h = Math.max(0, ...sizes.map(s => s[1]));
  if (!box?.width || !box.height || !w || !h) return;
  const board = stage.querySelector('.board')?.getBoundingClientRect(), friend = stage.querySelector('.buddy')?.getBoundingClientRect();
  const { scale, points } = findLayout({
    width: box.width, height: box.height, w, h, count: cards.length, cols, jitter,
    top: (board?.height ? board.bottom - box.top : box.height * 0.26) + 14,
    left: (friend?.width ? friend.right - box.left : box.width * 0.18) + 8,
  });
  cards.forEach((c, i) => {
    c.style.left = (points[i][0] / box.width * 100).toFixed(2) + '%';
    c.style.top = (points[i][1] / box.height * 100).toFixed(2) + '%';
    c.style.scale = scale < 1 ? scale.toFixed(3) : '';
  });
}

export async function run(ctx, { target, unit = target, decoys, count = 5, show, reveal, line, prompt, listenOnly }) {
  const T = ctx.subject.token, L = { ...LOOK, ...ctx.subject.look?.find };
  scene(ctx, 'beach');
  buddy(ctx);
  ctx.subject.board(ctx, show);
  ctx.boardLine = line;
  const total = Math.max(count + 3, Math.min(10, count + decoys.length * 2));
  const texts = shuffle([...Array(count).fill(target), ...Array.from({ length: total - count }, (_, i) => decoys[i % decoys.length])], ctx.rng);
  const cols = 5, rows = Math.ceil(texts.length / cols);
  const jitter = [];
  const cards = texts.map((t, i) => {
    const jx = ctx.rng() - 0.5, jy = ctx.rng() - 0.5;
    jitter.push([jx, jy]);
    const cx = 18 + (i % cols) * 16 + jx * 5;
    const cy = 50 + Math.floor(i / cols) * (36 / rows) + jy * 5;
    const skin = ctx.skin || {};
    const letter = T.isSpecial(t);
    const c = skin.item && letter
      ? at(el('div', `position:absolute;width:150px;height:170px;display:flex;align-items:center;justify-content:center;background:url(${asset(skin.item)}) center/contain no-repeat;filter:drop-shadow(0 8px 6px rgba(80,50,30,.25));${L.font(t, true)}color:#4A3A48;text-shadow:0 0 6px #fff,0 0 10px #fff,0 0 14px #fff;cursor:pointer;transition:all .5s;z-index:3;padding-top:14px`, T.html(t, 60), 'item'), cx, cy)
      : at(el('div', `position:absolute;${L.box(t, letter)}display:flex;align-items:center;justify-content:center;border-radius:${letter ? '50% 50% 44% 44%' : '22px'};background:radial-gradient(circle at 40% 30%,#fff 0,#FFE3EC 60%,#F7C4D4 100%);box-shadow:0 8px 12px rgba(120,80,60,.25);${L.font(t, false)}color:#4A3A48;cursor:pointer;transition:all .5s;z-index:3`, T.html(t, 54), 'card'), cx, cy);
    c.dataset.text = t;
    c.style.rotate = ((ctx.rng() - 0.5) * 16).toFixed(1) + 'deg';
    ctx.stage.appendChild(c);
    return c;
  });
  spread(ctx.stage, cards, jitter, cols);
  // the screen is turned or resized while the play is open: the cards take their places again (same jitter)
  const again = () => { if (ctx.stage.isConnected) spread(ctx.stage, cards, jitter, cols); else globalThis.removeEventListener?.('resize', again); };
  globalThis.addEventListener?.('resize', again);
  ask(ctx, prompt, cards.find(x => x.dataset.text === target));
  const results = [];
  const tick = progress(ctx, count);
  let left = count, wrong = 0;
  await new Promise(done => {
    for (const c of cards) onTap(c, () => {
      if (c.dataset.found) return;
      if (c.dataset.text === target) {
        c.dataset.found = '1';
        const [x, y] = center(c);
        ctx.burst(x, y, 'stars'); ctx.sfx('sparkle');
        if (ctx.skin?.open && c.classList.contains('item')) {
          // hatch: egg cracks open and a baby pops up
          c.style.backgroundImage = `url(${asset(ctx.skin.open)})`; c.innerHTML = '';
          const babies = ctx.skin.reveal || [];
          if (babies.length) {
            const b = el('div', `position:absolute;left:50%;bottom:30%;width:100px;translate:-50% 0;transition:transform .5s cubic-bezier(.3,1.6,.5,1);transform:scale(.2)`, `<img class="picimg" src="${asset(babies[Math.floor(ctx.rng() * babies.length)])}" alt="">`);
            c.appendChild(b); requestAnimationFrame(() => { b.style.transform = 'scale(1)'; });
          }
          ctx.sfx('giggle');
        } else { c.style.transform = 'translateY(-60px) scale(.6)'; c.style.opacity = '0'; }
        ctx.onSuccess(unit, 'find'); results.push({ item: unit, type: 'find' });
        left -= 1; wrong = 0; unglow(ctx.stage); tick();
        if (left === 0) setTimeout(done, 500);
      } else {
        wiggle(c); ctx.sfx('boing'); ctx.speak(T.say(c.dataset.text));
        wrong += 1;
        if (wrong >= 2) glow(cards.find(x => x.dataset.text === target && !x.dataset.found));
      }
    });
  });
  globalThis.removeEventListener?.('resize', again);
  if (listenOnly) ctx.subject.board(ctx, reveal);
  await ctx.speak(line);
  await praise(ctx);
  await wait(150);
  return results;
}
