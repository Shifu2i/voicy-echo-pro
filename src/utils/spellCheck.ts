// Offline Spell Check Engine
// Dictionary-based, deterministic, exam-safe

import { SegmentedText, Word } from './textSegmentation';

export interface SpellError {
  word: string;
  charStart: number;
  charEnd: number;
  wordIndex: number;
  suggestions: string[];
}

export interface SpellCheckResult {
  errors: SpellError[];
}

// Common English words dictionary (curated subset for performance)
// In production, this would be loaded from a JSON file
const COMMON_WORDS = new Set([
  // Articles and pronouns
  'a', 'an', 'the', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their', 'mine', 'yours', 'hers', 'ours', 'theirs',
  'this', 'that', 'these', 'those', 'who', 'whom', 'whose', 'which', 'what',
  
  // Common verbs
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing', 'done', 'will', 'would', 'shall', 'should', 'may', 'might',
  'must', 'can', 'could', 'go', 'goes', 'went', 'gone', 'going', 'come', 'comes', 'came',
  'coming', 'get', 'gets', 'got', 'getting', 'make', 'makes', 'made', 'making',
  'say', 'says', 'said', 'saying', 'see', 'sees', 'saw', 'seen', 'seeing',
  'take', 'takes', 'took', 'taken', 'taking', 'know', 'knows', 'knew', 'known', 'knowing',
  'think', 'thinks', 'thought', 'thinking', 'give', 'gives', 'gave', 'given', 'giving',
  'find', 'finds', 'found', 'finding', 'tell', 'tells', 'told', 'telling',
  'want', 'wants', 'wanted', 'wanting', 'use', 'uses', 'used', 'using',
  'try', 'tries', 'tried', 'trying', 'need', 'needs', 'needed', 'needing',
  'feel', 'feels', 'felt', 'feeling', 'become', 'becomes', 'became', 'becoming',
  'leave', 'leaves', 'left', 'leaving', 'put', 'puts', 'putting',
  'mean', 'means', 'meant', 'meaning', 'keep', 'keeps', 'kept', 'keeping',
  'let', 'lets', 'letting', 'begin', 'begins', 'began', 'begun', 'beginning',
  'seem', 'seems', 'seemed', 'seeming', 'help', 'helps', 'helped', 'helping',
  'show', 'shows', 'showed', 'shown', 'showing', 'hear', 'hears', 'heard', 'hearing',
  'play', 'plays', 'played', 'playing', 'run', 'runs', 'ran', 'running',
  'move', 'moves', 'moved', 'moving', 'live', 'lives', 'lived', 'living',
  'believe', 'believes', 'believed', 'believing', 'hold', 'holds', 'held', 'holding',
  'bring', 'brings', 'brought', 'bringing', 'happen', 'happens', 'happened', 'happening',
  'write', 'writes', 'wrote', 'written', 'writing', 'read', 'reads', 'reading',
  'learn', 'learns', 'learned', 'learning', 'change', 'changes', 'changed', 'changing',
  'follow', 'follows', 'followed', 'following', 'stop', 'stops', 'stopped', 'stopping',
  'create', 'creates', 'created', 'creating', 'speak', 'speaks', 'spoke', 'spoken', 'speaking',
  'allow', 'allows', 'allowed', 'allowing', 'add', 'adds', 'added', 'adding',
  'grow', 'grows', 'grew', 'grown', 'growing', 'open', 'opens', 'opened', 'opening',
  'walk', 'walks', 'walked', 'walking', 'win', 'wins', 'won', 'winning',
  'offer', 'offers', 'offered', 'offering', 'remember', 'remembers', 'remembered', 'remembering',
  'love', 'loves', 'loved', 'loving', 'consider', 'considers', 'considered', 'considering',
  'appear', 'appears', 'appeared', 'appearing', 'buy', 'buys', 'bought', 'buying',
  'wait', 'waits', 'waited', 'waiting', 'serve', 'serves', 'served', 'serving',
  'die', 'dies', 'died', 'dying', 'send', 'sends', 'sent', 'sending',
  'expect', 'expects', 'expected', 'expecting', 'build', 'builds', 'built', 'building',
  'stay', 'stays', 'stayed', 'staying', 'fall', 'falls', 'fell', 'fallen', 'falling',
  'cut', 'cuts', 'cutting', 'reach', 'reaches', 'reached', 'reaching',
  'kill', 'kills', 'killed', 'killing', 'remain', 'remains', 'remained', 'remaining',
  
  // Common nouns
  'time', 'year', 'people', 'way', 'day', 'man', 'woman', 'child', 'children',
  'world', 'life', 'hand', 'part', 'place', 'case', 'week', 'company', 'system',
  'program', 'question', 'work', 'government', 'number', 'night', 'point', 'home',
  'water', 'room', 'mother', 'father', 'area', 'money', 'story', 'fact', 'month',
  'lot', 'right', 'study', 'book', 'eye', 'job', 'word', 'business', 'issue',
  'side', 'kind', 'head', 'house', 'service', 'friend', 'power', 'hour', 'game',
  'line', 'end', 'member', 'law', 'car', 'city', 'community', 'name', 'president',
  'team', 'minute', 'idea', 'kid', 'body', 'information', 'back', 'parent', 'face',
  'others', 'level', 'office', 'door', 'health', 'person', 'art', 'war', 'history',
  'party', 'result', 'change', 'morning', 'reason', 'research', 'girl', 'guy', 'moment',
  'air', 'teacher', 'force', 'education', 'food', 'student', 'group', 'country', 'problem',
  'school', 'state', 'family', 'thing', 'example', 'paper', 'music', 'boy',
  
  // Common adjectives
  'good', 'new', 'first', 'last', 'long', 'great', 'little', 'own', 'other',
  'old', 'right', 'big', 'high', 'different', 'small', 'large', 'next', 'early',
  'young', 'important', 'few', 'public', 'bad', 'same', 'able', 'best', 'better',
  'sure', 'free', 'true', 'whole', 'real', 'black', 'white', 'red', 'blue', 'green',
  'full', 'easy', 'hard', 'clear', 'recent', 'certain', 'personal', 'open', 'close',
  'possible', 'simple', 'strong', 'special', 'social', 'political', 'local', 'national',
  'international', 'human', 'natural', 'beautiful', 'happy', 'final', 'main', 'major',
  
  // Common adverbs
  'not', 'also', 'very', 'just', 'only', 'now', 'then', 'more', 'here', 'there',
  'still', 'well', 'even', 'back', 'never', 'really', 'most', 'much', 'already',
  'always', 'often', 'however', 'again', 'too', 'yet', 'today', 'ever', 'once',
  'together', 'almost', 'enough', 'sometimes', 'probably', 'actually', 'later',
  
  // Prepositions and conjunctions
  'of', 'to', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'up', 'about',
  'into', 'over', 'after', 'beneath', 'under', 'above', 'and', 'but', 'or',
  'as', 'if', 'when', 'than', 'because', 'while', 'although', 'though', 'whether',
  'before', 'since', 'so', 'until', 'unless', 'through', 'during', 'between',
  'against', 'without', 'within', 'along', 'following', 'across', 'behind',
  'beyond', 'plus', 'except', 'around', 'among', 'per', 'off', 'down', 'out',
  
  // Numbers
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'hundred', 'thousand', 'million', 'billion', 'first', 'second', 'third',
  
  // Common contractions (without apostrophe for flexibility)
  "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "couldn't",
  "shouldn't", "isn't", "aren't", "wasn't", "weren't", "haven't", "hasn't",
  "hadn't", "i'm", "you're", "he's", "she's", "it's", "we're", "they're",
  "i've", "you've", "we've", "they've", "i'll", "you'll", "he'll", "she'll",
  "we'll", "they'll", "i'd", "you'd", "he'd", "she'd", "we'd", "they'd",
  "that's", "what's", "who's", "there's", "here's", "let's",
  
  // Dyslexia-friendly additions (commonly confused words)
  'where', 'were', 'wear', 'weather', 'whether', 'their', 'there', 'accept',
  'except', 'affect', 'effect', 'then', 'than', 'loose', 'lose', 'quite', 'quiet',
  'through', 'threw', 'thorough', 'though', 'thought', 'bought', 'brought', 'caught',
  'taught', 'because', 'receive', 'believe', 'achieve', 'friend', 'weird', 'height',
  'weight', 'eight', 'neighbour', 'neighbor', 'colour', 'color', 'favour', 'favor',
  'behaviour', 'behavior', 'centre', 'center', 'metre', 'meter', 'theatre', 'theater',
  
  // Academic/exam words
  'analyse', 'analyze', 'argument', 'conclusion', 'definition', 'describe', 'discuss',
  'evaluate', 'evidence', 'explain', 'hypothesis', 'illustrate', 'introduction',
  'justify', 'method', 'outline', 'paragraph', 'perspective', 'principle', 'procedure',
  'relevant', 'source', 'structure', 'summary', 'theory', 'therefore', 'thus',
  'whereas', 'significant', 'subsequently', 'furthermore', 'moreover', 'nevertheless',
  'consequently', 'alternatively', 'specifically', 'particularly', 'essentially',
  'approximately', 'predominantly', 'effectively', 'similarly', 'conversely'
]);

// Common dyslexia letter substitutions for suggestions
const DYSLEXIA_SWAPS: [string, string][] = [
  ['b', 'd'], ['d', 'b'],
  ['p', 'q'], ['q', 'p'],
  ['m', 'w'], ['w', 'm'],
  ['n', 'u'], ['u', 'n'],
  ['6', '9'], ['9', '6'],
];

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Simple Soundex implementation for phonetic similarity
 */
function soundex(word: string): string {
  const a = word.toLowerCase().split('');
  const firstLetter = a.shift() || '';
  
  const codes: { [key: string]: string } = {
    a: '', e: '', i: '', o: '', u: '', h: '', w: '', y: '',
    b: '1', f: '1', p: '1', v: '1',
    c: '2', g: '2', j: '2', k: '2', q: '2', s: '2', x: '2', z: '2',
    d: '3', t: '3',
    l: '4',
    m: '5', n: '5',
    r: '6'
  };
  
  const coded = a.map(char => codes[char] || '').join('');
  const deduped = coded.replace(/(.)\1+/g, '$1');
  
  return (firstLetter + deduped + '000').slice(0, 4).toUpperCase();
}

/**
 * Generate suggestions for a misspelled word
 */
function generateSuggestions(word: string, maxSuggestions: number = 5): string[] {
  const lowerWord = word.toLowerCase();
  const suggestions: { word: string; score: number }[] = [];
  const wordSoundex = soundex(lowerWord);
  
  // Check dictionary words
  for (const dictWord of COMMON_WORDS) {
    const distance = levenshteinDistance(lowerWord, dictWord);
    
    // Only consider words with edit distance <= 2
    if (distance <= 2 && distance > 0) {
      const phoneticMatch = soundex(dictWord) === wordSoundex;
      const score = distance * 10 - (phoneticMatch ? 5 : 0);
      suggestions.push({ word: dictWord, score });
    }
  }
  
  // Add dyslexia-specific suggestions
  for (const [from, to] of DYSLEXIA_SWAPS) {
    if (lowerWord.includes(from)) {
      const swapped = lowerWord.replace(from, to);
      if (COMMON_WORDS.has(swapped)) {
        suggestions.push({ word: swapped, score: 1 }); // High priority
      }
    }
  }
  
  // Sort by score (lower is better) and dedupe
  const seen = new Set<string>();
  return suggestions
    .sort((a, b) => a.score - b.score)
    .filter(s => {
      if (seen.has(s.word)) return false;
      seen.add(s.word);
      return true;
    })
    .slice(0, maxSuggestions)
    .map(s => s.word);
}

/**
 * Check if a word is spelled correctly
 */
function isCorrectlySpelled(word: string): boolean {
  const lowerWord = word.toLowerCase();
  
  // Single letters are valid
  if (word.length === 1) return true;
  
  // Check dictionary
  if (COMMON_WORDS.has(lowerWord)) return true;
  
  // Check if it's a number
  if (/^\d+$/.test(word)) return true;
  
  // Check common proper noun patterns (capitalized words)
  // We're lenient here to avoid flagging names
  if (word.length > 1 && word[0] === word[0].toUpperCase() && 
      word.slice(1) === word.slice(1).toLowerCase()) {
    // Could be a proper noun - don't flag
    return true;
  }
  
  return false;
}

/**
 * Run spell check on segmented text
 */
export function checkSpelling(segmentedText: SegmentedText): SpellCheckResult {
  const errors: SpellError[] = [];
  
  for (const word of segmentedText.allWords) {
    if (!isCorrectlySpelled(word.word)) {
      errors.push({
        word: word.word,
        charStart: word.charStart,
        charEnd: word.charEnd,
        wordIndex: word.wordIndex,
        suggestions: generateSuggestions(word.word)
      });
    }
  }
  
  return { errors };
}

/**
 * Add a word to the session dictionary (not persisted)
 */
const sessionDictionary = new Set<string>();

export function addToSessionDictionary(word: string): void {
  sessionDictionary.add(word.toLowerCase());
}

export function isInSessionDictionary(word: string): boolean {
  return sessionDictionary.has(word.toLowerCase());
}

export function clearSessionDictionary(): void {
  sessionDictionary.clear();
}
