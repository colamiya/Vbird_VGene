import type { PlayerImpactTrace, PlayerInterventionKind, WorldEvent, WorldEventKind, WorldStats } from '../types/world';
import {
  isActiveInterventionKind,
  isEffectiveInterventionEvent,
  PLAYER_INTERVENTION_EVENT_KINDS,
} from './interventionKinds';

interface PlayerImpactInput {
  events: WorldEvent[];
  stats: WorldStats;
  now: number;
}

const PLAYER_EVENT_KINDS = new Set<WorldEventKind>(Object.values(PLAYER_INTERVENTION_EVENT_KINDS));

const HELPFUL_EVENTS = new Set<WorldEventKind>([
  'RESOURCE_BLOOM',
  'GOLDEN_AGE',
  'COOPERATION_CLUSTER',
  'FIRST_APEX',
  'GENERATION_LEAP',
  'LINEAGE_FOUNDER',
  'HALL_OF_FAME',
]);

const HARMFUL_EVENTS = new Set<WorldEventKind>([
  'TOXIN_CRISIS',
  'ENERGY_FAMINE',
  'PREDATOR_RAID',
  'MASS_EXTINCTION',
]);

const INTERVENTION_LABELS: Record<PlayerInterventionKind, string> = {
  BLESS: '祝福',
  POISON: '投毒',
  QUARANTINE: '隔离',
  EXILE: '放逐',
  PIN_OBSERVE: '钉选观察',
};

function latestIntervention(events: WorldEvent[]) {
  const interventions = events
    .filter((event) => isEffectiveInterventionEvent(event, { includePinnedObservation: true }))
    .sort((a, b) => a.timestamp - b.timestamp);
  return interventions[interventions.length - 1];
}

function eventsAfter(events: WorldEvent[], event: WorldEvent) {
  return events
    .filter((item) => item.timestamp > event.timestamp && !PLAYER_EVENT_KINDS.has(item.kind) && item.kind !== 'RUN_ENDED')
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-12);
}

function formatElapsed(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 90) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

function confidenceFrom(afterCount: number, affected: number, elapsedMs: number) {
  const evidenceScore = Math.min(44, afterCount * 11);
  const affectedScore = Math.min(18, affected * 3);
  const timeScore = Math.min(18, Math.round(elapsedMs / 30_000) * 3);
  return Math.max(28, Math.min(92, 28 + evidenceScore + affectedScore + timeScore));
}

function interventionKind(event: WorldEvent): PlayerInterventionKind | null {
  return event.intervention?.kind ?? null;
}

export function derivePlayerImpactTrace(input: PlayerImpactInput): PlayerImpactTrace | null {
  const intervention = latestIntervention(input.events);
  if (!intervention) return null;

  const kind = interventionKind(intervention);
  if (!kind) return null;

  const after = eventsAfter(input.events, intervention);
  const helpfulEvents = after.filter((event) => HELPFUL_EVENTS.has(event.kind)).length;
  const harmfulEvents = after.filter((event) => HARMFUL_EVENTS.has(event.kind)).length;
  const affected = intervention.intervention?.affected ?? 0;
  const elapsedMs = Math.max(0, input.now - intervention.timestamp);
  const confidence = confidenceFrom(after.length, affected, elapsedMs);
  const label = INTERVENTION_LABELS[kind];
  const metrics = {
    eventsAfter: after.length,
    helpfulEvents,
    harmfulEvents,
    population: input.stats.population,
    avgScore: input.stats.avgScore,
    entropy: input.stats.entropy,
    affected,
  };

  let traceKind: PlayerImpactTrace['kind'] = 'PENDING';
  let title = `${label}回响待定`;
  let detail = '干预已经写入事件流，等待后续真实世界变化给出反馈。';
  let tone: WorldEvent['severity'] = 'info';

  if (kind === 'PIN_OBSERVE') {
    traceKind = 'PENDING';
    title = after.length === 0 ? '钉选观察进行中' : '钉选观察记录命运线';
    detail = after.length === 0
      ? '钉选不会改变后端数值，只把样本纳入观察焦点。'
      : `钉选后出现 ${after.length} 条真实事件，这是被观察对象所在世界的自然反馈，不计为主动手痕。`;
    tone = harmfulEvents > helpfulEvents ? 'warning' : 'info';
  } else if (after.length === 0) {
    traceKind = 'PENDING';
  } else if ((kind === 'BLESS' || kind === 'QUARANTINE') && helpfulEvents >= harmfulEvents + 1) {
    traceKind = 'RESCUE';
    title = `${label}形成正回响`;
    detail = `后续出现 ${helpfulEvents} 条繁荣/组织信号，玩家手痕更像一次有效扶持。`;
    tone = 'good';
  } else if ((kind === 'POISON' || kind === 'EXILE') && harmfulEvents > helpfulEvents && input.stats.population <= 3) {
    traceKind = 'OVERDRAWN';
    title = `${label}可能过量`;
    detail = `攻击性干预后压力信号占优，且当前种群偏低，需要观察是否进入灭绝链。`;
    tone = 'danger';
  } else if ((kind === 'POISON' || kind === 'EXILE') && helpfulEvents >= harmfulEvents) {
    traceKind = 'CONTROL';
    title = `${label}压制后回稳`;
    detail = `攻击性干预后没有被危机吞没，后续真实事件显示局面仍可控。`;
    tone = 'good';
  } else if (harmfulEvents > helpfulEvents) {
    traceKind = 'PRESSURE';
    title = `${label}后压力升高`;
    detail = `干预之后压力事件更多，当前更像把世界推向高压筛选。`;
    tone = 'warning';
  } else {
    traceKind = 'CONTROL';
    title = `${label}留下可控手痕`;
    detail = `后续事件数量有限，但尚未显示明显崩盘，继续观察下一次世界反馈。`;
    tone = 'info';
  }

  const latest = after[after.length - 1];
  const evidence = [
    `intervention=${kind}`,
    `active=${isActiveInterventionKind(kind) ? 1 : 0}`,
    `affected=${affected}`,
    `after=${after.length}`,
    `helpful=${helpfulEvents}`,
    `harmful=${harmfulEvents}`,
    latest ? `latest=${latest.kind}` : 'latest=none',
    `elapsed=${formatElapsed(elapsedMs)}`,
    `P=${input.stats.population}`,
    `S=${input.stats.avgScore.toFixed(1)}`,
    `E=${input.stats.entropy.toFixed(1)}%`,
  ].join(' / ');

  return {
    id: `impact-${intervention.id}-${after.length}-${traceKind}`,
    kind: traceKind,
    intervention,
    title,
    detail,
    tone,
    confidence,
    evidence,
    elapsedMs,
    metrics,
  };
}
