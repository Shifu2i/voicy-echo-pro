// Text-to-Speech utilities using Web Speech Synthesis API

let currentUtterance: SpeechSynthesisUtterance | null = null;

export const speak = (text: string, rate: number = 0.9): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Text-to-speech not supported'));
      return;
    }

    // Stop any current speech
    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };

    utterance.onerror = (event) => {
      currentUtterance = null;
      reject(event);
    };

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
};

export const stopSpeaking = (): void => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
  }
};

export const isSpeaking = (): boolean => {
  return 'speechSynthesis' in window && window.speechSynthesis.speaking;
};

// Get the last sentence from text (for "read back" command)
export const getLastSentence = (text: string): string => {
  const sentences = text.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    return sentences[sentences.length - 1].trim();
  }
  // If no sentence boundaries found, return last 100 chars or full text
  return text.slice(-100).trim();
};

// Get word count stats
export const getTextStats = (text: string): { words: number; characters: number; sentences: number } => {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const characters = text.length;
  const sentences = (text.match(/[.!?]+/g) || []).length || (text.trim() ? 1 : 0);
  
  return { words, characters, sentences };
};
