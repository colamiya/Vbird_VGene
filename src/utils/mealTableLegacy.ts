import type { MealRunTheme, MealTableLegacy, MealTableLegacyLevel, NextRunChallenge, RunSummary } from '../types/world';
import type { ArchivedRunSummary } from './runArchive';
import { formatRunLength, formatRunSpeed, formatRunTheme } from './runSession';

const LEGACY_THEMES: Array<Exclude<MealRunTheme, 'Random'>> = ['Ascent', 'Symbiosis', 'Catastrophe', 'Apex'];

interface LegacyRun {
  summary: RunSummary;
  savedAt?: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number) {
  return Math.round(value);
}

function uniqueRuns(current: RunSummary | null | undefined, archivedRuns: ArchivedRunSummary[]): LegacyRun[] {
  const seen = new Set<string>();
  const runs: LegacyRun[] = [];
  const push = (summary: RunSummary | null | undefined, savedAt?: number) => {
    if (!summary?.sessionId || seen.has(summary.sessionId)) return;
    seen.add(summary.sessionId);
    runs.push({ summary, savedAt });
  };

  push(current);
  archivedRuns.forEach((item) => push(item.summary, item.savedAt));
  return runs;
}

function deriveLevel(score: number): MealTableLegacyLevel {
  if (score >= 86) return 'myth';
  if (score >= 66) return 'archive';
  if (score >= 36) return 'hearth';
  return 'seed';
}

function levelLabel(level: MealTableLegacyLevel) {
  if (level === 'myth') return '神话长桌';
  if (level === 'archive') return '文明档案馆';
  if (level === 'hearth') return '稳定饭桌';
  return '火种饭桌';
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function countThemes(runs: LegacyRun[]) {
  const counts = new Map<RunSummary['theme'], number>();
  runs.forEach(({ summary }) => {
    counts.set(summary.theme, (counts.get(summary.theme) ?? 0) + 1);
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
}

function buildLegacyChallenge(args: {
  runs: LegacyRun[];
  themeCounts: Array<[RunSummary['theme'], number]>;
  themeCoverage: number;
  collectionCount: number;
  avgMealScore: number;
  best: LegacyRun;
}): NextRunChallenge {
  const coveredThemes = new Set(args.themeCounts.map(([theme]) => theme));
  const missingTheme = LEGACY_THEMES.find((theme) => !coveredThemes.has(theme));
  if (missingTheme) {
    return {
      id: `legacy-theme-${missingTheme.toLowerCase()}`,
      title: '补全饭桌谱系',
      difficulty: args.runs.length >= 3 ? 'normal' : 'easy',
      recommendedLength: 'Dinner',
      recommendedSpeed: 2,
      recommendedTheme: missingTheme,
      objective: `下一局选择${formatRunTheme(missingTheme)}主题，补齐跨局主题覆盖。`,
      setup: '开正餐局和 2x，少量干预，优先让真实事件自然形成主题证据。',
      reason: '传承档案最缺的是主题广度，补齐主题能让本地战报册更像一套文明样本库。',
      evidence: `themeCoverage=${args.themeCoverage}/4, missing=${formatRunTheme(missingTheme)}`,
      tone: 'info',
    };
  }

  if (args.collectionCount < 12) {
    return {
      id: 'legacy-collection-drive',
      title: '饭桌收藏扩编',
      difficulty: 'normal',
      recommendedLength: 'Dinner',
      recommendedSpeed: 2,
      recommendedTheme: args.best.summary.theme,
      objective: '下一局至少新增 2 个词条、徽章或文明遗物，并收藏战报。',
      setup: '优先钉选观察一个高分实体；出现图鉴发现、徽章或遗物后再考虑轻量干预。',
      reason: '主题已经覆盖，下一步应该把跨局收藏物做厚，形成可展示的本地档案。',
      evidence: `collection=${args.collectionCount}, bestTheme=${formatRunTheme(args.best.summary.theme)}`,
      tone: 'good',
    };
  }

  if (args.avgMealScore < 72) {
    return {
      id: 'legacy-raise-meal-score',
      title: '提味复盘局',
      difficulty: 'hard',
      recommendedLength: 'Snack',
      recommendedSpeed: 4,
      recommendedTheme: args.best.summary.theme,
      objective: '下一局把下饭指数推到 72 以上，并至少标记 1 个精彩瞬间。',
      setup: '用短局和 4x 快速制造分化；有危机或黄金窗口时手动标记高光。',
      reason: '本地档案已经有基础样本，但平均可看性还不够强，需要主动制造复盘钩子。',
      evidence: `avgMealScore=${args.avgMealScore.toFixed(1)}, best=${args.best.summary.outcomeTitle}`,
      tone: 'warning',
    };
  }

  return {
    id: 'legacy-long-table-myth',
    title: '神话长桌挑战',
    difficulty: 'legendary',
    recommendedLength: 'LongTable',
    recommendedSpeed: 2,
    recommendedTheme: args.best.summary.theme,
    objective: '下一局跑成长桌局，争取生成 20 条以上历史事件和 3 个以上收藏物。',
    setup: `沿用最高局主题 ${formatRunTheme(args.best.summary.theme)}，保持 ${formatRunSpeed(2)}，把观察窗口拉长到 ${formatRunLength('LongTable')}。`,
    reason: '本地饭桌已经具备完整谱系，下一步应该冲击可传播的长史局。',
    evidence: `runs=${args.runs.length}, collection=${args.collectionCount}, avgMealScore=${args.avgMealScore.toFixed(1)}`,
    tone: 'good',
  };
}

export function deriveMealTableLegacy(
  current: RunSummary | null | undefined,
  archivedRuns: ArchivedRunSummary[],
): MealTableLegacy | null {
  const runs = uniqueRuns(current, archivedRuns);
  if (runs.length === 0) return null;
  const firstRun = runs[0];
  if (!firstRun) return null;

  const mealScores = runs
    .map(({ summary }) => summary.mealRunScore?.score)
    .filter((score): score is number => Number.isFinite(score));
  const fallbackScores = runs.map(({ summary }) => clamp(summary.finalStats.avgScore, 0, 100));
  const avgMealScore = mealScores.length > 0 ? average(mealScores) : average(fallbackScores);
  const best = runs.reduce((winner, item) => {
    const winnerScore = winner.summary.mealRunScore?.score ?? winner.summary.finalStats.avgScore;
    const itemScore = item.summary.mealRunScore?.score ?? item.summary.finalStats.avgScore;
    return itemScore > winnerScore ? item : winner;
  }, firstRun);

  const eventCount = runs.reduce((total, { summary }) => total + (summary.keyEvents?.length ?? 0), 0);
  const highlightCount = runs.reduce((total, { summary }) => total + (summary.highlights?.length ?? 0), 0);
  const relics = new Set<string>();
  const achievements = new Set<string>();
  const discoveries = new Set<string>();
  runs.forEach(({ summary }) => {
    (summary.relics ?? []).forEach((relic) => relics.add(relic.title));
    (summary.achievements ?? []).forEach((achievement) => achievements.add(achievement.title));
    (summary.discoveries ?? []).forEach((discovery) => discoveries.add(discovery.name));
  });

  const themeCounts = countThemes(runs);
  const themeCoverage = themeCounts.length;
  const topTheme = themeCounts[0];
  const dominantTheme = topTheme ? formatRunTheme(topTheme[0]) : undefined;
  const collectionCount = relics.size + achievements.size + discoveries.size;
  const score = round(clamp(
    runs.length * 8 +
      themeCoverage * 7 +
      avgMealScore * 0.25 +
      collectionCount * 1.4 +
      highlightCount * 1.1 +
      Math.min(18, eventCount * 0.22),
    0,
    100,
  ));
  const level = deriveLevel(score);
  const bestScore = round(best.summary.mealRunScore?.score ?? clamp(best.summary.finalStats.avgScore, 0, 100));
  const milestones = [
    runs.length >= 3 ? `已形成 ${runs.length} 局可对比样本。` : `还差 ${3 - runs.length} 局形成稳定饭桌样本。`,
    themeCoverage >= 4 ? '四类主题都已有真实记录。' : `已覆盖 ${themeCoverage}/4 类主题。`,
    collectionCount > 0 ? `累计 ${collectionCount} 个词条、徽章或遗物。` : '暂无跨局收藏物，下一局优先争取图鉴或遗物。',
    highlightCount > 0 ? `玩家已手动标记 ${highlightCount} 个精彩瞬间。` : '尚未留下玩家高光标记。',
  ];
  const nextPrompt = themeCoverage < 4
    ? '下一局建议选择未覆盖主题，补齐饭桌谱系。'
    : collectionCount < 12
      ? '下一局建议围绕图鉴、遗物或徽章打收藏目标。'
      : avgMealScore < 72
        ? '下一局建议用更明确的干预节奏提高戏剧张力。'
        : '下一局可以挑战更长局长，把高分饭桌扩展成长史。';
  const recommendedChallenge = buildLegacyChallenge({
    runs,
    themeCounts,
    themeCoverage,
    collectionCount,
    avgMealScore,
    best,
  });

  return {
    title: '饭桌传承档案',
    level,
    levelLabel: levelLabel(level),
    score,
    maxScore: 100,
    detail: '只聚合当前复盘与本地收藏战报，衡量这台机器上已经沉淀了多少可复看的文明样本。',
    evidence: `runs=${runs.length}, archived=${archivedRuns.length}, events=${eventCount}, highlights=${highlightCount}, collection=${collectionCount}, themes=${themeCoverage}, avgMealScore=${avgMealScore.toFixed(1)}`,
    metrics: [
      {
        id: 'runs',
        label: '局数',
        value: `${runs.length}`,
        detail: `${archivedRuns.length} 条本地收藏`,
      },
      {
        id: 'best',
        label: '最高下饭',
        value: `${bestScore}`,
        detail: best.summary.outcomeTitle,
      },
      {
        id: 'collection',
        label: '收藏物',
        value: `${collectionCount}`,
        detail: `${relics.size} 遗物 / ${achievements.size} 徽章 / ${discoveries.size} 词条`,
      },
      {
        id: 'themes',
        label: '主题覆盖',
        value: `${themeCoverage}/4`,
        detail: dominantTheme ? `主旋律：${dominantTheme}` : '暂无主旋律',
      },
    ],
    milestones,
    dominantTheme,
    bestRun: {
      sessionId: best.summary.sessionId,
      title: best.summary.outcomeTitle,
      score: bestScore,
      theme: best.summary.theme,
      savedAt: best.savedAt,
    },
    nextPrompt,
    recommendedChallenge,
  };
}
