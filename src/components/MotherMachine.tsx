import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowLeft, Zap, Shield, Activity, Terminal, Sliders, Globe, Anchor, Rocket, CheckCircle2, History, AlertTriangle, Utensils, ClipboardCheck } from 'lucide-react';
import DivineMandate from './DivineMandate';
import { sfx } from '../utils/sfx';
import { deriveMealRunMenu } from '../utils/mealRunMenu';
import { deriveRunStartForecast } from '../utils/runStartForecast';
import { deriveMealRunPredictions } from '../utils/mealRunPredictions';
import { describeChallengeRules } from '../utils/challengeRules';
import { DEFAULT_RUN_LENGTH, DEFAULT_RUN_SPEED, DEFAULT_RUN_THEME, formatIntervention, formatRunLength, formatRunSpeed, formatRunTheme, RUN_LENGTH_OPTIONS, RUN_SPEED_OPTIONS, RUN_THEME_OPTIONS } from '../utils/runSession';
import { normalizeSettings } from '../utils/settings';
import type { AppConfig, MealRunLength, MealRunMenuCard, MealRunMenuTone, MealRunPrediction, MealRunTheme, NextRunChallenge, RunSpeed, WorldEvent } from '../types/world';

interface MotherMachineProps {
  initialConfig: AppConfig;
  initialRunOptions?: { runLength: MealRunLength; runSpeed: RunSpeed; runTheme?: MealRunTheme; title?: string; loadedChallenge?: NextRunChallenge } | null;
  onStart: (config: AppConfig, runOptions: { runLength: MealRunLength; runSpeed: RunSpeed; runTheme: MealRunTheme; runPrediction?: MealRunPrediction; loadedChallenge?: NextRunChallenge }) => void | Promise<void>;
  onBack: () => void;
}

const PRESETS = [
  { 
    id: 'CLASSIC', 
    name: '经典模式', 
    desc: '平衡的进化速率与环境压力',
    config: { maxEntities: 500, mutationRate: 0.05, entropyFactor: 0.1, winningRule: 'SURVIVAL', envType: 'EARTH' }
  },
  { 
    id: 'CHAOS', 
    name: '灾变模拟', 
    desc: '极高的突变率与死亡惩罚',
    config: { maxEntities: 800, mutationRate: 0.25, entropyFactor: 0.4, winningRule: 'PREDATION', envType: 'SPACE' }
  },
  { 
    id: 'ZEN', 
    name: '文明繁荣', 
    desc: '极简逻辑，追求长久稳定',
    config: { maxEntities: 300, mutationRate: 0.01, entropyFactor: 0.02, winningRule: 'CODE_SIZE', envType: 'DEEP_SEA' }
  }
];

const MENU_TONE_STYLES: Record<MealRunMenuTone, string> = {
  fresh: 'border-emerald-300/35 bg-emerald-300/10 text-emerald-200',
  warm: 'border-amber-300/35 bg-amber-300/10 text-amber-200',
  storm: 'border-red-300/35 bg-red-300/10 text-red-200',
  hero: 'border-cyan-300/35 bg-cyan-300/10 text-cyan-200',
  wild: 'border-fuchsia-300/35 bg-fuchsia-300/10 text-fuchsia-200',
};

const FORECAST_TONE_STYLES: Record<WorldEvent['severity'], string> = {
  info: 'border-cyan-300/25 bg-cyan-300/10 text-cyan-100',
  good: 'border-emerald-300/25 bg-emerald-300/10 text-emerald-100',
  warning: 'border-amber-300/25 bg-amber-300/10 text-amber-100',
  danger: 'border-red-300/25 bg-red-300/10 text-red-100',
};

const MotherMachine: React.FC<MotherMachineProps> = ({ initialConfig, initialRunOptions, onStart, onBack }) => {
  const [mode, setMode] = useState<'MANUAL' | 'ORACLE' | 'PREVIEW'>('MANUAL');
  const [isStarting, setIsStarting] = useState(false);
  const [startProgress, setStartProgress] = useState(0);
  const [startError, setStartError] = useState('');
  const [oracleResult, setOracleResult] = useState<AppConfig | null>(null);
  const [config, setConfig] = useState<AppConfig>(() => normalizeSettings(initialConfig));
  const [runLength, setRunLength] = useState<MealRunLength>(initialRunOptions?.runLength ?? DEFAULT_RUN_LENGTH);
  const [runSpeed, setRunSpeed] = useState<RunSpeed>(initialRunOptions?.runSpeed ?? DEFAULT_RUN_SPEED);
  const [runTheme, setRunTheme] = useState<MealRunTheme>(initialRunOptions?.runTheme ?? DEFAULT_RUN_THEME);
  const [selectedPredictionId, setSelectedPredictionId] = useState('survival-line');
  const mealRunMenu = useMemo(() => deriveMealRunMenu(Date.now(), 3), []);
  const runStartForecast = useMemo(
    () => deriveRunStartForecast({ config, runLength, runSpeed, runTheme }),
    [config, runLength, runSpeed, runTheme],
  );
  const mealRunPredictions = useMemo(
    () => deriveMealRunPredictions({ config, runLength, runSpeed, runTheme, forecast: runStartForecast }),
    [config, runLength, runSpeed, runStartForecast, runTheme],
  );
  const selectedPrediction = mealRunPredictions.find((item) => item.id === selectedPredictionId) ?? mealRunPredictions[0];
  const progressTimerRef = useRef<number | null>(null);
  const startDelayRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  const clearStartTimers = () => {
    if (progressTimerRef.current !== null) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (startDelayRef.current !== null) {
      window.clearTimeout(startDelayRef.current);
      startDelayRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearStartTimers();
    };
  }, []);

  useEffect(() => {
    if (!initialRunOptions) return;
    setRunLength(initialRunOptions.runLength);
    setRunSpeed(initialRunOptions.runSpeed);
    setRunTheme(initialRunOptions.runTheme ?? DEFAULT_RUN_THEME);
  }, [initialRunOptions?.runLength, initialRunOptions?.runSpeed, initialRunOptions?.runTheme]);

  useEffect(() => {
    if (mealRunPredictions.some((item) => item.id === selectedPredictionId)) return;
    setSelectedPredictionId(mealRunPredictions[0]?.id ?? '');
  }, [mealRunPredictions, selectedPredictionId]);

  const rules = [
    { id: 'SURVIVAL', name: '生存至上', desc: '以生存时长作为进化核心指标', icon: <Activity size={18} /> },
    { id: 'CODE_SIZE', name: '极简逻辑', desc: '追求最精简的 WAT 指令集', icon: <Shield size={18} /> },
    { id: 'PREDATION', name: '掠夺天性', desc: '鼓励内存掠夺与指令干扰', icon: <Zap size={18} /> },
  ];

  const envs = [
    { id: 'EARTH', name: '大地', icon: <Globe size={18} />, color: 'text-green-500', bg: 'bg-green-500/5', border: 'border-green-500/20' },
    { id: 'DEEP_SEA', name: '深海', icon: <Anchor size={18} />, color: 'text-blue-500', bg: 'bg-blue-500/5', border: 'border-blue-500/20' },
    { id: 'SPACE', name: '深空', icon: <Rocket size={18} />, color: 'text-purple-500', bg: 'bg-purple-500/5', border: 'border-purple-500/20' },
  ];

  const handleMandateIssued = (newOracleConfig: any) => {
    sfx.playClick();
    setOracleResult(normalizeSettings({ ...config, ...newOracleConfig }));
    setMode('PREVIEW');
  };

  const applyOracle = () => {
    if (!oracleResult) return;
    sfx.playClick();
    setConfig(oracleResult);
    setMode('MANUAL');
  };

  const applyMealRunMenu = (card: MealRunMenuCard) => {
    sfx.playClick();
    setRunLength(card.runLength);
    setRunSpeed(card.runSpeed);
    setRunTheme(card.runTheme);
    setConfig((current) => normalizeSettings({ ...current, ...card.configPatch }));
  };

  const handleStartSim = () => {
    if (isStarting) return;
    sfx.playClick();
    clearStartTimers();
    setIsStarting(true);
    setStartError('');
    let p = 0;
    progressTimerRef.current = window.setInterval(() => {
      p += 12;
      if (p >= 100) {
        p = 100;
        if (progressTimerRef.current !== null) {
          window.clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
        startDelayRef.current = window.setTimeout(() => {
          void (async () => {
            try {
              await onStart(config, { runLength, runSpeed, runTheme, runPrediction: selectedPrediction, loadedChallenge: initialRunOptions?.loadedChallenge });
            } catch (e) {
              if (!isMountedRef.current) return;
              const message = e instanceof Error ? e.message : String(e);
              setStartError(`启动失败：${message}`);
              setIsStarting(false);
              setStartProgress(0);
            } finally {
              startDelayRef.current = null;
            }
          })();
        }, 500);
      }
      setStartProgress(p);
    }, 200);
  };

  // 根据环境选择当前主题色
  const currentEnv = envs.find(e => e.id === config.envType) || envs[0];

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black pt-10 font-display transition-colors duration-1000 ${currentEnv.bg}`}>
      <img
        src="/media/meal-run-observatory.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-30 mix-blend-screen"
      />
      
      {/* 启动遮罩 */}
      {isStarting && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="w-full max-w-sm px-4 space-y-8">
            <div className="flex justify-between items-end font-mono text-[10px] text-neon-blue uppercase tracking-widest">
              <span>正在构建初始化参数…</span>
              <span>{Math.round(startProgress)}%</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-neon-blue transition-[width] duration-300 shadow-[0_0_15px_rgba(0,234,255,0.5)]"
                style={{ width: `${startProgress}%` }}
              />
            </div>
            <div className="space-y-2">
              <p className="text-[8px] font-mono text-white/20 uppercase tracking-normal">
                &gt; Compiling Wasm Runtime…
              </p>
              <p className="text-[8px] font-mono text-white/20 uppercase tracking-normal">
                &gt; Initializing Population Swarm…
              </p>
              {startProgress > 60 && (
                <p className="text-[8px] font-mono text-white/20 uppercase tracking-normal">
                  &gt; Constructing Spatial Grid Map…
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full max-w-7xl min-h-screen xl:min-h-0 p-4 sm:p-8 grid grid-cols-1 xl:grid-cols-12 gap-8 xl:gap-12 animate-in fade-in zoom-in-95 duration-700 xl:h-[85vh]">
        
        {/* 左侧：导航与预设 */}
        <div className="xl:col-span-3 flex flex-col h-full border-b xl:border-b-0 xl:border-r border-white/5 pb-8 xl:pb-0 xl:pr-8">
          <div>
            <button
              type="button"
              onMouseEnter={() => sfx.playHover()}
              onClick={onBack}
              disabled={isStarting}
              className="interactive-focus flex items-center gap-2 text-white/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-colors mb-8 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
              <span className="text-[10px] uppercase tracking-widest font-mono">返回门户</span>
            </button>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-normal uppercase italic leading-none">
              母亲机床 <br/>
              <span className={`${currentEnv.color} text-2xl not-italic transition-colors duration-1000`}>/ MOTHER MACHINE</span>
            </h2>
            <p className="text-white/40 text-[9px] mt-6 font-mono uppercase tracking-widest leading-relaxed">
              // 设定演化常数。<br/>
              // 模拟环境: <span className={currentEnv.color}>{currentEnv.name}</span>
            </p>
          </div>

          <div className="mt-12 space-y-3">
            <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest block mb-4">演化模式</p>
            <button
              type="button"
              aria-pressed={mode === 'MANUAL'}
              onMouseEnter={() => sfx.playHover()}
              onClick={() => setMode('MANUAL')}
              className={`interactive-focus w-full p-4 flex items-center gap-4 rounded-sm border transition-[border-color,color,background-color] ${mode === 'MANUAL' ? 'border-white bg-white/10 text-white' : 'border-white/5 text-white/40 hover:border-white/20'}`}
            >
              <Sliders size={18} />
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-widest">手动调参</div>
                <div className="text-[8px] opacity-60 font-mono italic">Manual Tuning</div>
              </div>
            </button>
            <button
              type="button"
              aria-pressed={mode === 'ORACLE'}
              onMouseEnter={() => sfx.playHover()}
              onClick={() => setMode('ORACLE')}
              className={`interactive-focus w-full p-4 flex items-center gap-4 rounded-sm border transition-[border-color,color,background-color] ${mode === 'ORACLE' ? 'border-neon-blue bg-neon-blue/10 text-white shadow-neon' : 'border-white/5 text-white/40 hover:border-white/20'}`}
            >
              <Terminal size={18} />
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-widest">接入神谕</div>
                <div className="text-[8px] opacity-60 font-mono italic">Divine Mandate</div>
              </div>
            </button>
          </div>

          <div className="mt-auto pt-8 border-t border-white/5">
            <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest block mb-4">快速预设</p>
            <div className="space-y-2">
              {PRESETS.map(p => (
                <button
                  type="button"
                  key={p.id}
                  onMouseEnter={() => sfx.playHover()}
                  onClick={() => {
                    sfx.playClick();
                    setConfig(normalizeSettings({ ...config, ...p.config }));
                  }}
                  className="interactive-focus w-full p-3 glass-card rounded-sm text-left hover:border-white/20 transition-colors group"
                >
                  <div className="text-[10px] font-bold text-white/80 group-hover:text-white transition-colors uppercase tracking-widest">{p.name}</div>
                  <div className="text-[8px] text-white/20 font-mono mt-1">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：内容区 */}
        <div className="xl:col-span-9 flex flex-col h-full relative">
          
          {mode === 'ORACLE' ? (
             <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-500">
               <div className="flex-1 mb-8">
                 <DivineMandate
                   ollamaUrl={config.ollamaUrl}
                   modelName={config.modelName}
                   onMandateIssued={handleMandateIssued}
                 />
               </div>
               <p className="text-center text-[9px] text-white/20 font-mono uppercase tracking-widest">
                 注意: 神谕生成的参数将基于自然语言解析，可能导致极端的演化压力。
               </p>
             </div>
          ) : mode === 'PREVIEW' && oracleResult ? (
            <div className="h-full flex flex-col justify-center items-center animate-in zoom-in-95 duration-500">
              <div className="w-full max-w-2xl glass-card p-10 border-neon-blue/40 shadow-neon-lg">
                <div className="flex items-center gap-3 mb-8">
                  <History className="text-neon-blue" size={24} />
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">神谕结果预览</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div className="space-y-4">
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest block">参数项</p>
                    <div className="text-xs font-mono text-white/60 py-2 border-b border-white/5">初始规模</div>
                    <div className="text-xs font-mono text-white/60 py-2 border-b border-white/5">突变概率</div>
                    <div className="text-xs font-mono text-white/60 py-2 border-b border-white/5">环境类型</div>
                  </div>
                  <div className="space-y-4">
                    <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest block">变更建议</p>
                    <div className="text-xs font-mono text-neon-blue py-2 border-b border-white/5 flex items-center gap-2">
                      {config.maxEntities} <ArrowRight size={10} /> {oracleResult.maxEntities}
                    </div>
                    <div className="text-xs font-mono text-neon-blue py-2 border-b border-white/5 flex items-center gap-2">
                      {config.mutationRate} <ArrowRight size={10} /> {oracleResult.mutationRate}
                    </div>
                    <div className="text-xs font-mono text-neon-blue py-2 border-b border-white/5 flex items-center gap-2">
                      {config.envType} <ArrowRight size={10} /> {oracleResult.envType}
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setMode('MANUAL')}
                    className="interactive-focus flex-1 py-4 border border-white/10 text-white/40 hover:text-white font-mono text-xs uppercase tracking-widest transition-colors"
                  >
                    放弃建议
                  </button>
                  <button
                    type="button"
                    onClick={applyOracle}
                    className="interactive-focus flex-1 py-4 bg-neon-blue text-black font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-transform shadow-neon"
                  >
                    采纳神谕
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-between animate-in slide-in-from-bottom-4 duration-500">
              {initialRunOptions?.title && (
                <div className="relative mb-4 overflow-hidden border border-red-300/20 bg-black/40 p-4">
                  <img
                    src="/media/next-run-challenges.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                  />
                  <div className="relative flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[8px] font-mono uppercase tracking-[0.3em] text-red-300">挑战协议已载入</p>
                      <h3 className="mt-1 break-words text-sm font-black uppercase italic tracking-normal text-white">{initialRunOptions.title}</h3>
                      {initialRunOptions.loadedChallenge?.rules && (
                        <p className="mt-2 line-clamp-2 text-[8px] font-mono leading-relaxed text-yellow-100/75">
                          {describeChallengeRules(initialRunOptions.loadedChallenge.rules)}
                        </p>
                      )}
                    </div>
                    <p className="text-[8px] font-mono leading-relaxed text-white/40 sm:text-right">
                      推荐 {formatRunLength(initialRunOptions.runLength)} / {formatRunSpeed(initialRunOptions.runSpeed)} / {formatRunTheme(initialRunOptions.runTheme ?? DEFAULT_RUN_THEME)}，开局前仍可手动调整。
                    </p>
                  </div>
                </div>
              )}
              <div className="relative mb-8 overflow-hidden border border-white/10 bg-black/25 p-4">
                <img
                  src="/media/meal-run-menu.svg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 mix-blend-screen"
                />
                <div className="relative">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-yellow-200">
                        <Utensils size={16} aria-hidden="true" />
                        <p className="text-[10px] font-mono uppercase tracking-widest">今日下饭菜单</p>
                      </div>
                      <p className="mt-2 text-[8px] font-mono leading-relaxed text-white/35">
                        一键套用本局长度、倍率、主题和基础生态参数；历史事件仍由真实仿真差分生成。
                      </p>
                    </div>
                    <span className="shrink-0 border border-white/10 bg-black/40 px-3 py-2 text-[8px] font-mono uppercase tracking-widest text-white/35">
                      Menu Rotation
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                    {mealRunMenu.map((card) => {
                      const isSelected = runLength === card.runLength && runSpeed === card.runSpeed && runTheme === card.runTheme;
                      return (
                        <button
                          key={card.id}
                          type="button"
                          aria-pressed={isSelected}
                          onMouseEnter={() => sfx.playHover()}
                          onClick={() => applyMealRunMenu(card)}
                          className={`interactive-focus min-h-44 border p-4 text-left transition-[border-color,color,background-color,transform] hover:-translate-y-0.5 ${
                            isSelected ? `${MENU_TONE_STYLES[card.tone]} shadow-[0_0_24px_rgba(255,255,255,0.08)]` : 'border-white/10 bg-black/45 text-white/55 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          <span className="block text-[8px] font-mono uppercase tracking-[0.28em] text-white/35">{card.subtitle}</span>
                          <span className="mt-2 block text-sm font-black uppercase italic tracking-normal text-white">{card.title}</span>
                          <span className="mt-3 block min-h-10 text-[8px] font-mono leading-relaxed text-white/45">{card.detail}</span>
                          <span className="mt-4 grid grid-cols-3 gap-2">
                            <span className="break-words border border-white/10 bg-black/35 px-2 py-2 text-center font-mono text-[8px] leading-tight text-white/60">
                              {formatRunLength(card.runLength)}
                            </span>
                            <span className="break-words border border-white/10 bg-black/35 px-2 py-2 text-center font-mono text-[8px] leading-tight text-white/60">
                              {formatRunSpeed(card.runSpeed)}
                            </span>
                            <span className="break-words border border-white/10 bg-black/35 px-2 py-2 text-center font-mono text-[8px] leading-tight text-white/60">
                              {formatRunTheme(card.runTheme)}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
                <div className="border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">下饭局长度</p>
                    <span className="text-[8px] font-mono text-neon-blue uppercase tracking-widest">Meal Run</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {RUN_LENGTH_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={runLength === option.id}
                        onMouseEnter={() => sfx.playHover()}
                        onClick={() => {
                          sfx.playClick();
                          setRunLength(option.id);
                        }}
                        className={`interactive-focus min-h-20 border p-3 text-left transition-[border-color,color,background-color] ${
                          runLength === option.id
                            ? 'border-neon-blue bg-neon-blue/10 text-white'
                            : 'border-white/10 text-white/50 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        <span className="block text-[10px] font-bold uppercase tracking-widest">{option.label}</span>
                        <span className="mt-2 block text-[8px] font-mono text-white/40">{option.rangeLabel}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border border-white/10 bg-black/20 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">演化加速</p>
                    <span className="text-[8px] font-mono text-neon-blue uppercase tracking-widest">Speed</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {RUN_SPEED_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={runSpeed === option.value}
                        onMouseEnter={() => sfx.playHover()}
                        onClick={() => {
                          sfx.playClick();
                          setRunSpeed(option.value);
                        }}
                        className={`interactive-focus h-12 border font-mono text-[10px] font-black transition-[border-color,color,background-color] ${
                          runSpeed === option.value
                            ? 'border-white bg-white text-black'
                            : 'border-white/10 text-white/50 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="relative mb-8 overflow-hidden border border-white/10 bg-black/20 p-4">
                <img
                  src="/media/run-theme-selector.svg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
                />
                <div className="relative">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">本局主题</p>
                    <span className="text-[8px] font-mono text-neon-blue uppercase tracking-widest">Run Theme</span>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-5">
                    {RUN_THEME_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-pressed={runTheme === option.id}
                        onMouseEnter={() => sfx.playHover()}
                        onClick={() => {
                          sfx.playClick();
                          setRunTheme(option.id);
                        }}
                        className={`interactive-focus min-h-24 border p-3 text-left transition-[border-color,color,background-color] ${
                          runTheme === option.id
                            ? 'border-yellow-300 bg-yellow-300/10 text-white'
                            : 'border-white/10 bg-black/35 text-white/50 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        <span className="block text-[10px] font-bold uppercase tracking-widest">{option.shortLabel}</span>
                        <span className="mt-2 block text-[8px] font-mono leading-relaxed text-white/40">{option.detail}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`relative mb-8 overflow-hidden border p-4 ${FORECAST_TONE_STYLES[runStartForecast.tone]}`}>
                <img
                  src="/media/run-start-forecast.svg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-24 mix-blend-screen"
                />
                <div className="relative grid grid-cols-1 gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Activity size={16} aria-hidden="true" />
                      <p className="text-[10px] font-mono uppercase tracking-widest">餐前观测简报</p>
                      <span className="border border-white/10 bg-black/45 px-2 py-1 text-[8px] font-mono uppercase tracking-widest text-white/45">
                        {runStartForecast.pressureLabel}
                      </span>
                    </div>
                    <h3 className="break-words text-xl font-black uppercase italic tracking-normal text-white">
                      {runStartForecast.title}
                    </h3>
                    <p className="mt-2 break-words text-[8px] font-mono uppercase tracking-widest text-white/40">
                      {runStartForecast.kicker}
                    </p>
                    <p className="mt-3 text-[8px] font-mono leading-relaxed text-white/45">
                      {runStartForecast.detail}
                    </p>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="border border-white/10 bg-black/35 p-2">
                        <span className="block text-[7px] font-mono uppercase tracking-widest text-white/30">种群</span>
                        <span className="mt-1 block text-xs font-black text-white">{runStartForecast.metrics.maxEntities}</span>
                      </div>
                      <div className="border border-white/10 bg-black/35 p-2">
                        <span className="block text-[7px] font-mono uppercase tracking-widest text-white/30">突变</span>
                        <span className="mt-1 block text-xs font-black text-white">{runStartForecast.metrics.mutationRatePercent}%</span>
                      </div>
                      <div className="border border-white/10 bg-black/35 p-2">
                        <span className="block text-[7px] font-mono uppercase tracking-widest text-white/30">熵压</span>
                        <span className="mt-1 block text-xs font-black text-white">{runStartForecast.metrics.entropyFactorPercent}%</span>
                      </div>
                      <div className="border border-white/10 bg-black/35 p-2">
                        <span className="block text-[7px] font-mono uppercase tracking-widest text-white/30">先手</span>
                        <span className="mt-1 block break-words text-xs font-black text-white">{formatIntervention(runStartForecast.suggestedIntervention)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 xl:grid-cols-1">
                    {runStartForecast.cues.map((cue) => (
                      <div key={cue.id} className="border border-white/10 bg-black/45 p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-[8px] font-mono uppercase tracking-widest text-white/35">{cue.phase}</span>
                          <span className={`h-2 w-2 shrink-0 ${cue.tone === 'danger' ? 'bg-red-300' : cue.tone === 'warning' ? 'bg-amber-300' : cue.tone === 'good' ? 'bg-emerald-300' : 'bg-cyan-300'}`} />
                        </div>
                        <h4 className="break-words text-[10px] font-black uppercase tracking-widest text-white">{cue.title}</h4>
                        <p className="mt-2 text-[8px] font-mono leading-relaxed text-white/45">{cue.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="relative mt-4 grid grid-cols-1 gap-2 lg:grid-cols-3">
                  <p className="border border-white/10 bg-black/35 p-3 text-[8px] font-mono leading-relaxed text-white/45">
                    <span className="mb-1 block uppercase tracking-widest text-white/35">观察焦点</span>
                    {runStartForecast.watchFocus}
                  </p>
                  <p className="border border-white/10 bg-black/35 p-3 text-[8px] font-mono leading-relaxed text-white/45">
                    <span className="mb-1 block uppercase tracking-widest text-white/35">科学框架</span>
                    {runStartForecast.scienceFrame}
                  </p>
                  <p className="border border-white/10 bg-black/35 p-3 text-[8px] font-mono leading-relaxed text-white/45">
                    <span className="mb-1 block uppercase tracking-widest text-white/35">历史类比</span>
                    {runStartForecast.historicalFrame}
                  </p>
                </div>
              </div>
              <div className="relative mb-8 overflow-hidden border border-white/10 bg-black/20 p-4">
                <img
                  src="/media/meal-run-prediction-slip.svg"
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-22 mix-blend-screen"
                />
                <div className="relative">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-cyan-100">
                        <ClipboardCheck size={16} aria-hidden="true" />
                        <p className="text-[10px] font-mono uppercase tracking-widest">餐前押题</p>
                      </div>
                      <p className="mt-2 text-[8px] font-mono leading-relaxed text-white/35">
                        开局前选择一个本局追逐目标；终局只按真实统计、事件、干预和收藏物判定命中。
                      </p>
                    </div>
                    <span className="shrink-0 border border-white/10 bg-black/40 px-3 py-2 text-[8px] font-mono uppercase tracking-widest text-white/35">
                      Prediction Slip
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
                    {mealRunPredictions.map((item) => {
                      const isSelected = selectedPrediction?.id === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={isSelected}
                          onMouseEnter={() => sfx.playHover()}
                          onClick={() => {
                            sfx.playClick();
                            setSelectedPredictionId(item.id);
                          }}
                          className={`interactive-focus flex min-h-48 flex-col border p-3 text-left transition-[border-color,color,background-color,transform] hover:-translate-y-0.5 ${
                            isSelected
                              ? 'border-cyan-300/50 bg-cyan-300/10 text-cyan-100 shadow-[0_0_24px_rgba(103,232,249,0.12)]'
                              : 'border-white/10 bg-black/45 text-white/55 hover:border-white/25 hover:text-white'
                          }`}
                        >
                          <span className="text-[8px] font-mono uppercase tracking-[0.25em] text-white/35">{item.kind}</span>
                          <span className="mt-2 line-clamp-2 text-[11px] font-black uppercase italic tracking-normal text-white">{item.title}</span>
                          <span className="mt-3 line-clamp-3 text-[8px] font-mono leading-relaxed text-white/45">{item.detail}</span>
                          <span className="mt-3 border border-white/10 bg-black/35 p-2 text-[8px] font-mono leading-relaxed text-white/45">
                            {item.target}
                          </span>
                          <span className="mt-auto pt-3 text-[8px] font-mono text-white/30">
                            先手 {formatIntervention(item.suggestedIntervention)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-16">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label htmlFor="mother-max-entities" className="text-[10px] font-mono text-white/40 uppercase tracking-widest">初始种群规模</label>
                      <span className="text-neon-blue font-mono text-xs">{config.maxEntities} Entities</span>
                    </div>
                    <input
                      id="mother-max-entities"
                      name="mother_max_entities"
                      type="range" min="10" max="2000" step="10"
                      value={config.maxEntities}
                      onChange={(e) => setConfig(normalizeSettings({ ...config, maxEntities: e.currentTarget.valueAsNumber }))}
                      className="interactive-focus w-full accent-neon-blue bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label htmlFor="mother-mutation-rate" className="text-[10px] font-mono text-white/40 uppercase tracking-widest">突变激进率</label>
                      <span className="text-neon-blue font-mono text-xs">{(config.mutationRate * 100).toFixed(1)}%</span>
                    </div>
                    <input
                      id="mother-mutation-rate"
                      name="mother_mutation_rate"
                      type="range" min="0.01" max="0.5" step="0.01"
                      value={config.mutationRate}
                      onChange={(e) => setConfig(normalizeSettings({ ...config, mutationRate: e.currentTarget.valueAsNumber }))}
                      className="interactive-focus w-full accent-neon-blue bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest">环境类型</p>
                    </div>
                    <div className="flex gap-3">
                      {envs.map(env => (
                        <button
                          type="button"
                          aria-pressed={config.envType === env.id}
                          key={env.id}
                          onClick={() => setConfig(normalizeSettings({ ...config, envType: env.id }))}
                          className={`interactive-focus flex-1 p-4 rounded-sm border flex flex-col items-center gap-2 transition-[border-color,color,background-color] ${config.envType === env.id ? `${env.border} ${env.color} bg-white/5` : 'border-white/5 text-white/20 hover:border-white/10'}`}
                        >
                          {env.icon}
                          <span className="text-[9px] uppercase tracking-normal font-mono">{env.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                    <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest block mb-4">核心进化协议</p>
                    {config.mutationRate > 0.3 && config.winningRule === 'CODE_SIZE' && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-sm mb-4 animate-pulse">
                        <div className="flex items-center gap-2 text-red-500 text-[9px] font-bold uppercase">
                          <AlertTriangle size={12} />
                          逻辑冲突预警
                        </div>
                        <p className="text-[8px] text-red-500/60 font-mono mt-1">Law #16: 高突变率会严重破坏极简指令集。建议降低突变率或更换协议。</p>
                      </div>
                    )}
                    {rules.map(rule => (
                    <button
                      type="button"
                      key={rule.id}
                      aria-pressed={config.winningRule === rule.id}
                      onClick={() => setConfig(normalizeSettings({ ...config, winningRule: rule.id }))}
                      className={`
                        interactive-focus group w-full p-5 rounded-sm border text-left cursor-pointer transition-[border-color,background-color,box-shadow] duration-300
                        ${config.winningRule === rule.id
                          ? 'border-neon-blue bg-neon-blue/5 shadow-[inset_0_0_20px_rgba(0,234,255,0.05)]'
                          : 'border-white/5 hover:border-white/20 bg-white/[0.02]'}
                      `}
                    >
                      <div className="flex items-center gap-5">
                        <div className={`${config.winningRule === rule.id ? 'text-neon-blue' : 'text-white/20'}`}>
                          {rule.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className={`text-xs font-bold uppercase tracking-widest ${config.winningRule === rule.id ? 'text-white' : 'text-white/60'}`}>
                              {rule.name}
                            </h4>
                            {config.winningRule === rule.id && <CheckCircle2 size={10} className="text-neon-blue" />}
                          </div>
                          <p className="text-[9px] text-white/30 mt-1 font-mono leading-relaxed">{rule.desc}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                {startError && (
                  <p aria-live="polite" className="mb-4 text-center text-[9px] text-red-400 font-mono uppercase tracking-widest">
                    {startError}
                  </p>
                )}
                <button
                  type="button"
                  disabled={isStarting}
                  aria-busy={isStarting}
                  onClick={handleStartSim}
                  className="interactive-focus group relative w-full py-8 bg-white text-black font-black uppercase tracking-[0.18em] text-sm transition-transform hover:scale-[1.01] active:scale-95 disabled:cursor-wait disabled:opacity-70 pulse-glow shadow-[0_0_40px_rgba(255,255,255,0.1)] sm:tracking-[0.3em]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-4">
                    开始下饭局
                    <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default MotherMachine;
