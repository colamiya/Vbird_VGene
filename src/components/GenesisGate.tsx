import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, Play, Cpu, Activity, Info, Terminal } from 'lucide-react';
import SettingsModal from './SettingsModal';

interface SysInfo {
  cpu_brand: String;
  cpu_cores: number;
  os_info: String;
}

interface GenesisGateProps {
  onStart: (config: any) => void;
}

const GenesisGate: React.FC<GenesisGateProps> = ({ onStart }) => {
  const [sysInfo, setSysInfo] = useState<SysInfo | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [config, setConfig] = useState({
    maxEntities: 500,
    mutationRate: 0.05,
    ollamaUrl: 'http://localhost:11434',
    modelName: 'llama3',
    mode: 'LocalMock'
  });

  useEffect(() => {
    const fetchSysInfo = async () => {
      try {
        const info = await invoke<SysInfo>('get_sys_info');
        setSysInfo(info);
      } catch (e) {
        console.error('Failed to fetch system info:', e);
      }
    };
    fetchSysInfo();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden">
      {/* Dynamic Background Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60 pointer-events-none" />
      
      {/* Main Container */}
      <div className="relative w-full max-w-4xl px-6 flex flex-col items-center">
        
        {/* Title Section */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <h1 className="text-8xl font-black tracking-[0.2em] text-white drop-shadow-neon font-display">
            V-GENE
          </h1>
          <div className="h-1 w-32 bg-neon-blue mx-auto mt-4 shadow-neon" />
          <p className="mt-6 text-neon-blue/60 font-mono text-xs tracking-[0.4em] uppercase">
            // Neural Evolution Sandbox //
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-8 w-full max-w-md animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-200">
          <button 
            onClick={() => onStart(config)}
            className="group relative w-full py-6 bg-white text-black font-black uppercase tracking-[0.3em] text-lg transition-all hover:scale-105 active:scale-95 pulse-glow overflow-hidden"
          >
            <span className="relative z-10 flex items-center justify-center gap-3">
              <Play size={20} fill="currentColor" />
              Initialize Simulation
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-3 px-8 py-3 glass-card rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-all font-mono text-xs uppercase tracking-widest"
          >
            <Settings size={14} />
            System Configuration
          </button>
        </div>

        {/* Settings Modal */}
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          onSave={(newConfig) => setConfig({ ...config, ...newConfig })} 
        />

        {/* System Environment Summary (Left Bottom) */}
        <div className="absolute left-10 bottom-10 max-w-xs space-y-4 animate-in fade-in slide-in-from-left-8 duration-1000 delay-500">
          <div className="glass-card p-5 rounded-sm border-l-2 border-l-neon-blue">
            <div className="flex items-center gap-2 text-neon-blue mb-3 font-mono text-[10px] uppercase tracking-tighter">
              <Cpu size={14} />
              <span>Host Environment</span>
            </div>
            {sysInfo ? (
              <div className="space-y-2 font-mono text-[10px] text-white/40">
                <div className="flex justify-between">
                  <span>CPU:</span>
                  <span className="text-white/80">{sysInfo.cpu_brand}</span>
                </div>
                <div className="flex justify-between">
                  <span>CORES:</span>
                  <span className="text-white/80">{sysInfo.cpu_cores} THREADS</span>
                </div>
                <div className="flex justify-between">
                  <span>OS:</span>
                  <span className="text-white/80">{sysInfo.os_info}</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-white/20 font-mono text-[10px]">
                <Activity size={12} className="animate-spin" />
                Scanning hardware...
              </div>
            )}
          </div>
        </div>

        {/* Technical Stack (Right Bottom) */}
        <div className="absolute right-10 bottom-10 flex flex-col items-end gap-2 animate-in fade-in slide-in-from-right-8 duration-1000 delay-700">
           <div className="flex items-center gap-3 text-[10px] font-mono text-white/20 uppercase tracking-[0.2em]">
             <span>Tauri Framework</span>
             <span className="h-px w-8 bg-white/10" />
             <span>Rust Engine</span>
           </div>
           <div className="text-[9px] font-mono text-white/10">
             V-GENE // VERSION 0.1.0-ALPHA
           </div>
        </div>

      </div>
    </div>
  );
};

export default GenesisGate;
