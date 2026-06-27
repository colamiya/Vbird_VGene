import type {
  AppConfig,
  MealRunLength,
  MealRunTheme,
  PlayerInterventionKind,
  RunSpeed,
  RunStartForecast,
  RunStartForecastCue,
  RunStartForecastPressure,
  WorldEvent,
} from '../types/world';
import { formatIntervention, formatRunLength, formatRunSpeed, formatRunTheme } from './runSession';

const PRESSURE_LABELS: Record<RunStartForecastPressure, string> = {
  calm: '低压观察',
  fertile: '肥沃扩张',
  volatile: '高变动窗口',
  critical: '临界灾变',
};

const PRESSURE_TONES: Record<RunStartForecastPressure, WorldEvent['severity']> = {
  calm: 'good',
  fertile: 'info',
  volatile: 'warning',
  critical: 'danger',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getPressure(config: AppConfig, speed: RunSpeed): RunStartForecastPressure {
  const populationLoad = clamp(config.maxEntities / 2000, 0, 1) * 22;
  const mutationLoad = clamp(config.mutationRate, 0, 0.5) * 100;
  const entropyLoad = clamp(config.entropyFactor, 0, 0.5) * 92;
  const speedLoad = ({ 1: 0, 2: 8, 4: 16, 8: 26 } as Record<RunSpeed, number>)[speed];
  const ruleLoad = config.winningRule === 'PREDATION' ? 12 : config.winningRule === 'CODE_SIZE' ? 6 : 2;
  const envLoad = config.envType === 'SPACE' ? 10 : config.envType === 'DEEP_SEA' ? 5 : 0;
  const score = populationLoad + mutationLoad + entropyLoad + speedLoad + ruleLoad + envLoad;

  if (score >= 86) return 'critical';
  if (score >= 58) return 'volatile';
  if (config.maxEntities >= 650 && config.mutationRate <= 0.12 && config.entropyFactor <= 0.16) return 'fertile';
  return 'calm';
}

function getSuggestedIntervention(
  pressure: RunStartForecastPressure,
  theme: MealRunTheme,
  config: AppConfig,
): PlayerInterventionKind {
  if (theme === 'Apex') return 'PIN_OBSERVE';
  if (theme === 'Symbiosis') return 'BLESS';
  if (pressure === 'critical') return 'QUARANTINE';
  if (theme === 'Catastrophe' || config.entropyFactor >= 0.3) return 'QUARANTINE';
  if (config.winningRule === 'PREDATION') return 'EXILE';
  return 'PIN_OBSERVE';
}

function getWatchFocus(theme: MealRunTheme, pressure: RunStartForecastPressure, config: AppConfig) {
  if (theme === 'Ascent') return '优先看人口曲线、资源潮和黄金时代是否能连续出现。';
  if (theme === 'Symbiosis') return '优先看利他个体是否聚成稳定协作团，而不是被掠食者拆散。';
  if (theme === 'Catastrophe') return '优先看毒素、饥荒和灭绝边缘是否制造瓶颈幸存者。';
  if (theme === 'Apex') return '优先钉选高分个体，观察它是否成为谱系开创者或短命暴君。';
  if (pressure === 'critical') return '先看危机信号，再决定是隔离、放逐还是忍手观察。';
  if (config.maxEntities >= 650) return '先看人口扩张速度，再看第一批分化事件是否出现。';
  return '先看第一条真实事件和主题信号，再决定是否介入。';
}

function getScienceFrame(pressure: RunStartForecastPressure, config: AppConfig) {
  if (pressure === 'critical') return '这是高突变、高熵和高倍率叠加的非平衡系统，重点是崩溃阈值和幸存者筛选。';
  if (pressure === 'volatile') return '这是适应度景观快速起伏的窗口，局内事件会更依赖群体差分和短期瓶颈。';
  if (config.maxEntities >= 650) return '较大初始种群会提高多样性采样，适合观察并行谱系竞争。';
  return '低压局更适合观察合作、稳定扩张和缓慢分化，而不是追求立刻爆点。';
}

function getHistoricalFrame(theme: MealRunTheme, pressure: RunStartForecastPressure) {
  if (theme === 'Catastrophe' || pressure === 'critical') return '历史类比更接近黑死病、火山冬天或生态入侵后的重组期。';
  if (theme === 'Apex') return '历史类比更接近英雄时代或帝国开创期，个体选择会被后世叙事放大。';
  if (theme === 'Symbiosis') return '历史类比更接近城邦联盟、互助网络和贸易节点的形成。';
  if (theme === 'Ascent') return '历史类比更接近农业扩张、工业化前夜和人口红利窗口。';
  return '历史类比将在开局后由真实事件决定，先保留随机剧本的不确定性。';
}

function buildCues(args: {
  pressure: RunStartForecastPressure;
  theme: MealRunTheme;
  config: AppConfig;
  speed: RunSpeed;
}): RunStartForecastCue[] {
  const { pressure, theme, config, speed } = args;
  const openingTone: WorldEvent['severity'] = config.maxEntities >= 700 ? 'good' : 'info';
  const pressureTone = PRESSURE_TONES[pressure];
  const mutationTone: WorldEvent['severity'] = config.mutationRate >= 0.18 || speed >= 4 ? 'warning' : 'info';

  return [
    {
      id: 'opening-population',
      phase: 'GENESIS',
      title: config.maxEntities >= 650 ? '开局种群充足' : '开局样本偏紧',
      detail:
        config.maxEntities >= 650
          ? '第一阶段更容易出现并行谱系和局部协作团，适合先看全局分布。'
          : '第一阶段更容易被少数高分个体主导，建议尽快钉选观察样本。',
      tone: openingTone,
      evidence: `maxEntities=${config.maxEntities}`,
    },
    {
      id: 'mutation-window',
      phase: speed >= 4 ? 'BURST' : 'DIVERGENCE',
      title: speed >= 4 ? '倍速会压缩爆发期' : '分化期可读性较高',
      detail:
        speed >= 4
          ? '高倍率下不要逐条追事件，优先看事件摘要和导演镜头。'
          : '中低倍率适合看谱系如何在突变和环境压力之间分叉。',
      tone: mutationTone,
      evidence: `speed=${speed}x mutationRate=${(config.mutationRate * 100).toFixed(1)}%`,
    },
    {
      id: 'theme-pressure',
      phase: pressure === 'critical' ? 'CRISIS' : 'ASCENSION',
      title: theme === 'Random' ? '主题将在开局解析' : `${formatRunTheme(theme)}主线已装载`,
      detail:
        pressure === 'critical'
          ? '中后段大概率进入强压力观察窗口，先保留神谕充能给隔离或放逐。'
          : '中后段重点看真实事件是否支撑本局主题，而不是只看平均分。',
      tone: pressureTone,
      evidence: `pressure=${PRESSURE_LABELS[pressure]} entropyFactor=${(config.entropyFactor * 100).toFixed(1)}%`,
    },
  ];
}

export function deriveRunStartForecast(args: {
  config: AppConfig;
  runLength: MealRunLength;
  runSpeed: RunSpeed;
  runTheme: MealRunTheme;
}): RunStartForecast {
  const pressure = getPressure(args.config, args.runSpeed);
  const suggestedIntervention = getSuggestedIntervention(pressure, args.runTheme, args.config);
  const tone = PRESSURE_TONES[pressure];
  const pressureLabel = PRESSURE_LABELS[pressure];
  const runLabel = `${formatRunLength(args.runLength)} / ${formatRunSpeed(args.runSpeed)} / ${formatRunTheme(args.runTheme)}`;

  return {
    title: `${pressureLabel}开局`,
    kicker: runLabel,
    detail: `本简报只根据局前参数推导，不写 settings、不生成历史事件；真实叙事将在启动后由 worldEvents 接管。`,
    pressure,
    pressureLabel,
    tone,
    suggestedIntervention,
    watchFocus: getWatchFocus(args.runTheme, pressure, args.config),
    scienceFrame: getScienceFrame(pressure, args.config),
    historicalFrame: getHistoricalFrame(args.runTheme, pressure),
    cues: buildCues({
      pressure,
      theme: args.runTheme,
      config: args.config,
      speed: args.runSpeed,
    }),
    metrics: {
      maxEntities: args.config.maxEntities,
      mutationRatePercent: Number((args.config.mutationRate * 100).toFixed(1)),
      entropyFactorPercent: Number((args.config.entropyFactor * 100).toFixed(1)),
      speed: args.runSpeed,
    },
    evidence: `forecast from ${runLabel}, maxEntities=${args.config.maxEntities}, mutationRate=${(args.config.mutationRate * 100).toFixed(1)}%, entropyFactor=${(args.config.entropyFactor * 100).toFixed(1)}%, firstIntervention=${formatIntervention(suggestedIntervention)}`,
  };
}
