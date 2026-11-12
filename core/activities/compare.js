// 많다 적다: two plates of things; tap the one with more (or with fewer). The things are drawn by ctx.subject.draw.qtyHtml.
import { scene, el, buddy, wait, ask, praise, progress, center, wiggle, glow, unglow } from './common.js';

export async function run(ctx, { rounds }) {
  const { qtyHtml } = ctx.subject.draw;
  scene(ctx, 'village');
  buddy(ctx);
  const results = [];
  const tick = progress(ctx, rounds.length);
  for (const r of rounds) {
    ctx.stage.querySelector('.board')?.remove();
    ctx.boardLine = r.prompt;
    const row = el('div', 'position:absolute;left:50%;top:50%;translate:-50% -50%;display:flex;gap:min(6vw,60px);z-index:3', '', 'plates');
    const plates = r.sides.map(v => {
      const p = el('button', 'border:none;width:min(34vw,44vh);height:min(30vw,38vh);border-radius:50% / 46%;background:radial-gradient(circle at 40% 30%,#fff 0,#FFF6EC 62%,#EBD8C0 100%);box-shadow:inset 0 -10px 0 rgba(120,90,50,.14),0 14px 18px rgba(60,40,60,.25);display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .35s, opacity .35s', qtyHtml(v, { pic: r.pic, unit: 62, tens: false }), 'plate');
      p.dataset.n = String(v);
      row.appendChild(p);
      return p;
    });
    ctx.stage.appendChild(row);
    const target = plates.find(p => p.dataset.n === String(r.right));
    ask(ctx, r.prompt, target);
    let wrong = 0;
    await new Promise(done => {
      for (const p of plates) p.addEventListener('click', () => {
        if (p === target) { done(); return; }
        wiggle(p); ctx.sfx('boing');
        wrong += 1;
        if (wrong >= 2) glow(target);
      });
    });
    unglow(ctx.stage);
    const [x, y] = center(target); ctx.burst(x, y, 'stars'); ctx.sfx('success');
    target.style.transform = 'scale(1.1)';
    plates.forEach(p => { if (p !== target) p.style.opacity = '.45'; });
    ctx.onSuccess(r.unit, 'compare'); results.push({ item: r.unit, type: 'compare' }); tick();
    ctx.subject.board(ctx, { num: r.right });
    await ctx.speak(r.line);
    await praise(ctx);
    row.remove();
    await wait(150);
  }
  ctx.stage.querySelector('.board')?.remove();
  return results;
}
