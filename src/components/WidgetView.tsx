import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, X, Trash2, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';
import { ModelLoader } from './ModelLoader';
import { VoskRecognizer, isModelLoaded, getSelectedMicrophoneId } from '@/services/voskRecognition';
import { loadWhisperModel, transcribeAudio, isWhisperLoaded, checkWebGPUSupport } from '@/services/whisperRecognition';
import { useKeyboardShortcuts, formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { ShortcutSettings } from './ShortcutSettings';

// Type declarations for Electron API
declare global {
  interface Window {
    electronAPI?: {
      isElectron: boolean;
      platform: string;
      typeText: (text: string) => Promise<{ success: boolean; method?: string; error?: string; message?: string }>;
      typeTextWithDelay: (text: string, delayMs?: number) => Promise<{ success: boolean; method?: string; error?: string }>;
      pasteText: (text: string) => Promise<{ success: boolean; method?: string; error?: string; message?: string }>;
      copyToClipboard: (text: string) => { success: boolean };
      minimizeWindow: () => void;
      closeWindow: () => void;
      setAlwaysOnTop: (value: boolean) => void;
      getAlwaysOnTop: () => Promise<boolean>;
      onToggleDictation: (callback: () => void) => () => void;
      onStopDictation: (callback: () => void) => () => void;
    };
  }
}

export const WidgetView = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isModelReady, setIsModelReady] = useState(isModelLoaded());
  const [isPolishing, setIsPolishing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [lastTranscription, setLastTranscription] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [whisperStatus, setWhisperStatus] = useState<'idle' | 'loading' | 'ready' | 'unsupported'>('idle');
  
  const recognizerRef = useRef<VoskRecognizer | null>(null);
  const recordedTextRef = useRef<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load Whisper model in background
  const loadWhisperInBackground = useCallback(async () => {
    if (isWhisperLoaded()) {
      setWhisperStatus('ready');
      return;
    }

    const hasWebGPU = await checkWebGPUSupport();
    if (!hasWebGPU) {
      setWhisperStatus('unsupported');
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

  // Type text to active application
  const typeToActiveApp = useCallback(async (text: string) => {
    if (!text.trim()) return;

    if (window.electronAPI) {
      const result = await window.electronAPI.typeText(text);
      
      if (result.success) {
        if (result.method === 'clipboard-only') {
          toast.info('Text copied to clipboard - press Ctrl+V to paste');
        }
      } else {
        toast.error('Failed to type text: ' + result.error);
      }
    }
  }, []);

  const handleResult = useCallback((text: string, isFinal: boolean) => {
    if (isFinal && text.trim()) {
      recordedTextRef.current += text + ' ';
      setLastTranscription(prev => prev + text + ' ');
      
      // Type to active app in real-time
      typeToActiveApp(text + ' ');
      
      setPartialText('');
    } else {
      setPartialText(text);
    }
  }, [typeToActiveApp]);

  const startRecording = async () => {
    if (!isModelReady) {
      toast.error('Voice model is still loading');
      return;
    }

    try {
      recordedTextRef.current = '';
      audioChunksRef.current = [];
      setLastTranscription('');

      const deviceId = getSelectedMicrophoneId();
      recognizerRef.current = new VoskRecognizer(handleResult, deviceId);
      await recognizerRef.current.start();

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
    setPartialText('');

    if (recognizerRef.current) {
      recognizerRef.current.stop();
      recognizerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }

    // Polish with Whisper if available
    if (whisperStatus === 'ready' && audioChunksRef.current.length > 0) {
      setIsPolishing(true);
      try {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const polishedText = await transcribeAudio(audioBlob);
        
        if (polishedText && polishedText.trim()) {
          setLastTranscription(polishedText);
        }
      } catch (error) {
        console.error('Whisper polish failed:', error);
      } finally {
        setIsPolishing(false);
      }
    }
  };

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording]);

  const handleModelReady = useCallback(() => {
    setIsModelReady(true);
    loadWhisperInBackground();
  }, [loadWhisperInBackground]);

  const handleDelete = useCallback(() => {
    setLastTranscription('');
    recordedTextRef.current = '';
    toast.success('Cleared');
  }, []);

  const handleReplace = useCallback(() => {
    if (lastTranscription && window.electronAPI) {
      window.electronAPI.copyToClipboard(lastTranscription);
      toast.success('Copied - paste to replace');
    }
  }, [lastTranscription]);

  // Keyboard shortcuts
  const { shortcuts, updateShortcut, resetShortcuts } = useKeyboardShortcuts(
    toggleRecording,
    handleDelete,
    handleReplace,
    isModelReady && !isPolishing
  );

  // Listen for global hotkey events from main process
  useEffect(() => {
    if (!window.electronAPI) return;

    const unsubscribeToggle = window.electronAPI.onToggleDictation(toggleRecording);
    const unsubscribeStop = window.electronAPI.onStopDictation(() => {
      if (isRecording) stopRecording();
    });

    return () => {
      unsubscribeToggle();
      unsubscribeStop();
    };
  }, [toggleRecording, isRecording]);

  // Compact floating mode - just 3 buttons + settings
  if (!isExpanded && !isRecording && isModelReady) {
    return (
      <div 
        className="h-screen w-screen overflow-hidden select-none bg-background/90 backdrop-blur-md rounded-full relative"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div 
          className="h-full flex items-center justify-center gap-2 px-3"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Mic button */}
          <Button
            onClick={toggleRecording}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
            title={`Start dictation (${formatShortcut(shortcuts.mic)})`}
          >
            <Mic className="h-5 w-5" />
          </Button>

          {/* Delete button */}
          <Button
            onClick={handleDelete}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
            title={`Clear last transcription (${formatShortcut(shortcuts.delete)})`}
            disabled={!lastTranscription}
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          {/* Replace button */}
          <Button
            onClick={handleReplace}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
            title={`Copy to clipboard for replace (${formatShortcut(shortcuts.replace)})`}
            disabled={!lastTranscription}
          >
            <RefreshCw className="h-5 w-5" />
          </Button>

          {/* Settings button */}
          <ShortcutSettings
            shortcuts={shortcuts}
            onUpdateShortcut={updateShortcut}
            onReset={resetShortcuts}
          />

          {/* Expand button */}
          <Button
            onClick={() => setIsExpanded(true)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full opacity-50 hover:opacity-100 transition-opacity"
            title="Expand view"
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Expanded mode / Recording mode / Loading mode
  return (
    <div className="h-screen w-screen overflow-hidden select-none">
      {/* Custom titlebar / drag area */}
      <div 
        className="h-8 bg-background/80 backdrop-blur-sm flex items-center justify-between px-2 border-b border-border/50"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Mic className="h-3 w-3" />
          <span className="font-medium">Voice Widget</span>
          {whisperStatus === 'ready' && (
            <span className="text-[10px] text-primary">✨</span>
          )}
        </div>
        
        <div 
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {isModelReady && !isRecording && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-muted"
              onClick={() => setIsExpanded(false)}
              title="Compact mode"
            >
              <Minimize2 className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-destructive/20 hover:text-destructive"
            onClick={() => window.electronAPI?.closeWindow()}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col h-[calc(100%-2rem)] p-3 gap-2 bg-background/95 backdrop-blur-md">
        {!isModelReady ? (
          <div className="flex-1 flex items-center justify-center">
            <ModelLoader onModelReady={handleModelReady} />
          </div>
        ) : (
          <>
            {/* Recording button */}
            <div className="flex justify-center">
              <Button
                onClick={toggleRecording}
                disabled={!isModelReady || isPolishing}
                variant={isRecording ? 'destructive' : 'default'}
                size="lg"
                className={`
                  w-full max-w-[200px] h-14 rounded-full text-sm font-medium
                  transition-all duration-300
                  ${isRecording ? 'animate-pulse shadow-lg shadow-destructive/30' : 'shadow-md'}
                `}
              >
                {isPolishing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Polishing
                  </>
                ) : isRecording ? (
                  <>
                    <Square className="mr-2 h-4 w-4" />
                    Stop
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Dictate
                  </>
                )}
              </Button>
            </div>

            {/* Status and transcription preview */}
            <div className="flex-1 overflow-hidden">
              {/* Partial/live text */}
              {partialText && (
                <div className="p-2 rounded-md bg-muted/50 text-xs text-muted-foreground italic mb-2 truncate">
                  {partialText}...
                </div>
              )}

              {/* Last transcription preview */}
              {lastTranscription && !isRecording && (
                <div className="p-2 rounded-md bg-muted/30 border border-border/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Last</span>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={handleDelete}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={handleReplace}
                        title="Copy to replace"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs line-clamp-2">{lastTranscription}</p>
                </div>
              )}
            </div>

            {/* Footer status */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              {whisperStatus === 'loading' && (
                <>
                  <Loader2 className="h-2 w-2 animate-spin" />
                  <span>Loading AI...</span>
                </>
              )}
              {isRecording && (
                <span className="text-destructive">● Recording</span>
              )}
              {!isRecording && !isPolishing && isModelReady && (
                <span>{formatShortcut(shortcuts.mic)} to toggle</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default WidgetView;
