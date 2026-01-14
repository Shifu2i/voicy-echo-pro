// Rule-Based Grammar Check Engine
// Deterministic, exam-safe - flags only, no auto-correction

import { SegmentedText, Sentence } from './textSegmentation';

export type GrammarErrorType = 
  | 'capitalization' 
  | 'punctuation' 
  | 'repeated-word' 
  | 'spacing'
  | 'missing-space';

export interface GrammarError {
  type: GrammarErrorType;
  message: string;
  charStart: number;
  charEnd: number;
  sentenceId: number;
}

export interface GrammarCheckResult {
  errors: GrammarError[];
}

/**
 * Check for lowercase sentence start
 */
function checkCapitalization(sentence: Sentence, originalText: string): GrammarError | null {
  const sentenceText = originalText.slice(sentence.sentenceStart, sentence.sentenceEnd);
  const trimmed = sentenceText.trimStart();
  const offset = sentenceText.length - trimmed.length;
  
  if (trimmed.length > 0) {
    const firstChar = trimmed[0];
    
    // Check if first character is a lowercase letter
    if (/^[a-z]/.test(firstChar)) {
      return {
        type: 'capitalization',
        message: 'Sentence should start with a capital letter.',
        charStart: sentence.sentenceStart + offset,
        charEnd: sentence.sentenceStart + offset + 1,
        sentenceId: sentence.sentenceId
      };
    }
  }
  
  return null;
}

/**
 * Check for missing terminal punctuation
 */
function checkPunctuation(sentence: Sentence, originalText: string): GrammarError | null {
  const sentenceText = originalText.slice(sentence.sentenceStart, sentence.sentenceEnd);
  const trimmed = sentenceText.trimEnd();
  
  if (trimmed.length > 0) {
    const lastChar = trimmed[trimmed.length - 1];
    
    // Check if sentence ends with terminal punctuation
    if (!/[.!?]$/.test(trimmed)) {
      return {
        type: 'punctuation',
        message: 'Sentence should end with a full stop, question mark, or exclamation mark.',
        charStart: sentence.sentenceStart + trimmed.length - 1,
        charEnd: sentence.sentenceEnd,
        sentenceId: sentence.sentenceId
      };
    }
  }
  
  return null;
}

/**
 * Check for repeated words (e.g., "the the")
 */
function checkRepeatedWords(sentence: Sentence, originalText: string): GrammarError[] {
  const errors: GrammarError[] = [];
  const words = sentence.words;
  
  for (let i = 1; i < words.length; i++) {
    const prevWord = words[i - 1].word.toLowerCase();
    const currWord = words[i].word.toLowerCase();
    
    if (prevWord === currWord) {
      errors.push({
        type: 'repeated-word',
        message: `Repeated word: "${currWord}".`,
        charStart: words[i].charStart,
        charEnd: words[i].charEnd,
        sentenceId: sentence.sentenceId
      });
    }
  }
  
  return errors;
}

/**
 * Check for multiple consecutive spaces
 */
function checkMultipleSpaces(originalText: string): GrammarError[] {
  const errors: GrammarError[] = [];
  const regex = /  +/g;
  let match;
  
  while ((match = regex.exec(originalText)) !== null) {
    errors.push({
      type: 'spacing',
      message: 'Multiple spaces detected.',
      charStart: match.index,
      charEnd: match.index + match[0].length,
      sentenceId: -1 // Will be resolved later
    });
  }
  
  return errors;
}

/**
 * Check for missing space after punctuation
 */
function checkMissingSpaceAfterPunctuation(originalText: string): GrammarError[] {
  const errors: GrammarError[] = [];
  // Match punctuation followed directly by a letter (not a quote or space)
  const regex = /[.!?,;:][A-Za-z]/g;
  let match;
  
  while ((match = regex.exec(originalText)) !== null) {
    // Skip common abbreviations and decimals
    const before = originalText.slice(Math.max(0, match.index - 5), match.index + 1);
    if (/\d\.\d/.test(before) || /[A-Z]\.[A-Z]/.test(before)) {
      continue;
    }
    
    errors.push({
      type: 'missing-space',
      message: 'Missing space after punctuation.',
      charStart: match.index,
      charEnd: match.index + 2,
      sentenceId: -1
    });
  }
  
  return errors;
}

/**
 * Run all grammar checks on segmented text
 */
export function checkGrammar(segmentedText: SegmentedText): GrammarCheckResult {
  const errors: GrammarError[] = [];
  const { sentences, originalText } = segmentedText;
  
  // Per-sentence checks
  for (const sentence of sentences) {
    // Capitalization check
    const capError = checkCapitalization(sentence, originalText);
    if (capError) errors.push(capError);
    
    // Note: We don't check punctuation for the last sentence if it seems incomplete
    // This is because users might still be typing
    
    // Repeated words check
    const repeatedErrors = checkRepeatedWords(sentence, originalText);
    errors.push(...repeatedErrors);
  }
  
  // Global checks
  const spacingErrors = checkMultipleSpaces(originalText);
  errors.push(...spacingErrors);
  
  const missingSpaceErrors = checkMissingSpaceAfterPunctuation(originalText);
  errors.push(...missingSpaceErrors);
  
  return { errors };
}

/**
 * Get a user-friendly description for a grammar error type
 */
export function getErrorDescription(type: GrammarErrorType): string {
  switch (type) {
    case 'capitalization':
      return 'Capital letter needed';
    case 'punctuation':
      return 'Punctuation needed';
    case 'repeated-word':
      return 'Repeated word';
    case 'spacing':
      return 'Extra spaces';
    case 'missing-space':
      return 'Space needed';
    default:
      return 'Grammar issue';
  }
}
