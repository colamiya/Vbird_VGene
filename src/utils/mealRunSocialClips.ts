import type {
  MealMomentDeck,
  MealRunBroadcast,
  MealRunCopyHookPack,
  MealRunScorecard,
  MealRunShareBundle,
  MealRunSocialClip,
  MealRunSocialClipDuration,
  MealRunSocialClipPack,
  MealRunSocialClipSegment,
  MealRunSocialClipSource,
  MealRunTheme,
  RunSession,
  RunTrailer,
  RunTrailerScene,
  WorldEvent,
  WorldStats,
} from '../types/world';

interface MealRunSocialClipsInput {
  session: Pick<RunSession, 'id' | 'theme' | 'speed'>;
  stats: WorldStats;
  events?: WorldEvent[];
  outcomeTitle: string;
  outcomeReason: string;
  trailer?: RunTrailer | null;
  mealMoments?: MealMomentDeck | null;
  broadcast?: MealRunBroadcast | null;
  copyHookPack?: MealRunCopyHookPack | null;
  shareBundle?: MealRunShareBundle | null;
  mealRunScore?: MealRunScorecard | null;
}

const THEME_LABELS: Record<MealRunTheme, string> = {
  Random: '随机剧本',
  Ascent: '文明崛起',
  Symbiosis: '共生网络',
  Catastrophe: '灾变压力',
  Apex: '顶点谱系',
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

function compact(text: string, max = 74) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1)}…`;
}

function chooseKeyEvent(events: WorldEvent[]) {
  return events
    .filter((event) => event.kind !== 'RUN_STARTED')
    .slice()
    .sort((a, b) => TONE_RANK[b.severity] - TONE_RANK[a.severity] || b.timestamp - a.timestamp)[0];
}

function segment(
  id: string,
  startSec: number,
  endSec: number,
  source: MealRunSocialClipSource,
  visual: string,
  narration: string,
  caption: string,
  tone: WorldEvent['severity'],
  evidence: string,
): MealRunSocialClipSegment {
  return {
    id,
    startSec,
    endSec,
    source,
    visual: compact(visual, 96),
    narration: compact(narration, 120),
    caption: compact(caption, 52),
    tone,
    evidence,
  };
}

function sceneByRole(trailer: RunTrailer | null | undefined, role: RunTrailerScene['role']) {
  return trailer?.scenes.find((scene) => scene.role === role);
}

function eventEvidence(event?: WorldEvent) {
  if (!event) return '';
  const target = typeof event.entityId === 'number' ? `entity=#${event.entityId}` : 'entity=none';
  const metric = typeof event.metric === 'number' ? `metric=${event.metric.toFixed(2)}` : `kind=${event.kind}`;
  return `${target}, ${metric}, phase=${event.phase}`;
}

function clipTone(segments: MealRunSocialClipSegment[], fallback: WorldEvent['severity']) {
  return segments.reduce<WorldEvent['severity']>((tone, item) => (
    TONE_RANK[item.tone] > TONE_RANK[tone] ? item.tone : tone
  ), fallback);
}

function buildClipCopy(clip: Omit<MealRunSocialClip, 'copyText'>) {
  return [
    `V-GENE ${clip.durationSec}s 切片：${clip.title}`,
    `开场钩子：${clip.hook}`,
    ...clip.segments.map((item) => `${item.startSec}-${item.endSec}s｜${item.caption}｜旁白：${item.narration}`),
    `证据：${clip.evidence}`,
  ].join('\n');
}

function makeClip(input: Omit<MealRunSocialClip, 'copyText'>): MealRunSocialClip {
  return {
    ...input,
    copyText: buildClipCopy(input),
  };
}

function titleHook(input: MealRunSocialClipsInput, durationSec: MealRunSocialClipDuration) {
  const shortVideoHook = input.copyHookPack?.hooks.find((hook) => hook.channel === 'SHORT_VIDEO');
  if (shortVideoHook) return shortVideoHook.title;
  return `${durationSec}s 看完 ${THEME_LABELS[input.session.theme]}：${input.outcomeTitle}`;
}

function buildSegments(input: MealRunSocialClipsInput, durationSec: MealRunSocialClipDuration): MealRunSocialClipSegment[] {
  const events = input.events ?? [];
  const keyEvent = chooseKeyEvent(events);
  const hookScene = sceneByRole(input.trailer, 'HOOK');
  const turnScene = sceneByRole(input.trailer, 'TURN');
  const aftermathScene = sceneByRole(input.trailer, 'AFTERMATH');
  const topMoment = input.mealMoments?.cards[0];
  const closing = input.broadcast?.segments.find((item) => item.role === 'CLOSING');
  const scoreLine = input.mealRunScore ? `${input.mealRunScore.score}/100 ${input.mealRunScore.label}` : '未评级';

  if (durationSec === 15) {
    return [
      segment(
        'clip-15-hook',
        0,
        3,
        hookScene ? 'TRAILER' : 'SUMMARY',
        hookScene?.title ?? `${THEME_LABELS[input.session.theme]}开局镜头`,
        hookScene?.detail ?? `${input.session.speed}x 下饭局开始，观察文明是否爆出关键转折。`,
        titleHook(input, durationSec),
        hookScene?.tone ?? input.mealRunScore?.tone ?? 'info',
        hookScene?.evidence ?? statsLine(input.stats),
      ),
      segment(
        'clip-15-turn',
        3,
        10,
        keyEvent ? 'EVENT' : topMoment ? 'MOMENT' : 'SUMMARY',
        keyEvent?.title ?? topMoment?.title ?? '关键变化压缩镜头',
        keyEvent?.detail ?? topMoment?.line ?? input.outcomeReason,
        keyEvent?.title ?? topMoment?.kicker ?? '关键转折',
        keyEvent?.severity ?? topMoment?.tone ?? input.mealRunScore?.tone ?? 'info',
        keyEvent ? eventEvidence(keyEvent) : topMoment?.evidence ?? statsLine(input.stats),
      ),
      segment(
        'clip-15-close',
        10,
        15,
        closing ? 'BROADCAST' : 'SUMMARY',
        input.outcomeTitle,
        closing?.line ?? `${input.outcomeReason} 下饭指数 ${scoreLine}。`,
        `${input.outcomeTitle} / ${scoreLine}`,
        closing?.tone ?? input.mealRunScore?.tone ?? 'info',
        closing?.evidence ?? input.mealRunScore?.evidence ?? statsLine(input.stats),
      ),
    ];
  }

  if (durationSec === 30) {
    return [
      segment(
        'clip-30-hook',
        0,
        4,
        hookScene ? 'TRAILER' : 'SUMMARY',
        hookScene?.title ?? `${THEME_LABELS[input.session.theme]}开局`,
        hookScene?.detail ?? `这局以 ${input.session.speed}x 观察数字生命演化。`,
        titleHook(input, durationSec),
        hookScene?.tone ?? 'info',
        hookScene?.evidence ?? statsLine(input.stats),
      ),
      segment(
        'clip-30-moment',
        4,
        13,
        topMoment ? 'MOMENT' : turnScene ? 'TRAILER' : 'SUMMARY',
        topMoment?.title ?? turnScene?.title ?? '第一段群体变化',
        topMoment?.line ?? turnScene?.detail ?? input.outcomeReason,
        topMoment?.kicker ?? turnScene?.subtitle ?? '名场面',
        topMoment?.tone ?? turnScene?.tone ?? 'info',
        topMoment?.evidence ?? turnScene?.evidence ?? statsLine(input.stats),
      ),
      segment(
        'clip-30-event',
        13,
        23,
        keyEvent ? 'EVENT' : 'SUMMARY',
        keyEvent?.title ?? '终局统计推近',
        keyEvent?.detail ?? `最终统计为 ${statsLine(input.stats)}。`,
        keyEvent?.title ?? '真实统计',
        keyEvent?.severity ?? input.mealRunScore?.tone ?? 'info',
        keyEvent ? eventEvidence(keyEvent) : statsLine(input.stats),
      ),
      segment(
        'clip-30-close',
        23,
        30,
        aftermathScene ? 'TRAILER' : 'BROADCAST',
        aftermathScene?.title ?? input.outcomeTitle,
        aftermathScene?.detail ?? closing?.line ?? `${input.outcomeReason} 下饭指数 ${scoreLine}。`,
        `${input.outcomeTitle} / ${scoreLine}`,
        aftermathScene?.tone ?? closing?.tone ?? input.mealRunScore?.tone ?? 'info',
        aftermathScene?.evidence ?? closing?.evidence ?? statsLine(input.stats),
      ),
    ];
  }

  return [
    segment(
      'clip-60-hook',
      0,
      6,
      hookScene ? 'TRAILER' : 'SUMMARY',
      hookScene?.title ?? `${THEME_LABELS[input.session.theme]}开局`,
      hookScene?.detail ?? `用 ${input.session.speed}x 看一局可下饭的随机文明实验。`,
      titleHook(input, durationSec),
      hookScene?.tone ?? 'info',
      hookScene?.evidence ?? statsLine(input.stats),
    ),
    segment(
      'clip-60-setup',
      6,
      18,
      input.broadcast ? 'BROADCAST' : 'SUMMARY',
      input.broadcast?.segments[0]?.title ?? '开场旁白',
      input.broadcast?.segments[0]?.line ?? `本局主题是 ${THEME_LABELS[input.session.theme]}，观察种群、适应度和熵压变化。`,
      input.broadcast?.subtitle ?? '开场',
      input.broadcast?.segments[0]?.tone ?? 'info',
      input.broadcast?.segments[0]?.evidence ?? statsLine(input.stats),
    ),
    segment(
      'clip-60-turn',
      18,
      34,
      keyEvent ? 'EVENT' : turnScene ? 'TRAILER' : 'SUMMARY',
      keyEvent?.title ?? turnScene?.title ?? '中段转折',
      keyEvent?.detail ?? turnScene?.detail ?? input.outcomeReason,
      keyEvent?.title ?? turnScene?.subtitle ?? '转折',
      keyEvent?.severity ?? turnScene?.tone ?? 'info',
      keyEvent ? eventEvidence(keyEvent) : turnScene?.evidence ?? statsLine(input.stats),
    ),
    segment(
      'clip-60-moment',
      34,
      48,
      topMoment ? 'MOMENT' : 'SUMMARY',
      topMoment?.title ?? '名场面回放',
      topMoment?.line ?? `${input.shareBundle?.headline ?? input.outcomeTitle}，素材包 ${input.shareBundle?.readyCount ?? 0}/${input.shareBundle?.totalCount ?? 0}。`,
      topMoment?.kicker ?? '复盘素材',
      topMoment?.tone ?? input.shareBundle?.tone ?? 'info',
      topMoment?.evidence ?? input.shareBundle?.evidence ?? statsLine(input.stats),
    ),
    segment(
      'clip-60-close',
      48,
      60,
      aftermathScene ? 'TRAILER' : 'SUMMARY',
      aftermathScene?.title ?? input.outcomeTitle,
      aftermathScene?.detail ?? `${input.outcomeReason} 下饭指数 ${scoreLine}。`,
      `${input.outcomeTitle} / ${scoreLine}`,
      aftermathScene?.tone ?? input.mealRunScore?.tone ?? 'info',
      aftermathScene?.evidence ?? input.mealRunScore?.evidence ?? statsLine(input.stats),
    ),
  ];
}

export function deriveMealRunSocialClipPack(input: MealRunSocialClipsInput): MealRunSocialClipPack {
  const durations: MealRunSocialClipDuration[] = [15, 30, 60];
  const clips = durations.map((durationSec) => {
    const segments = buildSegments(input, durationSec);
    const tone = clipTone(segments, input.mealRunScore?.tone ?? input.trailer?.tone ?? 'info');
    const title = durationSec === 15
      ? `15 秒饭前钩子：${input.outcomeTitle}`
      : durationSec === 30
        ? `30 秒饭桌切片：${input.outcomeTitle}`
        : `60 秒复盘短片：${input.outcomeTitle}`;
    return makeClip({
      id: `social-clip-${durationSec}`,
      durationSec,
      title,
      hook: titleHook(input, durationSec),
      tone,
      segments,
      evidence: `duration=${durationSec}, segments=${segments.length}, ${statsLine(input.stats)}`,
    });
  });
  const packTone = clipTone(clips.flatMap((clip) => clip.segments), input.mealRunScore?.tone ?? input.trailer?.tone ?? 'info');
  const scoreLine = input.mealRunScore ? `${input.mealRunScore.score}/100` : '未评级';
  const headline = `${THEME_LABELS[input.session.theme]} / ${input.outcomeTitle} / 下饭指数 ${scoreLine}`;
  const copyText = [
    `V-GENE 社交切片脚本：${headline}`,
    ...clips.map((clip) => `${clip.durationSec}s：${clip.title}｜${clip.hook}`),
  ].join('\n');

  return {
    title: '社交切片脚本',
    headline,
    tone: packTone,
    clips,
    copyText,
    evidence: `clips=${clips.length}, events=${(input.events ?? []).filter((event) => event.kind !== 'RUN_STARTED').length}, ${statsLine(input.stats)}`,
  };
}

export function formatMealRunSocialClipsForShare(pack?: MealRunSocialClipPack | null) {
  if (!pack || pack.clips.length === 0) return '';
  return [
    `社交切片脚本：${pack.headline}`,
    ...pack.clips.map((clip) => `- ${clip.durationSec}s：${clip.title}`),
  ].join('\n');
}
