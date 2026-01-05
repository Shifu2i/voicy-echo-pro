import { pipeline, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import { getModelConfig, getModelSize, ModelSize } from '@/utils/modelConfig';

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let whisperLoading = false;
let whisperLoadPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;
let activeDevice: 'wasm' = 'wasm';
let loadedModelSize: ModelSize | null = null;

export interface WhisperProgress {
  status: 'downloading' | 'loading' | 'ready';
  progress?: number;
  file?: string;
  device?: 'wasm';
}

export type WhisperProgressCallback = (progress: WhisperProgress) => void;

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

// Desktop app - use WASM for full CPU hardware utilization
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
    console.log(`[Whisper] Loading ${modelId} with WASM (desktop optimized)`);
    if (onProgress) onProgress({ status: 'downloading', progress: 0, device: 'wasm' });

    let fileProgress = 0;
    let lastProgressTime = Date.now();

    const progressCallback = (progressData: unknown) => {
      if (onProgress && typeof progressData === 'object' && progressData !== null) {
        const data = progressData as Record<string, unknown>;
        
        if (typeof data.progress === 'number') {
          fileProgress = Math.round(data.progress);
          lastProgressTime = Date.now();
        } else if (data.status === 'progress' || data.status === 'download') {
          const elapsed = Date.now() - lastProgressTime;
          if (elapsed > 1000 && fileProgress < 95) {
            fileProgress = Math.min(95, fileProgress + 1);
          }
        }
        
        onProgress({
          status: 'downloading',
          progress: fileProgress,
          file: typeof data.file === 'string' ? data.file : undefined,
          device: 'wasm'
        });
      }
    };

    try {
      // Use WASM for desktop - leverages native CPU threads
      const pipe = await pipeline(
        'automatic-speech-recognition',
        modelId,
        {
          device: 'wasm',
          progress_callback: progressCallback,
        }
      );
      
      console.log('[Whisper] Model loaded successfully on WASM (CPU)');
      if (onProgress) onProgress({ status: 'ready', device: 'wasm' });
      return pipe;
    } catch (error) {
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
export const getActiveDevice = (): 'wasm' => activeDevice;

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
