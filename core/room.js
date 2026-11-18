import { asset } from './env.js';
import { onTap } from './tap.js';
import { attachPetting } from './pet.js';
import { charHtml } from './characters.js';
import { playSfx, burst, playMusic } from './fx.js';
import { speak } from './speech.js';
import { GOAL_LINES } from './goal-lines.js';
import { CLOSE_ICON } from './room-icons.js';
import { ITEM_WIDTH, nextRoomPosition, roomGuests, placeItem, removeItem, eatSnack, drawerItems } from './room-rules.js';

const snacks = ['apple', 'cookie', 'milk', 'carrot'];
const pic = path => `<img src="${asset(path)}" alt="" draggable="false">`;
const snackPic = n => pic(`room/snack/${snacks[n % 4]}.webp`);
export const snackBadge = n => n > 0 ? `<span class="room-badge">${snackPic(n - 1)}<b>${n}</b></span>` : '';
const bounce = (el, cls = 'boing') => { el.classList.remove('boing', 'hug'); void el.offsetWidth; el.classList.add(cls); };
const say = key => speak(GOAL_LINES[key]);

export function openMyRoom({ state, subject, save, close }) {
  if (document.querySelector('.overlay')) return;
  playSfx('pop'); playMusic('music/calm.mp3');
  const ov = document.createElement('div'); ov.className = 'overlay my-room';
  ov.innerHTML = `<div class="room-scene" style="background-image:url(${asset('room/bg.jpg')})"><div class="room-items"></div></div><button class="btn-pic ov-close" aria-label="닫기">${CLOSE_ICON}</button><div class="room-drawer"><button class="btn-pic drawer-prev" aria-label="앞 물건"><svg viewBox="0 0 60 60"><path d="M38 12 L18 30 L38 48" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg></button><div class="drawer-items"></div><button class="btn-pic drawer-next" aria-label="다음 물건"><svg viewBox="0 0 60 60"><path d="M22 12 L42 30 L22 48" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg></button><button class="room-plate" aria-label="간식"></button></div>`;
  document.body.appendChild(ov);
  const scene = ov.querySelector('.room-scene'), items = ov.querySelector('.room-items'), plate = ov.querySelector('.room-plate');
  const disposers = []; let page = 0, active = null, frame = 0, eating = false;
  const main = state.subjects[subject.id];
  const guests = roomGuests(state, subject.id);
  const spots = [[28, 60], [72, 60], [20, 72], [80, 72], [38, 60], [62, 60]];
  function character(s, x, y, own) {
    const el = document.createElement('div'); el.className = `room-friend${own ? ' room-main' : ''}`;
    el.dataset.x = x; el.dataset.y = y;
    el.style.cssText = `left:${x}%;top:${y}%;width:${own ? 16 : 9}%;z-index:${Math.round(y * 10)}`;
    el.innerHTML = charHtml(s.characterId, s.stage, { decoration: own ? s.wearing : null }); scene.appendChild(el);
    disposers.push(attachPetting(el, {
      onTap: () => { bounce(el); playSfx('giggle'); },
      onRub: p => { burst(p.x, p.y, 'hearts'); playSfx('sparkle'); },
      onHold: () => { bounce(el, 'hug'); playSfx('giggle'); speak(subject.lines.love); },
    }));
    return el;
  }
  guests.forEach((s, i) => character(s, ...spots[i], false));
  const hero = character(main, 50, 72, true);
  // Clamp complete rectangles; displaying a saved placement never writes it back.
  function position(x, y, width, height = width) {
    const r = scene.getBoundingClientRect(), bottom = ov.querySelector('.room-drawer').getBoundingClientRect().top;
    return { x: (Math.max(Math.max(0, r.left) + width / 2, Math.min(Math.min(innerWidth, r.right) - width / 2, x)) - r.left) / r.width * 100,
      y: (Math.max(Math.max(0, r.top) + height / 2, Math.min(bottom - height / 2, y)) - r.top) / r.height * 100 };
  }
  function fitCharacters() {
    const r = scene.getBoundingClientRect();
    scene.querySelectorAll('.room-friend').forEach(el => {
      const p = position(r.left + r.width * el.dataset.x / 100, r.top + r.height * el.dataset.y / 100, Math.max(el.getBoundingClientRect().width, el.querySelector('.charimg')?.getBoundingClientRect().width || 0), el.getBoundingClientRect().height);
      el.style.left = p.x + '%'; el.style.top = p.y + '%';
    });
  }
  scene.querySelectorAll('.room-friend img').forEach(img => img.addEventListener('load', fitCharacters, { once: true }));
  fitCharacters();
  const itemSize = id => scene.getBoundingClientRect().width * (ITEM_WIDTH[id] || 12) / 100;
  const persist = room => { state.room = room; save(); };
  function drawItems() {
    items.replaceChildren();
    for (const p of state.room.placed) {
      if (!state.room.owned.includes(p.id) || !/^(rug|bed|lamp|bookshelf|plant|toybox|ball|teddy|table|chair|clock|musicbox|q[1-8]-[1-3])$/.test(p.id)) continue;
      const el = document.createElement('div'); el.className = 'room-item'; el.dataset.id = p.id;
      const r = scene.getBoundingClientRect(), pos = position(r.left + p.x / 100 * r.width, r.top + p.y / 100 * r.height, itemSize(p.id));
      el.style.cssText = `left:${pos.x}%;top:${pos.y}%;width:${ITEM_WIDTH[p.id] || 12}%;z-index:${p.id === 'rug' ? 1 : Math.round(pos.y * 10)}`;
      el.innerHTML = pic(`room/item/${p.id}.webp`); items.appendChild(el);
      drag(el, p.id);
      onTap(el, () => { bounce(el); playSfx('pop'); }, { slop: 10 });
    }
  }
  function drawDrawer() {
    const list = drawerItems(state.room), row = ov.querySelector('.drawer-items');
    const count = Math.max(1, Math.floor((row.clientWidth + 8) / 96));
    page = Math.min(page, Math.max(0, Math.ceil(list.length / count) - 1));
    row.innerHTML = list.slice(page * count, (page + 1) * count).map(p => `<button class="drawer-item${p.owned ? '' : ' locked'}" data-id="${p.id}" aria-label="${p.owned ? '물건 놓기' : '다음 선물'}">${pic(`room/item/${p.id}.webp`)}</button>`).join('');
    row.querySelectorAll('button').forEach(el => onTap(el, () => {
      if (active) return;
      if (el.classList.contains('locked')) { bounce(el); return; }
      const r = scene.getBoundingClientRect();
      const size = itemSize(el.dataset.id);
      const lo = position(r.left, r.top + r.height * .58, size), hi = position(r.right, r.bottom, size);
      const placed = state.room.placed.map(p => position(r.left + p.x / 100 * r.width, r.top + p.y / 100 * r.height, itemSize(p.id)));
      const p = nextRoomPosition(placed, { left: lo.x, right: hi.x, top: lo.y, bottom: hi.y });
      persist(placeItem(state.room, el.dataset.id, p.x, p.y)); playSfx('pop'); drawItems(); drawDrawer();
    }));
  }
  function drawPlate() {
    plate.innerHTML = `${Array.from({ length: Math.min(3, state.room.snacks) }, (_, i) => `<span class="plate-snack" style="left:${10 + i * 18}px">${snackPic(state.room.snacks - 1 - i)}</span>`).join('')}<b>${state.room.snacks || ''}</b>${state.room.snacks ? '' : '<svg class="snack-hint" viewBox="0 0 100 60"><path d="M5 18 L25 8 L45 18 V52 L25 42 L5 52Z" fill="#a9dfce" stroke="#504233" stroke-width="3"/><path d="M55 30 H90 M77 17 L90 30 L77 43" fill="none" stroke="#e78ba2" stroke-width="6"/></svg>'}`;
  }
  function feed() {
    if (eating || active) return;
    if (!state.room.snacks) { say('snack.none'); bounce(plate); return; }
    eating = true;
    const food = document.createElement('div'); food.className = 'room-food'; food.innerHTML = snackPic(state.room.snacks - 1);
    const a = plate.getBoundingClientRect(), b = hero.getBoundingClientRect();
    food.style.left = `${a.x + a.width / 2 - 28}px`; food.style.top = `${a.y + a.height / 2 - 28}px`; ov.appendChild(food);
    persist(eatSnack(state.room)); drawPlate();
    const animation = food.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${b.x + b.width / 2 - a.x - a.width / 2}px,${b.y + b.height * .4 - a.y - a.height / 2}px) scale(.5)` }], { duration: 550, fill: 'forwards' });
    animation.finished.then(() => { food.remove(); eating = false; if (!ov.isConnected) return; bounce(hero); burst(b.x + b.width / 2, b.y + b.height * .4, 'hearts'); playSfx('giggle'); say('snack.eat'); }).catch(() => {});
  }
  function drag(el, id) {
    el.addEventListener('pointerdown', e => {
      if (active || !e.isPrimary) return;
      const r = el.getBoundingClientRect();
      active = { pid: e.pointerId, el, id, startX: e.clientX, startY: e.clientY, x: e.clientX, y: e.clientY, dx: r.x + r.width / 2 - e.clientX, dy: r.y + r.height / 2 - e.clientY, moved: false };
      el.setPointerCapture(e.pointerId);
    });
    el.addEventListener('pointermove', e => {
      if (active?.pid !== e.pointerId || active.el !== el) return;
      active.x = e.clientX; active.y = e.clientY;
      active.moved ||= Math.hypot(e.clientX - active.startX, e.clientY - active.startY) > 10;
      if (!frame) frame = requestAnimationFrame(() => {
        frame = 0; if (!active || !active.moved || !id) return;
        const p = position(active.x + active.dx, active.y + active.dy, itemSize(id));
        el.style.left = p.x + '%'; el.style.top = p.y + '%'; el.style.zIndex = id === 'rug' ? 1 : Math.round(p.y * 10); el.classList.add('dragging');
      });
    });
    const end = (e, cancel) => {
      if (active?.pid !== e.pointerId || active.el !== el) return;
      const a = active; active = null; cancelAnimationFrame(frame); frame = 0;
      if (id) {
        if (!cancel && a.moved) {
          const p = position(e.clientX + a.dx, e.clientY + a.dy, itemSize(id));
          persist(e.clientY >= ov.querySelector('.room-drawer').getBoundingClientRect().top ? removeItem(state.room, id) : placeItem(state.room, id, p.x, p.y));
        }
        if (cancel || a.moved) { drawItems(); drawDrawer(); }
      } else if (!cancel && a.moved) {
        const r = hero.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) feed();
      }
    };
    el.addEventListener('pointerup', e => end(e, false));
    el.addEventListener('pointercancel', e => end(e, true));
    el.addEventListener('lostpointercapture', e => end(e, true));
  }
  drag(plate, null); onTap(plate, feed, { slop: 10 });
  onTap(ov.querySelector('.drawer-prev'), () => { if (!active) { page = Math.max(0, page - 1); drawDrawer(); } });
  onTap(ov.querySelector('.drawer-next'), () => { if (!active) { page++; drawDrawer(); } });
  const resize = () => { active = null; fitCharacters(); drawItems(); drawDrawer(); };
  addEventListener('resize', resize);
  onTap(ov.querySelector('.ov-close'), () => {
    active = null; cancelAnimationFrame(frame); disposers.forEach(fn => fn()); removeEventListener('resize', resize); ov.remove(); close();
  });
  drawItems(); drawDrawer(); drawPlate();
  if (!state.room.owned.length) say('room.empty'); else if (state.room.snacks) say('snack.got');
}
