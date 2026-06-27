import React, { useMemo } from 'react';
import { CheckCircle2, ClipboardCheck, Crosshair, RadioTower, XCircle } from 'lucide-react';
import type { EntityView, InterventionTrace, RunCommissionGrade, RunObjective, RunSession, WorldEvent, WorldStats } from '../types/world';
import { deriveRunObjectives } from '../utils/runObjectives';
import { deriveRunCommissionBoard, formatCommissionGrade } from '../utils/runCommissions';

interface ObservationObjectivesPanelProps {
  session: RunSession | null;
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  interventionTraces?: InterventionTrace[];
  objectives?: RunObjective[];
  now: number;
}

const statusClass: Record<RunObjective['status'], string> = {
  active: 'border-white/10 text-white/60',
  complete: 'border-emerald-300/40 text-emerald-300',
  failed: 'border-red-400/40 text-red-400',
};

const progressClass: Record<RunObjective['tone'], string> = {
  info: 'bg-neon-blue',
  good: 'bg-emerald-300',
  warning: 'bg-yellow-300',
  danger: 'bg-red-400',
};

const commissionGradeClass: Record<RunCommissionGrade, string> = {
  missed: 'border-red-400/40 text-red-400',
  bronze: 'border-yellow-300/40 text-yellow-300',
  silver: 'border-neon-blue/40 text-neon-blue',
  gold: 'border-emerald-300/40 text-emerald-300',
  legend: 'border-neon-purple/50 text-neon-purple',
};

const statusIcon: Record<RunObjective['status'], React.ReactNode> = {
  active: <Crosshair size={12} aria-hidden="true" />,
  complete: <CheckCircle2 size={12} aria-hidden="true" />,
  failed: <XCircle size={12} aria-hidden="true" />,
};

const ObservationObjectivesPanel: React.FC<ObservationObjectivesPanelProps> = ({
  session,
  stats,
  entities,
  events,
  interventionTraces = [],
  objectives: providedObjectives,
  now,
}) => {
  const objectives = useMemo(
    () => providedObjectives ?? (session ? deriveRunObjectives({ session, stats, entities, events, interventionTraces, now }) : []),
    [entities, events, interventionTraces, now, providedObjectives, session, stats],
  );
  const commissionBoard = useMemo(
    () => session
      ? deriveRunCommissionBoard({ session, stats, entities, events, objectives, now })
      : null,
    [entities, events, now, objectives, session, stats],
  );

  if (!session || objectives.length === 0) return null;

  const completeCount = objectives.filter((objective) => objective.status === 'complete').length;

  return (
    <section
      aria-label="本局观测目标"
      className="w-full"
    >
      <div className="hud-panel p-4">
        <img
          src="/media/observation-objectives.svg"
          alt=""
          aria-hidden="true"
          className="hud-deco"
        />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">
                <RadioTower size={10} aria-hidden="true" />
                本局目标
              </div>
              <h2 className="mt-1 text-sm font-black uppercase italic tracking-normal text-white">
                观测协议
              </h2>
            </div>
            <div className="border border-neon-blue/30 px-2 py-1 text-right text-neon-blue">
              <div className="text-[9px] font-mono uppercase tracking-[0.14em]">完成</div>
              <div className="mt-0.5 text-[10px] font-black">{completeCount}/{objectives.length}</div>
            </div>
          </div>

          {commissionBoard && (
            <div className={`mt-4 border bg-black/40 p-2 ${commissionGradeClass[commissionBoard.grade]}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em]">
                    <ClipboardCheck size={11} aria-hidden="true" />
                    委托评级
                  </div>
                  <h3 className="mt-1 truncate text-[10px] font-black text-white">{commissionBoard.title}</h3>
                </div>
                <span className="shrink-0 text-[9px] font-black uppercase tracking-widest">
                  {formatCommissionGrade(commissionBoard.grade)}
                </span>
              </div>
              <div className="mt-2 h-1 bg-white/10">
                <div
                  className="h-full bg-current"
                  style={{ width: `${Math.round((commissionBoard.score / commissionBoard.maxScore) * 100)}%` }}
                />
              </div>
              <p className="mt-2 truncate text-[9px] font-mono text-white/35">{commissionBoard.evidence}</p>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {objectives.map((objective) => (
              <article
                key={objective.id}
                className={`border bg-black/40 p-2 ${statusClass[objective.status]}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {statusIcon[objective.status]}
                      <h3 className="truncate text-[10px] font-bold text-white">{objective.title}</h3>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/45">
                      {objective.detail}
                    </p>
                  </div>
                  <span className="shrink-0 text-[9px] font-mono uppercase tracking-[0.14em]">
                    {Math.round(objective.progress * 100)}%
                  </span>
                </div>
                <div className="mt-2 h-1 bg-white/10">
                  <div
                    className={`h-full transition-[width] duration-500 ${progressClass[objective.tone]}`}
                    style={{ width: `${Math.round(objective.progress * 100)}%` }}
                  />
                </div>
                <p className="mt-1 truncate text-[9px] font-mono text-white/35">{objective.evidence}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ObservationObjectivesPanel;
