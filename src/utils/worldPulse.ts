import type { EntityView, RunPhase, WorldEvent, WorldStats } from '../types/world';

export type PulseTone = 'calm' | 'growth' | 'warning' | 'danger' | 'ascend';

export interface WorldPulseMetric {
  label: string;
  value: string;
  ratio: number;
  tone: PulseTone;
}

export interface WorldPulseSnapshot {
  title: string;
  subtitle: string;
  pressure: string;
  pressureTone: PulseTone;
  dominantPattern: string;
  latestHistory: string;
  metrics: WorldPulseMetric[];
  signals: string[];
}

interface WorldPulseInput {
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  phase?: RunPhase;
}

const PHASE_TITLE: Record<RunPhase, string> = {
  GENESIS: '创世汤',
  BURST: '爆发窗口',
  DIVERGENCE: '谱系分岔',
  CRISIS: '危机纪',
  ASCENSION: '飞升前夜',
};

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function cooperationRatio(entities: EntityView[]) {
  if (entities.length === 0) return 0;
  return entities.filter((entity) => entity.ethics.altruism > 0.62 && entity.ethics.collaboration > 0.58).length / entities.length;
}

function predatorRatio(entities: EntityView[]) {
  if (entities.length === 0) return 0;
  return entities.filter((entity) => entity.score >= 65 && entity.ethics.altruism < 0.25).length / entities.length;
}

function apexScore(entities: EntityView[]) {
  if (entities.length === 0) return 0;
  return entities.reduce((best, entity) => Math.max(best, entity.score), 0);
}

function classifyPressure(args: {
  stats: WorldStats;
  avgEnergy: number;
  avgToxin: number;
  cooperation: number;
  predators: number;
  apex: number;
}) {
  if (args.stats.population <= 0) {
    return { pressure: '等待生命信号', tone: 'calm' as PulseTone, pattern: '空世界' };
  }

  if (args.avgToxin >= 0.62 || args.stats.entropy >= 78) {
    return { pressure: '毒素热寂压力', tone: 'danger' as PulseTone, pattern: '低效逻辑正在挤压种群' };
  }

  if (args.avgEnergy <= 20) {
    return { pressure: '能量荒', tone: 'danger' as PulseTone, pattern: '文明进入低燃料收缩态' };
  }

  if (args.predators >= 0.18) {
    return { pressure: '掠食竞争', tone: 'warning' as PulseTone, pattern: '高适应低利他实体正在形成捕食链' };
  }

  if (args.cooperation >= 0.35) {
    return { pressure: '互助网络', tone: 'growth' as PulseTone, pattern: '协作实体开始构成稳定节点' };
  }

  if (args.apex >= 85 && args.stats.avgGeneration >= 8) {
    return { pressure: '飞升候选', tone: 'ascend' as PulseTone, pattern: '高适应主干已具备文明跃迁信号' };
  }

  if (args.stats.population >= 30 && args.avgEnergy >= 55) {
    return { pressure: '扩张窗口', tone: 'growth' as PulseTone, pattern: '生态位仍有余量，种群正在铺开' };
  }

  return { pressure: '开放演化', tone: 'calm' as PulseTone, pattern: '没有单一力量完全支配当前世界' };
}

function getLatestHistory(events: WorldEvent[]) {
  const latest = [...events].reverse().find((event) => event.kind !== 'RUN_STARTED');
  if (!latest) return '等待首个可记录历史事件';
  return `${latest.title} / ${latest.detail}`;
}

export function deriveWorldPulse({ stats, entities, events, phase = 'GENESIS' }: WorldPulseInput): WorldPulseSnapshot {
  const avgEnergy = average(entities.map((entity) => entity.energy));
  const avgToxin = average(entities.map((entity) => entity.metabolic_toxin));
  const cooperation = cooperationRatio(entities);
  const predators = predatorRatio(entities);
  const apex = apexScore(entities);
  const pressure = classifyPressure({ stats, avgEnergy, avgToxin, cooperation, predators, apex });

  const metrics: WorldPulseMetric[] = [
    {
      label: '平均能量',
      value: `${avgEnergy.toFixed(1)}%`,
      ratio: clamp(avgEnergy / 100),
      tone: avgEnergy <= 20 ? 'danger' : avgEnergy >= 55 ? 'growth' : 'calm',
    },
    {
      label: '代谢毒素',
      value: `${(avgToxin * 100).toFixed(1)}%`,
      ratio: clamp(avgToxin),
      tone: avgToxin >= 0.62 ? 'danger' : avgToxin >= 0.42 ? 'warning' : 'calm',
    },
    {
      label: '协作密度',
      value: `${Math.round(cooperation * 100)}%`,
      ratio: clamp(cooperation),
      tone: cooperation >= 0.35 ? 'growth' : 'calm',
    },
    {
      label: '顶点适应',
      value: apex.toFixed(1),
      ratio: clamp(apex / 100),
      tone: apex >= 85 ? 'ascend' : apex >= 65 ? 'growth' : 'calm',
    },
  ];

  const signals = [
    `种群 ${Math.round(stats.population)} / 平均世代 ${stats.avgGeneration.toFixed(1)}`,
    `平均适应度 ${stats.avgScore.toFixed(1)} / 熵 ${stats.entropy.toFixed(1)}%`,
    predators > 0 ? `掠食信号 ${Math.round(predators * 100)}%` : '掠食信号低',
  ];

  return {
    title: PHASE_TITLE[phase],
    subtitle: entities.length === 0 ? '尚未捕获实体快照' : `${entities.length} 个实体正在被观测`,
    pressure: pressure.pressure,
    pressureTone: pressure.tone,
    dominantPattern: pressure.pattern,
    latestHistory: getLatestHistory(events),
    metrics,
    signals,
  };
}
