import { playMusic, registerMusicLoops } from '../core/fx.js';
import { MUSIC_LOOPS } from './music-index.js';

// The initial screen waits for the audio-unlocking gesture.
export function arcadeMusic(play = playMusic) {
  registerMusicLoops(MUSIC_LOOPS);
  let unlocked = false, id = 'lobby';
  const update = () => { if (unlocked) play('arcade/music/' + id + '.mp3'); };
  return {
    unlock() { unlocked = true; update(); },
    screen(game) { id = game?.meta.id ?? 'lobby'; update(); },
  };
}
