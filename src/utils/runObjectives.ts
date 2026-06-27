import type { EntityView, InterventionTrace, RunObjective, RunPhase, RunSession, WorldEvent, WorldEventKind, WorldStats } from '../types/world';
import { isActiveInterventionKind } from './interventionKinds';
import { naturalWorldEvents } from './worldEvents';

interface ObjectiveInput {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  entities: EntityView[];
  interventionTraces?: InterventionTrace[];
  now?: number;
}

const PHASE_RANK: Record<RunPhase, number> = {
  GENESIS: 0,
  BURST: 1,
  DIVERGENCE: 2,
  CRISIS: 3,
  ASCENSION: 4,
};

function countEvents(events: WorldEvent[]) {
  return naturalWorldEvents(events).length;
}

function hasEvent(events: WorldEvent[], kind: WorldEventKind) {
  return events.some((event) => event.kind === kind);
}

function countEventsBySeverity(events: WorldEvent[], severity: WorldEvent['severity']) {
  return naturalWorldEvents(events).filter((event) => event.severity === severity).length;
}

function countPlayerInterventions(events: WorldEvent[]) {
  return events.filter((event) => {
    const interventionKind = event.intervention?.kind;
    if (!interventionKind) return false;
    return isActiveInterventionKind(interventionKind) && (event.intervention?.affected ?? 0) > 0;
  }).length;
}

function traceHasOutcomeSignal(trace: InterventionTrace) {
  return trace.metrics.rescued > 0 ||
    trace.metrics.harmed > 0 ||
    trace.metrics.lost > 0 ||
    trace.metrics.generationGain > 0 ||
    Math.abs(trace.metrics.energyDelta) >= 8 ||
    Math.abs(trace.metrics.scoreDelta) >= 5 ||
    Math.abs(trace.metrics.toxinDelta) >= 0.1;
}

function countSettledPlayerTraces(traces: InterventionTrace[] = []) {
  return traces.filter((trace) =>
    isActiveInterventionKind(trace.kind) &&
    trace.metrics.affected > 0 &&
    trace.metrics.elapsedMs >= 20_000 &&
    traceHasOutcomeSignal(trace),
  ).length;
}

function countSettledInterventionKind(traces: InterventionTrace[] = [], kind: InterventionTrace['kind']) {
  return settledInterventionTraces(traces, kind).length;
}

function settledInterventionTraces(traces: InterventionTrace[] = [], kind: InterventionTrace['kind']) {
  return traces.filter((trace) =>
    trace.kind === kind &&
    trace.metrics.affected > 0 &&
    trace.metrics.elapsedMs >= 20_000 &&
    traceHasOutcomeSignal(trace),
  );
}

function countPostTracePositiveSignals(events: WorldEvent[], traces: InterventionTrace[] = [], kind: InterventionTrace['kind']) {
  const settledTraces = settledInterventionTraces(traces, kind);
  if (settledTraces.length === 0) return 0;

  const positiveKinds = new Set<WorldEventKind>(['COOPERATION_CLUSTER', 'RESOURCE_BLOOM', 'GOLDEN_AGE']);
  return naturalWorldEvents(events).filter((event) =>
    positiveKinds.has(event.kind) &&
    settledTraces.some((trace) =>
      event.timestamp >= trace.startedAt &&
      event.timestamp <= trace.startedAt + 120_000,
    ),
  ).length;
}

function countInterventionKind(events: WorldEvent[], kind: WorldEventKind) {
  return events.filter((event) => event.kind === kind && (event.intervention?.affected ?? 0) > 0).length;
}

function maxScore(entities: EntityView[]) {
  return entities.reduce((max, entity) => Math.max(max, entity.score), 0);
}

function cooperativeEntities(entities: EntityView[]) {
  return entities.filter((entity) => entity.ethics.collaboration >= 0.62 && entity.ethics.altruism >= 0.38).length;
}

function highEnergyEntities(entities: EntityView[]) {
  return entities.filter((entity) => entity.energy >= 55).length;
}

function challengeObjective(input: ObjectiveInput, metrics: {
  eventCount: number;
  playerInterventions: number;
  settledPlayerTraces: number;
  dangerCount: number;
  topScore: number;
  cooperators: number;
  phaseRank: number;
}): RunObjective | null {
  const challenge = input.session.loadedChallenge;
  if (!challenge) return null;

  const prefix = `挑战：${challenge.title}`;
  const evidencePrefix = challenge.evidence ? `${challenge.evidence} / ` : '';
  const commonDetail = challenge.objective;
  const elapsedMs = Math.max(0, (input.now ?? Date.now()) - input.session.startedAt);
  const runProgress = input.session.targetDurationMs > 0 ? Math.min(1, elapsedMs / input.session.targetDurationMs) : 0;
  const terminalWindow = runProgress >= 0.82 || metrics.phaseRank >= PHASE_RANK.ASCENSION;
  const establishedWorldWindow = runProgress >= 0.28 || metrics.phaseRank >= PHASE_RANK.DIVERGENCE;

  if (challenge.id === 'rescue-lineage') {
    return objective(
      'loaded-challenge',
      prefix,
      commonDetail,
      input.stats.population,
      12,
      input.stats.population <= 3 ? 'danger' : 'warning',
      terminalWindow
        ? `${evidencePrefix}终局窗口 P=${input.stats.population}`
        : `${evidencePrefix}当前 P=${input.stats.population}，需进入终局窗口结算`,
      input.stats.population <= 2 && metrics.phaseRank >= PHASE_RANK.BURST,
      terminalWindow,
    );
  }

  if (challenge.id === 'low-entropy-order') {
    const orderScore = Math.max(0, 100 - input.stats.entropy);
    return objective(
      'loaded-challenge',
      prefix,
      commonDetail,
      orderScore,
      35,
      input.stats.entropy > 75 ? 'warning' : 'info',
      terminalWindow
        ? `${evidencePrefix}终局熵压 ${input.stats.entropy.toFixed(1)}%`
        : `${evidencePrefix}当前熵压 ${input.stats.entropy.toFixed(1)}%，需进入终局窗口结算`,
      false,
      terminalWindow,
    );
  }

  if (challenge.id === 'repeat-golden-age') {
    const hasGoldenAge = hasEvent(input.events, 'GOLDEN_AGE');
    return objective(
      'loaded-challenge',
      prefix,
      commonDetail,
      hasGoldenAge ? input.stats.avgScore : Math.min(input.stats.avgScore, 69),
      70,
      hasGoldenAge ? 'good' : 'info',
      terminalWindow
        ? `${evidencePrefix}黄金时代 ${hasGoldenAge ? '已触发' : '未触发'} / 终局均分 ${input.stats.avgScore.toFixed(1)}`
        : `${evidencePrefix}黄金时代 ${hasGoldenAge ? '已触发' : '未触发'} / 当前均分 ${input.stats.avgScore.toFixed(1)}，需进入终局窗口结算`,
      false,
      terminalWindow,
    );
  }

  if (challenge.id === 'protect-cooperation') {
    const hasCooperation = hasEvent(input.events, 'COOPERATION_CLUSTER');
    const cooperationSignals = (hasCooperation ? 1 : 0) + (metrics.cooperators >= 2 ? 1 : 0);
    return objective(
      'loaded-challenge',
      prefix,
      commonDetail,
      cooperationSignals,
      2,
      'good',
      establishedWorldWindow
        ? `${evidencePrefix}协作事件 ${hasCooperation ? '已触发' : '未触发'} / 协作候选 ${metrics.cooperators}，已进入稳定观察窗`
        : `${evidencePrefix}协作事件 ${hasCooperation ? '已触发' : '未触发'} / 协作候选 ${metrics.cooperators}，需进入稳定观察窗`,
      false,
      establishedWorldWindow,
    );
  }

  if (challenge.id === 'exile-tyrant') {
    const predatorSeen = hasEvent(input.events, 'PREDATOR_RAID');
    const exiles = countInterventionKind(input.events, 'PLAYER_EXILE');
    const settledExiles = countSettledInterventionKind(input.interventionTraces, 'EXILE');
    const postExilePositiveSignals = countPostTracePositiveSignals(input.events, input.interventionTraces, 'EXILE');
    return objective(
      'loaded-challenge',
      prefix,
      commonDetail,
      predatorSeen && settledExiles > 0 && postExilePositiveSignals > 0 ? 1 : 0,
      1,
      predatorSeen ? 'warning' : 'info',
      settledExiles > 0 && postExilePositiveSignals > 0
        ? `${evidencePrefix}掠食 ${predatorSeen ? '已出现' : '未出现'} / 放逐后果 ${settledExiles} / 后续正向生态信号 ${postExilePositiveSignals}`
        : settledExiles > 0
          ? `${evidencePrefix}掠食 ${predatorSeen ? '已出现' : '未出现'} / 放逐后果 ${settledExiles}，等待协作或资源回升信号`
        : exiles > 0
          ? `${evidencePrefix}掠食 ${predatorSeen ? '已出现' : '未出现'} / 放逐 ${exiles}，等待 20-90 秒后果信号`
          : `${evidencePrefix}掠食 ${predatorSeen ? '已出现' : '未出现'} / 尚未命中放逐`,
    );
  }

  if (challenge.id === 'pure-observer') {
    return objective(
      'loaded-challenge',
      prefix,
      commonDetail,
      metrics.eventCount,
      5,
      metrics.playerInterventions > 0 ? 'warning' : 'info',
      `${evidencePrefix}事件 ${metrics.eventCount}/5 / 干预 ${metrics.playerInterventions}`,
      metrics.playerInterventions > 0,
    );
  }

  if (challenge.id === 'first-intervention') {
    return objective(
      'loaded-challenge',
      prefix,
      commonDetail,
      metrics.settledPlayerTraces,
      1,
      'info',
      metrics.settledPlayerTraces > 0
        ? `${evidencePrefix}已结算主动手痕 ${metrics.settledPlayerTraces}`
        : metrics.playerInterventions > 0
          ? `${evidencePrefix}有效干预 ${metrics.playerInterventions}，等待 20-90 秒后果信号`
          : `${evidencePrefix}尚未命中主动干预`,
    );
  }

  if (challenge.id === 'slow-archaeology') {
    return objective(
      'loaded-challenge',
      prefix,
      commonDetail,
      metrics.phaseRank,
      PHASE_RANK.BURST,
      'info',
      `${evidencePrefix}当前阶段 ${input.session.phase}`,
    );
  }

  if (challenge.id === 'longer-history') {
    return objective(
      'loaded-challenge',
      prefix,
      commonDetail,
      Math.min(3, metrics.eventCount),
      3,
      'info',
      `${evidencePrefix}真实事件 ${metrics.eventCount}`,
    );
  }

  if (challenge.id === 'archive-worthy') {
    const apexSignal = hasEvent(input.events, 'FIRST_APEX') || metrics.topScore >= 70;
    const progress = (apexSignal ? 1 : 0) + Math.min(1, metrics.eventCount / 3) + Math.min(1, metrics.dangerCount + metrics.cooperators);
    return objective(
      'loaded-challenge',
      prefix,
      commonDetail,
      progress,
      3,
      'good',
      `${evidencePrefix}顶点 ${apexSignal ? '已出现' : '未出现'} / 事件 ${metrics.eventCount} / 协作 ${metrics.cooperators}`,
    );
  }

  return objective(
    'loaded-challenge',
    prefix,
    commonDetail,
    metrics.eventCount,
    3,
    challenge.tone,
    `${evidencePrefix}真实事件 ${metrics.eventCount}`,
  );
}

function ratio(current: number, target: number) {
  if (target <= 0) return 1;
  return Math.max(0, Math.min(1, current / target));
}

function objective(
  id: string,
  title: string,
  detail: string,
  current: number,
  target: number,
  tone: RunObjective['tone'],
  evidence: string,
  failed = false,
  canComplete = true,
): RunObjective {
  const progress = ratio(current, target);
  const complete = progress >= 1 && canComplete;
  return {
    id,
    title,
    detail,
    status: failed ? 'failed' : complete ? 'complete' : 'active',
    tone: failed ? 'danger' : complete ? 'good' : tone,
    current,
    target,
    progress,
    evidence,
  };
}

export function deriveRunObjectives(input: ObjectiveInput) {
  const eventCount = countEvents(input.events);
  const playerInterventions = countPlayerInterventions(input.events);
  const settledPlayerTraces = countSettledPlayerTraces(input.interventionTraces);
  const dangerCount = countEventsBySeverity(input.events, 'danger');
  const topScore = maxScore(input.entities);
  const cooperators = cooperativeEntities(input.entities);
  const highEnergy = highEnergyEntities(input.entities);
  const basePopulationTarget = input.session.length === 'Snack' ? 8 : input.session.length === 'Dinner' ? 12 : 18;
  const stablePopulationTarget = input.session.theme === 'Ascent'
    ? basePopulationTarget + 4
    : input.session.theme === 'Catastrophe'
      ? Math.max(5, basePopulationTarget - 3)
      : basePopulationTarget;
  const eventTarget = input.session.theme === 'Ascent' ? 6 : input.session.theme === 'Catastrophe' ? 4 : 5;
  const apexTarget = input.session.theme === 'Apex' ? 68 : 72;
  const cooperationTarget = input.session.theme === 'Symbiosis' ? 2 : 3;
  const elapsedMs = Math.max(0, (input.now ?? Date.now()) - input.session.startedAt);
  const runProgress = input.session.targetDurationMs > 0 ? Math.min(1, elapsedMs / input.session.targetDurationMs) : 0;
  const phaseRank = PHASE_RANK[input.session.phase];
  const terminalWindow = runProgress >= 0.82 || phaseRank >= PHASE_RANK.ASCENSION;
  const establishedWorldWindow = runProgress >= 0.28 || phaseRank >= PHASE_RANK.DIVERGENCE;
  const apexReached = hasEvent(input.events, 'FIRST_APEX') || topScore >= apexTarget;
  const cooperationReached = hasEvent(input.events, 'COOPERATION_CLUSTER') || cooperators >= cooperationTarget;
  const crisisSafePopulation = input.session.theme === 'Catastrophe' ? 4 : 2;

  const loadedChallengeObjective = challengeObjective(input, {
    eventCount,
    playerInterventions,
    settledPlayerTraces,
    dangerCount,
    topScore,
    cooperators,
    phaseRank,
  });

  const objectives = [
    objective(
      'history-log',
      '史官开卷',
      input.session.theme === 'Ascent'
        ? '记录繁荣、扩张和阶段推进，让崛起剧本有足够证据。'
        : '记录足够历史事件，让本局复盘不是空白统计。',
      eventCount,
      eventTarget,
      'info',
      `${eventCount} 条真实事件`,
    ),
    objective(
      'protect-embers',
      '火种保全',
      input.session.theme === 'Catastrophe'
        ? '灾变主题允许压力更大，但仍要留下可复盘的幸存火种。'
        : '维持可观测种群，避免下饭局过早熄灭。',
      input.stats.population,
      stablePopulationTarget,
      input.stats.population <= 2 && phaseRank >= PHASE_RANK.BURST ? 'danger' : 'warning',
      terminalWindow
        ? `终局窗口 P>=${stablePopulationTarget}，当前 P=${input.stats.population}，高能样本 ${highEnergy}`
        : `终局目标 P>=${stablePopulationTarget}，当前 P=${input.stats.population}，高能样本 ${highEnergy}，需进入终局窗口结算`,
      input.stats.population <= 2 && phaseRank >= PHASE_RANK.BURST,
      terminalWindow,
    ),
    objective(
      'player-touch',
      '留下手痕',
      '至少执行一次祝福、投毒、隔离或放逐，并等到后续事件或实体状态出现可追踪信号。',
      settledPlayerTraces,
      1,
      'info',
      settledPlayerTraces > 0
        ? `${settledPlayerTraces} 条主动手痕已有后续信号`
        : playerInterventions > 0
          ? `${playerInterventions} 次主动干预已命中，等待 20-90 秒后续信号`
          : '等待玩家选择祝福、投毒、隔离或放逐；钉选只算观察',
    ),
    objective(
      'find-apex',
      '寻找顶点',
      input.session.theme === 'Apex'
        ? '本局主线锁定高适应个体和谱系开创者，优先寻找可记住的主角。'
        : '等待高适应个体出现，形成可讲述的优势谱系。',
      apexReached ? 1 : topScore,
      apexReached ? 1 : apexTarget,
      'good',
      hasEvent(input.events, 'FIRST_APEX') ? 'FIRST_APEX 已触发' : `最高适应度 ${topScore.toFixed(1)}`,
      false,
      hasEvent(input.events, 'FIRST_APEX') || establishedWorldWindow,
    ),
    objective(
      'cooperation-watch',
      '共生观测',
      input.session.theme === 'Symbiosis'
        ? '本局主线锁定协作、利他和看护者，验证互助结构能否延续。'
        : '寻找协作和利他结构，验证文明不是只靠掠夺延续。',
      cooperationReached ? 1 : cooperators,
      cooperationReached ? 1 : cooperationTarget,
      'good',
      hasEvent(input.events, 'COOPERATION_CLUSTER') ? 'COOPERATION_CLUSTER 已触发' : `${cooperators} 个协作候选`,
      false,
      hasEvent(input.events, 'COOPERATION_CLUSTER') || establishedWorldWindow,
    ),
    objective(
      'crisis-crossing',
      '穿越危机',
      input.session.theme === 'Catastrophe'
        ? '主动观察毒素、饥荒或灭绝压力，并确认瓶颈后仍有幸存样本。'
        : '在毒素、饥荒或灭绝压力中保留足够样本。',
      dangerCount > 0 && input.stats.population > crisisSafePopulation ? 1 : 0,
      1,
      dangerCount > 0 ? 'warning' : 'info',
      dangerCount > 0 ? `${dangerCount} 个危险事件，当前 P=${input.stats.population}` : `已观察 ${Math.floor(elapsedMs / 1000)} 秒，暂无危险事件`,
      dangerCount > 0 && input.stats.population <= crisisSafePopulation,
    ),
  ];

  const themePriority: Record<RunSession['theme'], string[]> = {
    Ascent: ['protect-embers', 'player-touch', 'history-log'],
    Symbiosis: ['cooperation-watch', 'player-touch', 'protect-embers'],
    Catastrophe: ['crisis-crossing', 'player-touch', 'protect-embers'],
    Apex: ['find-apex', 'player-touch', 'history-log'],
  };
  const suppressPlayerTouch = input.session.loadedChallenge?.id === 'pure-observer';
  const priority = themePriority[input.session.theme] ?? themePriority.Ascent;
  const themeObjectives = priority
    .filter((id) => !(suppressPlayerTouch && id === 'player-touch'))
    .map((id) => objectives.find((item) => item.id === id))
    .filter((item): item is RunObjective => Boolean(item))
    .slice(0, loadedChallengeObjective ? 2 : 3);

  return loadedChallengeObjective
    ? [loadedChallengeObjective, ...themeObjectives]
    : themeObjectives;
}

export function formatObjectivesForShare(objectives: RunObjective[]) {
  if (objectives.length === 0) return '';
  const completeCount = objectives.filter((objectiveItem) => objectiveItem.status === 'complete').length;
  return [
    `本局目标：${completeCount}/${objectives.length}`,
    ...objectives.slice(0, 4).map((objectiveItem) =>
      `- ${objectiveItem.title} [${objectiveItem.status}] ${objectiveItem.evidence}`,
    ),
  ].join('\n');
}
