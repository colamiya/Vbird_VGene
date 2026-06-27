import React, { useState, useEffect } from 'react';
import { Minus, Square, X, Copy } from 'lucide-react';
import {
  closeAppGracefully,
  isWindowMaximized,
  minimizeWindow,
  onWindowCloseRequested,
  onWindowResized,
  toggleMaximizeWindow,
} from '../utils/windowControls';

const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [windowControlStatus, setWindowControlStatus] = useState('');

  useEffect(() => {
    const updateMaximized = async () => {
      try {
        setIsMaximized(await isWindowMaximized());
      } catch (e) {
        console.error('读取窗口最大化状态失败:', e);
      }
    };

    updateMaximized();

    // 监听窗口大小变化以更新最大化状态
    const unlisten = onWindowResized(updateMaximized).catch((e) => {
      console.error('监听窗口大小变化失败:', e);
      return undefined;
    });
    const unlistenClose = onWindowCloseRequested(closeAppGracefully).catch((e) => {
      console.error('监听窗口关闭请求失败:', e);
      return undefined;
    });

    return () => {
      unlisten.then((unsubscribe) => unsubscribe?.());
      unlistenClose.then((unsubscribe) => unsubscribe?.());
    };
  }, []);

  const handleMinimize = async () => {
    setWindowControlStatus('');
    try {
      await minimizeWindow();
    } catch (e) {
      console.error('最小化窗口失败:', e);
      setWindowControlStatus('最小化窗口失败。');
    }
  };

  const handleMaximize = async () => {
    setWindowControlStatus('');
    try {
      setIsMaximized(await toggleMaximizeWindow());
    } catch (e) {
      console.error('切换窗口最大化失败:', e);
      setWindowControlStatus('切换窗口大小失败。');
    }
  };

  const handleClose = async () => {
    setWindowControlStatus('');
    try {
      await closeAppGracefully();
    } catch (e) {
      console.error('关闭程序失败:', e);
      setWindowControlStatus('关闭程序失败。');
    }
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
          type="button"
          aria-label="最小化窗口"
          onClick={handleMinimize}
          className="interactive-focus h-full px-3 text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center"
        >
          <Minus size={14} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={isMaximized ? '还原窗口' : '最大化窗口'}
          onClick={handleMaximize}
          className="interactive-focus h-full px-3 text-white/40 hover:text-white hover:bg-white/5 transition-colors flex items-center"
        >
          {isMaximized ? <Copy size={12} className="rotate-180" aria-hidden="true" /> : <Square size={12} aria-hidden="true" />}
        </button>
        <button
          type="button"
          aria-label="关闭程序"
          onClick={handleClose}
          className="interactive-focus h-full px-4 text-white/40 hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      {windowControlStatus && (
        <p aria-live="polite" className="sr-only">
          {windowControlStatus}
        </p>
      )}
    </div>
  );
};

export default TitleBar;
