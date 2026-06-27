import { audioEngine } from './audio/engine';
import type { TrackType } from './audio/types';

export type { TrackType };

export const bgm = {
  play: (track: TrackType) => audioEngine.play(track),
  stop: () => audioEngine.stop(),
  getCurrentLaw: () => {
    const current = audioEngine.getNowPlaying();
    return {
      name: current.name,
      description: current.description,
    };
  },
};
