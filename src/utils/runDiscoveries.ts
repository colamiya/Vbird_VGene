import type { RunDiscoveryCue, RunSession, WorldEvent, WorldEventKind } from '../types/world';
import { getEventCodex } from './eventCodex';
import { formatRunPhase } from './runSession';

interface DiscoveryInput {
  session?: Pick<RunSession, 'startedAt'> | null;
  events: WorldEvent[];
  limit?: number;
}

const LOW_SIGNAL_KINDS = new Set<WorldEventKind>(['RUN_STARTED']);

function isEligibleDiscovery(event: WorldEvent, session?: Pick<RunSession, 'startedAt'> | null) {
  if (LOW_SIGNAL_KINDS.has(event.kind)) return false;
  if (session && event.timestamp < session.startedAt) return false;
  return Boolean(getEventCodex(event.kind));
}

export function deriveRunDiscoveries({ session = null, events, limit = 18 }: DiscoveryInput): RunDiscoveryCue[] {
  const firstEvents = new Map<WorldEventKind, WorldEvent>();
  events.forEach((event) => {
    if (!isEligibleDiscovery(event, session)) return;
    if (!firstEvents.has(event.kind)) {
      firstEvents.set(event.kind, event);
    }
  });

  const selected = Array.from(firstEvents.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-limit);
  const totalDiscoveries = selected.length;

  return selected.flatMap((event, index) => {
    const codex = getEventCodex(event.kind);
    if (!codex) return [];
    const discoveryIndex = index + 1;
    return [{
      id: `discovery-${event.kind}-${event.timestamp}`,
      eventId: event.id,
      kind: event.kind,
      timestamp: event.timestamp,
      phase: event.phase,
      name: codex.name,
      domain: codex.domain,
      rarity: codex.rarity,
      accent: codex.accent,
      title: `发现：${codex.name}`,
      detail: `${event.title} 触发了「${codex.name}」词条，已纳入本局文明图鉴。`,
      science: codex.science,
      history: `${codex.history} 发生阶段：${formatRunPhase(event.phase)}。`,
      gameplay: codex.gameplay,
      evidence: `${event.title} / ${event.detail}`,
      discoveryIndex,
      totalDiscoveries,
    }];
  });
}

export function selectLatestRunDiscoveryCue(input: DiscoveryInput) {
  const discoveries = deriveRunDiscoveries(input);
  return discoveries[discoveries.length - 1] ?? null;
}

export function formatDiscoveriesForShare(discoveries: RunDiscoveryCue[]) {
  if (discoveries.length === 0) return '';
  return [
    `本局图鉴：发现 ${discoveries.length} 个文明词条`,
    ...discoveries.slice(-6).map((discovery) => `- ${discovery.name}：${discovery.domain} / ${discovery.rarity}`),
  ].join('\n');
}
