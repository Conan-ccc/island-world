import { newSession, tick } from './session.js';
import { makeStepper, startLoop } from './loop.js';
import { attachInput } from './input.js';
import { drawHero, preloadArt } from '../art.js';
import { playSfx, SFX_NAMES } from '../../core/fx.js';
import { speak, stopSpeech } from '../../core/speech.js';

export function startPlay(root, game, stageNo, options) {
  const s = newSession(game, stageNo, options);
  preloadArt(game.meta.id, s.heroId);
  root.innerHTML = `<section class="arc-playing"><header class="arc-toolbar"><button class="arc-exit" aria-label="단계로">나가기</button><span class="arc-hearts"></span><p class="arc-ask"><span class="arc-goal"></span><strong class="arc-token" hidden></strong></p><span class="arc-score"></span><button class="arc-pause">쉬기</button></header><div class="arc-board"><canvas class="arc-canvas" width="1000" height="700" aria-label="놀이 판"></canvas><div class="arc-bars"><progress class="arc-progress" aria-label="목표까지"></progress><progress class="arc-path" aria-label="끝까지 남은 길" hidden></progress><progress class="arc-time" aria-label="남은 시간" hidden></progress></div></div></section>`;
  const canvas = root.querySelector('canvas'), ctx = canvas.getContext('2d'), input = attachInput(canvas);
  const hearts = root.querySelector('.arc-hearts'), progress = root.querySelector('.arc-progress'), score = root.querySelector('.arc-score');
  const ask = root.querySelector('.arc-goal'), token = root.querySelector('.arc-token'), timer = root.querySelector('.arc-time'), path = root.querySelector('.arc-path');
  const board = root.querySelector('.arc-board');
  const resize = new ResizeObserver(() => {
    const width = Math.min(board.clientWidth, board.clientHeight * 10 / 7);
    canvas.style.width = `${width}px`; canvas.style.height = `${width * 7 / 10}px`;
  });
  resize.observe(board);
  const pops = [];
  let time = 0, hurt = 0, ability = 0, ended = false, stopped = false, manualPause = false, guiding = !!options.guide;
  const portrait = matchMedia('(orientation: portrait)');
  function paused() { return document.hidden || portrait.matches || manualPause || guiding; }
  function update(dt, injected) {
    if (ended || stopped || paused()) return;
    time += dt; hurt = Math.max(0, hurt - dt); ability = Math.max(0, ability - dt);
    const before = { lit: s.g.lit, litTime: s.g.litTime, phase: s.g.phase, index: s.g.index };
    const events = tick(s, injected ?? input.read(), dt);
    for (const name of momentSounds(game.meta.id, before, s.g, events)) playSfx(name);
    for (const e of events) {
      if (e.type === 'good') { pops.push({ x: e.x ?? 500, y: e.y ?? 350, age: 0 }); playSfx('pop'); }
      if (e.type === 'bad' || e.type === 'timeout') hurt = .6;
      if (e.type === 'ability') { ability = 1; playSfx('sparkle'); }
    }
    for (const pop of pops) pop.age += dt;
    while (pops[0]?.age > 1) pops.shift();
    if (s.done) { ended = true; options.onResult(s); }
  }
  function draw() {
    if (stopped) return;
    game.draw(ctx, s.g, { heroId: s.heroId, time, pose: hurt ? 'sad' : 'idle' });
    drawCheer(ctx, game.meta, s.heroId, ability, time);
    if (ability) { ctx.strokeStyle = '#f7c756'; ctx.lineWidth = 12; ctx.strokeRect(12, 12, 976, 676); }
    for (const pop of pops) { ctx.globalAlpha = 1 - pop.age; ctx.fillStyle = '#486d47'; ctx.font = 'bold 50px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('+1', pop.x, pop.y - pop.age * 80); }
    ctx.globalAlpha = 1;
    hearts.textContent = '♥'.repeat(Math.max(0, s.hearts)) + (s.shield ? ' ◇' : '');
    progress.max = s.g.need || 1; progress.value = Math.min(s.g.score || 0, progress.max);
    score.textContent = `${s.g.score || 0} / ${s.g.need || 1}`;
    ask.textContent = s.g.question ? game.meta.ask : game.meta.goal;
    token.hidden = !s.g.question;
    token.textContent = s.g.question?.ask.label ?? '';
    path.hidden = !Number.isFinite(s.g.distance) || !Number.isFinite(s.g.end);
    if (!path.hidden) {
      path.max = s.g.end; path.value = s.g.distance;
      if (s.g.score >= s.g.need) { ask.textContent = '좋아! 끝까지 달려!'; token.hidden = true; }
    }
    timer.hidden = !(stageNo > 10 && s.g.remaining != null);
    if (!timer.hidden) { timer.max = s.g.row.time * s.g.mods.time; timer.value = s.g.remaining; }
  }
  const loop = startLoop(makeStepper(update), draw);
  function syncPause() { input.reset(); if (paused()) loop.pause(); else loop.resume(); }
  portrait.addEventListener('change', syncPause); document.addEventListener('visibilitychange', syncPause);
  root.querySelector('.arc-pause').onclick = e => { manualPause = !manualPause; e.currentTarget.textContent = manualPause ? '계속 놀기' : '잠깐 쉬기'; syncPause(); };
  root.querySelector('.arc-exit').onclick = options.onExit;
  if (guiding) {
    const guide = document.createElement('div'); guide.className = 'arc-guide';
    const hand = document.createElement('span'); hand.textContent = '☝';
    const how = document.createElement('p'); how.textContent = game.meta.how;
    const button = document.createElement('button'); button.className = 'arc-guide-start arc-primary arc-pulse'; button.textContent = '해볼게!';
    button.onclick = () => { guiding = false; guide.remove(); options.onGuide(); syncPause(); };
    guide.append(hand, how, button); root.querySelector('.arc-board').append(guide);
    speak(game.meta.how);
  }
  syncPause(); draw();
  if (!guiding && s.g.question?.say) speak(s.g.question.say);
  return {
    session: s,
    advance(inputValue, dt = 1 / 60) { update(dt, inputValue); if (!stopped) draw(); },
    stop() { stopped = true; resize.disconnect(); loop.stop(); input.detach(); portrait.removeEventListener('change', syncPause); document.removeEventListener('visibilitychange', syncPause); stopSpeech(); },
  };
}

export function drawCheer(ctx, meta, heroId, ability, time) {
  if (meta.body || meta.cheerAt === null) return;
  const { x, y, size } = meta.cheerAt ?? { x: 60, y: 80, size: 80 };
  drawHero(ctx, heroId, ability ? 'happy' : 'idle', x, y, size * (ability ? 1.25 : 1), time);
}

export function momentSounds(id, before, after, events) {
  const names = events.filter(e => e.type === 'sound' && SFX_NAMES.includes(e.name)).map(e => e.name);
  if (id === 'echo' && after.lit >= 0 && (after.lit !== before.lit || after.litTime > before.litTime)) {
    if (after.phase === 'show') names.push('tap');
    else if (after.index > before.index && !events.some(e => e.type === 'good')) names.push('pop');
  }
  return names;
}
