import type {
  MealRunLength,
  MealRunReactionPack,
  MealRunScorecard,
  MealRunSocialClipPack,
  MealRunTheme,
  MealRunVariantDeck,
  MealRunVariantKind,
  MealRunVariantRoute,
  NextRunChallenge,
  PlayerInterventionKind,
  RunReplayRecipe,
  RunSession,
  RunSpeed,
  RunThemeProfile,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { countActiveInterventions } from './interventionKinds';

interface MealRunVariantsInput {
  session: Pick<RunSession, 'id' | 'length' | 'speed' | 'theme'>;
  stats: WorldStats;
  events?: WorldEvent[];
  outcomeTitle: string;
  outcomeReason: string;
  interventionCounts: Record<PlayerInterventionKind, number>;
  themeProfile?: RunThemeProfile | null;
  mealRunScore?: MealRunScorecard | null;
  replayRecipe?: RunReplayRecipe | null;
  reactionPack?: MealRunReactionPack | null;
  socialClipPack?: MealRunSocialClipPack | null;
  nextRunChallenges?: NextRunChallenge[];
}

const LENGTH_LABELS: Record<MealRunLength, string> = {
  Snack: '下饭短局',
  Dinner: '正餐局',
  LongTable: '长桌局',
};

const THEME_LABELS: Record<MealRunTheme, string> = {
  Random: '随机剧本',
  Ascent: '文明崛起',
  Symbiosis: '共生网络',
  Catastrophe: '灾变压力',
  Apex: '顶点谱系',
};

const KIND_LABELS: Record<MealRunVariantKind, string> = {
  REMATCH: '复现',
  COUNTERFACTUAL: '反事实',
  HARDMODE: '高压',
};

const TONE_RANK: Record<WorldEvent['severity'], number> = {
  info: 1,
  good: 2,
  warning: 3,
  danger: 4,
};

function statsLine(stats: WorldStats) {
  return `P=${stats.population}, S=${stats.avgScore.toFixed(2)}, G=${stats.avgGeneration.toFixed(1)}, E=${stats.entropy.toFixed(1)}%`;
}

function formatSpeed(speed: RunSpeed) {
  return `${speed}x`;
}

function compact(text: string, max = 96) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function totalInterventions(counts: Record<PlayerInterventionKind, number>) {
  return countActiveInterventions(counts);
}

function chooseKeyEvent(events: WorldEvent[]) {
  return events
    .filter((event) => event.kind !== 'RUN_STARTED')
    .slice()
    .sort((a, b) => TONE_RANK[b.severity] - TONE_RANK[a.severity] || b.timestamp - a.timestamp)[0];
}

function deckTone(routes: MealRunVariantRoute[], fallback: WorldEvent['severity']) {
  return routes.reduce<WorldEvent['severity']>((tone, item) => (
    TONE_RANK[item.tone] > TONE_RANK[tone] ? item.tone : tone
  ), fallback);
}

function routeCopy(route: Omit<MealRunVariantRoute, 'copyText'>) {
  return [
    `V-GENE 下局变体：${route.title}`,
    `路线：${KIND_LABELS[route.kind]} / ${LENGTH_LABELS[route.recommendedLength]} / ${formatSpeed(route.recommendedSpeed)} / ${THEME_LABELS[route.recommendedTheme]}`,
    `目标：${route.challenge.objective}`,
    `开局：${route.challenge.setup}`,
    `证据：${route.evidence}`,
  ].join('\n');
}

function makeRoute(input: Omit<MealRunVariantRoute, 'copyText'>): MealRunVariantRoute {
  return {
    ...input,
    detail: compact(input.detail, 120),
    copyText: routeCopy(input),
  };
}

function challenge(
  id: string,
  title: string,
  difficulty: NextRunChallenge['difficulty'],
  recommendedLength: MealRunLength,
  recommendedSpeed: RunSpeed,
  recommendedTheme: MealRunTheme,
  objective: string,
  setup: string,
  reason: string,
  evidence: string,
  tone: WorldEvent['severity'],
): NextRunChallenge {
  return {
    id,
    title,
    difficulty,
    recommendedLength,
    recommendedSpeed,
    recommendedTheme,
    objective,
    setup,
    reason,
    evidence,
    tone,
  };
}

function rematchRoute(input: MealRunVariantsInput): MealRunVariantRoute {
  const base = input.replayRecipe?.challenge ?? input.nextRunChallenges?.[0];
  const recommendedLength = input.replayRecipe?.recommendedLength ?? base?.recommendedLength ?? input.session.length;
  const recommendedSpeed = input.replayRecipe?.recommendedSpeed ?? base?.recommendedSpeed ?? input.session.speed;
  const recommendedTheme = input.replayRecipe?.recommendedTheme ?? base?.recommendedTheme ?? input.themeProfile?.theme ?? input.session.theme;
  const scoreLine = input.mealRunScore ? `${input.mealRunScore.score}/100 ${input.mealRunScore.label}` : '未评级';
  const evidence = input.replayRecipe?.evidence ?? base?.evidence ?? statsLine(input.stats);
  const title = '复现这口';
  const objective = base?.objective ?? `复现本局“${input.outcomeTitle}”的主线，验证同一局长、倍率和主题下是否还能形成清晰战报。`;
  const setup = base?.setup ?? `选择${LENGTH_LABELS[recommendedLength]}、${formatSpeed(recommendedSpeed)}、${THEME_LABELS[recommendedTheme]}，前半段保持观察，等关键事件出现后再决定是否干预。`;
  const nextChallenge = challenge(
    `variant-rematch-${input.session.id}`,
    title,
    base?.difficulty ?? 'normal',
    recommendedLength,
    recommendedSpeed,
    recommendedTheme,
    objective,
    setup,
    `本局已经生成可读复盘，适合验证偶然故事能否变成稳定玩法路线。${input.outcomeReason}`,
    evidence,
    input.replayRecipe?.tone ?? base?.tone ?? input.mealRunScore?.tone ?? 'info',
  );

  return makeRoute({
    id: `variant-rematch-${input.session.id}`,
    kind: 'REMATCH',
    title,
    detail: `沿用本局最有效的观看骨架，把 ${scoreLine} 的结果再跑一遍，重点看同一口味能否复现。`,
    recommendedLength,
    recommendedSpeed,
    recommendedTheme,
    challenge: nextChallenge,
    tone: nextChallenge.tone,
    evidence,
  });
}

function counterfactualRoute(input: MealRunVariantsInput): MealRunVariantRoute {
  const highPressure = input.stats.population <= 2 || input.stats.entropy >= 75;
  const highResult = input.stats.avgScore >= 70 || (input.mealRunScore?.score ?? 0) >= 76;
  const keyEvent = chooseKeyEvent(input.events ?? []);

  if (highPressure) {
    const evidence = `${keyEvent?.title ?? '终局高压'} / ${statsLine(input.stats)}`;
    const nextChallenge = challenge(
      `variant-counter-rescue-${input.session.id}`,
      '反事实救火线',
      'hard',
      'Dinner',
      2,
      'Symbiosis',
      '下一局在第一次危机前建立协作保护网，终局种群至少维持在 12 以上。',
      '锁定共生网络主题；前半段钉选观察高协作实体，危机出现时优先隔离和祝福，不急着投毒。',
      '本局压力已经把文明推向瓶颈，反事实路线用更早的保护手段验证是否能改变结局。',
      evidence,
      'warning',
    );
    return makeRoute({
      id: `variant-counter-rescue-${input.session.id}`,
      kind: 'COUNTERFACTUAL',
      title: '如果早点救火',
      detail: '把本局的危机窗口提前处理，看共生和隔离能不能把灭绝/高熵结局改写成稳定文明。',
      recommendedLength: 'Dinner',
      recommendedSpeed: 2,
      recommendedTheme: 'Symbiosis',
      challenge: nextChallenge,
      tone: 'warning',
      evidence,
    });
  }

  if (highResult) {
    const evidence = `${input.mealRunScore?.evidence ?? input.reactionPack?.evidence ?? statsLine(input.stats)}`;
    const nextChallenge = challenge(
      `variant-counter-stress-${input.session.id}`,
      '反事实灾变压力',
      'hard',
      'Dinner',
      4,
      'Catastrophe',
      '下一局给优势文明加入更强选择压力，观察黄金时代是否能穿过毒潮或饥荒。',
      '锁定灾变压力主题；4x 快速进入中段，危机前只标记不救场，危机确认后最多干预一次。',
      '本局结果较强，反事实路线要验证优势是否只是顺风局，还是能跨压力存活。',
      evidence,
      'danger',
    );
    return makeRoute({
      id: `variant-counter-stress-${input.session.id}`,
      kind: 'COUNTERFACTUAL',
      title: '如果压力更大',
      detail: '把本局的顺势演化改成压力测试，用灾变主题检验优势谱系是不是经得起冲击。',
      recommendedLength: 'Dinner',
      recommendedSpeed: 4,
      recommendedTheme: 'Catastrophe',
      challenge: nextChallenge,
      tone: 'danger',
      evidence,
    });
  }

  const interventionTotal = totalInterventions(input.interventionCounts);
  const evidence = `activeInterventions=${interventionTotal}, ${keyEvent?.title ?? 'no key event'}, ${statsLine(input.stats)}`;
  const nextChallenge = challenge(
    `variant-counter-first-hand-${input.session.id}`,
    '反事实轻推一手',
    'normal',
    'Snack',
    2,
    input.themeProfile?.theme ?? 'Apex',
    '下一局只允许一次祝福或隔离，验证玩家轻操作能否把普通结局推成可收藏战报。',
    '开短局和 2x；前 2 分钟只看事件流，出现高分实体或协作窗口时再轻推一次。',
    '本局没有压出明确高低差，反事实路线用一次轻干预制造可检验因果。',
    evidence,
    'info',
  );
  return makeRoute({
    id: `variant-counter-first-hand-${input.session.id}`,
    kind: 'COUNTERFACTUAL',
    title: '如果只改一手',
    detail: '保留随机性，只在关键窗口轻推一次，让下一局更像可读实验而不是纯刷数值。',
    recommendedLength: 'Snack',
    recommendedSpeed: 2,
    recommendedTheme: input.themeProfile?.theme ?? 'Apex',
    challenge: nextChallenge,
    tone: 'info',
    evidence,
  });
}

function hardModeRoute(input: MealRunVariantsInput): MealRunVariantRoute {
  const eventCount = (input.events ?? []).filter((event) => event.kind !== 'RUN_STARTED').length;
  const recommendedLength: MealRunLength = input.session.length === 'LongTable' ? 'LongTable' : 'Dinner';
  const recommendedSpeed: RunSpeed = input.session.speed >= 8 ? 4 : input.session.speed >= 4 ? 4 : 2;
  const recommendedTheme: MealRunTheme = input.stats.avgScore >= 70 ? 'Catastrophe' : 'Apex';
  const scoreTarget = Math.max(70, Math.ceil((input.mealRunScore?.score ?? input.stats.avgScore) + 8));
  const clipEvidence = input.socialClipPack?.clips.length ? `clips=${input.socialClipPack.clips.length}` : 'clips=none';
  const evidence = `events=${eventCount}, target=${scoreTarget}, ${clipEvidence}, ${statsLine(input.stats)}`;
  const nextChallenge = challenge(
    `variant-hardmode-${input.session.id}`,
    '高压下饭挑战',
    input.stats.avgScore >= 85 || input.stats.entropy >= 80 ? 'legendary' : 'hard',
    recommendedLength,
    recommendedSpeed,
    recommendedTheme,
    `下一局把下饭指数或平均适应度再抬高 8 点，同时至少形成 ${Math.max(6, eventCount + 2)} 条真实事件。`,
    `选择${LENGTH_LABELS[recommendedLength]}、${formatSpeed(recommendedSpeed)}、${THEME_LABELS[recommendedTheme]}；允许干预但总次数控制在 3 次以内。`,
    '高压路线把观看目标、传播素材和真实事件密度一起拉高，用来测试这套下饭局是否有持续可玩性。',
    evidence,
    recommendedTheme === 'Catastrophe' ? 'danger' : 'warning',
  );

  return makeRoute({
    id: `variant-hardmode-${input.session.id}`,
    kind: 'HARDMODE',
    title: '高压下饭挑战',
    detail: '把下一局从“看完一局”推进到“刷出更高事件密度和更强战报素材”的硬目标。',
    recommendedLength,
    recommendedSpeed,
    recommendedTheme,
    challenge: nextChallenge,
    tone: nextChallenge.tone,
    evidence,
  });
}

function buildCopyText(deck: Omit<MealRunVariantDeck, 'copyText'>) {
  return [
    `V-GENE 下局变体牌组：${deck.headline}`,
    ...deck.routes.map((route, index) => `${index + 1}. ${route.title}｜${KIND_LABELS[route.kind]}｜${route.challenge.objective}`),
    `证据：${deck.evidence}`,
  ].join('\n');
}

export function deriveMealRunVariantDeck(input: MealRunVariantsInput): MealRunVariantDeck {
  const routes = [
    rematchRoute(input),
    counterfactualRoute(input),
    hardModeRoute(input),
  ];
  const scoreLine = input.mealRunScore ? `${input.mealRunScore.score}/100 ${input.mealRunScore.label}` : '未评级';
  const headline = `${input.outcomeTitle}之后的三条可开路线 / ${scoreLine}`;
  const deckWithoutCopy: Omit<MealRunVariantDeck, 'copyText'> = {
    title: '下局变体牌组',
    headline,
    tone: deckTone(routes, input.mealRunScore?.tone ?? 'info'),
    routes,
    evidence: `routes=${routes.length}, activeInterventions=${totalInterventions(input.interventionCounts)}, ${statsLine(input.stats)}`,
  };

  return {
    ...deckWithoutCopy,
    copyText: buildCopyText(deckWithoutCopy),
  };
}

export function formatMealRunVariantsForShare(deck?: MealRunVariantDeck | null) {
  if (!deck || deck.routes.length === 0) return '';
  return [
    `下局变体：${deck.headline}`,
    ...deck.routes.map((route) => `- ${route.title}：${route.challenge.objective}`),
  ].join('\n');
}
