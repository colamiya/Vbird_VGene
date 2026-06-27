import React from 'react';
import { Ban, BatteryCharging, Biohazard, Crosshair, Sparkles, Shield } from 'lucide-react';
import type { InterventionBudget, PlayerInterventionKind, RunSession } from '../types/world';
import { checkInterventionBudget, formatBudgetValue, getInterventionCost, refreshInterventionBudget } from '../utils/interventionBudget';
import type { OracleAdvice } from '../utils/oracleAdvice';

interface InterventionDockProps {
  activeKind: PlayerInterventionKind;
  armed?: boolean;
  disabled?: boolean;
  budget?: InterventionBudget | null;
  session?: RunSession | null;
  advice?: OracleAdvice | null;
  now?: number;
  allowedInterventions?: PlayerInterventionKind[];
  ruleNote?: string;
  onChange: (kind: PlayerInterventionKind) => void;
}

const interventions: Array<{
  kind: PlayerInterventionKind;
  label: string;
  title: string;
  icon: React.ReactNode;
}> = [
  { kind: 'BLESS', label: '祝福', title: '祝福：给半径内实体补能并小幅加分', icon: <Sparkles size={15} aria-hidden="true" /> },
  { kind: 'POISON', label: '投毒', title: '投毒：提高半径内实体代谢毒素', icon: <Biohazard size={15} aria-hidden="true" /> },
  { kind: 'QUARANTINE', label: '隔离', title: '隔离：临时提高半径内实体防御与协作', icon: <Shield size={15} aria-hidden="true" /> },
  { kind: 'EXILE', label: '放逐', title: '放逐：移动并削弱目标区域高风险实体', icon: <Ban size={15} aria-hidden="true" /> },
  { kind: 'PIN_OBSERVE', label: '钉选', title: '钉选观察：仅改变叙事焦点，不修改后端数值', icon: <Crosshair size={15} aria-hidden="true" /> },
];

const InterventionDock: React.FC<InterventionDockProps> = ({
  activeKind,
  armed = false,
  disabled = false,
  budget = null,
  session = null,
  advice = null,
  now = Date.now(),
  allowedInterventions,
  ruleNote = '',
  onChange,
}) => {
  const displayedBudget = budget && session ? refreshInterventionBudget(budget, session, now) : null;
  const activeCheck = displayedBudget && session ? checkInterventionBudget(displayedBudget, activeKind, session, now) : null;
  const budgetRatio = displayedBudget ? Math.round((displayedBudget.current / displayedBudget.max) * 100) : 0;
  const isAllowedByRule = (kind: PlayerInterventionKind) => !allowedInterventions?.length || allowedInterventions.includes(kind);

  return (
    <section
      aria-label="玩家干预"
      className="w-full"
    >
      <div className="hud-panel p-2">
        <img
          src="/media/intervention-budget-gauge.svg"
          alt=""
          aria-hidden="true"
          className="hud-deco"
        />
        <div className="relative">
        {ruleNote && (
          <div className="mb-2 border border-yellow-300/25 bg-yellow-300/10 px-3 py-2 text-[9px] font-mono leading-relaxed text-yellow-100/80">
            挑战规则：{ruleNote}
          </div>
        )}
        {advice && (
          <div className={`mb-2 relative overflow-hidden border border-t-2 bg-black/55 p-3 ${
            advice.urgency === 'high'
              ? 'border-t-red-400 text-red-400'
              : advice.urgency === 'medium'
                ? 'border-t-yellow-300 text-yellow-300'
                : 'border-t-neon-blue text-neon-blue'
          }`}>
            <img
              src="/media/oracle-advice-panel.svg"
              alt=""
              aria-hidden="true"
              className="hud-deco"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                    <Sparkles size={10} aria-hidden="true" />
                    神谕建议
                  </p>
                  <h3 className="mt-1 truncate text-[10px] font-black text-white">{advice.title}</h3>
                </div>
                <span className="shrink-0 border border-current px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-[0.14em]">
                  {Math.round(advice.confidence * 100)}%
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/50">{advice.detail}</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-2">
                <span className="min-w-0 truncate text-[9px] font-mono text-white/35">{advice.evidence}</span>
                <button
                  type="button"
                  disabled={disabled || !isAllowedByRule(advice.kind) || (activeKind === advice.kind && armed)}
                  onClick={() => onChange(advice.kind)}
                  className="interactive-focus shrink-0 border border-current px-2 py-1 text-[9px] font-mono uppercase tracking-[0.14em] transition-[background-color,opacity] hover:bg-white/5 disabled:cursor-default disabled:opacity-50"
                >
                  {!isAllowedByRule(advice.kind) ? '受限' : activeKind === advice.kind && armed ? '已采用' : activeKind === advice.kind ? '武装' : '采纳'}
                </button>
              </div>
            </div>
          </div>
        )}
        {displayedBudget && (
          <div className="mb-2 grid grid-cols-[1fr_auto] items-center gap-3 border border-white/5 bg-white/[0.03] px-3 py-2">
            <div className="min-w-0">
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-[0.14em] text-white/45">
                  <BatteryCharging size={11} aria-hidden="true" />
                  神谕充能
                </span>
                <span className="text-[9px] font-bold text-neon-blue">
                  {formatBudgetValue(displayedBudget.current)} / {formatBudgetValue(displayedBudget.max)}
                </span>
              </div>
              <div className="h-1 bg-white/10">
                <div
                  className="h-full bg-neon-blue transition-[width]"
                  style={{ width: `${budgetRatio}%` }}
                />
              </div>
            </div>
            <div className="text-right font-mono">
              <p className="text-[9px] uppercase tracking-[0.14em] text-white/30">当前成本</p>
              <p className={activeCheck?.allowed === false ? 'text-[10px] font-bold text-red-300' : 'text-[10px] font-bold text-white/70'}>
                {formatBudgetValue(getInterventionCost(activeKind))}
              </p>
            </div>
            {activeCheck?.allowed === false && !disabled && (
              <p className="col-span-2 text-[9px] font-mono leading-relaxed text-yellow-200/80">
                {activeCheck.reason}
              </p>
            )}
          </div>
        )}
        <div className={`mb-2 border px-3 py-2 text-[9px] font-mono uppercase tracking-[0.14em] ${
          armed && !disabled
            ? 'border-neon-blue/35 bg-neon-blue/10 text-neon-blue'
            : 'border-white/10 bg-white/[0.03] text-white/40'
        }`}>
          {armed && !disabled
            ? '已武装：下一次点击 Arena 执行干预 / Esc 解除'
            : '观察模式：选择干预或按 1-5 后再点击 Arena'}
        </div>
        <div className="flex flex-wrap gap-2">
        {interventions.map((item) => {
          const blockedByRule = !isAllowedByRule(item.kind);
          return (
            <button
              key={item.kind}
              type="button"
              title={`${item.title} / 消耗 ${formatBudgetValue(getInterventionCost(item.kind))}${blockedByRule ? ' / 当前挑战禁用' : ''}`}
              aria-label={`${item.title}，消耗 ${formatBudgetValue(getInterventionCost(item.kind))}${blockedByRule ? '，当前挑战禁用' : ''}`}
              aria-pressed={activeKind === item.kind}
              disabled={disabled || blockedByRule}
              onClick={() => onChange(item.kind)}
              className={`
                interactive-focus flex min-h-11 min-w-11 items-center justify-center gap-2 border px-3 font-mono text-[10px] uppercase tracking-[0.14em]
                transition-[border-color,color,background-color,opacity]
                ${activeKind === item.kind
                  ? 'border-neon-blue bg-neon-blue/10 text-neon-blue'
                  : 'border-white/10 bg-white/5 text-white/50 hover:border-white/25 hover:text-white'}
                ${disabled || blockedByRule ? 'cursor-not-allowed opacity-40' : ''}
                ${displayedBudget && displayedBudget.current < getInterventionCost(item.kind) ? 'text-white/25' : ''}
              `}
            >
              {item.icon}
              <span className="hidden sm:inline">{item.label}</span>
              <span className="hidden rounded-sm border border-current px-1 text-[8px] sm:inline">
                {blockedByRule ? 'LOCK' : formatBudgetValue(getInterventionCost(item.kind))}
              </span>
            </button>
          );
        })}
        </div>
        </div>
      </div>
    </section>
  );
};

export default InterventionDock;
