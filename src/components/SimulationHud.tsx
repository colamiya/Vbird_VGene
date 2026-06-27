import React, { useEffect, useState } from 'react';
import { Microscope, Terminal, X, Zap } from 'lucide-react';
import DirectorCuePanel from './DirectorCuePanel';
import ExperienceDirectorPanel from './ExperienceDirectorPanel';
import InterventionDock from './InterventionDock';
import NarrativeFeed from './NarrativeFeed';
import ObservationObjectivesPanel from './ObservationObjectivesPanel';
import PinnedSpecimenPanel from './PinnedSpecimenPanel';
import WorldPulsePanel from './WorldPulsePanel';
import type {
  Entity,
  EntityFateLine,
  EntityView,
  ComputeStatus,
  InterventionBudget,
  InterventionTrace,
  LiveInteractionNetwork,
  LiveProtagonistRadar,
  MealRhythmCue,
  MealRunPredictionProgress,
  PinnedSpecimen,
  PlayerInterventionKind,
  RunObjective,
  RunSession,
  WorldEvent,
  WorldStats,
} from '../types/world';
import type { DirectorCue } from '../utils/directorCues';
import type { ExperienceDirectorCue } from '../utils/experienceDirector';
import type { OracleAdvice } from '../utils/oracleAdvice';
import type { ActiveMoment } from '../utils/activeMoment';
import { describeChallengeRules } from '../utils/challengeRules';

type MobileHudTab = 'feed' | 'entity' | 'actions' | 'status';

interface SimulationHudProps {
  activeIntervention: PlayerInterventionKind;
  interventionArmed: boolean;
  disabled: boolean;
  interventionBudget: InterventionBudget | null;
  runSession: RunSession | null;
  oracleAdvice: OracleAdvice | null;
  runClockNow: number;
  onInterventionChange: (kind: PlayerInterventionKind) => void;
  activeMoment: ActiveMoment | null;
  experienceCue: ExperienceDirectorCue | null;
  directorCue: DirectorCue | null;
  liveProtagonistRadar: LiveProtagonistRadar | null;
  interventionTraces: InterventionTrace[];
  runObjectives?: RunObjective[];
  runHighlightsCount: number;
  bookmarkDisabled: boolean;
  onBookmarkHighlight: () => void;
  stats: WorldStats;
  entities: EntityView[];
  worldEvents: WorldEvent[];
  currentMealRhythm: MealRhythmCue | null;
  predictionProgress: MealRunPredictionProgress | null;
  computeStatus: ComputeStatus;
  liveInteractionNetwork: LiveInteractionNetwork | null;
  pinnedSpecimen: PinnedSpecimen | null;
  selectedEntity: Entity | null;
  selectedEntityFateLine: EntityFateLine | null;
  entityActionStatus: string;
  onClearPinnedSpecimen: () => void;
  onCloseEntity: () => void;
  onOpenMicroArena: () => void;
  onForceMutation: () => void;
}

interface EntityInspectorCardProps {
  entity: Entity;
  fateLine?: EntityFateLine | null;
  status: string;
  compact?: boolean;
  disabled?: boolean;
  onClose: () => void;
  onOpenMicroArena: () => void;
  onForceMutation: () => void;
}

const mobileTabs: Array<{ id: MobileHudTab; label: string }> = [
  { id: 'feed', label: '事件' },
  { id: 'actions', label: '干预' },
  { id: 'status', label: '态势' },
];

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

const EntityInspectorCard: React.FC<EntityInspectorCardProps> = ({
  entity,
  fateLine = null,
  status,
  compact = false,
  disabled = false,
  onClose,
  onOpenMicroArena,
  onForceMutation,
}) => (
  <section aria-label="实体检查器" className="hud-panel p-4">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[9px] font-mono uppercase tracking-[0.16em] text-neon-blue">实体检查器</p>
        <h2 className="mt-1 truncate text-sm font-black text-white">
          #{entity.id} / Gen {entity.generation}
        </h2>
        <p className="mt-1 truncate text-[9px] font-mono text-white/45">
          Energy {entity.energy.toFixed(1)}% / Toxin {(entity.metabolic_toxin * 100).toFixed(1)}%
        </p>
      </div>
      <button
        type="button"
        aria-label="关闭实体检查器"
        onClick={onClose}
        className="interactive-focus shrink-0 border border-white/10 p-2 text-white/45 transition-[border-color,color,background-color] hover:border-red-400/40 hover:bg-red-400/10 hover:text-red-300"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>

    <div className="mt-4 grid grid-cols-2 gap-2">
      <div className="border border-white/10 bg-white/[0.03] p-3">
        <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">核心能量</p>
        <p className="mt-2 text-sm font-black text-neon-blue">{entity.energy.toFixed(1)}%</p>
        <div className="mt-2 h-1 bg-white/10">
          <span className="block h-full bg-neon-blue" style={{ width: `${entity.energy}%` }} />
        </div>
      </div>
      <div className="border border-white/10 bg-white/[0.03] p-3">
        <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">代谢毒素</p>
        <p className="mt-2 text-sm font-black text-red-300">{(entity.metabolic_toxin * 100).toFixed(1)}%</p>
        <div className="mt-2 h-1 bg-white/10">
          <span className="block h-full bg-red-400" style={{ width: `${entity.metabolic_toxin * 100}%` }} />
        </div>
      </div>
    </div>

    {fateLine && (
      <div className={`mt-4 border-l-2 bg-black/35 p-3 ${
        fateLine.tone === 'good'
          ? 'border-emerald-300 text-emerald-300'
          : fateLine.tone === 'warning'
            ? 'border-yellow-300 text-yellow-300'
            : fateLine.tone === 'danger'
              ? 'border-red-400 text-red-400'
              : 'border-white/15 text-white/60'
      }`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-mono uppercase tracking-[0.14em] text-white/35">最近手痕轨迹</p>
          <span className="text-[9px] font-mono">{fateLine.snapshots.length} 点</span>
        </div>
        <h3 className="mt-1 truncate text-[11px] font-black text-white">{fateLine.title}</h3>
        <p className="mt-2 line-clamp-2 text-[9px] font-mono leading-relaxed text-white/55">{fateLine.detail}</p>
        <div className="mt-3 flex h-11 items-end gap-1 border-b border-white/10">
          {fateLine.snapshots.slice(-8).map((snapshot, index) => (
            <span
              key={`${snapshot.timestamp}-${index}`}
              className="block w-full bg-current"
              style={{
                height: `${Math.max(8, Math.min(42, snapshot.energy / 2))}px`,
                opacity: snapshot.alive ? 0.35 + Math.min(0.55, snapshot.score / 150) : 0.18,
              }}
              title={`E ${snapshot.energy.toFixed(1)} / S ${snapshot.score.toFixed(1)} / T ${(snapshot.toxin * 100).toFixed(1)}%`}
            />
          ))}
        </div>
        <p className="mt-2 line-clamp-2 border-t border-white/5 pt-2 text-[9px] font-mono leading-relaxed text-white/35">{fateLine.evidence}</p>
      </div>
    )}

    {!compact && (
      <div className="mt-4">
        <div className="mb-2 flex items-center gap-2 text-[9px] font-mono uppercase tracking-[0.14em] text-neon-blue">
          <Terminal size={12} aria-hidden="true" />
          <span>主权 DNA (WAT)</span>
        </div>
        <pre className="custom-scrollbar max-h-48 overflow-x-auto overflow-y-auto border border-white/10 bg-black/55 p-3 text-[9px] font-mono leading-relaxed text-white/55">
          {entity.dna}
        </pre>
      </div>
    )}

    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      <button
        type="button"
        onClick={onOpenMicroArena}
        className="interactive-focus flex min-h-11 items-center justify-center gap-2 border border-neon-blue/25 px-3 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-neon-blue transition-[border-color,background-color,color] hover:bg-neon-blue/10"
      >
        <Microscope size={14} aria-hidden="true" />
        微观视界
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onForceMutation}
        className="interactive-focus flex min-h-11 items-center justify-center gap-2 border border-red-400/25 px-3 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-red-300 transition-[border-color,background-color,color,opacity] hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <Zap size={14} aria-hidden="true" />
        定点祝福
      </button>
    </div>

    {status && (
      <p aria-live="polite" className="mt-3 text-[9px] font-mono leading-relaxed text-white/45">
        {status}
      </p>
    )}
  </section>
);

const SimulationHud: React.FC<SimulationHudProps> = ({
  activeIntervention,
  interventionArmed,
  disabled,
  interventionBudget,
  runSession,
  oracleAdvice,
  runClockNow,
  onInterventionChange,
  activeMoment,
  experienceCue,
  directorCue,
  liveProtagonistRadar,
  interventionTraces,
  runObjectives = [],
  runHighlightsCount,
  bookmarkDisabled,
  onBookmarkHighlight,
  stats,
  entities,
  worldEvents,
  currentMealRhythm,
  predictionProgress,
  computeStatus,
  liveInteractionNetwork,
  pinnedSpecimen,
  selectedEntity,
  selectedEntityFateLine,
  entityActionStatus,
  onClearPinnedSpecimen,
  onCloseEntity,
  onOpenMicroArena,
  onForceMutation,
}) => {
  const [mobileTab, setMobileTab] = useState<MobileHudTab>('feed');
  const selectedEntityId = selectedEntity?.id ?? null;
  const isDesktopHud = useMediaQuery('(min-width: 1536px)');
  const visibleMobileTabs = selectedEntity
    ? [{ id: 'entity' as const, label: '实体' }, ...mobileTabs]
    : mobileTabs;

  useEffect(() => {
    if (selectedEntityId === null) {
      setMobileTab((current) => current === 'entity' ? 'feed' : current);
      return;
    }
    setMobileTab('entity');
  }, [selectedEntityId]);

  const renderDirector = (compact = true) => (
    <DirectorCuePanel
      cue={directorCue}
      protagonistRadar={liveProtagonistRadar}
      highlightCount={runHighlightsCount}
      bookmarkDisabled={bookmarkDisabled}
      compact={compact}
      onBookmark={onBookmarkHighlight}
    />
  );

  const renderExperience = () => (
    <ExperienceDirectorPanel cue={experienceCue} />
  );

  const renderIntervention = () => (
    <InterventionDock
      activeKind={activeIntervention}
      armed={interventionArmed}
      disabled={disabled}
      budget={interventionBudget}
      session={runSession}
      advice={oracleAdvice}
      now={runClockNow}
      allowedInterventions={runSession?.loadedChallenge?.rules?.allowedInterventions}
      ruleNote={describeChallengeRules(runSession?.loadedChallenge?.rules)}
      onChange={onInterventionChange}
    />
  );

  const renderNarrative = () => (
    <NarrativeFeed
      session={runSession}
      stats={stats}
      entities={entities}
      events={worldEvents}
      interventionTraces={interventionTraces}
      now={runClockNow}
      mealRhythm={currentMealRhythm}
      predictionProgress={predictionProgress}
      activeMoment={activeMoment}
      disabled={disabled}
      onBookmarkRhythm={onBookmarkHighlight}
      onSelectRhythmIntervention={onInterventionChange}
    />
  );

  const renderStatusPanels = () => (
    <>
      <WorldPulsePanel
        stats={stats}
        entities={entities}
        events={worldEvents}
        phase={runSession?.phase}
        session={runSession}
        now={runClockNow}
        computeStatus={computeStatus}
        interactionNetwork={liveInteractionNetwork}
      />
      <ObservationObjectivesPanel
        session={runSession}
        stats={stats}
        entities={entities}
        events={worldEvents}
        interventionTraces={interventionTraces}
        objectives={runObjectives}
        now={runClockNow}
      />
    </>
  );

  const renderSpecimenPanel = () => (
    <PinnedSpecimenPanel
      specimen={pinnedSpecimen}
      now={runClockNow}
      onClear={onClearPinnedSpecimen}
    />
  );

  return (
    <section aria-label="局内观测台 HUD" className="pointer-events-none absolute inset-0 z-20">
      {isDesktopHud ? (
      <div>
        <div className="absolute left-4 top-4 bottom-[var(--hud-bottom-reserve)] z-20 w-[24rem]">
          <div className="hud-rail hud-scroll pointer-events-auto h-full space-y-3 pr-1">
            {renderIntervention()}
            {renderStatusPanels()}
          </div>
        </div>

        <div className="absolute right-4 top-4 bottom-[var(--hud-bottom-reserve)] z-20 w-[27rem]">
          <div className="hud-rail hud-scroll pointer-events-auto h-full space-y-3 pr-1">
            {renderExperience()}
            {selectedEntity && (
              <EntityInspectorCard
                entity={selectedEntity}
                fateLine={selectedEntityFateLine}
                status={entityActionStatus}
                compact
                disabled={disabled}
                onClose={onCloseEntity}
                onOpenMicroArena={onOpenMicroArena}
                onForceMutation={onForceMutation}
              />
            )}
            {renderNarrative()}
            {renderSpecimenPanel()}
          </div>
        </div>

        <div className="absolute left-1/2 top-4 z-30 hidden w-[min(40rem,calc(100vw-56rem))] -translate-x-1/2 2xl:block">
          {renderDirector(true)}
        </div>
      </div>
      ) : (
      <div className="absolute inset-x-3 bottom-[var(--hud-bottom-reserve)] z-30">
        <div className="hud-panel pointer-events-auto flex max-h-[56vh] flex-col overflow-hidden p-2">
          <div className={`mb-2 grid shrink-0 gap-1 ${visibleMobileTabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
            {visibleMobileTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                aria-pressed={mobileTab === tab.id}
                onClick={() => setMobileTab(tab.id)}
                className={`interactive-focus min-h-10 min-w-0 truncate whitespace-nowrap border px-2 py-2 text-[10px] font-mono uppercase leading-tight tracking-[0.14em] transition-[border-color,background-color,color] ${
                  mobileTab === tab.id
                    ? 'border-neon-blue bg-neon-blue/10 text-neon-blue'
                    : 'border-white/10 bg-white/[0.03] text-white/45 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="hud-scroll min-h-0 flex-1 space-y-3 pr-1">
            {mobileTab === 'entity' && selectedEntity && (
              <EntityInspectorCard
                entity={selectedEntity}
                fateLine={selectedEntityFateLine}
                status={entityActionStatus}
                compact
                disabled={disabled}
                onClose={onCloseEntity}
                onOpenMicroArena={onOpenMicroArena}
                onForceMutation={onForceMutation}
              />
            )}
            {mobileTab === 'feed' && (
              <>
                {renderNarrative()}
                {renderExperience()}
                {renderDirector(false)}
                {renderSpecimenPanel()}
              </>
            )}
            {mobileTab === 'actions' && renderIntervention()}
            {mobileTab === 'status' && renderStatusPanels()}
          </div>
        </div>
      </div>
      )}
    </section>
  );
};

export default SimulationHud;
