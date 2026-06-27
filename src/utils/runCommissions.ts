import type {
  EntityView,
  RunCommission,
  RunCommissionBoard,
  RunCommissionGrade,
  RunObjective,
  RunSession,
  WorldEvent,
  WorldEventKind,
  WorldStats,
} from '../types/world';
import { naturalWorldEvents } from './worldEvents';

interface CommissionInput {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  entities: EntityView[];
  objectives: RunObjective[];
  now?: number;
}

const GRADE_LABELS: Record<RunCommissionGrade, string> = {
  missed: '未达成',
  bronze: '青铜',
  silver: '白银',
  gold: '黄金',
  legend: '传奇',
};

const BOARD_TITLES: Record<RunCommissionGrade, string> = {
  missed: '失约餐桌',
  bronze: '青铜观察单',
  silver: '白银观察单',
  gold: '黄金委托单',
  legend: '传奇下饭局',
};

const THEME_LABELS: Record<RunSession['theme'], string> = {
  Ascent: '文明崛起',
  Symbiosis: '共生网络',
  Catastrophe: '灾变压力',
  Apex: '顶点谱系',
};

const DANGER_EVENTS = new Set<WorldEventKind>(['MASS_EXTINCTION', 'TOXIN_CRISIS', 'ENERGY_FAMINE', 'PREDATOR_RAID']);

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function roundScore(score: number) {
  return Math.round(clamp(score, 0, 100));
}

function objectiveById(objectives: RunObjective[], id: string) {
  return objectives.find((objective) => objective.id === id);
}

function objectiveScore(objective: RunObjective | undefined, weight: number) {
  if (!objective) return 0;
  const bonus = objective.status === 'complete' ? 0.08 : objective.status === 'failed' ? -0.2 : 0;
  return clamp(objective.progress + bonus) * weight;
}

function hasEvent(events: WorldEvent[], kind: WorldEventKind) {
  return events.some((event) => event.kind === kind);
}

function meaningfulEvents(events: WorldEvent[]) {
  return naturalWorldEvents(events);
}

function countDangerEvents(events: WorldEvent[]) {
  return meaningfulEvents(events).filter((event) => DANGER_EVENTS.has(event.kind)).length;
}

function countPhases(events: WorldEvent[]) {
  return new Set(meaningfulEvents(events).map((event) => event.phase)).size;
}

function maxScore(entities: EntityView[]) {
  return entities.reduce((max, entity) => Math.max(max, entity.score), 0);
}

function averageEnergy(entities: EntityView[]) {
  if (entities.length === 0) return 0;
  return entities.reduce((sum, entity) => sum + entity.energy, 0) / entities.length;
}

function cooperativeEntities(entities: EntityView[]) {
  return entities.filter((entity) => entity.ethics.collaboration >= 0.62 && entity.ethics.altruism >= 0.38).length;
}

function themeBonus(session: RunSession, kind: RunCommission['kind']) {
  if (session.theme === 'Ascent' && kind === 'SURVIVAL') return 12;
  if (session.theme === 'Symbiosis' && kind === 'SYMBIOSIS') return 14;
  if (session.theme === 'Catastrophe' && kind === 'CRISIS') return 14;
  if (session.theme === 'Apex' && kind === 'APEX') return 14;
  return 0;
}

function gradeFor(score: number, maxScoreValue: number): RunCommissionGrade {
  const ratio = maxScoreValue <= 0 ? 0 : score / maxScoreValue;
  if (ratio >= 0.95) return 'legend';
  if (ratio >= 0.8) return 'gold';
  if (ratio >= 0.6) return 'silver';
  if (ratio >= 0.35) return 'bronze';
  return 'missed';
}

function toneFor(grade: RunCommissionGrade, failed = false): RunCommission['tone'] {
  if (failed) return 'danger';
  if (grade === 'legend' || grade === 'gold') return 'good';
  if (grade === 'silver') return 'info';
  if (grade === 'bronze') return 'warning';
  return 'danger';
}

function statusFor(grade: RunCommissionGrade, failed = false): RunCommission['status'] {
  if (failed) return 'failed';
  return grade === 'missed' ? 'active' : 'complete';
}

function commission(args: Omit<RunCommission, 'grade' | 'status' | 'tone' | 'score' | 'maxScore'> & {
  score: number;
  failed?: boolean;
}): RunCommission {
  const maxScoreValue = 100;
  const score = roundScore(args.score);
  const grade = gradeFor(score, maxScoreValue);
  const { failed, ...commissionArgs } = args;
  return {
    ...commissionArgs,
    score,
    maxScore: maxScoreValue,
    grade,
    status: statusFor(grade, failed),
    tone: toneFor(grade, failed),
  };
}

export function formatCommissionGrade(grade: RunCommissionGrade) {
  return GRADE_LABELS[grade];
}

export function deriveRunCommissionBoard(input: CommissionInput): RunCommissionBoard {
  const events = meaningfulEvents(input.events);
  const eventCount = events.length;
  const dangerCount = countDangerEvents(input.events);
  const phaseCount = countPhases(input.events);
  const topScore = maxScore(input.entities);
  const cooperators = cooperativeEntities(input.entities);
  const avgEnergy = averageEnergy(input.entities);
  const elapsedRatio = clamp(((input.now ?? Date.now()) - input.session.startedAt) / input.session.targetDurationMs);

  const historyObjective = objectiveById(input.objectives, 'history-log');
  const survivalObjective = objectiveById(input.objectives, 'protect-embers');
  const apexObjective = objectiveById(input.objectives, 'find-apex');
  const cooperationObjective = objectiveById(input.objectives, 'cooperation-watch');
  const crisisObjective = objectiveById(input.objectives, 'crisis-crossing');

  const commissions = [
    commission({
      id: 'commission-history',
      kind: 'HISTORY',
      title: '史官委托',
      patron: '档案馆',
      detail: '把本局演化记录成足够可讲述的历史，而不是只剩终局数字。',
      score: objectiveScore(historyObjective, 50) + clamp(eventCount / 8) * 30 + clamp(phaseCount / 4) * 20 + themeBonus(input.session, 'HISTORY'),
      objectiveIds: ['history-log'],
      evidence: `${eventCount} 条有效事件 / ${phaseCount} 个阶段`,
    }),
    commission({
      id: 'commission-survival',
      kind: 'SURVIVAL',
      title: '火种保全委托',
      patron: '生态席',
      detail: '在吃完一局前保住足够样本，让文明有余烬、有分叉、有复盘价值。',
      score: objectiveScore(survivalObjective, 44)
        + objectiveScore(crisisObjective, 18)
        + clamp(input.stats.population / Math.max(1, survivalObjective?.target ?? 10)) * 24
        + clamp(avgEnergy / 70) * 14
        + themeBonus(input.session, 'SURVIVAL'),
      failed: survivalObjective?.status === 'failed',
      objectiveIds: ['protect-embers', 'crisis-crossing'],
      evidence: `P=${input.stats.population} / 平均能量 ${avgEnergy.toFixed(1)}`,
    }),
    commission({
      id: 'commission-apex',
      kind: 'APEX',
      title: '顶点目击委托',
      patron: '谱系院',
      detail: '捕捉高适应个体或开创谱系，让这局有可记住的数字生命主角。',
      score: objectiveScore(apexObjective, 52)
        + clamp(topScore / 90) * 26
        + clamp(input.stats.avgGeneration / 12) * 12
        + (hasEvent(input.events, 'FIRST_APEX') || hasEvent(input.events, 'LINEAGE_FOUNDER') ? 10 : 0)
        + themeBonus(input.session, 'APEX'),
      objectiveIds: ['find-apex'],
      evidence: `最高适应度 ${topScore.toFixed(1)} / 平均世代 ${input.stats.avgGeneration.toFixed(1)}`,
    }),
    commission({
      id: 'commission-symbiosis',
      kind: 'SYMBIOSIS',
      title: '共生研究委托',
      patron: '博弈实验室',
      detail: '寻找协作和利他结构，证明文明不是只能靠掠夺推动演化。',
      score: objectiveScore(cooperationObjective, 58)
        + clamp(cooperators / 5) * 27
        + (hasEvent(input.events, 'COOPERATION_CLUSTER') ? 15 : 0)
        + themeBonus(input.session, 'SYMBIOSIS'),
      objectiveIds: ['cooperation-watch'],
      evidence: `${cooperators} 个协作候选 / ${hasEvent(input.events, 'COOPERATION_CLUSTER') ? '已触发共生事件' : '未触发共生事件'}`,
    }),
    commission({
      id: 'commission-crisis',
      kind: 'CRISIS',
      title: '危机样本委托',
      patron: '压力测试席',
      detail: '记录毒潮、饥荒、掠食或灭绝压力，并观察文明是否能穿过去。',
      score: objectiveScore(crisisObjective, 42)
        + clamp(dangerCount / 3) * 28
        + (dangerCount > 0 ? clamp(input.stats.population / 6) * 20 : elapsedRatio * 10)
        + (dangerCount > 0 && input.stats.population > 2 ? 10 : 0)
        + themeBonus(input.session, 'CRISIS'),
      failed: crisisObjective?.status === 'failed',
      objectiveIds: ['crisis-crossing', 'protect-embers'],
      evidence: `${dangerCount} 个危机事件 / P=${input.stats.population}`,
    }),
  ];

  const score = commissions.reduce((sum, item) => sum + item.score, 0);
  const maxScoreValue = commissions.reduce((sum, item) => sum + item.maxScore, 0);
  const grade = gradeFor(score, maxScoreValue);
  const completed = commissions.filter((item) => item.status === 'complete').length;

  return {
    title: BOARD_TITLES[grade],
    grade,
    score,
    maxScore: maxScoreValue,
    completed,
    total: commissions.length,
    evidence: `${completed}/${commissions.length} 个委托达成，综合 ${score}/${maxScoreValue}，主题 ${THEME_LABELS[input.session.theme]}`,
    commissions,
  };
}

export function formatCommissionsForShare(board?: RunCommissionBoard | null) {
  if (!board) return '';
  return [
    `饭局委托：${board.title} [${formatCommissionGrade(board.grade)}] ${board.score}/${board.maxScore}`,
    ...board.commissions.slice(0, 4).map((item) =>
      `- ${item.title} [${formatCommissionGrade(item.grade)}] ${item.evidence}`,
    ),
  ].join('\n');
}
