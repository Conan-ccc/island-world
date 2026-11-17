import { onTap } from '../tap.js';
// 동물 친구 선물: a friend asks for something (the bubble shows it, or only "?"); drag the matching card to the friend.
// The bubble and the cards are drawn by the subject's look (ctx.subject.look.gift):
//   bubble(r) -> { style, html, cls }, card(t, k) -> { style, html, cls, x, y }, solved(bubble, r): the bubble once answered,
//   and optionally say(t) (a tapped card), again(r) (the line when the bubble or friend is tapped), friendAsks (tapping the friend asks again)
import { makeDraggable, lockAll } from '../drag.js';
import { scene, shuffle, at, el, glow, unglow, cheer, buddy, wait, ask, picUrl, praise, progress, asset } from './common.js';

const FRIENDS = ['friend-rabbit', 'friend-bear', 'friend-duck', 'friend-bird'];

export async function run(ctx, { rounds }) {
  const T = ctx.subject.token;
  const L = { say: T.say, again: r => r.prompt, friendAsks: true, ...ctx.subject.look.gift };
  scene(ctx, 'village');
  buddy(ctx);
  const results = [];
  const tick = progress(ctx, rounds.length);
  const friendSrc = i => ctx.skin?.friends ? asset(ctx.skin.friends[i % ctx.skin.friends.length]) : picUrl(FRIENDS[i % FRIENDS.length]);
  for (let i = 0; i < rounds.length; i++) {
    const r = rounds[i];
    const friend = at(el('div', 'position:absolute;width:min(22vw,32vh);z-index:3', `<img class="picimg" src="${friendSrc(i)}" alt="">`, 'animal'), 64, 62);
    const bb = L.bubble(r);
    const bubble = at(el('div', bb.style, bb.html, bb.cls), 64, 22);
    ctx.stage.append(friend, bubble);
    const cards = shuffle(r.options, ctx.rng).map((t, k) => {
      const cd = L.card(t, k);
      const c = at(el('div', cd.style, cd.html, cd.cls), cd.x, cd.y);
      c.dataset.text = t;
      ctx.stage.appendChild(c);
      c.addEventListener('pointerdown', () => ctx.speak(L.say(t)));
      return c;
    });
    const answerCard = cards.find(x => x.dataset.text === r.answer);
    ctx.boardLine = r.prompt;
    ask(ctx, r.prompt, answerCard);
    onTap(bubble, () => ask(ctx, L.again(r), answerCard));
    if (L.friendAsks) onTap(friend, () => ask(ctx, L.again(r), answerCard));
    let wrong = 0;
    await new Promise(done => {
      for (const c of cards) makeDraggable(c, {
        targets: () => [friend, bubble],
        onDrop: tg => {
          if (!tg) return false;
          if (c.dataset.text === r.answer) {
            lockAll(cards);
            c.style.transition = 'left .4s, top .4s, transform .4s, opacity .4s'; c.style.left = '64%'; c.style.top = '55%'; c.style.transform = 'scale(.3)'; c.style.opacity = '0';
            L.solved(bubble, r);
            friend.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-30px)' }, { transform: 'translateY(0)' }], { duration: 500, iterations: 2 });
            cheer(ctx, friend);
            for (const it of new Set(r.credit || [])) { ctx.onSuccess(it, 'gift'); results.push({ item: it, type: 'gift' }); }
            tick(); setTimeout(done, 900);
            return true;
          }
          wrong += 1;
          if (wrong >= 2) glow(answerCard);
          ctx.speak(ctx.phrase('tryAgain'));
          return false;
        },
      });
    });
    await ctx.speak(r.line);
    await praise(ctx);
    unglow(ctx.stage);
    [friend, bubble, ...cards].forEach(x => x.remove());
    await wait(150);
  }
  return results;
}
