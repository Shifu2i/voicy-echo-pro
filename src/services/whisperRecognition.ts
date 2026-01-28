import { pipeline, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import { 
  getModelConfig, 
  getModelTier, 
  checkWebGPUSupport, 
  getDtypeForDevice,
  ModelTier 
} from '@/utils/modelConfig';

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let whisperLoading = false;
let whisperLoadPromise: Promise<AutomaticSpeechRecognitionPipeline | null> | null = null;
let activeDevice: 'webgpu' | 'wasm' | 'native' = 'wasm';
let loadedModelTier: ModelTier | null = null;
let usingNative = false;

// Check if running in Tauri
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Tauri invoke helper with caching
let tauriInvokeCache: typeof import('@tauri-apps/api/core').invoke | null = null;
const tauriInvoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  if (!isTauri()) throw new Error('Not running in Tauri');
  if (!tauriInvokeCache) {
    const { invoke } = await import('@tauri-apps/api/core');
    tauriInvokeCache = invoke;
  }
  return tauriInvokeCache<T>(cmd, args);
};

export interface FileProgress {
  name: string;
  loaded: number;
  total: number;
  status: 'pending' | 'downloading' | 'done';
}

export interface WhisperProgress {
  status: 'downloading' | 'loading' | 'ready';
  progress?: number;
  overallProgress: number;
  file?: string;
  device?: 'webgpu' | 'wasm' | 'native';
  loaded?: number;
  total?: number;
  estimatedTimeRemaining?: number;
  files: FileProgress[];
}

export type WhisperProgressCallback = (progress: WhisperProgress) => void;

// Clear loaded model to force reload
export const clearWhisperModel = (): void => {
  transcriber = null;
  whisperLoadPromise = null;
  loadedModelTier = null;
  usingNative = false;
};

// Check if model needs reload due to tier change
export const whisperNeedsReload = (): boolean => {
  return loadedModelTier !== null && loadedModelTier !== getModelTier();
};

// Check if native Whisper is available and loaded
export const isNativeWhisperAvailable = async (): Promise<boolean> => {
  if (!isTauri()) return false;
  try {
    return await tauriInvoke<boolean>('is_whisper_model_downloaded');
  } catch {
    return false;
  }
};

// Load Whisper model with WebGPU acceleration when available
export const loadWhisperModel = async (onProgress?: WhisperProgressCallback): Promise<AutomaticSpeechRecognitionPipeline | null> => {
  const currentTier = getModelTier();
  
  // If tier changed, clear the old model
  if (loadedModelTier !== null && loadedModelTier !== currentTier) {
    clearWhisperModel();
  }
  
  if (transcriber) return transcriber;
  if (usingNative) return null;
  if (whisperLoadPromise) return whisperLoadPromise;

  // Try native Whisper first in Tauri
  if (isTauri()) {
    try {
      const isDownloaded = await tauriInvoke<boolean>('is_whisper_model_downloaded');
      
      if (!isDownloaded) {
        console.log('[Whisper] Downloading native model...');
        onProgress?.({ status: 'downloading', progress: 0, overallProgress: 0, device: 'native', files: [] });
        await tauriInvoke<string>('download_whisper_model');
      }
      
      console.log('[Whisper] Loading native model...');
      onProgress?.({ status: 'loading', progress: 50, overallProgress: 50, device: 'native', files: [] });
      
      await tauriInvoke<void>('load_whisper_model');
      
      usingNative = true;
      activeDevice = 'native';
      loadedModelTier = currentTier;
      
      console.log('[Whisper] Native model loaded successfully');
      onProgress?.({ status: 'ready', overallProgress: 100, device: 'native', files: [] });
      
      return null;
    } catch (err) {
      console.warn('[Whisper] Native loading failed, falling back to browser:', err);
    }
  }

  whisperLoading = true;
  const config = getModelConfig();
  const modelId = config.whisper.modelId;

  whisperLoadPromise = (async () => {
    // Check WebGPU support
    const hasWebGPU = await checkWebGPUSupport();
    const device: 'webgpu' | 'wasm' = hasWebGPU ? 'webgpu' : 'wasm';
    const dtype = getDtypeForDevice(device, config.whisper);
    
    activeDevice = device;
    console.log(`[Whisper] Loading ${modelId} on ${device.toUpperCase()} with ${dtype}`);
    onProgress?.({ status: 'downloading', progress: 0, overallProgress: 0, device, files: [] });

    const downloadStartTime = Date.now();
    const filesMap = new Map<string, FileProgress>();

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
        if (!filesMap.has(fileName)) {
          filesMap.set(fileName, { name: fileName, loaded: 0, total: 0, status: 'pending' });
        }
        
        const fileEntry = filesMap.get(fileName)!;
        
        if (status === 'initiate' || status === 'download') {
          fileEntry.status = 'downloading';
          if (typeof data.total === 'number') fileEntry.total = data.total;
        } else if (status === 'progress') {
          fileEntry.status = 'downloading';
          if (typeof data.loaded === 'number') fileEntry.loaded = data.loaded;
          if (typeof data.total === 'number') fileEntry.total = data.total;
        } else if (status === 'done') {
          fileEntry.status = 'done';
          if (fileEntry.total > 0) fileEntry.loaded = fileEntry.total;
        }
      }
      
      // Calculate totals
      let totalBytes = 0, loadedBytes = 0;
      filesMap.forEach((file) => {
        totalBytes += file.total;
        loadedBytes += file.loaded;
      });
      
      // Calculate ETA
      let estimatedTimeRemaining: number | undefined;
      if (loadedBytes > 0 && totalBytes > 0) {
        const elapsedSeconds = (Date.now() - downloadStartTime) / 1000;
        const bytesPerSecond = loadedBytes / elapsedSeconds;
        if (bytesPerSecond > 0) {
          estimatedTimeRemaining = Math.ceil((totalBytes - loadedBytes) / bytesPerSecond);
        }
      }
      
      onProgress({
        status: 'downloading',
        progress: typeof data.progress === 'number' ? Math.round(data.progress) : undefined,
        overallProgress: calculateOverallProgress(),
        file: fileName,
        device,
        loaded: loadedBytes,
        total: totalBytes,
        estimatedTimeRemaining,
        files: Array.from(filesMap.values())
      });
    };

    try {
      const pipe = await pipeline(
        'automatic-speech-recognition',
        modelId,
        {
          device,
          dtype: dtype as 'fp16' | 'fp32' | 'q8',
          progress_callback: progressCallback,
        }
      );
      
      console.log(`[Whisper] Model loaded successfully on ${device.toUpperCase()} with ${dtype}`);
      onProgress?.({ status: 'ready', overallProgress: 100, device, files: Array.from(filesMap.values()) });
      return pipe;
    } catch (error) {
      // If WebGPU fails, try falling back to WASM
      if (device === 'webgpu') {
        console.warn('[Whisper] WebGPU failed, falling back to WASM:', error);
        activeDevice = 'wasm';
        
        try {
          const fallbackDtype = getDtypeForDevice('wasm', config.whisper);
          const pipe = await pipeline(
            'automatic-speech-recognition',
            modelId,
            {
              device: 'wasm',
              dtype: fallbackDtype as 'fp16' | 'fp32' | 'q8',
              progress_callback: progressCallback,
            }
          );
          
          console.log('[Whisper] Model loaded successfully on WASM (fallback)');
          onProgress?.({ status: 'ready', overallProgress: 100, device: 'wasm', files: Array.from(filesMap.values()) });
          return pipe;
        } catch (fallbackError) {
          console.error('[Whisper] WASM fallback also failed:', fallbackError);
          throw fallbackError;
        }
      }
      
      console.error('[Whisper] Failed to load model:', error);
      throw error;
    }
  })();

  try {
    transcriber = await whisperLoadPromise;
    loadedModelTier = currentTier;
    whisperLoading = false;
    return transcriber;
  } catch (error) {
    whisperLoading = false;
    whisperLoadPromise = null;
    throw error;
  }
};

export const isWhisperLoaded = (): boolean => transcriber !== null || usingNative;
export const isWhisperLoading = (): boolean => whisperLoading;
export const getActiveDevice = (): 'webgpu' | 'wasm' | 'native' => activeDevice;
export const isUsingNative = (): boolean => usingNative;
export const getLoadedModelTier = (): ModelTier | null => loadedModelTier;

// Reusable audio context for transcription
let sharedAudioContext: AudioContext | null = null;
const getAudioContext = async (): Promise<AudioContext> => {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext({ sampleRate: 16000 });
  }
  return sharedAudioContext;
};

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioContext = await getAudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const audioData = audioBuffer.getChannelData(0);

  // Use native transcription if available
  if (usingNative && isTauri()) {
    try {
      const audioArray = Array.from(audioData);
      const result = await tauriInvoke<string>('transcribe_audio_native', { audioData: audioArray });
      return result.trim();
    } catch (err) {
      console.error('[Whisper] Native transcription failed:', err);
      throw new Error(`Native transcription failed: ${err}`);
    }
  }

  if (!transcriber) {
    throw new Error('Whisper model not loaded. Call loadWhisperModel() first.');
  }

  const result = await transcriber(audioData) as { text: string } | string;
  
  if (typeof result === 'string') return result.trim();
  if (result && typeof result.text === 'string') return result.text.trim();
  return '';
};
