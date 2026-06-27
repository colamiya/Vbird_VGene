import type {
  CivilizationCastMember,
  MealRunLength,
  MealRunTheme,
  NextRunChallenge,
  PlayerInterventionKind,
  RunAchievement,
  RunEra,
  RunSession,
  RunSpeed,
  WorldEvent,
  WorldEventKind,
  WorldStats,
} from '../types/world';
import { countActiveInterventions, countPinnedObservations } from './interventionKinds';
import { naturalWorldEvents } from './worldEvents';

interface ChallengeInput {
  session: RunSession;
  stats: WorldStats;
  events: WorldEvent[];
  interventionCounts: Record<PlayerInterventionKind, number>;
  civilizationCast: CivilizationCastMember[];
  achievements: RunAchievement[];
  eraChronicle: RunEra[];
}

function hasEvent(events: WorldEvent[], kind: WorldEventKind) {
  return events.some((event) => event.kind === kind);
}

function totalInterventions(counts: Record<PlayerInterventionKind, number>) {
  return countActiveInterventions(counts);
}

function hasAchievement(achievements: RunAchievement[], id: string) {
  return achievements.some((achievement) => achievement.id === id);
}

function hasCast(cast: CivilizationCastMember[], role: CivilizationCastMember['role']) {
  return cast.some((member) => member.role === role);
}

function pushChallenge(list: NextRunChallenge[], challenge: NextRunChallenge) {
  if (list.some((item) => item.id === challenge.id)) return;
  list.push(challenge);
}

function makeChallenge(
  id: string,
  title: string,
  difficulty: NextRunChallenge['difficulty'],
  recommendedLength: MealRunLength,
  recommendedSpeed: RunSpeed,
  objective: string,
  setup: string,
  reason: string,
  evidence: string,
  tone: NextRunChallenge['tone'],
  recommendedTheme?: MealRunTheme,
  rules?: NextRunChallenge['rules'],
): NextRunChallenge {
  return {
    id,
    title,
    difficulty,
    recommendedLength,
    recommendedSpeed,
    objective,
    setup,
    reason,
    evidence,
    tone,
    recommendedTheme,
    rules,
  };
}

export function deriveNextRunChallenges(input: ChallengeInput) {
  const challenges: NextRunChallenge[] = [];
  const naturalEvents = naturalWorldEvents(input.events);
  const interventionTotal = totalInterventions(input.interventionCounts);
  const pinnedObservations = countPinnedObservations(input.interventionCounts);
  if (input.stats.population <= 2 || hasEvent(input.events, 'MASS_EXTINCTION')) {
    pushChallenge(challenges, makeChallenge(
      'rescue-lineage',
      '救火保种局',
      'hard',
      'Dinner',
      2,
      '下一局至少把终局种群维持在 12 以上，并避免连续危机事件。',
      '优先使用隔离和祝福，少用投毒；危机阶段手动保护高能量实体。',
      '本局接近灭绝，下一局应该验证玩家能否把选择压力从崩塌拉回稳定。',
      `终局种群 ${input.stats.population} / 灭绝事件 ${hasEvent(input.events, 'MASS_EXTINCTION') ? '已出现' : '未出现'}`,
      'danger',
      'Catastrophe',
      {
        setupLabel: '救火规则：只允许祝福、隔离和钉选，主动干预最多 4 次。',
        allowedInterventions: ['BLESS', 'QUARANTINE', 'PIN_OBSERVE'],
        maxActiveInterventions: 4,
        configPatch: {
          maxEntities: 420,
          mutationRate: 0.04,
          entropyFactor: 0.18,
          winningRule: 'SURVIVAL',
          envType: 'EARTH',
        },
      },
    ));
  }

  if (input.stats.entropy >= 75 || hasEvent(input.events, 'TOXIN_CRISIS')) {
    pushChallenge(challenges, makeChallenge(
      'low-entropy-order',
      '低熵秩序实验',
      'normal',
      'Dinner',
      1,
      '下一局把终局熵压控制在 65% 以下，同时保留至少 1 个文明主角。',
      '选择 1x 或 2x 慢速观察；毒潮出现时先隔离，再祝福高协作个体。',
      '高熵局说明突变和毒素过强，下一局要尝试建立稳定秩序。',
      `终局熵 ${input.stats.entropy.toFixed(1)}% / 毒潮 ${hasEvent(input.events, 'TOXIN_CRISIS') ? '已出现' : '未出现'}`,
      'warning',
      'Symbiosis',
      {
        setupLabel: '低熵规则：只允许祝福、隔离和钉选，主动干预最多 3 次。',
        allowedInterventions: ['BLESS', 'QUARANTINE', 'PIN_OBSERVE'],
        maxActiveInterventions: 3,
        configPatch: {
          maxEntities: 360,
          mutationRate: 0.02,
          entropyFactor: 0.04,
          winningRule: 'CODE_SIZE',
          envType: 'DEEP_SEA',
        },
      },
    ));
  }

  if (hasEvent(input.events, 'GOLDEN_AGE') || hasAchievement(input.achievements, 'golden-age') || input.stats.avgScore >= 70) {
    pushChallenge(challenges, makeChallenge(
      'repeat-golden-age',
      '黄金时代复现',
      input.stats.avgScore >= 85 ? 'legendary' : 'hard',
      'LongTable',
      2,
      '下一局再次触发黄金时代，并让终局平均适应度保持在 70 以上。',
      '使用长桌局给谱系足够时间；只在资源窗口或高协作簇出现后轻量祝福。',
      '高光局具备传播价值，复现它能把偶然奇观变成可玩目标。',
      `平均适应度 ${input.stats.avgScore.toFixed(2)} / 黄金事件 ${hasEvent(input.events, 'GOLDEN_AGE') ? '已出现' : '未出现'}`,
      'good',
      'Ascent',
      {
        setupLabel: '复现规则：允许祝福、隔离和钉选，主动干预最多 3 次。',
        allowedInterventions: ['BLESS', 'QUARANTINE', 'PIN_OBSERVE'],
        maxActiveInterventions: 3,
        configPatch: {
          maxEntities: 720,
          mutationRate: 0.08,
          entropyFactor: 0.08,
          winningRule: 'SURVIVAL',
          envType: 'EARTH',
        },
      },
    ));
  }

  if (hasCast(input.civilizationCast, 'CARETAKER') || hasEvent(input.events, 'COOPERATION_CLUSTER')) {
    pushChallenge(challenges, makeChallenge(
      'protect-cooperation',
      '共生保护局',
      'normal',
      'Dinner',
      2,
      '下一局让协作事件再次出现，并让看护者或开创者进入复盘主角席。',
      '钉选观察高协作实体；被掠食压力冲击时使用隔离，不急着放逐所有攻击者。',
      '本局出现协作结构，下一局可以测试共生是否能跨危机存活。',
      `协作事件 ${hasEvent(input.events, 'COOPERATION_CLUSTER') ? '已出现' : '未出现'} / 看护者 ${hasCast(input.civilizationCast, 'CARETAKER') ? '已入席' : '未入席'}`,
      'good',
      'Symbiosis',
      {
        setupLabel: '共生规则：允许祝福、隔离和钉选，主动干预最多 4 次。',
        allowedInterventions: ['BLESS', 'QUARANTINE', 'PIN_OBSERVE'],
        maxActiveInterventions: 4,
        configPatch: {
          maxEntities: 520,
          mutationRate: 0.05,
          entropyFactor: 0.08,
          winningRule: 'SURVIVAL',
          envType: 'EARTH',
        },
      },
    ));
  }

  if (hasCast(input.civilizationCast, 'PREDATOR') || hasEvent(input.events, 'PREDATOR_RAID')) {
    pushChallenge(challenges, makeChallenge(
      'exile-tyrant',
      '放逐暴君局',
      'hard',
      'Snack',
      4,
      '下一局在掠食事件出现后完成至少 1 次放逐，并观察文明是否因此转向协作。',
      '开 4x 找到压力源；出现攻击性优势个体后放逐一次，随后停止干预观察后果。',
      '掠食者会让局面更有戏剧性，放逐挑战能把轻操作变成明确因果实验。',
      `掠食事件 ${hasEvent(input.events, 'PREDATOR_RAID') ? '已出现' : '未出现'} / 掠食主角 ${hasCast(input.civilizationCast, 'PREDATOR') ? '已入席' : '未入席'}`,
      'danger',
      'Apex',
      {
        setupLabel: '暴君规则：只允许放逐和钉选，主动干预最多 2 次。',
        allowedInterventions: ['EXILE', 'PIN_OBSERVE'],
        maxActiveInterventions: 2,
        configPatch: {
          maxEntities: 600,
          mutationRate: 0.1,
          entropyFactor: 0.18,
          winningRule: 'PREDATION',
          envType: 'SPACE',
        },
      },
    ));
  }

  if (interventionTotal >= 3) {
    pushChallenge(challenges, makeChallenge(
      'pure-observer',
      '无神观察局',
      'normal',
      input.session.length,
      input.session.speed,
      '下一局全程不使用干预，只靠真实演化触发至少 5 条历史事件。',
      '可以钉选观察前期优势实体，但不要祝福、投毒、隔离或放逐。',
      '本局人为痕迹较重，下一局用纯观察验证系统自发叙事能力。',
      `${interventionTotal} 次主动干预 / ${pinnedObservations} 次钉选观察`,
      'info',
      'Random',
      {
        setupLabel: '无神规则：只允许钉选观察，主动干预上限 0。',
        allowedInterventions: ['PIN_OBSERVE'],
        maxActiveInterventions: 0,
      },
    ));
  }

  if (interventionTotal === 0 && naturalEvents.length >= 5) {
    pushChallenge(challenges, makeChallenge(
      'first-intervention',
      '第一次改史局',
      'easy',
      'Snack',
      2,
      '下一局至少执行 1 次祝福或隔离，并记录它是否触发后续事件。',
      '先纯看 2-3 分钟，等第一批高分实体出现后再轻量干预。',
      '本局证明系统能自发讲故事，下一局可以加入一次人类选择压力。',
      `${naturalEvents.length} 条真实事件 / 0 次主动干预 / ${pinnedObservations} 次钉选观察`,
      'info',
      input.session.theme,
      {
        setupLabel: '初手规则：允许祝福、隔离和钉选，主动干预最多 1 次。',
        allowedInterventions: ['BLESS', 'QUARANTINE', 'PIN_OBSERVE'],
        maxActiveInterventions: 1,
      },
    ));
  }

  if (input.session.speed >= 8 || hasAchievement(input.achievements, 'fast-table')) {
    pushChallenge(challenges, makeChallenge(
      'slow-archaeology',
      '慢镜考古局',
      'easy',
      input.session.length,
      1,
      '下一局使用 1x 观察至少一个完整阶段，手动读完每条事件。',
      '适合吃饭前半段打开，少切视角，多看事件流和世界脉搏。',
      '高倍速适合刷奇观，但慢速更容易看清因果链。',
      `${input.session.speed}x 本局倍率`,
      'info',
      input.session.theme,
      {
        setupLabel: '慢镜规则：允许钉选和一次轻量祝福，优先阅读事件。',
        allowedInterventions: ['BLESS', 'PIN_OBSERVE'],
        maxActiveInterventions: 1,
        configPatch: {
          evolutionThrottle: 240,
        },
      },
    ));
  }

  if (challenges.length === 0 || input.eraChronicle.length <= 1) {
    pushChallenge(challenges, makeChallenge(
      'longer-history',
      '长史观测局',
      'easy',
      'Dinner',
      2,
      '下一局至少跑到分化阶段，并形成 3 个以上文明纪元。',
      '选择正餐局和 2x，让系统有足够时间跨过创世和爆发阶段。',
      '事件不足时，延长观察窗口通常比提高干预强度更有效。',
      `${input.eraChronicle.length} 个纪元 / ${naturalEvents.length} 条真实事件`,
      'info',
      'Random',
      {
        setupLabel: '长史规则：允许祝福、隔离和钉选，主动干预最多 3 次。',
        allowedInterventions: ['BLESS', 'QUARANTINE', 'PIN_OBSERVE'],
        maxActiveInterventions: 3,
      },
    ));
  }

  if (!challenges.some((challenge) => challenge.id === 'longer-history')) {
    pushChallenge(challenges, makeChallenge(
      'archive-worthy',
      '可收藏战报局',
      'easy',
      'Snack',
      2,
      '下一局争取同时生成文明主角、徽章和至少 2 个纪元。',
      '开短局快速试错；出现顶点或谱系开创者后收藏战报。',
      '这是面向传播的基础目标，能稳定产出可复制战报。',
      `${input.civilizationCast.length} 个主角 / ${input.achievements.length} 枚徽章 / ${input.eraChronicle.length} 个纪元`,
      'good',
      'Apex',
      {
        setupLabel: '收藏规则：允许祝福、隔离、放逐和钉选，主动干预最多 3 次。',
        allowedInterventions: ['BLESS', 'QUARANTINE', 'EXILE', 'PIN_OBSERVE'],
        maxActiveInterventions: 3,
        configPatch: {
          mutationRate: 0.07,
          entropyFactor: 0.1,
          winningRule: 'SURVIVAL',
        },
      },
    ));
  }

  return challenges.slice(0, 3);
}

export function formatChallengesForShare(challenges: NextRunChallenge[]) {
  if (challenges.length === 0) return '';
  return [
    '下一局挑战：',
    ...challenges.slice(0, 3).map((challenge) => `- ${challenge.title}：${challenge.objective}`),
  ].join('\n');
}
