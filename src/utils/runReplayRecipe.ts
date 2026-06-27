import type {
  MealRunBroadcast,
  MealRunLength,
  MealRunScorecard,
  MealRunTheme,
  NextRunChallenge,
  PlayerInterventionKind,
  RunReplayRecipe,
  RunReplayRecipeStep,
  RunSession,
  RunSpeed,
  RunThemeProfile,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { ACTIVE_INTERVENTION_KINDS, countActiveInterventions, countPinnedObservations } from './interventionKinds';

interface ReplayRecipeInput {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  interventionCounts: Record<PlayerInterventionKind, number>;
  nextRunChallenges: NextRunChallenge[];
  outcomeTitle: string;
  outcomeReason: string;
  themeProfile?: RunThemeProfile;
  mealRunScore?: MealRunScorecard;
  broadcast?: MealRunBroadcast;
}

const THEME_LABELS: Record<MealRunTheme, string> = {
  Random: '随机剧本',
  Ascent: '文明崛起',
  Symbiosis: '共生网络',
  Catastrophe: '灾变压力',
  Apex: '顶点谱系',
};

const LENGTH_LABELS: Record<MealRunLength, string> = {
  Snack: '下饭短局',
  Dinner: '正餐局',
  LongTable: '长桌局',
};

const INTERVENTION_LABELS: Record<PlayerInterventionKind, string> = {
  BLESS: '祝福',
  POISON: '投毒',
  QUARANTINE: '隔离',
  EXILE: '放逐',
  PIN_OBSERVE: '钉选观察',
};

function totalInterventions(counts: Record<PlayerInterventionKind, number>) {
  return countActiveInterventions(counts);
}

function dominantIntervention(counts: Record<PlayerInterventionKind, number>) {
  return ACTIVE_INTERVENTION_KINDS.reduce<PlayerInterventionKind>((best, kind) => {
    return (counts[kind] ?? 0) > (counts[best] ?? 0) ? kind : best;
  }, 'BLESS');
}

function formatSpeed(speed: RunSpeed) {
  return `${speed}x`;
}

function formatStats(stats: WorldStats) {
  return `P=${stats.population} / S=${stats.avgScore.toFixed(2)} / G=${stats.avgGeneration.toFixed(1)} / E=${stats.entropy.toFixed(1)}%`;
}

function recipeTone(input: ReplayRecipeInput, fallback: WorldEvent['severity']) {
  if (input.mealRunScore && input.mealRunScore.score >= 82) return 'good';
  if (input.stats.population <= 2) return 'danger';
  if (input.stats.entropy >= 75) return 'warning';
  return fallback;
}

function fallbackChallenge(input: ReplayRecipeInput): NextRunChallenge {
  const hasCrisis = input.stats.population <= 2 || input.stats.entropy >= 75;
  const theme = input.themeProfile?.theme ?? input.session.theme;
  const recommendedLength: MealRunLength = hasCrisis ? 'Dinner' : input.session.length;
  const recommendedSpeed: RunSpeed = input.session.speed >= 8 ? 2 : input.session.speed;
  const suggestedIntervention = input.themeProfile?.suggestedIntervention ?? 'BLESS';

  return {
    id: `recipe-fallback-${input.session.id}`,
    title: hasCrisis ? '复开救场配方' : '复开复现配方',
    difficulty: hasCrisis ? 'hard' : 'normal',
    recommendedLength,
    recommendedSpeed,
    recommendedTheme: theme,
    objective: hasCrisis
      ? '下一局把危机提前纳入观察，至少保住一个可追踪谱系。'
      : '下一局复现本局最有传播价值的因果链，并形成可收藏战报。',
    setup: `选择${LENGTH_LABELS[recommendedLength]}与 ${formatSpeed(recommendedSpeed)}，主题锁定${THEME_LABELS[theme]}；优先准备${INTERVENTION_LABELS[suggestedIntervention]}。`,
    reason: `${input.outcomeTitle}之后，需要把偶发故事沉淀成可重复的观看路线。`,
    evidence: formatStats(input.stats),
    tone: hasCrisis ? 'warning' : 'info',
  };
}

function chooseBaseChallenge(input: ReplayRecipeInput) {
  return input.nextRunChallenges[0] ?? fallbackChallenge(input);
}

function chooseKeyEvent(events: WorldEvent[]) {
  return events.find((event) => event.severity === 'danger') ??
    events.find((event) => event.severity === 'warning') ??
    events.find((event) => event.severity === 'good') ??
    events[events.length - 1];
}

function eventEvidence(event?: WorldEvent) {
  return event ? `${event.kind} / ${event.detail}` : '';
}

function buildInterventionStep(input: ReplayRecipeInput): RunReplayRecipeStep {
  const interventionTotal = totalInterventions(input.interventionCounts);
  const pinnedObservations = countPinnedObservations(input.interventionCounts);
  const dominant = dominantIntervention(input.interventionCounts);
  const suggested = input.themeProfile?.suggestedIntervention ?? dominant;

  if (interventionTotal >= 3) {
    return {
      id: 'discipline',
      title: '先忍手再改史',
      detail: `本局已有 ${interventionTotal} 次主动干预，复开时前半段只观察，危机确认后再用一次${INTERVENTION_LABELS[suggested]}。`,
      timing: '创世到分化',
      tone: 'warning',
      evidence: `activeInterventions=${interventionTotal}, pinned=${pinnedObservations}, dominant=${INTERVENTION_LABELS[dominant]}`,
    };
  }

  if (interventionTotal === 0) {
    return {
      id: 'discipline',
      title: '保留一次轻干预',
      detail: `本局没有主动改史，复开时可在第一个窗口期执行一次${INTERVENTION_LABELS[suggested]}，验证因果链是否更清晰。`,
      timing: '爆发后 2-4 分钟',
      tone: 'info',
      evidence: `activeInterventions=0, pinned=${pinnedObservations}, suggested=${INTERVENTION_LABELS[suggested]}`,
    };
  }

  return {
    id: 'discipline',
    title: '复制有效手感',
    detail: `沿用本局最常使用的${INTERVENTION_LABELS[dominant]}，但把总干预控制在 1-2 次，避免复盘被玩家操作淹没。`,
    timing: '危机窗口',
    tone: 'good',
    evidence: `activeInterventions=${interventionTotal}, pinned=${pinnedObservations}, dominant=${INTERVENTION_LABELS[dominant]}=${input.interventionCounts[dominant]}`,
  };
}

function buildSteps(input: ReplayRecipeInput, base: NextRunChallenge): RunReplayRecipeStep[] {
  const keyEvent = chooseKeyEvent(input.events);
  const watchEvidence = input.themeProfile?.evidence ?? (eventEvidence(keyEvent) || formatStats(input.stats));
  const watchDetail = input.themeProfile
    ? input.themeProfile.watchFocus
    : keyEvent
      ? `优先观察“${keyEvent.title}”之后的种群回弹、适应度和熵压变化。`
      : '优先观察种群、适应度、世代和熵压是否同步转折。';

  const scoreDetail = input.mealRunScore
    ? `${input.mealRunScore.score}/${input.mealRunScore.maxScore} ${input.mealRunScore.label}`
    : '本局尚无下饭指数，只按终局统计和关键事件复开。';

  return [
    {
      id: 'setup',
      title: '复用开局骨架',
      detail: base.setup,
      timing: '开局前',
      tone: base.tone,
      evidence: base.evidence,
    },
    {
      id: 'watch',
      title: '锁定观察焦点',
      detail: watchDetail,
      timing: '创世到爆发',
      tone: input.themeProfile?.tone ?? keyEvent?.severity ?? 'info',
      evidence: watchEvidence,
    },
    buildInterventionStep(input),
    {
      id: 'share',
      title: '把结果做成战报',
      detail: `复开目标不是刷数值，而是拿到一条更清楚的饭桌故事：${base.objective}`,
      timing: '终局复盘',
      tone: input.mealRunScore?.tone ?? input.broadcast?.tone ?? base.tone,
      evidence: `${scoreDetail} / ${input.broadcast?.title ?? input.outcomeReason}`,
    },
  ];
}

function buildCopyText(recipe: Omit<RunReplayRecipe, 'copyText'>) {
  return [
    `V-GENE 复开配方：${recipe.title}`,
    `推荐：${LENGTH_LABELS[recipe.recommendedLength]} / ${formatSpeed(recipe.recommendedSpeed)} / ${THEME_LABELS[recipe.recommendedTheme]}`,
    `目标：${recipe.objective}`,
    `开局：${recipe.setup}`,
    '步骤：',
    ...recipe.steps.map((step, index) => `${index + 1}. ${step.title}｜${step.timing}｜${step.detail}`),
    `证据：${recipe.evidence}`,
  ].join('\n');
}

export function deriveRunReplayRecipe(input: ReplayRecipeInput): RunReplayRecipe {
  const base = chooseBaseChallenge(input);
  const recommendedTheme = base.recommendedTheme ?? input.themeProfile?.theme ?? input.session.theme;
  const tone = recipeTone(input, base.tone);
  const challenge: NextRunChallenge = {
    ...base,
    id: `replay-${input.session.id}-${base.id}`,
    title: `复开配方：${base.title}`,
    recommendedTheme,
    reason: `${base.reason} 配方由本局真实复盘生成。`,
    evidence: `${base.evidence} / ${formatStats(input.stats)}`,
    tone,
  };
  const steps = buildSteps(input, challenge);
  const scoreLine = input.mealRunScore ? `${input.mealRunScore.score}/${input.mealRunScore.maxScore}` : '未评级';
  const recipeWithoutCopy: Omit<RunReplayRecipe, 'copyText'> = {
    title: challenge.title,
    subtitle: `${input.outcomeTitle} / 下饭指数 ${scoreLine}`,
    recommendedLength: challenge.recommendedLength,
    recommendedSpeed: challenge.recommendedSpeed,
    recommendedTheme,
    objective: challenge.objective,
    setup: challenge.setup,
    tone,
    steps,
    challenge,
    evidence: `events=${input.events.length}, activeInterventions=${totalInterventions(input.interventionCounts)}, pinned=${countPinnedObservations(input.interventionCounts)}, ${formatStats(input.stats)}`,
  };

  return {
    ...recipeWithoutCopy,
    copyText: buildCopyText(recipeWithoutCopy),
  };
}

export function formatReplayRecipeForShare(recipe?: RunReplayRecipe | null) {
  if (!recipe) return '';
  return recipe.copyText;
}
