import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';
import { toast } from 'sonner';
import { ModelLoader } from './ModelLoader';
import { VoskRecognizer, isModelLoaded } from '@/services/voskRecognition';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelReady, setIsModelReady] = useState(isModelLoaded());
  const [partialText, setPartialText] = useState('');
  const recognizerRef = useRef<VoskRecognizer | null>(null);

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
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
      recognizerRef.current = new VoskRecognizer(handleResult);
      await recognizerRef.current.start();
      setIsRecording(true);
      toast.success('Recording started - speak now');
    } catch (error: any) {
      console.error('Error starting recording:', error);
      
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied. Please allow microphone access.');
      } else {
        toast.error('Could not start recording. Please try again.');
      }
    }
  };

  const stopRecording = () => {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }
    setIsRecording(false);
    setPartialText('');
    toast.success('Recording stopped');
  };

  const handleModelReady = useCallback(() => {
    setIsModelReady(true);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {!isModelReady && (
        <ModelLoader onModelReady={handleModelReady} />
      )}
      
      <div className="flex items-center gap-3">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!isModelReady}
          variant={isRecording ? 'destructive' : 'default'}
          size="lg"
          className={`
            relative overflow-hidden smooth-transition
            ${isRecording ? 'recording-pulse glow-recording' : ''}
          `}
        >
          {isRecording ? (
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
    </div>
  );
};
