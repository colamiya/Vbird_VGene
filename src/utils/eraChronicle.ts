import type { RunEra, RunPhase, RunSession, WorldEvent, WorldEventKind, WorldStats } from '../types/world';

interface EraInput {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  endedAt: number;
}

const PHASE_ORDER: RunPhase[] = ['GENESIS', 'BURST', 'DIVERGENCE', 'CRISIS', 'ASCENSION'];

const PHASE_LABELS: Record<RunPhase, string> = {
  GENESIS: '创世',
  BURST: '爆发',
  DIVERGENCE: '分化',
  CRISIS: '危机',
  ASCENSION: '飞升',
};

const EVENT_PRIORITY: WorldEventKind[] = [
  'GOLDEN_AGE',
  'MASS_EXTINCTION',
  'TOXIN_CRISIS',
  'ENERGY_FAMINE',
  'LINEAGE_FOUNDER',
  'COOPERATION_CLUSTER',
  'PREDATOR_RAID',
  'FIRST_APEX',
  'HALL_OF_FAME',
  'GENERATION_LEAP',
  'RESOURCE_BLOOM',
  'PLAYER_EXILE',
  'PLAYER_POISON',
  'PLAYER_BLESSING',
  'PLAYER_QUARANTINE',
  'PINNED_OBSERVATION',
  'PHASE_SHIFT',
];

const TONE_WEIGHT: Record<WorldEvent['severity'], number> = {
  info: 1,
  good: 2,
  warning: 3,
  danger: 4,
};

function isChronicleEvent(event: WorldEvent) {
  return event.kind !== 'RUN_STARTED' && event.kind !== 'RUN_ENDED';
}

function eventPriority(event: WorldEvent) {
  const index = EVENT_PRIORITY.indexOf(event.kind);
  return index === -1 ? EVENT_PRIORITY.length : index;
}

function pickDominantEvent(events: WorldEvent[]) {
  if (events.length === 0) return null;
  return [...events].sort((a, b) => eventPriority(a) - eventPriority(b))[0];
}

function pickTone(events: WorldEvent[]): WorldEvent['severity'] {
  if (events.length === 0) return 'info';
  return events.reduce<WorldEvent['severity']>((tone, event) =>
    TONE_WEIGHT[event.severity] > TONE_WEIGHT[tone] ? event.severity : tone,
  'info');
}

function titleForEra(phase: RunPhase, event: WorldEvent | null) {
  if (!event) {
    const fallback: Record<RunPhase, string> = {
      GENESIS: '静默初火纪',
      BURST: '缓慢增殖纪',
      DIVERGENCE: '低噪分化纪',
      CRISIS: '暗压观测纪',
      ASCENSION: '余晖收束纪',
    };
    return fallback[phase];
  }

  const byKind: Partial<Record<WorldEventKind, string>> = {
    FIRST_APEX: '顶点秩序纪',
    MASS_EXTINCTION: '灭绝瓶颈纪',
    TOXIN_CRISIS: '毒潮纪',
    COOPERATION_CLUSTER: '共生编织纪',
    PREDATOR_RAID: '掠食压力纪',
    RESOURCE_BLOOM: '丰饶爆发纪',
    ENERGY_FAMINE: '能量饥荒纪',
    GENERATION_LEAP: '代际跃迁纪',
    LINEAGE_FOUNDER: '谱系开创纪',
    GOLDEN_AGE: '短暂黄金纪',
    PLAYER_BLESSING: '观察者赐福纪',
    PLAYER_POISON: '观察者毒雨纪',
    PLAYER_QUARANTINE: '隔离城邦纪',
    PLAYER_EXILE: '放逐荒原纪',
    PINNED_OBSERVATION: '钉选观测纪',
    HALL_OF_FAME: '英灵入殿纪',
  };
  return byKind[event.kind] ?? `${PHASE_LABELS[phase]}纪`;
}

function scienceForEra(event: WorldEvent | null, stats: WorldStats) {
  if (!event) {
    return `本阶段没有达到重大事件阈值，终局种群 ${stats.population}，平均适应度 ${stats.avgScore.toFixed(1)}。`;
  }

  const byKind: Partial<Record<WorldEventKind, string>> = {
    FIRST_APEX: '适应度优势形成资源吸引，个体差异开始改变群体结构。',
    MASS_EXTINCTION: '选择压力超过种群承载能力，低能量或高毒素谱系被快速清除。',
    TOXIN_CRISIS: '代谢副产物累积到阈值，环境毒性反向塑造生存策略。',
    COOPERATION_CLUSTER: '高协作或利他个体稳定出现，群体收益开始抵消个体消耗。',
    PREDATOR_RAID: '攻击性实体提高局部淘汰率，生态从扩张转入防御和逃逸。',
    RESOURCE_BLOOM: '能量窗口打开，实体获得短期扩张和实验突变空间。',
    ENERGY_FAMINE: '可用能量不足，系统进入节能、停滞或淘汰弱者的阶段。',
    GENERATION_LEAP: '平均世代上升，说明可继承结构在多轮筛选中延续。',
    LINEAGE_FOUNDER: '新谱系分支具备扩张潜力，历史叙事出现可追踪源头。',
    GOLDEN_AGE: '高适应度与种群稳定同时出现，形成罕见的低崩塌高效率窗口。',
    HALL_OF_FAME: '个体达到英灵殿阈值，其 DNA 和行为成为后续复盘样本。',
  };
  return byKind[event.kind] ?? '玩家干预改变局部选择压力，系统把该动作记录为可复盘因果点。';
}

function historyForEra(phase: RunPhase, event: WorldEvent | null) {
  if (!event) {
    const fallback: Record<RunPhase, string> = {
      GENESIS: '类似史前火种：存在开始，但尚未形成可命名制度。',
      BURST: '类似早期农耕扩张：资源可用，但秩序仍然松散。',
      DIVERGENCE: '类似城邦分化：多个方向并行试错，还没有单一霸权。',
      CRISIS: '类似气候压力期：环境变化比制度适应更快。',
      ASCENSION: '类似帝国余晖：胜负已定，后人只能阅读残留痕迹。',
    };
    return fallback[phase];
  }

  const byKind: Partial<Record<WorldEventKind, string>> = {
    FIRST_APEX: '类似早期霸权形成：一个中心开始重写资源分配规则。',
    MASS_EXTINCTION: '类似青铜时代崩溃：网络越复杂，断裂时越剧烈。',
    TOXIN_CRISIS: '类似工业污染期：增长副产物反过来限制增长本身。',
    COOPERATION_CLUSTER: '类似行会或互助共同体：协作降低了个体孤立风险。',
    PREDATOR_RAID: '类似游牧冲击或海盗时代：高机动攻击迫使防御演化。',
    RESOURCE_BLOOM: '类似尼罗河泛滥或新大陆资源窗口：短期富余推动扩张。',
    ENERGY_FAMINE: '类似饥荒年代：分配、节制和淘汰同时发生。',
    GENERATION_LEAP: '类似文字和制度传承：信息跨代保存，文明开始累积。',
    LINEAGE_FOUNDER: '类似开国谱系：后续历史可回溯到一个分叉点。',
    GOLDEN_AGE: '类似文艺复兴或盛唐窗口：效率、繁荣与秩序短暂同频。',
    HALL_OF_FAME: '类似英雄史诗：个体被制度化记忆保存下来。',
  };
  return byKind[event.kind] ?? '类似神权干预叙事：外部力量改变了局部历史。';
}

function evidenceForEra(phase: RunPhase, events: WorldEvent[], event: WorldEvent | null, stats: WorldStats) {
  if (!event) {
    return `${PHASE_LABELS[phase]}阶段 / 终局 P=${stats.population} S=${stats.avgScore.toFixed(1)} E=${stats.entropy.toFixed(1)}%`;
  }
  return `${event.kind} / ${events.length} 条阶段事件 / ${PHASE_LABELS[phase]}`;
}

export function deriveEraChronicle(input: EraInput): RunEra[] {
  const chronicleEvents = input.events.filter(isChronicleEvent);
  const eras = PHASE_ORDER
    .map((phase) => {
      const phaseEvents = chronicleEvents.filter((event) => event.phase === phase);
      if (phaseEvents.length === 0) return null;

      const dominant = pickDominantEvent(phaseEvents);
      const startedAt = Math.min(...phaseEvents.map((event) => event.timestamp));
      const endedAt = Math.max(...phaseEvents.map((event) => event.timestamp), startedAt);

      return {
        id: `era-${phase.toLowerCase()}-${startedAt}`,
        title: titleForEra(phase, dominant),
        phase,
        startedAt,
        endedAt,
        eventCount: phaseEvents.length,
        tone: pickTone(phaseEvents),
        detail: dominant?.detail ?? `${PHASE_LABELS[phase]}阶段保持低波动，未触发重大历史事件。`,
        scienceNote: scienceForEra(dominant, input.stats),
        historicalAnalogy: historyForEra(phase, dominant),
        evidence: evidenceForEra(phase, phaseEvents, dominant, input.stats),
      } satisfies RunEra;
    })
    .filter((era): era is RunEra => Boolean(era));

  if (eras.length > 0) return eras.slice(0, 6);

  return [{
    id: `era-silent-${input.session.startedAt}`,
    title: '静默观测纪',
    phase: input.session.phase,
    startedAt: input.session.startedAt,
    endedAt: input.endedAt,
    eventCount: 0,
    tone: input.stats.entropy >= 75 ? 'warning' : 'info',
    detail: '本局没有达到历史事件阈值，但终局统计仍保留了观测价值。',
    scienceNote: `终局种群 ${input.stats.population}，平均适应度 ${input.stats.avgScore.toFixed(1)}，熵 ${input.stats.entropy.toFixed(1)}%。`,
    historicalAnalogy: '类似考古空白层：没有碑文，但土层数据仍能说明环境。',
    evidence: '无重大事件 / 使用终局统计生成纪元摘要',
  } satisfies RunEra];
}

export function formatErasForShare(eras: RunEra[]) {
  if (eras.length === 0) return '';
  return [
    '文明纪元：',
    ...eras.slice(0, 4).map((era) => `- ${era.title} / ${PHASE_LABELS[era.phase]} / ${era.eventCount} 事`),
  ].join('\n');
}
