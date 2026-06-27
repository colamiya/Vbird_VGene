import type {
  EntityView,
  InterventionTrace,
  MealRhythmCue,
  PinnedSpecimen,
  PlayerInterventionKind,
  RunObjective,
  RunSession,
  WorldEvent,
  WorldStats,
} from '../types/world';
import type { AudioEvent } from './audio/types';
import type { DirectorCue } from './directorCues';
import type { ExperienceDirectorCue } from './experienceDirector';
import type { OracleAdvice } from './oracleAdvice';
import { isActiveInterventionKind } from './interventionKinds';

export type ActiveMomentSource =
  | 'selected-entity'
  | 'intervention-trace'
  | 'pinned-specimen'
  | 'director-cue'
  | 'experience-cue'
  | 'oracle-advice'
  | 'objective'
  | 'meal-rhythm'
  | 'world-event';

export interface ActiveMoment {
  id: string;
  source: ActiveMomentSource;
  title: string;
  detail: string;
  evidence: string;
  tone: WorldEvent['severity'];
  priority: number;
  updatedAt: number;
  suggestedIntervention?: PlayerInterventionKind;
  audioEvent?: AudioEvent | null;
  target?: {
    entityId?: number;
    eventId?: string;
    objectiveId?: string;
    traceId?: string;
    point?: [number, number, number];
  };
}

interface ActiveMomentInput {
  session: RunSession | null;
  stats: WorldStats;
  entities: EntityView[];
  isRunning: boolean;
  now: number;
  selectedEntity?: EntityView | null;
  pinnedSpecimen?: PinnedSpecimen | null;
  latestEvent?: WorldEvent | null;
  directorCue?: DirectorCue | null;
  experienceCue?: ExperienceDirectorCue | null;
  oracleAdvice?: OracleAdvice | null;
  objectives: readonly RunObjective[];
  traces: readonly InterventionTrace[];
  mealRhythm?: MealRhythmCue | null;
}

const sourceLabel: Record<ActiveMomentSource, string> = {
  'selected-entity': '玩家锁定',
  'intervention-trace': '手痕追踪',
  'pinned-specimen': '钉选样本',
  'director-cue': '导演切镜',
  'experience-cue': '体验节拍',
  'oracle-advice': '神谕建议',
  objective: '局内目标',
  'meal-rhythm': '下饭节奏',
  'world-event': '世界事件',
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function toneFromDirector(tone: DirectorCue['tone']): WorldEvent['severity'] {
  if (tone === 'danger') return 'danger';
  if (tone === 'warning') return 'warning';
  if (tone === 'growth' || tone === 'ascend') return 'good';
  return 'info';
}

function toneFromExperience(tone: ExperienceDirectorCue['tone']): WorldEvent['severity'] {
  if (tone === 'danger' || tone === 'void') return 'danger';
  if (tone === 'triumph') return 'good';
  if (tone === 'momentum') return 'warning';
  return 'info';
}

function severityBoost(tone: WorldEvent['severity']) {
  if (tone === 'danger') return 18;
  if (tone === 'warning') return 10;
  if (tone === 'good') return 8;
  return 0;
}

function formatEntity(entity: EntityView) {
  return `#${entity.id} / S ${entity.score.toFixed(1)} / E ${entity.energy.toFixed(1)} / T ${(entity.metabolic_toxin * 100).toFixed(1)}%`;
}

function findEntity(entities: EntityView[], entityId?: number) {
  if (typeof entityId !== 'number') return null;
  return entities.find((entity) => entity.id === entityId) ?? null;
}

function latestTrace(traces: readonly InterventionTrace[], now: number) {
  return traces
    .slice()
    .reverse()
    .find((trace) =>
      isActiveInterventionKind(trace.kind) &&
      trace.metrics.affected > 0 &&
      now - trace.startedAt <= 90_000,
    ) ?? null;
}

function topObjective(objectives: readonly RunObjective[]) {
  return objectives
    .slice()
    .sort((left, right) => {
      const leftTerminal = left.status === 'complete' || left.status === 'failed' ? 1 : 0;
      const rightTerminal = right.status === 'complete' || right.status === 'failed' ? 1 : 0;
      return rightTerminal - leftTerminal || right.progress - left.progress;
    })[0] ?? null;
}

function addSourcePrefix(moment: ActiveMoment): ActiveMoment {
  return {
    ...moment,
    evidence: `${sourceLabel[moment.source]} / ${moment.evidence}`,
  };
}

export function deriveActiveMoment(input: ActiveMomentInput): ActiveMoment | null {
  if (!input.session) return null;

  const candidates: ActiveMoment[] = [];

  if (input.selectedEntity) {
    candidates.push({
      id: `selected-${input.selectedEntity.id}-${Math.round(input.selectedEntity.score * 10)}`,
      source: 'selected-entity',
      title: `锁定实体 #${input.selectedEntity.id}`,
      detail: '玩家正在检查这个数字生命，场内镜头与操作反馈优先围绕它展开。',
      evidence: formatEntity(input.selectedEntity),
      tone: input.selectedEntity.energy <= 18 || input.selectedEntity.metabolic_toxin >= 0.78 ? 'danger' : 'info',
      priority: 120,
      updatedAt: input.now,
      target: { entityId: input.selectedEntity.id },
    });
  }

  const trace = latestTrace(input.traces, input.now);
  if (trace) {
    const entityId = trace.entityId ?? trace.affectedEntityIds[0];
    candidates.push({
      id: `${trace.id}-${trace.status}-${trace.metrics.alive}-${trace.metrics.lost}-${trace.metrics.rescued}-${trace.metrics.harmed}`,
      source: 'intervention-trace',
      title: trace.title,
      detail: trace.detail,
      evidence: trace.evidence,
      tone: trace.tone,
      priority: 108 + severityBoost(trace.tone) + (trace.status === 'RESOLVED' ? 8 : 0),
      updatedAt: trace.updatedAt,
      suggestedIntervention: trace.kind,
      audioEvent: trace.status === 'RESOLVED' ? 'fate_resolved' : null,
      target: {
        entityId,
        traceId: trace.id,
        point: trace.point,
      },
    });
  }

  if (input.pinnedSpecimen) {
    const entity = findEntity(input.entities, input.pinnedSpecimen.entityId);
    candidates.push({
      id: `pinned-${input.pinnedSpecimen.entityId}-${input.pinnedSpecimen.lastSeenAt}`,
      source: 'pinned-specimen',
      title: entity ? `跟住样本 #${entity.id}` : `样本 #${input.pinnedSpecimen.entityId} 失联`,
      detail: entity
        ? '钉选样本仍在场，适合观察它是否把玩家手痕带入下一段文明走势。'
        : '钉选样本已经不在当前快照，观察其空位是否被新谱系继承。',
      evidence: entity
        ? formatEntity(entity)
        : `lastSeen=${new Date(input.pinnedSpecimen.lastSeenAt).toLocaleTimeString('zh-CN', { hour12: false })} / snapshots=${input.pinnedSpecimen.snapshots.length}`,
      tone: entity ? (entity.score >= 80 ? 'good' : entity.energy <= 20 ? 'warning' : 'info') : 'warning',
      priority: entity ? 96 : 88,
      updatedAt: input.pinnedSpecimen.lastSeenAt,
      suggestedIntervention: 'PIN_OBSERVE',
      target: { entityId: entity?.id },
    });
  }

  if (input.directorCue) {
    const tone = toneFromDirector(input.directorCue.tone);
    candidates.push({
      id: `director-${input.directorCue.id}-${input.directorCue.entityId ?? 'world'}`,
      source: 'director-cue',
      title: input.directorCue.title,
      detail: input.directorCue.directive,
      evidence: input.directorCue.evidence,
      tone,
      priority: 70 + severityBoost(tone) + Math.round(input.directorCue.confidence * 12),
      updatedAt: input.directorCue.updatedAt,
      target: { entityId: input.directorCue.entityId },
    });
  }

  if (input.experienceCue) {
    const tone = toneFromExperience(input.experienceCue.tone);
    candidates.push({
      id: `experience-${input.experienceCue.id}`,
      source: 'experience-cue',
      title: input.experienceCue.title,
      detail: input.experienceCue.subtitle,
      evidence: input.experienceCue.evidence,
      tone,
      priority: 62 + severityBoost(tone) + Math.round(input.experienceCue.intensity * 14),
      updatedAt: input.now,
      suggestedIntervention: input.experienceCue.recommendedIntervention,
      audioEvent: input.experienceCue.audioEvent,
    });
  }

  if (input.oracleAdvice) {
    const urgencyBoost = input.oracleAdvice.urgency === 'high' ? 20 : input.oracleAdvice.urgency === 'medium' ? 8 : 0;
    candidates.push({
      id: `oracle-${input.oracleAdvice.kind}-${input.oracleAdvice.urgency}-${Math.round(input.oracleAdvice.confidence * 100)}`,
      source: 'oracle-advice',
      title: input.oracleAdvice.title,
      detail: input.oracleAdvice.detail,
      evidence: input.oracleAdvice.evidence,
      tone: input.oracleAdvice.urgency === 'high' ? 'warning' : 'info',
      priority: 54 + urgencyBoost + Math.round(input.oracleAdvice.confidence * 10),
      updatedAt: input.now,
      suggestedIntervention: input.oracleAdvice.kind,
    });
  }

  const objective = topObjective(input.objectives);
  if (objective) {
    const terminalBoost = objective.status === 'complete' || objective.status === 'failed' ? 18 : 0;
    candidates.push({
      id: `objective-${objective.id}-${objective.status}-${Math.round(objective.progress * 100)}`,
      source: 'objective',
      title: objective.title,
      detail: objective.detail,
      evidence: objective.evidence,
      tone: objective.tone,
      priority: 45 + terminalBoost + severityBoost(objective.tone) + Math.round(clamp01(objective.progress) * 16),
      updatedAt: input.now,
      target: { objectiveId: objective.id },
    });
  }

  if (input.mealRhythm && (input.mealRhythm.action === 'INTERVENE' || input.mealRhythm.action === 'MARK')) {
    candidates.push({
      id: `rhythm-${input.mealRhythm.id}-${input.mealRhythm.action}`,
      source: 'meal-rhythm',
      title: input.mealRhythm.title,
      detail: input.mealRhythm.prompt,
      evidence: input.mealRhythm.evidence,
      tone: input.mealRhythm.tone,
      priority: 50 + severityBoost(input.mealRhythm.tone),
      updatedAt: input.mealRhythm.timestamp,
      suggestedIntervention: input.mealRhythm.suggestedIntervention,
    });
  }

  if (input.latestEvent && input.latestEvent.kind !== 'RUN_STARTED') {
    candidates.push({
      id: `event-${input.latestEvent.id}`,
      source: 'world-event',
      title: input.latestEvent.title,
      detail: input.latestEvent.detail,
      evidence: [
        `kind=${input.latestEvent.kind}`,
        `phase=${input.latestEvent.phase}`,
        typeof input.latestEvent.metric === 'number' ? `metric=${input.latestEvent.metric.toFixed(2)}` : null,
        `P=${input.stats.population}`,
      ].filter(Boolean).join(' / '),
      tone: input.latestEvent.severity,
      priority: 42 + severityBoost(input.latestEvent.severity),
      updatedAt: input.latestEvent.timestamp,
      suggestedIntervention: input.latestEvent.intervention?.kind,
      target: {
        entityId: input.latestEvent.entityId,
        eventId: input.latestEvent.id,
      },
    });
  }

  const best = candidates
    .sort((left, right) => right.priority - left.priority || right.updatedAt - left.updatedAt)[0] ?? null;

  if (!best || (!input.isRunning && best.source !== 'selected-entity')) return best ? addSourcePrefix({ ...best, priority: best.priority - 8 }) : null;
  return addSourcePrefix(best);
}
