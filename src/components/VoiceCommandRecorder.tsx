import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, Undo2, Redo2, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { VoskRecognizer, isModelLoaded, loadModel, getSelectedMicrophoneId } from '@/services/voskRecognition';
import { loadWhisperModel, transcribeAudio, isWhisperLoaded } from '@/services/whisperRecognition';
import { processVoiceCommands } from '@/utils/voiceCommands';
import { 
  parseEditCommand, 
  executeReplaceCommand, 
  executeDeleteCommand,
  executeInsertCommand,
  executeCapitalizeCommand
} from '@/utils/voiceEditCommands';
import { speak, stopSpeaking, getLastSentence, getTextStats, isSpeaking, onSpeakingStateChange } from '@/utils/textToSpeech';
import { Progress } from '@/components/ui/progress';
import { AudioWaveform } from '@/components/AudioWaveform';

interface VoiceCommandRecorderProps {
  fullText: string;
  onEditComplete: (result: string) => void;
  onUndo?: () => string | null;
  onRedo?: () => string | null;
  canUndo?: boolean;
  canRedo?: boolean;
  selectedText?: string;
  lastUtterance?: string;
}

export const VoiceCommandRecorder = ({ 
  fullText, 
  onEditComplete, 
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  selectedText = '',
  lastUtterance = ''
}: VoiceCommandRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  const [voskReady, setVoskReady] = useState(isModelLoaded());
  const [lastAction, setLastAction] = useState<string>('');
  const [isSpeakingState, setIsSpeakingState] = useState(false);
  
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  
  const recognizerRef = useRef<VoskRecognizer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load Whisper (primary) and VOSK (preview) on mount
  useEffect(() => {
    const loadModels = async () => {
      try {
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

  // Track speaking state for visual feedback
  useEffect(() => {
    onSpeakingStateChange(setIsSpeakingState);
    return () => onSpeakingStateChange(null);
  }, []);

  const handleVoskResult = useCallback((text: string) => {
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
      setLastAction('');

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
      toast.info('Say a command like "Replace X with Y"');
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
    setAudioStream(null);

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

      const cleanedTranscription = processVoiceCommands(transcription.trim());
      const command = parseEditCommand(cleanedTranscription);

      switch (command.type) {
        case 'undo': {
          if (onUndo) {
            const previousText = onUndo();
            if (previousText !== null) {
              onEditComplete(previousText);
              toast.success('Undone');
              setLastAction('Undid last change');
            } else {
              toast.error('Nothing to undo');
            }
          }
          setIsProcessing(false);
          return;
        }
        
        case 'redo': {
          if (onRedo) {
            const nextText = onRedo();
            if (nextText !== null) {
              onEditComplete(nextText);
              toast.success('Redone');
              setLastAction('Redid last change');
            } else {
              toast.error('Nothing to redo');
            }
          }
          setIsProcessing(false);
          return;
        }
        
        case 'scratch': {
          if (lastUtterance && fullText.includes(lastUtterance)) {
            const newText = fullText.replace(new RegExp(lastUtterance.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$'), '').trim();
            onEditComplete(newText);
            toast.success('Scratched last phrase');
            setLastAction(`Removed: "${lastUtterance}"`);
          } else {
            toast.error('No recent phrase to scratch');
          }
          setIsProcessing(false);
          return;
        }
        
        case 'word-count': {
          const stats = getTextStats(fullText);
          const message = `${stats.words} words, ${stats.characters} characters, ${stats.sentences} sentences`;
          toast.info(message, { duration: 5000 });
          speak(message);
          setLastAction(message);
          setIsProcessing(false);
          return;
        }
        
        case 'read': {
          if (/^(stop reading|stop)$/i.test(cleanedTranscription)) {
            stopSpeaking();
            toast.info('Stopped reading');
            setLastAction('Stopped reading');
            setIsProcessing(false);
            return;
          }
          
          let textToRead = '';
          if (command.readType === 'back') {
            textToRead = getLastSentence(fullText);
            setLastAction('Reading last sentence');
          } else if (command.readType === 'all') {
            textToRead = fullText;
            setLastAction('Reading document');
          } else if (command.readType === 'selection') {
            if (selectedText) {
              textToRead = selectedText;
              setLastAction('Reading selection');
            } else {
              toast.error('No text selected');
              setIsProcessing(false);
              return;
            }
          }
          
          if (textToRead) {
            speak(textToRead);
            toast.info('Reading aloud...');
          }
          setIsProcessing(false);
          return;
        }
        
        case 'capitalize': {
          const result = executeCapitalizeCommand(fullText, command.target);
          if (result) {
            onEditComplete(result.newText);
            toast.success(`Capitalized "${result.word}"`);
            setLastAction(`Capitalized "${result.word}"`);
          } else {
            toast.error('No word to capitalize');
          }
          setIsProcessing(false);
          return;
        }
        case 'replace': {
          const result = executeReplaceCommand(fullText, command.target!, command.replacement!);
          if (result) {
            onEditComplete(result.newText);
            const msg = result.matchCount > 1 
              ? `Replaced "${command.target}" (${result.matchCount} matches, used last)`
              : `Replaced "${command.target}" with "${command.replacement}"`;
            toast.success(msg);
            setLastAction(`"${command.target}" → "${command.replacement}"`);
          } else {
            toast.error(`Could not find "${command.target}" in the document`);
          }
          break;
        }
        
        case 'delete': {
          const result = executeDeleteCommand(fullText, command.target!);
          if (result) {
            onEditComplete(result.newText);
            const msg = result.matchCount > 1 
              ? `Deleted "${command.target}" (${result.matchCount} matches, removed last)`
              : `Deleted "${command.target}"`;
            toast.success(msg);
            setLastAction(`Deleted "${command.target}"`);
          } else {
            toast.error(`Could not find "${command.target}" in the document`);
          }
          break;
        }
        
        case 'insert': {
          const result = executeInsertCommand(
            fullText, 
            command.target!, 
            command.replacement!, 
            command.position as 'before' | 'after'
          );
          if (result) {
            onEditComplete(result.newText);
            toast.success(`Inserted "${command.replacement}" ${command.position} "${command.target}"`);
            setLastAction(`Inserted "${command.replacement}"`);
          } else {
            toast.error(`Could not find "${command.target}" in the document`);
          }
          break;
        }
        
        default:
          toast.error(`Command not recognized: "${cleanedTranscription}"`);
          toast.info('Try: "Replace X with Y", "Delete X", or "Insert X after Y"');
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      toast.error('Transcription failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUndo = () => {
    if (onUndo) {
      const previousText = onUndo();
      if (previousText !== null) {
        onEditComplete(previousText);
        toast.success('Undone');
        setLastAction('Undid last change');
      }
    }
  };

  const handleRedo = () => {
    if (onRedo) {
      const nextText = onRedo();
      if (nextText !== null) {
        onEditComplete(nextText);
        toast.success('Redone');
        setLastAction('Redid last change');
      }
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
        <p className="text-sm text-destructive">Failed to load model</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          variant={isRecording ? 'destructive' : 'default'}
          className={`flex-1 py-6 text-base rounded-full ${isRecording ? 'recording-pulse glow-recording' : ''}`}
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
              VOICE COMMAND
            </>
          )}
        </Button>
        
        {canUndo && (
          <Button
            onClick={handleUndo}
            disabled={isRecording || isProcessing}
            variant="outline"
            className="py-6 px-4 rounded-full"
            title="Undo"
          >
            <Undo2 className="h-5 w-5" />
          </Button>
        )}
        
        {canRedo && (
          <Button
            onClick={handleRedo}
            disabled={isRecording || isProcessing}
            variant="outline"
            className="py-6 px-4 rounded-full"
            title="Redo"
          >
            <Redo2 className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Audio Waveform Visualizer */}
      {isRecording && (
        <AudioWaveform stream={audioStream} isActive={isRecording} />
      )}

      {/* Speaking Indicator */}
      {isSpeakingState && (
        <button
          onClick={stopSpeaking}
          className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 w-full hover:bg-primary/20 transition-colors"
        >
          <Volume2 className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-sm text-primary">Reading aloud... (tap to stop)</span>
        </button>
      )}

      {partialText && (
        <div className="p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Hearing:</p>
          <p className="text-sm italic">{partialText}...</p>
        </div>
      )}
      
      {lastAction && !isRecording && !isProcessing && (
        <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
          <p className="text-xs text-muted-foreground mb-1">Last action:</p>
          <p className="text-sm font-medium text-primary">{lastAction}</p>
        </div>
      )}
      
      {!isRecording && !isProcessing && !lastAction && (
        <div className="p-3 rounded-lg bg-muted/30 border border-border">
          <p className="text-xs text-muted-foreground mb-1">Example commands:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            <li>• "Replace hello with goodbye"</li>
            <li>• "Delete the word example"</li>
            <li>• "Capitalize that" / "Undo" / "Redo"</li>
            <li>• "Read back" / "Word count"</li>
          </ul>
        </div>
      )}
    </div>
  );
};
