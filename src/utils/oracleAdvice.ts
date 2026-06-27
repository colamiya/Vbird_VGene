import type {
  EntityView,
  InterventionBudget,
  PlayerInterventionKind,
  RunPhase,
  RunSession,
  WorldEvent,
  WorldStats,
} from '../types/world';
import { checkInterventionBudget, formatBudgetValue, getInterventionCost, refreshInterventionBudget } from './interventionBudget';
import { formatIntervention } from './runSession';
import { deriveWorldOmens, type WorldOmen } from './worldOmens';

export interface OracleAdvice {
  kind: PlayerInterventionKind;
  title: string;
  detail: string;
  evidence: string;
  urgency: 'low' | 'medium' | 'high';
  confidence: number;
  canAfford: boolean;
  cost: number;
  remaining: number;
  sourceOmen: WorldOmen;
}

interface OracleAdviceInput {
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  session: RunSession | null;
  budget: InterventionBudget | null;
  phase?: RunPhase;
  now?: number;
}

const URGENCY_TITLE: Record<OracleAdvice['urgency'], string> = {
  low: '保持观察',
  medium: '轻量介入',
  high: '立即处置',
};

function urgencyFromOmen(omen: WorldOmen): OracleAdvice['urgency'] {
  if (omen.tone === 'danger' || omen.confidence >= 0.82) return 'high';
  if (omen.tone === 'warning' || omen.confidence >= 0.62) return 'medium';
  return 'low';
}

export function deriveOracleAdvice(input: OracleAdviceInput): OracleAdvice | null {
  if (!input.session) return null;
  const omens = deriveWorldOmens({
    stats: input.stats,
    entities: input.entities,
    events: input.events,
    phase: input.phase ?? input.session.phase,
  });
  const sourceOmen = omens.find((omen) => omen.suggestedIntervention) ?? omens[0];
  if (!sourceOmen?.suggestedIntervention) return null;

  const now = input.now ?? Date.now();
  const cost = getInterventionCost(sourceOmen.suggestedIntervention);
  const refreshedBudget = input.budget
    ? refreshInterventionBudget(input.budget, input.session, now)
    : null;
  const budgetCheck = refreshedBudget
    ? checkInterventionBudget(refreshedBudget, sourceOmen.suggestedIntervention, input.session, now)
    : null;
  const canAfford = budgetCheck ? budgetCheck.allowed : true;
  const remaining = refreshedBudget?.current ?? 0;
  const urgency = urgencyFromOmen(sourceOmen);
  const interventionName = formatIntervention(sourceOmen.suggestedIntervention);

  return {
    kind: sourceOmen.suggestedIntervention,
    title: `${URGENCY_TITLE[urgency]}：${interventionName}`,
    detail: canAfford
      ? `${sourceOmen.title} 正在成为主导信号，建议切到${interventionName}后在 Arena 中选择目标。`
      : `${sourceOmen.title} 需要${interventionName}，但当前神谕充能不足；先观察或等待恢复。`,
    evidence: `${sourceOmen.evidence} / 成本 ${formatBudgetValue(cost)} / 余量 ${formatBudgetValue(remaining)}`,
    urgency,
    confidence: sourceOmen.confidence,
    canAfford,
    cost,
    remaining,
    sourceOmen,
  };
}
