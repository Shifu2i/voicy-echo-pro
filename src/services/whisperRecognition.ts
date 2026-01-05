import { pipeline, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import { getModelConfig, getModelSize, ModelSize } from '@/utils/modelConfig';

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let whisperLoading = false;
let whisperLoadPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;
let activeDevice: 'webgpu' | 'wasm' = 'wasm';
let loadedModelSize: ModelSize | null = null;

export interface WhisperProgress {
  status: 'downloading' | 'loading' | 'ready';
  progress?: number;
  file?: string;
  device?: 'webgpu' | 'wasm';
  loaded?: number;
  total?: number;
  estimatedTimeRemaining?: number; // seconds
}

export type WhisperProgressCallback = (progress: WhisperProgress) => void;

// Check if WebGPU is available for GPU acceleration
const checkWebGPUSupport = async (): Promise<boolean> => {
  try {
    // @ts-expect-error - WebGPU types not in all TS configs
    if (!navigator.gpu) return false;
    // @ts-expect-error - WebGPU types not in all TS configs
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
};

// Clear loaded model to force reload
export const clearWhisperModel = (): void => {
  transcriber = null;
  whisperLoadPromise = null;
  loadedModelSize = null;
};

// Check if model needs reload due to size change
export const whisperNeedsReload = (): boolean => {
  return loadedModelSize !== null && loadedModelSize !== getModelSize();
};

// Desktop app - prioritize GPU (WebGPU) with CPU (WASM) fallback
export const loadWhisperModel = async (onProgress?: WhisperProgressCallback): Promise<AutomaticSpeechRecognitionPipeline> => {
  const currentSize = getModelSize();
  
  // If model size changed, clear the old model
  if (loadedModelSize !== null && loadedModelSize !== currentSize) {
    clearWhisperModel();
  }
  
  if (transcriber) return transcriber;
  if (whisperLoadPromise) return whisperLoadPromise;

  whisperLoading = true;
  const config = getModelConfig();
  const modelId = config.whisper.modelId;

  whisperLoadPromise = (async () => {
    // Check for GPU support first - always use most powerful option
    const hasWebGPU = await checkWebGPUSupport();
    let device: 'webgpu' | 'wasm' = hasWebGPU ? 'webgpu' : 'wasm';
    activeDevice = device;
    
    console.log(`[Whisper] Loading ${modelId} on ${device.toUpperCase()}${hasWebGPU ? ' (GPU Accelerated)' : ' (CPU)'}`);
    if (onProgress) onProgress({ status: 'downloading', progress: 0, device });

    let fileProgress = 0;
    let downloadStartTime = Date.now();
    let totalBytes = 0;
    let loadedBytes = 0;

    const progressCallback = (progressData: unknown) => {
      if (onProgress && typeof progressData === 'object' && progressData !== null) {
        const data = progressData as Record<string, unknown>;
        
        if (typeof data.progress === 'number') {
          fileProgress = Math.round(data.progress);
        }
        
        // Track bytes for time estimation
        if (typeof data.loaded === 'number') loadedBytes = data.loaded;
        if (typeof data.total === 'number') totalBytes = data.total;
        
        // Calculate estimated time remaining
        let estimatedTimeRemaining: number | undefined;
        if (loadedBytes > 0 && totalBytes > 0) {
          const elapsedSeconds = (Date.now() - downloadStartTime) / 1000;
          const bytesPerSecond = loadedBytes / elapsedSeconds;
          const remainingBytes = totalBytes - loadedBytes;
          if (bytesPerSecond > 0) {
            estimatedTimeRemaining = Math.ceil(remainingBytes / bytesPerSecond);
          }
        }
        
        onProgress({
          status: 'downloading',
          progress: fileProgress,
          file: typeof data.file === 'string' ? data.file : undefined,
          device,
          loaded: loadedBytes,
          total: totalBytes,
          estimatedTimeRemaining
        });
      }
    };

    try {
      // Try GPU first with fp16 for best performance
      const pipe = await pipeline(
        'automatic-speech-recognition',
        modelId,
        {
          device: device,
          dtype: device === 'webgpu' ? 'fp16' : 'q8', // fp16 for GPU, q8 quantized for CPU
          progress_callback: progressCallback,
        }
      );
      
      console.log(`[Whisper] Model loaded successfully on ${device.toUpperCase()}`);
      if (onProgress) onProgress({ status: 'ready', device });
      return pipe;
    } catch (error) {
      // If WebGPU failed, fallback to WASM
      if (device === 'webgpu') {
        console.warn('[Whisper] WebGPU failed, falling back to WASM (CPU):', error);
        activeDevice = 'wasm';
        device = 'wasm';
        
        const pipe = await pipeline(
          'automatic-speech-recognition',
          modelId,
          {
            device: 'wasm',
            dtype: 'q8',
            progress_callback: progressCallback,
          }
        );
        
        console.log('[Whisper] Model loaded successfully on WASM (CPU fallback)');
        if (onProgress) onProgress({ status: 'ready', device: 'wasm' });
        return pipe;
      }
      console.error('[Whisper] Failed to load model:', error);
      throw error;
    }
  })();

  try {
    transcriber = await whisperLoadPromise;
    loadedModelSize = currentSize;
    whisperLoading = false;
    return transcriber;
  } catch (error) {
    whisperLoading = false;
    whisperLoadPromise = null;
    throw error;
  }
};

export const isWhisperLoaded = (): boolean => !!transcriber;
export const isWhisperLoading = (): boolean => whisperLoading;
export const getActiveDevice = (): 'webgpu' | 'wasm' => activeDevice;

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  if (!transcriber) {
    throw new Error('Whisper model not loaded. Call loadWhisperModel() first.');
  }

  // Convert blob to array buffer then to audio data
  const arrayBuffer = await audioBlob.arrayBuffer();
  
  // Decode audio using AudioContext
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Get audio data as Float32Array
  const audioData = audioBuffer.getChannelData(0);
  
  await audioContext.close();

  // Run transcription - no language/task for English-only models
  const result = await transcriber(audioData) as { text: string } | string;

  // Handle result - can be string or object with text property
  if (typeof result === 'string') {
    return result.trim();
  }
  
  if (result && typeof result.text === 'string') {
    return result.text.trim();
  }

  return '';
};
