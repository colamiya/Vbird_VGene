import type {
  MealRunPrediction,
  MealRunPredictionProgress,
  WorldEvent,
  WorldStats,
} from '../types/world';
import {
  countActiveInterventions as countActiveInterventionTotal,
  countEffectiveInterventions,
  countPinnedObservations as countPinnedObservationTotal,
} from './interventionKinds';
import { naturalWorldEvents } from './worldEvents';

interface PredictionProgressInput {
  prediction?: MealRunPrediction | null;
  stats: WorldStats;
  events: WorldEvent[];
}

const COLLECTION_SIGNAL_EXCLUDES = new Set<WorldEvent['kind']>([
  'RUN_STARTED',
  'RUN_ENDED',
  'PHASE_SHIFT',
  'PLAYER_BLESSING',
  'PLAYER_POISON',
  'PLAYER_QUARANTINE',
  'PLAYER_EXILE',
  'PINNED_OBSERVATION',
]);

function realEvents(events: WorldEvent[]) {
  return naturalWorldEvents(events);
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function firstTargetNumber(prediction: MealRunPrediction, fallback: number) {
  const value = Number(prediction.target.match(/\d+/)?.[0] ?? fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function hasEvent(events: WorldEvent[], kinds: WorldEvent['kind'][]) {
  return events.some((event) => kinds.includes(event.kind));
}

function countCollectionSignals(events: WorldEvent[]) {
  const signals = new Set(
    events
      .filter((event) => !COLLECTION_SIGNAL_EXCLUDES.has(event.kind))
      .map((event) => event.kind),
  );
  return signals.size;
}

function evaluateThemeSignal(prediction: MealRunPrediction, stats: WorldStats, events: WorldEvent[]) {
  if (prediction.id === 'theme-symbiosis') {
    return hasEvent(events, ['COOPERATION_CLUSTER']);
  }
  if (prediction.id === 'theme-catastrophe') {
    return hasEvent(events, ['TOXIN_CRISIS', 'ENERGY_FAMINE', 'MASS_EXTINCTION']) || stats.entropy >= 75 || stats.population <= 2;
  }
  if (prediction.id === 'theme-apex') {
    return hasEvent(events, ['FIRST_APEX', 'LINEAGE_FOUNDER', 'HALL_OF_FAME']) || stats.avgScore >= 70;
  }
  if (prediction.id === 'theme-ascent') {
    return hasEvent(events, ['RESOURCE_BLOOM', 'GOLDEN_AGE']) || stats.avgScore >= 65;
  }
  return events.length >= 6 && stats.population > 2;
}

function toneFor(prediction: MealRunPrediction, completed: boolean, score: number, interventions: number): WorldEvent['severity'] {
  if (completed) return 'good';
  if (prediction.kind === 'HUMAN_TOUCH' && interventions > 3) return 'warning';
  if (score < 25 && prediction.tone === 'danger') return 'danger';
  if (score >= 70 && prediction.tone === 'danger') return 'warning';
  return prediction.tone;
}

export function deriveMealRunPredictionProgress(input: PredictionProgressInput): MealRunPredictionProgress | null {
  const prediction = input.prediction;
  if (!prediction) return null;

  const events = realEvents(input.events);
  const interventionCounts = countEffectiveInterventions(input.events);
  const interventions = countActiveInterventionTotal(interventionCounts);
  const pinnedObservations = countPinnedObservationTotal(interventionCounts);
  const collectionSignals = countCollectionSignals(events);
  const metrics = {
    events: events.length,
    interventions,
    collections: collectionSignals,
    population: input.stats.population,
    avgScore: input.stats.avgScore,
    entropy: input.stats.entropy,
  };

  let current = 0;
  let target = 1;
  let targetLabel = prediction.target;
  let completed = false;
  let score = 0;
  let detail = '';

  if (prediction.kind === 'SURVIVAL') {
    target = firstTargetNumber(prediction, 12);
    current = input.stats.population;
    completed = current >= target;
    score = clampScore((current / target) * 100);
    detail = completed ? '存续线已越过餐前押题。' : `还差 ${Math.max(0, target - current)} 个存活个体。`;
  } else if (prediction.kind === 'EVENT_DENSITY') {
    target = firstTargetNumber(prediction, 6);
    current = events.length;
    completed = current >= target;
    score = clampScore((current / target) * 100);
    detail = completed ? '真实事件密度已经达标。' : `还差 ${Math.max(0, target - current)} 条真实历史事件。`;
  } else if (prediction.kind === 'THEME_SIGNAL') {
    target = 100;
    targetLabel = prediction.target;
    completed = evaluateThemeSignal(prediction, input.stats, events);
    score = completed ? 100 : clampScore(Math.min(80, events.length * 12 + input.stats.avgScore * 0.4));
    current = score;
    detail = completed ? '主题信号已被真实事件或统计命中。' : '主题信号仍在积累，等待关键事件确认。';
  } else if (prediction.kind === 'HUMAN_TOUCH') {
    target = 3;
    targetLabel = '1-3 次克制干预';
    current = interventions;
    completed = interventions >= 1 && interventions <= 3;
    score = interventions === 0 ? 0 : interventions <= 3 ? 100 : clampScore(Math.max(35, 100 - (interventions - 3) * 18));
    detail = interventions === 0
      ? pinnedObservations > 0
        ? '目前只有钉选观察，还没有主动改写世界。'
        : '还没有主动干预记录。'
      : completed
        ? '玩家手痕处在克制区间。'
        : '干预次数已经偏多，押题分会回落。';
  } else {
    target = firstTargetNumber(prediction, 2);
    targetLabel = `${target}+ 图鉴/遗物/徽章候选信号`;
    current = collectionSignals;
    completed = current >= target;
    score = clampScore((current / target) * 100);
    detail = completed
      ? '局内已出现足够多可沉淀为收藏的真实信号。'
      : `还差 ${Math.max(0, target - current)} 个不同真实事件信号，局后再按图鉴/遗物/徽章复核。`;
  }

  const evidence = [
    prediction.evidence,
    `events=${metrics.events}`,
    `activeInterventions=${metrics.interventions}`,
    `pinned=${pinnedObservations}`,
    `collectionSignals=${metrics.collections}`,
    `P=${metrics.population}`,
    `S=${metrics.avgScore.toFixed(1)}`,
    `E=${metrics.entropy.toFixed(1)}%`,
  ].join(' / ');

  return {
    prediction,
    completed,
    progress: score / 100,
    score,
    title: completed ? `押题接近兑现：${prediction.title}` : `押题追踪：${prediction.title}`,
    detail,
    tone: toneFor(prediction, completed, score, interventions),
    evidence,
    current,
    target,
    targetLabel,
    metrics,
  };
}
