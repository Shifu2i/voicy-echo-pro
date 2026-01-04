import { useState, useEffect } from 'react';
import { Send, ClipboardPaste, Type, EyeOff } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

// Check if running in Tauri
const isTauri = '__TAURI__' in window;

type InputMethod = 'paste' | 'type' | 'type_delayed';

export const DictationInputSettings = () => {
  const [inputMethod, setInputMethod] = useState<InputMethod>(() => {
    return (localStorage.getItem('dictation-input-method') as InputMethod) || 'paste';
  });
  const [hideWidget, setHideWidget] = useState(() => {
    return localStorage.getItem('dictation-hide-widget') === 'true';
  });
  const [typingDelay, setTypingDelay] = useState(() => {
    return parseInt(localStorage.getItem('dictation-typing-delay') || '20', 10);
  });

  useEffect(() => {
    localStorage.setItem('dictation-input-method', inputMethod);
  }, [inputMethod]);

  useEffect(() => {
    localStorage.setItem('dictation-hide-widget', String(hideWidget));
  }, [hideWidget]);

  useEffect(() => {
    localStorage.setItem('dictation-typing-delay', String(typingDelay));
  }, [typingDelay]);

  if (!isTauri) {
    return null; // Only show in desktop app
  }

  return (
    <div className="bg-muted rounded-2xl p-4">
      <Label className="text-sm font-medium text-foreground flex items-center gap-2">
        <Send className="w-4 h-4" />
        Dictation Input Method
      </Label>
      <p className="text-xs text-muted-foreground mt-1 mb-3">
        Choose how text is inserted into other applications
      </p>
      
      <div className="space-y-2">
        {/* Clipboard Paste */}
        <button
          onClick={() => {
            setInputMethod('paste');
            toast.success('Input method set to Clipboard Paste');
          }}
          className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
            inputMethod === 'paste' 
              ? 'border-primary bg-primary/10' 
              : 'border-transparent bg-background hover:border-muted-foreground/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <ClipboardPaste className="w-4 h-4 text-blue-500" />
            <span className="font-medium text-sm">Clipboard Paste</span>
            <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Recommended</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Fast and reliable. Copies text to clipboard and pastes it.
          </p>
        </button>
        
        {/* Direct Type */}
        <button
          onClick={() => {
            setInputMethod('type');
            toast.success('Input method set to Direct Type');
          }}
          className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
            inputMethod === 'type' 
              ? 'border-primary bg-primary/10' 
              : 'border-transparent bg-background hover:border-muted-foreground/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-orange-500" />
            <span className="font-medium text-sm">Direct Type (Fast)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Simulates keyboard typing. Works in more apps but may miss characters.
          </p>
        </button>
        
        {/* Direct Type with Delay */}
        <button
          onClick={() => {
            setInputMethod('type_delayed');
            toast.success('Input method set to Direct Type (Slow)');
          }}
          className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
            inputMethod === 'type_delayed' 
              ? 'border-primary bg-primary/10' 
              : 'border-transparent bg-background hover:border-muted-foreground/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-purple-500" />
            <span className="font-medium text-sm">Direct Type (Slow)</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Types with a delay between characters. Most compatible with all apps.
          </p>
        </button>
      </div>

      {/* Typing Delay Slider (only for delayed typing) */}
      {inputMethod === 'type_delayed' && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <div className="flex justify-between items-center">
            <label className="text-xs text-muted-foreground">Typing Delay</label>
            <span className="text-xs text-muted-foreground">{typingDelay}ms per character</span>
          </div>
          <Slider
            value={[typingDelay]}
            onValueChange={([v]) => setTypingDelay(v)}
            min={5}
            max={100}
            step={5}
            className="mt-2"
          />
        </div>
      )}

      {/* Hide Widget Option */}
      <div className="mt-4 pt-4 border-t border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-muted-foreground" />
            <div>
              <span className="text-sm font-medium">Hide widget while typing</span>
              <p className="text-xs text-muted-foreground">
                Temporarily hides the widget to focus the target app
              </p>
            </div>
          </div>
          <Switch
            checked={hideWidget}
            onCheckedChange={setHideWidget}
          />
        </div>
      </div>
    </div>
  );
};
