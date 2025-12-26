import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2, X, Trash2, RefreshCw, Maximize2, Minimize2, ArrowLeft, Send, Clipboard, Keyboard } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { VoskRecognizer, isModelLoaded, loadModel, getSelectedMicrophoneId } from '@/services/voskRecognition';
import { loadWhisperModel, transcribeAudio, isWhisperLoaded, WhisperProgressCallback, getActiveDevice } from '@/services/whisperRecognition';
import { useKeyboardShortcuts, formatShortcut } from '@/hooks/useKeyboardShortcuts';
import { ShortcutSettings } from './ShortcutSettings';
import { processVoiceCommands } from '@/utils/voiceCommands';

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
  const navigate = useNavigate();
  const isElectron = !!window.electronAPI;
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [partialText, setPartialText] = useState('');
  const [lastTranscription, setLastTranscription] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Model status
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadProgress, setLoadProgress] = useState(0);
  const [voskReady, setVoskReady] = useState(isModelLoaded());
  const [whisperDevice, setWhisperDevice] = useState<'webgpu' | 'wasm'>('webgpu');
  
  // Auto-type toggle state
  const [autoTypeEnabled, setAutoTypeEnabled] = useState(() => {
    const saved = localStorage.getItem('widget-auto-type');
    return saved !== null ? saved === 'true' : true;
  });
  
  // Drag state
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('widget-position');
    return saved ? JSON.parse(saved) : { x: 20, y: 20 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  
  // Save auto-type preference
  useEffect(() => {
    localStorage.setItem('widget-auto-type', String(autoTypeEnabled));
  }, [autoTypeEnabled]);
  
  const recognizerRef = useRef<VoskRecognizer | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Load Whisper (primary) and VOSK (preview)
  useEffect(() => {
    const loadModels = async () => {
      try {
        if (!isWhisperLoaded()) {
          const progressCallback: WhisperProgressCallback = (progress) => {
            if (progress.progress !== undefined) {
              setLoadProgress(progress.progress);
            }
            if (progress.device) {
              setWhisperDevice(progress.device);
            }
          };
          await loadWhisperModel(progressCallback);
        }
        
        setWhisperDevice(getActiveDevice());
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

  // VOSK callback for preview only
  const handleVoskResult = useCallback((text: string, isFinal: boolean) => {
    const processed = processVoiceCommands(text);
    setPartialText(processed);
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


  const startRecording = async () => {
    if (modelStatus !== 'ready') {
      toast.error('Voice model is still loading');
      return;
    }

    try {
      audioChunksRef.current = [];
      setLastTranscription('');
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

    try {
      if (audioChunksRef.current.length > 0) {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const transcription = await transcribeAudio(audioBlob);
        
        if (transcription && transcription.trim()) {
          const processed = processVoiceCommands(transcription.trim());
          setLastTranscription(processed);
          
          // Auto-type if enabled
          if (autoTypeEnabled) {
            typeToActiveApp(processed);
          }
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
    }
  };

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording]);

  const handleDelete = useCallback(() => {
    setLastTranscription('');
    toast.success('Cleared');
  }, []);

  const handleReplace = useCallback(() => {
    if (lastTranscription) {
      if (window.electronAPI) {
        window.electronAPI.copyToClipboard(lastTranscription);
      } else {
        navigator.clipboard.writeText(lastTranscription);
      }
      toast.success('Copied - paste to replace');
    }
  }, [lastTranscription]);
  
  // Manual send to active app
  const handleSendToApp = useCallback(async () => {
    if (!lastTranscription.trim()) return;
    
    if (window.electronAPI) {
      const result = await window.electronAPI.typeText(lastTranscription);
      if (result.success) {
        toast.success('Sent to active app');
      } else {
        toast.error('Failed to send: ' + result.error);
      }
    } else {
      await navigator.clipboard.writeText(lastTranscription);
      toast.success('Copied to clipboard - paste manually');
    }
  }, [lastTranscription]);
  
  // Copy to clipboard
  const handleCopyToClipboard = useCallback(async () => {
    if (!lastTranscription.trim()) return;
    
    if (window.electronAPI) {
      window.electronAPI.copyToClipboard(lastTranscription);
    } else {
      await navigator.clipboard.writeText(lastTranscription);
    }
    toast.success('Copied to clipboard');
  }, [lastTranscription]);
  
  // Navigate back
  const handleBack = useCallback(() => {
    navigate('/settings');
  }, [navigate]);

  // Keyboard shortcuts
  const { shortcuts, updateShortcut, resetShortcuts } = useKeyboardShortcuts(
    toggleRecording,
    handleDelete,
    handleReplace,
    modelStatus === 'ready' && !isProcessing
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

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      const newX = Math.max(0, Math.min(window.innerWidth - 100, dragStartRef.current.posX + deltaX));
      const newY = Math.max(0, Math.min(window.innerHeight - 50, dragStartRef.current.posY + deltaY));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      localStorage.setItem('widget-position', JSON.stringify(position));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  // Compact floating mode - just 3 buttons + settings
  if (!isExpanded && !isRecording && modelStatus === 'ready') {
    return (
      <div 
        className={`fixed overflow-hidden select-none bg-background/90 backdrop-blur-md rounded-full shadow-lg border border-border/50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ 
          left: position.x, 
          top: position.y,
          zIndex: 9999
        }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center justify-center gap-2 px-3 py-2">
          {/* Back button */}
          <Button
            onClick={(e) => { e.stopPropagation(); handleBack(); }}
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full opacity-50 hover:opacity-100 transition-opacity"
            title="Back to app"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Mic button */}
          <Button
            onClick={(e) => { e.stopPropagation(); toggleRecording(); }}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
            title={`Start dictation (${formatShortcut(shortcuts.mic)})`}
          >
            <Mic className="h-5 w-5" />
          </Button>

          {/* Delete button */}
          <Button
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors"
            title={`Clear last transcription (${formatShortcut(shortcuts.delete)})`}
            disabled={!lastTranscription}
          >
            <Trash2 className="h-5 w-5" />
          </Button>

          {/* Send to app / Copy button */}
          <Button
            onClick={(e) => { e.stopPropagation(); handleSendToApp(); }}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
            title={isElectron ? "Send to active app" : "Copy to clipboard"}
            disabled={!lastTranscription}
          >
            {isElectron ? <Send className="h-5 w-5" /> : <Clipboard className="h-5 w-5" />}
          </Button>

          {/* Auto-type indicator (Electron only) */}
          {isElectron && (
            <Button
              onClick={(e) => { e.stopPropagation(); setAutoTypeEnabled(!autoTypeEnabled); }}
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-full transition-colors ${autoTypeEnabled ? 'text-primary bg-primary/10' : 'opacity-50'}`}
              title={autoTypeEnabled ? "Auto-type ON (click to disable)" : "Auto-type OFF (click to enable)"}
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          )}

          {/* Settings button */}
          <div onClick={(e) => e.stopPropagation()}>
            <ShortcutSettings
              shortcuts={shortcuts}
              onUpdateShortcut={updateShortcut}
              onReset={resetShortcuts}
            />
          </div>

          {/* Expand button */}
          <Button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(true); }}
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
          {modelStatus === 'ready' && (
            <span className="text-[10px] text-primary">
              ✨ Whisper {whisperDevice === 'wasm' ? '(CPU)' : '(GPU)'}
            </span>
          )}
        </div>
        
        <div 
          className="flex items-center gap-1"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* Back button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-muted"
            onClick={handleBack}
            title="Back to app"
          >
            <ArrowLeft className="h-3 w-3" />
          </Button>
          {modelStatus === 'ready' && !isRecording && (
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
            onClick={isElectron ? () => window.electronAPI?.closeWindow() : handleBack}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col h-[calc(100%-2rem)] p-3 gap-2 bg-background/95 backdrop-blur-md">
        {modelStatus === 'loading' ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium">Loading Whisper AI...</p>
              <p className="text-xs text-muted-foreground">
                {whisperDevice === 'wasm' ? 'Using CPU mode' : 'One-time download'}
              </p>
            </div>
            <Progress value={loadProgress} className="w-32 h-2" />
            <p className="text-xs text-muted-foreground">{loadProgress}%</p>
          </div>
        ) : modelStatus === 'error' ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
              <p className="text-sm text-destructive">Failed to load voice model</p>
              <p className="text-xs text-muted-foreground mt-1">Please refresh and try again</p>
            </div>
          </div>
        ) : (
          <>
            {/* Recording button */}
            <div className="flex justify-center">
              <Button
                onClick={toggleRecording}
                disabled={isProcessing}
                variant={isRecording ? 'destructive' : 'default'}
                size="lg"
                className={`
                  w-full max-w-[200px] h-14 rounded-full text-sm font-medium
                  transition-all duration-300
                  ${isRecording ? 'animate-pulse shadow-lg shadow-destructive/30' : 'shadow-md'}
                `}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transcribing
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
              {/* Partial/live text from VOSK */}
              {partialText && (
                <div className="p-2 rounded-md bg-muted/50 text-xs mb-2">
                  <span className="text-muted-foreground text-[10px]">Preview: </span>
                  <span className="italic">{partialText}...</span>
                </div>
              )}

              {/* Auto-type toggle (Electron only) */}
              {isElectron && !isRecording && (
                <div className="flex items-center justify-between p-2 rounded-md bg-muted/20 mb-2">
                  <div className="flex items-center gap-2">
                    <Keyboard className="h-3 w-3 text-muted-foreground" />
                    <Label htmlFor="auto-type" className="text-xs text-muted-foreground">
                      Auto-type to active app
                    </Label>
                  </div>
                  <Switch
                    id="auto-type"
                    checked={autoTypeEnabled}
                    onCheckedChange={setAutoTypeEnabled}
                    className="scale-75"
                  />
                </div>
              )}

              {/* Browser fallback notice */}
              {!isElectron && !isRecording && (
                <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/30 mb-2">
                  <p className="text-[10px] text-amber-600 dark:text-amber-400">
                    Running in browser mode. Install the desktop app to type directly into other applications.
                  </p>
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
                        onClick={handleCopyToClipboard}
                        title="Copy to clipboard"
                      >
                        <Clipboard className="h-3 w-3" />
                      </Button>
                      {isElectron && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={handleSendToApp}
                          title="Send to active app"
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={handleDelete}
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs line-clamp-2">{lastTranscription}</p>
                </div>
              )}
            </div>

            {/* Footer status */}
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
              {!voskReady && (
                <>
                  <Loader2 className="h-2 w-2 animate-spin" />
                  <span>Loading preview...</span>
                </>
              )}
              {isRecording && (
                <span className="text-destructive">● Recording</span>
              )}
              {!isRecording && !isProcessing && modelStatus === 'ready' && (
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
