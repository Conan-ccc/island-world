// 하나씩 세기: tap every thing once (each tap says the count), then pick the numeral.
// Adding shows two groups; taking away shows some of them flying off first. A box of ten is one tap.
import { scene, el, buddy, wait, ask, praise, progress, asset, center, wiggle, glow, unglow, pickOne } from './common.js';

function thing(pic, size, cls = 'thing') {
  return el('div', `width:${size}px;height:${size}px;position:relative;cursor:pointer;transition:transform .25s, opacity .5s, translate .7s;filter:drop-shadow(0 6px 6px rgba(0,0,0,.18))`, `<img src="${asset(pic)}" alt="" style="width:100%;height:100%;object-fit:contain;pointer-events:none">`, cls);
}
function tenBox(pic, mini) {
  const b = el('div', `display:grid;grid-template-columns:repeat(5,${mini}px);gap:3px;padding:8px;border-radius:18px;background:rgba(255,255,255,.9);border:4px solid #FFC2D9;position:relative;cursor:pointer;transition:transform .25s;box-shadow:0 8px 12px rgba(80,50,80,.2)`, '', 'thing ten');
  b.innerHTML = `<img src="${asset(pic)}" alt="" style="width:${mini}px;height:${mini}px;object-fit:contain;pointer-events:none">`.repeat(10);
  return b;
}
const group = cols => el('div', `display:grid;grid-template-columns:repeat(${cols},auto);gap:min(1.6vw,14px);align-items:center;justify-items:center`);

export async function run(ctx, { rounds }) {
  scene(ctx, 'river');
  buddy(ctx);
  const results = [];
  const tick = progress(ctx, rounds.length);
  for (const r of rounds) {
    ctx.stage.querySelector('.board')?.remove();
    ctx.boardLine = r.line;
    const th = r.things;
    const area = el('div', 'position:absolute;left:50%;top:44%;translate:-50% -50%;display:flex;align-items:center;justify-content:center;gap:min(3vw,30px);z-index:3;background:rgba(255,255,255,.55);border-radius:36px;padding:min(3vw,26px);min-width:30vw;min-height:24vh;max-width:86vw;flex-wrap:wrap', '', 'count-area');
    ctx.stage.appendChild(area);
    let items = [];
    if (th.mode === 'count') {
      const boxes = r.tens || th.n > 10 ? Math.floor(th.n / 10) : 0, rest = th.n - boxes * 10;
      for (let i = 0; i < boxes; i++) { const b = tenBox(th.pic, boxes > 2 ? 22 : 30); area.appendChild(b); items.push(b); }
      if (rest) { const g = group(Math.min(5, rest)); for (let i = 0; i < rest; i++) { const t = thing(th.pic, th.n > 5 ? 84 : 104); g.appendChild(t); items.push(t); } area.appendChild(g); }
    } else {
      const total = th.mode === 'add' ? th.a + th.b : th.a;
      const size = total > 6 ? 78 : 96;
      const g1 = group(Math.min(th.mode === 'add' ? 3 : 5, th.a));
      for (let i = 0; i < th.a; i++) { const t = thing(th.pic, size); g1.appendChild(t); items.push(t); }
      area.appendChild(g1);
      if (th.mode === 'add') {
        area.appendChild(el('div', 'font-size:min(9vw,11vh);font-weight:800;color:#FF6FA5;text-shadow:0 3px 0 #fff', '+', 'op'));
        const g2 = group(Math.min(3, th.b));
        for (let i = 0; i < th.b; i++) { const t = thing(th.pic, size); g2.appendChild(t); items.push(t); }
        area.appendChild(g2);
      }
    }
    if (th.mode !== 'count') ctx.subject.board(ctx, { fact: { key: r.unit, a: th.a, b: th.b, op: th.mode === 'add' ? '+' : '-' } });
    if (th.mode === 'sub') {
      // some of them fly away: only what is left gets counted
      await wait(900);
      const gone = items.slice(th.a - th.b);
      items = items.slice(0, th.a - th.b);
      ctx.sfx('whoosh');
      gone.forEach((t, i) => { t.classList.remove('thing'); t.classList.add('gone'); t.style.pointerEvents = 'none'; t.style.translate = `${120 + i * 40}px -${260 + i * 30}px`; t.style.opacity = '0'; });
      await wait(700);
      gone.forEach(t => { t.style.visibility = 'hidden'; });
    }
    if (items.length) {
      ask(ctx, r.prompt, items[0]);
      let k = 0;
      await new Promise(done => {
        for (const t of items) t.addEventListener('pointerdown', () => {
          if (t.dataset.done) return;
          t.dataset.done = '1';
          unglow(ctx.stage);
          const word = r.words[k]; k += 1;
          ctx.sfx('pop'); if (word) ctx.speak(word);
          t.style.transform = 'scale(1.12)';
          t.insertAdjacentHTML('beforeend', `<span class="count-badge">${r.tens ? k * 10 : (th.mode === 'count' && th.n > 10 ? 9 + k : k)}</span>`);
          const [x, y] = center(t); ctx.burst(x, y, 'stars');
          ctx.promptTarget = items.find(o => !o.dataset.done) || null;
          if (k === items.length) setTimeout(done, 650);
        });
      });
    } else {
      area.insertAdjacentHTML('beforeend', '<span class="qty zero" data-n="0" style="width:min(30vw,36vh);height:min(18vw,22vh)"></span>');
    }
    area.style.transition = 'top .4s'; area.style.top = '40%';
    const { tray, done } = pickOne(ctx, r.options, r.target, items.length ? r.ask : r.prompt);
    await done;
    ctx.onSuccess(r.unit, 'count'); results.push({ item: r.unit, type: 'count' }); tick();
    ctx.subject.board(ctx, r.reveal.fact ? { ...r.reveal, pic: null } : { num: r.reveal.num });
    await ctx.speak(r.line);
    await praise(ctx);
    area.remove(); tray.remove();
    await wait(150);
  }
  ctx.stage.querySelector('.board')?.remove();
  return results;
}
export { wiggle, glow };
