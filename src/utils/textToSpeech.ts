// Text-to-Speech utilities using Web Speech Synthesis API

let currentUtterance: SpeechSynthesisUtterance | null = null;
let currentAudio: HTMLAudioElement | null = null;
let onSpeakingChange: ((speaking: boolean) => void) | null = null;

// TTS Settings interface
export interface TTSSettings {
  voiceURI: string;
  rate: number;
  pitch: number;
}

const DEFAULT_SETTINGS: TTSSettings = {
  voiceURI: '',
  rate: 1.0,
  pitch: 1.0,
};

// Load settings from localStorage
export const loadTTSSettings = (): TTSSettings => {
  try {
    const saved = localStorage.getItem('tts-settings');
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load TTS settings:', e);
  }
  return DEFAULT_SETTINGS;
};

// Save settings to localStorage
export const saveTTSSettings = (settings: Partial<TTSSettings>): void => {
  const current = loadTTSSettings();
  const updated = { ...current, ...settings };
  localStorage.setItem('tts-settings', JSON.stringify(updated));
};

// Get available voices
export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  if (!('speechSynthesis' in window)) return [];
  return window.speechSynthesis.getVoices();
};

// Set callback for speaking state changes
export const onSpeakingStateChange = (callback: ((speaking: boolean) => void) | null): void => {
  onSpeakingChange = callback;
};

export const speak = (text: string, settingsOverride?: Partial<TTSSettings>): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Text-to-speech not supported'));
      return;
    }

    // Stop any current speech
    stopSpeaking();

    const settings = { ...loadTTSSettings(), ...settingsOverride };
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply settings
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = 1;

    // Set voice if specified
    if (settings.voiceURI) {
      const voices = getAvailableVoices();
      const selectedVoice = voices.find(v => v.voiceURI === settings.voiceURI);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    utterance.onstart = () => {
      onSpeakingChange?.(true);
    };

    utterance.onend = () => {
      currentUtterance = null;
      onSpeakingChange?.(false);
      resolve();
    };

    utterance.onerror = (event) => {
      currentUtterance = null;
      onSpeakingChange?.(false);
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
    onSpeakingChange?.(false);
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
