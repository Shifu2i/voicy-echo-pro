import { pipeline, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import { getModelConfig, getModelSize, ModelSize } from '@/utils/modelConfig';

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let whisperLoading = false;
let whisperLoadPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;
let activeDevice: 'webgpu' | 'wasm' = 'webgpu';
let loadedModelSize: ModelSize | null = null;

export interface WhisperProgress {
  status: 'downloading' | 'loading' | 'ready';
  progress?: number;
  file?: string;
  device?: 'webgpu' | 'wasm';
}

export type WhisperProgressCallback = (progress: WhisperProgress) => void;

// Check WebGPU support
export const checkWebGPUSupport = async (): Promise<boolean> => {
  const nav = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } };
  if (!nav.gpu) return false;
  try {
    const adapter = await nav.gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
};

// Check if model needs reload due to size change
export const whisperNeedsReload = (): boolean => {
  return loadedModelSize !== null && loadedModelSize !== getModelSize();
};

// Clear loaded model to force reload
export const clearWhisperModel = (): void => {
  transcriber = null;
  whisperLoadPromise = null;
  loadedModelSize = null;
};

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
    const hasWebGPU = await checkWebGPUSupport();
    let device: 'webgpu' | 'wasm' = hasWebGPU ? 'webgpu' : 'wasm';
    activeDevice = device;

    console.log(`[Whisper] Loading ${modelId} with device: ${device}`);
    if (onProgress) onProgress({ status: 'downloading', progress: 0, device });

    // Track file progress for better UX when content-length is missing
    let fileProgress = 0;
    let lastProgressTime = Date.now();

    const createProgressCallback = (targetDevice: 'webgpu' | 'wasm') => (progressData: unknown) => {
      if (onProgress && typeof progressData === 'object' && progressData !== null) {
        const data = progressData as Record<string, unknown>;
        
        // Handle progress updates
        if (typeof data.progress === 'number') {
          fileProgress = Math.round(data.progress);
          lastProgressTime = Date.now();
        } else if (data.status === 'progress' || data.status === 'download') {
          // Estimate progress based on time if no percentage available
          const elapsed = Date.now() - lastProgressTime;
          if (elapsed > 1000 && fileProgress < 95) {
            fileProgress = Math.min(95, fileProgress + 1);
          }
        }
        
        onProgress({
          status: 'downloading',
          progress: fileProgress,
          file: typeof data.file === 'string' ? data.file : undefined,
          device: targetDevice
        });
      }
    };

    const loadPipeline = async (targetDevice: 'webgpu' | 'wasm'): Promise<AutomaticSpeechRecognitionPipeline> => {
      const progressCallback = createProgressCallback(targetDevice);
      
      if (targetDevice === 'webgpu') {
        // Use fp16 dtype for WebGPU to reduce memory and improve compatibility
        const result = await pipeline(
          'automatic-speech-recognition',
          modelId,
          {
            device: 'webgpu',
            dtype: {
              encoder_model: 'fp16',
              decoder_model_merged: 'fp16',
            },
            progress_callback: progressCallback,
          }
        );
        return result;
      }
      
      // WASM/CPU doesn't need dtype specification
      const result = await pipeline(
        'automatic-speech-recognition',
        modelId,
        {
          device: 'wasm',
          progress_callback: progressCallback,
        }
      );
      return result;
    };

    try {
      const pipe = await loadPipeline(device);
      console.log(`[Whisper] Model loaded successfully on ${device}`);
      if (onProgress) onProgress({ status: 'ready', device });
      return pipe;
    } catch (error) {
      console.warn(`[Whisper] ${device} failed:`, error);
      
      // If WebGPU failed, try CPU fallback
      if (device === 'webgpu') {
        console.log('[Whisper] Falling back to WASM/CPU...');
        activeDevice = 'wasm';
        device = 'wasm';
        fileProgress = 0;
        
        if (onProgress) onProgress({ status: 'downloading', progress: 0, device: 'wasm' });

        try {
          const pipe = await loadPipeline('wasm');
          console.log('[Whisper] Model loaded successfully on CPU (fallback)');
          if (onProgress) onProgress({ status: 'ready', device: 'wasm' });
          return pipe;
        } catch (fallbackError) {
          console.error('[Whisper] WASM fallback also failed:', fallbackError);
          throw fallbackError;
        }
      }
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
