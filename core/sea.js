import { ROOM_ICON, PLAY_ICON, CLOSE_ICON } from './room-icons.js';
import { openMyRoom, snackBadge } from './room.js';
import { applyWorld, mapAtmosphere } from './world.js';
import { onTap } from './tap.js';
import { mountStarJar } from './goal-ui.js';
import { mapZones, nearestZone, recommendedIsland } from './map-zones.js';
// A subject's home: start, first-run setup, character birth, illustrated sea map, decorations, friend room, growth scene.
// One home for every subject; what a subject does its own way comes from its config (subjects/<subject>/config.js):
//   parent.needsSetup(state)  the first start opens the parent panel's first-run setup until it says no (hangul: the
//                             child's name), before the character is born
//   friendChoice              the parent can name another island's friend (subject settings excludeCharacter) so this
//                             game hatches a different one (english, number); without it only the used characters are
//                             left out (hangul)
//   islands, lines, themes.HOME_MUSIC, content.islandUnits, voice
// The top-left button on the sea map goes to the entrance (../index.html); every other way out goes to an island page
// in the same folder (island<n>.html), and an island page comes back here (sea.html, sea.html?evolve=<from>-<to>).
import { loadState, saveState, claimSubjects, SAVE_KEY } from './save.js';
import { adoptLegacy } from './legacy.js';
import { charHtml, pickCharacter } from './characters.js';
import { unlockSpeech, speak, setSpeechVolume, configureSpeech } from './speech.js';
import { playSfx, burst, unlockAudio, setVolume, setMusic, playMusic, preloadSfx } from './fx.js';
import { attachPetting } from './pet.js';
import { installParentGate, openParentPanel } from './parent.js';
import { playEvolution } from './evolve.js';
import { isMastered } from './mastery.js';
import { asset, useFonts } from './env.js';
import { warmCache } from './register-sw.js';

const BAG_ICON = '<svg viewBox="0 0 60 60" width="56" height="56"><path d="M14 22 h32 l4 30 h-40Z" fill="#FFB8D9" stroke="#F58FB4" stroke-width="2"/><path d="M22 22 q0-12 8-12 q8 0 8 12" fill="none" stroke="#F58FB4" stroke-width="3"/><circle cx="30" cy="36" r="5" fill="#FFE27A"/></svg>';
const FLAG = '<svg viewBox="0 0 40 40" width="46" height="46"><path d="M10 36 V6" stroke="#8a6" stroke-width="3"/><path d="M11 6 L34 12 L11 18Z" fill="#FF6FA5"/></svg>';
// the way back to the entrance (all the islands): a little signpost
const ENTRANCE_ICON = '<svg viewBox="0 0 60 60" width="48" height="48"><path d="M30 14 V54" stroke="#C9A27A" stroke-width="5" stroke-linecap="round"/><path d="M12 14 H44 L52 22 L44 30 H12Z" fill="#FFE7B8" stroke="#E8B04A" stroke-width="3" stroke-linejoin="round"/><circle cx="22" cy="22" r="4" fill="#FF6FA5"/><circle cx="34" cy="22" r="4" fill="#7FD8C4"/></svg>';

const wait = ms => new Promise(r => setTimeout(r, ms));

export function startSea(subject) {
  useFonts(subject);
  applyWorld(subject);
  document.body.dataset.subject = subject.id;
  // the offline copy: this subject's pictures and sounds first
  warmCache(['assets/' + subject.id + '/']);
  const LINES = subject.lines;
  const { HOME_MUSIC } = subject.themes;
  const state = loadState(undefined, { own: subject.id });
  // the old game's save (and the other old games' saves) come in once; the old keys are only read
  const got = adoptLegacy(state);
  if (got.length) { claimSubjects(state, got); saveState(state); }
  // another page (a tab, an island) wrote the save, or the browser brings this page back from its back/forward cache:
  // read it again rather than go on with an old copy (not while the parent panel or another overlay is open)
  addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  addEventListener('storage', e => { if (e.key === SAVE_KEY && !document.querySelector('.parent-panel, .overlay')) location.reload(); });
  const app = document.getElementById('app');
  const H = () => state.subjects[subject.id];
  const save = () => saveState(state);
  const { available: AVAILABLE_ISLANDS, count: ISLAND_COUNT } = subject.islands;
  configureSpeech({ ...subject.voice, subject: subject.id });
  const applySound = () => { setVolume(state.settings.volume); setSpeechVolume(state.settings.volume); setMusic(state.settings.music !== false); };
  applySound();

  let ISL = [[18, 77], [35, 63], [46, 49], [66, 44], [57, 26], [80, 31], [76, 17], [89, 12]];
  const mapReady = fetch(asset(subject.themes.HOME_SPOTS || 'bg/home.json', subject.id)).then(r => r.json()).then(j => { if (j.islands?.length === 8) ISL = j.islands; }).catch(() => {});

  // every island is open from the start (user decision 2026-10-30); clearing still grows the character
  function islandDone(n) {
    const isl = H().islands[String(n)];
    const units = subject.content.islandUnits(n, { profile: state.profile });
    const done = isl ? units.filter(u => isMastered(isl, u)).length : 0;
    return { done, total: units.length, cleared: !!isl?.cleared };
  }

  const myChar = () => charHtml(H().characterId, H().stage, { decoration: H().wearing });

  function renderHome() {
    const nums = [...Array(ISLAND_COUNT)].map((_, i) => i + 1);
    const zones = mapZones(ISL, { minimum: 0 });
    const best = recommendedIsland(nums.map(islandDone));
    let picked = false;
    app.innerHTML = `<div class="hmap" style="position:absolute;left:50%;top:50%;width:max(100vw,160vh);height:max(62.5vw,100vh);translate:-50% -50%;overflow:hidden">
      <div class="scene-bg" style="background-image:url(${asset(subject.themes.HOME_MAP || 'bg/home.jpg', subject.id)});animation-duration:40s"></div>
      <div class="cloudshade" style="top:10%"></div><div class="cloudshade" style="top:55%;animation-delay:-14s;animation-duration:42s"></div>
      ${nums.map(n => { const [x, y] = ISL[n - 1]; const prog = islandDone(n), done = prog.cleared;
        return `<div class="island zone ${done ? 'done' : 'unfinished'}" data-n="${n}" style="position:absolute;left:${x}%;top:${y}%;width:${zones[n - 1].radius * 2}%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center">
          ${done ? FLAG : ''}
          ${n === best ? `<div class="arrow" style="position:absolute;left:50%;${y < 30 ? 'bottom:-48px' : 'top:-48px'};translate:-50% 0;pointer-events:none">👆</div>` : ''}
          <div style="position:absolute;left:50%;bottom:-14%;translate:-50% 0;width:72px;height:72px;border-radius:50%;background:conic-gradient(${done ? '#FFC93C' : '#FF8FB1'} ${Math.round(prog.done / Math.max(1, prog.total) * 360)}deg,rgba(255,255,255,.75) 0);box-shadow:0 4px 10px rgba(0,0,0,.2);display:flex;align-items:center;justify-content:center"><div style="width:56px;height:56px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:800;color:#FF6FA5">${n}</div></div></div>`; }).join('')}
    </div>
    <div class="home-char" style="position:absolute;left:47%;bottom:1%;width:min(15vw,22vh);z-index:5">${myChar()}</div>
    <div style="position:absolute;right:16px;bottom:16px;display:flex;gap:14px;z-index:6">
      <button class="btn-pic bag-btn" aria-label="장식">${BAG_ICON}</button>
      <button class="btn-pic room-btn" aria-label="내 방">${ROOM_ICON}${snackBadge(state.room.snacks)}</button>
    </div>
    <button class="btn-pic entrance-btn" style="position:absolute;top:14px;left:14px;z-index:6" aria-label="입구">${ENTRANCE_ICON}</button>`;
    mountStarJar({ app, state, save, redraw: renderHome });
    const map = app.querySelector('.hmap');
    mapAtmosphere(app, map, zones, asset(subject.themes.HOME_MAP || 'bg/home.jpg', subject.id));
    for (let i = 0; i < 18; i++) map.insertAdjacentHTML('beforeend', `<div class="glint" style="left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${-Math.random() * 2.4}s"></div>`);
    const ch = app.querySelector('.home-char');
    const bounce = cls => { ch.classList.remove('boing', 'hug', 'wiggle'); void ch.offsetWidth; ch.classList.add(cls); };
    attachPetting(ch, {
      onTap: () => { bounce('boing'); playSfx('giggle'); },
      onRub: p => { burst(p.x, p.y, 'hearts'); playSfx('sparkle'); },
      onHold: () => { bounce('hug'); playSfx('giggle'); speak(LINES.love); },
    });
    const choose = n => {
      if (picked || document.querySelector('.overlay')) return;
      if (!AVAILABLE_ISLANDS.includes(n)) { bounce('wiggle'); speak(LINES.soon); return; }
      picked = true;
      app.style.pointerEvents = 'none';
      map.querySelector(`[data-n="${n}"]`).classList.add('picked');
      playSfx('whoosh'); ch.classList.add('walking');
      setTimeout(() => { location.href = `island${n}.html`; }, 350);
    };
    map.querySelectorAll('.island').forEach(g => onTap(g, e => { e.stopPropagation(); choose(Number(g.dataset.n)); }));
    onTap(map, e => {
      const r = map.getBoundingClientRect();
      const i = nearestZone(zones, (e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100, r.width / r.height);
      if (i >= 0) choose(i + 1);
    }, { multi: true, ignore: e => !!e.target.closest('.island') });
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) map.querySelector('.arrow')?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-12px)' }, { transform: 'translateY(0)' }], { duration: 900, iterations: Infinity });
    onTap(app.querySelector('.bag-btn'), () => { if (!picked) openBag(); });
    onTap(app.querySelector('.room-btn'), () => { if (!picked) openRoom(); });
    onTap(app.querySelector('.entrance-btn'), () => { if (!picked) location.href = '../index.html'; });
  }

  function overlay(inner, bg = 'rgba(255,245,250,.96)') {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.style.cssText = `background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px`;
    ov.innerHTML = `<button class="btn-pic ov-close" style="position:absolute;top:16px;left:16px;background:none;box-shadow:none">${CLOSE_ICON}</button>${inner}`;
    onTap(ov.querySelector('.ov-close'), () => { ov.remove(); renderHome(); });
    document.body.appendChild(ov);
    return ov;
  }

  function openBag() {
    playSfx('pop');
    const owned = H().decorations;
    const items = owned.length ? owned.map(id => `<button class="btn-pic deco-btn" data-id="${String(id).replace(/[^a-z-]/g, '')}" style="width:150px;height:170px;${H().wearing === id ? 'outline:4px solid #FFD84D' : ''}"><div style="width:130px">${charHtml(H().characterId, H().stage, { decoration: id })}</div></button>`).join('')
      : `<div style="width:220px;opacity:.6">${myChar()}</div>`;
    const ov = overlay(`<div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;max-width:90vw">${items}</div>`);
    if (!owned.length) speak(LINES.bagEmpty);
    ov.querySelectorAll('.deco-btn').forEach(b => onTap(b, e => {
      const b = e.target.closest('.deco-btn'); if (!b) return;
      H().wearing = H().wearing === b.dataset.id ? null : b.dataset.id;
      save(); playSfx('sparkle');
      ov.querySelectorAll('.deco-btn').forEach(x => { x.style.outline = H().wearing === x.dataset.id ? '4px solid #FFD84D' : 'none'; });
    }));
  }

  function openRoom() {
    openMyRoom({ state, subject, save, close: () => { playMusic(HOME_MUSIC); renderHome(); } });
  }

  // the gift box on screen, if any: only one at a time, and stop() takes it away without hatching
  let hatching = null;
  function birth() {
    if (!hatching) { const h = {}; h.done = hatch(h).finally(() => { hatching = null; }); hatching = h; }
    return hatching.done;
  }

  async function hatch(h) {
    const ov = document.createElement('div');
    ov.className = 'overlay';
    ov.style.cssText = 'background:radial-gradient(circle,#FFF8D6,#FFE3F0);display:flex;align-items:center;justify-content:center';
    ov.innerHTML = `<div class="gift" style="width:min(36vw,44vh);cursor:pointer"><img src="${asset('pic/giftbox.webp', subject.id)}" alt="" style="width:100%;display:block;pointer-events:none"></div>`;
    document.body.appendChild(ov);
    speak(LINES.giftBox);
    const gift = ov.querySelector('.gift');
    let taps = 0;
    const opened = await new Promise(res => { h.stop = () => res(false); onTap(gift, () => {
      taps += 1; playSfx('pop');
      gift.classList.remove('wiggle'); void gift.offsetWidth; gift.classList.add('wiggle');
      if (taps >= 3) res(true);
    }, { gap: 0 }); });
    // a character came in meanwhile (an old backup code pasted in the parent panel): it stays, no new one hatches
    if (!opened || H().characterId) { ov.remove(); return; }
    const skip = [...state.usedCharacters, subject.friendChoice ? H().settings.excludeCharacter : null].filter(Boolean);
    const id = pickCharacter(skip);
    H().characterId = id; H().stage = 0;
    if (!state.usedCharacters.includes(id)) state.usedCharacters.push(id);
    save();
    gift.style.transition = 'transform .5s, opacity .5s'; gift.style.transform = 'scale(1.4)'; gift.style.opacity = '0';
    playSfx('sparkle');
    await wait(500);
    ov.innerHTML = `<div class="born" style="width:min(34vw,46vh)">${charHtml(id, 0)}</div>`;
    const r = ov.firstElementChild.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, 'stars'); playSfx('fanfare');
    await speak(LINES.hello);
    await wait(600);
    ov.remove();
  }

  const needsSetup = () => subject.parent.needsSetup(state);
  // the first-run setup (hangul: the child's name): the panel opens again until the subject has what it needs
  function setup() {
    return new Promise(res => {
      const open = () => openParentPanel(state, () => { save(); applySound(); if (needsSetup()) open(); else res(); }, { subject, firstRun: true });
      open();
    });
  }

  async function afterStart() {
    if (needsSetup()) await setup();
    if (!H().characterId) await birth();
    await mapReady;
    playMusic(HOME_MUSIC);
    renderHome();
    const roomRequested = new URLSearchParams(location.search).get('room') === '1';
    const m = /evolve=(\d)-(\d)/.exec(location.search);
    if (m) {
      const params = new URLSearchParams(location.search); params.delete('evolve');
      history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
      await playEvolution(document.body, H().characterId, Number(m[1]), Number(m[2]));
      renderHome();
    }
    if (roomRequested) {
      const params = new URLSearchParams(location.search); params.delete('room');
      history.replaceState(null, '', location.pathname + (params.size ? '?' + params : '') + location.hash);
      openRoom();
    }
  }

  // Coming from another page of this app (a door, an island's home button, "to my room"): the child already pressed
  // start, so the map opens at once and sound unlocks on the first touch, as on an island. A fresh load, a reload, the
  // first run, a birth, a growth scene and a waiting update keep the start button.
  function fromApp() {
    try {
      const nav = performance.getEntriesByType('navigation')[0];
      return (!nav || nav.type === 'navigate') && !!document.referrer && new URL(document.referrer).origin === location.origin;
    } catch { return false; }
  }

  function start() {
    if (fromApp() && H().characterId && !needsSetup() && !/[?&]evolve=/.test(location.search) && !window.__swUpdateReady) {
      addEventListener('pointerup', () => { unlockSpeech(); unlockAudio(); preloadSfx(); }, { capture: true, once: true });
      navigator.storage?.persist?.().catch(() => {});
      // a second tap of the button that brought the child here must not press what is now under the finger
      app.style.pointerEvents = 'none';
      setTimeout(() => { app.style.pointerEvents = ''; }, 400);
      afterStart();
      return;
    }
    app.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;background:url(${asset(subject.themes.HOME_MAP || 'bg/home.jpg', subject.id)}) center/cover">
    ${H().characterId ? `<div style="width:min(26vw,34vh)">${myChar()}</div>` : ''}
    <button class="start-btn" style="border:none;background:none;padding:0" aria-label="시작">${PLAY_ICON}</button></div>`;
    app.querySelector('.start-btn').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 1400, iterations: Infinity });
    onTap(app.querySelector('.start-btn'), () => {
      unlockSpeech(); unlockAudio(); preloadSfx(); playSfx('pop');
      navigator.storage?.persist?.().catch(() => {});
      if (window.__swUpdateReady) { location.reload(); return; }
      afterStart();
    }, { once: true });
  }

  installParentGate(() => openParentPanel(state, () => { save(); applySound(); if (!H().characterId) birth().then(renderHome); else { hatching?.stop(); renderHome(); } }, { subject }));
  window.__home = { state };
  start();
}
