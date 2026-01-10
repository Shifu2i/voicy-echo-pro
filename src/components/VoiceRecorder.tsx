import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Download, Clock, Check, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { VoskRecognizer, isModelLoaded, loadModel, getSelectedMicrophoneId } from '@/services/voskRecognition';
import { loadWhisperModel, transcribeAudio, isWhisperLoaded, WhisperProgressCallback, getActiveDevice, FileProgress } from '@/services/whisperRecognition';
import { processVoiceCommands } from '@/utils/voiceCommands';
import { AudioWaveform } from '@/components/AudioWaveform';
import { getModelConfig } from '@/utils/modelConfig';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [modelStatus, setModelStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | undefined>();
  const [currentFile, setCurrentFile] = useState<string>('');
  const [fileProgress, setFileProgress] = useState<FileProgress[]>([]);
  const [voskReady, setVoskReady] = useState(isModelLoaded());
  const [whisperDevice, setWhisperDevice] = useState<'webgpu' | 'wasm'>('wasm');
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  const recognizerRef = useRef<VoskRecognizer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load model on demand (not on mount to prevent crashes)
  const loadModels = async () => {
    if (modelStatus === 'loading' || modelStatus === 'ready') return;
    
    setModelStatus('loading');
    setLoadProgress(0);
    setLoadedBytes(0);
    setTotalBytes(0);
    setTimeRemaining(undefined);
    setCurrentFile('');
    setFileProgress([]);
    
    try {
      if (!isWhisperLoaded()) {
        const progressCallback: WhisperProgressCallback = (progress) => {
          if (progress.overallProgress !== undefined) {
            setLoadProgress(progress.overallProgress);
          }
          if (progress.device) {
            setWhisperDevice(progress.device);
          }
          if (progress.loaded !== undefined) {
            setLoadedBytes(progress.loaded);
          }
          if (progress.total !== undefined) {
            setTotalBytes(progress.total);
          }
          if (progress.estimatedTimeRemaining !== undefined) {
            setTimeRemaining(progress.estimatedTimeRemaining);
          }
          if (progress.file) {
            setCurrentFile(progress.file);
          }
          if (progress.files) {
            setFileProgress(progress.files);
          }
        };
        await loadWhisperModel(progressCallback);
      }
      
      setWhisperDevice(getActiveDevice());
      setModelStatus('ready');
      setVoskReady(isModelLoaded());
    } catch (error) {
      console.error('Failed to load Whisper:', error);
      setModelStatus('error');
      toast.error('Failed to load voice model');
    }
  };

  // VOSK callback for real-time preview only
  const handleVoskResult = useCallback((text: string, isFinal: boolean) => {
    // Only show partial text for preview, don't use as final transcription
    if (!isFinal) {
      setPartialText(processVoiceCommands(text));
    } else {
      // Show final VOSK result as preview until Whisper processes
      setPartialText(processVoiceCommands(text));
    }
  }, []);

  const startRecording = async () => {
    // Load model first if not ready
    if (modelStatus === 'idle') {
      await loadModels();
      return; // User needs to click again after model loads
    }
    
    if (modelStatus === 'loading') {
      toast.error('Voice model is still loading');
      return;
    }
    
    if (modelStatus !== 'ready') {
      toast.error('Voice model failed to load');
      return;
    }

    try {
      audioChunksRef.current = [];
      setPartialText('');

      const deviceId = getSelectedMicrophoneId();
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true
      };
      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId };
      }

      // Load Vosk lazily for real-time preview (if not already loaded)
      if (!voskReady && !isModelLoaded()) {
        // Don't await - load in background
        loadModel()
          .then(() => setVoskReady(true))
          .catch((err) => console.warn('Vosk preview not available:', err));
      }

      // Start VOSK for real-time preview if available
      if (voskReady || isModelLoaded()) {
        try {
          recognizerRef.current = new VoskRecognizer(handleVoskResult, deviceId);
          await recognizerRef.current.start();
        } catch (err) {
          console.warn('Vosk preview failed to start:', err);
        }
      }

      // Start MediaRecorder for Whisper
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      setAudioStream(stream);
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied');
      } else {
        toast.error('Could not start recording');
      }
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setIsProcessing(true);
    setAudioStream(null);

    // Stop VOSK preview
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    toast.success('Processing with Whisper...');

    try {
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const transcription = await transcribeAudio(audioBlob);
        
        if (transcription && transcription.trim()) {
          const processed = processVoiceCommands(transcription.trim());
          onTranscription(processed + ' ');
          setPartialText('');
        } else {
          toast.error('No speech detected');
        }
      } else {
        toast.error('No audio recorded');
      }
    } catch (error) {
      console.error('Whisper transcription failed:', error);
      toast.error('Transcription failed');
    } finally {
      setIsProcessing(false);
      setPartialText('');
      audioChunksRef.current = [];
    }
  };

  // Helper functions for formatting
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    const mins = Math.floor(seconds / 60);
    const secs = Math.ceil(seconds % 60);
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  };

  const config = getModelConfig();

  if (modelStatus === 'idle') {
    return (
      <div className="flex flex-col gap-4">
        <Button
          onClick={loadModels}
          size="lg"
          className="w-full py-6 text-base rounded-full"
        >
          <Mic className="mr-2 h-5 w-5" />
          Tap to Enable Voice
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Downloads {config.whisper.size} voice model (one-time)
        </p>
      </div>
    );
  }

  if (modelStatus === 'loading') {
    const hasDetailedProgress = totalBytes > 0;
    const downloadSpeed = timeRemaining && loadedBytes > 0 && totalBytes > loadedBytes
      ? (totalBytes - loadedBytes) / timeRemaining
      : 0;

    // Sort files: downloading first, then done, then pending
    const sortedFiles = [...fileProgress].sort((a, b) => {
      const order = { downloading: 0, pending: 1, done: 2 };
      return order[a.status] - order[b.status];
    });

    return (
      <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Download className="h-5 w-5 text-primary" />
            <div className="absolute inset-0 h-5 w-5 text-primary animate-ping opacity-30">
              <Download className="h-5 w-5" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Downloading {config.whisper.displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              One-time download • Cached for offline use
            </p>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadProgress}%` }}
            />
            {/* Animated shimmer effect */}
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
              style={{ width: `${loadProgress}%` }}
            />
          </div>

          {/* Stats Row */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              {hasDetailedProgress ? (
                <span>{formatBytes(loadedBytes)} / {formatBytes(totalBytes)}</span>
              ) : (
                <span>Initializing...</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {downloadSpeed > 0 && (
                <span className="text-muted-foreground/70">
                  {formatBytes(downloadSpeed)}/s
                </span>
              )}
              {timeRemaining !== undefined && timeRemaining > 0 && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(timeRemaining)}
                </span>
              )}
              <span className="font-medium text-foreground min-w-[3ch] text-right">
                {loadProgress}%
              </span>
            </div>
          </div>
        </div>

        {/* File Breakdown */}
        {sortedFiles.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground">Files</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {sortedFiles.map((file) => (
                <div 
                  key={file.name} 
                  className={`flex items-center gap-2 text-xs p-2 rounded-lg transition-colors ${
                    file.status === 'done' 
                      ? 'bg-primary/10' 
                      : file.status === 'downloading' 
                        ? 'bg-muted' 
                        : 'bg-muted/50'
                  }`}
                >
                  {/* Status Icon */}
                  <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
                    {file.status === 'done' ? (
                      <Check className="h-3.5 w-3.5 text-primary" />
                    ) : file.status === 'downloading' ? (
                      <FileDown className="h-3.5 w-3.5 text-primary animate-pulse" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  
                  {/* File Name */}
                  <span className={`flex-1 truncate ${
                    file.status === 'done' 
                      ? 'text-primary' 
                      : file.status === 'downloading'
                        ? 'text-foreground'
                        : 'text-muted-foreground'
                  }`}>
                    {file.name}
                  </span>
                  
                  {/* Progress or Size */}
                  <div className="flex-shrink-0 text-right min-w-[80px]">
                    {file.status === 'done' ? (
                      <span className="text-primary">{formatBytes(file.total)}</span>
                    ) : file.status === 'downloading' && file.total > 0 ? (
                      <span className="text-muted-foreground">
                        {formatBytes(file.loaded)} / {formatBytes(file.total)}
                      </span>
                    ) : file.total > 0 ? (
                      <span className="text-muted-foreground/70">{formatBytes(file.total)}</span>
                    ) : (
                      <span className="text-muted-foreground/50">...</span>
                    )}
                  </div>
                  
                  {/* Individual Progress Bar for downloading files */}
                  {file.status === 'downloading' && file.total > 0 && (
                    <div className="flex-shrink-0 w-12 h-1.5 bg-muted-foreground/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${Math.round((file.loaded / file.total) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (modelStatus === 'error') {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
        <p className="text-sm text-destructive">Failed to load voice model</p>
        <Button 
          onClick={() => setModelStatus('idle')} 
          variant="outline" 
          size="sm" 
          className="mt-2"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-center">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          variant={isRecording ? 'destructive' : 'default'}
          size="lg"
          className={`
            relative overflow-hidden smooth-transition w-full py-6 text-base rounded-full
            ${isRecording ? 'recording-pulse glow-recording' : ''}
          `}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Transcribing...
            </>
          ) : isRecording ? (
            <>
              <Square className="mr-2 h-5 w-5" />
              STOP
            </>
          ) : (
            <>
              <Mic className="mr-2 h-5 w-5" />
              DICTATE
            </>
          )}
        </Button>
      </div>

      {/* Audio Waveform Visualizer */}
      {isRecording && (
        <AudioWaveform stream={audioStream} isActive={isRecording} />
      )}

      {partialText && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Preview (VOSK):</p>
          <p className="text-sm italic">{partialText}...</p>
        </div>
      )}

      {!voskReady && modelStatus === 'ready' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Loading real-time preview...</span>
        </div>
      )}
    </div>
  );
};
