// Parent gate and parent panel (text is fine here: adults only), one for every subject.
// What a subject does its own way (its settings rows, words, "mark as cleared" rule, first-run check) is subject.parent.
import { exportCode, importCode, saveState, clearSubject, claimSubjects, CLAIM_ALL, CODE_PREFIX, SUBJECTS } from './save.js';
import { decodeLegacyCode, mergeLegacy, hasProgress } from './legacy.js';
import { isMastered } from './mastery.js';
import { CHARACTERS } from './characters.js';
import { esc } from './activities/common.js';

const READ_ONLY = '이 기기에 더 새 버전의 기록이 있어서 불러오지 않았어요. 앱을 새로 고친 뒤 다시 해 주세요.';
const BAD_RESTORE = '코드가 올바르지 않아요.';
const LEGACY_GUIDE = '옛 한글 섬, 영어 섬, 숫자 섬의 보호자 화면에서 백업 코드를 복사해 여기에 붙여넣으세요.';
const LEGACY_DONE = '가져왔어요.';
const LEGACY_BAD = '코드를 읽을 수 없어요.';
const NEWER_CODE = '더 새 버전의 코드예요. 앱을 새로 고친 뒤 다시 해 주세요.';
const ASK_SUBJECT = '이 과목에는 이미 기록이 있어요. 옛 기록으로 바꿀까요?';
const ASK_ALL = '지금 기록을 모두 이 코드의 기록으로 바꿀까요?';

// the answer to the gate's sum (the button's value may come as text)
export const checkSum = (a, b, answer) => Number(answer) === a + b;

// A pasted backup code. Old codes (HG1:, EI1:, NI1:) go into their subject in place, leaving the shared sound settings
// as they are; a subject that already has progress is replaced only when confirmOverwrite(subject) says yes.
// An IW1: code is the whole save: when any subject has progress, only when confirmOverwrite('all') says yes; the new
// state is returned for the caller to put in place. Never throws.
export function applyPastedCode(state, code, { confirmOverwrite = () => false } = {}) {
  const c = String(code ?? '').trim();
  const why = e => (e?.message === 'newer-save' ? 'newer-save' : 'bad-code');
  if (c.startsWith(CODE_PREFIX)) {
    let st;
    try { st = importCode(c); } catch (e) { return { kind: 'full', ok: false, reason: why(e) }; }
    if (SUBJECTS.some(s => hasProgress(state.subjects?.[s])) && !confirmOverwrite('all')) return { kind: 'full', ok: false, reason: 'has-progress' };
    return { kind: 'full', ok: true, state: st };
  }
  let subject, legacy;
  try { ({ subject, legacy } = decodeLegacyCode(c)); } catch (e) { return { kind: 'legacy', ok: false, reason: why(e) }; }
  try {
    let r = mergeLegacy(state, subject, legacy, { keepSound: true });
    if (!r.ok && r.reason === 'has-progress') {
      if (!confirmOverwrite(subject)) return { kind: 'legacy', subject, ok: false, reason: 'has-progress' };
      r = mergeLegacy(state, subject, legacy, { force: true, keepSound: true });
    }
    return r.ok ? { kind: 'legacy', subject, ok: true, state } : { kind: 'legacy', subject, ok: false, reason: r.reason };
  } catch (e) { return { kind: 'legacy', subject, ok: false, reason: why(e) }; }
}

// A pasted code that came in (applyPastedCode ok): an IW1: code replaces the state the page holds (the same object);
// either way the page writes what came in on its next save, also for subjects that are not the page's own
// (claimSubjects), instead of taking those subjects from what other pages wrote.
export function takePasted(state, r) {
  if (r.kind === 'full') { Object.keys(state).forEach(k => delete state[k]); Object.assign(state, r.state); claimSubjects(state, CLAIM_ALL); }
  else claimSubjects(state, r.subject);
}

// Long-press the top-right 64px zone for 2s, then answer a simple addition.
export function installParentGate(onPass) {
  const zone = document.createElement('div');
  zone.className = 'parent-zone';
  zone.style.cssText = 'position:fixed;top:0;right:0;width:64px;height:64px;z-index:90;touch-action:none';
  let timer = null;
  zone.addEventListener('pointerdown', () => { clearTimeout(timer); timer = setTimeout(() => openParentGate(onPass), 2000); });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) zone.addEventListener(ev, () => clearTimeout(timer));
  document.body.appendChild(zone);
  return zone;
}

export function openParentGate(onPass) {
  const a = 2 + Math.floor(Math.random() * 8), b = 2 + Math.floor(Math.random() * 8);
  const ans = a + b;
  const opts = new Set([ans]);
  while (opts.size < 3) opts.add(ans + (Math.floor(Math.random() * 7) - 3) || ans + 4);
  const list = [...opts].sort(() => Math.random() - 0.5);
  const ov = document.createElement('div');
  ov.className = 'overlay parent-gate';
  ov.style.cssText = 'background:rgba(60,40,60,.55);display:flex;align-items:center;justify-content:center';
  ov.innerHTML = `<div style="background:#fff;border-radius:24px;padding:28px 32px;text-align:center;min-width:300px">
    <div style="font-size:15px;color:#888;margin-bottom:8px">보호자 확인</div>
    <div style="font-size:34px;font-weight:700;margin-bottom:18px">${a} + ${b} = ?</div>
    <div style="display:flex;gap:12px;justify-content:center">${list.map(n => `<button class="btn-pic gate-opt" data-n="${n}" style="font-size:26px;width:80px">${n}</button>`).join('')}</div>
    <button class="gate-close" style="margin-top:18px;border:none;background:none;color:#999;font-size:15px">닫기</button></div>`;
  ov.addEventListener('click', e => {
    const btn = e.target.closest('.gate-opt');
    if (btn) { ov.remove(); if (checkSum(a, b, btn.dataset.n)) onPass(); return; }
    if (e.target.closest('.gate-close') || e.target === ov) ov.remove();
  });
  document.body.appendChild(ov);
  return ov;
}

// the subject's islands: character and stage, then per island what is learned and what is left
function progressHtml(state, subject) {
  const P = subject.parent;
  const { ISLANDS } = subject.curriculum;
  const h = state.subjects[subject.id];
  const ch = CHARACTERS.find(c => c.id === h.characterId);
  const label = P.label || ((n, k) => k);
  // every island of the subject (english, number), or only the islands the save has (hangul)
  const list = P.allIslands ? Object.keys(ISLANDS).map(n => [n, h.islands[n]]) : Object.entries(h.islands).sort((x, y) => Number(x[0]) - Number(y[0]));
  const rows = list.map(([key, isl]) => {
    const n = Number(key);
    const title = ISLANDS[n]?.title || '';
    const items = ISLANDS[n] ? subject.content.islandUnits(n, { profile: state.profile }) : Object.keys(isl.mastery);
    if (!isl) return `<tr><td>${n}섬<br><span style="color:#888;font-size:12px">${title}</span></td><td>아직 안 감</td><td>0/${items.length}</td><td>0일</td></tr>`;
    const mastered = items.filter(it => isMastered(isl, it));
    const left = items.filter(it => !isMastered(isl, it)).map(it => {
      const m = isl.mastery[it] || { count: 0, types: [] };
      return `${esc(label(n, it))}(${m.count}회·놀이 ${m.types.length}종)`;
    });
    const btn = isl.cleared ? '' : `<button class="pp-clear" data-n="${n}" style="border:none;background:#f3eef3;border-radius:8px;padding:4px 8px;font-size:13px">완료로 처리</button>`;
    return `<tr><td>${n}섬<br><span style="color:#888;font-size:12px">${title}</span></td><td>${isl.cleared ? '완료' : '진행 중'} ${btn}</td><td>${mastered.length}/${items.length} 익힘${left.length ? '<br><span style="color:#888;font-size:12px">남은 것: ' + left.join(', ') + '</span>' : ''}</td><td>${isl.days.length}일</td></tr>`;
  }).join('');
  return `<div>캐릭터: <b>${ch ? esc(ch.name) : '아직 없음'}</b> · ${h.stage + 1}단계 / 8단계</div>
    <table class="pp-progress" style="width:100%;border-collapse:collapse;margin-top:8px;font-size:14px"><tr style="color:#888"><td>섬</td><td>상태</td><td>${P.words.units}</td><td>놀이한 날</td></tr>${rows || '<tr><td colspan="4">아직 기록 없음</td></tr>'}</table>`;
}

const check = (cls, on, text) => `<label style="display:flex;gap:8px;align-items:center;margin-top:8px"><input type="checkbox" class="${cls}" ${on ? 'checked' : ''} style="width:22px;height:22px"> ${text}</label>`;
const characterSelect = selected => `<select class="pp-exclude" style="padding:8px;border-radius:10px;margin-top:6px"><option value="">고르지 않음</option>${CHARACTERS.map(c => `<option value="${c.id}" ${selected === c.id ? 'selected' : ''}>${esc(c.name)} (${esc(c.kind)})</option>`).join('')}</select>`;
function nodes(html) {
  const t = document.createElement('template');
  t.innerHTML = html;
  return [...t.content.childNodes];
}

// onChange(state) is called whenever the parent saves or a code comes in.
// firstRun (hangul): the first-run setup that asks the child's name: no close button, progress, backup or reset.
export function openParentPanel(state, onChange, { subject, firstRun = false } = {}) {
  const P = subject.parent, W = P.words;
  // saves mostly happen on island pages; try one now so the warning reflects reality
  saveState(state);
  const g = state.settings; // volume and music are shared by every subject
  const ov = document.createElement('div');
  ov.className = 'overlay parent-panel';
  ov.style.cssText = 'background:rgba(60,40,60,.55);overflow:auto;-webkit-overflow-scrolling:touch';
  const rowsAt = where => (P.rowsAt === where ? '<!--rows-->' : '');
  ov.innerHTML = `<div style="background:#fff;max-width:640px;margin:32px auto;border-radius:24px;padding:24px 28px;font-size:16px;line-height:1.5">
    <div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">${firstRun ? '처음 설정' : '보호자 공간'}</h2>
      ${firstRun ? '' : '<button class="pp-close btn-pic" style="font-size:15px">닫기</button>'}</div>
    ${state.readOnly ? '<div class="pp-warn pp-newer" style="background:#FFE3E3;color:#B00020;padding:10px;border-radius:12px;margin-top:12px">더 새 버전의 기록이 있어요. 앱을 새로 고쳐 주세요(기록은 그대로예요).</div>'
      : state.saveError ? '<div class="pp-warn" style="background:#FFE3E3;color:#B00020;padding:10px;border-radius:12px;margin-top:12px">저장이 안 되고 있어요. 저장 공간을 확인하거나 백업 코드를 보관해 주세요.</div>' : ''}
    ${rowsAt('top')}<h3>${W.sound}</h3><input class="pp-vol" type="range" min="0" max="1" step="0.1" value="${g.volume}" style="width:100%">
    ${check('pp-music', g.music !== false, '배경음악 켜기')}${rowsAt('sound')}
    ${firstRun ? '' : `<h3>진행 상황</h3>${progressHtml(state, subject)}
    ${state.readOnly ? '' : `<h3>백업</h3><div style="font-size:13px;color:#888">이 코드를 메모나 카톡에 보관해 두면, 아이패드를 바꾸거나 데이터가 지워져도 그대로 이어서 할 수 있어요.</div>
    <textarea class="pp-code" readonly style="width:100%;height:70px;font-size:12px;border-radius:10px;border:1px solid #ddd;padding:8px">${esc(exportCode(state))}</textarea>
    <button class="pp-copy" style="border:none;background:${P.accent};border-radius:10px;padding:8px 14px">코드 복사</button>`}`}
    <h3>${firstRun ? '백업 코드가 있으면 불러오기' : '백업 불러오기'}</h3>
    <textarea class="pp-restore" placeholder="IW1:로 시작하는 코드를 붙여넣기" style="width:100%;height:60px;font-size:12px;border-radius:10px;border:1px solid #ddd;padding:8px"></textarea>
    <button class="pp-restore-btn" style="border:none;background:#f3eef3;border-radius:10px;padding:8px 14px">불러오기</button>
    <span class="pp-restore-msg" style="font-size:14px;margin-left:8px"></span>
    ${firstRun ? '' : `<div style="font-size:13px;color:#888;margin-top:12px">${LEGACY_GUIDE}</div>
    <textarea class="pp-legacy" style="width:100%;height:60px;font-size:12px;border-radius:10px;border:1px solid #ddd;padding:8px"></textarea>
    <button class="pp-legacy-btn" style="border:none;background:#f3eef3;border-radius:10px;padding:8px 14px">옛 기록 가져오기</button>
    <span class="pp-legacy-msg" style="font-size:14px;margin-left:8px"></span>
    <h3>처음부터 다시</h3><div style="font-size:13px;color:#888">${W.reset} 아래 칸에 <b>다시</b>를 입력하고 버튼을 누르세요.</div>
    <input class="pp-reset-word" style="padding:8px;border-radius:10px;border:1px solid #ddd;width:120px"> <button class="pp-reset" style="border:none;background:#FFE3E3;color:#B00020;border-radius:10px;padding:8px 14px">모두 지우기</button>`}
    <div style="margin-top:24px;text-align:right"><button class="pp-save btn-pic" style="font-size:18px;background:${P.accent};padding:10px 26px">저장</button></div>
  </div>`;
  const $ = q => ov.querySelector(q);
  // the subject's own rows go where the marker is; they hook into clicks (first) and into saving (false stops it)
  const clicks = [], savers = [];
  const ctx = { check, characterSelect, nodes, $, onClick: f => clicks.push(f), onSave: f => savers.push(f) };
  const mark = [...ov.firstElementChild.childNodes].find(n => n.nodeType === 8 && n.data === 'rows');
  if (mark) mark.replaceWith(...P.rows(state, ctx));
  const ask = s => confirm(s === 'all' ? ASK_ALL : ASK_SUBJECT);
  // an IW1: code replaces the state the pages hold; an old code has already gone into it
  const take = r => takePasted(state, r);
  ov.addEventListener('click', e => {
    const t = e.target;
    if (clicks.some(f => f(t))) return;
    if (t.closest('.pp-copy')) { const c = $('.pp-code'); c.select(); navigator.clipboard?.writeText(c.value).catch(() => document.execCommand('copy')); t.textContent = '복사됨'; return; }
    if (t.closest('.pp-restore-btn')) {
      if (state.readOnly) { $('.pp-restore-msg').textContent = READ_ONLY; return; } // never write over a newer save
      const r = applyPastedCode(state, $('.pp-restore').value, { confirmOverwrite: ask });
      if (r.ok) { take(r); onChange(state); ov.remove(); return; }
      $('.pp-restore-msg').textContent = r.reason === 'has-progress' ? '' : r.reason === 'newer-save' && W.newerCode ? W.newerCode : BAD_RESTORE;
      return;
    }
    if (t.closest('.pp-legacy-btn')) {
      if (state.readOnly) { $('.pp-legacy-msg').textContent = READ_ONLY; return; }
      const r = applyPastedCode(state, $('.pp-legacy').value, { confirmOverwrite: ask });
      if (r.ok) {
        // saved, then the panel again with what came in (its progress table and backup code)
        take(r); onChange(state); ov.remove();
        openParentPanel(state, onChange, { subject, firstRun }).querySelector('.pp-legacy-msg').textContent = LEGACY_DONE;
        return;
      }
      $('.pp-legacy-msg').textContent = r.reason === 'has-progress' ? '' : r.reason === 'newer-save' ? NEWER_CODE : LEGACY_BAD;
      return;
    }
    if (t.closest('.pp-reset')) {
      if ($('.pp-reset-word').value.trim() !== '다시') return;
      clearSubject(state, subject.id); // the profile, the shared sound settings and the subject's settings stay, as before
      onChange(state); ov.remove(); return;
    }
    if (t.closest('.pp-clear')) {
      const n = String(Number(t.closest('.pp-clear').dataset.n));
      if (!confirm(n + W.clearAsk)) return;
      const h = state.subjects[subject.id];
      h.islands[n].cleared = true;
      h.stage = P.clearStage(h.stage, Number(n));
      onChange(state); ov.remove(); return;
    }
    if (t.closest('.pp-close')) { ov.remove(); return; }
    if (t.closest('.pp-save')) {
      g.volume = Number($('.pp-vol').value);
      g.music = $('.pp-music').checked;
      for (const f of savers) if (f() === false) return;
      onChange(state); ov.remove();
    }
  });
  document.body.appendChild(ov);
  return ov;
}
