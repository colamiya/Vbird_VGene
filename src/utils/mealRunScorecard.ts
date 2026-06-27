import type {
  MealRhythmCue,
  MealRunScoreAxis,
  MealRunScorecard,
  RunAchievement,
  RunCommissionBoard,
  RunDiscoveryCue,
  RunHighlight,
  RunRelic,
  RunSession,
  RunTrailer,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { formatRunLength, formatRunSpeed, formatRunTheme } from './runSession';
import { naturalWorldEvents } from './worldEvents';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number) {
  return Math.round(clamp(value, 0, 100));
}

function countEventTone(events: WorldEvent[], tone: WorldEvent['severity']) {
  return events.filter((event) => event.severity === tone).length;
}

function deriveGrade(score: number): MealRunScorecard['grade'] {
  if (score >= 88) return 'legend';
  if (score >= 72) return 'hot';
  if (score >= 48) return 'warm';
  return 'cold';
}

function gradeLabel(grade: MealRunScorecard['grade']) {
  if (grade === 'legend') return '传说下饭';
  if (grade === 'hot') return '很下饭';
  if (grade === 'warm') return '可下饭';
  return '清淡局';
}

function gradeTone(grade: MealRunScorecard['grade']): WorldEvent['severity'] {
  if (grade === 'legend') return 'good';
  if (grade === 'hot') return 'warning';
  if (grade === 'warm') return 'info';
  return 'info';
}

function buildHooks(args: {
  events: WorldEvent[];
  highlights: RunHighlight[];
  relics: RunRelic[];
  achievements: RunAchievement[];
  trailer?: RunTrailer;
  commissionBoard?: RunCommissionBoard;
}) {
  const hooks = [
    args.trailer?.title,
    args.highlights[args.highlights.length - 1]?.title,
    args.relics[0]?.title,
    args.achievements[0]?.title,
    args.commissionBoard?.title,
    args.events.find((event) => event.severity === 'danger')?.title,
    args.events.find((event) => event.severity === 'good')?.title,
  ].filter((item): item is string => Boolean(item));

  return Array.from(new Set(hooks)).slice(0, 4);
}

export function deriveMealRunScorecard(args: {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  highlights?: RunHighlight[];
  mealRhythm?: MealRhythmCue[];
  trailer?: RunTrailer;
  relics?: RunRelic[];
  achievements?: RunAchievement[];
  discoveries?: RunDiscoveryCue[];
  commissionBoard?: RunCommissionBoard;
}): MealRunScorecard {
  const events = naturalWorldEvents(args.events);
  const highlights = args.highlights ?? [];
  const mealRhythm = args.mealRhythm ?? [];
  const relics = args.relics ?? [];
  const achievements = args.achievements ?? [];
  const discoveries = args.discoveries ?? [];
  const dangerEvents = countEventTone(events, 'danger');
  const warningEvents = countEventTone(events, 'warning');
  const goodEvents = countEventTone(events, 'good');
  const phaseCoverage = new Set(events.map((event) => event.phase)).size;
  const commissionRatio = args.commissionBoard
    ? args.commissionBoard.maxScore > 0
      ? args.commissionBoard.score / args.commissionBoard.maxScore
      : 0
    : 0;

  const axes: MealRunScoreAxis[] = [
    {
      id: 'history',
      label: '历史密度',
      score: roundScore(events.length * 3.4 + discoveries.length * 4 + phaseCoverage * 8),
      detail: events.length >= 16 ? '事件流足够密集，适合复盘成一段文明史。' : '事件仍偏稀疏，更像一次轻量观察局。',
      evidence: `events=${events.length}, discoveries=${discoveries.length}, phases=${phaseCoverage}`,
    },
    {
      id: 'drama',
      label: '戏剧张力',
      score: roundScore(dangerEvents * 16 + warningEvents * 8 + goodEvents * 6 + relics.length * 5 + Math.min(30, args.stats.entropy * 0.35)),
      detail: dangerEvents > 0 || warningEvents >= 3 ? '危机、转折和遗物共同制造了强叙事张力。' : '张力主要来自稳定演化和少量正反馈。',
      evidence: `danger=${dangerEvents}, warning=${warningEvents}, good=${goodEvents}, relics=${relics.length}, entropy=${args.stats.entropy.toFixed(1)}`,
    },
    {
      id: 'agency',
      label: '玩家参与',
      score: roundScore(highlights.length * 9 + mealRhythm.length * 2.4 + commissionRatio * 36),
      detail: highlights.length > 0 ? '玩家留下了可复盘的高光标记和节奏记录。' : '玩家介入痕迹较少，更偏自动观测。',
      evidence: `highlights=${highlights.length}, rhythm=${mealRhythm.length}, commission=${Math.round(commissionRatio * 100)}%`,
    },
    {
      id: 'science',
      label: '科学可读性',
      score: roundScore(phaseCoverage * 11 + achievements.length * 6 + Math.min(28, args.stats.avgGeneration * 4) + Math.min(18, args.stats.population / 40)),
      detail: phaseCoverage >= 4 ? '阶段覆盖完整，能看见从创世到危机或飞升的连续机制。' : '阶段覆盖有限，适合当作样本局而非完整长史。',
      evidence: `phases=${phaseCoverage}, achievements=${achievements.length}, avgGeneration=${args.stats.avgGeneration.toFixed(1)}, population=${args.stats.population}`,
    },
  ];

  const score = roundScore(axes.reduce((total, axis) => total + axis.score, 0) / axes.length);
  const grade = deriveGrade(score);
  const label = gradeLabel(grade);
  const hooks = buildHooks({
    events,
    highlights,
    relics,
    achievements,
    trailer: args.trailer,
    commissionBoard: args.commissionBoard,
  });

  return {
    title: `下饭指数 ${score}`,
    grade,
    score,
    maxScore: 100,
    label,
    detail: `${formatRunLength(args.session.length)} / ${formatRunSpeed(args.session.speed)} / ${formatRunTheme(args.session.theme)} 的可看性评分；只由真实事件、终局统计、玩家标记和复盘产物派生。`,
    tone: gradeTone(grade),
    axes,
    hooks,
    evidence: `score=${score}, grade=${label}, events=${events.length}, highlights=${highlights.length}, relics=${relics.length}, commission=${Math.round(commissionRatio * 100)}%`,
  };
}

export function formatMealRunScoreForShare(scorecard?: MealRunScorecard | null) {
  if (!scorecard) return '';
  const axes = scorecard.axes.map((axis) => `${axis.label}${axis.score}`).join(' / ');
  const hooks = scorecard.hooks.length > 0 ? `；看点：${scorecard.hooks.join(' / ')}` : '';
  return `下饭指数：${scorecard.score}/100 ${scorecard.label}（${axes}）${hooks}`;
}
