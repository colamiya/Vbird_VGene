import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Send, Cpu, Shield, Zap, Activity, Code } from 'lucide-react';

interface DivineMandateProps {
  onMandateIssued: (config: any) => void;
}

const DivineMandate: React.FC<DivineMandateProps> = ({ onMandateIssued }) => {
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [typingIndex, setTypingIndex] = useState(0);
  const welcomeText = "正在建立神谕连接... // 接入神经元网络... // 等待指令...";
  const logEndRef = useRef<HTMLDivElement>(null);

  // 打字机效果
  useEffect(() => {
    if (typingIndex < welcomeText.length) {
      const timeout = setTimeout(() => {
        setTypingIndex(prev => prev + 1);
      }, 30);
      return () => clearTimeout(timeout);
    }
  }, [typingIndex]);

  // 自动滚动日志
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCommand = async () => {
    if (!input.trim()) return;
    
    setIsProcessing(true);
    const userCmd = input;
    setInput('');
    
    // 模拟系统解析过程
    addLog(`> ${userCmd}`);
    await wait(500);
    addLog(`[SYSTEM] 正在解析语义...`);
    await wait(800);
    addLog(`[NLP] 提取关键词: "${userCmd.slice(0, 5)}..."`);
    addLog(`[GENESIS] 构建基因约束矩阵...`);
    await wait(600);
    
    // 模拟根据输入生成配置
    const mockConfig = generateMockConfig(userCmd);
    
    addLog(`[OK] 协议生成完毕。`);
    addLog(`[CONFIG] 内存限制: ${mockConfig.memoryLimit}`);
    addLog(`[CONFIG] 进化目标: ${mockConfig.objective}`);
    
    await wait(1000);
    onMandateIssued(mockConfig);
    setIsProcessing(false);
  };

  const addLog = (text: string) => {
    setLogs(prev => [...prev, text]);
  };

  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const generateMockConfig = (cmd: string) => {
    // 简单的模拟逻辑
    const isAggressive = cmd.includes('攻击') || cmd.includes('杀') || cmd.includes('强');
    const isEfficient = cmd.includes('快') || cmd.includes('效率') || cmd.includes('短');
    
    return {
      maxEntities: isAggressive ? 200 : 500,
      mutationRate: isAggressive ? 0.2 : 0.05,
      entropyFactor: isEfficient ? 0.2 : 0.1,
      winningRule: isAggressive ? 'PREDATION' : (isEfficient ? 'CODE_SIZE' : 'SURVIVAL'),
      memoryLimit: isEfficient ? '64KB' : '1MB',
      objective: isAggressive ? '最大化击杀' : '最小化能耗'
    };
  };

  return (
    <div className="w-full h-full flex flex-col bg-black/80 border border-neon-blue/30 rounded-sm overflow-hidden font-mono text-xs shadow-neon">
      {/* 终端头部 */}
      <div className="flex items-center justify-between px-4 py-2 bg-neon-blue/10 border-b border-neon-blue/20">
        <div className="flex items-center gap-2 text-neon-blue">
          <Terminal size={14} />
          <span className="uppercase tracking-widest font-bold">Divine Mandate // 神谕终端</span>
        </div>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/50" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
          <div className="w-2 h-2 rounded-full bg-green-500/50" />
        </div>
      </div>

      {/* 日志显示区 */}
      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-1 text-green-500/80">
        <div className="opacity-60 mb-4 text-[10px] tracking-widest">
          {welcomeText.slice(0, typingIndex)}
          <span className="animate-pulse">_</span>
        </div>
        
        {logs.map((log, i) => (
          <div key={i} className="break-all animate-in fade-in slide-in-from-left-2 duration-300">
            {log}
          </div>
        ))}
        <div ref={logEndRef} />
      </div>

      {/* 状态指示器 */}
      {isProcessing && (
        <div className="px-4 py-2 bg-neon-blue/5 border-t border-neon-blue/10 flex items-center gap-4 text-[10px] text-neon-blue">
          <div className="flex items-center gap-2">
            <Cpu size={12} className="animate-spin" />
            <span>编译逻辑中...</span>
          </div>
          <div className="h-1 flex-1 bg-neon-blue/20 rounded-full overflow-hidden">
            <div className="h-full bg-neon-blue w-2/3 animate-[shimmer_1s_infinite]" />
          </div>
        </div>
      )}

      {/* 输入区 */}
      <div className="p-4 border-t border-neon-blue/20 bg-black/40">
        <div className="flex items-center gap-2">
          <span className="text-neon-blue text-lg">›</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleCommand()}
            placeholder={isProcessing ? "系统忙..." : "输入自然语言神谕 (例如: 创造一个极速的刺客)..."}
            disabled={isProcessing}
            className="flex-1 bg-transparent border-none outline-none text-white/90 placeholder-white/20 font-mono text-xs"
            autoFocus
          />
          <button 
            onClick={handleCommand}
            disabled={isProcessing || !input.trim()}
            className="text-neon-blue hover:text-white disabled:opacity-30 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DivineMandate;
