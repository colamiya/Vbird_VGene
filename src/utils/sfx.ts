import { audioEngine } from './audio/engine';
import type { AudioEvent } from './audio/types';

const play = (event: AudioEvent) => {
  void audioEngine.emit(event);
};

export const sfx = {
  playHover: () => play('hover'),
  playClick: () => play('click'),
  playStart: () => play('start'),
  playPause: () => play('pause'),
  playResume: () => play('resume'),
  playEntitySelect: () => play('entity_select'),
  playMutationSurge: () => play('mutation_surge'),
  playEntropyWarning: () => play('entropy_warning'),
  playDirectorCue: () => play('director_cue'),
  playDirectorTargetLock: () => play('director_target_lock'),
  playDirectorDangerCue: () => play('director_danger_cue'),
  playReview: () => play('review'),
  playSuccess: () => play('success'),
  playError: () => play('error'),
};
