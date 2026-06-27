import type { MealRunMenuCard } from '../types/world';

const MENU_TEMPLATES: MealRunMenuCard[] = [
  {
    id: 'soft-watch',
    title: '清淡观察餐',
    subtitle: '慢速看生态自己长出来',
    detail: '低突变、低熵、短局，适合吃饭前点开后稳定观察共生、扩张和偶发瓶颈。',
    runLength: 'Snack',
    runSpeed: 1,
    runTheme: 'Symbiosis',
    configPatch: {
      maxEntities: 420,
      mutationRate: 0.04,
      entropyFactor: 0.08,
      winningRule: 'SURVIVAL',
      envType: 'EARTH',
    },
    tone: 'fresh',
    evidence: '局前模板仅写入本次开局选择与参数 patch，事件仍由真实仿真统计生成。',
  },
  {
    id: 'civilization-bowl',
    title: '文明扩张餐',
    subtitle: '人口、资源潮和黄金时代',
    detail: '中等速度与较大初始种群，给文明留下足够时间形成扩张、分化和历史主角。',
    runLength: 'LongTable',
    runSpeed: 2,
    runTheme: 'Ascent',
    configPatch: {
      maxEntities: 760,
      mutationRate: 0.08,
      entropyFactor: 0.12,
      winningRule: 'SURVIVAL',
      envType: 'EARTH',
    },
    tone: 'warm',
    evidence: '推荐长桌局用于延长观测窗口，不改变 runSession 自动复盘规则。',
  },
  {
    id: 'apex-noodle',
    title: '主角追踪餐',
    subtitle: '盯住顶点个体和谱系开创者',
    detail: '正餐长度、2x 节奏，鼓励看见顶点个体如何被环境、毒素和竞争反复筛选。',
    runLength: 'Dinner',
    runSpeed: 2,
    runTheme: 'Apex',
    configPatch: {
      maxEntities: 560,
      mutationRate: 0.12,
      entropyFactor: 0.18,
      winningRule: 'PREDATION',
      envType: 'DEEP_SEA',
    },
    tone: 'hero',
    evidence: '主题只进入本局会话状态，复盘仍按真实实体快照推导主角席。',
  },
  {
    id: 'storm-hotpot',
    title: '重口灾变锅',
    subtitle: '毒潮、饥荒和瓶颈幸存者',
    detail: '高突变和高熵会制造更强压力，适合想看文明崩溃、迁徙、复苏和干预后果。',
    runLength: 'Dinner',
    runSpeed: 4,
    runTheme: 'Catastrophe',
    configPatch: {
      maxEntities: 720,
      mutationRate: 0.22,
      entropyFactor: 0.34,
      winningRule: 'PREDATION',
      envType: 'SPACE',
    },
    tone: 'storm',
    evidence: '高压参数只影响真实模拟输入，不在事件流中伪造灾难。',
  },
  {
    id: 'blind-box',
    title: '盲盒速食餐',
    subtitle: '8x 快速看历史折叠',
    detail: '短局高速采样，适合快速刷出极端生态；事件摘要会负责压缩高倍率信息密度。',
    runLength: 'Snack',
    runSpeed: 8,
    runTheme: 'Random',
    configPatch: {
      maxEntities: 640,
      mutationRate: 0.16,
      entropyFactor: 0.22,
      winningRule: 'SURVIVAL',
      envType: 'SPACE',
    },
    tone: 'wild',
    evidence: '8x 只改变本局采样/仿真节奏，事件仍来自 worldEvents 的真实差分。',
  },
];

function positiveModulo(value: number, modulo: number) {
  return ((value % modulo) + modulo) % modulo;
}

export function deriveMealRunMenu(seed = Date.now(), count = 3): MealRunMenuCard[] {
  const daySeed = Math.floor(seed / 86_400_000);
  const start = positiveModulo(daySeed, MENU_TEMPLATES.length);
  const safeCount = Math.min(Math.max(1, count), MENU_TEMPLATES.length);

  return Array.from({ length: safeCount }, (_, index) => MENU_TEMPLATES[(start + index) % MENU_TEMPLATES.length]);
}

export function getMealRunMenuCard(id: string): MealRunMenuCard | undefined {
  return MENU_TEMPLATES.find((card) => card.id === id);
}
