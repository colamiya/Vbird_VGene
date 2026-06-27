import type {
  MealRunLength,
  MealRunPrediction,
  MealRunTheme,
  NextRunChallenge,
  PlayerInterventionKind,
  RunPhase,
  RunSession,
  RunSpeed,
  WorldStats,
} from '../types/world';

export const RUN_LENGTH_OPTIONS: Array<{
  id: MealRunLength;
  label: string;
  rangeLabel: string;
  targetMinutes: number;
}> = [
  { id: 'Snack', label: '下饭短局', rangeLabel: '8-12 分钟', targetMinutes: 10 },
  { id: 'Dinner', label: '正餐局', rangeLabel: '15-20 分钟', targetMinutes: 18 },
  { id: 'LongTable', label: '长桌局', rangeLabel: '30+ 分钟', targetMinutes: 30 },
];

export const RUN_SPEED_OPTIONS: Array<{ value: RunSpeed; label: string }> = [
  { value: 1, label: '1x' },
  { value: 2, label: '2x' },
  { value: 4, label: '4x' },
  { value: 8, label: '8x' },
];

export const RUN_THEME_OPTIONS: Array<{
  id: MealRunTheme;
  label: string;
  shortLabel: string;
  detail: string;
}> = [
  { id: 'Random', label: '随机剧本', shortLabel: '随机', detail: '开局时随机抽取一个观察倾向，保持不可预期。' },
  { id: 'Ascent', label: '文明崛起', shortLabel: '崛起', detail: '更关注人口、资源潮、黄金时代和稳定扩张。' },
  { id: 'Symbiosis', label: '共生网络', shortLabel: '共生', detail: '更关注协作、利他、看护者和互助结构。' },
  { id: 'Catastrophe', label: '灾变压力', shortLabel: '灾变', detail: '更关注毒潮、饥荒、灭绝和瓶颈幸存。' },
  { id: 'Apex', label: '顶点谱系', shortLabel: '顶点', detail: '更关注高适应个体、开创者和主角叙事。' },
];

export const DEFAULT_RUN_LENGTH: MealRunLength = 'Snack';
export const DEFAULT_RUN_SPEED: RunSpeed = 1;
export const DEFAULT_RUN_THEME: MealRunTheme = 'Random';

const RESOLVED_THEMES: Array<Exclude<MealRunTheme, 'Random'>> = ['Ascent', 'Symbiosis', 'Catastrophe', 'Apex'];

const PHASE_LABELS: Record<RunPhase, string> = {
  GENESIS: '创世',
  BURST: '爆发',
  DIVERGENCE: '分化',
  CRISIS: '危机',
  ASCENSION: '飞升',
};

const INTERVENTION_LABELS: Record<PlayerInterventionKind, string> = {
  BLESS: '祝福',
  POISON: '投毒',
  QUARANTINE: '隔离',
  EXILE: '放逐',
  PIN_OBSERVE: '钉选观察',
};

const THEME_LABELS: Record<Exclude<MealRunTheme, 'Random'>, string> = {
  Ascent: '文明崛起',
  Symbiosis: '共生网络',
  Catastrophe: '灾变压力',
  Apex: '顶点谱系',
};

export function resolveRunTheme(theme: MealRunTheme = DEFAULT_RUN_THEME, seed = Date.now()): Exclude<MealRunTheme, 'Random'> {
  if (theme !== 'Random') return theme;
  const index = Math.abs(Math.floor(seed / 9973)) % RESOLVED_THEMES.length;
  return RESOLVED_THEMES[index];
}

export function createRunSession(
  length: MealRunLength = DEFAULT_RUN_LENGTH,
  speed: RunSpeed = DEFAULT_RUN_SPEED,
  theme: MealRunTheme = DEFAULT_RUN_THEME,
  startedAt = Date.now(),
  prediction?: MealRunPrediction,
  loadedChallenge?: NextRunChallenge,
): RunSession {
  const option = RUN_LENGTH_OPTIONS.find((item) => item.id === length) ?? RUN_LENGTH_OPTIONS[0];
  return {
    id: `meal-${startedAt}-${Math.floor(Math.random() * 10000)}`,
    length,
    speed,
    theme: resolveRunTheme(theme, startedAt),
    startedAt,
    targetDurationMs: option.targetMinutes * 60 * 1000,
    phase: 'GENESIS',
    prediction,
    loadedChallenge,
  };
}

export function getRunPhase(session: RunSession, stats?: WorldStats, now = Date.now()): RunPhase {
  const progress = Math.min(1, Math.max(0, (now - session.startedAt) / session.targetDurationMs));
  if (stats && stats.population <= 2 && progress > 0.15) return 'ASCENSION';
  if (stats && stats.entropy >= 82 && progress > 0.2) return 'CRISIS';
  if (progress < 0.08) return 'GENESIS';
  if (progress < 0.28) return 'BURST';
  if (progress < 0.58) return 'DIVERGENCE';
  if (progress < 0.84) return 'CRISIS';
  return 'ASCENSION';
}

export function getRemainingRunMs(session: RunSession, now = Date.now()) {
  return Math.max(0, session.startedAt + session.targetDurationMs - now);
}

export function shouldAutoReview(session: RunSession, now = Date.now()) {
  return getRemainingRunMs(session, now) <= 0;
}

export function formatRunDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatRunLength(length: MealRunLength) {
  const option = RUN_LENGTH_OPTIONS.find((item) => item.id === length) ?? RUN_LENGTH_OPTIONS[0];
  return `${option.label} ${option.rangeLabel}`;
}

export function formatRunSpeed(speed: RunSpeed) {
  return `${speed}x`;
}

export function formatRunTheme(theme: MealRunTheme | Exclude<MealRunTheme, 'Random'>) {
  if (theme === 'Random') return '随机剧本';
  return THEME_LABELS[theme];
}

export function formatRunPhase(phase: RunPhase) {
  return PHASE_LABELS[phase];
}

export function formatIntervention(kind: PlayerInterventionKind) {
  return INTERVENTION_LABELS[kind];
}
