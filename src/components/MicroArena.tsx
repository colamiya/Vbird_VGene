import React, { useEffect, useRef, useState } from 'react';
import { Minimize2, Maximize2, Activity, Zap, Shield, Skull } from 'lucide-react';

interface MicroArenaProps {
  entityA: any;
  entityB: any;
  onClose: () => void;
}

const MicroArena: React.FC<MicroArenaProps> = ({ entityA, entityB, onClose }) => {
  const [memoryGrid, setMemoryGrid] = useState<number[]>(new Array(256).fill(0));
  const [logs, setLogs] = useState<string[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // 模拟内存战
  useEffect(() => {
    const interval = setInterval(() => {
      // 随机攻击
      const targetIdx = Math.floor(Math.random() * 256);
      const isAttack = Math.random() > 0.5;
      
      setMemoryGrid(prev => {
        const next = [...prev];
        // 0: 空, 1: A占领, 2: B占领, 3: 冲突/攻击, 4: 防御
        if (isAttack) {
           next[targetIdx] = 3; 
           setTimeout(() => {
             setMemoryGrid(curr => {
               const n = [...curr];
               if (n[targetIdx] === 3) n[targetIdx] = Math.random() > 0.5 ? 1 : 2;
               return n;
             });
           }, 200);
        } else {
           next[targetIdx] = 4;
           setTimeout(() => {
            setMemoryGrid(curr => {
              const n = [...curr];
              if (n[targetIdx] === 4) n[targetIdx] = 0;
              return n;
            });
          }, 500);
        }
        return next;
      });

      if (Math.random() > 0.7) {
        const actions = ['注入恶意指令 i32.const', '尝试溢出堆栈', '锁定内存页 0x4F', '触发 Trap'];
        const action = actions[Math.floor(Math.random() * actions.length)];
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${action}`, ...prev].slice(0, 5));
      }

    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className={`
        fixed z-40 bg-black/90 border border-neon-blue/50 backdrop-blur-md shadow-2xl transition-all duration-500 overflow-hidden
        ${isExpanded ? 'inset-10' : 'bottom-32 right-8 w-96 h-80'}
      `}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-2 bg-neon-blue/10 border-b border-neon-blue/20 cursor-move">
        <div className="flex items-center gap-2 text-neon-blue font-mono text-[10px] uppercase tracking-widest">
          <Activity size={12} className="animate-pulse" />
          <span>Micro-Arena // 微观战场</span>
        </div>
        <div className="flex items-center gap-2 text-white/40">
          <button onClick={() => setIsExpanded(!isExpanded)} className="hover:text-white transition-colors">
            {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={onClose} className="hover:text-red-500 transition-colors">×</button>
        </div>
      </div>

      {/* 内容区 */}
      <div className="flex h-full">
        {/* 左侧：实体A */}
        <div className="w-16 border-r border-white/10 flex flex-col items-center py-4 gap-2">
          <div className="w-8 h-8 rounded-full bg-neon-blue/20 border border-neon-blue flex items-center justify-center text-[10px] font-bold text-neon-blue">A</div>
          <div className="h-full w-1 bg-neon-blue/10 rounded-full overflow-hidden">
            <div className="w-full bg-neon-blue animate-[shimmer_2s_infinite]" style={{ height: '70%' }} />
          </div>
        </div>

        {/* 中间：内存网格 */}
        <div className="flex-1 p-4 flex flex-col">
          <div className="flex-1 grid grid-cols-16 grid-rows-16 gap-[1px] bg-white/5 p-[1px]">
            {memoryGrid.map((status, i) => (
              <div 
                key={i}
                className={`
                  w-full h-full transition-colors duration-300
                  ${status === 0 ? 'bg-black/80' : ''}
                  ${status === 1 ? 'bg-neon-blue/50 shadow-[0_0_5px_theme(colors.neon-blue)]' : ''}
                  ${status === 2 ? 'bg-purple-500/50 shadow-[0_0_5px_purple]' : ''}
                  ${status === 3 ? 'bg-red-500 animate-pulse' : ''}
                  ${status === 4 ? 'bg-white/80' : ''}
                `}
              />
            ))}
          </div>
          
          {/* 战斗日志 */}
          <div className="h-24 mt-4 bg-black/50 border-t border-white/10 p-2 font-mono text-[9px] text-white/60 overflow-hidden">
             {logs.map((log, i) => (
               <div key={i} className="mb-1 opacity-80">{log}</div>
             ))}
          </div>
        </div>

        {/* 右侧：实体B */}
        <div className="w-16 border-l border-white/10 flex flex-col items-center py-4 gap-2">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center text-[10px] font-bold text-purple-500">B</div>
          <div className="h-full w-1 bg-purple-500/10 rounded-full overflow-hidden">
            <div className="w-full bg-purple-500 animate-[shimmer_3s_infinite]" style={{ height: '40%' }} />
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
