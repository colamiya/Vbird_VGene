import type {
  CivilizationFaction,
  CivilizationFactionKind,
  CivilizationFactionLedger,
  EntityView,
  PlayerInterventionKind,
  WorldEvent,
  WorldStats,
} from '../types/world';

interface FactionInput {
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
}

const FACTION_LABELS: Record<CivilizationFactionKind, string> = {
  CARETAKER: '看护者群',
  PREDATOR: '掠食压力源',
  PIONEER: '代际先锋',
  SURVIVOR: '稳态幸存者',
  STRAINED: '濒压个体',
};

const FACTION_TONE: Record<CivilizationFactionKind, WorldEvent['severity']> = {
  CARETAKER: 'good',
  PREDATOR: 'warning',
  PIONEER: 'good',
  SURVIVOR: 'info',
  STRAINED: 'danger',
};

const FACTION_INTERVENTION: Record<CivilizationFactionKind, PlayerInterventionKind> = {
  CARETAKER: 'BLESS',
  PREDATOR: 'EXILE',
  PIONEER: 'PIN_OBSERVE',
  SURVIVOR: 'QUARANTINE',
  STRAINED: 'QUARANTINE',
};

function average(items: EntityView[], selector: (entity: EntityView) => number) {
  if (items.length === 0) return 0;
  return items.reduce((sum, entity) => sum + selector(entity), 0) / items.length;
}

function leaderOf(items: EntityView[]) {
  return items
    .slice()
    .sort((a, b) => b.score - a.score || b.generation - a.generation)[0];
}

function hasRecentEvent(events: WorldEvent[], kinds: WorldEvent['kind'][]) {
  const recent = events.slice(-12);
  return recent.some((event) => kinds.includes(event.kind));
}

function faction(
  id: CivilizationFactionKind,
  members: EntityView[],
  total: number,
  stats: WorldStats,
  events: WorldEvent[],
): CivilizationFaction | null {
  if (members.length === 0) return null;
  const leader = leaderOf(members);
  const avgEnergy = average(members, (entity) => entity.energy);
  const avgToxin = average(members, (entity) => entity.metabolic_toxin);
  const eventSignal = id === 'CARETAKER'
    ? hasRecentEvent(events, ['COOPERATION_CLUSTER', 'RESOURCE_BLOOM'])
    : id === 'PREDATOR'
      ? hasRecentEvent(events, ['PREDATOR_RAID', 'PLAYER_EXILE', 'PLAYER_POISON'])
      : id === 'PIONEER'
        ? hasRecentEvent(events, ['GENERATION_LEAP', 'FIRST_APEX', 'LINEAGE_FOUNDER'])
        : id === 'STRAINED'
          ? hasRecentEvent(events, ['TOXIN_CRISIS', 'ENERGY_FAMINE', 'MASS_EXTINCTION'])
          : hasRecentEvent(events, ['GOLDEN_AGE', 'RESOURCE_BLOOM']);

  return {
    id,
    label: FACTION_LABELS[id],
    count: members.length,
    ratio: total > 0 ? members.length / total : 0,
    leaderId: leader?.id,
    leaderScore: leader?.score ?? 0,
    averageEnergy: avgEnergy,
    averageToxin: avgToxin,
    tone: eventSignal ? FACTION_TONE[id] : id === 'STRAINED' && avgToxin > 0.72 ? 'danger' : FACTION_TONE[id],
    suggestedIntervention: FACTION_INTERVENTION[id],
    evidence: [
      `n=${members.length}/${total}`,
      `leader=${leader?.id ?? 'none'}`,
      `S=${(leader?.score ?? 0).toFixed(1)}`,
      `E=${avgEnergy.toFixed(1)}`,
      `T=${(avgToxin * 100).toFixed(1)}%`,
      `avgS=${stats.avgScore.toFixed(1)}`,
      eventSignal ? 'recentEvent=yes' : 'recentEvent=no',
    ].join(' / '),
  };
}

function classifyEntities(input: FactionInput) {
  const avgScore = Math.max(1, input.stats.avgScore);
  const avgGeneration = Math.max(0, input.stats.avgGeneration);
  return {
    CARETAKER: input.entities.filter((entity) => (
      entity.ethics.altruism >= 0.58 &&
      entity.ethics.collaboration >= 0.55 &&
      entity.metabolic_toxin <= 0.55
    )),
    PREDATOR: input.entities.filter((entity) => (
      entity.score >= avgScore * 1.15 &&
      (entity.ethics.altruism <= 0.38 || entity.metabolic_toxin >= 0.62)
    )),
    PIONEER: input.entities.filter((entity) => (
      entity.generation >= avgGeneration + 2 ||
      entity.score >= avgScore * 1.35
    )),
    SURVIVOR: input.entities.filter((entity) => (
      entity.energy >= 62 &&
      entity.metabolic_toxin <= 0.32 &&
      entity.score >= avgScore * 0.8
    )),
    STRAINED: input.entities.filter((entity) => (
      entity.energy <= 28 ||
      entity.metabolic_toxin >= 0.72
    )),
  } satisfies Record<CivilizationFactionKind, EntityView[]>;
}

function titleFor(dominant: CivilizationFaction | undefined, stats: WorldStats) {
  if (!dominant) return '阵营未成形';
  if (dominant.id === 'STRAINED') return '压力阵营扩大';
  if (dominant.id === 'PREDATOR') return '掠食者掌握节奏';
  if (dominant.id === 'CARETAKER') return '互助网络抬头';
  if (dominant.id === 'PIONEER') return '先锋谱系突进';
  if (stats.population <= 3) return '幸存者收缩';
  return '稳态族群占优';
}

function subtitleFor(factions: CivilizationFaction[], total: number) {
  if (total <= 0) return '等待世界产生可归类实体。';
  const labels = factions.slice(0, 3).map((item) => `${item.label} ${item.count}`).join(' / ');
  return labels || '实体暂未形成清晰阵营。';
}

export function deriveCivilizationFactionLedger(input: FactionInput): CivilizationFactionLedger {
  const total = input.entities.length;
  const classified = classifyEntities(input);
  const factions = (Object.keys(classified) as CivilizationFactionKind[])
    .map((id) => faction(id, classified[id], total, input.stats, input.events))
    .filter((item): item is CivilizationFaction => Boolean(item))
    .sort((a, b) => b.count - a.count || b.leaderScore - a.leaderScore)
    .slice(0, 5);
  const dominant = factions[0];
  const tone = dominant?.tone ?? 'info';

  return {
    title: titleFor(dominant, input.stats),
    subtitle: subtitleFor(factions, total),
    tone,
    total,
    factions,
    dominant,
    evidence: [
      `population=${total}`,
      `classified=${factions.reduce((sum, item) => sum + item.count, 0)}`,
      `dominant=${dominant?.id ?? 'none'}`,
      `avgScore=${input.stats.avgScore.toFixed(1)}`,
      `entropy=${input.stats.entropy.toFixed(1)}%`,
    ].join(' / '),
  };
}
