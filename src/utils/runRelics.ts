import type {
  CivilizationCastMember,
  MealRhythmCue,
  PlayerInterventionKind,
  RunAchievement,
  RunHighlight,
  RunRelic,
  RunRelicRarity,
  WorldEvent,
  WorldEventKind,
  WorldStats,
} from '../types/world';
import { ACTIVE_INTERVENTION_KINDS, countActiveInterventions, countPinnedObservations } from './interventionKinds';

interface RelicInput {
  stats: WorldStats;
  events: WorldEvent[];
  interventionCounts: Record<PlayerInterventionKind, number>;
  civilizationCast: CivilizationCastMember[];
  achievements: RunAchievement[];
  highlights?: RunHighlight[];
  mealRhythm?: MealRhythmCue[];
}

const EVENT_RELICS: Partial<Record<WorldEventKind, {
  title: string;
  subtitle: string;
  detail: string;
  rarity: RunRelicRarity;
}>> = {
  GOLDEN_AGE: {
    title: '黄金纪年盘',
    subtitle: '适应度跃升遗物',
    detail: '记录一次适应度跃升且种群未同步崩塌的繁荣窗口。',
    rarity: 'mythic',
  },
  MASS_EXTINCTION: {
    title: '灭绝灰烬瓶',
    subtitle: '瓶颈压力遗物',
    detail: '封存一次种群崩塌后的幸存证据，适合成为下一局逆转目标。',
    rarity: 'epic',
  },
  TOXIN_CRISIS: {
    title: '代谢毒晶',
    subtitle: '毒素危机遗物',
    detail: '凝结高毒素压力，标记逻辑体进入不稳定突变窗口。',
    rarity: 'rare',
  },
  ENERGY_FAMINE: {
    title: '饥荒刻度尺',
    subtitle: '能量短缺遗物',
    detail: '记录能量断层和代际续航困难，是判断生态承压的证据。',
    rarity: 'rare',
  },
  COOPERATION_CLUSTER: {
    title: '共生餐环',
    subtitle: '协作网络遗物',
    detail: '记录一次利他或协作结构，让复盘不只围绕掠夺和崩塌。',
    rarity: 'rare',
  },
  PREDATOR_RAID: {
    title: '掠食齿轮',
    subtitle: '压力源遗物',
    detail: '记录高攻击逻辑体施加选择压力，推动弱谱系淘汰。',
    rarity: 'rare',
  },
};

const ORIGIN_PRIORITY: Record<RunRelic['origin'], number> = {
  OUTCOME: 80,
  ENTITY: 75,
  EVENT: 70,
  INTERVENTION: 60,
  ACHIEVEMENT: 55,
  RHYTHM: 45,
};

const RARITY_RANK: Record<RunRelicRarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  mythic: 4,
};

function totalInterventions(counts: Record<PlayerInterventionKind, number>) {
  return countActiveInterventions(counts);
}

function relicMetrics(input: RelicInput) {
  return {
    population: input.stats.population,
    avgScore: input.stats.avgScore,
    avgGeneration: input.stats.avgGeneration,
    entropy: input.stats.entropy,
    interventionCount: totalInterventions(input.interventionCounts),
  };
}

function toneForRarity(rarity: RunRelicRarity): WorldEvent['severity'] {
  if (rarity === 'mythic') return 'good';
  if (rarity === 'epic') return 'warning';
  if (rarity === 'rare') return 'info';
  return 'info';
}

function outcomeRelic(input: RelicInput): RunRelic {
  const metrics = relicMetrics(input);
  if (input.stats.population <= 2) {
    return {
      id: 'relic-outcome-embers',
      title: '最后火种匣',
      subtitle: '灭绝边缘遗物',
      detail: '终局种群接近熄灭，剩余谱系成为下一次创世可追踪的火种。',
      origin: 'OUTCOME',
      rarity: 'epic',
      tone: 'danger',
      evidence: `终局种群 ${input.stats.population}`,
      metrics,
    };
  }
  if (input.stats.avgScore >= 80) {
    return {
      id: 'relic-outcome-crown',
      title: '适应王冠',
      subtitle: '高适应文明遗物',
      detail: '平均适应度维持高位，说明优势逻辑体完成了稳定筛选。',
      origin: 'OUTCOME',
      rarity: input.stats.avgScore >= 90 ? 'mythic' : 'epic',
      tone: 'good',
      evidence: `平均适应度 ${input.stats.avgScore.toFixed(2)}`,
      metrics,
    };
  }
  if (input.stats.entropy >= 75) {
    return {
      id: 'relic-outcome-entropy',
      title: '熵潮琥珀',
      subtitle: '高波动终局遗物',
      detail: '高信息熵把本局封存在突变、毒素和选择压力互相拉扯的状态。',
      origin: 'OUTCOME',
      rarity: input.stats.entropy >= 88 ? 'epic' : 'rare',
      tone: 'warning',
      evidence: `信息熵 ${input.stats.entropy.toFixed(1)}%`,
      metrics,
    };
  }
  return {
    id: 'relic-outcome-stable-core',
    title: '稳定晶核',
    subtitle: '平衡演化遗物',
    detail: '种群、适应度和熵压都没有崩盘，本局以可复用的稳定态收束。',
    origin: 'OUTCOME',
    rarity: 'common',
    tone: 'info',
    evidence: `终局快照 P=${input.stats.population} / S=${input.stats.avgScore.toFixed(2)} / E=${input.stats.entropy.toFixed(1)}%`,
    metrics,
  };
}

function castRelic(input: RelicInput): RunRelic | null {
  const priority = ['APEX', 'FOUNDER', 'SURVIVOR', 'CARETAKER', 'PREDATOR'];
  const member = [...input.civilizationCast].sort((a, b) => priority.indexOf(a.role) - priority.indexOf(b.role))[0];
  if (!member) return null;
  const rarity: RunRelicRarity = member.score >= 90 ? 'mythic' : member.score >= 70 ? 'epic' : 'rare';
  return {
    id: `relic-entity-${member.role}-${member.entityId}`,
    title: `${member.title}的核片`,
    subtitle: `实体 #${member.entityId} / ${member.epithet}`,
    detail: member.detail,
    origin: 'ENTITY',
    rarity,
    tone: member.tone,
    evidence: `实体快照 S=${member.score.toFixed(2)} / E=${member.energy.toFixed(1)} / T=${member.toxin.toFixed(2)} / G=${member.generation}`,
    entityId: member.entityId,
    metrics: relicMetrics(input),
  };
}

function eventRelic(input: RelicInput): RunRelic | null {
  const event = [...input.events]
    .filter((item) => Boolean(EVENT_RELICS[item.kind]))
    .sort((a, b) => {
      const relicA = EVENT_RELICS[a.kind];
      const relicB = EVENT_RELICS[b.kind];
      const rankA = relicA ? RARITY_RANK[relicA.rarity] : 0;
      const rankB = relicB ? RARITY_RANK[relicB.rarity] : 0;
      return rankB - rankA || b.timestamp - a.timestamp;
    })[0];
  if (!event) return null;
  const relic = EVENT_RELICS[event.kind];
  if (!relic) return null;
  return {
    id: `relic-event-${event.kind}`,
    title: relic.title,
    subtitle: relic.subtitle,
    detail: relic.detail,
    origin: 'EVENT',
    rarity: relic.rarity,
    tone: event.severity,
    evidence: `${event.title} / ${event.detail}`,
    entityId: event.entityId,
    metrics: relicMetrics(input),
  };
}

function interventionRelic(input: RelicInput): RunRelic | null {
  const total = totalInterventions(input.interventionCounts);
  const pinned = countPinnedObservations(input.interventionCounts);
  if (total === 0 && input.events.length < 5) return null;
  if (total === 0) {
    return {
      id: 'relic-intervention-pure-observer',
      title: '无手观测镜',
      subtitle: '纯观察遗物',
      detail: '玩家未施加主动选择压力，本局主要由系统自发演化形成历史；钉选只作为观察证据。',
      origin: 'INTERVENTION',
      rarity: 'rare',
      tone: 'info',
      evidence: `${input.events.length} 条事件 / 0 次主动干预 / ${pinned} 次钉选观察`,
      metrics: relicMetrics(input),
    };
  }
  const dominant = ACTIVE_INTERVENTION_KINDS
    .map((kind) => [kind, input.interventionCounts[kind] ?? 0] as const)
    .sort((a, b) => b[1] - a[1])[0];
  return {
    id: `relic-intervention-${dominant[0].toLowerCase()}`,
    title: total >= 6 ? '强手改史印' : '观察者指纹',
    subtitle: `${dominant[0]} x${dominant[1]}`,
    detail: '玩家把轻操作写入了本局选择压力，复盘具备可解释的人为变量。',
    origin: 'INTERVENTION',
    rarity: total >= 6 ? 'epic' : 'rare',
    tone: total >= 6 ? 'warning' : 'info',
    evidence: `${total} 次主动干预 / ${pinned} 次钉选观察`,
    metrics: relicMetrics(input),
  };
}

function achievementRelic(input: RelicInput): RunRelic | null {
  const achievement = [...input.achievements]
    .sort((a, b) => RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity])[0];
  if (!achievement) return null;
  return {
    id: `relic-achievement-${achievement.id}`,
    title: `${achievement.title}铭牌`,
    subtitle: `${achievement.rarity.toUpperCase()} medal`,
    detail: achievement.detail,
    origin: 'ACHIEVEMENT',
    rarity: achievement.rarity,
    tone: toneForRarity(achievement.rarity),
    evidence: achievement.evidence,
    metrics: relicMetrics(input),
  };
}

function rhythmRelic(input: RelicInput): RunRelic | null {
  const cue = [...(input.mealRhythm ?? [])]
    .sort((a, b) => b.confidence - a.confidence || b.timestamp - a.timestamp)[0];
  if (!cue) return null;
  return {
    id: `relic-rhythm-${cue.id}`,
    title: '下饭节拍针',
    subtitle: `${cue.action} / ${Math.round(cue.confidence * 100)}%`,
    detail: cue.detail,
    origin: 'RHYTHM',
    rarity: cue.confidence >= 0.85 ? 'rare' : 'common',
    tone: cue.tone,
    evidence: cue.evidence,
    metrics: relicMetrics(input),
  };
}

function highlightRelic(input: RelicInput): RunRelic | null {
  const highlight = [...(input.highlights ?? [])]
    .sort((a, b) => RARITY_RANK[toneToRarity(b.tone)] - RARITY_RANK[toneToRarity(a.tone)] || b.timestamp - a.timestamp)[0];
  if (!highlight) return null;
  const rarity = toneToRarity(highlight.tone);
  return {
    id: `relic-highlight-${highlight.id}`,
    title: '高光切片',
    subtitle: `${highlight.source} mark`,
    detail: highlight.detail,
    origin: 'EVENT',
    rarity,
    tone: highlight.tone,
    evidence: highlight.evidence,
    entityId: highlight.entityId,
    metrics: relicMetrics(input),
  };
}

function toneToRarity(tone: WorldEvent['severity']): RunRelicRarity {
  if (tone === 'danger') return 'epic';
  if (tone === 'warning') return 'rare';
  if (tone === 'good') return 'rare';
  return 'common';
}

function scoreRelic(relic: RunRelic) {
  return RARITY_RANK[relic.rarity] * 100 + ORIGIN_PRIORITY[relic.origin];
}

export function deriveRunRelics(input: RelicInput) {
  const candidates = [
    outcomeRelic(input),
    castRelic(input),
    eventRelic(input),
    interventionRelic(input),
    achievementRelic(input),
    highlightRelic(input),
    rhythmRelic(input),
  ].filter((item): item is RunRelic => Boolean(item));

  const unique = candidates.reduce<RunRelic[]>((list, relic) => {
    if (!list.some((item) => item.id === relic.id)) list.push(relic);
    return list;
  }, []);

  return unique
    .sort((a, b) => scoreRelic(b) - scoreRelic(a))
    .slice(0, 6);
}

export function formatRelicsForShare(relics: RunRelic[]) {
  if (relics.length === 0) return '';
  return [
    '文明遗物：',
    ...relics.slice(0, 4).map((relic) => `- ${relic.title} [${relic.rarity}]｜${relic.evidence}`),
  ].join('\n');
}
