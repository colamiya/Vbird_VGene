import type { EntityView, PinnedSpecimen, RunSession, WorldEvent, WorldStats } from '../types/world';
import { formatRunPhase } from './runSession';

export type DirectorCueTone = 'calm' | 'growth' | 'warning' | 'danger' | 'ascend';

export interface DirectorCue {
  id: string;
  title: string;
  directive: string;
  cameraHint: string;
  targetLabel: string;
  evidence: string;
  tempo: string;
  tone: DirectorCueTone;
  confidence: number;
  entityId?: number;
  updatedAt: number;
}

interface DirectorCueInput {
  session: RunSession | null;
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  pinnedSpecimen?: PinnedSpecimen | null;
  now: number;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function ratio(count: number, total: number) {
  if (total <= 0) return 0;
  return clamp(count / total);
}

function getApexEntity(entities: EntityView[]) {
  return entities.reduce<EntityView | null>((best, entity) => {
    if (!best || entity.score > best.score) return entity;
    return best;
  }, null);
}

function getPredatorEntity(entities: EntityView[]) {
  return entities.reduce<EntityView | null>((best, entity) => {
    const isPredator = entity.score >= 62 && entity.ethics.altruism < 0.28;
    if (!isPredator) return best;
    if (!best || entity.score > best.score) return entity;
    return best;
  }, null);
}

function getCaretakerEntity(entities: EntityView[]) {
  return entities.reduce<EntityView | null>((best, entity) => {
    const careScore = entity.ethics.altruism + entity.ethics.collaboration + entity.energy / 100;
    const bestScore = best ? best.ethics.altruism + best.ethics.collaboration + best.energy / 100 : 0;
    if (careScore < 1.55) return best;
    return careScore > bestScore ? entity : best;
  }, null);
}

function findEntity(entities: EntityView[], entityId?: number) {
  if (typeof entityId !== 'number') return null;
  return entities.find((entity) => entity.id === entityId) ?? null;
}

function latestMeaningfulEvent(events: WorldEvent[]) {
  return [...events].reverse().find((event) => event.kind !== 'RUN_STARTED') ?? null;
}

function recentSevereEvent(events: WorldEvent[], now: number) {
  return [...events].reverse().find((event) => {
    if (event.kind === 'RUN_STARTED') return false;
    if (now - event.timestamp > 45_000) return false;
    return event.severity === 'danger' || event.severity === 'warning';
  }) ?? null;
}

function cueFromEvent(event: WorldEvent, entities: EntityView[], now: number): DirectorCue {
  const target = findEntity(entities, event.entityId);
  const ageMs = Math.max(0, now - event.timestamp);
  const isDanger = event.severity === 'danger';
  return {
    id: `event-${event.kind}`,
    title: isDanger ? '切到灾变现场' : '切到压力现场',
    directive: event.title,
    cameraHint: target
      ? `把镜头压到 #${target.id} 周边，观察能量 ${target.energy.toFixed(1)} 与毒素 ${(target.metabolic_toxin * 100).toFixed(1)}%。`
      : '把镜头拉到种群密集区，观察是否出现二次坍缩或反弹。',
    targetLabel: target ? `实体 #${target.id}` : '全域种群',
    evidence: `${event.detail} / ${Math.round(ageMs / 1000)} 秒前`,
    tempo: isDanger ? '紧急切镜' : '短镜头',
    tone: isDanger ? 'danger' : 'warning',
    confidence: isDanger ? 0.92 : 0.82,
    entityId: target?.id,
    updatedAt: event.timestamp,
  };
}

export function deriveDirectorCue({
  session,
  stats,
  entities,
  events,
  pinnedSpecimen = null,
  now,
}: DirectorCueInput): DirectorCue | null {
  if (!session) return null;

  const latestEvent = latestMeaningfulEvent(events);
  const avgEnergy = average(entities.map((entity) => entity.energy));
  const avgToxin = average(entities.map((entity) => entity.metabolic_toxin));
  const predatorShare = ratio(
    entities.filter((entity) => entity.score >= 62 && entity.ethics.altruism < 0.28).length,
    entities.length,
  );
  const cooperatorShare = ratio(
    entities.filter((entity) => entity.ethics.collaboration >= 0.62 && entity.ethics.altruism >= 0.4).length,
    entities.length,
  );

  const severeEvent = recentSevereEvent(events, now);
  if (severeEvent) {
    return cueFromEvent(severeEvent, entities, now);
  }

  if (pinnedSpecimen) {
    const tracked = findEntity(entities, pinnedSpecimen.entityId);
    if (tracked) {
      return {
        id: 'pinned-specimen-tracking',
        title: `跟拍样本 #${tracked.id}`,
        directive: '钉选样本仍在场，适合观察个体命运如何影响文明叙事。',
        cameraHint: `保持中近景，记录它的适应度 ${tracked.score.toFixed(1)}、世代 ${tracked.generation} 和能量 ${tracked.energy.toFixed(1)}。`,
        targetLabel: `实体 #${tracked.id}`,
        evidence: `钉选于${formatRunPhase(pinnedSpecimen.originPhase)}期，快照 ${pinnedSpecimen.snapshots.length} 条`,
        tempo: '长镜头',
        tone: tracked.score >= 80 ? 'ascend' : tracked.metabolic_toxin >= 0.55 ? 'warning' : 'calm',
        confidence: tracked.score >= 80 ? 0.84 : 0.72,
        entityId: tracked.id,
        updatedAt: pinnedSpecimen.lastSeenAt,
      };
    }

    return {
      id: 'pinned-specimen-lost',
      title: `样本 #${pinnedSpecimen.entityId} 失联`,
      directive: '钉选样本已经从当前快照消失，适合观察其空位是否被新谱系继承。',
      cameraHint: '拉远到全域视角，寻找高世代或高适应度替代者。',
      targetLabel: '样本空位',
      evidence: `最后出现于 ${new Date(pinnedSpecimen.lastSeenAt).toLocaleTimeString('zh-CN', { hour12: false })}`,
      tempo: '追踪转场',
      tone: 'warning',
      confidence: 0.76,
      updatedAt: pinnedSpecimen.lastSeenAt,
    };
  }

  if (entities.length === 0 || stats.population <= 0) {
    return {
      id: 'waiting-for-life',
      title: '等待生命信号',
      directive: '世界还没有可观测实体，先保持全域视角，等待第一批生命刷新。',
      cameraHint: '不要触发干预；等出现实体后再切到顶点或集群。',
      targetLabel: '空世界',
      evidence: `P=${stats.population} / S=${stats.avgScore.toFixed(1)} / H=${stats.entropy.toFixed(1)}%`,
      tempo: '静观',
      tone: 'calm',
      confidence: 0.6,
      updatedAt: now,
    };
  }

  if (session.phase === 'CRISIS' || stats.population <= 6 || avgEnergy <= 18) {
    return {
      id: 'collapse-edge',
      title: '坍缩边缘',
      directive: '文明进入窄门，当前看点是少数幸存者能否撑过低能量窗口。',
      cameraHint: '切到高能量实体附近，观察是否形成火种或继续断崖下跌。',
      targetLabel: '幸存者带',
      evidence: `阶段 ${formatRunPhase(session.phase)} / 种群 ${stats.population} / 能量均值 ${avgEnergy.toFixed(1)}%`,
      tempo: '紧盯',
      tone: 'danger',
      confidence: clamp(0.6 + (20 - avgEnergy) / 40 + (8 - stats.population) / 20, 0.65, 0.93),
      updatedAt: latestEvent?.timestamp ?? now,
    };
  }

  if (avgToxin >= 0.5 || stats.entropy >= 76) {
    return {
      id: 'toxin-weather',
      title: '毒素天气',
      directive: '低效逻辑正在提高环境噪声，接下来容易出现毒素危机。',
      cameraHint: '拉到中景，看高毒实体是否被隔离、放逐或自然淘汰。',
      targetLabel: '高毒实体带',
      evidence: `毒素均值 ${(avgToxin * 100).toFixed(1)}% / 熵 ${stats.entropy.toFixed(1)}%`,
      tempo: '警戒镜头',
      tone: avgToxin >= 0.64 ? 'danger' : 'warning',
      confidence: clamp(Math.max(avgToxin, stats.entropy / 100), 0.58, 0.9),
      updatedAt: latestEvent?.timestamp ?? now,
    };
  }

  const predator = getPredatorEntity(entities);
  if (predator && predatorShare >= 0.08) {
    return {
      id: `predator-${predator.id}`,
      title: `追踪掠食者 #${predator.id}`,
      directive: '高适应低利他个体开始支配局部生态，可能成为暴君主角。',
      cameraHint: `跟随 #${predator.id}，观察它是否压制周边协作个体。`,
      targetLabel: `实体 #${predator.id}`,
      evidence: `适应度 ${predator.score.toFixed(1)} / 利他 ${predator.ethics.altruism.toFixed(2)} / 掠食占比 ${Math.round(predatorShare * 100)}%`,
      tempo: '追拍',
      tone: 'warning',
      confidence: clamp(0.55 + predatorShare + predator.score / 260, 0.62, 0.88),
      entityId: predator.id,
      updatedAt: latestEvent?.timestamp ?? now,
    };
  }

  const caretaker = getCaretakerEntity(entities);
  if (caretaker && cooperatorShare >= 0.18) {
    return {
      id: `cooperator-${caretaker.id}`,
      title: `看共生带 #${caretaker.id}`,
      directive: '协作网络正在成形，当前看点是互助是否能跨过下一轮压力。',
      cameraHint: `围绕 #${caretaker.id} 观察周边集群，优先记录协作与能量变化。`,
      targetLabel: `实体 #${caretaker.id}`,
      evidence: `协作占比 ${Math.round(cooperatorShare * 100)}% / 协作 ${caretaker.ethics.collaboration.toFixed(2)} / 能量 ${caretaker.energy.toFixed(1)}`,
      tempo: '长镜头',
      tone: 'growth',
      confidence: clamp(0.52 + cooperatorShare + caretaker.ethics.collaboration / 4, 0.6, 0.86),
      entityId: caretaker.id,
      updatedAt: latestEvent?.timestamp ?? now,
    };
  }

  const apex = getApexEntity(entities);
  if (apex && apex.score >= Math.max(70, stats.avgScore * 1.35)) {
    return {
      id: `apex-${apex.id}`,
      title: `锁定顶点 #${apex.id}`,
      directive: '优势逻辑体已经从背景噪声中浮出，可能成为本局主角。',
      cameraHint: `切到 #${apex.id}，观察它的适应度 ${apex.score.toFixed(1)} 是否继续拉开差距。`,
      targetLabel: `实体 #${apex.id}`,
      evidence: `最高适应 ${apex.score.toFixed(1)} / 均值 ${stats.avgScore.toFixed(1)} / 世代 ${apex.generation}`,
      tempo: apex.score >= 88 ? '飞升镜头' : '中景跟随',
      tone: apex.score >= 88 ? 'ascend' : 'growth',
      confidence: clamp(apex.score / 110, 0.64, 0.92),
      entityId: apex.id,
      updatedAt: latestEvent?.timestamp ?? now,
    };
  }

  return {
    id: 'open-evolution',
    title: '开放演化段',
    directive: '当前没有单一冲突主导世界，适合看整体扩张、等待第一个历史转折。',
    cameraHint: '保持广角，看种群密度、能量和世代是否同步上升。',
    targetLabel: '全域生态',
    evidence: `P=${stats.population} / S=${stats.avgScore.toFixed(1)} / G=${stats.avgGeneration.toFixed(1)} / H=${stats.entropy.toFixed(1)}%`,
    tempo: '静观',
    tone: 'calm',
    confidence: 0.55,
    updatedAt: latestEvent?.timestamp ?? now,
  };
}
