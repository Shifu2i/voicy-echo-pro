// Spell Suggestion Context Menu
// Shows spelling suggestions for user-initiated correction

import React, { useEffect, useRef } from 'react';
import { SpellError, addToSessionDictionary } from '@/utils/spellCheck';
import { cn } from '@/lib/utils';
import { Check, Plus, X } from 'lucide-react';

interface SpellSuggestionMenuProps {
  error: SpellError;
  position: { x: number; y: number };
  onSelectSuggestion: (suggestion: string) => void;
  onIgnore: () => void;
  onAddToDictionary: () => void;
  onClose: () => void;
}

export function SpellSuggestionMenu({
  error,
  position,
  onSelectSuggestion,
  onIgnore,
  onAddToDictionary,
  onClose
}: SpellSuggestionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  
  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 250)
  };
  
  const handleAddToDictionary = () => {
    addToSessionDictionary(error.word);
    onAddToDictionary();
  };
  
  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-card border border-border rounded-lg shadow-xl animate-fade-up overflow-hidden"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-muted/50 border-b border-border">
        <span className="text-sm text-muted-foreground">Spelling: </span>
        <span className="text-sm font-medium text-destructive">{error.word}</span>
      </div>
      
      {/* Suggestions */}
      {error.suggestions.length > 0 ? (
        <div className="py-1">
          {error.suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSelectSuggestion(suggestion)}
              className={cn(
                "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
                "hover:bg-primary/10 active:bg-primary/20 transition-colors"
              )}
            >
              <Check className="w-4 h-4 text-primary" />
              <span className="font-medium">{suggestion}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 text-sm text-muted-foreground">
          No suggestions available
        </div>
      )}
      
      {/* Divider */}
      <div className="border-t border-border" />
      
      {/* Actions */}
      <div className="py-1">
        <button
          onClick={handleAddToDictionary}
          className={cn(
            "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
            "hover:bg-muted active:bg-muted/80 transition-colors"
          )}
        >
          <Plus className="w-4 h-4 text-muted-foreground" />
          <span>Add to dictionary</span>
        </button>
        <button
          onClick={onIgnore}
          className={cn(
            "w-full px-3 py-2 text-left text-sm flex items-center gap-2",
            "hover:bg-muted active:bg-muted/80 transition-colors"
          )}
        >
          <X className="w-4 h-4 text-muted-foreground" />
          <span>Ignore</span>
        </button>
      </div>
    </div>
  );
}
