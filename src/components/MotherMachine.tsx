import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Zap, Shield, Target, Activity, Terminal, Sliders } from 'lucide-react';
import DivineMandate from './DivineMandate';

interface MotherMachineProps {
  onStart: (config: any) => void;
  onBack: () => void;
}

const MotherMachine: React.FC<MotherMachineProps> = ({ onStart, onBack }) => {
  const [mode, setMode] = useState<'MANUAL' | 'ORACLE'>('MANUAL');
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

  const handleMandateIssued = (oracleConfig: any) => {
    setConfig({ ...config, ...oracleConfig });
    // 可以选择自动开始，或者让用户确认
    // 这里我们先切换回手动模式让用户确认
    setMode('MANUAL');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black font-display">
      <div className="w-full max-w-6xl p-8 grid grid-cols-12 gap-8 animate-in fade-in zoom-in-95 duration-700 h-[80vh]">
        
        {/* 左侧：导航与标题 */}
        <div className="col-span-4 flex flex-col h-full border-r border-white/5 pr-8">
          <div>
            <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] uppercase tracking-widest font-mono">返回门户</span>
            </button>
            <h2 className="text-4xl font-black text-white tracking-tight uppercase italic leading-none">
              母亲机床 <br/>
              <span className="text-neon-blue text-2xl not-italic">/ MOTHER MACHINE</span>
            </h2>
            <p className="text-white/40 text-[10px] mt-4 font-mono uppercase tracking-widest leading-relaxed">
              // 设定宇宙常数与进化法则。<br/>
              // 选择手动调参或接入神谕系统。
            </p>
          </div>

          <div className="mt-12 space-y-4">
            <button 
              onClick={() => setMode('MANUAL')}
              className={`w-full p-4 flex items-center gap-4 rounded-sm border transition-all ${mode === 'MANUAL' ? 'border-neon-blue bg-neon-blue/10 text-white' : 'border-white/5 text-white/40 hover:border-white/20'}`}
            >
              <Sliders size={20} />
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-widest">手动校准</div>
                <div className="text-[9px] opacity-60 font-mono">Manual Calibration</div>
              </div>
            </button>

            <button 
              onClick={() => setMode('ORACLE')}
              className={`w-full p-4 flex items-center gap-4 rounded-sm border transition-all ${mode === 'ORACLE' ? 'border-neon-blue bg-neon-blue/10 text-white' : 'border-white/5 text-white/40 hover:border-white/20'}`}
            >
              <Terminal size={20} />
              <div className="text-left">
                <div className="text-xs font-bold uppercase tracking-widest">神谕终端</div>
                <div className="text-[9px] opacity-60 font-mono">Divine Mandate Interface</div>
              </div>
            </button>
          </div>
        </div>

        {/* 右侧：内容区 */}
        <div className="col-span-8 flex flex-col h-full relative">
          
          {mode === 'ORACLE' ? (
             <div className="h-full flex flex-col animate-in slide-in-from-right-4 duration-500">
               <div className="flex-1 mb-8">
                 <DivineMandate onMandateIssued={handleMandateIssued} />
               </div>
               <p className="text-center text-[10px] text-white/20 font-mono">
                 注意: 神谕系统通过自然语言解析生成参数，可能产生不可预知的进化后果。
               </p>
             </div>
          ) : (
            <div className="h-full flex flex-col justify-between animate-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex justify-between items-end">
                      <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">初始种群规模</label>
                      <span className="text-neon-blue font-mono text-xs">{config.maxEntities} 个体</span>
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
                      <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest">熵增损耗系数</label>
                      <span className="text-neon-blue font-mono text-xs">{config.entropyFactor.toFixed(2)}</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.05"
                      value={config.entropyFactor}
                      onChange={(e) => setConfig({...config, entropyFactor: parseFloat(e.target.value)})}
                      className="w-full accent-neon-blue bg-white/5 h-1 rounded-full appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block mb-4">核心进化协议</label>
                  {rules.map(rule => (
                    <div 
                      key={rule.id}
                      onClick={() => setConfig({...config, winningRule: rule.id})}
                      className={`
                        group p-4 rounded-sm border cursor-pointer transition-all duration-300
                        ${config.winningRule === rule.id 
                          ? 'border-neon-blue bg-neon-blue/5' 
                          : 'border-white/5 hover:border-white/20 bg-white/2'}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`${config.winningRule === rule.id ? 'text-neon-blue' : 'text-white/20'}`}>
                          {rule.icon}
                        </div>
                        <div>
                          <h4 className={`text-xs font-bold uppercase tracking-widest ${config.winningRule === rule.id ? 'text-white' : 'text-white/60'}`}>
                            {rule.name}
                          </h4>
                          <p className="text-[9px] text-white/30 mt-1 font-mono">{rule.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-8 border-t border-white/5">
                <button 
                  onClick={() => onStart(config)}
                  className="group relative w-full py-6 bg-white text-black font-black uppercase tracking-[0.5em] text-sm transition-all hover:scale-[1.01] active:scale-95 pulse-glow"
                >
                  <span className="relative z-10 flex items-center justify-center gap-3">
                    开始数字大爆炸
                    <ArrowRight size={18} />
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
