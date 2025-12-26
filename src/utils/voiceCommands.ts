// Voice command to punctuation/formatting mappings
const voiceCommands: Record<string, string> = {
  // Punctuation
  'period': '.',
  'full stop': '.',
  'comma': ',',
  'question mark': '?',
  'exclamation mark': '!',
  'exclamation point': '!',
  'colon': ':',
  'semicolon': ';',
  'dash': '—',
  'hyphen': '-',
  'open quote': '"',
  'close quote': '"',
  'open parenthesis': '(',
  'close parenthesis': ')',
  'ellipsis': '...',
  
  // Formatting
  'new line': '\n',
  'newline': '\n',
  'new paragraph': '\n\n',
  'paragraph': '\n\n',
  
  // Common phrases
  'ampersand': '&',
  'at sign': '@',
  'hashtag': '#',
  'dollar sign': '$',
  'percent': '%',
};

/**
 * Processes transcribed text and converts voice commands to punctuation/formatting
 */
export const processVoiceCommands = (text: string): string => {
  let result = text;
  
  // Sort by length (longest first) to avoid partial replacements
  const sortedCommands = Object.entries(voiceCommands).sort(
    ([a], [b]) => b.length - a.length
  );
  
  for (const [command, replacement] of sortedCommands) {
    // Case-insensitive replacement with word boundaries
    const regex = new RegExp(`\\b${command}\\b`, 'gi');
    result = result.replace(regex, replacement);
  }
  
  // Clean up extra spaces around punctuation
  result = result
    .replace(/\s+([.,!?;:])/g, '$1')  // Remove space before punctuation
    .replace(/\s+\n/g, '\n')           // Remove trailing spaces before newlines
    .replace(/\n\s+/g, '\n');          // Remove leading spaces after newlines
  
  return result;
};
