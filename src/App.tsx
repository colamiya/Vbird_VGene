import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Arena from './components/Arena';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import GenesisGate from './components/GenesisGate';
import MotherMachine from './components/MotherMachine';
import PhoenixReview from './components/PhoenixReview';
import SettingsModal from './components/SettingsModal';
import MicroArena from './components/MicroArena';
import PhylogeneticTree from './components/PhylogeneticTree';
import TitleBar from './components/TitleBar';
import { Settings, Play, Pause, Activity, Cpu, Terminal, Zap, FastForward, Microscope } from 'lucide-react';
import { sfx } from './utils/sfx';
import { bgm } from './utils/bgm';

// 阶段定义
type AppStage = 'SPLASH' | 'CONFIG' | 'SIMULATION' | 'REVIEW';

// 实体视图接口
interface EntityView {
  id: number;
  position: [number, number, number];
  ethics: { altruism: number; collaboration: number };
  score: number;
  energy: number;
  metabolic_toxin: number;
  generation: number;
}

// 实体接口（扩展实体视图）
interface Entity extends EntityView {
  dna: string;
  stats: { attack: number; defense: number; tech_level: number; efficiency: number };
}

function App() {
  const [stage, setStage] = useState<AppStage>('SPLASH');
  const [entities, setEntities] = useState<EntityView[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [stats, setStats] = useState({ avgScore: 0, population: 0, avgGeneration: 0, entropy: 0 });
  const [sysInfo, setSysInfo] = useState<any>({ cpu_brand: '', cpu_cores: 0, os_info: '', mem_speed: '', mem_type: '', gpu_info: [] });
  const [liveStats, setLiveStats] = useState<any>(null);
  const [isLeaping] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [isMicroArenaOpen, setIsMicroArenaOpen] = useState(false);
  const [currentLaw, setCurrentLaw] = useState({ name: '', description: '' });

  useEffect(() => {
    const fetchSysInfo = async () => {
      try {
        const info = await invoke<any>('get_sys_info');
        setSysInfo(info);
      } catch (e) {
        console.error("获取系统信息失败:", e);
      }
    };
    fetchSysInfo();

    // 加载并应用初始设置
    const initSettings = async () => {
      try {
        const saved = await invoke<any>('load_settings');
        if (saved) {
          setConfig(saved);
          // 应用显示模式
          const { resolution, display_mode } = saved;
          const appWindow = getCurrentWindow();
          if (display_mode === 'Fullscreen') {
            await appWindow.setFullscreen(true);
          } else if (display_mode === 'Borderless') {
            await appWindow.setFullscreen(false);
            await appWindow.maximize();
          } else if (resolution) {
            const [width, height] = resolution.split('x').map(Number);
            await appWindow.setFullscreen(false);
            await appWindow.unmaximize();
            await appWindow.setSize(new LogicalSize(width, height));
            await appWindow.center();
          }
          await invoke('logger', { module: 'System', content: 'Initial settings applied successfully' });
        }
      } catch (e) {
        await invoke('logger', { module: 'System', content: 'No initial settings to apply' });
      }
    };
    initSettings();

    // 实时数据轮询
    const statsTimer = setInterval(async () => {
      try {
        const stats = await invoke<any>('get_live_stats');
        setLiveStats(stats);
      } catch (e) {}
    }, 2000);

    return () => clearInterval(statsTimer);
  }, []);

  // 🎵 自动化背景音乐控制
  useEffect(() => {
    if (stage === 'SPLASH' || stage === 'REVIEW') {
      bgm.play('STARTUP');
    } else if (stage === 'CONFIG') {
      bgm.play('CONFIG');
    } else if (stage === 'SIMULATION') {
      bgm.play('EVOLUTION');
    }

    return () => {
      // 可以在组件卸载时停止，或者由 bgm.play 内部处理平滑切换
    };
  }, [stage]);

  // 🎵 实时获取当前播放的进化铁律
  useEffect(() => {
    const interval = setInterval(() => {
      const law = bgm.getCurrentLaw();
      if (law && law.name !== currentLaw.name) {
        setCurrentLaw({ name: law.name, description: law.description });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [currentLaw.name]);

  useEffect(() => {
    let interval: number;

    if (isRunning && stage === 'SIMULATION') {
      interval = setInterval(async () => {
        try {
          let worldState: EntityView[];
          
          if (config?.mode === 'LocalMock') {
            // 生成模拟数据
            worldState = Array.from({ length: config.maxEntities || 50 }).map((_, i) => ({
              id: i,
              position: [
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
              ],
              ethics: { altruism: Math.random(), collaboration: Math.random() },
              score: Math.random() * 100,
              energy: Math.random() * 100,
              metabolic_toxin: Math.random() * 0.5,
              generation: Math.floor(Math.random() * 10)
            }));
          } else {
            // 🔒 使用二进制通道提升性能 (模拟 vgene://)
            const compressedData = await invoke<number[]>('get_world_binary');
            
            // 🔒 解压缩 Zstd 流 (前端需引入 fzstd 或类似库，此处暂存原始逻辑或假设通过自定义协议处理)
            // 为演示逻辑，此处假设后端已处理好或前端已有解压层
            // 注意：由于当前环境限制，我们先保持解析逻辑，但提示压缩已启用
            const buffer = new Uint8Array(compressedData);
            
            // TODO: 引入前端解压库，如 fzstd
            // const buffer = fzstd.decompress(new Uint8Array(compressedData));
            
            const view = new DataView(buffer.buffer);
            const parsed: EntityView[] = [];
            
            // 🔒 修正：解析实体数据，排除末尾的 12 字节统计信息
            const entityDataLength = buffer.length - (buffer.length % 36 === 12 ? 12 : 0);
            
            for (let i = 0; i < entityDataLength; i += 36) {
              parsed.push({
                id: view.getUint32(i, true),
                position: [
                  view.getFloat32(i + 4, true),
                  view.getFloat32(i + 8, true),
                  view.getFloat32(i + 12, true)
                ],
                ethics: { 
                  altruism: view.getFloat32(i + 16, true),
                  collaboration: 0.5 // 二进制通道简化字段
                },
                score: view.getFloat32(i + 20, true),
                energy: view.getFloat32(i + 24, true),
                metabolic_toxin: view.getFloat32(i + 28, true),
                generation: view.getUint32(i + 32, true)
              });
            }
            worldState = parsed;

            // 🔒 修正：直接从缓冲区末尾读取后端计算好的统计信息
            if (buffer.length % 36 === 12) {
              const offset = buffer.length - 12;
              setStats({
                entropy: view.getFloat32(offset, true),
                avgScore: view.getFloat32(offset + 4, true),
                avgGeneration: view.getFloat32(offset + 8, true),
                population: worldState.length
              });
            } else if (worldState.length > 0) {
              // 降级方案：前端自行计算
              const totalScore = worldState.reduce((acc, e) => acc + e.score, 0);
              const totalGen = worldState.reduce((acc, e) => acc + e.generation, 0);
              setStats(prev => ({
                ...prev,
                avgScore: totalScore / worldState.length,
                population: worldState.length,
                avgGeneration: totalGen / worldState.length,
              }));
            }
          }
          
          setEntities(worldState);
        } catch (e) {
          console.error("获取世界状态失败:", e);
        }
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isRunning, stage, config]);

  // 处理实体点击事件
  const handleEntityClick = async (entity: EntityView) => {
    try {
      if (config?.mode === 'LocalMock') {
        setSelectedEntity({
          ...entity,
          dna: `(module\n  (func (export "evolve") (param i32) (result i32)\n    local.get 0\n    i32.const ${Math.floor(Math.random() * 100)}\n    i32.add\n  )\n)`,
          stats: { attack: 10, defense: 5, tech_level: 1, efficiency: 0.8 }
        });
      } else {
        const fullEntity = await invoke<Entity>('get_entity_detail', { entityId: entity.id });
        setSelectedEntity(fullEntity);
      }
    } catch (e) {
      console.error("获取实体详情失败:", e);
    }
  };

  // 处理进入配置
  const handleGoToConfig = (initialConfig: any) => {
    setConfig(initialConfig);
    setStage('CONFIG');
  };

  // 处理开始模拟
  const handleStart = async (finalConfig: any) => {
    const mergedConfig = { ...config, ...finalConfig };
    if (mergedConfig.mode !== 'LocalMock') {
      await invoke('update_settings', {
        mode: mergedConfig.mode || 'LocalMock',
        ollamaUrl: mergedConfig.ollamaUrl || 'http://localhost:11434',
        modelName: mergedConfig.modelName || 'llama3',
        maxEntities: mergedConfig.maxEntities,
        evolutionThrottle: mergedConfig.evolutionThrottle,
        visualFidelity: mergedConfig.visualFidelity
      });
      await invoke('start_sim');
    }
    setConfig(mergedConfig);
    setIsRunning(true);
    setStage('SIMULATION');
  };

  // 处理更新设置
  const handleUpdateSettings = async (newConfig: any) => {
     const mergedConfig = { ...config, ...newConfig };
     if (mergedConfig.mode !== 'LocalMock') {
       await invoke('update_settings', {
         mode: mergedConfig.mode,
         ollamaUrl: mergedConfig.ollamaUrl,
         modelName: mergedConfig.modelName,
         maxEntities: mergedConfig.maxEntities,
         evolutionThrottle: mergedConfig.evolutionThrottle,
         visualFidelity: mergedConfig.visualFidelity
       });
     }
     setConfig(mergedConfig);
   };

  // 切换模拟状态
  const toggleSimulation = async () => {
    if (isRunning) {
      if (config?.mode !== 'LocalMock') {
        await invoke('stop_sim');
      }
      setIsRunning(false);
    } else {
      if (config?.mode !== 'LocalMock') {
        await invoke('start_sim');
      }
      setIsRunning(true);
    }
  };

  if (stage === 'SPLASH') {
    return (
      <>
        <TitleBar />
        <GenesisGate onStart={handleGoToConfig} />
      </>
    );
  }

  if (stage === 'CONFIG') {
    return (
      <>
        <TitleBar />
        <MotherMachine onStart={handleStart} onBack={() => setStage('SPLASH')} />
      </>
    );
  }

  if (stage === 'REVIEW') {
    return (
      <>
        <TitleBar />
        <PhoenixReview stats={stats} onReset={() => setStage('SPLASH')} />
      </>
    );
  }

  return (
    <div className="w-screen h-screen flex bg-black text-white overflow-hidden font-display pt-8">
      <TitleBar />
      
      {/* 统计面板（左侧） */}
      <aside className="w-72 border-r border-white/5 flex flex-col z-30 bg-black/40 backdrop-blur-xl animate-in fade-in slide-in-from-left-4 duration-700">
        <div className="p-8 border-b border-white/5">
          <h1 className="text-2xl font-black tracking-tighter text-white drop-shadow-neon font-display">
            V-GENE
          </h1>
          <p className="text-[9px] text-neon-blue/60 mt-1 font-mono tracking-[0.2em] uppercase">
            // 状态: {isRunning ? '进化中' : '已暂停'}
          </p>
          {isRunning && stage === 'SIMULATION' && (
            <div className="mt-4 space-y-1 animate-in fade-in duration-1000">
              <p className="text-[7px] text-white/20 font-mono uppercase tracking-widest">当前进化铁律</p>
              <p className="text-[10px] text-neon-blue font-bold font-mono uppercase tracking-tighter truncate shadow-neon-sm">
                {currentLaw.name}
              </p>
              <p className="text-[6px] text-white/30 font-mono leading-tight italic">
                {currentLaw.description}
              </p>
            </div>
          )}
        </div>

        {/* 🔒 硬件负载 HUD */}
        <div className="px-6 py-4 border-b border-white/5 space-y-3">
          <div className="flex items-center justify-between text-[8px] font-mono text-white/30 uppercase tracking-widest">
            <div className="flex items-center gap-2">
              <Cpu size={10} />
              <span>计算节点负载</span>
            </div>
            <span className="text-neon-blue">{liveStats ? liveStats.cpu_usage.toFixed(1) : '--'}%</span>
          </div>
          <div className="text-[10px] font-mono text-white/60 truncate">
            {sysInfo.cpu_brand || '检测中...'}
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className="h-full bg-neon-blue/40 transition-all duration-500" 
              style={{ width: `${liveStats?.cpu_usage || 0}%` }} 
            />
          </div>
          
          {liveStats?.gpu_stats?.length > 0 && (
            <div className="pt-2 space-y-2">
               <div className="flex items-center justify-between text-[8px] font-mono text-white/30 uppercase tracking-widest">
                <span>GPU 负载</span>
                <span className="text-green-400">{liveStats.gpu_stats[0].load}%</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-400/40 transition-all duration-500" 
                  style={{ width: `${liveStats.gpu_stats[0].load}%` }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* 🔒 全域熵增监视器 */}
        <div className="px-6 py-4 border-b border-white/5 space-y-3">
          <div className="flex justify-between text-[8px] font-mono text-white/30 uppercase tracking-widest">
            <span>全域信息熵梯度</span>
            <span className={stats.entropy > 70 ? 'text-red-500' : 'text-neon-blue'}>
              {stats.entropy.toFixed(1)}%
            </span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-1000 ${stats.entropy > 70 ? 'bg-red-500' : 'bg-neon-blue'}`} 
              style={{ width: `${stats.entropy}%` }} 
            />
          </div>
          <p className="text-[7px] text-white/20 font-mono leading-tight">
            // 热寂阈值临近，逻辑冗余正在增加...
          </p>
        </div>

        <div className="p-6 border-b border-white/5 space-y-4">
          <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em]">文明跃迁阶梯</h3>
          <div className="space-y-2">
            {[
              { id: 1, name: '原核阶段', active: stats.avgGeneration < 3 },
              { id: 2, name: '逻辑集群', active: stats.avgGeneration >= 3 && stats.avgGeneration < 7 },
              { id: 3, name: '行星文明', active: stats.avgGeneration >= 7 },
            ].map(stage => (
              <div key={stage.id} className="flex items-center gap-3">
                <div className={`w-1 h-1 rounded-full ${stage.active ? 'bg-neon-blue shadow-neon' : 'bg-white/10'}`} />
                <span className={`text-[10px] font-mono ${stage.active ? 'text-white' : 'text-white/20'}`}>{stage.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] mb-4">种群概况</h3>
          {
            [
              { label: '种群丰度', value: stats.population, icon: <Activity size={14}/> },
              { label: '平均适应度梯度', value: stats.avgScore.toFixed(2), icon: <Cpu size={14}/> },
              { label: '演化深度', value: `第 ${stats.avgGeneration.toFixed(1)} 纪元`, icon: <Zap size={14}/> },
            ].map((stat, i) => (
              <div 
                key={i} 
                className="glass-card p-4 rounded-sm border-l-2 border-l-neon-blue/40 transition-all group"
              >
                <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-mono mb-1 group-hover:text-neon-blue transition-colors">
                  {stat.icon}
                  <span>{stat.label}</span>
                </div>
                <div className="text-xl font-bold font-mono tracking-tight text-white/90">{stat.value}</div>
              </div>
            ))
          }
        </div>

        <div className="p-6 border-t border-white/5 space-y-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 glass-card rounded-sm text-white/60 hover:text-white transition-all font-mono text-[10px] uppercase tracking-widest"
          >
            <Settings size={14} />
            环境参数
          </button>
        </div>
      </aside>

      {/* 中央渲染区 */}
      <main className="flex-1 relative flex flex-col min-w-0">
        <Arena entities={entities} onEntityClick={handleEntityClick} isLeaping={isLeaping} />
        
        {/* 微观战场浮窗 */}
        {isMicroArenaOpen && selectedEntity && (
          <MicroArena 
            entityA={selectedEntity} 
            entityB={{ id: 999 }} // 模拟对手
            onClose={() => setIsMicroArenaOpen(false)} 
          />
        )}
        
        {/* 底部控制栏 */}
        <footer className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 z-30 animate-in fade-in slide-in-from-bottom-4 duration-700">
           <button 
             onClick={toggleSimulation}
             className={`
               flex items-center gap-4 px-12 py-4 
               font-black uppercase tracking-[0.4em] text-[10px]
               transition-all duration-500 rounded-sm
               ${isRunning 
                 ? 'mica-effect text-white/40 hover:text-white' 
                 : 'bg-white text-black pulse-glow hover:scale-105'}
             `}
           >
             {isRunning ? <><Pause size={16} /> 暂停协议</> : <><Play size={16} fill="currentColor" /> 启动创世</>}
           </button>

           <button 
             onClick={() => {
               setIsRunning(false);
               setStage('REVIEW');
             }}
             className="flex items-center gap-3 px-8 py-4 glass-card text-white/40 hover:text-white transition-all font-mono text-[10px] uppercase tracking-[0.3em] rounded-sm"
           >
             <FastForward size={14} />
             终结并复盘
           </button>
        </footer>
      </main>

      {/* 实体检查器与进化星图（右侧） */}
      <aside className="w-96 border-l border-white/5 flex flex-col z-30 bg-black/40 backdrop-blur-xl animate-in fade-in slide-in-from-right-4 duration-500 overflow-hidden">
        {selectedEntity ? (
          <>
            <div className="p-8 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-[10px] font-mono text-neon-blue uppercase tracking-[0.3em]">实体检查器</h3>
              <button onClick={() => setSelectedEntity(null)} className="text-white/20 hover:text-white transition-colors">×</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-2 gap-6 font-mono text-[10px]">
                <div>
                  <span className="text-white/20 block uppercase mb-1">唯一标识</span>
                  <span className="text-white/80"># {selectedEntity.id}</span>
                </div>
                <div>
                  <span className="text-white/20 block uppercase mb-1">当前世代</span>
                  <span className="text-white/80">{selectedEntity.generation}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase tracking-widest">
                  <span>核心能量</span>
                  <span className="text-neon-blue">{selectedEntity.energy.toFixed(1)}%</span>
                </div>
                <div className="h-0.5 bg-white/5 overflow-hidden">
                  <div className="h-full bg-neon-blue shadow-neon transition-all duration-500" style={{ width: `${selectedEntity.energy}%` }} />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase tracking-widest">
                  <span>代谢毒素</span>
                  <span className="text-red-500">{(selectedEntity.metabolic_toxin * 100).toFixed(1)}%</span>
                </div>
                <div className="h-0.5 bg-white/5 overflow-hidden">
                  <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${selectedEntity.metabolic_toxin * 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 text-[9px] font-mono text-neon-blue uppercase mb-4 tracking-widest">
                  <Terminal size={12} />
                  <span>主权 DNA (WAT)</span>
                </div>
                <pre className="bg-black/60 p-4 text-[9px] font-mono text-white/40 overflow-x-auto max-h-64 custom-scrollbar border border-white/5 rounded-sm">
                  {selectedEntity.dna}
                </pre>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => setIsMicroArenaOpen(true)}
                  className="w-full py-4 border border-neon-blue/20 text-neon-blue hover:bg-neon-blue/5 transition-all font-mono text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 group"
                >
                  <Microscope size={14} />
                  进入微观视界
                </button>

                <button 
                  onClick={() => {
                    alert('已向该实体下达“神谕”：强制突变开始...');
                    // 这里可以调用后端的突变接口
                  }}
                  className="w-full py-4 border border-red-500/20 text-red-500 hover:bg-red-500/5 transition-all font-mono text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2 group"
                >
                  <Zap size={14} className="group-hover:animate-pulse" />
                  下达突变神谕
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="p-8 border-b border-white/5">
              <h3 className="text-[10px] font-mono text-neon-blue uppercase tracking-[0.3em]">全域进化星图</h3>
              <p className="text-[8px] text-white/20 font-mono mt-1 uppercase tracking-widest">// 观测全域生命演化谱系</p>
            </div>
            <div className="flex-1 relative">
              <PhylogeneticTree />
            </div>
          </div>
        )}
      </aside>

      {/* 设置模态框 */}
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleUpdateSettings} 
      />
    </div>
  );
}

export default App;
