import type { WorldEvent, WorldEventKind } from '../types/world';
import { getEventCodex } from './eventCodex';
import { formatRunPhase } from './runSession';

export interface EventInsight {
  event: WorldEvent;
  name: string;
  domain: string;
  science: string;
  history: string;
  gameplay: string;
  accent: 'cyan' | 'green' | 'yellow' | 'red' | 'purple' | 'white';
}

const LOW_SIGNAL_EVENTS = new Set<WorldEventKind>(['RUN_STARTED']);

export function getEventInsight(event: WorldEvent): EventInsight | null {
  const codex = getEventCodex(event.kind);
  if (!codex) return null;

  return {
    event,
    name: codex.name,
    domain: codex.domain,
    science: codex.science,
    history: `${codex.history} 当前发生在${formatRunPhase(event.phase)}期。`,
    gameplay: codex.gameplay,
    accent: codex.accent,
  };
}

export function selectLatestEventInsight(events: WorldEvent[]) {
  const event = events
    .slice()
    .reverse()
    .find((item) => !LOW_SIGNAL_EVENTS.has(item.kind))
    ?? events[events.length - 1];

  return event ? getEventInsight(event) : null;
}
