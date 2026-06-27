import type {
  MealMomentDeck,
  MealRunBroadcast,
  MealRunFlavorProfile,
  MealRunScorecard,
  MealRunShareAsset,
  MealRunShareAssetKind,
  MealRunShareBundle,
  MealRunLength,
  MealRunTheme,
  NextRunChallenge,
  RunDiscoveryCue,
  RunRelic,
  RunReplayRecipe,
  RunSession,
  RunShareCard,
  RunSpeed,
  WorldEvent,
  WorldStats,
} from '../types/world';

interface MealRunShareBundleInput {
  session: Pick<RunSession, 'id' | 'length' | 'speed' | 'theme'>;
  stats: WorldStats;
  events?: WorldEvent[];
  outcomeTitle: string;
  shareCard?: RunShareCard | null;
  flavorProfile?: MealRunFlavorProfile | null;
  broadcast?: MealRunBroadcast | null;
  mealMoments?: MealMomentDeck | null;
  replayRecipe?: RunReplayRecipe | null;
  relics?: RunRelic[];
  discoveries?: RunDiscoveryCue[];
  nextRunChallenges?: NextRunChallenge[];
  mealRunScore?: MealRunScorecard | null;
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

const ASSET_ACTION_LABELS: Record<MealRunShareAssetKind, string> = {
  POSTER: '导出 SVG',
  FLAVOR: '复制口味',
  BROADCAST: '复制播报',
  MOMENTS: '复制卡包',
  RECIPE: '按配方再开',
  RELICS: '收藏遗物',
  CODEX: '打开图鉴',
  CHALLENGE: '载入挑战',
};

const TONE_RANK: Record<WorldEvent['severity'], number> = {
  info: 1,
  good: 2,
  warning: 3,
  danger: 4,
};

function formatSpeed(speed: RunSpeed) {
  return `${speed}x`;
}

function statsEvidence(stats: WorldStats) {
  return `P=${stats.population}, S=${stats.avgScore.toFixed(2)}, G=${stats.avgGeneration.toFixed(1)}, E=${stats.entropy.toFixed(1)}%`;
}

function listTitles(items: Array<{ title?: string; name?: string }>, limit = 3) {
  return items
    .slice(0, limit)
    .map((item) => item.title ?? item.name)
    .filter(Boolean)
    .join(' / ');
}

function asset(
  kind: MealRunShareAssetKind,
  title: string,
  detail: string,
  tone: WorldEvent['severity'],
  evidence: string,
  ready: boolean,
): MealRunShareAsset {
  return {
    id: `share-asset-${kind.toLowerCase()}`,
    kind,
    title,
    detail,
    actionLabel: ASSET_ACTION_LABELS[kind],
    tone: ready ? tone : 'warning',
    evidence,
    ready,
  };
}

function headlineForReadyCount(readyCount: number, totalCount: number) {
  if (readyCount >= totalCount - 1) return '完整传播素材包';
  if (readyCount >= 5) return '可发饭桌素材包';
  if (readyCount >= 3) return '基础复盘素材包';
  return '素材不足，先收藏本局';
}

function chooseBundleTone(assets: MealRunShareAsset[], score?: MealRunScorecard | null) {
  if (score && score.score >= 82) return 'good';
  return assets
    .filter((item) => item.ready)
    .reduce<WorldEvent['severity']>((tone, item) => (
      TONE_RANK[item.tone] > TONE_RANK[tone] ? item.tone : tone
    ), score?.tone ?? 'info');
}

function buildCopyText(bundle: Omit<MealRunShareBundle, 'copyText'>, input: MealRunShareBundleInput) {
  const readyAssets = bundle.assets.filter((item) => item.ready);
  return [
    `V-GENE 传播素材包：${bundle.headline}`,
    `本局：${input.outcomeTitle} / ${LENGTH_LABELS[input.session.length]} / ${formatSpeed(input.session.speed)} / ${THEME_LABELS[input.session.theme]}`,
    `已就绪：${bundle.readyCount}/${bundle.totalCount}`,
    ...readyAssets.map((item, index) => `${index + 1}. ${item.title}：${item.detail}（${item.actionLabel}）`),
    `证据：${bundle.evidence}`,
  ].join('\n');
}

export function deriveMealRunShareBundle(input: MealRunShareBundleInput): MealRunShareBundle {
  const relics = input.relics ?? [];
  const discoveries = input.discoveries ?? [];
  const nextRunChallenges = input.nextRunChallenges ?? [];
  const realEvents = (input.events ?? []).filter((event) => event.kind !== 'RUN_STARTED');
  const assets: MealRunShareAsset[] = [
    asset(
      'POSTER',
      '战报海报',
      input.shareCard
        ? `${input.shareCard.title} / ${input.shareCard.subtitle}`
        : '需要终局统计与战报海报生成器。',
      input.shareCard?.tone ?? 'info',
      input.shareCard?.evidence ?? statsEvidence(input.stats),
      Boolean(input.shareCard),
    ),
    asset(
      'FLAVOR',
      '饭局口味标签',
      input.flavorProfile?.tags.length
        ? input.flavorProfile.tags.slice(0, 4).map((tagItem) => `#${tagItem.label}`).join(' ')
        : '需要真实事件、终局统计或玩家干预形成口味标签。',
      input.flavorProfile?.tone ?? 'info',
      input.flavorProfile?.evidence ?? `events=${realEvents.length}, ${statsEvidence(input.stats)}`,
      Boolean(input.flavorProfile?.tags.length),
    ),
    asset(
      'BROADCAST',
      '下饭播报台',
      input.broadcast
        ? `${input.broadcast.segments.length} 段播报 / 约 ${input.broadcast.durationSec}s`
        : '需要三幕战报与真实事件生成桌边播报。',
      input.broadcast?.tone ?? 'info',
      input.broadcast?.evidence ?? `events=${realEvents.length}`,
      Boolean(input.broadcast?.segments.length),
    ),
    asset(
      'MOMENTS',
      '饭点名场面卡包',
      input.mealMoments?.cards.length
        ? `${input.mealMoments.cards.length} 张 / ${input.mealMoments.cards.map((card) => card.title).join(' / ')}`
        : '需要三幕战报、关键事件或玩家高光形成名场面。',
      input.mealMoments?.tone ?? 'info',
      input.mealMoments?.evidence ?? `events=${realEvents.length}`,
      Boolean(input.mealMoments?.cards.length),
    ),
    asset(
      'RECIPE',
      '复开配方',
      input.replayRecipe
        ? `${LENGTH_LABELS[input.replayRecipe.recommendedLength]} / ${formatSpeed(input.replayRecipe.recommendedSpeed)} / ${THEME_LABELS[input.replayRecipe.recommendedTheme]}`
        : '需要真实结局与下一局挑战生成复开路线。',
      input.replayRecipe?.tone ?? 'info',
      input.replayRecipe?.evidence ?? `events=${realEvents.length}`,
      Boolean(input.replayRecipe),
    ),
    asset(
      'RELICS',
      '文明遗物',
      relics.length > 0 ? `${relics.length} 件 / ${listTitles(relics)}` : '需要终局实体、真实事件或玩家手痕沉淀遗物。',
      relics[0]?.tone ?? 'info',
      relics[0]?.evidence ?? `relics=${relics.length}, ${statsEvidence(input.stats)}`,
      relics.length > 0,
    ),
    asset(
      'CODEX',
      '文明图鉴发现',
      discoveries.length > 0 ? `${discoveries.length} 个 / ${listTitles(discoveries)}` : '需要真实事件首次触发，才能解锁图鉴词条。',
      discoveries.length > 0 ? 'good' : 'info',
      discoveries[0]?.evidence ?? `discoveries=${discoveries.length}, events=${realEvents.length}`,
      discoveries.length > 0,
    ),
    asset(
      'CHALLENGE',
      '再开一局挑战',
      nextRunChallenges.length > 0 ? `${nextRunChallenges.length} 个 / ${listTitles(nextRunChallenges)}` : '需要真实结局、事件和干预记录生成挑战。',
      nextRunChallenges[0]?.tone ?? 'info',
      nextRunChallenges[0]?.evidence ?? `challenges=${nextRunChallenges.length}, events=${realEvents.length}`,
      nextRunChallenges.length > 0,
    ),
  ];
  const readyCount = assets.filter((item) => item.ready).length;
  const bundleWithoutCopy: Omit<MealRunShareBundle, 'copyText'> = {
    title: '传播素材包',
    headline: headlineForReadyCount(readyCount, assets.length),
    tone: chooseBundleTone(assets, input.mealRunScore),
    assets,
    readyCount,
    totalCount: assets.length,
    evidence: `assets=${readyCount}/${assets.length}, events=${realEvents.length}, score=${input.mealRunScore?.score ?? 'none'}, ${statsEvidence(input.stats)}`,
  };

  return {
    ...bundleWithoutCopy,
    copyText: buildCopyText(bundleWithoutCopy, input),
  };
}

export function formatMealRunShareBundleForShare(bundle?: MealRunShareBundle | null) {
  if (!bundle) return '';
  return [
    `传播素材包：${bundle.headline} ${bundle.readyCount}/${bundle.totalCount}`,
    ...bundle.assets
      .filter((item) => item.ready)
      .slice(0, 6)
      .map((item) => `- ${item.title}：${item.detail}`),
  ].join('\n');
}
