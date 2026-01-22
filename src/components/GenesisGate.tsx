import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Settings, Play, Cpu, Activity, Info, Terminal, Power, AlertTriangle } from 'lucide-react';
import SettingsModal from './SettingsModal';
import NeuralBackground from './NeuralBackground';
import { sfx } from '../utils/sfx';
import { bgm } from '../utils/bgm';

// 系统信息接口
interface SysInfo {
  cpu_brand: string;
  cpu_cores: number;
  os_info: string;
}

interface LiveStats {
  cpu_usage: f32;
  memory_usage: f32;
  memory_total: f32;
}

// 创世纪门属性接口
interface GenesisGateProps {
  onStart: (config: any) => void;
}

const GenesisGate: React.FC<GenesisGateProps> = ({ onStart }) => {
  const [sysInfo, setSysInfo] = useState<SysInfo | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [introText, setIntroText] = useState('');
  const [config, setConfig] = useState({
    maxEntities: 500,
    mutationRate: 0.05,
    ollamaUrl: 'http://localhost:11434',
    modelName: 'llama3',
    mode: 'LocalMock'
  });

  const fullIntro = "// 欢迎来到 V-GENE。这里是数字生命的终极角斗场。我们将模拟突变、竞争与消亡，在混沌中见证秩序的崛起。";

  // 打字机效果
  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      setIntroText(fullIntro.slice(0, i));
      i++;
      if (i > fullIntro.length) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, []);

  const handleExit = async () => {
    sfx.playClick();
    const appWindow = getCurrentWindow();
    await appWindow.close();
  };

  useEffect(() => {
    // 获取基础系统信息
    const fetchSysInfo = async () => {
      try {
        const info = await invoke<SysInfo>('get_sys_info');
        setSysInfo(info);
      } catch (e) {
        console.error('获取系统信息失败:', e);
      }
    };
    fetchSysInfo();

    // 实时数据轮询
    const statsTimer = setInterval(async () => {
      try {
        const stats = await invoke<LiveStats>('get_live_stats');
        setLiveStats(stats);
      } catch (e) {
        // 静默失败
      }
    }, 2000);

    return () => clearInterval(statsTimer);
  }, []);

  return (
    <div 
      data-tauri-drag-region
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-black select-none"
    >
      {/* 3D 动态背景 */}
      <NeuralBackground />

      {/* 动态背景覆盖层 - 允许拖动 */}
      <div 
        data-tauri-drag-region
        className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80 pointer-events-none" 
      />
      
      {/* 主容器 */}
      <div data-tauri-drag-region className="relative w-full max-w-4xl px-6 flex flex-col items-center z-10">
        
        {/* 标题部分 */}
        <div data-tauri-drag-region className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-9xl font-black tracking-[0.2em] text-white drop-shadow-neon font-display transition-all hover:scale-105 duration-500">
            V-GENE
          </h1>
          <div className="h-1 w-48 bg-neon-blue mx-auto mt-4 shadow-neon animate-pulse" />
          <div className="mt-8 min-h-[1.5em] max-w-lg mx-auto">
            <p className="text-neon-blue/80 font-mono text-[10px] tracking-widest uppercase leading-relaxed text-center">
              {introText}
              <span className="inline-block w-2 h-4 bg-neon-blue ml-1 animate-pulse" />
            </p>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex flex-col items-center gap-8 w-full max-w-md animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
          <button 
            onMouseEnter={() => sfx.playHover()}
            onClick={() => {
              sfx.playClick();
              bgm.play('STARTUP'); // 确保在用户点击后激活音频上下文
              onStart(config);
            }}
            className="group relative w-full py-6 bg-white text-black font-black uppercase tracking-[0.3em] text-lg transition-all hover:scale-105 active:scale-95 pulse-glow overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.3)]"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <Play size={24} fill="currentColor" />
              初始化模拟
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </button>

          <div className="flex gap-4 w-full">
            <button 
              onMouseEnter={() => sfx.playHover()}
              onClick={() => {
                sfx.playClick();
                setIsSettingsOpen(true);
              }}
              className="flex-1 flex items-center justify-center gap-3 py-4 glass-card rounded-sm text-white/60 hover:text-white hover:bg-white/10 transition-all font-mono text-xs uppercase tracking-widest border border-white/10 hover:border-neon-blue/50"
            >
              <Settings size={14} />
              系统配置
            </button>

            <button 
              onMouseEnter={() => sfx.playHover()}
              onClick={() => {
                sfx.playClick();
                setShowExitConfirm(true);
              }}
              className="px-6 py-4 glass-card rounded-sm text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-all font-mono text-xs uppercase tracking-widest border border-white/5 hover:border-red-500/50"
            >
              <Power size={14} />
            </button>
          </div>
        </div>

        {/* 硬件实时负载 HUD (左下) */}
        <div className="absolute left-10 bottom-10 w-64 space-y-4 animate-in fade-in slide-in-from-left-8 duration-1000 delay-500">
          <div className="glass-card p-5 rounded-sm border-l-2 border-l-neon-blue backdrop-blur-2xl">
            <div className="flex items-center justify-between text-neon-blue mb-4 font-mono text-[10px] uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Cpu size={14} />
                <span>计算核心状态</span>
              </div>
              {liveStats && (
                <span className="text-[9px] animate-pulse">● LIVE</span>
              )}
            </div>
            
            {sysInfo ? (
              <div className="space-y-4 font-mono text-[10px]">
                <div className="space-y-1">
                  <div className="flex justify-between text-white/40">
                    <span>CPU 负载</span>
                    <span className="text-white">{liveStats ? liveStats.cpu_usage.toFixed(1) : '--'}%</span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-neon-blue transition-all duration-500" 
                      style={{ width: `${liveStats?.cpu_usage || 0}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-white/40">
                    <span>内存占用</span>
                    <span className="text-white">
                      {liveStats ? `${Math.round(liveStats.memory_usage)} / ${Math.round(liveStats.memory_total)} MB` : '--'}
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-neon-purple transition-all duration-500" 
                      style={{ width: `${liveStats ? (liveStats.memory_usage / liveStats.memory_total * 100) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/5 text-[9px] text-white/20 uppercase tracking-tighter truncate">
                  {sysInfo.cpu_brand}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/20 font-mono text-[10px]">
                <Activity size={12} className="animate-spin" />
                正在解析硬件拓扑...
              </div>
            )}
          </div>
        </div>

        {/* 引擎版本 (右下) */}
        <div className="absolute right-10 bottom-10 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-right-8 duration-1000 delay-700">
           <div className="flex items-center gap-3 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">
             <span>Neural Evolution Sandbox</span>
             <span className="h-px w-8 bg-white/10" />
             <span>V-GENE 0.1.2</span>
           </div>
           <div className="text-[9px] font-mono text-white/10 uppercase tracking-widest">
             Protocol: X-EVO-2026
           </div>
        </div>

      </div>

      {/* 退出确认弹窗 */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-80 glass-card p-8 rounded-sm border border-red-500/20 text-center animate-in zoom-in-95 duration-300">
            <AlertTriangle className="text-red-500 mx-auto mb-4" size={32} />
            <h3 className="text-white text-sm font-bold uppercase tracking-widest mb-2">断开连接?</h3>
            <p className="text-white/40 text-[10px] font-mono mb-8 uppercase leading-relaxed">
              确定要终止当前的数字生命演化进程并退出系统吗？
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 py-3 text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                取消
              </button>
              <button 
                onClick={handleExit}
                className="flex-1 py-3 bg-red-500 text-black font-bold text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
              >
                退出协议
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 设置模态框 */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={(newConfig) => setConfig({ ...config, ...newConfig })} 
      />
    </div>
  );
};

export default GenesisGate;
