// Dual-Colour Text Highlighting Component
// Renders text with word and sentence highlighting for TTS tracking

import React, { useRef, useEffect, useMemo } from 'react';
import { SegmentedText, Word, Sentence } from '@/utils/textSegmentation';
import { SpellError } from '@/utils/spellCheck';
import { GrammarError } from '@/utils/grammarCheck';
import { cn } from '@/lib/utils';

interface HighlightedTextViewProps {
  text: string;
  segmentedText: SegmentedText;
  activeWordIndex: number | null;
  activeSentenceId: number | null;
  spellErrors?: SpellError[];
  grammarErrors?: GrammarError[];
  wordHighlightColor?: string;
  sentenceHighlightColor?: string;
  onWordClick?: (wordIndex: number) => void;
  onSpellErrorClick?: (error: SpellError, element: HTMLElement) => void;
  onGrammarErrorClick?: (error: GrammarError, element: HTMLElement) => void;
  className?: string;
}

interface TextSpan {
  start: number;
  end: number;
  text: string;
  wordIndex?: number;
  sentenceId?: number;
  isWord: boolean;
  hasSpellError?: SpellError;
  hasGrammarError?: GrammarError;
}

export function HighlightedTextView({
  text,
  segmentedText,
  activeWordIndex,
  activeSentenceId,
  spellErrors = [],
  grammarErrors = [],
  wordHighlightColor = 'hsl(48 100% 67%)', // Yellow
  sentenceHighlightColor = 'hsl(210 100% 95%)', // Light blue
  onWordClick,
  onSpellErrorClick,
  onGrammarErrorClick,
  className
}: HighlightedTextViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLSpanElement>(null);
  
  // Build span map for efficient rendering
  const spans = useMemo(() => {
    const result: TextSpan[] = [];
    let lastEnd = 0;
    
    // Create spell error lookup
    const spellErrorMap = new Map<number, SpellError>();
    spellErrors.forEach(err => spellErrorMap.set(err.wordIndex, err));
    
    // Create grammar error lookup by character range
    const grammarErrorMap = new Map<string, GrammarError>();
    grammarErrors.forEach(err => {
      grammarErrorMap.set(`${err.charStart}-${err.charEnd}`, err);
    });
    
    // Process each word
    segmentedText.allWords.forEach(word => {
      // Add any text before this word
      if (word.charStart > lastEnd) {
        result.push({
          start: lastEnd,
          end: word.charStart,
          text: text.slice(lastEnd, word.charStart),
          isWord: false
        });
      }
      
      // Add the word itself
      result.push({
        start: word.charStart,
        end: word.charEnd,
        text: word.word,
        wordIndex: word.wordIndex,
        sentenceId: word.sentenceId,
        isWord: true,
        hasSpellError: spellErrorMap.get(word.wordIndex),
        hasGrammarError: grammarErrors.find(
          e => word.charStart >= e.charStart && word.charEnd <= e.charEnd
        )
      });
      
      lastEnd = word.charEnd;
    });
    
    // Add any remaining text
    if (lastEnd < text.length) {
      result.push({
        start: lastEnd,
        end: text.length,
        text: text.slice(lastEnd),
        isWord: false
      });
    }
    
    return result;
  }, [text, segmentedText, spellErrors, grammarErrors]);
  
  // Scroll active word into view
  useEffect(() => {
    if (activeWordRef.current && containerRef.current) {
      const container = containerRef.current;
      const element = activeWordRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      
      // Check if element is outside visible area
      if (elementRect.top < containerRect.top || elementRect.bottom > containerRect.bottom) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }, [activeWordIndex]);
  
  const handleWordClick = (wordIndex: number, event: React.MouseEvent) => {
    event.preventDefault();
    onWordClick?.(wordIndex);
  };
  
  const handleSpellClick = (error: SpellError, element: HTMLElement, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onSpellErrorClick?.(error, element);
  };
  
  const handleGrammarClick = (error: GrammarError, element: HTMLElement, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onGrammarErrorClick?.(error, element);
  };
  
  return (
    <div 
      ref={containerRef}
      className={cn(
        "p-4 rounded-xl overflow-auto text-lg leading-relaxed select-text",
        className
      )}
    >
      {spans.map((span, index) => {
        if (!span.isWord) {
          // Non-word span (whitespace, punctuation)
          return (
            <span 
              key={`nw-${index}`}
              className="whitespace-pre-wrap"
            >
              {span.text}
            </span>
          );
        }
        
        const isActiveWord = span.wordIndex === activeWordIndex;
        const isActiveSentence = span.sentenceId === activeSentenceId;
        
        return (
          <span
            key={`w-${span.wordIndex}`}
            ref={isActiveWord ? activeWordRef : null}
            onClick={(e) => {
              if (span.hasSpellError) {
                handleSpellClick(span.hasSpellError, e.currentTarget, e);
              } else if (span.hasGrammarError) {
                handleGrammarClick(span.hasGrammarError, e.currentTarget, e);
              } else if (span.wordIndex !== undefined) {
                handleWordClick(span.wordIndex, e);
              }
            }}
            className={cn(
              "cursor-pointer transition-all duration-100 rounded px-0.5",
              isActiveWord && "font-semibold",
              span.hasSpellError && "spell-error",
              span.hasGrammarError && "grammar-error",
              !isActiveWord && !isActiveSentence && !span.hasSpellError && !span.hasGrammarError && 
                "hover:bg-muted/50"
            )}
            style={{
              backgroundColor: isActiveWord 
                ? wordHighlightColor 
                : isActiveSentence 
                  ? sentenceHighlightColor 
                  : undefined,
              color: isActiveWord ? '#000' : undefined
            }}
          >
            {span.text}
          </span>
        );
      })}
    </div>
  );
}
