import { onTap } from '../tap.js';
// Helpers shared by the activities. They know no subject: what a play token looks like and says, the question board
// and the praise lines come from the subject's config (ctx.subject).
import { asset } from '../env.js';

export { asset };
export const picUrl = name => asset(`pic/${name}.webp`);
export const wait = ms => new Promise(r => setTimeout(r, ms));
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function shuffle(arr, rng = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function el(tag, style = '', html = '', cls = '') {
  const e = document.createElement(tag);
  if (style) e.style.cssText = style;
  if (html) e.innerHTML = html;
  if (cls) e.className = cls;
  return e;
}
export function at(e, xPct, yPct) { e.style.left = xPct + '%'; e.style.top = yPct + '%'; e.style.translate = '-50% -50%'; return e; }
export function glow(e) { if (e) e.classList.add('glow'); }
export function unglow(root) { root.querySelectorAll('.glow').forEach(x => x.classList.remove('glow')); }
export function wiggle(e) { e.classList.remove('wiggle'); void e.offsetWidth; e.classList.add('wiggle'); }
export function center(e) { const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

// Scene background (illustration) with a slow drift
export function scene(ctx, name) {
  ctx.stage.innerHTML = '';
  const bg = ctx.skin?.bg ? asset(ctx.skin.bg) : asset('bg/act-' + name + '.jpg');
  ctx.stage.appendChild(el('div', `background-image:url(${bg})`, '', 'scene-bg'));
}

// Round progress: a row of dots at the top right that fill as rounds finish (the child sees how much is left)
export function progress(ctx, total) {
  ctx.stage.querySelector('.rounds')?.remove();
  const box = el('div', 'position:absolute;top:18px;right:18px;display:flex;gap:10px;z-index:8;background:rgba(255,255,255,.75);padding:8px 12px;border-radius:20px', '', 'rounds');
  const dots = Array.from({ length: total }, () => { const d = el('div', 'width:26px;height:26px;border-radius:50%;background:#E9DDF0;box-shadow:inset 0 2px 0 rgba(0,0,0,.08);transition:all .4s'); box.appendChild(d); return d; });
  ctx.stage.appendChild(box);
  let i = 0;
  return () => { const d = dots[i++]; if (d) { d.style.background = 'radial-gradient(circle at 35% 30%,#FFF3A8,#FFC93C)'; d.style.transform = 'scale(1.25)'; setTimeout(() => { d.style.transform = 'scale(1)'; }, 300); } };
}

// The child's character in the corner. Tapping it repeats the current prompt.
export function buddy(ctx, style = 'left:1%;bottom:1%;width:min(17vw,24vh)') {
  const b = el('div', `position:absolute;${style};z-index:5;cursor:pointer`, ctx.characterHtml, 'buddy');
  onTap(b, () => { wiggle(b); if (ctx.prompt) ask(ctx, ctx.prompt, ctx.promptTarget); });
  ctx.stage.appendChild(b);
  return b;
}

// The question board at the top (its inside comes from the subject's board()); tapping it says the current line again
export function showBoard(ctx, inner) {
  ctx.stage.querySelector('.board')?.remove();
  const b = el('div', '', inner, 'board');
  onTap(b, () => { if (ctx.boardLine) ctx.speak(ctx.boardLine); });
  ctx.stage.appendChild(b);
  return b;
}

// Say a prompt; if speech is unavailable or fails, show the answer right away instead.
export function ask(ctx, text, target) {
  ctx.prompt = text;
  ctx.promptTarget = target;
  return Promise.resolve(ctx.speak(text)).then(ok => { if (ok === false && target && target.isConnected) glow(target); return ok; });
}

export function cheer(ctx, e) { const [x, y] = center(e); ctx.burst(x, y, 'stars'); ctx.sfx('sparkle'); }
const PRAISE = ['와, 잘했어!', '최고야!', '멋지다!'];
// the subject may add its own lines (english: "Good job!", "Great!")
export function praise(ctx) { const list = ctx.subject?.praise || PRAISE; return ctx.speak(list[Math.floor(ctx.rng() * list.length)]); }

// A row of big numeral buttons at the bottom; resolves with the right button once it is tapped
// (a wrong one wiggles and says its own name; after two wrong taps the right one glows)
export function pickOne(ctx, options, answer, prompt) {
  const tray = el('div', 'position:absolute;left:50%;bottom:4%;translate:-50% 0;display:flex;gap:min(3vw,28px);z-index:7', '', 'choice-tray');
  const btns = options.map(t => {
    const b = el('button', 'border:none;min-width:min(15vw,19vh);height:min(15vw,19vh);padding:0 18px;border-radius:26px;background:#fff;box-shadow:0 8px 0 #F3C4D8,0 14px 18px rgba(80,50,80,.2);color:#4A3A48;display:flex;align-items:center;justify-content:center;cursor:pointer;transform:scale(.3);opacity:0;transition:transform .35s cubic-bezier(.3,1.6,.5,1), opacity .35s', `<span class="tok-num" style="font-size:min(${t.length >= 2 ? '8vw,10vh' : '10vw,12vh'})">${esc(t)}</span>`, 'choice');
    b.dataset.text = t;
    tray.appendChild(b);
    return b;
  });
  ctx.stage.appendChild(tray);
  requestAnimationFrame(() => btns.forEach(b => { b.style.transform = 'scale(1)'; b.style.opacity = '1'; }));
  const target = btns.find(b => b.dataset.text === answer);
  ask(ctx, prompt, target);
  let wrong = 0, solved = false;
  const done = new Promise(res => {
    for (const b of btns) onTap(b, () => {
      if (solved) return;
      if (b === target) {
        solved = true;
        unglow(ctx.stage);
        const [x, y] = center(target); ctx.burst(x, y, 'stars'); ctx.sfx('success');
        btns.forEach(o => { if (o !== target) o.style.opacity = '.25'; });
        res(target); return;
      }
      wiggle(b); ctx.sfx('boing'); ctx.speak(ctx.subject.token.say(b.dataset.text));
      wrong += 1;
      if (wrong >= 2) glow(target);
    });
  });
  return { tray, done };
}
