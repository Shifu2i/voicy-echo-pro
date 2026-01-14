// Grammar Error Tooltip
// Shows grammar error explanation (no auto-fix for exam safety)

import React, { useEffect, useRef } from 'react';
import { GrammarError, getErrorDescription } from '@/utils/grammarCheck';
import { AlertCircle } from 'lucide-react';

interface GrammarTooltipProps {
  error: GrammarError;
  position: { x: number; y: number };
  onClose: () => void;
}

export function GrammarTooltip({
  error,
  position,
  onClose
}: GrammarTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);
  
  // Adjust position to stay in viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 280),
    y: Math.min(position.y, window.innerHeight - 100)
  };
  
  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 max-w-[260px] bg-card border border-border rounded-lg shadow-xl animate-fade-up overflow-hidden"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      <div className="p-3 flex gap-2">
        <AlertCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-medium text-foreground mb-1">
            {getErrorDescription(error.type)}
          </div>
          <p className="text-sm text-muted-foreground">
            {error.message}
          </p>
        </div>
      </div>
    </div>
  );
}
