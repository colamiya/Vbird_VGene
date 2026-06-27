import type { RunHighlight, RunPhase, RunSession, WorldEvent, WorldStats } from '../types/world';
import type { DirectorCue, DirectorCueTone } from './directorCues';
import { formatRunDuration, formatRunPhase } from './runSession';

const HIGHLIGHT_LIMIT = 12;
const DUPLICATE_WINDOW_MS = 20_000;

const DIRECTOR_TONE_TO_EVENT_TONE: Record<DirectorCueTone, WorldEvent['severity']> = {
  calm: 'info',
  growth: 'good',
  warning: 'warning',
  danger: 'danger',
  ascend: 'good',
};

function latestMeaningfulEvent(events: WorldEvent[]) {
  return [...events].reverse().find((event) => event.kind !== 'RUN_STARTED') ?? null;
}

function createMetrics(stats: WorldStats) {
  return {
    population: stats.population,
    avgScore: stats.avgScore,
    avgGeneration: stats.avgGeneration,
    entropy: stats.entropy,
  };
}

function createId(session: RunSession, now: number, sourceId: string) {
  return `${session.id}-highlight-${sourceId}-${now}`;
}

export function createRunHighlight(args: {
  session: RunSession;
  phase: RunPhase;
  stats: WorldStats;
  events: WorldEvent[];
  cue?: DirectorCue | null;
  now?: number;
}): RunHighlight {
  const now = args.now ?? Date.now();
  const latestEvent = latestMeaningfulEvent(args.events);

  if (args.cue) {
    return {
      id: createId(args.session, now, args.cue.id),
      timestamp: now,
      phase: args.phase,
      title: args.cue.title,
      detail: args.cue.directive,
      source: 'DIRECTOR',
      tone: DIRECTOR_TONE_TO_EVENT_TONE[args.cue.tone],
      evidence: args.cue.evidence,
      entityId: args.cue.entityId,
      metrics: createMetrics(args.stats),
    };
  }

  if (latestEvent) {
    return {
      id: createId(args.session, now, latestEvent.kind),
      timestamp: now,
      phase: latestEvent.phase,
      title: latestEvent.title,
      detail: latestEvent.detail,
      source: 'EVENT',
      tone: latestEvent.severity,
      evidence: `事件发生于 ${formatRunPhase(latestEvent.phase)}期 / ${new Date(latestEvent.timestamp).toLocaleTimeString('zh-CN', { hour12: false })}`,
      entityId: latestEvent.entityId,
      metrics: createMetrics(args.stats),
    };
  }

  return {
    id: createId(args.session, now, 'world'),
    timestamp: now,
    phase: args.phase,
    title: '全域静默高光',
    detail: '玩家在没有单一事件主导时标记了当前世界快照。',
    source: 'WORLD',
    tone: 'info',
    evidence: `P=${args.stats.population} / S=${args.stats.avgScore.toFixed(1)} / G=${args.stats.avgGeneration.toFixed(1)} / H=${args.stats.entropy.toFixed(1)}%`,
    metrics: createMetrics(args.stats),
  };
}

export function appendRunHighlight(current: RunHighlight[], next: RunHighlight) {
  const isDuplicate = current.some((item) => {
    if (item.source !== next.source) return false;
    if (item.entityId !== next.entityId) return false;
    if (item.title !== next.title) return false;
    return Math.abs(item.timestamp - next.timestamp) < DUPLICATE_WINDOW_MS;
  });

  if (isDuplicate) return current;
  return [...current, next]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-HIGHLIGHT_LIMIT);
}

export function formatHighlightsForShare(highlights: RunHighlight[], startedAt: number) {
  if (highlights.length === 0) return '';
  const lines = highlights
    .slice(-4)
    .map((highlight) => {
      const target = typeof highlight.entityId === 'number' ? ` #${highlight.entityId}` : '';
      return `- T+${formatRunDuration(Math.max(0, highlight.timestamp - startedAt))} ${highlight.title}${target}`;
    });
  return ['精彩瞬间：', ...lines].join('\n');
}
