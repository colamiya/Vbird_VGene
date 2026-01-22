import React, { useState } from 'react';
import { RefreshCcw, Download, TrendingUp, Skull, Zap, ChevronRight, Network, Trophy, FileText } from 'lucide-react';
import PhylogeneticTree from './PhylogeneticTree';
import HallOfFame from './HallOfFame';

interface PhoenixReviewProps {
  stats: any;
  onReset: () => void;
}

const PhoenixReview: React.FC<PhoenixReviewProps> = ({ stats, onReset }) => {
  const [activeTab, setActiveTab] = useState<'REPORT' | 'TREE' | 'FAME'>('REPORT');

  // 模拟一些复盘数据
  const survivalData = [80, 75, 60, 45, 30, 25, 20];
  const mutationLogs = [
    { time: 'T+120s', type: '指令漂移', desc: '发现更高效的 i32.add 替代方案' },
    { time: 'T+450s', type: '水平基因转移', desc: '个体 #42 与 #89 交换了排序逻辑' },
    { time: 'T+900s', type: '代谢崩溃', desc: '大规模逻辑死循环导致种群缩减' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-2xl font-display">
      
      {/* 顶部导航 */}
      <div className="flex justify-center pt-8 pb-4 border-b border-white/5 z-10">
        <div className="flex gap-2 bg-white/5 p-1 rounded-full">
          {[
            { id: 'REPORT', icon: <FileText size={14} />, label: '演化报告' },
            { id: 'TREE', icon: <Network size={14} />, label: '进化星图' },
            { id: 'FAME', icon: <Trophy size={14} />, label: '万神殿' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all
                ${activeTab === tab.id ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white hover:bg-white/10'}
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* 报告视图 */}
        {activeTab === 'REPORT' && (
          <div className="w-full h-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-500">
            <div className="w-full max-w-4xl p-12 space-y-12">
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
            </div>
          </div>
        )}

        {/* 进化树视图 */}
        {activeTab === 'TREE' && (
          <div className="w-full h-full animate-in fade-in duration-500">
            <PhylogeneticTree />
          </div>
        )}

        {/* 名人堂视图 */}
        {activeTab === 'FAME' && (
          <div className="w-full h-full animate-in fade-in duration-500">
            <HallOfFame />
          </div>
        )}

      </div>

      {/* 底部操作栏 */}
      <div className="p-8 border-t border-white/5 bg-black/50 backdrop-blur-md z-20">
        <div className="max-w-4xl mx-auto flex gap-6">
          <button 
            onClick={() => alert('已成功序列化最强个体为“逻辑孢子”，路径: ./spores/')}
            className="flex-1 py-4 border border-white/10 text-white/60 hover:text-white hover:bg-white/5 transition-all font-mono text-[10px] uppercase tracking-[0.3em] flex items-center justify-center gap-2"
          >
            <Download size={16} />
            导出最强孢子
          </button>
          <button 
            onClick={onReset}
            className="flex-1 py-4 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-95 transition-all"
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
