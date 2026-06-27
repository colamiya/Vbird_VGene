import type { RunSummary } from '../types/world';
import { formatRunTheme } from './runSession';
import { formatThemeProfileForShare } from './runThemeProfile';
import { formatDiscoveriesForShare } from './runDiscoveries';
import { formatShareCardForShare } from './runShareCard';
import { formatMealRunScoreForShare } from './mealRunScorecard';
import { formatBroadcastForShare } from './mealRunBroadcast';
import { formatReplayRecipeForShare } from './runReplayRecipe';
import { formatMealMomentsForShare } from './mealMoments';
import { formatMealRunFlavorForShare } from './mealRunFlavor';
import { formatMealRunShareBundleForShare } from './mealRunShareBundle';
import { formatMealRunCopyHooksForShare } from './mealRunCopyHooks';
import { formatMealRunSocialClipsForShare } from './mealRunSocialClips';
import { formatMealRunReactionsForShare } from './mealRunReactions';
import { formatMealRunVariantsForShare } from './mealRunVariants';
import { formatMealRunBingoForShare } from './mealRunBingo';
import { formatMealRunPredictionForShare } from './mealRunPredictions';

const ARCHIVE_KEY = 'vgene.mealRunArchive.v1';
const MAX_ARCHIVED_RUNS = 24;

export interface ArchivedRunSummary {
  id: string;
  savedAt: number;
  summary: RunSummary;
}

function parseArchive(raw: string | null): ArchivedRunSummary[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is ArchivedRunSummary =>
        Boolean(item && typeof item.id === 'string' && typeof item.savedAt === 'number' && item.summary),
      )
      .slice(0, MAX_ARCHIVED_RUNS);
  } catch (error) {
    console.error('读取下饭局战报归档失败:', error);
    return [];
  }
}

function writeArchive(items: ArchivedRunSummary[]) {
  try {
    window.localStorage.setItem(ARCHIVE_KEY, JSON.stringify(items.slice(0, MAX_ARCHIVED_RUNS)));
  } catch (error) {
    console.error('写入下饭局战报归档失败:', error);
    throw error;
  }
}

export function loadArchivedRuns() {
  if (typeof window === 'undefined') return [];
  try {
    return parseArchive(window.localStorage.getItem(ARCHIVE_KEY));
  } catch (error) {
    console.error('读取下饭局战报归档失败:', error);
    return [];
  }
}

export function saveArchivedRun(summary: RunSummary) {
  const savedAt = Date.now();
  const current = loadArchivedRuns().filter((item) => item.summary.sessionId !== summary.sessionId);
  const item: ArchivedRunSummary = {
    id: `${summary.sessionId}-${savedAt}`,
    savedAt,
    summary,
  };
  const next = [item, ...current].slice(0, MAX_ARCHIVED_RUNS);
  writeArchive(next);
  return next;
}

export function deleteArchivedRun(id: string) {
  const next = loadArchivedRuns().filter((item) => item.id !== id);
  writeArchive(next);
  return next;
}

export function createArchiveText(item: ArchivedRunSummary) {
  const stats = item.summary.finalStats;
  const cast = item.summary.civilizationCast ?? [];
  const achievements = item.summary.achievements ?? [];
  const relics = item.summary.relics ?? [];
  const eras = item.summary.eraChronicle ?? [];
  const challenges = item.summary.nextRunChallenges ?? [];
  const objectives = item.summary.objectives ?? [];
  const commissionBoard = item.summary.commissionBoard;
  const highlights = item.summary.highlights ?? [];
  const mealRhythm = item.summary.mealRhythm ?? [];
  const trailer = item.summary.trailer;
  const themeProfile = item.summary.themeProfile;
  const discoveries = item.summary.discoveries ?? [];
  const shareCard = item.summary.shareCard;
  const mealRunScore = item.summary.mealRunScore;
  const flavorProfile = item.summary.flavorProfile;
  const shareBundle = item.summary.shareBundle;
  const copyHookPack = item.summary.copyHookPack;
  const socialClipPack = item.summary.socialClipPack;
  const reactionPack = item.summary.reactionPack;
  const variantDeck = item.summary.variantDeck;
  const bingoBoard = item.summary.bingoBoard;
  const predictionResult = item.summary.predictionResult;
  const broadcast = item.summary.broadcast;
  const mealMoments = item.summary.mealMoments;
  const replayRecipe = item.summary.replayRecipe;
  const budget = item.summary.interventionBudget;
  const specimen = item.summary.pinnedSpecimen;
  const completeObjectives = objectives.filter((objective) => objective.status === 'complete').length;
  return [
    `V-GENE 收藏战报 ${new Date(item.savedAt).toLocaleString('zh-CN', { hour12: false })}`,
    item.summary.theme ? `本局主题：${formatRunTheme(item.summary.theme)}` : '',
    formatMealRunPredictionForShare(predictionResult),
    formatMealRunScoreForShare(mealRunScore),
    formatMealRunFlavorForShare(flavorProfile),
    formatMealRunShareBundleForShare(shareBundle),
    formatMealRunCopyHooksForShare(copyHookPack),
    formatMealRunSocialClipsForShare(socialClipPack),
    formatMealRunReactionsForShare(reactionPack),
    formatMealRunVariantsForShare(variantDeck),
    formatMealRunBingoForShare(bingoBoard),
    formatBroadcastForShare(broadcast),
    formatMealMomentsForShare(mealMoments),
    formatReplayRecipeForShare(replayRecipe),
    formatShareCardForShare(shareCard),
    themeProfile ? formatThemeProfileForShare(themeProfile) : '',
    formatDiscoveriesForShare(discoveries),
    item.summary.shareText,
    trailer ? `三幕战报：${trailer.title} / ${trailer.scenes.map((scene) => scene.title).join(' / ')}` : '',
    relics.length > 0 ? `文明遗物：${relics.slice(0, 4).map((relic) => relic.title).join(' / ')}` : '',
    commissionBoard ? `饭局委托：${commissionBoard.title} / ${commissionBoard.completed}/${commissionBoard.total} / ${commissionBoard.score}/${commissionBoard.maxScore}` : '',
    eras.length > 0 ? `文明纪元：${eras.slice(0, 4).map((era) => era.title).join(' / ')}` : '',
    cast.length > 0 ? `文明主角：${cast.slice(0, 3).map((member) => `${member.title}#${member.entityId}`).join(' / ')}` : '',
    achievements.length > 0 ? `本局徽章：${achievements.slice(0, 4).map((achievement) => achievement.title).join(' / ')}` : '',
    challenges.length > 0 ? `下一局挑战：${challenges.slice(0, 3).map((challenge) => challenge.title).join(' / ')}` : '',
    objectives.length > 0 ? `本局目标：${completeObjectives}/${objectives.length}` : '',
    mealRhythm.length > 0 ? `下饭节奏：${mealRhythm.slice(-4).map((cue) => cue.title).join(' / ')}` : '',
    highlights.length > 0 ? `精彩瞬间：${highlights.slice(-4).map((highlight) => highlight.title).join(' / ')}` : '',
    budget ? `神谕纪律：${budget.title} / 消耗 ${budget.used} / 剩余 ${budget.remaining}` : '',
    specimen ? `钉选样本：#${specimen.entityId} / ${specimen.status === 'SURVIVED' ? '存活' : '失联'} / 峰值 ${specimen.peakScore.toFixed(2)}` : '',
    `关键事件数：${item.summary.keyEvents.length}`,
    `最终指标：P=${stats.population} / S=${stats.avgScore.toFixed(2)} / G=${stats.avgGeneration.toFixed(1)} / E=${stats.entropy.toFixed(1)}%`,
  ].filter(Boolean).join('\n');
}
