import { useEffect } from 'react';
import type { PlayerInterventionKind } from '../types/world';

interface RunHotkeyOptions {
  enabled: boolean;
  canControl: boolean;
  isRunning: boolean;
  onToggle: () => void | Promise<void>;
  onReview: () => void | Promise<void>;
  onBookmark: () => void;
  onSelectIntervention: (kind: PlayerInterventionKind) => void;
  onEscape?: () => void;
  onShortcut?: (message: string) => void;
}

const interventionByKey: Record<string, PlayerInterventionKind> = {
  '1': 'BLESS',
  '2': 'POISON',
  '3': 'QUARANTINE',
  '4': 'EXILE',
  '5': 'PIN_OBSERVE',
};

const interventionLabel: Record<PlayerInterventionKind, string> = {
  BLESS: '祝福',
  POISON: '投毒',
  QUARANTINE: '隔离',
  EXILE: '放逐',
  PIN_OBSERVE: '钉选观察',
};

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest('input, textarea, select, button, a, [contenteditable="true"], [role="slider"]'));
}

export function useRunHotkeys(options: RunHotkeyOptions) {
  const {
    enabled,
    canControl,
    isRunning,
    onToggle,
    onReview,
    onBookmark,
    onSelectIntervention,
    onEscape,
    onShortcut,
  } = options;

  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onEscape) {
        event.preventDefault();
        onEscape();
        return;
      }

      if (isEditableTarget(event.target)) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const key = event.key.toLowerCase();
      const intervention = interventionByKey[event.key];

      if (intervention) {
        event.preventDefault();
        if (!canControl || !isRunning) {
          if (!event.repeat) {
            onShortcut?.('暂停中无法武装干预。');
          }
          return;
        }
        if (!event.repeat) {
          onSelectIntervention(intervention);
          onShortcut?.(`已武装${interventionLabel[intervention]}，下一次点击 Arena 生效。`);
        }
        return;
      }

      if (event.key === ' ') {
        event.preventDefault();
        if (canControl && !event.repeat) {
          void onToggle();
          onShortcut?.(isRunning ? '协议已暂停。' : '协议继续运行。');
        }
        return;
      }

      if (key === 'f') {
        event.preventDefault();
        if (canControl && !event.repeat) {
          onBookmark();
          onShortcut?.('当前镜头已标记为精彩瞬间。');
        }
        return;
      }

      if (key === 'r') {
        event.preventDefault();
        if (canControl && !event.repeat) {
          void onReview();
        }
        return;
      }

    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canControl, enabled, isRunning, onBookmark, onEscape, onReview, onSelectIntervention, onShortcut, onToggle]);
}
