import type {
  InterventionBudget,
  InterventionBudgetSummary,
  MealRunLength,
  PlayerInterventionKind,
  RunSession,
  RunSpeed,
} from '../types/world';

interface BudgetConfig {
  max: number;
  initial: number;
  recoverMs: number;
}

interface BudgetCheck {
  allowed: boolean;
  budget: InterventionBudget;
  cost: number;
  cooldownRemainingMs: number;
  reason: string;
}

const BUDGET_CONFIG: Record<MealRunLength, BudgetConfig> = {
  Snack: { max: 6, initial: 4, recoverMs: 90_000 },
  Dinner: { max: 8, initial: 5, recoverMs: 120_000 },
  LongTable: { max: 10, initial: 6, recoverMs: 150_000 },
};

export const INTERVENTION_COSTS: Record<PlayerInterventionKind, number> = {
  BLESS: 2,
  POISON: 3,
  QUARANTINE: 2,
  EXILE: 4,
  PIN_OBSERVE: 0.5,
};

const BASE_COOLDOWN_MS: Record<PlayerInterventionKind, number> = {
  BLESS: 6_000,
  POISON: 8_000,
  QUARANTINE: 7_000,
  EXILE: 10_000,
  PIN_OBSERVE: 2_500,
};

export function formatBudgetValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function getInterventionCost(kind: PlayerInterventionKind) {
  return INTERVENTION_COSTS[kind];
}

export function getInterventionCooldownMs(kind: PlayerInterventionKind, speed: RunSpeed) {
  return Math.max(1_200, Math.round(BASE_COOLDOWN_MS[kind] / Math.sqrt(speed)));
}

export function createInterventionBudget(length: MealRunLength, now = Date.now()): InterventionBudget {
  const config = BUDGET_CONFIG[length];
  return {
    max: config.max,
    current: config.initial,
    used: 0,
    recovered: 0,
    lastUpdatedAt: now,
    lastAppliedAt: 0,
  };
}

export function refreshInterventionBudget(
  budget: InterventionBudget,
  session: RunSession,
  now = Date.now(),
): InterventionBudget {
  const config = BUDGET_CONFIG[session.length];
  if (now <= budget.lastUpdatedAt) return budget;
  if (budget.current >= budget.max) {
    return { ...budget, current: budget.max, lastUpdatedAt: now };
  }

  const recoveredUnits = Math.floor((now - budget.lastUpdatedAt) / config.recoverMs);
  if (recoveredUnits <= 0) return budget;

  const nextCurrent = Math.min(budget.max, budget.current + recoveredUnits);
  const actualRecovered = Math.max(0, nextCurrent - budget.current);
  return {
    ...budget,
    current: nextCurrent,
    recovered: budget.recovered + actualRecovered,
    lastUpdatedAt: budget.lastUpdatedAt + recoveredUnits * config.recoverMs,
  };
}

export function holdInterventionBudgetClock(budget: InterventionBudget, now = Date.now()): InterventionBudget {
  return { ...budget, lastUpdatedAt: now };
}

export function checkInterventionBudget(
  budget: InterventionBudget,
  kind: PlayerInterventionKind,
  session: RunSession,
  now = Date.now(),
): BudgetCheck {
  const refreshed = refreshInterventionBudget(budget, session, now);
  const cost = getInterventionCost(kind);
  const cooldownMs = getInterventionCooldownMs(kind, session.speed);
  const cooldownRemainingMs = Math.max(0, refreshed.lastAppliedAt + cooldownMs - now);

  if (cooldownRemainingMs > 0) {
    return {
      allowed: false,
      budget: refreshed,
      cost,
      cooldownRemainingMs,
      reason: `神谕回路冷却中，还需 ${Math.ceil(cooldownRemainingMs / 1000)} 秒。`,
    };
  }

  if (refreshed.current < cost) {
    return {
      allowed: false,
      budget: refreshed,
      cost,
      cooldownRemainingMs: 0,
      reason: `神谕充能不足：需要 ${formatBudgetValue(cost)}，当前 ${formatBudgetValue(refreshed.current)}。`,
    };
  }

  return {
    allowed: true,
    budget: refreshed,
    cost,
    cooldownRemainingMs: 0,
    reason: '',
  };
}

export function spendInterventionBudget(
  budget: InterventionBudget,
  kind: PlayerInterventionKind,
  session: RunSession,
  now = Date.now(),
): BudgetCheck {
  const checked = checkInterventionBudget(budget, kind, session, now);
  if (!checked.allowed) return checked;

  return {
    ...checked,
    budget: {
      ...checked.budget,
      current: Math.max(0, checked.budget.current - checked.cost),
      used: checked.budget.used + checked.cost,
      lastAppliedAt: now,
      lastUpdatedAt: now,
    },
  };
}

export function summarizeInterventionBudget(
  budget: InterventionBudget,
  session: RunSession,
  now = Date.now(),
): InterventionBudgetSummary {
  const refreshed = refreshInterventionBudget(budget, session, now);
  const usageRatio = refreshed.used / Math.max(1, refreshed.max);
  const discipline: InterventionBudgetSummary['discipline'] =
    usageRatio <= 0.35
      ? 'restrained'
      : usageRatio <= 0.9
        ? 'balanced'
        : 'overdrawn';

  const title: Record<InterventionBudgetSummary['discipline'], string> = {
    restrained: '克制观察者',
    balanced: '均衡干预者',
    overdrawn: '强手改史者',
  };
  const detail: Record<InterventionBudgetSummary['discipline'], string> = {
    restrained: '本局少量使用神谕，把主要历史交给系统自发演化。',
    balanced: '本局在关键窗口投入干预，保留了玩家选择和自然演化的混合因果。',
    overdrawn: '本局频繁改写局部选择压力，复盘更接近人为实验记录。',
  };

  return {
    max: refreshed.max,
    remaining: refreshed.current,
    used: refreshed.used,
    recovered: refreshed.recovered,
    discipline,
    title: title[discipline],
    detail: detail[discipline],
  };
}
