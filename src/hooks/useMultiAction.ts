import { useCallback, useRef, useState } from 'react';

export interface MultiActionConfig {
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  longPressDelay?: number;
  doubleTapDelay?: number;
  disabled?: boolean;
}

export interface MultiActionReturn {
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
  };
  isLongPressing: boolean;
  longPressProgress: number;
}

export function useMultiAction({
  onTap,
  onDoubleTap,
  onLongPress,
  longPressDelay = 500,
  doubleTapDelay = 300,
  disabled = false
}: MultiActionConfig): MultiActionReturn {
  const [isLongPressing, setIsLongPressing] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const tapCountRef = useRef(0);
  const isLongPressTriggeredRef = useRef(false);
  const startTimeRef = useRef(0);
  
  const clearTimers = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setLongPressProgress(0);
    setIsLongPressing(false);
  }, []);
  
  const handleStart = useCallback(() => {
    if (disabled) return;
    
    isLongPressTriggeredRef.current = false;
    startTimeRef.current = Date.now();
    
    // Only start long press detection if there's a handler
    if (onLongPress) {
      setIsLongPressing(true);
      
      // Progress animation
      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / longPressDelay) * 100, 100);
        setLongPressProgress(progress);
      }, 16);
      
      // Long press trigger
      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        setIsLongPressing(false);
        setLongPressProgress(100);
        clearTimers();
        onLongPress();
      }, longPressDelay);
    }
  }, [disabled, onLongPress, longPressDelay, clearTimers]);
  
  const handleEnd = useCallback(() => {
    if (disabled) return;
    
    const pressDuration = Date.now() - startTimeRef.current;
    
    // If long press was triggered, don't process tap
    if (isLongPressTriggeredRef.current) {
      clearTimers();
      return;
    }
    
    clearTimers();
    
    // If press was too long (but didn't reach long press threshold), ignore
    if (pressDuration > longPressDelay * 0.8) {
      return;
    }
    
    // Handle tap/double-tap
    tapCountRef.current += 1;
    
    if (tapCountRef.current === 1) {
      // First tap - wait for potential second tap
      doubleTapTimerRef.current = setTimeout(() => {
        if (tapCountRef.current === 1) {
          onTap?.();
        }
        tapCountRef.current = 0;
      }, onDoubleTap ? doubleTapDelay : 0);
    } else if (tapCountRef.current === 2) {
      // Second tap - trigger double tap
      if (doubleTapTimerRef.current) {
        clearTimeout(doubleTapTimerRef.current);
        doubleTapTimerRef.current = null;
      }
      tapCountRef.current = 0;
      
      if (onDoubleTap) {
        onDoubleTap();
      } else {
        onTap?.();
      }
    }
  }, [disabled, onTap, onDoubleTap, doubleTapDelay, longPressDelay, clearTimers]);
  
  const handleCancel = useCallback(() => {
    clearTimers();
    isLongPressTriggeredRef.current = false;
  }, [clearTimers]);
  
  return {
    handlers: {
      onMouseDown: (e: React.MouseEvent) => {
        e.preventDefault();
        handleStart();
      },
      onMouseUp: (e: React.MouseEvent) => {
        e.preventDefault();
        handleEnd();
      },
      onMouseLeave: handleCancel,
      onTouchStart: (e: React.TouchEvent) => {
        handleStart();
      },
      onTouchEnd: (e: React.TouchEvent) => {
        handleEnd();
      }
    },
    isLongPressing,
    longPressProgress
  };
}
