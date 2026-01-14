// Read Mode Hook - Manages TTS state and word tracking
import { useState, useCallback, useEffect, useRef } from 'react';
import { SegmentedText, segmentText, findSentenceForWord } from '@/utils/textSegmentation';
import { loadTTSSettings } from '@/utils/textToSpeech';

export interface ReadingState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  activeWordIndex: number | null;
  activeSentenceId: number | null;
  playbackRate: number;
}

interface UseReadModeOptions {
  text: string;
  onWordChange?: (wordIndex: number | null) => void;
  onSentenceChange?: (sentenceId: number | null) => void;
}

interface UseReadModeReturn {
  segmentedText: SegmentedText;
  readingState: ReadingState;
  play: (fromWordIndex?: number) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setPlaybackRate: (rate: number) => void;
  jumpToWord: (wordIndex: number) => void;
}

export function useReadMode({ text, onWordChange, onSentenceChange }: UseReadModeOptions): UseReadModeReturn {
  const [segmentedText, setSegmentedText] = useState<SegmentedText>(() => segmentText(text));
  const [readingState, setReadingState] = useState<ReadingState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    activeWordIndex: null,
    activeSentenceId: null,
    playbackRate: 1.0
  });
  
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const startWordIndexRef = useRef<number>(0);
  
  // Re-segment text when it changes
  useEffect(() => {
    setSegmentedText(segmentText(text));
  }, [text]);
  
  // Update callbacks when word/sentence changes
  useEffect(() => {
    onWordChange?.(readingState.activeWordIndex);
  }, [readingState.activeWordIndex, onWordChange]);
  
  useEffect(() => {
    onSentenceChange?.(readingState.activeSentenceId);
  }, [readingState.activeSentenceId, onSentenceChange]);
  
  const stop = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    utteranceRef.current = null;
    setReadingState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      activeWordIndex: null,
      activeSentenceId: null
    }));
  }, []);
  
  const play = useCallback((fromWordIndex: number = 0) => {
    if (!('speechSynthesis' in window)) {
      console.error('Speech synthesis not supported');
      return;
    }
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    // Get text to speak (from word index to end)
    const word = segmentedText.allWords[fromWordIndex];
    if (!word) {
      stop();
      return;
    }
    
    const textToSpeak = segmentedText.originalText.slice(word.charStart);
    startWordIndexRef.current = fromWordIndex;
    
    const settings = loadTTSSettings();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = readingState.playbackRate;
    utterance.pitch = settings.pitch;
    
    // Set voice if specified
    if (settings.voiceURI) {
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => v.voiceURI === settings.voiceURI);
      if (voice) utterance.voice = voice;
    }
    
    // Track word boundaries
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        // Calculate which word we're on based on character index
        const absoluteCharIndex = word.charStart + event.charIndex;
        
        // Find the word at this position
        const currentWord = segmentedText.allWords.find(
          w => absoluteCharIndex >= w.charStart && absoluteCharIndex < w.charEnd
        );
        
        if (currentWord) {
          const sentence = findSentenceForWord(segmentedText, currentWord.wordIndex);
          setReadingState(prev => ({
            ...prev,
            activeWordIndex: currentWord.wordIndex,
            activeSentenceId: sentence?.sentenceId ?? null,
            currentTime: event.elapsedTime
          }));
        }
      }
    };
    
    utterance.onstart = () => {
      const sentence = findSentenceForWord(segmentedText, fromWordIndex);
      setReadingState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        activeWordIndex: fromWordIndex,
        activeSentenceId: sentence?.sentenceId ?? null
      }));
    };
    
    utterance.onend = () => {
      setReadingState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false,
        activeWordIndex: null,
        activeSentenceId: null
      }));
      utteranceRef.current = null;
    };
    
    utterance.onerror = (event) => {
      if (event.error !== 'canceled') {
        console.error('Speech synthesis error:', event.error);
      }
      setReadingState(prev => ({
        ...prev,
        isPlaying: false,
        isPaused: false
      }));
      utteranceRef.current = null;
    };
    
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [segmentedText, readingState.playbackRate, stop]);
  
  const pause = useCallback(() => {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      setReadingState(prev => ({ ...prev, isPaused: true }));
    }
  }, []);
  
  const resume = useCallback(() => {
    if ('speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setReadingState(prev => ({ ...prev, isPaused: false }));
    }
  }, []);
  
  const setPlaybackRate = useCallback((rate: number) => {
    // Bound rate for exam safety (0.75x - 1.25x)
    const boundedRate = Math.max(0.75, Math.min(1.25, rate));
    setReadingState(prev => ({ ...prev, playbackRate: boundedRate }));
    
    // If currently playing, restart with new rate
    if (readingState.isPlaying && readingState.activeWordIndex !== null) {
      const currentWord = readingState.activeWordIndex;
      stop();
      // Small delay to let the synthesis cancel
      setTimeout(() => play(currentWord), 50);
    }
  }, [readingState.isPlaying, readingState.activeWordIndex, stop, play]);
  
  const jumpToWord = useCallback((wordIndex: number) => {
    if (wordIndex >= 0 && wordIndex < segmentedText.allWords.length) {
      if (readingState.isPlaying) {
        stop();
        setTimeout(() => play(wordIndex), 50);
      } else {
        play(wordIndex);
      }
    }
  }, [segmentedText.allWords.length, readingState.isPlaying, stop, play]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);
  
  return {
    segmentedText,
    readingState,
    play,
    pause,
    resume,
    stop,
    setPlaybackRate,
    jumpToWord
  };
}
