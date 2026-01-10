import { pipeline, AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers';
import { getModelConfig, getModelSize, ModelSize } from '@/utils/modelConfig';

let transcriber: AutomaticSpeechRecognitionPipeline | null = null;
let whisperLoading = false;
let whisperLoadPromise: Promise<AutomaticSpeechRecognitionPipeline> | null = null;
let activeDevice: 'webgpu' | 'wasm' | 'native' = 'wasm';
let loadedModelSize: ModelSize | null = null;
let usingNative = false;

// Check if running in Tauri
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

// Tauri invoke helper
const tauriInvoke = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  if (!isTauri()) throw new Error('Not running in Tauri');
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
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

// Check if native Whisper is available and loaded
export const isNativeWhisperAvailable = async (): Promise<boolean> => {
  if (!isTauri()) return false;
  try {
    return await tauriInvoke<boolean>('is_whisper_model_downloaded');
  } catch {
    return false;
  }
};

// Desktop app - prioritize native Whisper, fallback to WASM
export const loadWhisperModel = async (onProgress?: WhisperProgressCallback): Promise<AutomaticSpeechRecognitionPipeline | null> => {
  const currentSize = getModelSize();
  
  // If model size changed, clear the old model
  if (loadedModelSize !== null && loadedModelSize !== currentSize) {
    clearWhisperModel();
  }
  
  if (transcriber) return transcriber;
  if (usingNative) return null; // Native mode doesn't use transcriber
  if (whisperLoadPromise) return whisperLoadPromise;

  // Try native Whisper first in Tauri
  if (isTauri()) {
    try {
      const isDownloaded = await tauriInvoke<boolean>('is_whisper_model_downloaded');
      
      if (!isDownloaded) {
        // Download native model
        console.log('[Whisper] Downloading native model...');
        if (onProgress) {
          onProgress({ status: 'downloading', progress: 0, overallProgress: 0, device: 'native' as any, files: [] });
        }
        
        await tauriInvoke<string>('download_whisper_model');
      }
      
      // Load native model
      console.log('[Whisper] Loading native model...');
      if (onProgress) {
        onProgress({ status: 'loading', progress: 50, overallProgress: 50, device: 'native' as any, files: [] });
      }
      
      await tauriInvoke<void>('load_whisper_model');
      
      usingNative = true;
      activeDevice = 'native' as any;
      loadedModelSize = currentSize;
      
      console.log('[Whisper] Native model loaded successfully');
      if (onProgress) {
        onProgress({ status: 'ready', overallProgress: 100, device: 'native' as any, files: [] });
      }
      
      return null; // Native mode
    } catch (err) {
      console.warn('[Whisper] Native loading failed, falling back to WASM:', err);
    }
  }

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
          dtype: config.whisper.cpuDtype as 'fp32' | 'q8', // Use config dtype
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

export const isWhisperLoaded = (): boolean => !!transcriber || usingNative;
export const isWhisperLoading = (): boolean => whisperLoading;
export const getActiveDevice = (): 'webgpu' | 'wasm' | 'native' => activeDevice;
export const isUsingNative = (): boolean => usingNative;

export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  // Convert blob to array buffer then to audio data
  const arrayBuffer = await audioBlob.arrayBuffer();
  
  // Decode audio using AudioContext
  const audioContext = new AudioContext({ sampleRate: 16000 });
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  // Get audio data as Float32Array
  const audioData = audioBuffer.getChannelData(0);
  
  await audioContext.close();

  // Use native transcription if available
  if (usingNative && isTauri()) {
    try {
      // Convert Float32Array to regular array for Tauri
      const audioArray = Array.from(audioData);
      const result = await tauriInvoke<string>('transcribe_audio_native', { audioData: audioArray });
      return result.trim();
    } catch (err) {
      console.error('[Whisper] Native transcription failed:', err);
      throw new Error(`Native transcription failed: ${err}`);
    }
  }

  // Use WASM transcriber
  if (!transcriber) {
    throw new Error('Whisper model not loaded. Call loadWhisperModel() first.');
  }

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
