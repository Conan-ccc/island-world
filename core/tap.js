// DOM-free tap state: distance is CSS pixels; a hold has no time limit.
export function tapState(state, type, e, now, { slop = 40, gap = 120, multi = false } = {}) {
  if (multi && type !== 'click') {
    const pointers = { ...state.pointers };
    const prior = pointers[e.pointerId] || {};
    const result = tapState({ ...prior, last: state.last }, type, e, now, { slop, gap });
    if (result.state.id == null) delete pointers[e.pointerId];
    else pointers[e.pointerId] = result.state;
    return { state: { ...state, pointers, last: result.fire ? now : state.last, pointerAt: result.state.pointerAt ?? state.pointerAt, pressed: Object.values(pointers).some(p => p.pressed) }, fire: result.fire };
  }
  let next = { ...state }, fire = false;
  if (type === 'down' && next.id == null) {
    next = { ...next, id: e.pointerId, x: e.clientX, y: e.clientY, pressed: now - (next.last ?? -Infinity) >= gap };
  } else if (['move', 'up', 'cancel'].includes(type) && next.id === e.pointerId) {
    if (type === 'cancel' || Math.hypot(e.clientX - next.x, e.clientY - next.y) > slop) next.pressed = false;
    if (type === 'up' || type === 'cancel') {
      fire = type === 'up' && next.pressed;
      next.id = null; next.pressed = false;
      next.pointerAt = now;
    }
  } else if (type === 'click') {
    // detail 0 is keyboard/HTMLElement.click(), even immediately after a touch.
    fire = e.detail === 0 || now - (next.pointerAt ?? -Infinity) > 800;
  }
  fire = !!fire && now - (next.last ?? -Infinity) >= gap;
  if (fire) next.last = now;
  return { state: next, fire };
}

// A pointer action may replace its target before Chromium dispatches click.
export function suppressClick(action, sequence, detail, now) {
  return !!action && detail !== 0 && action.sequence === sequence && now - action.at >= 0 && now - action.at <= 1000;
}

const documents = new WeakMap();
function clickGuard(doc) {
  if (!doc) return null;
  if (documents.has(doc)) return documents.get(doc);
  const guard = { sequence: 0, action: null };
  documents.set(doc, guard);
  doc.addEventListener('pointerdown', () => { guard.sequence++; }, true);
  doc.addEventListener('click', e => {
    if (!suppressClick(guard.action, guard.sequence, e.detail, performance.now())) return;
    guard.action = null;
    e.preventDefault(); e.stopImmediatePropagation();
  }, true);
  return guard;
}

export function onTap(el, handler, opts = {}) {
  const guard = clickGuard(el.ownerDocument);
  let state = {}, finished = false;
  const listeners = [];
  const listen = (name, type) => {
    const fn = e => {
      const now = performance.now();
      if (type === 'click' && e.detail !== 0 && now - (state.pointerAt ?? -Infinity) <= 800) {
        e.preventDefault(); e.stopPropagation();
      }
      if (finished || el.disabled || opts.ignore?.(e)) return;
      const result = tapState(state, type, e, now, opts);
      const claimed = type === 'down' && (opts.multi ? !state.pointers?.[e.pointerId] && !!result.state.pointers?.[e.pointerId] : state.id == null && result.state.id === e.pointerId);
      state = result.state;
      if (claimed) {
        try { el.setPointerCapture(e.pointerId); } catch { /* synthetic input */ }
      }
      el.classList.toggle('pressed', !!state.pressed);
      if (result.fire) {
        if (type === 'up' && guard) guard.action = { sequence: guard.sequence, at: now };
        if (opts.once) finished = true;
        handler(e);
      }
    };
    el.addEventListener(name, fn);
    listeners.push([name, fn]);
  };
  for (const [name, type] of [['pointerdown', 'down'], ['pointermove', 'move'], ['pointerup', 'up'], ['pointercancel', 'cancel'], ['lostpointercapture', 'cancel'], ['click', 'click']]) listen(name, type);
  return () => {
    for (const [name, fn] of listeners) el.removeEventListener(name, fn);
    el.classList.remove('pressed');
  };
}
