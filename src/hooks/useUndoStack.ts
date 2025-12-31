import { useState, useCallback } from 'react';

const MAX_UNDO_STACK = 20;

export function useUndoStack(initialValue: string = '') {
  const [history, setHistory] = useState<string[]>([initialValue]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentValue = history[currentIndex];

  const pushState = useCallback((newValue: string) => {
    setHistory(prev => {
      // Remove any redo states
      const newHistory = prev.slice(0, currentIndex + 1);
      // Add new state
      newHistory.push(newValue);
      // Limit stack size
      if (newHistory.length > MAX_UNDO_STACK) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setCurrentIndex(prev => Math.min(prev + 1, MAX_UNDO_STACK - 1));
  }, [currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      return history[currentIndex - 1];
    }
    return null;
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(prev => prev + 1);
      return history[currentIndex + 1];
    }
    return null;
  }, [currentIndex, history]);

  const canUndo = currentIndex > 0;
  const canRedo = currentIndex < history.length - 1;

  const reset = useCallback((value: string) => {
    setHistory([value]);
    setCurrentIndex(0);
  }, []);

  return {
    currentValue,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
