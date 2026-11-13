import { loadState, saveState } from '../../core/save.js';
import { countStars } from '../../core/stars.js';
import { warmCache } from '../../core/register-sw.js';
import { siteUrl } from '../../core/env.js';
import { unlockAudio, playMusic, stopMusic, playSfx, setVolume, setMusic } from '../../core/fx.js';
import { speak, unlockSpeech, setSpeechVolume, stopSpeech } from '../../core/speech.js';
import { HEROES, fit } from '../heroes.js';
import { GAME_STARS, syncArcade, gameOpen, canWelcome, welcome, nextHero, stageOpen, helpCard } from '../unlock.js';
import { pool, tierOf } from '../content.js';
import { heroIcon, setPal, ART } from '../art.js';
import { GAMES } from '../games/index.js';
import { recordResult } from './session.js';
import { startPlay } from './play.js';

export function startArcade(root = document.getElementById('arcade')) {
  const state = loadState(undefined, { own: 'arcade' });
  warmCache(['assets/arcade/']);
  let play = null, lastSession = null;
  const failures = new Map();
  const hero = id => HEROES.find(h => h.id === id) ?? HEROES[0];
  const save = () => { saveState(state); return state.arcade; };
  if (syncArcade(state)) save();
  setPal(state); setVolume(state.settings.volume); setSpeechVolume(state.settings.volume); setMusic(state.settings.music);
  function sound() { unlockAudio(); unlockSpeech(); playMusic(); }
  root.addEventListener('click', sound, { once: true });
  function stop() { play?.stop(); play = null; }
  function page(title, back) {
    stop(); root.replaceChildren(); root.style.backgroundImage = '';
    const header = document.createElement('header'); header.className = 'arc-header';
    button(header, '돌아가기', back, 'arc-back');
    const h = document.createElement('h1'); h.textContent = title; header.append(h);
    const jar = button(header, `★ ${countStars(state)}`, () => {
      const next = nextHero(state); speak(next ? `별 ${next.need}개 더 모으면 새 친구가 와!` : '친구들이 모두 왔어!');
    }, 'star-jar'); jar.setAttribute('aria-label', `별 ${countStars(state)}개`);
    root.append(header); return root;
  }
  function button(parent, label, fn, cls = '') {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.className = cls; b.onclick = fn; parent.append(b); return b;
  }
  function section(parent, cls) { const el = document.createElement('div'); el.className = cls; parent.append(el); return el; }
  function entrance() { location.href = siteUrl('index.html'); }
  function home() {
    if (syncArcade(state)) save();
    page('놀이동산', entrance);
    if (ART.home) root.style.backgroundImage = `url("${siteUrl(ART.home)}")`;
    const next = nextHero(state);
    if (next) {
      const box = section(root, 'arc-next'); box.textContent = `${hero(next.hero).name}까지 별 ${next.need}개`;
      const picture = document.createElement('span'); picture.innerHTML = heroIcon(next.hero); picture.style.cssText = 'display:inline-block;width:70px;height:70px;filter:brightness(.3)'; box.prepend(picture);
      const bar = document.createElement('progress'); bar.max = hero(next.hero).stars; bar.value = countStars(state); box.append(bar);
    }
    for (const id of canWelcome(state)) button(root, `${hero(id).name} 데려오기`, () => {
      if (!welcome(state, id)) return; save(); page('새 친구가 왔어!', home);
      const scene = section(root, 'arc-result'); scene.innerHTML = heroIcon(id);
      const text = document.createElement('h2'); text.textContent = hero(id).name; scene.append(text);
      playSfx('fanfare'); speak('새 친구가 왔어!'); button(scene, '함께 놀자', home, 'arc-welcome-done');
    }, 'arc-welcome');
    const grid = section(root, 'arc-grid');
    for (const game of GAMES) {
      const open = gameOpen(state, game.meta.id);
      const b = button(grid, game.meta.name + (open ? '' : ` · 별 ${GAME_STARS[game.meta.id]}개`), () => stages(game), 'arc-game');
      b.dataset.game = game.meta.id; b.disabled = !open;
      const icon = document.createElement('span'); icon.innerHTML = heroIcon('pal');
      if (ART.icons[game.meta.id]) {
        icon.className = 'hero-picture';
        const img = document.createElement('img'); img.alt = ''; img.width = 110; img.height = 110;
        img.onload = () => { icon.firstElementChild.style.visibility = 'hidden'; };
        img.onerror = () => img.remove();
        img.src = siteUrl(ART.icons[game.meta.id]); icon.append(img);
      }
      b.prepend(icon);
    }
  }
  function stages(game) {
    if (!gameOpen(state, game.meta.id)) return home();
    page(game.meta.name, home);
    const choices = section(root, 'arc-subject');
    for (const [id, name] of Object.entries({ mix: '섞어서', hangul: '한글', english: '영어', number: '숫자' })) {
      const b = button(choices, name, () => { state.arcade.subject = id; save(); stages(game); }, state.arcade.subject === id ? 'selected' : ''); b.dataset.subject = id;
    }
    const grid = section(root, 'arc-grid arc-stages');
    for (let n = 1; n <= 30; n++) {
      const medals = state.arcade.games[game.meta.id]?.medals[n - 1] || 0;
      const b = button(grid, `${n} ${'●'.repeat(medals)}`, () => friends(game, n), tierOf(n) + ' arc-stage');
      b.dataset.stage = n; b.disabled = !stageOpen(state, game.meta.id, n); b.setAttribute('aria-label', `${n}단계 메달 ${medals}개`);
    }
  }
  function friends(game, n) {
    if (!HEROES.some(h => h.id !== 'pal' && state.arcade.heroes.owned.includes(h.id))) return begin(game, n);
    page('함께 놀 친구', () => stages(game));
    const grid = section(root, 'arc-grid');
    for (const h of HEROES.filter(h => h.id === 'pal' || state.arcade.heroes.owned.includes(h.id))) {
      const b = button(grid, `${h.name} · ${fit(game, h.id) ? '♥'.repeat(fit(game, h.id)) : '여기서는 그냥 같이 놀아'}`, () => {
        state.arcade.heroes.picked = h.id; save(); begin(game, n);
      }, 'arc-hero' + ((state.arcade.heroes.picked ?? 'pal') === h.id ? ' selected' : ''));
      const icon = document.createElement('span'); icon.innerHTML = heroIcon(h.id); b.prepend(icon); b.dataset.hero = h.id;
    }
  }
  function begin(game, n) {
    if (!gameOpen(state, game.meta.id) || !stageOpen(state, game.meta.id, n)) return home();
    stop();
    const picked = state.arcade.heroes.picked;
    const heroId = state.arcade.heroes.owned.includes(picked) ? picked : 'pal';
    const key = `guide:${game.meta.id}`;
    play = startPlay(root, game, n, { heroId, content: pool(state, state.arcade.subject, tierOf(n)),
      guide: n === 1 && !state.arcade.seen[key],
      onGuide() { state.arcade.seen[key] = true; save(); }, onExit: () => stages(game),
      onResult(s) { lastSession = s; result(game, n, s); },
    });
    lastSession = play.session;
  }
  function result(game, n, s) {
    const key = `${game.meta.id}:${n}`, clear = s.done === 'clear';
    if (clear) { recordResult(state, game.meta.id, n, s); save(); failures.delete(key); }
    else failures.set(key, (failures.get(key) || 0) + 1);
    page(clear ? '해냈어!' : '다시 해볼까?', () => stages(game));
    const box = section(root, 'arc-result'); box.dataset.result = s.done;
    box.innerHTML = heroIcon(s.heroId, clear ? 'happy' : 'sad');
    if (clear) { const medals = section(box, 'medals'); medals.textContent = '🏅'.repeat(s.medals); playSfx('fanfare'); speak('해냈어!'); }
    const actions = section(box, 'arc-result-actions');
    button(actions, clear ? '한 번 더' : '다시 해볼까?', () => begin(game, n), 'arc-retry' + (clear ? '' : ' arc-primary'));
    if (clear && n < 30) button(actions, '다음', () => friends(game, n + 1), 'arc-next-stage arc-primary');
    if (!clear && failures.get(key) >= 2) {
      const card = helpCard(state, game);
      if (card) {
        const help = section(box, 'arc-help'); help.innerHTML = heroIcon(card.hero);
        if (card.kind === 'use') button(help, '이 친구랑 해볼까?', () => { state.arcade.heroes.picked = card.hero; save(); begin(game, n); });
        else { const text = document.createElement('p'); text.textContent = `별 ${card.need}개만 더!`; help.append(text); button(help, '섬으로 가기', entrance); }
      }
    }
  }
  window.__arcade = { state, session: () => play?.session ?? lastSession, advance: (input, dt) => play?.advance(input, dt) };
  addEventListener('pagehide', () => { stop(); stopMusic(); stopSpeech(); }, { once: true });
  home();
}
if (globalThis.document?.getElementById('arcade')) startArcade();
