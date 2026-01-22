import React, { useState } from 'react';
import { X, Settings as SettingsIcon } from 'lucide-react';

// 设置模态框属性接口
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [mode, setMode] = useState<'Local' | 'Ollama'>('Local');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [modelName, setModelName] = useState('llama2');
  const [maxEntities, setMaxEntities] = useState(500);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
      <div className="w-[500px] mica-effect p-8 rounded-sm animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <SettingsIcon size={18} className="text-neon-blue" />
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.3em] font-display">
              系统配置
            </h2>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar pr-2">
          {/* 模拟规模 */}
          <div className="space-y-3">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">模拟规模 (最大实体数)</label>
            <input
              type="number"
              value={maxEntities}
              onChange={(e) => setMaxEntities(parseInt(e.target.value))}
              className="w-full bg-black/40 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-blue focus:outline-none transition-colors"
            />
          </div>

          {/* 模式选择 */}
          <div className="space-y-3">
            <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">进化引擎</label>
            <div className="flex gap-4">
              <button
                onClick={() => setMode('Local')}
                className={`flex-1 py-3 px-4 rounded-sm border transition-all font-mono text-xs uppercase tracking-widest ${
                  mode === 'Local' 
                    ? 'border-neon-blue text-neon-blue bg-neon-blue/10' 
                    : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                }`}
              >
                本地模拟
              </button>
              <button
                onClick={() => setMode('Ollama')}
                className={`flex-1 py-3 px-4 rounded-sm border transition-all font-mono text-xs uppercase tracking-widest ${
                  mode === 'Ollama' 
                    ? 'border-neon-purple text-neon-purple bg-neon-purple/10' 
                    : 'border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                }`}
              >
                AI进化
              </button>
            </div>
          </div>

          {/* Ollama 设置 */}
          {mode === 'Ollama' && (
            <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">API端点</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-blue focus:outline-none transition-colors"
                  placeholder="http://localhost:11434"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">模型名称</label>
                <input
                  type="text"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-blue focus:outline-none transition-colors"
                  placeholder="llama2"
                />
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-white/5">
            <button
              onClick={() => {
                onSave({ mode, ollamaUrl, modelName, maxEntities });
                onClose();
              }}
              className="w-full py-4 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-neon"
            >
              提交配置
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
