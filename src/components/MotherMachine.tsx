import React, { useState } from 'react';
import { ArrowRight, ArrowLeft, Zap, Shield, Target, Activity } from 'lucide-react';

interface MotherMachineProps {
  onStart: (config: any) => void;
  onBack: () => void;
}

const MotherMachine: React.FC<MotherMachineProps> = ({ onStart, onBack }) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black font-display">
      <div className="w-full max-w-5xl p-12 grid grid-cols-2 gap-16 animate-in fade-in zoom-in-95 duration-700">
        
        {/* 左侧：参数调整 */}
        <div className="space-y-10">
          <div>
            <button onClick={onBack} className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group">
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[10px] uppercase tracking-widest font-mono">返回门户</span>
            </button>
            <h2 className="text-4xl font-black text-white tracking-tight uppercase italic">
              母亲机床 <span className="text-neon-blue">/ CONFIG</span>
            </h2>
            <p className="text-white/40 text-xs mt-2 font-mono uppercase tracking-widest">// 设定宇宙常数与进化法则</p>
          </div>

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
        </div>

        {/* 右侧：规则与启动 */}
        <div className="flex flex-col justify-between">
          <div className="space-y-8">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">核心进化协议</label>
            <div className="space-y-4">
              {rules.map(rule => (
                <div 
                  key={rule.id}
                  onClick={() => setConfig({...config, winningRule: rule.id})}
                  className={`
                    group p-6 rounded-sm border cursor-pointer transition-all duration-300
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

          <button 
            onClick={() => onStart(config)}
            className="group relative w-full py-8 bg-white text-black font-black uppercase tracking-[0.5em] text-sm transition-all hover:scale-[1.02] active:scale-95 pulse-glow"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              开始数字大爆炸
              <ArrowRight size={18} />
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default MotherMachine;
