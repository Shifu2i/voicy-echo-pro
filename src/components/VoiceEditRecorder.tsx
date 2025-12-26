import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { VoskRecognizer, isModelLoaded, loadModel, getSelectedMicrophoneId } from '@/services/voskRecognition';
import { loadWhisperModel, transcribeAudio, isWhisperLoaded, checkWebGPUSupport } from '@/services/whisperRecognition';
import { processVoiceCommands } from '@/utils/voiceCommands';

interface VoiceEditRecorderProps {
  mode: 'delete' | 'replace';
  selectedText: string;
  onEditComplete: (result: string) => void;
  fullText: string;
}

export const VoiceEditRecorder = ({ mode, selectedText, onEditComplete, fullText }: VoiceEditRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelReady, setIsModelReady] = useState(isModelLoaded());
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const recognizerRef = useRef<VoskRecognizer | null>(null);
  const recordedTextRef = useRef<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load model on mount if not ready
  useEffect(() => {
    if (!isModelReady) {
      loadModel().then(() => {
        setIsModelReady(true);
        // Try loading Whisper in background
        checkWebGPUSupport().then(hasWebGPU => {
          if (hasWebGPU && !isWhisperLoaded()) {
            loadWhisperModel().catch(console.error);
          }
        });
      }).catch(console.error);
    }
  }, [isModelReady]);

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal) {
      const processed = processVoiceCommands(text);
      recordedTextRef.current += processed + ' ';
      setPartialText('');
    } else {
      setPartialText(processVoiceCommands(text));
    }
  }, []);

  const startRecording = async () => {
    if (!isModelReady) {
      toast.error('Voice model is still loading. Please wait.');
      return;
    }

    try {
      recordedTextRef.current = '';
      audioChunksRef.current = [];

      // Get selected microphone
      const deviceId = getSelectedMicrophoneId();

      // Start VOSK recognizer with selected mic
      recognizerRef.current = new VoskRecognizer(handleResult, deviceId);
      await recognizerRef.current.start();

      // Build audio constraints with selected device
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true
      };
      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      
      if (mode === 'delete') {
        toast.info('Speak the text you want to delete');
      } else {
        toast.info('Speak the replacement text');
      }
    } catch (error: any) {
      console.error('Error starting recording:', error);
      if (error.name === 'NotAllowedError') {
        toast.error('Microphone access denied');
      } else if (error.name === 'OverconstrainedError') {
        toast.error('Selected microphone not available');
      } else {
        toast.error('Could not start recording');
      }
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setPartialText('');
    setIsProcessing(true);

    // Stop VOSK
    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }

    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    try {
      let transcribedText = recordedTextRef.current.trim();

      // Try Whisper polish if available
      if (isWhisperLoaded() && audioChunksRef.current.length > 0) {
        try {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const polishedText = await transcribeAudio(audioBlob);
          if (polishedText && polishedText.trim()) {
            transcribedText = processVoiceCommands(polishedText.trim());
          }
        } catch (e) {
          console.error('Whisper polish failed:', e);
        }
      }

      if (!transcribedText) {
        toast.error('No speech detected');
        setIsProcessing(false);
        return;
      }

      if (mode === 'delete') {
        // Find and remove the spoken text from the document
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
        // Replace mode: replace selected text with transcription
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
      console.error('Processing error:', error);
      toast.error('Failed to process speech');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!isModelReady || isProcessing}
        variant={isRecording ? 'destructive' : mode === 'delete' ? 'secondary' : 'default'}
        className={`w-full py-6 text-base rounded-full ${isRecording ? 'recording-pulse glow-recording' : ''}`}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </>
        ) : isRecording ? (
          <>
            <Square className="mr-2 h-5 w-5" />
            Stop
          </>
        ) : (
          <>
            <Mic className="mr-2 h-5 w-5" />
            {!isModelReady ? 'Loading...' : mode === 'delete' ? 'DELETE' : 'REPLACE'}
          </>
        )}
      </Button>

      {partialText && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground italic">{partialText}...</p>
        </div>
      )}
    </div>
  );
};