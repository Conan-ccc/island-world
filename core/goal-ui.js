import { ROOM_ICON, PLAY_ICON } from './room-icons.js';
import { asset } from './env.js';
import { onTap } from './tap.js';
import { speak, unlockSpeech } from './speech.js';
import { playSfx, burst, unlockAudio } from './fx.js';
import { countStars } from './stars.js';
import { questFor, questState, nextGift, pendingGifts, openStarGift, openQuestGift } from './goal.js';
import { GOAL_LINES } from './goal-lines.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const picture = (path, cls = '') => `<img class="${cls}" src="${asset(path)}" alt="" draggable="false">`;
const bounce = el => { el.classList.remove('boing'); void el.offsetWidth; el.classList.add('boing'); };
const say = key => speak(GOAL_LINES[key]);
const box = () => picture('pic/giftbox.webp');

// One overlay owns every touch until its explicit continue button is released.
export function openGoalGift({ item, friend, claim, save, redraw }) {
  if (document.querySelector('.overlay')) return;
  unlockSpeech(); unlockAudio();
  const ov = document.createElement('div');
  ov.className = 'overlay goal-gift';
  ov.innerHTML = `${friend ? picture(friend, 'goal-giver') : ''}<button class="goal-box" aria-label="선물 열기">${box()}</button>`;
  document.body.appendChild(ov);
  say(friend ? 'quest.done' : 'gift.open');
  let taps = 0;
  onTap(ov.querySelector('.goal-box'), e => {
    e.stopPropagation();
    if (taps >= 3) return;
    taps++; playSfx('pop');
    const b = ov.querySelector('.goal-box');
    b.classList.remove('wiggle'); void b.offsetWidth; b.classList.add('wiggle');
    if (taps < 3) return;
    claim(); save();
    ov.innerHTML = `${picture(`room/item/${item}.webp`, 'goal-prize')}<div class="goal-actions"><button class="goal-home btn-pic" aria-label="내 방으로">${ROOM_ICON}</button><button class="goal-continue btn-pic" aria-label="계속 놀기">${PLAY_ICON}</button></div>`;
    const r = ov.querySelector('.goal-prize').getBoundingClientRect();
    burst(r.x + r.width / 2, r.y + r.height / 2, 'stars'); playSfx('sparkle'); say('gift.room');
    onTap(ov.querySelector('.goal-home'), () => { location.href = 'sea.html?room=1'; });
    onTap(ov.querySelector('.goal-continue'), () => { ov.remove(); redraw(); });
  }, { gap: 0 });
}

export function mountStarJar({ app, state, save, redraw, before, unlock = () => false }) {
  const stars = countStars(state), next = nextGift(state), pending = pendingGifts(state);
  const wrap = document.createElement('div');
  wrap.className = 'goal-stars';
  wrap.innerHTML = `<button class="goal-jar" aria-label="별 통">${picture('quest/jar.webp')}<span>${stars}</span></button>${next ? `<div class="goal-next">${picture(`room/item/${next.item}.webp`)}<div class="goal-meter"><div style="width:${next.progress * 100}%"></div></div></div>` : ''}${pending ? `<button class="goal-star-gift goal-bouncing" aria-label="별 선물">${box()}${pending > 1 ? `<span>${pending}</span>` : ''}</button>` : ''}`;
  app.appendChild(wrap);
  const mission = app.querySelector('.mission')?.getBoundingClientRect(), r = wrap.getBoundingClientRect();
  if (mission && r.left < mission.right + 12 && r.bottom > mission.top) wrap.style.top = `${mission.bottom + 12}px`;
  onTap(wrap.querySelector('.goal-jar'), e => { e.stopPropagation(); unlock(); bounce(e.currentTarget); playSfx('sparkle'); });
  if (pending) onTap(wrap.querySelector('.goal-star-gift'), () => openGoalGift({
    item: next.item, claim: () => { state.room = openStarGift(state); }, save, redraw,
  }));
  if (typeof before === 'number' && before < stars && !reduced()) {
    const label = wrap.querySelector('.goal-jar span'), bar = wrap.querySelector('.goal-meter > div');
    const start = performance.now();
    const tick = now => {
      if (!wrap.isConnected) return;
      const t = Math.min(1, (now - start) / 700), value = Math.round(before + (stars - before) * t);
      label.textContent = value;
      if (bar) bar.style.width = `${Math.max(0, Math.min(1, (value - next.previous) / (next.next - next.previous))) * 100}%`;
      if (t < 1) requestAnimationFrame(tick);
    };
    tick(start);
  }
}

// Compare corners against the projected zone circles, including the map's cover crop.
export function questCorner(zones, rect, width, height, viewportWidth, viewportHeight) {
  const score = left => zones.reduce((sum, z) => {
    const x = rect.left + z.x / 100 * rect.width, y = rect.top + z.y / 100 * rect.height;
    const dx = Math.max(left - x, 0, x - left - width);
    const top = viewportHeight - height - 12, dy = Math.max(top - y, 0, y - top - height);
    return sum + Math.max(0, z.radius / 100 * rect.width - Math.hypot(dx, dy));
  }, 0);
  return score(12) <= score(viewportWidth - width - 12) ? 'left' : 'right';
}

export function mountQuest({ app, state, subject, n, zones, places, save, redraw, found, unlock = () => false }) {
  const spec = questFor(n, subject), sub = state.subjects[subject], q = questState(sub.quests[n]);
  const wrap = document.createElement('div');
  wrap.className = 'goal-quest';
  wrap.innerHTML = `<button class="goal-request" aria-label="친구 부탁">${picture(spec.friend, 'goal-friend')}<span class="goal-thought">${picture(spec.piece)}</span><span class="goal-slots">${Array.from({ length: 6 }, (_, i) => `<span class="goal-slot${i < q.found.length ? ' filled' : ''}">${i < q.found.length ? picture(spec.piece) : ''}</span>`).join('')}</span>${q.gift ? '<span class="goal-check">✓</span>' : ''}</button>${q.done && !q.gift ? `<button class="goal-quest-gift goal-bouncing" aria-label="친구 선물">${box()}</button>` : ''}`;
  app.appendChild(wrap);
  const map = app.querySelector('.imap'), size = wrap.getBoundingClientRect();
  wrap.style[questCorner(zones, map.getBoundingClientRect(), size.width, size.height, innerWidth, innerHeight)] = '12px';
  const completed = [...app.children].find(node => node.textContent.includes('다 했어요!'));
  if (completed) {
    const a = wrap.getBoundingClientRect(), b = completed.getBoundingClientRect();
    if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) wrap.style.bottom = `${innerHeight - b.top + 12}px`;
  }
  onTap(wrap.querySelector('.goal-request'), () => { const greeted = unlock(); bounce(wrap.querySelector('.goal-friend')); if (!greeted && !q.done) say('quest.ask'); });
  const open = () => openGoalGift({ item: spec.item, friend: spec.friend, save, redraw, claim: () => {
    const result = openQuestGift(state.room, sub.quests[n], spec.item);
    state.room = result.room; sub.quests[n] = result.quest;
  } });
  if (q.done && !q.gift) onTap(wrap.querySelector('.goal-quest-gift'), open);
  for (const place of places) {
    if (q.found.includes(place.id)) continue;
    const badge = [...map.querySelectorAll('.place')].find(p => p.dataset.id === place.id)?.querySelector('.place-badge');
    badge?.insertAdjacentHTML('beforeend', picture(spec.piece, 'goal-piece'));
  }
  if (found) {
    const source = [...map.querySelectorAll('.place')].find(p => p.dataset.id === found);
    const target = wrap.querySelectorAll('.goal-slot')[Math.min(5, q.found.length - 1)];
    const finish = () => { if (!wrap.isConnected) return; say('quest.found').then(() => { if (wrap.isConnected && q.done && !q.gift) open(); }); playSfx('sparkle'); };
    if (!source || !target || reduced()) { finish(); return; }
    const a = source.getBoundingClientRect(), b = target.getBoundingClientRect();
    const fly = document.createElement('div'); fly.className = 'goal-flying'; fly.innerHTML = picture(spec.piece);
    fly.style.left = `${a.x + a.width / 2 - 20}px`; fly.style.top = `${a.y + a.height / 2 - 20}px`;
    document.body.appendChild(fly); target.style.visibility = 'hidden';
    const animation = fly.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${b.x - a.x - a.width / 2 + 20}px,${b.y - a.y - a.height / 2 + 20}px)` }], { duration: 650, easing: 'ease-in-out' });
    animation.finished.then(() => { fly.remove(); target.style.visibility = ''; finish(); });
  }
}
