import { useEffect, useState, useCallback } from 'react';

export interface ShortcutConfig {
  mic: string;
  delete: string;
  replace: string;
}

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  mic: 'ctrl+shift+d',
  delete: 'ctrl+shift+x',
  replace: 'ctrl+shift+r',
};

const STORAGE_KEY = 'widget-keyboard-shortcuts';

export const formatShortcut = (shortcut: string): string => {
  return shortcut
    .split('+')
    .map(key => key.charAt(0).toUpperCase() + key.slice(1))
    .join(' + ');
};

export const parseKeyEvent = (e: KeyboardEvent): string => {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  
  const key = e.key.toLowerCase();
  if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
    parts.push(key);
  }
  
  return parts.join('+');
};

export const useKeyboardShortcuts = (
  onMic: () => void,
  onDelete: () => void,
  onReplace: () => void,
  enabled: boolean = true
) => {
  const [shortcuts, setShortcuts] = useState<ShortcutConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_SHORTCUTS;
    } catch {
      return DEFAULT_SHORTCUTS;
    }
  });

  const saveShortcuts = useCallback((newShortcuts: ShortcutConfig) => {
    setShortcuts(newShortcuts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newShortcuts));
  }, []);

  const updateShortcut = useCallback((key: keyof ShortcutConfig, value: string) => {
    const newShortcuts = { ...shortcuts, [key]: value };
    saveShortcuts(newShortcuts);
  }, [shortcuts, saveShortcuts]);

  const resetShortcuts = useCallback(() => {
    saveShortcuts(DEFAULT_SHORTCUTS);
  }, [saveShortcuts]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const pressed = parseKeyEvent(e);
      
      if (pressed === shortcuts.mic) {
        e.preventDefault();
        onMic();
      } else if (pressed === shortcuts.delete) {
        e.preventDefault();
        onDelete();
      } else if (pressed === shortcuts.replace) {
        e.preventDefault();
        onReplace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, onMic, onDelete, onReplace, enabled]);

  return {
    shortcuts,
    updateShortcut,
    resetShortcuts,
    formatShortcut,
  };
};
