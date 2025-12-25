import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, X, RotateCcw, Mic, Trash2, RefreshCw } from 'lucide-react';
import { ShortcutConfig, formatShortcut, parseKeyEvent } from '@/hooks/useKeyboardShortcuts';

interface ShortcutSettingsProps {
  shortcuts: ShortcutConfig;
  onUpdateShortcut: (key: keyof ShortcutConfig, value: string) => void;
  onReset: () => void;
}

const ShortcutButton = ({
  label,
  icon: Icon,
  shortcut,
  onCapture,
}: {
  label: string;
  icon: React.ElementType;
  shortcut: string;
  onCapture: (shortcut: string) => void;
}) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedKeys, setCapturedKeys] = useState('');

  useEffect(() => {
    if (!isCapturing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      const parsed = parseKeyEvent(e);
      setCapturedKeys(parsed);
      
      // Only accept shortcuts with at least one modifier
      if (e.ctrlKey || e.metaKey || e.altKey) {
        const key = e.key.toLowerCase();
        if (!['control', 'alt', 'shift', 'meta'].includes(key)) {
          onCapture(parsed);
          setIsCapturing(false);
          setCapturedKeys('');
        }
      }
    };

    const handleKeyUp = () => {
      // Reset if user releases without completing
      setTimeout(() => {
        if (isCapturing) {
          setCapturedKeys('');
        }
      }, 100);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isCapturing, onCapture]);

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">{label}</span>
      </div>
      <Button
        variant={isCapturing ? 'secondary' : 'outline'}
        size="sm"
        className="min-w-[120px] text-xs font-mono"
        onClick={() => setIsCapturing(!isCapturing)}
      >
        {isCapturing 
          ? (capturedKeys ? formatShortcut(capturedKeys) : 'Press keys...')
          : formatShortcut(shortcut)
        }
      </Button>
    </div>
  );
};

export const ShortcutSettings = ({ shortcuts, onUpdateShortcut, onReset }: ShortcutSettingsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleCapture = useCallback((key: keyof ShortcutConfig) => (value: string) => {
    onUpdateShortcut(key, value);
  }, [onUpdateShortcut]);

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="icon"
        className="h-8 w-8 rounded-full opacity-50 hover:opacity-100 transition-opacity"
        title="Keyboard shortcuts"
      >
        <Settings className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div 
      className="absolute inset-0 bg-background/95 backdrop-blur-md rounded-2xl p-3 flex flex-col"
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">Keyboard Shortcuts</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-1">
        <ShortcutButton
          label="Toggle mic"
          icon={Mic}
          shortcut={shortcuts.mic}
          onCapture={handleCapture('mic')}
        />
        <ShortcutButton
          label="Delete"
          icon={Trash2}
          shortcut={shortcuts.delete}
          onCapture={handleCapture('delete')}
        />
        <ShortcutButton
          label="Replace"
          icon={RefreshCw}
          shortcut={shortcuts.replace}
          onCapture={handleCapture('replace')}
        />
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="w-full mt-2 text-xs text-muted-foreground"
        onClick={onReset}
      >
        <RotateCcw className="h-3 w-3 mr-1" />
        Reset to defaults
      </Button>
    </div>
  );
};
