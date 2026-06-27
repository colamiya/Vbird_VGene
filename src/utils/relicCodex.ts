import type { RunRelic, RunRelicOrigin, RunRelicRarity, RunSummary } from '../types/world';
import type { ArchivedRunSummary } from './runArchive';

type RelicMatcher = (relic: RunRelic) => boolean;

export interface RelicCodexEntry {
  id: string;
  title: string;
  origin: RunRelicOrigin;
  rarity: RunRelicRarity;
  detail: string;
  condition: string;
  accent: 'cyan' | 'green' | 'yellow' | 'red' | 'purple' | 'white';
  matches: RelicMatcher;
}

export interface DiscoveredRelicCodexEntry {
  entry: RelicCodexEntry;
  discovered: boolean;
  count: number;
  sample?: RunRelic;
}

const ORIGIN_LABEL: Record<RunRelicOrigin, string> = {
  OUTCOME: '终局',
  ENTITY: '实体',
  EVENT: '事件',
  INTERVENTION: '干预',
  ACHIEVEMENT: '徽章',
  RHYTHM: '节奏',
};

function exact(id: string): RelicMatcher {
  return (relic) => relic.id === id;
}

function prefix(value: string): RelicMatcher {
  return (relic) => relic.id.startsWith(value);
}

export const RELIC_CODEX: RelicCodexEntry[] = [
  {
    id: 'outcome-stable-core',
    title: '稳定晶核',
    origin: 'OUTCOME',
    rarity: 'common',
    detail: '一局以平衡演化收束，种群、适应度和熵压都没有进入灾变区。',
    condition: '稳定终局',
    accent: 'white',
    matches: exact('relic-outcome-stable-core'),
  },
  {
    id: 'outcome-entropy',
    title: '熵潮琥珀',
    origin: 'OUTCOME',
    rarity: 'rare',
    detail: '高信息熵把本局封存在突变、毒素和选择压力互相拉扯的状态。',
    condition: '终局熵压 >= 75%',
    accent: 'yellow',
    matches: exact('relic-outcome-entropy'),
  },
  {
    id: 'outcome-embers',
    title: '最后火种匣',
    origin: 'OUTCOME',
    rarity: 'epic',
    detail: '文明接近熄灭时留下的谱系火种，适合作为下一局逆转目标。',
    condition: '终局种群 <= 2',
    accent: 'red',
    matches: exact('relic-outcome-embers'),
  },
  {
    id: 'outcome-crown',
    title: '适应王冠',
    origin: 'OUTCOME',
    rarity: 'epic',
    detail: '高适应文明留下的统治性遗物，证明优势逻辑体完成稳定筛选。',
    condition: '平均适应度 >= 80',
    accent: 'green',
    matches: exact('relic-outcome-crown'),
  },
  {
    id: 'entity-core',
    title: '主角核片',
    origin: 'ENTITY',
    rarity: 'rare',
    detail: '由顶点、开创者、幸存者、看护者或压力源实体留下的个人遗物。',
    condition: '生成文明主角席',
    accent: 'cyan',
    matches: prefix('relic-entity-'),
  },
  {
    id: 'golden-age-plate',
    title: '黄金纪年盘',
    origin: 'EVENT',
    rarity: 'mythic',
    detail: '适应度跃升且种群未同步崩塌的繁荣窗口，传播价值最高。',
    condition: '触发 GOLDEN_AGE',
    accent: 'yellow',
    matches: exact('relic-event-GOLDEN_AGE'),
  },
  {
    id: 'extinction-bottle',
    title: '灭绝灰烬瓶',
    origin: 'EVENT',
    rarity: 'epic',
    detail: '封存一次种群崩塌后的幸存证据，记录强瓶颈选择。',
    condition: '触发 MASS_EXTINCTION',
    accent: 'red',
    matches: exact('relic-event-MASS_EXTINCTION'),
  },
  {
    id: 'toxin-crystal',
    title: '代谢毒晶',
    origin: 'EVENT',
    rarity: 'rare',
    detail: '高毒素压力凝结出的危机遗物，说明逻辑生态进入污染区。',
    condition: '触发 TOXIN_CRISIS',
    accent: 'yellow',
    matches: exact('relic-event-TOXIN_CRISIS'),
  },
  {
    id: 'famine-ruler',
    title: '饥荒刻度尺',
    origin: 'EVENT',
    rarity: 'rare',
    detail: '能量断层和代际续航困难留下的资源压力证据。',
    condition: '触发 ENERGY_FAMINE',
    accent: 'red',
    matches: exact('relic-event-ENERGY_FAMINE'),
  },
  {
    id: 'cooperation-ring',
    title: '共生餐环',
    origin: 'EVENT',
    rarity: 'rare',
    detail: '协作结构出现时留下的遗物，让复盘不只围绕掠夺和崩塌。',
    condition: '触发 COOPERATION_CLUSTER',
    accent: 'green',
    matches: exact('relic-event-COOPERATION_CLUSTER'),
  },
  {
    id: 'predator-gear',
    title: '掠食齿轮',
    origin: 'EVENT',
    rarity: 'rare',
    detail: '高攻击逻辑体施加选择压力时留下的竞争遗物。',
    condition: '触发 PREDATOR_RAID',
    accent: 'purple',
    matches: exact('relic-event-PREDATOR_RAID'),
  },
  {
    id: 'observer-fingerprint',
    title: '观察者指纹',
    origin: 'INTERVENTION',
    rarity: 'rare',
    detail: '玩家轻操作写入选择压力后留下的人为变量证据。',
    condition: '本局存在玩家干预',
    accent: 'cyan',
    matches: (relic) => relic.id.startsWith('relic-intervention-') && relic.id !== 'relic-intervention-pure-observer',
  },
  {
    id: 'pure-observer-lens',
    title: '无手观测镜',
    origin: 'INTERVENTION',
    rarity: 'rare',
    detail: '玩家不施加干预，让系统自发演化形成足够历史。',
    condition: '无干预且事件足够',
    accent: 'white',
    matches: exact('relic-intervention-pure-observer'),
  },
  {
    id: 'achievement-plate',
    title: '徽章铭牌',
    origin: 'ACHIEVEMENT',
    rarity: 'rare',
    detail: '局后徽章转化成可收藏铭牌，记录本局达成的特殊叙事。',
    condition: '获得任意下饭局徽章',
    accent: 'purple',
    matches: prefix('relic-achievement-'),
  },
  {
    id: 'highlight-slice',
    title: '高光切片',
    origin: 'EVENT',
    rarity: 'common',
    detail: '玩家标记过的精彩瞬间被封存成传播切片。',
    condition: '标记精彩瞬间',
    accent: 'cyan',
    matches: prefix('relic-highlight-'),
  },
  {
    id: 'rhythm-needle',
    title: '下饭节拍针',
    origin: 'RHYTHM',
    rarity: 'common',
    detail: '本局节奏提示留下的低负担观看证据。',
    condition: '形成下饭节奏',
    accent: 'green',
    matches: prefix('relic-rhythm-'),
  },
];

function relicsFromSummary(summary?: RunSummary | null) {
  return summary?.relics ?? [];
}

function collectRelics(summary: RunSummary | null | undefined, archives: ArchivedRunSummary[]) {
  return [
    ...relicsFromSummary(summary),
    ...archives.flatMap((archive) => relicsFromSummary(archive.summary)),
  ];
}

export function formatRelicOrigin(origin: RunRelicOrigin) {
  return ORIGIN_LABEL[origin];
}

export function getDiscoveredRelicCodex(summary: RunSummary | null | undefined, archives: ArchivedRunSummary[]): DiscoveredRelicCodexEntry[] {
  const relics = collectRelics(summary, archives);
  return RELIC_CODEX.map((entry) => {
    const matches = relics.filter(entry.matches);
    return {
      entry,
      discovered: matches.length > 0,
      count: matches.length,
      sample: matches[0],
    };
  });
}

export function getRelicCodexProgress(summary: RunSummary | null | undefined, archives: ArchivedRunSummary[]) {
  const entries = getDiscoveredRelicCodex(summary, archives);
  const discovered = entries.filter((item) => item.discovered).length;
  const relics = collectRelics(summary, archives);
  const rarityCoverage = new Set(relics.map((relic) => relic.rarity));
  const originCoverage = new Set(relics.map((relic) => relic.origin));
  return {
    discovered,
    total: entries.length,
    ratio: entries.length === 0 ? 0 : discovered / entries.length,
    totalRelics: relics.length,
    rarityCoverage: rarityCoverage.size,
    originCoverage: originCoverage.size,
  };
}
