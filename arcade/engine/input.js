export function attachInput(canvas, captureStart = false, multiPress = false) {
  const presses = [];
  let pointer = null, value = { down: false, pressed: false, x: 0, y: 0 };
  const position = e => {
    const r = canvas.getBoundingClientRect();
    value.x = Math.max(0, Math.min(1000, (e.clientX - r.left) * 1000 / r.width));
    value.y = Math.max(0, Math.min(700, (e.clientY - r.top) * 700 / r.height));
  };
  function down(e) {
    if ((!multiPress && (pointer !== null || e.isPrimary === false)) || (e.button !== undefined && e.button !== 0)) return;
    e.preventDefault(); pointer = e.pointerId; position(e);
    if (captureStart) { value.startX = value.x; value.startY = value.y; }
    value.down = true; value.pressed = true; canvas.setPointerCapture?.(pointer);
    if (multiPress) presses.push({ ...value });
  }
  function move(e) { if (e.pointerId === pointer) { e.preventDefault(); position(e); } }
  function up(e) { if (e.pointerId === pointer) { if (captureStart && e.type === 'pointerup') position(e); pointer = null; value.down = false; } }
  function reset() { pointer = null; value.down = false; value.pressed = false; presses.length = 0; }
  const handlers = { pointerdown: down, pointermove: move, pointerup: up, pointercancel: e => { if (e.pointerId === pointer) reset(); }, lostpointercapture: up };
  for (const [name, fn] of Object.entries(handlers)) canvas.addEventListener(name, fn);
  return {
    read() { const out = multiPress && presses.length ? presses.shift() : { ...value }; value.pressed = false; return out; }, reset,
    detach() { for (const [name, fn] of Object.entries(handlers)) canvas.removeEventListener(name, fn); reset(); },
  };
}
