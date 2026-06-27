import type {
  CivilizationCastMember,
  PlayerInterventionKind,
  RunAchievement,
  RunSession,
  WorldEvent,
  WorldEventKind,
  WorldStats,
} from '../types/world';
import { countActiveInterventions } from './interventionKinds';

interface AchievementInput {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  interventionCounts: Record<PlayerInterventionKind, number>;
  civilizationCast: CivilizationCastMember[];
}

function hasEvent(events: WorldEvent[], kind: WorldEventKind) {
  return events.some((event) => event.kind === kind);
}

function countEvent(events: WorldEvent[], kinds: WorldEventKind[]) {
  return events.filter((event) => kinds.includes(event.kind)).length;
}

function totalInterventions(counts: Record<PlayerInterventionKind, number>) {
  return countActiveInterventions(counts);
}

const RUN_LENGTH_LABELS: Record<RunSession['length'], string> = {
  Snack: '下饭短局 8-12 分钟',
  Dinner: '正餐局 15-20 分钟',
  LongTable: '长桌局 30+ 分钟',
};

function pushAchievement(list: RunAchievement[], achievement: RunAchievement | null) {
  if (!achievement) return;
  if (list.some((item) => item.id === achievement.id)) return;
  list.push(achievement);
}

export function deriveRunAchievements(input: AchievementInput) {
  const achievements: RunAchievement[] = [];
  const crisisCount = countEvent(input.events, ['MASS_EXTINCTION', 'TOXIN_CRISIS', 'ENERGY_FAMINE']);
  const interventionTotal = totalInterventions(input.interventionCounts);
  const hasFounder = hasEvent(input.events, 'LINEAGE_FOUNDER') || input.civilizationCast.some((member) => member.role === 'FOUNDER');
  const hasApex = hasEvent(input.events, 'FIRST_APEX') || input.civilizationCast.some((member) => member.role === 'APEX');
  const hasCaretaker = hasEvent(input.events, 'COOPERATION_CLUSTER') || input.civilizationCast.some((member) => member.role === 'CARETAKER');

  pushAchievement(achievements, hasApex ? {
    id: 'apex-record',
    title: '顶点目击',
    detail: '本局记录到高适应个体形成资源引力。',
    rarity: 'common',
    evidence: 'FIRST_APEX 或终局顶点角色',
  } : null);

  pushAchievement(achievements, hasFounder ? {
    id: 'lineage-founder',
    title: '谱系奠基',
    detail: '新世代主干出现，复盘具备可追踪的文明分叉点。',
    rarity: 'rare',
    evidence: 'LINEAGE_FOUNDER 或终局开创者角色',
  } : null);

  pushAchievement(achievements, hasCaretaker ? {
    id: 'cooperation-table',
    title: '共餐网络',
    detail: '协作或利他结构在本局形成，文明不只依靠掠夺延续。',
    rarity: 'rare',
    evidence: 'COOPERATION_CLUSTER 或协作看护者',
  } : null);

  pushAchievement(achievements, crisisCount > 0 ? {
    id: 'crisis-witness',
    title: '危机见证',
    detail: '本局出现过灭绝、毒素或饥荒压力。',
    rarity: crisisCount >= 2 ? 'epic' : 'rare',
    evidence: `${crisisCount} 个危机事件`,
  } : null);

  pushAchievement(achievements, hasEvent(input.events, 'GOLDEN_AGE') ? {
    id: 'golden-age',
    title: '短暂黄金时代',
    detail: '适应度跃升且种群未同步崩塌，形成传播价值高的高光局。',
    rarity: 'mythic',
    evidence: 'GOLDEN_AGE',
  } : null);

  pushAchievement(achievements, interventionTotal >= 3 ? {
    id: 'hand-of-observer',
    title: '观察者之手',
    detail: '玩家多次改变局部选择压力，复盘拥有清晰人为痕迹。',
    rarity: interventionTotal >= 6 ? 'epic' : 'rare',
    evidence: `${interventionTotal} 次玩家干预`,
  } : null);

  pushAchievement(achievements, interventionTotal === 0 && input.events.length >= 5 ? {
    id: 'pure-watcher',
    title: '纯观察者',
    detail: '玩家未干预，只观看系统自发演化并形成足够历史记录。',
    rarity: 'rare',
    evidence: `${input.events.length} 条事件，无玩家干预`,
  } : null);

  pushAchievement(achievements, input.session.speed >= 4 ? {
    id: 'fast-table',
    title: '倍速史官',
    detail: `以 ${input.session.speed}x 观看演化，压缩下饭局时间密度。`,
    rarity: input.session.speed >= 8 ? 'epic' : 'common',
    evidence: `${RUN_LENGTH_LABELS[input.session.length]} / ${input.session.speed}x`,
  } : null);

  pushAchievement(achievements, input.stats.population <= 2 ? {
    id: 'last-embers',
    title: '余烬终局',
    detail: '终局种群接近灭绝，幸存样本成为复盘核心。',
    rarity: 'epic',
    evidence: `终局种群 ${input.stats.population}`,
  } : null);

  pushAchievement(achievements, input.stats.avgScore >= 70 ? {
    id: 'high-fitness-civilization',
    title: '高适应文明',
    detail: '终局平均适应度维持高位，优势逻辑体完成筛选。',
    rarity: input.stats.avgScore >= 85 ? 'mythic' : 'epic',
    evidence: `平均适应度 ${input.stats.avgScore.toFixed(2)}`,
  } : null);

  return achievements.slice(0, 8);
}

export function formatAchievementsForShare(achievements: RunAchievement[]) {
  if (achievements.length === 0) return '';
  return [
    '本局徽章：',
    ...achievements.slice(0, 4).map((achievement) => `- ${achievement.title} [${achievement.rarity}]`),
  ].join('\n');
}
