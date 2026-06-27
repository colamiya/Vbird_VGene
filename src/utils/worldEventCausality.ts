import type { WorldEvent, WorldEventCausality, WorldEventKind } from '../types/world';

interface RelationGuess {
  title: string;
  detail: string;
  baseConfidence: number;
}

const LOW_SIGNAL_EVENTS = new Set<WorldEventKind>(['RUN_STARTED', 'RUN_ENDED']);
const PLAYER_EVENTS = new Set<WorldEventKind>([
  'PLAYER_BLESSING',
  'PLAYER_POISON',
  'PLAYER_QUARANTINE',
  'PLAYER_EXILE',
  'PINNED_OBSERVATION',
]);

function meaningfulEvents(events: WorldEvent[]) {
  return events
    .filter((event) => !LOW_SIGNAL_EVENTS.has(event.kind))
    .sort((a, b) => a.timestamp - b.timestamp);
}

function hasKind(event: WorldEvent, kinds: WorldEventKind[]) {
  return kinds.includes(event.kind);
}

function formatDelta(ms: number) {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 90) return `${seconds}s`;
  return `${Math.round(seconds / 60)}m`;
}

function classifyRelation(source: WorldEvent, target: WorldEvent): RelationGuess {
  if (PLAYER_EVENTS.has(source.kind)) {
    return {
      title: '观察者扰动回响',
      detail: `${source.title} 之后，同一观察窗出现 ${target.title}，需要继续用实体轨迹确认。`,
      baseConfidence: 0.58,
    };
  }

  if (source.kind === 'RESOURCE_BLOOM' && hasKind(target, ['GOLDEN_AGE', 'FIRST_APEX', 'COOPERATION_CLUSTER'])) {
    return {
      title: '资源红利同窗',
      detail: `资源窗口先出现，随后 ${target.title} 同窗出现，可能共享同一段生态红利。`,
      baseConfidence: 0.66,
    };
  }

  if (hasKind(source, ['GOLDEN_AGE', 'RESOURCE_BLOOM']) && hasKind(target, ['TOXIN_CRISIS', 'ENERGY_FAMINE', 'PREDATOR_RAID'])) {
    return {
      title: '繁荣后的压力同窗',
      detail: `${source.title} 后出现 ${target.title}，两者可能处在同一段扩张与压力回摆窗口。`,
      baseConfidence: 0.6,
    };
  }

  if (hasKind(source, ['TOXIN_CRISIS', 'ENERGY_FAMINE', 'PREDATOR_RAID']) && target.kind === 'MASS_EXTINCTION') {
    return {
      title: '压力与灭绝邻近',
      detail: `${source.title} 与 ${target.title} 时间邻近，可能都来自持续压力窗口。`,
      baseConfidence: 0.68,
    };
  }

  if (hasKind(source, ['TOXIN_CRISIS', 'ENERGY_FAMINE', 'MASS_EXTINCTION']) && hasKind(target, ['RESOURCE_BLOOM', 'COOPERATION_CLUSTER', 'GOLDEN_AGE'])) {
    return {
      title: '灾后适应窗口',
      detail: `${source.title} 后出现 ${target.title}，可作为复苏窗口线索继续观察。`,
      baseConfidence: 0.62,
    };
  }

  if (hasKind(source, ['GENERATION_LEAP', 'LINEAGE_FOUNDER']) && hasKind(target, ['FIRST_APEX', 'HALL_OF_FAME', 'GOLDEN_AGE'])) {
    return {
      title: '谱系跃迁相邻',
      detail: `${source.title} 与 ${target.title} 同处谱系升温窗口，可回看主角实体命运线。`,
      baseConfidence: 0.64,
    };
  }

  if (source.kind === 'PREDATOR_RAID' && hasKind(target, ['COOPERATION_CLUSTER', 'PLAYER_QUARANTINE', 'GOLDEN_AGE'])) {
    return {
      title: '捕食压力与组织回应',
      detail: `${source.title} 后出现 ${target.title}，可能表示压力窗口中出现组织化回应。`,
      baseConfidence: 0.58,
    };
  }

  if (source.severity === 'good' && (target.severity === 'warning' || target.severity === 'danger')) {
    return {
      title: '正反馈后的压力回摆',
      detail: `${source.title} 后进入 ${target.title}，繁荣和压力在同一条时间线上交替。`,
      baseConfidence: 0.54,
    };
  }

  if ((source.severity === 'warning' || source.severity === 'danger') && target.severity === 'good') {
    return {
      title: '压力后的适应',
      detail: `${source.title} 之后出现 ${target.title}，可能进入筛选后的适应窗口。`,
      baseConfidence: 0.56,
    };
  }

  if (source.severity === target.severity && source.severity !== 'info') {
    return {
      title: '同类信号连续',
      detail: `${source.title} 和 ${target.title} 连续出现，提示同类生态信号正在累积。`,
      baseConfidence: 0.52,
    };
  }

  return {
    title: '事件接力',
    detail: `${source.title} 之后，${target.title} 成为新的历史节点。`,
    baseConfidence: 0.46,
  };
}

function relationScore(source: WorldEvent, target: WorldEvent) {
  const relation = classifyRelation(source, target);
  const elapsed = Math.max(1, target.timestamp - source.timestamp);
  const freshness = Math.max(0, 1 - elapsed / 420_000);
  const severityBonus = source.severity === 'danger' || target.severity === 'danger'
    ? 0.08
    : source.severity === 'warning' || target.severity === 'warning'
      ? 0.04
      : 0;
  return relation.baseConfidence + freshness * 0.18 + severityBonus;
}

function dominantTone(source: WorldEvent, target: WorldEvent): WorldEvent['severity'] {
  if (target.severity === 'danger' || source.severity === 'danger') return 'danger';
  if (target.severity === 'warning' || source.severity === 'warning') return 'warning';
  if (target.severity === 'good' || source.severity === 'good') return 'good';
  return 'info';
}

export function deriveWorldEventCausality(events: WorldEvent[]): WorldEventCausality | null {
  const meaningful = meaningfulEvents(events);
  if (meaningful.length < 2) return null;

  const target = meaningful[meaningful.length - 1];
  if (!target) return null;
  const candidates = meaningful
    .slice(0, -1)
    .filter((event) => event.timestamp <= target.timestamp)
    .slice(-10);
  if (candidates.length === 0) return null;

  const ranked = candidates
    .map((event) => ({ event, score: relationScore(event, target) }))
    .sort((a, b) => b.score - a.score || b.event.timestamp - a.event.timestamp)[0];
  if (!ranked) return null;
  const source = ranked.event;
  const relation = classifyRelation(source, target);
  const elapsed = Math.max(1, target.timestamp - source.timestamp);
  const freshness = Math.max(0, 1 - elapsed / 420_000);
  const confidence = Math.max(24, Math.min(82, Math.round((relation.baseConfidence * 0.72 + freshness * 0.18) * 100)));

  return {
    id: `association-${source.id}-${target.id}`,
    source,
    target,
    title: relation.title,
    detail: relation.detail,
    tone: dominantTone(source, target),
    confidence,
    evidence: `${source.kind} ~ ${target.kind} / ${formatDelta(elapsed)} / ${source.phase} ~ ${target.phase}`,
  };
}
