import type { AppConfig, BackendSettings, BenchmarkTaskId, ComputeBackend, DisplayMode, EnvironmentType, MutationMode, VisualFidelity, WinningRule } from '../types/world';

export const DEFAULT_APP_CONFIG: AppConfig = {
  mode: 'Local',
  ollamaUrl: 'http://localhost:11434',
  modelName: 'llama3',
  maxEntities: 500,
  evolutionThrottle: 100,
  visualFidelity: 'High',
  resolution: '1280x720',
  displayMode: 'Windowed',
  fontScale: 1.25,
  mutationRate: 0.05,
  entropyFactor: 0.1,
  winningRule: 'SURVIVAL',
  envType: 'EARTH',
  computeBackend: 'Auto',
  taskId: 'sort_i32',
  audioEnabled: true,
  masterVolume: 0.75,
  musicVolume: 0.55,
  sfxVolume: 0.8,
  adaptiveMusic: true,
};

const pickNumber = (value: unknown, fallback: number, min?: number, max?: number) => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (min !== undefined && parsed < min) return min;
  if (max !== undefined && parsed > max) return max;
  return parsed;
};

const pickString = <T extends string>(value: unknown, fallback: T, allowed?: readonly T[]): T => {
  if (typeof value !== 'string') return fallback;
  if (allowed && !allowed.includes(value as T)) return fallback;
  return value as T;
};

const pickBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return fallback;
};

export function normalizeSettings(input: any): AppConfig {
  const source = input || {};
  return {
    mode: pickString<MutationMode>(source.mode, DEFAULT_APP_CONFIG.mode, ['LocalMock', 'Local', 'Ollama']),
    ollamaUrl: pickString(source.ollamaUrl ?? source.ollama_url, DEFAULT_APP_CONFIG.ollamaUrl),
    modelName: pickString(source.modelName ?? source.model_name, DEFAULT_APP_CONFIG.modelName),
    maxEntities: Math.floor(pickNumber(source.maxEntities ?? source.max_entities, DEFAULT_APP_CONFIG.maxEntities, 1, 5000)),
    evolutionThrottle: Math.floor(pickNumber(source.evolutionThrottle ?? source.evolution_throttle, DEFAULT_APP_CONFIG.evolutionThrottle, 16, 10000)),
    visualFidelity: pickString<VisualFidelity>(source.visualFidelity ?? source.visual_fidelity, DEFAULT_APP_CONFIG.visualFidelity, ['Low', 'Medium', 'High', 'Ultra']),
    resolution: pickString(source.resolution, DEFAULT_APP_CONFIG.resolution),
    displayMode: pickString<DisplayMode>(source.displayMode ?? source.display_mode, DEFAULT_APP_CONFIG.displayMode, ['Windowed', 'Fullscreen', 'Borderless']),
    fontScale: pickNumber(source.fontScale ?? source.font_scale, DEFAULT_APP_CONFIG.fontScale, 0.8, 1.5),
    mutationRate: pickNumber(source.mutationRate ?? source.mutation_rate, DEFAULT_APP_CONFIG.mutationRate, 0.001, 1),
    entropyFactor: pickNumber(source.entropyFactor ?? source.entropy_factor, DEFAULT_APP_CONFIG.entropyFactor, 0, 1),
    winningRule: pickString<WinningRule>(source.winningRule ?? source.winning_rule, DEFAULT_APP_CONFIG.winningRule, ['SURVIVAL', 'PREDATION', 'CODE_SIZE']),
    envType: pickString<EnvironmentType>(source.envType ?? source.env_type, DEFAULT_APP_CONFIG.envType, ['EARTH', 'DEEP_SEA', 'SPACE']),
    computeBackend: pickString<ComputeBackend>(source.computeBackend ?? source.compute_backend, DEFAULT_APP_CONFIG.computeBackend, ['Auto', 'CPU', 'CUDA']),
    taskId: pickString<BenchmarkTaskId>(source.taskId ?? source.task_id, DEFAULT_APP_CONFIG.taskId, [
      'freeform',
      'sort_i32',
      'rle',
      'sum_i32',
      'max_i32',
      'find_i32',
      'checksum8',
      'count_byte',
    ]),
    audioEnabled: pickBoolean(source.audioEnabled ?? source.audio_enabled, DEFAULT_APP_CONFIG.audioEnabled),
    masterVolume: pickNumber(source.masterVolume ?? source.master_volume, DEFAULT_APP_CONFIG.masterVolume, 0, 1),
    musicVolume: pickNumber(source.musicVolume ?? source.music_volume, DEFAULT_APP_CONFIG.musicVolume, 0, 1),
    sfxVolume: pickNumber(source.sfxVolume ?? source.sfx_volume, DEFAULT_APP_CONFIG.sfxVolume, 0, 1),
    adaptiveMusic: pickBoolean(source.adaptiveMusic ?? source.adaptive_music, DEFAULT_APP_CONFIG.adaptiveMusic),
  };
}

export function toBackendSettings(config: AppConfig): BackendSettings {
  return {
    mode: config.mode,
    ollama_url: config.ollamaUrl,
    model_name: config.modelName,
    max_entities: config.maxEntities,
    evolution_throttle: config.evolutionThrottle,
    visual_fidelity: config.visualFidelity,
    resolution: config.resolution,
    display_mode: config.displayMode,
    font_scale: config.fontScale,
    mutation_rate: config.mutationRate,
    entropy_factor: config.entropyFactor,
    winning_rule: config.winningRule,
    env_type: config.envType,
    compute_backend: config.computeBackend,
    task_id: config.taskId,
    audio_enabled: config.audioEnabled,
    master_volume: config.masterVolume,
    music_volume: config.musicVolume,
    sfx_volume: config.sfxVolume,
    adaptive_music: config.adaptiveMusic,
  };
}

export function toUpdateSettingsArgs(config: AppConfig) {
  return {
    mode: config.mode,
    ollamaUrl: config.ollamaUrl,
    modelName: config.modelName,
    maxEntities: config.maxEntities,
    evolutionThrottle: config.evolutionThrottle,
    visualFidelity: config.visualFidelity,
    mutationRate: config.mutationRate,
    entropyFactor: config.entropyFactor,
    winningRule: config.winningRule,
    envType: config.envType,
    computeBackend: config.computeBackend,
    taskId: config.taskId,
  };
}
