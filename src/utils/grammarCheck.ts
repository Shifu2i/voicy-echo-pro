// Rule-Based Grammar Check Engine
// Deterministic, exam-safe - flags only, no auto-correction

import { SegmentedText, Sentence } from './textSegmentation';

export type GrammarErrorType = 
  | 'capitalization' 
  | 'punctuation' 
  | 'repeated-word' 
  | 'spacing'
  | 'missing-space'
  | 'article'
  | 'contraction'
  | 'apostrophe';

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

// Words that should use "an" instead of "a"
const AN_WORDS_START = new Set([
  'a', 'e', 'i', 'o', 'u', 'h' // starting letters that often use "an"
]);

// Silent H words that use "an"
const SILENT_H_WORDS = new Set([
  'hour', 'hours', 'hourly', 'honest', 'honestly', 'honesty', 'honor', 'honour',
  'honorable', 'honourable', 'heir', 'heirs', 'heiress', 'herb', 'herbs', 'herbal'
]);

// Words starting with vowel sounds despite consonant spelling
const VOWEL_SOUND_WORDS = new Set([
  'umbrella', 'uncle', 'under', 'understand', 'uniform', 'union', 'unique',
  'unit', 'united', 'universal', 'universe', 'university', 'unknown', 'unusual'
]);

// Common words that shouldn't have apostrophes
const NO_APOSTROPHE_WORDS = new Set([
  'its', 'hers', 'theirs', 'ours', 'yours', 'whose'
]);

// Contractions that might be confused
const CONTRACTION_CONFUSIONS: { [key: string]: string } = {
  "its": "it's (it is)",
  "your": "you're (you are)",
  "their": "they're (they are)",
  "were": "we're (we are)",
  "whose": "who's (who is)",
  "lets": "let's (let us)"
};

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
      // Skip if it's a special case like 'iPhone' or 'eBay'
      const firstWord = trimmed.split(/\s/)[0];
      const specialCases = ['iphone', 'ipad', 'ipod', 'ios', 'ebay', 'email', 'ecommerce'];
      if (specialCases.includes(firstWord.toLowerCase())) {
        return null;
      }
      
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
function checkPunctuation(sentence: Sentence, originalText: string, isLast: boolean): GrammarError | null {
  const sentenceText = originalText.slice(sentence.sentenceStart, sentence.sentenceEnd);
  const trimmed = sentenceText.trimEnd();
  
  // Be more lenient with the last sentence (user might still be typing)
  if (isLast && trimmed.length < 20) return null;
  
  if (trimmed.length > 0) {
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
    
    // Skip intentional repetitions
    const intentionalRepetitions = ['bye', 'no', 'very', 'really', 'so', 'much', 'far', 'now'];
    if (intentionalRepetitions.includes(currWord)) continue;
    
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
      message: 'Multiple spaces detected. Use single space between words.',
      charStart: match.index,
      charEnd: match.index + match[0].length,
      sentenceId: -1
    });
  }
  
  return errors;
}

/**
 * Check for missing space after punctuation
 */
function checkMissingSpaceAfterPunctuation(originalText: string): GrammarError[] {
  const errors: GrammarError[] = [];
  // Match punctuation followed directly by a letter (not a quote, space, or end)
  const regex = /[.!?,;:][A-Za-z]/g;
  let match;
  
  while ((match = regex.exec(originalText)) !== null) {
    // Skip common abbreviations and decimals
    const before = originalText.slice(Math.max(0, match.index - 10), match.index + 2);
    
    // Skip decimals (3.14)
    if (/\d\.\d/.test(before)) continue;
    
    // Skip abbreviations (U.S., Dr., Mr., etc.)
    if (/[A-Z]\.[A-Z]/.test(before)) continue;
    if (/\b(Mr|Mrs|Ms|Dr|Jr|Sr|St|Ave|Blvd|etc)\./i.test(before)) continue;
    
    // Skip file extensions
    if (/\.(com|org|net|edu|gov|io|html|css|js|pdf|doc|txt)/i.test(before)) continue;
    
    // Skip times (3:30pm)
    if (/\d:\d/.test(before)) continue;
    
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
 * Check for a/an article usage
 */
function checkArticleUsage(sentence: Sentence, originalText: string): GrammarError[] {
  const errors: GrammarError[] = [];
  const words = sentence.words;
  
  for (let i = 0; i < words.length - 1; i++) {
    const currentWord = words[i].word.toLowerCase();
    const nextWord = words[i + 1].word.toLowerCase();
    
    if (currentWord === 'a' || currentWord === 'an') {
      const nextFirstChar = nextWord[0]?.toLowerCase();
      const startsWithVowel = AN_WORDS_START.has(nextFirstChar) || VOWEL_SOUND_WORDS.has(nextWord);
      const isSilentH = SILENT_H_WORDS.has(nextWord);
      
      // Check for "a" before vowel sound
      if (currentWord === 'a' && (startsWithVowel || isSilentH) && !VOWEL_SOUND_WORDS.has(nextWord)) {
        // Exception: words starting with a long 'u' sound (uniform, university)
        if (nextWord.startsWith('uni') || nextWord.startsWith('eu') || nextWord.startsWith('use')) {
          continue;
        }
        
        errors.push({
          type: 'article',
          message: `Consider using "an" before "${nextWord}" (starts with a vowel sound).`,
          charStart: words[i].charStart,
          charEnd: words[i].charEnd,
          sentenceId: sentence.sentenceId
        });
      }
      
      // Check for "an" before consonant sound
      if (currentWord === 'an' && !startsWithVowel && !isSilentH) {
        errors.push({
          type: 'article',
          message: `Consider using "a" before "${nextWord}" (starts with a consonant sound).`,
          charStart: words[i].charStart,
          charEnd: words[i].charEnd,
          sentenceId: sentence.sentenceId
        });
      }
    }
  }
  
  return errors;
}

/**
 * Check for common contraction/possessive confusions
 */
function checkContractionConfusion(sentence: Sentence, originalText: string): GrammarError[] {
  const errors: GrammarError[] = [];
  const words = sentence.words;
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].word.toLowerCase();
    const nextWord = words[i + 1]?.word.toLowerCase();
    
    // Check "its" vs "it's"
    if (word === 'its' && nextWord && ['a', 'an', 'the', 'very', 'so', 'too', 'not', 'been', 'being'].includes(nextWord)) {
      errors.push({
        type: 'contraction',
        message: 'Did you mean "it\'s" (it is)? "Its" is possessive (e.g., "its color").',
        charStart: words[i].charStart,
        charEnd: words[i].charEnd,
        sentenceId: sentence.sentenceId
      });
    }
    
    // Check "your" vs "you're"
    if (word === 'your' && nextWord && ['a', 'an', 'the', 'very', 'so', 'too', 'not', 'going', 'being', 'welcome'].includes(nextWord)) {
      errors.push({
        type: 'contraction',
        message: 'Did you mean "you\'re" (you are)? "Your" is possessive (e.g., "your book").',
        charStart: words[i].charStart,
        charEnd: words[i].charEnd,
        sentenceId: sentence.sentenceId
      });
    }
    
    // Check "their" vs "they're"  
    if (word === 'their' && nextWord && ['a', 'an', 'the', 'very', 'so', 'too', 'not', 'going', 'being', 'coming'].includes(nextWord)) {
      errors.push({
        type: 'contraction',
        message: 'Did you mean "they\'re" (they are)? "Their" is possessive (e.g., "their house").',
        charStart: words[i].charStart,
        charEnd: words[i].charEnd,
        sentenceId: sentence.sentenceId
      });
    }
  }
  
  return errors;
}

/**
 * Check for common apostrophe errors
 */
function checkApostropheErrors(originalText: string): GrammarError[] {
  const errors: GrammarError[] = [];
  
  // Check for incorrect plurals with apostrophe (apple's instead of apples)
  const incorrectPlurals = /\b([A-Za-z]+)'s\s+(are|were|have|had|do|did|can|could|will|would|should|must)\b/gi;
  let match;
  
  while ((match = incorrectPlurals.exec(originalText)) !== null) {
    errors.push({
      type: 'apostrophe',
      message: `"${match[1]}'s" appears to be an incorrect plural. Use "${match[1]}s" (no apostrophe) for plurals.`,
      charStart: match.index,
      charEnd: match.index + match[1].length + 2,
      sentenceId: -1
    });
  }
  
  // Check for decade apostrophe errors (1990's instead of 1990s)
  const decadeErrors = /\b(\d{4})'s\b/g;
  while ((match = decadeErrors.exec(originalText)) !== null) {
    errors.push({
      type: 'apostrophe',
      message: `For decades, use "${match[1]}s" without an apostrophe.`,
      charStart: match.index,
      charEnd: match.index + match[0].length,
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
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const isLastSentence = i === sentences.length - 1;
    
    // Capitalization check
    const capError = checkCapitalization(sentence, originalText);
    if (capError) errors.push(capError);
    
    // Punctuation check (be lenient with last sentence)
    if (!isLastSentence || originalText.length > 50) {
      const punctError = checkPunctuation(sentence, originalText, isLastSentence);
      if (punctError) errors.push(punctError);
    }
    
    // Repeated words check
    const repeatedErrors = checkRepeatedWords(sentence, originalText);
    errors.push(...repeatedErrors);
    
    // Article usage check
    const articleErrors = checkArticleUsage(sentence, originalText);
    errors.push(...articleErrors);
    
    // Contraction confusion check
    const contractionErrors = checkContractionConfusion(sentence, originalText);
    errors.push(...contractionErrors);
  }
  
  // Global checks
  const spacingErrors = checkMultipleSpaces(originalText);
  errors.push(...spacingErrors);
  
  const missingSpaceErrors = checkMissingSpaceAfterPunctuation(originalText);
  errors.push(...missingSpaceErrors);
  
  const apostropheErrors = checkApostropheErrors(originalText);
  errors.push(...apostropheErrors);
  
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
    case 'article':
      return 'Article usage';
    case 'contraction':
      return 'Contraction check';
    case 'apostrophe':
      return 'Apostrophe usage';
    default:
      return 'Grammar issue';
  }
}
