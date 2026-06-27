import type {
  MealMomentDeck,
  MealRunBroadcast,
  MealRunCopyHook,
  MealRunCopyHookPack,
  MealRunFlavorProfile,
  MealRunScorecard,
  MealRunShareBundle,
  MealRunLength,
  MealRunTheme,
  RunSession,
  RunSpeed,
  WorldEvent,
  WorldStats,
} from '../types/world';

interface MealRunCopyHooksInput {
  session: Pick<RunSession, 'id' | 'length' | 'speed' | 'theme'>;
  stats: WorldStats;
  events?: WorldEvent[];
  outcomeTitle: string;
  outcomeReason: string;
  shareBundle?: MealRunShareBundle | null;
  flavorProfile?: MealRunFlavorProfile | null;
  mealRunScore?: MealRunScorecard | null;
  mealMoments?: MealMomentDeck | null;
  broadcast?: MealRunBroadcast | null;
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

const CHANNEL_LABELS: Record<MealRunCopyHook['channel'], string> = {
  WECHAT: '群聊',
  SHORT_VIDEO: '短视频',
  ARCHIVE: '收藏册',
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

function statsLine(stats: WorldStats) {
  return `P=${stats.population}, S=${stats.avgScore.toFixed(2)}, G=${stats.avgGeneration.toFixed(1)}, E=${stats.entropy.toFixed(1)}%`;
}

function compact(text: string, max = 64) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function chooseKeyEvent(events: WorldEvent[]) {
  return events
    .filter((event) => event.kind !== 'RUN_STARTED')
    .slice()
    .sort((a, b) => TONE_RANK[b.severity] - TONE_RANK[a.severity] || b.timestamp - a.timestamp)[0];
}

function eventEvidence(event?: WorldEvent) {
  return event ? `${event.kind} / ${event.detail}` : '';
}

function hookCopyText(hook: Omit<MealRunCopyHook, 'copyText'>) {
  return [
    `${CHANNEL_LABELS[hook.channel]}标题：${hook.title}`,
    hook.line,
    `证据：${hook.evidence}`,
  ].join('\n');
}

function makeHook(hook: Omit<MealRunCopyHook, 'copyText'>): MealRunCopyHook {
  return {
    ...hook,
    copyText: hookCopyText(hook),
  };
}

function packTone(input: MealRunCopyHooksInput, hooks: MealRunCopyHook[]) {
  if (input.mealRunScore && input.mealRunScore.score >= 82) return 'good';
  if (input.shareBundle?.readyCount && input.shareBundle.readyCount >= 6) return 'good';
  return hooks.reduce<WorldEvent['severity']>((tone, hook) => (
    TONE_RANK[hook.tone] > TONE_RANK[tone] ? hook.tone : tone
  ), input.mealRunScore?.tone ?? 'info');
}

export function deriveMealRunCopyHookPack(input: MealRunCopyHooksInput): MealRunCopyHookPack {
  const events = input.events ?? [];
  const keyEvent = chooseKeyEvent(events);
  const flavor = input.flavorProfile?.tags[0]?.label ?? THEME_LABELS[input.session.theme];
  const moment = input.mealMoments?.cards[0]?.title ?? keyEvent?.title ?? input.outcomeTitle;
  const scoreLine = input.mealRunScore ? `${input.mealRunScore.score}/100 ${input.mealRunScore.label}` : '未评级';
  const bundleLine = input.shareBundle
    ? `${input.shareBundle.readyCount}/${input.shareBundle.totalCount} ${input.shareBundle.headline}`
    : `素材未聚合，${statsLine(input.stats)}`;

  const hooks = [
    makeHook({
      id: 'copy-hook-wechat',
      channel: 'WECHAT',
      title: `${input.outcomeTitle}，${flavor}`,
      line: compact(`这局 V-GENE ${LENGTH_LABELS[input.session.length]}打完：${input.outcomeReason}`),
      detail: `适合发饭桌群聊，用结局和口味标签快速说明这局看点。`,
      tone: input.flavorProfile?.tone ?? input.mealRunScore?.tone ?? keyEvent?.severity ?? 'info',
      evidence: input.flavorProfile?.evidence ?? (eventEvidence(keyEvent) || statsLine(input.stats)),
    }),
    makeHook({
      id: 'copy-hook-short-video',
      channel: 'SHORT_VIDEO',
      title: `${formatSpeed(input.session.speed)} 看一场${THEME_LABELS[input.session.theme]}`,
      line: compact(`从「${moment}」看到「${input.outcomeTitle}」，下饭指数 ${scoreLine}。`),
      detail: `适合作为短视频或动图标题，突出局长、倍率、名场面和分数。`,
      tone: input.mealMoments?.tone ?? input.broadcast?.tone ?? keyEvent?.severity ?? 'info',
      evidence: input.mealMoments?.evidence ?? input.broadcast?.evidence ?? (eventEvidence(keyEvent) || statsLine(input.stats)),
    }),
    makeHook({
      id: 'copy-hook-archive',
      channel: 'ARCHIVE',
      title: `本局证据链 ${bundleLine}`,
      line: compact(`收藏理由：${input.shareBundle?.headline ?? input.outcomeTitle}，最终 ${statsLine(input.stats)}。`),
      detail: `适合写入本地战报册或复盘备注，强调哪些传播素材已经就绪。`,
      tone: input.shareBundle?.tone ?? input.mealRunScore?.tone ?? 'info',
      evidence: input.shareBundle?.evidence ?? statsLine(input.stats),
    }),
  ];
  const tone = packTone(input, hooks);
  const headline = `${input.outcomeTitle} / ${scoreLine} / ${bundleLine}`;
  const copyText = [
    `V-GENE 传播标题组：${headline}`,
    ...hooks.map((hook, index) => `${index + 1}. ${CHANNEL_LABELS[hook.channel]}：${hook.title}｜${hook.line}`),
  ].join('\n');

  return {
    title: '传播标题组',
    headline,
    tone,
    hooks,
    copyText,
    evidence: `events=${events.filter((event) => event.kind !== 'RUN_STARTED').length}, ${statsLine(input.stats)}`,
  };
}

export function formatMealRunCopyHooksForShare(pack?: MealRunCopyHookPack | null) {
  if (!pack || pack.hooks.length === 0) return '';
  return [
    `传播标题组：${pack.headline}`,
    ...pack.hooks.map((hook) => `- ${CHANNEL_LABELS[hook.channel]}：${hook.title}`),
  ].join('\n');
}
