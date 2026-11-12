// 따라 쓰기 문: trace the letter (word, numeral) on the door to open it.
// The subject's look (ctx.subject.look.door) gives: board(key) (the board spec), line(key, lines) (what is said),
// padClass, guides(key) (writing lines drawn on the pad), tracer(key) (stroke and ink widths),
// promptAfterLine (say the line first and the prompt only if the child has not started yet, instead of both at once).
import { createTracer } from '../trace.js';
import { speak } from '../speech.js';
import { scene, el, cheer, buddy, wait, praise, progress } from './common.js';

export async function run(ctx, { keys, unitOf = {}, lines = {}, guideOpacity = 0.5 }) {
  const L = { padClass: 'tracepad', guides: () => '', tracer: () => ({}), promptAfterLine: false, ...ctx.subject.look.door };
  scene(ctx, 'door');
  buddy(ctx);
  const results = [];
  const tick = progress(ctx, keys.length);
  for (const key of keys) {
    ctx.subject.board(ctx, L.board(key));
    ctx.boardLine = L.line(key, lines);
    const pad = el('div', 'position:absolute;left:50%;top:60%;translate:-50% -50%;width:min(44vh,40vw);height:min(44vh,40vw);background:rgba(255,250,240,.93);border-radius:28px;box-shadow:0 10px 24px rgba(80,50,30,.25);z-index:3;transition:transform .8s, opacity .8s', '', L.padClass);
    const guides = L.guides(key);
    if (guides) pad.insertAdjacentHTML('beforeend', guides);
    ctx.stage.appendChild(pad);
    ctx.prompt = ctx.speakLines.traceDoor;
    // the line to trace is there from the start
    let tracer, isDone = false, touched = false;
    const traced = new Promise(done => {
      tracer = createTracer(pad, key, { strokes: ctx.subject.strokes, speak, guideOpacity, ...L.tracer(key), onComplete: () => { isDone = true; done(); }, onStroke: () => { touched = true; }, onHelp: () => ctx.speak(ctx.speakLines.helpTrace) });
    });
    if (L.promptAfterLine) Promise.resolve(ctx.speak(ctx.boardLine)).then(() => { if (!isDone && !touched && pad.isConnected) ctx.speak(ctx.prompt); });
    else ctx.speak([...[ctx.boardLine].flat(), ctx.prompt]);
    await traced;
    cheer(ctx, pad); tick();
    if (unitOf[key]) { ctx.onSuccess(unitOf[key], 'trace'); results.push({ item: unitOf[key], type: 'trace' }); }
    await ctx.speak(ctx.boardLine);
    await praise(ctx);
    pad.style.transform = 'scale(.2) rotate(20deg)'; pad.style.opacity = '0';
    ctx.sfx('whoosh');
    await wait(800);
    tracer.destroy(); pad.remove();
  }
  return results;
}
