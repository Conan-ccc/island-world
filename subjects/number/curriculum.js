// Number curriculum: what each island teaches (pure data + helpers).
// The child already counts 1-10, so the islands start at zero and comparing.
// Number islands: unit = a number (key '7'). Fact islands: unit = a sum or difference (key '2+1', '5-2').

// How a number is read as a numeral ("삼") and how it is said while counting things ("셋")
export const NAMES = { 0: '영', 1: '일', 2: '이', 3: '삼', 4: '사', 5: '오', 6: '육', 7: '칠', 8: '팔', 9: '구', 10: '십',
  11: '십일', 12: '십이', 13: '십삼', 14: '십사', 15: '십오', 16: '십육', 17: '십칠', 18: '십팔', 19: '십구', 20: '이십', 21: '이십일', 30: '삼십', 31: '삼십일', 40: '사십', 41: '사십일', 50: '오십', 51: '오십일', 71: '칠십일' };
export const COUNT_WORDS = [null, '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉', '열',
  '열하나', '열둘', '열셋', '열넷', '열다섯', '열여섯', '열일곱', '열여덟', '열아홉', '스물'];
export const nameOf = n => NAMES[Number(n)] ?? String(n);

// "은" after a final consonant, "는" after a vowel
const topic = word => { const c = word.charCodeAt(word.length - 1) - 0xAC00; return c >= 0 && c % 28 ? '은' : '는'; };
export const OP_WORD = { '+': '더하기', '-': '빼기' };
export const factQuestion = (a, op, b) => `${nameOf(a)} ${OP_WORD[op]} ${nameOf(b)}${topic(nameOf(b))}?`;
export const factAnswer = (a, op, b) => `${nameOf(a)} ${OP_WORD[op]} ${nameOf(b)}${topic(nameOf(b))} ${nameOf(op === '+' ? a + b : a - b)}!`;

const N = n => ({ key: String(n), kind: 'num', n, value: n });
const F = (a, op, b) => ({ key: `${a}${op}${b}`, kind: 'fact', a, op, b, value: op === '+' ? a + b : a - b });

// pic = the thing that is counted on this island (a picture under assets/)
// extra = the island's own play (compare: which side has more, next: what comes next)
export const ISLANDS = {
  1: { title: '영과 비교 섬', kind: 'num', units: [0, 1, 2, 3, 4, 5].map(N), trace: ['0', '1', '2', '3', '4', '5'], pic: 'pic/apple.webp', extra: 'compare' },
  2: { title: '순서 섬', kind: 'num', units: [6, 7, 8, 9, 10].map(N), trace: ['6', '7', '8', '9', '10'], pic: 'theme/2/bee.webp', extra: 'next' },
  3: { title: '열하나 섬', kind: 'num', units: [11, 12, 13, 14, 15].map(N), trace: ['11', '12', '13', '14', '15'], pic: 'pic/fish.webp' },
  4: { title: '스물 섬', kind: 'num', units: [16, 17, 18, 19, 20].map(N), trace: ['16', '17', '18', '19', '20'], pic: 'theme/4/peach.webp' },
  5: { title: '더하기 섬', kind: 'fact', units: [F(1, '+', 1), F(2, '+', 1), F(1, '+', 2), F(2, '+', 2), F(3, '+', 1), F(2, '+', 3)], trace: ['2', '3', '4', '5'], pic: 'theme/5/egg.webp' },
  6: { title: '큰 더하기 섬', kind: 'fact', units: [F(3, '+', 3), F(4, '+', 2), F(5, '+', 2), F(4, '+', 4), F(5, '+', 4), F(5, '+', 5)], trace: ['6', '7', '8', '9', '10'], pic: 'theme/6/car.webp' },
  7: { title: '빼기 섬', kind: 'fact', units: [F(2, '-', 1), F(3, '-', 1), F(4, '-', 2), F(5, '-', 2), F(5, '-', 1), F(4, '-', 1)], trace: ['1', '2', '3', '4'], pic: 'theme/7/star-bright.webp' },
  8: { title: '십 묶음 섬', kind: 'num', units: [10, 20, 30, 40, 50].map(N), trace: ['10', '20', '30', '40', '50'], pic: 'theme/8/rose.webp', tens: true },
};

// Numerals that look alike (a tricky wrong answer, at most one per question)
export const LOOKALIKE = { 6: [9], 9: [6], 1: [7], 7: [1], 2: [5], 5: [2], 3: [8], 8: [3], 12: [21], 13: [31], 14: [41], 15: [51], 16: [19], 17: [71], 18: [13], 19: [16] };

export function islandItems(n) {
  const isl = ISLANDS[n];
  return isl && isl.units ? isl.units.map(u => u.key) : [];
}

// Units of earlier islands of the same kind (review)
export function earlierKeys(n) {
  const kind = ISLANDS[n]?.kind;
  const out = [];
  for (let i = 1; i < n; i++) if (ISLANDS[i].kind === kind) out.push(...ISLANDS[i].units.map(u => u.key));
  return [...new Set(out)].filter(k => !ISLANDS[n].units.some(u => u.key === k));
}

// Which island a unit belongs to: the current one if it has the unit, otherwise the first island of the same kind that has it
// (10 is on island 2 and again on island 8: on island 8 it counts for island 8)
export function homeIsland(key, n) {
  if (ISLANDS[n]?.units.some(u => u.key === key)) return Number(n);
  for (const [i, isl] of Object.entries(ISLANDS)) if (isl.kind === ISLANDS[n]?.kind && isl.units.some(u => u.key === key)) return Number(i);
  return null;
}

export function unitOf(key) {
  for (const isl of Object.values(ISLANDS)) {
    const u = isl.units.find(x => x.key === key);
    if (u) return u;
  }
  return null;
}

// Spoken line for a unit (array of speech tokens): "삼", "셋" / "이 더하기 일은 삼!"
export function unitLine(u) {
  if (!u) return [];
  if (u.kind === 'fact') return [factAnswer(u.a, u.op, u.b)];
  return COUNT_WORDS[u.n] ? [nameOf(u.n), COUNT_WORDS[u.n]] : [nameOf(u.n)];
}

// Every number that can be shown or said anywhere in the game
export const ALL_NUMBERS = Object.keys(NAMES).map(Number);
