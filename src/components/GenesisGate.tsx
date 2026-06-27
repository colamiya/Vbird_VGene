import React, { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, Play, Activity, Terminal, Power, AlertTriangle } from 'lucide-react';
import { sfx } from '../utils/sfx';
import { bgm } from '../utils/bgm';
import { closeAppGracefully } from '../utils/windowControls';
import type { AppConfig, ComputeStatus } from '../types/world';

// 系统信息接口
interface GpuInfo {
  name: string;
  cuda_cores: number;
  memory_total: number;
}

interface SysInfo {
  cpu_brand: string;
  cpu_cores: number;
  os_info: string;
  mem_speed: string;
  mem_type: string;
  gpu_info: GpuInfo[];
}

interface GpuLiveStats {
  load: number;
  memory_usage: number;
  temperature: number;
}

interface LiveStats {
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  gpu_stats: GpuLiveStats[];
}

// 创世纪门属性接口
interface GenesisGateProps {
  config: AppConfig;
  onConfigChange: (config: AppConfig, context?: { currentConfig?: AppConfig }) => void | Promise<void>;
  onStart: (config: AppConfig) => void;
}

const SettingsModal = lazy(() => import('./SettingsModal'));
const NeuralBackground = lazy(() => import('./NeuralBackground'));

function preloadSettingsModal() {
  void import('./SettingsModal');
}

function SettingsFallback() {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
      <div className="border border-cyan-300/20 bg-black/90 px-5 py-4 text-center shadow-[0_0_28px_rgba(34,211,238,0.12)]">
        <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-cyan-200">加载系统配置</p>
      </div>
    </div>
  );
}

const GenesisGate: React.FC<GenesisGateProps> = ({ config, onConfigChange, onStart }) => {
  const [sysInfo, setSysInfo] = useState<SysInfo | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [computeStatus, setComputeStatus] = useState<ComputeStatus | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [introText, setIntroText] = useState('');
  const [systemStatus, setSystemStatus] = useState('');
  const [showNeuralBackground, setShowNeuralBackground] = useState(false);
  const hasLiveStatsRef = useRef(false);

  const fullIntro = "// 这里是数字生命的终极角斗场。VG 将模拟突变、竞争与消亡，在混沌中见证秩序的崛起。";

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

  useEffect(() => {
    const timer = window.setTimeout(() => setShowNeuralBackground(true), 320);
    return () => window.clearTimeout(timer);
  }, []);

  const handleExit = async () => {
    sfx.playClick();
    await closeAppGracefully();
  };

  useEffect(() => {
    // 获取基础系统信息
    const fetchSysInfo = async () => {
      try {
        const info = await invoke<SysInfo>('get_sys_info');
        setSysInfo(info);
        setSystemStatus('');
      } catch (e) {
        console.error('获取系统信息失败:', e);
        setSystemStatus(`硬件拓扑读取失败：${e instanceof Error ? e.message : String(e)}`);
      }
    };
    fetchSysInfo();

    // 实时数据轮询
    const statsTimer = setInterval(async () => {
      try {
        const stats = await invoke<LiveStats>('get_live_stats');
        setLiveStats(stats);
        hasLiveStatsRef.current = true;
        setSystemStatus((current) => current.startsWith('实时负载读取失败') ? '' : current);
      } catch (e) {
        if (!hasLiveStatsRef.current) {
          setSystemStatus(`实时负载读取失败：${e instanceof Error ? e.message : String(e)}`);
        }
      }
      try {
        setComputeStatus(await invoke<ComputeStatus>('get_compute_status'));
      } catch (e) {
        setComputeStatus((current) => current ?? {
          requested_backend: config.computeBackend,
          active_backend: 'CPU',
          cuda_available: false,
          device_name: null,
          compute_capability: null,
          vram_total: 0,
          vram_free: 0,
          gpu_load: 0,
          temperature: 0,
          last_kernel_ms: 0,
          fallback_reason: `计算后端读取失败：${e instanceof Error ? e.message : String(e)}`,
          adaptive_scale: 1,
          effective_entity_cap: config.maxEntities,
        });
      }
    }, 2000);

    return () => clearInterval(statsTimer);
  }, []);

  const memoryUsageRatio = liveStats && liveStats.memory_total > 0
    ? Math.min(100, Math.max(0, (liveStats.memory_usage / liveStats.memory_total) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-black px-4 py-12 select-none custom-scrollbar sm:py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(0,229,255,0.16),transparent_32%),radial-gradient(circle_at_74%_18%,rgba(157,78,221,0.12),transparent_28%),linear-gradient(180deg,#020406_0%,#000_76%)]"
      />
      {showNeuralBackground && (
        <Suspense fallback={null}>
          <NeuralBackground />
        </Suspense>
      )}

      {/* 硬件实时负载 HUD (左上 - 黑客流风格) - 绝对定位到屏幕边缘 */}
      <div className="fixed left-6 top-12 hidden w-80 z-[60] space-y-4 animate-in fade-in slide-in-from-left-8 duration-1000 delay-500 lg:block">
        <div className="glass-card p-4 rounded-sm border-l-2 border-l-neon-blue backdrop-blur-2xl bg-black/60 shadow-[0_0_20px_rgba(0,0,0,0.5)]">
          <div className="flex items-center justify-between text-neon-blue mb-4 font-mono text-[10px] uppercase tracking-widest border-b border-neon-blue/20 pb-2">
            <div className="flex items-center gap-2">
              <Terminal size={14} />
              <span>CORE_SIM_STATUS</span>
            </div>
            {liveStats && (
              <span className="text-[9px] animate-pulse">● SYSTEM_LIVE</span>
            )}
          </div>
          
          {sysInfo ? (
            <div className="space-y-4 font-mono text-[9px] text-white/60">
              {/* CPU Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-neon-blue/80">CPU_INF:</span>
                  <span className="text-[8px] text-white/40 truncate max-w-[180px]">{sysInfo.cpu_brand}</span>
                </div>
                <div className="flex justify-between text-[8px]">
                  <span>CORES: {sysInfo.cpu_cores}</span>
                  <span className="text-neon-blue">{liveStats ? liveStats.cpu_usage.toFixed(1) : '--'}% LOAD</span>
                </div>
                <div className="h-0.5 bg-white/5 w-full">
                  <div 
                    className="h-full bg-neon-blue shadow-neon transition-[width] duration-500"
                    style={{ width: `${liveStats?.cpu_usage || 0}%` }}
                  />
                </div>
              </div>

              {/* Memory Section */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex justify-between">
                  <span className="text-neon-purple/80">MEM_INF:</span>
                  <span className="text-white/40">{sysInfo.mem_type} @ {sysInfo.mem_speed}</span>
                </div>
                <div className="flex justify-between text-[8px]">
                  <span>{liveStats ? `${Math.round(liveStats.memory_usage)}MB / ${Math.round(liveStats.memory_total)}MB` : '--'}</span>
                  <span className="text-neon-purple">{liveStats ? memoryUsageRatio.toFixed(1) : '--'}%</span>
                </div>
                <div className="h-0.5 bg-white/5 w-full">
                  <div
                    className="h-full bg-neon-purple shadow-neon transition-[width] duration-500"
                    style={{ width: `${memoryUsageRatio}%` }}
                  />
                </div>
              </div>

              {/* GPU Section */}
              {sysInfo.gpu_info.length > 0 ? (
                sysInfo.gpu_info.map((gpu, idx) => (
                  <div key={idx} className="space-y-2 pt-2 border-t border-white/5">
                    <div className="flex justify-between items-end">
                      <span className="text-green-400/80">GPU_INF:</span>
                      <span className="text-[8px] text-white/40 truncate max-w-[180px]">{gpu.name}</span>
                    </div>
                    <div className="flex justify-between text-[8px]">
                      <span>CUDA_CORES: {gpu.cuda_cores}</span>
                      <span className="text-green-400">{liveStats?.gpu_stats[idx]?.load || 0}% LOAD</span>
                    </div>
                    <div className="flex justify-between text-[8px]">
                      <span>TEMP: {liveStats?.gpu_stats[idx]?.temperature || 0}°C</span>
                      <span>VRAM: {liveStats ? `${Math.round((liveStats.gpu_stats[idx]?.memory_usage ?? 0) / 1024 / 1024)}MB / ${Math.round(gpu.memory_total / 1024 / 1024)}MB` : '--'}</span>
                    </div>
                    <div className="h-0.5 bg-white/5 w-full">
                      <div
                        className="h-full bg-green-400 shadow-neon transition-[width] duration-500"
                        style={{ width: `${liveStats?.gpu_stats[idx]?.load || 0}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="pt-2 border-t border-white/5 text-[8px] text-white/20 italic">
                  NO_DISCRETE_GPU_DETECTED
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-white/5">
                <div className="flex justify-between items-end">
                  <span className="text-cyan-300/80">COMPUTE:</span>
                  <span className={computeStatus?.active_backend === 'CUDA' ? 'text-green-400' : 'text-yellow-300'}>
                    {computeStatus?.active_backend === 'CUDA' ? 'CUDA_EXPERIMENTAL' : 'CPU_FALLBACK'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[8px]">
                  <span>REQ: {computeStatus?.requested_backend ?? config.computeBackend}</span>
                  <span>SCALE: {computeStatus ? computeStatus.adaptive_scale.toFixed(2) : '1.00'}x</span>
                  <span>KERNEL: {computeStatus ? computeStatus.last_kernel_ms.toFixed(2) : '--'}ms</span>
                  <span>CAP: {computeStatus?.effective_entity_cap || config.maxEntities}</span>
                </div>
                {computeStatus?.fallback_reason && (
                  <p className="text-[7px] leading-relaxed text-yellow-300/60">
                    {computeStatus.fallback_reason}
                  </p>
                )}
              </div>

              <div className="pt-2 border-t border-white/5 text-[7px] text-white/20 uppercase tracking-normal flex justify-between">
                <span>{sysInfo.os_info}</span>
                <span>SECURE_BOOT_ENABLED</span>
              </div>
            </div>
          ) : systemStatus ? (
            <div className="flex flex-col gap-2 text-red-400/80 font-mono text-[9px] py-8">
              <div className="flex items-center gap-2 justify-center">
                <AlertTriangle size={12} aria-hidden="true" />
                <span>HARDWARE_TOPOLOGY_UNAVAILABLE</span>
              </div>
              <p aria-live="polite" className="text-center text-[8px] text-red-400/60 leading-relaxed">
                {systemStatus}
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/20 font-mono text-[9px] py-8 justify-center">
              <Activity size={12} className="animate-spin" />
              <span>ANALYZING_HARDWARE_TOPOLOGY…</span>
            </div>
          )}
        </div>
      </div>

      {/* 动态背景覆盖层 - 允许拖动 */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/40 to-black/80 pointer-events-none" />

      {/* 主容器 */}
      <div className="relative w-full max-w-4xl px-4 sm:px-6 flex flex-col items-center z-10">

        {/* 标题部分 */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-5xl sm:text-7xl lg:text-9xl font-black tracking-[0.08em] sm:tracking-[0.2em] text-white drop-shadow-neon font-display transition-transform hover:scale-105 duration-500">
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
            type="button"
            onMouseEnter={() => sfx.playHover()}
            onClick={() => {
              sfx.playClick();
              bgm.play('STARTUP'); // 确保在用户点击后激活音频上下文
              onStart(config);
            }}
            className="interactive-focus group relative w-full py-6 bg-white text-black font-black uppercase tracking-[0.3em] text-lg transition-transform hover:scale-105 active:scale-95 pulse-glow overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.3)]"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <Play size={24} fill="currentColor" />
              初始化模拟
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </button>

          <div className="flex gap-4 w-full">
            <button
              type="button"
              onMouseEnter={() => {
                preloadSettingsModal();
                sfx.playHover();
              }}
              onFocus={preloadSettingsModal}
              onClick={() => {
                sfx.playClick();
                preloadSettingsModal();
                setIsSettingsOpen(true);
              }}
              className="interactive-focus flex-1 flex items-center justify-center gap-3 py-4 glass-card rounded-sm text-white/60 hover:text-white hover:bg-white/10 transition-[border-color,color,background-color] font-mono text-xs uppercase tracking-widest border border-white/10 hover:border-neon-blue/50"
            >
              <Settings size={14} />
              系统配置
            </button>

            <button
              type="button"
              aria-label="退出程序"
              onMouseEnter={() => sfx.playHover()}
              onClick={() => {
                sfx.playClick();
                setShowExitConfirm(true);
              }}
              className="interactive-focus px-6 py-4 glass-card rounded-sm text-red-500/40 hover:text-red-500 hover:bg-red-500/10 transition-[border-color,color,background-color] font-mono text-xs uppercase tracking-widest border border-white/5 hover:border-red-500/50"
            >
              <Power size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 引擎版本 (右下) */}
      <div className="absolute bottom-4 right-4 hidden flex-col items-end gap-2 animate-in fade-in slide-in-from-right-8 duration-1000 delay-700 sm:bottom-10 sm:right-10 sm:flex">
        <div className="flex items-center gap-3 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">
          <span>Neural Evolution Sandbox</span>
          <span className="h-px w-8 bg-white/10" />
          <span>V-GENE 0.1.0</span>
        </div>
        <div className="text-[9px] font-mono text-white/10 uppercase tracking-widest">
          Protocol: X-EVO-2026
        </div>
      </div>

      {/* 退出确认弹窗 */}
      {showExitConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="exit-confirm-title" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-300 modal-scroll-lock">
          <div className="w-80 glass-card p-8 rounded-sm border border-red-500/20 text-center animate-in zoom-in-95 duration-300">
            <AlertTriangle className="text-red-500 mx-auto mb-4" size={32} />
            <h3 id="exit-confirm-title" className="text-white text-sm font-bold uppercase tracking-widest mb-2">断开连接?</h3>
            <p className="text-white/40 text-[10px] font-mono mb-8 uppercase leading-relaxed">
              确定要终止当前的数字生命演化进程并退出系统吗？
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="interactive-focus flex-1 py-3 text-[10px] font-mono uppercase tracking-widest text-white/40 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleExit}
                className="interactive-focus flex-1 py-3 bg-red-500 text-black font-bold text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-transform"
              >
                退出协议
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 设置模态框 */}
      {isSettingsOpen && (
        <Suspense fallback={<SettingsFallback />}>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            config={config}
            onSave={onConfigChange}
          />
        </Suspense>
      )}
    </div>
  );
};

export default GenesisGate;
