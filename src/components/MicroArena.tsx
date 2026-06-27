import React, { useEffect, useMemo, useRef, useState, memo } from 'react';
import { Minimize2, Maximize2, Activity } from 'lucide-react';
import type { Entity } from '../types/world';

interface MicroArenaProps {
  entityA: Entity;
  onClose: () => void;
}

const EMPTY_MEMORY_GRID = new Array<number>(256).fill(0);

// 🔒 优化：使用 memo 包装网格单元，减少大规模重绘
const MemoryCell = memo(({ status }: { status: number }) => (
  <div 
    className={`
      w-full h-full transition-colors duration-300
      ${status === 0 ? 'bg-black/80' : ''}
      ${status === 1 ? 'bg-neon-blue/50 shadow-[0_0_5px_theme(colors.neon-blue)]' : ''}
      ${status === 2 ? 'bg-purple-500/50 shadow-[0_0_5px_purple]' : ''}
      ${status === 3 ? 'bg-red-500 animate-pulse' : ''}
      ${status === 4 ? 'bg-white/80' : ''}
    `}
  />
));

MemoryCell.displayName = 'MemoryCell';

const MicroArena: React.FC<MicroArenaProps> = ({ entityA, onClose }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const lastSnapshotSignature = useRef('');
  const memoryGrid = useMemo(() => {
    const snapshot = entityA.last_memory_snapshot ?? [];
    if (snapshot.length === 0) return EMPTY_MEMORY_GRID;

    return new Array(256).fill(0).map((_, i) => {
      const val = snapshot[i] || 0;
      if (val === 0) return 0;
      if (val > 0 && val < 100) return 1;
      if (val >= 100 && val < 200) return 2;
      return 3;
    });
  }, [entityA.last_memory_snapshot]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 🔒 真实内存同步：不再使用 Math.random 模拟
  useEffect(() => {
    const snapshot = entityA.last_memory_snapshot ?? [];

    if (snapshot.length === 0) {
      const signature = `${entityA.id}:empty`;
      if (signature !== lastSnapshotSignature.current) {
        lastSnapshotSignature.current = signature;
        setLogs([`[${new Date().toLocaleTimeString()}] 当前实体暂无可用内存快照`]);
      }
      return;
    }

    const signature = `${entityA.id}:${snapshot.length}:${snapshot[0] ?? 0}:${snapshot[1] ?? 0}:${snapshot[snapshot.length - 1] ?? 0}`;
    if (signature !== lastSnapshotSignature.current) {
      lastSnapshotSignature.current = signature;
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] 捕获真实内存快照 (${snapshot.length} 字节)`, ...prev].slice(0, 5));
    }
  }, [entityA.id, entityA.last_memory_snapshot]);

  return (
    <div
      role="dialog"
      aria-label="微观战场"
      className={`
        fixed z-40 flex flex-col bg-black/90 border border-neon-blue/50 backdrop-blur-md shadow-2xl transition-[inset,width,height,bottom,right,top,left] duration-500 overflow-hidden
        ${isExpanded ? 'left-4 right-4 bottom-4 top-12 sm:left-10 sm:right-10 sm:bottom-10 sm:top-12' : 'bottom-32 left-4 right-4 h-80 sm:left-auto sm:right-8 sm:w-96'}
      `}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-neon-blue/10 border-b border-neon-blue/20 cursor-move">
        <div className="flex items-center gap-2 text-neon-blue font-mono text-[10px] uppercase tracking-widest">
          <Activity size={12} className="animate-pulse" />
          <span>Micro-Arena // 微观战场</span>
        </div>
        <div className="flex items-center gap-2 text-white/40">
          <button
            type="button"
            aria-label={isExpanded ? '收起微观战场' : '展开微观战场'}
            onClick={() => setIsExpanded(!isExpanded)}
            className="interactive-focus px-1 hover:text-white transition-colors"
          >
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button
            type="button"
            aria-label="关闭微观战场"
            onClick={onClose}
            className="interactive-focus px-1 hover:text-red-500 transition-colors"
          >
            ×
          </button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex flex-1 min-h-0">
        {/* 左侧：当前实体 */}
        <div className="w-16 border-r border-white/10 flex flex-col items-center py-4 gap-2">
          <div className="w-8 h-8 rounded-full bg-neon-blue/20 border border-neon-blue flex items-center justify-center text-[10px] font-bold text-neon-blue">E</div>
          <div className="h-full w-1 bg-neon-blue/10 rounded-full overflow-hidden">
            <div className="w-full bg-neon-blue animate-[shimmer_2s_infinite]" style={{ height: `${Math.max(4, Math.min(100, entityA.energy))}%` }} />
          </div>
        </div>

        {/* 中间：内存网格 */}
        <div className="flex-1 min-w-0 p-4 flex flex-col">
          <div className="flex-1 grid grid-cols-16 grid-rows-16 gap-[1px] bg-white/5 p-[1px]">
            {memoryGrid.map((status, i) => (
              <MemoryCell key={i} status={status} />
            ))}
          </div>
          
          {/* 战斗日志 */}
          <div className="h-24 mt-4 bg-black/50 border-t border-white/10 p-2 font-mono text-[9px] text-white/60 overflow-hidden">
             {logs.map((log, i) => (
               <div key={i} className="mb-1 opacity-80">{log}</div>
             ))}
          </div>
        </div>
      </div>
      
      {/* 装饰性HUD */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-20">
         <div className="w-64 h-64 border border-white/20 rounded-full flex items-center justify-center animate-[spin_10s_linear_infinite]">
            <div className="w-48 h-48 border border-white/10 rounded-full" />
         </div>
      </div>
    </div>
  );
};

export default MicroArena;
