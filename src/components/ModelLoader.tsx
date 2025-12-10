import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Download, CheckCircle, Loader2, HardDrive } from 'lucide-react';
import { loadModel, isModelLoaded, isModelCached, VoskProgress } from '@/services/voskRecognition';

interface ModelLoaderProps {
  onModelReady: () => void;
}

export const ModelLoader = ({ onModelReady }: ModelLoaderProps) => {
  const [progress, setProgress] = useState<VoskProgress | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);

  useEffect(() => {
    if (isModelLoaded()) {
      setStatus('ready');
      onModelReady();
      return;
    }

    const init = async () => {
      const cached = await isModelCached();
      setIsCached(cached);
      setStatus('loading');
      
      try {
        await loadModel((progress) => {
          setProgress(progress);
        });
        setStatus('ready');
        onModelReady();
      } catch (err: any) {
        setStatus('error');
        setError(err.message || 'Failed to load voice recognition model');
      }
    };
    
    init();
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
        <p className="text-sm text-destructive">{error}</p>
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
    <div className="p-4 rounded-xl bg-card border border-border smooth-transition">
      <div className="flex items-center gap-3 mb-3">
        {isCached ? (
          <HardDrive className="h-5 w-5 text-primary animate-pulse" />
        ) : progress ? (
          <Download className="h-5 w-5 text-primary animate-pulse" />
        ) : (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">
            {isCached ? 'Loading from cache...' : progress ? 'Downloading voice model...' : 'Initializing...'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isCached ? 'Using cached offline model' : 'One-time download for offline use'}
          </p>
        </div>
      </div>
      
      {progress && !isCached && (
        <div className="space-y-2">
          <Progress value={progress.percent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress.loaded / 1024 / 1024)}MB / {Math.round(progress.total / 1024 / 1024)}MB</span>
            <span>{progress.percent}%</span>
          </div>
        </div>
      )}
    </div>
  );
};
