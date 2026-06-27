import type { AppConfig, NextRunChallenge, NextRunChallengeRules, PlayerInterventionKind } from '../types/world';
import { countActiveInterventions } from './interventionKinds';
import { normalizeSettings } from './settings';

export function describeChallengeRules(rules?: NextRunChallengeRules) {
  if (!rules) return '';
  const parts = [rules.setupLabel];
  if (rules.allowedInterventions?.length) {
    parts.push(`允许干预 ${rules.allowedInterventions.map(formatRuleIntervention).join('/')}`);
  }
  if (typeof rules.maxActiveInterventions === 'number') {
    parts.push(`主动干预上限 ${rules.maxActiveInterventions}`);
  }
  if (rules.configPatch) {
    const patch = rules.configPatch;
    const patchParts = [
      typeof patch.mutationRate === 'number' ? `突变 ${(patch.mutationRate * 100).toFixed(0)}%` : '',
      typeof patch.entropyFactor === 'number' ? `熵压 ${(patch.entropyFactor * 100).toFixed(0)}%` : '',
      typeof patch.maxEntities === 'number' ? `种群 ${patch.maxEntities}` : '',
      patch.winningRule ? `规则 ${patch.winningRule}` : '',
      patch.envType ? `环境 ${patch.envType}` : '',
    ].filter(Boolean);
    if (patchParts.length > 0) parts.push(patchParts.join(' / '));
  }
  return parts.join('；');
}

export function applyChallengeConfigPatch(config: AppConfig, challenge?: NextRunChallenge) {
  if (!challenge?.rules?.configPatch) return config;
  return normalizeSettings({ ...config, ...challenge.rules.configPatch });
}

export function checkChallengeInterventionRules(args: {
  challenge?: NextRunChallenge;
  kind: PlayerInterventionKind;
  counts: Record<PlayerInterventionKind, number>;
}) {
  const rules = args.challenge?.rules;
  if (!rules) return { allowed: true, reason: '' };

  if (rules.allowedInterventions?.length && !rules.allowedInterventions.includes(args.kind)) {
    return {
      allowed: false,
      reason: `挑战「${args.challenge?.title}」限制本局只能使用 ${rules.allowedInterventions.map(formatRuleIntervention).join('/')}。`,
    };
  }

  if (
    args.kind !== 'PIN_OBSERVE' &&
    typeof rules.maxActiveInterventions === 'number' &&
    countActiveInterventions(args.counts) >= rules.maxActiveInterventions
  ) {
    return {
      allowed: false,
      reason: `挑战「${args.challenge?.title}」主动干预上限为 ${rules.maxActiveInterventions} 次。`,
    };
  }

  return { allowed: true, reason: '' };
}

function formatRuleIntervention(kind: PlayerInterventionKind) {
  if (kind === 'BLESS') return '祝福';
  if (kind === 'POISON') return '投毒';
  if (kind === 'QUARANTINE') return '隔离';
  if (kind === 'EXILE') return '放逐';
  return '钉选';
}
