// 짝 맞추기: flip two cards; the two sides of a pair (a picture and its word or first letter, things and their numeral) match (memory game).
// The subject's look (ctx.subject.look.pairs) gives face(f, p, side, spec) (draws side 'a' or 'b' of pair p on the card face f)
// and optionally mark(card, c) (data on the card), gridClass, cardClass, setsPrompt (the prompt is repeated when the child is idle).
// A pair says p.sayA / p.say when its side 'a' / 'b' is turned over (nothing when absent) and p.line once matched.
import { scene, shuffle, el, buddy, wait, praise, progress, asset, center } from './common.js';

export async function run(ctx, spec) {
  const { prompt, pairs } = spec;
  const L = { gridClass: 'pairs-grid', cardClass: 'pair-card', setsPrompt: true, mark: () => {}, ...ctx.subject.look.pairs };
  scene(ctx, 'workshop');
  buddy(ctx);
  ctx.boardLine = prompt;
  if (L.setsPrompt) ctx.prompt = prompt;
  const results = [];
  const tick = progress(ctx, pairs.length);
  const back = ctx.skin?.back ? `background:url(${asset(ctx.skin.back)}) center/contain no-repeat;` : 'background:linear-gradient(160deg,#FFC2D9,#C9B8FF);border-radius:22px;';
  const cards = shuffle(pairs.flatMap((p, i) => [{ i, side: 'a', p }, { i, side: 'b', p }]), ctx.rng);
  const cols = cards.length <= 6 ? 3 : 4;
  const grid = el('div', `position:absolute;left:50%;top:54%;translate:-50% -50%;display:grid;grid-template-columns:repeat(${cols},min(17vw,21vh));gap:min(2vw,2.4vh);z-index:3`, '', L.gridClass);
  ctx.stage.appendChild(grid);
  const faces = cards.map(c => {
    const card = el('div', 'position:relative;aspect-ratio:1;cursor:pointer;perspective:800px', '', L.cardClass);
    const inner = el('div', 'position:absolute;inset:0;transition:transform .45s;transform-style:preserve-3d');
    const b = el('div', `position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;${back}filter:drop-shadow(0 8px 8px rgba(0,0,0,.18))`);
    const f = el('div', 'position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform:rotateY(180deg);background:#fff;border-radius:22px;border:4px solid #FFC2D9;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 12px rgba(0,0,0,.15)');
    L.face(f, c.p, c.side, spec);
    L.mark(card, c);
    inner.append(b, f); card.appendChild(inner); grid.appendChild(card);
    return { c, card, inner, open: false, done: false };
  });
  ctx.speak(prompt);
  // peek: show everything for a moment so the child knows where things are
  await wait(400);
  faces.forEach(x => { x.inner.style.transform = 'rotateY(180deg)'; });
  await wait(2200);
  faces.forEach(x => { x.inner.style.transform = ''; });
  await wait(500);
  let first = null, busy = false, left = pairs.length;
  await new Promise(done => {
    for (const x of faces) x.card.addEventListener('click', async () => {
      if (busy || x.open || x.done) return;
      x.open = true; x.inner.style.transform = 'rotateY(180deg)'; ctx.sfx('tap');
      const said = x.c.side === 'a' ? x.c.p.sayA : x.c.p.say;
      if (said != null) ctx.speak(said);
      if (!first) { first = x; return; }
      const a = first; first = null; busy = true;
      await wait(a.c.i === x.c.i ? 550 : 1200);
      if (a.c.i === x.c.i) {
        a.done = x.done = true;
        [a, x].forEach(y => { y.card.style.transition = 'transform .4s'; y.card.style.transform = 'scale(1.08)'; });
        const [cx, cy] = center(x.card); ctx.burst(cx, cy, 'stars'); ctx.sfx('success');
        for (const it of new Set(x.c.p.credit || [])) { ctx.onSuccess(it, 'pairs'); results.push({ item: it, type: 'pairs' }); }
        tick();
        await ctx.speak(x.c.p.line);
        left -= 1;
        if (left === 0) setTimeout(done, 400);
      } else {
        ctx.sfx('boing');
        a.open = x.open = false; a.inner.style.transform = ''; x.inner.style.transform = '';
      }
      busy = false;
    });
  });
  await praise(ctx);
  return results;
}
