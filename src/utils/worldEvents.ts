import type {
  EntityView,
  InterventionOutcome,
  RunPhase,
  RunSession,
  WorldEvent,
  WorldEventKind,
  WorldStats,
} from '../types/world';
import { formatRunPhase } from './runSession';

const EVENT_LIMIT = 100;
const REVIEW_EVENT_LIMIT = 30;
const EVENT_COOLDOWN_MS = 30_000;
const NATURAL_EVENT_WARMUP_MS = 12_000;
const PERSISTENT_SIGNAL_MS = 30_000;
const EVIDENCE_WINDOW_MS = 30_000;
const EVIDENCE_MIN_SAMPLES = 5;
const EVIDENCE_MIN_SPAN_MS = 3_000;
const NON_NATURAL_EVENT_KINDS = new Set<WorldEventKind>([
  'RUN_STARTED',
  'RUN_ENDED',
  'PHASE_SHIFT',
  'PLAYER_BLESSING',
  'PLAYER_POISON',
  'PLAYER_QUARANTINE',
  'PLAYER_EXILE',
  'PINNED_OBSERVATION',
]);

export interface WorldEventEvidenceSample {
  timestamp: number;
  phase: RunPhase;
  population: number;
  avgScore: number;
  avgGeneration: number;
  avgEnergy: number;
  avgToxin: number;
  cooperation: number;
  apexScore: number;
  apexEntityId?: number;
  predatorScore: number;
  predatorId?: number;
}

export function createWorldEvent(args: {
  kind: WorldEventKind;
  title: string;
  detail: string;
  phase: RunPhase;
  timestamp?: number;
  severity?: WorldEvent['severity'];
  entityId?: number;
  metric?: number;
  intervention?: InterventionOutcome;
}): WorldEvent {
  const timestamp = args.timestamp ?? Date.now();
  return {
    id: `${args.kind}-${timestamp}-${Math.floor(Math.random() * 100000)}`,
    kind: args.kind,
    title: args.title,
    detail: args.detail,
    timestamp,
    phase: args.phase,
    severity: args.severity ?? 'info',
    entityId: args.entityId,
    metric: args.metric,
    intervention: args.intervention,
  };
}

export function isNaturalWorldEvent(event: Pick<WorldEvent, 'kind'>) {
  return !NON_NATURAL_EVENT_KINDS.has(event.kind);
}

export function naturalWorldEvents(events: WorldEvent[]) {
  return events.filter(isNaturalWorldEvent);
}

function hasRecentEvent(events: WorldEvent[], kind: WorldEventKind, now: number, cooldown = EVENT_COOLDOWN_MS) {
  return events.some((event) => event.kind === kind && now - event.timestamp < cooldown);
}

function hasEverEvent(events: WorldEvent[], kind: WorldEventKind) {
  return events.some((event) => event.kind === kind);
}

function averageToxin(entities: EntityView[]) {
  if (entities.length === 0) return 0;
  return entities.reduce((sum, entity) => sum + entity.metabolic_toxin, 0) / entities.length;
}

function averageEnergy(entities: EntityView[]) {
  if (entities.length === 0) return 0;
  return entities.reduce((sum, entity) => sum + entity.energy, 0) / entities.length;
}

function maxGeneration(entities: EntityView[]) {
  if (entities.length === 0) return 0;
  return entities.reduce((max, entity) => Math.max(max, entity.generation), 0);
}

function maxScore(entities: EntityView[]) {
  if (entities.length === 0) return 0;
  return entities.reduce((max, entity) => Math.max(max, entity.score), 0);
}

function cooperationRatio(entities: EntityView[]) {
  if (entities.length === 0) return 0;
  const cooperators = entities.filter(
    (entity) => entity.ethics.altruism > 0.7 && entity.ethics.collaboration > 0.6,
  );
  return cooperators.length / entities.length;
}

function findApexEntity(entities: EntityView[]) {
  return entities.reduce<EntityView | null>((best, entity) => {
    if (entity.score < 80) return best;
    if (!best || entity.score > best.score) return entity;
    return best;
  }, null);
}

function findPredatorEntity(entities: EntityView[]) {
  return entities.reduce<EntityView | null>((best, entity) => {
    const predatorScore = entity.score >= 70 && entity.ethics.altruism < 0.22;
    if (!predatorScore) return best;
    if (!best || entity.score > best.score) return entity;
    return best;
  }, null);
}

function findLineageFounder(entities: EntityView[], previousEntities: EntityView[]) {
  const previousMaxGeneration = maxGeneration(previousEntities);
  return entities.reduce<EntityView | null>((best, entity) => {
    const founderSignal = entity.generation >= previousMaxGeneration + 4 && entity.score >= 60;
    if (!founderSignal) return best;
    if (!best || entity.generation > best.generation || entity.score > best.score) return entity;
    return best;
  }, null);
}

export function createWorldEventEvidenceSample(args: {
  timestamp?: number;
  phase: RunPhase;
  stats: WorldStats;
  entities: EntityView[];
}): WorldEventEvidenceSample {
  const apex = findApexEntity(args.entities);
  const predator = findPredatorEntity(args.entities);
  return {
    timestamp: args.timestamp ?? Date.now(),
    phase: args.phase,
    population: args.stats.population,
    avgScore: args.stats.avgScore,
    avgGeneration: args.stats.avgGeneration,
    avgEnergy: averageEnergy(args.entities),
    avgToxin: averageToxin(args.entities),
    cooperation: cooperationRatio(args.entities),
    apexScore: apex?.score ?? maxScore(args.entities),
    apexEntityId: apex?.id,
    predatorScore: predator?.score ?? 0,
    predatorId: predator?.id,
  };
}

export function compactWorldEventEvidence(
  samples: WorldEventEvidenceSample[],
  next: WorldEventEvidenceSample,
  session: RunSession,
) {
  const maxAgeMs = Math.max(EVIDENCE_WINDOW_MS, Math.min(session.targetDurationMs * 0.08, 90_000));
  return [...samples, next]
    .filter((sample) => next.timestamp - sample.timestamp <= maxAgeMs)
    .slice(-160);
}

function evidenceWindow(samples: WorldEventEvidenceSample[] | undefined, now: number) {
  if (!samples || samples.length === 0) return [];
  return samples.filter((sample) => sample.timestamp <= now && now - sample.timestamp <= EVIDENCE_WINDOW_MS);
}

function isEvidenceReady(samples: WorldEventEvidenceSample[]) {
  if (samples.length < EVIDENCE_MIN_SAMPLES) return false;
  return samples[samples.length - 1].timestamp - samples[0].timestamp >= EVIDENCE_MIN_SPAN_MS;
}

function isMostlyRising(samples: WorldEventEvidenceSample[], selector: (sample: WorldEventEvidenceSample) => number, epsilon = 0) {
  let rising = 0;
  let falling = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const delta = selector(samples[index]) - selector(samples[index - 1]);
    if (delta > epsilon) rising += 1;
    if (delta < -epsilon) falling += 1;
  }
  return rising >= falling;
}

function isMostlyFalling(samples: WorldEventEvidenceSample[], selector: (sample: WorldEventEvidenceSample) => number, epsilon = 0) {
  let rising = 0;
  let falling = 0;
  for (let index = 1; index < samples.length; index += 1) {
    const delta = selector(samples[index]) - selector(samples[index - 1]);
    if (delta > epsilon) rising += 1;
    if (delta < -epsilon) falling += 1;
  }
  return falling >= rising;
}

function stableEntitySamples(samples: WorldEventEvidenceSample[], selector: (sample: WorldEventEvidenceSample) => number | undefined, entityId: number) {
  return samples.filter((sample) => selector(sample) === entityId).length;
}

export function deriveWorldEvents(args: {
  session: RunSession;
  previousStats: WorldStats | null;
  previousEntities: EntityView[];
  stats: WorldStats;
  entities: EntityView[];
  previousPhase: RunPhase;
  phase: RunPhase;
  existingEvents: WorldEvent[];
  evidence?: WorldEventEvidenceSample[];
  timestamp?: number;
}) {
  const now = args.timestamp ?? Date.now();
  const next: WorldEvent[] = [];
  const elapsedMs = Math.max(0, now - args.session.startedAt);
  const evidence = evidenceWindow(args.evidence, now);
  const evidenceReady = isEvidenceReady(evidence);
  const oldestEvidence = evidence[0];
  const latestEvidence = evidence[evidence.length - 1];
  const hasObservationWindow = Boolean(args.previousStats) &&
    args.previousEntities.length > 0 &&
    elapsedMs >= NATURAL_EVENT_WARMUP_MS &&
    (!args.evidence || evidenceReady);
  const hasPersistentWindow = elapsedMs >= PERSISTENT_SIGNAL_MS;

  if (args.previousPhase !== args.phase && !hasRecentEvent(args.existingEvents, 'PHASE_SHIFT', now, 2_000)) {
    next.push(createWorldEvent({
      kind: 'PHASE_SHIFT',
      title: `文明进入${formatRunPhase(args.phase)}期`,
      detail: `局内阶段从${formatRunPhase(args.previousPhase)}推进到${formatRunPhase(args.phase)}。`,
      phase: args.phase,
      timestamp: now,
      severity: args.phase === 'CRISIS' ? 'warning' : args.phase === 'ASCENSION' ? 'good' : 'info',
    }));
  }

  if (args.entities.length === 0) return next;

  const apex = findApexEntity(args.entities);
  const previousMaxScore = evidenceReady && oldestEvidence ? oldestEvidence.apexScore : maxScore(args.previousEntities);
  const apexStable = apex && evidenceReady
    ? stableEntitySamples(evidence, (sample) => sample.apexEntityId, apex.id) >= 2
    : Boolean(apex);
  if (
    apex &&
    apexStable &&
    hasObservationWindow &&
    (previousMaxScore < 80 || hasPersistentWindow) &&
    !hasEverEvent(args.existingEvents, 'FIRST_APEX')
  ) {
    next.push(createWorldEvent({
      kind: 'FIRST_APEX',
      title: `#${apex.id} 成为首个高适应体`,
      detail: `实体 #${apex.id} 适应度达到 ${apex.score.toFixed(1)}，上一观测窗口最高为 ${previousMaxScore.toFixed(1)}，开始形成资源吸引力。`,
      phase: args.phase,
      timestamp: now,
      severity: 'good',
      entityId: apex.id,
      metric: apex.score,
    }));
  }

  if (
    (args.previousStats || evidenceReady) &&
    hasObservationWindow &&
    (evidenceReady && oldestEvidence && latestEvidence
      ? oldestEvidence.population >= 20 &&
        latestEvidence.population < oldestEvidence.population * 0.75 &&
        isMostlyFalling(evidence, (sample) => sample.population)
      : Boolean(args.previousStats) &&
        args.previousStats!.population >= 20 &&
        args.stats.population < args.previousStats!.population * 0.75) &&
    !hasRecentEvent(args.existingEvents, 'MASS_EXTINCTION', now)
  ) {
    const previousPopulation = oldestEvidence?.population ?? args.previousStats?.population ?? args.stats.population;
    next.push(createWorldEvent({
      kind: 'MASS_EXTINCTION',
      title: '种群发生大规模消亡',
      detail: `种群从 ${previousPopulation} 降至 ${args.stats.population}，演化压力正在重塑谱系。`,
      phase: args.phase,
      timestamp: now,
      severity: 'danger',
      metric: args.stats.population,
    }));
  }

  const toxin = averageToxin(args.entities);
  const previousToxin = oldestEvidence?.avgToxin ?? averageToxin(args.previousEntities);
  const toxinRising = evidenceReady ? isMostlyRising(evidence, (sample) => sample.avgToxin, 0.005) : true;
  const toxinCrossed = (previousToxin < 0.55 || toxin >= previousToxin + 0.08 || hasPersistentWindow) && toxinRising;
  if (
    toxin >= 0.65 &&
    hasObservationWindow &&
    toxinCrossed &&
    !hasRecentEvent(args.existingEvents, 'TOXIN_CRISIS', now)
  ) {
    next.push(createWorldEvent({
      kind: 'TOXIN_CRISIS',
      title: '代谢毒素进入危机区',
      detail: `实体平均毒素从 ${(previousToxin * 100).toFixed(1)}% 到 ${(toxin * 100).toFixed(1)}%，低效逻辑正在污染生存环境。`,
      phase: args.phase,
      timestamp: now,
      severity: 'warning',
      metric: toxin,
    }));
  }

  const cooperation = cooperationRatio(args.entities);
  const previousCooperation = oldestEvidence?.cooperation ?? cooperationRatio(args.previousEntities);
  const cooperationRising = evidenceReady ? isMostlyRising(evidence, (sample) => sample.cooperation, 0.005) : true;
  const cooperationCrossed = (previousCooperation < 0.25 || cooperation >= previousCooperation + 0.08 || hasPersistentWindow) && cooperationRising;
  if (
    args.entities.length >= 10 &&
    cooperation >= 0.35 &&
    hasObservationWindow &&
    cooperationCrossed &&
    !hasRecentEvent(args.existingEvents, 'COOPERATION_CLUSTER', now)
  ) {
    next.push(createWorldEvent({
      kind: 'COOPERATION_CLUSTER',
      title: '协作集群形成',
      detail: `协作比例从 ${Math.round(previousCooperation * 100)}% 到 ${Math.round(cooperation * 100)}%，文明互助网络开始出现。`,
      phase: args.phase,
      timestamp: now,
      severity: 'good',
      metric: cooperation,
    }));
  }

  const predator = findPredatorEntity(args.entities);
  const previousPredator = findPredatorEntity(args.previousEntities);
  const predatorStable = predator && evidenceReady
    ? stableEntitySamples(evidence, (sample) => sample.predatorId, predator.id) >= 2
    : Boolean(predator);
  const predatorCrossed = predator
    ? !previousPredator || predator.score >= previousPredator.score + 4 || hasPersistentWindow
    : false;
  if (
    predator &&
    predatorStable &&
    hasObservationWindow &&
    predatorCrossed &&
    !hasRecentEvent(args.existingEvents, 'PREDATOR_RAID', now)
  ) {
    next.push(createWorldEvent({
      kind: 'PREDATOR_RAID',
      title: `#${predator.id} 进入掠食态`,
      detail: `实体 #${predator.id} 高适应度且低利他，上一观测窗口${previousPredator ? `最强掠食候选 #${previousPredator.id} 为 ${previousPredator.score.toFixed(1)}` : '尚无掠食候选'}，可能压制周边谱系。`,
      phase: args.phase,
      timestamp: now,
      severity: 'warning',
      entityId: predator.id,
      metric: predator.score,
    }));
  }

  if (
    (args.previousStats || evidenceReady) &&
    hasObservationWindow &&
    (evidenceReady && oldestEvidence && latestEvidence
      ? oldestEvidence.population >= 10 &&
        latestEvidence.population >= oldestEvidence.population * 1.28 &&
        isMostlyRising(evidence, (sample) => sample.population)
      : Boolean(args.previousStats) &&
        args.previousStats!.population >= 10 &&
        args.stats.population >= args.previousStats!.population * 1.28) &&
    averageEnergy(args.entities) >= 55 &&
    !hasRecentEvent(args.existingEvents, 'RESOURCE_BLOOM', now)
  ) {
    const previousPopulation = oldestEvidence?.population ?? args.previousStats?.population ?? args.stats.population;
    next.push(createWorldEvent({
      kind: 'RESOURCE_BLOOM',
      title: '资源潮推动扩张',
      detail: `种群从 ${previousPopulation} 扩张到 ${args.stats.population}，高能量实体开始填满局部生态位。`,
      phase: args.phase,
      timestamp: now,
      severity: 'good',
      metric: args.stats.population,
    }));
  }

  const energy = averageEnergy(args.entities);
  const previousEnergy = oldestEvidence?.avgEnergy ?? averageEnergy(args.previousEntities);
  const energyFalling = evidenceReady ? isMostlyFalling(evidence, (sample) => sample.avgEnergy, 0.4) : true;
  const energyCrossed = (previousEnergy > 24 || energy <= previousEnergy - 8 || hasPersistentWindow) && energyFalling;
  if (
    args.entities.length >= 10 &&
    energy <= 18 &&
    hasObservationWindow &&
    energyCrossed &&
    !hasRecentEvent(args.existingEvents, 'ENERGY_FAMINE', now)
  ) {
    next.push(createWorldEvent({
      kind: 'ENERGY_FAMINE',
      title: '能量饥荒出现',
      detail: `实体平均能量从 ${previousEnergy.toFixed(1)}% 降至 ${energy.toFixed(1)}%，文明进入低燃料生存态。`,
      phase: args.phase,
      timestamp: now,
      severity: 'danger',
      metric: energy,
    }));
  }

  if (
    args.previousStats &&
    hasObservationWindow &&
    Math.floor(args.stats.avgGeneration / 5) > Math.floor(args.previousStats.avgGeneration / 5) &&
    !hasRecentEvent(args.existingEvents, 'GENERATION_LEAP', now, 12_000)
  ) {
    next.push(createWorldEvent({
      kind: 'GENERATION_LEAP',
      title: `第 ${Math.floor(args.stats.avgGeneration)} 纪元被跨越`,
      detail: `平均世代从 ${args.previousStats.avgGeneration.toFixed(1)} 推进到 ${args.stats.avgGeneration.toFixed(1)}，旧代策略被新谱系覆盖。`,
      phase: args.phase,
      timestamp: now,
      severity: 'info',
      metric: args.stats.avgGeneration,
    }));
  }

  const founder = findLineageFounder(args.entities, args.previousEntities);
  if (founder && hasObservationWindow && !hasRecentEvent(args.existingEvents, 'LINEAGE_FOUNDER', now)) {
    next.push(createWorldEvent({
      kind: 'LINEAGE_FOUNDER',
      title: `#${founder.id} 开创新谱系`,
      detail: `实体 #${founder.id} 抵达第 ${founder.generation} 代且适应度 ${founder.score.toFixed(1)}，具备成为新主干的信号。`,
      phase: args.phase,
      timestamp: now,
      severity: 'good',
      entityId: founder.id,
      metric: founder.generation,
    }));
  }

  if (
    (args.previousStats || evidenceReady) &&
    hasObservationWindow &&
    (evidenceReady && oldestEvidence && latestEvidence
      ? latestEvidence.avgScore >= oldestEvidence.avgScore + 12 &&
        latestEvidence.population >= Math.max(8, oldestEvidence.population * 0.9) &&
        isMostlyRising(evidence, (sample) => sample.avgScore, 0.2)
      : Boolean(args.previousStats) &&
        args.stats.avgScore >= args.previousStats!.avgScore + 12 &&
        args.stats.population >= Math.max(8, args.previousStats!.population * 0.9)) &&
    !hasRecentEvent(args.existingEvents, 'GOLDEN_AGE', now)
  ) {
    const previousScore = oldestEvidence?.avgScore ?? args.previousStats?.avgScore ?? args.stats.avgScore;
    next.push(createWorldEvent({
      kind: 'GOLDEN_AGE',
      title: '短暂黄金时代',
      detail: `平均适应度跃升 ${Math.max(0, args.stats.avgScore - previousScore).toFixed(1)}，且种群未同步崩塌。`,
      phase: args.phase,
      timestamp: now,
      severity: 'good',
      metric: args.stats.avgScore,
    }));
  }

  return next;
}

export function mergeWorldEvents(events: WorldEvent[], next: WorldEvent[], limit = EVENT_LIMIT) {
  if (next.length === 0) return events;
  return [...events, ...next]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-limit);
}

export function selectReviewEvents(events: WorldEvent[], limit = REVIEW_EVENT_LIMIT) {
  const weighted = events
    .filter((event) => event.kind !== 'RUN_STARTED')
    .map((event) => ({
      event,
      weight: event.severity === 'danger' ? 4 : event.severity === 'warning' ? 3 : event.severity === 'good' ? 2 : 1,
    }))
    .sort((a, b) => b.weight - a.weight || a.event.timestamp - b.event.timestamp)
    .slice(0, limit)
    .map((item) => item.event)
    .sort((a, b) => a.timestamp - b.timestamp);
  return weighted;
}
