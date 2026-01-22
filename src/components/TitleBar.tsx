import React, { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X, Copy } from 'lucide-react';

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const updateMaximized = async () => {
      const appWindow = getCurrentWindow();
      const maximized = await appWindow.isMaximized();
      setIsMaximized(maximized);
    };

    updateMaximized();
    
    // 监听窗口大小变化以更新最大化状态
    const unlisten = getCurrentWindow().onResized(() => {
      updateMaximized();
    });

    return () => {
      unlisten.then(u => u());
    };
  }, []);

  const handleMinimize = async () => {
    await getCurrentWindow().minimize();
  };

  const handleMaximize = async () => {
    const appWindow = getCurrentWindow();
    await appWindow.toggleMaximize();
    setIsMaximized(await appWindow.isMaximized());
  };

  const handleClose = async () => {
    await getCurrentWindow().close();
  };

  return (
    <div 
      data-tauri-drag-region 
      className="h-8 bg-black/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-4 fixed top-0 left-0 right-0 z-[1000] select-none"
    >
      <div data-tauri-drag-region className="flex items-center gap-2">
        <div className="w-3 h-3 bg-neon-blue rounded-full shadow-neon animate-pulse" />
        <span data-tauri-drag-region className="text-[10px] font-mono text-white/40 uppercase tracking-[0.2em]">
          V-GENE // NEURAL_EVOLUTION_SANDBOX
        </span>
      </div>

      <div className="flex items-center h-full">
        <button 
          onClick={handleMinimize}
          className="h-full px-3 text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center"
        >
          <Minus size={14} />
        </button>
        <button 
          onClick={handleMaximize}
          className="h-full px-3 text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center"
        >
          {isMaximized ? <Copy size={12} className="rotate-180" /> : <Square size={12} />}
        </button>
        <button 
          onClick={handleClose}
          className="h-full px-4 text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
