import type {
  EntityView,
  MealRunTheme,
  PlayerInterventionKind,
  RunSession,
  RunThemeProfile,
  WorldEvent,
  WorldStats,
} from '../types/world';

type ResolvedTheme = Exclude<MealRunTheme, 'Random'>;

interface RunThemeStaticProfile {
  theme: MealRunTheme;
  label: string;
  shortLabel: string;
  watchFocus: string;
  scienceFrame: string;
  historicalFrame: string;
  suggestedIntervention: PlayerInterventionKind;
}

interface ThemeProfileInput {
  session: Pick<RunSession, 'theme' | 'phase' | 'startedAt' | 'targetDurationMs'>;
  stats: WorldStats;
  entities?: EntityView[];
  events?: WorldEvent[];
  now?: number;
}

const STATIC_THEME_PROFILES: Record<ResolvedTheme, Omit<RunThemeStaticProfile, 'theme'>> = {
  Ascent: {
    label: '文明崛起',
    shortLabel: '崛起',
    watchFocus: '人口扩张、资源潮、黄金时代和平均适应度抬升。',
    scienceFrame: '关注正反馈：能量供给、适应度跃迁和种群承载量是否同步增长。',
    historicalFrame: '类似农耕定居到城邦扩张的窗口，重点看资源余量如何变成组织优势。',
    suggestedIntervention: 'BLESS',
  },
  Symbiosis: {
    label: '共生网络',
    shortLabel: '共生',
    watchFocus: '协作密度、利他实体、看护者和互助簇是否形成。',
    scienceFrame: '关注互惠选择：高协作个体能否降低毒素和掠食压力。',
    historicalFrame: '类似互助行会、盟约和贸易网络，重点看信任结构能否扛住压力。',
    suggestedIntervention: 'BLESS',
  },
  Catastrophe: {
    label: '灾变压力',
    shortLabel: '灾变',
    watchFocus: '毒潮、饥荒、熵压、灭绝边缘和瓶颈幸存者。',
    scienceFrame: '关注选择瓶颈：压力不是装饰，而是决定哪些基因型能留下。',
    historicalFrame: '类似气候骤变、瘟疫和资源崩盘，重点看幸存结构如何重组。',
    suggestedIntervention: 'QUARANTINE',
  },
  Apex: {
    label: '顶点谱系',
    shortLabel: '顶点',
    watchFocus: '最高适应个体、谱系开创者、掠食压力源和主角轨迹。',
    scienceFrame: '关注极值选择：单个高适应实体是否能稳定影响全局均值。',
    historicalFrame: '类似关键人物、技术门派或军事强权的崛起，重点看主干谱系能否延续。',
    suggestedIntervention: 'PIN_OBSERVE',
  },
};

const RANDOM_THEME_PROFILE: RunThemeStaticProfile = {
  theme: 'Random',
  label: '随机剧本',
  shortLabel: '随机',
  watchFocus: '开局后抽取一个真实主题，再按局内数据改变观察重点。',
  scienceFrame: '保持观察偏置不可预期，但事件仍必须来自真实仿真数据。',
  historicalFrame: '像打开一卷未知史书，先让世界自己暴露主线。',
  suggestedIntervention: 'PIN_OBSERVE',
};

const THEME_EVENT_KINDS: Record<ResolvedTheme, Array<WorldEvent['kind']>> = {
  Ascent: ['RESOURCE_BLOOM', 'GOLDEN_AGE', 'GENERATION_LEAP', 'LINEAGE_FOUNDER'],
  Symbiosis: ['COOPERATION_CLUSTER', 'PLAYER_BLESSING', 'PLAYER_QUARANTINE'],
  Catastrophe: ['MASS_EXTINCTION', 'TOXIN_CRISIS', 'ENERGY_FAMINE', 'PREDATOR_RAID', 'PLAYER_EXILE'],
  Apex: ['FIRST_APEX', 'LINEAGE_FOUNDER', 'PREDATOR_RAID', 'PINNED_OBSERVATION', 'HALL_OF_FAME'],
};

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function countMatchingEvents(events: WorldEvent[], theme: ResolvedTheme) {
  const kinds = new Set(THEME_EVENT_KINDS[theme]);
  return events.filter((event) => kinds.has(event.kind)).length;
}

function selectTopEntity(entities: EntityView[]) {
  return entities.reduce<EntityView | null>((best, entity) => {
    if (!best || entity.score > best.score) return entity;
    return best;
  }, null);
}

function countCooperators(entities: EntityView[]) {
  return entities.filter((entity) => entity.ethics.collaboration >= 0.62 && entity.ethics.altruism >= 0.38).length;
}

function countStressedEntities(entities: EntityView[]) {
  return entities.filter((entity) => entity.metabolic_toxin >= 0.55 || entity.energy <= 18).length;
}

function formatCoreEvidence(stats: WorldStats, metrics: RunThemeProfile['metrics']) {
  return `P=${stats.population} / S=${stats.avgScore.toFixed(1)} / G=${stats.avgGeneration.toFixed(1)} / E=${stats.entropy.toFixed(1)}% / 匹配事件 ${metrics.matchingEventCount}`;
}

export function getRunThemeStaticProfile(theme: MealRunTheme = 'Random'): RunThemeStaticProfile {
  if (theme === 'Random') return RANDOM_THEME_PROFILE;
  return {
    theme,
    ...STATIC_THEME_PROFILES[theme],
  };
}

export function deriveRunThemeProfile({
  session,
  stats,
  entities = [],
  events = [],
  now = Date.now(),
}: ThemeProfileInput): RunThemeProfile {
  const theme = session.theme;
  const staticProfile = STATIC_THEME_PROFILES[theme];
  const recentWindowMs = Math.max(45_000, session.targetDurationMs * 0.16);
  const recentEvents = events.filter((event) => event.timestamp >= Math.max(session.startedAt, now - recentWindowMs));
  const topEntity = selectTopEntity(entities);
  const avgEnergy = average(entities.map((entity) => entity.energy));
  const avgToxin = average(entities.map((entity) => entity.metabolic_toxin));
  const cooperators = countCooperators(entities);
  const stressedEntities = countStressedEntities(entities);
  const metrics: RunThemeProfile['metrics'] = {
    population: stats.population,
    avgScore: stats.avgScore,
    avgGeneration: stats.avgGeneration,
    entropy: stats.entropy,
    topScore: topEntity?.score ?? 0,
    topEntityId: topEntity?.id,
    cooperators,
    stressedEntities,
    recentEventCount: recentEvents.length,
    matchingEventCount: countMatchingEvents(recentEvents, theme),
  };

  if (theme === 'Ascent') {
    const isBlooming = stats.population >= 35 || stats.avgScore >= 62 || metrics.matchingEventCount >= 2;
    const isFragile = stats.population <= 3 || stats.entropy >= 78 || avgEnergy <= 18;
    return {
      theme,
      label: staticProfile.label,
      shortLabel: staticProfile.shortLabel,
      headline: isFragile ? '扩张窗口受阻' : isBlooming ? '崛起信号增强' : '等待资源正反馈',
      detail: isFragile
        ? '种群或能量已经逼近瓶颈，崛起主题需要先保住可繁殖基数。'
        : isBlooming
          ? '人口、适应度或资源事件正在形成正反馈，可以继续观察扩张是否转为稳定秩序。'
          : '世界还没有形成稳定扩张，先看资源潮和代际跃迁是否出现。',
      watchFocus: staticProfile.watchFocus,
      scienceFrame: staticProfile.scienceFrame,
      historicalFrame: staticProfile.historicalFrame,
      evidence: `${formatCoreEvidence(stats, metrics)} / 平均能量 ${avgEnergy.toFixed(1)}`,
      tone: isFragile ? 'warning' : isBlooming ? 'good' : 'info',
      suggestedIntervention: avgEnergy <= 24 ? 'BLESS' : 'PIN_OBSERVE',
      metrics,
    };
  }

  if (theme === 'Symbiosis') {
    const cooperatorRatio = entities.length > 0 ? cooperators / entities.length : 0;
    const hasNetwork = cooperatorRatio >= 0.24 || metrics.matchingEventCount >= 1;
    const isThreatened = stressedEntities >= Math.max(2, entities.length * 0.24) || avgToxin >= 0.55;
    return {
      theme,
      label: staticProfile.label,
      shortLabel: staticProfile.shortLabel,
      headline: isThreatened ? '共生网络承压' : hasNetwork ? '互助簇正在成形' : '协作信号稀薄',
      detail: isThreatened
        ? '协作个体可能被毒素、低能量或掠食链打散，适合先隔离压力源。'
        : hasNetwork
          ? '协作与利他个体已经形成可观察结构，继续看它能否稳定扩散。'
          : '当前还缺少足够协作密度，优先观察高协作实体是否聚集。',
      watchFocus: staticProfile.watchFocus,
      scienceFrame: staticProfile.scienceFrame,
      historicalFrame: staticProfile.historicalFrame,
      evidence: `${formatCoreEvidence(stats, metrics)} / 协作实体 ${cooperators}/${entities.length}`,
      tone: isThreatened ? 'warning' : hasNetwork ? 'good' : 'info',
      suggestedIntervention: isThreatened ? 'QUARANTINE' : 'BLESS',
      metrics,
    };
  }

  if (theme === 'Catastrophe') {
    const crisisCount = metrics.matchingEventCount;
    const isCritical = stats.population <= 3 || stats.entropy >= 82 || avgToxin >= 0.62;
    const isPressurized = crisisCount >= 1 || stressedEntities >= Math.max(2, entities.length * 0.28);
    return {
      theme,
      label: staticProfile.label,
      shortLabel: staticProfile.shortLabel,
      headline: isCritical ? '灾变进入红线' : isPressurized ? '瓶颈压力成形' : '灾变尚未落地',
      detail: isCritical
        ? '种群、毒素或熵压已经触及灾变阈值，本局重点转向谁能留下。'
        : isPressurized
          ? '世界出现可观察的选择压力，适合追踪幸存者和压力源的互动。'
          : '当前压力还不够集中，先等待毒潮、饥荒或掠食事件触发。',
      watchFocus: staticProfile.watchFocus,
      scienceFrame: staticProfile.scienceFrame,
      historicalFrame: staticProfile.historicalFrame,
      evidence: `${formatCoreEvidence(stats, metrics)} / 高压实体 ${stressedEntities}/${entities.length} / 毒素 ${(avgToxin * 100).toFixed(1)}%`,
      tone: isCritical ? 'danger' : isPressurized ? 'warning' : 'info',
      suggestedIntervention: isCritical ? 'QUARANTINE' : 'PIN_OBSERVE',
      metrics,
    };
  }

  const apexScore = topEntity?.score ?? 0;
  const isApex = apexScore >= 72 || metrics.matchingEventCount >= 1;
  const isPredatory = Boolean(topEntity && topEntity.score >= 65 && topEntity.ethics.altruism < 0.25);
  return {
    theme,
    label: staticProfile.label,
    shortLabel: staticProfile.shortLabel,
    headline: isApex ? '顶点主角出现' : '等待顶点个体',
    detail: isApex
      ? `#${topEntity?.id ?? 'NA'} 已成为最强候选，继续观察它是开创谱系还是制造掠食压力。`
      : '当前还没有足够突出的主角，先看高分实体是否能拉开均值。',
    watchFocus: staticProfile.watchFocus,
    scienceFrame: staticProfile.scienceFrame,
    historicalFrame: staticProfile.historicalFrame,
    evidence: `${formatCoreEvidence(stats, metrics)} / 顶点 #${topEntity?.id ?? 'NA'} S=${apexScore.toFixed(1)}`,
    tone: isPredatory ? 'warning' : isApex ? 'good' : 'info',
    suggestedIntervention: 'PIN_OBSERVE',
    metrics,
  };
}

export function formatThemeProfileForShare(profile?: RunThemeProfile | null) {
  if (!profile) return '';
  return [
    `主题画像：${profile.label} / ${profile.headline}`,
    `- ${profile.detail}`,
    `- ${profile.evidence}`,
  ].join('\n');
}
