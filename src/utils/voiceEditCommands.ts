// Voice edit command parser for natural language editing

export interface EditCommand {
  type: 'replace' | 'delete' | 'insert' | 'unknown';
  target?: string;
  replacement?: string;
  position?: string;
}

// Regex patterns for different replace command variations
const REPLACE_PATTERNS = [
  /^replace\s+(.+?)\s+with\s+(.+)$/i,
  /^change\s+(.+?)\s+to\s+(.+)$/i,
  /^swap\s+(.+?)\s+for\s+(.+)$/i,
  /^make\s+(.+?)\s+say\s+(.+)$/i,
  /^substitute\s+(.+?)\s+with\s+(.+)$/i,
];

const DELETE_PATTERNS = [
  /^delete\s+(.+)$/i,
  /^remove\s+(.+)$/i,
  /^erase\s+(.+)$/i,
];

const INSERT_PATTERNS = [
  /^insert\s+(.+?)\s+after\s+(.+)$/i,
  /^add\s+(.+?)\s+after\s+(.+)$/i,
  /^insert\s+(.+?)\s+before\s+(.+)$/i,
  /^add\s+(.+?)\s+before\s+(.+)$/i,
];

export function parseEditCommand(transcription: string): EditCommand {
  const text = transcription.trim();
  
  // Try replace patterns
  for (const pattern of REPLACE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'replace',
        target: match[1].trim(),
        replacement: match[2].trim(),
      };
    }
  }
  
  // Try delete patterns
  for (const pattern of DELETE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return {
        type: 'delete',
        target: match[1].trim(),
      };
    }
  }
  
  // Try insert patterns
  for (const pattern of INSERT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const isBefore = pattern.source.includes('before');
      return {
        type: 'insert',
        replacement: match[1].trim(),
        target: match[2].trim(),
        position: isBefore ? 'before' : 'after',
      };
    }
  }
  
  return { type: 'unknown' };
}

// Find and replace text in document, returning the new text and match info
export function executeReplaceCommand(
  fullText: string, 
  target: string, 
  replacement: string
): { newText: string; matchCount: number; replacedIndex: number } | null {
  // Case-insensitive search with word boundaries where possible
  const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedTarget, 'gi');
  const matches = [...fullText.matchAll(regex)];
  
  if (matches.length === 0) {
    return null;
  }
  
  // Replace the last occurrence (most likely what user wants to edit)
  const lastMatch = matches[matches.length - 1];
  const matchIndex = lastMatch.index!;
  const matchedText = lastMatch[0];
  
  // Preserve casing if replacement is same word with different case
  let finalReplacement = replacement;
  if (matchedText[0] === matchedText[0].toUpperCase() && 
      replacement[0] === replacement[0].toLowerCase()) {
    finalReplacement = replacement[0].toUpperCase() + replacement.slice(1);
  }
  
  const newText = 
    fullText.slice(0, matchIndex) + 
    finalReplacement + 
    fullText.slice(matchIndex + matchedText.length);
  
  return {
    newText,
    matchCount: matches.length,
    replacedIndex: matchIndex,
  };
}

// Execute delete command
export function executeDeleteCommand(
  fullText: string,
  target: string
): { newText: string; matchCount: number; deletedIndex: number } | null {
  const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedTarget, 'gi');
  const matches = [...fullText.matchAll(regex)];
  
  if (matches.length === 0) {
    return null;
  }
  
  // Delete the last occurrence
  const lastMatch = matches[matches.length - 1];
  const matchIndex = lastMatch.index!;
  const matchedText = lastMatch[0];
  
  const newText = 
    fullText.slice(0, matchIndex) + 
    fullText.slice(matchIndex + matchedText.length);
  
  return {
    newText: newText.replace(/\s+/g, ' ').trim(),
    matchCount: matches.length,
    deletedIndex: matchIndex,
  };
}

// Execute insert command
export function executeInsertCommand(
  fullText: string,
  target: string,
  insertion: string,
  position: 'before' | 'after'
): { newText: string; matchCount: number; insertedIndex: number } | null {
  const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(escapedTarget, 'gi');
  const matches = [...fullText.matchAll(regex)];
  
  if (matches.length === 0) {
    return null;
  }
  
  // Insert at the last occurrence
  const lastMatch = matches[matches.length - 1];
  const matchIndex = lastMatch.index!;
  const matchedText = lastMatch[0];
  
  let newText: string;
  let insertedIndex: number;
  
  if (position === 'before') {
    newText = 
      fullText.slice(0, matchIndex) + 
      insertion + ' ' +
      fullText.slice(matchIndex);
    insertedIndex = matchIndex;
  } else {
    const afterIndex = matchIndex + matchedText.length;
    newText = 
      fullText.slice(0, afterIndex) + 
      ' ' + insertion +
      fullText.slice(afterIndex);
    insertedIndex = afterIndex + 1;
  }
  
  return {
    newText,
    matchCount: matches.length,
    insertedIndex,
  };
}
