// Stop the iPad's own zoom while a child plays: pinch zoom (two or more fingers), double-tap zoom and the page bounce.
// iPad Safari ignores user-scalable=no in the viewport tag, so the page cancels the gestures itself:
//   gesturestart/gesturechange/gestureend: Safari's pinch events (cancelled = no zoom)
//   touchmove with two or more fingers: the browser's pinch and pan (pointer events still reach the games)
//   dblclick: a second quick tap never zooms
// The swipe up from the bottom edge (home, app switch) belongs to iPadOS and no web page can stop it: Guided Access
// (Settings > Accessibility) does that, see README.
// Every page loads this through core/register-sw.js.
const stop = e => { if (e.cancelable) e.preventDefault(); };

export function guardTouches(doc = globalThis.document) {
  if (!doc || doc.__touchGuard) return false;
  doc.__touchGuard = true;
  const opts = { passive: false };
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) doc.addEventListener(type, stop, opts);
  doc.addEventListener('touchmove', e => { if (e.touches && e.touches.length > 1) stop(e); }, opts);
  doc.addEventListener('dblclick', stop, opts);
  for (const type of ['dragstart', 'contextmenu', 'selectstart']) {
    doc.addEventListener(type, e => { if (!e.target?.closest?.('input, textarea, select')) stop(e); }, opts);
  }
  return true;
}

if (globalThis.document) guardTouches();
