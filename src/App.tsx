import { lazy, Suspense, type CSSProperties, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import GenesisGate from './components/GenesisGate';
import TitleBar from './components/TitleBar';
import { audioEngine, type AudioEvent } from './utils/audio/engine';
import { DEFAULT_APP_CONFIG, normalizeSettings, toBackendSettings, toUpdateSettingsArgs } from './utils/settings';
import { applyDisplaySettings } from './utils/windowControls';
import { calculateFallbackStats, parseWorldBinary } from './utils/worldBinary';
import {
  createRunSession,
  DEFAULT_RUN_LENGTH,
  DEFAULT_RUN_SPEED,
  DEFAULT_RUN_THEME,
  formatIntervention,
  formatRunLength,
  formatRunTheme,
  getRunPhase,
  shouldAutoReview,
} from './utils/runSession';
import {
  checkInterventionBudget,
  createInterventionBudget,
  formatBudgetValue,
  holdInterventionBudgetClock,
  refreshInterventionBudget,
  spendInterventionBudget,
  summarizeInterventionBudget,
} from './utils/interventionBudget';
import {
  createPinnedSpecimen,
  summarizePinnedSpecimen,
  updatePinnedSpecimen,
} from './utils/specimenDossier';
import { appendMealRhythmCue, deriveMealRhythmCue } from './utils/mealRhythm';
import {
  compactWorldEventEvidence,
  createWorldEvent,
  createWorldEventEvidenceSample,
  deriveWorldEvents,
  mergeWorldEvents,
  selectReviewEvents,
  type WorldEventEvidenceSample,
} from './utils/worldEvents';
import {
  applyChallengeConfigPatch,
  checkChallengeInterventionRules,
  describeChallengeRules,
} from './utils/challengeRules';
import {
  createInterventionTrace,
  updateInterventionTraces,
} from './utils/interventionTrace';
import { countEffectiveInterventions } from './utils/interventionKinds';
import type {
  AppConfig,
  ComputeStatus,
  Entity,
  EntityView,
  InterventionBudget,
  InterventionOutcome,
  InterventionTrace,
  MealRunLength,
  MealRunPrediction,
  MealRunTheme,
  MealRhythmCue,
  NextRunChallenge,
  PinnedSpecimen,
  PlayerInterventionKind,
  RunHighlight,
  RunObjective,
  RunPhase,
  RunSession,
  RunSpeed,
  RunSummary,
  WorldInteractionEvent,
  WorldEvent,
  WorldStats,
} from './types/world';

// 阶段定义
type AppStage = 'SPLASH' | 'CONFIG' | 'SIMULATION' | 'REVIEW';

const MotherMachine = lazy(() => import('./components/MotherMachine'));
const PhoenixReview = lazy(() => import('./components/PhoenixReview'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));
const SimulationStage = lazy(() => import('./components/SimulationStage'));

function preloadConfigStage() {
  void import('./components/MotherMachine');
}

function preloadSimulationStage() {
  void Promise.all([
    import('./components/SimulationStage'),
    import('./components/Arena'),
    import('./components/SimulationHud'),
  ]);
}

function preloadReviewStage() {
  void Promise.all([
    import('./components/PhoenixReview'),
    import('./utils/runSummary'),
  ]);
}

function preloadSettingsModal() {
  void import('./components/SettingsModal');
}

function preloadMicroArena() {
  void import('./components/MicroArena');
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

function createEmptyWorldStats(): WorldStats {
  return { avgScore: 0, population: 0, avgGeneration: 0, entropy: 0 };
}

function createEmptyComputeStatus(): ComputeStatus {
  return {
    requested_backend: 'Auto',
    active_backend: 'CPU',
    cuda_available: false,
    device_name: null,
    compute_capability: null,
    vram_total: 0,
    vram_free: 0,
    gpu_load: 0,
    temperature: 0,
    last_kernel_ms: 0,
    fallback_reason: 'Compute status not loaded yet',
    adaptive_scale: 1,
    effective_entity_cap: 0,
  };
}

function createSandboxEntityDetail(entity: EntityView): Entity {
  const fitness = Math.max(1, Math.round(entity.score));
  const attack = Math.max(1, Math.round(entity.score / 8));
  const defense = Math.max(1, Math.round(entity.energy / 12));
  const efficiency = Math.max(0.1, Math.min(1, entity.energy / 100));

  return {
    ...entity,
    dna: [
      '(module',
      '  (func (export "calculate_fitness") (result i32)',
      `    i32.const ${fitness}`,
      '  )',
      ')',
    ].join('\n'),
    stats: {
      attack,
      defense,
      tech_level: Math.max(1, entity.generation),
      efficiency,
    },
  };
}

const interventionAudioEvent: Record<PlayerInterventionKind, 'intervention_bless' | 'intervention_poison' | 'intervention_quarantine' | 'intervention_exile' | 'intervention_pin'> = {
  BLESS: 'intervention_bless',
  POISON: 'intervention_poison',
  QUARANTINE: 'intervention_quarantine',
  EXILE: 'intervention_exile',
  PIN_OBSERVE: 'intervention_pin',
};

function selectWorldEventAudioEvent(events: WorldEvent[]): AudioEvent | null {
  const priority: Array<{ kinds: WorldEvent['kind'][]; event: AudioEvent }> = [
    { kinds: ['MASS_EXTINCTION', 'ENERGY_FAMINE'], event: 'crisis_surge' },
    { kinds: ['TOXIN_CRISIS', 'PREDATOR_RAID'], event: 'director_danger_cue' },
    { kinds: ['GENERATION_LEAP'], event: 'mutation_surge' },
    { kinds: ['FIRST_APEX', 'LINEAGE_FOUNDER', 'GOLDEN_AGE', 'HALL_OF_FAME'], event: 'objective_complete' },
    { kinds: ['COOPERATION_CLUSTER', 'RESOURCE_BLOOM'], event: 'success' },
  ];
  for (const item of priority) {
    if (events.some((event) => item.kinds.includes(event.kind))) return item.event;
  }
  return null;
}

const narrativeAudioPriority: Partial<Record<AudioEvent, number>> = {
  crisis_surge: 100,
  entropy_warning: 88,
  director_danger_cue: 84,
  objective_complete: 68,
  fate_resolved: 64,
  mutation_surge: 58,
  director_target_lock: 42,
  director_cue: 24,
  success: 18,
};

const NARRATIVE_AUDIO_SUPPRESSION_MS = 4_500;

function countInterventionEvents(events: WorldEvent[]): Record<PlayerInterventionKind, number> {
  return countEffectiveInterventions(events);
}

async function logSafely(module: string, content: string) {
  try {
    await invoke('logger', { module, content });
  } catch (e) {
    console.error('写入运行日志失败:', e);
  }
}

function App() {
  const [stage, setStage] = useState<AppStage>('SPLASH');
  const [entities, setEntities] = useState<EntityView[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSimulationToggling, setIsSimulationToggling] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [stats, setStats] = useState<WorldStats>(createEmptyWorldStats());
  const [computeStatus, setComputeStatus] = useState<ComputeStatus>(createEmptyComputeStatus());
  const [isLeaping] = useState(false);
  const [config, setConfig] = useState<AppConfig>(DEFAULT_APP_CONFIG);
  const [isMicroArenaOpen, setIsMicroArenaOpen] = useState(false);
  const [entityActionStatus, setEntityActionStatus] = useState('');
  const [simulationStatus, setSimulationStatus] = useState('');
  const [reviewStatus, setReviewStatus] = useState('');
  const [runSession, setRunSession] = useState<RunSession | null>(null);
  const [pendingRunPreset, setPendingRunPreset] = useState<{ runLength: MealRunLength; runSpeed: RunSpeed; runTheme?: MealRunTheme; title?: string; loadedChallenge?: NextRunChallenge } | null>(null);
  const [worldEvents, setWorldEvents] = useState<WorldEvent[]>([]);
  const [worldInteractions, setWorldInteractions] = useState<WorldInteractionEvent[]>([]);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [activeIntervention, setActiveIntervention] = useState<PlayerInterventionKind>('BLESS');
  const [isInterventionArmed, setIsInterventionArmed] = useState(false);
  const [isInterventionPending, setIsInterventionPending] = useState(false);
  const [interventionBudget, setInterventionBudget] = useState<InterventionBudget | null>(null);
  const [pinnedSpecimen, setPinnedSpecimen] = useState<PinnedSpecimen | null>(null);
  const [interventionTraces, setInterventionTraces] = useState<InterventionTrace[]>([]);
  const [runHighlights, setRunHighlights] = useState<RunHighlight[]>([]);
  const [, setMealRhythmHistory] = useState<MealRhythmCue[]>([]);
  const [runClockNow, setRunClockNow] = useState(() => Date.now());
  const lastWorldErrorAt = useRef(0);
  const autoReviewTriggeredRef = useRef(false);
  const manualReviewConfirmUntilRef = useRef(0);
  const simulationToggleInFlightRef = useRef(false);
  const interventionInFlightRef = useRef(false);
  const narrativeAudioGateRef = useRef<{
    lastAt: number;
    lastPriority: number;
    lastSourceKey: string;
    flushTimer: number | null;
    pending: { event: AudioEvent; sourceKey: string; priority: number } | null;
  }>({
    lastAt: 0,
    lastPriority: 0,
    lastSourceKey: '',
    flushTimer: null,
    pending: null,
  });
  const worldEventsRef = useRef<WorldEvent[]>([]);
  const worldEventEvidenceRef = useRef<WorldEventEvidenceSample[]>([]);
  const runSessionRef = useRef<RunSession | null>(null);
  const interventionBudgetRef = useRef<InterventionBudget | null>(null);
  const pinnedSpecimenRef = useRef<PinnedSpecimen | null>(null);
  const interventionTracesRef = useRef<InterventionTrace[]>([]);
  const runHighlightsRef = useRef<RunHighlight[]>([]);
  const mealRhythmHistoryRef = useRef<MealRhythmCue[]>([]);
  const lastWorldSnapshotRef = useRef<{
    stats: WorldStats | null;
    entities: EntityView[];
    phase: RunPhase;
  }>({ stats: null, entities: [], phase: 'GENESIS' });

  const emitNarrativeAudio = useCallback((event: AudioEvent, sourceKey: string) => {
    const priority = narrativeAudioPriority[event] ?? 0;
    const gate = narrativeAudioGateRef.current;
    const now = Date.now();
    const recentlyPlayed = now - gate.lastAt < NARRATIVE_AUDIO_SUPPRESSION_MS;
    if (
      recentlyPlayed &&
      sourceKey !== gate.lastSourceKey &&
      priority <= gate.lastPriority
    ) {
      return;
    }

    if (!gate.pending || priority >= gate.pending.priority) {
      gate.pending = { event, sourceKey, priority };
    }
    if (gate.flushTimer !== null) return;

    gate.flushTimer = window.setTimeout(() => {
      const next = gate.pending;
      gate.pending = null;
      gate.flushTimer = null;
      if (!next) return;

      const playedAt = Date.now();
      const stillRecent = playedAt - gate.lastAt < NARRATIVE_AUDIO_SUPPRESSION_MS;
      if (
        stillRecent &&
        next.sourceKey !== gate.lastSourceKey &&
        next.priority <= gate.lastPriority
      ) {
        return;
      }

      gate.lastAt = playedAt;
      gate.lastPriority = next.priority;
      gate.lastSourceKey = next.sourceKey;
      void audioEngine.emit(next.event);
    }, 0);
  }, []);

  const syncBackendSettings = useCallback(async (nextConfig: AppConfig) => {
    if (nextConfig.mode === 'LocalMock') return;
    await invoke('update_settings', toUpdateSettingsArgs(nextConfig));
  }, []);

  const createRuntimeConfigForSpeed = useCallback((baseConfig: AppConfig, speed: RunSpeed) => {
    return normalizeSettings({
      ...baseConfig,
      evolutionThrottle: Math.max(16, Math.floor(baseConfig.evolutionThrottle / speed)),
    });
  }, []);

  const appendWorldEvents = useCallback((nextEvents: WorldEvent[]) => {
    if (nextEvents.length === 0) return;
    setWorldEvents((current) => {
      const merged = mergeWorldEvents(current, nextEvents);
      worldEventsRef.current = merged;
      return merged;
    });
    const audioEvent = selectWorldEventAudioEvent(nextEvents);
    if (audioEvent) {
      const primary = nextEvents
        .slice()
        .sort((left, right) =>
          (narrativeAudioPriority[selectWorldEventAudioEvent([right]) ?? 'success'] ?? 0) -
          (narrativeAudioPriority[selectWorldEventAudioEvent([left]) ?? 'success'] ?? 0),
        )[0];
      emitNarrativeAudio(audioEvent, `world:${primary?.id ?? nextEvents.map((event) => event.kind).join('+')}`);
    }
  }, [emitNarrativeAudio]);

  useEffect(() => {
    worldEventsRef.current = worldEvents;
  }, [worldEvents]);

  useEffect(() => {
    runSessionRef.current = runSession;
  }, [runSession]);

  const setSyncedInterventionBudget = useCallback((budget: InterventionBudget | null) => {
    interventionBudgetRef.current = budget;
    setInterventionBudget(budget);
  }, []);

  const setSyncedPinnedSpecimen = useCallback((specimen: PinnedSpecimen | null) => {
    pinnedSpecimenRef.current = specimen;
    setPinnedSpecimen(specimen);
  }, []);

  const setSyncedInterventionTraces = useCallback((traces: InterventionTrace[]) => {
    interventionTracesRef.current = traces;
    setInterventionTraces(traces);
  }, []);

  const setSyncedRunHighlights = useCallback((highlights: RunHighlight[]) => {
    runHighlightsRef.current = highlights;
    setRunHighlights(highlights);
  }, []);

  const setSyncedMealRhythmHistory = useCallback((history: MealRhythmCue[]) => {
    mealRhythmHistoryRef.current = history;
    setMealRhythmHistory(history);
  }, []);

  const handleObjectiveCompleted = useCallback((objective: RunObjective) => {
    const session = runSessionRef.current;
    setSimulationStatus(`目标完成：${objective.title}`);
    emitNarrativeAudio('objective_complete', `objective:${session?.id ?? 'no-run'}:${objective.id}`);
  }, [emitNarrativeAudio]);

  const handleMealRhythmCue = useCallback((cue: MealRhythmCue) => {
    const previous = mealRhythmHistoryRef.current;
    const next = appendMealRhythmCue(previous, cue);
    if (next !== previous) {
      setSyncedMealRhythmHistory(next);
    }
  }, [setSyncedMealRhythmHistory]);

  const handleCancelIntervention = useCallback(() => {
    setIsInterventionArmed(false);
    setSimulationStatus('已解除干预武装。');
  }, []);

  const handleCloseEntity = useCallback(() => {
    setSelectedEntity(null);
    setEntityActionStatus('');
  }, []);

  const handleInterventionChange = useCallback((kind: PlayerInterventionKind) => {
    const session = runSessionRef.current;
    if (!isRunning || !session) {
      setSimulationStatus('下饭局暂停或未启动，无法武装干预。');
      setIsInterventionArmed(false);
      void audioEngine.emit('error');
      return;
    }
    const ruleCheck = checkChallengeInterventionRules({
      challenge: session.loadedChallenge,
      kind,
      counts: countInterventionEvents(worldEventsRef.current),
    });
    if (!ruleCheck.allowed) {
      setSimulationStatus(ruleCheck.reason);
      setIsInterventionArmed(false);
      void audioEngine.emit('error');
      return;
    }
    setActiveIntervention(kind);
    setIsInterventionArmed(true);
    if (stage === 'SIMULATION') {
      setSimulationStatus(`已武装${formatIntervention(kind)}，下一次点击 Arena 坐标或实体才会生效。`);
    }
    void audioEngine.emit('click');
  }, [isRunning, stage]);

  const resetWorldView = useCallback((status = '') => {
    setSelectedEntity(null);
    setIsMicroArenaOpen(false);
    setEntityActionStatus(status);
    setIsInterventionArmed(false);
    setSyncedPinnedSpecimen(null);
    setSyncedInterventionTraces([]);
    setSyncedRunHighlights([]);
    setSyncedMealRhythmHistory([]);
    setEntities([]);
    setStats(createEmptyWorldStats());
    setWorldInteractions([]);
    worldEventEvidenceRef.current = [];
    lastWorldSnapshotRef.current = { stats: null, entities: [], phase: 'GENESIS' };
  }, [setSyncedInterventionTraces, setSyncedMealRhythmHistory, setSyncedPinnedSpecimen, setSyncedRunHighlights]);

  useEffect(() => {
    const initSettings = async () => {
      try {
        const saved = await invoke<any>('load_settings');
        if (saved) {
          const normalized = normalizeSettings(saved);
          setConfig(normalized);
          audioEngine.setSettings(normalized);
          await applyDisplaySettings(normalized);
          await logSafely('System', 'Initial settings applied successfully');
        }
      } catch (e) {
        await logSafely('System', 'No initial settings to apply');
      }
    };
    initSettings();
  }, []);

  useEffect(() => {
    if (stage === 'SPLASH') {
      const preloadTimer = window.setTimeout(preloadConfigStage, 900);
      return () => window.clearTimeout(preloadTimer);
    }
    if (stage === 'CONFIG') {
      preloadSimulationStage();
      preloadSettingsModal();
    }
    if (stage === 'SIMULATION') {
      preloadSettingsModal();
    }
    return undefined;
  }, [stage]);

  useEffect(() => {
    if (selectedEntity) {
      preloadMicroArena();
    }
  }, [selectedEntity]);

  // Audio settings are frontend-owned but saved through the shared settings file.
  useEffect(() => {
    audioEngine.setSettings(config);
  }, [config.audioEnabled, config.masterVolume, config.musicVolume, config.sfxVolume, config.adaptiveMusic]);

  useEffect(() => {
    const handleAudioError = (event: Event) => {
      const detail = (event as CustomEvent<{ action?: string; message?: string }>).detail;
      const message = detail?.message || '音频上下文初始化失败';
      const status = `音频设备不可用：${message}`;
      if (stage === 'SIMULATION') {
        setSimulationStatus(status);
      } else {
        setReviewStatus(status);
      }
      void logSafely('Audio', `${detail?.action ?? 'unknown'} failed: ${message}`);
    };

    window.addEventListener('vgene:audio-error', handleAudioError);
    return () => window.removeEventListener('vgene:audio-error', handleAudioError);
  }, [stage]);

  useEffect(() => {
    return () => {
      const gate = narrativeAudioGateRef.current;
      if (gate.flushTimer !== null) {
        window.clearTimeout(gate.flushTimer);
        gate.flushTimer = null;
      }
      gate.pending = null;
    };
  }, []);

  // 非局内阶段由 App 控制；局内阶段交给懒加载的 SimulationStage 注入导演/体验压力。
  useEffect(() => {
    if (stage === 'SIMULATION') return;
    audioEngine.setGameState({
      stage,
      isRunning,
      entropy: stats.entropy,
      avgGeneration: stats.avgGeneration,
      avgScore: stats.avgScore,
      population: stats.population,
      runId: runSession?.id,
      runTheme: runSession?.theme,
      runPhase: runSession?.phase,
      pressure: 0,
      interactionHeat: 0,
      interventionMomentum: 0,
    });
  }, [
    isRunning,
    runSession?.id,
    runSession?.phase,
    runSession?.theme,
    stage,
    stats.avgGeneration,
    stats.avgScore,
    stats.entropy,
    stats.population,
  ]);

  useEffect(() => {
    if (stage !== 'SIMULATION' || !runSession) return;
    const timer = window.setInterval(() => setRunClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [stage, runSession]);

  useEffect(() => {
    let cancelled = false;
    const refreshComputeStatus = async () => {
      try {
        const status = await invoke<ComputeStatus>('get_compute_status');
        if (!cancelled) {
          setComputeStatus(status);
        }
      } catch (e) {
        if (!cancelled) {
          setComputeStatus((current) => ({
            ...current,
            fallback_reason: `计算后端状态读取失败：${e instanceof Error ? e.message : String(e)}`,
          }));
        }
      }
    };

    void refreshComputeStatus();
    if (stage !== 'SIMULATION') return () => {
      cancelled = true;
    };
    const timer = window.setInterval(refreshComputeStatus, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [stage]);

  useEffect(() => {
    if (!isRunning || stage !== 'SIMULATION') return undefined;

    let cancelled = false;
    let inFlight = false;
    let timeoutId: number | null = null;
    const mode = config?.mode;
    const maxEntities = config?.maxEntities || 50;

    const scheduleNextPoll = () => {
      if (cancelled) return;
      timeoutId = window.setTimeout(pollWorld, 100);
    };

    async function pollWorld() {
      if (cancelled || inFlight) {
        scheduleNextPoll();
        return;
      }
      inFlight = true;
      try {
        let worldState: EntityView[];
        let nextStats: WorldStats;
        let nextInteractions: WorldInteractionEvent[] = [];

        if (mode === 'LocalMock') {
          // 生成模拟数据
          worldState = Array.from({ length: maxEntities }).map((_, i) => ({
            id: i,
            position: [
              (Math.random() - 0.5) * 20,
              (Math.random() - 0.5) * 20,
              (Math.random() - 0.5) * 20
            ],
            ethics: { altruism: Math.random(), collaboration: Math.random() },
            score: Math.random() * 100,
            energy: Math.random() * 100,
            metabolic_toxin: Math.random() * 0.5,
            generation: Math.floor(Math.random() * 10)
          }));
          nextStats = calculateFallbackStats(worldState);
        } else {
          // Phase 1: backend returns raw binary: entity records + optional stats tail.
          const worldData = await invoke<number[]>('get_world_binary');
          const parsedWorld = parseWorldBinary(worldData);
          worldState = parsedWorld.entities;
          nextStats = parsedWorld.stats ?? calculateFallbackStats(worldState);
          nextInteractions = await invoke<WorldInteractionEvent[]>('get_recent_interactions');
        }
        setStats(nextStats);
        setEntities(worldState);
        setWorldInteractions(nextInteractions);
        const traceNow = Date.now();
        if (interventionTracesRef.current.length > 0) {
          setSyncedInterventionTraces(updateInterventionTraces(
            interventionTracesRef.current,
            worldState,
            traceNow,
          ));
        }
        const session = runSessionRef.current;
        if (session) {
          const previous = lastWorldSnapshotRef.current;
          const phase = getRunPhase(session, nextStats);
          if (phase !== session.phase) {
            setRunSession((current) => current ? { ...current, phase } : current);
            runSessionRef.current = { ...session, phase };
          }
          const updatedSession = { ...session, phase };
          const evidenceSample = createWorldEventEvidenceSample({
            timestamp: traceNow,
            phase,
            stats: nextStats,
            entities: worldState,
          });
          const evidence = compactWorldEventEvidence(
            worldEventEvidenceRef.current,
            evidenceSample,
            updatedSession,
          );
          worldEventEvidenceRef.current = evidence;
          const nextEvents = deriveWorldEvents({
            session: updatedSession,
            previousStats: previous.stats,
            previousEntities: previous.entities,
            stats: nextStats,
            entities: worldState,
            previousPhase: previous.phase,
            phase,
            existingEvents: worldEventsRef.current,
            evidence,
            timestamp: traceNow,
          });
          appendWorldEvents(nextEvents);
          lastWorldSnapshotRef.current = { stats: nextStats, entities: worldState, phase };
        }
      } catch (e) {
        console.error("获取世界状态失败:", e);
        const now = Date.now();
        if (now - lastWorldErrorAt.current > 5000) {
          lastWorldErrorAt.current = now;
          setSimulationStatus(`世界状态读取失败：${e instanceof Error ? e.message : String(e)}`);
        }
      } finally {
        inFlight = false;
        scheduleNextPoll();
      }
    }

    void pollWorld();

    return () => {
      cancelled = true;
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [appendWorldEvents, config?.maxEntities, config?.mode, isRunning, setSyncedInterventionTraces, stage]);

  useEffect(() => {
    if (!selectedEntity || entities.length === 0) return;

    const liveEntity = entities.find((entity) => entity.id === selectedEntity.id);
    if (!liveEntity) {
      setSelectedEntity(null);
      setIsMicroArenaOpen(false);
      setEntityActionStatus('所选实体已从当前世界消亡。');
      return;
    }

    setSelectedEntity((current) => {
      if (!current || current.id !== liveEntity.id) return current;
      return {
        ...current,
        ...liveEntity,
      };
    });
  }, [entities, selectedEntity?.id]);

  useEffect(() => {
    const specimen = pinnedSpecimenRef.current;
    const session = runSessionRef.current;
    if (!specimen || !session) return;

    const updated = updatePinnedSpecimen(specimen, entities, session.phase, runClockNow);
    if (updated !== specimen) {
      setSyncedPinnedSpecimen(updated);
    }
  }, [entities, runClockNow, runSession?.phase, setSyncedPinnedSpecimen]);

  // 处理实体点击事件
  const handleEntityClick = async (entity: EntityView) => {
    setEntityActionStatus('');
    try {
      if (config?.mode === 'LocalMock') {
        setSelectedEntity(createSandboxEntityDetail(entity));
        void audioEngine.emit('entity_select');
      } else {
        const fullEntity = await invoke<Entity>('get_entity_detail', { entityId: entity.id });
        setSelectedEntity(fullEntity);
        void audioEngine.emit('entity_select');
      }
    } catch (e) {
      console.error("获取实体详情失败:", e);
      setEntityActionStatus('实体详情读取失败，请查看运行日志。');
      void audioEngine.emit('error');
    }
  };

  // 处理进入配置
  const handleGoToConfig = (initialConfig: any) => {
    preloadConfigStage();
    setConfig(normalizeSettings({ ...config, ...initialConfig }));
    setPendingRunPreset(null);
    setStage('CONFIG');
  };

  // 处理开始模拟
  const handleStart = async (
    finalConfig: any,
    runOptions: { runLength: MealRunLength; runSpeed: RunSpeed; runTheme: MealRunTheme; runPrediction?: MealRunPrediction; loadedChallenge?: NextRunChallenge } = {
      runLength: DEFAULT_RUN_LENGTH,
      runSpeed: DEFAULT_RUN_SPEED,
      runTheme: DEFAULT_RUN_THEME,
    },
  ) => {
    preloadSimulationStage();
    const mergedConfig = normalizeSettings({ ...config, ...finalConfig });
    const challengeConfig = applyChallengeConfigPatch(mergedConfig, runOptions.loadedChallenge);
    const runtimeConfig = createRuntimeConfigForSpeed(challengeConfig, runOptions.runSpeed);
    const nextSession = createRunSession(runOptions.runLength, runOptions.runSpeed, runOptions.runTheme, Date.now(), runOptions.runPrediction, runOptions.loadedChallenge);
    const nextBudget = createInterventionBudget(runOptions.runLength, nextSession.startedAt);
    const challengeRulesText = describeChallengeRules(runOptions.loadedChallenge?.rules);
    const startEvent = createWorldEvent({
      kind: 'RUN_STARTED',
      title: '下饭局开场',
      detail: `局长 ${formatRunLength(runOptions.runLength)}，倍率 ${runOptions.runSpeed}x，主题 ${formatRunTheme(nextSession.theme)}${runOptions.runPrediction ? `，餐前押题「${runOptions.runPrediction.title}」` : ''}${runOptions.loadedChallenge ? `，载入挑战「${runOptions.loadedChallenge.title}」` : ''}${challengeRulesText ? `，规则：${challengeRulesText}` : ''}。真实世界事件将从仿真数据中生成。`,
      phase: nextSession.phase,
      timestamp: nextSession.startedAt,
      severity: 'info',
    });
    let backendStarted = false;
    try {
      setSimulationStatus('');
      if (mergedConfig.mode !== 'LocalMock') {
        await syncBackendSettings(runtimeConfig);
        await invoke('start_sim');
        backendStarted = true;
      }
      await invoke('save_settings', { settings: toBackendSettings(mergedConfig) });
      setConfig(mergedConfig);
      setPendingRunPreset(null);
      setRunSession(nextSession);
      runSessionRef.current = nextSession;
      setSyncedInterventionBudget(nextBudget);
      setSyncedPinnedSpecimen(null);
      setSyncedInterventionTraces([]);
      setSyncedRunHighlights([]);
      setSyncedMealRhythmHistory([]);
      setIsInterventionArmed(false);
      setActiveIntervention(runOptions.loadedChallenge?.rules?.allowedInterventions?.[0] ?? 'BLESS');
      setWorldEvents([startEvent]);
      setWorldInteractions([]);
      worldEventsRef.current = [startEvent];
      worldEventEvidenceRef.current = [];
      setRunSummary(null);
      setRunClockNow(Date.now());
      autoReviewTriggeredRef.current = false;
      lastWorldSnapshotRef.current = { stats: null, entities: [], phase: nextSession.phase };
      void audioEngine.emit('start');
      setIsRunning(true);
      setStage('SIMULATION');
    } catch (e) {
      console.error('启动模拟失败:', e);
      if (backendStarted) {
        try {
          await invoke('stop_sim');
        } catch (stopError) {
          console.error('启动失败后的停止模拟也失败:', stopError);
        }
      }
      setIsRunning(false);
      setRunSession(null);
      runSessionRef.current = null;
      setSyncedInterventionBudget(null);
      setSyncedPinnedSpecimen(null);
      setSyncedInterventionTraces([]);
      setSyncedRunHighlights([]);
      setSyncedMealRhythmHistory([]);
      setIsInterventionArmed(false);
      setWorldEvents([]);
      setWorldInteractions([]);
      worldEventsRef.current = [];
      worldEventEvidenceRef.current = [];
      setSimulationStatus(`启动失败：${e instanceof Error ? e.message : String(e)}`);
      void audioEngine.emit('error');
      throw e;
    }
  };

  // 处理更新设置
  const handleUpdateSettings = async (
    newConfig: any,
    context?: { currentConfig?: AppConfig },
  ) => {
     const mergedConfig = normalizeSettings({ ...config, ...newConfig });
     const previousConfig = normalizeSettings(context?.currentConfig ?? config);
     const taskChanged = previousConfig.taskId !== mergedConfig.taskId;
     const worldSourceChanged =
       previousConfig.mode !== mergedConfig.mode &&
       (previousConfig.mode === 'LocalMock' || mergedConfig.mode === 'LocalMock');
     const shouldResetWorldView = taskChanged || worldSourceChanged;
     setSimulationStatus('');

     if (isRunning && previousConfig.mode !== 'LocalMock' && mergedConfig.mode === 'LocalMock') {
       await invoke('stop_sim');
       if (shouldResetWorldView) {
         resetWorldView('世界来源已切换，当前种群视图已清空。');
       }
       setConfig(mergedConfig);
       audioEngine.setSettings(mergedConfig);
       return;
     }

     if (mergedConfig.mode !== 'LocalMock') {
       const backendConfig = isRunning
         ? createRuntimeConfigForSpeed(mergedConfig, runSessionRef.current?.speed ?? DEFAULT_RUN_SPEED)
         : mergedConfig;
       await syncBackendSettings(backendConfig);
       if (isRunning && previousConfig.mode === 'LocalMock') {
         await invoke('start_sim');
       }
     }

     if (shouldResetWorldView) {
       resetWorldView(taskChanged ? '任务已切换，当前种群视图已清空。' : '世界来源已切换，当前种群视图已清空。');
     }
     setConfig(mergedConfig);
     audioEngine.setSettings(mergedConfig);
   };

  // 切换模拟状态
  const toggleSimulation = async () => {
    if (simulationToggleInFlightRef.current) {
      setSimulationStatus('协议状态切换中，请稍候。');
      return;
    }
    simulationToggleInFlightRef.current = true;
    setIsSimulationToggling(true);
    try {
      setSimulationStatus('');
      if (isRunning) {
        const now = Date.now();
        const session = runSessionRef.current;
        const budget = interventionBudgetRef.current;
        if (session && budget) {
          setSyncedInterventionBudget(holdInterventionBudgetClock(refreshInterventionBudget(budget, session, now), now));
        }
        if (config?.mode !== 'LocalMock') {
          await invoke('stop_sim');
        }
        void audioEngine.emit('pause');
        setIsInterventionArmed(false);
        setIsRunning(false);
      } else {
        const budget = interventionBudgetRef.current;
        if (budget) {
          setSyncedInterventionBudget(holdInterventionBudgetClock(budget, Date.now()));
        }
        if (config?.mode !== 'LocalMock') {
          await syncBackendSettings(createRuntimeConfigForSpeed(config, runSessionRef.current?.speed ?? DEFAULT_RUN_SPEED));
          await invoke('start_sim');
        }
        void audioEngine.emit('resume');
        setIsRunning(true);
      }
    } catch (e) {
      console.error('切换模拟状态失败:', e);
      setSimulationStatus(`状态切换失败：${e instanceof Error ? e.message : String(e)}`);
      void audioEngine.emit('error');
    } finally {
      simulationToggleInFlightRef.current = false;
      setIsSimulationToggling(false);
    }
  };

  const handleEndAndReview = async () => {
    manualReviewConfirmUntilRef.current = 0;
    setReviewStatus('');
    try {
      if (isRunning && config?.mode !== 'LocalMock') {
        await invoke('stop_sim');
      }
    } catch (e) {
      console.error('停止模拟失败:', e);
    }
    const session = runSessionRef.current;
    if (session) {
      const endedAt = Date.now();
      const phase = getRunPhase(session, stats, endedAt);
      const finalSession = { ...session, phase };
      const finalBudget = interventionBudgetRef.current
        ? refreshInterventionBudget(interventionBudgetRef.current, finalSession, endedAt)
        : null;
      if (finalBudget) {
        setSyncedInterventionBudget(finalBudget);
      }
      const finalSpecimen = pinnedSpecimenRef.current
        ? updatePinnedSpecimen(pinnedSpecimenRef.current, entities, phase, endedAt)
        : null;
      if (finalSpecimen) {
        setSyncedPinnedSpecimen(finalSpecimen);
      }
      const finalInterventionTraces = updateInterventionTraces(
        interventionTracesRef.current,
        entities,
        endedAt,
      );
      setSyncedInterventionTraces(finalInterventionTraces);
      const endEvent = createWorldEvent({
        kind: 'RUN_ENDED',
        title: '下饭局终局',
        detail: `本局结束于${phase}期，最终种群 ${stats.population}。`,
        phase,
        timestamp: endedAt,
        severity: stats.population <= 2 ? 'danger' : 'info',
      });
      const finalEvents = mergeWorldEvents(worldEventsRef.current, [endEvent]);
      setWorldEvents(finalEvents);
      worldEventsRef.current = finalEvents;
      const finalMealRhythmHistory = appendMealRhythmCue(
        mealRhythmHistoryRef.current,
        deriveMealRhythmCue({
          session: finalSession,
          stats,
          entities,
          events: finalEvents,
          budget: finalBudget,
          highlights: runHighlightsRef.current,
          now: endedAt,
        }),
      );
      setSyncedMealRhythmHistory(finalMealRhythmHistory);
      const { summarizeRun } = await import('./utils/runSummary');
      const summary = summarizeRun({
        session: finalSession,
        stats,
        events: finalEvents,
        entities,
        highlights: runHighlightsRef.current,
        mealRhythm: finalMealRhythmHistory,
        interventionTraces: finalInterventionTraces,
        interventionBudget: finalBudget ? summarizeInterventionBudget(finalBudget, finalSession, endedAt) : undefined,
        pinnedSpecimen: summarizePinnedSpecimen(finalSpecimen, endedAt),
        endedAt,
      });
      setRunSummary({ ...summary, keyEvents: selectReviewEvents(finalEvents) });
    }
    setIsRunning(false);
    setIsInterventionArmed(false);
    preloadReviewStage();
    void audioEngine.emit('review');
    setStage('REVIEW');
  };

  const requestEndAndReview = () => {
    const now = Date.now();
    if (now <= manualReviewConfirmUntilRef.current) {
      manualReviewConfirmUntilRef.current = 0;
      preloadReviewStage();
      void handleEndAndReview();
      return;
    }

    manualReviewConfirmUntilRef.current = now + 2500;
    preloadReviewStage();
    setSimulationStatus('再按 R 或再点一次终结并复盘，确认结束本局。');
    emitNarrativeAudio('director_cue', `manual-review:${runSessionRef.current?.id ?? 'no-run'}`);
  };

  const handleReviewReset = async () => {
    setReviewStatus('');
    try {
      if (config?.mode !== 'LocalMock') {
        await invoke('reset_sim');
      }
      resetWorldView();
      setIsRunning(false);
      setRunSession(null);
      runSessionRef.current = null;
      setSyncedInterventionBudget(null);
      setSyncedInterventionTraces([]);
      setWorldEvents([]);
      setWorldInteractions([]);
      worldEventsRef.current = [];
      worldEventEvidenceRef.current = [];
      setRunSummary(null);
      autoReviewTriggeredRef.current = false;
      setSimulationStatus('');
      setStage('SPLASH');
    } catch (e) {
      console.error('重置模拟失败:', e);
      setReviewStatus(`重置失败：${e instanceof Error ? e.message : String(e)}`);
      void audioEngine.emit('error');
    }
  };

  const handleReviewChallenge = async (challenge: NextRunChallenge) => {
    setReviewStatus('');
    try {
      if (config?.mode !== 'LocalMock') {
        await invoke('reset_sim');
      }
      resetWorldView();
      setIsRunning(false);
      setRunSession(null);
      runSessionRef.current = null;
      setSyncedInterventionBudget(null);
      setSyncedInterventionTraces([]);
      setWorldEvents([]);
      setWorldInteractions([]);
      worldEventsRef.current = [];
      worldEventEvidenceRef.current = [];
      setRunSummary(null);
      autoReviewTriggeredRef.current = false;
      setSimulationStatus('');
      setPendingRunPreset({
        runLength: challenge.recommendedLength,
        runSpeed: challenge.recommendedSpeed,
        runTheme: challenge.recommendedTheme,
        title: challenge.title,
        loadedChallenge: challenge,
      });
      preloadConfigStage();
      setStage('CONFIG');
    } catch (e) {
      console.error('载入挑战预设失败:', e);
      setReviewStatus(`载入挑战失败：${e instanceof Error ? e.message : String(e)}`);
      void audioEngine.emit('error');
    }
  };

  const appendInterventionEvent = useCallback((outcome: InterventionOutcome) => {
    const session = runSessionRef.current;
    if (!session) return;
    const phase = session.phase;
    const eventKindByIntervention: Record<PlayerInterventionKind, WorldEvent['kind']> = {
      BLESS: 'PLAYER_BLESSING',
      POISON: 'PLAYER_POISON',
      QUARANTINE: 'PLAYER_QUARANTINE',
      EXILE: 'PLAYER_EXILE',
      PIN_OBSERVE: 'PINNED_OBSERVATION',
    };
    appendWorldEvents([
      createWorldEvent({
        kind: eventKindByIntervention[outcome.kind],
        title: outcome.affected > 0
          ? `${outcome.kind === 'PIN_OBSERVE' ? '钉选观察' : '玩家干预'}生效`
          : `${outcome.kind === 'PIN_OBSERVE' ? '钉选观察' : '玩家干预'}未命中`,
        detail: outcome.message,
        phase,
        severity: outcome.affected <= 0
          ? 'warning'
          : outcome.kind === 'POISON' || outcome.kind === 'EXILE' ? 'warning' : 'good',
        entityId: outcome.entityId,
        metric: outcome.affected,
        intervention: outcome,
      }),
    ]);
  }, [appendWorldEvents]);

  const handleWorldIntervention = useCallback(async (point: [number, number, number], entity?: EntityView): Promise<InterventionOutcome | void> => {
    const session = runSessionRef.current;
    if (!isRunning || !session) return;
    if (interventionInFlightRef.current) {
      setSimulationStatus('神谕正在落点结算，请稍候。');
      void audioEngine.emit('error');
      return;
    }
    if (!isInterventionArmed) {
      setSimulationStatus(`已观察坐标，未武装干预；按 1-5 或点击干预按钮后再点击 Arena 生效。`);
      return;
    }
    const [x, y, z] = point;
    const now = Date.now();
    const ruleCheck = checkChallengeInterventionRules({
      challenge: session.loadedChallenge,
      kind: activeIntervention,
      counts: countInterventionEvents(worldEventsRef.current),
    });
    if (!ruleCheck.allowed) {
      setSimulationStatus(ruleCheck.reason);
      setEntityActionStatus(ruleCheck.reason);
      setIsInterventionArmed(false);
      void audioEngine.emit('error');
      return;
    }
    const currentBudget = interventionBudgetRef.current ?? createInterventionBudget(session.length, session.startedAt);
    const budgetCheck = checkInterventionBudget(currentBudget, activeIntervention, session, now);
    setSyncedInterventionBudget(budgetCheck.budget);
    if (!budgetCheck.allowed) {
      setSimulationStatus(budgetCheck.reason);
      setEntityActionStatus(budgetCheck.reason);
      setIsInterventionArmed(false);
      void audioEngine.emit('error');
      return;
    }
    interventionInFlightRef.current = true;
    setIsInterventionPending(true);
    setIsInterventionArmed(false);

    try {
      let outcome: InterventionOutcome;
      if (activeIntervention === 'PIN_OBSERVE') {
        outcome = {
          kind: 'PIN_OBSERVE',
          affected: entity ? 1 : 0,
          message: entity
            ? `观察焦点已钉选实体 #${entity.id}。`
            : `观察焦点已钉选坐标 (${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)})。`,
        };
      } else if (config.mode === 'LocalMock') {
        outcome = {
          kind: activeIntervention,
          affected: entity ? 1 : 0,
          message: `UI 沙盒记录了${activeIntervention}干预；真实数值只在 Rust 仿真中修改。`,
        };
      } else {
        outcome = await invoke<InterventionOutcome>('apply_player_intervention', {
          kind: activeIntervention,
          x,
          y,
          z,
          entityId: entity?.id ?? null,
        });
      }
      if (activeIntervention === 'PIN_OBSERVE' && entity) {
        setSyncedPinnedSpecimen(createPinnedSpecimen(entity, session.phase, now));
      }
      if (outcome.affected <= 0) {
        const missedOutcome: InterventionOutcome = {
          ...outcome,
          message: `${outcome.message}（未命中实体，未消耗神谕。）`,
          entityId: entity?.id,
          affectedEntityIds: [],
          point: [x, y, z],
        };
        appendInterventionEvent(missedOutcome);
        setEntityActionStatus(missedOutcome.message);
        setSimulationStatus('');
        setIsInterventionArmed(false);
        void audioEngine.emit('error');
        return missedOutcome;
      }
      const spent = spendInterventionBudget(budgetCheck.budget, activeIntervention, session, now);
      setSyncedInterventionBudget(spent.budget);
      const budgetedOutcome = {
        ...outcome,
        message: `${outcome.message}（神谕消耗 ${formatBudgetValue(spent.cost)}，剩余 ${formatBudgetValue(spent.budget.current)}）`,
      };
      const trace = createInterventionTrace({
        outcome: budgetedOutcome,
        point: [x, y, z],
        entity,
        entities,
        session,
        now,
      });
      const tracedOutcome: InterventionOutcome = {
        ...budgetedOutcome,
        entityId: entity?.id ?? trace.affectedEntityIds[0],
        traceId: trace.id,
        affectedEntityIds: trace.affectedEntityIds,
        point: [x, y, z],
      };
      setSyncedInterventionTraces([...interventionTracesRef.current, trace].slice(-16));
      appendInterventionEvent(tracedOutcome);
      setEntityActionStatus(tracedOutcome.message);
      setSimulationStatus('');
      setIsInterventionArmed(false);
      void audioEngine.emit(interventionAudioEvent[activeIntervention]);
      return tracedOutcome;
    } catch (e) {
      console.error('玩家干预失败:', e);
      const message = `玩家干预失败：${e instanceof Error ? e.message : String(e)}`;
      setSimulationStatus(message);
      setEntityActionStatus(message);
      setIsInterventionArmed(false);
      void audioEngine.emit('error');
      return;
    } finally {
      interventionInFlightRef.current = false;
      setIsInterventionPending(false);
    }
  }, [activeIntervention, appendInterventionEvent, config.mode, entities, isInterventionArmed, isRunning, setSyncedInterventionBudget, setSyncedInterventionTraces, setSyncedPinnedSpecimen]);

  const handleForceMutation = async () => {
    if (!selectedEntity) return;
    const session = runSessionRef.current;
    if (!session || !isRunning) {
      setEntityActionStatus('下饭局暂停或未启动，无法执行定点祝福。');
      setSimulationStatus('下饭局暂停或未启动，无法执行定点祝福。');
      setIsInterventionArmed(false);
      void audioEngine.emit('error');
      return;
    }

    const now = Date.now();
    const ruleCheck = checkChallengeInterventionRules({
      challenge: session.loadedChallenge,
      kind: 'BLESS',
      counts: countInterventionEvents(worldEventsRef.current),
    });
    if (!ruleCheck.allowed) {
      setEntityActionStatus(ruleCheck.reason);
      setSimulationStatus(ruleCheck.reason);
      setIsInterventionArmed(false);
      void audioEngine.emit('error');
      return;
    }
    const currentBudget = interventionBudgetRef.current ?? createInterventionBudget(session.length, session.startedAt);
    const budgetCheck = checkInterventionBudget(currentBudget, 'BLESS', session, now);
    setSyncedInterventionBudget(budgetCheck.budget);
    if (!budgetCheck.allowed) {
      setEntityActionStatus(budgetCheck.reason);
      setSimulationStatus(budgetCheck.reason);
      void audioEngine.emit('error');
      return;
    }

    try {
      let outcome: InterventionOutcome;
      if (config.mode === 'LocalMock') {
        setSelectedEntity({
          ...selectedEntity,
          energy: Math.min(selectedEntity.energy + 30, 100),
          score: selectedEntity.score + 5,
        });
        outcome = {
          kind: 'BLESS',
          affected: 1,
          message: '沙盒实体已获得定点祝福。',
        };
      } else {
        const [x, y, z] = selectedEntity.position;
        outcome = await invoke<InterventionOutcome>('apply_player_intervention', {
          kind: 'BLESS',
          x,
          y,
          z,
          entityId: selectedEntity.id,
        });
      }
      if (outcome.affected <= 0) {
        const missedOutcome: InterventionOutcome = {
          ...outcome,
          message: `${outcome.message}（未命中实体，未消耗神谕。）`,
          entityId: selectedEntity.id,
          affectedEntityIds: [],
          point: selectedEntity.position,
        };
        appendInterventionEvent(missedOutcome);
        setEntityActionStatus(missedOutcome.message);
        setSimulationStatus('');
        setIsInterventionArmed(false);
        void audioEngine.emit('error');
        return;
      }
      const spent = spendInterventionBudget(budgetCheck.budget, 'BLESS', session, now);
      setSyncedInterventionBudget(spent.budget);
      const budgetedOutcome = {
        ...outcome,
        message: `${outcome.message}（神谕消耗 ${formatBudgetValue(spent.cost)}，剩余 ${formatBudgetValue(spent.budget.current)}）`,
      };
      const trace = createInterventionTrace({
        outcome: budgetedOutcome,
        point: selectedEntity.position,
        entity: selectedEntity,
        entities,
        session,
        now,
      });
      const tracedOutcome: InterventionOutcome = {
        ...budgetedOutcome,
        entityId: selectedEntity.id,
        traceId: trace.id,
        affectedEntityIds: trace.affectedEntityIds,
        point: selectedEntity.position,
      };
      setSyncedInterventionTraces([...interventionTracesRef.current, trace].slice(-16));
      appendInterventionEvent(tracedOutcome);
      setEntityActionStatus(tracedOutcome.message);
      setIsInterventionArmed(false);
      void audioEngine.emit('intervention_bless');
    } catch (e) {
      console.error('定点祝福失败:', e);
      setEntityActionStatus('定点祝福失败，请查看运行日志。');
      setIsInterventionArmed(false);
      void audioEngine.emit('error');
    }
  };

  useEffect(() => {
    if (stage !== 'SIMULATION' || !isRunning || !runSession) return;
    if (!shouldAutoReview(runSession, runClockNow) || autoReviewTriggeredRef.current) return;
    autoReviewTriggeredRef.current = true;
    void handleEndAndReview();
  }, [stage, isRunning, runSession, runClockNow]);

  const fontScale = Math.min(1.5, Math.max(0.8, config.fontScale || DEFAULT_APP_CONFIG.fontScale));
  const uiScaleStyle = { '--vgene-font-scale': fontScale } as CSSProperties;
  const renderScaledShell = (content: ReactNode) => (
    <div className="vgene-ui-scale" style={uiScaleStyle}>
      {content}
    </div>
  );

  if (stage === 'SPLASH') {
    return renderScaledShell(
      <>
        <TitleBar />
        <GenesisGate config={config} onConfigChange={handleUpdateSettings} onStart={handleGoToConfig} />
      </>
    );
  }

  if (stage === 'CONFIG') {
    return renderScaledShell(
      <>
        <TitleBar />
        <Suspense fallback={<DeferredStageFallback label="加载母亲机床" />}>
          <MotherMachine
            initialConfig={config}
            initialRunOptions={pendingRunPreset}
            onStart={handleStart}
            onBack={() => {
              setPendingRunPreset(null);
              setStage('SPLASH');
            }}
          />
        </Suspense>
      </>
    );
  }

  if (stage === 'REVIEW') {
    return renderScaledShell(
      <>
        <TitleBar />
        <Suspense fallback={<DeferredStageFallback label="加载复盘引擎" />}>
          <PhoenixReview
            stats={stats}
            runSummary={runSummary}
            onReset={handleReviewReset}
            onStartChallenge={handleReviewChallenge}
            status={reviewStatus}
          />
        </Suspense>
      </>
    );
  }

  return renderScaledShell(
    <div className="app-safe-screen relative h-screen w-screen overflow-hidden bg-black text-white font-display">
      <TitleBar />
      
      {/* 中央渲染区 */}
      <main className="relative h-full min-w-0 overflow-hidden">
        <Suspense fallback={<DeferredStageFallback label="加载 Arena 观测台" />}>
          <SimulationStage
            config={config}
            entities={entities}
            stats={stats}
            computeStatus={computeStatus}
            worldEvents={worldEvents}
            worldInteractions={worldInteractions}
            runSession={runSession}
            runClockNow={runClockNow}
            isRunning={isRunning}
            isSimulationToggling={isSimulationToggling}
            isSettingsOpen={isSettingsOpen}
            isInterventionPending={isInterventionPending}
            activeIntervention={activeIntervention}
            isInterventionArmed={isInterventionArmed}
            interventionBudget={interventionBudget}
            pinnedSpecimen={pinnedSpecimen}
            interventionTraces={interventionTraces}
            runHighlights={runHighlights}
            selectedEntity={selectedEntity}
            isMicroArenaOpen={isMicroArenaOpen}
            entityActionStatus={entityActionStatus}
            simulationStatus={simulationStatus}
            isLeaping={isLeaping}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onToggleSimulation={toggleSimulation}
            onRequestReview={requestEndAndReview}
            onEntityClick={handleEntityClick}
            onInterferenceError={(message) => {
              setSimulationStatus(message);
              void audioEngine.emit('error');
            }}
            onWorldIntervention={handleWorldIntervention}
            onInterventionChange={handleInterventionChange}
            onObjectiveCompleted={handleObjectiveCompleted}
            onMealRhythmCue={handleMealRhythmCue}
            onRunHighlightsChange={setSyncedRunHighlights}
            onClearPinnedSpecimen={() => setSyncedPinnedSpecimen(null)}
            onCloseEntity={handleCloseEntity}
            onOpenMicroArena={() => {
              preloadMicroArena();
              setIsMicroArenaOpen(true);
            }}
            onCloseMicroArena={() => setIsMicroArenaOpen(false)}
            onForceMutation={handleForceMutation}
            onCancelIntervention={handleCancelIntervention}
            onShortcut={setSimulationStatus}
            emitNarrativeAudio={emitNarrativeAudio}
          />
        </Suspense>
      </main>

      {/* 设置模态框 */}
      {isSettingsOpen && (
        <Suspense fallback={<DeferredStageFallback label="加载环境参数" />}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            config={config}
            onSave={handleUpdateSettings}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
