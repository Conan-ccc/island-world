// Goal rules are pure: return new values; callers assign and save them.
import { SUBJECTS, repairRoom, repairQuests } from './save.js';
import { countStars } from './stars.js';

export const LADDER = [10, 25, 45, 70, 100, 135, 175, 220, 270, 325, 385, 450];
export const LADDER_ITEMS = ['teddy', 'bed', 'ball', 'rug', 'lamp', 'toybox', 'bookshelf', 'plant', 'table', 'chair', 'clock', 'musicbox'];
const friends = [
  ['friend-cow', 'friend-pig', 'friend-lamb'], ['ladybug', 'bee', 'caterpillar'],
  ['friend-crab', 'friend-octopus', 'friend-turtle'], ['friend-squirrel', 'friend-raccoon', 'friend-hedgehog'],
  ['dino-friend-1', 'dino-friend-2', 'dino-friend-3'], ['friend-bear-driver', 'friend-bunny-pilot', 'friend-dog-captain'],
  ['friend-owl', 'friend-hedgehog-night', 'friend-bunny-moon'], ['friend-king-bear', 'friend-queen-cat', 'friend-knight-pup'],
];
export const QUESTS = Object.fromEntries(friends.map((list, i) => [i + 1, {
  friends: list.map(id => `theme/${i + 1}/${id}.webp`), piece: `quest/piece-${i + 1}.webp`,
}]));
export function questFor(n, subject) {
  const q = Object.hasOwn(QUESTS, n) ? QUESTS[n] : null, index = SUBJECTS.indexOf(subject);
  return q && index >= 0 ? { friend: q.friends[index], piece: q.piece, item: `q${n}-${index + 1}` } : null;
}
export const questState = q => repairQuests({ q }).q || { found: [], done: false, gift: false };
export function findPiece(value, id, places) {
  const q = questState(value), valid = [...new Set((Array.isArray(places) ? places : []).filter(p => typeof p === 'string'))];
  if (typeof id !== 'string' || !valid.includes(id)) return q;
  const found = [...new Set([...q.found, id])];
  return { ...q, found, done: q.done || (valid.length === 6 && valid.every(p => found.includes(p))) };
}
export function openQuestGift(value, valueQuest, id) {
  const room = repairRoom(value), quest = questState(valueQuest);
  if (!quest.done || quest.gift || typeof id !== 'string') return { room, quest };
  return { room: { ...room, owned: [...new Set([...room.owned, id])] }, quest: { ...quest, gift: true } };
}
export function pendingGifts(state) {
  return Math.max(0, LADDER.filter(n => countStars(state) >= n).length - repairRoom(state?.room).opened);
}
export function nextGift(state) {
  const i = repairRoom(state?.room).opened;
  if (i === LADDER.length) return null;
  const previous = LADDER[i - 1] || 0, next = LADDER[i];
  return { item: LADDER_ITEMS[i], previous, next, progress: Math.max(0, Math.min(1, (countStars(state) - previous) / (next - previous))) };
}
export function openStarGift(state) {
  const room = repairRoom(state?.room);
  if (!pendingGifts(state)) return room;
  return { ...room, opened: room.opened + 1, owned: [...new Set([...room.owned, LADDER_ITEMS[room.opened]])] };
}
export function addSnack(value) {
  const room = repairRoom(value);
  return { ...room, snacks: Math.min(9, room.snacks + 1) };
}
