import type {
  MealMomentDeck,
  MealRunFlavorProfile,
  MealRunFlavorTag,
  MealRunScorecard,
  PlayerInterventionKind,
  RunAchievement,
  RunDiscoveryCue,
  RunRelic,
  RunSession,
  RunThemeProfile,
  WorldEvent,
  WorldEventKind,
  WorldStats,
} from '../types/world';
import { countActiveInterventions } from './interventionKinds';
import { formatRunLength, formatRunSpeed, formatRunTheme } from './runSession';

interface MealRunFlavorInput {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  interventionCounts: Record<PlayerInterventionKind, number>;
  themeProfile?: RunThemeProfile;
  mealRunScore?: MealRunScorecard;
  discoveries?: RunDiscoveryCue[];
  relics?: RunRelic[];
  achievements?: RunAchievement[];
  mealMoments?: MealMomentDeck;
}

const TONE_RANK: Record<WorldEvent['severity'], number> = {
  info: 1,
  good: 2,
  warning: 3,
  danger: 4,
};

const THEME_TAG_LABEL: Record<RunSession['theme'], string> = {
  Ascent: '崛起口',
  Symbiosis: '共生口',
  Catastrophe: '灾变口',
  Apex: '顶点口',
};

function hasEvent(events: WorldEvent[], kind: WorldEventKind) {
  return events.some((event) => event.kind === kind);
}

function totalInterventions(counts: Record<PlayerInterventionKind, number>) {
  return countActiveInterventions(counts);
}

function pushTag(tags: MealRunFlavorTag[], tag: MealRunFlavorTag) {
  if (tags.some((item) => item.id === tag.id)) return;
  tags.push(tag);
}

function tag(
  id: string,
  kind: MealRunFlavorTag['kind'],
  label: string,
  detail: string,
  tone: WorldEvent['severity'],
  evidence: string,
  score: number,
): MealRunFlavorTag {
  return { id, kind, label, detail, tone, evidence, score };
}

function statsEvidence(stats: WorldStats) {
  return `P=${stats.population}, S=${stats.avgScore.toFixed(2)}, G=${stats.avgGeneration.toFixed(1)}, E=${stats.entropy.toFixed(1)}%`;
}

function topTone(tags: MealRunFlavorTag[], fallback: WorldEvent['severity']) {
  return tags.reduce<WorldEvent['severity']>((tone, item) => (
    TONE_RANK[item.tone] > TONE_RANK[tone] ? item.tone : tone
  ), fallback);
}

function headlineFromTags(tags: MealRunFlavorTag[], fallback: string) {
  const labels = tags.slice(0, 3).map((item) => item.label);
  return labels.length > 0 ? labels.join(' / ') : fallback;
}

export function deriveMealRunFlavorProfile(input: MealRunFlavorInput): MealRunFlavorProfile {
  const events = input.events.filter((event) => event.kind !== 'RUN_STARTED');
  const interventions = totalInterventions(input.interventionCounts);
  const discoveries = input.discoveries ?? [];
  const relics = input.relics ?? [];
  const achievements = input.achievements ?? [];
  const tags: MealRunFlavorTag[] = [];

  pushTag(tags, tag(
    `theme-${input.session.theme}`,
    'THEME',
    THEME_TAG_LABEL[input.session.theme],
    input.themeProfile?.watchFocus ?? `本局主题为${formatRunTheme(input.session.theme)}，观察口味随主题倾向展开。`,
    input.themeProfile?.tone ?? 'info',
    input.themeProfile?.evidence ?? `theme=${input.session.theme}`,
    70 + Math.min(20, input.themeProfile?.metrics.matchingEventCount ?? 0),
  ));

  if (input.session.speed >= 8) {
    pushTag(tags, tag('fast-table', 'PACE', '快刷奇观', '高倍率适合吃饭前快速看世界是否爆出大事件。', 'warning', `speed=${formatRunSpeed(input.session.speed)}`, 76));
  } else if (input.session.length === 'LongTable') {
    pushTag(tags, tag('long-history', 'PACE', '长史慢炖', '长桌局给谱系、纪元和终局因果更长的发酵时间。', 'good', formatRunLength(input.session.length), 78));
  } else {
    pushTag(tags, tag('snackable', 'PACE', '顺手下饭', '局长和倍率适合开饭前直接点开观察一轮。', 'info', `${formatRunLength(input.session.length)} / ${formatRunSpeed(input.session.speed)}`, 68));
  }

  if (input.stats.population <= 2 || hasEvent(events, 'MASS_EXTINCTION')) {
    pushTag(tags, tag('extinction-drama', 'DRAMA', '灭绝重口', '终局接近断代或触发灭绝事件，戏剧张力很高。', 'danger', statsEvidence(input.stats), 96));
  } else if (input.stats.entropy >= 75 || hasEvent(events, 'TOXIN_CRISIS')) {
    pushTag(tags, tag('entropy-spice', 'DRAMA', '熵辣上头', '毒潮、高熵或突变压力让本局更像危机观察。', 'warning', statsEvidence(input.stats), 86));
  } else if (input.stats.avgScore >= 70 || hasEvent(events, 'GOLDEN_AGE')) {
    pushTag(tags, tag('golden-rise', 'DRAMA', '黄金鲜味', '适应度高位或黄金时代让本局更偏正反馈爽局。', 'good', statsEvidence(input.stats), 84));
  }

  if (interventions === 0) {
    pushTag(tags, tag('pure-observer', 'AGENCY', '无神原味', '玩家没有主动改史，复盘更能体现系统自发演化。', 'info', 'activeInterventions=0', 74));
  } else if (interventions >= 3) {
    pushTag(tags, tag('heavy-hand', 'AGENCY', '强手改史', '多次主动干预让本局更像玩家和文明共同写成的实验。', 'warning', `activeInterventions=${interventions}`, 82));
  } else {
    pushTag(tags, tag('light-touch', 'AGENCY', '轻手调味', '少量主动干预保留观察感，同时制造明确因果。', 'good', `activeInterventions=${interventions}`, 76));
  }

  if ((input.mealRunScore?.axes.find((axis) => axis.id === 'science')?.score ?? 0) >= 70 || discoveries.length >= 3) {
    pushTag(tags, tag('science-readable', 'SCIENCE', '科学好读', '事件解释、图鉴发现或科学轴评分足够支撑复盘阅读。', 'good', `discoveries=${discoveries.length}, science=${input.mealRunScore?.axes.find((axis) => axis.id === 'science')?.score ?? 'none'}`, 80));
  }

  if (relics.length + achievements.length + discoveries.length >= 5) {
    pushTag(tags, tag('collector-friendly', 'COLLECTION', '收藏友好', '遗物、徽章和图鉴发现足够多，适合进本地战报册。', 'good', `relics=${relics.length}, achievements=${achievements.length}, discoveries=${discoveries.length}`, 84));
  }

  if ((input.mealMoments?.cards.length ?? 0) >= 3) {
    pushTag(tags, tag('share-ready', 'OUTCOME', '可发饭桌', '名场面卡包已经形成三张可复制素材。', 'good', input.mealMoments?.evidence ?? 'moments=3', 82));
  }

  if (tags.length < 4) {
    pushTag(tags, tag('stable-finish', 'OUTCOME', '稳态清汤', '没有极端大起大落，但终局统计能形成基础复盘。', 'info', statsEvidence(input.stats), 58));
  }

  const sortedTags = tags.sort((a, b) => b.score - a.score).slice(0, 6);
  const tone = topTone(sortedTags, input.mealRunScore?.tone ?? 'info');
  const headline = headlineFromTags(sortedTags, `${formatRunTheme(input.session.theme)}下饭局`);
  const copyText = [
    `V-GENE 饭局口味：${headline}`,
    ...sortedTags.map((item) => `#${item.label}：${item.detail}`),
  ].join('\n');

  return {
    title: '饭局口味标签',
    headline,
    tone,
    tags: sortedTags,
    copyText,
    evidence: `events=${events.length}, activeInterventions=${interventions}, score=${input.mealRunScore?.score ?? 'none'}, ${statsEvidence(input.stats)}`,
  };
}

export function formatMealRunFlavorForShare(profile?: MealRunFlavorProfile | null) {
  if (!profile || profile.tags.length === 0) return '';
  return [
    `饭局口味：${profile.headline}`,
    ...profile.tags.slice(0, 5).map((tagItem) => `#${tagItem.label}`),
  ].join(' ');
}
