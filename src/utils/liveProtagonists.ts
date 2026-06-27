import type {
  EntityView,
  LiveProtagonistCandidate,
  LiveProtagonistRadar,
  LiveProtagonistRole,
  PlayerInterventionKind,
  WorldEvent,
  WorldStats,
} from '../types/world';

interface LiveProtagonistInput {
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
}

interface CandidateDraft {
  role: LiveProtagonistRole;
  entity: EntityView;
  score: number;
  confidence: number;
  tone: WorldEvent['severity'];
  suggestedIntervention: PlayerInterventionKind;
  eventSignal: number;
}

const ROLE_ORDER: LiveProtagonistRole[] = ['APEX', 'CARETAKER', 'SURVIVOR', 'THREAT'];

const ROLE_LABEL: Record<LiveProtagonistRole, string> = {
  APEX: '顶点主角',
  CARETAKER: '协作看护者',
  SURVIVOR: '瓶颈幸存者',
  THREAT: '压力源',
};

const ROLE_INTERVENTION: Record<LiveProtagonistRole, PlayerInterventionKind> = {
  APEX: 'PIN_OBSERVE',
  CARETAKER: 'BLESS',
  SURVIVOR: 'QUARANTINE',
  THREAT: 'EXILE',
};

const ROLE_EVENTS: Record<LiveProtagonistRole, WorldEvent['kind'][]> = {
  APEX: ['FIRST_APEX', 'HALL_OF_FAME', 'LINEAGE_FOUNDER', 'GENERATION_LEAP'],
  CARETAKER: ['COOPERATION_CLUSTER', 'RESOURCE_BLOOM', 'GOLDEN_AGE'],
  SURVIVOR: ['MASS_EXTINCTION', 'ENERGY_FAMINE', 'PLAYER_QUARANTINE', 'PLAYER_BLESSING'],
  THREAT: ['PREDATOR_RAID', 'TOXIN_CRISIS', 'PLAYER_EXILE', 'PLAYER_POISON'],
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function average(entities: EntityView[], selector: (entity: EntityView) => number) {
  if (entities.length === 0) return 0;
  return entities.reduce((sum, entity) => sum + selector(entity), 0) / entities.length;
}

function recentEvents(events: WorldEvent[]) {
  return events
    .filter((event) => event.kind !== 'RUN_STARTED')
    .slice(-18);
}

function eventSignal(events: WorldEvent[], role: LiveProtagonistRole, entityId: number) {
  const kinds = ROLE_EVENTS[role];
  const recent = recentEvents(events);
  if (recent.length === 0) return 0;

  return recent.reduce((best, event, index) => {
    if (!kinds.includes(event.kind)) return best;
    const recency = (index + 1) / recent.length;
    const entityMatch = typeof event.entityId !== 'number' ? 0.62 : event.entityId === entityId ? 1 : 0.3;
    return Math.max(best, clamp01((0.35 + recency * 0.65) * entityMatch));
  }, 0);
}

function entityMetrics(entity: EntityView) {
  return {
    fitness: entity.score,
    energy: entity.energy,
    toxin: entity.metabolic_toxin,
    generation: entity.generation,
    altruism: entity.ethics.altruism,
    collaboration: entity.ethics.collaboration,
  };
}

function titleFor(role: LiveProtagonistRole, entity: EntityView) {
  return `${ROLE_LABEL[role]} #${entity.id}`;
}

function detailFor(role: LiveProtagonistRole, entity: EntityView, stats: WorldStats) {
  if (role === 'APEX') {
    return `适应度 ${entity.score.toFixed(1)} 高于均值 ${stats.avgScore.toFixed(1)}，世代 ${entity.generation} 正在抢镜。`;
  }
  if (role === 'CARETAKER') {
    return `利他 ${entity.ethics.altruism.toFixed(2)}、协作 ${entity.ethics.collaboration.toFixed(2)}，适合观察互助扩散。`;
  }
  if (role === 'SURVIVOR') {
    return `能量 ${entity.energy.toFixed(1)}、毒素 ${(entity.metabolic_toxin * 100).toFixed(1)}%，适合看瓶颈火种能否续命。`;
  }
  return `高压指标突出，适应度 ${entity.score.toFixed(1)}、毒素 ${(entity.metabolic_toxin * 100).toFixed(1)}%，可能触发冲突。`;
}

function evidenceFor(draft: CandidateDraft, stats: WorldStats) {
  const entity = draft.entity;
  return [
    `role=${draft.role}`,
    `id=${entity.id}`,
    `radar=${draft.score}`,
    `conf=${draft.confidence}%`,
    `S=${entity.score.toFixed(1)}/${stats.avgScore.toFixed(1)}`,
    `G=${entity.generation}/${stats.avgGeneration.toFixed(1)}`,
    `E=${entity.energy.toFixed(1)}`,
    `T=${(entity.metabolic_toxin * 100).toFixed(1)}%`,
    `event=${Math.round(draft.eventSignal * 100)}%`,
  ].join(' / ');
}

function toCandidate(draft: CandidateDraft, stats: WorldStats): LiveProtagonistCandidate {
  return {
    role: draft.role,
    entityId: draft.entity.id,
    title: titleFor(draft.role, draft.entity),
    detail: detailFor(draft.role, draft.entity, stats),
    tone: draft.tone,
    score: draft.score,
    confidence: draft.confidence,
    suggestedIntervention: draft.suggestedIntervention,
    evidence: evidenceFor(draft, stats),
    metrics: entityMetrics(draft.entity),
  };
}

function scoreApex(entity: EntityView, stats: WorldStats, events: WorldEvent[]) {
  const avgScore = Math.max(1, stats.avgScore);
  const avgGeneration = Math.max(0, stats.avgGeneration);
  const event = eventSignal(events, 'APEX', entity.id);
  const scoreLead = clamp01(entity.score / Math.max(1, avgScore * 1.55));
  const generationLead = clamp01((entity.generation - avgGeneration + 3) / 8);
  const energy = clamp01(entity.energy / 100);
  const score = clampPercent(scoreLead * 46 + generationLead * 18 + energy * 18 + event * 18);
  const confidence = clampPercent(28 + score * 0.64 + event * 14);
  return {
    score,
    confidence,
    eventSignal: event,
    tone: entity.score >= 88 || event >= 0.8 ? 'good' : 'info',
  } satisfies Pick<CandidateDraft, 'score' | 'confidence' | 'eventSignal' | 'tone'>;
}

function scoreCaretaker(entity: EntityView, events: WorldEvent[]) {
  const event = eventSignal(events, 'CARETAKER', entity.id);
  const cooperation = clamp01((entity.ethics.altruism + entity.ethics.collaboration) / 1.6);
  const lowToxin = clamp01(1 - entity.metabolic_toxin);
  const energy = clamp01(entity.energy / 100);
  const score = clampPercent(cooperation * 44 + lowToxin * 18 + energy * 16 + event * 22);
  const confidence = clampPercent(26 + score * 0.62 + event * 18);
  return {
    score,
    confidence,
    eventSignal: event,
    tone: score >= 72 || event >= 0.7 ? 'good' : 'info',
  } satisfies Pick<CandidateDraft, 'score' | 'confidence' | 'eventSignal' | 'tone'>;
}

function scoreSurvivor(entity: EntityView, stats: WorldStats, events: WorldEvent[]) {
  const event = eventSignal(events, 'SURVIVOR', entity.id);
  const populationPressure = stats.population <= 3 ? 1 : stats.population <= 8 ? 0.65 : stats.population <= 14 ? 0.35 : 0;
  const energy = clamp01(entity.energy / 100);
  const lowToxin = clamp01(1 - entity.metabolic_toxin);
  const score = clampPercent(energy * 36 + lowToxin * 24 + populationPressure * 22 + event * 18);
  const confidence = clampPercent(24 + score * 0.62 + populationPressure * 12 + event * 10);
  return {
    score,
    confidence,
    eventSignal: event,
    tone: populationPressure >= 0.65 ? 'warning' : 'info',
  } satisfies Pick<CandidateDraft, 'score' | 'confidence' | 'eventSignal' | 'tone'>;
}

function scoreThreat(entity: EntityView, stats: WorldStats, events: WorldEvent[]) {
  const avgScore = Math.max(1, stats.avgScore);
  const event = eventSignal(events, 'THREAT', entity.id);
  const scoreLead = clamp01(entity.score / Math.max(1, avgScore * 1.35));
  const lowAltruism = clamp01(1 - entity.ethics.altruism);
  const toxin = clamp01(entity.metabolic_toxin);
  const entropy = clamp01(stats.entropy / 100);
  const score = clampPercent(scoreLead * 28 + lowAltruism * 24 + toxin * 24 + entropy * 8 + event * 16);
  const confidence = clampPercent(24 + score * 0.64 + event * 16);
  return {
    score,
    confidence,
    eventSignal: event,
    tone: toxin >= 0.72 || event >= 0.7 ? 'danger' : 'warning',
  } satisfies Pick<CandidateDraft, 'score' | 'confidence' | 'eventSignal' | 'tone'>;
}

function draftForRole(role: LiveProtagonistRole, stats: WorldStats, entities: EntityView[], events: WorldEvent[]) {
  return entities.reduce<CandidateDraft | null>((best, entity) => {
    const scored = role === 'APEX'
      ? scoreApex(entity, stats, events)
      : role === 'CARETAKER'
        ? scoreCaretaker(entity, events)
        : role === 'SURVIVOR'
          ? scoreSurvivor(entity, stats, events)
          : scoreThreat(entity, stats, events);

    const draft: CandidateDraft = {
      role,
      entity,
      score: scored.score,
      confidence: scored.confidence,
      tone: scored.tone,
      suggestedIntervention: ROLE_INTERVENTION[role],
      eventSignal: scored.eventSignal,
    };

    if (!best) return draft;
    return draft.confidence > best.confidence || (draft.confidence === best.confidence && draft.score > best.score)
      ? draft
      : best;
  }, null);
}

function titleForRadar(candidates: LiveProtagonistCandidate[]) {
  const top = candidates[0];
  if (!top) return '主角雷达待机';
  if (top.role === 'APEX') return '顶点主角浮现';
  if (top.role === 'CARETAKER') return '看护者成团';
  if (top.role === 'SURVIVOR') return '瓶颈幸存者在线';
  return '威胁源抬头';
}

function subtitleForRadar(candidates: LiveProtagonistCandidate[], stats: WorldStats) {
  if (candidates.length === 0) return '等待实体形成清晰主角信号。';
  return candidates
    .slice(0, 3)
    .map((candidate) => `${ROLE_LABEL[candidate.role]} #${candidate.entityId}`)
    .join(' / ') + ` / P=${stats.population}`;
}

export function deriveLiveProtagonistRadar(input: LiveProtagonistInput): LiveProtagonistRadar | null {
  const population = input.stats.population || input.entities.length;
  if (input.entities.length === 0 || population <= 0) return null;

  const stats = {
    ...input.stats,
    population,
    avgScore: input.stats.avgScore || average(input.entities, (entity) => entity.score),
    avgGeneration: input.stats.avgGeneration || average(input.entities, (entity) => entity.generation),
  };
  const drafts = ROLE_ORDER
    .map((role) => draftForRole(role, stats, input.entities, input.events))
    .filter((draft): draft is CandidateDraft => Boolean(draft))
    .filter((draft) => draft.confidence >= 52 || draft.eventSignal >= 0.55)
    .sort((a, b) => b.confidence - a.confidence || b.score - a.score);

  const usedEntityIds = new Set<number>();
  const candidates = drafts
    .filter((draft) => {
      if (usedEntityIds.has(draft.entity.id)) return false;
      usedEntityIds.add(draft.entity.id);
      return true;
    })
    .slice(0, 4)
    .map((draft) => toCandidate(draft, stats));

  if (candidates.length === 0) return null;

  const top = candidates[0];
  const recent = recentEvents(input.events);
  return {
    title: titleForRadar(candidates),
    subtitle: subtitleForRadar(candidates, stats),
    tone: top.tone,
    candidates,
    evidence: [
      `population=${stats.population}`,
      `avgScore=${stats.avgScore.toFixed(1)}`,
      `avgGeneration=${stats.avgGeneration.toFixed(1)}`,
      `recentEvents=${recent.length}`,
      `candidates=${candidates.length}`,
    ].join(' / '),
  };
}
