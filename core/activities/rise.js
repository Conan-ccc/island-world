import { onTap } from '../tap.js';
// 둥실둥실 잡기: tokens float up or fall down; tap the ones that match what you heard
import { scene, shuffle, el, buddy, wait, ask, praise, progress, asset, center, wiggle, glow } from './common.js';

// what a subject's look may change (ctx.subject.look.rise): the field's class, the size, a font for plain-text tokens
const LOOK = { fieldClass: 'field', size: (t, letter) => (letter ? 120 : 136), font: () => '' };

export async function run(ctx, { rounds }) {
  const T = ctx.subject.token, L = { ...LOOK, ...ctx.subject.look?.rise };
  scene(ctx, 'tree');
  buddy(ctx);
  const skin = ctx.skin || {};
  const fall = skin.dir === 'fall';
  const results = [];
  const total = rounds.reduce((a, r) => a + r.need, 0);
  const tick = progress(ctx, total);
  for (const r of rounds) {
    const unit = r.unit ?? r.target;
    ctx.subject.board(ctx, r.show);
    ctx.boardLine = r.line;
    const field = el('div', 'position:absolute;inset:0;overflow:hidden;z-index:3', '', L.fieldClass);
    ctx.stage.appendChild(field);
    let got = 0, misses = 0, alive = true, lastTarget = null, sinceTarget = 0;
    ask(ctx, r.prompt, null);
    const spawn = () => {
      if (!alive) return;
      // never a long wait for the right one: after two others the next is always a match
      const isTarget = sinceTarget >= 2 || ctx.rng() < 0.45;
      sinceTarget = isTarget ? 0 : sinceTarget + 1;
      const text = isTarget ? r.target : shuffle(r.decoys, ctx.rng)[0];
      const letter = T.isSpecial(text);
      const size = L.size(text, letter);
      const x = 8 + ctx.rng() * 78;
      const dur = 9000 + ctx.rng() * 3000;
      const art = skin.item && letter ? `background:url(${asset(skin.item)}) center/contain no-repeat;` : `background:radial-gradient(circle at 35% 30%,#fff 0,${['#FFB8D9', '#B8E0FF', '#FFE7A8', '#CFF2C4'][Math.floor(ctx.rng() * 4)]} 45%,rgba(255,255,255,.4) 100%);border-radius:50%;box-shadow:inset -8px -10px 0 rgba(0,0,0,.06);`;
      const it = el('div', `position:absolute;left:${x}%;${fall ? 'top:-150px' : 'bottom:-150px'};width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;${art}${L.font(text)}color:#4A3A48;text-shadow:0 0 6px #fff,0 0 12px #fff;cursor:pointer;filter:drop-shadow(0 8px 8px rgba(0,0,0,.18))`, T.html(text, 60), 'floater');
      it.dataset.text = text;
      field.appendChild(it);
      const sway = (ctx.rng() - 0.5) * 120;
      const anim = it.animate([
        { transform: `translate(0, 0) rotate(${fall ? -10 : 0}deg)` },
        { transform: `translate(${sway}px, ${fall ? '' : '-'}${(window.innerHeight + 300) / 2}px) rotate(${fall ? 12 : 4}deg)` },
        { transform: `translate(${-sway / 2}px, ${fall ? '' : '-'}${window.innerHeight + 300}px) rotate(${fall ? -8 : 0}deg)` },
      ], { duration: dur, easing: 'linear' });
      anim.onfinish = () => it.remove();
      if (isTarget) lastTarget = it;
      onTap(it, () => {
        if (it.dataset.done || !alive || got >= r.need) return;
        if (it.dataset.text === r.target) {
          it.dataset.done = '1'; anim.pause();
          const [cx, cy] = center(it); ctx.burst(cx, cy, 'stars'); ctx.sfx('sparkle');
          it.style.transition = 'transform .35s, opacity .35s'; it.style.transform += ' scale(1.4)'; it.style.opacity = '0';
          setTimeout(() => it.remove(), 400);
          ctx.onSuccess(unit, 'rise'); results.push({ item: unit, type: 'rise' }); tick();
          got += 1; misses = 0;
        } else {
          wiggle(it); ctx.sfx('boing'); ctx.speak(T.say(it.dataset.text));
          misses += 1;
          if (misses >= 2 && lastTarget?.isConnected) glow(lastTarget);
        }
      });
    };
    spawn();
    const timer = setInterval(spawn, 1300);
    while (got < r.need && ctx.stage.isConnected) await wait(200);
    alive = false; clearInterval(timer);
    if (r.listenOnly) ctx.subject.board(ctx, r.reveal);
    await ctx.speak(r.line);
    await praise(ctx);
    field.remove();
  }
  return results;
}
