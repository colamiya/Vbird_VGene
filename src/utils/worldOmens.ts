import type { EntityView, PlayerInterventionKind, RunPhase, WorldEvent, WorldStats } from '../types/world';

export type WorldOmenTone = 'calm' | 'growth' | 'warning' | 'danger';

export interface WorldOmen {
  id: string;
  title: string;
  detail: string;
  tone: WorldOmenTone;
  confidence: number;
  evidence: string;
  suggestedIntervention?: PlayerInterventionKind;
}

interface WorldOmenInput {
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  phase?: RunPhase;
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratio(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, count / total));
}

function recentDanger(events: WorldEvent[]) {
  return events.slice(-8).filter((event) => event.severity === 'danger').length;
}

function pushOmen(list: WorldOmen[], omen: WorldOmen | null) {
  if (!omen) return;
  if (list.some((item) => item.id === omen.id)) return;
  list.push(omen);
}

function clampConfidence(value: number) {
  return Math.max(0.35, Math.min(0.95, value));
}

export function deriveWorldOmens({ stats, entities, events, phase = 'GENESIS' }: WorldOmenInput) {
  const omens: WorldOmen[] = [];
  const avgEnergy = average(entities.map((entity) => entity.energy));
  const avgToxin = average(entities.map((entity) => entity.metabolic_toxin));
  const highToxinRatio = ratio(entities.filter((entity) => entity.metabolic_toxin >= 0.55).length, entities.length);
  const lowEnergyRatio = ratio(entities.filter((entity) => entity.energy <= 24).length, entities.length);
  const predatorRatio = ratio(entities.filter((entity) => entity.score >= 65 && entity.ethics.altruism < 0.28).length, entities.length);
  const cooperatorRatio = ratio(entities.filter((entity) => entity.ethics.collaboration >= 0.62 && entity.ethics.altruism >= 0.38).length, entities.length);
  const topScore = entities.reduce((max, entity) => Math.max(max, entity.score), 0);
  const dangerCount = recentDanger(events);

  pushOmen(omens, avgToxin >= 0.48 || highToxinRatio >= 0.25 || stats.entropy >= 76 ? {
    id: 'toxin-front',
    title: '毒潮前线',
    detail: '代谢副产物正在积累，下一阶段更容易触发毒素危机或种群坍缩。',
    tone: avgToxin >= 0.62 || stats.entropy >= 82 ? 'danger' : 'warning',
    confidence: clampConfidence(Math.max(avgToxin, highToxinRatio, stats.entropy / 100)),
    evidence: `毒素均值 ${(avgToxin * 100).toFixed(1)}% / 高毒实体 ${Math.round(highToxinRatio * 100)}% / 熵 ${stats.entropy.toFixed(1)}%`,
    suggestedIntervention: 'QUARANTINE',
  } : null);

  pushOmen(omens, avgEnergy <= 32 || lowEnergyRatio >= 0.35 ? {
    id: 'energy-famine',
    title: '能量饥荒',
    detail: '低能量实体比例升高，种群会更依赖少数高适应个体维持火种。',
    tone: avgEnergy <= 20 || lowEnergyRatio >= 0.55 ? 'danger' : 'warning',
    confidence: clampConfidence(Math.max(1 - avgEnergy / 65, lowEnergyRatio)),
    evidence: `能量均值 ${avgEnergy.toFixed(1)}% / 低能实体 ${Math.round(lowEnergyRatio * 100)}%`,
    suggestedIntervention: 'BLESS',
  } : null);

  pushOmen(omens, predatorRatio >= 0.12 ? {
    id: 'predator-rise',
    title: '掠食抬头',
    detail: '高适应低利他实体正在扩大，后续可能形成捕食链或暴君主角。',
    tone: predatorRatio >= 0.24 ? 'danger' : 'warning',
    confidence: clampConfidence(0.45 + predatorRatio * 1.8),
    evidence: `掠食候选 ${Math.round(predatorRatio * 100)}% / 顶点适应 ${topScore.toFixed(1)}`,
    suggestedIntervention: 'EXILE',
  } : null);

  pushOmen(omens, cooperatorRatio >= 0.18 && avgEnergy >= 35 ? {
    id: 'cooperation-window',
    title: '共生窗口',
    detail: '协作实体和能量窗口同时存在，适合观察互助网络是否能跨过危机。',
    tone: cooperatorRatio >= 0.34 ? 'growth' : 'calm',
    confidence: clampConfidence(0.4 + cooperatorRatio + avgEnergy / 180),
    evidence: `协作候选 ${Math.round(cooperatorRatio * 100)}% / 能量均值 ${avgEnergy.toFixed(1)}%`,
    suggestedIntervention: 'PIN_OBSERVE',
  } : null);

  pushOmen(omens, topScore >= 74 && stats.avgGeneration >= 4 ? {
    id: 'apex-signal',
    title: '顶点信号',
    detail: '优势逻辑体已经接近主角阈值，继续观察可能诞生顶点或英灵。',
    tone: topScore >= 88 ? 'growth' : 'calm',
    confidence: clampConfidence(topScore / 100),
    evidence: `最高适应 ${topScore.toFixed(1)} / 平均世代 ${stats.avgGeneration.toFixed(1)}`,
    suggestedIntervention: 'PIN_OBSERVE',
  } : null);

  pushOmen(omens, dangerCount >= 2 || (phase === 'CRISIS' && stats.population <= 6) ? {
    id: 'collapse-chain',
    title: '连锁崩塌',
    detail: '近期危险事件密集，世界可能进入连续坍缩；轻量干预比大规模改写更稳。',
    tone: 'danger',
    confidence: clampConfidence(0.55 + dangerCount * 0.12),
    evidence: `近 8 事件危险数 ${dangerCount} / 当前种群 ${stats.population}`,
    suggestedIntervention: 'QUARANTINE',
  } : null);

  if (omens.length === 0) {
    pushOmen(omens, {
      id: 'open-sky',
      title: '开放天窗',
      detail: '当前没有单一危机主导世界，适合纯观察或等待第一个可命名主角。',
      tone: 'calm',
      confidence: 0.42,
      evidence: `P=${stats.population} / S=${stats.avgScore.toFixed(1)} / E=${stats.entropy.toFixed(1)}%`,
      suggestedIntervention: 'PIN_OBSERVE',
    });
  }

  return omens
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}
