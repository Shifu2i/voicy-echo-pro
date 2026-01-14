// Text Segmentation Engine for Exam-Safe TTS
// Creates character-indexed word and sentence data for precise tracking

export interface Word {
  word: string;
  charStart: number;
  charEnd: number;
  wordIndex: number;
  sentenceId: number;
}

export interface Sentence {
  sentenceId: number;
  sentenceStart: number;
  sentenceEnd: number;
  text: string;
  words: Word[];
}

export interface SegmentedText {
  sentences: Sentence[];
  allWords: Word[];
  originalText: string;
}

// Common abbreviations that shouldn't trigger sentence breaks
const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'vs', 'etc', 'inc', 'ltd',
  'st', 'ave', 'blvd', 'rd', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul',
  'aug', 'sep', 'oct', 'nov', 'dec', 'i.e', 'e.g', 'cf', 'al', 'no'
]);

/**
 * Normalizes text by removing hidden characters while preserving structure
 */
function normalizeText(text: string): string {
  return text
    // Remove zero-width characters
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    // Normalize whitespace (but preserve newlines)
    .replace(/[^\S\n]+/g, ' ')
    // Remove control characters except newlines
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Checks if a period is likely an abbreviation rather than sentence end
 */
function isAbbreviation(text: string, periodIndex: number): boolean {
  // Find the word before the period
  let wordStart = periodIndex - 1;
  while (wordStart > 0 && /[a-zA-Z.]/.test(text[wordStart - 1])) {
    wordStart--;
  }
  
  const word = text.slice(wordStart, periodIndex).toLowerCase();
  return ABBREVIATIONS.has(word) || ABBREVIATIONS.has(word.replace(/\./g, ''));
}

/**
 * Splits text into sentences with character offsets
 */
function splitSentences(text: string): { start: number; end: number; text: string }[] {
  const sentences: { start: number; end: number; text: string }[] = [];
  
  if (!text.trim()) return sentences;
  
  let currentStart = 0;
  let i = 0;
  
  while (i < text.length) {
    const char = text[i];
    
    // Check for sentence-ending punctuation
    if (char === '.' || char === '!' || char === '?') {
      // Check if this is an abbreviation (for periods only)
      if (char === '.' && isAbbreviation(text, i)) {
        i++;
        continue;
      }
      
      // Check for ellipsis or multiple punctuation
      let endPunct = i;
      while (endPunct + 1 < text.length && /[.!?]/.test(text[endPunct + 1])) {
        endPunct++;
      }
      
      // Skip any trailing whitespace for the sentence end
      let sentenceEnd = endPunct + 1;
      
      // Find the next non-whitespace character for the next sentence start
      let nextStart = sentenceEnd;
      while (nextStart < text.length && /\s/.test(text[nextStart])) {
        nextStart++;
      }
      
      const sentenceText = text.slice(currentStart, sentenceEnd).trim();
      if (sentenceText) {
        sentences.push({
          start: currentStart,
          end: sentenceEnd,
          text: sentenceText
        });
      }
      
      currentStart = nextStart;
      i = nextStart;
    } else {
      i++;
    }
  }
  
  // Handle remaining text (sentence without ending punctuation)
  if (currentStart < text.length) {
    const remaining = text.slice(currentStart).trim();
    if (remaining) {
      sentences.push({
        start: currentStart,
        end: text.length,
        text: remaining
      });
    }
  }
  
  return sentences;
}

/**
 * Tokenizes a sentence into words with character offsets
 */
function tokenizeWords(
  sentenceText: string, 
  sentenceStart: number, 
  sentenceId: number,
  globalWordIndex: { value: number }
): Word[] {
  const words: Word[] = [];
  
  // Match words (including contractions and hyphenated words)
  const wordRegex = /[a-zA-Z0-9]+(?:[''-][a-zA-Z0-9]+)*/g;
  let match;
  
  while ((match = wordRegex.exec(sentenceText)) !== null) {
    words.push({
      word: match[0],
      charStart: sentenceStart + match.index,
      charEnd: sentenceStart + match.index + match[0].length,
      wordIndex: globalWordIndex.value++,
      sentenceId
    });
  }
  
  return words;
}

/**
 * Main segmentation function - creates full text segmentation with character offsets
 */
export function segmentText(text: string): SegmentedText {
  const normalizedText = normalizeText(text);
  const sentenceData = splitSentences(normalizedText);
  
  const sentences: Sentence[] = [];
  const allWords: Word[] = [];
  const globalWordIndex = { value: 0 };
  
  sentenceData.forEach((sentData, index) => {
    const words = tokenizeWords(sentData.text, sentData.start, index, globalWordIndex);
    
    sentences.push({
      sentenceId: index,
      sentenceStart: sentData.start,
      sentenceEnd: sentData.end,
      text: sentData.text,
      words
    });
    
    allWords.push(...words);
  });
  
  return {
    sentences,
    allWords,
    originalText: normalizedText
  };
}

/**
 * Find the word at a specific character position
 */
export function findWordAtPosition(segmentedText: SegmentedText, charPos: number): Word | null {
  return segmentedText.allWords.find(
    word => charPos >= word.charStart && charPos < word.charEnd
  ) || null;
}

/**
 * Find the sentence containing a specific word
 */
export function findSentenceForWord(segmentedText: SegmentedText, wordIndex: number): Sentence | null {
  const word = segmentedText.allWords[wordIndex];
  if (!word) return null;
  
  return segmentedText.sentences.find(s => s.sentenceId === word.sentenceId) || null;
}

/**
 * Get text span for highlighting (returns original text positions)
 */
export function getTextSpan(text: string, start: number, end: number): string {
  return text.slice(start, end);
}
