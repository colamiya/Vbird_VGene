import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Zap, Shield, Target, Activity, Terminal, Sliders, Globe, Anchor, Rocket, CheckCircle2, History, AlertTriangle } from 'lucide-react';
import DivineMandate from './DivineMandate';
import { sfx } from '../utils/sfx';

interface MotherMachineProps {
  onStart: (config: any) => void;
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

const MotherMachine: React.FC<MotherMachineProps> = ({ onStart, onBack }) => {
  const [mode, setMode] = useState<'MANUAL' | 'ORACLE' | 'PREVIEW'>('MANUAL');
  const [isStarting, setIsStarting] = useState(false);
  const [startProgress, setStartProgress] = useState(0);
  const [oracleResult, setOracleResult] = useState<any>(null);
  const [config, setConfig] = useState({
    maxEntities: 500,
    mutationRate: 0.05,
    entropyFactor: 0.1,
    winningRule: 'SURVIVAL', // SURVIVAL, CODE_SIZE, PREDATION
    envType: 'EARTH' // EARTH, DEEP_SEA, SPACE
  });

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
    setOracleResult(newOracleConfig);
    setMode('PREVIEW');
  };

  const applyOracle = () => {
    sfx.playClick();
    setConfig({ ...config, ...oracleResult });
    setMode('MANUAL');
  };

  const handleStartSim = () => {
    sfx.playClick();
    setIsStarting(true);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 15;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => onStart(config), 500);
      }
      setStartProgress(p);
    }, 200);
  };

  // 根据环境选择当前主题色
  const currentEnv = envs.find(e => e.id === config.envType) || envs[0];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black font-display transition-colors duration-1000 ${currentEnv.bg}`}>
      
      {/* 启动遮罩 */}
      {isStarting && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500">
          <div className="w-96 space-y-8">
            <div className="flex justify-between items-end font-mono text-[10px] text-neon-blue uppercase tracking-widest">
              <span>正在构建初始化参数...</span>
              <span>{Math.round(startProgress)}%</span>
            </div>
            <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-neon-blue transition-all duration-300 shadow-[0_0_15px_rgba(0,234,255,0.5)]" 
                style={{ width: `${startProgress}%` }}
              />
            </div>
            <div className="space-y-2">
              <p className="text-[8px] font-mono text-white/20 uppercase tracking-tighter">
                &gt; Compiling Wasm Runtime...
              </p>
              <p className="text-[8px] font-mono text-white/20 uppercase tracking-tighter">
                &gt; Initializing Population Swarm...
              </p>
              {startProgress > 60 && (
                <p className="text-[8px] font-mono text-white/20 uppercase tracking-tighter">
                  &gt; Constructing Spatial Grid Map...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-7xl p-8 grid grid-cols-12 gap-12 animate-in fade-in zoom-in-95 duration-700 h-[85vh]">
        
        {/* 左侧：导航与预设 */}
        <div className="col-span-3 flex flex-col h-full border-r border-white/5 pr-8">
          <div>
            <button 
              onMouseEnter={() => sfx.playHover()}
              onClick={onBack} 
              className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] uppercase tracking-widest font-mono">返回门户</span>
            </button>
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic leading-none">
              母亲机床 <br/>
              <span className={`${currentEnv.color} text-2xl not-italic transition-colors duration-1000`}>/ MOTHER MACHINE</span>
            </h2>
            <p className="text-white/40 text-[9px] mt-6 font-mono uppercase tracking-widest leading-relaxed">
              // 设定演化常数。<br/>
              // 模拟环境: <span className={currentEnv.color}>{currentEnv.name}</span>
            </p>
          </div>

          <div className="mt-12 space-y-3">
            <label className="text-[9px] font-mono text-white/20 uppercase tracking-widest block mb-4">演化模式</label>
            <button 
              onMouseEnter={() => sfx.playHover()}
              onClick={() => setMode('MANUAL')}
              className={`w-full p-4 flex items-center gap-4 rounded-sm border transition-all ${mode === 'MANUAL' ? 'border-white bg-white/10 text-white' : 'border-white/5 text-white/40 hover:border-white/20'}`}
            >
              <Sliders size={18} />
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-widest">手动调参</div>
                <div className="text-[8px] opacity-60 font-mono italic">Manual Tuning</div>
              </div>
            </button>
            <button 
              onMouseEnter={() => sfx.playHover()}
              onClick={() => setMode('ORACLE')}
              className={`w-full p-4 flex items-center gap-4 rounded-sm border transition-all ${mode === 'ORACLE' ? 'border-neon-blue bg-neon-blue/10 text-white shadow-neon' : 'border-white/5 text-white/40 hover:border-white/20'}`}
            >
              <Terminal size={18} />
              <div className="text-left">
                <div className="text-[10px] font-bold uppercase tracking-widest">接入神谕</div>
                <div className="text-[8px] opacity-60 font-mono italic">Divine Mandate</div>
              </div>
            </button>
          </div>

          <div className="mt-auto pt-8 border-t border-white/5">
            <label className="text-[9px] font-mono text-white/20 uppercase tracking-widest block mb-4">快速预设</label>
            <div className="space-y-2">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onMouseEnter={() => sfx.playHover()}
                  onClick={() => {
                    sfx.playClick();
                    setConfig(p.config);
                  }}
                  className="w-full p-3 glass-card rounded-sm text-left hover:border-white/20 transition-all group"
                >
                  <div className="text-[10px] font-bold text-white/80 group-hover:text-white transition-colors uppercase tracking-widest">{p.name}</div>
                  <div className="text-[8px] text-white/20 font-mono mt-1">{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 右侧：内容区 */}
        <div className="col-span-9 flex flex-col h-full relative">
          
          {mode === 'ORACLE' ? (
             <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-500">
               <div className="flex-1 mb-8">
                 <DivineMandate onMandateIssued={handleMandateIssued} />
               </div>
               <p className="text-center text-[9px] text-white/20 font-mono uppercase tracking-widest">
                 注意: 神谕生成的参数将基于自然语言解析，可能导致极端的演化压力。
               </p>
             </div>
          ) : mode === 'PREVIEW' ? (
            <div className="h-full flex flex-col justify-center items-center animate-in zoom-in-95 duration-500">
              <div className="w-full max-w-2xl glass-card p-10 border-neon-blue/40 shadow-neon-lg">
                <div className="flex items-center gap-3 mb-8">
                  <History className="text-neon-blue" size={24} />
                  <h3 className="text-xl font-black text-white uppercase tracking-widest">神谕结果预览</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-8 mb-10">
                  <div className="space-y-4">
                    <label className="text-[10px] font-mono text-white/20 uppercase tracking-widest block">参数项</label>
                    <div className="text-xs font-mono text-white/60 py-2 border-b border-white/5">初始规模</div>
                    <div className="text-xs font-mono text-white/60 py-2 border-b border-white/5">突变概率</div>
                    <div className="text-xs font-mono text-white/60 py-2 border-b border-white/5">环境类型</div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[10px] font-mono text-white/20 uppercase tracking-widest block">变更建议</label>
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
                    onClick={() => setMode('MANUAL')}
                    className="flex-1 py-4 border border-white/10 text-white/40 hover:text-white font-mono text-xs uppercase tracking-widest transition-all"
                  >
                    放弃建议
                  </button>
                  <button 
                    onClick={applyOracle}
                    className="flex-1 py-4 bg-neon-blue text-black font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-neon"
                  >
                    采纳神谕
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col justify-between animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-16">
                <div className="space-y-10">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">初始种群规模</label>
                      <span className="text-neon-blue font-mono text-xs">{config.maxEntities} Entities</span>
                    </div>
                    <input 
                      type="range" min="10" max="2000" step="10"
                      value={config.maxEntities}
                      onChange={(e) => setConfig({...config, maxEntities: parseInt(e.target.value)})}
                      className="w-full accent-neon-blue bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">突变激进率</label>
                      <span className="text-neon-blue font-mono text-xs">{(config.mutationRate * 100).toFixed(1)}%</span>
                    </div>
                    <input 
                      type="range" min="0.01" max="0.5" step="0.01"
                      value={config.mutationRate}
                      onChange={(e) => setConfig({...config, mutationRate: parseFloat(e.target.value)})}
                      className="w-full accent-neon-blue bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">环境类型</label>
                    </div>
                    <div className="flex gap-3">
                      {envs.map(env => (
                        <button
                          key={env.id}
                          onClick={() => setConfig({...config, envType: env.id as any})}
                          className={`flex-1 p-4 rounded-sm border flex flex-col items-center gap-2 transition-all ${config.envType === env.id ? `${env.border} ${env.color} bg-white/5` : 'border-white/5 text-white/20 hover:border-white/10'}`}
                        >
                          {env.icon}
                          <span className="text-[9px] uppercase tracking-tighter font-mono">{env.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                    <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block mb-4">核心进化协议</label>
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
                    <div 
                      key={rule.id}
                      onClick={() => setConfig({...config, winningRule: rule.id})}
                      className={`
                        group p-5 rounded-sm border cursor-pointer transition-all duration-300
                        ${config.winningRule === rule.id 
                          ? 'border-neon-blue bg-neon-blue/5 shadow-[inset_0_0_20px_rgba(0,234,255,0.05)]' 
                          : 'border-white/5 hover:border-white/20 bg-white/2'}
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
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <button 
                  onClick={handleStartSim}
                  className="group relative w-full py-8 bg-white text-black font-black uppercase tracking-[0.6em] text-sm transition-all hover:scale-[1.01] active:scale-95 pulse-glow shadow-[0_0_40px_rgba(255,255,255,0.1)]"
                >
                  <span className="relative z-10 flex items-center justify-center gap-4">
                    开始数字大爆炸
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
