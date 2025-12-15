import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { ModelLoader } from './ModelLoader';
import { VoskRecognizer, isModelLoaded } from '@/services/voskRecognition';
import { loadWhisperModel, transcribeAudio, isWhisperLoaded, checkWebGPUSupport } from '@/services/whisperRecognition';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelReady, setIsModelReady] = useState(isModelLoaded());
  const [isPolishing, setIsPolishing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [whisperStatus, setWhisperStatus] = useState<'idle' | 'loading' | 'ready' | 'unsupported'>('idle');
  const recognizerRef = useRef<VoskRecognizer | null>(null);
  const recordedTextRef = useRef<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load Whisper model in background when VOSK is ready
  const loadWhisperInBackground = useCallback(async () => {
    if (isWhisperLoaded()) {
      setWhisperStatus('ready');
      return;
    }

    const hasWebGPU = await checkWebGPUSupport();
    if (!hasWebGPU) {
      setWhisperStatus('unsupported');
      console.log('WebGPU not supported, Whisper polish disabled');
      return;
    }

    setWhisperStatus('loading');
    try {
      await loadWhisperModel();
      setWhisperStatus('ready');
    } catch (error) {
      console.error('Failed to load Whisper:', error);
      setWhisperStatus('unsupported');
    }
  }, []);

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      recordedTextRef.current += text + ' ';
      onTranscription(text + ' ');
      setPartialText('');
    } else {
      setPartialText(text);
    }
  }, [onTranscription]);

  const startRecording = async () => {
    if (!isModelReady) {
      toast.error('Voice model is still loading. Please wait.');
      return;
    }

    try {
      // Reset recorded text
      recordedTextRef.current = '';
      audioChunksRef.current = [];

      // Start VOSK recognizer for real-time
      recognizerRef.current = new VoskRecognizer(handleResult);
      await recognizerRef.current.start();

      // Also start MediaRecorder to capture audio for Whisper
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000); // Collect chunks every second

      setIsRecording(true);
      toast.success('Recording started');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access.');
      } else {
        toast.error('Could not start recording. Please try again.');
      }
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setPartialText('');

    // Stop VOSK
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }

    // Stop MediaRecorder and get audio
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    toast.success('Recording stopped');

    // If Whisper is ready, polish the transcription
    if (whisperStatus === 'ready' && audioChunksRef.current.length > 0) {
      setIsPolishing(true);
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const polishedText = await transcribeAudio(audioBlob);
        
        if (polishedText && polishedText.trim()) {
          // Replace the rough VOSK transcription with polished Whisper version
          const voskText = recordedTextRef.current.trim();
          if (voskText) {
            // Notify parent to replace with polished version
            onTranscription(`\n[Polished]: ${polishedText}`);
          } else {
            onTranscription(polishedText + ' ');
          }
        }
      } catch (error) {
        console.error('Whisper polish failed:', error);
        // Silently fail - VOSK transcription is already shown
      } finally {
        setIsPolishing(false);
      }
    }
  };

  const handleModelReady = useCallback(() => {
    setIsModelReady(true);
    // Start loading Whisper in background
    loadWhisperInBackground();
  }, [loadWhisperInBackground]);

  return (
    <div className="flex flex-col gap-4">
      {!isModelReady && (
        <ModelLoader onModelReady={handleModelReady} />
      )}
      
      <div className="flex items-center justify-center">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isModelReady || isPolishing}
          variant={isRecording ? 'destructive' : 'default'}
          size="lg"
          className={`
            relative overflow-hidden smooth-transition w-full py-6 text-base
            ${isRecording ? 'recording-pulse glow-recording' : ''}
          `}
        >
          {isPolishing ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Polishing transcription...
            </>
          ) : isRecording ? (
            <>
              <Square className="mr-2 h-5 w-5" />
              Stop Recording
            </>
          ) : (
            <>
              <Mic className="mr-2 h-5 w-5" />
              {isModelReady ? 'Start Recording' : 'Loading...'}
            </>
          )}
        </Button>
      </div>

      {partialText && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground italic">{partialText}...</p>
        </div>
      )}

      {whisperStatus === 'loading' && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Loading AI polish model in background...</span>
        </div>
      )}

      {whisperStatus === 'ready' && (
        <div className="text-xs text-muted-foreground text-center">
          ✨ AI polish enabled
        </div>
      )}
    </div>
  );
};
