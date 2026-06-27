import type { AudioEvent } from './audio/types';
import { formatIntervention } from './runSession';
import type {
  EntityView,
  InterventionTrace,
  LiveInteractionNetwork,
  MealRhythmCue,
  MealRunPredictionProgress,
  PlayerInterventionKind,
  RunObjective,
  RunSession,
  WorldEvent,
  WorldStats,
} from '../types/world';

export type ExperienceTone = 'calm' | 'momentum' | 'danger' | 'triumph' | 'void';

export interface ExperienceDirectorCue {
  id: string;
  tone: ExperienceTone;
  title: string;
  subtitle: string;
  action: string;
  intensity: number;
  recommendedIntervention: PlayerInterventionKind;
  audioEvent: AudioEvent | null;
  audioProfile: {
    pressure: number;
    interactionHeat: number;
    interventionMomentum: number;
  };
  evidence: string;
}

interface ExperienceDirectorInput {
  session: RunSession | null;
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  objectives: RunObjective[];
  traces: InterventionTrace[];
  interactionNetwork: LiveInteractionNetwork | null;
  mealRhythm: MealRhythmCue | null;
  predictionProgress: MealRunPredictionProgress | null;
  activeIntervention: PlayerInterventionKind;
  isRunning: boolean;
  now: number;
}

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function countDangerEvents(events: WorldEvent[]) {
  return events.slice(-18).filter((event) => event.severity === 'danger').length;
}

function latestResolvedTrace(traces: InterventionTrace[]) {
  return traces
    .slice()
    .reverse()
    .find((trace) => trace.status === 'RESOLVED' || trace.status === 'TRACKING') ?? null;
}

function recommendedIntervention(input: ExperienceDirectorInput, pressure: number): PlayerInterventionKind {
  if (input.mealRhythm?.suggestedIntervention) return input.mealRhythm.suggestedIntervention;
  const topEdge = input.interactionNetwork?.edges[0];
  if (topEdge?.suggestedIntervention) return topEdge.suggestedIntervention;
  if (pressure >= 0.72) return 'QUARANTINE';
  if (input.stats.population <= 4 && input.stats.population > 0) return 'BLESS';
  return input.activeIntervention;
}

function traceMomentum(trace: InterventionTrace | null) {
  if (!trace) return 0;
  const positive =
    trace.metrics.rescued * 0.3 +
    trace.metrics.generationGain * 0.12 +
    Math.max(0, trace.metrics.scoreDelta) / 120 +
    Math.max(0, trace.metrics.energyDelta) / 160;
  const negative =
    trace.metrics.harmed * 0.18 +
    trace.metrics.lost * 0.24 +
    Math.max(0, trace.metrics.toxinDelta) * 0.9;
  return clamp01(0.35 + positive - negative);
}

function titleFor(tone: ExperienceTone) {
  if (tone === 'danger') return '危机镜头';
  if (tone === 'triumph') return '手痕成立';
  if (tone === 'momentum') return '生态升温';
  if (tone === 'void') return '文明熄火';
  return '稳定观测';
}

function subtitleFor(input: ExperienceDirectorInput, tone: ExperienceTone, trace: InterventionTrace | null) {
  const topObjective = input.objectives
    .slice()
    .sort((a, b) => b.progress - a.progress)[0];
  if (tone === 'triumph' && trace) return trace.title;
  if (tone === 'danger') {
    const topEdge = input.interactionNetwork?.edges[0];
    return topEdge ? topEdge.title : '毒素、低能或掠食压力正在抬升。';
  }
  if (tone === 'void') return '种群已经接近不可复盘的低活性状态。';
  if (topObjective) return `${topObjective.title} ${Math.round(topObjective.progress * 100)}%`;
  return input.session ? `${input.session.phase} / P ${input.stats.population}` : '等待下饭局启动。';
}

function actionFor(input: ExperienceDirectorInput, tone: ExperienceTone, intervention: PlayerInterventionKind) {
  if (!input.isRunning) return '协议暂停，当前只保留观察与复盘判断。';
  if (tone === 'danger') return `建议切到${formatIntervention(intervention)}，优先处理压力源。`;
  if (tone === 'triumph') return '保留当前主角和手痕，等待复盘形成关键手痕。';
  if (tone === 'momentum') return `顺势观察交互线，必要时用${formatIntervention(intervention)}放大结果。`;
  if (tone === 'void') return '可提前复盘，或用祝福抢救最后火种。';
  return `继续观测，下一手可预选${formatIntervention(intervention)}。`;
}

export function deriveExperienceDirector(input: ExperienceDirectorInput): ExperienceDirectorCue | null {
  if (!input.session) return null;

  const latestMeaningfulEvent = input.events
    .slice()
    .reverse()
    .find((event) => event.kind !== 'RUN_STARTED' && event.kind !== 'RUN_ENDED') ?? null;
  const toxinAvg = average(input.entities.map((entity) => entity.metabolic_toxin));
  const lowEnergyRatio = input.entities.length === 0
    ? 0
    : input.entities.filter((entity) => entity.energy <= 28).length / input.entities.length;
  const dangerEvents = countDangerEvents(input.events);
  const attackEdges = (input.interactionNetwork?.metrics.attackEdges ?? 0) + (input.interactionNetwork?.metrics.conflictEdges ?? 0);
  const interactionHeat = input.interactionNetwork
    ? clamp01(average(input.interactionNetwork.edges.map((edge) => edge.strength)) / 100)
    : 0;
  const completedObjectives = input.objectives.filter((objective) => objective.status === 'complete').length;
  const objectiveProgress = input.objectives.length === 0
    ? 0
    : average(input.objectives.map((objective) => objective.progress));
  const trace = latestResolvedTrace(input.traces);
  const interventionMomentum = traceMomentum(trace);
  const predictionPressure = input.predictionProgress
    ? clamp01((100 - input.predictionProgress.score) / 100) * 0.14
    : 0;
  const pressure = clamp01(
    input.stats.entropy / 100 * 0.3 +
    toxinAvg * 0.24 +
    lowEnergyRatio * 0.18 +
    clamp01(dangerEvents / 5) * 0.16 +
    clamp01(attackEdges / 4) * 0.12 +
    predictionPressure,
  );

  let tone: ExperienceTone = 'calm';
  if (input.stats.population <= 1 && input.session.phase !== 'GENESIS') {
    tone = 'void';
  } else if (pressure >= 0.68 || dangerEvents >= 3) {
    tone = 'danger';
  } else if (
    (input.objectives.length > 0 && completedObjectives === input.objectives.length) ||
    (trace?.status === 'RESOLVED' && (trace.metrics.rescued > 0 || trace.metrics.generationGain > 0))
  ) {
    tone = 'triumph';
  } else if (interactionHeat >= 0.52 || objectiveProgress >= 0.58 || interventionMomentum >= 0.62) {
    tone = 'momentum';
  }

  const intervention = recommendedIntervention(input, pressure);
  const intensity = clamp01(pressure * 0.48 + interactionHeat * 0.28 + objectiveProgress * 0.16 + interventionMomentum * 0.16);
  const audioEvent: AudioEvent | null =
    tone === 'danger'
      ? 'crisis_surge'
      : tone === 'triumph'
        ? 'objective_complete'
        : trace?.status === 'RESOLVED'
          ? 'fate_resolved'
          : null;

  return {
    id: [
      input.session.id,
      tone,
      Math.round(pressure * 10),
      completedObjectives,
      trace?.id ?? 'no-trace',
      input.interactionNetwork?.title ?? 'no-network',
      latestMeaningfulEvent?.id ?? 'no-event',
      input.mealRhythm?.id ?? 'no-rhythm',
    ].join(':'),
    tone,
    title: titleFor(tone),
    subtitle: subtitleFor(input, tone, trace),
    action: actionFor(input, tone, intervention),
    intensity,
    recommendedIntervention: intervention,
    audioEvent,
    audioProfile: {
      pressure,
      interactionHeat,
      interventionMomentum,
    },
    evidence: [
      `P=${input.stats.population}`,
      `entropy=${input.stats.entropy.toFixed(1)}%`,
      `toxin=${Math.round(toxinAvg * 100)}%`,
      `lowE=${Math.round(lowEnergyRatio * 100)}%`,
      `danger=${dangerEvents}`,
      `edges=${input.interactionNetwork?.edges.length ?? 0}`,
      `obj=${completedObjectives}/${input.objectives.length}`,
      latestMeaningfulEvent ? `latest=${latestMeaningfulEvent.kind}` : 'latest=none',
    ].join(' / '),
  };
}
