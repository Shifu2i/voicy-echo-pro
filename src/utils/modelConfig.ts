// Model configuration for VOSK and Whisper
// Always use: Large Whisper (best accuracy) + Small Vosk (fast real-time preview)

export type ModelSize = 'small' | 'large';

export interface VoskConfig {
  modelKey: string;
  modelUrl: string;
  displayName: string;
  size: string;
}

export interface WhisperConfig {
  modelId: string;
  displayName: string;
  size: string;
  gpuDtype: 'fp16' | 'fp32';
  cpuDtype: 'q8' | 'fp32';
}

export interface ModelConfig {
  vosk: VoskConfig;
  whisper: WhisperConfig;
}

// Fixed configuration: Small Vosk for real-time preview
const VOSK_SMALL: VoskConfig = {
  modelKey: 'vosk-model-small-en-us-0.15',
  modelUrl: 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip',
  displayName: 'VOSK Small',
  size: '40 MB',
};

// Optimized Whisper: Use base.en - small, fast, English-optimized
// Large models cause WASM memory issues in browser
const WHISPER_LARGE: WhisperConfig = {
  modelId: 'onnx-community/whisper-base.en',
  displayName: 'Whisper Base (English)',
  size: '~150 MB',
  gpuDtype: 'fp32',
  cpuDtype: 'fp32', // fp32 more stable than q8 for base model
};

// Legacy MODEL_CONFIGS for backward compatibility
export const MODEL_CONFIGS: Record<ModelSize, ModelConfig> = {
  small: {
    vosk: VOSK_SMALL,
    whisper: WHISPER_LARGE, // Always use large Whisper
  },
  large: {
    vosk: VOSK_SMALL, // Always use small Vosk for speed
    whisper: WHISPER_LARGE,
  },
};

const STORAGE_KEY = 'voice-model-size';

export const getModelSize = (): ModelSize => {
  // Always return 'large' to use large Whisper
  return 'large';
};

export const setModelSize = (size: ModelSize): void => {
  localStorage.setItem(STORAGE_KEY, size);
};

export const getModelConfig = (): ModelConfig => {
  // Always return fixed config: Large Whisper + Small Vosk
  return {
    vosk: VOSK_SMALL,
    whisper: WHISPER_LARGE,
  };
};

export const needsModelReload = (currentSize: ModelSize): boolean => {
  return false; // Config is now fixed, no reload needed
};
