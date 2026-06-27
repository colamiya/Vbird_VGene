export type TrackType = 'STARTUP' | 'CONFIG' | 'EVOLUTION' | 'REVIEW' | 'NONE';

export type AudioStage = 'SPLASH' | 'CONFIG' | 'SIMULATION' | 'REVIEW';

export type AudioRunTheme = 'Ascent' | 'Symbiosis' | 'Catastrophe' | 'Apex';
export type AudioRunPhase = 'GENESIS' | 'BURST' | 'DIVERGENCE' | 'CRISIS' | 'ASCENSION';
export type AudioCueTone = 'calm' | 'momentum' | 'danger' | 'triumph' | 'void';
export type AudioPressureBand = 'low' | 'mid' | 'high' | 'terminal';

export type AudioEvent =
  | 'hover'
  | 'click'
  | 'start'
  | 'pause'
  | 'resume'
  | 'entity_select'
  | 'mutation_surge'
  | 'intervention_bless'
  | 'intervention_poison'
  | 'intervention_quarantine'
  | 'intervention_exile'
  | 'intervention_pin'
  | 'director_cue'
  | 'director_target_lock'
  | 'director_danger_cue'
  | 'entropy_warning'
  | 'crisis_surge'
  | 'objective_complete'
  | 'fate_resolved'
  | 'review'
  | 'success'
  | 'error';

export type PartType = 'INTRO' | 'VERSE' | 'PRE_CHORUS' | 'CHORUS' | 'INTERLUDE' | 'BRIDGE' | 'OUTRO';

export type ChannelName = 'lead' | 'bass' | 'pad' | 'arp' | 'drums' | 'texture';

export interface AudioSettings {
  audioEnabled: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  adaptiveMusic: boolean;
}

export interface AudioGameState {
  stage: AudioStage;
  isRunning: boolean;
  entropy: number;
  avgGeneration: number;
  avgScore: number;
  population: number;
  runId?: string;
  runTheme?: AudioRunTheme;
  runPhase?: AudioRunPhase;
  cueTone?: AudioCueTone;
  recentEventKind?: string;
  recentEventSeverity?: 'info' | 'good' | 'warning' | 'danger';
  pressure?: number;
  interactionHeat?: number;
  interventionMomentum?: number;
}

export interface PartData {
  lead?: (number | null)[];
  bass?: (number | null)[];
  pad?: (number | null)[];
  arp?: (number | null)[];
  drums?: number[];
  texture?: (number | null)[];
}

export interface Composition {
  id: string;
  track: Exclude<TrackType, 'NONE'>;
  name: string;
  description: string;
  root: string;
  scale: number[];
  tempo: number;
  swing: number;
  sidechain: number;
  filterBase: number;
  drive: number;
  tags?: {
    themes?: AudioRunTheme[];
    tones?: AudioCueTone[];
    pressure?: AudioPressureBand[];
    eventKinds?: string[];
  };
  parts: Partial<Record<PartType, PartData>>;
}

export interface NowPlaying {
  id: string;
  name: string;
  description: string;
  track: TrackType;
  intensity: number;
  error?: string;
}

export interface SfxStep {
  kind: 'tone' | 'noise';
  start: number;
  duration: number;
  volume: number;
  fromFreq?: number;
  toFreq?: number;
  wave?: OscillatorType;
  pan?: number;
}

export interface SfxRecipe {
  event: AudioEvent;
  cooldownMs?: number;
  route?: 'instant' | 'stinger';
  priority?: number;
  steps: SfxStep[];
}
