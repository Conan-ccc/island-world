import { loadState, saveState } from '../../core/save.js';
import { countStars } from '../../core/stars.js';
import { warmCache } from '../../core/register-sw.js';
import { siteUrl } from '../../core/env.js';
import { unlockAudio, playMusic, stopMusic, playSfx, setVolume, setMusic } from '../../core/fx.js';
import { speak, unlockSpeech, setSpeechVolume, stopSpeech } from '../../core/speech.js';
import { HEROES, fit } from '../heroes.js';
import { GAME_STARS, syncArcade, gameOpen, canWelcome, welcome, nextHero, stageOpen, helpCard, suggestGame, suggestStage } from '../unlock.js';
import { pool, tierOf } from '../content.js';
import { heroIcon, setPal, ART } from '../art.js';
import { GAMES } from '../games/index.js';
import { recordResult } from './session.js';
import { startPlay } from './play.js';

export function startArcade(root = document.getElementById('arcade')) {
  const state = loadState(undefined, { own: 'arcade' });
  warmCache(['assets/arcade/']);
  let play = null, lastSession = null, greeted = false;
  const failures = new Map();
  const hero = id => HEROES.find(h => h.id === id) ?? HEROES[0];
  const save = () => { saveState(state); return state.arcade; };
  if (syncArcade(state)) save();
  setPal(state); setVolume(state.settings.volume); setSpeechVolume(state.settings.volume); setMusic(state.settings.music);
  function sound() { unlockAudio(); unlockSpeech(); playMusic(); }
  root.addEventListener('click', sound, { once: true, capture: true });
  function stop() { play?.stop(); play = null; }
  function page(title, back) {
    stop(); stopSpeech(); root.replaceChildren(); root.scrollTop = 0; root.style.backgroundImage = '';
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
    const suggested = suggestGame(state);
    for (const game of GAMES) {
      const id = game.meta.id, open = gameOpen(state, id);
      const b = button(grid, game.meta.name, () => {
        if (open) return stages(game);
        b.classList.remove('arc-shake'); void b.offsetWidth; b.classList.add('arc-shake');
        speak(`별 ${Math.max(1, GAME_STARS[id] - countStars(state))}개 더 모으면 열려!`);
      }, 'arc-game' + (open ? '' : ' locked') + (suggested === id ? ' arc-suggest' : ''));
      b.dataset.game = id;
      if (!open) b.setAttribute('aria-disabled', 'true');
      const picture = section(b, 'arc-game-picture'); picture.append(gameIcon(game)); b.prepend(picture);
      if (!open) {
        const lock = section(picture, 'arc-lock'); lock.textContent = '🔒';
        const badge = section(b, 'arc-lock-badge'); badge.textContent = `★${GAME_STARS[id]}`;
      }
      if (suggested === id) { const hand = section(picture, 'arc-hand'); hand.textContent = '👆'; hand.setAttribute('aria-hidden', 'true'); }
    }
    if (!greeted) { greeted = true; speak('하고 싶은 놀이를 눌러봐!'); }
  }
  function gameIcon(game) {
    const icon = document.createElement('span'); icon.className = 'hero-picture'; icon.innerHTML = heroIcon('pal');
    if (ART.icons[game.meta.id]) {
      const img = document.createElement('img'); img.alt = ''; img.width = 140; img.height = 140;
      img.onload = () => { icon.firstElementChild.style.visibility = 'hidden'; };
      img.onerror = () => img.remove();
      img.src = siteUrl(ART.icons[game.meta.id]); icon.append(img);
    }
    return icon;
  }
  function stages(game) {
    if (!gameOpen(state, game.meta.id)) return home();
    page(game.meta.name, home);
    root.querySelector('h1').prepend(gameIcon(game));
    const background = ART.games[game.meta.id]?.background;
    if (background) root.style.backgroundImage = `linear-gradient(#fffdf6df, #fffdf6df), url("${siteUrl(background)}")`;
    const n = suggestStage(state, game.meta.id);
    const start = button(root, '', () => begin(game, n), 'arc-play arc-primary arc-pulse');
    start.innerHTML = `<span aria-hidden="true">▶</span><small>${n}판</small>`;
    start.dataset.stage = n; start.setAttribute('aria-label', `${n}판 시작`);
    const owned = HEROES.filter(h => h.id === 'pal' || state.arcade.heroes.owned.includes(h.id));
    if (owned.length > 1) {
      const row = section(root, 'arc-heroes');
      for (const h of owned) {
        const b = button(row, '', () => {
          state.arcade.heroes.picked = h.id; save();
          for (const item of row.children) {
            const selected = item.dataset.hero === h.id; item.classList.toggle('selected', selected); item.setAttribute('aria-pressed', String(selected));
          }
          speak(`${h.name}랑 놀자!`);
        }, 'arc-hero' + ((state.arcade.heroes.picked ?? 'pal') === h.id ? ' selected' : ''));
        b.innerHTML = heroIcon(h.id) + `<small>${'♥'.repeat(fit(game, h.id))}</small>`;
        b.dataset.hero = h.id; b.setAttribute('aria-label', h.name);
        b.setAttribute('aria-pressed', String((state.arcade.heroes.picked ?? 'pal') === h.id));
      }
    }
    const choices = section(root, 'arc-subject');
    for (const [id, symbol, name] of [['mix', '🎲', '섞어서'], ['hangul', '가', '한글'], ['english', 'A', '영어'], ['number', '1', '숫자']]) {
      const b = button(choices, '', () => {
        state.arcade.subject = id; save();
        for (const item of choices.children) {
          const selected = item.dataset.subject === id; item.classList.toggle('selected', selected); item.setAttribute('aria-pressed', String(selected));
        }
      }, state.arcade.subject === id ? 'selected' : '');
      b.innerHTML = `<span>${symbol}</span><small>${name}</small>`; b.dataset.subject = id;
      b.setAttribute('aria-pressed', String(state.arcade.subject === id));
    }
    const label = document.createElement('h2'); label.className = 'arc-other'; label.textContent = '다른 판'; root.append(label);
    const grid = section(root, 'arc-grid arc-stages');
    for (let n = 1; n <= 30; n++) {
      const medals = state.arcade.games[game.meta.id]?.medals[n - 1] || 0, open = stageOpen(state, game.meta.id, n);
      const b = button(grid, open ? `${n} ${'●'.repeat(medals)}` : '🔒', () => {
        if (open) begin(game, n); else speak('앞 판을 먼저 해 보자!');
      }, tierOf(n) + ' arc-stage' + (open ? '' : ' locked'));
      b.dataset.stage = n; if (!open) b.setAttribute('aria-disabled', 'true');
      b.setAttribute('aria-label', `${n}단계 메달 ${medals}개`);
    }
    speak(`${game.meta.name}! 초록 단추를 누르면 시작해!`);
  }
  function begin(game, n) {
    if (!gameOpen(state, game.meta.id) || !stageOpen(state, game.meta.id, n)) return home();
    stop(); root.style.backgroundImage = '';
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
    if (clear && n < 30) button(actions, '다음', () => begin(game, n + 1), 'arc-next-stage arc-primary');
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
