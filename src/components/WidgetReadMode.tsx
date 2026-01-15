import React, { useState, useCallback, useMemo } from 'react';
import { X, Play, Pause, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { HighlightedTextView } from '@/components/HighlightedTextView';
import { SpellSuggestionMenu } from '@/components/SpellSuggestionMenu';
import { GrammarTooltip } from '@/components/GrammarTooltip';
import { useReadMode } from '@/hooks/useReadMode';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { checkSpelling, SpellError, isInSessionDictionary } from '@/utils/spellCheck';
import { checkGrammar, GrammarError } from '@/utils/grammarCheck';
import { cn } from '@/lib/utils';

interface WidgetReadModeProps {
  text: string;
  onClose: () => void;
  onTextChange?: (newText: string) => void;
}

export function WidgetReadMode({ text, onClose, onTextChange }: WidgetReadModeProps) {
  const {
    segmentedText,
    readingState,
    play,
    pause,
    resume,
    stop,
    setPlaybackRate,
    jumpToWord
  } = useReadMode({ text });
  
  // Spell/Grammar state
  const [spellMenuState, setSpellMenuState] = useState<{
    error: SpellError;
    position: { x: number; y: number };
  } | null>(null);
  
  const [grammarTooltipState, setGrammarTooltipState] = useState<{
    error: GrammarError;
    position: { x: number; y: number };
  } | null>(null);
  
  const [ignoredErrors, setIgnoredErrors] = useState<Set<string>>(new Set());
  
  // Swipe gestures for speed control
  const { handlers: swipeHandlers } = useSwipeGesture({
    onSwipeLeft: () => setPlaybackRate(Math.max(0.75, readingState.playbackRate - 0.1)),
    onSwipeRight: () => setPlaybackRate(Math.min(1.25, readingState.playbackRate + 0.1)),
    onSwipeDown: onClose,
    threshold: 30
  });
  
  // Run spell and grammar checks
  const spellErrors = useMemo(() => {
    const result = checkSpelling(segmentedText);
    return result.errors.filter(
      e => !ignoredErrors.has(`spell-${e.charStart}`) && 
           !isInSessionDictionary(e.word)
    );
  }, [segmentedText, ignoredErrors]);
  
  const grammarErrors = useMemo(() => {
    const result = checkGrammar(segmentedText);
    return result.errors.filter(
      e => !ignoredErrors.has(`grammar-${e.charStart}`)
    );
  }, [segmentedText, ignoredErrors]);
  
  // Handle spell error click
  const handleSpellErrorClick = useCallback((error: SpellError, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setSpellMenuState({
      error,
      position: { x: rect.left, y: rect.bottom + 4 }
    });
    setGrammarTooltipState(null);
  }, []);
  
  // Handle grammar error click
  const handleGrammarErrorClick = useCallback((error: GrammarError, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    setGrammarTooltipState({
      error,
      position: { x: rect.left, y: rect.bottom + 4 }
    });
    setSpellMenuState(null);
  }, []);
  
  // Handle spell suggestion selection
  const handleSelectSuggestion = useCallback((suggestion: string) => {
    if (!spellMenuState || !onTextChange) return;
    
    const { error } = spellMenuState;
    const newText = text.slice(0, error.charStart) + suggestion + text.slice(error.charEnd);
    onTextChange(newText);
    setSpellMenuState(null);
  }, [spellMenuState, text, onTextChange]);
  
  // Handle ignore actions
  const handleIgnoreSpell = useCallback(() => {
    if (!spellMenuState) return;
    setIgnoredErrors(prev => new Set(prev).add(`spell-${spellMenuState.error.charStart}`));
    setSpellMenuState(null);
  }, [spellMenuState]);
  
  const handleAddToDictionary = useCallback(() => {
    setSpellMenuState(null);
  }, []);
  
  // Play/Pause toggle
  const handlePlayPause = useCallback(() => {
    if (readingState.isPlaying) {
      if (readingState.isPaused) {
        resume();
      } else {
        pause();
      }
    } else {
      play(0);
    }
  }, [readingState, play, pause, resume]);
  
  return (
    <div 
      className="absolute inset-0 z-50 bg-background flex flex-col"
      {...swipeHandlers}
    >
      {/* Compact Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-card/80">
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium">Read Mode</span>
          <span className="text-[10px] text-muted-foreground">
            {readingState.playbackRate.toFixed(2)}x
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      
      {/* Content - Scrollable */}
      <div 
        className="flex-1 overflow-auto p-3"
        onClick={handlePlayPause}
      >
        <HighlightedTextView
          text={text}
          segmentedText={segmentedText}
          activeWordIndex={readingState.activeWordIndex}
          activeSentenceId={readingState.activeSentenceId}
          spellErrors={spellErrors}
          grammarErrors={grammarErrors}
          wordHighlightColor="hsl(48 100% 67%)"
          sentenceHighlightColor="hsl(210 100% 95%)"
          onWordClick={jumpToWord}
          onSpellErrorClick={handleSpellErrorClick}
          onGrammarErrorClick={handleGrammarErrorClick}
          className="text-sm leading-relaxed"
        />
      </div>
      
      {/* Compact Footer */}
      <div className="px-3 py-2 border-t border-border/50 bg-card/80">
        <div className="flex items-center justify-between">
          {/* Error indicators */}
          <div className="flex gap-2 text-[10px] text-muted-foreground">
            {spellErrors.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-destructive rounded" />
                {spellErrors.length}
              </span>
            )}
            {grammarErrors.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-blue-500 rounded" />
                {grammarErrors.length}
              </span>
            )}
          </div>
          
          {/* Play/Pause button */}
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPause();
            }}
            className={cn(
              "h-8 w-8 rounded-full",
              readingState.isPlaying && !readingState.isPaused && "bg-primary"
            )}
          >
            {readingState.isPlaying && !readingState.isPaused ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </Button>
          
          {/* Swipe hint */}
          <span className="text-[10px] text-muted-foreground">
            ← → speed
          </span>
        </div>
      </div>
      
      {/* Spell Suggestion Menu */}
      {spellMenuState && (
        <SpellSuggestionMenu
          error={spellMenuState.error}
          position={spellMenuState.position}
          onSelectSuggestion={handleSelectSuggestion}
          onIgnore={handleIgnoreSpell}
          onAddToDictionary={handleAddToDictionary}
          onClose={() => setSpellMenuState(null)}
        />
      )}
      
      {/* Grammar Tooltip */}
      {grammarTooltipState && (
        <GrammarTooltip
          error={grammarTooltipState.error}
          position={grammarTooltipState.position}
          onClose={() => setGrammarTooltipState(null)}
        />
      )}
    </div>
  );
}
