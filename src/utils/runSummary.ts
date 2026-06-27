import type {
  EntityFateLine,
  EntityView,
  InterventionBudgetSummary,
  InterventionTrace,
  MealRhythmCue,
  PinnedSpecimenSummary,
  RunDiscoveryCue,
  RunHighlight,
  RunSession,
  RunSummary,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { deriveCivilizationCast, formatCastForShare } from './civilizationCast';
import { deriveEraChronicle, formatErasForShare } from './eraChronicle';
import { evaluateMealRunPrediction, formatMealRunPredictionForShare } from './mealRunPredictions';
import { deriveMealMoments, formatMealMomentsForShare } from './mealMoments';
import { deriveMealRunBingoBoard, formatMealRunBingoForShare } from './mealRunBingo';
import { deriveMealRunBroadcast, formatBroadcastForShare } from './mealRunBroadcast';
import { deriveMealRunCopyHookPack, formatMealRunCopyHooksForShare } from './mealRunCopyHooks';
import { deriveMealRunFlavorProfile, formatMealRunFlavorForShare } from './mealRunFlavor';
import { deriveMealRunReactionPack, formatMealRunReactionsForShare } from './mealRunReactions';
import { deriveMealRunScorecard, formatMealRunScoreForShare } from './mealRunScorecard';
import { deriveMealRunShareBundle, formatMealRunShareBundleForShare } from './mealRunShareBundle';
import { deriveMealRunSocialClipPack, formatMealRunSocialClipsForShare } from './mealRunSocialClips';
import { deriveMealRunVariantDeck, formatMealRunVariantsForShare } from './mealRunVariants';
import { formatMealRhythmForShare } from './mealRhythm';
import { deriveNextRunChallenges, formatChallengesForShare } from './runChallenges';
import { deriveRunAchievements, formatAchievementsForShare } from './runAchievements';
import { deriveRunCommissionBoard, formatCommissionsForShare } from './runCommissions';
import { deriveRunDiscoveries, formatDiscoveriesForShare } from './runDiscoveries';
import { formatHighlightsForShare } from './runHighlights';
import { deriveRunObjectives, formatObjectivesForShare } from './runObjectives';
import { deriveRunRelics, formatRelicsForShare } from './runRelics';
import { deriveRunReplayRecipe, formatReplayRecipeForShare } from './runReplayRecipe';
import { formatRunLength, formatRunSpeed, formatRunTheme, getRunPhase } from './runSession';
import { deriveRunShareCard, formatShareCardForShare } from './runShareCard';
import { deriveRunThemeProfile, formatThemeProfileForShare } from './runThemeProfile';
import { deriveRunTrailer, formatTrailerForShare } from './runTrailer';
import { formatBudgetValue } from './interventionBudget';
import { countEffectiveInterventions } from './interventionKinds';
import { deriveEntityFateLine, formatInterventionTracesForShare } from './interventionTrace';
import { formatPinnedSpecimenForShare } from './specimenDossier';

export function summarizeRun(args: {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  entities?: EntityView[];
  highlights?: RunHighlight[];
  mealRhythm?: MealRhythmCue[];
  interventionTraces?: InterventionTrace[];
  interventionBudget?: InterventionBudgetSummary;
  pinnedSpecimen?: PinnedSpecimenSummary;
  endedAt?: number;
}): RunSummary {
  const endedAt = args.endedAt ?? Date.now();
  const keyEvents = args.events
    .filter((event) => event.kind !== 'RUN_STARTED')
    .slice(-30);
  const phaseTimeline = args.events.filter((event) => event.kind === 'PHASE_SHIFT');
  const interventionCounts = countEffectiveInterventions(args.events);
  const interventionTraces = (args.interventionTraces ?? []).slice(-16);
  const entityFateLines: EntityFateLine[] = Array.from(new Set(
    interventionTraces.flatMap((trace) => trace.affectedEntityIds),
  ))
    .slice(0, 12)
    .map((entityId) => deriveEntityFateLine({
      entityId,
      traces: interventionTraces,
      events: args.events,
      now: endedAt,
    }))
    .filter((line): line is EntityFateLine => Boolean(line))
    .sort((a, b) => {
      const toneWeight = (tone: EntityFateLine['tone']) => tone === 'danger' ? 4 : tone === 'good' ? 3 : tone === 'warning' ? 2 : 1;
      return toneWeight(b.tone) - toneWeight(a.tone) || b.snapshots.length - a.snapshots.length;
    })
    .slice(0, 5);
  const objectives = deriveRunObjectives({
    session: { ...args.session, phase: getRunPhase(args.session, args.stats, endedAt) },
    stats: args.stats,
    events: args.events,
    entities: args.entities ?? [],
    interventionTraces,
    now: endedAt,
  });
  const commissionBoard = deriveRunCommissionBoard({
    session: { ...args.session, phase: getRunPhase(args.session, args.stats, endedAt) },
    stats: args.stats,
    events: args.events,
    entities: args.entities ?? [],
    objectives,
    now: endedAt,
  });
  const civilizationCast = deriveCivilizationCast(args.entities ?? [], args.events);
  const eraChronicle = deriveEraChronicle({
    session: args.session,
    stats: args.stats,
    events: args.events,
    endedAt,
  });
  const achievements = deriveRunAchievements({
    session: args.session,
    stats: args.stats,
    events: args.events,
    interventionCounts,
    civilizationCast,
  });
  const nextRunChallenges = deriveNextRunChallenges({
    session: args.session,
    stats: args.stats,
    events: args.events,
    interventionCounts,
    civilizationCast,
    achievements,
    eraChronicle,
  });
  const highlights = (args.highlights ?? [])
    .filter((highlight) => highlight.timestamp >= args.session.startedAt && highlight.timestamp <= endedAt)
    .slice(-12);
  const mealRhythm = (args.mealRhythm ?? [])
    .filter((cue) => cue.timestamp >= args.session.startedAt && cue.timestamp <= endedAt)
    .slice(-18);
  const discoveries: RunDiscoveryCue[] = deriveRunDiscoveries({
    session: args.session,
    events: args.events,
    limit: 18,
  });
  const extinction = args.stats.population <= 2;
  const highScore = args.stats.avgScore >= 70;
  const highEntropy = args.stats.entropy >= 75;
  const outcomeTitle = extinction
    ? '文明熄灭'
    : highScore
      ? '高适应文明胜出'
      : highEntropy
        ? '熵潮吞没秩序'
        : '稳定演化完成';
  const outcomeReason = extinction
    ? '最终种群接近灭绝，幸存谱系不足以维持文明扩张。'
    : highScore
      ? '平均适应度维持高位，优势逻辑体完成资源吸引与代际扩张。'
      : highEntropy
        ? '信息熵持续升高，突变和毒素压力让文明进入高波动结局。'
        : '种群、适应度和熵压没有崩盘，本局以稳定观测态结束。';
  const trailer = deriveRunTrailer({
    session: args.session,
    stats: args.stats,
    events: args.events,
    highlights,
    mealRhythm,
    eraChronicle,
    civilizationCast,
    achievements,
    objectives,
    outcomeTitle,
    outcomeReason,
    endedAt,
  });
  const relics = deriveRunRelics({
    stats: args.stats,
    events: args.events,
    interventionCounts,
    civilizationCast,
    achievements,
    highlights,
    mealRhythm,
  });
  const themeProfile = deriveRunThemeProfile({
    session: { ...args.session, phase: getRunPhase(args.session, args.stats, endedAt) },
    stats: args.stats,
    events: args.events,
    entities: args.entities ?? [],
    now: endedAt,
  });
  const shareCard = deriveRunShareCard({
    session: args.session,
    stats: args.stats,
    outcomeTitle,
    outcomeReason,
    endedAt,
    trailer,
    themeProfile,
    commissionBoard,
    discoveries,
    relics,
    achievements,
    keyEvents,
  });
  const mealRunScore = deriveMealRunScorecard({
    session: args.session,
    stats: args.stats,
    events: args.events,
    highlights,
    mealRhythm,
    trailer,
    relics,
    achievements,
    discoveries,
    commissionBoard,
  });
  const broadcast = deriveMealRunBroadcast({
    session: args.session,
    stats: args.stats,
    events: args.events,
    trailer,
    outcomeTitle,
    outcomeReason,
    endedAt,
    highlights,
    relics,
    achievements,
    commissionBoard,
    themeProfile,
    mealRunScore,
  });
  const mealMoments = deriveMealMoments({
    session: args.session,
    stats: args.stats,
    events: args.events,
    highlights,
    trailer,
    outcomeTitle,
    outcomeReason,
    endedAt,
    broadcast,
    mealRunScore,
  });
  const flavorProfile = deriveMealRunFlavorProfile({
    session: args.session,
    stats: args.stats,
    events: args.events,
    interventionCounts,
    themeProfile,
    mealRunScore,
    discoveries,
    relics,
    achievements,
    mealMoments,
  });
  const replayRecipe = deriveRunReplayRecipe({
    session: args.session,
    stats: args.stats,
    events: args.events,
    interventionCounts,
    nextRunChallenges,
    outcomeTitle,
    outcomeReason,
    themeProfile,
    mealRunScore,
    broadcast,
  });
  const shareBundle = deriveMealRunShareBundle({
    session: args.session,
    stats: args.stats,
    events: args.events,
    outcomeTitle,
    shareCard,
    flavorProfile,
    broadcast,
    mealMoments,
    replayRecipe,
    relics,
    discoveries,
    nextRunChallenges,
    mealRunScore,
  });
  const copyHookPack = deriveMealRunCopyHookPack({
    session: args.session,
    stats: args.stats,
    events: args.events,
    outcomeTitle,
    outcomeReason,
    shareBundle,
    flavorProfile,
    mealRunScore,
    mealMoments,
    broadcast,
  });
  const socialClipPack = deriveMealRunSocialClipPack({
    session: args.session,
    stats: args.stats,
    events: args.events,
    outcomeTitle,
    outcomeReason,
    trailer,
    mealMoments,
    broadcast,
    copyHookPack,
    shareBundle,
    mealRunScore,
  });
  const reactionPack = deriveMealRunReactionPack({
    session: args.session,
    stats: args.stats,
    events: args.events,
    outcomeTitle,
    outcomeReason,
    mealRunScore,
    flavorProfile,
    shareBundle,
    copyHookPack,
    socialClipPack,
    replayRecipe,
    relics,
    discoveries,
    nextRunChallenges,
  });
  const variantDeck = deriveMealRunVariantDeck({
    session: args.session,
    stats: args.stats,
    events: args.events,
    outcomeTitle,
    outcomeReason,
    interventionCounts,
    themeProfile,
    mealRunScore,
    replayRecipe,
    reactionPack,
    socialClipPack,
    nextRunChallenges,
  });
  const bingoBoard = deriveMealRunBingoBoard({
    session: args.session,
    stats: args.stats,
    events: args.events,
    interventionCounts,
    objectives,
    achievements,
    relics,
    discoveries,
    outcomeTitle,
    mealRunScore,
    flavorProfile,
    replayRecipe,
    variantDeck,
  });
  const predictionResult = evaluateMealRunPrediction({
    prediction: args.session.prediction,
    stats: args.stats,
    events: args.events,
    interventionCounts,
    objectives,
    achievements,
    relics,
    discoveries,
  });
  const shareText = [
    `V-GENE 下饭局：${formatRunLength(args.session.length)} / ${formatRunSpeed(args.session.speed)} / ${formatRunTheme(args.session.theme)}`,
    `结局：${outcomeTitle}`,
    `最终：种群 ${args.stats.population}，适应度 ${args.stats.avgScore.toFixed(2)}，世代 ${args.stats.avgGeneration.toFixed(1)}，熵 ${args.stats.entropy.toFixed(1)}%`,
    formatMealRunPredictionForShare(predictionResult),
    formatInterventionTracesForShare(interventionTraces),
    entityFateLines.length > 0
      ? ['实体命运线：', ...entityFateLines.map((line) => `- ${line.title} / ${line.detail} / ${line.evidence}`)].join('\n')
      : '',
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
    formatThemeProfileForShare(themeProfile),
    formatDiscoveriesForShare(discoveries),
    formatTrailerForShare(trailer),
    formatRelicsForShare(relics),
    formatCommissionsForShare(commissionBoard),
    formatObjectivesForShare(objectives),
    formatMealRhythmForShare(mealRhythm, args.session.startedAt),
    formatHighlightsForShare(highlights, args.session.startedAt),
    formatErasForShare(eraChronicle),
    formatCastForShare(civilizationCast),
    formatAchievementsForShare(achievements),
    args.interventionBudget
      ? `神谕纪律：${args.interventionBudget.title}，消耗 ${formatBudgetValue(args.interventionBudget.used)} / 剩余 ${formatBudgetValue(args.interventionBudget.remaining)}`
      : '',
    formatPinnedSpecimenForShare(args.pinnedSpecimen),
    formatChallengesForShare(nextRunChallenges),
    keyEvents.slice(-5).map((event) => `- ${event.title}`).join('\n'),
  ].filter(Boolean).join('\n');

  return {
    sessionId: args.session.id,
    length: args.session.length,
    speed: args.session.speed,
    theme: args.session.theme,
    startedAt: args.session.startedAt,
    endedAt,
    elapsedMs: Math.max(0, endedAt - args.session.startedAt),
    finalStats: args.stats,
    keyEvents,
    phaseTimeline,
    interventionCounts,
    civilizationCast,
    achievements,
    relics,
    eraChronicle,
    nextRunChallenges,
    objectives,
    interventionTraces,
    entityFateLines,
    commissionBoard,
    highlights,
    mealRhythm,
    trailer,
    broadcast,
    mealMoments,
    replayRecipe,
    themeProfile,
    discoveries,
    shareCard,
    mealRunScore,
    flavorProfile,
    shareBundle,
    copyHookPack,
    socialClipPack,
    reactionPack,
    variantDeck,
    bingoBoard,
    predictionResult,
    interventionBudget: args.interventionBudget,
    pinnedSpecimen: args.pinnedSpecimen,
    outcomeTitle,
    outcomeReason,
    shareText,
  };
}
