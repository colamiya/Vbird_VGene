import type {
  CivilizationCastMember,
  MealRhythmCue,
  RunAchievement,
  RunEra,
  RunHighlight,
  RunObjective,
  RunSession,
  RunTrailer,
  RunTrailerScene,
  WorldEvent,
  WorldStats,
} from '../types/world';

interface TrailerInput {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  highlights?: RunHighlight[];
  mealRhythm?: MealRhythmCue[];
  eraChronicle?: RunEra[];
  civilizationCast?: CivilizationCastMember[];
  achievements?: RunAchievement[];
  objectives?: RunObjective[];
  outcomeTitle: string;
  outcomeReason: string;
  endedAt: number;
}

interface SceneCandidate {
  scene: RunTrailerScene;
  score: number;
}

const TONE_RANK: Record<WorldEvent['severity'], number> = {
  info: 1,
  good: 2,
  warning: 3,
  danger: 4,
};

const ROLE_LABEL: Record<RunTrailerScene['role'], string> = {
  HOOK: '第一幕',
  TURN: '第二幕',
  AFTERMATH: '第三幕',
};

const CAST_ROLE_LABEL: Record<CivilizationCastMember['role'], string> = {
  APEX: '顶点个体',
  FOUNDER: '谱系开创者',
  PREDATOR: '压力源',
  CARETAKER: '协作看护者',
  SURVIVOR: '瓶颈幸存者',
};

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function statsEvidence(stats: WorldStats) {
  return `P=${stats.population} / S=${stats.avgScore.toFixed(2)} / G=${stats.avgGeneration.toFixed(1)} / E=${stats.entropy.toFixed(1)}%`;
}

function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, ' ').slice(0, 34);
}

function pickToneFromStats(stats: WorldStats): WorldEvent['severity'] {
  if (stats.population <= 2 || stats.entropy >= 82) return 'danger';
  if (stats.entropy >= 68 || stats.avgScore < 18) return 'warning';
  if (stats.avgScore >= 70 || stats.population >= 60) return 'good';
  return 'info';
}

function achievementTone(achievement: RunAchievement): WorldEvent['severity'] {
  if (achievement.rarity === 'mythic') return 'good';
  if (achievement.rarity === 'epic') return 'warning';
  if (achievement.rarity === 'rare') return 'good';
  return 'info';
}

function eventScene(role: RunTrailerScene['role'], event: WorldEvent, session: RunSession): RunTrailerScene {
  return {
    id: `trailer-${role}-${event.id}`,
    role,
    timestamp: event.timestamp,
    title: event.title,
    subtitle: `${event.kind} / T+${formatDuration(event.timestamp - session.startedAt)}`,
    detail: event.detail,
    tone: event.severity,
    evidence: typeof event.entityId === 'number'
      ? `事件命中实体 #${event.entityId}`
      : `事件指标 ${typeof event.metric === 'number' ? event.metric.toFixed(2) : event.kind}`,
  };
}

function eraScene(role: RunTrailerScene['role'], era: RunEra, session: RunSession): RunTrailerScene {
  return {
    id: `trailer-${role}-${era.id}`,
    role,
    timestamp: era.startedAt,
    title: era.title,
    subtitle: `纪元 / T+${formatDuration(era.startedAt - session.startedAt)}`,
    detail: era.detail,
    tone: era.tone,
    evidence: era.evidence,
  };
}

function highlightScene(role: RunTrailerScene['role'], highlight: RunHighlight, session: RunSession): RunTrailerScene {
  return {
    id: `trailer-${role}-${highlight.id}`,
    role,
    timestamp: highlight.timestamp,
    title: highlight.title,
    subtitle: `${highlight.source} / T+${formatDuration(highlight.timestamp - session.startedAt)}`,
    detail: highlight.detail,
    tone: highlight.tone,
    evidence: `${highlight.evidence} / ${statsEvidence(highlight.metrics)}`,
  };
}

function rhythmScene(role: RunTrailerScene['role'], cue: MealRhythmCue, session: RunSession): RunTrailerScene {
  return {
    id: `trailer-${role}-${cue.id}`,
    role,
    timestamp: cue.timestamp,
    title: cue.title,
    subtitle: `${cue.action} / T+${formatDuration(cue.timestamp - session.startedAt)}`,
    detail: cue.detail,
    tone: cue.tone,
    evidence: `${cue.evidence} / 可信度 ${Math.round(cue.confidence * 100)}%`,
  };
}

function castScene(role: RunTrailerScene['role'], member: CivilizationCastMember, endedAt: number): RunTrailerScene {
  return {
    id: `trailer-${role}-cast-${member.role}-${member.entityId}`,
    role,
    timestamp: endedAt,
    title: member.title,
    subtitle: `${CAST_ROLE_LABEL[member.role]} / #${member.entityId}`,
    detail: member.detail,
    tone: member.tone,
    evidence: `终局实体快照：S=${member.score.toFixed(2)} / E=${member.energy.toFixed(1)} / T=${member.toxin.toFixed(2)} / G=${member.generation}`,
  };
}

function achievementScene(role: RunTrailerScene['role'], achievement: RunAchievement, endedAt: number): RunTrailerScene {
  return {
    id: `trailer-${role}-achievement-${achievement.id}`,
    role,
    timestamp: endedAt,
    title: achievement.title,
    subtitle: `${achievement.rarity.toUpperCase()} medal`,
    detail: achievement.detail,
    tone: achievementTone(achievement),
    evidence: achievement.evidence,
  };
}

function objectiveScene(role: RunTrailerScene['role'], objective: RunObjective, endedAt: number): RunTrailerScene {
  return {
    id: `trailer-${role}-objective-${objective.id}`,
    role,
    timestamp: endedAt,
    title: objective.title,
    subtitle: `${objective.status.toUpperCase()} / ${Math.round(objective.progress * 100)}%`,
    detail: objective.detail,
    tone: objective.tone,
    evidence: objective.evidence,
  };
}

function snapshotScene(
  role: RunTrailerScene['role'],
  input: TrailerInput,
  title: string,
  subtitle: string,
  detail: string,
): RunTrailerScene {
  return {
    id: `trailer-${role}-snapshot`,
    role,
    timestamp: role === 'HOOK' ? input.session.startedAt : input.endedAt,
    title,
    subtitle,
    detail,
    tone: pickToneFromStats(input.stats),
    evidence: `世界统计快照：${statsEvidence(input.stats)}`,
  };
}

function chooseHook(input: TrailerInput): RunTrailerScene {
  const firstEvent = input.events.find((event) => event.kind !== 'RUN_STARTED');
  if (firstEvent) return eventScene('HOOK', firstEvent, input.session);

  const firstEra = input.eraChronicle?.[0];
  if (firstEra) return eraScene('HOOK', firstEra, input.session);

  const firstRhythm = input.mealRhythm?.[0];
  if (firstRhythm) return rhythmScene('HOOK', firstRhythm, input.session);

  return snapshotScene(
    'HOOK',
    input,
    '静默创世',
    '世界快照',
    '本局开场没有触发可记录事件，复盘以终局统计作为观测证据。',
  );
}

function chooseTurn(input: TrailerInput, hook: RunTrailerScene): RunTrailerScene {
  const eventCandidates: SceneCandidate[] = input.events
    .filter((event) => event.kind !== 'RUN_STARTED')
    .map((event) => {
      const scene = eventScene('TURN', event, input.session);
      return {
        scene,
        score: TONE_RANK[event.severity] * 100 + (event.entityId ? 12 : 0) + Math.min(20, Math.max(0, event.timestamp - input.session.startedAt) / 60000),
      };
    });

  const highlightCandidates: SceneCandidate[] = (input.highlights ?? []).map((highlight) => ({
    scene: highlightScene('TURN', highlight, input.session),
    score: TONE_RANK[highlight.tone] * 110 + 18,
  }));

  const castCandidates: SceneCandidate[] = (input.civilizationCast ?? []).map((member) => ({
    scene: castScene('TURN', member, input.endedAt),
    score: TONE_RANK[member.tone] * 95 + (member.role === 'APEX' ? 30 : member.role === 'PREDATOR' ? 25 : 10),
  }));

  const rhythmCandidates: SceneCandidate[] = (input.mealRhythm ?? [])
    .filter((cue) => cue.action === 'INTERVENE' || cue.action === 'MARK')
    .map((cue) => ({
      scene: rhythmScene('TURN', cue, input.session),
      score: TONE_RANK[cue.tone] * 80 + Math.round(cue.confidence * 30),
    }));

  const achievementCandidates: SceneCandidate[] = (input.achievements ?? []).map((achievement) => ({
    scene: achievementScene('TURN', achievement, input.endedAt),
    score: TONE_RANK[achievementTone(achievement)] * 90 + (achievement.rarity === 'mythic' ? 35 : 10),
  }));

  const objectiveCandidates: SceneCandidate[] = (input.objectives ?? [])
    .filter((objective) => objective.status !== 'active')
    .map((objective) => ({
      scene: objectiveScene('TURN', objective, input.endedAt),
      score: TONE_RANK[objective.tone] * 70 + Math.round(objective.progress * 20),
    }));

  const candidates = [
    ...eventCandidates,
    ...highlightCandidates,
    ...castCandidates,
    ...rhythmCandidates,
    ...achievementCandidates,
    ...objectiveCandidates,
  ]
    .filter((candidate) => candidate.scene.title !== hook.title || candidate.scene.timestamp !== hook.timestamp)
    .sort((a, b) => b.score - a.score);

  if (candidates[0]) return candidates[0].scene;

  return snapshotScene(
    'TURN',
    input,
    '中段漂移',
    '统计转折',
    '本局中段没有形成单点戏剧事件，关键转折由终局种群、适应度和熵压共同说明。',
  );
}

function chooseAftermath(input: TrailerInput): RunTrailerScene {
  const objectives = input.objectives ?? [];
  const achievements = input.achievements ?? [];
  const completeCount = objectives.filter((objective) => objective.status === 'complete').length;
  const failedCount = objectives.filter((objective) => objective.status === 'failed').length;
  const medalLead = achievements[0]?.title;
  const objectiveLine = objectives.length > 0
    ? `目标 ${completeCount}/${objectives.length} 完成${failedCount > 0 ? `，${failedCount} 项失败` : ''}`
    : '目标数据不足';

  return {
    id: 'trailer-AFTERMATH-outcome',
    role: 'AFTERMATH',
    timestamp: input.endedAt,
    title: input.outcomeTitle,
    subtitle: medalLead ? `终局 / ${medalLead}` : `终局 / ${objectiveLine}`,
    detail: input.outcomeReason,
    tone: pickToneFromStats(input.stats),
    evidence: `${objectiveLine}；终局统计 ${statsEvidence(input.stats)}`,
  };
}

function trailerTone(scenes: RunTrailerScene[]) {
  return scenes.reduce<WorldEvent['severity']>((tone, scene) => (
    TONE_RANK[scene.tone] > TONE_RANK[tone] ? scene.tone : tone
  ), 'info');
}

export function formatTrailerForShare(trailer?: RunTrailer | null) {
  if (!trailer) return '';
  return [
    `三幕战报：${trailer.title}`,
    ...trailer.scenes.map((scene) => `- ${ROLE_LABEL[scene.role]}：${scene.title}｜${scene.evidence}`),
  ].join('\n');
}

export function deriveRunTrailer(input: TrailerInput): RunTrailer {
  const hook = chooseHook(input);
  const turn = chooseTurn(input, hook);
  const aftermath = chooseAftermath(input);
  const scenes = [hook, turn, aftermath];
  const tone = trailerTone(scenes);
  const title = `${input.outcomeTitle}：${normalizeTitle(turn.title)}`;
  const tagline = `从 ${normalizeTitle(hook.title)} 到 ${normalizeTitle(aftermath.title)}，本局由 ${input.events.length} 条真实事件和终局统计收束成三幕。`;
  const evidence = `关键事件 ${input.events.filter((event) => event.kind !== 'RUN_STARTED').length} 条 / 高光 ${(input.highlights ?? []).length} 条 / 节奏 ${(input.mealRhythm ?? []).length} 条 / ${statsEvidence(input.stats)}`;
  const trailer: RunTrailer = {
    title,
    tagline,
    tone,
    evidence,
    scenes,
    shareText: '',
  };

  return {
    ...trailer,
    shareText: formatTrailerForShare(trailer),
  };
}
