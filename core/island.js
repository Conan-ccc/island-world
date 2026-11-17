import { applyWorld, mapAtmosphere } from './world.js';
import { onTap } from './tap.js';
import { mapZones, nearestZone } from './map-zones.js';
// Island engine: theme map, mission bar (what is left), "go here next" markers, varied activities.
// One engine for every subject: what a subject does its own way comes from its config (subjects/<subject>/config.js):
//   parent.needsSetup(state)  the island waits for the first-run setup on the home (hangul: a name with Hangul)
//   greet                     said before the welcome on the first touch (english "Hello!"), or nothing
//   byeLine                   said before the home button leaves (english "Bye-bye!", number "안녕, 또 만나!"), or
//                             nothing: the home button leaves at once (hangul)
//   preloadLines              more lines to fetch ahead (english: its English praise and greetings)
//   unitLine(u, kind, settings)  what a mission bar button says;  unitBadge(u, kind)  what it shows;
//   unitFont(u)               its font size (34 when the subject has none)
//   recordIsland(item, n)     the island a success is recorded on (english, number: the unit's own island, with the
//                             time); without it a success is recorded on the island being played (hangul)
//   onIslandStart(n), content, themes, curriculum, lines, voice, runners
import { loadState, saveState, claimSubjects, newIsland } from './save.js';
import { adoptLegacy } from './legacy.js';
import { recordSuccess, markVisit, islandProgress, isMastered, MASTERY_COUNT, MASTERY_TYPES } from './mastery.js';
import { charHtml, DECORATIONS } from './characters.js';
import { speak, phrase, unlockSpeech, setSpeechVolume, stopSpeech, preloadSpeech, configureSpeech } from './speech.js';
import { playSfx, burst, unlockAudio, setVolume, setMusic, playMusic, preloadSfx } from './fx.js';
import { attachPetting } from './pet.js';
import { useFonts } from './env.js';
import { warmCache } from './register-sw.js';
import { el, wait, asset, ask, glow } from './activities/common.js';
import { balloonParty } from './party.js';
import * as catchPlay from './activities/catch.js';
import * as hop from './activities/hop.js';
import * as scratch from './activities/scratch.js';
import * as fruit from './activities/fruit.js';
import * as bridge from './activities/bridge.js';
import * as count from './activities/count.js';
import * as compare from './activities/compare.js';
import * as next from './activities/next.js';
import * as gift from './activities/gift.js';
import * as door from './activities/door.js';
import * as find from './activities/find.js';
import * as rise from './activities/rise.js';
import * as pairs from './activities/pairs.js';

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const ALL_RUNNERS = { fruit, bridge, count, compare, next, gift, door, find, rise, pairs, catch: catchPlay, hop, scratch };

const IDLE_MS = 9000; // nothing touched and nothing said for this long: say the question again
const FALLBACK_SPOTS = [[22, 25], [50, 15], [82, 32], [80, 72], [30, 70], [62, 60]];
const HOME_ICON = '<svg viewBox="0 0 60 60" width="48" height="48"><path d="M8 30 L30 10 L52 30 V52 H8Z" fill="#DCEBFF" stroke="#8EC5FF" stroke-width="3"/><rect x="24" y="36" width="12" height="16" fill="#8EC5FF"/></svg>';
const BACK_ICON = '<svg viewBox="0 0 60 60" width="52" height="52"><circle cx="30" cy="30" r="26" fill="#fff"/><path d="M34 18 L20 30 L34 42" stroke="#C98AA8" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW = '👆';
const CHECK = '<svg viewBox="0 0 40 40" width="64" height="64"><circle cx="20" cy="20" r="18" fill="#5DBB6A" stroke="#fff" stroke-width="3"/><path d="M11 21 L18 28 L30 13" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PLAY_BADGE = '<svg viewBox="0 0 64 64" width="64" height="64"><circle cx="32" cy="32" r="29" fill="#FF6FA5" stroke="#fff" stroke-width="4"/><path d="M25 18 L46 32 L25 46Z" fill="#fff"/></svg>';
const CROWN = '<svg viewBox="0 0 40 30" width="30" height="22"><path d="M3 26 L6 8 L14 16 L20 4 L26 16 L34 8 L37 26Z" fill="#FFC93C" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/></svg>';

// 0..1 progress of one letter: successes count, but a second kind of play is needed to finish
export function unitScore(island, key) {
  const m = island.mastery[key];
  if (!m) return 0;
  if (isMastered(island, key)) return 1;
  const c = Math.min(m.count, MASTERY_COUNT) / MASTERY_COUNT;
  return Math.min(0.9, c * (m.types.length >= MASTERY_TYPES ? 1 : 0.75));
}

// How many unfinished letters a place can still help with (0 = nothing left there)
export function placeNeed(island, units, creditableUnits, type) {
  let need = 0;
  for (const u of units) {
    if (isMastered(island, u) || !creditableUnits.includes(u)) continue;
    const m = island.mastery[u] || { count: 0, types: [] };
    if (!m.types.includes(type)) need += 2; else if (m.count < MASTERY_COUNT) need += 1;
  }
  return need;
}

export async function startIsland(subject, n) {
  useFonts(subject);
  applyWorld(subject);
  document.body.dataset.subject = subject.id;
  // the offline copy: this subject's pictures and sounds first
  warmCache(['assets/' + subject.id + '/']);
  const LINES = subject.lines;
  const { ISLANDS } = subject.curriculum;
  const { themeOf, MECH_TYPE, mechAt } = subject.themes;
  // this subject's plays (its config's runners)
  const RUNNERS = Object.fromEntries(subject.runners.map(k => [k, ALL_RUNNERS[k]]));
  configureSpeech({ ...subject.voice, subject: subject.id });
  const state = loadState(undefined, { own: subject.id });
  const got = adoptLegacy(state);
  if (got.length) { claimSubjects(state, got); saveState(state); }
  // back from the back/forward cache: read the save again rather than go on with an old copy
  addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  const H = state.subjects[subject.id];
  if (!H.characterId || subject.parent.needsSetup(state)) { location.href = 'sea.html'; return; }
  const key = String(n);
  if (!H.islands[key]) H.islands[key] = newIsland();
  const island = H.islands[key];
  if (!H.today || H.today.day !== today()) H.today = { day: today(), places: [] };
  saveState(state);
  setVolume(state.settings.volume); setSpeechVolume(state.settings.volume); setMusic(state.settings.music !== false);
  const theme = themeOf(n);
  const app = document.getElementById('app');
  let spots = {};
  // never wait long for positions (weak network): fall back after 2.5 s
  try { spots = await Promise.race([fetch(asset(theme.spots)).then(r => r.json()), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 2500))]); } catch { /* fallback below */ }
  theme.places.forEach((p, i) => { if (!spots[p.id]) spots[p.id] = FALLBACK_SPOTS[i % FALLBACK_SPOTS.length]; });
  if (!spots.start) spots.start = [52, 48];
  const content = { profile: state.profile, settings: H.settings, rng: Math.random, islands: H.islands };
  const units = subject.content.islandUnits(n, content);
  const kind = ISLANDS[n].kind;
  const lineOf = u => subject.unitLine(u, kind, H.settings);
  subject.onIslandStart(n);
  const mechs = subject.content.buildMechs(n, island, content);
  if (!island.plays) island.plays = {};
  // the play a place runs on this visit: places with two plays take turns
  const mechOf = p => mechAt(p, island.plays[p.id]);
  let unlocked = false;
  preloadSfx();
  preloadSpeech([...Object.values(LINES), ...(subject.preloadLines || []), ...units.map(lineOf)]);

  const ensureUnlocked = () => {
    if (unlocked) return;
    unlocked = true; unlockSpeech(); unlockAudio(); playMusic(theme.music);
    const welcome = island.cleared ? LINES.allDone : LINES.welcome;
    speak(subject.greet ? [subject.greet, welcome] : welcome);
  };

  const needOf = p => placeNeed(island, units, subject.content.creditable(n, mechOf(p), content), MECH_TYPE[mechOf(p)]);

  function missionBar() {
    const done = units.filter(u => isMastered(island, u)).length;
    return `<div class="mission" style="position:absolute;top:12px;left:50%;translate:-50% 0;z-index:7;display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.88);padding:8px 16px;border-radius:26px;box-shadow:0 8px 18px rgba(60,40,80,.18);max-width:80vw;flex-wrap:wrap;justify-content:center">
      ${units.map(u => {
        const s = unitScore(island, u), full = s >= 1;
        return `<button class="unit" data-u="${u.replace(/"/g, '')}" style="position:relative;border:none;min-width:58px;height:58px;padding:0 8px;border-radius:29px;font-size:${subject.unitFont ? subject.unitFont(u) : 34}px;font-weight:800;color:${full ? '#7A4A00' : '#4A3A48'};background:${full ? 'radial-gradient(circle at 35% 30%,#FFF6C2,#FFC93C)' : `conic-gradient(#FF8FB1 ${Math.round(s * 360)}deg,#EEE6F2 0)`};box-shadow:inset 0 0 0 5px #fff">${full ? `<span style="position:absolute;top:-14px;left:50%;translate:-50% 0">${CROWN}</span>` : ''}<span style="position:relative">${subject.unitBadge(u, kind)}</span></button>`;
      }).join('')}
      <span style="font-size:15px;color:#8a7a88;white-space:nowrap">${done} / ${units.length}</span>
    </div>`;
  }

  function renderMap() {
    const zones = mapZones(theme.places.map(p => spots[p.id]));
    let travel = 0, destination = null, opened = false;
    const needs = Object.fromEntries(theme.places.map(p => [p.id, needOf(p)]));
    const notToday = theme.places.filter(p => !H.today.places.includes(p.id));
    const best = [...theme.places].sort((a, b) => (needs[b.id] - needs[a.id]) || ((notToday.includes(b) ? 1 : 0) - (notToday.includes(a) ? 1 : 0)))[0];
    const showBest = best && needs[best.id] > 0;
    app.innerHTML = `<div class="imap" style="position:absolute;left:50%;top:50%;width:max(100vw,160vh);height:max(62.5vw,100vh);translate:-50% -50%;overflow:hidden">
        <div class="scene-bg" style="background-image:url(${asset(theme.map)});animation-duration:40s"></div>
        <div class="cloudshade" style="top:6%"></div><div class="cloudshade" style="top:50%;animation-delay:-15s;animation-duration:40s"></div>
        ${theme.places.map((p, i) => {
          const [x, y] = spots[p.id];
          const need = needs[p.id];
          return `<div class="place zone ${need > 0 ? 'unfinished' : 'done'}" data-id="${p.id}" style="position:absolute;left:${x}%;top:${y}%;width:${zones[i].radius * 2}%;aspect-ratio:1;translate:-50% -50%;border-radius:50%;cursor:pointer">

            <div style="position:absolute;right:4%;top:2%;pointer-events:none" class="place-badge">${need > 0 ? PLAY_BADGE : CHECK}</div>
            ${showBest && p.id === best.id ? (y < 30
              ? `<div class="arrow" style="position:absolute;left:50%;bottom:-48px;translate:-50% 0;pointer-events:none"><div style="rotate:0deg">${ARROW}</div></div>`
              : `<div class="arrow" style="position:absolute;left:50%;top:-48px;translate:-50% 0;pointer-events:none">${ARROW}</div>`) : ''}</div>`;
        }).join('')}
        <div class="walker" style="position:absolute;width:9%;left:${spots.start[0]}%;top:${spots.start[1]}%;translate:-50% -88%;z-index:5">${charHtml(H.characterId, H.stage, { decoration: H.wearing })}</div>
      </div>
      ${missionBar()}
      ${island.cleared ? `<div style="position:absolute;bottom:16px;left:50%;translate:-50% 0;z-index:7;background:rgba(255,246,194,.95);border-radius:24px;padding:8px 18px;font-size:20px;font-weight:700;color:#7A4A00;display:flex;align-items:center;gap:8px">${CROWN} 다 했어요!</div>` : ''}
      <button class="btn-pic home-btn" style="position:absolute;top:14px;left:14px;z-index:8" aria-label="집">${HOME_ICON}</button>`;
    const map = app.querySelector('.imap'), walker = app.querySelector('.walker');
    mapAtmosphere(app, map, zones, asset(theme.map));
    for (let i = 0; i < 14; i++) map.appendChild(el('div', `left:${Math.random() * 100}%;top:${Math.random() < .5 ? Math.random() * 18 : 78 + Math.random() * 20}%;animation-delay:${-Math.random() * 2.4}s`, '', 'glint'));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) app.querySelector('.arrow')?.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-16px)' }, { transform: 'translateY(0)' }], { duration: 900, iterations: Infinity });
    attachPetting(walker, {
      onTap: () => { ensureUnlocked(); walker.classList.remove('boing'); void walker.offsetWidth; walker.classList.add('boing'); playSfx('giggle'); },
      onRub: p => { burst(p.x, p.y, 'hearts'); playSfx('sparkle'); },
      onHold: () => { walker.classList.add('hug'); playSfx('giggle'); speak(LINES.love); setTimeout(() => walker.classList.remove('hug'), 900); },
    });
    app.querySelectorAll('.unit').forEach(b => onTap(b, e => { e.stopPropagation(); ensureUnlocked(); speak(lineOf(b.dataset.u)); }));
    onTap(app.querySelector('.home-btn'), () => {
      if (!subject.byeLine) { location.href = 'sea.html'; return; }
      speak(subject.byeLine); setTimeout(() => { location.href = 'sea.html'; }, 700);
    });
    const go = async (e, id = null) => {
      if (opened || document.querySelector('.overlay.stage')) return;
      ensureUnlocked();
      const r = map.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width * 100, y = (e.clientY - r.top) / r.height * 100;
      const index = id === null ? nearestZone(zones, x, y, r.width / r.height) : theme.places.findIndex(p => p.id === id);
      const selected = index < 0 ? null : theme.places[index].id;
      if (selected && destination === selected) return;
      destination = selected;
      const token = ++travel;
      map.querySelectorAll('.place').forEach(p => p.classList.toggle('picked', p.dataset.id === selected));
      const tx = index < 0 ? x : zones[index].x, ty = index < 0 ? y : zones[index].y + 4;
      const wr = walker.getBoundingClientRect();
      const cx = (wr.left + wr.width / 2 - r.left) / r.width * 100;
      const cy = (wr.top + wr.height * .88 - r.top) / r.height * 100;
      walker.style.transition = 'none'; walker.style.left = cx + '%'; walker.style.top = cy + '%';
      void walker.offsetWidth;
      const ms = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : Math.min(500, Math.max(300, Math.hypot((tx - cx) * r.width / 100, (ty - cy) * r.height / 100) * 2.2));
      walker.style.transition = `left ${ms}ms linear, top ${ms}ms linear`;
      walker.style.left = tx + '%'; walker.style.top = ty + '%';
      walker.classList.add('walking'); playSfx('pop');
      await wait(ms);
      if (token !== travel || !map.isConnected) return;
      walker.classList.remove('walking');
      if (selected) { opened = true; openPlace(selected); }
    };
    map.querySelectorAll('.place').forEach(p => onTap(p, e => { e.stopPropagation(); go(e, p.dataset.id); }));
    onTap(map, e => { if (!walker.contains(e.target) && !e.target.closest('.place')) go(e); }, { gap: 0, multi: true, ignore: e => walker.contains(e.target) || !!e.target.closest('.place') });

  }

  function onSuccess(item, type) {
    // review questions from earlier islands count on the island the unit belongs to (subjects with recordIsland)
    if (subject.recordIsland) {
      const home = subject.recordIsland(item, n);
      if (home === null) return;
      const key = String(home);
      if (!H.islands[key]) H.islands[key] = newIsland();
      const rec = H.islands[key];
      const newly = recordSuccess(rec, item, type);
      rec.mastery[item].lastAt = Date.now();
      saveState(state);
      if (newly) playSfx('fanfare');
      return;
    }
    const newly = recordSuccess(island, item, type);
    saveState(state);
    if (newly) playSfx('fanfare');
  }

  async function giveReward() {
    if (H.lastRewardDay === today()) return;
    const left = DECORATIONS.filter(d => !H.decorations.includes(d.id));
    H.lastRewardDay = today();
    if (!left.length) { saveState(state); return; }
    const d = left[Math.floor(Math.random() * left.length)];
    H.decorations.push(d.id); H.wearing = d.id;
    saveState(state);
    const ov = el('div', 'background:radial-gradient(circle,#FFF8D6,#FFE3F0);display:flex;align-items:center;justify-content:center', `<div style="width:min(36vw,52vh)">${charHtml(H.characterId, H.stage, { decoration: d.id })}</div>`, 'overlay reward');
    document.body.appendChild(ov);
    const r = ov.firstElementChild.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 3, 'stars'); playSfx('fanfare');
    await speak(LINES.present);
    await wait(1200);
    ov.remove();
  }

  async function openPlace(id, forceMech) {
    const place = theme.places.find(p => p.id === id);
    const mech = place && (forceMech || mechOf(place));
    if (!place || !RUNNERS[mech]) return;
    markVisit(island, id, today());
    island.plays[id] = (island.plays[id] || 0) + 1;
    if (!H.today.places.includes(id)) H.today.places.push(id);
    saveState(state);
    const stage = el('div', 'background:#fff;overflow:hidden', '', 'overlay stage');
    document.body.appendChild(stage);
    const inner = el('div', 'position:absolute;inset:0');
    stage.appendChild(inner);
    const back = el('button', 'position:absolute;top:14px;left:14px;z-index:20;background:none;box-shadow:none', BACK_ICON, 'btn-pic back-btn');
    stage.appendChild(back);
    let closed = false;
    const closedP = new Promise(res => onTap(back, () => { closed = true; res('closed'); }));
    let talking = 0, lastAct = Date.now(), nudges = 0;
    const ctx = {
      subject, stage: inner, phrase, sfx: playSfx, burst, rng: Math.random, speakLines: LINES, skin: place.skin || {}, settings: H.settings,
      speak: t => {
        if (closed) return Promise.resolve(true);
        talking += 1;
        return speak(t).finally(() => { talking -= 1; lastAct = Date.now(); });
      },
      characterHtml: charHtml(H.characterId, H.stage, { decoration: H.wearing }), onSuccess,
    };
    // a child who is stuck or looking away hears the question again; the second time the answer lights up
    for (const ev of ['pointerdown', 'pointermove', 'pointerup']) stage.addEventListener(ev, () => { lastAct = Date.now(); if (ev === 'pointerdown') nudges = 0; }, true);
    const idle = setInterval(() => {
      if (closed || talking > 0 || !ctx.prompt || nudges >= 2 || Date.now() - lastAct < IDLE_MS) return;
      nudges += 1; lastAct = Date.now();
      ask(ctx, ctx.prompt, ctx.promptTarget);
      if (nudges >= 2 && ctx.promptTarget?.isConnected) glow(ctx.promptTarget);
    }, 1000);
    const outcome = await Promise.race([RUNNERS[mech].run(ctx, mechs[mech]()).then(() => 'done').catch(err => { console.error(err); return 'error'; }), closedP]);
    clearInterval(idle);
    closed = true;
    stopSpeech();
    stage.remove();
    if (outcome === 'done') {
      speak(LINES.party);
      await balloonParty({ sfx: playSfx, burst, characterHtml: ctx.characterHtml });
      stopSpeech();
      await giveReward();
    }
    const pr = islandProgress(island, units, []);
    if (pr.cleared && !island.cleared) return clearIsland();
    renderMap();
  }

  async function clearIsland() {
    const from = H.stage, to = Math.min(H.stage + 1, 7);
    island.cleared = true; H.stage = to;
    if (n === 8 && !state.friends.some(f => f.characterId === H.characterId && f.subject === subject.id)) state.friends.push({ characterId: H.characterId, subject: subject.id, finishedAt: today() });
    saveState(state);
    playSfx('fanfare');
    await speak(LINES.cleared);
    location.href = `sea.html?evolve=${from}-${to}`;
  }

  window.__island = { state, island, openPlace, units, theme, title: ISLANDS[n].title, mechOf: id => mechOf(theme.places.find(p => p.id === id)) };
  renderMap();
}
