// Model configuration for VOSK and Whisper with WebGPU acceleration
// Supports multiple tiers: Fast, Balanced, Performance, Maximum

export type ModelTier = 'fast' | 'balanced' | 'performance' | 'maximum';
export type ModelSize = 'small' | 'large'; // Legacy compatibility

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

export interface ModelTierConfig {
  tier: ModelTier;
  name: string;
  description: string;
  whisper: WhisperConfig;
  recommended?: boolean;
  gpuOnly?: boolean;
}

// Fixed VOSK config - always use small for real-time preview
const VOSK_SMALL: VoskConfig = {
  modelKey: 'vosk-model-small-en-us-0.15',
  modelUrl: 'vosk-model-small-en-us-0.15.zip',
  displayName: 'VOSK Small',
  size: '40 MB',
};

// Whisper model configurations
const WHISPER_TINY: WhisperConfig = {
  modelId: 'onnx-community/whisper-tiny.en',
  displayName: 'Whisper Tiny',
  size: '~75 MB',
  gpuDtype: 'fp16',
  cpuDtype: 'fp32',
};

const WHISPER_BASE: WhisperConfig = {
  modelId: 'onnx-community/whisper-base.en',
  displayName: 'Whisper Base',
  size: '~147 MB',
  gpuDtype: 'fp16',
  cpuDtype: 'q8',
};

const WHISPER_SMALL: WhisperConfig = {
  modelId: 'onnx-community/whisper-small.en',
  displayName: 'Whisper Small',
  size: '~244 MB',
  gpuDtype: 'fp16',
  cpuDtype: 'q8',
};

const WHISPER_DISTIL_LARGE: WhisperConfig = {
  modelId: 'distil-whisper/distil-large-v3.5-ONNX',
  displayName: 'Distil Whisper Large v3.5',
  size: '~400 MB',
  gpuDtype: 'fp16',
  cpuDtype: 'q8',
};

// Model tier configurations
export const MODEL_TIERS: Record<ModelTier, ModelTierConfig> = {
  fast: {
    tier: 'fast',
    name: 'Fast',
    description: 'Quick processing, basic accuracy. Best for slow connections.',
    whisper: WHISPER_TINY,
  },
  balanced: {
    tier: 'balanced',
    name: 'Balanced',
    description: 'Good accuracy with reasonable download size.',
    whisper: WHISPER_BASE,
  },
  performance: {
    tier: 'performance',
    name: 'Performance',
    description: 'Best balance of speed and accuracy. Recommended for WebGPU.',
    whisper: WHISPER_SMALL,
    recommended: true,
  },
  maximum: {
    tier: 'maximum',
    name: 'Maximum',
    description: 'Near state-of-the-art accuracy. Requires WebGPU for best results.',
    whisper: WHISPER_DISTIL_LARGE,
    gpuOnly: true,
  },
};

// WebGPU capability detection
let webGPUSupported: boolean | null = null;
let webGPUChecked = false;

export const checkWebGPUSupport = async (): Promise<boolean> => {
  if (webGPUChecked) return webGPUSupported ?? false;
  
  webGPUChecked = true;
  
  if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
    webGPUSupported = false;
    return false;
  }
  
  try {
    const gpu = (navigator as any).gpu;
    if (!gpu) {
      webGPUSupported = false;
      return false;
    }
    
    const adapter = await gpu.requestAdapter();
    if (!adapter) {
      webGPUSupported = false;
      return false;
    }
    
    const device = await adapter.requestDevice();
    if (!device) {
      webGPUSupported = false;
      return false;
    }
    
    webGPUSupported = true;
    console.log('[ModelConfig] WebGPU is supported');
    return true;
  } catch (error) {
    console.warn('[ModelConfig] WebGPU check failed:', error);
    webGPUSupported = false;
    return false;
  }
};

// Synchronous check (returns cached result or null if not checked yet)
export const isWebGPUSupported = (): boolean | null => webGPUSupported;

// Reset WebGPU check (for testing)
export const resetWebGPUCheck = (): void => {
  webGPUSupported = null;
  webGPUChecked = false;
};

// Get the proxy URL for Vosk model download
export const getVoskProxyUrl = (modelFile: string): string => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || 'vpuzzcerqxqinouqjodq';
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://${projectId}.supabase.co`;
  return `${supabaseUrl}/functions/v1/proxy-model?model=${modelFile}`;
};

// Storage keys
const TIER_STORAGE_KEY = 'voice-model-tier';
const LEGACY_SIZE_KEY = 'voice-model-size';

// Get current model tier
export const getModelTier = (): ModelTier => {
  const saved = localStorage.getItem(TIER_STORAGE_KEY);
  if (saved && saved in MODEL_TIERS) {
    return saved as ModelTier;
  }
  
  // Migrate from legacy size setting
  const legacySize = localStorage.getItem(LEGACY_SIZE_KEY);
  if (legacySize === 'small') return 'fast';
  if (legacySize === 'large') return 'performance';
  
  // Default to performance tier
  return 'performance';
};

// Set model tier
export const setModelTier = (tier: ModelTier): void => {
  localStorage.setItem(TIER_STORAGE_KEY, tier);
};

// Get current model config based on tier
export const getModelConfig = (): ModelConfig => {
  const tier = getModelTier();
  return {
    vosk: VOSK_SMALL,
    whisper: MODEL_TIERS[tier].whisper,
  };
};

// Get tier config
export const getTierConfig = (tier?: ModelTier): ModelTierConfig => {
  return MODEL_TIERS[tier ?? getModelTier()];
};

// Get dtype based on device
export const getDtypeForDevice = (device: 'webgpu' | 'wasm', whisperConfig: WhisperConfig): 'fp16' | 'fp32' | 'q8' => {
  if (device === 'webgpu') {
    return whisperConfig.gpuDtype;
  }
  return whisperConfig.cpuDtype;
};

// Check if current tier should use WebGPU
export const shouldUseWebGPU = async (): Promise<boolean> => {
  const supported = await checkWebGPUSupport();
  return supported;
};

// Get recommended tier based on device capabilities
export const getRecommendedTier = async (): Promise<ModelTier> => {
  const hasWebGPU = await checkWebGPUSupport();
  
  if (hasWebGPU) {
    return 'performance'; // Whisper Small works great with WebGPU
  }
  
  return 'balanced'; // Whisper Base for CPU
};

// Legacy compatibility - map old size to new tiers
export const getModelSize = (): ModelSize => {
  const tier = getModelTier();
  return tier === 'fast' || tier === 'balanced' ? 'small' : 'large';
};

export const setModelSize = (size: ModelSize): void => {
  const tier = size === 'small' ? 'fast' : 'performance';
  setModelTier(tier);
};

// Legacy MODEL_CONFIGS for backward compatibility
export const MODEL_CONFIGS: Record<ModelSize, ModelConfig> = {
  small: {
    vosk: VOSK_SMALL,
    whisper: WHISPER_TINY,
  },
  large: {
    vosk: VOSK_SMALL,
    whisper: WHISPER_SMALL,
  },
};

export const needsModelReload = (currentTier: ModelTier): boolean => {
  return currentTier !== getModelTier();
};
