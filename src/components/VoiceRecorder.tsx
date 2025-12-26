import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { VoskRecognizer, isModelLoaded, loadModel, getSelectedMicrophoneId } from '@/services/voskRecognition';
import { loadWhisperModel, transcribeAudio, isWhisperLoaded, checkWebGPUSupport, WhisperProgressCallback } from '@/services/whisperRecognition';
import { processVoiceCommands } from '@/utils/voiceCommands';
import { Progress } from '@/components/ui/progress';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  const [voskReady, setVoskReady] = useState(isModelLoaded());
  
  const recognizerRef = useRef<VoskRecognizer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load Whisper (primary) and VOSK (preview) on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        // Check WebGPU support for Whisper
        const hasWebGPU = await checkWebGPUSupport();
        if (!hasWebGPU) {
          setModelStatus('error');
          toast.error('WebGPU not supported - voice transcription unavailable');
          return;
        }

        // Load Whisper as primary model
        if (!isWhisperLoaded()) {
          const progressCallback: WhisperProgressCallback = (progress) => {
            if (progress.progress !== undefined) {
              setLoadProgress(progress.progress);
            }
          };
          await loadWhisperModel(progressCallback);
        }
        
        setModelStatus('ready');

        // Load VOSK in background for real-time preview
        if (!isModelLoaded()) {
          loadModel().then(() => setVoskReady(true)).catch(console.error);
        } else {
          setVoskReady(true);
        }
      } catch (error) {
        console.error('Failed to load Whisper:', error);
        setModelStatus('error');
        toast.error('Failed to load voice model');
      }
    };

    loadModels();
  }, []);

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
    if (modelStatus !== 'ready') {
      toast.error('Voice model is still loading');
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

      // Start VOSK for real-time preview if available
      if (voskReady) {
        recognizerRef.current = new VoskRecognizer(handleVoskResult, deviceId);
        await recognizerRef.current.start();
      }

      // Start MediaRecorder for Whisper
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
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
    }
  };

  if (modelStatus === 'loading') {
    return (
      <div className="p-4 rounded-xl bg-card border border-border">
        <div className="flex items-center gap-3 mb-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <div>
            <p className="text-sm font-medium">Loading Whisper AI...</p>
            <p className="text-xs text-muted-foreground">One-time download for offline use</p>
          </div>
        </div>
        <Progress value={loadProgress} className="h-2" />
        <p className="text-xs text-muted-foreground mt-2 text-right">{loadProgress}%</p>
      </div>
    );
  }

  if (modelStatus === 'error') {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
        <p className="text-sm text-destructive">WebGPU required for voice transcription</p>
        <p className="text-xs text-muted-foreground mt-1">Please use a browser with WebGPU support (Chrome 113+)</p>
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
