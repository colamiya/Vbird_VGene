import type {
  EntityView,
  LiveInteractionEdge,
  LiveInteractionKind,
  LiveInteractionNetwork,
  PlayerInterventionKind,
  WorldInteractionEvent,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { isEffectiveInterventionEvent } from './interventionKinds';

interface LiveInteractionInput {
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  interactions?: WorldInteractionEvent[];
}

interface EdgeDraft {
  kind: LiveInteractionKind;
  origin: LiveInteractionEdge['source'];
  source: EntityView;
  target: EntityView;
  strength: number;
  distance: number;
  tone: WorldEvent['severity'];
  suggestedIntervention: PlayerInterventionKind;
  eventSignal: number;
  observed?: WorldInteractionEvent;
}

const MAX_SCANNED_ENTITIES = 72;
const MAX_DISTANCE = 13.5;

const KIND_LABEL: Record<LiveInteractionKind, string> = {
  MUTUAL_AID: '互助线',
  RESOURCE_TRANSFER: '能量转移',
  PREDATION: '掠食线',
  TOXIC_CONFLICT: '毒性冲突',
};

const KIND_EVENTS: Record<LiveInteractionKind, WorldEvent['kind'][]> = {
  MUTUAL_AID: ['COOPERATION_CLUSTER', 'RESOURCE_BLOOM', 'GOLDEN_AGE'],
  RESOURCE_TRANSFER: ['RESOURCE_BLOOM', 'PLAYER_BLESSING', 'COOPERATION_CLUSTER'],
  PREDATION: ['PREDATOR_RAID', 'MASS_EXTINCTION', 'PLAYER_EXILE'],
  TOXIC_CONFLICT: ['TOXIN_CRISIS', 'ENERGY_FAMINE', 'PLAYER_POISON'],
};

function clamp01(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function distanceOf(a: EntityView, b: EntityView) {
  const dx = a.position[0] - b.position[0];
  const dy = a.position[1] - b.position[1];
  const dz = a.position[2] - b.position[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function proximity(distance: number) {
  return clamp01((MAX_DISTANCE - distance) / MAX_DISTANCE);
}

function recentEvents(events: WorldEvent[]) {
  return events
    .filter((event) => event.kind !== 'RUN_STARTED')
    .slice(-16);
}

function eventSignal(events: WorldEvent[], kind: LiveInteractionKind, sourceId: number, targetId: number) {
  const kinds = KIND_EVENTS[kind];
  const recent = recentEvents(events);
  if (recent.length === 0) return 0;

  return recent.reduce((best, event, index) => {
    if (!kinds.includes(event.kind)) return best;
    const recency = (index + 1) / recent.length;
    const isPlayerEvent =
      event.kind === 'PLAYER_BLESSING' ||
      event.kind === 'PLAYER_POISON' ||
      event.kind === 'PLAYER_QUARANTINE' ||
      event.kind === 'PLAYER_EXILE' ||
      event.kind === 'PINNED_OBSERVATION';
    if (isPlayerEvent && !isEffectiveInterventionEvent(event, { includePinnedObservation: true })) {
      return best;
    }
    const entitySignal = typeof event.entityId !== 'number'
      ? isPlayerEvent
        ? 0
        : 0.28
      : event.entityId === sourceId || event.entityId === targetId
        ? 1
        : 0.28;
    return Math.max(best, clamp01((0.4 + recency * 0.6) * entitySignal));
  }, 0);
}

function selectScannedEntities(entities: EntityView[]) {
  return entities
    .slice()
    .sort((a, b) => (
      b.score + b.energy + b.generation * 3 - (b.metabolic_toxin * 12)
      - (a.score + a.energy + a.generation * 3 - (a.metabolic_toxin * 12))
    ))
    .slice(0, MAX_SCANNED_ENTITIES);
}

function strongerByScore(a: EntityView, b: EntityView) {
  return a.score > b.score || (a.score === b.score && a.energy >= b.energy) ? a : b;
}

function weakerByScore(a: EntityView, b: EntityView) {
  return strongerByScore(a, b).id === a.id ? b : a;
}

function scoreMutualAid(a: EntityView, b: EntityView, distance: number, events: WorldEvent[]) {
  const source = a.id < b.id ? a : b;
  const target = source.id === a.id ? b : a;
  const collaboration = (a.ethics.collaboration + b.ethics.collaboration) / 2;
  const altruism = (a.ethics.altruism + b.ethics.altruism) / 2;
  const lowToxin = 1 - ((a.metabolic_toxin + b.metabolic_toxin) / 2);
  const energyBase = ((a.energy + b.energy) / 2) / 100;
  const signal = eventSignal(events, 'MUTUAL_AID', source.id, target.id);
  const strength = clampPercent(
    proximity(distance) * 24 +
    clamp01(collaboration / 0.78) * 28 +
    clamp01(altruism / 0.68) * 22 +
    clamp01(lowToxin) * 12 +
    clamp01(energyBase) * 6 +
    signal * 8,
  );
  return {
    kind: 'MUTUAL_AID',
    origin: 'INFERRED',
    source,
    target,
    strength,
    distance,
    tone: strength >= 68 || signal >= 0.68 ? 'good' : 'info',
    suggestedIntervention: 'BLESS',
    eventSignal: signal,
  } satisfies EdgeDraft;
}

function scoreResourceTransfer(a: EntityView, b: EntityView, distance: number, events: WorldEvent[]) {
  const source = a.energy >= b.energy ? a : b;
  const target = source.id === a.id ? b : a;
  const energyGap = Math.max(0, source.energy - target.energy) / 100;
  const donorEthic = (source.ethics.altruism + source.ethics.collaboration) / 2;
  const receiverPressure = clamp01((46 - target.energy) / 46 + target.metabolic_toxin * 0.35);
  const signal = eventSignal(events, 'RESOURCE_TRANSFER', source.id, target.id);
  const strength = clampPercent(
    proximity(distance) * 24 +
    clamp01(energyGap / 0.42) * 26 +
    clamp01(donorEthic / 0.72) * 22 +
    receiverPressure * 18 +
    signal * 10,
  );
  return {
    kind: 'RESOURCE_TRANSFER',
    origin: 'INFERRED',
    source,
    target,
    strength,
    distance,
    tone: strength >= 70 || signal >= 0.68 ? 'good' : 'info',
    suggestedIntervention: target.energy <= 28 ? 'BLESS' : 'PIN_OBSERVE',
    eventSignal: signal,
  } satisfies EdgeDraft;
}

function scorePredation(a: EntityView, b: EntityView, distance: number, stats: WorldStats, events: WorldEvent[]) {
  const source = strongerByScore(a, b);
  const target = weakerByScore(a, b);
  const scoreGap = Math.max(0, source.score - target.score);
  const aggression = clamp01((1 - source.ethics.altruism) * 0.65 + source.metabolic_toxin * 0.35);
  const preyPressure = clamp01((58 - target.energy) / 58 + target.metabolic_toxin * 0.22);
  const entropy = clamp01(stats.entropy / 100);
  const signal = eventSignal(events, 'PREDATION', source.id, target.id);
  const strength = clampPercent(
    proximity(distance) * 22 +
    clamp01(scoreGap / 36) * 24 +
    aggression * 24 +
    preyPressure * 14 +
    entropy * 6 +
    signal * 10,
  );
  return {
    kind: 'PREDATION',
    origin: 'INFERRED',
    source,
    target,
    strength,
    distance,
    tone: strength >= 72 || signal >= 0.68 ? 'danger' : 'warning',
    suggestedIntervention: 'EXILE',
    eventSignal: signal,
  } satisfies EdgeDraft;
}

function scoreToxicConflict(a: EntityView, b: EntityView, distance: number, stats: WorldStats, events: WorldEvent[]) {
  const source = a.metabolic_toxin >= b.metabolic_toxin ? a : b;
  const target = source.id === a.id ? b : a;
  const toxinLoad = (a.metabolic_toxin + b.metabolic_toxin) / 2;
  const ethicSplit = Math.abs(a.ethics.altruism - b.ethics.altruism) + Math.abs(a.ethics.collaboration - b.ethics.collaboration);
  const entropy = clamp01(stats.entropy / 100);
  const energyStress = clamp01((62 - Math.min(a.energy, b.energy)) / 62);
  const signal = eventSignal(events, 'TOXIC_CONFLICT', source.id, target.id);
  const strength = clampPercent(
    proximity(distance) * 20 +
    clamp01(toxinLoad / 0.72) * 28 +
    clamp01(ethicSplit / 1.15) * 16 +
    entropy * 14 +
    energyStress * 12 +
    signal * 10,
  );
  return {
    kind: 'TOXIC_CONFLICT',
    origin: 'INFERRED',
    source,
    target,
    strength,
    distance,
    tone: strength >= 72 || signal >= 0.68 ? 'danger' : 'warning',
    suggestedIntervention: 'QUARANTINE',
    eventSignal: signal,
  } satisfies EdgeDraft;
}

function bestDraftForPair(a: EntityView, b: EntityView, distance: number, stats: WorldStats, events: WorldEvent[]) {
  const drafts = [
    scoreMutualAid(a, b, distance, events),
    scoreResourceTransfer(a, b, distance, events),
    scorePredation(a, b, distance, stats, events),
    scoreToxicConflict(a, b, distance, stats, events),
  ];
  return drafts.sort((left, right) => right.strength - left.strength)[0];
}

function edgeTitle(kind: LiveInteractionKind, sourceId: number, targetId: number) {
  return `${KIND_LABEL[kind]} #${sourceId} -> #${targetId}`;
}

function edgeDetail(draft: EdgeDraft) {
  if (draft.origin === 'OBSERVED' && draft.observed) {
    if (draft.kind === 'PREDATION') {
      return `后端碰撞日志确认掠食：目标能量 ${draft.observed.targetEnergyDelta.toFixed(1)}，捕食者 ${draft.observed.sourceEnergyDelta >= 0 ? '+' : ''}${draft.observed.sourceEnergyDelta.toFixed(1)}。`;
    }
    if (draft.kind === 'RESOURCE_TRANSFER') {
      return `后端碰撞日志确认能量均分，供给者 ${draft.observed.sourceEnergyDelta.toFixed(1)}，接收者 ${draft.observed.targetEnergyDelta >= 0 ? '+' : ''}${draft.observed.targetEnergyDelta.toFixed(1)}。`;
    }
    return `后端碰撞日志确认两个高协作实体完成互助接触。`;
  }
  if (draft.kind === 'MUTUAL_AID') {
    return `两个近邻都具备协作倾向，适合观察是否形成稳定互助团。`;
  }
  if (draft.kind === 'RESOURCE_TRANSFER') {
    return `高能个体靠近低能个体，当前最像一次可被祝福放大的续命窗口。`;
  }
  if (draft.kind === 'PREDATION') {
    return `高适应低利他个体压近弱势目标，可能演化为局部掠食叙事。`;
  }
  return `高毒或伦理差异个体靠近，容易把局部生态推向冲突和坍缩。`;
}

function evidenceFor(draft: EdgeDraft) {
  return [
    `source=${draft.origin}`,
    `kind=${draft.kind}`,
    `pair=${draft.source.id}->${draft.target.id}`,
    `strength=${draft.strength}%`,
    `d=${draft.distance.toFixed(1)}`,
    `S=${draft.source.score.toFixed(1)}/${draft.target.score.toFixed(1)}`,
    `E=${draft.source.energy.toFixed(1)}/${draft.target.energy.toFixed(1)}`,
    `T=${(draft.source.metabolic_toxin * 100).toFixed(1)}%/${(draft.target.metabolic_toxin * 100).toFixed(1)}%`,
    `event=${Math.round(draft.eventSignal * 100)}%`,
    draft.observed ? `tick=${draft.observed.tick}` : null,
    draft.observed ? `dE=${draft.observed.sourceEnergyDelta.toFixed(1)}/${draft.observed.targetEnergyDelta.toFixed(1)}` : null,
  ].join(' / ');
}

function toEdge(draft: EdgeDraft): LiveInteractionEdge {
  return {
    kind: draft.kind,
    source: draft.origin,
    sourceId: draft.source.id,
    targetId: draft.target.id,
    title: edgeTitle(draft.kind, draft.source.id, draft.target.id),
    detail: edgeDetail(draft),
    tone: draft.tone,
    strength: draft.strength,
    distance: draft.distance,
    suggestedIntervention: draft.suggestedIntervention,
    evidence: evidenceFor(draft),
    metrics: {
      sourceScore: draft.source.score,
      targetScore: draft.target.score,
      sourceEnergy: draft.source.energy,
      targetEnergy: draft.target.energy,
      sourceToxin: draft.source.metabolic_toxin,
      targetToxin: draft.target.metabolic_toxin,
      ethicsDelta: Math.abs(draft.source.ethics.altruism - draft.target.ethics.altruism) +
        Math.abs(draft.source.ethics.collaboration - draft.target.ethics.collaboration),
    },
  };
}

function titleFor(edges: LiveInteractionEdge[]) {
  const top = edges[0];
  if (!top) return '交互网络待机';
  if (top.kind === 'MUTUAL_AID') return '互助线升温';
  if (top.kind === 'RESOURCE_TRANSFER') return '能量转移窗口';
  if (top.kind === 'PREDATION') return '掠食线压近';
  return '毒性冲突靠拢';
}

function subtitleFor(edges: LiveInteractionEdge[]) {
  if (edges.length === 0) return '等待实体靠近到可观察距离。';
  const observed = edges.filter((edge) => edge.source === 'OBSERVED').length;
  return edges
    .slice(0, 3)
    .map((edge) => `${edge.source === 'OBSERVED' ? '实' : '预'}${KIND_LABEL[edge.kind]} #${edge.sourceId}->#${edge.targetId}`)
    .concat(observed > 0 ? [`真实 ${observed}`] : [])
    .join(' / ');
}

function toneFor(edges: LiveInteractionEdge[]): WorldEvent['severity'] {
  if (edges.some((edge) => edge.tone === 'danger')) return 'danger';
  if (edges.some((edge) => edge.tone === 'warning')) return 'warning';
  if (edges.some((edge) => edge.tone === 'good')) return 'good';
  return 'info';
}

export function deriveLiveInteractionNetwork(input: LiveInteractionInput): LiveInteractionNetwork | null {
  if (input.entities.length < 2) return null;

  const observedDrafts = observedInteractionDrafts(input.interactions ?? [], input.entities);
  const scanned = selectScannedEntities(input.entities);
  const drafts: EdgeDraft[] = [];
  let pairCount = 0;

  for (let i = 0; i < scanned.length; i += 1) {
    for (let j = i + 1; j < scanned.length; j += 1) {
      const distance = distanceOf(scanned[i], scanned[j]);
      if (distance > MAX_DISTANCE) continue;
      pairCount += 1;
      const draft = bestDraftForPair(scanned[i], scanned[j], distance, input.stats, input.events);
      if (draft.strength >= 48 || draft.eventSignal >= 0.58) {
        drafts.push(draft);
      }
    }
  }

  const usedPairs = new Set<string>();
  const edges = [...observedDrafts, ...drafts]
    .sort((a, b) =>
      Number(b.origin === 'OBSERVED') - Number(a.origin === 'OBSERVED') ||
      b.strength - a.strength ||
      a.distance - b.distance,
    )
    .filter((draft) => {
      const ids = [draft.source.id, draft.target.id].sort((a, b) => a - b).join(':');
      if (usedPairs.has(ids)) return false;
      usedPairs.add(ids);
      return true;
    })
    .slice(0, 6)
    .map(toEdge);

  if (edges.length === 0) return null;

  const aidEdges = edges.filter((edge) => edge.kind === 'MUTUAL_AID' || edge.kind === 'RESOURCE_TRANSFER').length;
  const attackEdges = edges.filter((edge) => edge.kind === 'PREDATION').length;
  const conflictEdges = edges.filter((edge) => edge.kind === 'TOXIC_CONFLICT').length;
  const observedEdges = edges.filter((edge) => edge.source === 'OBSERVED').length;

  return {
    title: titleFor(edges),
    subtitle: subtitleFor(edges),
    tone: toneFor(edges),
    edges,
    evidence: [
      `scanned=${scanned.length}`,
      `pairs=${pairCount}`,
      `edges=${edges.length}`,
      `observed=${observedEdges}`,
      `aid=${aidEdges}`,
      `attack=${attackEdges}`,
      `conflict=${conflictEdges}`,
      `entropy=${input.stats.entropy.toFixed(1)}%`,
    ].join(' / '),
    metrics: {
      scannedEntities: scanned.length,
      pairCount,
      aidEdges,
      attackEdges,
      conflictEdges,
      observedEdges,
    },
  };
}

function observedInteractionDrafts(
  interactions: WorldInteractionEvent[],
  entities: EntityView[],
): EdgeDraft[] {
  if (interactions.length === 0 || entities.length === 0) return [];
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));
  return interactions
    .slice(-16)
    .map((interaction): EdgeDraft | null => {
      const source = entitiesById.get(interaction.sourceId);
      const target = entitiesById.get(interaction.targetId);
      if (!source || !target) return null;
      const kind = observedKind(interaction.kind);
      const absEnergy = Math.abs(interaction.sourceEnergyDelta) + Math.abs(interaction.targetEnergyDelta);
      const strength = clampPercent(
        52 +
        clamp01(absEnergy / 45) * 34 +
        clamp01((16 - interaction.distance) / 16) * 14,
      );
      return {
        kind,
        origin: 'OBSERVED',
        source,
        target,
        strength,
        distance: interaction.distance,
        tone: kind === 'PREDATION' ? 'danger' : 'good',
        suggestedIntervention: kind === 'PREDATION' ? 'EXILE' : 'PIN_OBSERVE',
        eventSignal: 1,
        observed: interaction,
      };
    })
    .filter((draft): draft is EdgeDraft => Boolean(draft));
}

function observedKind(kind: WorldInteractionEvent['kind']): LiveInteractionKind {
  if (kind === 'Predation') return 'PREDATION';
  if (kind === 'ResourceTransfer') return 'RESOURCE_TRANSFER';
  return 'MUTUAL_AID';
}
