// 한글 섬의 발음 확인 페이지 (보호자용): tools/voice-check.html?subject=hangul draws it with render(document).
// The same page as the old hangul game's tools/voice-check.html: every jamo, sample syllables and the guide phrases.
import { speak, spokenForm, unlockSpeech, phrase, PHRASES, configureSpeech } from '../../core/speech.js';
import subject from './config.js';

export function render(doc) {
  doc.title = '발음 확인';
  doc.head.insertAdjacentHTML('beforeend', '<style>body{overflow:auto;padding:16px}h2{margin:18px 0 8px}.g{display:flex;flex-wrap:wrap;gap:10px}button{min-width:64px;min-height:64px;font-size:28px;border:none;border-radius:16px;background:#fff;box-shadow:0 3px 0 rgba(0,0,0,.08)}button.l{font-size:16px;padding:8px 14px}</style>');
  doc.body.insertAdjacentHTML('afterbegin', `<h1 style="font-size:20px">발음 확인 (보호자용)</h1>
<p style="font-size:15px">버튼을 눌러 들어보고, 어색하게 들리는 글자를 알려주세요. 처음 한 번은 소리가 안 날 수 있어요.</p>
<h2>자음</h2><div class="g" id="c"></div><h2>모음</h2><div class="g" id="v"></div><h2>글자</h2><div class="g" id="s"></div><h2>안내 문장</h2><div class="g" id="p"></div>`);
  configureSpeech({ ...subject.voice, subject: subject.id });
  let un = false;
  const add = (id, label, text, cls = '') => { const b = doc.createElement('button'); b.textContent = label; b.className = cls; b.onclick = () => { if (!un) { unlockSpeech(); un = true; } speak(text); }; doc.getElementById(id).appendChild(b); };
  'ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ'.split('').forEach(j => add('c', j, spokenForm(j)));
  'ㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣㅐㅔ'.split('').forEach(j => add('v', j, spokenForm(j)));
  '가나다라마바사아자차카타파하하늘바다'.split('').forEach(j => add('s', j, j));
  Object.keys(PHRASES).forEach(k => { const t = phrase(k, { call: '하늘아', item: '하', role: '엄마' }); add('p', t, t, 'l'); });
}
