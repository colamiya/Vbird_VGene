import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import type { AppConfig } from '../types/world';

const WINDOWED_RESOLUTION_FALLBACK = '1280x720';
const MIN_WINDOW_WIDTH = 800;
const MIN_WINDOW_HEIGHT = 600;
const MAX_WINDOW_WIDTH = 3840;
const MAX_WINDOW_HEIGHT = 2160;
let isClosingGracefully = false;

function withTimeout<T>(task: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(`${label} 超时`)), timeoutMs);
    task.then(
      (value) => {
        window.clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        window.clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function parseResolution(resolution: string): [number, number] {
  const [width, height] = (resolution || WINDOWED_RESOLUTION_FALLBACK)
    .split('x')
    .map((value) => Number(value));

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return [1280, 720];
  }

  return [
    Math.min(MAX_WINDOW_WIDTH, Math.max(MIN_WINDOW_WIDTH, Math.round(width))),
    Math.min(MAX_WINDOW_HEIGHT, Math.max(MIN_WINDOW_HEIGHT, Math.round(height))),
  ];
}

export async function minimizeWindow() {
  await getCurrentWindow().minimize();
}

export async function isWindowMaximized() {
  return getCurrentWindow().isMaximized();
}

export async function toggleMaximizeWindow() {
  const appWindow = getCurrentWindow();
  await appWindow.toggleMaximize();
  return appWindow.isMaximized();
}

export async function onWindowResized(callback: () => void) {
  return getCurrentWindow().onResized(callback);
}

export async function onWindowCloseRequested(callback: () => void | Promise<void>) {
  return getCurrentWindow().onCloseRequested(async (event) => {
    if (isClosingGracefully) return;
    event.preventDefault();
    await callback();
  });
}

export async function applyDisplaySettings(config: Pick<AppConfig, 'displayMode' | 'resolution'>) {
  const appWindow = getCurrentWindow();

  if (config.displayMode === 'Fullscreen') {
    await appWindow.setFullscreen(true);
    return;
  }

  await appWindow.setFullscreen(false);

  if (config.displayMode === 'Borderless') {
    await appWindow.maximize();
    return;
  }

  const [width, height] = parseResolution(config.resolution);
  await appWindow.unmaximize();
  await appWindow.setSize(new LogicalSize(width, height));
  await appWindow.center();
}

export async function closeAppGracefully() {
  if (isClosingGracefully) return;
  isClosingGracefully = true;

  try {
    await withTimeout(
      invoke('logger', { module: 'UI', content: 'User triggered exit protocol' }),
      1500,
      '退出日志写入',
    );
  } catch (e) {
    console.error('退出日志写入失败:', e);
  }

  try {
    await withTimeout(invoke('stop_sim'), 2000, '停止模拟');
  } catch (e) {
    console.error('停止模拟失败:', e);
  }

  try {
    await withTimeout(getCurrentWindow().destroy(), 2000, '关闭窗口');
  } catch (e) {
    console.error('关闭窗口失败:', e);
    try {
      window.close();
    } finally {
      isClosingGracefully = false;
    }
  }
}
