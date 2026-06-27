import type {
  MealRunCopyHookPack,
  MealRunFlavorProfile,
  MealRunReaction,
  MealRunReactionKind,
  MealRunReactionPack,
  MealRunScorecard,
  MealRunShareBundle,
  MealRunSocialClipPack,
  NextRunChallenge,
  RunDiscoveryCue,
  RunRelic,
  RunReplayRecipe,
  RunSession,
  WorldEvent,
  WorldStats,
} from '../types/world';

interface MealRunReactionInput {
  session: Pick<RunSession, 'id' | 'theme' | 'speed'>;
  stats: WorldStats;
  events?: WorldEvent[];
  outcomeTitle: string;
  outcomeReason: string;
  mealRunScore?: MealRunScorecard | null;
  flavorProfile?: MealRunFlavorProfile | null;
  shareBundle?: MealRunShareBundle | null;
  copyHookPack?: MealRunCopyHookPack | null;
  socialClipPack?: MealRunSocialClipPack | null;
  replayRecipe?: RunReplayRecipe | null;
  relics?: RunRelic[];
  discoveries?: RunDiscoveryCue[];
  nextRunChallenges?: NextRunChallenge[];
}

const THEME_LABELS: Record<RunSession['theme'], string> = {
  Ascent: '文明崛起',
  Symbiosis: '共生网络',
  Catastrophe: '灾变压力',
  Apex: '顶点谱系',
};

const KIND_LABELS: Record<MealRunReactionKind, string> = {
  SHOCK: '惊叹',
  SCIENCE: '解释',
  TACTIC: '战术',
  COLLECT: '收藏',
  REPLAY: '二刷',
  QUOTE: '金句',
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

function compact(text: string, max = 78) {
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
  if (!event) return '';
  const target = typeof event.entityId === 'number' ? `entity=#${event.entityId}` : 'entity=none';
  const metric = typeof event.metric === 'number' ? `metric=${event.metric.toFixed(2)}` : `kind=${event.kind}`;
  return `${target}, ${metric}, phase=${event.phase}`;
}

function makeReaction(
  id: string,
  kind: MealRunReactionKind,
  line: string,
  detail: string,
  tone: WorldEvent['severity'],
  evidence: string,
): MealRunReaction {
  const label = KIND_LABELS[kind];
  return {
    id,
    kind,
    label,
    line: compact(line),
    detail,
    tone,
    evidence,
    copyText: `${label}弹幕：${compact(line)}\n证据：${evidence}`,
  };
}

function packTone(reactions: MealRunReaction[], fallback: WorldEvent['severity']) {
  return reactions.reduce<WorldEvent['severity']>((tone, item) => (
    TONE_RANK[item.tone] > TONE_RANK[tone] ? item.tone : tone
  ), fallback);
}

export function deriveMealRunReactionPack(input: MealRunReactionInput): MealRunReactionPack {
  const events = input.events ?? [];
  const keyEvent = chooseKeyEvent(events);
  const scoreLine = input.mealRunScore ? `${input.mealRunScore.score}/100 ${input.mealRunScore.label}` : '未评级';
  const flavor = input.flavorProfile?.tags[0]?.label ?? THEME_LABELS[input.session.theme];
  const shortClip = input.socialClipPack?.clips.find((clip) => clip.durationSec === 15);
  const bestClip = input.socialClipPack?.clips.find((clip) => clip.durationSec === 60) ?? input.socialClipPack?.clips[0];
  const shareReady = input.shareBundle ? `${input.shareBundle.readyCount}/${input.shareBundle.totalCount}` : '未聚合';
  const topRelic = input.relics?.[0];
  const topDiscovery = input.discoveries?.[0];
  const topChallenge = input.nextRunChallenges?.[0] ?? input.replayRecipe?.challenge;
  const shortVideoTitle = input.copyHookPack?.hooks.find((hook) => hook.channel === 'SHORT_VIDEO')?.title;

  const reactions = [
    makeReaction(
      'reaction-shock',
      'SHOCK',
      keyEvent
        ? `这局的拐点是「${keyEvent.title}」，不是脚本，是世界统计自己打出来的。`
        : `这局没有硬造大事件，靠终局统计把「${input.outcomeTitle}」收住了。`,
      '适合在关键转折或 15 秒切片开头使用。',
      keyEvent?.severity ?? input.mealRunScore?.tone ?? 'info',
      keyEvent ? eventEvidence(keyEvent) : statsLine(input.stats),
    ),
    makeReaction(
      'reaction-science',
      'SCIENCE',
      `能看懂的点：${input.outcomeReason}`,
      '适合给不熟悉 V-GENE 的观众解释这一局为什么成立。',
      input.mealRunScore?.axes.find((axis) => axis.id === 'science')?.score ?? 0 >= 70 ? 'good' : input.mealRunScore?.tone ?? 'info',
      input.mealRunScore?.evidence ?? statsLine(input.stats),
    ),
    makeReaction(
      'reaction-tactic',
      'TACTIC',
      shortClip
        ? `先发 ${shortClip.durationSec}s 切片，再补完整战报：${shortClip.hook}`
        : `先用「${flavor}」介绍本局，再放最终统计。`,
      '适合做饭桌群或短视频发布顺序提示。',
      input.socialClipPack?.tone ?? input.shareBundle?.tone ?? 'info',
      input.socialClipPack?.evidence ?? input.shareBundle?.evidence ?? statsLine(input.stats),
    ),
    makeReaction(
      'reaction-collect',
      'COLLECT',
      topRelic
        ? `这局值得收藏：${topRelic.title}，素材包就绪 ${shareReady}。`
        : topDiscovery
          ? `这局解锁了「${topDiscovery.name}」，素材包就绪 ${shareReady}。`
          : `这局素材包就绪 ${shareReady}，可以先进本地战报册。`,
      '适合引导收藏战报和继续刷图鉴/遗物。',
      topRelic?.tone ?? input.shareBundle?.tone ?? 'info',
      topRelic?.evidence ?? topDiscovery?.evidence ?? input.shareBundle?.evidence ?? statsLine(input.stats),
    ),
    makeReaction(
      'reaction-replay',
      'REPLAY',
      topChallenge
        ? `下一局照这个开：${topChallenge.title}。`
        : `下一局继续锁 ${THEME_LABELS[input.session.theme]}，看同一口味会不会复现。`,
      '适合在复盘尾部把观看转成下一局。',
      topChallenge?.tone ?? input.replayRecipe?.tone ?? 'info',
      topChallenge?.evidence ?? input.replayRecipe?.evidence ?? statsLine(input.stats),
    ),
    makeReaction(
      'reaction-quote',
      'QUOTE',
      shortVideoTitle
        ? `${shortVideoTitle}：${input.outcomeTitle}，${scoreLine}。`
        : `${THEME_LABELS[input.session.theme]}这一口，结局是${input.outcomeTitle}，下饭指数 ${scoreLine}。`,
      '适合直接贴到切片标题、封面角标或群聊第一句。',
      bestClip?.tone ?? input.mealRunScore?.tone ?? 'info',
      bestClip?.evidence ?? input.mealRunScore?.evidence ?? statsLine(input.stats),
    ),
  ];
  const tone = packTone(reactions, input.mealRunScore?.tone ?? keyEvent?.severity ?? 'info');
  const headline = `${input.outcomeTitle} / ${flavor} / ${scoreLine}`;
  const copyText = [
    `V-GENE 饭桌弹幕反应包：${headline}`,
    ...reactions.map((reaction) => `#${reaction.label}：${reaction.line}`),
  ].join('\n');

  return {
    title: '饭桌弹幕反应包',
    headline,
    tone,
    reactions,
    copyText,
    evidence: `reactions=${reactions.length}, events=${events.filter((event) => event.kind !== 'RUN_STARTED').length}, clips=${input.socialClipPack?.clips.length ?? 0}, ${statsLine(input.stats)}`,
  };
}

export function formatMealRunReactionsForShare(pack?: MealRunReactionPack | null) {
  if (!pack || pack.reactions.length === 0) return '';
  return [
    `饭桌弹幕：${pack.headline}`,
    ...pack.reactions.slice(0, 4).map((reaction) => `#${reaction.label} ${reaction.line}`),
  ].join('\n');
}
