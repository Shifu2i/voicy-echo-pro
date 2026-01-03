import { createModel, KaldiRecognizer, Model } from 'vosk-browser';
import { getModelConfig, getModelSize, ModelSize } from '@/utils/modelConfig';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

let model: Model | null = null;
let isModelLoading = false;
let modelLoadPromise: Promise<Model> | null = null;
let loadedModelSize: ModelSize | null = null;

export interface VoskProgress {
  loaded: number;
  total: number;
  percent: number;
}

export type ProgressCallback = (progress: VoskProgress) => void;
export type ResultCallback = (text: string, isFinal: boolean) => void;

const CACHE_DB_NAME = 'vosk-model-cache';
const CACHE_STORE_NAME = 'models';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME);
      }
    };
  });
};

const getCachedModel = async (modelKey: string): Promise<ArrayBuffer | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(CACHE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.get(modelKey);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch {
    return null;
  }
};

const cacheModel = async (modelKey: string, data: ArrayBuffer): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);
    store.put(data, modelKey);
  } catch {
    console.warn('Failed to cache model');
  }
};

const fetchModelWithAuth = async (modelUrl: string, onProgress?: ProgressCallback): Promise<ArrayBuffer> => {
  const proxyUrl = `${SUPABASE_URL}/functions/v1/proxy-model?model=${encodeURIComponent(modelUrl)}`;
  
  const response = await fetch(proxyUrl, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
  });
  
  if (!response.ok) throw new Error(`Failed to download model: ${response.status}`);
  
  const contentLength = response.headers.get('content-length');
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Failed to read response');
  
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (onProgress && total > 0) {
      onProgress({ loaded, total, percent: Math.round((loaded / total) * 100) });
    }
  }
  
  const result = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result.buffer;
};

// Check if model needs reload due to size change
export const voskNeedsReload = (): boolean => {
  return loadedModelSize !== null && loadedModelSize !== getModelSize();
};

// Clear loaded model to force reload
export const clearVoskModel = (): void => {
  model = null;
  modelLoadPromise = null;
  loadedModelSize = null;
};

export const loadModel = async (onProgress?: ProgressCallback): Promise<Model> => {
  const currentSize = getModelSize();
  
  // If model size changed, clear the old model
  if (loadedModelSize !== null && loadedModelSize !== currentSize) {
    clearVoskModel();
  }
  
  if (model) return model;
  if (modelLoadPromise) return modelLoadPromise;

  isModelLoading = true;
  const config = getModelConfig();
  const modelKey = config.vosk.modelKey;
  const modelUrl = config.vosk.modelUrl;
  
  console.log(`[VOSK] Loading model: ${modelKey}`);
  
  modelLoadPromise = (async () => {
    // Check cache first
    let modelData = await getCachedModel(modelKey);
    
    if (modelData) {
      console.log(`[VOSK] Found cached model: ${modelKey}`);
      if (onProgress) onProgress({ loaded: 100, total: 100, percent: 100 });
    } else {
      console.log(`[VOSK] Downloading model: ${modelKey}`);
      modelData = await fetchModelWithAuth(modelUrl, onProgress);
      await cacheModel(modelKey, modelData);
    }
    
    const blob = new Blob([modelData], { type: 'application/zip' });
    const blobUrl = URL.createObjectURL(blob);
    const loadedModel = await createModel(blobUrl);
    URL.revokeObjectURL(blobUrl);
    return loadedModel;
  })();

  try {
    model = await modelLoadPromise;
    loadedModelSize = currentSize;
    isModelLoading = false;
    if (onProgress) {
      onProgress({ loaded: 100, total: 100, percent: 100 });
    }
    return model;
  } catch (error) {
    isModelLoading = false;
    modelLoadPromise = null;
    throw error;
  }
};

export const isModelLoaded = (): boolean => !!model;
export const isLoading = (): boolean => isModelLoading;

export class VoskRecognizer {
  private recognizer: KaldiRecognizer | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private onResult: ResultCallback;
  private isRunning = false;
  private deviceId?: string;

  constructor(onResult: ResultCallback, deviceId?: string) {
    this.onResult = onResult;
    this.deviceId = deviceId;
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    
    if (!model) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    try {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      
      this.recognizer = new model.KaldiRecognizer(this.audioContext.sampleRate);
      
      this.recognizer.on('result', (message: any) => {
        const result = message.result;
        if (result && result.text && result.text.trim()) {
          this.onResult(result.text, true);
        }
      });

      this.recognizer.on('partialresult', (message: any) => {
        const partial = message.result;
        if (partial && partial.partial && partial.partial.trim()) {
          this.onResult(partial.partial, false);
        }
      });

      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 16000
      };

      // Use specific device if provided
      if (this.deviceId) {
        audioConstraints.deviceId = { exact: this.deviceId };
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (this.recognizer && this.isRunning) {
          const inputData = event.inputBuffer.getChannelData(0);
          const buffer = this.audioContext!.createBuffer(1, inputData.length, this.audioContext!.sampleRate);
          buffer.copyToChannel(inputData, 0);
          this.recognizer.acceptWaveform(buffer);
        }
      };

      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);
      
      this.isRunning = true;
    } catch (error) {
      this.cleanup();
      throw error;
    }
  }

  stop(): void {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.recognizer) {
      this.recognizer.retrieveFinalResult();
    }
    
    this.cleanup();
  }

  private cleanup(): void {
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    if (this.recognizer) {
      this.recognizer.remove();
      this.recognizer = null;
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// Helper to get selected microphone ID from localStorage
export const getSelectedMicrophoneId = (): string | undefined => {
  return localStorage.getItem('selectedMicrophoneId') || undefined;
};
