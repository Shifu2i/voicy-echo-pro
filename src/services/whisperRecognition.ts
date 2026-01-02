import { pipeline, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let whisperLoading = false;
let whisperLoadPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;
let activeDevice: 'webgpu' | 'wasm' = 'webgpu';

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

export const loadWhisperModel = async (onProgress?: WhisperProgressCallback): Promise<AutomaticSpeechRecognitionPipeline> => {
  if (transcriber) return transcriber;
  if (whisperLoadPromise) return whisperLoadPromise;

  whisperLoading = true;

  whisperLoadPromise = (async () => {
    const hasWebGPU = await checkWebGPUSupport();
    const device = hasWebGPU ? 'webgpu' : 'wasm';
    activeDevice = device;

    console.log(`[Whisper] Loading with device: ${device}`);
    if (onProgress) onProgress({ status: 'downloading', progress: 0, device });

    try {
      const pipe = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-large-v3-turbo',
        {
          device,
          progress_callback: (progressData) => {
            if (onProgress && typeof progressData === 'object' && progressData !== null) {
              const data = progressData as Record<string, unknown>;
              if (typeof data.progress === 'number') {
                onProgress({
                  status: 'downloading',
                  progress: Math.round(data.progress),
                  file: typeof data.file === 'string' ? data.file : undefined,
                  device
                });
              }
            }
          }
        }
      );

      console.log(`[Whisper] Model loaded successfully on ${device}`);
      if (onProgress) onProgress({ status: 'ready', device });
      return pipe;
    } catch (error) {
      // If WebGPU failed, try CPU fallback
      if (device === 'webgpu') {
        console.warn('[Whisper] WebGPU failed, falling back to CPU:', error);
        activeDevice = 'wasm';
        
        if (onProgress) onProgress({ status: 'downloading', progress: 0, device: 'wasm' });

        const pipe = await pipeline(
          'automatic-speech-recognition',
          'onnx-community/whisper-large-v3-turbo',
          {
            device: 'wasm',
            progress_callback: (progressData) => {
              if (onProgress && typeof progressData === 'object' && progressData !== null) {
                const data = progressData as Record<string, unknown>;
                if (typeof data.progress === 'number') {
                  onProgress({
                    status: 'downloading',
                    progress: Math.round(data.progress),
                    file: typeof data.file === 'string' ? data.file : undefined,
                    device: 'wasm'
                  });
                }
              }
            }
          }
        );

        console.log('[Whisper] Model loaded successfully on CPU (fallback)');
        if (onProgress) onProgress({ status: 'ready', device: 'wasm' });
        return pipe;
      }
      throw error;
    }
  })();

  try {
    transcriber = await whisperLoadPromise;
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
