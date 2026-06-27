import type {
  EntityView,
  PlayerInterventionKind,
  RunEndgameForecast,
  RunEndgameForecastKind,
  RunSession,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { getRemainingRunMs } from './runSession';

interface EndgameForecastInput {
  session: RunSession | null;
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  now: number;
}

const GOOD_EVENTS = new Set<WorldEvent['kind']>([
  'RESOURCE_BLOOM',
  'COOPERATION_CLUSTER',
  'GOLDEN_AGE',
  'FIRST_APEX',
  'GENERATION_LEAP',
  'LINEAGE_FOUNDER',
  'HALL_OF_FAME',
]);

const DANGER_EVENTS = new Set<WorldEvent['kind']>([
  'TOXIN_CRISIS',
  'ENERGY_FAMINE',
  'PREDATOR_RAID',
  'MASS_EXTINCTION',
]);

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampPercent(value: number) {
  return Math.max(24, Math.min(94, Math.round(value)));
}

function recentEvents(events: WorldEvent[]) {
  return events
    .filter((event) => event.kind !== 'RUN_STARTED')
    .slice(-18);
}

function confidence(momentum: number, recentCount: number, remainingRatio: number) {
  const evidenceScore = Math.min(22, recentCount * 3);
  const timeScore = Math.round((1 - remainingRatio) * 18);
  return clampPercent(38 + Math.abs(momentum) * 22 + evidenceScore + timeScore);
}

function suggestedIntervention(kind: RunEndgameForecastKind, dangerEvents: number, goodEvents: number): PlayerInterventionKind {
  if (kind === 'EXTINCTION') return 'QUARANTINE';
  if (kind === 'APEX_BREAKOUT') return 'PIN_OBSERVE';
  if (kind === 'GOLDEN_AGE') return 'BLESS';
  if (kind === 'VOLATILE' && dangerEvents > goodEvents) return 'EXILE';
  if (kind === 'VOLATILE') return 'PIN_OBSERVE';
  return 'BLESS';
}

export function deriveEndgameForecast(input: EndgameForecastInput): RunEndgameForecast | null {
  const session = input.session;
  if (!session) return null;

  const recent = recentEvents(input.events);
  const remainingMs = getRemainingRunMs(session, input.now);
  const elapsedMs = Math.max(0, input.now - session.startedAt);
  const totalMs = Math.max(1, elapsedMs + remainingMs);
  const remainingRatio = clamp01(remainingMs / totalMs);
  const goodEvents = recent.filter((event) => GOOD_EVENTS.has(event.kind)).length;
  const dangerEvents = recent.filter((event) => DANGER_EVENTS.has(event.kind)).length;
  const apexCandidates = input.entities.filter((entity) => entity.score >= Math.max(70, input.stats.avgScore * 1.35)).length;
  const strainedEntities = input.entities.filter((entity) => entity.energy <= 28 || entity.metabolic_toxin >= 0.72).length;
  const populationPressure = input.stats.population <= 2 ? 1 : input.stats.population <= 5 ? 0.55 : 0;
  const entropyPressure = input.stats.entropy >= 82 ? 0.9 : input.stats.entropy >= 68 ? 0.45 : 0;
  const dangerPressure = clamp01(dangerEvents / Math.max(1, recent.length)) * 0.9;
  const goodPressure = clamp01(goodEvents / Math.max(1, recent.length)) * 0.8;
  const apexPressure = clamp01(apexCandidates / Math.max(1, input.entities.length)) * 0.75;
  const strainPressure = clamp01(strainedEntities / Math.max(1, input.entities.length)) * 0.65;
  const scoreMomentum = input.stats.avgScore >= 65 ? 0.35 : input.stats.avgScore <= 25 ? -0.25 : 0;
  const survivalMomentum = input.stats.population >= 10 ? 0.2 : populationPressure > 0 ? -0.35 : 0;
  const momentum = clamp01(0.5 + goodPressure + apexPressure + scoreMomentum + survivalMomentum - dangerPressure - entropyPressure * 0.5 - strainPressure * 0.35);

  let kind: RunEndgameForecastKind = 'STABLE_DRIFT';
  let title = '稳态收束';
  let detail = '当前信号没有明显单边倾斜，本局更像在稳定筛选中收尾。';
  let tone: WorldEvent['severity'] = 'info';

  if (populationPressure >= 0.9 || (dangerEvents >= 3 && strainedEntities >= Math.max(2, input.entities.length * 0.18))) {
    kind = 'EXTINCTION';
    title = '灭绝线逼近';
    detail = '低种群、危机事件或濒压实体正在叠加，终局更可能走向崩塌。';
    tone = 'danger';
  } else if (apexCandidates >= 2 || recent.some((event) => event.kind === 'FIRST_APEX' || event.kind === 'HALL_OF_FAME')) {
    kind = 'APEX_BREAKOUT';
    title = '顶点突破窗口';
    detail = '高分个体或顶点事件已经出现，后半局可能围绕主角谱系收束。';
    tone = 'good';
  } else if (goodEvents >= dangerEvents + 2 && input.stats.population >= 6 && input.stats.avgScore >= 48) {
    kind = 'GOLDEN_AGE';
    title = '黄金时代倾向';
    detail = '繁荣/协作事件占优，种群和均分仍能支撑一次正反馈收尾。';
    tone = 'good';
  } else if (dangerEvents + goodEvents >= 5 && Math.abs(dangerEvents - goodEvents) <= 1) {
    kind = 'VOLATILE';
    title = '高波动结局';
    detail = '繁荣和危机信号同时密集，本局更像会在最后几轮突然转向。';
    tone = 'warning';
  }

  const intervention = suggestedIntervention(kind, dangerEvents, goodEvents);
  const forecastConfidence = confidence(momentum - 0.5, recent.length, remainingRatio);

  return {
    kind,
    title,
    detail,
    tone,
    confidence: forecastConfidence,
    momentum,
    suggestedIntervention: intervention,
    evidence: [
      `phase=${session.phase}`,
      `remaining=${Math.round(remainingMs / 1000)}s`,
      `good=${goodEvents}`,
      `danger=${dangerEvents}`,
      `apex=${apexCandidates}`,
      `strained=${strainedEntities}`,
      `P=${input.stats.population}`,
      `S=${input.stats.avgScore.toFixed(1)}`,
      `E=${input.stats.entropy.toFixed(1)}%`,
    ].join(' / '),
    metrics: {
      remainingMs,
      population: input.stats.population,
      avgScore: input.stats.avgScore,
      entropy: input.stats.entropy,
      dangerEvents,
      goodEvents,
      apexCandidates,
      strainedEntities,
    },
  };
}
