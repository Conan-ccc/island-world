// Stars (pure): never saved, always counted from the island records. Only the islands give stars.
import { isMastered } from './mastery.js';
import { SUBJECTS } from './save.js';

export const STAR = { correct: 1, mastered: 5, cleared: 30 };

const isObj = v => v !== null && typeof v === 'object' && !Array.isArray(v);
// a count above this is a broken save, not play: capped so the total always stays a finite number
export const MAX_COUNT = 1_000_000;
const goodCount = c => (typeof c === 'number' && Number.isFinite(c) && c > 0 ? Math.min(MAX_COUNT, Math.floor(c)) : 0);

// every right answer, every mastered item and every cleared island of every subject; a part of the wrong shape counts 0
export function countStars(state) {
  let stars = 0;
  const subjects = isObj(state) && isObj(state.subjects) ? state.subjects : {};
  for (const s of SUBJECTS) {
    const islands = isObj(subjects[s]) && isObj(subjects[s].islands) ? subjects[s].islands : {};
    for (const isl of Object.values(islands)) {
      if (!isObj(isl)) continue;
      if (isl.cleared === true) stars += STAR.cleared;
      const mastery = isObj(isl.mastery) ? isl.mastery : {};
      for (const [item, m] of Object.entries(mastery)) {
        if (!isObj(m)) continue;
        const count = goodCount(m.count);
        stars += count * STAR.correct;
        // isMastered on a clean copy so a broken entry cannot make it throw
        const clean = { mastery: { [item]: { count, types: Array.isArray(m.types) ? m.types : [] } } };
        if (isMastered(clean, item)) stars += STAR.mastered;
      }
    }
  }
  return stars;
}
