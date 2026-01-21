import React, { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Arena from './components/Arena';
import GenesisGate from './components/GenesisGate';
import SettingsModal from './components/SettingsModal';
import { Settings, Play, Pause, Activity, Cpu, Terminal, Zap } from 'lucide-react';

interface Entity {
  id: number;
  position: [number, number, number];
  ethics: { altruism: number; collaboration: number };
  stats: { attack: number; defense: number; tech_level: number; efficiency: number };
  score: number;
  dna: string;
  energy: number;
  metabolic_toxin: number;
  generation: number;
}

function App() {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [stats, setStats] = useState({ avgScore: 0, population: 0, maxTech: 0, avgEfficiency: 0 });
  const [isLeaping, setIsLeaping] = useState(false);

  useEffect(() => {
    let interval: number;

    if (isRunning) {
      interval = setInterval(async () => {
        try {
          const worldState = await invoke<Entity[]>('get_world_state');
          
          setEntities(worldState);

          if (worldState.length > 0) {
            const totalScore = worldState.reduce((acc, e) => acc + e.score, 0);
            const totalEff = worldState.reduce((acc, e) => acc + e.stats.efficiency, 0);
            const maxTech = Math.max(...worldState.map(e => e.stats.tech_level));
            
            // 跃迁检查
            if (maxTech >= 10 && !isLeaping) {
               setIsLeaping(true);
               setTimeout(() => setIsLeaping(false), 5000); // 5秒后重置
            }

            setStats({
              avgScore: totalScore / worldState.length,
              population: worldState.length,
              maxTech,
              avgEfficiency: totalEff / worldState.length
            });
          }

        } catch (e) {
          console.error("Failed to fetch world state:", e);
        }
      }, 100);
    }

    return () => clearInterval(interval);
  }, [isRunning, isLeaping]);

  const handleStart = async (config: any) => {
    await invoke('update_settings', {
      mode: config.mode,
      ollamaUrl: config.ollamaUrl,
      modelName: config.modelName,
      maxEntities: config.maxEntities
    });
    await invoke('start_sim');
    setIsRunning(true);
    setIsInitialized(true);
  };

  const handleUpdateSettings = async (config: any) => {
     await invoke('update_settings', {
       mode: config.mode,
       ollamaUrl: config.ollamaUrl,
       modelName: config.modelName,
       maxEntities: config.maxEntities
     });
   };

  const toggleSimulation = async () => {
    if (isRunning) {
      await invoke('stop_sim');
      setIsRunning(false);
    } else {
      await invoke('start_sim');
      setIsRunning(true);
    }
  };

  if (!isInitialized) {
    return <GenesisGate onStart={handleStart} />;
  }

  return (
    <div className="w-screen h-screen relative bg-black text-white overflow-hidden font-display">
      {/* 3D Background */}
      <Arena entities={entities} onEntityClick={setSelectedEntity} isLeaping={isLeaping} />

      {/* UI Overlay */}
      <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-20">
        
        {/* Header */}
        <header className="flex justify-between items-start pointer-events-auto">
          <div className="animate-in fade-in slide-in-from-top-4 duration-700">
            <h1 className="text-4xl font-black tracking-tighter text-white drop-shadow-neon font-display">
              V-GENE
            </h1>
            <p className="text-[10px] text-neon-blue/60 mt-1 font-mono tracking-[0.2em]">
              // SECTOR: 0x8A-9 // STATUS: {isRunning ? 'EVOLVING' : 'HALTED'}
            </p>
          </div>
        </header>

        {/* Stats Panel (Left) */}
        <aside className="absolute left-6 top-1/2 -translate-y-1/2 w-64 pointer-events-auto space-y-3 animate-in fade-in slide-in-from-left-4 duration-700 delay-200">
            {[
              { label: 'Population', value: stats.population, icon: <Activity size={14}/> },
              { label: 'Avg Fitness', value: stats.avgScore.toFixed(2), icon: <Cpu size={14}/> },
              { label: 'Max Tech', value: `Lvl ${stats.maxTech}`, icon: <Settings size={14}/>, onClick: () => setIsSettingsOpen(true) },
              { label: 'Efficiency', value: `${(stats.avgEfficiency * 100).toFixed(1)}%`, icon: <Zap size={14}/> }
            ].map((stat, i) => (
              <div 
                key={i} 
                onClick={stat.onClick}
                className={`glass-card p-4 rounded-sm border-l-2 border-l-neon-blue/40 hover:border-l-neon-blue transition-all hover:translate-x-1 group ${stat.onClick ? 'cursor-pointer' : ''}`}
              >
                <div className="flex items-center gap-2 text-white/40 text-[10px] uppercase font-mono mb-1 group-hover:text-neon-blue transition-colors">
                  {stat.icon}
                  <span>{stat.label}</span>
                </div>
                <div className="text-2xl font-bold font-mono tracking-tight text-white/90">{stat.value}</div>
              </div>
            ))}
        </aside>

        {/* Settings Modal */}
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          onSave={handleUpdateSettings} 
        />

        {/* Entity Inspector (Right) */}
        {selectedEntity && (
          <aside className="absolute right-6 top-1/2 -translate-y-1/2 w-80 pointer-events-auto mica-effect p-6 rounded-sm animate-in fade-in zoom-in-95 duration-300">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-[10px] font-mono text-neon-blue uppercase tracking-[0.3em]">Entity Inspector</h3>
              <button onClick={() => setSelectedEntity(null)} className="text-white/20 hover:text-white transition-colors">×</button>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4 font-mono text-[10px]">
                <div>
                  <span className="text-white/20 block uppercase mb-1">Entity ID</span>
                  <span className="text-white/80"># {selectedEntity.id}</span>
                </div>
                <div>
                  <span className="text-white/20 block uppercase mb-1">Generation</span>
                  <span className="text-white/80">{selectedEntity.generation}</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase tracking-widest">
                  <span>Core Energy</span>
                  <span className="text-neon-blue">{selectedEntity.energy.toFixed(1)}%</span>
                </div>
                <div className="h-0.5 bg-white/5 overflow-hidden">
                  <div className="h-full bg-neon-blue shadow-neon transition-all duration-500" style={{ width: `${selectedEntity.energy}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-mono text-white/40 uppercase tracking-widest">
                  <span>Metabolic Toxin</span>
                  <span className="text-red-500">{(selectedEntity.metabolic_toxin * 100).toFixed(1)}%</span>
                </div>
                <div className="h-0.5 bg-white/5 overflow-hidden">
                  <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${selectedEntity.metabolic_toxin * 100}%` }} />
                </div>
              </div>

              <div className="mt-8">
                <div className="flex items-center gap-2 text-[9px] font-mono text-neon-blue uppercase mb-3 tracking-widest">
                  <Terminal size={12} />
                  <span>Sovereign DNA (WAT)</span>
                </div>
                <div className="relative group">
                  <pre className="bg-black/40 p-4 text-[10px] font-mono text-white/40 overflow-x-auto max-h-48 custom-scrollbar border border-white/5 rounded-sm group-hover:text-white/60 transition-colors">
                    {selectedEntity.dna}
                  </pre>
                </div>
              </div>
            </div>
          </aside>
        )}

        {/* Footer Controls */}
        <footer className="flex justify-center pointer-events-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
           <button 
             onClick={toggleSimulation}
             className={`
               flex items-center gap-4 px-16 py-4 
               font-black uppercase tracking-[0.4em] text-xs
               transition-all duration-500 rounded-sm
               ${isRunning 
                 ? 'mica-effect text-white/40 hover:text-white' 
                 : 'bg-white text-black pulse-glow hover:scale-105'}
             `}
           >
             {isRunning ? <><Pause size={16} /> Halt_Protocol</> : <><Play size={16} fill="currentColor" /> Resume_Genesis</>}
           </button>
        </footer>
      </div>
    </div>
  );
}

export default App;
