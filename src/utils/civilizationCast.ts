import type { CivilizationCastMember, CivilizationCastRole, EntityView, WorldEvent } from '../types/world';

interface Candidate {
  role: CivilizationCastRole;
  entity: EntityView;
  rank: number;
  tone: CivilizationCastMember['tone'];
}

const CARETAKER_MIN_ALTRUISM = 0.55;
const CARETAKER_MIN_COLLABORATION = 0.6;
const PREDATOR_MIN_SCORE = 70;
const PREDATOR_MAX_ALTRUISM = 0.22;

const ROLE_LABEL: Record<CivilizationCastRole, { title: string; epithet: string }> = {
  APEX: { title: '顶点个体', epithet: '资源引力的中心' },
  FOUNDER: { title: '谱系开创者', epithet: '新世代的分叉点' },
  PREDATOR: { title: '掠食压力源', epithet: '低利他的高适应者' },
  CARETAKER: { title: '协作看护者', epithet: '互助网络的稳定节点' },
  SURVIVOR: { title: '瓶颈幸存者', epithet: '高压后的残存火种' },
};

function eventForEntity(events: WorldEvent[], entityId: number) {
  return [...events].reverse().find((event) => event.entityId === entityId);
}

function roleDetail(role: CivilizationCastRole, entity: EntityView, event?: WorldEvent) {
  const base = `#${entity.id} / 第 ${entity.generation} 代 / 适应度 ${entity.score.toFixed(1)} / 能量 ${entity.energy.toFixed(1)}%`;
  const eventText = event ? `；曾触发「${event.title}」` : '';
  const trait =
    role === 'PREDATOR'
      ? `利他 ${(entity.ethics.altruism * 100).toFixed(0)}%，构成局部攻势。`
      : role === 'CARETAKER'
        ? `协作 ${(entity.ethics.collaboration * 100).toFixed(0)}%，利他 ${(entity.ethics.altruism * 100).toFixed(0)}%。`
        : role === 'SURVIVOR'
          ? `毒素 ${(entity.metabolic_toxin * 100).toFixed(1)}%，仍保留生存能力。`
          : `毒素 ${(entity.metabolic_toxin * 100).toFixed(1)}%，具备谱系记录价值。`;
  return `${base}${eventText}。${trait}`;
}

function addCandidate(candidates: Candidate[], candidate: Candidate | null) {
  if (!candidate) return;
  if (!Number.isFinite(candidate.rank)) return;
  candidates.push(candidate);
}

function highestBy(entities: EntityView[], ranker: (entity: EntityView) => number) {
  return entities.reduce<{ entity: EntityView; rank: number } | null>((best, entity) => {
    const rank = ranker(entity);
    if (!Number.isFinite(rank)) return best;
    if (!best || rank > best.rank) return { entity, rank };
    return best;
  }, null);
}

function isQualifiedPredator(entity: EntityView) {
  return entity.score >= PREDATOR_MIN_SCORE && entity.ethics.altruism < PREDATOR_MAX_ALTRUISM;
}

function isQualifiedCaretaker(entity: EntityView) {
  return entity.ethics.altruism >= CARETAKER_MIN_ALTRUISM &&
    entity.ethics.collaboration >= CARETAKER_MIN_COLLABORATION;
}

function buildMember(candidate: Candidate, events: WorldEvent[]): CivilizationCastMember {
  const meta = ROLE_LABEL[candidate.role];
  const entityEvent = eventForEntity(events, candidate.entity.id);
  return {
    role: candidate.role,
    entityId: candidate.entity.id,
    title: meta.title,
    epithet: meta.epithet,
    detail: roleDetail(candidate.role, candidate.entity, entityEvent),
    score: candidate.entity.score,
    energy: candidate.entity.energy,
    toxin: candidate.entity.metabolic_toxin,
    generation: candidate.entity.generation,
    tone: candidate.tone,
  };
}

export function deriveCivilizationCast(entities: EntityView[], events: WorldEvent[], limit = 5) {
  if (entities.length === 0) return [];

  const candidates: Candidate[] = [];
  const apex = highestBy(entities, (entity) => entity.score);
  const founder = highestBy(entities, (entity) => entity.generation * 10 + entity.score / 10);
  const predator = highestBy(
    entities,
    (entity) => isQualifiedPredator(entity)
      ? entity.score * (1 - entity.ethics.altruism) + entity.metabolic_toxin * 20
      : Number.NEGATIVE_INFINITY,
  );
  const caretaker = highestBy(
    entities,
    (entity) => isQualifiedCaretaker(entity)
      ? (entity.ethics.altruism + entity.ethics.collaboration) * 50 + entity.energy / 5
      : Number.NEGATIVE_INFINITY,
  );
  const survivor = highestBy(
    entities,
    (entity) => entity.generation * 8 + entity.energy / 4 - entity.metabolic_toxin * 25,
  );

  addCandidate(candidates, apex && { role: 'APEX', entity: apex.entity, rank: apex.rank, tone: 'good' });
  addCandidate(candidates, founder && { role: 'FOUNDER', entity: founder.entity, rank: founder.rank, tone: 'good' });
  addCandidate(candidates, predator && { role: 'PREDATOR', entity: predator.entity, rank: predator.rank, tone: 'warning' });
  addCandidate(candidates, caretaker && { role: 'CARETAKER', entity: caretaker.entity, rank: caretaker.rank, tone: 'info' });
  addCandidate(candidates, survivor && { role: 'SURVIVOR', entity: survivor.entity, rank: survivor.rank, tone: 'info' });

  const seen = new Set<number>();
  return candidates
    .filter((candidate) => {
      if (seen.has(candidate.entity.id)) return false;
      seen.add(candidate.entity.id);
      return true;
    })
    .slice(0, limit)
    .map((candidate) => buildMember(candidate, events));
}

export function formatCastForShare(cast: CivilizationCastMember[]) {
  if (cast.length === 0) return '';
  return [
    '本局角色：',
    ...cast.slice(0, 3).map((member) => `- ${member.title} #${member.entityId}：${member.epithet}`),
  ].join('\n');
}
