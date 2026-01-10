import { pipeline, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import { getModelConfig, getModelSize, ModelSize } from '@/utils/modelConfig';

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let whisperLoading = false;
let whisperLoadPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;
let activeDevice: 'webgpu' | 'wasm' = 'wasm';
let loadedModelSize: ModelSize | null = null;

export interface FileProgress {
  name: string;
  loaded: number;
  total: number;
  status: 'pending' | 'downloading' | 'done';
}

export interface WhisperProgress {
  status: 'downloading' | 'loading' | 'ready';
  progress?: number;
  overallProgress: number; // 0-100 across all files
  file?: string;
  device?: 'webgpu' | 'wasm';
  loaded?: number;
  total?: number;
  estimatedTimeRemaining?: number; // seconds
  files: FileProgress[];
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
    if (onProgress) onProgress({ status: 'downloading', progress: 0, overallProgress: 0, device, files: [] });

    const downloadStartTime = Date.now();
    const filesMap = new Map<string, FileProgress>();
    let totalBytesAllFiles = 0;
    let loadedBytesAllFiles = 0;

    const calculateOverallProgress = (): number => {
      if (filesMap.size === 0) return 0;
      let totalProgress = 0;
      filesMap.forEach((file) => {
        if (file.status === 'done') {
          totalProgress += 100;
        } else if (file.total > 0) {
          totalProgress += (file.loaded / file.total) * 100;
        }
      });
      return Math.round(totalProgress / filesMap.size);
    };

    const progressCallback = (progressData: unknown) => {
      if (!onProgress || typeof progressData !== 'object' || progressData === null) return;
      
      const data = progressData as Record<string, unknown>;
      const status = data.status as string;
      const fileName = typeof data.file === 'string' ? data.file.split('/').pop() || data.file : undefined;
      
      if (fileName) {
        // Get or create file entry
        if (!filesMap.has(fileName)) {
          filesMap.set(fileName, {
            name: fileName,
            loaded: 0,
            total: 0,
            status: 'pending'
          });
        }
        
        const fileEntry = filesMap.get(fileName)!;
        
        // Update based on status
        if (status === 'initiate' || status === 'download') {
          fileEntry.status = 'downloading';
          if (typeof data.total === 'number') {
            fileEntry.total = data.total;
          }
        } else if (status === 'progress') {
          fileEntry.status = 'downloading';
          if (typeof data.loaded === 'number') fileEntry.loaded = data.loaded;
          if (typeof data.total === 'number') fileEntry.total = data.total;
        } else if (status === 'done') {
          fileEntry.status = 'done';
          if (fileEntry.total > 0) {
            fileEntry.loaded = fileEntry.total;
          }
        }
        
        filesMap.set(fileName, fileEntry);
      }
      
      // Calculate totals across all files
      totalBytesAllFiles = 0;
      loadedBytesAllFiles = 0;
      filesMap.forEach((file) => {
        totalBytesAllFiles += file.total;
        loadedBytesAllFiles += file.loaded;
      });
      
      // Calculate estimated time remaining
      let estimatedTimeRemaining: number | undefined;
      if (loadedBytesAllFiles > 0 && totalBytesAllFiles > 0) {
        const elapsedSeconds = (Date.now() - downloadStartTime) / 1000;
        const bytesPerSecond = loadedBytesAllFiles / elapsedSeconds;
        const remainingBytes = totalBytesAllFiles - loadedBytesAllFiles;
        if (bytesPerSecond > 0) {
          estimatedTimeRemaining = Math.ceil(remainingBytes / bytesPerSecond);
        }
      }
      
      const overallProgress = calculateOverallProgress();
      
      onProgress({
        status: 'downloading',
        progress: typeof data.progress === 'number' ? Math.round(data.progress) : undefined,
        overallProgress,
        file: fileName,
        device,
        loaded: loadedBytesAllFiles,
        total: totalBytesAllFiles,
        estimatedTimeRemaining,
        files: Array.from(filesMap.values())
      });
    };

    // Start with CPU (WASM) - more stable in browser environments
    // WebGPU can cause crashes in certain browser configurations
    device = 'wasm';
    activeDevice = 'wasm';
    
    console.log(`[Whisper] Loading ${modelId} on WASM (CPU - stable mode)`);
    if (onProgress) onProgress({ status: 'downloading', progress: 0, overallProgress: 0, device: 'wasm', files: [] });

    try {
      const pipe = await pipeline(
        'automatic-speech-recognition',
        modelId,
        {
          device: 'wasm',
          dtype: 'q8', // Quantized for faster loading and lower memory
          progress_callback: progressCallback,
        }
      );
      
      console.log('[Whisper] Model loaded successfully on WASM (CPU)');
      if (onProgress) onProgress({ status: 'ready', overallProgress: 100, device: 'wasm', files: Array.from(filesMap.values()) });
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
