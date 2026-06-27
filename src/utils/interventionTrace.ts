import type {
  EntityFateLine,
  EntityView,
  InterventionCausalAudit,
  InterventionConsequenceSummary,
  InterventionConsequenceTag,
  InterventionOutcome,
  InterventionTrace,
  InterventionTraceSnapshot,
  PlayerInterventionKind,
  RunSession,
  WorldEvent,
} from '../types/world';
import { formatIntervention, formatRunPhase } from './runSession';
import { isActiveInterventionKind } from './interventionKinds';

const TRACE_RADIUS = 2.5;
const TRACE_LIMIT = 24;
const TRACE_WINDOW_MS = 90_000;
const TRACE_SAMPLE_INTERVAL_MS = 5_000;
const MAX_TRACE_SAMPLES_PER_ENTITY = 18;
const MAX_FATE_LINE_POINTS = 18;
const MAX_TRACES = 16;
const CONTROL_LIMIT = 12;
const CONSEQUENCE_MIN_MS = 30_000;
const CRITICAL_ENERGY = 24;
const RECOVERED_ENERGY = 34;
const TOXIC_PRESSURE = 0.78;
const TOXIC_NEAR_FATAL = 0.9;

const CONSEQUENCE_LABEL: Record<InterventionConsequenceTag, string> = {
  RESCUE: '救活',
  TOXIC_KILL: '毒杀',
  LINEAGE_PUSH: '推动谱系',
  SIDE_EFFECT: '副作用',
};

function distanceOf(entity: EntityView, point: [number, number, number]) {
  const dx = entity.position[0] - point[0];
  const dy = entity.position[1] - point[1];
  const dz = entity.position[2] - point[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function snapshotOf(entity: EntityView, timestamp: number): InterventionTraceSnapshot {
  return {
    entityId: entity.id,
    timestamp,
    alive: entity.energy > 0 && entity.metabolic_toxin < 1,
    score: entity.score,
    energy: entity.energy,
    toxin: entity.metabolic_toxin,
    generation: entity.generation,
    position: entity.position,
  };
}

function lostSnapshot(entityId: number, timestamp: number, before?: InterventionTraceSnapshot): InterventionTraceSnapshot {
  return {
    entityId,
    timestamp,
    alive: false,
    score: before?.score ?? 0,
    energy: 0,
    toxin: before?.toxin ?? 1,
    generation: before?.generation ?? 0,
    position: before?.position ?? [0, 0, 0],
  };
}

function impactedEntities(
  point: [number, number, number],
  entities: EntityView[],
  entityId?: number,
) {
  return entities
    .map((entity) => ({
      entity,
      distance: entity.id === entityId ? 0 : distanceOf(entity, point),
      targeted: entity.id === entityId,
    }))
    .filter((item) => item.targeted || item.distance <= TRACE_RADIUS)
    .sort((a, b) => Number(b.targeted) - Number(a.targeted) || a.distance - b.distance)
    .slice(0, TRACE_LIMIT)
    .map((item) => item.entity);
}

function averageSnapshotValue(
  snapshots: InterventionTraceSnapshot[],
  selector: (item: InterventionTraceSnapshot) => number,
) {
  if (snapshots.length === 0) return 0;
  return sum(snapshots, selector) / snapshots.length;
}

function averageSnapshotDelta(
  before: InterventionTraceSnapshot[],
  latest: InterventionTraceSnapshot[],
  selector: (item: InterventionTraceSnapshot) => number,
) {
  if (before.length === 0) return 0;
  return averageSnapshotValue(latest, selector) - averageSnapshotValue(before, selector);
}

function findControlEntities(
  entities: EntityView[],
  impacted: EntityView[],
  point: [number, number, number],
) {
  if (impacted.length === 0) return [];
  const impactedIds = new Set(impacted.map((entity) => entity.id));
  const avgScore = impacted.reduce((sum, entity) => sum + entity.score, 0) / impacted.length;
  const avgEnergy = impacted.reduce((sum, entity) => sum + entity.energy, 0) / impacted.length;
  const avgToxin = impacted.reduce((sum, entity) => sum + entity.metabolic_toxin, 0) / impacted.length;
  const avgGeneration = impacted.reduce((sum, entity) => sum + entity.generation, 0) / impacted.length;

  return entities
    .filter((entity) => !impactedIds.has(entity.id) && distanceOf(entity, point) > TRACE_RADIUS)
    .map((entity) => ({
      entity,
      similarity:
        Math.abs(entity.score - avgScore) / 80 +
        Math.abs(entity.energy - avgEnergy) / 100 +
        Math.abs(entity.metabolic_toxin - avgToxin) * 2 +
        Math.abs(entity.generation - avgGeneration) / 20 +
        Math.min(1.5, Math.abs(distanceOf(entity, point) - TRACE_RADIUS) / 12),
    }))
    .sort((a, b) => a.similarity - b.similarity)
    .slice(0, Math.min(CONTROL_LIMIT, Math.max(3, impacted.length)))
    .map((item) => item.entity);
}

function sum(items: InterventionTraceSnapshot[], selector: (item: InterventionTraceSnapshot) => number) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function avgDelta(
  before: InterventionTraceSnapshot[],
  latest: InterventionTraceSnapshot[],
  selector: (item: InterventionTraceSnapshot) => number,
) {
  if (before.length === 0) return 0;
  return (sum(latest, selector) - sum(before, selector)) / before.length;
}

function compactTraceHistory(history: InterventionTraceSnapshot[]) {
  const byEntity = new Map<number, InterventionTraceSnapshot[]>();
  history.forEach((snapshot) => {
    const items = byEntity.get(snapshot.entityId) ?? [];
    items.push(snapshot);
    byEntity.set(snapshot.entityId, items);
  });

  return Array.from(byEntity.values())
    .flatMap((items) => items
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_TRACE_SAMPLES_PER_ENTITY))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function shouldAppendHistorySample(
  trace: InterventionTrace,
  latest: InterventionTraceSnapshot[],
  now: number,
) {
  const history = trace.history ?? trace.before;
  if (history.length === 0) return true;
  const lastTimestamp = Math.max(...history.map((snapshot) => snapshot.timestamp));
  if (now - lastTimestamp >= TRACE_SAMPLE_INTERVAL_MS) return true;

  const historyById = new Map(history.map((snapshot) => [snapshot.entityId, snapshot]));
  return latest.some((snapshot) => {
    const previous = historyById.get(snapshot.entityId);
    return previous?.alive && !snapshot.alive;
  });
}

function appendTraceHistory(
  trace: InterventionTrace,
  latest: InterventionTraceSnapshot[],
  now: number,
) {
  const history = trace.history ?? trace.before;
  if (latest.length === 0 || !shouldAppendHistorySample(trace, latest, now)) {
    return compactTraceHistory(history);
  }

  return compactTraceHistory([...history, ...latest]);
}

function calculateCausalAudit(
  trace: InterventionTrace,
  metrics: InterventionTrace['metrics'],
): InterventionCausalAudit {
  const controlBefore = trace.controlBefore ?? [];
  const controlLatest = trace.controlLatest ?? [];
  const affectedScoreDelta = metrics.scoreDelta;
  const affectedEnergyDelta = metrics.energyDelta;
  const affectedToxinDelta = metrics.toxinDelta;
  const controlScoreDelta = averageSnapshotDelta(controlBefore, controlLatest, (item) => item.score);
  const controlEnergyDelta = averageSnapshotDelta(controlBefore, controlLatest, (item) => item.energy);
  const controlToxinDelta = averageSnapshotDelta(controlBefore, controlLatest, (item) => item.toxin);
  const affectedGenerationDelta = averageSnapshotDelta(trace.before, trace.latest, (item) => item.generation);
  const controlGenerationDelta = averageSnapshotDelta(controlBefore, controlLatest, (item) => item.generation);
  const netScoreDelta = affectedScoreDelta - controlScoreDelta;
  const netEnergyDelta = affectedEnergyDelta - controlEnergyDelta;
  const netToxinDelta = affectedToxinDelta - controlToxinDelta;
  const netGenerationDelta = affectedGenerationDelta - controlGenerationDelta;

  if (trace.kind === 'PIN_OBSERVE') {
    return {
      verdict: 'OBSERVATIONAL',
      confidence: Math.min(72, Math.max(24, 24 + metrics.affected * 4 + Math.round(metrics.elapsedMs / 18_000) * 6)),
      affectedSize: metrics.affected,
      controlSize: controlLatest.length,
      affectedScoreDelta,
      controlScoreDelta,
      affectedEnergyDelta,
      controlEnergyDelta,
      affectedToxinDelta,
      controlToxinDelta,
      netScoreDelta,
      netEnergyDelta,
      netToxinDelta,
      affectedGenerationDelta,
      controlGenerationDelta,
      netGenerationDelta,
      evidence: `观察性样本，不宣称数值因果 / 样本 ${metrics.affected} / 对照 ${controlLatest.length}`,
    };
  }

  if (metrics.affected === 0 || controlLatest.length === 0 || metrics.elapsedMs < 12_000) {
    return {
      verdict: 'PENDING',
      confidence: Math.min(58, Math.max(20, 20 + metrics.affected * 3 + controlLatest.length * 2)),
      affectedSize: metrics.affected,
      controlSize: controlLatest.length,
      affectedScoreDelta,
      controlScoreDelta,
      affectedEnergyDelta,
      controlEnergyDelta,
      affectedToxinDelta,
      controlToxinDelta,
      netScoreDelta,
      netEnergyDelta,
      netToxinDelta,
      affectedGenerationDelta,
      controlGenerationDelta,
      netGenerationDelta,
      evidence: `对照窗口不足 / 样本 ${metrics.affected} / 对照 ${controlLatest.length} / 继续观察`,
    };
  }

  const isSupportive = trace.kind === 'BLESS' || trace.kind === 'QUARANTINE';
  const positiveSignal = isSupportive
    ? netEnergyDelta >= 6 || netScoreDelta >= 4 || metrics.generationGain > 0
    : netEnergyDelta <= -4 || netToxinDelta >= 0.06 || metrics.lost > 0;
  const negativeSignal = isSupportive
    ? netEnergyDelta <= -6 || netToxinDelta >= 0.08 || metrics.lost > Math.max(1, metrics.affected * 0.35)
    : netEnergyDelta >= 5 && netToxinDelta <= 0.02 && metrics.lost === 0;
  const verdict = positiveSignal
    ? 'POSITIVE'
    : negativeSignal
      ? 'NEGATIVE'
      : 'INCONCLUSIVE';
  const strength = Math.abs(netEnergyDelta) / 12 + Math.abs(netScoreDelta) / 8 + Math.abs(netToxinDelta) * 8;
  const confidence = Math.min(
    72,
    Math.max(
      34,
      34 + Math.min(metrics.affected, controlLatest.length) * 3 + Math.round(metrics.elapsedMs / 18_000) * 5 + Math.round(strength * 8),
    ),
  );

  return {
    verdict,
    confidence,
    affectedSize: metrics.affected,
    controlSize: controlLatest.length,
    affectedScoreDelta,
    controlScoreDelta,
    affectedEnergyDelta,
    controlEnergyDelta,
    affectedToxinDelta,
    controlToxinDelta,
    netScoreDelta,
    netEnergyDelta,
    netToxinDelta,
    affectedGenerationDelta,
    controlGenerationDelta,
    netGenerationDelta,
    evidence: `相关性审计 ${verdict} / 样本 ${metrics.affected} vs ${controlLatest.length} / 净能量 ${netEnergyDelta >= 0 ? '+' : ''}${netEnergyDelta.toFixed(1)} / 净分数 ${netScoreDelta >= 0 ? '+' : ''}${netScoreDelta.toFixed(1)} / 净毒素 ${netToxinDelta >= 0 ? '+' : ''}${(netToxinDelta * 100).toFixed(1)}%`,
  };
}

function traceTone(kind: PlayerInterventionKind, metrics: InterventionTrace['metrics']): WorldEvent['severity'] {
  if (kind === 'PIN_OBSERVE') {
    if (metrics.lost > Math.max(1, metrics.affected * 0.4)) return 'warning';
    return 'info';
  }
  if (kind === 'BLESS' || kind === 'QUARANTINE') {
    if (metrics.rescued > metrics.harmed || metrics.generationGain > 0) return 'good';
    if (metrics.lost > Math.max(1, metrics.affected * 0.4)) return 'warning';
    return 'info';
  }
  if (metrics.lost > 0 || metrics.harmed > metrics.rescued) return kind === 'POISON' ? 'danger' : 'warning';
  return 'info';
}

function traceDetail(kind: PlayerInterventionKind, metrics: InterventionTrace['metrics']) {
  if (metrics.affected <= 0) return '本次干预没有命中可追踪实体。';
  if (kind === 'PIN_OBSERVE') {
    return `钉选没有改写后端数值，正在追踪 ${metrics.alive}/${metrics.affected} 个样本的自然命运。`;
  }
  if (metrics.rescued > metrics.harmed) {
    return `受影响实体平均能量变化 ${metrics.energyDelta.toFixed(1)}，${metrics.rescued} 个样本在干预后呈现增益信号。`;
  }
  if (metrics.harmed > metrics.rescued) {
    return `受影响实体平均毒素变化 ${(metrics.toxinDelta * 100).toFixed(1)}%，${metrics.harmed} 个样本在干预后进入压力区。`;
  }
  return `仍在追踪 ${metrics.alive}/${metrics.affected} 个受影响实体的后续命运。`;
}

function isSupportiveIntervention(kind: PlayerInterventionKind) {
  return kind === 'BLESS' || kind === 'QUARANTINE';
}

function isDestructiveIntervention(kind: PlayerInterventionKind) {
  return kind === 'POISON' || kind === 'EXILE';
}

function pushConsequenceTag(tags: InterventionConsequenceTag[], tag: InterventionConsequenceTag) {
  if (!tags.includes(tag)) tags.push(tag);
}

function signedFixed(value: number, digits = 1) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`;
}

function signedPercent(value: number, digits = 1) {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;
}

function snapshotsForEntity(trace: InterventionTrace, entityId: number) {
  const source = trace.history?.length ? trace.history : [...trace.before, ...trace.latest];
  return source
    .filter((snapshot) => snapshot.entityId === entityId)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function minSnapshotValue(
  snapshots: InterventionTraceSnapshot[],
  selector: (item: InterventionTraceSnapshot) => number,
) {
  if (snapshots.length === 0) return 0;
  return Math.min(...snapshots.map(selector));
}

function maxSnapshotValue(
  snapshots: InterventionTraceSnapshot[],
  selector: (item: InterventionTraceSnapshot) => number,
) {
  if (snapshots.length === 0) return 0;
  return Math.max(...snapshots.map(selector));
}

function buildSnapshotPairs(trace: InterventionTrace, now: number) {
  const latestById = new Map(trace.latest.map((item) => [item.entityId, item]));
  return trace.before.map((before) => ({
    before,
    latest: latestById.get(before.entityId) ?? lostSnapshot(before.entityId, now, before),
    history: snapshotsForEntity(trace, before.entityId),
  }));
}

function consequenceConfidence(args: {
  elapsedMs: number;
  affected: number;
  control: number;
  signalCount: number;
  auditConfidence: number;
}) {
  const elapsedScore = clamp((args.elapsedMs - CONSEQUENCE_MIN_MS) / 3_000, 0, 20);
  const sampleScore = Math.min(args.affected, Math.max(1, args.control)) * 3;
  const signalScore = args.signalCount * 5;
  const controlPenalty = args.control === 0 ? 18 : 0;
  return Math.round(clamp(args.auditConfidence + elapsedScore + sampleScore + signalScore - controlPenalty, 24, 88));
}

function buildMetrics(
  trace: Pick<InterventionTrace, 'kind' | 'startedAt' | 'affectedEntityIds' | 'before' | 'latest'>,
  now: number,
): InterventionTrace['metrics'] {
  const latestById = new Map(trace.latest.map((item) => [item.entityId, item]));
  let alive = 0;
  let lost = 0;
  let rescued = 0;
  let harmed = 0;
  let generationGain = 0;

  for (const before of trace.before) {
    const latest = latestById.get(before.entityId) ?? lostSnapshot(before.entityId, now, before);
    if (latest.alive) alive += 1;
    if (!latest.alive && before.alive) lost += 1;
    if (latest.energy >= before.energy + 12 || latest.score >= before.score + 5) rescued += 1;
    if (latest.energy <= before.energy - 12 || latest.toxin >= before.toxin + 0.12 || !latest.alive) harmed += 1;
    generationGain += Math.max(0, latest.generation - before.generation);
  }

  return {
    affected: trace.affectedEntityIds.length,
    alive,
    lost,
    rescued,
    harmed,
    scoreDelta: avgDelta(trace.before, trace.latest, (item) => item.score),
    energyDelta: avgDelta(trace.before, trace.latest, (item) => item.energy),
    toxinDelta: avgDelta(trace.before, trace.latest, (item) => item.toxin),
    generationGain,
    elapsedMs: Math.max(0, now - trace.startedAt),
  };
}

export function deriveInterventionConsequence(
  trace: InterventionTrace,
  now = trace.updatedAt,
): InterventionConsequenceSummary {
  const metrics = buildMetrics(trace, now);
  const audit = calculateCausalAudit(trace, metrics);
  const pairs = buildSnapshotPairs(trace, now);
  const controlSize = trace.controlLatest?.length ?? trace.controlBefore?.length ?? 0;
  const historySamples = trace.history?.length ?? 0;
  const tags: InterventionConsequenceTag[] = [];
  const netGenerationDelta = audit.netGenerationDelta ?? 0;

  const rescued = pairs.filter(({ before, latest, history }) => {
    const minEnergy = minSnapshotValue(history, (item) => item.energy);
    const maxToxin = maxSnapshotValue(history, (item) => item.toxin);
    const wasCritical = before.alive && (before.energy <= CRITICAL_ENERGY || before.toxin >= TOXIC_PRESSURE);
    const dippedCritical = history.some((item) =>
      item.timestamp >= trace.startedAt &&
      item.alive &&
      (item.energy <= CRITICAL_ENERGY || item.toxin >= TOXIC_PRESSURE),
    );
    const recoveredEnergy = latest.alive &&
      latest.energy >= Math.max(RECOVERED_ENERGY, minEnergy + 12) &&
      latest.energy >= before.energy + 6;
    const recoveredToxin = latest.alive &&
      maxToxin >= TOXIC_PRESSURE &&
      latest.toxin <= Math.min(TOXIC_PRESSURE - 0.06, maxToxin - 0.08);
    return latest.alive && (wasCritical || dippedCritical) && (recoveredEnergy || recoveredToxin);
  }).length;

  const toxicKilled = pairs.filter(({ before, latest, history }) => {
    const maxToxin = maxSnapshotValue(history, (item) => item.toxin);
    const toxinRose = latest.toxin >= before.toxin + 0.08 || audit.netToxinDelta >= 0.04;
    if (!before.alive || latest.alive) return false;
    if (trace.kind === 'POISON') return maxToxin >= TOXIC_PRESSURE || toxinRose;
    return maxToxin >= TOXIC_NEAR_FATAL;
  }).length;

  const lineageAdvanced = pairs.filter(({ before, latest }) =>
    latest.alive && latest.generation > before.generation,
  ).length;

  const harmedPairs = pairs.filter(({ before, latest }) =>
    (before.alive && !latest.alive) ||
    latest.energy <= before.energy - 12 ||
    latest.toxin >= before.toxin + 0.12,
  ).length;

  const beneficialPairs = pairs.filter(({ before, latest }) =>
    latest.alive &&
    (
      latest.energy >= before.energy + 12 ||
      latest.score >= before.score + 5 ||
      latest.toxin <= before.toxin - 0.08 ||
      latest.generation > before.generation
    ),
  ).length;

  const sideEffects = isSupportiveIntervention(trace.kind)
    ? harmedPairs
    : isDestructiveIntervention(trace.kind)
      ? beneficialPairs
      : 0;

  if (trace.kind !== 'PIN_OBSERVE' && metrics.elapsedMs >= CONSEQUENCE_MIN_MS && metrics.affected > 0) {
    if (isSupportiveIntervention(trace.kind) && rescued > 0 && (audit.netEnergyDelta >= -4 || audit.netToxinDelta <= 0.03)) {
      pushConsequenceTag(tags, 'RESCUE');
    }
    if (trace.kind === 'POISON' && toxicKilled > 0 && audit.netToxinDelta >= -0.02) {
      pushConsequenceTag(tags, 'TOXIC_KILL');
    }
    if (lineageAdvanced > 0 && netGenerationDelta >= 0) {
      pushConsequenceTag(tags, 'LINEAGE_PUSH');
    }
    if (sideEffects > 0) {
      pushConsequenceTag(tags, 'SIDE_EFFECT');
    }
  }

  const summaryMetrics = {
    affected: metrics.affected,
    control: controlSize,
    rescued,
    toxicKilled,
    lineageAdvanced,
    sideEffects,
    lost: metrics.lost,
    harmed: metrics.harmed,
    netScoreDelta: audit.netScoreDelta,
    netEnergyDelta: audit.netEnergyDelta,
    netToxinDelta: audit.netToxinDelta,
    netGenerationDelta,
  };

  const evidence = `仅由 before/latest/history/control 推导 / affected ${metrics.affected} / control ${controlSize} / history ${historySamples} / 净E ${signedFixed(audit.netEnergyDelta)} / 净S ${signedFixed(audit.netScoreDelta)} / 净T ${signedPercent(audit.netToxinDelta)} / 净G ${signedFixed(netGenerationDelta, 2)}`;

  if (metrics.affected <= 0) {
    return {
      kind: 'NO_CLEAR_EFFECT',
      tags,
      title: `${formatIntervention(trace.kind)}未命中后果样本`,
      detail: '本次没有命中可追踪实体，不能推导救活、毒杀、谱系推进或副作用。',
      tone: 'info',
      confidence: 24,
      elapsedMs: metrics.elapsedMs,
      evidence,
      metrics: summaryMetrics,
    };
  }

  if (metrics.elapsedMs < CONSEQUENCE_MIN_MS) {
    const remainingSec = Math.ceil((CONSEQUENCE_MIN_MS - metrics.elapsedMs) / 1000);
    return {
      kind: 'PENDING',
      tags,
      title: `${formatIntervention(trace.kind)}后果观察中`,
      detail: `已追踪 ${Math.round(metrics.elapsedMs / 1000)} 秒；还需约 ${remainingSec} 秒进入 30-90 秒判断窗。当前存活 ${metrics.alive}/${metrics.affected}。`,
      tone: 'info',
      confidence: consequenceConfidence({
        elapsedMs: metrics.elapsedMs,
        affected: metrics.affected,
        control: controlSize,
        signalCount: 0,
        auditConfidence: audit.confidence,
      }),
      elapsedMs: metrics.elapsedMs,
      evidence,
      metrics: summaryMetrics,
    };
  }

  if (trace.kind === 'PIN_OBSERVE') {
    const observedSignals = [
      rescued > 0 ? `回稳 ${rescued}` : '',
      metrics.lost > 0 ? `消亡 ${metrics.lost}` : '',
      lineageAdvanced > 0 ? `代际延伸 ${lineageAdvanced}` : '',
    ].filter(Boolean).join(' / ') || '未见明确变化';

    return {
      kind: 'OBSERVATION',
      tags,
      title: lineageAdvanced > 0
        ? `${formatIntervention(trace.kind)}见证谱系延伸`
        : metrics.lost > 0
          ? `${formatIntervention(trace.kind)}见证消亡`
          : `${formatIntervention(trace.kind)}观察样本稳定`,
      detail: `钉选没有改写后端数值；30-90 秒窗内观测到：${observedSignals}。`,
      tone: metrics.lost > rescued ? 'warning' : lineageAdvanced > 0 || rescued > 0 ? 'good' : 'info',
      confidence: Math.min(72, consequenceConfidence({
        elapsedMs: metrics.elapsedMs,
        affected: metrics.affected,
        control: controlSize,
        signalCount: rescued + metrics.lost + lineageAdvanced,
        auditConfidence: audit.confidence,
      })),
      elapsedMs: metrics.elapsedMs,
      evidence,
      metrics: summaryMetrics,
    };
  }

  let kind: InterventionConsequenceSummary['kind'] = 'NO_CLEAR_EFFECT';
  if (tags.length > 1) {
    kind = 'MIXED';
  } else if (tags.includes('RESCUE')) {
    kind = 'RESCUE';
  } else if (tags.includes('TOXIC_KILL')) {
    kind = 'TOXIC_KILL';
  } else if (tags.includes('LINEAGE_PUSH')) {
    kind = 'LINEAGE_PUSH';
  } else if (tags.includes('SIDE_EFFECT')) {
    kind = 'SIDE_EFFECT';
  }

  const labels = tags.map((tag) => CONSEQUENCE_LABEL[tag]);
  const signalCount = rescued + toxicKilled + lineageAdvanced + sideEffects;
  const detail = kind === 'NO_CLEAR_EFFECT'
    ? `${traceDetail(trace.kind, metrics)} 30-90 秒窗内未达到救活、毒杀、谱系推进或副作用阈值。`
    : `30-90 秒窗：${labels.join(' / ')}；救活 ${rescued}、毒杀 ${toxicKilled}、谱系推进 ${lineageAdvanced}、副作用 ${sideEffects}，存活 ${metrics.alive}/${metrics.affected}，消亡 ${metrics.lost}。`;
  const title = kind === 'NO_CLEAR_EFFECT'
    ? `${formatIntervention(trace.kind)}暂无明确后果`
    : kind === 'RESCUE'
      ? `${formatIntervention(trace.kind)}救活 ${rescued} 个样本`
      : kind === 'TOXIC_KILL'
        ? `${formatIntervention(trace.kind)}毒杀 ${toxicKilled} 个样本`
        : kind === 'LINEAGE_PUSH'
          ? `${formatIntervention(trace.kind)}推动谱系 ${lineageAdvanced} 个样本`
          : kind === 'SIDE_EFFECT'
            ? `${formatIntervention(trace.kind)}出现副作用`
            : `${formatIntervention(trace.kind)}：${labels.join(' / ')}`;
  const tone: WorldEvent['severity'] = kind === 'TOXIC_KILL'
    ? 'danger'
    : kind === 'SIDE_EFFECT' || (kind === 'MIXED' && tags.includes('SIDE_EFFECT'))
      ? 'warning'
      : kind === 'RESCUE' || kind === 'LINEAGE_PUSH' || kind === 'MIXED'
        ? 'good'
        : 'info';

  return {
    kind,
    tags,
    title,
    detail,
    tone,
    confidence: consequenceConfidence({
      elapsedMs: metrics.elapsedMs,
      affected: metrics.affected,
      control: controlSize,
      signalCount,
      auditConfidence: audit.confidence,
    }),
    elapsedMs: metrics.elapsedMs,
    evidence,
    metrics: summaryMetrics,
  };
}

function finalizeTrace(trace: InterventionTrace, now: number): InterventionTrace {
  const metrics = buildMetrics(trace, now);
  const causalAudit = calculateCausalAudit(trace, metrics);
  const consequence = deriveInterventionConsequence({ ...trace, metrics, causalAudit }, now);
  const tone = consequence.kind === 'PENDING' || consequence.kind === 'NO_CLEAR_EFFECT'
    ? traceTone(trace.kind, metrics)
    : consequence.tone;
  const hasOutcomeSignal = consequence.kind !== 'PENDING' &&
    consequence.kind !== 'NO_CLEAR_EFFECT' &&
    consequence.kind !== 'OBSERVATION';
  const status = now >= trace.expiresAt
    ? 'STALE'
    : hasOutcomeSignal && metrics.elapsedMs >= CONSEQUENCE_MIN_MS
      ? 'RESOLVED'
      : 'TRACKING';

  return {
    ...trace,
    updatedAt: now,
    status,
    title: consequence.title,
    detail: consequence.detail,
    tone,
    confidence: Math.min(88, Math.max(34, causalAudit.confidence, consequence.confidence, 34 + metrics.affected * 3 + Math.round(metrics.elapsedMs / 12_000) * 8)),
    metrics,
    causalAudit,
    consequence,
    evidence: `${formatIntervention(trace.kind)} / ${formatRunPhase(trace.phase)}期 / 命中 ${metrics.affected} / 对照 ${causalAudit.controlSize} / 存活 ${metrics.alive} / 消亡 ${metrics.lost} / 分数 ${signedFixed(metrics.scoreDelta)} / 能量 ${signedFixed(metrics.energyDelta)} / 毒素 ${signedPercent(metrics.toxinDelta)} / ${consequence.evidence} / ${causalAudit.evidence}`,
  };
}

export function createInterventionTrace(args: {
  outcome: InterventionOutcome;
  point: [number, number, number];
  entity?: EntityView;
  entities: EntityView[];
  session: RunSession;
  now?: number;
}) {
  const now = args.now ?? Date.now();
  const explicitIds = args.outcome.affectedEntityIds?.length
    ? new Set(args.outcome.affectedEntityIds)
    : null;
  const impacted = args.outcome.affected <= 0
    ? []
    : explicitIds
      ? args.entities.filter((entity) => explicitIds.has(entity.id))
      : impactedEntities(args.point, args.entities, args.entity?.id);
  const before = impacted.map((entity) => snapshotOf(entity, now));
  const controlBefore = findControlEntities(args.entities, impacted, args.point)
    .map((entity) => snapshotOf(entity, now));
  const trace: InterventionTrace = {
    id: `trace-${args.session.id}-${now}-${Math.floor(Math.random() * 10000)}`,
    kind: args.outcome.kind,
    phase: args.session.phase,
    startedAt: now,
    updatedAt: now,
    expiresAt: now + TRACE_WINDOW_MS,
    status: 'TRACKING',
    outcome: args.outcome,
    entityId: args.entity?.id,
    point: args.point,
    affectedEntityIds: before.map((item) => item.entityId),
    before,
    latest: before,
    history: before,
    controlEntityIds: controlBefore.map((item) => item.entityId),
    controlBefore,
    controlLatest: controlBefore,
    controlHistory: controlBefore,
    title: `${formatIntervention(args.outcome.kind)}手痕追踪中`,
    detail: args.outcome.message,
    tone: 'info',
    confidence: before.length > 0 ? 42 : 20,
    metrics: {
      affected: before.length,
      alive: before.length,
      lost: 0,
      rescued: 0,
      harmed: 0,
      scoreDelta: 0,
      energyDelta: 0,
      toxinDelta: 0,
      generationGain: 0,
      elapsedMs: 0,
    },
    evidence: `affected=${before.length} / control=${controlBefore.length} / radius=${TRACE_RADIUS}`,
  };

  return finalizeTrace(trace, now);
}

export function updateInterventionTraces(
  traces: InterventionTrace[],
  entities: EntityView[],
  now = Date.now(),
) {
  if (traces.length === 0) return traces;
  const entitiesById = new Map(entities.map((entity) => [entity.id, entity]));
  return traces
    .map((trace) => {
      const latest = trace.affectedEntityIds.map((entityId) => {
        const entity = entitiesById.get(entityId);
        const previous = trace.latest.find((item) => item.entityId === entityId) ??
          trace.before.find((item) => item.entityId === entityId);
        return entity ? snapshotOf(entity, now) : lostSnapshot(entityId, now, previous);
      });
      const controlEntityIds = trace.controlEntityIds ?? [];
      const controlLatest = controlEntityIds.map((entityId) => {
        const entity = entitiesById.get(entityId);
        const previous = trace.controlLatest?.find((item) => item.entityId === entityId) ??
          trace.controlBefore?.find((item) => item.entityId === entityId);
        return entity ? snapshotOf(entity, now) : lostSnapshot(entityId, now, previous);
      });
      return finalizeTrace({
        ...trace,
        latest,
        controlLatest,
        history: appendTraceHistory(trace, latest, now),
        controlHistory: appendTraceHistory({
          ...trace,
          affectedEntityIds: controlEntityIds,
          before: trace.controlBefore ?? [],
          latest: trace.controlLatest ?? [],
          history: trace.controlHistory ?? trace.controlBefore ?? [],
        }, controlLatest, now),
      }, now);
    })
    .slice(-MAX_TRACES);
}

export function latestActionableTrace(traces: InterventionTrace[]) {
  return traces
    .slice()
    .reverse()
    .find((trace) => isActiveInterventionKind(trace.kind) && trace.metrics.affected > 0) ?? null;
}

export function deriveEntityFateLine(args: {
  entityId: number;
  traces: InterventionTrace[];
  events: WorldEvent[];
  now?: number;
}): EntityFateLine | null {
  const relatedTraces = args.traces.filter((trace) => trace.affectedEntityIds.includes(args.entityId));
  if (relatedTraces.length === 0) return null;

  const snapshots = relatedTraces
    .flatMap((trace) => {
      const history = (trace.history ?? [])
        .filter((snapshot) => snapshot.entityId === args.entityId);
      const fallback = history.length > 0
        ? history
        : [
            ...trace.before.filter((snapshot) => snapshot.entityId === args.entityId),
            ...trace.latest.filter((snapshot) => snapshot.entityId === args.entityId),
          ];
      const latest = trace.latest.find((snapshot) => snapshot.entityId === args.entityId);
      if (!latest) return fallback;
      const last = fallback[fallback.length - 1];
      const isSameSample = last &&
        last.timestamp === latest.timestamp &&
        last.alive === latest.alive &&
        Math.abs(last.energy - latest.energy) < 0.01 &&
        Math.abs(last.score - latest.score) < 0.01 &&
        Math.abs(last.toxin - latest.toxin) < 0.001;
      return isSameSample ? fallback : [...fallback, latest];
    })
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-MAX_FATE_LINE_POINTS);
  const last = snapshots[snapshots.length - 1];
  const first = snapshots[0];
  if (!last || !first) return null;

  const relatedEvents = args.events.filter((event) => event.entityId === args.entityId).slice(-4);
  const hasActiveTrace = relatedTraces.some((trace) => isActiveInterventionKind(trace.kind));
  const scoreDelta = last.score - first.score;
  const energyDelta = last.energy - first.energy;
  const toxinDelta = last.toxin - first.toxin;
  const tone: WorldEvent['severity'] = !last.alive
    ? 'danger'
    : scoreDelta > 8 || energyDelta > 12
      ? 'good'
      : energyDelta < -12 || toxinDelta > 0.15
        ? 'warning'
        : 'info';

  return {
    entityId: args.entityId,
    title: !last.alive
      ? `#${args.entityId} 命运线中断`
      : tone === 'good' && hasActiveTrace
        ? `#${args.entityId} 手痕后上行`
        : `#${args.entityId} 命运线追踪`,
    detail: `分数 ${scoreDelta >= 0 ? '+' : ''}${scoreDelta.toFixed(1)} / 能量 ${energyDelta >= 0 ? '+' : ''}${energyDelta.toFixed(1)} / 毒素 ${toxinDelta >= 0 ? '+' : ''}${(toxinDelta * 100).toFixed(1)}%。`,
    tone,
    snapshots,
    traceIds: relatedTraces.map((trace) => trace.id),
    evidence: `真实手痕 ${relatedTraces.length} 次 / 采样 ${snapshots.length} 点 / 关联事件 ${relatedEvents.length} 条 / ${last.alive ? '仍存活' : '已消亡'} / 代际 ${first.generation}->${last.generation}`,
  };
}

export function formatInterventionTracesForShare(traces: InterventionTrace[]) {
  const meaningful = traces
    .filter((trace) => isActiveInterventionKind(trace.kind) && trace.metrics.affected > 0)
    .slice(-5);
  if (meaningful.length === 0) return '';
  return [
    '玩家关键手痕：',
    ...meaningful.map((trace) =>
      `- ${trace.title} / ${trace.detail} / ${trace.evidence}${trace.causalAudit ? ` / 相关性方向 ${trace.causalAudit.verdict} ${trace.causalAudit.confidence}%` : ''}`,
    ),
  ].join('\n');
}
