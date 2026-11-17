import { onTap } from './tap.js';
// The entrance (for now; the world map comes later): the start tap unlocks the sound and asks the browser to keep the
// storage, then one big picture button per subject goes to that subject's home (<subject>/sea.html).
// The old games' saves come in here too (the same as on every subject page); the old keys are only read.
// The offline copy of the assets starts here (no subject first).
import { loadState, saveState, claimSubjects, SAVE_KEY } from './save.js';
import { adoptLegacy } from './legacy.js';
import { unlockSpeech } from './speech.js';
import { unlockAudio } from './fx.js';
import { countStars } from './stars.js';
import { siteUrl } from './env.js';
import { warmCache } from './register-sw.js';

export const DOORS = [
  { id: 'hangul', letters: '가나다', accent: '#FF6FA5', name: '한글 섬' },
  { id: 'english', letters: 'abc', accent: '#FF8A3C', name: '영어 섬' },
  { id: 'number', letters: '123', accent: '#3FA9F5', name: '숫자 섬' },
];

const PLAY_ICON = '<svg viewBox="0 0 100 100" width="160" height="160"><circle cx="50" cy="52" r="44" fill="#E05A8C"/><circle cx="50" cy="48" r="44" fill="#FF8FB8"/><circle cx="50" cy="48" r="44" fill="none" stroke="#fff" stroke-width="4"/><path d="M41 30 L71 48 L41 66Z" fill="#fff"/></svg>';
const SCREEN = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(180deg,#BDE8FF 0%,#E6F7FF 55%,#FFF5FA 100%)';

export function startHub(app = document.getElementById('app')) {
  // the entrance works on no subject: it writes only the old saves it brings in
  const state = loadState(undefined, { own: null });
  const got = adoptLegacy(state);
  if (got.length) { claimSubjects(state, got); saveState(state); }
  addEventListener('pageshow', e => { if (e.persisted) location.reload(); });
  addEventListener('storage', e => { if (e.key === SAVE_KEY && !document.querySelector('.overlay')) location.reload(); });
  warmCache();

  function doors() {
    app.innerHTML = `<div class="hub-doors" style="${SCREEN};gap:min(4vw,40px);flex-wrap:wrap">${DOORS.map(d => `
      <button class="hub-door btn-pic" data-subject="${d.id}" aria-label="${d.name}" style="flex-direction:column;gap:10px;padding:18px;border-radius:36px;border:4px solid ${d.accent}">
        <span style="position:relative;display:block"><img src="${siteUrl(`icons/${d.id}/door.webp`)}" alt="" style="width:min(24vw,34vh);height:min(24vw,34vh);border-radius:28px;display:block;pointer-events:none"><span style="position:absolute;left:50%;bottom:8%;translate:-50% 0;background:#fff;border-radius:24px;padding:5px 20px;color:${d.accent};font:800 clamp(30px,4vw,52px) ui-rounded,system-ui,sans-serif;white-space:nowrap">${d.letters}</span></span>
        <span style="font-size:30px;font-weight:800;color:#4A3A48">${d.name}</span>
      </button>`).join('')}
      <button class="hub-arcade btn-pic" style="min-width:150px;min-height:110px;font-size:28px">놀이동산 <span class="star-jar">★ ${countStars(state)}</span></button>
    </div>`;
    onTap(app.querySelector('.hub-arcade'), () => { location.href = siteUrl('arcade/index.html'); });
    for (const b of app.querySelectorAll('.hub-door')) onTap(b, () => { location.href = siteUrl(`${b.dataset.subject}/sea.html`); });
  }

  app.innerHTML = `<div style="${SCREEN}"><button class="hub-start" style="border:none;background:none;padding:0" aria-label="시작">${PLAY_ICON}</button></div>`;
  onTap(app.querySelector('.hub-start'), () => {
    unlockSpeech(); unlockAudio();
    navigator.storage?.persist?.().catch(() => {});
    if (window.__swUpdateReady) { location.reload(); return; }
    doors();
  }, { once: true });
  window.__hub = { state };
}

if (globalThis.document?.getElementById('app')) startHub();
