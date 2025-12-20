import { createModel, KaldiRecognizer, Model } from 'vosk-browser';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const MODEL_URL = `${SUPABASE_URL}/functions/v1/proxy-model`;

let model: Model | null = null;
let isModelLoading = false;
let modelLoadPromise: Promise<Model> | null = null;

export interface VoskProgress {
  loaded: number;
  total: number;
  percent: number;
}

export type ProgressCallback = (progress: VoskProgress) => void;
export type ResultCallback = (text: string, isFinal: boolean) => void;

const CACHE_DB_NAME = 'vosk-model-cache';
const CACHE_STORE_NAME = 'models';
const MODEL_KEY = 'vosk-model-small-en-us-0.15';

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

const getCachedModel = async (): Promise<ArrayBuffer | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(CACHE_STORE_NAME, 'readonly');
      const store = transaction.objectStore(CACHE_STORE_NAME);
      const request = store.get(MODEL_KEY);
      request.onerror = () => resolve(null);
      request.onsuccess = () => resolve(request.result || null);
    });
  } catch {
    return null;
  }
};

const cacheModel = async (data: ArrayBuffer): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction(CACHE_STORE_NAME, 'readwrite');
    const store = transaction.objectStore(CACHE_STORE_NAME);
    store.put(data, MODEL_KEY);
  } catch {
    console.warn('Failed to cache model');
  }
};

const fetchModelWithAuth = async (onProgress?: ProgressCallback): Promise<ArrayBuffer> => {
  const response = await fetch(MODEL_URL, {
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

export const loadModel = async (onProgress?: ProgressCallback): Promise<Model> => {
  if (model) return model;
  if (modelLoadPromise) return modelLoadPromise;

  isModelLoading = true;
  
  modelLoadPromise = (async () => {
    // Check cache first
    let modelData = await getCachedModel();
    
    if (modelData) {
      if (onProgress) onProgress({ loaded: 100, total: 100, percent: 100 });
    } else {
      modelData = await fetchModelWithAuth(onProgress);
      await cacheModel(modelData);
    }
    
    const blob = new Blob([modelData], { type: 'application/zip' });
    const blobUrl = URL.createObjectURL(blob);
    const loadedModel = await createModel(blobUrl);
    URL.revokeObjectURL(blobUrl);
    return loadedModel;
  })();

  try {
    model = await modelLoadPromise;
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
