import type {
  EntityView,
  InterventionBudget,
  MealRhythmCue,
  PlayerInterventionKind,
  RunHighlight,
  RunSession,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { formatBudgetValue, getInterventionCost, refreshInterventionBudget } from './interventionBudget';

const RHYTHM_LIMIT = 18;
const DEDUPE_WINDOW_MS = 45_000;
const RECENT_EVENT_WINDOW_MS = 120_000;
const STALE_HIGHLIGHT_MS = 75_000;

const PHASE_LABEL: Record<MealRhythmCue['phase'], string> = {
  GENESIS: '创世',
  BURST: '爆发',
  DIVERGENCE: '分化',
  CRISIS: '危机',
  ASCENSION: '飞升',
};

const INTERVENTION_LABEL: Record<PlayerInterventionKind, string> = {
  BLESS: '祝福',
  POISON: '投毒',
  QUARANTINE: '隔离',
  EXILE: '放逐',
  PIN_OBSERVE: '钉选观察',
};

function formatElapsed(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function latestMeaningfulEvent(events: WorldEvent[]) {
  return [...events].reverse().find((event) => event.kind !== 'RUN_STARTED' && event.kind !== 'RUN_ENDED') ?? null;
}

function createMetrics(stats: WorldStats, highlights: RunHighlight[], recentEvents: WorldEvent[]) {
  return {
    population: stats.population,
    avgScore: stats.avgScore,
    avgGeneration: stats.avgGeneration,
    entropy: stats.entropy,
    highlightCount: highlights.length,
    recentEventCount: recentEvents.length,
  };
}

function chooseIntervention(stats: WorldStats, latestEvent: WorldEvent | null, entities: EntityView[]): PlayerInterventionKind {
  const highToxinCount = entities.filter((entity) => entity.metabolic_toxin >= 0.55).length;
  const lowEnergyCount = entities.filter((entity) => entity.energy <= 18).length;
  const predatorCandidate = entities.some((entity) => entity.score >= 75 && entity.ethics.altruism < 0.25);

  if (latestEvent?.kind === 'PREDATOR_RAID' || predatorCandidate) return 'EXILE';
  if (latestEvent?.kind === 'TOXIN_CRISIS' || highToxinCount >= Math.max(2, entities.length * 0.18)) return 'QUARANTINE';
  if (latestEvent?.kind === 'ENERGY_FAMINE' || lowEnergyCount >= Math.max(2, entities.length * 0.25)) return 'BLESS';
  if (stats.entropy >= 84) return 'QUARANTINE';
  if (latestEvent?.severity === 'good') return 'PIN_OBSERVE';
  return 'PIN_OBSERVE';
}

function canAffordIntervention(
  kind: PlayerInterventionKind,
  budget: InterventionBudget | null | undefined,
  session: RunSession,
  now: number,
) {
  if (!budget) return { allowed: false, current: 0, cost: getInterventionCost(kind) };
  const refreshed = refreshInterventionBudget(budget, session, now);
  const cost = getInterventionCost(kind);
  return { allowed: refreshed.current >= cost, current: refreshed.current, cost };
}

export function deriveMealRhythmCue(args: {
  session: RunSession | null;
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  budget?: InterventionBudget | null;
  highlights?: RunHighlight[];
  now?: number;
}): MealRhythmCue | null {
  const { session } = args;
  if (!session) return null;

  const now = args.now ?? Date.now();
  const highlights = args.highlights ?? [];
  const latestEvent = latestMeaningfulEvent(args.events);
  const recentEvents = args.events.filter((event) =>
    event.kind !== 'RUN_STARTED' &&
    event.kind !== 'RUN_ENDED' &&
    now - event.timestamp <= RECENT_EVENT_WINDOW_MS,
  );
  const lastHighlightAt = highlights.length > 0 ? highlights[highlights.length - 1].timestamp : 0;
  const metrics = createMetrics(args.stats, highlights, recentEvents);
  const baseId = `${session.id}-rhythm-${session.phase}-${Math.floor((now - session.startedAt) / 30_000)}`;

  if (args.entities.length === 0 || args.stats.population <= 0) {
    return {
      id: `${baseId}-hold-empty`,
      timestamp: now,
      phase: session.phase,
      action: 'HOLD',
      title: '等第一口数据',
      detail: '世界快照还没有实体，先不要干预，等真实种群出现后再判断节奏。',
      prompt: '继续观察',
      tone: 'info',
      confidence: 0.72,
      evidence: `P=${args.stats.population} / 近期事件 ${recentEvents.length}`,
      metrics,
    };
  }

  const dangerous =
    latestEvent?.severity === 'danger' ||
    args.stats.entropy >= 82 ||
    (args.stats.population <= 3 && now - session.startedAt > 90_000);
  const warning = latestEvent?.severity === 'warning' || args.stats.entropy >= 72;

  if (dangerous || warning) {
    const suggestedIntervention = chooseIntervention(args.stats, latestEvent, args.entities);
    const budgetCheck = canAffordIntervention(suggestedIntervention, args.budget, session, now);

    if (budgetCheck.allowed) {
      return {
        id: `${baseId}-intervene-${suggestedIntervention}`,
        timestamp: now,
        phase: session.phase,
        action: 'INTERVENE',
        title: dangerous ? '这一口适合出手' : '轻干预窗口',
        detail: dangerous
          ? '世界进入高压段，适合用一次低频神谕改变局部选择压力。'
          : '压力正在抬升，可以小幅修正局势，避免危机变成终局。',
        prompt: `切到${INTERVENTION_LABEL[suggestedIntervention]}`,
        tone: dangerous ? 'danger' : 'warning',
        confidence: dangerous ? 0.88 : 0.76,
        evidence: `${latestEvent?.title ?? `熵 ${args.stats.entropy.toFixed(1)}%`} / 充能 ${formatBudgetValue(budgetCheck.current)}>=${formatBudgetValue(budgetCheck.cost)}`,
        suggestedIntervention,
        metrics,
      };
    }

    return {
      id: `${baseId}-hold-budget`,
      timestamp: now,
      phase: session.phase,
      action: 'HOLD',
      title: '忍住这一手',
      detail: '世界有压力，但当前神谕充能不足，继续观察比强行乱点更有复盘价值。',
      prompt: '等充能恢复',
      tone: 'warning',
      confidence: 0.74,
      evidence: `${INTERVENTION_LABEL[suggestedIntervention]} 需要 ${formatBudgetValue(budgetCheck.cost)} / 当前 ${formatBudgetValue(budgetCheck.current)}`,
      suggestedIntervention,
      metrics,
    };
  }

  const goodMoment =
    latestEvent?.severity === 'good' ||
    args.stats.avgScore >= 68 ||
    (args.stats.avgGeneration >= 6 && args.stats.entropy < 70);

  if (goodMoment && now - lastHighlightAt > STALE_HIGHLIGHT_MS) {
    return {
      id: `${baseId}-mark`,
      timestamp: now,
      phase: session.phase,
      action: 'MARK',
      title: '值得夹一筷子的高光',
      detail: '当前世界出现可记忆的稳定/跃迁片段，适合标记为复盘里的精彩瞬间。',
      prompt: '标记精彩瞬间',
      tone: 'good',
      confidence: latestEvent?.severity === 'good' ? 0.84 : 0.7,
      evidence: latestEvent?.title ?? `S=${args.stats.avgScore.toFixed(1)} / G=${args.stats.avgGeneration.toFixed(1)}`,
      metrics,
    };
  }

  const quietOpening = session.phase === 'GENESIS' || (session.phase === 'BURST' && recentEvents.length <= 1);
  return {
    id: `${baseId}-watch`,
    timestamp: now,
    phase: session.phase,
    action: 'WATCH',
    title: quietOpening ? '先看种群铺开' : '继续下饭观察',
    detail: quietOpening
      ? '开局信息还在积累，最有价值的是观察第一批谱系如何分散和聚集。'
      : '当前没有必须打断的危机，保持观察能让自发演化留下更干净的历史链。',
    prompt: quietOpening ? '看第一批实体' : '继续观察',
    tone: 'info',
    confidence: quietOpening ? 0.78 : 0.68,
    evidence: latestEvent ? `${latestEvent.title} / ${PHASE_LABEL[session.phase]}期` : `${PHASE_LABEL[session.phase]}期 / 近期事件 ${recentEvents.length}`,
    metrics,
  };
}

export function appendMealRhythmCue(current: MealRhythmCue[], next: MealRhythmCue | null) {
  if (!next) return current;
  const previous = current[current.length - 1];
  if (
    previous &&
    previous.action === next.action &&
    previous.title === next.title &&
    previous.suggestedIntervention === next.suggestedIntervention &&
    next.timestamp - previous.timestamp < DEDUPE_WINDOW_MS
  ) {
    return current;
  }

  return [...current, next]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-RHYTHM_LIMIT);
}

export function formatMealRhythmForShare(cues: MealRhythmCue[], startedAt: number) {
  if (cues.length === 0) return '';
  const lines = cues.slice(-3).map((cue) => {
    const intervention = cue.suggestedIntervention ? ` / ${INTERVENTION_LABEL[cue.suggestedIntervention]}` : '';
    return `- T+${formatElapsed(cue.timestamp - startedAt)} ${cue.title}${intervention}`;
  });
  return ['下饭节奏：', ...lines].join('\n');
}
