import type { RunSession, WorldEvent, WorldEventKind } from '../types/world';
import { formatRunPhase } from './runSession';

export interface EventDigest {
  id: string;
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  eventIds: string[];
  total: number;
  windowMs: number;
  evidence: string;
  topKinds: Array<{
    kind: WorldEventKind;
    title: string;
    count: number;
  }>;
}

const SEVERITY_WEIGHT: Record<WorldEvent['severity'], number> = {
  info: 1,
  good: 2,
  warning: 3,
  danger: 4,
};

const LOW_SIGNAL_EVENTS = new Set<WorldEventKind>(['RUN_STARTED']);
const INTERVENTION_EVENTS = new Set<WorldEventKind>([
  'PLAYER_BLESSING',
  'PLAYER_POISON',
  'PLAYER_QUARANTINE',
  'PLAYER_EXILE',
  'PINNED_OBSERVATION',
]);

function meaningfulEvents(events: WorldEvent[]) {
  return events.filter((event) => !LOW_SIGNAL_EVENTS.has(event.kind));
}

function eventWindowFor(session: RunSession) {
  if (session.speed >= 8) return 150_000;
  if (session.speed >= 4) return 110_000;
  if (session.speed >= 2) return 85_000;
  return 70_000;
}

function minimumDigestSize(session: RunSession) {
  if (session.speed >= 8) return 4;
  if (session.speed >= 4) return 5;
  return 6;
}

function dominantTone(events: WorldEvent[]): WorldEvent['severity'] {
  return events.reduce<WorldEvent['severity']>((tone, event) => (
    SEVERITY_WEIGHT[event.severity] > SEVERITY_WEIGHT[tone] ? event.severity : tone
  ), 'info');
}

function countByKind(events: WorldEvent[]) {
  const counts = new Map<WorldEventKind, { event: WorldEvent; count: number }>();
  events.forEach((event) => {
    const current = counts.get(event.kind);
    counts.set(event.kind, {
      event,
      count: (current?.count ?? 0) + 1,
    });
  });
  return [...counts.entries()]
    .map(([kind, item]) => ({
      kind,
      title: item.event.title,
      count: item.count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
}

function createTitle(events: WorldEvent[], tone: WorldEvent['severity']) {
  const danger = events.filter((event) => event.severity === 'danger').length;
  const warning = events.filter((event) => event.severity === 'warning').length;
  const good = events.filter((event) => event.severity === 'good').length;
  const interventions = events.filter((event) => INTERVENTION_EVENTS.has(event.kind)).length;

  if (danger >= 2 || tone === 'danger') return '危机事件密集';
  if (interventions >= 2) return '观察者痕迹密集';
  if (good >= 2 && warning === 0) return '繁荣窗口连续';
  if (warning >= 2) return '压力信号连续';
  return '事件流已聚合';
}

function formatSeconds(ms: number) {
  return `${Math.round(ms / 1000)}s`;
}

export function deriveEventDigest(args: {
  session: RunSession;
  events: WorldEvent[];
  now: number;
}): EventDigest | null {
  const meaningful = meaningfulEvents(args.events);
  const windowMs = eventWindowFor(args.session);
  const recent = meaningful
    .filter((event) => args.now - event.timestamp <= windowMs)
    .slice(-16);

  if (recent.length < minimumDigestSize(args.session)) return null;

  const tone = dominantTone(recent);
  const topKinds = countByKind(recent);
  const first = recent[0];
  const last = recent[recent.length - 1];
  const phases = new Set(recent.map((event) => event.phase));
  const danger = recent.filter((event) => event.severity === 'danger').length;
  const warning = recent.filter((event) => event.severity === 'warning').length;
  const good = recent.filter((event) => event.severity === 'good').length;

  return {
    id: `digest-${first.timestamp}-${last.timestamp}-${recent.length}`,
    title: createTitle(recent, tone),
    detail: `近 ${formatSeconds(windowMs)} 聚合 ${recent.length} 条真实事件，覆盖 ${phases.size} 个阶段；危险 ${danger}、压力 ${warning}、正反馈 ${good}。`,
    tone,
    eventIds: recent.map((event) => event.id),
    total: recent.length,
    windowMs,
    evidence: `${formatRunPhase(first.phase)} -> ${formatRunPhase(last.phase)} / 最新：${last.title}`,
    topKinds,
  };
}

export function selectNarrativeEvents(events: WorldEvent[], digest: EventDigest | null, limit = 7) {
  const meaningful = meaningfulEvents(events);
  if (!digest) return meaningful.slice(-limit).reverse();

  const digested = new Set(digest.eventIds);
  const outsideDigest = meaningful.filter((event) => !digested.has(event.id));
  const latest = meaningful[meaningful.length - 1];
  const selected = latest && digested.has(latest.id)
    ? [...outsideDigest.slice(-(limit - 1)), latest]
    : outsideDigest.slice(-limit);

  return selected.reverse();
}
