import type {
  AppConfig,
  MealRunLength,
  MealRunPrediction,
  MealRunPredictionKind,
  MealRunPredictionResult,
  MealRunTheme,
  PlayerInterventionKind,
  RunAchievement,
  RunDiscoveryCue,
  RunObjective,
  RunRelic,
  RunSpeed,
  RunStartForecast,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { countActiveInterventions, countPinnedObservations } from './interventionKinds';
import { naturalWorldEvents } from './worldEvents';

interface PredictionInput {
  config: AppConfig;
  runLength: MealRunLength;
  runSpeed: RunSpeed;
  runTheme: MealRunTheme;
  forecast: RunStartForecast;
}

interface PredictionResultInput {
  prediction?: MealRunPrediction;
  stats: WorldStats;
  events: WorldEvent[];
  interventionCounts: Record<PlayerInterventionKind, number>;
  objectives?: RunObjective[];
  discoveries?: RunDiscoveryCue[];
  relics?: RunRelic[];
  achievements?: RunAchievement[];
}

const KIND_LABELS: Record<MealRunPredictionKind, string> = {
  SURVIVAL: '存续',
  EVENT_DENSITY: '历史',
  THEME_SIGNAL: '主题',
  HUMAN_TOUCH: '手痕',
  COLLECTION: '收藏',
};

const LENGTH_LABELS: Record<MealRunLength, string> = {
  Snack: '下饭短局 8-12 分钟',
  Dinner: '正餐局 15-20 分钟',
  LongTable: '长桌局 30+ 分钟',
};

const THEME_LABELS: Record<MealRunTheme, string> = {
  Random: '随机剧本',
  Ascent: '文明崛起',
  Symbiosis: '共生网络',
  Catastrophe: '灾变压力',
  Apex: '顶点谱系',
};

const INTERVENTION_LABELS: Record<PlayerInterventionKind, string> = {
  BLESS: '祝福',
  POISON: '投毒',
  QUARANTINE: '隔离',
  EXILE: '放逐',
  PIN_OBSERVE: '钉选观察',
};

function totalInterventions(counts: Record<PlayerInterventionKind, number>) {
  return countActiveInterventions(counts);
}

function realEvents(events: WorldEvent[]) {
  return naturalWorldEvents(events);
}

function hasEvent(events: WorldEvent[], kinds: WorldEvent['kind'][]) {
  return events.some((event) => kinds.includes(event.kind));
}

function statsLine(stats: WorldStats) {
  return `P=${stats.population}, S=${stats.avgScore.toFixed(2)}, G=${stats.avgGeneration.toFixed(1)}, E=${stats.entropy.toFixed(1)}%`;
}

function prediction(
  id: string,
  kind: MealRunPredictionKind,
  title: string,
  detail: string,
  target: string,
  tone: WorldEvent['severity'],
  suggestedIntervention: PlayerInterventionKind,
  evidence: string,
): MealRunPrediction {
  return {
    id,
    kind,
    title,
    detail,
    target,
    tone,
    suggestedIntervention,
    evidence,
  };
}

function themePrediction(input: PredictionInput): MealRunPrediction {
  if (input.runTheme === 'Symbiosis') {
    return prediction(
      'theme-symbiosis',
      'THEME_SIGNAL',
      '共生会成团',
      '押本局会出现协作簇、看护者或互助型事件。',
      '触发协作事件，或至少完成一个共生相关观测目标。',
      'good',
      'BLESS',
      `${THEME_LABELS[input.runTheme]} / ${input.forecast.evidence}`,
    );
  }

  if (input.runTheme === 'Catastrophe') {
    return prediction(
      'theme-catastrophe',
      'THEME_SIGNAL',
      '灾变会改史',
      '押本局会出现毒潮、饥荒、灭绝边缘或瓶颈幸存叙事。',
      '触发危机事件，或终局进入高熵/低种群压力。',
      'warning',
      'QUARANTINE',
      `${THEME_LABELS[input.runTheme]} / ${input.forecast.evidence}`,
    );
  }

  if (input.runTheme === 'Apex') {
    return prediction(
      'theme-apex',
      'THEME_SIGNAL',
      '顶点会出名',
      '押本局会出现高分个体、谱系开创者或万神殿候选。',
      '触发顶点、开创者、英灵或终局平均适应度 70+。',
      'good',
      'PIN_OBSERVE',
      `${THEME_LABELS[input.runTheme]} / ${input.forecast.evidence}`,
    );
  }

  return prediction(
    input.runTheme === 'Ascent' ? 'theme-ascent' : 'theme-random',
    'THEME_SIGNAL',
    input.runTheme === 'Ascent' ? '文明会抬头' : '随机会给戏',
    input.runTheme === 'Ascent'
      ? '押本局会出现资源潮、黄金时代或稳定扩张。'
      : '押随机剧本也会自然压出一条清晰主线。',
    input.runTheme === 'Ascent'
      ? '触发资源潮/黄金时代，或终局平均适应度 65+。'
      : '至少 6 条真实事件，且下饭指数进入可追局。',
    'info',
    input.forecast.suggestedIntervention,
    `${THEME_LABELS[input.runTheme]} / ${input.forecast.evidence}`,
  );
}

export function deriveMealRunPredictions(input: PredictionInput): MealRunPrediction[] {
  const eventTarget = input.runSpeed >= 4 ? 8 : input.runLength === 'Snack' ? 5 : 7;
  const survivalTarget = input.forecast.pressure === 'critical' ? 8 : input.runLength === 'LongTable' ? 18 : 12;
  const collectionTarget = input.runLength === 'Snack' ? 2 : 3;
  return [
    prediction(
      'survival-line',
      'SURVIVAL',
      '火种能活下来',
      '押终局还能保住可继续演化的种群，而不是只剩孤岛样本。',
      `终局种群达到 ${survivalTarget}+。`,
      input.forecast.pressure === 'critical' ? 'warning' : 'good',
      input.forecast.pressure === 'critical' ? 'QUARANTINE' : 'PIN_OBSERVE',
      `${LENGTH_LABELS[input.runLength]} / ${input.runSpeed}x / pressure=${input.forecast.pressure}`,
    ),
    prediction(
      'event-density',
      'EVENT_DENSITY',
      '这局有历史密度',
      '押吃饭时不会只是看粒子流，而是会连续出现足够多真实事件。',
      `本局真实事件达到 ${eventTarget}+。`,
      input.runSpeed >= 4 ? 'warning' : 'info',
      input.forecast.suggestedIntervention,
      `target=${eventTarget}, ${input.forecast.evidence}`,
    ),
    themePrediction(input),
    prediction(
      'human-touch',
      'HUMAN_TOUCH',
      '我会留下一手',
      '押本局会有一次清晰的人类选择压力，但不会被强手改史淹没。',
      '主动干预 1-3 次；钉选观察只算观察证据。',
      'info',
      input.forecast.suggestedIntervention,
      `suggested=${INTERVENTION_LABELS[input.forecast.suggestedIntervention]}, ${input.forecast.evidence}`,
    ),
    prediction(
      'collection-proof',
      'COLLECTION',
      '能出收藏物',
      '押本局能沉淀图鉴、遗物或徽章，而不是只有终局四项数值。',
      `图鉴/遗物/徽章合计 ${collectionTarget}+。`,
      'good',
      'PIN_OBSERVE',
      `target=${collectionTarget}, theme=${THEME_LABELS[input.runTheme]}`,
    ),
  ].slice(0, 5);
}

function evaluateThemePrediction(predictionItem: MealRunPrediction, input: PredictionResultInput) {
  const events = realEvents(input.events);
  if (predictionItem.id === 'theme-symbiosis') {
    return hasEvent(events, ['COOPERATION_CLUSTER']) || (input.objectives ?? []).some((item) => item.status === 'complete' && /共生|协作|看护/.test(item.title));
  }
  if (predictionItem.id === 'theme-catastrophe') {
    return hasEvent(events, ['TOXIN_CRISIS', 'ENERGY_FAMINE', 'MASS_EXTINCTION']) || input.stats.entropy >= 75 || input.stats.population <= 2;
  }
  if (predictionItem.id === 'theme-apex') {
    return hasEvent(events, ['FIRST_APEX', 'LINEAGE_FOUNDER', 'HALL_OF_FAME']) || input.stats.avgScore >= 70;
  }
  if (predictionItem.id === 'theme-ascent') {
    return hasEvent(events, ['RESOURCE_BLOOM', 'GOLDEN_AGE']) || input.stats.avgScore >= 65;
  }
  return events.length >= 6 && input.stats.population > 2;
}

export function evaluateMealRunPrediction(input: PredictionResultInput): MealRunPredictionResult | undefined {
  const predictionItem = input.prediction;
  if (!predictionItem) return undefined;
  const events = realEvents(input.events);
  const interventionTotal = totalInterventions(input.interventionCounts);
  const pinnedObservations = countPinnedObservations(input.interventionCounts);
  const collectionTotal = (input.discoveries?.length ?? 0) + (input.relics?.length ?? 0) + (input.achievements?.length ?? 0);
  let completed = false;
  let score = 0;

  if (predictionItem.kind === 'SURVIVAL') {
    const target = Number(predictionItem.target.match(/\d+/)?.[0] ?? 12);
    completed = input.stats.population >= target;
    score = Math.min(100, (input.stats.population / target) * 100);
  } else if (predictionItem.kind === 'EVENT_DENSITY') {
    const target = Number(predictionItem.target.match(/\d+/)?.[0] ?? 6);
    completed = events.length >= target;
    score = Math.min(100, (events.length / target) * 100);
  } else if (predictionItem.kind === 'THEME_SIGNAL') {
    completed = evaluateThemePrediction(predictionItem, input);
    score = completed ? 100 : Math.min(80, events.length * 12 + input.stats.avgScore * 0.4);
  } else if (predictionItem.kind === 'HUMAN_TOUCH') {
    completed = interventionTotal >= 1 && interventionTotal <= 3;
    score = interventionTotal === 0 ? 0 : interventionTotal <= 3 ? 100 : Math.max(35, 100 - (interventionTotal - 3) * 18);
  } else {
    const target = Number(predictionItem.target.match(/\d+/)?.[0] ?? 2);
    completed = collectionTotal >= target;
    score = Math.min(100, (collectionTotal / target) * 100);
  }

  const roundedScore = Math.round(score);
  const title = completed ? `押题命中：${predictionItem.title}` : `押题落空：${predictionItem.title}`;
  const detail = completed
    ? `本局真实结果满足餐前押题，${KIND_LABELS[predictionItem.kind]}目标成立。`
    : `本局未满足餐前押题，下一局可继续追这个目标。`;
  const evidence = [
    predictionItem.evidence,
    `events=${events.length}`,
    `activeInterventions=${interventionTotal}`,
    `pinned=${pinnedObservations}`,
    `collections=${collectionTotal}`,
    statsLine(input.stats),
  ].join(' / ');

  const result: MealRunPredictionResult = {
    prediction: predictionItem,
    completed,
    score: roundedScore,
    title,
    detail,
    tone: completed ? 'good' : predictionItem.tone,
    evidence,
    copyText: [
      `V-GENE 餐前押题：${title}`,
      `目标：${predictionItem.target}`,
      `结果：${detail}`,
      `证据：${evidence}`,
    ].join('\n'),
  };

  return result;
}

export function formatMealRunPredictionForShare(result?: MealRunPredictionResult | null) {
  if (!result) return '';
  return [
    `餐前押题：${result.completed ? '命中' : '落空'} / ${result.prediction.title} / ${result.score}%`,
    `目标：${result.prediction.target}`,
    `证据：${result.evidence}`,
  ].join('\n');
}
