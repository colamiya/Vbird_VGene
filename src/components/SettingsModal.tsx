import React, { useState, useEffect, useCallback, useId, useMemo } from 'react';
import { X, Settings as SettingsIcon, Monitor, Cpu, Database, Bug, Zap, Activity, RefreshCw, CheckCircle, AlertCircle, Volume2, Shield, Globe, Anchor, Rocket } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { audioEngine } from '../utils/audio/engine';
import { sfx } from '../utils/sfx';
import { DEFAULT_APP_CONFIG, normalizeSettings, toBackendSettings } from '../utils/settings';
import { applyDisplaySettings } from '../utils/windowControls';
import type { AppConfig, BenchmarkTask, ComputeBackend, ComputeStatus, DisplayMode, EnvironmentType, VisualFidelity, WinningRule } from '../types/world';

const fallbackBenchmarkTasks: BenchmarkTask[] = [
  {
    id: 'freeform',
    name: 'freeform',
    export_name: 'calculate_fitness',
    goal: 'Baseline sandbox mode: only calculate_fitness() is required.',
    public_cases: [],
  },
  {
    id: 'sort_i32',
    name: 'sort_i32',
    export_name: 'sort_i32',
    goal: 'Sort little-endian i32 values in wasm memory.',
    public_cases: [],
  },
  {
    id: 'rle',
    name: 'rle',
    export_name: 'rle_encode',
    goal: 'Run-length encode input bytes into wasm memory.',
    public_cases: [],
  },
  {
    id: 'sum_i32',
    name: 'sum_i32',
    export_name: 'sum_i32',
    goal: 'Sum little-endian i32 values in wasm memory.',
    public_cases: [],
  },
  {
    id: 'max_i32',
    name: 'max_i32',
    export_name: 'max_i32',
    goal: 'Return the maximum i32 value in wasm memory.',
    public_cases: [],
  },
  {
    id: 'find_i32',
    name: 'find_i32',
    export_name: 'find_i32',
    goal: 'Find the first matching i32 target index.',
    public_cases: [],
  },
  {
    id: 'checksum8',
    name: 'checksum8',
    export_name: 'checksum8',
    goal: 'Return an 8-bit checksum for input bytes.',
    public_cases: [],
  },
  {
    id: 'count_byte',
    name: 'count_byte',
    export_name: 'count_byte',
    goal: 'Count occurrences of one target byte.',
    public_cases: [],
  },
];

const winningRuleOptions: Array<{ id: WinningRule; name: string; desc: string }> = [
  { id: 'SURVIVAL', name: '生存至上', desc: '按适应度与能量保留精英' },
  { id: 'PREDATION', name: '掠夺天性', desc: '提高攻击性个体选择权重' },
  { id: 'CODE_SIZE', name: '极简逻辑', desc: '奖励更短、更高效的 DNA' },
];

const environmentOptions: Array<{ id: EnvironmentType; name: string; desc: string }> = [
  { id: 'EARTH', name: '大地', desc: '标准运动扰动' },
  { id: 'DEEP_SEA', name: '深海', desc: '低速稳定扩散' },
  { id: 'SPACE', name: '深空', desc: '高位移漂移' },
];

const computeBackendOptions: Array<{ id: ComputeBackend; name: string; desc: string }> = [
  { id: 'Auto', name: '自动', desc: '优先稳定路径，CUDA 可用时实验启用' },
  { id: 'CPU', name: 'CPU', desc: 'Rayon 稳定路径' },
  { id: 'CUDA', name: 'CUDA', desc: '实验性 NVIDIA 生态后端' },
];

// 设置模态框属性接口
interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  onSave: (settings: AppConfig, context?: { currentConfig?: AppConfig }) => void | Promise<void>;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onSave }) => {
  const [mode, setMode] = useState<any>(DEFAULT_APP_CONFIG.mode);
  const [ollamaUrl, setOllamaUrl] = useState(DEFAULT_APP_CONFIG.ollamaUrl);
  const [modelName, setModelName] = useState(DEFAULT_APP_CONFIG.modelName);
  const [maxEntities, setMaxEntities] = useState(DEFAULT_APP_CONFIG.maxEntities);
  const [evolutionThrottle, setEvolutionThrottle] = useState(DEFAULT_APP_CONFIG.evolutionThrottle);
  const [visualFidelity, setVisualFidelity] = useState(DEFAULT_APP_CONFIG.visualFidelity);
  const [resolution, setResolution] = useState(DEFAULT_APP_CONFIG.resolution);
  const [displayMode, setDisplayMode] = useState(DEFAULT_APP_CONFIG.displayMode);
  const [fontScale, setFontScale] = useState(DEFAULT_APP_CONFIG.fontScale);
  const [mutationRate, setMutationRate] = useState(DEFAULT_APP_CONFIG.mutationRate);
  const [entropyFactor, setEntropyFactor] = useState(DEFAULT_APP_CONFIG.entropyFactor);
  const [winningRule, setWinningRule] = useState<WinningRule>(DEFAULT_APP_CONFIG.winningRule);
  const [envType, setEnvType] = useState<EnvironmentType>(DEFAULT_APP_CONFIG.envType);
  const [computeBackend, setComputeBackend] = useState<ComputeBackend>(DEFAULT_APP_CONFIG.computeBackend);
  const [taskId, setTaskId] = useState(DEFAULT_APP_CONFIG.taskId);
  const [audioEnabled, setAudioEnabled] = useState(DEFAULT_APP_CONFIG.audioEnabled);
  const [masterVolume, setMasterVolume] = useState(DEFAULT_APP_CONFIG.masterVolume);
  const [musicVolume, setMusicVolume] = useState(DEFAULT_APP_CONFIG.musicVolume);
  const [sfxVolume, setSfxVolume] = useState(DEFAULT_APP_CONFIG.sfxVolume);
  const [adaptiveMusic, setAdaptiveMusic] = useState(DEFAULT_APP_CONFIG.adaptiveMusic);
  const [benchmarkTasks, setBenchmarkTasks] = useState<BenchmarkTask[]>(fallbackBenchmarkTasks);
  const [computeStatus, setComputeStatus] = useState<ComputeStatus | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [audioProbeStatus, setAudioProbeStatus] = useState('');
  const [closeGuardOpen, setCloseGuardOpen] = useState(false);
  const [resetGuardOpen, setResetGuardOpen] = useState(false);
  const titleId = useId();
  const displayModes: DisplayMode[] = ['Windowed', 'Fullscreen', 'Borderless'];
const visualFidelityLevels: VisualFidelity[] = ['Low', 'Medium', 'High', 'Ultra'];
const fontScalePresets = [1, 1.25, 1.5] as const;

const logSafely = async (module: string, content: string) => {
  try {
    await invoke('logger', { module, content });
  } catch (e) {
    console.error('写入运行日志失败:', e);
  }
};

  // 加载持久化设置
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setCloseGuardOpen(false);
        setResetGuardOpen(false);
        try {
          const catalog = await invoke<BenchmarkTask[]>('get_benchmark_catalog');
          if (catalog.length > 0) {
            setBenchmarkTasks(catalog);
          }
        } catch (e) {
          setBenchmarkTasks(fallbackBenchmarkTasks);
        }

        try {
          setComputeStatus(await invoke<ComputeStatus>('get_compute_status'));
        } catch (e) {
          setComputeStatus(null);
        }

        const normalized = normalizeSettings(config);
        setMode(normalized.mode);
        setOllamaUrl(normalized.ollamaUrl);
        setModelName(normalized.modelName);
        setMaxEntities(normalized.maxEntities);
        setEvolutionThrottle(normalized.evolutionThrottle);
        setVisualFidelity(normalized.visualFidelity);
        setResolution(normalized.resolution);
        setDisplayMode(normalized.displayMode);
        setFontScale(normalized.fontScale);
        setMutationRate(normalized.mutationRate);
        setEntropyFactor(normalized.entropyFactor);
        setWinningRule(normalized.winningRule);
        setEnvType(normalized.envType);
        setComputeBackend(normalized.computeBackend);
        setTaskId(normalized.taskId);
        setAudioEnabled(normalized.audioEnabled);
        setMasterVolume(normalized.masterVolume);
        setMusicVolume(normalized.musicVolume);
        setSfxVolume(normalized.sfxVolume);
        setAdaptiveMusic(normalized.adaptiveMusic);
      };
      loadData();
    }
  }, [config, isOpen]);

  // Ollama 状态
  const [ollamaStatus, setOllamaStatus] = useState<'idle' | 'checking' | 'connected' | 'error'>('idle');
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // 重置为默认
  const handleReset = () => {
    sfx.playClick();
    setSaveError('');
    setCloseGuardOpen(false);
    setResetGuardOpen(false);
    setMode(DEFAULT_APP_CONFIG.mode);
    setOllamaUrl(DEFAULT_APP_CONFIG.ollamaUrl);
    setModelName(DEFAULT_APP_CONFIG.modelName);
    setMaxEntities(DEFAULT_APP_CONFIG.maxEntities);
    setEvolutionThrottle(DEFAULT_APP_CONFIG.evolutionThrottle);
    setVisualFidelity(DEFAULT_APP_CONFIG.visualFidelity);
    setResolution(DEFAULT_APP_CONFIG.resolution);
    setDisplayMode(DEFAULT_APP_CONFIG.displayMode);
    setFontScale(DEFAULT_APP_CONFIG.fontScale);
    setMutationRate(DEFAULT_APP_CONFIG.mutationRate);
    setEntropyFactor(DEFAULT_APP_CONFIG.entropyFactor);
    setWinningRule(DEFAULT_APP_CONFIG.winningRule);
    setEnvType(DEFAULT_APP_CONFIG.envType);
    setComputeBackend(DEFAULT_APP_CONFIG.computeBackend);
    setTaskId(DEFAULT_APP_CONFIG.taskId);
    setAudioEnabled(DEFAULT_APP_CONFIG.audioEnabled);
    setMasterVolume(DEFAULT_APP_CONFIG.masterVolume);
    setMusicVolume(DEFAULT_APP_CONFIG.musicVolume);
    setSfxVolume(DEFAULT_APP_CONFIG.sfxVolume);
    setAdaptiveMusic(DEFAULT_APP_CONFIG.adaptiveMusic);
  };

  // 检查 Ollama 连接并获取模型
  const checkOllama = useCallback(async (url: string) => {
    if (!url) return;
    setOllamaStatus('checking');
    try {
      const models = await invoke<string[]>('check_ollama_models', { ollamaUrl: url });
      setAvailableModels(models);
      setOllamaStatus('connected');
      if (models.length > 0 && !models.includes(modelName)) {
        setModelName(models[0]);
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

  const handleResolutionChange = (res: string) => {
    setResolution(res);
  };

  const handleDisplayModeChange = (mode: DisplayMode) => {
    setDisplayMode(mode);
  };

  const requestReset = useCallback(() => {
    if (isSaving) return;
    sfx.playClick();
    setCloseGuardOpen(false);
    setResetGuardOpen(true);
  }, [isSaving]);

  const persistedSettings = useMemo(() => normalizeSettings(config), [config]);
  const currentDraftSettings = useMemo(() => normalizeSettings({
    mode,
    ollamaUrl,
    modelName,
    maxEntities,
    evolutionThrottle,
    visualFidelity,
    resolution,
    displayMode,
    fontScale,
    mutationRate,
    entropyFactor,
    winningRule,
    envType,
    computeBackend,
    taskId,
    audioEnabled,
    masterVolume,
    musicVolume,
    sfxVolume,
    adaptiveMusic,
  }), [
    mode,
    ollamaUrl,
    modelName,
    maxEntities,
    evolutionThrottle,
    visualFidelity,
    resolution,
    displayMode,
    fontScale,
    mutationRate,
    entropyFactor,
    winningRule,
    envType,
    computeBackend,
    taskId,
    audioEnabled,
    masterVolume,
    musicVolume,
    sfxVolume,
    adaptiveMusic,
  ]);
  const hasUnsavedChanges = JSON.stringify(currentDraftSettings) !== JSON.stringify(persistedSettings);

  useEffect(() => {
    if (isOpen) return;
    audioEngine.setSettings(persistedSettings);
    setAudioProbeStatus('');
  }, [isOpen, persistedSettings]);

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      audioEngine.setSettings(currentDraftSettings);
    }, 120);
    return () => window.clearTimeout(timer);
  }, [currentDraftSettings, isOpen]);

  const previewAudio = useCallback(async (event: 'success' | 'crisis_surge') => {
    if (!audioEnabled) {
      setAudioProbeStatus('音频已静音，启用后才能试听。');
      return;
    }

    audioEngine.setSettings(currentDraftSettings);
    await audioEngine.emit(event);
    const current = audioEngine.getNowPlaying();
    setAudioProbeStatus(
      current.error
        ? `音频不可用：${current.error}`
        : `试听完成：${event === 'success' ? '确认音' : '危机音'} / ${current.name}`,
    );
  }, [audioEnabled, currentDraftSettings]);

  const discardAndClose = useCallback(() => {
    sfx.playClick();
    setCloseGuardOpen(false);
    setSaveError('');
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (isSaving) return;
    if (hasUnsavedChanges) {
      sfx.playClick();
      setResetGuardOpen(false);
      setCloseGuardOpen(true);
      return;
    }
    onClose();
  }, [hasUnsavedChanges, isSaving, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        requestClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, requestClose]);

  const handleSubmit = async () => {
    if (isSaving) return;

    sfx.playClick();
    setIsSaving(true);
    setCloseGuardOpen(false);
    setResetGuardOpen(false);
    setSaveError('');
    const previousSettings = normalizeSettings(config);
    let displayApplied = false;
    let runtimeSaveAttempted = false;

    const nextSettings = currentDraftSettings;
    const settingsToSave = toBackendSettings(nextSettings);

    try {
      await applyDisplaySettings(nextSettings);
      displayApplied = true;
      runtimeSaveAttempted = true;
      await onSave(nextSettings);
      await invoke('save_settings', { settings: settingsToSave });
      await logSafely('UI', 'User submitted settings successfully');
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (displayApplied || runtimeSaveAttempted) {
        try {
          if (displayApplied) {
            await applyDisplaySettings(previousSettings);
          }
          if (runtimeSaveAttempted) {
            await onSave(previousSettings, { currentConfig: nextSettings });
          }
          await logSafely('UI', 'Settings save failed; runtime settings rolled back');
        } catch (rollbackError) {
          console.error('设置保存失败后的回滚也失败:', rollbackError);
        }
      }
      setSaveError(`保存失败：${message}`);
      await logSafely('UI', `Error saving settings: ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const fontScalePercent = Math.round(fontScale * 100);
  const fontScaleStyle = { '--vgene-font-scale': fontScale } as React.CSSProperties;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={requestClose}
      style={fontScaleStyle}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300 modal-scroll-lock"
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-[calc(100vw-2rem)] sm:max-w-[640px] lg:max-w-[720px] max-h-[calc(100vh-4rem)] mica-effect p-4 sm:p-8 rounded-sm animate-in zoom-in-95 duration-300 shadow-2xl border-white/5 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <SettingsIcon size={18} className="text-neon-blue" />
            <h2 id={titleId} className="text-sm font-bold text-white uppercase tracking-[0.3em] font-display">
              系统控制台 <span className="text-white/20 font-mono font-normal ml-2">/ SETTINGS</span>
            </h2>
          </div>
          <button
            type="button"
            aria-label="关闭设置"
            onClick={requestClose}
            disabled={isSaving}
            className="interactive-focus text-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-8 overflow-y-auto max-h-[calc(100vh-14rem)] custom-scrollbar pr-2 sm:pr-4">
          <fieldset
            disabled={isSaving}
            aria-busy={isSaving}
            className="m-0 min-w-0 space-y-8 border-0 p-0 disabled:cursor-wait disabled:opacity-70"
          >
          
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
                type="button"
                aria-pressed={mode === 'Ollama'}
                onMouseEnter={() => sfx.playHover()}
                onClick={() => setMode('Ollama')}
                className={`interactive-focus flex-1 py-3 px-2 rounded-sm border transition-[border-color,color,background-color] font-mono text-[9px] uppercase tracking-widest flex items-center justify-center gap-1 ${
                  mode === 'Ollama' 
                    ? 'border-neon-purple text-neon-purple bg-neon-purple/10' 
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                <Zap size={10} />
                AI (Ollama)
              </button>
              <button
                type="button"
                aria-pressed={mode === 'Local'}
                onMouseEnter={() => sfx.playHover()}
                onClick={() => setMode('Local')}
                className={`interactive-focus flex-1 py-3 px-2 rounded-sm border transition-[border-color,color,background-color] font-mono text-[9px] uppercase tracking-widest ${
                  mode === 'Local' 
                    ? 'border-white text-white bg-white/10' 
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                内置引擎
              </button>
              <button
                type="button"
                aria-pressed={mode === 'LocalMock'}
                onMouseEnter={() => sfx.playHover()}
                onClick={() => setMode('LocalMock')}
                className={`interactive-focus flex-1 py-3 px-2 rounded-sm border transition-[border-color,color,background-color] font-mono text-[9px] uppercase tracking-widest flex items-center justify-center gap-1 ${
                  mode === 'LocalMock' 
                    ? 'border-neon-blue text-neon-blue bg-neon-blue/10' 
                    : 'border-white/10 text-white/40 hover:border-white/20'
                }`}
              >
                <Bug size={10} />
                UI 沙盒
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
                <label htmlFor="settings-ollama-url" className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">API 端点</label>
                <input
                  id="settings-ollama-url"
                  name="ollama_url"
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  onBlur={() => checkOllama(ollamaUrl)}
                  className={`interactive-focus w-full bg-black/60 border p-3 text-white text-xs font-mono transition-colors ${
                    ollamaStatus === 'error' ? 'border-red-500/50' : 'border-white/10 focus:border-neon-purple'
                  }`}
                  placeholder="http://localhost:11434…"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="settings-model-name" className="text-[10px] font-mono text-white/40 uppercase tracking-widest block">模型列表</label>
                {availableModels.length > 0 ? (
                  <select
                    id="settings-model-name"
                    name="model_name"
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="interactive-focus w-full bg-black/60 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-purple"
                  >
                    {availableModels.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="settings-model-name"
                    name="model_name"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    className="interactive-focus w-full bg-black/60 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-purple"
                    placeholder="llama3…"
                  />
                )}
                {ollamaStatus === 'error' && (
                  <p className="text-[8px] text-red-500 font-mono mt-1">无法连接到节点，请检查 Ollama 是否已启动且端点地址正确。</p>
                )}
              </div>
            </div>
          )}

          {/* 第一阶段真实任务 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                <Database size={12} />
                <span>有用工作任务</span>
              </div>
              <span className="text-[8px] text-neon-blue font-mono">Phase 1</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {benchmarkTasks.map(task => (
                <button
                  type="button"
                  aria-pressed={taskId === task.id}
                  key={task.id}
                  onMouseEnter={() => sfx.playHover()}
                  onClick={() => setTaskId(task.id)}
                  className={`interactive-focus p-3 rounded-sm border transition-[border-color,color,background-color] text-left ${
                    taskId === task.id
                      ? 'border-neon-blue bg-neon-blue/10 text-neon-blue'
                      : 'border-white/10 text-white/40 hover:border-white/20'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase tracking-widest">{task.name}</div>
                  <div className="text-[8px] font-mono opacity-50 mt-1">{task.export_name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 演化动力学 */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                <Activity size={12} />
                <span>演化动力学</span>
              </div>
              <span className="text-[8px] text-neon-blue font-mono">Runtime</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
                  <label htmlFor="settings-mutation-rate" className="text-white/40">突变替换率</label>
                  <span className="text-neon-blue">{(mutationRate * 100).toFixed(1)}%</span>
                </div>
                <input
                  id="settings-mutation-rate"
                  name="mutation_rate"
                  type="range"
                  min="0.001"
                  max="1"
                  step="0.001"
                  value={mutationRate}
                  onChange={(e) => setMutationRate(e.currentTarget.valueAsNumber)}
                  className="interactive-focus w-full accent-neon-blue"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
                  <label htmlFor="settings-entropy-factor" className="text-white/40">熵压强度</label>
                  <span className="text-neon-blue">{(entropyFactor * 100).toFixed(0)}%</span>
                </div>
                <input
                  id="settings-entropy-factor"
                  name="entropy_factor"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={entropyFactor}
                  onChange={(e) => setEntropyFactor(e.currentTarget.valueAsNumber)}
                  className="interactive-focus w-full accent-neon-blue"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] text-white/30 font-mono uppercase tracking-widest">胜出规则</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {winningRuleOptions.map(rule => (
                  <button
                    type="button"
                    key={rule.id}
                    aria-pressed={winningRule === rule.id}
                    onMouseEnter={() => sfx.playHover()}
                    onClick={() => setWinningRule(rule.id)}
                    className={`interactive-focus p-3 rounded-sm border text-left transition-[border-color,color,background-color] ${
                      winningRule === rule.id
                        ? 'border-neon-blue bg-neon-blue/10 text-neon-blue'
                        : 'border-white/10 text-white/40 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {rule.id === 'SURVIVAL' && <Activity size={12} aria-hidden="true" />}
                      {rule.id === 'PREDATION' && <Zap size={12} aria-hidden="true" />}
                      {rule.id === 'CODE_SIZE' && <Shield size={12} aria-hidden="true" />}
                      <span className="text-[10px] font-bold uppercase tracking-widest">{rule.name}</span>
                    </div>
                    <p className="mt-1 text-[8px] font-mono opacity-50 leading-relaxed">{rule.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[9px] text-white/30 font-mono uppercase tracking-widest">环境类型</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {environmentOptions.map(env => (
                  <button
                    type="button"
                    key={env.id}
                    aria-pressed={envType === env.id}
                    onMouseEnter={() => sfx.playHover()}
                    onClick={() => setEnvType(env.id)}
                    className={`interactive-focus p-3 rounded-sm border text-left transition-[border-color,color,background-color] ${
                      envType === env.id
                        ? 'border-neon-blue bg-neon-blue/10 text-neon-blue'
                        : 'border-white/10 text-white/40 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {env.id === 'EARTH' && <Globe size={12} aria-hidden="true" />}
                      {env.id === 'DEEP_SEA' && <Anchor size={12} aria-hidden="true" />}
                      {env.id === 'SPACE' && <Rocket size={12} aria-hidden="true" />}
                      <span className="text-[10px] font-bold uppercase tracking-widest">{env.name}</span>
                    </div>
                    <p className="mt-1 text-[8px] font-mono opacity-50 leading-relaxed">{env.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 计算后端 */}
          <div className="space-y-4 border border-white/5 bg-white/[0.03] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                <Cpu size={12} />
                <span>演化计算后端</span>
              </div>
              <span className={`text-[8px] font-mono uppercase tracking-widest ${
                computeStatus?.active_backend === 'CUDA' ? 'text-green-300' : 'text-white/35'
              }`}>
                {computeStatus?.active_backend === 'CUDA' ? 'CUDA EXPERIMENTAL' : 'CPU FALLBACK'}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {computeBackendOptions.map((backend) => (
                <button
                  type="button"
                  key={backend.id}
                  aria-pressed={computeBackend === backend.id}
                  onMouseEnter={() => sfx.playHover()}
                  onClick={() => setComputeBackend(backend.id)}
                  className={`interactive-focus border p-3 text-left transition-[border-color,color,background-color] ${
                    computeBackend === backend.id
                      ? 'border-green-300 bg-green-300/10 text-green-200'
                      : 'border-white/10 text-white/40 hover:border-white/25 hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-widest">{backend.name}</span>
                  <span className="mt-1 block text-[8px] font-mono leading-relaxed opacity-60">{backend.desc}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[8px] font-mono text-white/35 sm:grid-cols-4">
              <span>DEVICE: {computeStatus?.device_name ?? 'Unknown'}</span>
              <span>CC: {computeStatus?.compute_capability ?? '--'}</span>
              <span>GPU: {computeStatus?.gpu_load ?? 0}%</span>
              <span>TEMP: {computeStatus?.temperature ?? 0}°C</span>
              <span>
                VRAM: {computeStatus ? `${Math.round(computeStatus.vram_free / 1024 / 1024)}MB free` : '--'}
              </span>
              <span>KERNEL: {computeStatus ? `${computeStatus.last_kernel_ms.toFixed(2)}ms` : '--'}</span>
              <span>SCALE: {computeStatus ? `${computeStatus.adaptive_scale.toFixed(2)}x` : '--'}</span>
              <span>CAP: {computeStatus?.effective_entity_cap || maxEntities}</span>
            </div>
            {computeStatus?.fallback_reason && (
              <p className="text-[8px] font-mono leading-relaxed text-yellow-300/70">
                {computeStatus.fallback_reason}
              </p>
            )}
          </div>

          {/* 模拟规模 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                  <Database size={12} />
                  <span>最大实体数</span>
                </div>
              </div>
              <label htmlFor="settings-max-entities" className="sr-only">最大实体数</label>
              <input
                id="settings-max-entities"
                name="max_entities"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                value={maxEntities}
                onChange={(e) => {
                  const value = e.currentTarget.valueAsNumber;
                  setMaxEntities(Number.isFinite(value) ? value : DEFAULT_APP_CONFIG.maxEntities);
                }}
                className="interactive-focus w-full bg-black/40 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-blue transition-colors"
              />
              <p className="text-[8px] text-white/20 font-mono">* 需重启模拟生效</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                <Zap size={12} />
                <span>进化频率 (ms)</span>
              </div>
              <label htmlFor="settings-evolution-throttle" className="sr-only">进化频率</label>
              <input
                id="settings-evolution-throttle"
                name="evolution_throttle"
                type="number"
                inputMode="numeric"
                autoComplete="off"
                value={evolutionThrottle}
                onChange={(e) => {
                  const value = e.currentTarget.valueAsNumber;
                  setEvolutionThrottle(Number.isFinite(value) ? value : DEFAULT_APP_CONFIG.evolutionThrottle);
                }}
                className="interactive-focus w-full bg-black/40 border border-white/10 p-3 text-white text-xs font-mono focus:border-neon-blue transition-colors"
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
            <div className="space-y-3 border border-white/5 bg-white/[0.03] p-3">
              <div className="flex items-center justify-between gap-4 text-[9px] font-mono uppercase tracking-widest">
                <label htmlFor="settings-font-scale" className="text-white/40">界面字号</label>
                <span className="text-neon-blue">{fontScalePercent}%</span>
              </div>
              <input
                id="settings-font-scale"
                name="font_scale"
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={fontScale}
                onChange={(e) => setFontScale(Number(e.currentTarget.value))}
                className="interactive-focus w-full accent-neon-blue"
              />
              <div className="grid grid-cols-3 gap-2">
                {fontScalePresets.map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    aria-pressed={Math.abs(fontScale - preset) < 0.001}
                    onMouseEnter={() => sfx.playHover()}
                    onClick={() => setFontScale(preset)}
                    className={`interactive-focus border px-3 py-2 text-[9px] font-mono uppercase tracking-widest transition-[border-color,color,background-color] ${
                      Math.abs(fontScale - preset) < 0.001
                        ? 'border-neon-blue bg-neon-blue/10 text-neon-blue'
                        : 'border-white/10 text-white/35 hover:border-white/25 hover:text-white'
                    }`}
                  >
                    {Math.round(preset * 100)}%
                  </button>
                ))}
              </div>
              <p className="text-[8px] font-mono leading-relaxed text-white/30">
                当前弹窗已按该比例预览；保存后入口、局前、局内和复盘统一生效。
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                {displayModes.map(m => (
                  <button
                    type="button"
                    aria-pressed={displayMode === m}
                    key={m}
                    onMouseEnter={() => sfx.playHover()}
                    onClick={() => handleDisplayModeChange(m)}
                    className={`interactive-focus flex-1 py-2 text-[9px] font-mono border transition-[border-color,color,background-color] ${displayMode === m ? 'border-neon-blue text-neon-blue bg-neon-blue/10' : 'border-white/5 text-white/20 hover:border-white/20'}`}
                  >
                    {m === 'Windowed' ? '窗口模式' : m === 'Fullscreen' ? '全屏模式' : '无边框全屏'}
                  </button>
                ))}
              </div>
              
              {displayMode === 'Windowed' && (
                <>
                <label htmlFor="settings-resolution" className="sr-only">窗口分辨率</label>
                <select
                  id="settings-resolution"
                  name="resolution"
                  value={resolution}
                  onChange={(e) => handleResolutionChange(e.target.value)}
                  className="interactive-focus w-full bg-black/40 border border-white/10 p-3 text-white text-[10px] font-mono focus:border-neon-blue"
                >
                  <option value="1280x720">1280 x 720 (16:9)</option>
                  <option value="1280x800">1280 x 800 (16:10)</option>
                  <option value="1600x900">1600 x 900 (16:9)</option>
                  <option value="1920x1080">1920 x 1080 (16:9)</option>
                  <option value="2560x1440">2560 x 1440 (2K)</option>
                </select>
                </>
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
              {visualFidelityLevels.map(f => (
                <button
                  type="button"
                  aria-pressed={visualFidelity === f}
                  key={f}
                  onMouseEnter={() => sfx.playHover()}
                  onClick={() => setVisualFidelity(f)}
                  className={`interactive-focus flex-1 py-2 text-[9px] font-mono border transition-[border-color,color,background-color] ${visualFidelity === f ? 'border-neon-blue text-neon-blue bg-neon-blue/5 shadow-[inset_0_0_10px_rgba(0,234,255,0.1)]' : 'border-white/5 text-white/20 hover:border-white/20'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* 音频系统 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-mono text-white/40 uppercase tracking-widest">
                <Volume2 size={12} />
                <span>暗黑赛博音频</span>
              </div>
              <button
                type="button"
                aria-pressed={audioEnabled}
                onMouseEnter={() => sfx.playHover()}
                onClick={() => setAudioEnabled(!audioEnabled)}
                className={`interactive-focus px-3 py-1 border text-[8px] font-mono uppercase tracking-widest transition-[border-color,color,background-color] ${
                  audioEnabled
                    ? 'border-neon-blue text-neon-blue bg-neon-blue/10'
                    : 'border-white/10 text-white/30'
                }`}
              >
                {audioEnabled ? 'Enabled' : 'Muted'}
              </button>
            </div>

            <div className={`space-y-4 ${audioEnabled ? '' : 'opacity-40'}`}>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-pressed={adaptiveMusic}
                  disabled={!audioEnabled}
                  onMouseEnter={() => sfx.playHover()}
                  onClick={() => setAdaptiveMusic(true)}
                  className={`interactive-focus flex-1 py-2 text-[9px] font-mono border transition-[border-color,color,background-color] disabled:cursor-not-allowed ${
                    adaptiveMusic
                      ? 'border-neon-blue text-neon-blue bg-neon-blue/10'
                      : 'border-white/5 text-white/20 hover:border-white/20'
                  }`}
                >
                  强联动
                </button>
                <button
                  type="button"
                  aria-pressed={!adaptiveMusic}
                  disabled={!audioEnabled}
                  onMouseEnter={() => sfx.playHover()}
                  onClick={() => setAdaptiveMusic(false)}
                  className={`interactive-focus flex-1 py-2 text-[9px] font-mono border transition-[border-color,color,background-color] disabled:cursor-not-allowed ${
                    !adaptiveMusic
                      ? 'border-neon-blue text-neon-blue bg-neon-blue/10'
                      : 'border-white/5 text-white/20 hover:border-white/20'
                  }`}
                >
                  稳定循环
                </button>
              </div>

              {[
                { label: 'Master', value: masterVolume, setter: setMasterVolume },
                { label: 'Music', value: musicVolume, setter: setMusicVolume },
                { label: 'SFX', value: sfxVolume, setter: setSfxVolume },
              ].map(item => (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
                    <span className="text-white/40">{item.label}</span>
                    <span className="text-neon-blue">{Math.round(item.value * 100)}%</span>
                  </div>
                  <label htmlFor={`settings-${item.label.toLowerCase()}-volume`} className="sr-only">{item.label} Volume</label>
                  <input
                    id={`settings-${item.label.toLowerCase()}-volume`}
                    name={`${item.label.toLowerCase()}_volume`}
                    disabled={!audioEnabled}
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={item.value}
                    onChange={(e) => item.setter(Number(e.target.value))}
                    className="interactive-focus w-full accent-cyan-400 disabled:cursor-not-allowed"
                  />
                </div>
              ))}

              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={!audioEnabled}
                  onMouseEnter={() => sfx.playHover()}
                  onClick={() => previewAudio('success')}
                  className="interactive-focus min-h-11 border border-emerald-300/25 px-3 py-3 text-[9px] font-mono uppercase tracking-[0.14em] text-emerald-200 transition-[border-color,background-color,color] hover:bg-emerald-300/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  试听确认音
                </button>
                <button
                  type="button"
                  disabled={!audioEnabled}
                  onMouseEnter={() => sfx.playHover()}
                  onClick={() => previewAudio('crisis_surge')}
                  className="interactive-focus min-h-11 border border-red-300/25 px-3 py-3 text-[9px] font-mono uppercase tracking-[0.14em] text-red-200 transition-[border-color,background-color,color] hover:bg-red-400/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  试听危机音
                </button>
              </div>

              {audioProbeStatus && (
                <p aria-live="polite" className="border border-white/10 bg-black/35 p-3 text-[9px] font-mono leading-relaxed text-white/45">
                  {audioProbeStatus}
                </p>
              )}
            </div>
          </div>
          </fieldset>

          {closeGuardOpen && (
            <div
              role="alert"
              aria-live="assertive"
              className="border border-yellow-300/35 bg-yellow-300/10 p-4 text-yellow-100"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-200">未保存修改</p>
                  <p className="mt-1 text-[10px] font-mono leading-relaxed text-yellow-100/75">
                    当前设置还没有提交，直接关闭会丢弃本次调整。
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setCloseGuardOpen(false)}
                    className="interactive-focus min-h-10 border border-white/15 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em] text-white/70 transition-[border-color,color,background-color] hover:border-white/40 hover:bg-white/5 hover:text-white"
                  >
                    继续编辑
                  </button>
                  <button
                    type="button"
                    onClick={discardAndClose}
                    className="interactive-focus min-h-10 border border-yellow-300/50 bg-yellow-300/15 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em] text-yellow-100 transition-[border-color,background-color] hover:border-yellow-200 hover:bg-yellow-300/25"
                  >
                    放弃关闭
                  </button>
                </div>
              </div>
            </div>
          )}

          {resetGuardOpen && (
            <div
              role="alert"
              aria-live="assertive"
              className="border border-red-300/35 bg-red-300/10 p-4 text-red-100"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-200">重置草稿</p>
                  <p className="mt-1 text-[10px] font-mono leading-relaxed text-red-100/75">
                    这里只会把当前表单恢复默认值，点击提交配置后才会覆盖本地设置。
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => setResetGuardOpen(false)}
                    className="interactive-focus min-h-10 border border-white/15 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em] text-white/70 transition-[border-color,color,background-color] hover:border-white/40 hover:bg-white/5 hover:text-white"
                  >
                    保留当前
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="interactive-focus min-h-10 border border-red-300/50 bg-red-300/15 px-3 py-2 text-[10px] font-mono uppercase tracking-[0.12em] text-red-100 transition-[border-color,background-color] hover:border-red-200 hover:bg-red-300/25"
                  >
                    重置草稿
                  </button>
                </div>
              </div>
            </div>
          )}

          {saveError && (
            <p aria-live="polite" className="text-[9px] text-red-400 font-mono leading-relaxed">
              {saveError}
            </p>
          )}

          <div className="pt-6 border-t border-white/5 flex gap-4">
            <button
              type="button"
              disabled={isSaving}
              onMouseEnter={() => sfx.playHover()}
              onClick={requestReset}
              className="interactive-focus px-6 py-4 border border-white/10 text-white/40 hover:text-white hover:border-white disabled:cursor-not-allowed disabled:opacity-40 transition-[border-color,color] font-mono text-[10px] uppercase tracking-widest"
            >
              重置
            </button>
            <button
              type="button"
              disabled={isSaving}
              onMouseEnter={() => sfx.playHover()}
              onClick={handleSubmit}
              className="interactive-focus flex-1 py-4 bg-white text-black font-black uppercase tracking-[0.3em] text-[10px] hover:scale-[1.02] active:scale-95 disabled:cursor-wait disabled:opacity-60 transition-[transform,opacity] shadow-neon"
            >
              {isSaving ? '保存中…' : '提交配置'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
