import type {
  EntityView,
  PinnedSpecimen,
  PinnedSpecimenSummary,
  RunPhase,
  SpecimenSnapshot,
} from '../types/world';

const MIN_SAMPLE_INTERVAL_MS = 10_000;
const MAX_SNAPSHOTS = 18;

const PHASE_LABELS: Record<RunPhase, string> = {
  GENESIS: '创世',
  BURST: '爆发',
  DIVERGENCE: '分化',
  CRISIS: '危机',
  ASCENSION: '飞升',
};

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatPhase(phase: RunPhase) {
  return PHASE_LABELS[phase];
}

function snapshotEntity(entity: EntityView, phase: RunPhase, timestamp = Date.now()): SpecimenSnapshot {
  return {
    timestamp,
    phase,
    score: entity.score,
    energy: entity.energy,
    toxin: entity.metabolic_toxin,
    generation: entity.generation,
    position: entity.position,
  };
}

function changedEnough(previous: SpecimenSnapshot, next: SpecimenSnapshot) {
  return (
    Math.abs(next.score - previous.score) >= 4 ||
    Math.abs(next.energy - previous.energy) >= 8 ||
    Math.abs(next.toxin - previous.toxin) >= 0.12 ||
    next.generation !== previous.generation ||
    previous.phase !== next.phase
  );
}

export function createPinnedSpecimen(entity: EntityView, phase: RunPhase, now = Date.now()): PinnedSpecimen {
  return {
    entityId: entity.id,
    pinnedAt: now,
    lastSeenAt: now,
    originPhase: phase,
    status: 'TRACKING',
    snapshots: [snapshotEntity(entity, phase, now)],
  };
}

export function updatePinnedSpecimen(
  specimen: PinnedSpecimen,
  entities: EntityView[],
  phase: RunPhase,
  now = Date.now(),
): PinnedSpecimen {
  const entity = entities.find((item) => item.id === specimen.entityId);
  if (!entity) {
    if (specimen.status === 'LOST') return specimen;
    return { ...specimen, status: 'LOST', lastSeenAt: now };
  }

  const nextSnapshot = snapshotEntity(entity, phase, now);
  const lastSnapshot = specimen.snapshots[specimen.snapshots.length - 1];
  const shouldAppend =
    !lastSnapshot ||
    now - lastSnapshot.timestamp >= MIN_SAMPLE_INTERVAL_MS ||
    changedEnough(lastSnapshot, nextSnapshot);

  const snapshots = shouldAppend
    ? [...specimen.snapshots, nextSnapshot].slice(-MAX_SNAPSHOTS)
    : specimen.snapshots;

  return {
    ...specimen,
    status: 'TRACKING',
    lastSeenAt: now,
    snapshots,
  };
}

export function summarizePinnedSpecimen(specimen: PinnedSpecimen | null, endedAt = Date.now()): PinnedSpecimenSummary | undefined {
  if (!specimen || specimen.snapshots.length === 0) return undefined;
  const first = specimen.snapshots[0];
  const final = specimen.snapshots[specimen.snapshots.length - 1];
  const peakScore = Math.max(...specimen.snapshots.map((snapshot) => snapshot.score));
  const generationGain = final.generation - first.generation;
  const energyDelta = final.energy - first.energy;
  const toxinDelta = final.toxin - first.toxin;
  const status: PinnedSpecimenSummary['status'] = specimen.status === 'LOST' ? 'LOST' : 'SURVIVED';
  const trackedMs = Math.max(0, Math.min(endedAt, specimen.lastSeenAt) - specimen.pinnedAt);
  const title = status === 'SURVIVED'
    ? `#${specimen.entityId} 存活样本`
    : `#${specimen.entityId} 失联样本`;
  const detail = status === 'SURVIVED'
    ? `该数字生命从${formatPhase(specimen.originPhase)}期被钉选，追踪到终局仍存在。`
    : `该数字生命从${formatPhase(specimen.originPhase)}期被钉选，后续从世界快照中消失。`;

  return {
    entityId: specimen.entityId,
    status,
    trackedMs,
    title,
    detail,
    first,
    final,
    peakScore,
    generationGain,
    energyDelta,
    toxinDelta,
    evidence: `追踪 ${formatDuration(trackedMs)} / 快照 ${specimen.snapshots.length} / 峰值适应度 ${peakScore.toFixed(2)}`,
  };
}

export function formatPinnedSpecimenForShare(summary?: PinnedSpecimenSummary) {
  if (!summary) return '';
  return [
    `钉选样本：#${summary.entityId} ${summary.status === 'SURVIVED' ? '存活' : '失联'}`,
    `- 峰值适应度 ${summary.peakScore.toFixed(2)}，世代变化 ${summary.generationGain >= 0 ? '+' : ''}${summary.generationGain}`,
    `- 能量变化 ${summary.energyDelta >= 0 ? '+' : ''}${summary.energyDelta.toFixed(1)}，毒素变化 ${summary.toxinDelta >= 0 ? '+' : ''}${summary.toxinDelta.toFixed(2)}`,
  ].join('\n');
}
