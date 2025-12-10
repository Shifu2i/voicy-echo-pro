import { createModel, KaldiRecognizer, Model } from 'vosk-browser';

// Local model bundled with the app - place in public/models/
const MODEL_URL = '/models/vosk-model-small-en-us-0.15.zip';

let model: Model | null = null;
let isModelLoading = false;
let modelLoadPromise: Promise<Model> | null = null;

export type ResultCallback = (text: string, isFinal: boolean) => void;

export const loadModel = async (): Promise<Model> => {
  if (model) return model;
  if (modelLoadPromise) return modelLoadPromise;

  isModelLoading = true;
  
  modelLoadPromise = (async () => {
    const loadedModel = await createModel(MODEL_URL);
    return loadedModel;
  })();

  try {
    model = await modelLoadPromise;
    isModelLoading = false;
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

  constructor(onResult: ResultCallback) {
    this.onResult = onResult;
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

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (this.recognizer && this.isRunning) {
          const inputData = event.inputBuffer.getChannelData(0);
          // Convert Float32Array to AudioBuffer format expected by VOSK
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
    
    // Get final result
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
