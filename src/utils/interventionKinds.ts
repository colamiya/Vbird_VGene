import type { PlayerInterventionKind, WorldEvent } from '../types/world';

export const ACTIVE_INTERVENTION_KINDS = ['BLESS', 'POISON', 'QUARANTINE', 'EXILE'] as const;

export const PLAYER_INTERVENTION_EVENT_KINDS: Record<PlayerInterventionKind, WorldEvent['kind']> = {
  BLESS: 'PLAYER_BLESSING',
  POISON: 'PLAYER_POISON',
  QUARANTINE: 'PLAYER_QUARANTINE',
  EXILE: 'PLAYER_EXILE',
  PIN_OBSERVE: 'PINNED_OBSERVATION',
};

export function createEmptyInterventionCounts(): Record<PlayerInterventionKind, number> {
  return {
    BLESS: 0,
    POISON: 0,
    QUARANTINE: 0,
    EXILE: 0,
    PIN_OBSERVE: 0,
  };
}

export function isActiveInterventionKind(kind: PlayerInterventionKind) {
  return (ACTIVE_INTERVENTION_KINDS as readonly PlayerInterventionKind[]).includes(kind);
}

export function isEffectiveInterventionEvent(event: WorldEvent, options: { includePinnedObservation?: boolean } = {}) {
  const kind = event.intervention?.kind;
  if (!kind) return false;
  if ((event.intervention?.affected ?? 0) <= 0) return false;
  if (!options.includePinnedObservation && !isActiveInterventionKind(kind)) return false;
  return event.kind === PLAYER_INTERVENTION_EVENT_KINDS[kind];
}

export function countEffectiveInterventions(
  events: readonly WorldEvent[],
  options: { includePinnedObservation?: boolean } = { includePinnedObservation: true },
) {
  const counts = createEmptyInterventionCounts();
  events.forEach((event) => {
    if (!isEffectiveInterventionEvent(event, options)) return;
    const kind = event.intervention?.kind;
    if (!kind) return;
    counts[kind] += 1;
  });
  return counts;
}

export function countActiveInterventions(counts: Record<PlayerInterventionKind, number>) {
  return ACTIVE_INTERVENTION_KINDS.reduce((sum, kind) => sum + (counts[kind] ?? 0), 0);
}

export function countPinnedObservations(counts: Record<PlayerInterventionKind, number>) {
  return counts.PIN_OBSERVE ?? 0;
}
