import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FastForward, Pause, Play, Settings } from 'lucide-react';
import Arena from './Arena';
import SimulationHud from './SimulationHud';
import { audioEngine, type AudioEvent } from '../utils/audio/engine';
import { deriveActiveMoment } from '../utils/activeMoment';
import { deriveDirectorCue, type DirectorCue } from '../utils/directorCues';
import { deriveExperienceDirector } from '../utils/experienceDirector';
import { deriveLiveInteractionNetwork } from '../utils/liveInteractions';
import { deriveLiveProtagonistRadar } from '../utils/liveProtagonists';
import { deriveMealRhythmCue } from '../utils/mealRhythm';
import { deriveMealRunPredictionProgress } from '../utils/mealRunPredictionProgress';
import { deriveOracleAdvice } from '../utils/oracleAdvice';
import { appendRunHighlight, createRunHighlight } from '../utils/runHighlights';
import { deriveRunObjectives } from '../utils/runObjectives';
import { useRunHotkeys } from '../utils/useRunHotkeys';
import { deriveEntityFateLine } from '../utils/interventionTrace';
import type {
  AppConfig,
  ComputeStatus,
  Entity,
  EntityFateLine,
  EntityView,
  InterventionBudget,
  InterventionOutcome,
  InterventionTrace,
  MealRhythmCue,
  PinnedSpecimen,
  PlayerInterventionKind,
  RunHighlight,
  RunObjective,
  RunSession,
  WorldInteractionEvent,
  WorldEvent,
  WorldStats,
} from '../types/world';

const MicroArena = lazy(() => import('./MicroArena'));

const HUD_SNAPSHOT_INTERVAL_MS = 750;

interface HudSnapshot {
  committedAt: number;
  sessionId: string | null;
  selectedEntityId: number | null;
  latestEventId: string | null;
  latestInteractionId: string | null;
  traceCount: number;
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  interactions: WorldInteractionEvent[];
  traces: InterventionTrace[];
  now: number;
}

interface SimulationStageProps {
  config: AppConfig;
  entities: EntityView[];
  stats: WorldStats;
  computeStatus: ComputeStatus;
  worldEvents: WorldEvent[];
  worldInteractions: WorldInteractionEvent[];
  runSession: RunSession | null;
  runClockNow: number;
  isRunning: boolean;
  isSimulationToggling: boolean;
  isSettingsOpen: boolean;
  isInterventionPending: boolean;
  activeIntervention: PlayerInterventionKind;
  isInterventionArmed: boolean;
  interventionBudget: InterventionBudget | null;
  pinnedSpecimen: PinnedSpecimen | null;
  interventionTraces: InterventionTrace[];
  runHighlights: RunHighlight[];
  selectedEntity: Entity | null;
  isMicroArenaOpen: boolean;
  entityActionStatus: string;
  simulationStatus: string;
  isLeaping: boolean;
  onOpenSettings: () => void;
  onToggleSimulation: () => void | Promise<void>;
  onRequestReview: () => void;
  onEntityClick: (entity: EntityView) => void | Promise<void>;
  onInterferenceError: (message: string) => void;
  onWorldIntervention: (point: [number, number, number], entity?: EntityView) => Promise<InterventionOutcome | void>;
  onInterventionChange: (kind: PlayerInterventionKind) => void;
  onObjectiveCompleted: (objective: RunObjective) => void;
  onMealRhythmCue: (cue: MealRhythmCue) => void;
  onRunHighlightsChange: (highlights: RunHighlight[]) => void;
  onClearPinnedSpecimen: () => void;
  onCloseEntity: () => void;
  onOpenMicroArena: () => void;
  onCloseMicroArena: () => void;
  onForceMutation: () => void;
  onCancelIntervention: () => void;
  onShortcut: (message: string) => void;
  emitNarrativeAudio: (event: AudioEvent, sourceKey: string) => void;
}

function preloadReviewStage() {
  void import('./PhoenixReview');
}

function preloadSettingsModal() {
  void import('./SettingsModal');
}

function preloadMicroArena() {
  void import('./MicroArena');
}

function DeferredStageFallback({ label = '加载协议' }: { label?: string }) {
  return (
    <div className="flex min-h-[14rem] w-full items-center justify-center bg-black text-white">
      <div className="border border-cyan-300/20 bg-black/80 px-5 py-4 text-center shadow-[0_0_28px_rgba(34,211,238,0.12)]">
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-200">{label}</p>
        <div className="mt-3 h-1 w-40 overflow-hidden bg-white/10">
          <div className="h-full w-1/2 animate-pulse bg-cyan-300/80" />
        </div>
      </div>
    </div>
  );
}

function getDirectorCueAudioEvent(cue: DirectorCue | null): AudioEvent {
  if (!cue) return 'director_cue';
  if (cue.tone === 'danger') return 'director_danger_cue';
  if (typeof cue.entityId === 'number') return 'director_target_lock';
  return 'director_cue';
}

function getSimulationStatusTone(message: string) {
  if (!message) return 'info';
  if (/失败|错误|不足|崩溃|拒绝|无法/.test(message)) return 'danger';
  if (/解除|暂停|观察|未武装/.test(message)) return 'warning';
  if (/已武装|继续|成功|标记|完成/.test(message)) return 'good';
  return 'info';
}

function getSimulationStatusClass(message: string) {
  const tone = getSimulationStatusTone(message);
  if (tone === 'danger') return 'border-red-400/35 bg-red-500/10 text-red-300';
  if (tone === 'warning') return 'border-yellow-300/35 bg-yellow-300/10 text-yellow-200';
  if (tone === 'good') return 'border-emerald-300/35 bg-emerald-300/10 text-emerald-200';
  return 'border-neon-blue/35 bg-neon-blue/10 text-neon-blue';
}

function isMeaningfulAudioWorldEvent(event: WorldEvent) {
  if (event.kind === 'RUN_STARTED' || event.kind === 'RUN_ENDED') return false;
  if (event.intervention && (event.intervention.affected ?? 0) <= 0) return false;
  return true;
}

function latestEventId(events: WorldEvent[]) {
  return events.length > 0 ? events[events.length - 1]?.id ?? null : null;
}

function latestInteractionId(interactions: WorldInteractionEvent[]) {
  return interactions.length > 0 ? interactions[interactions.length - 1]?.id ?? null : null;
}

function createHudSnapshot(input: {
  stats: WorldStats;
  entities: EntityView[];
  events: WorldEvent[];
  interactions: WorldInteractionEvent[];
  traces: InterventionTrace[];
  runSession: RunSession | null;
  selectedEntity: Entity | null;
  now: number;
}): HudSnapshot {
  return {
    committedAt: Date.now(),
    sessionId: input.runSession?.id ?? null,
    selectedEntityId: input.selectedEntity?.id ?? null,
    latestEventId: latestEventId(input.events),
    latestInteractionId: latestInteractionId(input.interactions),
    traceCount: input.traces.length,
    stats: input.stats,
    entities: input.entities,
    events: input.events,
    interactions: input.interactions,
    traces: input.traces,
    now: input.now,
  };
}

const SimulationStage: React.FC<SimulationStageProps> = ({
  config,
  entities,
  stats,
  computeStatus,
  worldEvents,
  worldInteractions,
  runSession,
  runClockNow,
  isRunning,
  isSimulationToggling,
  isSettingsOpen,
  isInterventionPending,
  activeIntervention,
  isInterventionArmed,
  interventionBudget,
  pinnedSpecimen,
  interventionTraces,
  runHighlights,
  selectedEntity,
  isMicroArenaOpen,
  entityActionStatus,
  simulationStatus,
  isLeaping,
  onOpenSettings,
  onToggleSimulation,
  onRequestReview,
  onEntityClick,
  onInterferenceError,
  onWorldIntervention,
  onInterventionChange,
  onObjectiveCompleted,
  onMealRhythmCue,
  onRunHighlightsChange,
  onClearPinnedSpecimen,
  onCloseEntity,
  onOpenMicroArena,
  onCloseMicroArena,
  onForceMutation,
  onCancelIntervention,
  onShortcut,
  emitNarrativeAudio,
}) => {
  const objectiveCompletionSessionRef = useRef<string | null>(null);
  const completedObjectiveIdsRef = useRef<Set<string>>(new Set());
  const lastEntropyWarningAt = useRef(0);
  const lastDirectorCueAudioKeyRef = useRef('');
  const lastExperienceCueAudioKeyRef = useRef('');
  const lastActiveMomentAudioKeyRef = useRef('');
  const [hudSnapshot, setHudSnapshot] = useState(() =>
    createHudSnapshot({
      stats,
      entities,
      events: worldEvents,
      interactions: worldInteractions,
      traces: interventionTraces,
      runSession,
      selectedEntity,
      now: runClockNow,
    }),
  );

  useEffect(() => {
    const selectedEntityId = selectedEntity?.id ?? null;
    const nextLatestEventId = latestEventId(worldEvents);
    const nextLatestInteractionId = latestInteractionId(worldInteractions);
    const now = Date.now();
    setHudSnapshot((current) => {
      const shouldRefresh =
        current.sessionId !== (runSession?.id ?? null) ||
        current.selectedEntityId !== selectedEntityId ||
        current.latestEventId !== nextLatestEventId ||
        current.latestInteractionId !== nextLatestInteractionId ||
        current.traceCount !== interventionTraces.length ||
        now - current.committedAt >= HUD_SNAPSHOT_INTERVAL_MS;

      if (!shouldRefresh) return current;
      return createHudSnapshot({
        stats,
        entities,
        events: worldEvents,
        interactions: worldInteractions,
        traces: interventionTraces,
        runSession,
        selectedEntity,
        now: runClockNow,
      });
    });
  }, [entities, interventionTraces, runClockNow, runSession, selectedEntity, stats, worldEvents, worldInteractions]);

  const hudStats = hudSnapshot.stats;
  const hudEntities = hudSnapshot.entities;
  const hudEvents = hudSnapshot.events;
  const hudInteractions = hudSnapshot.interactions;
  const hudTraces = hudSnapshot.traces;
  const hudNow = hudSnapshot.now;

  const oracleAdvice = useMemo(
    () => deriveOracleAdvice({
      stats: hudStats,
      entities: hudEntities,
      events: hudEvents,
      session: runSession,
      budget: interventionBudget,
      phase: runSession?.phase,
      now: hudNow,
    }),
    [hudEntities, hudEvents, hudNow, hudStats, interventionBudget, runSession],
  );

  const directorCue = useMemo(
    () => deriveDirectorCue({
      session: runSession,
      stats: hudStats,
      entities: hudEntities,
      events: hudEvents,
      pinnedSpecimen,
      now: hudNow,
    }),
    [hudEntities, hudEvents, hudNow, hudStats, pinnedSpecimen, runSession],
  );

  const liveProtagonistRadar = useMemo(
    () => deriveLiveProtagonistRadar({ stats: hudStats, entities: hudEntities, events: hudEvents }),
    [hudEntities, hudEvents, hudStats],
  );

  const liveInteractionNetwork = useMemo(
    () => deriveLiveInteractionNetwork({
      stats: hudStats,
      entities: hudEntities,
      events: hudEvents,
      interactions: hudInteractions,
    }),
    [hudEntities, hudEvents, hudInteractions, hudStats],
  );

  const selectedEntityFateLine = useMemo<EntityFateLine | null>(
    () => selectedEntity
      ? deriveEntityFateLine({
          entityId: selectedEntity.id,
          traces: hudTraces,
          events: hudEvents,
          now: hudNow,
        })
      : null,
    [hudEvents, hudNow, hudTraces, selectedEntity],
  );

  const currentMealRhythm = useMemo(
    () => deriveMealRhythmCue({
      session: runSession,
      stats: hudStats,
      entities: hudEntities,
      events: hudEvents,
      budget: interventionBudget,
      highlights: runHighlights,
      now: hudNow,
    }),
    [hudEntities, hudEvents, hudNow, hudStats, interventionBudget, runHighlights, runSession],
  );

  const predictionProgress = useMemo(
    () => deriveMealRunPredictionProgress({
      prediction: runSession?.prediction,
      stats: hudStats,
      events: hudEvents,
    }),
    [hudEvents, hudStats, runSession?.prediction],
  );

  const runObjectives = useMemo(
    () => runSession
      ? deriveRunObjectives({
          session: runSession,
          stats: hudStats,
          entities: hudEntities,
          events: hudEvents,
          interventionTraces: hudTraces,
          now: hudNow,
        })
      : [],
    [hudEntities, hudEvents, hudNow, hudStats, hudTraces, runSession],
  );

  useEffect(() => {
    if (!runSession) {
      objectiveCompletionSessionRef.current = null;
      completedObjectiveIdsRef.current = new Set();
      return;
    }

    const completedNow = new Set(
      runObjectives
        .filter((objective) => objective.status === 'complete')
        .map((objective) => objective.id),
    );

    if (objectiveCompletionSessionRef.current !== runSession.id) {
      objectiveCompletionSessionRef.current = runSession.id;
      completedObjectiveIdsRef.current = completedNow;
      return;
    }

    const newlyCompleted = runObjectives.filter((objective) =>
      objective.status === 'complete' && !completedObjectiveIdsRef.current.has(objective.id),
    );
    completedObjectiveIdsRef.current = completedNow;

    if (newlyCompleted.length > 0) {
      onObjectiveCompleted(newlyCompleted[0]);
    }
  }, [onObjectiveCompleted, runObjectives, runSession]);

  const experienceCue = useMemo(
    () => deriveExperienceDirector({
      session: runSession,
      stats: hudStats,
      entities: hudEntities,
      events: hudEvents,
      objectives: runObjectives,
      traces: hudTraces,
      interactionNetwork: liveInteractionNetwork,
      mealRhythm: currentMealRhythm,
      predictionProgress,
      activeIntervention,
      isRunning,
      now: hudNow,
    }),
    [
      activeIntervention,
      currentMealRhythm,
      hudEntities,
      hudEvents,
      hudNow,
      hudStats,
      hudTraces,
      isRunning,
      liveInteractionNetwork,
      predictionProgress,
      runObjectives,
      runSession,
    ],
  );

  const latestMeaningfulWorldEvent = useMemo(
    () => hudEvents.slice().reverse().find(isMeaningfulAudioWorldEvent) ?? null,
    [hudEvents],
  );
  const latestArenaWorldEvent = latestMeaningfulWorldEvent;

  const activeMoment = useMemo(
    () => deriveActiveMoment({
      session: runSession,
      stats: hudStats,
      entities: hudEntities,
      isRunning,
      now: hudNow,
      selectedEntity,
      pinnedSpecimen,
      latestEvent: latestArenaWorldEvent,
      directorCue,
      experienceCue,
      oracleAdvice,
      objectives: runObjectives,
      traces: hudTraces,
      mealRhythm: currentMealRhythm,
    }),
    [
      currentMealRhythm,
      directorCue,
      experienceCue,
      hudEntities,
      hudNow,
      hudStats,
      hudTraces,
      isRunning,
      latestArenaWorldEvent,
      oracleAdvice,
      pinnedSpecimen,
      runObjectives,
      runSession,
      selectedEntity,
    ],
  );

  const arenaFateLine = useMemo<EntityFateLine | null>(() => {
    if (selectedEntityFateLine) return selectedEntityFateLine;
    const entityId = activeMoment?.target?.entityId;
    if (typeof entityId !== 'number') return null;
    return deriveEntityFateLine({
      entityId,
      traces: hudTraces,
      events: hudEvents,
      now: hudNow,
    });
  }, [activeMoment?.target?.entityId, hudEvents, hudNow, hudTraces, selectedEntityFateLine]);

  useEffect(() => {
    audioEngine.setGameState({
      stage: 'SIMULATION',
      isRunning,
      entropy: hudStats.entropy,
      avgGeneration: hudStats.avgGeneration,
      avgScore: hudStats.avgScore,
      population: hudStats.population,
      runId: runSession?.id,
      runTheme: runSession?.theme,
      runPhase: runSession?.phase,
      cueTone: experienceCue?.tone,
      recentEventKind: latestMeaningfulWorldEvent?.kind,
      recentEventSeverity: latestMeaningfulWorldEvent?.severity,
      pressure: experienceCue?.audioProfile.pressure ?? 0,
      interactionHeat: experienceCue?.audioProfile.interactionHeat ?? 0,
      interventionMomentum: experienceCue?.audioProfile.interventionMomentum ?? 0,
    });
  }, [
    experienceCue,
    hudStats.avgGeneration,
    hudStats.avgScore,
    hudStats.entropy,
    hudStats.population,
    isRunning,
    latestMeaningfulWorldEvent?.kind,
    latestMeaningfulWorldEvent?.severity,
    runSession?.id,
    runSession?.phase,
    runSession?.theme,
  ]);

  useEffect(() => {
    if (!isRunning || hudStats.entropy < 75) return;

    const now = Date.now();
    if (now - lastEntropyWarningAt.current > 15000) {
      lastEntropyWarningAt.current = now;
      emitNarrativeAudio('entropy_warning', `entropy:${runSession?.id ?? 'no-run'}:${Math.round(hudStats.entropy)}`);
    }
  }, [emitNarrativeAudio, hudStats.entropy, isRunning, runSession?.id]);

  useEffect(() => {
    if (!isRunning || !directorCue || !runSession) return;

    const audioKey = [
      runSession.id,
      directorCue.id,
      directorCue.entityId ?? 'world',
      directorCue.tone,
    ].join(':');
    if (audioKey === lastDirectorCueAudioKeyRef.current) return;

    lastDirectorCueAudioKeyRef.current = audioKey;
    emitNarrativeAudio(getDirectorCueAudioEvent(directorCue), `director:${audioKey}`);
  }, [directorCue, emitNarrativeAudio, isRunning, runSession]);

  useEffect(() => {
    if (!isRunning || !experienceCue?.audioEvent || !runSession) return;
    if (
      activeMoment?.source === 'intervention-trace' &&
      activeMoment.audioEvent === experienceCue.audioEvent
    ) {
      return;
    }

    const audioKey = [
      runSession.id,
      experienceCue.id,
      experienceCue.audioEvent,
    ].join(':');
    if (audioKey === lastExperienceCueAudioKeyRef.current) return;

    lastExperienceCueAudioKeyRef.current = audioKey;
    emitNarrativeAudio(experienceCue.audioEvent, `experience:${audioKey}`);
  }, [activeMoment?.audioEvent, activeMoment?.source, emitNarrativeAudio, experienceCue, isRunning, runSession]);

  useEffect(() => {
    if (!isRunning || !activeMoment?.audioEvent || !runSession) return;
    if (activeMoment.source === 'director-cue' || activeMoment.source === 'experience-cue') return;

    const audioKey = [
      runSession.id,
      activeMoment.id,
      activeMoment.audioEvent,
    ].join(':');
    if (audioKey === lastActiveMomentAudioKeyRef.current) return;

    lastActiveMomentAudioKeyRef.current = audioKey;
    emitNarrativeAudio(activeMoment.audioEvent, `moment:${audioKey}`);
  }, [activeMoment, emitNarrativeAudio, isRunning, runSession]);

  useEffect(() => {
    if (!isRunning || !currentMealRhythm) return;
    onMealRhythmCue(currentMealRhythm);
  }, [currentMealRhythm, isRunning, onMealRhythmCue]);

  const handleBookmarkHighlight = useCallback(() => {
    if (!isRunning || !runSession) {
      void audioEngine.emit('error');
      return;
    }

    const highlight = createRunHighlight({
      session: runSession,
      phase: runSession.phase,
      stats: hudStats,
      events: hudEvents,
      cue: directorCue,
      now: hudNow,
    });
    const nextHighlights = appendRunHighlight(runHighlights, highlight);
    onRunHighlightsChange(nextHighlights);
    void audioEngine.emit(nextHighlights === runHighlights ? 'error' : 'success');
  }, [directorCue, hudEvents, hudNow, hudStats, isRunning, onRunHighlightsChange, runHighlights, runSession]);

  useRunHotkeys({
    enabled: !isSettingsOpen && !isMicroArenaOpen,
    canControl: Boolean(runSession) && !isSimulationToggling && !isInterventionPending,
    isRunning,
    onToggle: onToggleSimulation,
    onReview: onRequestReview,
    onBookmark: handleBookmarkHighlight,
    onSelectIntervention: onInterventionChange,
    onEscape: () => {
      if (isInterventionArmed) {
        onCancelIntervention();
        return;
      }
      if (selectedEntity) {
        onCloseEntity();
        onShortcut('实体检查器已关闭。');
      }
    },
    onShortcut,
  });

  return (
    <>
      <button
        type="button"
        aria-label="打开环境参数"
        onMouseEnter={preloadSettingsModal}
        onFocus={preloadSettingsModal}
        onClick={onOpenSettings}
        className="interactive-focus absolute left-4 top-4 z-50 flex min-h-11 items-center gap-2 border border-white/10 bg-black/80 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.14em] text-white/65 backdrop-blur-md transition-[border-color,background-color,color] hover:border-neon-blue/40 hover:bg-black/90 hover:text-white lg:hidden"
      >
        <Settings size={12} aria-hidden="true" />
        环境参数
      </button>
      <img
        src="/media/phase-ribbon.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-36 w-full object-cover opacity-25"
      />
      {config.mode === 'LocalMock' && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-50 -translate-x-1/2 border border-yellow-300/40 bg-black/85 px-4 py-2 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-yellow-200 shadow-[0_0_24px_rgba(250,204,21,0.18)]">
          UI 沙盒 / 非真实 Rust 仿真
        </div>
      )}

      <Arena
        entities={entities}
        onEntityClick={onEntityClick}
        onInterferenceError={onInterferenceError}
        canInterfere={isRunning && isInterventionArmed && !isInterventionPending}
        activeIntervention={activeIntervention}
        activeMoment={activeMoment}
        directorCue={directorCue}
        experienceCue={experienceCue}
        interactionNetwork={liveInteractionNetwork}
        interventionTraces={interventionTraces}
        fateLine={arenaFateLine}
        latestWorldEvent={latestArenaWorldEvent}
        onWorldIntervention={onWorldIntervention}
        isLeaping={isLeaping}
        visualFidelity={config.visualFidelity}
      />

      <SimulationHud
        activeIntervention={activeIntervention}
        interventionArmed={isInterventionArmed}
        disabled={!isRunning || isSimulationToggling || isInterventionPending}
        interventionBudget={interventionBudget}
        runSession={runSession}
        oracleAdvice={oracleAdvice}
        runClockNow={hudNow}
        onInterventionChange={onInterventionChange}
        activeMoment={activeMoment}
        experienceCue={experienceCue}
        directorCue={directorCue}
        liveProtagonistRadar={liveProtagonistRadar}
        interventionTraces={hudTraces}
        runObjectives={runObjectives}
        runHighlightsCount={runHighlights.length}
        bookmarkDisabled={!isRunning || !runSession || isSimulationToggling || isInterventionPending}
        onBookmarkHighlight={handleBookmarkHighlight}
        stats={hudStats}
        entities={hudEntities}
        worldEvents={hudEvents}
        currentMealRhythm={currentMealRhythm}
        predictionProgress={predictionProgress}
        computeStatus={computeStatus}
        liveInteractionNetwork={liveInteractionNetwork}
        pinnedSpecimen={pinnedSpecimen}
        selectedEntity={selectedEntity}
        selectedEntityFateLine={selectedEntityFateLine}
        entityActionStatus={entityActionStatus}
        onClearPinnedSpecimen={onClearPinnedSpecimen}
        onCloseEntity={onCloseEntity}
        onOpenMicroArena={() => {
          preloadMicroArena();
          onOpenMicroArena();
        }}
        onForceMutation={onForceMutation}
      />

      {isMicroArenaOpen && selectedEntity && (
        <Suspense fallback={<DeferredStageFallback label="加载微观战场" />}>
          <MicroArena
            entityA={selectedEntity}
            onClose={onCloseMicroArena}
          />
        </Suspense>
      )}

      <footer className="hud-control-bar app-safe-floating-bottom absolute left-1/2 z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 px-2 py-2 animate-in fade-in slide-in-from-bottom-4 duration-700 sm:gap-3">
        <button
          type="button"
          onMouseEnter={() => void audioEngine.emit('hover')}
          onClick={onToggleSimulation}
          disabled={isSimulationToggling}
          aria-busy={isSimulationToggling}
          className={`
            interactive-focus flex min-h-11 items-center gap-2 px-5 py-3 sm:px-8
            font-black uppercase tracking-[0.16em] text-[10px]
            transition-[color,background-color,transform,border-color] duration-300
            disabled:cursor-wait disabled:opacity-55
            ${isRunning
              ? 'border border-white/10 bg-white/[0.04] text-white/55 hover:border-white/25 hover:text-white'
              : 'bg-white text-black pulse-glow hover:scale-[1.02]'}
          `}
        >
          {isSimulationToggling
            ? <><Pause size={16} aria-hidden="true" /> 切换中</>
            : isRunning
              ? <><Pause size={16} aria-hidden="true" /> 暂停协议</>
              : <><Play size={16} fill="currentColor" aria-hidden="true" /> 启动创世</>}
        </button>

        <button
          type="button"
          onMouseEnter={() => {
            preloadReviewStage();
            void audioEngine.emit('hover');
          }}
          onFocus={preloadReviewStage}
          onClick={onRequestReview}
          className="interactive-focus flex min-h-11 items-center gap-2 border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-white/55 transition-[border-color,background-color,color] hover:border-neon-blue/35 hover:bg-neon-blue/10 hover:text-white sm:px-6"
        >
          <FastForward size={14} aria-hidden="true" />
          终结并复盘
        </button>
        <button
          type="button"
          onMouseEnter={() => {
            preloadSettingsModal();
            void audioEngine.emit('hover');
          }}
          onFocus={preloadSettingsModal}
          onClick={onOpenSettings}
          className="interactive-focus hidden min-h-11 items-center gap-2 border border-white/10 bg-white/[0.04] px-4 py-3 text-[10px] font-mono uppercase tracking-[0.14em] text-white/55 transition-[border-color,background-color,color] hover:border-white/25 hover:bg-white/[0.08] hover:text-white lg:flex"
        >
          <Settings size={14} aria-hidden="true" />
          环境参数
        </button>
        {simulationStatus && (
          <p
            aria-live="polite"
            className={`w-full border px-3 py-1.5 text-center text-[9px] font-mono uppercase tracking-[0.14em] backdrop-blur-md ${getSimulationStatusClass(simulationStatus)}`}
          >
            {simulationStatus}
          </p>
        )}
      </footer>
    </>
  );
};

export default SimulationStage;
