import type {
  MealRunBroadcast,
  MealRunBroadcastSegment,
  MealRunScorecard,
  RunAchievement,
  RunCommissionBoard,
  RunHighlight,
  RunRelic,
  RunSession,
  RunThemeProfile,
  RunTrailer,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { formatRunDuration, formatRunLength, formatRunSpeed, formatRunTheme } from './runSession';

function pickEvent(events: WorldEvent[], severity: WorldEvent['severity']) {
  return events.find((event) => event.severity === severity);
}

function compactLine(line: string) {
  return line.replace(/\s+/g, ' ').trim();
}

function eventEvidence(event: WorldEvent) {
  const target = typeof event.entityId === 'number' ? `entity=#${event.entityId}` : 'entity=none';
  const metric = typeof event.metric === 'number' ? `metric=${event.metric.toFixed(2)}` : `kind=${event.kind}`;
  return `${target}, ${metric}, phase=${event.phase}`;
}

function buildSegment(id: string, role: MealRunBroadcastSegment['role'], title: string, line: string, tone: WorldEvent['severity'], evidence: string): MealRunBroadcastSegment {
  return {
    id,
    role,
    title,
    line: compactLine(line),
    tone,
    evidence,
  };
}

export function deriveMealRunBroadcast(args: {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  trailer: RunTrailer;
  outcomeTitle: string;
  outcomeReason: string;
  endedAt: number;
  highlights?: RunHighlight[];
  relics?: RunRelic[];
  achievements?: RunAchievement[];
  commissionBoard?: RunCommissionBoard;
  themeProfile?: RunThemeProfile;
  mealRunScore?: MealRunScorecard;
}): MealRunBroadcast {
  const events = args.events.filter((event) => event.kind !== 'RUN_STARTED');
  const danger = pickEvent(events, 'danger');
  const warning = pickEvent(events, 'warning');
  const good = pickEvent(events, 'good');
  const turnEvent = danger ?? warning ?? good ?? events[events.length - 1];
  const highlights = args.highlights ?? [];
  const relics = args.relics ?? [];
  const achievements = args.achievements ?? [];
  const runtime = formatRunDuration(Math.max(0, args.endedAt - args.session.startedAt));
  const scoreLabel = args.mealRunScore ? `${args.mealRunScore.score}/100 ${args.mealRunScore.label}` : '未评级';
  const commissionLine = args.commissionBoard
    ? `饭局委托 ${args.commissionBoard.completed}/${args.commissionBoard.total}，评分 ${args.commissionBoard.score}/${args.commissionBoard.maxScore}。`
    : '饭局委托暂无评分。';
  const hook = args.trailer.scenes[0]?.title ?? args.outcomeTitle;
  const turn = turnEvent?.title ?? args.trailer.scenes[1]?.title ?? args.outcomeTitle;
  const science = args.themeProfile?.scienceFrame ?? `终局统计显示，种群 ${args.stats.population}、适应度 ${args.stats.avgScore.toFixed(2)}、熵 ${args.stats.entropy.toFixed(1)}%。`;
  const collection = [
    relics[0]?.title ? `遗物 ${relics[0].title}` : '',
    achievements[0]?.title ? `徽章 ${achievements[0].title}` : '',
    highlights[0]?.title ? `高光 ${highlights[0].title}` : '',
  ].filter(Boolean).join('，');

  const segments = [
    buildSegment(
      'broadcast-opening',
      'OPENING',
      '开场',
      `这里是 V-GENE 下饭播报台。本局是 ${formatRunLength(args.session.length)}、${formatRunSpeed(args.session.speed)}、${formatRunTheme(args.session.theme)}：${hook}。`,
      args.trailer.tone,
      args.trailer.evidence,
    ),
    buildSegment(
      'broadcast-turn',
      'TURN',
      '转折',
      turnEvent
        ? `关键转折来自「${turn}」：${turnEvent.detail}`
        : `关键转折来自「${turn}」，事件流较少，主要看终局统计变化。`,
      turnEvent?.severity ?? args.trailer.tone,
      turnEvent ? eventEvidence(turnEvent) : args.trailer.evidence,
    ),
    buildSegment(
      'broadcast-science',
      'SCIENCE',
      '解释',
      `${science} ${commissionLine}`,
      args.themeProfile?.tone ?? 'info',
      args.themeProfile?.evidence ?? `population=${args.stats.population}, score=${args.stats.avgScore.toFixed(2)}, entropy=${args.stats.entropy.toFixed(1)}`,
    ),
    buildSegment(
      'broadcast-closing',
      'CLOSING',
      '收束',
      `${args.outcomeTitle}。${args.outcomeReason} 下饭指数 ${scoreLabel}${collection ? `，本局可记住：${collection}` : ''}。`,
      args.mealRunScore?.tone ?? args.trailer.tone,
      args.mealRunScore?.evidence ?? args.trailer.evidence,
    ),
  ];
  const copyText = [
    `V-GENE 下饭播报台：${args.outcomeTitle}`,
    `播报时长：${runtime} / ${formatRunTheme(args.session.theme)} / 下饭指数 ${scoreLabel}`,
    ...segments.map((segment, index) => `${index + 1}. ${segment.title}：${segment.line}`),
  ].join('\n');

  return {
    title: '下饭播报台',
    subtitle: `${formatRunTheme(args.session.theme)} / ${runtime}`,
    hostLine: `${args.outcomeTitle}，${scoreLabel}。`,
    durationSec: Math.min(75, Math.max(35, segments.reduce((total, segment) => total + Math.ceil(segment.line.length / 7), 0))),
    tone: args.mealRunScore?.tone ?? args.trailer.tone,
    segments,
    copyText,
    evidence: `events=${events.length}, highlights=${highlights.length}, relics=${relics.length}, achievements=${achievements.length}, score=${args.mealRunScore?.score ?? 'none'}`,
  };
}

export function formatBroadcastForShare(broadcast?: MealRunBroadcast | null) {
  if (!broadcast) return '';
  return [
    '下饭播报台：',
    ...broadcast.segments.map((segment) => `- ${segment.title}：${segment.line}`),
  ].join('\n');
}
