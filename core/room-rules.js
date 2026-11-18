import { repairRoom } from './save.js';
import { LADDER_ITEMS, QUESTS } from './goal.js';

export const ROOM_ITEMS = [...LADDER_ITEMS, ...Object.keys(QUESTS).flatMap(n => [1, 2, 3].map(s => `q${n}-${s}`))];
export const ITEM_WIDTH = { rug: 24, bed: 24, bookshelf: 18, table: 16 };
const percent = n => Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50;
export function placeItem(value, id, x = 50, y = 72) {
  const room = repairRoom(value);
  if (!room.owned.includes(id) || !ROOM_ITEMS.includes(id)) return room;
  return { ...room, placed: [...room.placed.filter(p => p.id !== id), { id, x: percent(x), y: percent(y) }] };
}
export function removeItem(value, id) {
  const room = repairRoom(value);
  return { ...room, placed: room.placed.filter(p => p.id !== id) };
}
export function eatSnack(value) {
  const room = repairRoom(value);
  return { ...room, snacks: Math.max(0, room.snacks - 1) };
}
export function drawerItems(value) {
  const room = repairRoom(value);
  return [...room.owned.filter(id => ROOM_ITEMS.includes(id) && !room.placed.some(p => p.id === id)).map(id => ({ id, owned: true })),
    ...ROOM_ITEMS.filter(id => !room.owned.includes(id)).map(id => ({ id, owned: false }))];
}

// Bounds and distances use scene percentages, with y scaled to the scene aspect ratio.
export function nextRoomPosition(placed, bounds, aspect = 1001 / 1600) {
  let best, farthest = -1;
  for (let row = 0; row <= 40; row++) for (let col = 0; col <= 40; col++) {
    const x = bounds.left + (bounds.right - bounds.left) * col / 40;
    const y = bounds.top + (bounds.bottom - bounds.top) * row / 40;
    const distance = Math.min(Infinity, ...placed.map(p => Math.hypot(x - p.x, (y - p.y) * aspect)));
    if (distance > farthest) { best = { x, y }; farthest = distance; }
  }
  return best;
}
export function roomGuests(state, subject) {
  const seen = new Set([state.subjects[subject]?.characterId]);
  return [...Object.entries(state.subjects).filter(([id]) => id !== subject).map(([, s]) => s),
    ...state.friends.map(f => ({ ...f, stage: 7 }))].filter(s => {
    if (!s?.characterId || seen.has(s.characterId)) return false;
    seen.add(s.characterId); return true;
  }).slice(0, 6);
}
