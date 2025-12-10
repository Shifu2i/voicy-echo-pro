import { useState, useEffect } from 'react';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { loadModel, isModelLoaded } from '@/services/voskRecognition';

interface ModelLoaderProps {
  onModelReady: () => void;
}

export const ModelLoader = ({ onModelReady }: ModelLoaderProps) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isModelLoaded()) {
      setStatus('ready');
      onModelReady();
      return;
    }

    setStatus('loading');
    
    loadModel()
      .then(() => {
        setStatus('ready');
        onModelReady();
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message || 'Failed to load voice recognition model');
      });
  }, [onModelReady]);

  if (status === 'ready') {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>Offline voice ready</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
        <div className="flex items-center gap-2 mb-2">
          <AlertCircle className="h-4 w-4 text-destructive" />
          <p className="text-sm font-medium text-destructive">Voice model not found</p>
        </div>
        <p className="text-xs text-muted-foreground">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 text-xs underline text-muted-foreground hover:text-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Loading voice model...</span>
    </div>
  );
};
