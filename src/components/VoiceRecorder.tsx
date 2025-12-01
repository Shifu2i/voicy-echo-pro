import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';
import { toast } from 'sonner';

interface VoiceRecorderProps {
  onTranscription: (text: string) => void;
}

export const VoiceRecorder = ({ onTranscription }: VoiceRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if Web Speech API is supported
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        }
      }

      if (finalTranscript) {
        onTranscription(finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech') {
        toast.error('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        toast.error('Microphone access denied. Please allow microphone access.');
      } else {
        toast.error('Speech recognition error. Please try again.');
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (isRecording) {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;
  }, [onTranscription, isRecording]);

  const startRecording = () => {
    if (!isSupported) {
      toast.error('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    try {
      recognitionRef.current?.start();
      setIsRecording(true);
      toast.success('Recording started - speak now');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Could not start recording. Please try again.');
    }
  };

  const stopRecording = () => {
    try {
      recognitionRef.current?.stop();
      setIsRecording(false);
      toast.success('Recording stopped');
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!isSupported}
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
            Start Recording
          </>
        )}
      </Button>
    </div>
  );
};
