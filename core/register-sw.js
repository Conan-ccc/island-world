// Register the service worker and check for a new version on every launch and every return to the app.
// When a new version takes over, the home screen reloads on the next start tap (never mid-activity).
// The pages load this file as a module (<script type="module" src="../core/register-sw.js">): it registers the one
// worker of the site, sw.js at the site root (scope: the whole site). The worker fetches the code and the pages on
// install; the assets come later, in the background, when a page asks with warmCache() (every time a screen opens, so a
// download that was cut off goes on). When a new version takes over while the page is open, the page's last warm goes
// to the new worker too (it starts with an empty cache of its own).
import { siteUrl } from './env.js';
import './touch-guard.js'; // every page loads this file, so the zoom guard rides along

let ready = null;
let asked = null; // the last warm this page sent: { prefer }
const send = (w, prefer) => { if (w) w.postMessage(prefer ? { type: 'warm', prefer } : { type: 'warm' }); };

export function registerSW(swUrl = siteUrl('sw.js')) {
  if (!('serviceWorker' in navigator)) return null;
  // no offline cache while developing on this PC (it would serve stale files): only with ?sw=1, and then on the pages
  // that worker already runs
  if (location.hostname === 'localhost' && !location.search.includes('sw=1') && !navigator.serviceWorker.controller) return null;
  if (ready) return ready;
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) window.__swUpdateReady = true;
    if (asked) send(navigator.serviceWorker.controller, asked.prefer);
  });
  ready = navigator.serviceWorker.register(swUrl).then(reg => {
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
    return navigator.serviceWorker.ready;
  }).catch(() => null);
  return ready;
}

// ask the worker (once it is ready) to fetch the assets it does not have yet; prefer: path prefixes to fetch first
// (the subject screens: ['assets/<subject>/'])
export function warmCache(prefer) {
  if (!ready) return;
  asked = { prefer };
  ready.then(reg => send(reg && reg.active, prefer)).catch(() => {});
}

if (globalThis.navigator && globalThis.document) registerSW();
