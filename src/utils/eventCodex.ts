import type { RunSummary, WorldEvent, WorldEventKind } from '../types/world';
import type { ArchivedRunSummary } from './runArchive';

export interface EventCodexEntry {
  kind: WorldEventKind;
  name: string;
  domain: string;
  science: string;
  history: string;
  gameplay: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  accent: 'cyan' | 'green' | 'yellow' | 'red' | 'purple' | 'white';
}

export const EVENT_CODEX: EventCodexEntry[] = [
  {
    kind: 'RUN_STARTED',
    name: '观测纪元',
    domain: '会话边界',
    science: '观察窗口打开后，所有统计才具备同一时间基准。',
    history: '相当于史官开始记年，后续事件才可被编入同一纪元。',
    gameplay: '标记本局开场，不计入稀有事件。',
    rarity: 'common',
    accent: 'white',
  },
  {
    kind: 'PHASE_SHIFT',
    name: '阶段变迁',
    domain: '复杂系统',
    science: '当时间、熵压或种群状态越过阈值，系统会进入新的演化相。',
    history: '类似石器、青铜、工业等时代切换，旧策略让位给新约束。',
    gameplay: '阶段越后期，危机和飞升类事件权重越高。',
    rarity: 'common',
    accent: 'cyan',
  },
  {
    kind: 'FIRST_APEX',
    name: '顶点个体',
    domain: '适应度选择',
    science: '高适应体会形成资源吸引力，获得更多延续和影响机会。',
    history: '像早期帝国、技术标准或优势物种的首次成形。',
    gameplay: '可钉选观察，也可祝福或放逐以改变生态走向。',
    rarity: 'uncommon',
    accent: 'cyan',
  },
  {
    kind: 'MASS_EXTINCTION',
    name: '大灭绝',
    domain: '种群崩塌',
    science: '快速人口下降说明环境压力、毒素或捕食关系已超过恢复能力。',
    history: '类似瓶颈期，幸存者基因会放大并重写后续谱系。',
    gameplay: '需要判断是任其筛选，还是用祝福、隔离挽救多样性。',
    rarity: 'rare',
    accent: 'red',
  },
  {
    kind: 'TOXIN_CRISIS',
    name: '毒素危机',
    domain: '代谢污染',
    science: '高毒素代表低效逻辑和异常执行正在污染整体生态。',
    history: '像城市污染、瘟疫或失控工业带来的文明压力。',
    gameplay: '投毒可制造筛选，隔离可降低连锁崩溃风险。',
    rarity: 'uncommon',
    accent: 'yellow',
  },
  {
    kind: 'COOPERATION_CLUSTER',
    name: '协作集群',
    domain: '博弈均衡',
    science: '高利他与高协作群体说明局部互惠结构已经出现。',
    history: '类似贸易网络、盟邦或开源生态的早期形成。',
    gameplay: '祝福协作集群能提升稳定性，投毒则可测试其抗压性。',
    rarity: 'uncommon',
    accent: 'green',
  },
  {
    kind: 'PREDATOR_RAID',
    name: '掠食者突袭',
    domain: '攻防博弈',
    science: '高适应低利他实体可能压制邻近谱系，形成掠夺性选择。',
    history: '像游牧冲击、海盗贸易或垄断竞争者。',
    gameplay: '可放逐高风险实体，或保留它作为进化压力。',
    rarity: 'uncommon',
    accent: 'red',
  },
  {
    kind: 'RESOURCE_BLOOM',
    name: '资源潮',
    domain: '生态位扩张',
    science: '人口与能量同时增长，说明生态位容量短期上升。',
    history: '类似农业扩张、航海贸易或新大陆资源窗口。',
    gameplay: '是加速观察的高价值窗口，适合钉选多个高分实体。',
    rarity: 'uncommon',
    accent: 'green',
  },
  {
    kind: 'ENERGY_FAMINE',
    name: '能量饥荒',
    domain: '资源枯竭',
    science: '平均能量过低时，种群会进入高死亡率和低探索状态。',
    history: '类似旱灾、粮荒或燃料短缺带来的文明收缩。',
    gameplay: '祝福可救局，继续旁观则可能得到更强瓶颈选择。',
    rarity: 'rare',
    accent: 'red',
  },
  {
    kind: 'GENERATION_LEAP',
    name: '代际跃迁',
    domain: '代际替换',
    science: '平均世代跨过阈值说明新生代策略正在替换旧谱系。',
    history: '类似技术范式换代，旧制度被新工具重组。',
    gameplay: '代际跃迁越频繁，本局越适合生成传播型战报。',
    rarity: 'common',
    accent: 'white',
  },
  {
    kind: 'LINEAGE_FOUNDER',
    name: '谱系开创者',
    domain: '血统分化',
    science: '高世代高适应实体具备成为主干谱系的信号。',
    history: '像王朝奠基者、学派创始人或关键发明者。',
    gameplay: '钉选观察能让复盘叙事更集中。',
    rarity: 'rare',
    accent: 'purple',
  },
  {
    kind: 'GOLDEN_AGE',
    name: '黄金时代',
    domain: '效率跃升',
    science: '适应度明显上升且人口未崩，说明系统出现短期正反馈。',
    history: '类似文艺复兴、工业跃迁或软件生态爆发期。',
    gameplay: '适合收藏战报，也是后续商业传播的强记忆点。',
    rarity: 'legendary',
    accent: 'yellow',
  },
  {
    kind: 'PLAYER_BLESSING',
    name: '祝福干预',
    domain: '观察者效应',
    science: '外部能量注入会改变局部选择压力。',
    history: '类似政策扶持、救灾或资本注入。',
    gameplay: '用于保护高价值谱系或延长文明寿命。',
    rarity: 'common',
    accent: 'green',
  },
  {
    kind: 'PLAYER_POISON',
    name: '投毒干预',
    domain: '压力测试',
    science: '人为毒素会提高失败率，逼迫系统暴露脆弱结构。',
    history: '类似战争、污染或人为灾难对文明的压力测试。',
    gameplay: '用于制造危机和筛选抗压个体。',
    rarity: 'common',
    accent: 'red',
  },
  {
    kind: 'PLAYER_QUARANTINE',
    name: '隔离干预',
    domain: '防御调控',
    science: '提高局部防御会改变碰撞和扩张的收益结构。',
    history: '类似城墙、边界管制或隔离区。',
    gameplay: '用于阻断连锁崩塌或保护协作集群。',
    rarity: 'common',
    accent: 'cyan',
  },
  {
    kind: 'PLAYER_EXILE',
    name: '放逐干预',
    domain: '空间重排',
    science: '移动高风险个体可改变局部拓扑和捕食路径。',
    history: '类似流放、迁徙或割据势力外移。',
    gameplay: '用于处理掠食者或打散过强垄断。',
    rarity: 'common',
    accent: 'purple',
  },
  {
    kind: 'PINNED_OBSERVATION',
    name: '钉选观察',
    domain: '叙事焦点',
    science: '不改写数值，只改变史官记录焦点。',
    history: '类似为某个家族、城市或英雄立传。',
    gameplay: '适合给复盘战报制造主角。',
    rarity: 'common',
    accent: 'white',
  },
  {
    kind: 'HALL_OF_FAME',
    name: '英灵入殿',
    domain: '精英保留',
    science: '极高适应体被保留为后续分析和导出的候选样本。',
    history: '类似名人堂、圣贤祠或工程标准库。',
    gameplay: '是商业化收藏和孢子导出的候选入口。',
    rarity: 'legendary',
    accent: 'yellow',
  },
  {
    kind: 'RUN_ENDED',
    name: '终局判词',
    domain: '复盘边界',
    science: '终局快照把连续演化压缩成可分享的统计截面。',
    history: '类似史书纪传的结语，给本局确定解释边界。',
    gameplay: '触发收藏、导出和战报复制。',
    rarity: 'common',
    accent: 'white',
  },
];

const CODEX_BY_KIND = new Map(EVENT_CODEX.map((entry) => [entry.kind, entry]));

export function getEventCodex(kind: WorldEventKind) {
  return CODEX_BY_KIND.get(kind);
}

function eventKindsFromSummary(summary?: RunSummary | null) {
  if (!summary) return new Set<WorldEventKind>();
  return new Set(summary.keyEvents.map((event) => event.kind));
}

export function getDiscoveredCodex(summary: RunSummary | null | undefined, archives: ArchivedRunSummary[]) {
  const discovered = eventKindsFromSummary(summary);
  archives.forEach((archive) => {
    archive.summary.keyEvents.forEach((event: WorldEvent) => discovered.add(event.kind));
  });
  return EVENT_CODEX.map((entry) => ({
    entry,
    discovered: discovered.has(entry.kind),
  }));
}

export function getCodexProgress(summary: RunSummary | null | undefined, archives: ArchivedRunSummary[]) {
  const entries = getDiscoveredCodex(summary, archives);
  const discovered = entries.filter((item) => item.discovered).length;
  return {
    discovered,
    total: entries.length,
    ratio: entries.length === 0 ? 0 : discovered / entries.length,
  };
}
