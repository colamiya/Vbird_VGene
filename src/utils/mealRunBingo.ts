import type {
  MealRunBingoBoard,
  MealRunBingoCell,
  MealRunBingoCellKind,
  MealRunFlavorProfile,
  MealRunScorecard,
  MealRunVariantDeck,
  PlayerInterventionKind,
  RunAchievement,
  RunDiscoveryCue,
  RunObjective,
  RunRelic,
  RunReplayRecipe,
  RunSession,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { countActiveInterventions } from './interventionKinds';
import { naturalWorldEvents } from './worldEvents';

interface MealRunBingoInput {
  session: Pick<RunSession, 'id' | 'theme' | 'speed'>;
  stats: WorldStats;
  events?: WorldEvent[];
  interventionCounts: Record<PlayerInterventionKind, number>;
  objectives?: RunObjective[];
  achievements?: RunAchievement[];
  relics?: RunRelic[];
  discoveries?: RunDiscoveryCue[];
  outcomeTitle: string;
  mealRunScore?: MealRunScorecard | null;
  flavorProfile?: MealRunFlavorProfile | null;
  replayRecipe?: RunReplayRecipe | null;
  variantDeck?: MealRunVariantDeck | null;
}

const KIND_LABELS: Record<MealRunBingoCellKind, string> = {
  STAT: '指标',
  EVENT: '事件',
  INTERVENTION: '手痕',
  OBJECTIVE: '目标',
  COLLECTION: '收藏',
  STORY: '故事',
  REPLAY: '复开',
};

const THEME_LABELS: Record<RunSession['theme'], string> = {
  Ascent: '文明崛起',
  Symbiosis: '共生网络',
  Catastrophe: '灾变压力',
  Apex: '顶点谱系',
};

function totalInterventions(counts: Record<PlayerInterventionKind, number>) {
  return countActiveInterventions(counts);
}

function realEvents(events: WorldEvent[]) {
  return naturalWorldEvents(events);
}

function hasEvent(events: WorldEvent[], predicate: (event: WorldEvent) => boolean) {
  return events.some(predicate);
}

function statsLine(stats: WorldStats) {
  return `P=${stats.population}, S=${stats.avgScore.toFixed(2)}, G=${stats.avgGeneration.toFixed(1)}, E=${stats.entropy.toFixed(1)}%`;
}

function cell(
  id: string,
  kind: MealRunBingoCellKind,
  title: string,
  detail: string,
  complete: boolean,
  tone: WorldEvent['severity'],
  evidence: string,
  score: number,
): MealRunBingoCell {
  return {
    id,
    kind,
    title,
    detail,
    complete,
    tone: complete ? tone : 'info',
    evidence,
    score: Math.max(0, Math.min(100, Math.round(score))),
  };
}

function boardTone(completed: number, total: number, stats: WorldStats): WorldEvent['severity'] {
  if (stats.population <= 2) return completed >= 6 ? 'warning' : 'danger';
  const ratio = total > 0 ? completed / total : 0;
  if (ratio >= 0.75) return 'good';
  if (ratio >= 0.5) return 'info';
  return 'warning';
}

function boardHeadline(completed: number, total: number, score?: MealRunScorecard | null) {
  const ratio = total > 0 ? completed / total : 0;
  if (ratio >= 0.78) return `宾果热局 / ${completed}/${total} / ${score?.label ?? '未评级'}`;
  if (ratio >= 0.56) return `可追局 / ${completed}/${total} / ${score?.label ?? '未评级'}`;
  return `待补局 / ${completed}/${total} / ${score?.label ?? '未评级'}`;
}

function nextPrompt(cells: MealRunBingoCell[]) {
  const missing = cells.filter((item) => !item.complete).slice(0, 3);
  if (missing.length === 0) return '下一局直接开高压变体，尝试把宾果盘再刷成更高事件密度。';
  return `下一局优先补：${missing.map((item) => item.title).join(' / ')}。`;
}

function copyText(board: Omit<MealRunBingoBoard, 'copyText'>) {
  return [
    `V-GENE 下饭宾果：${board.headline}`,
    ...board.cells.map((item) => `${item.complete ? '[x]' : '[ ]'} ${KIND_LABELS[item.kind]}｜${item.title}｜${item.detail}`),
    `下一局：${board.nextPrompt}`,
    `证据：${board.evidence}`,
  ].join('\n');
}

export function deriveMealRunBingoBoard(input: MealRunBingoInput): MealRunBingoBoard {
  const events = realEvents(input.events ?? []);
  const interventionTotal = totalInterventions(input.interventionCounts);
  const completedObjectives = (input.objectives ?? []).filter((objective) => objective.status === 'complete').length;
  const discoveries = input.discoveries ?? [];
  const relics = input.relics ?? [];
  const achievements = input.achievements ?? [];
  const hasCrisis = hasEvent(events, (event) => event.severity === 'danger' || event.kind === 'TOXIN_CRISIS' || event.kind === 'ENERGY_FAMINE');
  const hasHighMoment = hasEvent(events, (event) => event.severity === 'good' || event.kind === 'GOLDEN_AGE' || event.kind === 'COOPERATION_CLUSTER');

  const cells: MealRunBingoCell[] = [
    cell(
      'population-survived',
      'STAT',
      '文明未熄',
      input.stats.population > 2 ? `终局种群 ${input.stats.population}` : '下一局把终局种群保到 3 以上。',
      input.stats.population > 2,
      'good',
      statsLine(input.stats),
      input.stats.population > 2 ? 100 : Math.min(80, input.stats.population * 20),
    ),
    cell(
      'fitness-signal',
      'STAT',
      '适应度成形',
      input.stats.avgScore >= 55 ? `平均适应度 ${input.stats.avgScore.toFixed(2)}` : '下一局让平均适应度冲过 55。',
      input.stats.avgScore >= 55,
      'good',
      statsLine(input.stats),
      input.stats.avgScore,
    ),
    cell(
      'event-density',
      'EVENT',
      '历史够密',
      events.length >= 6 ? `${events.length} 条真实事件` : '下一局至少压出 6 条真实事件。',
      events.length >= 6,
      'info',
      `events=${events.length}`,
      Math.min(100, events.length * 16),
    ),
    cell(
      'turning-point',
      'EVENT',
      '出现拐点',
      hasCrisis || hasHighMoment ? '危机或高光事件已出现。' : '下一局等待危机、黄金时代或协作簇。',
      hasCrisis || hasHighMoment,
      hasCrisis ? 'warning' : 'good',
      `crisis=${hasCrisis}, high=${hasHighMoment}`,
      hasCrisis || hasHighMoment ? 100 : 0,
    ),
    cell(
      'human-trace',
      'INTERVENTION',
      '有手痕',
      interventionTotal > 0 ? `${interventionTotal} 次主动干预。` : '下一局至少执行一次祝福、投毒、隔离或放逐。',
      interventionTotal > 0,
      interventionTotal >= 4 ? 'warning' : 'info',
      `activeInterventions=${interventionTotal}`,
      Math.min(100, interventionTotal * 28),
    ),
    cell(
      'objective-clear',
      'OBJECTIVE',
      '目标达成',
      completedObjectives > 0 ? `${completedObjectives}/${input.objectives?.length ?? 0} 个观测目标达成。` : '下一局至少完成一个观测目标。',
      completedObjectives > 0,
      'good',
      `objectives=${completedObjectives}/${input.objectives?.length ?? 0}`,
      Math.min(100, completedObjectives * 34),
    ),
    cell(
      'collection-proof',
      'COLLECTION',
      '收藏有货',
      discoveries.length + relics.length + achievements.length > 0
        ? `图鉴/遗物/徽章共 ${discoveries.length + relics.length + achievements.length} 个。`
        : '下一局争取解锁图鉴、遗物或徽章。',
      discoveries.length + relics.length + achievements.length > 0,
      relics.length > 0 ? 'good' : 'info',
      `discoveries=${discoveries.length}, relics=${relics.length}, achievements=${achievements.length}`,
      Math.min(100, (discoveries.length + relics.length + achievements.length) * 18),
    ),
    cell(
      'story-flavor',
      'STORY',
      '有口味',
      input.flavorProfile?.tags.length ? input.flavorProfile.headline : `下一局把${THEME_LABELS[input.session.theme]}主线打得更清楚。`,
      Boolean(input.flavorProfile?.tags.length),
      input.flavorProfile?.tone ?? input.mealRunScore?.tone ?? 'info',
      input.flavorProfile?.evidence ?? input.mealRunScore?.evidence ?? statsLine(input.stats),
      input.flavorProfile?.tags.length ? 100 : input.mealRunScore?.score ?? 0,
    ),
    cell(
      'replay-ready',
      'REPLAY',
      '能再开',
      input.variantDeck?.routes.length
        ? `${input.variantDeck.routes.length} 条下局变体已生成。`
        : input.replayRecipe
          ? '复开配方已生成。'
          : '下一局需要先生成复开配方或变体牌组。',
      Boolean(input.variantDeck?.routes.length || input.replayRecipe),
      input.variantDeck?.tone ?? input.replayRecipe?.tone ?? 'info',
      input.variantDeck?.evidence ?? input.replayRecipe?.evidence ?? statsLine(input.stats),
      input.variantDeck?.routes.length ? 100 : input.replayRecipe ? 80 : 0,
    ),
  ];
  const completed = cells.filter((item) => item.complete).length;
  const total = cells.length;
  const boardWithoutCopy: Omit<MealRunBingoBoard, 'copyText'> = {
    title: '下饭宾果卡',
    headline: boardHeadline(completed, total, input.mealRunScore),
    tone: boardTone(completed, total, input.stats),
    completed,
    total,
    cells,
    nextPrompt: nextPrompt(cells),
    evidence: `theme=${THEME_LABELS[input.session.theme]}, speed=${input.session.speed}x, ${statsLine(input.stats)}`,
  };

  return {
    ...boardWithoutCopy,
    copyText: copyText(boardWithoutCopy),
  };
}

export function formatMealRunBingoForShare(board?: MealRunBingoBoard | null) {
  if (!board) return '';
  return [
    `下饭宾果：${board.headline}`,
    ...board.cells.slice(0, 9).map((cellItem) => `${cellItem.complete ? '[x]' : '[ ]'} ${cellItem.title}`),
  ].join('\n');
}
