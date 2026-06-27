export type MutationMode = 'LocalMock' | 'Local' | 'Ollama';
export type DisplayMode = 'Windowed' | 'Fullscreen' | 'Borderless';
export type VisualFidelity = 'Low' | 'Medium' | 'High' | 'Ultra';
export type WinningRule = 'SURVIVAL' | 'PREDATION' | 'CODE_SIZE';
export type EnvironmentType = 'EARTH' | 'DEEP_SEA' | 'SPACE';
export type ComputeBackend = 'Auto' | 'CPU' | 'CUDA';
export type BenchmarkTaskId =
  | 'freeform'
  | 'sort_i32'
  | 'rle'
  | 'sum_i32'
  | 'max_i32'
  | 'find_i32'
  | 'checksum8'
  | 'count_byte';
export type MealRunLength = 'Snack' | 'Dinner' | 'LongTable';
export type RunSpeed = 1 | 2 | 4 | 8;
export type MealRunTheme = 'Random' | 'Ascent' | 'Symbiosis' | 'Catastrophe' | 'Apex';
export type RunPhase = 'GENESIS' | 'BURST' | 'DIVERGENCE' | 'CRISIS' | 'ASCENSION';
export type PlayerInterventionKind = 'BLESS' | 'POISON' | 'QUARANTINE' | 'EXILE' | 'PIN_OBSERVE';

export type WorldEventKind =
  | 'RUN_STARTED'
  | 'PHASE_SHIFT'
  | 'FIRST_APEX'
  | 'MASS_EXTINCTION'
  | 'TOXIN_CRISIS'
  | 'COOPERATION_CLUSTER'
  | 'PREDATOR_RAID'
  | 'RESOURCE_BLOOM'
  | 'ENERGY_FAMINE'
  | 'GENERATION_LEAP'
  | 'LINEAGE_FOUNDER'
  | 'GOLDEN_AGE'
  | 'PLAYER_BLESSING'
  | 'PLAYER_POISON'
  | 'PLAYER_QUARANTINE'
  | 'PLAYER_EXILE'
  | 'PINNED_OBSERVATION'
  | 'HALL_OF_FAME'
  | 'RUN_ENDED';

export interface Ethics {
  altruism: number;
  collaboration: number;
}

export interface EntityView {
  id: number;
  position: [number, number, number];
  ethics: Ethics;
  score: number;
  energy: number;
  metabolic_toxin: number;
  generation: number;
}

export interface Entity extends EntityView {
  dna: string;
  stats: {
    attack: number;
    defense: number;
    population?: number;
    tech_level: number;
    efficiency: number;
  };
  parent_id?: number | null;
  fuel_consumed?: number;
  fuel_efficiency?: number;
  last_memory_snapshot?: number[];
}

export interface WorldStats {
  avgScore: number;
  population: number;
  avgGeneration: number;
  entropy: number;
}

export interface ComputeStatus {
  requested_backend: ComputeBackend;
  active_backend: 'CPU' | 'CUDA';
  cuda_available: boolean;
  device_name?: string | null;
  compute_capability?: string | null;
  vram_total: number;
  vram_free: number;
  gpu_load: number;
  temperature: number;
  last_kernel_ms: number;
  fallback_reason?: string | null;
  adaptive_scale: number;
  effective_entity_cap: number;
}

export type MealRunPredictionKind = 'SURVIVAL' | 'EVENT_DENSITY' | 'THEME_SIGNAL' | 'HUMAN_TOUCH' | 'COLLECTION';

export interface MealRunPrediction {
  id: string;
  kind: MealRunPredictionKind;
  title: string;
  detail: string;
  target: string;
  tone: WorldEvent['severity'];
  suggestedIntervention: PlayerInterventionKind;
  evidence: string;
}

export interface MealRunPredictionResult {
  prediction: MealRunPrediction;
  completed: boolean;
  score: number;
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  evidence: string;
  copyText: string;
}

export interface MealRunPredictionProgress {
  prediction: MealRunPrediction;
  completed: boolean;
  progress: number;
  score: number;
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  evidence: string;
  current: number;
  target: number;
  targetLabel: string;
  metrics: {
    events: number;
    interventions: number;
    collections: number;
    population: number;
    avgScore: number;
    entropy: number;
  };
}

export type CivilizationFactionKind = 'CARETAKER' | 'PREDATOR' | 'PIONEER' | 'SURVIVOR' | 'STRAINED';

export interface CivilizationFaction {
  id: CivilizationFactionKind;
  label: string;
  count: number;
  ratio: number;
  leaderId?: number;
  leaderScore: number;
  averageEnergy: number;
  averageToxin: number;
  tone: WorldEvent['severity'];
  suggestedIntervention: PlayerInterventionKind;
  evidence: string;
}

export interface CivilizationFactionLedger {
  title: string;
  subtitle: string;
  tone: WorldEvent['severity'];
  total: number;
  factions: CivilizationFaction[];
  dominant?: CivilizationFaction;
  evidence: string;
}

export type RunEndgameForecastKind = 'EXTINCTION' | 'GOLDEN_AGE' | 'APEX_BREAKOUT' | 'STABLE_DRIFT' | 'VOLATILE';

export interface RunEndgameForecast {
  kind: RunEndgameForecastKind;
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  confidence: number;
  momentum: number;
  suggestedIntervention: PlayerInterventionKind;
  evidence: string;
  metrics: {
    remainingMs: number;
    population: number;
    avgScore: number;
    entropy: number;
    dangerEvents: number;
    goodEvents: number;
    apexCandidates: number;
    strainedEntities: number;
  };
}

export type LiveProtagonistRole = 'APEX' | 'CARETAKER' | 'SURVIVOR' | 'THREAT';

export interface LiveProtagonistCandidate {
  role: LiveProtagonistRole;
  entityId: number;
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  score: number;
  confidence: number;
  suggestedIntervention: PlayerInterventionKind;
  evidence: string;
  metrics: {
    fitness: number;
    energy: number;
    toxin: number;
    generation: number;
    altruism: number;
    collaboration: number;
  };
}

export interface LiveProtagonistRadar {
  title: string;
  subtitle: string;
  tone: WorldEvent['severity'];
  candidates: LiveProtagonistCandidate[];
  evidence: string;
}

export type LiveInteractionKind = 'MUTUAL_AID' | 'RESOURCE_TRANSFER' | 'PREDATION' | 'TOXIC_CONFLICT';
export type LiveInteractionSource = 'OBSERVED' | 'INFERRED';
export type WorldInteractionKind = 'MutualAid' | 'ResourceTransfer' | 'Predation';

export interface WorldInteractionEvent {
  id: string;
  tick: number;
  kind: WorldInteractionKind;
  sourceId: number;
  targetId: number;
  distance: number;
  sourceEnergyDelta: number;
  targetEnergyDelta: number;
  sourceToxinDelta: number;
  targetToxinDelta: number;
  sourceScore: number;
  targetScore: number;
  sourceGeneration: number;
  targetGeneration: number;
}

export interface LiveInteractionEdge {
  kind: LiveInteractionKind;
  source: LiveInteractionSource;
  sourceId: number;
  targetId: number;
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  strength: number;
  distance: number;
  suggestedIntervention: PlayerInterventionKind;
  evidence: string;
  metrics: {
    sourceScore: number;
    targetScore: number;
    sourceEnergy: number;
    targetEnergy: number;
    sourceToxin: number;
    targetToxin: number;
    ethicsDelta: number;
  };
}

export interface LiveInteractionNetwork {
  title: string;
  subtitle: string;
  tone: WorldEvent['severity'];
  edges: LiveInteractionEdge[];
  evidence: string;
  metrics: {
    scannedEntities: number;
    pairCount: number;
    aidEdges: number;
    attackEdges: number;
    conflictEdges: number;
    observedEdges: number;
  };
}

export interface RunSession {
  id: string;
  length: MealRunLength;
  speed: RunSpeed;
  theme: Exclude<MealRunTheme, 'Random'>;
  startedAt: number;
  targetDurationMs: number;
  phase: RunPhase;
  prediction?: MealRunPrediction;
  loadedChallenge?: NextRunChallenge;
}

export interface InterventionOutcome {
  kind: PlayerInterventionKind;
  affected: number;
  message: string;
  entityId?: number;
  traceId?: string;
  affectedEntityIds?: number[];
  point?: [number, number, number];
}

export interface InterventionBudget {
  max: number;
  current: number;
  used: number;
  recovered: number;
  lastUpdatedAt: number;
  lastAppliedAt: number;
}

export interface InterventionBudgetSummary {
  max: number;
  remaining: number;
  used: number;
  recovered: number;
  discipline: 'restrained' | 'balanced' | 'overdrawn';
  title: string;
  detail: string;
}

export interface SpecimenSnapshot {
  timestamp: number;
  phase: RunPhase;
  score: number;
  energy: number;
  toxin: number;
  generation: number;
  position: [number, number, number];
}

export interface PinnedSpecimen {
  entityId: number;
  pinnedAt: number;
  lastSeenAt: number;
  originPhase: RunPhase;
  status: 'TRACKING' | 'LOST';
  snapshots: SpecimenSnapshot[];
}

export interface PinnedSpecimenSummary {
  entityId: number;
  status: 'SURVIVED' | 'LOST';
  trackedMs: number;
  title: string;
  detail: string;
  first: SpecimenSnapshot;
  final: SpecimenSnapshot;
  peakScore: number;
  generationGain: number;
  energyDelta: number;
  toxinDelta: number;
  evidence: string;
}

export interface WorldEvent {
  id: string;
  kind: WorldEventKind;
  title: string;
  detail: string;
  timestamp: number;
  phase: RunPhase;
  severity: 'info' | 'good' | 'warning' | 'danger';
  entityId?: number;
  metric?: number;
  intervention?: InterventionOutcome;
}

export interface WorldEventCausality {
  id: string;
  source: WorldEvent;
  target: WorldEvent;
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  confidence: number;
  evidence: string;
}

export type PlayerImpactTraceKind = 'PENDING' | 'RESCUE' | 'PRESSURE' | 'CONTROL' | 'OVERDRAWN';

export interface PlayerImpactTrace {
  id: string;
  kind: PlayerImpactTraceKind;
  intervention: WorldEvent;
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  confidence: number;
  evidence: string;
  elapsedMs: number;
  metrics: {
    eventsAfter: number;
    helpfulEvents: number;
    harmfulEvents: number;
    population: number;
    avgScore: number;
    entropy: number;
    affected: number;
  };
}

export type InterventionTraceStatus = 'TRACKING' | 'RESOLVED' | 'STALE';

export interface InterventionTraceSnapshot {
  entityId: number;
  timestamp: number;
  alive: boolean;
  score: number;
  energy: number;
  toxin: number;
  generation: number;
  position: [number, number, number];
}

export type InterventionCausalVerdict = 'PENDING' | 'POSITIVE' | 'NEGATIVE' | 'INCONCLUSIVE' | 'OBSERVATIONAL';

export interface InterventionCausalAudit {
  verdict: InterventionCausalVerdict;
  confidence: number;
  affectedSize: number;
  controlSize: number;
  affectedScoreDelta: number;
  controlScoreDelta: number;
  affectedEnergyDelta: number;
  controlEnergyDelta: number;
  affectedToxinDelta: number;
  controlToxinDelta: number;
  netScoreDelta: number;
  netEnergyDelta: number;
  netToxinDelta: number;
  affectedGenerationDelta?: number;
  controlGenerationDelta?: number;
  netGenerationDelta?: number;
  evidence: string;
}

export type InterventionConsequenceKind =
  | 'PENDING'
  | 'OBSERVATION'
  | 'NO_CLEAR_EFFECT'
  | 'RESCUE'
  | 'TOXIC_KILL'
  | 'LINEAGE_PUSH'
  | 'SIDE_EFFECT'
  | 'MIXED';

export type InterventionConsequenceTag =
  | 'RESCUE'
  | 'TOXIC_KILL'
  | 'LINEAGE_PUSH'
  | 'SIDE_EFFECT';

export interface InterventionConsequenceSummary {
  kind: InterventionConsequenceKind;
  tags: InterventionConsequenceTag[];
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  confidence: number;
  elapsedMs: number;
  evidence: string;
  metrics: {
    affected: number;
    control: number;
    rescued: number;
    toxicKilled: number;
    lineageAdvanced: number;
    sideEffects: number;
    lost: number;
    harmed: number;
    netScoreDelta: number;
    netEnergyDelta: number;
    netToxinDelta: number;
    netGenerationDelta: number;
  };
}

export interface InterventionTrace {
  id: string;
  kind: PlayerInterventionKind;
  phase: RunPhase;
  startedAt: number;
  updatedAt: number;
  expiresAt: number;
  status: InterventionTraceStatus;
  outcome: InterventionOutcome;
  entityId?: number;
  point: [number, number, number];
  affectedEntityIds: number[];
  before: InterventionTraceSnapshot[];
  latest: InterventionTraceSnapshot[];
  history: InterventionTraceSnapshot[];
  controlEntityIds?: number[];
  controlBefore?: InterventionTraceSnapshot[];
  controlLatest?: InterventionTraceSnapshot[];
  controlHistory?: InterventionTraceSnapshot[];
  causalAudit?: InterventionCausalAudit;
  consequence?: InterventionConsequenceSummary;
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  confidence: number;
  metrics: {
    affected: number;
    alive: number;
    lost: number;
    rescued: number;
    harmed: number;
    scoreDelta: number;
    energyDelta: number;
    toxinDelta: number;
    generationGain: number;
    elapsedMs: number;
  };
  evidence: string;
}

export interface EntityFateLine {
  entityId: number;
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  snapshots: InterventionTraceSnapshot[];
  traceIds: string[];
  evidence: string;
}

export type CivilizationCastRole = 'APEX' | 'FOUNDER' | 'PREDATOR' | 'CARETAKER' | 'SURVIVOR';

export interface CivilizationCastMember {
  role: CivilizationCastRole;
  entityId: number;
  title: string;
  epithet: string;
  detail: string;
  score: number;
  energy: number;
  toxin: number;
  generation: number;
  tone: WorldEvent['severity'];
}

export type RunAchievementRarity = 'common' | 'rare' | 'epic' | 'mythic';

export interface RunAchievement {
  id: string;
  title: string;
  detail: string;
  rarity: RunAchievementRarity;
  evidence: string;
}

export type RunRelicRarity = RunAchievementRarity;
export type RunRelicOrigin = 'OUTCOME' | 'ENTITY' | 'EVENT' | 'INTERVENTION' | 'ACHIEVEMENT' | 'RHYTHM';

export interface RunRelic {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  origin: RunRelicOrigin;
  rarity: RunRelicRarity;
  tone: WorldEvent['severity'];
  evidence: string;
  entityId?: number;
  metrics: {
    population: number;
    avgScore: number;
    avgGeneration: number;
    entropy: number;
    interventionCount: number;
  };
}

export interface RunEra {
  id: string;
  title: string;
  phase: RunPhase;
  startedAt: number;
  endedAt: number;
  eventCount: number;
  tone: WorldEvent['severity'];
  detail: string;
  scienceNote: string;
  historicalAnalogy: string;
  evidence: string;
}

export type NextRunChallengeDifficulty = 'easy' | 'normal' | 'hard' | 'legendary';

export interface NextRunChallengeRules {
  allowedInterventions?: PlayerInterventionKind[];
  maxActiveInterventions?: number;
  configPatch?: Partial<{
    maxEntities: number;
    evolutionThrottle: number;
    mutationRate: number;
    entropyFactor: number;
    winningRule: WinningRule;
    envType: EnvironmentType;
  }>;
  setupLabel: string;
}

export interface NextRunChallenge {
  id: string;
  title: string;
  difficulty: NextRunChallengeDifficulty;
  recommendedLength: MealRunLength;
  recommendedSpeed: RunSpeed;
  recommendedTheme?: MealRunTheme;
  objective: string;
  setup: string;
  reason: string;
  evidence: string;
  tone: WorldEvent['severity'];
  rules?: NextRunChallengeRules;
}

export type RunObjectiveStatus = 'active' | 'complete' | 'failed';

export interface RunObjective {
  id: string;
  title: string;
  detail: string;
  status: RunObjectiveStatus;
  tone: WorldEvent['severity'];
  current: number;
  target: number;
  progress: number;
  evidence: string;
}

export type RunCommissionKind = 'HISTORY' | 'SURVIVAL' | 'APEX' | 'SYMBIOSIS' | 'CRISIS';
export type RunCommissionGrade = 'missed' | 'bronze' | 'silver' | 'gold' | 'legend';

export interface RunCommission {
  id: string;
  kind: RunCommissionKind;
  title: string;
  patron: string;
  detail: string;
  grade: RunCommissionGrade;
  status: RunObjectiveStatus;
  tone: WorldEvent['severity'];
  score: number;
  maxScore: number;
  objectiveIds: string[];
  evidence: string;
}

export interface RunCommissionBoard {
  title: string;
  grade: RunCommissionGrade;
  score: number;
  maxScore: number;
  completed: number;
  total: number;
  evidence: string;
  commissions: RunCommission[];
}

export type RunHighlightSource = 'DIRECTOR' | 'EVENT' | 'WORLD';

export interface RunHighlight {
  id: string;
  timestamp: number;
  phase: RunPhase;
  title: string;
  detail: string;
  source: RunHighlightSource;
  tone: WorldEvent['severity'];
  evidence: string;
  entityId?: number;
  metrics: {
    population: number;
    avgScore: number;
    avgGeneration: number;
    entropy: number;
  };
}

export type MealRhythmAction = 'WATCH' | 'MARK' | 'INTERVENE' | 'HOLD';

export interface MealRhythmCue {
  id: string;
  timestamp: number;
  phase: RunPhase;
  action: MealRhythmAction;
  title: string;
  detail: string;
  prompt: string;
  tone: WorldEvent['severity'];
  confidence: number;
  evidence: string;
  suggestedIntervention?: PlayerInterventionKind;
  metrics: {
    population: number;
    avgScore: number;
    avgGeneration: number;
    entropy: number;
    highlightCount: number;
    recentEventCount: number;
  };
}

export type RunTrailerSceneRole = 'HOOK' | 'TURN' | 'AFTERMATH';

export interface RunTrailerScene {
  id: string;
  role: RunTrailerSceneRole;
  timestamp: number;
  title: string;
  subtitle: string;
  detail: string;
  tone: WorldEvent['severity'];
  evidence: string;
}

export interface RunTrailer {
  title: string;
  tagline: string;
  tone: WorldEvent['severity'];
  evidence: string;
  scenes: RunTrailerScene[];
  shareText: string;
}

export type MealRunBroadcastSegmentRole = 'OPENING' | 'TURN' | 'SCIENCE' | 'CLOSING';

export interface MealRunBroadcastSegment {
  id: string;
  role: MealRunBroadcastSegmentRole;
  title: string;
  line: string;
  tone: WorldEvent['severity'];
  evidence: string;
}

export interface MealRunBroadcast {
  title: string;
  subtitle: string;
  hostLine: string;
  durationSec: number;
  tone: WorldEvent['severity'];
  segments: MealRunBroadcastSegment[];
  copyText: string;
  evidence: string;
}

export type MealMomentRole = 'HOOK' | 'TURN' | 'HUMAN' | 'AFTERMATH';

export interface MealMomentCard {
  id: string;
  role: MealMomentRole;
  title: string;
  kicker: string;
  line: string;
  detail: string;
  timestamp: number;
  phase: RunPhase;
  tone: WorldEvent['severity'];
  evidence: string;
  copyText: string;
  entityId?: number;
  metrics: {
    population: number;
    avgScore: number;
    avgGeneration: number;
    entropy: number;
  };
}

export interface MealMomentDeck {
  title: string;
  subtitle: string;
  tone: WorldEvent['severity'];
  cards: MealMomentCard[];
  copyText: string;
  evidence: string;
}

export interface RunReplayRecipeStep {
  id: string;
  title: string;
  detail: string;
  timing: string;
  tone: WorldEvent['severity'];
  evidence: string;
}

export interface RunReplayRecipe {
  title: string;
  subtitle: string;
  recommendedLength: MealRunLength;
  recommendedSpeed: RunSpeed;
  recommendedTheme: MealRunTheme;
  objective: string;
  setup: string;
  tone: WorldEvent['severity'];
  steps: RunReplayRecipeStep[];
  challenge: NextRunChallenge;
  copyText: string;
  evidence: string;
}

export interface RunThemeProfile {
  theme: Exclude<MealRunTheme, 'Random'>;
  label: string;
  shortLabel: string;
  headline: string;
  detail: string;
  watchFocus: string;
  scienceFrame: string;
  historicalFrame: string;
  evidence: string;
  tone: WorldEvent['severity'];
  suggestedIntervention: PlayerInterventionKind;
  metrics: {
    population: number;
    avgScore: number;
    avgGeneration: number;
    entropy: number;
    topScore: number;
    topEntityId?: number;
    cooperators: number;
    stressedEntities: number;
    recentEventCount: number;
    matchingEventCount: number;
  };
}

export interface RunDiscoveryCue {
  id: string;
  eventId: string;
  kind: WorldEventKind;
  timestamp: number;
  phase: RunPhase;
  name: string;
  domain: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  accent: 'cyan' | 'green' | 'yellow' | 'red' | 'purple' | 'white';
  title: string;
  detail: string;
  science: string;
  history: string;
  gameplay: string;
  evidence: string;
  discoveryIndex: number;
  totalDiscoveries: number;
}

export interface RunShareCardMetric {
  label: string;
  value: string;
  detail: string;
}

export interface RunShareCard {
  title: string;
  kicker: string;
  subtitle: string;
  outcome: string;
  narrative: string;
  theme: string;
  lengthLabel: string;
  speedLabel: string;
  tone: WorldEvent['severity'];
  accent: 'cyan' | 'green' | 'yellow' | 'red' | 'purple' | 'white';
  metrics: RunShareCardMetric[];
  badges: string[];
  storyLines: string[];
  evidence: string;
  footer: string;
  generatedAt: number;
}

export type MealRunScoreGrade = 'cold' | 'warm' | 'hot' | 'legend';

export interface MealRunScoreAxis {
  id: 'history' | 'drama' | 'agency' | 'science';
  label: string;
  score: number;
  detail: string;
  evidence: string;
}

export interface MealRunScorecard {
  title: string;
  grade: MealRunScoreGrade;
  score: number;
  maxScore: number;
  label: string;
  detail: string;
  tone: WorldEvent['severity'];
  axes: MealRunScoreAxis[];
  hooks: string[];
  evidence: string;
}

export type MealRunFlavorTagKind =
  | 'PACE'
  | 'THEME'
  | 'DRAMA'
  | 'AGENCY'
  | 'SCIENCE'
  | 'COLLECTION'
  | 'OUTCOME';

export interface MealRunFlavorTag {
  id: string;
  kind: MealRunFlavorTagKind;
  label: string;
  detail: string;
  tone: WorldEvent['severity'];
  evidence: string;
  score: number;
}

export interface MealRunFlavorProfile {
  title: string;
  headline: string;
  tone: WorldEvent['severity'];
  tags: MealRunFlavorTag[];
  copyText: string;
  evidence: string;
}

export type MealRunShareAssetKind =
  | 'POSTER'
  | 'FLAVOR'
  | 'BROADCAST'
  | 'MOMENTS'
  | 'RECIPE'
  | 'RELICS'
  | 'CODEX'
  | 'CHALLENGE';

export interface MealRunShareAsset {
  id: string;
  kind: MealRunShareAssetKind;
  title: string;
  detail: string;
  actionLabel: string;
  tone: WorldEvent['severity'];
  evidence: string;
  ready: boolean;
}

export interface MealRunShareBundle {
  title: string;
  headline: string;
  tone: WorldEvent['severity'];
  assets: MealRunShareAsset[];
  readyCount: number;
  totalCount: number;
  copyText: string;
  evidence: string;
}

export type MealRunCopyHookChannel = 'WECHAT' | 'SHORT_VIDEO' | 'ARCHIVE';

export interface MealRunCopyHook {
  id: string;
  channel: MealRunCopyHookChannel;
  title: string;
  line: string;
  detail: string;
  tone: WorldEvent['severity'];
  evidence: string;
  copyText: string;
}

export interface MealRunCopyHookPack {
  title: string;
  headline: string;
  tone: WorldEvent['severity'];
  hooks: MealRunCopyHook[];
  copyText: string;
  evidence: string;
}

export type MealRunSocialClipDuration = 15 | 30 | 60;
export type MealRunSocialClipSource = 'TRAILER' | 'EVENT' | 'MOMENT' | 'BROADCAST' | 'SUMMARY';

export interface MealRunSocialClipSegment {
  id: string;
  startSec: number;
  endSec: number;
  source: MealRunSocialClipSource;
  visual: string;
  narration: string;
  caption: string;
  tone: WorldEvent['severity'];
  evidence: string;
}

export interface MealRunSocialClip {
  id: string;
  durationSec: MealRunSocialClipDuration;
  title: string;
  hook: string;
  tone: WorldEvent['severity'];
  segments: MealRunSocialClipSegment[];
  copyText: string;
  evidence: string;
}

export interface MealRunSocialClipPack {
  title: string;
  headline: string;
  tone: WorldEvent['severity'];
  clips: MealRunSocialClip[];
  copyText: string;
  evidence: string;
}

export type MealRunReactionKind = 'SHOCK' | 'SCIENCE' | 'TACTIC' | 'COLLECT' | 'REPLAY' | 'QUOTE';

export interface MealRunReaction {
  id: string;
  kind: MealRunReactionKind;
  label: string;
  line: string;
  detail: string;
  tone: WorldEvent['severity'];
  evidence: string;
  copyText: string;
}

export interface MealRunReactionPack {
  title: string;
  headline: string;
  tone: WorldEvent['severity'];
  reactions: MealRunReaction[];
  copyText: string;
  evidence: string;
}

export type MealRunVariantKind = 'REMATCH' | 'COUNTERFACTUAL' | 'HARDMODE';

export interface MealRunVariantRoute {
  id: string;
  kind: MealRunVariantKind;
  title: string;
  detail: string;
  recommendedLength: MealRunLength;
  recommendedSpeed: RunSpeed;
  recommendedTheme: MealRunTheme;
  challenge: NextRunChallenge;
  tone: WorldEvent['severity'];
  evidence: string;
  copyText: string;
}

export interface MealRunVariantDeck {
  title: string;
  headline: string;
  tone: WorldEvent['severity'];
  routes: MealRunVariantRoute[];
  copyText: string;
  evidence: string;
}

export type MealRunBingoCellKind = 'STAT' | 'EVENT' | 'INTERVENTION' | 'OBJECTIVE' | 'COLLECTION' | 'STORY' | 'REPLAY';

export interface MealRunBingoCell {
  id: string;
  kind: MealRunBingoCellKind;
  title: string;
  detail: string;
  complete: boolean;
  tone: WorldEvent['severity'];
  evidence: string;
  score: number;
}

export interface MealRunBingoBoard {
  title: string;
  headline: string;
  tone: WorldEvent['severity'];
  completed: number;
  total: number;
  cells: MealRunBingoCell[];
  nextPrompt: string;
  copyText: string;
  evidence: string;
}

export type MealTableLegacyLevel = 'seed' | 'hearth' | 'archive' | 'myth';

export interface MealTableLegacyMetric {
  id: 'runs' | 'best' | 'collection' | 'themes';
  label: string;
  value: string;
  detail: string;
}

export interface MealTableLegacy {
  title: string;
  level: MealTableLegacyLevel;
  levelLabel: string;
  score: number;
  maxScore: number;
  detail: string;
  evidence: string;
  metrics: MealTableLegacyMetric[];
  milestones: string[];
  dominantTheme?: string;
  bestRun?: {
    sessionId: string;
    title: string;
    score: number;
    theme: Exclude<MealRunTheme, 'Random'>;
    savedAt?: number;
  };
  nextPrompt: string;
  recommendedChallenge?: NextRunChallenge;
}

export interface RunSummary {
  sessionId: string;
  length: MealRunLength;
  speed: RunSpeed;
  theme: Exclude<MealRunTheme, 'Random'>;
  startedAt: number;
  endedAt: number;
  elapsedMs: number;
  finalStats: WorldStats;
  keyEvents: WorldEvent[];
  phaseTimeline: WorldEvent[];
  interventionCounts: Record<PlayerInterventionKind, number>;
  civilizationCast: CivilizationCastMember[];
  achievements: RunAchievement[];
  relics: RunRelic[];
  eraChronicle: RunEra[];
  nextRunChallenges: NextRunChallenge[];
  objectives: RunObjective[];
  interventionTraces: InterventionTrace[];
  entityFateLines: EntityFateLine[];
  commissionBoard: RunCommissionBoard;
  highlights: RunHighlight[];
  mealRhythm: MealRhythmCue[];
  trailer: RunTrailer;
  broadcast?: MealRunBroadcast;
  mealMoments?: MealMomentDeck;
  replayRecipe?: RunReplayRecipe;
  themeProfile?: RunThemeProfile;
  discoveries: RunDiscoveryCue[];
  shareCard?: RunShareCard;
  mealRunScore?: MealRunScorecard;
  flavorProfile?: MealRunFlavorProfile;
  shareBundle?: MealRunShareBundle;
  copyHookPack?: MealRunCopyHookPack;
  socialClipPack?: MealRunSocialClipPack;
  reactionPack?: MealRunReactionPack;
  variantDeck?: MealRunVariantDeck;
  bingoBoard?: MealRunBingoBoard;
  predictionResult?: MealRunPredictionResult;
  interventionBudget?: InterventionBudgetSummary;
  pinnedSpecimen?: PinnedSpecimenSummary;
  outcomeTitle: string;
  outcomeReason: string;
  shareText: string;
}

export interface AppConfig {
  mode: MutationMode;
  ollamaUrl: string;
  modelName: string;
  maxEntities: number;
  evolutionThrottle: number;
  visualFidelity: VisualFidelity;
  resolution: string;
  displayMode: DisplayMode;
  fontScale: number;
  mutationRate: number;
  entropyFactor: number;
  winningRule: WinningRule;
  envType: EnvironmentType;
  computeBackend: ComputeBackend;
  taskId: BenchmarkTaskId;
  audioEnabled: boolean;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  adaptiveMusic: boolean;
}

export type MealRunMenuTone = 'fresh' | 'warm' | 'storm' | 'hero' | 'wild';

export interface MealRunMenuCard {
  id: string;
  title: string;
  subtitle: string;
  detail: string;
  runLength: MealRunLength;
  runSpeed: RunSpeed;
  runTheme: MealRunTheme;
  configPatch: Partial<Pick<AppConfig, 'maxEntities' | 'mutationRate' | 'entropyFactor' | 'winningRule' | 'envType'>>;
  tone: MealRunMenuTone;
  evidence: string;
}

export type RunStartForecastPressure = 'calm' | 'fertile' | 'volatile' | 'critical';

export interface RunStartForecastCue {
  id: string;
  phase: RunPhase;
  title: string;
  detail: string;
  tone: WorldEvent['severity'];
  evidence: string;
}

export interface RunStartForecast {
  title: string;
  kicker: string;
  detail: string;
  pressure: RunStartForecastPressure;
  pressureLabel: string;
  tone: WorldEvent['severity'];
  suggestedIntervention: PlayerInterventionKind;
  watchFocus: string;
  scienceFrame: string;
  historicalFrame: string;
  cues: RunStartForecastCue[];
  metrics: {
    maxEntities: number;
    mutationRatePercent: number;
    entropyFactorPercent: number;
    speed: RunSpeed;
  };
  evidence: string;
}

export interface BackendSettings {
  mode: MutationMode;
  ollama_url: string;
  model_name: string;
  max_entities: number;
  evolution_throttle: number;
  visual_fidelity: VisualFidelity;
  resolution: string;
  display_mode: DisplayMode;
  font_scale: number;
  mutation_rate: number;
  entropy_factor: number;
  winning_rule: WinningRule;
  env_type: EnvironmentType;
  compute_backend: ComputeBackend;
  task_id: BenchmarkTaskId;
  audio_enabled: boolean;
  master_volume: number;
  music_volume: number;
  sfx_volume: number;
  adaptive_music: boolean;
}

export interface ParsedWorldBinary {
  entities: EntityView[];
  stats: WorldStats | null;
}

export interface BenchmarkTask {
  id: BenchmarkTaskId;
  name: string;
  export_name: string;
  goal: string;
  public_cases: string[];
}

export interface ScoreBreakdown {
  correctness: number;
  fuel_efficiency: number;
  size_score: number;
  stability: number;
  task_bonus: number;
  final_score: number;
}
