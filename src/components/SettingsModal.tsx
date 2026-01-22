import React, { useState } from 'react';
import { X, Settings as SettingsIcon, Monitor, Cpu, Database, Bug } from 'lucide-react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

// 设置模态框属性接口
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: any) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [mode, setMode] = useState<'Local' | 'Ollama' | 'LocalMock'>('LocalMock');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [modelName, setModelName] = useState('llama2');
  const [maxEntities, setMaxEntities] = useState(500);
  const [resolution, setResolution] = useState('1280x720');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleResolutionChange = async (res: string) => {
    setResolution(res);
    const [width, height] = res.split('x').map(Number);
    const appWindow = getCurrentWindow();
    await appWindow.setSize(new LogicalSize(width, height));
  };

  const toggleFullscreen = async () => {
    const next = !isFullscreen;
    setIsFullscreen(next);
    const appWindow = getCurrentWindow();
    await appWindow.setFullscreen(next);
  };

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
          
          {/* 显示设置 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
              <Monitor size={12} />
              <span>显示与分辨率</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <select 
                value={resolution}
                onChange={(e) => handleResolutionChange(e.target.value)}
                className="bg-black/40 border border-white/10 p-3 text-white text-[10px] font-mono focus:border-neon-blue focus:outline-none"
              >
                <option value="1280x720">1280 x 720 (16:9)</option>
                <option value="1920x1080">1920 x 1080 (16:9)</option>
                <option value="2560x1440">2560 x 1440 (2K)</option>
              </select>
              <button 
                onClick={toggleFullscreen}
                className={`py-3 px-4 border transition-all font-mono text-[10px] uppercase tracking-widest ${isFullscreen ? 'border-neon-blue text-neon-blue bg-neon-blue/10' : 'border-white/10 text-white/40'}`}
              >
                {isFullscreen ? '退出全屏' : '全屏模式'}
              </button>
            </div>
          </div>

          {/* 模拟规模 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
              <Database size={12} />
              <span>模拟规模 (最大实体数)</span>
            </div>
            <input
              type="number"
              value={maxEntities}
              onChange={(e) => setMaxEntities(parseInt(e.target.value))}
              className="w-full bg-black/40 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-blue focus:outline-none transition-colors"
            />
          </div>

          {/* 模式选择 */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
              <Cpu size={12} />
              <span>进化引擎</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setMode('LocalMock')}
                className={`flex-1 py-3 px-2 rounded-sm border transition-all font-mono text-[9px] uppercase tracking-widest flex items-center justify-center gap-1 ${
                  mode === 'LocalMock' 
                    ? 'border-neon-blue text-neon-blue bg-neon-blue/10' 
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                <Bug size={10} />
                模拟测试
              </button>
              <button
                onClick={() => setMode('Local')}
                className={`flex-1 py-3 px-2 rounded-sm border transition-all font-mono text-[9px] uppercase tracking-widest ${
                  mode === 'Local' 
                    ? 'border-neon-green text-neon-green bg-neon-green/10' 
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                本地引擎
              </button>
              <button
                onClick={() => setMode('Ollama')}
                className={`flex-1 py-3 px-2 rounded-sm border transition-all font-mono text-[9px] uppercase tracking-widest ${
                  mode === 'Ollama' 
                    ? 'border-neon-purple text-neon-purple bg-neon-purple/10' 
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                AI 进化
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
