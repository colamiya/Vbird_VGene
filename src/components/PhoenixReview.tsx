import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Download, TrendingUp, Skull, Zap, Network, Trophy, FileText, Copy, BookmarkPlus, Trash2, BookOpen, Utensils, Film, Gem, ClipboardCheck, Compass, ImageDown, Gauge, Fingerprint, Landmark } from 'lucide-react';
import type { CivilizationCastMember, MealMomentDeck, MealRunBingoBoard, MealRunCopyHookPack, MealRunFlavorProfile, MealRhythmCue, MealRunBroadcast, MealRunReactionPack, MealRunScorecard, MealRunShareBundle, MealRunSocialClipPack, MealRunVariantDeck, MealTableLegacy, NextRunChallenge, RunAchievement, RunCommission, RunCommissionGrade, RunDiscoveryCue, RunEra, RunHighlight, RunObjective, RunRelic, RunReplayRecipe, RunSummary, RunTrailerScene } from '../types/world';
import { formatIntervention, formatRunDuration, formatRunLength, formatRunPhase, formatRunSpeed, formatRunTheme } from '../utils/runSession';
import { createArchiveText, deleteArchivedRun, loadArchivedRuns, saveArchivedRun, type ArchivedRunSummary } from '../utils/runArchive';
import { getCodexProgress, getDiscoveredCodex } from '../utils/eventCodex';
import { formatRelicOrigin, getDiscoveredRelicCodex, getRelicCodexProgress } from '../utils/relicCodex';
import { formatBudgetValue } from '../utils/interventionBudget';
import { formatCommissionGrade } from '../utils/runCommissions';
import { buildRunShareCardSvg, downloadRunShareCardSvg } from '../utils/runShareCard';
import { deriveMealTableLegacy } from '../utils/mealTableLegacy';
import { isActiveInterventionKind } from '../utils/interventionKinds';
import { naturalWorldEvents } from '../utils/worldEvents';

interface PhoenixReviewProps {
  stats: any;
  runSummary?: RunSummary | null;
  onReset: () => void | Promise<void>;
  onStartChallenge?: (challenge: NextRunChallenge) => void | Promise<void>;
  status?: string;
}

type ReviewTab = 'REPORT' | 'CODEX' | 'TREE' | 'FAME';

const PhylogeneticTree = lazy(() => import('./PhylogeneticTree'));
const HallOfFame = lazy(() => import('./HallOfFame'));

const REVIEW_TABS: Array<{ id: ReviewTab; icon: React.ReactNode; label: string }> = [
  { id: 'REPORT', icon: <FileText size={14} />, label: '演化报告' },
  { id: 'CODEX', icon: <BookOpen size={14} />, label: '事件图鉴' },
  { id: 'TREE', icon: <Network size={14} />, label: '进化星图' },
  { id: 'FAME', icon: <Trophy size={14} />, label: '万神殿' },
];

function preloadReviewTab(tab: ReviewTab) {
  if (tab === 'TREE') {
    void import('./PhylogeneticTree');
  }
  if (tab === 'FAME') {
    void import('./HallOfFame');
  }
}

function ReviewTabFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center p-6">
      <div className="border border-white/10 bg-black/75 px-5 py-4 text-center">
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-white/50">{label}</p>
      </div>
    </div>
  );
}

const CODEX_ACCENT_CLASS = {
  cyan: 'border-t-neon-blue',
  green: 'border-t-emerald-400',
  yellow: 'border-t-yellow-300',
  red: 'border-t-red-400',
  purple: 'border-t-neon-purple',
  white: 'border-t-white/40',
} as const;

const DISCOVERY_ACCENT_CLASS: Record<RunDiscoveryCue['accent'], string> = {
  cyan: 'border-t-neon-blue text-neon-blue',
  green: 'border-t-emerald-300 text-emerald-300',
  yellow: 'border-t-yellow-300 text-yellow-300',
  red: 'border-t-red-400 text-red-400',
  purple: 'border-t-neon-purple text-neon-purple',
  white: 'border-t-white/40 text-white/60',
};

const RELIC_CODEX_ACCENT_CLASS = {
  cyan: 'border-t-neon-blue',
  green: 'border-t-emerald-400',
  yellow: 'border-t-yellow-300',
  red: 'border-t-red-400',
  purple: 'border-t-neon-purple',
  white: 'border-t-white/40',
} as const;

const CAST_TONE_CLASS: Record<CivilizationCastMember['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const ACHIEVEMENT_RARITY_CLASS: Record<RunAchievement['rarity'], string> = {
  common: 'border-t-white/30 text-white/60',
  rare: 'border-t-neon-blue text-neon-blue',
  epic: 'border-t-neon-purple text-neon-purple',
  mythic: 'border-t-yellow-300 text-yellow-300',
};

const RELIC_RARITY_CLASS: Record<RunRelic['rarity'], string> = {
  common: 'border-t-white/30 text-white/60',
  rare: 'border-t-neon-blue text-neon-blue',
  epic: 'border-t-yellow-300 text-yellow-300',
  mythic: 'border-t-neon-purple text-neon-purple',
};

const RELIC_ORIGIN_LABEL: Record<RunRelic['origin'], string> = {
  OUTCOME: '终局',
  ENTITY: '实体',
  EVENT: '事件',
  INTERVENTION: '干预',
  ACHIEVEMENT: '徽章',
  RHYTHM: '节奏',
};

const ERA_TONE_CLASS: Record<RunEra['tone'], string> = {
  info: 'border-l-neon-blue text-neon-blue',
  good: 'border-l-emerald-300 text-emerald-300',
  warning: 'border-l-yellow-300 text-yellow-300',
  danger: 'border-l-red-400 text-red-400',
};

const CHALLENGE_DIFFICULTY_CLASS: Record<NextRunChallenge['difficulty'], string> = {
  easy: 'border-t-emerald-300 text-emerald-300',
  normal: 'border-t-neon-blue text-neon-blue',
  hard: 'border-t-yellow-300 text-yellow-300',
  legendary: 'border-t-red-400 text-red-400',
};

const OBJECTIVE_STATUS_CLASS: Record<RunObjective['status'], string> = {
  active: 'border-t-neon-blue text-neon-blue',
  complete: 'border-t-emerald-300 text-emerald-300',
  failed: 'border-t-red-400 text-red-400',
};

const COMMISSION_GRADE_CLASS: Record<RunCommissionGrade, string> = {
  missed: 'border-t-red-400 text-red-400',
  bronze: 'border-t-yellow-300 text-yellow-300',
  silver: 'border-t-neon-blue text-neon-blue',
  gold: 'border-t-emerald-300 text-emerald-300',
  legend: 'border-t-neon-purple text-neon-purple',
};

const COMMISSION_STATUS_LABEL: Record<RunCommission['status'], string> = {
  active: '进行中',
  complete: '达成',
  failed: '失败',
};

const HIGHLIGHT_TONE_CLASS: Record<RunHighlight['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const RHYTHM_TONE_CLASS: Record<MealRhythmCue['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const RHYTHM_ACTION_LABEL: Record<MealRhythmCue['action'], string> = {
  WATCH: '观察',
  MARK: '标记',
  INTERVENE: '干预',
  HOLD: '忍手',
};

const TRAILER_TONE_CLASS: Record<RunTrailerScene['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const MEAL_SCORE_GRADE_CLASS: Record<MealRunScorecard['grade'], string> = {
  cold: 'border-t-white/30 text-white/60',
  warm: 'border-t-neon-blue text-neon-blue',
  hot: 'border-t-yellow-300 text-yellow-300',
  legend: 'border-t-neon-purple text-neon-purple',
};

const MEAL_FLAVOR_TONE_CLASS: Record<MealRunFlavorProfile['tags'][number]['tone'], string> = {
  info: 'border-neon-blue/30 bg-neon-blue/10 text-neon-blue',
  good: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
  warning: 'border-yellow-300/30 bg-yellow-300/10 text-yellow-200',
  danger: 'border-red-400/30 bg-red-400/10 text-red-200',
};

const SHARE_ASSET_TONE_CLASS: Record<MealRunShareBundle['assets'][number]['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const SHARE_ASSET_KIND_LABEL: Record<MealRunShareBundle['assets'][number]['kind'], string> = {
  POSTER: '海报',
  FLAVOR: '口味',
  BROADCAST: '播报',
  MOMENTS: '名场面',
  RECIPE: '配方',
  RELICS: '遗物',
  CODEX: '图鉴',
  CHALLENGE: '挑战',
};

const COPY_HOOK_TONE_CLASS: Record<MealRunCopyHookPack['hooks'][number]['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const COPY_HOOK_CHANNEL_LABEL: Record<MealRunCopyHookPack['hooks'][number]['channel'], string> = {
  WECHAT: '群聊',
  SHORT_VIDEO: '短视频',
  ARCHIVE: '收藏册',
};

const SOCIAL_CLIP_TONE_CLASS: Record<MealRunSocialClipPack['clips'][number]['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const SOCIAL_CLIP_SOURCE_LABEL: Record<MealRunSocialClipPack['clips'][number]['segments'][number]['source'], string> = {
  TRAILER: '三幕',
  EVENT: '事件',
  MOMENT: '名场面',
  BROADCAST: '播报',
  SUMMARY: '终局',
};

const REACTION_TONE_CLASS: Record<MealRunReactionPack['reactions'][number]['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const REACTION_KIND_LABEL: Record<MealRunReactionPack['reactions'][number]['kind'], string> = {
  SHOCK: '惊叹',
  SCIENCE: '解释',
  TACTIC: '战术',
  COLLECT: '收藏',
  REPLAY: '二刷',
  QUOTE: '金句',
};

const VARIANT_TONE_CLASS: Record<MealRunVariantDeck['routes'][number]['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const VARIANT_KIND_LABEL: Record<MealRunVariantDeck['routes'][number]['kind'], string> = {
  REMATCH: '复现',
  COUNTERFACTUAL: '反事实',
  HARDMODE: '高压',
};

const BINGO_CELL_TONE_CLASS: Record<MealRunBingoBoard['cells'][number]['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const BINGO_CELL_KIND_LABEL: Record<MealRunBingoBoard['cells'][number]['kind'], string> = {
  STAT: '指标',
  EVENT: '事件',
  INTERVENTION: '手痕',
  OBJECTIVE: '目标',
  COLLECTION: '收藏',
  STORY: '故事',
  REPLAY: '复开',
};

const MEAL_TABLE_LEGACY_CLASS: Record<MealTableLegacy['level'], string> = {
  seed: 'border-t-white/30 text-white/60',
  hearth: 'border-t-emerald-300 text-emerald-300',
  archive: 'border-t-neon-blue text-neon-blue',
  myth: 'border-t-neon-purple text-neon-purple',
};

const BROADCAST_ROLE_LABEL: Record<MealRunBroadcast['segments'][number]['role'], string> = {
  OPENING: '开场',
  TURN: '转折',
  SCIENCE: '解释',
  CLOSING: '收束',
};

const MEAL_MOMENT_ROLE_LABEL: Record<MealMomentDeck['cards'][number]['role'], string> = {
  HOOK: '开场',
  TURN: '转折',
  HUMAN: '手痕',
  AFTERMATH: '终局',
};

const MEAL_MOMENT_TONE_CLASS: Record<MealMomentDeck['cards'][number]['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const RECIPE_STEP_TONE_CLASS: Record<RunReplayRecipe['steps'][number]['tone'], string> = {
  info: 'border-t-neon-blue text-neon-blue',
  good: 'border-t-emerald-300 text-emerald-300',
  warning: 'border-t-yellow-300 text-yellow-300',
  danger: 'border-t-red-400 text-red-400',
};

const TRAILER_ROLE_LABEL: Record<RunTrailerScene['role'], string> = {
  HOOK: '第一幕',
  TURN: '第二幕',
  AFTERMATH: '第三幕',
};

const BUDGET_DISCIPLINE_CLASS: Record<NonNullable<RunSummary['interventionBudget']>['discipline'], string> = {
  restrained: 'border-t-emerald-300 text-emerald-300',
  balanced: 'border-t-neon-blue text-neon-blue',
  overdrawn: 'border-t-red-400 text-red-400',
};

type ReviewTrace = RunSummary['interventionTraces'][number];

const traceSampleCount = (trace: ReviewTrace) =>
  Math.max(trace.history?.length ?? 0, trace.latest?.length ?? 0, trace.before?.length ?? 0);

const hasTraceOutcomeSignal = (trace: ReviewTrace) =>
  trace.status === 'RESOLVED' ||
  trace.metrics.rescued > 0 ||
  trace.metrics.harmed > 0 ||
  trace.metrics.lost > 0 ||
  trace.metrics.generationGain > 0 ||
  Math.abs(trace.metrics.energyDelta) >= 8 ||
  Math.abs(trace.metrics.scoreDelta) >= 5 ||
  Math.abs(trace.metrics.toxinDelta) >= 0.1;

const traceSignalScore = (trace: ReviewTrace) =>
  trace.metrics.lost * 4 +
  trace.metrics.rescued * 3 +
  trace.metrics.harmed * 2 +
  trace.metrics.generationGain +
  Math.abs(trace.metrics.energyDelta) / 12 +
  Math.abs(trace.metrics.scoreDelta) / 5 +
  Math.abs(trace.metrics.toxinDelta) * 10 +
  Math.min(6, traceSampleCount(trace) / 2);

const PhoenixReview: React.FC<PhoenixReviewProps> = ({ stats, runSummary, onReset, onStartChallenge, status = '' }) => {
  const [activeTab, setActiveTab] = useState<ReviewTab>('REPORT');
  const [exportStatus, setExportStatus] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [archivedRuns, setArchivedRuns] = useState<ArchivedRunSummary[]>([]);
  const [reviewId] = useState(() => {
    const stamp = new Date()
      .toISOString()
      .split('-').join('')
      .split(':').join('')
      .split('T').join('')
      .split('Z').join('')
      .split('.').join('')
      .slice(0, 14);
    return `VGENE-${stamp}`;
  });

  const reportStats = {
    avgScore: Number(stats?.avgScore ?? 0),
    population: Number(stats?.population ?? 0),
    avgGeneration: Number(stats?.avgGeneration ?? 0),
    entropy: Number(stats?.entropy ?? 0),
  };
  const hasReportData =
    reportStats.population > 0 ||
    reportStats.avgScore > 0 ||
    reportStats.avgGeneration > 0 ||
    reportStats.entropy > 0;

  const survivalData = hasReportData
    ? [
        Math.min(100, reportStats.population / 20),
        Math.min(100, reportStats.avgScore),
        Math.min(100, reportStats.avgGeneration * 10),
        Math.min(100, reportStats.entropy),
      ]
    : [0, 0, 0, 0];

  const reportRows = [
    { label: '最终种群', value: reportStats.population.toFixed(0) },
    { label: '平均适应度', value: reportStats.avgScore.toFixed(2) },
    { label: '平均世代', value: reportStats.avgGeneration.toFixed(1) },
    { label: '信息熵', value: `${reportStats.entropy.toFixed(1)}%` },
  ];
  const actionStatus = status || exportStatus;
  const civilizationCast = runSummary?.civilizationCast ?? [];
  const achievements = runSummary?.achievements ?? [];
  const relics = runSummary?.relics ?? [];
  const eraChronicle = runSummary?.eraChronicle ?? [];
  const nextRunChallenges = runSummary?.nextRunChallenges ?? [];
  const objectives = runSummary?.objectives ?? [];
  const commissionBoard = runSummary?.commissionBoard;
  const highlights = runSummary?.highlights ?? [];
  const mealRhythm = runSummary?.mealRhythm ?? [];
  const trailer = runSummary?.trailer;
  const discoveries = runSummary?.discoveries ?? [];
  const predictionResult = runSummary?.predictionResult;
  const reviewMoments = useMemo(
    () => naturalWorldEvents(runSummary?.keyEvents ?? []).slice(0, 3),
    [runSummary?.keyEvents],
  );
  const activeTraceEvidence = useMemo(
    () => (runSummary?.interventionTraces ?? [])
      .filter((trace) => isActiveInterventionKind(trace.kind) && trace.metrics.affected > 0),
    [runSummary?.interventionTraces],
  );
  const reviewKeyTrace = useMemo(
    () => [...activeTraceEvidence]
      .filter(hasTraceOutcomeSignal)
      .sort((a, b) =>
        traceSignalScore(b) - traceSignalScore(a) ||
        b.updatedAt - a.updatedAt,
      )[0] ?? null,
    [activeTraceEvidence],
  );
  const pinnedObservationCount = runSummary?.interventionCounts.PIN_OBSERVE ?? 0;
  const primaryNextChallenge = nextRunChallenges[0] ?? null;
  const themeProfile = runSummary?.themeProfile ?? null;
  const shareCard = runSummary?.shareCard ?? null;
  const shareCardPreviewSrc = useMemo(
    () => shareCard ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildRunShareCardSvg(shareCard))}` : '',
    [shareCard],
  );
  const mealRunScore = runSummary?.mealRunScore ?? null;
  const broadcast = runSummary?.broadcast ?? null;
  const mealMoments = runSummary?.mealMoments ?? null;
  const flavorProfile = runSummary?.flavorProfile ?? null;
  const replayRecipe = runSummary?.replayRecipe ?? null;
  const shareBundle = runSummary?.shareBundle ?? null;
  const copyHookPack = runSummary?.copyHookPack ?? null;
  const socialClipPack = runSummary?.socialClipPack ?? null;
  const reactionPack = runSummary?.reactionPack ?? null;
  const variantDeck = runSummary?.variantDeck ?? null;
  const bingoBoard = runSummary?.bingoBoard ?? null;
  const interventionBudget = runSummary?.interventionBudget;
  const pinnedSpecimen = runSummary?.pinnedSpecimen;
  const mealTableLegacy = useMemo(
    () => deriveMealTableLegacy(runSummary, archivedRuns),
    [archivedRuns, runSummary],
  );
  const codexEntries = useMemo(
    () => getDiscoveredCodex(runSummary, archivedRuns),
    [archivedRuns, runSummary],
  );
  const codexProgress = useMemo(
    () => getCodexProgress(runSummary, archivedRuns),
    [archivedRuns, runSummary],
  );
  const relicCodexEntries = useMemo(
    () => getDiscoveredRelicCodex(runSummary, archivedRuns),
    [archivedRuns, runSummary],
  );
  const relicCodexProgress = useMemo(
    () => getRelicCodexProgress(runSummary, archivedRuns),
    [archivedRuns, runSummary],
  );

  useEffect(() => {
    setArchivedRuns(loadArchivedRuns());
  }, []);

  const exportReviewSnapshot = () => {
    try {
      const payload = {
        reviewId,
        exportedAt: new Date().toISOString(),
        stats,
        runSummary,
        survivalData,
        reportRows,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'vgene-phoenix-review.json';
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('凤凰复盘快照已导出。');
    } catch (e) {
      console.error('复盘快照导出失败:', e);
      setExportStatus('复盘快照导出失败，请查看控制台。');
    }
  };

  const copyShareText = async () => {
    if (!runSummary) {
      setExportStatus('暂无下饭局战报可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(runSummary.shareText);
      setExportStatus('下饭局战报已复制。');
    } catch (e) {
      console.error('战报复制失败:', e);
      setExportStatus(runSummary.shareText);
    }
  };

  const copyPredictionText = async () => {
    if (!predictionResult) {
      setExportStatus('暂无餐前押题结果可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(predictionResult.copyText);
      setExportStatus('餐前押题结果已复制。');
    } catch (e) {
      console.error('餐前押题复制失败:', e);
      setExportStatus(predictionResult.copyText);
    }
  };

  const copyBroadcastText = async () => {
    if (!broadcast) {
      setExportStatus('暂无下饭播报稿可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(broadcast.copyText);
      setExportStatus('下饭播报稿已复制。');
    } catch (e) {
      console.error('播报稿复制失败:', e);
      setExportStatus(broadcast.copyText);
    }
  };

  const copyFlavorText = async () => {
    if (!flavorProfile) {
      setExportStatus('暂无饭局口味标签可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(flavorProfile.copyText);
      setExportStatus('饭局口味标签已复制。');
    } catch (e) {
      console.error('饭局口味复制失败:', e);
      setExportStatus(flavorProfile.copyText);
    }
  };

  const copyShareBundleText = async () => {
    if (!shareBundle) {
      setExportStatus('暂无传播素材包可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(shareBundle.copyText);
      setExportStatus('传播素材包已复制。');
    } catch (e) {
      console.error('传播素材包复制失败:', e);
      setExportStatus(shareBundle.copyText);
    }
  };

  const copyHookPackText = async () => {
    if (!copyHookPack) {
      setExportStatus('暂无传播标题组可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(copyHookPack.copyText);
      setExportStatus('传播标题组已复制。');
    } catch (e) {
      console.error('传播标题组复制失败:', e);
      setExportStatus(copyHookPack.copyText);
    }
  };

  const copySocialClipText = async () => {
    if (!socialClipPack) {
      setExportStatus('暂无社交切片脚本可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(socialClipPack.copyText);
      setExportStatus('社交切片脚本已复制。');
    } catch (e) {
      console.error('社交切片脚本复制失败:', e);
      setExportStatus(socialClipPack.copyText);
    }
  };

  const copyReactionPackText = async () => {
    if (!reactionPack) {
      setExportStatus('暂无饭桌弹幕反应可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(reactionPack.copyText);
      setExportStatus('饭桌弹幕反应包已复制。');
    } catch (e) {
      console.error('饭桌弹幕反应复制失败:', e);
      setExportStatus(reactionPack.copyText);
    }
  };

  const copyVariantDeckText = async () => {
    if (!variantDeck) {
      setExportStatus('暂无下局变体牌组可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(variantDeck.copyText);
      setExportStatus('下局变体牌组已复制。');
    } catch (e) {
      console.error('下局变体牌组复制失败:', e);
      setExportStatus(variantDeck.copyText);
    }
  };

  const copyBingoBoardText = async () => {
    if (!bingoBoard) {
      setExportStatus('暂无下饭宾果可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(bingoBoard.copyText);
      setExportStatus('下饭宾果卡已复制。');
    } catch (e) {
      console.error('下饭宾果复制失败:', e);
      setExportStatus(bingoBoard.copyText);
    }
  };

  const copyMealMomentsText = async () => {
    if (!mealMoments) {
      setExportStatus('暂无饭点名场面可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(mealMoments.copyText);
      setExportStatus('饭点名场面卡包已复制。');
    } catch (e) {
      console.error('饭点名场面复制失败:', e);
      setExportStatus(mealMoments.copyText);
    }
  };

  const copyReplayRecipeText = async () => {
    if (!replayRecipe) {
      setExportStatus('暂无复开配方可复制。');
      return;
    }
    try {
      await navigator.clipboard.writeText(replayRecipe.copyText);
      setExportStatus('复开配方已复制。');
    } catch (e) {
      console.error('复开配方复制失败:', e);
      setExportStatus(replayRecipe.copyText);
    }
  };

  const exportShareCard = () => {
    if (!shareCard) {
      setExportStatus('暂无战报海报可导出。');
      return;
    }
    try {
      downloadRunShareCardSvg(shareCard, `${reviewId.toLowerCase()}-meal-run-poster.svg`);
      setExportStatus('战报海报 SVG 已导出。');
    } catch (e) {
      console.error('战报海报导出失败:', e);
      setExportStatus('战报海报导出失败，请查看控制台。');
    }
  };

  const saveCurrentRun = () => {
    if (!runSummary) {
      setExportStatus('暂无下饭局战报可收藏。');
      return;
    }
    try {
      const next = saveArchivedRun(runSummary);
      setArchivedRuns(next);
      setExportStatus('下饭局战报已收藏到本地战报册。');
    } catch (e) {
      console.error('战报收藏失败:', e);
      setExportStatus('战报收藏失败，请查看控制台。');
    }
  };

  const copyArchivedRun = async (item: ArchivedRunSummary) => {
    try {
      await navigator.clipboard.writeText(createArchiveText(item));
      setExportStatus('收藏战报已复制。');
    } catch (e) {
      console.error('收藏战报复制失败:', e);
      setExportStatus(createArchiveText(item));
    }
  };

  const removeArchivedRun = (id: string) => {
    try {
      setArchivedRuns(deleteArchivedRun(id));
      setExportStatus('收藏战报已删除。');
    } catch (e) {
      console.error('收藏战报删除失败:', e);
      setExportStatus('收藏战报删除失败，请查看控制台。');
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    setExportStatus('');
    try {
      await onReset();
    } finally {
      setIsResetting(false);
    }
  };

  const startChallenge = async (challenge: NextRunChallenge) => {
    if (!onStartChallenge) return;
    setExportStatus(`正在载入挑战：${challenge.title}`);
    try {
      await onStartChallenge(challenge);
    } catch (e) {
      console.error('挑战载入失败:', e);
      setExportStatus('挑战载入失败，请查看控制台。');
    }
  };

  const startLegacyChallenge = async () => {
    const challenge = mealTableLegacy?.recommendedChallenge;
    if (!challenge) return;
    await startChallenge(challenge);
  };

  const startReplayRecipe = async () => {
    if (!replayRecipe) return;
    await startChallenge(replayRecipe.challenge);
  };

  const startVariantRoute = async (route: MealRunVariantDeck['routes'][number]) => {
    await startChallenge(route.challenge);
  };

  return (
    <div className="phoenix-review fixed inset-0 z-50 flex flex-col bg-black/95 font-display backdrop-blur-2xl">
      <img
        src="/media/meal-run-observatory.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
      />

      {/* 顶部导航 */}
      <div className="flex justify-center px-4 pt-8 pb-4 border-b border-white/5 z-10">
        <div className="flex max-w-full flex-wrap justify-center gap-2 bg-white/5 p-1 rounded-sm sm:rounded-full">
          {REVIEW_TABS.map(tab => (
            <button
              type="button"
              aria-pressed={activeTab === tab.id}
              key={tab.id}
              onMouseEnter={() => preloadReviewTab(tab.id)}
              onFocus={() => preloadReviewTab(tab.id)}
              onClick={() => {
                preloadReviewTab(tab.id);
                setActiveTab(tab.id);
              }}
              className={`
                interactive-focus flex items-center gap-2 px-3 sm:px-6 py-2 rounded-sm sm:rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-[color,background-color,box-shadow]
                ${activeTab === tab.id ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/10'}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="relative z-10 flex-1 overflow-hidden">
        
        {/* 报告视图 */}
        {activeTab === 'REPORT' && (
          <div className="w-full h-full overflow-y-auto custom-scrollbar flex items-start lg:items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-full max-w-4xl p-5 sm:p-8 lg:p-12 space-y-8 lg:space-y-12">
              <div className="text-center">
                <h2 className="text-3xl sm:text-5xl font-black text-white tracking-normal uppercase italic">
                  凤凰复盘 <span className="text-neon-blue">/ PHOENIX</span>
                </h2>
                <p className="text-white/40 text-[9px] sm:text-[10px] mt-4 font-mono uppercase tracking-[0.25em] sm:tracking-[0.4em]">
                  // 演化终止报告 // 编号: {reviewId}
                </p>
              </div>

              {runSummary && (
                <section className="relative overflow-hidden border border-white/10 bg-white/[0.03] p-5 sm:p-6">
                  <img
                    src="/media/review-card-frame.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
                      <div>
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">局长</p>
                        <p className="mt-1 text-[11px] font-bold text-white">{formatRunLength(runSummary.length)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">倍率</p>
                        <p className="mt-1 text-[11px] font-bold text-neon-blue">{formatRunSpeed(runSummary.speed)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">主题</p>
                        <p className="mt-1 text-[11px] font-bold text-yellow-300">{formatRunTheme(runSummary.theme ?? 'Random')}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">时长</p>
                        <p className="mt-1 text-[11px] font-bold text-white">{formatRunDuration(runSummary.elapsedMs)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">结局</p>
                        <p className="mt-1 text-[11px] font-bold text-white">{runSummary.outcomeTitle}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-[10px] font-mono leading-relaxed text-white/60">{runSummary.outcomeReason}</p>
                  </div>
                </section>
              )}

              {runSummary && (
                <section className="relative overflow-hidden border border-t-2 border-neon-blue/35 bg-black/45 p-5 text-neon-blue sm:p-6">
                  <div className="relative grid grid-cols-1 gap-4 lg:grid-cols-[1.35fr_0.85fr_0.85fr]">
                    <div>
                      <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.18em] text-white/35">
                        <Landmark size={13} aria-hidden="true" />
                        三件大事
                      </p>
                      <div className="mt-3 grid gap-2">
                        {reviewMoments.length > 0 ? reviewMoments.map((event, index) => (
                          <article key={event.id} className="border border-white/10 bg-black/45 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <h3 className="min-w-0 truncate text-[11px] font-black text-white">
                                {index + 1}. {event.title}
                              </h3>
                              <span className="shrink-0 text-[9px] font-mono uppercase text-white/30">{event.phase}</span>
                            </div>
                            <p className="mt-1 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/50">{event.detail}</p>
                          </article>
                        )) : (
                          <p className="border border-white/10 bg-black/45 p-3 text-[9px] font-mono leading-relaxed text-white/45">
                            本局没有足够关键事件，复盘只保留终局统计和真实观测证据。
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="border border-white/10 bg-black/45 p-4">
                      <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.18em] text-white/35">
                        <Fingerprint size={13} aria-hidden="true" />
                        关键手痕
                      </p>
                      {reviewKeyTrace ? (
                        <>
                          <h3 className="mt-3 text-sm font-black text-white">{reviewKeyTrace.title}</h3>
                          <p className="mt-2 line-clamp-4 text-[9px] font-mono leading-relaxed text-white/50">{reviewKeyTrace.detail}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-[9px] font-mono text-white/35">
                            <span>{formatIntervention(reviewKeyTrace.kind)}</span>
                            <span>命中 {reviewKeyTrace.metrics.affected}</span>
                            <span>增益 {reviewKeyTrace.metrics.rescued}</span>
                            <span>压力 {reviewKeyTrace.metrics.harmed}</span>
                            <span>采样 {traceSampleCount(reviewKeyTrace)}</span>
                            {reviewKeyTrace.causalAudit && (
                              <span>对照 {reviewKeyTrace.causalAudit.controlSize}</span>
                            )}
                          </div>
                          {reviewKeyTrace.causalAudit && (
                            <p className="mt-3 border-t border-white/5 pt-2 text-[9px] font-mono leading-relaxed text-white/35">
                              相关性方向 {reviewKeyTrace.causalAudit.verdict} {reviewKeyTrace.causalAudit.confidence}% / 净能量 {reviewKeyTrace.causalAudit.netEnergyDelta >= 0 ? '+' : ''}{reviewKeyTrace.causalAudit.netEnergyDelta.toFixed(1)} / 净分数 {reviewKeyTrace.causalAudit.netScoreDelta >= 0 ? '+' : ''}{reviewKeyTrace.causalAudit.netScoreDelta.toFixed(1)}
                            </p>
                          )}
                        </>
                      ) : (
                        <>
                          <h3 className="mt-3 text-sm font-black text-white">没有已结算主动手痕</h3>
                          <p className="mt-2 text-[9px] font-mono leading-relaxed text-white/50">
                            本局未出现可归入关键手痕的后续信号；钉选观察 {pinnedObservationCount} 次，只作为样本追踪证据。
                          </p>
                        </>
                      )}
                    </div>

                    <div className="border border-white/10 bg-black/45 p-4">
                      <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.18em] text-white/35">
                        <Compass size={13} aria-hidden="true" />
                        下一局动机
                      </p>
                      {primaryNextChallenge ? (
                        <>
                          <h3 className="mt-3 text-sm font-black text-white">{primaryNextChallenge.title}</h3>
                          <p className="mt-2 line-clamp-4 text-[9px] font-mono leading-relaxed text-white/50">{primaryNextChallenge.objective}</p>
                          <button
                            type="button"
                            onClick={() => startChallenge(primaryNextChallenge)}
                            disabled={!onStartChallenge}
                            className="interactive-focus mt-3 min-h-10 w-full border border-current px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em] text-current transition-[border-color,background-color,color,opacity] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            载入挑战
                          </button>
                        </>
                      ) : (
                        <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/50">
                          暂无可载入挑战；下一局建议先提高事件密度或钉选主角样本。
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {runSummary && (activeTraceEvidence.length > 0 || (runSummary.entityFateLines ?? []).length > 0) && (
                <section className="relative overflow-hidden border border-t-2 border-neon-blue/40 bg-black/45 p-5 sm:p-6 text-neon-blue">
                  <img
                    src="/media/player-impact-trace.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-[9px] font-mono uppercase tracking-[0.25em] text-white/35">Player Trace</p>
                        <h3 className="mt-1 text-xl font-black italic text-white">玩家手痕证据</h3>
                      </div>
                      <span className="border border-current px-3 py-1 text-[10px] font-mono uppercase tracking-[0.14em]">
                        {activeTraceEvidence.length} 主动手痕
                      </span>
                    </div>
                    <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/45">
                      以下为干预后实体状态变化与相似未干预对照组审计，用于追踪相关性，不单独证明唯一因果；钉选观察只进入实体轨迹。
                    </p>
                    {activeTraceEvidence.length > 0 && (
                      <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        {activeTraceEvidence.slice(-4).map((trace) => (
                          <article key={trace.id} className={`border-l-2 bg-black/45 p-3 ${
                            trace.tone === 'good'
                              ? 'border-emerald-300 text-emerald-300'
                              : trace.tone === 'warning'
                                ? 'border-yellow-300 text-yellow-300'
                                : trace.tone === 'danger'
                                  ? 'border-red-400 text-red-400'
                                  : 'border-white/20 text-white/60'
                          }`}>
                            <div className="flex items-start justify-between gap-3">
                              <h4 className="min-w-0 truncate text-[11px] font-black text-white">{trace.title}</h4>
                              <span className="shrink-0 text-[9px] font-mono">采样 {traceSampleCount(trace)}</span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/55">{trace.detail}</p>
                            <div className="mt-2 grid grid-cols-4 gap-1 text-[9px] font-mono text-white/35">
                              <span>命中 {trace.metrics.affected}</span>
                              <span>存活 {trace.metrics.alive}</span>
                              <span>增益 {trace.metrics.rescued}</span>
                              <span>压力 {trace.metrics.harmed}</span>
                            </div>
                            {trace.causalAudit && (
                              <p className="mt-2 truncate border-t border-white/5 pt-2 text-[9px] font-mono text-white/35">
                                相关性方向 {trace.causalAudit.verdict} {trace.causalAudit.confidence}% / 对照 {trace.causalAudit.controlSize} / 净E {trace.causalAudit.netEnergyDelta >= 0 ? '+' : ''}{trace.causalAudit.netEnergyDelta.toFixed(1)} / 净S {trace.causalAudit.netScoreDelta >= 0 ? '+' : ''}{trace.causalAudit.netScoreDelta.toFixed(1)}
                              </p>
                            )}
                          </article>
                        ))}
                      </div>
                    )}
                    {(runSummary.entityFateLines ?? []).length > 0 && (
                      <div className="mt-5 border-t border-white/10 pt-4">
                        <p className="mb-2 text-[9px] font-mono uppercase tracking-[0.18em] text-white/35">实体手痕轨迹</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {(runSummary.entityFateLines ?? []).slice(0, 4).map((line) => (
                            <article key={line.entityId} className="border border-white/10 bg-white/[0.03] p-3">
                              <h4 className="truncate text-[10px] font-black text-white">{line.title}</h4>
                              <p className="mt-1 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/45">{line.detail}</p>
                              <p className="mt-2 truncate text-[9px] font-mono text-white/25">{line.evidence}</p>
                            </article>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {runSummary && predictionResult && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[predictionResult.tone]}`}>
                  <img
                    src="/media/meal-run-prediction-slip.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[15rem_1fr]">
                    <div className="border border-current bg-black/45 p-4">
                      <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                        <ClipboardCheck size={13} aria-hidden="true" />
                        Prediction Slip
                      </p>
                      <div className="mt-4 flex items-end gap-2">
                        <span className="text-4xl font-black text-white">{predictionResult.score}</span>
                        <span className="pb-1 text-xs font-mono text-white/35">%</span>
                      </div>
                      <p className="mt-2 text-sm font-black text-current">
                        {predictionResult.completed ? '押题命中' : '押题落空'}
                      </p>
                    </div>
                    <div className="flex min-w-0 flex-col justify-between gap-5">
                      <div>
                        <h3 className="text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {predictionResult.title}
                        </h3>
                        <p className="mt-3 text-[10px] font-mono leading-relaxed text-white/60">
                          {predictionResult.detail}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
                        <div className="border border-white/10 bg-black/45 p-3">
                          <p className="text-[8px] font-mono uppercase tracking-widest text-white/30">餐前目标</p>
                          <p className="mt-2 text-[9px] font-mono leading-relaxed text-white/55">{predictionResult.prediction.target}</p>
                        </div>
                        <div className="border border-white/10 bg-black/45 p-3">
                          <p className="text-[8px] font-mono uppercase tracking-widest text-white/30">建议先手</p>
                          <p className="mt-2 text-[9px] font-mono leading-relaxed text-white/55">{formatIntervention(predictionResult.prediction.suggestedIntervention)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={copyPredictionText}
                          className="interactive-focus inline-flex items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                        >
                          <Copy size={14} aria-hidden="true" />
                          复制押题
                        </button>
                      </div>
                      <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                        {predictionResult.evidence}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {runSummary && mealRunScore && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${MEAL_SCORE_GRADE_CLASS[mealRunScore.grade]}`}>
                  <img
                    src="/media/meal-run-scorecard.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[13rem_1fr]">
                    <div>
                      <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                        <Gauge size={13} aria-hidden="true" />
                        Meal Index
                      </p>
                      <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                        下饭指数
                      </h3>
                      <div className="mt-4 flex items-end gap-2">
                        <span className="text-5xl font-black text-white">{mealRunScore.score}</span>
                        <span className="pb-2 text-xs font-mono text-white/35">/ {mealRunScore.maxScore}</span>
                      </div>
                      <p className="mt-2 text-sm font-black text-current">{mealRunScore.label}</p>
                      <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/45">{mealRunScore.detail}</p>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {mealRunScore.axes.map((axis) => (
                          <article key={axis.id} className="border border-white/10 bg-black/45 p-3">
                            <div className="flex items-center justify-between gap-3">
                              <h4 className="text-[9px] font-bold uppercase tracking-widest text-white/70">{axis.label}</h4>
                              <span className="text-lg font-black text-white">{axis.score}</span>
                            </div>
                            <div className="mt-3 h-1 bg-white/10">
                              <div
                                className="h-full bg-current"
                                style={{ width: `${axis.score}%` }}
                              />
                            </div>
                            <p className="mt-3 text-[8px] font-mono leading-relaxed text-white/45">{axis.detail}</p>
                          </article>
                        ))}
                      </div>
                      {mealRunScore.hooks.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {mealRunScore.hooks.map((hook) => (
                            <span key={hook} className="border border-current px-2 py-1 text-[8px] font-mono uppercase tracking-widest text-white/45">
                              {hook}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                        {mealRunScore.evidence}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {runSummary && flavorProfile && flavorProfile.tags.length > 0 && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[flavorProfile.tone]}`}>
                  <img
                    src="/media/meal-run-flavor-tags.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <Utensils size={13} aria-hidden="true" />
                          Flavor Tags
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {flavorProfile.title}
                        </h3>
                        <p className="mt-3 text-sm font-black leading-relaxed text-white">{flavorProfile.headline}</p>
                      </div>
                      <button
                        type="button"
                        onClick={copyFlavorText}
                        className="interactive-focus inline-flex shrink-0 items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                      >
                        <Copy size={14} aria-hidden="true" />
                        复制口味
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {flavorProfile.tags.map((tagItem) => (
                        <article
                          key={tagItem.id}
                          className={`border border-t-2 p-3 ${MEAL_FLAVOR_TONE_CLASS[tagItem.tone]}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[8px] font-mono uppercase tracking-widest text-white/35">{tagItem.kind}</p>
                              <h4 className="mt-2 text-sm font-black leading-snug text-white">{tagItem.label}</h4>
                            </div>
                            <span className="shrink-0 border border-current px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest">
                              {tagItem.score}
                            </span>
                          </div>
                          <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/60">{tagItem.detail}</p>
                          <p className="mt-3 truncate border-t border-white/5 pt-2 text-[8px] font-mono text-white/30">
                            {tagItem.evidence}
                          </p>
                        </article>
                      ))}
                    </div>

                    <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                      {flavorProfile.evidence}
                    </p>
                  </div>
                </section>
              )}

              {runSummary && shareBundle && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[shareBundle.tone]}`}>
                  <img
                    src="/media/meal-run-share-bundle.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative space-y-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <BookmarkPlus size={13} aria-hidden="true" />
                          Share Bundle
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {shareBundle.title}
                        </h3>
                        <p className="mt-3 text-sm font-black leading-relaxed text-white">
                          {shareBundle.headline}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="border border-current bg-black/45 px-4 py-3 text-center">
                          <p className="text-[8px] font-mono uppercase tracking-widest text-white/30">Ready</p>
                          <p className="mt-1 text-lg font-black text-white">{shareBundle.readyCount}/{shareBundle.totalCount}</p>
                        </div>
                        <button
                          type="button"
                          onClick={copyShareBundleText}
                          className="interactive-focus inline-flex items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                        >
                          <Copy size={14} aria-hidden="true" />
                          复制素材包
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {shareBundle.assets.map((assetItem) => (
                        <article
                          key={assetItem.id}
                          className={`border border-t-2 border-white/10 bg-black/45 p-3 ${SHARE_ASSET_TONE_CLASS[assetItem.tone]} ${assetItem.ready ? '' : 'opacity-60'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[8px] font-mono uppercase tracking-widest">
                                {SHARE_ASSET_KIND_LABEL[assetItem.kind]}
                              </p>
                              <h4 className="mt-2 line-clamp-2 text-[11px] font-black leading-snug text-white">{assetItem.title}</h4>
                            </div>
                            <span className="shrink-0 border border-current px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest">
                              {assetItem.ready ? 'Ready' : 'Need'}
                            </span>
                          </div>
                          <p className="mt-3 line-clamp-3 text-[9px] font-mono leading-relaxed text-white/60">{assetItem.detail}</p>
                          <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/5 pt-2">
                            <span className="text-[8px] font-mono uppercase tracking-widest text-white/30">{assetItem.actionLabel}</span>
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
                          </div>
                          <p className="mt-2 truncate text-[8px] font-mono text-white/25">{assetItem.evidence}</p>
                        </article>
                      ))}
                    </div>

                    <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                      {shareBundle.evidence}
                    </p>
                  </div>
                </section>
              )}

              {runSummary && copyHookPack && copyHookPack.hooks.length > 0 && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[copyHookPack.tone]}`}>
                  <img
                    src="/media/meal-run-copy-hooks.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <Copy size={13} aria-hidden="true" />
                          Copy Hooks
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {copyHookPack.title}
                        </h3>
                        <p className="mt-3 text-[10px] font-mono leading-relaxed text-white/60">
                          {copyHookPack.headline}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={copyHookPackText}
                        className="interactive-focus inline-flex shrink-0 items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                      >
                        <Copy size={14} aria-hidden="true" />
                        复制标题组
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      {copyHookPack.hooks.map((hook) => (
                        <article
                          key={hook.id}
                          className={`border border-t-2 border-white/10 bg-black/45 p-4 ${COPY_HOOK_TONE_CLASS[hook.tone]}`}
                        >
                          <p className="text-[8px] font-mono uppercase tracking-widest">
                            {COPY_HOOK_CHANNEL_LABEL[hook.channel]}
                          </p>
                          <h4 className="mt-2 text-sm font-black leading-snug text-white">{hook.title}</h4>
                          <p className="mt-3 text-[10px] font-bold leading-relaxed text-white/75">{hook.line}</p>
                          <p className="mt-3 line-clamp-2 text-[8px] font-mono leading-relaxed text-white/35">{hook.detail}</p>
                          <p className="mt-3 truncate border-t border-white/5 pt-2 text-[8px] font-mono text-white/25">{hook.evidence}</p>
                        </article>
                      ))}
                    </div>

                    <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                      {copyHookPack.evidence}
                    </p>
                  </div>
                </section>
              )}

              {runSummary && socialClipPack && socialClipPack.clips.length > 0 && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[socialClipPack.tone]}`}>
                  <img
                    src="/media/meal-run-social-clips.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <Film size={13} aria-hidden="true" />
                          Social Clips
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {socialClipPack.title}
                        </h3>
                        <p className="mt-3 text-[10px] font-mono leading-relaxed text-white/60">
                          {socialClipPack.headline}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={copySocialClipText}
                        className="interactive-focus inline-flex shrink-0 items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                      >
                        <Copy size={14} aria-hidden="true" />
                        复制脚本
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                      {socialClipPack.clips.map((clip) => (
                        <article
                          key={clip.id}
                          className={`border border-t-2 border-white/10 bg-black/45 p-4 ${SOCIAL_CLIP_TONE_CLASS[clip.tone]}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[8px] font-mono uppercase tracking-widest">{clip.durationSec}s Script</p>
                              <h4 className="mt-2 text-sm font-black leading-snug text-white">{clip.title}</h4>
                            </div>
                            <span className="shrink-0 border border-current px-2 py-1 text-[8px] font-mono uppercase tracking-widest">
                              {clip.segments.length} 镜
                            </span>
                          </div>
                          <p className="mt-3 text-[10px] font-bold leading-relaxed text-white/75">{clip.hook}</p>
                          <div className="mt-4 space-y-2">
                            {clip.segments.slice(0, 3).map((segment) => (
                              <div key={segment.id} className="border border-white/5 bg-black/35 p-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[8px] font-mono uppercase tracking-widest text-white/30">
                                    {segment.startSec}-{segment.endSec}s / {SOCIAL_CLIP_SOURCE_LABEL[segment.source]}
                                  </span>
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
                                </div>
                                <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/60">{segment.narration}</p>
                                <p className="mt-1 truncate text-[8px] font-mono text-white/25">{segment.caption}</p>
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 truncate border-t border-white/5 pt-2 text-[8px] font-mono text-white/25">{clip.evidence}</p>
                        </article>
                      ))}
                    </div>

                    <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                      {socialClipPack.evidence}
                    </p>
                  </div>
                </section>
              )}

              {runSummary && reactionPack && reactionPack.reactions.length > 0 && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[reactionPack.tone]}`}>
                  <img
                    src="/media/meal-run-reactions.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <Utensils size={13} aria-hidden="true" />
                          Table Reactions
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {reactionPack.title}
                        </h3>
                        <p className="mt-3 text-[10px] font-mono leading-relaxed text-white/60">
                          {reactionPack.headline}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={copyReactionPackText}
                        className="interactive-focus inline-flex shrink-0 items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                      >
                        <Copy size={14} aria-hidden="true" />
                        复制弹幕
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {reactionPack.reactions.map((reaction) => (
                        <article
                          key={reaction.id}
                          className={`border border-t-2 border-white/10 bg-black/45 p-4 ${REACTION_TONE_CLASS[reaction.tone]}`}
                        >
                          <p className="text-[8px] font-mono uppercase tracking-widest">
                            {REACTION_KIND_LABEL[reaction.kind]}
                          </p>
                          <h4 className="mt-2 text-sm font-black leading-snug text-white">{reaction.line}</h4>
                          <p className="mt-3 line-clamp-2 text-[8px] font-mono leading-relaxed text-white/35">{reaction.detail}</p>
                          <p className="mt-3 truncate border-t border-white/5 pt-2 text-[8px] font-mono text-white/25">{reaction.evidence}</p>
                        </article>
                      ))}
                    </div>

                    <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                      {reactionPack.evidence}
                    </p>
                  </div>
                </section>
              )}

              {runSummary && variantDeck && variantDeck.routes.length > 0 && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[variantDeck.tone]}`}>
                  <img
                    src="/media/meal-run-variant-deck.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative space-y-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <Compass size={13} aria-hidden="true" />
                          Variant Deck
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {variantDeck.title}
                        </h3>
                        <p className="mt-3 text-[10px] font-mono leading-relaxed text-white/60">
                          {variantDeck.headline}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={copyVariantDeckText}
                        className="interactive-focus inline-flex shrink-0 items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                      >
                        <Copy size={14} aria-hidden="true" />
                        复制牌组
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      {variantDeck.routes.map((route) => (
                        <button
                          type="button"
                          key={route.id}
                          onClick={() => startVariantRoute(route)}
                          disabled={!onStartChallenge}
                          className={`interactive-focus flex min-h-[18rem] flex-col border border-t-2 border-white/10 bg-black/45 p-4 text-left transition-[border-color,background-color,color,opacity] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_TONE_CLASS[route.tone]}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[8px] font-mono uppercase tracking-widest">
                                {VARIANT_KIND_LABEL[route.kind]}
                              </p>
                              <h4 className="mt-2 line-clamp-2 text-sm font-black leading-snug text-white">{route.title}</h4>
                            </div>
                            <span className="shrink-0 border border-current px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest">
                              {formatRunSpeed(route.recommendedSpeed)}
                            </span>
                          </div>
                          <p className="mt-3 line-clamp-3 text-[9px] font-mono leading-relaxed text-white/55">{route.detail}</p>
                          <div className="mt-4 grid grid-cols-1 gap-2 text-[8px] font-mono text-white/35">
                            <span>{formatRunLength(route.recommendedLength)}</span>
                            <span>{formatRunTheme(route.recommendedTheme)}</span>
                          </div>
                          <p className="mt-3 line-clamp-4 text-[9px] font-bold leading-relaxed text-white/70">{route.challenge.objective}</p>
                          <p className="mt-auto border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                            {route.evidence}
                          </p>
                          <span className="mt-3 border border-current px-2 py-1 text-center text-[8px] font-mono uppercase tracking-widest">
                            载入变体
                          </span>
                        </button>
                      ))}
                    </div>

                    <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                      {variantDeck.evidence}
                    </p>
                  </div>
                </section>
              )}

              {runSummary && bingoBoard && bingoBoard.cells.length > 0 && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[bingoBoard.tone]}`}>
                  <img
                    src="/media/meal-run-bingo-board.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative space-y-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <ClipboardCheck size={13} aria-hidden="true" />
                          Meal Bingo
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {bingoBoard.title}
                        </h3>
                        <p className="mt-3 text-[10px] font-mono leading-relaxed text-white/60">
                          {bingoBoard.headline}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                        <div className="border border-current px-4 py-3 text-center">
                          <p className="text-[8px] font-mono uppercase tracking-widest text-white/30">Bingo</p>
                          <p className="mt-1 text-lg font-black text-white">{bingoBoard.completed}/{bingoBoard.total}</p>
                        </div>
                        <button
                          type="button"
                          onClick={copyBingoBoardText}
                          className="interactive-focus inline-flex items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                        >
                          <Copy size={14} aria-hidden="true" />
                          复制宾果
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {bingoBoard.cells.map((cellItem) => (
                        <article
                          key={cellItem.id}
                          className={`flex min-h-[10rem] flex-col border border-t-2 border-white/10 bg-black/45 p-3 ${BINGO_CELL_TONE_CLASS[cellItem.tone]} ${cellItem.complete ? '' : 'opacity-55'}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[8px] font-mono uppercase tracking-widest">
                                {BINGO_CELL_KIND_LABEL[cellItem.kind]}
                              </p>
                              <h4 className="mt-2 line-clamp-2 text-[11px] font-black leading-snug text-white">{cellItem.title}</h4>
                            </div>
                            <span className="shrink-0 border border-current px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest">
                              {cellItem.complete ? 'OK' : 'NEXT'}
                            </span>
                          </div>
                          <p className="mt-3 line-clamp-3 text-[8px] font-mono leading-relaxed text-white/45">{cellItem.detail}</p>
                          <div className="mt-auto pt-3">
                            <div className="h-1 bg-white/10">
                              <div className="h-full bg-current" style={{ width: `${cellItem.score}%` }} />
                            </div>
                            <p className="mt-2 truncate text-[8px] font-mono text-white/25">{cellItem.evidence}</p>
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-3 lg:grid-cols-[1fr_1fr]">
                      <p className="text-[9px] font-mono leading-relaxed text-white/45">{bingoBoard.nextPrompt}</p>
                      <p className="text-[8px] font-mono leading-relaxed text-white/30">{bingoBoard.evidence}</p>
                    </div>
                  </div>
                </section>
              )}

              {runSummary && shareCard && shareCardPreviewSrc && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[shareCard.tone]}`}>
                  <img
                    src="/media/run-share-poster-frame.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[18rem_1fr]">
                    <div className="mx-auto w-full max-w-[18rem]">
                      <div className="overflow-hidden border border-current bg-black/50 p-2 shadow-[0_0_40px_rgba(56,189,248,0.12)]">
                        <img
                          src={shareCardPreviewSrc}
                          alt="战报海报预览"
                          className="block aspect-[4/5] w-full bg-black object-cover"
                        />
                      </div>
                    </div>
                    <div className="flex min-w-0 flex-col justify-between gap-5">
                      <div>
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <ImageDown size={13} aria-hidden="true" />
                          Share Poster
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          战报海报
                        </h3>
                        <p className="mt-3 text-[10px] font-mono leading-relaxed text-white/60">
                          {shareCard.title} / {shareCard.subtitle}
                        </p>
                        <p className="mt-3 line-clamp-3 text-[10px] font-mono leading-relaxed text-white/45">
                          {shareCard.narrative}
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {shareCard.metrics.map((metric) => (
                          <div key={metric.label} className="border border-white/5 bg-black/40 p-3">
                            <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">{metric.label}</p>
                            <p className="mt-1 text-lg font-black text-white">{metric.value}</p>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 flex-wrap gap-1.5">
                          {shareCard.badges.slice(0, 5).map((badge) => (
                            <span key={badge} className="border border-current px-2 py-1 text-[8px] font-mono uppercase tracking-widest text-white/40">
                              {badge}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={exportShareCard}
                          className="interactive-focus inline-flex shrink-0 items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                        >
                          <ImageDown size={14} aria-hidden="true" />
                          导出 SVG
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {runSummary && themeProfile && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[themeProfile.tone]}`}>
                  <img
                    src="/media/theme-signal-ribbon.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_2fr]">
                    <div>
                      <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                        <Compass size={13} aria-hidden="true" />
                        Theme Signal
                      </p>
                      <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                        本局主题画像
                      </h3>
                      <p className="mt-3 text-[10px] font-mono leading-relaxed text-white/60">
                        {themeProfile.label} / {themeProfile.headline}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <p className="text-[10px] font-mono leading-relaxed text-white/60">{themeProfile.detail}</p>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                        <div className="border border-white/5 bg-black/40 p-3">
                          <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">观察重点</p>
                          <p className="mt-2 text-[9px] font-mono leading-relaxed text-white/55">{themeProfile.watchFocus}</p>
                        </div>
                        <div className="border border-white/5 bg-black/40 p-3">
                          <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">科学框架</p>
                          <p className="mt-2 text-[9px] font-mono leading-relaxed text-white/55">{themeProfile.scienceFrame}</p>
                        </div>
                        <div className="border border-white/5 bg-black/40 p-3">
                          <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">历史类比</p>
                          <p className="mt-2 text-[9px] font-mono leading-relaxed text-white/55">{themeProfile.historicalFrame}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[8px] font-mono text-white/35 sm:grid-cols-4">
                        <span>协作 {themeProfile.metrics.cooperators}</span>
                        <span>高压 {themeProfile.metrics.stressedEntities}</span>
                        <span>匹配事件 {themeProfile.metrics.matchingEventCount}</span>
                        <span>建议 {formatIntervention(themeProfile.suggestedIntervention)}</span>
                      </div>
                      <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                        {themeProfile.evidence}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {runSummary && discoveries.length > 0 && (
                <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                  <img
                    src="/media/codex-discovery-ribbon.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-blue">Codex Discovery</p>
                        <h3 className="mt-1 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          本局图鉴发现
                        </h3>
                      </div>
                      <p className="max-w-md text-[9px] font-mono leading-relaxed text-white/40">
                        只统计本局真实事件首次触发的文明词条，用来把观看过程变成可收集进度。
                      </p>
                    </div>
                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {discoveries.slice(-8).map((discovery) => (
                        <article
                          key={discovery.id}
                          className={`border border-t-2 border-white/10 bg-black/40 p-3 ${DISCOVERY_ACCENT_CLASS[discovery.accent]}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-[11px] font-black text-white">{discovery.name}</p>
                              <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-white/30">
                                {discovery.domain}
                              </p>
                            </div>
                            <span className="shrink-0 border border-current px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest">
                              {discovery.rarity}
                            </span>
                          </div>
                          <p className="mt-3 line-clamp-3 text-[8px] font-mono leading-relaxed text-white/55">
                            {discovery.detail}
                          </p>
                          <p className="mt-3 border-t border-white/5 pt-2 text-[8px] font-mono leading-relaxed text-white/30">
                            T+{formatRunDuration(Math.max(0, discovery.timestamp - runSummary.startedAt))} / {discovery.evidence}
                          </p>
                        </article>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-[8px] font-mono uppercase tracking-widest text-white/30">
                      <BookOpen size={11} aria-hidden="true" />
                      {discoveries.length} codex entries discovered this run
                    </div>
                  </div>
                </section>
              )}

              {runSummary && trailer && (
                <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                  <img
                    src="/media/run-trailer-strip.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-purple">Run Trailer</p>
                        <h3 className="mt-1 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          三幕战报短片
                        </h3>
                      </div>
                      <p className="max-w-md text-[9px] font-mono leading-relaxed text-white/40">
                        从真实事件、实体快照、节奏和终局统计剪出局后预告，不生成纯 UI 假事件。
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_2fr]">
                      <article className={`border border-t-2 border-white/10 bg-black/40 p-4 ${TRAILER_TONE_CLASS[trailer.tone]}`}>
                        <div className="flex items-start gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-current bg-white/[0.02]">
                            <Film size={16} aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <h4 className="text-sm font-black leading-snug text-white">{trailer.title}</h4>
                            <p className="mt-2 text-[9px] font-mono leading-relaxed text-white/60">{trailer.tagline}</p>
                          </div>
                        </div>
                        <p className="mt-4 border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                          {trailer.evidence}
                        </p>
                      </article>

                      <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                        {trailer.scenes.map((scene) => (
                          <article
                            key={scene.id}
                            className={`border border-t-2 border-white/10 bg-black/40 p-3 ${TRAILER_TONE_CLASS[scene.tone]}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[8px] font-mono uppercase tracking-widest">
                                  {TRAILER_ROLE_LABEL[scene.role]}
                                </p>
                                <h4 className="mt-2 line-clamp-2 text-[11px] font-black leading-snug text-white">
                                  {scene.title}
                                </h4>
                              </div>
                              <span className="shrink-0 text-[8px] font-mono uppercase tracking-widest text-white/30">
                                T+{formatRunDuration(Math.max(0, scene.timestamp - runSummary.startedAt))}
                              </span>
                            </div>
                            <p className="mt-3 text-[8px] font-mono uppercase tracking-widest text-white/30">
                              {scene.subtitle}
                            </p>
                            <p className="mt-3 line-clamp-4 text-[9px] font-mono leading-relaxed text-white/60">
                              {scene.detail}
                            </p>
                            <p className="mt-3 border-t border-white/5 pt-2 text-[8px] font-mono leading-relaxed text-white/30">
                              {scene.evidence}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {runSummary && broadcast && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[broadcast.tone]}`}>
                  <img
                    src="/media/meal-run-broadcast.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <Film size={13} aria-hidden="true" />
                          Meal Broadcast
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {broadcast.title}
                        </h3>
                        <p className="mt-3 text-[10px] font-mono leading-relaxed text-white/60">
                          {broadcast.subtitle} / 约 {broadcast.durationSec}s
                        </p>
                        <p className="mt-3 text-sm font-black leading-relaxed text-white">{broadcast.hostLine}</p>
                      </div>
                      <button
                        type="button"
                        onClick={copyBroadcastText}
                        className="interactive-focus inline-flex shrink-0 items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                      >
                        <Copy size={14} aria-hidden="true" />
                        复制播报稿
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {broadcast.segments.map((segment) => (
                        <article key={segment.id} className={`border border-t-2 border-white/10 bg-black/45 p-3 ${TRAILER_TONE_CLASS[segment.tone]}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[8px] font-mono uppercase tracking-widest">{BROADCAST_ROLE_LABEL[segment.role]}</p>
                              <h4 className="mt-2 line-clamp-2 text-[11px] font-black leading-snug text-white">{segment.title}</h4>
                            </div>
                          </div>
                          <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/60">{segment.line}</p>
                          <p className="mt-3 border-t border-white/5 pt-2 text-[8px] font-mono leading-relaxed text-white/30">
                            {segment.evidence}
                          </p>
                        </article>
                      ))}
                    </div>
                    <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                      {broadcast.evidence}
                    </p>
                  </div>
                </section>
              )}

              {runSummary && mealMoments && mealMoments.cards.length > 0 && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[mealMoments.tone]}`}>
                  <img
                    src="/media/meal-moment-cards.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative space-y-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <Utensils size={13} aria-hidden="true" />
                          Meal Moment Cards
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {mealMoments.title}
                        </h3>
                        <p className="mt-3 text-[10px] font-mono leading-relaxed text-white/60">
                          {mealMoments.subtitle}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={copyMealMomentsText}
                        className="interactive-focus inline-flex shrink-0 items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                      >
                        <Copy size={14} aria-hidden="true" />
                        复制卡包
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                      {mealMoments.cards.map((card) => (
                        <article
                          key={card.id}
                          className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/50 p-4 ${MEAL_MOMENT_TONE_CLASS[card.tone]}`}
                        >
                          <div className="absolute right-3 top-3 text-5xl font-black italic leading-none text-white/[0.03]">
                            {MEAL_MOMENT_ROLE_LABEL[card.role]}
                          </div>
                          <div className="relative">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[8px] font-mono uppercase tracking-widest">{MEAL_MOMENT_ROLE_LABEL[card.role]}</p>
                                <h4 className="mt-2 line-clamp-2 text-sm font-black leading-snug text-white">{card.title}</h4>
                              </div>
                              <span className="shrink-0 text-[8px] font-mono uppercase tracking-widest text-white/30">
                                T+{formatRunDuration(Math.max(0, card.timestamp - runSummary.startedAt))}
                              </span>
                            </div>
                            <p className="mt-3 text-[9px] font-mono uppercase tracking-widest text-white/30">
                              {card.kicker}
                            </p>
                            <p className="mt-3 text-[10px] font-bold leading-relaxed text-white/75">{card.line}</p>
                            <p className="mt-3 line-clamp-2 text-[8px] font-mono leading-relaxed text-white/35">
                              {card.detail}
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-2 text-[8px] font-mono text-white/30">
                              <span>P {card.metrics.population}</span>
                              <span>S {card.metrics.avgScore.toFixed(1)}</span>
                              <span>G {card.metrics.avgGeneration.toFixed(1)}</span>
                              <span>H {card.metrics.entropy.toFixed(1)}%</span>
                            </div>
                            <p className="mt-2 truncate text-[8px] font-mono text-white/25">
                              {typeof card.entityId === 'number' ? `#${card.entityId} / ` : ''}{card.evidence}
                            </p>
                          </div>
                        </article>
                      ))}
                    </div>
                    <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                      {mealMoments.evidence}
                    </p>
                  </div>
                </section>
              )}

              {runSummary && replayRecipe && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${TRAILER_TONE_CLASS[replayRecipe.tone]}`}>
                  <img
                    src="/media/run-replay-recipe.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative space-y-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <ClipboardCheck size={13} aria-hidden="true" />
                          Replay Recipe
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {replayRecipe.title}
                        </h3>
                        <p className="mt-3 text-[10px] font-mono leading-relaxed text-white/60">
                          {replayRecipe.subtitle}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={copyReplayRecipeText}
                          className="interactive-focus inline-flex shrink-0 items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color] hover:bg-white/5"
                        >
                          <Copy size={14} aria-hidden="true" />
                          复制配方
                        </button>
                        <button
                          type="button"
                          onClick={startReplayRecipe}
                          disabled={!onStartChallenge}
                          className="interactive-focus inline-flex shrink-0 items-center justify-center gap-2 border border-current px-4 py-3 text-[9px] font-mono uppercase tracking-[0.24em] text-current transition-[border-color,color,background-color,opacity] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCcw size={14} aria-hidden="true" />
                          按配方再开
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                      <article className="border border-white/10 bg-black/45 p-3">
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/30">Length</p>
                        <p className="mt-2 text-sm font-black text-white">{formatRunLength(replayRecipe.recommendedLength)}</p>
                      </article>
                      <article className="border border-white/10 bg-black/45 p-3">
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/30">Speed</p>
                        <p className="mt-2 text-sm font-black text-white">{formatRunSpeed(replayRecipe.recommendedSpeed)}</p>
                      </article>
                      <article className="border border-white/10 bg-black/45 p-3">
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/30">Theme</p>
                        <p className="mt-2 text-sm font-black text-white">{formatRunTheme(replayRecipe.recommendedTheme)}</p>
                      </article>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.85fr_1.15fr]">
                      <article className="border border-white/10 bg-black/45 p-4">
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/30">Objective</p>
                        <p className="mt-3 text-sm font-black leading-relaxed text-white">{replayRecipe.objective}</p>
                        <p className="mt-3 border-t border-white/5 pt-3 text-[9px] font-mono leading-relaxed text-white/45">
                          {replayRecipe.setup}
                        </p>
                      </article>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {replayRecipe.steps.map((step, index) => (
                          <article
                            key={step.id}
                            className={`border border-t-2 border-white/10 bg-black/45 p-3 ${RECIPE_STEP_TONE_CLASS[step.tone]}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[8px] font-mono uppercase tracking-widest">
                                  Step {index + 1} / {step.timing}
                                </p>
                                <h4 className="mt-2 line-clamp-2 text-[11px] font-black leading-snug text-white">
                                  {step.title}
                                </h4>
                              </div>
                            </div>
                            <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/60">{step.detail}</p>
                            <p className="mt-3 border-t border-white/5 pt-2 text-[8px] font-mono leading-relaxed text-white/30">
                              {step.evidence}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>

                    <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                      {replayRecipe.evidence}
                    </p>
                  </div>
                </section>
              )}

              {runSummary && (
                <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                  <img
                    src="/media/observation-objectives.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-blue">Observation Goals</p>
                        <h3 className="mt-1 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          本局观测目标
                        </h3>
                      </div>
                      <p className="max-w-md text-[9px] font-mono leading-relaxed text-white/40">
                        目标由实时统计、实体快照和真实事件推导，用于吃饭时快速判断本局进度。
                      </p>
                    </div>

                    {objectives.length > 0 ? (
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                        {objectives.map((objective) => (
                          <article
                            key={objective.id}
                            className={`border border-t-2 border-white/10 bg-black/40 p-3 ${OBJECTIVE_STATUS_CLASS[objective.status]}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black text-white">{objective.title}</p>
                                <p className="mt-1 text-[8px] font-mono uppercase tracking-widest">{objective.status}</p>
                              </div>
                              <span className="shrink-0 text-[8px] font-mono uppercase tracking-widest">
                                {Math.round(objective.progress * 100)}%
                              </span>
                            </div>
                            <div className="mt-3 h-1 bg-white/10">
                              <div
                                className="h-full bg-current"
                                style={{ width: `${Math.round(objective.progress * 100)}%` }}
                              />
                            </div>
                            <p className="mt-3 text-[8px] font-mono leading-relaxed text-white/40">{objective.evidence}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 border border-white/5 bg-black/40 p-4 text-[9px] font-mono leading-relaxed text-white/30">
                        本局没有生成观测目标。
                      </p>
                    )}
                  </div>
                </section>
              )}

              {runSummary && commissionBoard && (
                <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                  <img
                    src="/media/commission-board.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-yellow-300">Commission Board</p>
                        <h3 className="mt-1 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          饭局委托单
                        </h3>
                      </div>
                      <p className="max-w-md text-[9px] font-mono leading-relaxed text-white/40">
                        委托评分只聚合观测目标、真实事件、实体快照和终局统计，用于给下饭局一个可追逐的局内评级。
                      </p>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[16rem_1fr]">
                      <article className={`border border-t-2 border-white/10 bg-black/40 p-4 ${COMMISSION_GRADE_CLASS[commissionBoard.grade]}`}>
                        <div className="flex items-start gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-current bg-white/[0.02]">
                            <ClipboardCheck size={16} aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[8px] font-mono uppercase tracking-widest">
                              {formatCommissionGrade(commissionBoard.grade)}
                            </p>
                            <h4 className="mt-2 text-sm font-black leading-snug text-white">{commissionBoard.title}</h4>
                          </div>
                        </div>
                        <div className="mt-4 h-1 bg-white/10">
                          <div
                            className="h-full bg-current"
                            style={{ width: `${Math.round((commissionBoard.score / commissionBoard.maxScore) * 100)}%` }}
                          />
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-[8px] font-mono text-white/35">
                          <span>达成 {commissionBoard.completed}/{commissionBoard.total}</span>
                          <span>评分 {commissionBoard.score}/{commissionBoard.maxScore}</span>
                        </div>
                        <p className="mt-3 border-t border-white/5 pt-2 text-[8px] font-mono leading-relaxed text-white/30">
                          {commissionBoard.evidence}
                        </p>
                      </article>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {commissionBoard.commissions.map((item) => (
                          <article
                            key={item.id}
                            className={`border border-t-2 border-white/10 bg-black/40 p-3 ${COMMISSION_GRADE_CLASS[item.grade]}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black text-white">{item.title}</p>
                                <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-white/30">
                                  {item.patron} / {COMMISSION_STATUS_LABEL[item.status]}
                                </p>
                              </div>
                              <span className="shrink-0 border border-current px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest">
                                {formatCommissionGrade(item.grade)}
                              </span>
                            </div>
                            <p className="mt-3 line-clamp-3 text-[9px] font-mono leading-relaxed text-white/60">{item.detail}</p>
                            <div className="mt-3 h-1 bg-white/10">
                              <div
                                className="h-full bg-current"
                                style={{ width: `${Math.round((item.score / item.maxScore) * 100)}%` }}
                              />
                            </div>
                            <p className="mt-3 border-t border-white/5 pt-2 text-[8px] font-mono leading-relaxed text-white/30">
                              {item.evidence}
                            </p>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {runSummary && (
                <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                  <img
                    src="/media/era-chronicle-strip.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-emerald-300">Era Chronicle</p>
                        <h3 className="mt-1 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          文明纪元轴
                        </h3>
                      </div>
                      <p className="max-w-md text-[9px] font-mono leading-relaxed text-white/40">
                        把真实事件按阶段压缩成时代，不补写未发生的传奇。
                      </p>
                    </div>

                    {eraChronicle.length > 0 ? (
                      <div className="mt-5 space-y-3">
                        {eraChronicle.map((era) => (
                          <article
                            key={era.id}
                            className={`grid grid-cols-1 gap-3 border border-l-2 border-white/10 bg-black/40 p-3 sm:grid-cols-[8rem_1fr] ${ERA_TONE_CLASS[era.tone]}`}
                          >
                            <div className="border-b border-white/5 pb-3 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-3">
                              <p className="text-[8px] font-mono uppercase tracking-widest text-white/30">
                                {formatRunPhase(era.phase)}
                              </p>
                              <p className="mt-2 text-[10px] font-black text-white">{era.title}</p>
                              <p className="mt-2 text-[8px] font-mono text-white/30">
                                T+{formatRunDuration(Math.max(0, era.startedAt - runSummary.startedAt))}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                                <p className="text-[9px] font-mono leading-relaxed text-white/40">{era.detail}</p>
                                <span className="shrink-0 text-[8px] font-mono uppercase tracking-widest">
                                  {era.eventCount} events
                                </span>
                              </div>
                              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                                <p className="border border-white/5 bg-white/[0.02] p-2 text-[8px] font-mono leading-relaxed text-white/40">
                                  {era.scienceNote}
                                </p>
                                <p className="border border-white/5 bg-white/[0.02] p-2 text-[8px] font-mono leading-relaxed text-white/40">
                                  {era.historicalAnalogy}
                                </p>
                              </div>
                              <p className="mt-2 text-[8px] font-mono leading-relaxed text-white/25">{era.evidence}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 border border-white/5 bg-black/40 p-4 text-[9px] font-mono leading-relaxed text-white/30">
                        本局没有可压缩为纪元的阶段事件。
                      </p>
                    )}
                  </div>
                </section>
              )}

              {runSummary && (
                <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                  <img
                    src="/media/civilization-cast-table.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-blue">Civilization Cast</p>
                        <h3 className="mt-1 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          文明主角席
                        </h3>
                      </div>
                      <p className="max-w-md text-[9px] font-mono leading-relaxed text-white/40">
                        由终局实体快照和已触发事件推导，记录本局真正出现过的角色。
                      </p>
                    </div>

                    {civilizationCast.length > 0 ? (
                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                        {civilizationCast.map((member) => (
                          <article
                            key={`${member.role}-${member.entityId}`}
                            className={`border border-t-2 border-white/10 bg-black/40 p-3 ${CAST_TONE_CLASS[member.tone]}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black text-white">{member.title}</p>
                                <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-white/30">#{member.entityId}</p>
                              </div>
                              <span className="shrink-0 text-[8px] font-mono uppercase tracking-widest">{member.role}</span>
                            </div>
                            <p className="mt-3 text-[9px] font-bold text-white/75">{member.epithet}</p>
                            <p className="mt-2 line-clamp-4 text-[8px] font-mono leading-relaxed text-white/40">{member.detail}</p>
                            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/5 pt-2 text-[8px] font-mono text-white/30">
                              <span>S {member.score.toFixed(1)}</span>
                              <span>E {member.energy.toFixed(0)}%</span>
                              <span>T {(member.toxin * 100).toFixed(0)}%</span>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 border border-white/5 bg-black/40 p-4 text-[9px] font-mono leading-relaxed text-white/30">
                        终局实体快照为空，未生成文明主角席。
                      </p>
                    )}
                  </div>
                </section>
              )}

              {runSummary && (
                <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                  <img
                    src="/media/run-achievement-medals.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-yellow-300">Run Medals</p>
                        <h3 className="mt-1 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          下饭局徽章
                        </h3>
                      </div>
                      <p className="max-w-md text-[9px] font-mono leading-relaxed text-white/40">
                        徽章只由真实事件、终局统计、玩家干预和文明主角席推导。
                      </p>
                    </div>

                    {achievements.length > 0 ? (
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {achievements.map((achievement) => (
                          <article
                            key={achievement.id}
                            className={`border border-t-2 border-white/10 bg-black/40 p-3 ${ACHIEVEMENT_RARITY_CLASS[achievement.rarity]}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black text-white">{achievement.title}</p>
                                <p className="mt-1 text-[8px] font-mono uppercase tracking-widest">{achievement.rarity}</p>
                              </div>
                              <span className="shrink-0 border border-current px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest">
                                Medal
                              </span>
                            </div>
                            <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/40">{achievement.detail}</p>
                            <p className="mt-3 border-t border-white/5 pt-2 text-[8px] font-mono leading-relaxed text-white/30">
                              {achievement.evidence}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 border border-white/5 bg-black/40 p-4 text-[9px] font-mono leading-relaxed text-white/30">
                        本局尚未达到徽章阈值；推进更多事件、干预或高光结局后会生成徽章。
                      </p>
                    )}
                  </div>
                </section>
              )}

              {runSummary && (
                <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                  <img
                    src="/media/run-relic-vault.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-purple">Relic Vault</p>
                        <h3 className="mt-1 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          文明遗物库
                        </h3>
                      </div>
                      <p className="max-w-md text-[9px] font-mono leading-relaxed text-white/40">
                        遗物来自终局统计、实体主角、真实事件、玩家干预、徽章和节奏记录，用于收藏与传播。
                      </p>
                    </div>

                    {relics.length > 0 ? (
                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {relics.map((relic) => (
                          <article
                            key={relic.id}
                            className={`border border-t-2 border-white/10 bg-black/40 p-3 ${RELIC_RARITY_CLASS[relic.rarity]}`}
                          >
                            <div className="flex items-start gap-3">
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center border border-current bg-white/[0.02]">
                                <Gem size={15} aria-hidden="true" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <p className="truncate text-[11px] font-black text-white">{relic.title}</p>
                                    <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-white/30">
                                      {RELIC_ORIGIN_LABEL[relic.origin]} / {relic.rarity}
                                    </p>
                                  </div>
                                  <span className="shrink-0 border border-current px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest">
                                    Relic
                                  </span>
                                </div>
                                <p className="mt-3 text-[9px] font-bold text-white/70">{relic.subtitle}</p>
                                <p className="mt-2 line-clamp-3 text-[8px] font-mono leading-relaxed text-white/40">{relic.detail}</p>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-2 text-[8px] font-mono text-white/30">
                              <span>P {relic.metrics.population}</span>
                              <span>S {relic.metrics.avgScore.toFixed(1)}</span>
                              <span>H {relic.metrics.entropy.toFixed(1)}%</span>
                              <span>I {relic.metrics.interventionCount}</span>
                            </div>
                            <p className="mt-2 truncate text-[8px] font-mono text-white/25">
                              {typeof relic.entityId === 'number' ? `#${relic.entityId} / ` : ''}{relic.evidence}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 border border-white/5 bg-black/40 p-4 text-[9px] font-mono leading-relaxed text-white/30">
                        本局暂未生成文明遗物；至少需要一次有效终局摘要。
                      </p>
                    )}
                  </div>
                </section>
              )}

              {runSummary && (
                <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                  <img
                    src="/media/next-run-challenges.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-red-300">Next Protocol</p>
                        <h3 className="mt-1 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          再开一局协议
                        </h3>
                      </div>
                      <p className="max-w-md text-[9px] font-mono leading-relaxed text-white/40">
                        根据本局真实结果生成下一局目标，把复盘变成继续玩的理由。
                      </p>
                    </div>

                    {nextRunChallenges.length > 0 ? (
                      <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                        {nextRunChallenges.map((challenge) => (
                          <button
                            type="button"
                            key={challenge.id}
                            onClick={() => startChallenge(challenge)}
                            disabled={!onStartChallenge}
                            className={`interactive-focus border border-t-2 border-white/10 bg-black/40 p-3 text-left transition-[border-color,background-color,color,opacity] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60 ${CHALLENGE_DIFFICULTY_CLASS[challenge.difficulty]}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black text-white">{challenge.title}</p>
                                <p className="mt-1 text-[8px] font-mono uppercase tracking-widest">{challenge.difficulty}</p>
                              </div>
                              <span className="shrink-0 border border-current px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest">
                                {formatRunSpeed(challenge.recommendedSpeed)}
                              </span>
                            </div>
                            <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/60">{challenge.objective}</p>
                            <p className="mt-3 text-[8px] font-mono leading-relaxed text-white/40">{challenge.setup}</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-2 text-[8px] font-mono text-white/30">
                              <span>{formatRunLength(challenge.recommendedLength)}</span>
                              <span>{formatRunTheme(challenge.recommendedTheme ?? 'Random')}</span>
                              <span>{challenge.evidence}</span>
                            </div>
                            <p className="mt-3 border border-current px-2 py-1 text-center text-[8px] font-mono uppercase tracking-widest">
                              载入此挑战
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 border border-white/5 bg-black/40 p-4 text-[9px] font-mono leading-relaxed text-white/30">
                        本局暂未生成下一局挑战；推进更多事件或完成一次干预后会出现目标协议。
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* 核心指标 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="glass-card p-6 border-t-2 border-t-neon-blue">
                  <div className="flex items-center gap-2 text-white/40 text-[9px] uppercase font-mono mb-2">
                    <TrendingUp size={14} />
                    <span>平均适应度</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono">{reportStats.avgScore.toFixed(2)}</div>
                </div>
                <div className="glass-card p-6 border-t-2 border-t-red-500">
                  <div className="flex items-center gap-2 text-white/40 text-[9px] uppercase font-mono mb-2">
                    <Skull size={14} />
                    <span>最终信息熵</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono">{reportStats.entropy.toFixed(1)}%</div>
                </div>
                <div className="glass-card p-6 border-t-2 border-t-neon-purple">
                  <div className="flex items-center gap-2 text-white/40 text-[9px] uppercase font-mono mb-2">
                    <Zap size={14} />
                    <span>平均演化深度</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-mono">{reportStats.avgGeneration.toFixed(1)}</div>
                </div>
              </div>

              {/* 存活曲线与日志 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-widest">本轮指标轮廓</h3>
                  <div className="h-48 flex items-end gap-2 px-2 border-b border-l border-white/5">
                    {survivalData.map((v, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-neon-blue/20 border-t border-neon-blue transition-colors hover:bg-neon-blue/40"
                        style={{ height: `${v}%` }}
                      />
                    ))}
                  </div>
                  {!hasReportData && (
                    <p className="text-[9px] text-white/30 font-mono leading-relaxed">
                      暂无可复盘的世界统计；启动并推进一次创世后会生成真实指标轮廓。
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-widest">复盘摘要</h3>
                  <div className="space-y-3">
                    {reportRows.map((row, i) => (
                      <div key={i} className="flex items-start gap-4 p-3 bg-white/[0.02] rounded-sm border border-white/5">
                        <span className="text-[9px] font-mono text-neon-blue">{row.label}</span>
                        <div>
                          <div className="text-[10px] font-bold text-white/80">{row.value}</div>
                          <div className="text-[9px] text-white/30 mt-0.5">来自当前世界统计快照</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {runSummary && (
                <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                  <img
                    src="/media/meal-rhythm-plate.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-blue">Meal Rhythm</p>
                        <h3 className="mt-1 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          下饭节奏
                        </h3>
                      </div>
                      <p className="max-w-md text-[9px] font-mono leading-relaxed text-white/40">
                        记录本局根据真实世界状态给出的观看、标记和干预节奏，不写入 settings。
                      </p>
                    </div>

                    {mealRhythm.length > 0 ? (
                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {mealRhythm.slice(-6).map((cue) => (
                          <article
                            key={cue.id}
                            className={`border border-t-2 border-white/10 bg-black/40 p-3 ${RHYTHM_TONE_CLASS[cue.tone]}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black text-white">{cue.title}</p>
                                <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-white/30">
                                  {RHYTHM_ACTION_LABEL[cue.action]} / {formatRunPhase(cue.phase)}
                                </p>
                              </div>
                              <span className="flex shrink-0 items-center gap-1 text-[8px] font-mono uppercase tracking-widest">
                                <Utensils size={10} aria-hidden="true" />
                                T+{formatRunDuration(Math.max(0, cue.timestamp - runSummary.startedAt))}
                              </span>
                            </div>
                            <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/60">{cue.detail}</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-2 text-[8px] font-mono text-white/30">
                              <span>P {cue.metrics.population}</span>
                              <span>S {cue.metrics.avgScore.toFixed(1)}</span>
                              <span>H {cue.metrics.entropy.toFixed(1)}%</span>
                              <span>{Math.round(cue.confidence * 100)}%</span>
                            </div>
                            <p className="mt-2 truncate text-[8px] font-mono text-white/25">{cue.evidence}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 border border-white/5 bg-black/40 p-4 text-[9px] font-mono leading-relaxed text-white/30">
                        本局没有形成可记录的节奏判断。
                      </p>
                    )}
                  </div>
                </section>
              )}

              {runSummary && (
                <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                  <img
                    src="/media/run-highlight-bookmark.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-purple">Run Highlights</p>
                        <h3 className="mt-1 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          精彩瞬间
                        </h3>
                      </div>
                      <p className="max-w-md text-[9px] font-mono leading-relaxed text-white/40">
                        来自局内手动标记，记录当时的导演镜头、真实事件和世界指标。
                      </p>
                    </div>

                    {highlights.length > 0 ? (
                      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {highlights.map((highlight) => (
                          <article
                            key={highlight.id}
                            className={`border border-t-2 border-white/10 bg-black/40 p-3 ${HIGHLIGHT_TONE_CLASS[highlight.tone]}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-[11px] font-black text-white">{highlight.title}</p>
                                <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-white/30">
                                  {highlight.source} / {formatRunPhase(highlight.phase)}
                                </p>
                              </div>
                              <span className="shrink-0 text-[8px] font-mono uppercase tracking-widest">
                                T+{formatRunDuration(Math.max(0, highlight.timestamp - runSummary.startedAt))}
                              </span>
                            </div>
                            <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/60">{highlight.detail}</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-2 text-[8px] font-mono text-white/30">
                              <span>P {highlight.metrics.population}</span>
                              <span>S {highlight.metrics.avgScore.toFixed(1)}</span>
                              <span>G {highlight.metrics.avgGeneration.toFixed(1)}</span>
                              <span>H {highlight.metrics.entropy.toFixed(1)}%</span>
                            </div>
                            <p className="mt-2 truncate text-[8px] font-mono text-white/25">
                              {typeof highlight.entityId === 'number' ? `#${highlight.entityId} / ` : ''}{highlight.evidence}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-5 border border-white/5 bg-black/40 p-4 text-[9px] font-mono leading-relaxed text-white/30">
                        本局没有手动标记精彩瞬间。
                      </p>
                    )}
                  </div>
                </section>
              )}

              {runSummary && (
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                  <section className="space-y-4">
                    <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-widest">关键历史事件</h3>
                    <div className="max-h-72 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                      {runSummary.keyEvents.length > 0 ? runSummary.keyEvents.map((event) => (
                        <article key={event.id} className="border border-white/5 bg-white/[0.02] p-3">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-[10px] font-bold text-white/80">{event.title}</h4>
                            <span className="text-[8px] font-mono text-white/25">{formatRunPhase(event.phase)}</span>
                          </div>
                          <p className="mt-1 text-[9px] font-mono leading-relaxed text-white/40">{event.detail}</p>
                        </article>
                      )) : (
                        <p className="text-[9px] text-white/30 font-mono leading-relaxed">本局没有达到可记录的世界事件阈值。</p>
                      )}
                    </div>
                  </section>

                  {pinnedSpecimen && (
                    <section className="space-y-4">
                      <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-widest">钉选样本档案</h3>
                      <article className={`relative overflow-hidden border border-t-2 bg-black/40 p-4 ${
                        pinnedSpecimen.status === 'SURVIVED'
                          ? 'border-t-neon-blue text-neon-blue'
                          : 'border-t-red-400 text-red-400'
                      }`}>
                        <img
                          src="/media/pinned-specimen-dossier.svg"
                          alt=""
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                        />
                        <div className="relative">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-[12px] font-black text-white">{pinnedSpecimen.title}</h4>
                              <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-white/30">
                                {pinnedSpecimen.status === 'SURVIVED' ? 'Survived Specimen' : 'Lost Specimen'}
                              </p>
                            </div>
                            <span className="shrink-0 border border-current px-2 py-1 text-[8px] font-mono uppercase tracking-widest">
                              {formatRunDuration(pinnedSpecimen.trackedMs)}
                            </span>
                          </div>
                          <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/60">{pinnedSpecimen.detail}</p>
                          <div className="mt-4 grid grid-cols-2 gap-2 text-[8px] font-mono text-white/40">
                            <span>峰值适应度 {pinnedSpecimen.peakScore.toFixed(2)}</span>
                            <span>世代变化 {pinnedSpecimen.generationGain >= 0 ? '+' : ''}{pinnedSpecimen.generationGain}</span>
                            <span>能量变化 {pinnedSpecimen.energyDelta >= 0 ? '+' : ''}{pinnedSpecimen.energyDelta.toFixed(1)}</span>
                            <span>毒素变化 {pinnedSpecimen.toxinDelta >= 0 ? '+' : ''}{pinnedSpecimen.toxinDelta.toFixed(2)}</span>
                          </div>
                          <p className="mt-3 border-t border-white/5 pt-2 text-[8px] font-mono leading-relaxed text-white/30">
                            {pinnedSpecimen.evidence}
                          </p>
                        </div>
                      </article>
                    </section>
                  )}

                  <section className="space-y-4">
                    <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-widest">玩家干预统计</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {(Object.keys(runSummary.interventionCounts) as Array<keyof typeof runSummary.interventionCounts>).map((kind) => (
                        <div key={kind} className="flex items-center justify-between border border-white/5 bg-white/[0.02] px-3 py-2">
                          <span className="text-[9px] font-mono text-white/40">{formatIntervention(kind)}</span>
                          <span className="text-[10px] font-bold text-white">{runSummary.interventionCounts[kind]}</span>
                        </div>
                      ))}
                    </div>
                    {interventionBudget && (
                      <article className={`border border-t-2 bg-black/40 p-3 ${BUDGET_DISCIPLINE_CLASS[interventionBudget.discipline]}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-[11px] font-black text-white">{interventionBudget.title}</h4>
                            <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-white/30">Oracle Discipline</p>
                          </div>
                          <span className="shrink-0 border border-current px-2 py-1 text-[8px] font-mono uppercase tracking-widest">
                            {formatBudgetValue(interventionBudget.remaining)} / {formatBudgetValue(interventionBudget.max)}
                          </span>
                        </div>
                        <p className="mt-3 text-[9px] font-mono leading-relaxed text-white/60">{interventionBudget.detail}</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/5 pt-2 text-[8px] font-mono text-white/30">
                          <span>消耗 {formatBudgetValue(interventionBudget.used)}</span>
                          <span>恢复 {formatBudgetValue(interventionBudget.recovered)}</span>
                        </div>
                      </article>
                    )}
                    <div className="border border-white/5 bg-black/40 p-3">
                      <pre className="whitespace-pre-wrap text-[9px] font-mono leading-relaxed text-white/60">{runSummary.shareText}</pre>
                    </div>
                  </section>
                </div>
              )}

              {mealTableLegacy && (
                <section className={`relative overflow-hidden border border-t-2 border-white/10 bg-black/40 p-5 sm:p-6 ${MEAL_TABLE_LEGACY_CLASS[mealTableLegacy.level]}`}>
                  <img
                    src="/media/meal-table-legacy.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative space-y-5">
                    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[12rem_1fr]">
                      <div>
                        <p className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.3em] text-current">
                          <BookOpen size={13} aria-hidden="true" />
                          Table Legacy
                        </p>
                        <h3 className="mt-2 text-xl font-black uppercase italic tracking-normal text-white sm:text-2xl">
                          {mealTableLegacy.title}
                        </h3>
                        <div className="mt-4 flex items-end gap-2">
                          <span className="text-4xl font-black text-white">{mealTableLegacy.score}</span>
                          <span className="pb-1 text-xs font-mono text-white/35">/ {mealTableLegacy.maxScore}</span>
                        </div>
                        <p className="mt-2 text-sm font-black text-current">{mealTableLegacy.levelLabel}</p>
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] font-mono leading-relaxed text-white/55">{mealTableLegacy.detail}</p>
                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
                          {mealTableLegacy.metrics.map((metric) => (
                            <div key={metric.id} className="border border-white/10 bg-black/45 p-3">
                              <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">{metric.label}</p>
                              <p className="mt-1 text-xl font-black text-white">{metric.value}</p>
                              <p className="mt-2 line-clamp-2 text-[8px] font-mono leading-relaxed text-white/40">{metric.detail}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_16rem]">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {mealTableLegacy.milestones.map((milestone) => (
                          <p key={milestone} className="border border-white/5 bg-white/[0.02] p-3 text-[9px] font-mono leading-relaxed text-white/45">
                            {milestone}
                          </p>
                        ))}
                      </div>
                      <div className="relative overflow-hidden border border-current bg-black/45 p-3">
                        <img
                          src="/media/legacy-challenge-seal.svg"
                          alt=""
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                        />
                        <div className="relative">
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">下一局建议</p>
                        <p className="mt-2 text-[10px] font-mono leading-relaxed text-white/60">{mealTableLegacy.nextPrompt}</p>
                        {mealTableLegacy.bestRun && (
                          <p className="mt-3 border-t border-white/5 pt-2 text-[8px] font-mono leading-relaxed text-white/35">
                            最高局：{mealTableLegacy.bestRun.title} / {formatRunTheme(mealTableLegacy.bestRun.theme)} / {mealTableLegacy.bestRun.score}
                          </p>
                        )}
                        {mealTableLegacy.recommendedChallenge && (
                          <button
                            type="button"
                            onClick={startLegacyChallenge}
                            disabled={!onStartChallenge}
                            className="interactive-focus mt-3 w-full border border-current px-3 py-2 text-[8px] font-mono uppercase tracking-widest text-current transition-[border-color,background-color,color,opacity] hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            载入传承挑战
                          </button>
                        )}
                        </div>
                      </div>
                    </div>
                    <p className="border-t border-white/5 pt-3 text-[8px] font-mono leading-relaxed text-white/30">
                      {mealTableLegacy.evidence}
                    </p>
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-widest">本地战报册</h3>
                  <span className="text-[8px] font-mono text-white/25">{archivedRuns.length} / 24</span>
                </div>
                {archivedRuns.length === 0 ? (
                  <p className="border border-white/5 bg-white/[0.02] p-4 text-[9px] font-mono leading-relaxed text-white/30">
                    暂无收藏战报；收藏后会保存在本机浏览器存储中，便于后续复制分享。
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {archivedRuns.slice(0, 6).map((item) => (
                      <article key={item.id} className="border border-white/5 bg-black/40 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[10px] font-bold text-white/80">{item.summary.outcomeTitle}</p>
                            <p className="mt-1 text-[8px] font-mono text-white/30">
                              {new Date(item.savedAt).toLocaleString('zh-CN', { hour12: false })}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              aria-label="复制收藏战报"
                              onClick={() => copyArchivedRun(item)}
                              className="interactive-focus border border-white/10 p-2 text-white/40 hover:text-neon-blue"
                            >
                              <Copy size={12} aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              aria-label="删除收藏战报"
                              onClick={() => removeArchivedRun(item.id)}
                              className="interactive-focus border border-white/10 p-2 text-white/40 hover:text-red-400"
                            >
                              <Trash2 size={12} aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 line-clamp-2 text-[8px] font-mono leading-relaxed text-white/40">
                          {item.summary.outcomeReason}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        )}

        {/* 事件图鉴视图 */}
        {activeTab === 'CODEX' && (
          <div className="h-full w-full overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-500">
            <div className="mx-auto w-full max-w-6xl space-y-8 p-5 sm:p-8 lg:p-12">
              <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                <img
                  src="/media/event-codex-plates.svg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                />
                <div className="relative grid grid-cols-1 gap-5 md:grid-cols-[1fr_16rem]">
                  <div>
                    <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-blue">Event Codex</p>
                    <h2 className="mt-2 text-2xl font-black uppercase italic tracking-normal text-white sm:text-4xl">
                      事件图鉴 / 文明词条
                    </h2>
                    <p className="mt-3 max-w-2xl text-[10px] font-mono leading-relaxed text-white/40">
                      每个词条只解释真实触发过或可触发的世界事件；发现状态来自本局复盘和本地收藏战报。
                    </p>
                  </div>
                  <div className="border border-white/10 bg-black/40 p-4">
                    <div className="flex items-end justify-between gap-3">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-white/30">发现进度</span>
                      <span className="text-2xl font-black text-white">{codexProgress.discovered}/{codexProgress.total}</span>
                    </div>
                    <div className="mt-3 h-1 bg-white/10">
                      <div
                        className="h-full bg-neon-blue"
                        style={{ width: `${Math.round(codexProgress.ratio * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="relative overflow-hidden border border-white/10 bg-black/40 p-5 sm:p-6">
                <img
                  src="/media/relic-codex-matrix.svg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                />
                <div className="relative space-y-5">
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_18rem]">
                    <div>
                      <p className="text-[9px] font-mono uppercase tracking-[0.3em] text-neon-purple">Relic Codex</p>
                      <h3 className="mt-2 text-2xl font-black uppercase italic tracking-normal text-white sm:text-3xl">
                        遗物收藏进度
                      </h3>
                      <p className="mt-3 max-w-2xl text-[10px] font-mono leading-relaxed text-white/40">
                        进度来自当前复盘和本地战报册的文明遗物，不额外写入 settings。
                      </p>
                    </div>
                    <div className="border border-white/10 bg-black/40 p-4">
                      <div className="flex items-end justify-between gap-3">
                        <span className="text-[9px] font-mono uppercase tracking-widest text-white/30">遗物发现</span>
                        <span className="text-2xl font-black text-white">
                          {relicCodexProgress.discovered}/{relicCodexProgress.total}
                        </span>
                      </div>
                      <div className="mt-3 h-1 bg-white/10">
                        <div
                          className="h-full bg-neon-purple"
                          style={{ width: `${Math.round(relicCodexProgress.ratio * 100)}%` }}
                        />
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-[8px] font-mono text-white/30">
                        <span>{relicCodexProgress.totalRelics} relics</span>
                        <span>{relicCodexProgress.rarityCoverage}/4 rarity</span>
                        <span>{relicCodexProgress.originCoverage}/6 origin</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {relicCodexEntries.map(({ entry, discovered, count, sample }) => (
                      <article
                        key={entry.id}
                        className={`
                          border border-t-2 bg-black/40 p-3 transition-[border-color,background-color,opacity]
                          ${discovered ? 'border-white/10 opacity-100' : 'border-white/5 opacity-40'}
                          ${RELIC_CODEX_ACCENT_CLASS[entry.accent]}
                        `}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-black text-white">{entry.title}</p>
                            <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-white/30">
                              {formatRelicOrigin(entry.origin)} / {entry.rarity}
                            </p>
                          </div>
                          <span className="shrink-0 border border-current px-1.5 py-0.5 text-[8px] font-mono uppercase tracking-widest">
                            {discovered ? `${count}x` : 'locked'}
                          </span>
                        </div>
                        <p className="mt-3 line-clamp-3 text-[8px] font-mono leading-relaxed text-white/40">{entry.detail}</p>
                        <p className="mt-3 border-t border-white/5 pt-2 text-[8px] font-mono leading-relaxed text-white/30">
                          {discovered && sample ? sample.evidence : entry.condition}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {codexEntries.map(({ entry, discovered }) => (
                  <article
                    key={entry.kind}
                    className={`
                      border border-t-2 bg-black/40 p-4 transition-[border-color,background-color,opacity]
                      ${discovered ? 'border-white/10 opacity-100' : 'border-white/5 opacity-40'}
                      ${CODEX_ACCENT_CLASS[entry.accent]}
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-bold text-white/80">{entry.name}</p>
                        <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-white/30">{entry.domain}</p>
                      </div>
                      <span className={`shrink-0 text-[8px] font-mono uppercase tracking-widest ${
                        entry.rarity === 'legendary'
                          ? 'text-yellow-300'
                          : entry.rarity === 'rare'
                            ? 'text-neon-purple'
                            : entry.rarity === 'uncommon'
                              ? 'text-neon-blue'
                              : 'text-white/40'
                      }`}>
                        {discovered ? entry.rarity : 'locked'}
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">科学解释</p>
                        <p className="mt-1 text-[9px] font-mono leading-relaxed text-white/60">{entry.science}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">历史类比</p>
                        <p className="mt-1 text-[9px] font-mono leading-relaxed text-white/60">{entry.history}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-mono uppercase tracking-widest text-white/25">玩法意义</p>
                        <p className="mt-1 text-[9px] font-mono leading-relaxed text-white/60">{entry.gameplay}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 进化树视图 */}
        {activeTab === 'TREE' && (
          <div className="w-full h-full animate-in fade-in duration-500">
            <Suspense fallback={<ReviewTabFallback label="加载进化星图" />}>
              <PhylogeneticTree />
            </Suspense>
          </div>
        )}

        {/* 名人堂视图 */}
        {activeTab === 'FAME' && (
          <div className="w-full h-full animate-in fade-in duration-500">
            <Suspense fallback={<ReviewTabFallback label="加载万神殿" />}>
              <HallOfFame />
            </Suspense>
          </div>
        )}

      </div>

      {/* 底部操作栏 */}
      <div className="z-20 border-t border-white/5 bg-black/70 p-4 backdrop-blur-md sm:p-5">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={exportReviewSnapshot}
            className="interactive-focus flex min-h-11 flex-1 items-center justify-center gap-2 border border-white/10 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-white/60 transition-[border-color,color,background-color] hover:bg-white/5 hover:text-white"
          >
            <Download size={16} aria-hidden="true" />
            导出复盘快照
          </button>
          <button
            type="button"
            onClick={copyShareText}
            className="interactive-focus flex min-h-11 flex-1 items-center justify-center gap-2 border border-neon-blue/20 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neon-blue transition-[border-color,color,background-color] hover:bg-neon-blue/5"
          >
            <Copy size={16} aria-hidden="true" />
            复制战报
          </button>
          <button
            type="button"
            onClick={saveCurrentRun}
            className="interactive-focus flex min-h-11 flex-1 items-center justify-center gap-2 border border-neon-purple/30 px-3 py-3 font-mono text-[10px] uppercase tracking-[0.16em] text-neon-purple transition-[border-color,color,background-color] hover:bg-neon-purple/5"
          >
            <BookmarkPlus size={16} aria-hidden="true" />
            收藏本局
          </button>
          <button
            type="button"
            onClick={handleReset}
            disabled={isResetting}
            aria-busy={isResetting}
            className="interactive-focus flex min-h-11 flex-1 items-center justify-center gap-2 bg-white px-3 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-black transition-transform hover:scale-[1.01] active:scale-95 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCcw size={16} aria-hidden="true" />
            {isResetting ? '正在重置…' : '重新开启创世'}
          </button>
        </div>
        {actionStatus && (
          <p aria-live="polite" className="mt-4 text-center text-[9px] text-white/40 font-mono uppercase tracking-widest">
            {actionStatus}
          </p>
        )}
      </div>

    </div>
  );
};

export default PhoenixReview;
