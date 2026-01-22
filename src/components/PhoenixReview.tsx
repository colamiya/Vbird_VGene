import React from 'react';
import { RefreshCcw, Download, TrendingUp, Skull, Zap, ChevronRight } from 'lucide-react';

interface PhoenixReviewProps {
  stats: any;
  onReset: () => void;
}

const PhoenixReview: React.FC<PhoenixReviewProps> = ({ stats, onReset }) => {
  // 模拟一些复盘数据
  const survivalData = [80, 75, 60, 45, 30, 25, 20];
  const mutationLogs = [
    { time: 'T+120s', type: '指令漂移', desc: '发现更高效的 i32.add 替代方案' },
    { time: 'T+450s', type: '水平基因转移', desc: '个体 #42 与 #89 交换了排序逻辑' },
    { time: 'T+900s', type: '代谢崩溃', desc: '大规模逻辑死循环导致种群缩减' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl font-display">
      <div className="w-full max-w-4xl p-12 space-y-12 animate-in fade-in zoom-in-95 duration-1000">
        
        {/* 头部 */}
        <div className="text-center">
          <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic">
            凤凰复盘 <span className="text-neon-blue">/ PHOENIX</span>
          </h2>
          <p className="text-white/40 text-[10px] mt-4 font-mono uppercase tracking-[0.4em]">
            // 演化终止报告 // 编号: VGENE-X01
          </p>
        </div>

        {/* 核心指标 */}
        <div className="grid grid-cols-3 gap-6">
          <div className="glass-card p-6 border-t-2 border-t-neon-blue">
            <div className="flex items-center gap-2 text-white/40 text-[9px] uppercase font-mono mb-2">
              <TrendingUp size={14} />
              <span>最高适应度</span>
            </div>
            <div className="text-3xl font-black font-mono">{stats.avgScore.toFixed(2)}</div>
          </div>
          <div className="glass-card p-6 border-t-2 border-t-red-500">
            <div className="flex items-center gap-2 text-white/40 text-[9px] uppercase font-mono mb-2">
              <Skull size={14} />
              <span>逻辑灭绝率</span>
            </div>
            <div className="text-3xl font-black font-mono">14.2%</div>
          </div>
          <div className="glass-card p-6 border-t-2 border-t-neon-purple">
            <div className="flex items-center gap-2 text-white/40 text-[9px] uppercase font-mono mb-2">
              <Zap size={14} />
              <span>变异总频次</span>
            </div>
            <div className="text-3xl font-black font-mono">1,248</div>
          </div>
        </div>

        {/* 存活曲线与日志 */}
        <div className="grid grid-cols-2 gap-10">
          <div className="space-y-4">
            <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-widest">种群存活曲线</h3>
            <div className="h-48 flex items-end gap-2 px-2 border-b border-l border-white/5">
              {survivalData.map((v, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-neon-blue/20 border-t border-neon-blue transition-all hover:bg-neon-blue/40"
                  style={{ height: `${v}%` }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-mono text-white/20 uppercase tracking-widest">关键进化日志</h3>
            <div className="space-y-3">
              {mutationLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-4 p-3 bg-white/2 rounded-sm border border-white/5">
                  <span className="text-[9px] font-mono text-neon-blue">{log.time}</span>
                  <div>
                    <div className="text-[10px] font-bold text-white/80">{log.type}</div>
                    <div className="text-[9px] text-white/30 mt-0.5">{log.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 操作 */}
        <div className="flex gap-6 pt-6">
          <button 
            onClick={() => alert('已成功序列化最强个体为“逻辑孢子”，路径: ./spores/')}
            className="flex-1 py-5 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all font-mono text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2"
          >
            <Download size={16} />
            导出最强孢子
          </button>
          <button 
            onClick={onReset}
            className="flex-1 py-5 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <RefreshCcw size={16} />
            重新开启创世
          </button>
        </div>

      </div>
    </div>
  );
};

export default PhoenixReview;
