// Model configuration for VOSK and Whisper

export type ModelSize = 'small' | 'large';

export interface ModelConfig {
  vosk: {
    modelKey: string;
    modelUrl: string;
    displayName: string;
    size: string;
  };
  whisper: {
    modelId: string;
    displayName: string;
    size: string;
    gpuDtype: 'fp16' | 'fp32';
    cpuDtype: 'q8' | 'fp32';
  };
}

export const MODEL_CONFIGS: Record<ModelSize, ModelConfig> = {
  small: {
    vosk: {
      modelKey: 'vosk-model-small-en-us-0.15',
      modelUrl: 'vosk-model-small-en-us-0.15.zip',
      displayName: 'VOSK Small',
      size: '40 MB',
    },
    whisper: {
      modelId: 'onnx-community/whisper-tiny.en',
      displayName: 'Whisper Tiny',
      size: '~150 MB',
      gpuDtype: 'fp16',
      cpuDtype: 'q8',
    },
  },
  large: {
    vosk: {
      modelKey: 'vosk-model-en-us-0.22',
      modelUrl: 'vosk-model-en-us-0.22.zip',
      displayName: 'VOSK Large',
      size: '1.8 GB',
    },
    whisper: {
      modelId: 'onnx-community/whisper-large-v3-turbo',
      displayName: 'Whisper Large v3 Turbo',
      size: '~1.5 GB',
      gpuDtype: 'fp16',
      cpuDtype: 'q8',
    },
  },
};

const STORAGE_KEY = 'voice-model-size';

export const getModelSize = (): ModelSize => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'small' || saved === 'large') {
    return saved;
  }
  return 'large'; // Default to large for best accuracy
};

export const setModelSize = (size: ModelSize): void => {
  localStorage.setItem(STORAGE_KEY, size);
};

export const getModelConfig = (): ModelConfig => {
  return MODEL_CONFIGS[getModelSize()];
};

export const needsModelReload = (currentSize: ModelSize): boolean => {
  return getModelSize() !== currentSize;
};
