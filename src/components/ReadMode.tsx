// Read Mode Component
// Main container for exam-safe TTS with dual-colour tracking

import React, { useState, useCallback, useMemo } from 'react';
import { X, Play, Pause, Square, Volume2, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { HighlightedTextView } from '@/components/HighlightedTextView';
import { SpellSuggestionMenu } from '@/components/SpellSuggestionMenu';
import { GrammarTooltip } from '@/components/GrammarTooltip';
import { useReadMode } from '@/hooks/useReadMode';
import { checkSpelling, SpellError, isInSessionDictionary } from '@/utils/spellCheck';
import { checkGrammar, GrammarError } from '@/utils/grammarCheck';
import { cn } from '@/lib/utils';

interface ReadModeProps {
  text: string;
  onClose: () => void;
  onTextChange?: (newText: string) => void;
  wordHighlightColor?: string;
  sentenceHighlightColor?: string;
  spellCheckEnabled?: boolean;
  grammarCheckEnabled?: boolean;
}

export function ReadMode({
  text,
  onClose,
  onTextChange,
  wordHighlightColor = 'hsl(48 100% 67%)',
  sentenceHighlightColor = 'hsl(210 100% 95%)',
  spellCheckEnabled = true,
  grammarCheckEnabled = true
}: ReadModeProps) {
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
  
  // Run spell and grammar checks
  const spellErrors = useMemo(() => {
    if (!spellCheckEnabled) return [];
    const result = checkSpelling(segmentedText);
    // Filter out ignored and session dictionary words
    return result.errors.filter(
      e => !ignoredErrors.has(`spell-${e.charStart}`) && 
           !isInSessionDictionary(e.word)
    );
  }, [segmentedText, spellCheckEnabled, ignoredErrors]);
  
  const grammarErrors = useMemo(() => {
    if (!grammarCheckEnabled) return [];
    const result = checkGrammar(segmentedText);
    return result.errors.filter(
      e => !ignoredErrors.has(`grammar-${e.charStart}`)
    );
  }, [segmentedText, grammarCheckEnabled, ignoredErrors]);
  
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
  
  // Speed controls
  const handleSpeedDecrease = useCallback(() => {
    setPlaybackRate(readingState.playbackRate - 0.1);
  }, [readingState.playbackRate, setPlaybackRate]);
  
  const handleSpeedIncrease = useCallback(() => {
    setPlaybackRate(readingState.playbackRate + 0.1);
  }, [readingState.playbackRate, setPlaybackRate]);
  
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-fade-backdrop">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-primary" />
          <span className="font-medium text-foreground">Read Mode</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="active:scale-90 transition-transform"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <HighlightedTextView
          text={text}
          segmentedText={segmentedText}
          activeWordIndex={readingState.activeWordIndex}
          activeSentenceId={readingState.activeSentenceId}
          spellErrors={spellErrors}
          grammarErrors={grammarErrors}
          wordHighlightColor={wordHighlightColor}
          sentenceHighlightColor={sentenceHighlightColor}
          onWordClick={jumpToWord}
          onSpellErrorClick={handleSpellErrorClick}
          onGrammarErrorClick={handleGrammarErrorClick}
          className="min-h-[200px] bg-card rounded-xl border border-border"
        />
        
        {/* Error Summary */}
        {(spellErrors.length > 0 || grammarErrors.length > 0) && (
          <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
            {spellErrors.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-destructive rounded" />
                {spellErrors.length} spelling {spellErrors.length === 1 ? 'issue' : 'issues'}
              </span>
            )}
            {grammarErrors.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-3 h-0.5 bg-blue-500 rounded" />
                {grammarErrors.length} grammar {grammarErrors.length === 1 ? 'issue' : 'issues'}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="px-4 py-4 border-t border-border bg-card/80 backdrop-blur-sm">
        <div className="max-w-md mx-auto space-y-4">
          {/* Main controls */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={stop}
              disabled={!readingState.isPlaying}
              className="active:scale-90 transition-transform"
            >
              <Square className="w-4 h-4" />
            </Button>
            
            <Button
              size="lg"
              onClick={handlePlayPause}
              className={cn(
                "w-16 h-16 rounded-full active:scale-95 transition-all",
                readingState.isPlaying && !readingState.isPaused && "bg-primary"
              )}
            >
              {readingState.isPlaying && !readingState.isPaused ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6 ml-1" />
              )}
            </Button>
            
            <div className="w-10" /> {/* Spacer for symmetry */}
          </div>
          
          {/* Speed control */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSpeedDecrease}
              disabled={readingState.playbackRate <= 0.75}
              className="active:scale-90 transition-transform"
            >
              <Minus className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 flex items-center gap-3">
              <Slider
                value={[readingState.playbackRate]}
                min={0.75}
                max={1.25}
                step={0.05}
                onValueChange={([value]) => setPlaybackRate(value)}
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground w-12 text-right">
                {readingState.playbackRate.toFixed(2)}x
              </span>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSpeedIncrease}
              disabled={readingState.playbackRate >= 1.25}
              className="active:scale-90 transition-transform"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Speed label */}
          <div className="text-center text-xs text-muted-foreground">
            Reading speed (exam-safe: 0.75x - 1.25x)
          </div>
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
