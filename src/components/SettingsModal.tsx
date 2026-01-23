import React, { useState, useEffect, useCallback } from 'react';
import { X, Settings as SettingsIcon, Monitor, Cpu, Database, Bug, Zap, Activity, Info, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import { sfx } from '../utils/sfx';

// 设置模态框属性接口
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: any) => void;
}

const DEFAULT_CONFIG = {
  mode: 'LocalMock',
  ollamaUrl: 'http://localhost:11434',
  modelName: 'llama3',
  maxEntities: 500,
  evolutionThrottle: 100,
  visualFidelity: 'High',
  resolution: '1280x720',
  displayMode: 'Windowed' // Windowed, Fullscreen, Borderless
};

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave }) => {
  const [mode, setMode] = useState<any>(DEFAULT_CONFIG.mode);
  const [ollamaUrl, setOllamaUrl] = useState(DEFAULT_CONFIG.ollamaUrl);
  const [modelName, setModelName] = useState(DEFAULT_CONFIG.modelName);
  const [maxEntities, setMaxEntities] = useState(DEFAULT_CONFIG.maxEntities);
  const [evolutionThrottle, setEvolutionThrottle] = useState(DEFAULT_CONFIG.evolutionThrottle);
  const [visualFidelity, setVisualFidelity] = useState(DEFAULT_CONFIG.visualFidelity);
  const [resolution, setResolution] = useState(DEFAULT_CONFIG.resolution);
  const [displayMode, setDisplayMode] = useState(DEFAULT_CONFIG.displayMode);

  // 加载持久化设置
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          const saved = await invoke<any>('load_settings');
          setMode(saved.mode);
          setOllamaUrl(saved.ollama_url);
          setModelName(saved.model_name);
          setMaxEntities(saved.max_entities);
          setEvolutionThrottle(saved.evolution_throttle);
          setVisualFidelity(saved.visual_fidelity);
          setResolution(saved.resolution);
          setDisplayMode(saved.display_mode);
        } catch (e) {
          console.log('No saved settings found or error loading, using defaults');
        }
      };
      loadData();
    }
  }, [isOpen]);

  // Ollama 状态
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // 重置为默认
  const handleReset = () => {
    sfx.playClick();
    setMode(DEFAULT_CONFIG.mode);
    setOllamaUrl(DEFAULT_CONFIG.ollamaUrl);
    setModelName(DEFAULT_CONFIG.modelName);
    setMaxEntities(DEFAULT_CONFIG.maxEntities);
    setEvolutionThrottle(DEFAULT_CONFIG.evolutionThrottle);
    setVisualFidelity(DEFAULT_CONFIG.visualFidelity);
    setResolution(DEFAULT_CONFIG.resolution);
  };

  // 检查 Ollama 连接并获取模型
  const checkOllama = useCallback(async (url: string) => {
    if (!url) return;
    setOllamaStatus('checking');
    try {
      const response = await fetch(`${url}/api/tags`);
      if (response.ok) {
        const data = await response.json();
        const models = data.models?.map((m: any) => m.name) || [];
        setAvailableModels(models);
        setOllamaStatus('connected');
        if (models.length > 0 && !models.includes(modelName)) {
          setModelName(models[0]);
        }
      } else {
        setOllamaStatus('error');
      }
    } catch (e) {
      setOllamaStatus('error');
    }
  }, [modelName]);

  useEffect(() => {
    if (isOpen && mode === 'Ollama') {
      checkOllama(ollamaUrl);
    }
  }, [isOpen, mode, ollamaUrl, checkOllama]);

  // 应用显示设置
  const applyDisplaySettings = async () => {
    const appWindow = getCurrentWindow();
    
    if (displayMode === 'Fullscreen') {
      await appWindow.setFullscreen(true);
    } else if (displayMode === 'Borderless') {
      await appWindow.setFullscreen(false);
      await appWindow.maximize();
    } else {
      await appWindow.setFullscreen(false);
      await appWindow.unmaximize();
      const [width, height] = resolution.split('x').map(Number);
      await appWindow.setSize(new LogicalSize(width, height));
      await appWindow.center();
    }
  };

  const handleResolutionChange = (res: string) => {
    setResolution(res);
    if (displayMode === 'Windowed') {
      const [width, height] = res.split('x').map(Number);
      getCurrentWindow().setSize(new LogicalSize(width, height));
    }
  };

  const handleDisplayModeChange = (mode: string) => {
    setDisplayMode(mode);
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-[500px] mica-effect p-8 rounded-sm animate-in zoom-in-95 duration-300 shadow-2xl border-white/5">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <SettingsIcon size={18} className="text-neon-blue" />
            <h2 className="text-sm font-bold text-white uppercase tracking-[0.3em] font-display">
              系统控制台 <span className="text-white/20 font-mono font-normal ml-2">/ SETTINGS</span>
            </h2>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white transition-colors" aria-label="Close settings">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-8 overflow-y-auto max-h-[70vh] custom-scrollbar pr-4">
          
          {/* 模式选择 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                <Cpu size={12} />
                <span>突变引擎选择</span>
              </div>
              <span className="text-[9px] text-white/20 font-mono italic"> Law #3: AI Guided Evolution</span>
            </div>
            <div className="flex gap-2">
              <button
                onMouseEnter={() => sfx.playHover()}
                onClick={() => setMode('Ollama')}
                aria-pressed={mode === 'Ollama'}
                className={`flex-1 py-3 px-2 rounded-sm border transition-all font-mono text-[9px] uppercase tracking-widest flex items-center justify-center gap-1 ${
                  mode === 'Ollama' 
                    ? 'border-neon-purple text-neon-purple bg-neon-purple/10' 
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                <Zap size={10} />
                AI (Ollama)
              </button>
              <button
                onMouseEnter={() => sfx.playHover()}
                onClick={() => setMode('Local')}
                aria-pressed={mode === 'Local'}
                className={`flex-1 py-3 px-2 rounded-sm border transition-all font-mono text-[9px] uppercase tracking-widest ${
                  mode === 'Local' 
                    ? 'border-white text-white bg-white/10' 
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                内置引擎
              </button>
              <button
                onMouseEnter={() => sfx.playHover()}
                onClick={() => setMode('LocalMock')}
                aria-pressed={mode === 'LocalMock'}
                className={`flex-1 py-3 px-2 rounded-sm border transition-all font-mono text-[9px] uppercase tracking-widest flex items-center justify-center gap-1 ${
                  mode === 'LocalMock' 
                    ? 'border-neon-blue text-neon-blue bg-neon-blue/10' 
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                <Bug size={10} />
                沙盒模拟
              </button>
            </div>
          </div>

          {/* Ollama 设置 */}
          {mode === 'Ollama' && (
            <div className="space-y-5 p-5 bg-neon-purple/5 border border-neon-purple/20 rounded-sm animate-in fade-in slide-in-from-top-4 duration-300 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-[9px] font-mono text-neon-purple uppercase tracking-widest">
                  <RefreshCw size={10} className={ollamaStatus === 'checking' ? 'animate-spin' : ''} />
                  <span>Ollama 节点预检</span>
                </div>
                {ollamaStatus === 'connected' && <CheckCircle size={12} className="text-green-500" />}
                {ollamaStatus === 'error' && <AlertCircle size={12} className="text-red-500" />}
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">API 端点</label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  onBlur={() => checkOllama(ollamaUrl)}
                  className={`w-full bg-black/60 border p-3 text-white text-xs font-mono focus:outline-none transition-colors ${
                    ollamaStatus === 'error' ? 'border-red-500/50' : 'border-white/10 focus:border-neon-purple'
                  }`}
                  placeholder="http://localhost:11434"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">模型列表</label>
                {availableModels.length > 0 ? (
                  <select
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-purple focus:outline-none"
                  >
                    {availableModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-purple focus:outline-none"
                    placeholder="llama3"
                  />
                )}
                {ollamaStatus === 'error' && (
                  <p className="text-[8px] text-red-500 font-mono mt-1">无法连接到节点，请检查 Ollama 是否已启动且允许跨域。</p>
                )}
              </div>
            </div>
          )}

          {/* 模拟规模 */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                  <Database size={12} />
                  <span>最大实体数</span>
                </div>
              </div>
              <input
                type="number"
                value={maxEntities}
                onChange={(e) => setMaxEntities(parseInt(e.target.value))}
                className="w-full bg-black/40 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-blue focus:outline-none transition-colors"
              />
              <p className="text-[8px] text-white/20 font-mono">* 需重启模拟生效</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                <Zap size={12} />
                <span>进化频率 (ms)</span>
              </div>
              <input
                type="number"
                value={evolutionThrottle}
                onChange={(e) => setEvolutionThrottle(parseInt(e.target.value))}
                className="w-full bg-black/40 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-blue focus:outline-none transition-colors"
              />
              <p className="text-[8px] text-white/20 font-mono">* 实时应用</p>
            </div>
          </div>

          {/* 显示设置 */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
              <Monitor size={12} />
              <span>显示与分辨率</span>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                {['Windowed', 'Fullscreen', 'Borderless'].map(m => (
                  <button
                    key={m}
                    onMouseEnter={() => sfx.playHover()}
                    onClick={() => handleDisplayModeChange(m)}
                    aria-pressed={displayMode === m}
                    className={`flex-1 py-2 text-[9px] font-mono border transition-all ${displayMode === m ? 'border-neon-blue text-neon-blue bg-neon-blue/10' : 'border-white/5 text-white/20 hover:border-white/20'}`}
                  >
                    {m === 'Windowed' ? '窗口模式' : m === 'Fullscreen' ? '全屏模式' : '无边框全屏'}
                  </button>
                ))}
              </div>
              
              {displayMode === 'Windowed' && (
                <select 
                  value={resolution}
                  onChange={(e) => handleResolutionChange(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 p-3 text-white text-[10px] font-mono focus:border-neon-blue focus:outline-none"
                >
                  <option value="1280x720">1280 x 720 (16:9)</option>
                  <option value="1280x800">1280 x 800 (16:10)</option>
                  <option value="1600x900">1600 x 900 (16:9)</option>
                  <option value="1920x1080">1920 x 1080 (16:9)</option>
                  <option value="2560x1440">2560 x 1440 (2K)</option>
                </select>
              )}
            </div>
          </div>

          {/* 视觉质量 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                <Activity size={12} />
                <span>渲染保真度 (Fidelity)</span>
              </div>
              <span className="text-[8px] text-neon-blue font-mono">
                {visualFidelity === 'Ultra' ? 'Bloom + MSAA Enabled' : 'Standard'}
              </span>
            </div>
            <div className="flex gap-2">
              {['Low', 'Medium', 'High', 'Ultra'].map(f => (
                <button
                  key={f}
                  onMouseEnter={() => sfx.playHover()}
                  onClick={() => setVisualFidelity(f)}
                  aria-pressed={visualFidelity === f}
                  className={`flex-1 py-2 text-[9px] font-mono border transition-all ${visualFidelity === f ? 'border-neon-blue text-neon-blue bg-neon-blue/5 shadow-[inset_0_0_10px_rgba(0,234,255,0.1)]' : 'border-white/5 text-white/20 hover:border-white/20'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/5 flex gap-4">
            <button
              onMouseEnter={() => sfx.playHover()}
              onClick={handleReset}
              className="px-6 py-4 border border-white/10 text-white/40 hover:text-white hover:border-white transition-all font-mono text-[10px] uppercase tracking-widest"
            >
              重置
            </button>
            <button
              onMouseEnter={() => sfx.playHover()}
              onClick={async () => {
                sfx.playClick();
                await applyDisplaySettings();
                
                const settingsToSave = { 
                  mode, 
                  ollama_url: ollamaUrl, 
                  model_name: modelName, 
                  max_entities: maxEntities, 
                  evolution_throttle: evolutionThrottle, 
                  visual_fidelity: visualFidelity,
                  resolution,
                  display_mode: displayMode
                };

                try {
                  await invoke('save_settings', { settings: settingsToSave });
                  await invoke('logger', { module: 'UI', content: 'User submitted settings successfully' });
                } catch (e) {
                  await invoke('logger', { module: 'UI', content: `Error saving settings: ${e}` });
                }

                onSave(settingsToSave);
                onClose();
              }}
              className="flex-1 py-4 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] hover:scale-[1.02] active:scale-95 transition-all shadow-neon"
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
