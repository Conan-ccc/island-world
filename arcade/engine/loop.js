export function makeStepper(stepFn, { dt = 1 / 60, maxFrame = .1 } = {}) {
  let pending = 0;
  return {
    advance(elapsed) {
      pending += Math.max(0, Math.min(maxFrame, elapsed));
      let ticks = 0;
      while (pending + 1e-10 >= dt) { pending -= dt; stepFn(dt); ticks++; }
      return ticks;
    },
    reset() { pending = 0; },
  };
}

export function startLoop(stepper, draw, env = globalThis) {
  let last = null, paused = false, stopped = false, frame;
  const doc = env.document;
  function run(now) {
    if (stopped) return;
    if (!paused && !doc.hidden) {
      if (last !== null) stepper.advance((now - last) / 1000);
      draw(); last = now;
    } else last = null;
    if (!stopped) frame = env.requestAnimationFrame(run);
  }
  function reset() { last = null; stepper.reset(); }
  doc.addEventListener('visibilitychange', reset);
  frame = env.requestAnimationFrame(run);
  return {
    pause() { paused = true; reset(); },
    resume() { paused = false; reset(); },
    stop() { stopped = true; env.cancelAnimationFrame(frame); doc.removeEventListener('visibilitychange', reset); reset(); },
  };
}
