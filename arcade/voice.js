import english, { tokenSay } from '../subjects/english/config.js';
import { nameOf, OP_WORD } from '../subjects/number/curriculum.js';
import { voiceHash } from '../subjects/hangul/voice-keys.js';
import { VOICE_FILES as hangul } from '../subjects/hangul/voice-index.js';
import { VOICE_FILES as number } from '../subjects/number/voice-index.js';
import { VOICE_FILES } from './voice-index.js';

export const arcadeVoice = {
  subject: 'arcade', index: VOICE_FILES, hash: voiceHash,
  // 사 is also in the legacy Hangul index; the arcade uses it for the numeral 4.
  sources: [{ subject: 'number', index: number }, { subject: 'hangul', index: hangul },
    { subject: 'english', index: english.voice.index }],
  extra: english.voice.extra,
};

export const lines = {
  nextFriend: '별을 더 모으면 새 친구가 와!', allFriends: '친구들이 모두 왔어!', welcome: '새 친구가 왔어!',
  locked: '별을 더 모으면 열려!', choose: '하고 싶은 놀이를 눌러봐!', previous: '앞 판을 먼저 해 보자!', clear: '해냈어!',
};
export const heroLine = h => `${h.name}랑 놀자!`;
export const startLine = meta => `${meta.name}! 초록 단추를 누르면 시작해!`;

export function numeral(key) {
  const n = Number(key);
  if (n < 10 || n > 99) return nameOf(n);
  return (n < 20 ? '' : nameOf(Math.floor(n / 10))) + '십' + (n % 10 ? nameOf(n % 10) : '');
}
export function questionTokens({ subject, key }) {
  if (subject === 'english') return [tokenSay(key)];
  if (subject !== 'number') return [key];
  const fact = /^(\d+)([+-])(\d+)$/.exec(key);
  return fact ? [numeral(fact[1]), OP_WORD[fact[2]], numeral(fact[3])] : [numeral(key)];
}

export function questionSpeech({ ask, say }) {
  return [...questionTokens(ask), say.slice(ask.label.length + 2)];
}
