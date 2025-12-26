import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { VoskRecognizer, isModelLoaded, loadModel, getSelectedMicrophoneId } from '@/services/voskRecognition';
import { loadWhisperModel, transcribeAudio, isWhisperLoaded, checkWebGPUSupport } from '@/services/whisperRecognition';
import { processVoiceCommands } from '@/utils/voiceCommands';
import { Progress } from '@/components/ui/progress';

interface VoiceEditRecorderProps {
  mode: 'delete' | 'replace';
  selectedText: string;
  onEditComplete: (result: string) => void;
  fullText: string;
}

export const VoiceEditRecorder = ({ mode, selectedText, onEditComplete, fullText }: VoiceEditRecorderProps) => {
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
        const hasWebGPU = await checkWebGPUSupport();
        if (!hasWebGPU) {
          setModelStatus('error');
          return;
        }

        if (!isWhisperLoaded()) {
          await loadWhisperModel((progress) => {
            if (progress.progress !== undefined) {
              setLoadProgress(progress.progress);
            }
          });
        }
        
        setModelStatus('ready');

        // Load VOSK in background for preview
        if (!isModelLoaded()) {
          loadModel().then(() => setVoskReady(true)).catch(console.error);
        } else {
          setVoskReady(true);
        }
      } catch (error) {
        console.error('Failed to load Whisper:', error);
        setModelStatus('error');
      }
    };

    loadModels();
  }, []);

  const handleVoskResult = useCallback((text: string, isFinal: boolean) => {
    setPartialText(processVoiceCommands(text));
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

      if (voskReady) {
        recognizerRef.current = new VoskRecognizer(handleVoskResult, deviceId);
        await recognizerRef.current.start();
      }

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
      toast.info(mode === 'delete' ? 'Speak the text you want to delete' : 'Speak the replacement text');
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
    setPartialText('');

    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    try {
      if (audioChunksRef.current.length === 0) {
        toast.error('No audio recorded');
        setIsProcessing(false);
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const transcription = await transcribeAudio(audioBlob);
      
      if (!transcription || !transcription.trim()) {
        toast.error('No speech detected');
        setIsProcessing(false);
        return;
      }

      const transcribedText = processVoiceCommands(transcription.trim());

      if (mode === 'delete') {
        const lowerFullText = fullText.toLowerCase();
        const lowerTranscribed = transcribedText.toLowerCase();
        const index = lowerFullText.indexOf(lowerTranscribed);
        
        if (index !== -1) {
          const newText = fullText.slice(0, index) + fullText.slice(index + transcribedText.length);
          onEditComplete(newText.trim());
          toast.success('Text deleted');
        } else {
          toast.error(`Could not find "${transcribedText}" in the document`);
        }
      } else {
        if (!selectedText) {
          toast.error('Please select text to replace first');
          setIsProcessing(false);
          return;
        }
        
        const newText = fullText.replace(selectedText, transcribedText);
        onEditComplete(newText);
        toast.success('Text replaced');
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      toast.error('Transcription failed');
    } finally {
      setIsProcessing(false);
    }
  };

  if (modelStatus === 'loading') {
    return (
      <div className="p-3 rounded-lg bg-card border border-border">
        <div className="flex items-center gap-2 mb-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-sm">Loading Whisper AI...</span>
        </div>
        <Progress value={loadProgress} className="h-1.5" />
      </div>
    );
  }

  if (modelStatus === 'error') {
    return (
      <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <p className="text-sm text-destructive">WebGPU required</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isProcessing}
        variant={isRecording ? 'destructive' : mode === 'delete' ? 'secondary' : 'default'}
        className={`w-full py-6 text-base rounded-full ${isRecording ? 'recording-pulse glow-recording' : ''}`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Transcribing...
          </>
        ) : isRecording ? (
          <>
            <Square className="mr-2 h-5 w-5" />
            Stop
          </>
        ) : (
          <>
            <Mic className="mr-2 h-5 w-5" />
            {mode === 'delete' ? 'DELETE' : 'REPLACE'}
          </>
        )}
      </Button>

      {partialText && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Preview:</p>
          <p className="text-sm italic">{partialText}...</p>
        </div>
      )}
    </div>
  );
};