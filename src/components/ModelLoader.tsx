import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Download, CheckCircle, Loader2, Cpu, Zap } from 'lucide-react';
import { loadModel, isModelLoaded, VoskProgress } from '@/services/voskRecognition';
import { getActiveDevice } from '@/services/whisperRecognition';

interface ModelLoaderProps {
  onModelReady: () => void;
}

export const ModelLoader = ({ onModelReady }: ModelLoaderProps) => {
  const [progress, setProgress] = useState<VoskProgress | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<'webgpu' | 'wasm'>('wasm');

  useEffect(() => {
    if (isModelLoaded()) {
      setStatus('ready');
      setDevice(getActiveDevice());
      onModelReady();
      return;
    }

    setStatus('loading');
    
    loadModel((progress) => {
      setProgress(progress);
    })
      .then(() => {
        setStatus('ready');
        setDevice(getActiveDevice());
        onModelReady();
      })
      .catch((err) => {
        setStatus('error');
        setError(err.message || 'Failed to load voice recognition model');
      });
  }, [onModelReady]);

  if (status === 'ready') {
    const isGPU = device === 'webgpu';
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CheckCircle className="h-4 w-4 text-green-500" />
        <span>Offline voice ready</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          isGPU ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
        }`}>
          {isGPU ? <Zap className="h-3 w-3" /> : <Cpu className="h-3 w-3" />}
          {isGPU ? 'GPU' : 'CPU'}
        </span>
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
        {progress ? (
          <Download className="h-5 w-5 text-primary animate-pulse" />
        ) : (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        )}
        <div>
          <p className="text-sm font-medium text-foreground">
            {progress ? 'Downloading voice model...' : 'Loading voice model...'}
          </p>
          <p className="text-xs text-muted-foreground">
            One-time download, cached for offline use
          </p>
        </div>
      </div>
      
      {progress && progress.total > 0 && (
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
