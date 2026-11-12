// 다음 수: three boxes in a row, one of them empty ("6 7 ?" or "6 ? 8"); pick the numeral that belongs there
import { scene, el, buddy, wait, praise, progress, pickOne } from './common.js';

export async function run(ctx, { rounds }) {
  scene(ctx, 'workshop');
  buddy(ctx);
  const results = [];
  const tick = progress(ctx, rounds.length);
  for (const r of rounds) {
    ctx.boardLine = r.prompt;
    const row = el('div', 'position:absolute;left:50%;top:38%;translate:-50% -50%;display:flex;gap:min(2.4vw,22px);z-index:3', '', 'seq');
    const boxes = r.seq.map(v => {
      const hole = v === null;
      const b = el('div', `width:min(19vw,24vh);aspect-ratio:1;border-radius:28px;display:flex;align-items:center;justify-content:center;background:${hole ? 'rgba(255,255,255,.6)' : '#fff'};border:6px ${hole ? 'dashed #FF8FB1' : 'solid #FFC2D9'};box-shadow:0 10px 16px rgba(80,50,80,.2);color:${hole ? '#FF8FB1' : '#4A3A48'};transition:transform .3s`, `<span class="tok-num" style="font-size:min(11vw,13vh)">${hole ? '?' : v}</span>`, hole ? 'seq-box hole' : 'seq-box');
      row.appendChild(b);
      return b;
    });
    ctx.stage.appendChild(row);
    const { tray, done } = pickOne(ctx, r.options, r.target, r.prompt);
    await done;
    const hole = boxes[r.seq.indexOf(null)];
    hole.style.border = '6px solid #FFC93C'; hole.style.background = '#FFF6C2'; hole.style.color = '#4A3A48';
    hole.firstElementChild.textContent = r.target; hole.style.transform = 'scale(1.12)';
    ctx.onSuccess(r.unit, 'next'); results.push({ item: r.unit, type: 'next' }); tick();
    // read the whole row in order
    await ctx.speak(r.seq.map(v => ctx.subject.token.say(v === null ? r.target : v)));
    await praise(ctx);
    row.remove(); tray.remove();
    await wait(150);
  }
  return results;
}
